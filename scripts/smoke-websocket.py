#!/usr/bin/env python3
"""Open authenticated campaign sockets sequentially to catch accept/reconnect regressions."""

from __future__ import annotations

import argparse
import asyncio
import json

import websockets
from websockets.exceptions import ConnectionClosed


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
    parser.add_argument("--token", required=True)
    parser.add_argument("--campaign-id", required=True)
    parser.add_argument("--iterations", type=int, default=20)
    args = parser.parse_args()

    await check_invalid_token(args.url, args.campaign_id)

    for _ in range(args.iterations):
        await check_socket(args.url, args.token, args.campaign_id)

    print(f"smoke-websocket-ok iterations={args.iterations}")


if __name__ == "__main__":
    asyncio.run(main())
