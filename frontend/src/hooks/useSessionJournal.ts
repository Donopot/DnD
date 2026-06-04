import { useCallback, useState } from "react";
import type { GameLogEntry, Roll } from "../api/types";
import { apiRequest } from "../api/client";

export interface UseSessionJournalOptions {
  token: string;
  onError: (msg: string) => void;
  onBusyStart: () => void;
  onBusyEnd: () => void;
}

export interface UseSessionJournalReturn {
  rolls: Roll[];
  logEntries: GameLogEntry[];
  setLogEntries: React.Dispatch<React.SetStateAction<GameLogEntry[]>>;
  loadSessionLog: (campaignId: string) => Promise<void>;
  doRoll: (
    campaignId: string,
    formula: string,
    label: string,
    mode: "normal" | "advantage" | "disadvantage",
    visibility: string,
    characterId: string,
  ) => Promise<void>;
  quickRoll: (
    campaignId: string,
    formula: string,
    label: string,
    mode: "normal" | "advantage" | "disadvantage",
    characterId: string,
  ) => Promise<void>;
  addLogNote: (campaignId: string, message: string, visibility: string) => Promise<void>;
  clearJournal: () => void;
}

export function useSessionJournal(
  opts: UseSessionJournalOptions,
): UseSessionJournalReturn {
  const { token, onError, onBusyStart, onBusyEnd } = opts;
  const [rolls, setRolls] = useState<Roll[]>([]);
  const [logEntries, setLogEntries] = useState<GameLogEntry[]>([]);

  async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
    return apiRequest<T>(path, token, options);
  }

  const loadSessionLog = useCallback(
    async (campaignId: string) => {
      try {
        const [rollData, logData] = await Promise.all([
          request<Roll[]>(`/api/campaigns/${campaignId}/rolls`),
          request<GameLogEntry[]>(`/api/campaigns/${campaignId}/log`),
        ]);
        setRolls(rollData);
        setLogEntries(logData);
      } catch (error) {
        onError(error instanceof Error ? error.message : "Unable to load session log");
      }
    },
    [token, onError],
  );

  const clearJournal = useCallback(() => {
    setRolls([]);
    setLogEntries([]);
  }, []);

  const doRoll = useCallback(
    async (
      campaignId: string,
      formula: string,
      label: string,
      mode: "normal" | "advantage" | "disadvantage",
      visibility: string,
      characterId: string,
    ) => {
      onBusyStart();
      try {
        const roll = await request<Roll>(`/api/campaigns/${campaignId}/rolls`, {
          method: "POST",
          body: JSON.stringify({
            formula,
            label,
            mode,
            visibility,
            character_id: characterId || null,
          }),
        });
        setRolls((current) => [roll, ...current].slice(0, 100));
        await loadSessionLog(campaignId);
        onError(`Jet: ${roll.total}`);
      } catch (error) {
        onError(error instanceof Error ? error.message : "Unable to roll dice");
      } finally {
        onBusyEnd();
      }
    },
    [token, onError, onBusyStart, onBusyEnd, loadSessionLog],
  );

  const quickRoll = useCallback(
    async (
      campaignId: string,
      formula: string,
      label: string,
      mode: "normal" | "advantage" | "disadvantage",
      characterId: string,
    ) => {
      await doRoll(campaignId, formula, label, mode, "public", characterId);
    },
    [doRoll],
  );

  const addLogNote = useCallback(
    async (campaignId: string, message: string, visibility: string) => {
      onBusyStart();
      try {
        await request<GameLogEntry>(`/api/campaigns/${campaignId}/log`, {
          method: "POST",
          body: JSON.stringify({ message, visibility }),
        });
        await loadSessionLog(campaignId);
        onError("Note ajoutee au journal.");
      } catch (error) {
        onError(error instanceof Error ? error.message : "Unable to add note");
      } finally {
        onBusyEnd();
      }
    },
    [token, onError, onBusyStart, onBusyEnd, loadSessionLog],
  );

  return { rolls, logEntries, setLogEntries, loadSessionLog, doRoll, quickRoll, addLogNote, clearJournal };
}
