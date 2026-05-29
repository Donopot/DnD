# Phase 10 - Panneaux UX libres

## Objectif

Cette phase concerne les elements d'interface de la table de jeu, pas les objets dans la scene.

Le MJ doit pouvoir organiser librement son espace de travail :

- deplacer la mini-map ;
- deplacer le panneau detail token ;
- deplacer les outils scene ;
- deplacer le panneau ajout token ;
- agrandir / retrecir les panneaux ;
- conserver la position des panneaux entre deux sessions ;
- reset les positions si besoin.

## Scope 10-1

Panneaux concernes :

- mini-map ;
- detail token ;
- scene ;
- upload carte ;
- choix du fond ;
- ajout token ;
- liste tokens.

## Choix technique

- frontend uniquement ;
- pas de migration backend ;
- positions sauvegardees en localStorage ;
- activation via bouton "Panneaux libres" ;
- reset via bouton "Reset panneaux".

## Critere d'acceptation

- build Docker OK ;
- smoke tests Phase 2 a 8 OK ;
- la mini-map peut etre deplacee ;
- la mini-map peut etre redimensionnee ;
- le panneau ajout token peut etre deplace ;
- le panneau ajout token peut etre redimensionne ;
- les positions sont restaurees apres refresh ;
- le reset remet les panneaux en position par defaut.

## Etape 10-2A - Toolbar de panneaux flottants

Objectif :

- ajouter une toolbar a chaque panneau flottant ;
- permettre de mettre un panneau au premier plan ;
- permettre de verrouiller/deverrouiller un panneau ;
- permettre de reduire/ouvrir un panneau ;
- permettre de fermer un panneau ;
- garder le reset global via Reset panneaux.

Comportement :

- un panneau verrouille ne peut plus etre deplace ou redimensionne ;
- un panneau reduit garde uniquement sa toolbar visible ;
- un panneau ferme est restaure via Reset panneaux ;
- le z-index est mis a jour au clic ou via le bouton Avant.

Critere d'acceptation :

- build Docker OK ;
- smoke tests Phase 2 a 8 OK ;
- la mini-map peut etre verrouillee ;
- la mini-map peut etre reduite ;
- le panneau ajout token peut etre ferme ;
- Reset panneaux restaure les panneaux fermes.
