#!/usr/bin/env python3
"""Open authenticated campaign sockets sequentially to catch accept/reconnect regressions."""

from __future__ import annotations

import argparse
import asyncio
import json
import time
import urllib.request

import websockets
from websockets.exceptions import ConnectionClosed


def post_json(url: str, payload: dict[str, object], token: str = "") -> dict[str, object]:
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    request = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers=headers,
        method="POST",
    )
    with urllib.request.urlopen(request, timeout=5) as response:
        return json.load(response)


def provision_smoke_campaign(api_url: str) -> tuple[str, str]:
    run_id = str(time.time_ns())
    registration = post_json(
        f"{api_url.rstrip('/')}/api/auth/register",
        {
            "email": f"smoke-ws-{run_id}@test.com",
            "display_name": "WS Smoke",
            "password": "SmokePass123!",
            "confirm_password": "SmokePass123!",
        },
    )
    token = str(registration["access_token"])
    campaign = post_json(
        f"{api_url.rstrip('/')}/api/campaigns",
        {"name": f"WS Smoke {run_id}"},
        token,
    )
    return token, str(campaign["id"])


async def check_socket(url: str, token: str, campaign_id: str) -> None:
    async with websockets.connect(f"{url.rstrip('/')}/ws/campaigns/{campaign_id}") as socket:
        await socket.send(json.dumps({"type": "auth", "token": token}))
        payload = json.loads(await asyncio.wait_for(socket.recv(), timeout=5))
        if payload.get("type") != "connected":
            raise RuntimeError(f"unexpected websocket payload: {payload}")


async def check_invalid_token(url: str, campaign_id: str) -> None:
    async with websockets.connect(f"{url.rstrip('/')}/ws/campaigns/{campaign_id}") as socket:
        await socket.send(json.dumps({"type": "auth", "token": "invalid-token"}))
        try:
            await asyncio.wait_for(socket.recv(), timeout=5)
        except ConnectionClosed as exc:
            if exc.code != 1008:
                raise RuntimeError(f"unexpected invalid-token close code: {exc.code}") from exc
            return
        raise RuntimeError("invalid token websocket remained open")


async def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--url", default="ws://127.0.0.1:8091")
    parser.add_argument("--api-url", default="http://127.0.0.1:8091")
    parser.add_argument("--token")
    parser.add_argument("--campaign-id")
    parser.add_argument("--iterations", type=int, default=20)
    args = parser.parse_args()
    token = args.token
    campaign_id = args.campaign_id

    if not token or not campaign_id:
        token, campaign_id = provision_smoke_campaign(args.api_url)

    await check_invalid_token(args.url, campaign_id)

    for _ in range(args.iterations):
        await check_socket(args.url, token, campaign_id)

    print(f"smoke-websocket-ok iterations={args.iterations}")


if __name__ == "__main__":
    asyncio.run(main())
