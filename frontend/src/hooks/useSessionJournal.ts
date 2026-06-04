import { useCallback, useState } from "react";
import type { GameLogEntry, Roll } from "../api/types";
import { apiRequest } from "../api/client";

export interface UseSessionJournalOptions {
  token: string;
  onError: (msg: string) => void;
}

export interface UseSessionJournalReturn {
  rolls: Roll[];
  logEntries: GameLogEntry[];
  setLogEntries: React.Dispatch<React.SetStateAction<GameLogEntry[]>>;
  loadSessionLog: (campaignId: string) => Promise<void>;
  clearJournal: () => void;
}

export function useSessionJournal(
  opts: UseSessionJournalOptions,
): UseSessionJournalReturn {
  const { token, onError } = opts;
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

  return { rolls, logEntries, setLogEntries, loadSessionLog, clearJournal };
}
