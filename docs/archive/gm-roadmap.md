# Roadmap interface GM

## Principe directeur

L'interface GM est organisée autour de deux niveaux :

- les onglets sont les grands espaces de travail ;
- les panneaux sont les outils contextuels du MJ.

Les panneaux doivent tous utiliser le même socle technique et visuel.

## Structure cible des onglets GM

- Campagne ;
- Préparation ;
- Session Live ;
- Personnages ;
- Journal ;
- Bibliothèque ;
- Paramètres.

## Structure cible de Session Live

Session Live est le cockpit principal du MJ.

Elle contient :

- Carte de session ;
- modes de session ;
- menu Panneaux ;
- panneaux GM standardisés ;
- dock des panneaux fermés ou réduits ;
- actions rapides.

Elle ne doit plus contenir directement :

- ancien bloc Combat complet ;
- ancien bloc Journal complet ;
- ancien titre Table virtuelle.

## Socle obligatoire des panneaux GM

Chaque panneau doit respecter :

- data-vtt-panel ;
- data-floating-widget ;
- data-floating-title ;
- un seul header runtime ;
- boutons standards ;
- dock compatible ;
- réduction compatible ;
- fermeture compatible ;
- épinglage compatible ;
- verrouillage compatible ;
- redimensionnement compatible ;
- classes CSS communes.

## CSS commun obligatoire

Les panneaux doivent utiliser le socle :

- gm-panel-content ;
- gm-panel-section ;
- gm-panel-context ;
- gm-panel-stat ;
- gm-panel-card ;
- gm-panel-row ;
- gm-panel-list ;
- gm-panel-actions ;
- gm-panel-button ;
- gm-panel-muted ;
- gm-panel-badge ;
- gm-panel-progress.

Un nouveau panneau ne doit pas recréer un gros bloc CSS complet.

Le CSS spécifique est autorisé uniquement pour un besoin métier réel.

# Ordre de développement mis à jour

## Étape 0 - Stabilisation GM

### 0A - Clean Session Live

État : terminé / à surveiller.

Objectif :

- retirer Table / Combat / Journal de Session Live ;
- renommer Table virtuelle en Carte de session ;
- garder Journal comme onglet archive ;
- garder Combat comme mode/panneaux.

### 0B - Standardisation panneaux

État : terminé / à surveiller.

Objectif :

- registre unique des panneaux ;
- menu Panneaux basé sur le registre ;
- suppression data-quick-panel ;
- dock fermé/réduit ;
- boutons standards ;
- reset panneaux uniquement dans le menu Panneaux.

### 0C - Consolidation visuelle

État : terminé / à surveiller.

Objectif :

- rendre les panneaux plus lisibles ;
- éviter les doubles headers ;
- améliorer le dock ;
- éviter les panneaux hors écran.

### 0D - Validation finale

État : terminé.

Objectif :

- build TypeScript OK ;
- build Docker OK ;
- health backend OK ;
- test navigateur OK ;
- merge/tag de stabilisation.

## Étape 1 - Socle CSS commun

### GM-2D-CSS - CSS commun panneaux GM

État : en cours / prioritaire.

Objectif :

- centraliser le style commun des panneaux ;
- refactoriser Notes MJ ;
- refactoriser Résumé du groupe ;
- ajouter un script de vérification CSS ;
- documenter la règle pour les prochains panneaux.

Validation :

- scripts/check-gm-panel-css.sh OK ;
- scripts/check-gm-notes-panel.sh OK ;
- scripts/check-party-summary-panel.sh OK ;
- build Docker OK.

## Étape 2 - Reprise des panneaux existants

### GM-2C - Notes MJ

État : à finaliser avec CSS commun.

Objectif :

- notes privées par scène ;
- sauvegarde localStorage ;
- copie ;
- vider ;
- contexte scène/token ;
- compatibilité complète panneau standard.

Critères :

- visible depuis Panneaux ;
- ouvrable depuis Actions rapides ;
- texte conservé après refresh ;
- dock/réduction/fermeture OK.

### GM-2D - Résumé du groupe

État : à finaliser avec CSS commun.

Objectif :

- PV ;
- CA ;
- vitesse ;
- perception passive ;
- statut OK / Blessé / Critique / KO ;
- personnage sélectionné mis en avant ;
- zéro CSS lourd spécifique.

Critères :

- visible depuis Panneaux ;
- ouvrable depuis Actions rapides ;
- affichage correct avec zéro personnage ;
- affichage correct avec plusieurs personnages.

### GM-2E - Initiative stable

État : prochain vrai sprint fonctionnel.

Objectif :

- panneau Initiative lisible ;
- round actuel ;
- combattant actif ;
- ordre de tour ;
- suivant ;
- démarrer / terminer combat ;
- intégration avec le combat backend existant ;
- CSS commun.

Critères :

- panneau ouvrable depuis Panneaux ;
- panneau ouvrable depuis Actions rapides ;
- mode Combat affiche Initiative ;
- état actif clair.

### GM-2F - Actions rapides

État : à refactoriser avec CSS commun.

Objectif :

- panneau compact ;
- boutons panneaux ;
- boutons layouts ;
- dés rapides ;
- utilitaires session ;
- pas de surcharge visuelle.

Critères :

- tous les boutons fonctionnent ;
- pas de scroll excessif ;
- utilisable en petit panneau ;
- aucun bouton inutile.

### GM-2G - Visibilité

État : à finaliser avec CSS commun.

Objectif :

- inspecteur visibilité ;
- token visible/caché ;
- état MJ vs joueurs ;
- rappel anti-erreur de révélation.

Critères :

- panneau lisible ;
- statut du token sélectionné clair ;
- actions futures préparées.

## Étape 3 - Nouveaux panneaux GM prioritaires

À faire uniquement après stabilisation des panneaux existants.

### GM-3A - Bibliothèque tokens

Objectif :

- liste tokens réutilisables ;
- recherche ;
- favoris ;
- derniers utilisés ;
- ajout rapide sur carte.

### GM-3B - Documents révélables

Objectif :

- documents privés MJ ;
- documents visibles joueurs ;
- bouton révéler ;
- historique des révélations.

### GM-3C - États / conditions

Objectif :

- états actifs ;
- durée ;
- rappel début/fin de tour ;
- liaison avec combat.

### GM-3D - Rencontre active

Objectif :

- ennemis prévus ;
- ennemis révélés ;
- objectifs ;
- conditions de victoire ;
- loot prévu.

## Étape 4 - Gestion avancée des tokens

Objectif :

- édition token ;
- duplication ;
- suppression ;
- visibilité ;
- PV ;
- états ;
- taille ;
- portrait ;
- liaison personnage ;
- menu contextuel clic droit ;
- verrouillage déplacement.

## Étape 5 - Interface joueur

Objectif :

- carte joueur ;
- fiches joueur ;
- journal public ;
- dés ;
- documents révélés ;
- permissions ;
- aucune UI GM visible.

## Définition de fini pour chaque sprint panneau

Chaque sprint panneau doit valider :

- panneau déclaré dans vttPanels.ts ;
- panneau rendu dans VttBoard.tsx ;
- data-vtt-panel correct ;
- data-floating-widget correct ;
- data-floating-title correct ;
- CSS commun utilisé ;
- bouton Actions rapides si pertinent ;
- script de vérification ;
- TypeScript OK ;
- Docker build OK ;
- test navigateur dock/réduire/fermer/rouvrir/épingler/verrouiller.

## Commandes de validation standard

```bash
sh scripts/check-gm-panel-css.sh
sh scripts/check-vtt-panels.sh
sh scripts/check-panel-system.sh
sh scripts/check-frontend-types.sh

docker compose up -d --build

sh scripts/wait-api.sh
curl -fsS http://127.0.0.1:8091/api/health
curl -I http://127.0.0.1:8090
