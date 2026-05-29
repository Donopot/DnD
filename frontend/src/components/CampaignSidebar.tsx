import { DoorOpen, RefreshCw, Swords } from "lucide-react";

type CampaignSidebarProps = {
  onRefresh: () => void;
  onLogout: () => void;
};

export function CampaignSidebar({ onRefresh, onLogout }: CampaignSidebarProps) {
  return (
    <aside className="sidebar">
      <div className="brand-mark compact">
        <Swords aria-hidden="true" />
        DnD
      </div>

      <button className="ghost-button" onClick={onRefresh} type="button">
        <RefreshCw aria-hidden="true" />
        Actualiser
      </button>

      <button className="ghost-button" onClick={onLogout} type="button">
        <DoorOpen aria-hidden="true" />
        Sortir
      </button>
    </aside>
  );
}
