import { Crown, Swords, UserPlus } from "lucide-react";

type AccountType = "gm" | "player";

type LandingPageProps = {
  onSelect: (type: AccountType) => void;
};

export function LandingPage({ onSelect }: LandingPageProps) {
  return (
    <main className="landing-shell">
      <section className="landing-hero">
        <div className="brand-mark large">
          <Swords aria-hidden="true" size={48} />
          <h1>DnD Interface</h1>
        </div>
        <p className="landing-tagline">
          Prépare la table avant que les joueurs arrivent — ou rejoins celle de ton MJ.
        </p>
      </section>

      <section className="landing-choices">
        <button
          className="landing-choice gm-choice"
          onClick={() => onSelect("gm")}
          type="button"
        >
          <Crown aria-hidden="true" size={40} />
          <div>
            <h2>Je suis Maître du Jeu</h2>
            <p>
              Crée des campagnes, des scènes, gère le combat et invite tes joueurs.
            </p>
          </div>
        </button>

        <button
          className="landing-choice player-choice"
          onClick={() => onSelect("player")}
          type="button"
        >
          <UserPlus aria-hidden="true" size={40} />
          <div>
            <h2>Je suis Joueur</h2>
            <p>
              Rejoins une campagne avec un code d'invitation, crée ton personnage et joue.
            </p>
          </div>
        </button>
      </section>

      <footer className="landing-footer">
        <span>Backend dédié</span>
        <span>PostgreSQL isolé</span>
        <span>Invitations MJ</span>
      </footer>
    </main>
  );
}
