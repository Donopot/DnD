# Améliorations Auth — 3ème Passe (Juin 2026)

**Contexte :** 3ème revue systématique du flux auth après les correctifs des passes 1 et 2.  
Focus sur les edge cases, la résilience, et les patterns transversaux.

---

## 🔴 Nouveaux problèmes découverts

### 1. ForeignKeyViolation si la campagne est supprimée entre l'invite et le register

`campaign_invites` a `ON DELETE CASCADE` sur `campaigns(id)`. Si un MJ supprime sa campagne après avoir émis des invites, et qu'un joueur tente de s'inscrire avec un token valide :

1. `_validate_player_invite` trouve l'invite → OK
2. `insert into users` → OK  
3. `insert into campaign_members (campaign_id, ...)` → **ForeignKeyViolationError** (la campagne n'existe plus)
4. L'exception n'est PAS catchée → 500 Internal Server Error

**Correction :** Ajouter un `except ForeignKeyViolationError` dans le bloc transaction :

```python
# auth.py — après la ligne 98
except UniqueViolationError as exc:
    raise HTTPException(status_code=409, detail="Cet email est déjà utilisé") from exc
except ForeignKeyViolationError:
    raise HTTPException(status_code=410, detail="La campagne n'existe plus")
```

### 2. Le limiter local dans auth.py ne respecte pas la limite globale

```python
# auth.py:24 — instance LOCALE distincte de main.py
limiter = Limiter(key_func=_client_ip)
```

Les endpoints auth ont leurs propres limites (`5/min`, `10/min`) mais NE sont PAS couverts par le `200/minute` global de `main.py`. Un attaquant peut saturer `/api/auth/me` (qui n'a PAS de limite dédiée) sans être freiné par le global.

**Correction :** Supprimer le `limiter` local et utiliser `request.app.state.limiter` :

```python
# auth.py
router = APIRouter(prefix="/api/auth", tags=["auth"])

# Plus de limiter local. Utiliser request.app.state.limiter dans les décorateurs.
# Pour ça, il faut passer par une dépendance :

from slowapi.extension import Limiter

async def _limiter(request: Request) -> Limiter:
    return request.app.state.limiter

# Puis utiliser: @limiter.limit("5/minute", key_func=_client_ip)
# Hélas, slowapi ne supporte pas facilement le partage d'instance entre modules...
# Alternative: utiliser un middleware global.
```

**Solution pragmatique :** Ajouter aussi `@limiter.limit("200/minute")` sur la route `/me` et les autres routes auth non protégées. Ou mieux : créer le limiter dans un module partagé.

```python
# Nouveau fichier: backend/app/limiter.py
from slowapi import Limiter
from fastapi import Request

def _client_ip(request: Request) -> str:
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    real = request.headers.get("X-Real-IP")
    if real:
        return real.strip()
    return request.client.host if request.client else "unknown"

shared_limiter = Limiter(key_func=_client_ip, default_limits=["200/minute"])
```

Puis importer `shared_limiter` dans `main.py` ET `auth.py`.

### 3. Le logout ne ferme pas la connexion WebSocket

```tsx
// App.tsx:672-685 — logout()
function logout() {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    setToken("");
    // wsRef.current?.close() ← MANQUANT !
    ...
}
```

La connexion WS reste ouverte après logout → le serveur garde un zombie jusqu'au prochain ping/pong timeout.

**Correction :**
```tsx
function logout() {
    wsRef.current?.close();
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    setToken("");
    ...
}
```

### 4. Race condition dans le routing App.tsx après acceptation d'invite

```tsx
// App.tsx:700-708 — onJoined callback
onJoined={() => {
    const activeToken = localStorage.getItem(TOKEN_STORAGE_KEY) || token;
    void loadCampaigns(activeToken).then(() => {
        setInviteToken(null);  // ← provoque un re-render
        window.history.pushState({}, "", "/");
    });
}}
```

Quand `setInviteToken(null)` est appelé, `inviteToken` devient `null`, donc les conditions de routing (1-7) sont réévaluées. Si `loadCampaigns` n'a pas encore fini au moment du re-render, `campaigns` peut être vide → l'utilisateur voit brièvement le GmLobby/PlayerLobby avant que la campagne n'apparaisse.

**Correction :** Attendre que `loadCampaigns` ait fini AVANT de clear `inviteToken` :

```tsx
onJoined={async () => {
    const activeToken = localStorage.getItem(TOKEN_STORAGE_KEY) || token;
    await loadCampaigns(activeToken);
    setInviteToken(null);
    window.history.pushState({}, "", "/");
}}
```

### 5. `hash_password` silencieusement limité à 72 bytes (limite bcrypt)

`RegisterRequest.password` accepte jusqu'à 200 caractères, mais bcrypt ne hache que les 72 premiers bytes. Un utilisateur avec un mot de passe de 100 caractères ne réalise pas que seuls les 72 premiers comptent.

**Correction :** Ajouter une limite frontend + backend cohérente :

```python
# schemas.py — RegisterRequest.password
password: str = Field(min_length=8, max_length=72)
```

```tsx
// AuthPage.tsx — input password
maxLength={72}
```

### 6. Aucune exception générique dans le bloc transaction de register

Si la DB crash entre `insert users` et `insert campaign_members`, l'exception n'est pas catchée → 500.

**Correction :**
```python
except UniqueViolationError as exc:
    raise HTTPException(status_code=409, ...) from exc
except ForeignKeyViolationError:
    raise HTTPException(status_code=410, ...)
except Exception:
    raise HTTPException(status_code=500, detail="Erreur interne lors de l'inscription")
```

---

## 🟠 Améliorations de robustesse

### 7. Ajouter `@limiter.limit` sur `/me` et les routes non protégées

Actuellement :
- `/register` → `5/minute` ✅
- `/login` → `10/minute` ✅  
- `/me` → **aucune limite** ❌
- `/invites/{token}` → **aucune limite** ❌ (déjà flagué en passe 1)
- `/invites/{token}/join` → **aucune limite** ❌

**Correction :**
```python
@router.get("/me", response_model=UserPublic)
@limiter.limit("60/minute")  # ← ajouter
async def me(...): ...
```

```python
# campaigns.py
@router.get("/invites/{token}", response_model=InvitePreview)
@limiter.limit("10/minute")  # ← ajouter
async def preview_invite(...): ...
```

### 8. Pas de validation de longueur max pour `display_name` dans le HTML

Le backend limite à 80 caractères (`Field(min_length=2, max_length=80)`), et le frontend a `maxLength={80}`. ✅ OK en fait.

### 9. Les messages d'erreur HTTP sont en français dans le backend

C'est cohérent avec l'interface, mais en environnement de dev/API, l'anglais serait plus standard. Choix délibéré → pas un problème.

### 10. Le token JWT ne contient pas `account_type`

`get_current_user` fait un `SELECT ... FROM users WHERE id = $1` sur CHAQUE requête authentifiée. Si le JWT contenait `account_type`, on pourrait éviter ce round-trip DB pour les vérifications de rôle simples.

**Optimisation :**
```python
# security.py — enrichir le JWT
def create_access_token(user_id: UUID, account_type: str) -> str:
    payload = {
        "sub": str(user_id),
        "type": account_type,  # ← ajouter
        "iat": ..., "exp": ...,
    }
    ...

# deps.py — utiliser le claim sans DB lookup pour les cas simples
def decode_access_token(token: str) -> tuple[UUID, str]:
    payload = jwt.decode(...)
    return UUID(payload["sub"]), payload.get("type", "unknown")
```

Mais attention : si l'`account_type` change en DB (migration, admin action), le JWT serait stale. Pour l'instant, garder le DB lookup est plus sûr. → **Garder tel quel, documenter le trade-off.**

---

## 🟡 Améliorations UX / DX

### 11. Le composant AuthPage est *rendered-in-place* dans un blob conditionnel géant

`App.tsx` a 7 branches de routing avec du code dupliqué pour `onSubmit` (3 fois le même pattern d'appel API). À extraire.

**Proposition :**
```tsx
// Extraire dans App.tsx
async function handleAuthSubmit(payload: AuthSubmitPayload) {
    setIsBusy(true);
    setMessage("");
    try {
        const auth = await request<AuthResponse>(`/api/auth/${payload.mode}`, {
            method: "POST",
            body: JSON.stringify(payload),
        });
        localStorage.setItem(TOKEN_STORAGE_KEY, auth.access_token);
        setToken(auth.access_token);
        setUser(auth.user);
        await loadCampaigns(auth.access_token);
        if (payload.mode === "register" && !inviteToken) {
            // player registering without URL invite → stay on auth page or redirect
        }
    } catch (err) {
        setMessage(err instanceof Error ? err.message : "Échec");
    } finally {
        setIsBusy(false);
    }
}
```

Puis réutiliser dans les 3 branches auth.

### 12. Pas de feedback visuel quand le token est expiré

`bootstrap()` catch appelle `logout()` silencieusement. L'utilisateur se retrouve sur l'AuthPage sans comprendre pourquoi.

**Correction :**
```tsx
} catch {
    setMessage("Session expirée. Reconnectez-vous.");
    logout();
}
```

Mais `logout()` efface `message`... Il faut le faire avant :
```tsx
} catch {
    logout();
    // Après logout, on est sur AuthPage. Le message sera affiché.
    // Mais setMessage est dans App, pas dans AuthPage...
    // Solution: passer message à AuthPage (déjà fait via props)
}
```

En fait, `logout()` clear tout et remet à l'AuthPage via le routing conditionnel. On peut stocker un message dans `localStorage` temporairement :

```tsx
} catch {
    localStorage.setItem("auth_message", "Session expirée. Reconnectez-vous.");
    logout();
}

// Dans AuthPage, lire ce message:
const [message, setMessage] = useState("");
useEffect(() => {
    const msg = localStorage.getItem("auth_message");
    if (msg) { setMessage(msg); localStorage.removeItem("auth_message"); }
}, []);
```

### 13. Les champs de formulaire ne se vident pas quand on switch login↔register

Quand l'utilisateur tape son email en mode login puis switch vers register, l'email reste pré-rempli (bon) mais le mot de passe aussi. Le `confirmPassword` state n'est pas reset quand on switch vers login.

---

## 📊 Plan de correction priorisé (3ème passe)

| # | Correctif | Effort | Impact |
|---|----------|--------|--------|
| **1** | Catch ForeignKeyViolation dans register | 5 min | 🔴 500 → 410 |
| **2** | Limiter partagé (module commun) | 15 min | 🔴 Anti-bypass |
| **3** | wsRef.close() dans logout() | 1 min | 🟠 Propreté |
| **4** | await dans onJoined avant clear inviteToken | 1 min | 🟠 UX flash |
| **5** | max_length=72 sur password | 5 min | 🟡 Cohérence bcrypt |
| **6** | Exception générique dans register | 2 min | 🟡 Résilience |
| **7** | @limiter sur /me et /invites | 5 min | 🟡 Rate limiting |
