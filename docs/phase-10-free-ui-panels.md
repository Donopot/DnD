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
