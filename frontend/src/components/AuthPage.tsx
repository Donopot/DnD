import { Crown, Eye, EyeOff, LogIn, Shield, Swords, UserPlus } from "lucide-react";
import { type FormEvent, useState } from "react";

type AuthMode = "login" | "register";
type AccountType = "gm" | "player";

export type AuthSubmitPayload = {
  mode: AuthMode;
  email: string;
  password: string;
  display_name?: string;
  confirm_password?: string;
  account_type: AccountType;
  invite_token?: string;
  /** Honeypot anti-bot — must stay empty */
  website?: string;
};

type AuthPageProps = {
  /** If user arrived via /invite/{token}, pre-select player mode */
  inviteToken?: string | null;
  isBusy: boolean;
  message: string;
  onSubmit: (payload: AuthSubmitPayload) => Promise<void>;
};

export function AuthPage({ inviteToken, isBusy, message, onSubmit }: AuthPageProps) {
  const [mode, setMode] = useState<AuthMode>(inviteToken ? "register" : "login");
  const [accountType, setAccountType] = useState<AccountType>(inviteToken ? "player" : "gm");
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
  const loginValid = mode === "login" ? password.length > 0 : true;
  const canSubmit =
    (mode === "login" && loginValid) ||
    (passwordsMatch && strength.score >= 3 && password.length >= 8);

  const disabledReason =
    mode === "login"
      ? password.length === 0
        ? "Renseigne ton mot de passe."
        : ""
      : password.length < 8
        ? "Le mot de passe doit faire au moins 8 caractères."
        : strength.score < 3
          ? "Ajoute au moins une minuscule, une majuscule et un chiffre."
          : !passwordsMatch
            ? "Les deux mots de passe doivent correspondre."
            : "";

  const disabledReason =
    mode === "login"
      ? password.length === 0
        ? "Renseigne ton mot de passe."
        : ""
      : password.length < 8
        ? "Le mot de passe doit faire au moins 8 caractères."
        : strength.score < 3
          ? "Ajoute au moins une minuscule, une majuscule et un chiffre."
          : !passwordsMatch
            ? "Les deux mots de passe doivent correspondre."
            : "";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isBusy) return;
    const form = new FormData(event.currentTarget);
    await onSubmit({
      mode,
      email: String(form.get("email")).trim(),
      password: String(form.get("password")),
      display_name: mode === "register" ? String(form.get("display_name")) : undefined,
      confirm_password: mode === "register" ? String(form.get("confirm_password")) : undefined,
      account_type: accountType,
      invite_token: (form.get("invite_token")?.toString() || inviteToken || undefined) as
        | string
        | undefined,
      website: String(form.get("website") ?? ""),
    });
  }

  return (
    <main className="auth-page-shell">
      {/* ── Left panel: branding ────────────────────────────────── */}
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

      {/* ── Right panel: form ───────────────────────────────────── */}
      <section className="auth-page-form">
        {/* Tabs login / register */}
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

        <div className="auth-help-box">
          {mode === "login" ? (
            <small>Connecte-toi avec ton email et ton mot de passe. Si tu viens de nettoyer la base, crée un nouveau compte.</small>
          ) : accountType === "player" ? (
            <small>Un compte Joueur nécessite un code d’invitation fourni par le MJ.</small>
          ) : (
            <small>Le mot de passe doit contenir au moins 8 caractères, une minuscule, une majuscule et un chiffre.</small>
          )}
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
              <input
                name="display_name"
                minLength={2}
                maxLength={80}
                required
                autoComplete="name"
              />
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
                maxLength={72}
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

          {/* Password strength (registration only) */}
          {mode === "register" && password.length > 0 && (
            <div className="password-strength">
              <div className="password-strength-bar">
                <div
                  className={`password-strength-fill strength-${strength.score}`}
                  style={{ width: `${(strength.score / 5) * 100}%` }}
                />
              </div>
              <span className={`strength-label strength-${strength.score}`}>{strength.label}</span>
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

          {/* Invite token field (registration as player, no pre-filled token) */}
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

          {/* Honeypot — CSS-only, invisible to humans, attractive to bots */}
          <input type="text" name="website" autoComplete="off" className="honeypot" />

          {/* Hidden fields for account_type and optional invite_token */}
          <input type="hidden" name="account_type" value={accountType} />
          {inviteToken && <input type="hidden" name="invite_token" value={inviteToken} />}

          {message && <p className="message-text">{message}</p>}

          {!canSubmit && disabledReason && <p className="field-error">{disabledReason}</p>}

          <button className="primary-button" disabled={isBusy || !canSubmit} type="submit">
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

        {/* Switch hint */}
        <p className="auth-switch-hint">
          {mode === "register" ? (
            <>
              Déjà un compte ?{" "}
              <button className="link-button" onClick={() => setMode("login")} type="button">
                Connecte-toi
              </button>
            </>
          ) : (
            <>
              Pas encore de compte ?{" "}
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
