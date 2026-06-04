# 08 — UI, panneaux GM et VTT

## Rôle des panneaux

Les panneaux GM permettent d'organiser les outils du MJ autour de la carte : combat, dés, actions rapides, journal, documents, bestiaire, sorts, équipement et autres aides de jeu.

## État actuel à comprendre

Le projet a connu plusieurs générations de panneaux. Il faut donc faire attention aux restes d'anciens systèmes.

Système actuel important :

```text
frontend/src/components/FloatingPanel.tsx
frontend/src/hooks/useFloatingPanels.ts
frontend/src/App.tsx
```

Ancien système à surveiller :

```text
frontend/src/config/vttPanels.ts
frontend/src/hooks/useFloatingWidgets.ts
```

## Problème typique

Quand deux systèmes de panneaux coexistent, on peut avoir :

- des IDs différents pour le même panneau ;
- des boutons de reset multiples ;
- des panneaux présents dans le registre mais absents de l'interface ;
- des scripts de vérification qui regardent d'anciens fichiers ;
- des comportements incohérents entre panneau docké et panneau flottant.

## Règles de standardisation

Chaque panneau doit avoir :

- un ID unique ;
- un nom lisible ;
- un emplacement logique ;
- un état vide ;
- une gestion erreur/loading ;
- un comportement détachable standard ;
- un rendu dans le système flottant si le bouton détacher existe.

## Commandes utiles

```bash
cd /home/donopot/dnd-saas
sh scripts/check-gm-panels-standard-layout.sh || true
sh scripts/check-panel-system.sh || true
```

Ces scripts peuvent être à mettre à jour si l'architecture des panneaux change.

## Exercice

Liste les panneaux visibles dans l'onglet Session Live, puis vérifie s'ils ont tous un équivalent dans le rendu des panneaux flottants.
