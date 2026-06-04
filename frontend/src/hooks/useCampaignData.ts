import { useCallback, useMemo, useState } from "react";
import type { Campaign, Invite, Member } from "../api/types";
import { apiRequest } from "../api/client";

export interface UseCampaignDataReturn {
  campaigns: Campaign[];
  selectedCampaign: Campaign | undefined;
  selectedCampaignId: string;
  members: Member[];
  latestInvite: Invite | null;
  activeInvites: Invite[];
  loadCampaigns: (overrideToken?: string) => Promise<void>;
  selectCampaign: (id: string) => void;
  clearCampaigns: () => void;
  createCampaign: (name: string, description: string) => Promise<Campaign>;
  loadMembers: (campaignId: string) => Promise<void>;
  clearMembers: () => void;
  loadInvites: (campaignId?: string) => Promise<void>;
  createInvite: () => Promise<Invite>;
  revokeInvite: (token: string) => Promise<void>;
  clearInvites: () => void;
  clearLatestInvite: () => void;
}

export function useCampaignData(token: string): UseCampaignDataReturn {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>("");
  const [members, setMembers] = useState<Member[]>([]);
  const [latestInvite, setLatestInvite] = useState<Invite | null>(null);
  const [activeInvites, setActiveInvites] = useState<Invite[]>([]);

  const selectedCampaign = useMemo(
    () => campaigns.find((c) => c.id === selectedCampaignId) ?? campaigns[0],
    [campaigns, selectedCampaignId],
  );

  const loadCampaigns = useCallback(
    async (overrideToken?: string) => {
      const t = overrideToken || token;
      const data = await apiRequest<Campaign[]>("/api/campaigns", t);
      setCampaigns(data);
      if (data.length > 0) {
        setSelectedCampaignId((current) => current || data[0].id);
      }
    },
    [token],
  );

  const selectCampaign = useCallback((id: string) => {
    setSelectedCampaignId(id);
    setLatestInvite(null);
  }, []);

  const clearCampaigns = useCallback(() => {
    setCampaigns([]);
    setSelectedCampaignId("");
  }, []);

  const createCampaign = useCallback(
    async (name: string, description: string): Promise<Campaign> => {
      const campaign = await apiRequest<Campaign>("/api/campaigns", token, {
        method: "POST",
        body: JSON.stringify({ name, description }),
      });
      setCampaigns((current) => [campaign, ...current]);
      setSelectedCampaignId(campaign.id);
      return campaign;
    },
    [token],
  );

  const loadMembers = useCallback(
    async (campaignId: string) => {
      const data = await apiRequest<Member[]>(
        `/api/campaigns/${campaignId}/members`,
        token,
      );
      setMembers(data);
    },
    [token],
  );

  const clearMembers = useCallback(() => {
    setMembers([]);
  }, []);

  const loadInvites = useCallback(
    async (campaignId?: string) => {
      const cid = campaignId || selectedCampaignId;
      if (!cid) return;
      try {
        const invites = await apiRequest<Invite[]>(
          `/api/campaigns/${cid}/invites`,
          token,
        );
        setActiveInvites(invites);
      } catch {
        // Silently ignore — user may not be GM
      }
    },
    [token, selectedCampaignId],
  );

  const createInvite = useCallback(async (): Promise<Invite> => {
    if (!selectedCampaignId) {
      throw new Error("No campaign selected");
    }
    const invite = await apiRequest<Invite>(
      `/api/campaigns/${selectedCampaignId}/invites`,
      token,
      {
        method: "POST",
        body: JSON.stringify({ role: "player", expires_in_days: 14, max_uses: 10 }),
      },
    );
    setLatestInvite(invite);
    void loadInvites();
    return invite;
  }, [token, selectedCampaignId, loadInvites]);

  const revokeInvite = useCallback(
    async (inviteToken: string) => {
      await apiRequest<void>(
        `/api/invites/${inviteToken}/revoke`,
        token,
        { method: "POST" },
      );
      setActiveInvites((prev) => prev.filter((inv) => inv.token !== inviteToken));
      setLatestInvite((prev) => (prev?.token === inviteToken ? null : prev));
    },
    [token],
  );

  const clearInvites = useCallback(() => {
    setLatestInvite(null);
    setActiveInvites([]);
  }, []);

  const clearLatestInvite = useCallback(() => {
    setLatestInvite(null);
  }, []);

  return {
    campaigns,
    selectedCampaign,
    selectedCampaignId,
    members,
    latestInvite,
    activeInvites,
    loadCampaigns,
    selectCampaign,
    clearCampaigns,
    createCampaign,
    loadMembers,
    clearMembers,
    loadInvites,
    createInvite,
    revokeInvite,
    clearInvites,
    clearLatestInvite,
  };
}
