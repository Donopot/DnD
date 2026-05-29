# Sprint 1 - Workspace MJ final

## Objectif

Finaliser l'organisation de l'espace MJ avant de passer aux tokens.

Le MJ doit pouvoir adapter rapidement son cockpit sans perdre de temps :

- choisir un preset ;
- sauvegarder son layout ;
- reduire des panneaux sans les perdre ;
- epingler ou detacher un panneau ;
- passer en focus carte ;
- ajuster la densite de l'interface.

## Perimetre

Ce sprint concerne uniquement l'interface MJ et les panneaux.

Pas de backend requis sauf besoin imprevu.

## Lot 1 - Presets toujours accessibles

### Objectif

Le menu Gestion panneaux doit rester disponible dans tous les modes MJ.

### Travail

- rendre Gestion panneaux visible en Mode Partie ;
- rendre Gestion panneaux visible en Mode Preparation ;
- conserver Gestion panneaux en Mode Avance ;
- cliquer un preset active automatiquement le Mode Avance ;
- ajouter preset Personnalise ;
- ajouter Sauvegarder layout actuel.

### Criteres

- Exploration fonctionne depuis Mode Partie ;
- Combat fonctionne depuis Mode Partie ;
- Preparation fonctionne depuis Mode Partie ;
- Personnalise restaure le layout sauvegarde ;
- sauvegarde layout persistante apres refresh.

## Lot 2 - Dock des panneaux reduits

### Objectif

Un panneau reduit doit rester retrouvable.

### Travail

- creer un dock discret ;
- ajouter les panneaux reduits au dock ;
- restaurer un panneau depuis le dock ;
- masquer le dock si vide ;
- garder le dock compact.

### Criteres

- reduire Mini-map ajoute Mini-map au dock ;
- clic Mini-map dans dock restaure le panneau ;
- reduire Ajout token ajoute Ajout token au dock ;
- refresh conserve l'etat.

## Lot 3 - Epingler / detacher

### Objectif

Un panneau doit pouvoir etre soit dans la colonne laterale, soit flottant.

### Travail

- bouton epingler/detacher dans toolbar panneau ;
- etat sauvegarde ;
- panneau epingle retourne dans la colonne droite ;
- panneau detache devient flottant.

### Criteres

- Mini-map epinglable ;
- Ajout token detachable ;
- etat conserve apres refresh.

## Lot 4 - Focus carte

### Objectif

Permettre au MJ de maximiser la carte.

### Travail

- bouton Focus carte ;
- masquer cockpit ;
- masquer inspecteur ;
- masquer panneaux ;
- garder mini toolbar carte ;
- bouton retour Cockpit.

### Criteres

- carte occupe presque tout l'ecran ;
- retour au mode precedent ;
- zoom/pan conserves.

## Lot 5 - Densite interface

### Objectif

Permettre d'ajuster la taille visuelle de l'interface.

### Travail

- densite Confortable ;
- densite Compacte ;
- densite Tres compacte ;
- sauvegarde localStorage ;
- classes CSS globales.

### Criteres

- changement immediat ;
- persistance apres refresh ;
- pas de casse responsive.

## Validation finale Sprint 1

- build Docker OK ;
- health backend OK ;
- smoke tests Phase 2 a 8 OK ;
- frontend accessible ;
- test navigateur complet ;
- documentation a jour ;
- merge main ;
- tag v0.10.1.

## Avancement - Lot 1

### Implementation

- menu Gestion panneaux conserve en Mode Partie ;
- menu Gestion panneaux conserve en Mode Preparation ;
- presets Exploration, Combat, Preparation et Personnalise ;
- choix d'un preset force le Mode Avance ;
- sauvegarde du layout courant ;
- restauration du layout Personnalise ;
- reset complet conserve le preset Personnalise mais remet le layout courant a zero.

### Validation manuelle attendue

1. Ouvrir Mode Partie.
2. Ouvrir Gestion panneaux.
3. Cliquer Exploration.
4. Verifier que le Mode Avance est active.
5. Deplacer/redimensionner/fermer/reduire des panneaux.
6. Cliquer Sauvegarder layout actuel.
7. Cliquer Combat.
8. Cliquer Personnalise.
9. Verifier que le layout sauvegarde revient.

## Avancement - Lot 2

### Implementation

- ajout d'un dock des panneaux reduits ;
- un panneau reduit apparait dans le dock ;
- un clic dans le dock restaure le panneau ;
- le dock se masque automatiquement s'il est vide ;
- le dock fonctionne avec les layouts/presets existants ;
- le dock est supprime proprement quand le mode panneaux libres est desactive.

### Validation manuelle attendue

1. Passer en Mode Avance.
2. Cliquer sur le bouton reduire d'un panneau flottant.
3. Verifier que le panneau apparait dans le dock en bas de l'ecran.
4. Cliquer sur le nom du panneau dans le dock.
5. Verifier que le panneau est restaure.
6. Reduire plusieurs panneaux.
7. Verifier que le dock liste tous les panneaux reduits.
8. Recharger la page.
9. Verifier que l'etat reduit et le dock restent coherents.

## Correction globale - Systeme de panneaux GM

### Constats

- certaines actions de panneaux ne fonctionnaient pas sur tous les panneaux ;
- les panneaux conditionnels pouvaient apparaitre apres l'initialisation du hook ;
- le menu Gestion panneaux etait parfois inutilisable quand les panneaux lateraux etaient presents ;
- les boutons de toolbar n'etaient pas assez ergonomiques ;
- le systeme ne distinguait pas clairement panneau ferme, reduit, epingle et flottant.

### Corrections

- hook relance avec une cle de scene ;
- capture non-null de rootElement apres querySelector ;
- toolbar uniforme sur tous les panneaux ;
- bouton premier plan ;
- bouton epingler/detacher ;
- bouton verrouiller/deverrouiller ;
- bouton reduire/ouvrir ;
- bouton fermer ;
- dock des panneaux reduits ;
- preset Personnalise ;
- sauvegarde du layout courant ;
- menu Gestion panneaux toujours utilisable ;
- les boutons Afficher un panneau activent le mode Avance si necessaire.

### Validation attendue

1. Mode Partie : ouvrir Gestion panneaux.
2. Cliquer Exploration : passage en Mode Avance.
3. Tester Mini-map : reduire, rouvrir depuis dock, fermer, rouvrir depuis Gestion panneaux.
4. Tester Ajout token : reduire, rouvrir depuis dock, fermer, rouvrir depuis Gestion panneaux.
5. Tester Scene : epingler, detacher, verrouiller, reduire.
6. Deplacer/redimensionner plusieurs panneaux.
7. Sauvegarder layout actuel.
8. Changer vers Combat.
9. Cliquer Personnalise.
10. Verifier que le layout revient.

## Correction Lot 2 - Dock des panneaux reduits et fermes

### Objectif

Le dock ne doit pas seulement contenir les panneaux reduits.
Il doit aussi contenir les panneaux fermes afin que le MJ puisse les retrouver sans ouvrir le menu Gestion panneaux.

### Comportement

- un panneau reduit apparait dans le dock avec le statut reduit ;
- un panneau ferme apparait dans le dock avec le statut ferme ;
- cliquer un panneau du dock le rend visible et ouvert ;
- les panneaux epingles ne sont pas ajoutes au dock ;
- le dock disparait quand aucun panneau n'est reduit ou ferme.

### Validation manuelle

1. Mode Avance.
2. Reduire Mini-map.
3. Verifier que Mini-map apparait dans le dock avec le statut reduit.
4. Cliquer Mini-map dans le dock.
5. Verifier que Mini-map revient.
6. Fermer Ajout token.
7. Verifier que Ajout token apparait dans le dock avec le statut ferme.
8. Cliquer Ajout token dans le dock.
9. Verifier que Ajout token revient ouvert.

## Correction Lot 2 - Reouverture robuste des panneaux

### Probleme constate

Le panneau Detail token pouvait rester impossible a rouvrir depuis Gestion panneaux.

Cause probable :

- etat runtime incoherent entre hidden, collapsed et pinned ;
- panneau ferme non restaure visuellement malgre la mise a jour localStorage ;
- dock qui excluait certains panneaux fermes s'ils etaient epingles ;
- reouverture trop dependante de l'event runtime.

### Correction

- showFloatingWidget force maintenant localStorage et DOM ;
- les panneaux fermes sont ajoutes au dock meme s'ils etaient epingles ;
- la reouverture retire collapsed et pinned ;
- les details HTML sont forces open ;
- un etat data-floating-runtime-state facilite le debug.

### Validation

1. Mode Avance.
2. Fermer Detail token.
3. Verifier que Detail token apparait dans le dock.
4. Cliquer Detail token dans le dock.
5. Verifier que Detail token revient.
6. Fermer Detail token.
7. Ouvrir Gestion panneaux.
8. Cliquer Detail token.
9. Verifier que Detail token revient.
