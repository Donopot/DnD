# Phase 7 - Combat manager minimal

## Objectif

Phase 7 ajoute le premier gestionnaire de combat.

Elle introduit :

- encounters de campagne ;
- liaison optionnelle a une scene ;
- combattants lies a un token et/ou personnage ;
- initiative ;
- PV, CA, conditions ;
- demarrage du combat ;
- tour suivant ;
- fin du combat ;
- broadcast realtime sur les changements de combat.

## Endpoints

GET    /api/campaigns/{campaign_id}/encounters
POST   /api/campaigns/{campaign_id}/encounters
GET    /api/encounters/{encounter_id}
POST   /api/encounters/{encounter_id}/combatants
PATCH  /api/combatants/{combatant_id}
POST   /api/encounters/{encounter_id}/start
POST   /api/encounters/{encounter_id}/next-turn
POST   /api/encounters/{encounter_id}/end

## Validation

Commande :

sh scripts/smoke-phase7.sh

Resultat attendu :

phase7-smoke-ok
encounter=<uuid>
combatant=<uuid>

## Hors scope

Cette phase ne traite pas encore :

- automation des regles D&D ;
- calcul automatique de degats ;
- reactions ;
- concentration ;
- conditions avancees ;
- IA de monstres ;
- bibliotheque SRD de monstres.
