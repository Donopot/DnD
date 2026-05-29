# Phase 6 - Session VTT minimale

## Objectif

Phase 6 ajoute la première surface VTT backend.

Elle introduit :

- scenes de campagne ;
- grille simple ;
- tokens positionnes ;
- creation de token depuis un personnage ;
- deplacement de token ;
- persistance PostgreSQL ;
- diffusion des changements via WebSocket campagne ;
- smoke test dedie.

## Endpoints

GET    /api/campaigns/{campaign_id}/scenes
POST   /api/campaigns/{campaign_id}/scenes
GET    /api/scenes/{scene_id}
GET    /api/scenes/{scene_id}/tokens
POST   /api/scenes/{scene_id}/tokens
PATCH  /api/tokens/{token_id}
DELETE /api/tokens/{token_id}

## Validation

Commande :

sh scripts/smoke-phase6.sh

Resultat attendu :

phase6-smoke-ok
scene=<uuid>
token=<uuid>

## Hors scope

Cette phase ne traite pas encore :

- upload image de carte ;
- fog of war ;
- dynamic lighting ;
- initiative complete ;
- combat manager complet ;
- bibliotheque SRD/homebrew ;
- integration Discord.
