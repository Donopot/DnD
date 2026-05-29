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

## Passe de stabilisation 2 - Reset centralise et controle strict

### Objectif

Nettoyer les controles redondants et verifier que tous les panneaux respectent le meme standard.

### Corrections

- suppression du bouton Reset panneaux dans la toolbar VTT ;
- conservation d'un seul reset dans le menu Panneaux ;
- menu Panneaux devient le centre de controle unique ;
- sauvegarde du layout deplacee dans le footer du menu ;
- verification stricte des attributs data-vtt-panel, data-floating-widget et data-floating-title ;
- verification que VttBoard ne branche plus directement showFloatingWidget ;
- verification que le hook detecte les panneaux via data-vtt-panel ;
- verification que les panneaux du registre existent dans VttBoard ;
- verification que les panneaux de VttBoard existent dans le registre.

### Regle UX

La toolbar VTT ne doit contenir que les actions de carte.

La gestion des panneaux doit etre centralisee dans :

- Panneaux ;
- dock des panneaux masques ;
- toolbar runtime de chaque panneau.

### Validation

Executer :

```bash
sh scripts/check-vtt-panels.sh
sh scripts/check-panel-system.sh
sh scripts/check-frontend-types.sh

## Passe 2 - Nettoyage ergonomique

### Objectif

Nettoyer les actions redondantes et renforcer la standardisation des panneaux.

### Changements

- suppression du bouton Reset panneaux dans la toolbar VTT ;
- conservation d'un seul reset panneaux dans le menu Panneaux ;
- renommage visuel du reset carte pour eviter la confusion ;
- menu Panneaux base uniquement sur le registre ;
- boutons Afficher un panneau toujours accessibles ;
- nettoyage des anciens headers flottants legacy ;
- verification stricte via scripts/check-panel-system.sh.

### Regle retenue

- Reset carte reste dans la toolbar carte ;
- Reset panneaux reste uniquement dans Panneaux ;
- Reset layout personnalise passe par Panneaux ;
- aucun bouton destructif de layout ne doit etre duplique dans la toolbar principale.

## Passe 3 - Verification exhaustive boutons et panneaux

### Objectif

Verifier que tous les boutons et tous les panneaux respectent le meme contrat.

### Ajouts

- script scripts/check-panel-interactions.sh ;
- matrice docs/gm-panel-test-matrix.md ;
- verification des listeners add/remove ;
- verification des boutons runtime standards ;
- verification de l'absence de reset panneaux dans VttBoard ;
- verification que le menu Panneaux lit le registre ;
- verification que les boutons d'affichage ne sont pas desactives ;
- verification des attributs data-vtt-panel, data-floating-widget et data-floating-title.

### Limite

La verification automatique reste statique.
Sans runner navigateur type Playwright, les interactions reelles doivent etre validees avec la matrice manuelle.
