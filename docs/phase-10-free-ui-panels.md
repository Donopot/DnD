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

## Etape 10-2B - Menu Panneaux

Objectif :

- ajouter un menu Panneaux dans la toolbar VTT ;
- rouvrir un panneau ferme sans reset complet ;
- garder le reset complet disponible ;
- identifier les panneaux avec des ids stables ;
- conserver la sauvegarde localStorage.

Panneaux geres :

- Mini-map ;
- Detail token ;
- Scene ;
- Upload carte ;
- Fond de carte ;
- Ajout token ;
- Liste tokens.

Critere d'acceptation :

- build Docker OK ;
- smoke tests Phase 2 a 8 OK ;
- un panneau ferme avec Fermer peut etre rouvert via le menu Panneaux ;
- le reset complet continue de restaurer tous les panneaux ;
- les panneaux gardent leur position apres refresh.

## Etape 10-2C - Presets de panneaux

Objectif :

- ajouter des layouts predefinis pour les panneaux flottants ;
- permettre au MJ de basculer rapidement entre exploration, combat et preparation ;
- garder la possibilite de rouvrir un panneau individuellement ;
- conserver le reset complet.

Presets :

- Exploration : mini-map, detail token et ajout token visibles, outils secondaires reduits ;
- Combat : mini-map et outils token visibles, assets secondaires caches ;
- Preparation : scene, upload carte, fond de carte et token visibles.

Critere d'acceptation :

- build Docker OK ;
- smoke tests Phase 2 a 8 OK ;
- le menu Panneaux contient les presets ;
- cliquer Exploration repositionne les panneaux ;
- cliquer Combat masque/reduit les panneaux non essentiels ;
- cliquer Preparation affiche les outils de configuration.

## Etape 10-2D - Interface compacte et presets utilisables

Objectif :

- reduire l'impression de zoom global de l'interface ;
- reduire les marges et la taille des controles VTT ;
- eviter le scroll horizontal global ;
- rendre les presets selectionnables meme si Panneaux libres est desactive ;
- activer automatiquement les panneaux libres quand un preset est choisi.

Critere d'acceptation :

- build Docker OK ;
- smoke tests Phase 2 a 8 OK ;
- les boutons Exploration, Combat et Preparation sont cliquables ;
- cliquer un preset active les panneaux libres ;
- l'interface VTT occupe mieux l'ecran ;
- les panneaux restent deplacables et redimensionnables.

## Etape 10-2E - Densite compacte et carte centree

Objectif :

- reduire fortement l'impression de zoom de l'interface ;
- agrandir la surface utile de la carte ;
- centrer automatiquement la carte principale ;
- faire pointer Reset vers le centre de la carte au lieu du coin haut gauche ;
- reduire la taille des panneaux flottants ;
- reduire la taille des boutons, champs et toolbars.

Critere d'acceptation :

- build Docker OK ;
- smoke tests Phase 2 a 8 OK ;
- la carte principale est centree au chargement ;
- le bouton Reset recentre la carte ;
- l'interface affiche moins de panneaux envahissants ;
- la carte occupe davantage l'espace visible.
