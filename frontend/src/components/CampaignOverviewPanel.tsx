import { Copy, UserPlus } from "lucide-react";

import type { Campaign, Invite, Member } from "../api/types";

type CampaignOverviewPanelProps = {
  campaign: Campaign;
  members: Member[];
  latestInvite: Invite | null;
  isBusy: boolean;
  onCreateInvite: () => void;
  onCopyInvite: () => void;
};

export function CampaignOverviewPanel({
  campaign,
  members,
  latestInvite,
  isBusy,
  onCreateInvite,
  onCopyInvite,
}: CampaignOverviewPanelProps) {
  return (
    <>
      <p className="muted">
        {campaign.description || "Aucune description pour cette campagne."}
      </p>

      <div className="action-row">
        <button className="primary-button" disabled={isBusy} onClick={onCreateInvite} type="button">
          <UserPlus aria-hidden="true" />
          Inviter un joueur
        </button>

        {latestInvite && (
          <button className="ghost-button" onClick={onCopyInvite} type="button">
            <Copy aria-hidden="true" />
            Copier le lien
          </button>
        )}
      </div>

      {latestInvite && (
        <code className="invite-code">
          {window.location.origin}/invite/{latestInvite.token}
        </code>
      )}

      <h3>Membres</h3>

      <div className="member-list">
        {members.map((member) => (
          <div className="member-row" key={member.user_id}>
            <span>{member.display_name}</span>
            <small>{member.role}</small>
          </div>
        ))}
      </div>
    </>
  );
}
