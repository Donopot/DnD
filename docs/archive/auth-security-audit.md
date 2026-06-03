# Audit de Sécurité & Fiabilité — Système d'Inscription / Connexion

**Date :** 1er juin 2026  
**Méthode :** 3 passes systématiques (sécurité → fonctionnel → intégration frontend/backend)  
**Fichiers audités :** 11 fichiers source + 2 migrations + 1 Docker Compose + tests  
**Baseline :** 49/49 tests passent ✅

---

## Résumé exécutif

> **1 bug critique découvert** — le champ `invite_token` tapé manuellement par un joueur n'est jamais envoyé au backend.  
> **6 vulnérabilités de sécurité** identifiées (JWT incomplete, pas de refresh token, pas de lockout, pas de email verification, rate limiter désynchronisé, invite preview public).  
> **13 défauts fonctionnels** (UX, validation, robustesse).

---

## 🔴 BUG CRITIQUE — Registration Player manuelle cassée

### BUG-1 : Le code d'invitation saisi manuellement est ignoré

**Fichier :** `frontend/src/components/AuthPage.tsx:62`

```tsx
// AuthPage.tsx: handleSubmit
await onSubmit({
  // ...
  invite_token: inviteToken ?? undefined,  // ← vient du PROP, pas du formulaire !
  website: String(form.get("website") ?? ""),
});
```

Quand un joueur arrive SANS lien d'invitation dans l'URL (`inviteToken === null`) :

1. Il choisit "Joueur" → le champ `invite_token` visible s'affiche
2. Il tape son code manuellement
3. `handleSubmit` construit le payload avec `inviteToken ?? undefined` = `null ?? undefined` = `undefined`
4. Le backend reçoit `invite_token: None` → **HTTP 400 "Un token d'invitation est requis"**

**Impact :** Tout joueur n'arrivant PAS via un lien `/invite/TOKEN` ne peut PAS créer son compte. Le champ de saisie est décoratif.

**Correction :**
```tsx
invite_token: form.get("invite_token")?.toString() || inviteToken || undefined,
```

---

## 🟠 VULNÉRABILITÉS DE SÉCURITÉ

### SEC-1 : JWT minimaliste — pas de typage, pas d'audience
**Fichier :** `backend/app/security.py:23-30`

Le token JWT contient uniquement `sub`, `iat`, `exp`. Il manque :
- `type: "access"` — pour différencier access/refresh tokens
- `aud` / `iss` — pour le contrôle d'audience
- `account_type` — le `get_current_user` refait un `SELECT` DB à chaque requête

**Recommandation :** Ajouter `type`, `account_type`, `iss` dans le payload pour éviter le DB round-trip et permettre des refresh tokens.

### SEC-2 : Pas de refresh token — TTL fixe de 7 jours
**Fichier :** `backend/app/config.py:10`

```python
access_token_ttl_minutes: int = 60 * 24 * 7  # 7 jours
```

Un token volé donne 7 jours d'accès. Pas de mécanisme de révocation. Pas de refresh token à courte durée de vie.

**Recommandation :** Access token 15min + refresh token 7j + endpoint `/api/auth/refresh`.

### SEC-3 : Pas de lockout après tentatives échouées
**Fichier :** `backend/app/routers/auth.py:113-127`

Seule protection : `10/minute` rate limit global (pas par compte). Pas de délai progressif, pas de blocage après N échecs, pas d'audit des tentatives.

**Recommandation :**
- Limiter à 5 tentatives par email sur 15 minutes
- Ajouter un délai progressif (1s, 2s, 4s, 8s...)
- Logger les tentatives échouées dans une table `login_attempts`

### SEC-4 : Aucune vérification d'email
**Fichier :** `backend/app/routers/auth.py:56-108`

Pas de colonne `email_verified`, pas de lien de vérification, pas de token de validation. N'importe qui peut s'inscrire avec n'importe quel email.

**Recommandation :**
- Colonne `email_verified BOOLEAN DEFAULT FALSE`
- Endpoint `POST /api/auth/verify-email` avec token JWT envoyé par email
- Bloquer l'accès aux campagnes tant que l'email n'est pas vérifié

### SEC-5 : Rate limiter désynchronisé entre auth router et global
**Fichiers :** `backend/app/routers/auth.py:14` et `backend/app/main.py:17`

```python
# auth.py — Limiter LOCAL (pas de default_limits)
limiter = Limiter(key_func=get_remote_address)

# main.py — Limiter GLOBAL (default_limits=["200/minute"])
limiter = Limiter(key_func=get_remote_address, default_limits=["200/minute"])
```

Deux instances `Limiter` distinctes = deux compteurs in-memory séparés. Les endpoints auth ne sont PAS couverts par le `200/minute` global.

**Recommandation :** Supprimer le `limiter` local dans `auth.py` et utiliser celui de `main.py` via `app.state.limiter`.

### SEC-6 : Endpoint preview d'invitation public — probe possible
**Fichier :** `backend/app/routers/campaigns.py:172-207`

```python
@router.get("/invites/{token}", response_model=InvitePreview)
async def preview_invite(token: str) -> InvitePreview:
    # Aucune authentification requise !
```

N'importe qui peut scanner des tokens d'invitation. Les tokens sont `secrets.token_urlsafe(32)` (256 bits) donc le brute-force direct est impossible, mais un token leaké expose le nom de la campagne et le rôle.

**Recommandation :** Ajouter un rate limit agressif (`3/minute par IP`) ou demander d'abord une adresse email.

---

## 🟡 DÉFAUTS FONCTIONNELS

### FNC-1 : Login — pas de validation frontend du mot de passe
**Fichier :** `frontend/src/components/AuthPage.tsx:48-50`

```tsx
const canSubmit =
    mode === "login" || (passwordsMatch && strength.score >= 3 && password.length >= 8);
```

En mode login, `canSubmit` est toujours `true` — y compris avec un champ mot de passe VIDE. Le bouton submit est actif immédiatement. Backend rejette mais UX médiocre.

### FNC-2 : Email non trimé avant envoi
**Fichier :** `frontend/src/components/AuthPage.tsx:57`

```tsx
email: String(form.get("email")),  // pas de .trim()
```

Si l'utilisateur tape `" test@test.com "`, le backend reçoit l'email avec espaces. Le backend fait `payload.email.lower()` mais pas `strip()`. `EmailStr` de Pydantic valide que c'est un email valide mais les espaces autour peuvent causer un rejet.

### FNC-3 : Login ne vérifie pas si le compte existe avant de vérifier le mot de passe
**Fichier :** `backend/app/routers/auth.py:124`

```python
if row is None or not verify_password(payload.password, row["password_hash"]):
    raise HTTPException(status_code=401, detail="Email ou mot de passe invalide")
```

Problème mineur : même message d'erreur pour "email inexistant" et "mot de passe faux" → pas de fuite d'information. **C'est correct en fait.** Le vrai problème c'est que le temps de réponse est différent (bcrypt n'est pas appelé si row is None), ce qui pourrait permettre du user enumeration via timing attack.

**Recommandation :** Toujours appeler `verify_password` avec un dummy hash si l'utilisateur n'existe pas (constant-time).

### FNC-4 : Pas de `for update` dans `_validate_player_invite`
**Fichier :** `backend/app/routers/auth.py:37-53`

```python
row = await get_pool().fetchrow("select ... where ci.token = $1", invite_token)
# Pas de FOR UPDATE
```

Deux inscriptions concurrentes avec le même token peuvent toutes les deux passer la validation. Une seule sera comptabilisée (`on conflict do nothing` pour campaign_members + `use_count + 1`), mais la seconde recevra un token d'accès valide... sans avoir rejoint la campagne.

**Comparaison :** L'endpoint `/invites/{token}/join` (ligne 214) utilise correctement `FOR UPDATE`. Le register devrait faire pareil.

### FNC-5 : `user_public()` itère sur un `Record` asyncpg qui peut ne pas avoir toutes les colonnes
**Fichier :** `backend/app/routers/auth.py:17-24`

```python
def user_public(row) -> UserPublic:
    return UserPublic(
        id=row["id"],
        email=row["email"],
        display_name=row["display_name"],
        account_type=row["account_type"],
        created_at=row["created_at"],
    )
```

Si `row["account_type"]` est `None` (la colonne a `not null default 'gm'` donc impossible en pratique), Pydantic utilisera le défaut `"gm"`. OK mais uniquement parce que le défaut correspond à la DB.

### FNC-6 : Pas de colonne `updated_at` déclenchée par trigger
**Fichier :** `backend/app/migrations/001_phase2_auth_campaigns.sql:7`

```sql
updated_at timestamptz not null default now()
```

Pas de `on update now()` trigger. La colonne reste figée à la date de création.

### FNC-7 : Aucun test d'intégration pour le flux complet register → login → me
Les tests existants (`test_security.py`) testent uniquement les utilitaires crypto et les schémas Pydantic. Aucun test end-to-end :
- Register GM → login → `/api/auth/me` → créer campagne
- Register Player avec invite → login → voir campagne
- Register Player SANS invite → doit échouer
- Login avec mauvais mot de passe → 401
- Login avec email inexistant → 401 (timing-safe)

### FNC-8 : La route `/api/auth/me` retourne `UserPublic` qui inclut `account_type`
**Correct**, mais le frontend utilise cette info pour router vers PlayerLobby/GmLobby (App.tsx:776-814). Si `account_type` change côté DB (ex: migration), le token existant devient invalide car le routing est basé sur le type de compte.

### FNC-9 : Pas de gestion de session expirée côté frontend
**Fichier :** `frontend/src/App.tsx:239-252`

```tsx
async function bootstrap(activeToken: string) {
    try {
      const response = await fetch("/api/auth/me", ...);
      if (!response.ok) throw new Error("Session expired");
      setUser((await response.json()) as User);
      await loadCampaigns(activeToken);
    } catch {
      logout();  // logout() efface localStorage et reset tout
    }
}
```

Quand le token expire, le `catch` appelle `logout()` qui efface tout. Mais pendant ce temps, l'utilisateur voit l'écran d'auth se charger sans explication. Pas de toast "Session expirée, reconnectez-vous".

### FNC-10 : Password strength frontend ≠ backend
**Frontend :** `passwordStrength()` vérifie : len≥8, minuscule, majuscule, chiffre, symbole  
**Backend (RegisterRequest) :** vérifie : minuscule, majuscule, chiffre (PAS de symbole requis)

Le frontend montre "Fort" pour un mot de passe sans symbole si les 4 autres critères sont remplis. Le backend l'accepte. Cohérent en pratique, mais la jauge visuelle est trompeuse ("Fort" = 4/5 alors que le backend n'en demande que 3).

### FNC-11 : Token JWT dans localStorage — pas de httpOnly
**Fichier :** `frontend/src/App.tsx:47,50`

```tsx
const TOKEN_STORAGE_KEY = "dnd_access_token";
const [token, setToken] = useState(() => localStorage.getItem(TOKEN_STORAGE_KEY) ?? "");
```

Le token est stocké dans `localStorage` → vulnérable à tout XSS. Aucun cookie httpOnly. Pas de mécanisme SameSite/HttpOnly.

### FNC-12 : `bootstrap()` est appelée dans un `useEffect` sans cleanup
**Fichier :** `frontend/src/App.tsx:96-101`

```tsx
useEffect(() => {
    if (!token) return;
    void bootstrap(token);
}, [token]);
```

Si le token change rapidement (ex: logout → login immédiat), deux appels `bootstrap()` peuvent être en vol. Pas de `AbortController`, pas de cleanup.

### FNC-13 : Honeypot détectable par les bots modernes
**Fichier :** `frontend/src/components/AuthPage.tsx:229-236`

```tsx
<input type="text" name="website" tabIndex={-1} autoComplete="off"
       className="honeypot" aria-hidden="true" />
```

Les attributs `tabIndex=-1` et `aria-hidden="true"` sont des signaux forts pour les bots de détection de honeypot. Un honeypot moderne devrait utiliser CSS uniquement (`position:absolute;opacity:0;left:-9999px`), sans attributs HTML qui trahissent l'intention.

---

## 🟢 NOTE POSITIVE — Ce qui est bien fait

1. ✅ **bcrypt pour le hachage** — standard industriel, pas de MD5/SHA maison
2. ✅ **Index unique sur `lower(email)`** — évite les doublons insensibles à la casse
3. ✅ **Rate limiting sur register (5/min) et login (10/min)** — malgré la désynchronisation
4. ✅ **Validation Pydantic côté backend** — EmailStr, min_length, regex
5. ✅ **Séparation GM/Joueur propre** — `require_gm_account()`, `require_campaign_role()`
6. ✅ **Transaction atomique pour register + join campaign** — `async with connection.transaction()`
7. ✅ **Honeypot présent** — même s'il est améliorable
8. ✅ **Mot de passe masqué par défaut** — toggle show/hide
9. ✅ **Indicateur de force visuel** — barre colorée avec label
10. ✅ **`on conflict do nothing`** pour éviter les double-join

---

## Plan de correction priorisé

| Priorité | ID | Correctif | Impact |
|----------|----|-----------|--------|
| 🔴 | BUG-1 | Invite token ignoré en registration manuelle | Bloquant pour les joueurs |
| 🟠 | SEC-3 | Lockout après N tentatives échouées | Bruteforce |
| 🟠 | FNC-4 | `FOR UPDATE` dans `_validate_player_invite` | Race condition |
| 🟠 | FNC-7 | Tests d'intégration du flux auth complet | Pas de couverture |
| 🟡 | SEC-5 | Unifier le rate limiter | Bypass global limit |
| 🟡 | SEC-1 | Enrichir le JWT (type, account_type) | Performance + sécurité |
| 🟡 | FNC-1 | Valider login password non-vide frontend | UX |
| 🟡 | FNC-3 | Constant-time login (dummy bcrypt) | Anti user-enum |
| 🟢 | SEC-2 | Refresh tokens | Hygiène de sécurité |
| 🟢 | SEC-4 | Vérification d'email | Anti-spam |
| 🟢 | SEC-6 | Rate limit sur invite preview | Anti-probe |
| 🟢 | FNC-13 | Honeypot CSS-only | Anti-bot robuste |
