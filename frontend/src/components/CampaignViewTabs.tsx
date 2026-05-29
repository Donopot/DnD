export type CampaignView = "overview" | "characters" | "session" | "table" | "combat" | "journal";

type CampaignViewTabsProps = {
  activeView: CampaignView;
  onChange: (view: CampaignView) => void;
};

const views: Array<{ id: CampaignView; label: string; description: string }> = [
  { id: "overview", label: "Vue d'ensemble", description: "Campagne, membres et invitations" },
  { id: "characters", label: "Personnages", description: "Fiches et joueurs" },
  { id: "session", label: "Session", description: "Carte, combat et journal live" },
  { id: "table", label: "Table", description: "Carte, scenes, tokens et assets" },
  { id: "combat", label: "Combat", description: "Initiative et tours" },
  { id: "journal", label: "Journal", description: "Jets, notes et historique" },
];

export function CampaignViewTabs({ activeView, onChange }: CampaignViewTabsProps) {
  return (
    <nav className="campaign-view-tabs" aria-label="Navigation campagne">
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
