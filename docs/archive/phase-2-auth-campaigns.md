# Phase 2 - Auth, Campaigns and Invites

Phase 2 adds the first usable product loop:

- account registration;
- login with JWT bearer token;
- current user endpoint;
- campaign creation;
- campaign listing;
- campaign member listing;
- GM/co-GM invite creation;
- invite preview and join flow;
- frontend dashboard for auth, campaign creation and invite links.

## Backend Endpoints

```txt
POST /api/auth/register
POST /api/auth/login
GET  /api/auth/me

GET  /api/campaigns
POST /api/campaigns
GET  /api/campaigns/{campaign_id}
GET  /api/campaigns/{campaign_id}/members
POST /api/campaigns/{campaign_id}/invites

GET  /api/invites/{token}
POST /api/invites/{token}/join
```

Authenticated endpoints use:

```txt
Authorization: Bearer <access_token>
```

## Database

Migrations are applied automatically when the backend starts. Phase 2 creates:

- `users`
- `campaigns`
- `campaign_members`
- `campaign_invites`
- `schema_migrations`

## Smoke Test

From the HP Mini:

```bash
cd /home/donopot/dnd-saas
sh scripts/smoke-phase2.sh
```

Expected output:

```txt
phase2-smoke-ok
user=phase2-<timestamp>@dtmini.com
campaign=<uuid>
```

