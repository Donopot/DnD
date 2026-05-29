import { Castle } from "lucide-react";

import type { Campaign } from "../api/types";

type CampaignListProps = {
  campaigns: Campaign[];
  selectedCampaignId: string;
  onSelectCampaign: (campaignId: string) => void;
};

export function CampaignList({
  campaigns,
  selectedCampaignId,
  onSelectCampaign,
}: CampaignListProps) {
  return (
    <section className="panel campaign-list">
      <h2>Tables actives</h2>

      {campaigns.length === 0 ? (
        <div className="empty-state">
          <Castle aria-hidden="true" />
          <p>Aucune campagne pour le moment.</p>
        </div>
      ) : (
        campaigns.map((campaign) => (
          <button
            className={`campaign-row ${selectedCampaignId === campaign.id ? "selected" : ""}`}
            key={campaign.id}
            onClick={() => onSelectCampaign(campaign.id)}
            type="button"
          >
            <span>
              <strong>{campaign.name}</strong>
              <small>{campaign.member_count} membre(s)</small>
            </span>
            <em>{campaign.role}</em>
          </button>
        ))
      )}
    </section>
  );
}
