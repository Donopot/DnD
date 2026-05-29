import type { FormEvent } from "react";
import { LogIn, UserPlus } from "lucide-react";

type AuthMode = "login" | "register";

type AuthViewProps = {
  mode: AuthMode;
  isBusy: boolean;
  onModeChange: (mode: AuthMode) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export function AuthView({ mode, isBusy, onModeChange, onSubmit }: AuthViewProps) {
  return (
    <section className="auth-panel" aria-label="Connexion">
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
            Nom affiche
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

        <button className="primary-button" disabled={isBusy} type="submit">
          {isBusy ? "Traitement..." : mode === "register" ? "Creer le compte" : "Se connecter"}
        </button>
      </form>
    </section>
  );
}
