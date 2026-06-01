import type { FormEvent } from "react";
import { ArrowLeft, Crown, LogIn, UserPlus } from "lucide-react";

type AuthMode = "login" | "register";
type AccountType = "gm" | "player";

type AuthViewProps = {
  mode: AuthMode;
  accountType: AccountType;
  isBusy: boolean;
  inviteToken?: string | null;
  onModeChange: (mode: AuthMode) => void;
  onBack: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export function AuthView({
  mode,
  accountType,
  isBusy,
  inviteToken,
  onModeChange,
  onBack,
  onSubmit,
}: AuthViewProps) {
  const isGM = accountType === "gm";
  const icon = isGM ? Crown : UserPlus;
  const Icon = icon;

  return (
    <section className="auth-panel" aria-label={isGM ? "Connexion MJ" : "Connexion Joueur"}>
      <div className="auth-header">
        <button className="ghost-button compact" onClick={onBack} type="button">
          <ArrowLeft aria-hidden="true" size={16} />
          Retour
        </button>
        <div className="auth-role-badge">
          <Icon aria-hidden="true" size={20} />
          <span>{isGM ? "Espace MJ" : "Espace Joueur"}</span>
        </div>
      </div>

      <div className="auth-tabs">
        <button
          className={mode === "register" ? "active" : ""}
          onClick={() => onModeChange("register")}
          type="button"
        >
          <UserPlus aria-hidden="true" />
          Inscription
        </button>

        <button
          className={mode === "login" ? "active" : ""}
          onClick={() => onModeChange("login")}
          type="button"
        >
          <LogIn aria-hidden="true" />
          Connexion
        </button>
      </div>

      <form onSubmit={onSubmit} className="form-stack">
        {mode === "register" && (
          <label>
            Nom affiché
            <input name="display_name" minLength={2} maxLength={80} required />
          </label>
        )}

        <label>
          Email
          <input name="email" type="email" required />
        </label>

        <label>
          Mot de passe
          <input name="password" type="password" minLength={8} required />
        </label>

        {/* Hidden: account_type and invite_token for registration */}
        <input type="hidden" name="account_type" value={accountType} />
        {mode === "register" && inviteToken && (
          <input type="hidden" name="invite_token" value={inviteToken} />
        )}

        {/* Show invite token for player registration */}
        {mode === "register" && !isGM && !inviteToken && (
          <label>
            Code d'invitation
            <input
              name="invite_token"
              placeholder="Colle le lien ou le code reçu du MJ"
              maxLength={64}
              required
            />
          </label>
        )}

        <button className="primary-button" disabled={isBusy} type="submit">
          {isBusy
            ? "Traitement..."
            : mode === "register"
              ? isGM
                ? "Créer le compte MJ"
                : "Créer le compte Joueur"
              : "Se connecter"}
        </button>
      </form>
    </section>
  );
}
