# BE-1 - Notes MJ persistantes

## Objectif

Persister les notes privées du MJ côté backend.

Le panneau frontend Notes MJ ne doit plus dépendre uniquement du localStorage à terme.

## Modèle

Table : `gm_notes`

Champs principaux :

- campagne ;
- scène optionnelle ;
- token optionnel ;
- auteur ;
- titre ;
- contenu ;
- visibilité ;
- version ;
- dates de création et modification.

## Visibilités

- `gm_team` : visible par GM et co-GM ;
- `author_only` : visible uniquement par l'auteur.

Les joueurs n'ont aucun accès aux notes MJ.

## Endpoints

```text
GET    /api/campaigns/{campaign_id}/gm-notes
POST   /api/campaigns/{campaign_id}/gm-notes
GET    /api/gm-notes/{note_id}
PATCH  /api/gm-notes/{note_id}
DELETE /api/gm-notes/{note_id}
Smoke test
sh scripts/smoke-gm-notes.sh

Résultat attendu :

smoke-gm-notes-ok
Validation complète
python -m compileall backend/app
docker compose up -d --build
sh scripts/wait-api.sh
sh scripts/smoke-backend.sh
sh scripts/smoke-gm-notes.sh
Règles respectées
migration dédiée ;
router dédié ;
schémas Pydantic dédiés ;
permissions basées sur les rôles campagne ;
smoke test dédié ;
documentation dédiée.
