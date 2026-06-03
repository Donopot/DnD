# Phase 3 - Character Sheets V1

Phase 3 adds campaign-scoped character sheets.

## Backend Endpoints

```txt
GET    /api/campaigns/{campaign_id}/characters
POST   /api/campaigns/{campaign_id}/characters
GET    /api/characters/{character_id}
PATCH  /api/characters/{character_id}
DELETE /api/characters/{character_id}
```

Rules:

- campaign members can list and read characters;
- GMs and co-GMs can create/edit/delete any campaign character;
- players can create/edit/delete only their own characters;
- character owner must be a member of the campaign.

## Sheet Fields

V1 stores common high-traffic values as columns:

- name, ancestry, class, level;
- HP current/max;
- armor class;
- speed;
- proficiency bonus.

Flexible D&D data is stored as `jsonb`:

- attributes;
- skills;
- saving throws;
- attacks;
- inventory;
- spells;
- resources.

## Smoke Test

From the HP Mini:

```bash
cd /home/donopot/dnd-saas
sh scripts/smoke-phase3.sh
```

Expected output:

```txt
phase3-smoke-ok
user=phase3-<timestamp>@dtmini.com
campaign=<uuid>
character=<uuid>
```

