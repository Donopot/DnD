# Réarchitecture Auth & Routage — Plan d'implémentation

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Remplacer le flux d'authentification multi-étapes (LandingPage → AuthView → InvitePage) par un chemin unique d'inscription/connexion, puis router vers 4 layouts distincts selon `account_type × has_campaign`.

**Architecture:** 
- `AuthPage` unique remplace `LandingPage` + `AuthView` + `InvitePage` (partie auth non-connectée)
- 4 layouts conditionnels dans `App.tsx` : PlayerLobby, PlayerView, GmLobby, GM VTT
- Backend : renforcement sécurité inscription (confirmation mot de passe, complexité, honeypot)

**Tech Stack:** React 19, TypeScript, FastAPI, PostgreSQL, asyncpg, slowapi

**Conventions:** Voir `.hermes/developer-rules.md` — branches `feat/`, migrations `NNN_phaseN_desc.sql`, smoke tests en Python.

---

## 🔍 Audit de l'existant

### ✅ Ce qui reste (ne pas toucher)

| Composant | Raison |
|-----------|--------|
| `PlayerView.tsx` | Interface joueur en campagne — complète, 1097 lignes, 6 onglets |
| `VttBoard.tsx` + tous composants VTT | Interface MJ en campagne — complète |
| Backend `auth.py` (register/login) | Logique core OK, rate limiting 5/min déjà en place |
| Backend `campaigns.py` (invites/join) | OK |
| `campaign_members` + `campaign_invites` | Schémas OK |

### 🔴 Ce qui pose problème

| Fichier | Problème | Action |
|---------|----------|--------|
| `LandingPage.tsx` | Étape inutile : oblige à choisir MJ/Joueur avant de voir le formulaire | **Supprimer** → absorbé par `AuthPage` |
| `AuthView.tsx` | Duplication UI entre les deux rôles, pas de choix GM/Player explicite dans le form | **Supprimer** → absorbé par `AuthPage` |
| `InvitePage.tsx` | Full-page takeover qui bloque tout le reste de l'app | **Réduire** → la partie "invite preview + join" devient un composant réutilisable dans `PlayerLobby` |
| `App.tsx` routing | 3 conditions floues (inviteToken → user → selectedCampaign.role) avec fallthrough bug (player sans campagne tombe dans le layout GM) | **Refonte** → 4 branches explicites |
| `AuthView` — pas de confirmation mot de passe | Risque de faute de frappe à l'inscription | **Ajouter** dans `AuthPage` |
| `AuthView` — pas de complexité mot de passe | Sécurité faible | **Ajouter** validation backend + frontend |

---

## 📐 Nouveau routage dans App.tsx

```
App.tsx mount
  │
  ├─ !token && !user?
  │   └→ AuthPage (inscription/connexion unifiée)
  │       ├─ Register: l'utilisateur choisit MJ ou Joueur dans le form
  │       ├─ Login: account_type vient du backend (UserPublic)
  │       └─ Context invite: si URL /invite/{token}, auto-mode Joueur
  │
  ├─ token && !user?
  │   └→ Chargement (fetch /api/auth/me, puis router)
  │
  ├─ user.account_type === "player" && campaigns.length === 0
  │   └→ PlayerLobby (entrer code invitation, preview, join)
  │
  ├─ user.account_type === "player" && campaigns.length > 0
  │   └→ PlayerView (existant, avec sélecteur de campagne)
  │
  ├─ user.account_type === "gm" && campaigns.length === 0
  │   └→ GmLobby (créer campagne, gérer profil)
  │
  └─ user.account_type === "gm" && campaigns.length > 0
      └→ GM VTT (existant)
```

---

## 🗂️ Fichiers — Créer / Modifier / Supprimer

| Action | Fichier | Notes |
|--------|---------|-------|
| ✨ Créer | `frontend/src/components/AuthPage.tsx` | Page unique login/register — ~250 lignes |
| ✨ Créer | `frontend/src/components/PlayerLobby.tsx` | Hall joueur sans campagne — ~150 lignes |
| ✨ Créer | `frontend/src/components/GmLobby.tsx` | Hall MJ sans campagne — ~120 lignes |
| ✨ Créer | `frontend/src/components/InvitePreviewCard.tsx` | Extrait de InvitePage, réutilisable — ~80 lignes |
| 🔧 Modifier | `frontend/src/App.tsx` | Nouveau routage 4 branches — ~40 lignes changées |
| 🔧 Modifier | `frontend/src/components/InvitePage.tsx` | Réduit : garde juste le flux auth+join pour les liens directs, délègue à InvitePreviewCard |
| 🔧 Modifier | `backend/app/schemas.py` | Ajout `confirm_password`, validation complexité |
| 🔧 Modifier | `backend/app/routers/auth.py` | Validation `confirm_password`, honeypot |
| 🔧 Modifier | `frontend/src/styles.css` | Styles pour AuthPage, PlayerLobby, GmLobby |
| 🗑️ Supprimer | `frontend/src/components/LandingPage.tsx` | Plus nécessaire |
| 🗑️ Supprimer | `frontend/src/components/AuthView.tsx` | Plus nécessaire |
| 📝 Doc | `.hermes/developer-rules.md` | Ajouter règle: après modif auth, smoke test complet des 4 parcours |

---

## 🔒 Sécurité inscription — Détail

### Backend
1. **`confirm_password`** : nouveau champ dans `RegisterRequest`, validé côté backend (`password != confirm_password → 422`)
2. **Complexité mot de passe** : regex `^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$` → au moins 1 minuscule, 1 majuscule, 1 chiffre, 8+ caractères
3. **Honeypot anti-bot** : champ caché `website` dans le formulaire (nom attractif pour les bots), si rempli → 200 OK silencieux (pas d'erreur visible, pour ne pas alerter le bot) mais pas de création de compte
4. **Rate limiting existant** : keep `5/minute` sur `/api/auth/register`

### Frontend
1. Champ `confirm_password` visible, validation client-side avant envoi
2. Indicateur visuel de force du mot de passe (couleur + barre)
3. Champ honeypot caché en CSS, rempli automatiquement par les bots

---

## 📋 Tâches

### Phase 1 — Backend sécurité inscription

#### Task 1.1: Ajouter confirm_password et complexité dans schemas.py

**Objective:** Valider que le mot de passe est confirmé et respecte la complexité minimale

**Files:**
- Modify: `backend/app/schemas.py:16-20`

```python
# Dans RegisterRequest, après password:
class RegisterRequest(BaseModel):
    email: EmailStr = Field(max_length=255)
    display_name: str = Field(min_length=2, max_length=80)
    password: str = Field(min_length=8, max_length=200)
    confirm_password: str = Field(min_length=8, max_length=200)
    account_type: AccountType = Field(default="gm")
    invite_token: str | None = Field(default=None, max_length=64)
    # Honeypot — les bots remplissent ce champ
    website: str = Field(default="", max_length=0)  # max_length=0 → rejette toute valeur

    @field_validator("password")
    @classmethod
    def password_complexity(cls, v: str) -> str:
        if not re.search(r"[a-z]", v):
            raise ValueError("Le mot de passe doit contenir au moins une minuscule")
        if not re.search(r"[A-Z]", v):
            raise ValueError("Le mot de passe doit contenir au moins une majuscule")
        if not re.search(r"\d", v):
            raise ValueError("Le mot de passe doit contenir au moins un chiffre")
        return v

    @model_validator(mode="after")
    def passwords_match(self) -> "RegisterRequest":
        if self.password != self.confirm_password:
            raise ValueError("Les mots de passe ne correspondent pas")
        return self
```

#### Task 1.2: Ajouter validation honeypot dans auth.py

**Files:**
- Modify: `backend/app/routers/auth.py:56-65`

```python
# Dans la fonction register(), après la ligne 58:
async def register(request: Request, payload: RegisterRequest) -> AuthResponse:
    # Honeypot anti-bot — si le champ caché est rempli, c'est un bot
    if payload.website:
        # Répondre 200 silencieusement pour ne pas alerter le bot
        # Mais ne pas créer de compte
        raise HTTPException(status_code=400, detail="Requête invalide")
    
    # ... reste inchangé
```

#### Task 1.3: Tests unitaires backend

```bash
cd backend && .venv/bin/pytest tests/test_auth.py -v -k "password or confirm or honeypot"
```

Ajouter 4 tests:
- `test_register_password_mismatch` → 422
- `test_register_password_no_uppercase` → 422
- `test_register_password_no_digit` → 422
- `test_register_honeypot_filled` → 400

---

### Phase 2 — Frontend AuthPage (unifié)

#### Task 2.1: Créer AuthPage.tsx

**Objective:** Remplacer LandingPage + AuthView par une seule page login/register

**Files:**
- Create: `frontend/src/components/AuthPage.tsx`

```tsx
import { FormEvent, useState } from "react";
import { ArrowLeft, Crown, Eye, EyeOff, LogIn, Shield, Swords, UserPlus } from "lucide-react";

type AuthMode = "login" | "register";
type AccountType = "gm" | "player";

type AuthPageProps = {
  /** If the user arrived via /invite/{token}, pre-select player mode */
  inviteToken?: string | null;
  isBusy: boolean;
  message: string;
  onSubmit: (payload: AuthSubmitPayload) => Promise<void>;
};

export type AuthSubmitPayload = {
  mode: AuthMode;
  email: string;
  password: string;
  display_name?: string;
  confirm_password?: string;
  account_type: AccountType;
  invite_token?: string;
};

export function AuthPage({ inviteToken, isBusy, message, onSubmit }: AuthPageProps) {
  const [mode, setMode] = useState<AuthMode>("register");
  const [accountType, setAccountType] = useState<AccountType>(
    inviteToken ? "player" : "gm"
  );
  const [showPassword, setShowPassword] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  function passwordStrength(pw: string): { score: number; label: string } {
    let score = 0;
    if (pw.length >= 8) score++;
    if (/[a-z]/.test(pw)) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/\d/.test(pw)) score++;
    if (/[^a-zA-Z0-9]/.test(pw)) score++;
    const labels = ["Très faible", "Faible", "Moyen", "Bon", "Fort"];
    return { score, label: labels[Math.min(score, 4)] };
  }

  const strength = passwordStrength(password);
  const passwordsMatch = mode === "login" || password === confirmPassword;
  const canSubmit = mode === "login" || (passwordsMatch && strength.score >= 3);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await onSubmit({
      mode,
      email: String(form.get("email")),
      password: String(form.get("password")),
      display_name: mode === "register" ? String(form.get("display_name")) : undefined,
      confirm_password: mode === "register" ? String(form.get("confirm_password")) : undefined,
      account_type: accountType,
      invite_token: inviteToken ?? undefined,
    });
  }

  return (
    <main className="auth-page-shell">
      <section className="auth-page-hero">
        <div className="brand-mark large">
          <Swords aria-hidden="true" size={48} />
          <h1>DnD Virtual Tabletop</h1>
        </div>
        <p className="auth-page-tagline">
          {mode === "register"
            ? "Crée ton compte et rejoins l'aventure."
            : "Retrouve tes campagnes et tes personnages."}
        </p>
        <div className="status-strip">
          <span>Backend dédié</span>
          <span>PostgreSQL isolé</span>
          <span>Connexion sécurisée</span>
        </div>
      </section>

      <section className="auth-page-form">
        {/* Tabs login/register */}
        <div className="auth-tabs">
          <button
            className={mode === "register" ? "active" : ""}
            onClick={() => setMode("register")}
            type="button"
          >
            <UserPlus aria-hidden="true" size={16} />
            Inscription
          </button>
          <button
            className={mode === "login" ? "active" : ""}
            onClick={() => setMode("login")}
            type="button"
          >
            <LogIn aria-hidden="true" size={16} />
            Connexion
          </button>
        </div>

        <form onSubmit={handleSubmit} className="form-stack">
          {/* Account type selector (registration only) */}
          {mode === "register" && (
            <fieldset className="account-type-radio-group">
              <legend>Type de compte</legend>
              <label className={`account-type-radio ${accountType === "gm" ? "selected" : ""}`}>
                <input
                  type="radio"
                  name="account_type_radio"
                  value="gm"
                  checked={accountType === "gm"}
                  onChange={() => setAccountType("gm")}
                />
                <Crown aria-hidden="true" size={24} />
                <div>
                  <strong>Maître du Jeu</strong>
                  <small>Créer et gérer des campagnes</small>
                </div>
              </label>
              <label className={`account-type-radio ${accountType === "player" ? "selected" : ""}`}>
                <input
                  type="radio"
                  name="account_type_radio"
                  value="player"
                  checked={accountType === "player"}
                  onChange={() => setAccountType("player")}
                />
                <UserPlus aria-hidden="true" size={24} />
                <div>
                  <strong>Joueur</strong>
                  <small>Rejoindre une campagne existante</small>
                </div>
              </label>
            </fieldset>
          )}

          {/* Display name (registration only) */}
          {mode === "register" && (
            <label>
              Nom affiché
              <input name="display_name" minLength={2} maxLength={80} required />
            </label>
          )}

          {/* Email */}
          <label>
            Email
            <input name="email" type="email" required autoComplete="email" />
          </label>

          {/* Password */}
          <label>
            Mot de passe
            <div className="password-input-wrapper">
              <input
                name="password"
                type={showPassword ? "text" : "password"}
                minLength={8}
                required
                autoComplete={mode === "register" ? "new-password" : "current-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                className="icon-button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Cacher le mot de passe" : "Afficher le mot de passe"}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </label>

          {/* Password strength indicator (registration only) */}
          {mode === "register" && password.length > 0 && (
            <div className="password-strength">
              <div className="password-strength-bar">
                <div
                  className={`password-strength-fill strength-${strength.score}`}
                  style={{ width: `${(strength.score / 5) * 100}%` }}
                />
              </div>
              <span>{strength.label}</span>
            </div>
          )}

          {/* Confirm password (registration only) */}
          {mode === "register" && (
            <label>
              Confirmer le mot de passe
              <input
                name="confirm_password"
                type="password"
                minLength={8}
                required
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
              {confirmPassword.length > 0 && !passwordsMatch && (
                <span className="field-error">Les mots de passe ne correspondent pas</span>
              )}
            </label>
          )}

          {/* Invite token (registration as player only) */}
          {mode === "register" && accountType === "player" && !inviteToken && (
            <label>
              Code d'invitation
              <input
                name="invite_token"
                placeholder="Code reçu de ton MJ"
                maxLength={64}
                required
              />
            </label>
          )}

          {/* Honeypot — invisible to humans */}
          <input
            type="text"
            name="website"
            tabIndex={-1}
            autoComplete="off"
            className="honeypot"
            aria-hidden="true"
          />

          {/* Hidden fields */}
          <input type="hidden" name="account_type" value={accountType} />
          {inviteToken && <input type="hidden" name="invite_token" value={inviteToken} />}

          {message && <p className="message-text">{message}</p>}

          <button
            className="primary-button"
            disabled={isBusy || !canSubmit}
            type="submit"
          >
            <Shield aria-hidden="true" size={16} />
            {isBusy
              ? "Patientez..."
              : mode === "register"
                ? accountType === "gm"
                  ? "Créer mon compte MJ"
                  : "Créer mon compte Joueur"
                : "Se connecter"}
          </button>
        </form>

        {/* Link to toggle mode */}
        <p className="auth-switch-hint">
          {mode === "register" ? (
            <>Déjà un compte ?{" "}
              <button className="link-button" onClick={() => setMode("login")} type="button">
                Connecte-toi
              </button>
            </>
          ) : (
            <>Pas encore de compte ?{" "}
              <button className="link-button" onClick={() => setMode("register")} type="button">
                Inscris-toi
              </button>
            </>
          )}
        </p>
      </section>
    </main>
  );
}
```

#### Task 2.2: CSS pour AuthPage

**Files:**
- Modify: `frontend/src/styles.css`

Classes à ajouter :
- `.auth-page-shell` — flex row, full height, dark bg
- `.auth-page-hero` — left panel, branding, tagline
- `.auth-page-form` — right panel, form
- `.account-type-radio-group` — radio card group (2 cards: GM / Joueur)
- `.account-type-radio` — card style avec icône + texte
- `.account-type-radio.selected` — bordure accent
- `.password-input-wrapper` — input + toggle button inline
- `.password-strength` — barre + label
- `.password-strength-fill` — barre colorée (0-5)
- `.honeypot` — position: absolute, opacity: 0, pointer-events: none
- `.auth-switch-hint` — lien pour basculer login/register

---

### Phase 3 — Frontend PlayerLobby

#### Task 3.1: Créer InvitePreviewCard.tsx (extrait de InvitePage)

**Objective:** Composant réutilisable pour preview + join d'une invitation

**Files:**
- Create: `frontend/src/components/InvitePreviewCard.tsx`

```tsx
import { useState } from "react";
import { Castle, Swords, UserPlus } from "lucide-react";

type InvitePreview = {
  campaign_name: string;
  role: string;
  remaining_uses: number | null;
  expires_at: string | null;
};

type InvitePreviewCardProps = {
  inviteToken: string;
  authToken: string;
  onJoined: () => void;
};

export function InvitePreviewCard({ inviteToken, authToken, onJoined }: InvitePreviewCardProps) {
  const [preview, setPreview] = useState<InvitePreview | null>(null);
  const [error, setError] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);

  async function loadPreview() {
    try {
      const res = await fetch(`/api/invites/${inviteToken}`);
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).detail ?? "Invitation introuvable");
      setPreview(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setLoaded(true);
    }
  }

  async function handleJoin() {
    setIsBusy(true);
    try {
      const res = await fetch(`/api/invites/${inviteToken}/join`, {
        method: "POST",
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (!res.ok) throw new Error("Impossible de rejoindre");
      onJoined();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Échec");
    } finally {
      setIsBusy(false);
    }
  }

  if (!loaded) { void loadPreview(); return <p>Chargement...</p>; }
  if (error) return <div className="invite-error"><Castle size={32} /><p>{error}</p></div>;
  if (!preview) return <p>Chargement...</p>;

  return (
    <div className="invite-preview-card">
      <Swords size={32} />
      <h3>{preview.campaign_name}</h3>
      <p>Rôle: <strong>{preview.role === "player" ? "Joueur" : preview.role}</strong></p>
      {preview.remaining_uses !== null && <p>Places restantes: {preview.remaining_uses}</p>}
      <button className="primary-button" disabled={isBusy} onClick={handleJoin} type="button">
        <UserPlus size={16} /> Rejoindre la campagne
      </button>
      {error && <p className="error-text">{error}</p>}
    </div>
  );
}
```

#### Task 3.2: Créer PlayerLobby.tsx

**Objective:** Hall d'accueil pour joueur sans campagne

**Files:**
- Create: `frontend/src/components/PlayerLobby.tsx`

```tsx
import { FormEvent, useState } from "react";
import { Castle, DoorOpen, UserPlus } from "lucide-react";
import { InvitePreviewCard } from "./InvitePreviewCard";

type PlayerLobbyProps = {
  token: string;
  userDisplayName: string;
  onLogout: () => void;
  onJoined: () => void;
};

export function PlayerLobby({ token, userDisplayName, onLogout, onJoined }: PlayerLobbyProps) {
  const [inviteCode, setInviteCode] = useState("");
  const [submittedToken, setSubmittedToken] = useState<string | null>(null);
  const [error, setError] = useState("");

  function handleSubmitInvite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const code = inviteCode.trim();
    if (!code) return;

    // Try to extract token from full URL (e.g. https://.../invite/abc123)
    const match = code.match(/\/invite\/([\w-]+)/);
    const token = match ? match[1] : code;

    setSubmittedToken(token);
    setError("");
  }

  return (
    <main className="lobby-shell player-lobby">
      <header className="lobby-header">
        <div className="brand-mark compact">
          <Castle aria-hidden="true" />
          DnD
        </div>
        <div className="lobby-user-info">
          <span>{userDisplayName}</span>
          <span className="role-badge player">Joueur</span>
        </div>
        <button className="ghost-button" onClick={onLogout} type="button">
          <DoorOpen aria-hidden="true" size={16} />
          Déconnexion
        </button>
      </header>

      <section className="lobby-content">
        <div className="lobby-hero">
          <Castle size={64} />
          <h2>Bienvenue, {userDisplayName} !</h2>
          <p className="muted">
            Tu n'as pas encore rejoint de campagne. Entre le code d'invitation
            que ton MJ t'a envoyé pour commencer l'aventure.
          </p>
        </div>

        <div className="lobby-invite-section">
          <form onSubmit={handleSubmitInvite} className="invite-code-form">
            <label>
              Code d'invitation ou lien
              <div className="invite-input-row">
                <input
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value)}
                  placeholder="abc123 ou https://...invite/abc123"
                  maxLength={200}
                />
                <button className="primary-button" type="submit">
                  <UserPlus size={16} />
                  Vérifier
                </button>
              </div>
            </label>
          </form>

          {submittedToken && (
            <InvitePreviewCard
              inviteToken={submittedToken}
              authToken={token}
              onJoined={onJoined}
            />
          )}

          {error && <p className="error-text">{error}</p>}
        </div>
      </section>

      <footer className="lobby-footer">
        <span>En attente d'une invitation de ton MJ</span>
      </footer>
    </main>
  );
}
```

#### Task 3.3: CSS pour PlayerLobby

Classes à ajouter dans `styles.css` :
- `.lobby-shell` — full height, dark bg
- `.player-lobby` — layout spécifique joueur
- `.lobby-header` — top bar: branding + user + logout
- `.lobby-content` — centered content
- `.lobby-hero` — icône + message d'accueil
- `.lobby-invite-section` — formulaire invitation
- `.invite-code-form` — input + bouton en ligne
- `.invite-preview-card` — carte preview invitation
- `.invite-input-row` — flex row pour input + button

---

### Phase 4 — Frontend GmLobby

#### Task 4.1: Créer GmLobby.tsx

**Objective:** Hall d'accueil pour MJ sans campagne, avec formulaire de création

**Files:**
- Create: `frontend/src/components/GmLobby.tsx`

```tsx
import { FormEvent, useState } from "react";
import { Castle, Crown, DoorOpen, Plus } from "lucide-react";

type GmLobbyProps = {
  userDisplayName: string;
  isBusy: boolean;
  message: string;
  onCreateCampaign: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  onLogout: () => void;
};

export function GmLobby({ userDisplayName, isBusy, message, onCreateCampaign, onLogout }: GmLobbyProps) {
  return (
    <main className="lobby-shell gm-lobby">
      <header className="lobby-header">
        <div className="brand-mark compact">
          <Castle aria-hidden="true" />
          DnD
        </div>
        <div className="lobby-user-info">
          <span>{userDisplayName}</span>
          <span className="role-badge gm">MJ</span>
        </div>
        <button className="ghost-button" onClick={onLogout} type="button">
          <DoorOpen aria-hidden="true" size={16} />
          Déconnexion
        </button>
      </header>

      <section className="lobby-content">
        <div className="lobby-hero">
          <Crown size={64} />
          <h2>Bienvenue, {userDisplayName} !</h2>
          <p className="muted">
            Tu n'as pas encore de campagne. Crée ta première table pour
            commencer à préparer tes scènes, tokens et invitations.
          </p>
        </div>

        <div className="lobby-create-section">
          <h3>Créer une campagne</h3>
          <form onSubmit={onCreateCampaign} className="form-stack">
            <label>
              Nom de la campagne
              <input name="name" minLength={2} maxLength={120} required placeholder="Les Oubliés de Faerûn" />
            </label>
            <label>
              Description (optionnelle)
              <textarea name="description" maxLength={2000} rows={4} placeholder="Une brève description pour tes joueurs..." />
            </label>
            {message && <p className="message-text">{message}</p>}
            <button className="primary-button" disabled={isBusy} type="submit">
              <Plus aria-hidden="true" size={16} />
              {isBusy ? "Création..." : "Créer la campagne"}
            </button>
          </form>
        </div>
      </section>

      <footer className="lobby-footer">
        <span>Prêt à écrire ta légende</span>
      </footer>
    </main>
  );
}
```

#### Task 4.2: CSS pour GmLobby

Classes à ajouter dans `styles.css` :
- `.gm-lobby` — layout spécifique MJ
- `.role-badge` — badge "MJ" ou "Joueur"
- `.role-badge.gm` — couleur or/dorée
- `.role-badge.player` — couleur bleue
- `.lobby-create-section` — carte formulaire création

---

### Phase 5 — Refonte App.tsx routing

#### Task 5.1: Nouveau routage 4 branches

**Objective:** Remplacer les conditions actuelles par les 4 layouts distincts

**Files:**
- Modify: `frontend/src/App.tsx`

Étapes détaillées :

1. **Supprimer** l'import `LandingPage` et `AuthView` (lignes 18, 23)
2. **Ajouter** les imports `AuthPage`, `PlayerLobby`, `GmLobby`
3. **Supprimer** les states `landingStep`, `accountType` (lignes 73-74)
4. **Ajouter** state `accountType` dérivé de `user.account_type` après auth
5. **Remplacer** le bloc de rendu (lignes ~1039-1115) par :

```tsx
// ── Routing ──────────────────────────────────────────────────

// 1. Invite link (persists until joined or dismissed)
if (inviteToken && !user) {
  return (
    <AuthPage
      inviteToken={inviteToken}
      isBusy={isBusy}
      message={message}
      onSubmit={async (payload) => {
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
          // Registration auto-joins; clear invite after
          if (payload.mode === "register") {
            setInviteToken(null);
            window.history.pushState({}, "", "/");
          }
        } catch (err) {
          setMessage(err instanceof Error ? err.message : "Échec");
        } finally {
          setIsBusy(false);
        }
      }}
    />
  );
}

// 2. Not authenticated → unified AuthPage
if (!user) {
  return (
    <AuthPage
      inviteToken={null}
      isBusy={isBusy}
      message={message}
      onSubmit={async (payload) => {
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
        } catch (err) {
          setMessage(err instanceof Error ? err.message : "Échec");
        } finally {
          setIsBusy(false);
        }
      }}
    />
  );
}

// 3. Player — no campaign → PlayerLobby
if (user.account_type === "player" && campaigns.length === 0) {
  return (
    <PlayerLobby
      token={token}
      userDisplayName={user.display_name}
      onLogout={logout}
      onJoined={() => {
        void loadCampaigns(token);
      }}
    />
  );
}

// 4. Player — has campaign → PlayerView (with campaign selector)
if (user.account_type === "player" && campaigns.length > 0) {
  return (
    <PlayerView
      campaign={selectedCampaign}
      token={token}
      userDisplayName={user.display_name}
      presenceCount={presenceCount}
      onLogout={logout}
    />
  );
}

// 5. GM — no campaign → GmLobby
if (user.account_type === "gm" && campaigns.length === 0) {
  return (
    <GmLobby
      userDisplayName={user.display_name}
      isBusy={isBusy}
      message={message}
      onCreateCampaign={handleCreateCampaign}
      onLogout={logout}
    />
  );
}

// 6. GM — has campaign → full VTT (existing, unchanged)
// ... le reste du return existant (lignes 1131+) reste inchangé
```

6. **Supprimer** les blocs de rendu LandingPage / AuthView qui étaient avant (lignes ~1067-1115)
7. **Supprimer** le bloc InvitePage conditionnel (lignes ~1039-1065) — remplacé par la branche 1 ci-dessus
8. Modifier `handleAuth` → renommé ou absorbé dans `onSubmit` de AuthPage

#### Task 5.2: Nettoyage des imports et states inutilisés

**Files:**
- Modify: `frontend/src/App.tsx`

- Supprimer `InvitePage` import (ligne 22)
- Supprimer `LandingPage` import (ligne 23)  
- Garder `AuthView` import temporairement (utilisé par InvitePage résiduel) — puis supprimer
- Supprimer states: `landingStep`, `accountType` (séparé), `mode` (absorbé dans AuthPage)
- Déplacer `accountType` en dérivé: `const accountType = user?.account_type ?? "gm"`

---

### Phase 6 — Adaptation InvitePage

#### Task 6.1: Réduire InvitePage pour le cas "déjà connecté + lien invite"

**Objectif:** Garder uniquement le cas où un utilisateur déjà connecté arrive via un lien d'invitation

**Files:**
- Modify: `frontend/src/components/InvitePage.tsx`

Réduire à :
```tsx
// InvitePage → utilisé UNIQUEMENT quand l'utilisateur est déjà connecté
// et arrive via /invite/{token}. Le cas non-connecté est géré par AuthPage.
export function InvitePage({ inviteToken, token, userDisplayName, onJoined }: InvitePageProps) {
  // Utilise InvitePreviewCard pour la preview + join
  // Pas de formulaire d'auth — l'utilisateur est déjà connecté
}
```

Note: après cette réduction, ce composant est quasiment un wrapper autour de `InvitePreviewCard`. On pourrait même le supprimer complètement et gérer le cas dans App.tsx directement. À discuter.

---

### Phase 7 — Smoke tests & validation

#### Task 7.1: Smoke test backend — sécurité inscription

Script Python shell qui teste :
1. Inscription avec password mismatch → 422
2. Inscription sans majuscule → 422  
3. Inscription sans chiffre → 422
4. Honeypot rempli → 400
5. Inscription valide GM → 201 + token
6. Inscription valide Player avec invite → 201 + token + membre campagne
7. Login → 200 + token

#### Task 7.2: Build frontend

```bash
cd frontend && npx tsc --noEmit && npx vite build
```

#### Task 7.3: Tests backend

```bash
cd backend && .venv/bin/pytest tests/ -q
```

---

### Phase 8 — Documentation

#### Task 8.1: Mise à jour CHANGELOG, README, roadmap

- CHANGELOG: ajouter entrée « Refonte auth & routage 4 layouts »
- README: mettre à jour le schéma de navigation
- roadmap: marquer cette phase comme complétée

#### Task 8.2: Mise à jour developer-rules.md

Ajouter règle : « Après toute modification du flux d'authentification, effectuer un smoke test des 4 parcours : player+campagne, player sans campagne, gm+campagne, gm sans campagne »

---

## 📊 Estimation

| Phase | Contenu | Lignes | Fichiers |
|-------|---------|--------|----------|
| 1. Backend sécurité | schemas.py + auth.py | +30 | 2 modifiés |
| 2. AuthPage | Composant + CSS | +250 | 1 créé, 1 modifié |
| 3. PlayerLobby | PlayerLobby + InvitePreviewCard + CSS | +200 | 2 créés, 1 modifié |
| 4. GmLobby | Composant + CSS | +120 | 1 créé, 1 modifié |
| 5. App.tsx refonte | Routing 4 branches | ~60 changées | 1 modifié |
| 6. InvitePage cleanup | Réduction | −150 | 1 modifié |
| 7. Tests | Backend + frontend build | — | — |
| 8. Doc | README, CHANGELOG | — | 3 modifiés |

**Total estimé :** ~6-8 commits, 4 nouveaux composants, 3 supprimés, 7 fichiers modifiés
