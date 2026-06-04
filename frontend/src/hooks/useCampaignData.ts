import { useCallback, useMemo, useState } from "react";
import type { Campaign, Member } from "../api/types";
import { apiRequest } from "../api/client";

export interface UseCampaignDataReturn {
  campaigns: Campaign[];
  selectedCampaign: Campaign | undefined;
  selectedCampaignId: string;
  members: Member[];
  loadCampaigns: (overrideToken?: string) => Promise<void>;
  selectCampaign: (id: string) => void;
  clearCampaigns: () => void;
  createCampaign: (name: string, description: string) => Promise<Campaign>;
  loadMembers: (campaignId: string) => Promise<void>;
  clearMembers: () => void;
}

export function useCampaignData(token: string): UseCampaignDataReturn {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>("");
  const [members, setMembers] = useState<Member[]>([]);

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

  return {
    campaigns,
    selectedCampaign,
    selectedCampaignId,
    members,
    loadCampaigns,
    selectCampaign,
    clearCampaigns,
    createCampaign,
    loadMembers,
    clearMembers,
  };
}
