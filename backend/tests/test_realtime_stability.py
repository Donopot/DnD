from uuid import uuid4

import pytest
from pydantic import ValidationError

from app.realtime import CampaignConnectionManager
from app.routers.vtt import FogUpdateRequest


class FakeWebSocket:
    def __init__(self) -> None:
        self.accept_calls = 0
        self.payloads: list[dict[str, object]] = []

    async def accept(self) -> None:
        self.accept_calls += 1

    async def send_json(self, payload: dict[str, object]) -> None:
        self.payloads.append(payload)


def test_register_does_not_accept_socket_twice():
    manager = CampaignConnectionManager()
    campaign_id = uuid4()
    socket = FakeWebSocket()

    assert manager.register(campaign_id, socket) == 1
    assert socket.accept_calls == 0
    assert manager.disconnect(campaign_id, socket) == 0


def test_disconnect_unregistered_socket_is_safe():
    manager = CampaignConnectionManager()

    assert manager.disconnect(uuid4(), FakeWebSocket()) == 0


@pytest.mark.anyio
async def test_broadcast_sends_payload_to_registered_socket():
    manager = CampaignConnectionManager()
    campaign_id = uuid4()
    socket = FakeWebSocket()
    manager.register(campaign_id, socket)

    payload = {"type": "connected"}
    await manager.broadcast(campaign_id, payload)

    assert socket.payloads == [payload]


def test_fog_zone_accepts_finite_positive_dimensions():
    request = FogUpdateRequest(
        fog_zones=[{"x": 10, "y": 20, "width": 100, "height": 80}],
    )

    assert request.fog_zones[0].model_dump() == {
        "x": 10.0,
        "y": 20.0,
        "width": 100.0,
        "height": 80.0,
    }


@pytest.mark.parametrize(
    "zone",
    [
        {"x": 0, "y": 0, "width": 0, "height": 10},
        {"x": 0, "y": 0, "width": 10, "height": -1},
        {"x": float("inf"), "y": 0, "width": 10, "height": 10},
        {"x": 0, "y": float("nan"), "width": 10, "height": 10},
        {"x": 0, "y": 0, "width": 10},
    ],
)
def test_fog_zone_rejects_invalid_payloads(zone):
    with pytest.raises(ValidationError):
        FogUpdateRequest(fog_zones=[zone])
