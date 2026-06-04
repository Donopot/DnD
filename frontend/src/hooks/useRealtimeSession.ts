import { useCallback, useEffect, useRef, useState } from "react";

export type RealtimeStatus = "offline" | "connecting" | "online";

export interface UseRealtimeSessionOptions {
  token: string;
  campaignId: string | undefined;
  selectedSceneId: string | undefined;
  onError: (msg: string) => void;
  onSessionSceneToken: () => void;
  onSessionEncounter: () => void;
  onSessionHandout: () => void;
  onSessionLog: () => void;
  onTokenMoved: (tokenId: string, x: number, y: number) => void;
}

export interface UseRealtimeSessionReturn {
  presenceCount: number;
  realtimeStatus: RealtimeStatus;
  wsRef: React.MutableRefObject<WebSocket | null>;
}

const MAX_RECONNECT = 3;

export function useRealtimeSession(
  opts: UseRealtimeSessionOptions,
): UseRealtimeSessionReturn {
  const {
    token,
    campaignId,
    selectedSceneId,
    onError,
    onSessionSceneToken,
    onSessionEncounter,
    onSessionHandout,
    onSessionLog,
    onTokenMoved,
  } = opts;

  const [presenceCount, setPresenceCount] = useState(0);
  const [realtimeStatus, setRealtimeStatus] = useState<RealtimeStatus>("offline");
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttempts = useRef(0);
  const reconnectTimer = useRef<number | undefined>(undefined);

  const connect = useCallback(() => {
    wsRef.current?.close();
    if (reconnectTimer.current) {
      window.clearTimeout(reconnectTimer.current);
      reconnectTimer.current = undefined;
    }

    if (!token || !campaignId) {
      setRealtimeStatus("offline");
      return;
    }

    const protocol = window.location.protocol === "https:" ? "wss" : "ws";
    const socket = new WebSocket(
      `${protocol}://${window.location.host}/ws/campaigns/${campaignId}`,
    );
    wsRef.current = socket;
    setRealtimeStatus("connecting");

    socket.onopen = () => {
      reconnectAttempts.current = 0;
      socket.send(JSON.stringify({ type: "auth", token }));
      setRealtimeStatus("online");
    };

    socket.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);

        if (payload.type === "error" && payload.detail) {
          onError(`WebSocket: ${payload.detail}`);
          return;
        }

        if (typeof payload.presence_count === "number") {
          setPresenceCount(payload.presence_count);
        }

        if (payload.type === "session_changed") {
          onSessionLog();

          if (payload.resource === "scene" || payload.resource === "token") {
            onSessionSceneToken();
          }

          if (payload.resource === "encounter") {
            onSessionEncounter();
          }

          if (payload.resource === "handout") {
            onSessionHandout();
          }
        }

        if (payload.type === "token_moved" && payload.scene_id === selectedSceneId) {
          onTokenMoved(
            payload.token_id,
            Number(payload.x),
            Number(payload.y),
          );
        }
      } catch {
        /* ignore malformed messages */
      }
    };

    socket.onclose = (event) => {
      if (wsRef.current !== socket) return;
      setRealtimeStatus("offline");

      if (event.code === 1008) {
        onError("WebSocket authentication failed — re-login required");
        return;
      }

      if (reconnectAttempts.current < MAX_RECONNECT) {
        reconnectAttempts.current += 1;
        const delay = Math.pow(2, reconnectAttempts.current - 1) * 1000;
        onError(`WebSocket disconnected — retrying in ${delay / 1000}s…`);
        reconnectTimer.current = window.setTimeout(() => {
          connect();
        }, delay);
      } else {
        onError("WebSocket disconnected — max retries reached");
      }
    };

    socket.onerror = () => {
      setRealtimeStatus("offline");
    };
  }, [
    token,
    campaignId,
    selectedSceneId,
    onError,
    onSessionSceneToken,
    onSessionEncounter,
    onSessionHandout,
    onSessionLog,
    onTokenMoved,
  ]);

  useEffect(() => {
    setPresenceCount(0);
    connect();

    return () => {
      wsRef.current?.close();
      if (reconnectTimer.current) {
        window.clearTimeout(reconnectTimer.current);
        reconnectTimer.current = undefined;
      }
    };
  }, [connect]);

  return { presenceCount, realtimeStatus, wsRef };
}
