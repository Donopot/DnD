# BE-1F - Connexion frontend Notes MJ à l'API

## Objectif

Connecter le panneau Notes MJ à l'API backend BE-1.

## Comportement

Le panneau Notes MJ :

- charge les notes depuis `/api/campaigns/{campaign_id}/gm-notes` ;
- crée une note serveur si aucune note n'existe pour le contexte courant ;
- met à jour la note via `/api/gm-notes/{note_id}` ;
- conserve une copie locale temporaire en fallback ;
- affiche un statut de synchronisation.

## Statuts affichés

- Chargement serveur ;
- Sauvegarde ;
- Synchronisé serveur ;
- Local uniquement ;
- Prêt.

## Fallback

Si l'API est indisponible, le panneau continue à fonctionner en localStorage.

Ce fallback est temporaire et doit éviter une perte de notes pendant le développement.

## Validation

```bash
sh scripts/check-gm-notes-api.sh
sh scripts/check-gm-notes-panel.sh
sh scripts/check-frontend-types.sh
docker compose up -d --build
sh scripts/wait-api.sh
sh scripts/smoke-backend.sh
sh scripts/smoke-gm-notes.sh
