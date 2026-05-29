# Phase 9 - UX carte avancee

## Objectif

Phase 9 rend la carte réellement utilisable en session.

Après les scènes, tokens, assets de carte et refonte frontend, l'objectif est d'améliorer l'expérience VTT autour de la carte :

- déplacement naturel des tokens ;
- snap-to-grid ;
- zoom ;
- pan ;
- sélection de token ;
- panneau détail token ;
- meilleure lisibilité de la carte.

## Scope frontend

Livrables prévus :

- drag and drop de tokens ;
- déplacement token à la souris ;
- snap-to-grid optionnel ;
- zoom de la carte ;
- pan de la carte ;
- sélection visuelle du token actif ;
- panneau détail du token sélectionné ;
- commandes rapides centrées sur la carte.

## Scope backend

Phase 9 garde le backend léger.

Livrables possibles :

- amélioration endpoint PATCH token existant si nécessaire ;
- champ optionnel snap_to_grid par scène si utile ;
- event temps réel plus explicite token_moved si nécessaire.

## Hors scope

Cette phase ne traite pas encore :

- fog of war ;
- dynamic lighting ;
- mesure de distance ;
- gabarits de sorts ;
- permissions avancées par token ;
- suppression/duplication avancée de token.

## Critères d'acceptation

- build Docker OK ;
- /api/health OK ;
- smoke tests Phase 2 à 8 OK ;
- frontend accessible sur 8090 ;
- un token peut être déplacé directement sur la carte ;
- le déplacement est persisté côté backend ;
- le token reste aligné sur la grille si le snap est activé.

## Etape 9-1 - Selection, drag, snap et zoom

Objectif :

- selectionner un token directement sur la carte ;
- afficher le token actif ;
- deplacer un token a la souris ;
- persister le deplacement via l'endpoint token existant ;
- activer/desactiver le snap-to-grid ;
- zoomer/dezoomer la carte.

Critere d'acceptation :

- build Docker OK ;
- smoke tests Phase 2 a 8 OK ;
- un token peut etre glisse sur la carte ;
- avec snap actif, le token s'aligne sur la grille ;
- avec snap inactif, le token peut etre place librement ;
- le zoom ne casse pas le placement des tokens.

## Etape 9-2 - Pan de la carte

Objectif :

- ajouter un mode pan de carte ;
- permettre de deplacer la vue sans modifier les tokens ;
- conserver le zoom existant ;
- ajouter un bouton reset de vue ;
- garder le drag token fonctionnel.

Critere d'acceptation :

- build Docker OK ;
- smoke tests Phase 2 a 8 OK ;
- le bouton Pan carte active/desactive le mode pan ;
- clic-glisser sur la carte deplace la vue ;
- le bouton Reset remet le zoom a 100% et recentre la vue ;
- les tokens restent deplacables.

## Etape 9-3 - Panneau detail token

Objectif :

- afficher un panneau detail pour le token selectionne ;
- montrer nom, personnage lie, position, taille, visibilite et couleur ;
- centrer la carte sur le token actif ;
- deselectionner le token ;
- deplacer le token selectionne avec des boutons directionnels ;
- selectionner un token depuis la liste des tokens.

Critere d'acceptation :

- build Docker OK ;
- smoke tests Phase 2 a 8 OK ;
- clic sur un token affiche ses details ;
- clic sur un token dans la liste le selectionne ;
- le bouton Centrer remet le token au centre de la vue ;
- les boutons directionnels deplacent le token d'une case.

## Etape 9-4 - Raccourcis clavier carte

Objectif :

- deplacer le token selectionne avec les fleches ;
- zoomer avec + ;
- dezoomer avec - ;
- reset la vue avec 0 ;
- activer/desactiver le pan avec Espace ;
- activer/desactiver le snap avec G ;
- quitter la selection et le pan avec Echap ;
- afficher une aide visuelle des raccourcis.

Critere d'acceptation :

- build Docker OK ;
- smoke tests Phase 2 a 8 OK ;
- les raccourcis ne se declenchent pas dans les champs de formulaire ;
- les fleches deplacent le token selectionne d'une case ;
- Espace bascule le mode pan ;
- G bascule le snap-to-grid ;
- 0 remet la vue a 100%.
