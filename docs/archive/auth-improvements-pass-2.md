# Améliorations Auth — 2ème Passe (Juin 2026)

**Contexte :** Audit approfondi du flux complet d'inscription/connexion après les correctifs de la 1ère passe.  
Analyse de 12 fichiers : `auth.py`, `security.py`, `deps.py`, `schemas.py`, `config.py`, `db.py`, `AuthPage.tsx`, `App.tsx`,  
`InvitePage.tsx`, `nginx.conf`, `Caddyfile.dnd.example`, `docker-compose.yml`, `Dockerfile`, migrations, `.env.example`.

---

## 🔴 Problème critique découvert — Rate limiter inefficace derrière proxy

### Le `key_func` de slowapi utilise `request.client.host` → toutes les IP = 127.0.0.1

```
Navigateur ──→ Caddy (HTTPS, port 443)
                  │
                  ├── /api/* → reverse_proxy 127.0.0.1:8091 → backend:8000
                  └── /*     → reverse_proxy 127.0.0.1:8090 → nginx → frontend
```

`slowapi` utilise `get_remote_address` qui lit `request.client.host`. Comme Caddy proxifie sur `127.0.0.1:8091`, **toutes les requêtes ont la même IP** = `127.0.0.1`.  
→ Les limites `5/minute` (register) et `10/minute` (login) sont **globales** (partagées entre tous les utilisateurs), pas par IP réelle.  
→ Un seul utilisateur qui échoue 10 logins bloque tout le monde.

**Correction :**

```python
# backend/app/routers/auth.py — remplacer la ligne 14
from fastapi import Request

def get_client_ip(request: Request) -> str:
    """Extract real client IP from proxy headers (Caddy/nginx)."""
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    real_ip = request.headers.get("X-Real-IP")
    if real_ip:
        return real_ip.strip()
    return request.client.host if request.client else "unknown"

limiter = Limiter(key_func=get_client_ip)
```

Même correctif à appliquer dans `main.py:17`.

---

## 🔴 Manques fonctionnels critiques

### 1. Pas de "mot de passe oublié"

Aucun endpoint de reset. Un utilisateur qui perd son mot de passe = compte perdu définitivement.

**Proposition :**

```python
# Nouveaux endpoints
POST /api/auth/forgot-password   # envoie un token par email (6 chiffres, 15 min TTL)
POST /api/auth/reset-password    # valide le token + nouveau mot de passe
```

- Stocker dans une table `password_reset_tokens(token, user_id, expires_at, used)`
- Token = 6 chiffres aléatoires (plus simple qu'un lien, adapté au contexte sans SMTP intégré — peut être affiché dans les logs pour le dev)
- En production : intégration SendGrid/Mailgun

### 2. Pas de changement de mot de passe

Un utilisateur connecté ne peut pas modifier son mot de passe.

```python
# Nouvel endpoint (protégé par get_current_user)
PATCH /api/auth/password
{
    "current_password": "...",
    "new_password": "...",
    "confirm_new_password": "..."
}
```

### 3. Pas de suppression de compte (GDPR)

```python
DELETE /api/auth/account
# → hard-delete user + cascade (campagnes, persos, tokens)
# → ou soft-delete avec colonne deleted_at
```

### 4. Logout purement côté client — pas d'invalidation serveur

`logout()` se contente de `localStorage.removeItem()`. Le JWT reste valide 7 jours. Aucun moyen de révoquer un token volé.

**Proposition minimale (sans blacklist Redis) :**

- Ajouter une colonne `token_version INT DEFAULT 0` dans `users`
- Inclure `token_version` dans le payload JWT
- Incrémenter `token_version` au changement de mot de passe ou logout
- `get_current_user` vérifie que la version du token match la DB

```python
# security.py — enrichir le JWT
def create_access_token(user_id: UUID, token_version: int = 0) -> str:
    payload = {
        "sub": str(user_id),
        "ver": token_version,
        "iat": ...,
        "exp": ...,
    }
    ...

# deps.py — vérifier la version
async def get_current_user(credentials):
    user_id = decode_access_token(token)  # retourne (UUID, version)
    row = await get_pool().fetchrow(
        "select ..., token_version from users where id = $1", user_id
    )
    if row["token_version"] != token_version:
        raise HTTPException(401, "Token révoqué")
```

### 5. `bootstrap()` sans AbortController — double appel possible

Dans `App.tsx:96-101`, si le token change rapidement (logout → login), deux `bootstrap()` peuvent s'exécuter en parallèle.

```tsx
useEffect(() => {
    if (!token) return;
    const controller = new AbortController();
    void bootstrap(token, controller.signal);
    return () => controller.abort();
}, [token]);
```

---

## 🟠 Améliorations de sécurité

### 6. Pas de vérification `confirm_password` au changement de mode

Quand l'utilisateur switch de login → register, il peut avoir tapé un mot de passe différent dans `confirm_password`. Le frontend vérifie `password === confirmPassword` mais si l'utilisateur bascule login→register→login rapidement, le state `confirmPassword` peut être stale.

```tsx
// AuthPage.tsx — reset confirmPassword quand on change de mode
onClick={() => {
    setMode("register");
    setConfirmPassword("");
}}
```

### 7. Les erreurs backend sont exposées brutalement côté frontend

```tsx
// App.tsx:737
setMessage(err instanceof Error ? err.message : "Échec");
```

Si le backend leak une stack trace ou un message SQL, le frontend l'affiche. Le backend est déjà bien protégé (messages user-friendly), mais ajouter un filtre frontend serait plus robuste :

```tsx
const msg = err instanceof Error ? err.message : "Échec";
setMessage(msg.length > 200 ? "Une erreur est survenue" : msg);
```

### 8. `display_name` non échappé pour les futurs emails/PDFs

La colonne `display_name` en DB n'est pas sanitizée. React échappe automatiquement en JSX, mais si on génère des emails ou PDFs plus tard, attention aux injections.

```python
# schemas.py — ajouter un validator
@field_validator("display_name")
@classmethod
def sanitize_display_name(cls, v: str) -> str:
    import html
    return html.escape(v.strip())
```

### 9. Honeypot inefficace contre les bots qui ignorent les champs cachés

Le honeypot `website` fonctionne si le bot remplit TOUS les champs (ce que font les bots naïfs). Les bots modernes ne remplissent que les champs visibles (`type="email"`, `type="password"`).

**Amélioration :** Ajouter un champ honeypot visible mais avec un nom attractif :

```tsx
{/* Faux champ visible pour les bots — les humains ne le voient pas */}
<div className="honeypot-visible" aria-hidden="true">
  <label>Laisse ce champ vide
    <input name="nickname" autoComplete="off" tabIndex={-1} />
  </label>
</div>
```

Backend :
```python
if payload.nickname:  # à ajouter au schema
    raise HTTPException(400, "Requête invalide")
```

---

## 🟡 Améliorations UX

### 10. Message "Connexion en cours..." au lieu de "Patientez..."

Le bouton submit affiche un "Patientez..." générique. Distinguer login/register :

```tsx
{isBusy
  ? (mode === "register" ? "Création du compte..." : "Connexion...")
  : mode === "register"
    ? accountType === "gm" ? "Créer mon compte MJ" : "Créer mon compte Joueur"
    : "Se connecter"}
```

### 11. Feedback immédiat au focus du champ email

Ajouter une vérification asynchrone "Cet email est-il déjà utilisé ?" quand on quitte le champ email en mode register (nécessite un endpoint `POST /api/auth/check-email`).

### 12. Mémoriser le dernier mode utilisé

```tsx
const [mode, setMode] = useState<AuthMode>(
    () => (localStorage.getItem("auth_last_mode") as AuthMode) || "register"
);
// ...
onClick={() => { setMode("login"); localStorage.setItem("auth_last_mode", "login"); }}
```

### 13. Le compteur de caractères du mot de passe n'est pas visible

Ajouter `{password.length}/8 minimum` sous le champ password.

---

## 🟢 Améliorations d'architecture

### 14. Limiter distinct pour auth vs global

Actuellement `main.py` crée un `Limiter` global (`200/minute`) et `auth.py` crée le sien (sans limite globale). Les endpoints auth ne sont PAS protégés par le `200/minute` global.

```python
# auth.py — supprimer le limiter local, utiliser celui de l'app
# main.py
app.state.limiter = Limiter(key_func=get_client_ip, default_limits=["200/minute"])

# auth.py
from fastapi import Request
router = APIRouter(prefix="/api/auth", tags=["auth"])

@router.post("/register")
@limiter.limit("5/minute")  # ← utiliser app.state.limiter
async def register(request: Request, ...):
    ...
```

Pour utiliser le limiter de l'app depuis un routeur : `request.app.state.limiter`.

### 15. Le endpoint `/me` devrait retourner plus d'infos

Actuellement `/me` retourne `UserPublic` (id, email, display_name, account_type, created_at). Ajouter :
- `campaign_count`
- `character_count`
- `last_login_at`

### 16. Logger les login réussis et échoués

Ajouter une table `auth_audit_log` :

```sql
create table auth_audit_log (
    id bigserial primary key,
    user_id uuid references users(id),
    event_type text not null,  -- 'login_success', 'login_failure', 'register', 'logout'
    ip_address text,
    user_agent text,
    created_at timestamptz not null default now()
);
```

### 17. Extraire la logique auth frontend dans un hook personnalisé

Actuellement `App.tsx` a 300+ lignes de logique auth inline. À extraire dans `useAuth.ts` :

```tsx
// hooks/useAuth.ts
export function useAuth() {
    const [token, setToken] = useLocalStorage("dnd_access_token", "");
    const [user, setUser] = useState<User | null>(null);
    const [isBusy, setIsBusy] = useState(false);
    const [message, setMessage] = useState("");
    
    async function login(email: string, password: string) { ... }
    async function register(payload: RegisterPayload) { ... }
    function logout() { ... }
    async function bootstrap() { ... }
    
    return { token, user, isBusy, message, login, register, logout };
}
```

### 18. Le nginx proxy ne gère pas le WebSocket long-terme

```nginx
# nginx.conf — ajouter
location /ws/ {
    proxy_pass http://dnd-backend:8000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_read_timeout 86400s;  # ← 24h timeout pour les longues sessions
    proxy_send_timeout 86400s;
    ...
}
```

(Le `proxy_read_timeout` manque actuellement — nginx coupe après 60s par défaut.)

---

## 📊 Priorisation

| # | Amélioration | Effort | Impact |
|---|-------------|--------|--------|
| **1** | Rate limiter proxy-aware (`get_client_ip`) | 15 min | 🔴 Critique |
| **18** | nginx `proxy_read_timeout` pour WS | 2 min | 🔴 Critique |
| **5** | AbortController dans `bootstrap()` | 10 min | 🟠 Majeur |
| **4** | `token_version` pour invalidation logout | 45 min | 🟠 Majeur |
| **1** | Forgot/reset password | 1h | 🟠 Majeur |
| **2** | Change password endpoint | 30 min | 🟡 Utile |
| **14** | Limiter unifié (supprimer doublon) | 10 min | 🟡 Robuste |
| **16** | Audit log auth | 30 min | 🟡 Sécurité |
| **17** | `useAuth` hook | 1h | 🟢 DX |
| **3** | Delete account | 30 min | 🟢 GDPR |
| **6-13** | UX polish (messages, feedback, etc.) | 1h | 🟢 Polish |

---

## Checklist de validation

Chaque correctif doit être validé par :
- [ ] `uv run pytest tests/ -q --tb=short` → tous les tests passent
- [ ] `npx tsc --noEmit` → 0 erreur
- [ ] `npm run build` → build OK
- [ ] Test manuel : curl vers `/api/auth/login` et vérifier l'entête `X-Forwarded-For`
