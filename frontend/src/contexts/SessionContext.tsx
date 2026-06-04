import { createContext, useContext } from "react";
import type { RealtimeStatus } from "../hooks/useRealtimeSession";

/**
 * Session ambient state — realtime status, theme, toasts.
 * Decoupled from workspace data so toast updates don't re-render panels.
 */
export interface SessionContextValue {
  presenceCount: number;
  realtimeStatus: RealtimeStatus;
  wsRef: React.RefObject<WebSocket | null>;
  theme: string;
  toggleTheme: () => void;
  toasts: { id: number; message: string; type?: string }[];
  dismissToast: (id: number) => void;
}

export const SessionContext = createContext<SessionContextValue | null>(null);

export function useSessionContext(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSessionContext must be used within WorkspaceProvider");
  return ctx;
}
