import { useCallback, useMemo, useState } from "react";
import type { Campaign } from "../api/types";
import { apiRequest } from "../api/client";

export interface UseCampaignDataReturn {
  campaigns: Campaign[];
  selectedCampaign: Campaign | undefined;
  selectedCampaignId: string;
  loadCampaigns: (overrideToken?: string) => Promise<void>;
  selectCampaign: (id: string) => void;
  clearCampaigns: () => void;
  createCampaign: (name: string, description: string) => Promise<Campaign>;
}

export function useCampaignData(token: string): UseCampaignDataReturn {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>("");

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

  return {
    campaigns,
    selectedCampaign,
    selectedCampaignId,
    loadCampaigns,
    selectCampaign,
    clearCampaigns,
    createCampaign,
  };
}
