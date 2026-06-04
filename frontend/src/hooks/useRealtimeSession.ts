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

type RealtimePayload = {
  type?: string;
  detail?: string;
  presence_count?: number;
  resource?: string;
  campaign_id?: string;
  scene_id?: string;
  token_id?: string;
  x?: number | string;
  y?: number | string;
};

export function useRealtimeSession(
  opts: UseRealtimeSessionOptions,
): UseRealtimeSessionReturn {
  const { token, campaignId } = opts;

  const [presenceCount, setPresenceCount] = useState(0);
  const [realtimeStatus, setRealtimeStatus] = useState<RealtimeStatus>("offline");
  const wsRef = useRef<WebSocket | null>(null);
  const optsRef = useRef(opts);
  const reconnectAttempts = useRef(0);
  const reconnectTimer = useRef<number | undefined>(undefined);

  optsRef.current = opts;

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

    const activeCampaignId = campaignId;
    const protocol = window.location.protocol === "https:" ? "wss" : "ws";
    const socket = new WebSocket(
      `${protocol}://${window.location.host}/ws/campaigns/${activeCampaignId}`,
    );
    wsRef.current = socket;
    setRealtimeStatus("connecting");

    socket.onopen = () => {
      reconnectAttempts.current = 0;
      socket.send(JSON.stringify({ type: "auth", token }));
      setRealtimeStatus("online");
    };

    const messageHandler = (event: MessageEvent) => {
      try {
        const payload = JSON.parse(event.data) as RealtimePayload;
        const current = optsRef.current;

        if (payload.campaign_id && payload.campaign_id !== activeCampaignId) {
          return;
        }

        if (payload.type === "error" && payload.detail) {
          current.onError(`WebSocket: ${payload.detail}`);
          return;
        }

        if (typeof payload.presence_count === "number") {
          setPresenceCount(payload.presence_count);
        }

        if (payload.type === "session_changed") {
          current.onSessionLog();

          if (payload.resource === "scene" || payload.resource === "token") {
            current.onSessionSceneToken();
          }

          if (payload.resource === "encounter") {
            current.onSessionEncounter();
          }

          if (payload.resource === "handout") {
            current.onSessionHandout();
          }
        }

        const movedX = Number(payload.x);
        const movedY = Number(payload.y);
        if (
          payload.type === "token_moved" &&
          payload.scene_id === current.selectedSceneId &&
          payload.token_id &&
          Number.isFinite(movedX) &&
          Number.isFinite(movedY)
        ) {
          current.onTokenMoved(payload.token_id, movedX, movedY);
        }
      } catch {
        /* ignore malformed messages */
      }
    };

    socket.addEventListener("message", messageHandler);

    socket.onclose = (event) => {
      if (wsRef.current !== socket) return;
      setRealtimeStatus("offline");
      const onError = optsRef.current.onError;

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
  }, [token, campaignId]);

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
