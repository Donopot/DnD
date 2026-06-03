# Sécurité & Authentification — DnD SaaS

**Dernière mise à jour :** 3 juin 2026
**Fichiers de référence :** `backend/app/security.py`, `backend/app/routers/auth.py`, `frontend/src/components/AuthPage.tsx`, `frontend/src/App.tsx`

---

## 1. Architecture d'authentification

### 1.1 Stack technique

| Composant | Technologie | Détail |
|-----------|-------------|--------|
| Hachage des mots de passe | **bcrypt** (via `passlib`) | Standard industriel, pas de MD5/SHA maison |
| Tokens | **JWT** (via `python-jose`) | Signé HMAC-SHA256, secret configurable |
| Transport | **HTTP Authorization: Bearer** | Header standard |
| Stockage client | **localStorage** (`dnd_access_token`) | Pas de cookie httpOnly (cf. §4.6) |
| Base de données | **PostgreSQL** | Index unique sur `lower(email)`, `account_type NOT NULL DEFAULT 'gm'` |
| Rate limiting | **slowapi** (basé sur `limits`) | Par IP, configuré dans `auth.py` et `main.py` |
| Validation | **Pydantic v2** | `EmailStr`, `min_length`, regex password |

### 1.2 Flux global

```
┌──────────────┐       ┌──────────────┐       ┌──────────────┐
│   Frontend   │       │   Backend    │       │  PostgreSQL  │
│  (React/TS)  │       │  (FastAPI)   │       │              │
└──────┬───────┘       └──────┬───────┘       └──────┬───────┘
       │                      │                      │
       │  POST /api/auth/     │                      │
       │  register ou login   │                      │
       │─────────────────────>│                      │
       │                      │  SELECT/INSERT       │
       │                      │─────────────────────>│
       │                      │<─────────────────────│
       │    token JWT         │                      │
       │<─────────────────────│                      │
       │                      │                      │
       │  GET /api/auth/me    │                      │
       │  (Authorization:     │                      │
       │   Bearer <token>)    │                      │
       │─────────────────────>│  SELECT user          │
       │                      │─────────────────────>│
       │                      │<─────────────────────│
       │    UserPublic JSON   │                      │
       │<─────────────────────│                      │
```

### 1.3 Routes d'authentification

| Méthode | Endpoint | Auth requise | Description |
|---------|----------|-------------|-------------|
| `POST` | `/api/auth/register` | Non | Inscription GM ou Joueur |
| `POST` | `/api/auth/login` | Non | Connexion, retourne un token JWT |
| `GET` | `/api/auth/me` | Oui (Bearer) | Récupère le profil de l'utilisateur connecté |
| `GET` | `/api/invites/{token}` | Non | Preview d'une invitation (publique) |

---

## 2. Flux JWT

### 2.1 Structure du token

Le token JWT actuel contient les claims suivantes :

```json
{
  "sub": "<user_id>",
  "iat": 1717000000,
  "exp": 1717604800
}
```

**Champs présents :**
- `sub` — identifiant utilisateur (UUID)
- `iat` — timestamp d'émission
- `exp` — timestamp d'expiration

**Champs manquants :**
- `type` — `"access"` ou `"refresh"` (pas de différenciation possible)
- `aud` / `iss` — contrôle d'audience absent
- `account_type` — oblige `get_current_user` à refaire un `SELECT` DB à chaque requête

### 2.2 Cycle de vie

1. **Émission :** `POST /api/auth/login` ou `POST /api/auth/register`
2. **Durée de vie :** 7 jours (configurable via `ACCESS_TOKEN_TTL_MINUTES`)
3. **Stockage client :** `localStorage.getItem("dnd_access_token")`
4. **Validation :** `get_current_user` décode le token, vérifie `exp`, interroge la DB
5. **Expiration :** Le frontend détecte l'échec de `GET /api/auth/me` et appelle `logout()`

### 2.3 Configuration

```python
# backend/app/config.py
access_token_ttl_minutes: int = 60 * 24 * 7  # 7 jours
jwt_secret: str = "change-me-in-production"
```

### 2.4 Limitations actuelles

- **Pas de refresh token** — un token volé donne 7 jours d'accès sans révocation possible
- **Pas de liste noire** — aucun mécanisme d'invalidation côté serveur
- **Pas de rotation** — le même token est utilisé jusqu'à expiration
- **TTL unique** — pas de distinction access token (court) / refresh token (long)

### 2.5 Recommandations

```python
# Évolution proposée
access_token_ttl_minutes: int = 15        # 15 minutes
refresh_token_ttl_minutes: int = 60 * 24 * 7  # 7 jours

# Payload enrichi
{
  "sub": "<user_id>",
  "type": "access",
  "account_type": "gm",
  "iat": ...,
  "exp": ...,
  "iss": "dnd-saas"
}
```

---

## 3. Inscription

### 3.1 Parcours Maître du Jeu (GM)

1. Accéder à `/`
2. Cliquer sur l'onglet **Inscription**
3. Sélectionner le type de compte **Maître du Jeu**
4. Renseigner :
   - Nom affiché
   - Email
   - Mot de passe (voir règles §3.3)
   - Confirmation du mot de passe
5. Soumettre → le backend crée le compte et retourne un token JWT
6. Redirection automatique vers le **Lobby MJ**

**Endpoint :**
```bash
curl -sS -X POST http://127.0.0.1:8091/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "mj@example.com",
    "display_name": "Dungeon Master",
    "password": "TestPass123!",
    "confirm_password": "TestPass123!",
    "account_type": "gm",
    "website": ""
  }'
```

### 3.2 Parcours Joueur

1. Recevoir un lien d'invitation (`/invite/TOKEN`) de la part d'un MJ
2. Accéder au lien → le token est pré-rempli via l'URL
3. Choisir le type **Joueur**
4. Saisir un nom affiché, email, mot de passe
5. Soumettre → le joueur rejoint automatiquement la campagne
6. Redirection vers le **Lobby Joueur**

**⚠️ BUG critique (BUG-1) :** Quand un joueur arrive SANS lien d'invitation (pas de token dans l'URL) et tape manuellement un code d'invitation, celui-ci **n'est pas envoyé au backend**. Le champ de formulaire est ignoré — `inviteToken ?? undefined` dans le frontend utilise la prop React (qui est `null`) au lieu de la valeur du formulaire.

**Correction nécessaire :**
```tsx
// frontend/src/components/AuthPage.tsx, handleSubmit
invite_token: form.get("invite_token")?.toString() || inviteToken || undefined,
```

**⚠️ Race condition (FNC-4) :** Deux inscriptions concurrentes avec le même token d'invitation peuvent passer la validation. La fonction `_validate_player_invite` n'utilise pas `SELECT ... FOR UPDATE`. Une seule inscription sera effectivement comptabilisée (`ON CONFLICT DO NOTHING` + `use_count + 1`), mais la seconde recevra un token d'accès valide... sans avoir rejoint la campagne.

### 3.3 Règles de mot de passe

**Contraintes backend (Pydantic `RegisterRequest`) :**
- Au moins 1 minuscule
- Au moins 1 majuscule
- Au moins 1 chiffre

**Contraintes frontend (indicateur de force) :**
- 8 caractères minimum
- 1 minuscule
- 1 majuscule
- 1 chiffre
- 1 symbole (bonus, non requis par le backend)

**Niveaux de force affichés :**
| Score | Label | Barre |
|-------|-------|-------|
| 0-1 | Très faible | Rouge |
| 2 | Faible | Orange |
| 3 | Moyen | Jaune |
| 4 | Fort | Vert clair |
| 5 | Très fort | Vert |

> Note : le backend accepte un mot de passe sans symbole (score 4/5 frontend). La jauge est légèrement trompeuse mais le comportement est cohérent.

---

## 4. Mesures de sécurité

### 4.1 Mesures en place ✅

| Mesure | Statut | Détail |
|--------|--------|--------|
| Hachage bcrypt | ✅ Implémenté | `passlib.context.CryptContext` avec `schemes=["bcrypt"]` |
| Index unique email | ✅ Implémenté | `CREATE UNIQUE INDEX ... ON users (lower(email))` |
| Rate limiting | ✅ Partiel | 5/min pour register, 10/min pour login (cf. §4.5) |
| Validation Pydantic | ✅ Implémenté | `EmailStr`, contraintes mot de passe, longueurs |
| Séparation GM/Joueur | ✅ Implémenté | `require_gm_account()`, `require_campaign_role()` |
| Transaction atomique | ✅ Implémenté | `async with connection.transaction()` pour register + join |
| Honeypot anti-bot | ✅ Implémenté | Champ caché `website` (améliorable, cf. §4.8) |
| Masquage mot de passe | ✅ Implémenté | Toggle show/hide dans l'UI |
| Indicateur de force | ✅ Implémenté | Barre colorée avec label |
| `ON CONFLICT DO NOTHING` | ✅ Implémenté | Évite les double-join campagne |

### 4.2 Hachage des mots de passe

```python
# backend/app/security.py
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)
```

### 4.3 Vulnérabilité : pas de lockout (SEC-3)

**Problème :** La seule protection contre le bruteforce est le rate limit global de 10 requêtes/minute (pas par compte). Aucun délai progressif, aucun blocage après N échecs, aucune table d'audit.

**Recommandation :**
- Limiter à 5 tentatives par email sur 15 minutes
- Ajouter un délai progressif (1s, 2s, 4s, 8s...)
- Créer une table `login_attempts` pour l'audit

### 4.4 Vulnérabilité : pas de vérification d'email (SEC-4)

**Problème :** Pas de colonne `email_verified`, pas de lien de vérification, pas de token de validation. N'importe qui peut s'inscrire avec n'importe quel email.

**Recommandation :**
- Ajouter `email_verified BOOLEAN DEFAULT FALSE` à la table `users`
- Créer `POST /api/auth/verify-email` avec token JWT envoyé par email
- Bloquer l'accès aux campagnes tant que l'email n'est pas vérifié

### 4.5 Vulnérabilité : rate limiter désynchronisé (SEC-5)

**Problème :** Deux instances `Limiter` distinctes — une dans `auth.py` (sans `default_limits`) et une dans `main.py` (avec `default_limits=["200/minute"]`). Deux compteurs in-memory séparés = les endpoints auth ne sont PAS couverts par le `200/minute` global.

```python
# auth.py — Limiter LOCAL
limiter = Limiter(key_func=get_remote_address)

# main.py — Limiter GLOBAL
limiter = Limiter(key_func=get_remote_address, default_limits=["200/minute"])
```

**Recommandation :** Supprimer le `limiter` local dans `auth.py` et utiliser celui de `main.py` via `app.state.limiter`.

### 4.6 Stockage du token : localStorage vs httpOnly (FNC-11)

**Problème :** Le token JWT est stocké dans `localStorage`, le rendant vulnérable à toute attaque XSS.

```tsx
// frontend/src/App.tsx
const TOKEN_STORAGE_KEY = "dnd_access_token";
const [token, setToken] = useState(() => localStorage.getItem(TOKEN_STORAGE_KEY) ?? "");
```

**Limitation :** Pas de cookie httpOnly, pas de `SameSite`, pas de `HttpOnly`. Une migration vers des cookies sécurisés nécessiterait un changement d'architecture (le backend devrait poser le cookie).

### 4.7 Timing attack sur le login (FNC-3)

**Problème :** Le temps de réponse diffère entre "email inexistant" (bcrypt non appelé) et "mot de passe faux" (bcrypt appelé), permettant théoriquement du user enumeration.

**Code actuel :**
```python
if row is None or not verify_password(payload.password, row["password_hash"]):
    raise HTTPException(status_code=401, detail="Email ou mot de passe invalide")
```

**Recommandation :** Toujours appeler `verify_password` avec un dummy hash si l'utilisateur n'existe pas, pour un temps de réponse constant.

### 4.8 Honeypot détectable (FNC-13)

**Problème :** Les attributs `tabIndex={-1}` et `aria-hidden="true"` sur le champ honeypot sont des signaux forts pour les bots modernes.

**Recommandation :** Utiliser un honeypot CSS-only :
```css
.honeypot {
  position: absolute;
  opacity: 0;
  left: -9999px;
}
```

### 4.9 Endpoint preview d'invitation public (SEC-6)

**Problème :** `GET /api/invites/{token}` ne requiert aucune authentification. Un token leaké expose le nom de la campagne et le rôle.

**Défense actuelle :** Les tokens sont générés via `secrets.token_urlsafe(32)` (256 bits), rendant le bruteforce direct impossible.

**Recommandation :** Ajouter un rate limit agressif (3/minute par IP) ou exiger d'abord une adresse email.

---

## 5. Permissions

### 5.1 Modèle de rôles

| Rôle | `account_type` | Description |
|------|---------------|-------------|
| Maître du Jeu (GM) | `gm` | Crée et gère des campagnes |
| Joueur | `player` | Rejoint des campagnes via invitation |

### 5.2 Décorateurs de permission

```python
# backend/app/routers/auth.py

def require_gm_account(current_user: UserPublic = Depends(get_current_user)) -> UserPublic:
    """Bloque l'accès si l'utilisateur n'est pas GM."""
    if current_user.account_type != "gm":
        raise HTTPException(status_code=403, detail="Réservé aux MJ")
    return current_user

def require_campaign_role(role: str):
    """Vérifie que l'utilisateur a un rôle spécifique dans la campagne."""
    # ...
```

### 5.3 Routage frontend

Le frontend utilise `account_type` retourné par `/api/auth/me` pour déterminer le lobby :

```tsx
// frontend/src/App.tsx
if (user.account_type === "gm") {
    return <GmLobby />;
} else {
    return <PlayerLobby />;
}
```

**Attention :** Si `account_type` change côté DB (migration), le token existant reste valide mais le routing peut devenir incohérent.

### 5.4 Principe de moindre privilège

- Un joueur ne peut PAS créer de campagne
- Un joueur ne peut PAS voir les campagnes auxquelles il n'est pas invité
- Un MJ ne peut PAS rejoindre sa propre campagne en tant que joueur
- Les endpoints campagne vérifient systématiquement l'appartenance (`campaign_members`)

---

## 6. Dépannage

### 6.1 Problèmes fréquents

| Symptôme | Cause probable | Solution |
|----------|---------------|----------|
| **Erreur 401 après login** | Token expiré ou DB reset | Vider `localStorage` et se reconnecter |
| **Inscription Joueur bloquée** | BUG-1 : code d'invitation ignoré | Utiliser un lien `/invite/TOKEN` au lieu de taper le code |
| **Mot de passe refusé** | Ne respecte pas les contraintes | Minimum 1 minuscule + 1 majuscule + 1 chiffre |
| **Email déjà utilisé** | Compte existant | Utiliser un autre email ou se connecter |
| **Confirmation différente** | `password != confirm_password` | Vérifier les deux champs |
| **"Session expirée" silencieuse** | Token de 7 jours expiré | Re-login nécessaire (pas de toast explicatif) |
| **Backend injoignable** | Service arrêté | `docker compose up -d` |
| **Erreur 500** | Migrations non appliquées | `docker compose exec backend uv run alembic upgrade head` |

### 6.2 Après un reset de base de données

Après un `docker compose down -v` ou un reset PostgreSQL, les anciens comptes n'existent plus. Le token stocké dans le navigateur pointe vers un utilisateur inexistant.

**Procédure :**
1. Ouvrir la console développeur (F12)
2. Exécuter :
```js
localStorage.removeItem("dnd_access_token");
location.reload();
```
3. Recréer un compte

### 6.3 Tests API rapides

```bash
# Variables
EMAIL="test+$(date +%Y%m%d%H%M%S)@dnd-smoke.fr"
PASSWORD="TestPass123!"

# Inscription GM
curl -sS -X POST http://127.0.0.1:8091/api/auth/register \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"display_name\":\"Test MJ\",\"password\":\"$PASSWORD\",\"confirm_password\":\"$PASSWORD\",\"account_type\":\"gm\",\"website\":\"\"}" | jq

# Connexion
curl -sS -X POST http://127.0.0.1:8091/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}" | jq

# Vérification du token (remplacer TOKEN par la valeur reçue)
curl -sS http://127.0.0.1:8091/api/auth/me \
  -H "Authorization: Bearer TOKEN" | jq
```

### 6.4 Validation serveur

```bash
# Redémarrage propre
docker compose up -d --build

# Attente de l'API
sh scripts/wait-api.sh

# Health check
curl -fsS http://127.0.0.1:8091/api/health

# Smoke tests complets
sh scripts/smoke-backend.sh
```

### 6.5 Checklist de diagnostic

Quand un problème d'authentification survient, vérifier dans l'ordre :

1. [ ] Le backend tourne-t-il ? `docker compose ps`
2. [ ] Les migrations sont-elles à jour ? Vérifier les logs backend
3. [ ] Le token dans `localStorage` est-il valide ? (pas expiré, pas orphelin après reset DB)
4. [ ] Le mot de passe respecte-t-il les contraintes ?
5. [ ] La confirmation correspond-elle au mot de passe ?
6. [ ] L'email n'est-il pas déjà utilisé ?
7. [ ] Pour un Joueur : le token d'invitation est-il fourni via l'URL (pas saisi manuellement, cf. BUG-1) ?
8. [ ] Le service worker navigateur ne sert-il pas un ancien bundle ? → Vider le cache + hard reload

### 6.6 Logs utiles

```bash
# Logs backend (auth)
docker compose logs backend | grep -i "auth\|token\|jwt\|401\|403"

# Logs PostgreSQL
docker compose logs db | grep -i "error\|duplicate\|violation"
```

---

## 7. Plan de correction priorisé

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

---

## 8. Références

- **Code source :** `backend/app/security.py`, `backend/app/routers/auth.py`
- **Modèles Pydantic :** `backend/app/models/auth.py`
- **Migrations :** `backend/app/migrations/001_phase2_auth_campaigns.sql`
- **Frontend :** `frontend/src/components/AuthPage.tsx`, `frontend/src/App.tsx`
- **Tests :** `backend/tests/test_security.py`
- **Configuration :** `backend/app/config.py`
- **Audit complet :** `docs/auth-security-audit.md`
- **Guide de dépannage :** `docs/auth-troubleshooting.md`
