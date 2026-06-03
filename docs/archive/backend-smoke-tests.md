# BE-0 - Smoke tests backend

## Objectif

BE-0 stabilise le backend avant les prochaines briques persistantes.

Cette phase ne crée pas de nouvelle fonctionnalité métier. Elle ajoute un test de bout en bout permettant de vérifier que le backend existant fonctionne correctement.

## Parcours testé

Le script `scripts/smoke-backend.sh` vérifie :

1. health backend ;
2. register utilisateur GM ;
3. login ;
4. auth/me ;
5. création campagne ;
6. liste campagnes ;
7. création personnage ;
8. création scène ;
9. création token ;
10. mise à jour token ;
11. création rencontre ;
12. création combattant ;
13. démarrage rencontre ;
14. tour suivant.

## Commande

```bash
sh scripts/smoke-backend.sh
Variables utiles
API_URL=http://127.0.0.1:8091
DND_SMOKE_PASSWORD=SmokePass123!
DND_SMOKE_EMAIL=smoke+manual@dnd-smoke.fr

Exemple :

API_URL=http://127.0.0.1:8091 sh scripts/smoke-backend.sh
Résultat attendu

Le script doit finir par :

smoke-backend-ok
Règles BE-0
Ne pas ajouter de nouveau domaine métier.
Ne pas modifier les migrations existantes.
Ne pas remplacer les routers existants.
Ne pas modifier le frontend.
Ajouter uniquement les vérifications nécessaires.
Toute future brique backend devra passer ce smoke test.
