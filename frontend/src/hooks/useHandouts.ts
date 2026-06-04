import { useCallback, useState } from "react";
import type { Handout } from "../api/types";
import { apiRequest } from "../api/client";

export interface UseHandoutsOptions {
  token: string;
  onError: (msg: string) => void;
  onMessage?: (msg: string) => void;
  onBusyStart: () => void;
  onBusyEnd: () => void;
}

export interface UseHandoutsReturn {
  handouts: Handout[];
  loadHandouts: (campaignId: string) => Promise<void>;
  createHandout: (
    campaignId: string,
    title: string,
    content: string,
    visibility: string,
    sceneId: string | null,
  ) => Promise<void>;
  revealHandout: (handout: Handout) => Promise<void>;
  deleteHandout: (handout: Handout) => Promise<void>;
}

export function useHandouts(opts: UseHandoutsOptions): UseHandoutsReturn {
  const { token, onError, onMessage, onBusyStart, onBusyEnd } = opts;
  const [handouts, setHandouts] = useState<Handout[]>([]);

  async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
    return apiRequest<T>(path, token, options);
  }

  const loadHandouts = useCallback(
    async (campaignId: string) => {
      try {
        setHandouts(await request<Handout[]>(`/api/campaigns/${campaignId}/handouts`));
      } catch (error) {
        onError(error instanceof Error ? error.message : "Unable to load handouts");
      }
    },
    [token, onError],
  );

  const createHandout = useCallback(
    async (
      campaignId: string,
      title: string,
      content: string,
      visibility: string,
      sceneId: string | null,
    ) => {
      onBusyStart();
      try {
        const handout = await request<Handout>(`/api/campaigns/${campaignId}/handouts`, {
          method: "POST",
          body: JSON.stringify({ title, content, visibility, scene_id: sceneId }),
        });
        setHandouts((current) => [handout, ...current]);
        onMessage?.("Handout cree.");
      } catch (error) {
        onError(error instanceof Error ? error.message : "Unable to create handout");
      } finally {
        onBusyEnd();
      }
    },
    [token, onError, onBusyStart, onBusyEnd],
  );

  const revealHandout = useCallback(
    async (handout: Handout) => {
      onBusyStart();
      try {
        const updated = await request<Handout>(`/api/handouts/${handout.id}`, {
          method: "PATCH",
          body: JSON.stringify({ is_revealed: true }),
        });
        setHandouts((current) => current.map((item) => (item.id === updated.id ? updated : item)));
        onMessage?.(`Handout "${updated.title}" partage aux joueurs.`);
      } catch (error) {
        onError(error instanceof Error ? error.message : "Unable to reveal handout");
      } finally {
        onBusyEnd();
      }
    },
    [token, onError, onBusyStart, onBusyEnd],
  );

  const deleteHandout = useCallback(
    async (handout: Handout) => {
      onBusyStart();
      try {
        await request<void>(`/api/handouts/${handout.id}`, { method: "DELETE" });
        setHandouts((current) => current.filter((item) => item.id !== handout.id));
        onMessage?.("Handout supprime.");
      } catch (error) {
        onError(error instanceof Error ? error.message : "Unable to delete handout");
      } finally {
        onBusyEnd();
      }
    },
    [token, onError, onBusyStart, onBusyEnd],
  );

  return { handouts, loadHandouts, createHandout, revealHandout, deleteHandout };
}
