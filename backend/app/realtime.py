"""WebSocket connection manager with per-campaign and per-user routing."""

from collections import defaultdict
from uuid import UUID

from fastapi import WebSocket


class CampaignConnectionManager:
    def __init__(self) -> None:
        # campaign_id → {websocket}
        self._connections: dict[UUID, set[WebSocket]] = defaultdict(set)
        # (campaign_id, user_id) → websocket (one socket per user per campaign)
        self._user_sockets: dict[tuple[UUID, UUID], WebSocket] = {}

    def register(
        self, campaign_id: UUID, websocket: WebSocket, user_id: UUID | None = None,
    ) -> int:
        """Register an already accepted and authenticated campaign socket."""
        self._connections[campaign_id].add(websocket)
        if user_id is not None:
            self._user_sockets[(campaign_id, user_id)] = websocket
        return self.count(campaign_id)

    def disconnect(
        self, campaign_id: UUID, websocket: WebSocket, user_id: UUID | None = None,
    ) -> int:
        self._connections[campaign_id].discard(websocket)
        if user_id is not None:
            self._user_sockets.pop((campaign_id, user_id), None)
        if not self._connections[campaign_id]:
            self._connections.pop(campaign_id, None)
            return 0
        return self.count(campaign_id)

    def count(self, campaign_id: UUID) -> int:
        return len(self._connections.get(campaign_id, set()))

    async def broadcast(self, campaign_id: UUID, payload: dict[str, object]) -> None:
        stale: list[WebSocket] = []
        for ws in self._connections.get(campaign_id, set()).copy():
            try:
                await ws.send_json(payload)
            except Exception:
                stale.append(ws)

        for ws in stale:
            self.disconnect(campaign_id, ws)

    async def send_to_user(
        self, campaign_id: UUID, user_id: UUID, payload: dict[str, object],
    ) -> bool:
        """Send a message to a single user in a campaign.

        Returns True if the user was connected and the message was sent.
        """
        ws = self._user_sockets.get((campaign_id, user_id))
        if ws is None:
            return False
        try:
            await ws.send_json(payload)
        except Exception:
            self._user_sockets.pop((campaign_id, user_id), None)
            self._connections[campaign_id].discard(ws)
            return False
        return True


manager = CampaignConnectionManager()
