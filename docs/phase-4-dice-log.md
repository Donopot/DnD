# Phase 4 - Dice and Game Log

Phase 4 adds the first session loop: dice rolls and a campaign game log.

## Backend Endpoints

```txt
POST /api/campaigns/{campaign_id}/rolls
GET  /api/campaigns/{campaign_id}/rolls

GET  /api/campaigns/{campaign_id}/log
POST /api/campaigns/{campaign_id}/log
```

## Dice Formulas

Supported syntax is intentionally strict:

```txt
1d20
1d20+5
2d6+3
1d8+1d4-1
```

Limits:

- max 50 dice per term;
- dice sides from 2 to 1000;
- formula length max 80;
- only numbers, `d`, `+`, `-` and spaces.

Modes:

- `normal`
- `advantage`
- `disadvantage`

Visibility:

- `public`
- `gm`

Players only see public entries. GMs and co-GMs can see GM-only entries.

## Smoke Test

From the HP Mini:

```bash
cd /home/donopot/dnd-saas
sh scripts/smoke-phase4.sh
```

Expected output:

```txt
phase4-smoke-ok
campaign=<uuid>
character=<uuid>
roll=<uuid>
total=<number>
```

