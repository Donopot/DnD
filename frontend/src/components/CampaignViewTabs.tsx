export type CampaignView =
  | "campaign"
  | "preparation"
  | "live"
  | "characters"
  | "journal"
  | "library"
  | "settings";

type CampaignViewTabsProps = {
  activeView: CampaignView;
  onChange: (view: CampaignView) => void;
};

const views: Array<{ id: CampaignView; label: string; description: string }> = [
  { id: "campaign", label: "Campagne", description: "Infos, membres et invitations" },
  { id: "preparation", label: "Préparation", description: "Scènes, cartes et ressources" },
  { id: "live", label: "Session Live", description: "Carte, modes et panneaux MJ" },
  { id: "characters", label: "Personnages", description: "Fiches et résumé du groupe" },
  { id: "journal", label: "Journal", description: "Archive complète de session" },
  { id: "library", label: "Bibliothèque", description: "PNJ, monstres, cartes et documents" },
  { id: "settings", label: "Paramètres", description: "Permissions, layouts et options" },
];

export function CampaignViewTabs({ activeView, onChange }: CampaignViewTabsProps) {
  return (
    <nav className="campaign-view-tabs gm-workspace-tabs" aria-label="Navigation campagne">
      {views.map((view) => (
        <button
          className={activeView === view.id ? "active" : ""}
          key={view.id}
          onClick={() => onChange(view.id)}
          type="button"
        >
          <strong>{view.label}</strong>
          <small>{view.description}</small>
        </button>
      ))}
    </nav>
  );
}
