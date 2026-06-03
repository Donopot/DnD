# Phase 8 - Cartes, assets et fonds de scene

## Objectif

Phase 8 transforme la grille abstraite en vraie carte jouable.

Le MJ peut :

- uploader une image de carte ;
- stocker cette image dans MinIO ;
- rattacher l'image a une campagne ;
- associer une image a une scene ;
- afficher l'image sous la grille ;
- garder les tokens visibles au-dessus de la carte.

## Backend

Livrables :

- table campaign_assets ;
- upload image vers MinIO ;
- endpoint POST /api/campaigns/{campaign_id}/assets ;
- endpoint GET /api/campaigns/{campaign_id}/assets ;
- endpoint GET /api/assets/{asset_id}/content ;
- endpoint PATCH /api/scenes/{scene_id}/background ;
- validation image PNG, JPEG, WebP, GIF ;
- limite upload 15 MB ;
- smoke-phase8.sh.

## Frontend

A venir dans le second bloc Phase 8 :

- formulaire upload carte ;
- liste des assets de campagne ;
- bouton associer a la scene active ;
- affichage image en fond de carte ;
- conservation de la grille ;
- tokens toujours deplacables au-dessus.

## Hors scope

Cette phase ne traite pas encore :

- fog of war ;
- dynamic lighting ;
- marketplace ;
- compression avancee ;
- edition d'image ;
- gabarits de sorts.

## Validation

Commandes :

docker compose up -d --build
sh scripts/wait-api.sh
curl -fsS http://127.0.0.1:8091/api/health
sh scripts/smoke-phase8.sh

Resultat attendu :

phase8-smoke-ok
asset=<uuid>
scene=<uuid>
