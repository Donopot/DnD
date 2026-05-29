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
