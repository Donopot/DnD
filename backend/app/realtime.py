from collections import defaultdict
from uuid import UUID

from fastapi import WebSocket


class CampaignConnectionManager:
    def __init__(self) -> None:
        self._connections: dict[UUID, set[WebSocket]] = defaultdict(set)

    def register(self, campaign_id: UUID, websocket: WebSocket) -> int:
        """Register an already accepted and authenticated campaign socket."""
        self._connections[campaign_id].add(websocket)
        return self.count(campaign_id)

    def disconnect(self, campaign_id: UUID, websocket: WebSocket) -> int:
        self._connections[campaign_id].discard(websocket)
        if not self._connections[campaign_id]:
            self._connections.pop(campaign_id, None)
            return 0
        return self.count(campaign_id)

    def count(self, campaign_id: UUID) -> int:
        return len(self._connections.get(campaign_id, set()))

    async def broadcast(self, campaign_id: UUID, payload: dict[str, object]) -> None:
        stale: list[WebSocket] = []
        for websocket in self._connections.get(campaign_id, set()).copy():
            try:
                await websocket.send_json(payload)
            except Exception:
                stale.append(websocket)

        for websocket in stale:
            self.disconnect(campaign_id, websocket)


manager = CampaignConnectionManager()
