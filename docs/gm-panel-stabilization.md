# Stabilisation UI panneaux GM

## Objectif

Stabiliser le systeme de panneaux GM avant d'ajouter de nouveaux panneaux.

Cette phase ne doit pas ajouter de nouvelles fonctionnalites metier.
Elle doit rendre les panneaux existants fiables, coherents et maintenables.

## Problemes constates

- les panneaux ne sont pas tous identifies de la meme maniere ;
- certains utilisent data-floating-widget ;
- certains utilisent data-quick-panel ;
- certains n'ont pas data-vtt-panel ;
- le hook detecte certains panneaux via des classes CSS ;
- la liste du menu Gestion panneaux peut diverger des panneaux reels ;
- certains boutons sont desactives quand le mode avance n'est pas actif ;
- la reouverture d'un panneau ferme peut echouer ;
- les panneaux reduits et fermes ne sont pas toujours retrouves ;
- les anciens etats localStorage peuvent masquer un panneau ;
- la logique des presets est trop fragile ;
- les doubles headers rendent l'interface confuse.

## Regles stabilisees

Tous les panneaux GM doivent avoir :

- data-vtt-panel ;
- data-floating-widget ;
- data-floating-title ;
- un seul header runtime ;
- les memes actions ;
- les memes etats ;
- la meme logique de dock ;
- la meme logique de reouverture ;
- la meme logique de sauvegarde.

## Etats standards

- ouvert ;
- ferme ;
- reduit ;
- epingle ;
- flottant ;
- verrouille ;
- deplacable ;
- redimensionnable.

## Boutons standards

- ↑ premier plan ;
- 📌 epingler ;
- 🔒 verrouiller ;
- − reduire ;
- × fermer.

## Validation obligatoire

- scripts/check-vtt-panels.sh OK ;
- scripts/check-panel-system.sh OK ;
- scripts/check-frontend-types.sh OK ;
- docker compose up -d --build OK ;
- test navigateur complet OK.

## Test navigateur

Pour chaque panneau :

- ouvrir depuis Gestion panneaux ;
- reduire ;
- rouvrir depuis le dock ;
- fermer ;
- rouvrir depuis le dock ;
- fermer ;
- rouvrir depuis Gestion panneaux ;
- epingler ;
- detacher ;
- verrouiller ;
- deverrouiller ;
- deplacer ;
- redimensionner.
