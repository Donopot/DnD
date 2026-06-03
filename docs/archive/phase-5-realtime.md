# Phase 5 - Realtime WebSocket

Phase 5 adds campaign-scoped realtime plumbing.

## WebSocket Endpoint

```txt
GET /ws/campaigns/{campaign_id}?token=<jwt>
```

The token must be a valid app JWT and the user must be a campaign member.

Messages sent by the server:

```json
{ "type": "connected", "campaign_id": "...", "presence_count": 1 }
{ "type": "presence", "campaign_id": "...", "presence_count": 2 }
{ "type": "session_changed", "resource": "roll", "campaign_id": "...", "visibility": "public" }
{ "type": "session_changed", "resource": "log", "campaign_id": "...", "visibility": "public" }
```

The frontend listens for `session_changed` and reloads dice rolls/game log.
Presence count is displayed in the dashboard header.

## Smoke Test

From the HP Mini:

```bash
cd /home/donopot/dnd-saas
sh scripts/smoke-phase5.sh
```

Expected output:

```txt
phase5-smoke-ok
campaign=<uuid>
```

