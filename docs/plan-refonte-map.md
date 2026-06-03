# Plan refonte map

Ce document decrit la refonte cible de la carte de campagne du VTT DnD.
Il sert de reference commune pour decouper les prochaines PR, coordonner
Codex et Hermes, et eviter les correctifs partiels qui se marchent dessus.

## Objectif

Rendre la carte de campagne stable, centree, deplacable, ergonomique et
fiable pour les interactions de tokens, de fog of war et de grille, cote GM
comme cote joueur.

## Problemes constates

- La scene active n'est pas recentree de maniere fiable au chargement.
- Le deplacement de la carte n'est pas assez naturel pour un usage VTT.
- Les couches visuelles peuvent intercepter les clics destines aux tokens.
- Les interactions token, fog, grille et outils sont trop melangees dans les
  memes composants.
- Les vues GM et joueur dupliquent ou divergent sur des comportements qui
  devraient etre communs.
- Certaines mises a jour temps reel modifient encore le DOM directement alors
  que l'etat React devrait rester la source de verite.

## Architecture cible

La carte doit etre reorganisee autour de composants specialises :

| Composant | Role |
|-----------|------|
| `CampaignMap` | Orchestration generale et compatibilite des props publiques |
| `MapViewport` | Pan, zoom, centrage, dimensions visibles, persistance par scene |
| `MapBoard` | Repere monde, taille de scene, conversion monde/ecran |
| `MapLayers` | Ordre des couches et regles de `pointer-events` |
| `BackgroundLayer` | Image de carte ou fond |
| `GridLayer` | Affichage de la grille, sans capture de clic |
| `FogLayer` | Affichage fog et capture uniquement quand l'outil de dessin est actif |
| `TokenLayer` | Selection, drag preview, snap, clavier, mouvements persistants |
| `ToolOverlay` | Outils temporaires actifs, mesures, selections, menus |
| `MapToolbar` | Modes d'interaction, zoom, recentrage, fog, grille |

Les hooks associes doivent isoler les responsabilites :

- `useMapViewport` : zoom, pan, recentrage, persistence locale.
- `useTokenInteractions` : selection, drag, keyboard nudge, droits joueur/GM.
- `useMapPermissions` : permissions derivees du role et des tokens possedes.
- `useSceneRealtime` : application des evenements WebSocket dans l'etat React.

## Phase 1 - Stabiliser le viewport

Objectif : la carte doit s'ouvrir au bon endroit et etre deplacable sans
surprise.

Taches :

- Centrer automatiquement la scene active au premier affichage.
- Ajouter un bouton de recentrage.
- Ajouter un mode main pour pan volontaire.
- Autoriser le pan via bouton milieu ou raccourci clavier si possible.
- Faire un zoom vers le curseur, pas vers le coin superieur gauche.
- Borner le zoom, par exemple entre 25 % et 300 %.
- Persister `pan`, `zoom` et `sceneId` localement pour retrouver la vue.

Fichiers probables :

- `frontend/src/components/CampaignMap.tsx`
- `frontend/src/components/MapToolbar.tsx`
- `frontend/src/styles/map.css`

## Phase 2 - Normaliser les couches

Objectif : une couche visuelle ne doit jamais casser une interaction token.

Ordre cible :

| Couche | Z-index cible | Capture pointeur |
|--------|---------------|------------------|
| Background | 0 | Non |
| Grid | 5 | Non |
| Fog display | 20 | Non |
| Tokens | 30 | Oui |
| Token UI | 35 | Oui |
| Active tool overlay | 40 | Oui seulement si outil actif |
| Toolbar | 50 | Oui |
| Context menu | 60 | Oui |

Regles :

- Les couches purement visuelles utilisent `pointer-events: none`.
- Le fog capture les clics uniquement quand le mode dessin est actif.
- Les tokens restent cliquables quand le fog est visible.
- Les outils actifs declarent explicitement quand ils capturent le pointeur.

Fichiers probables :

- `frontend/src/components/FogLayer.tsx`
- `frontend/src/components/CampaignMap.tsx`
- `frontend/src/styles/map.css`

## Phase 3 - Refaire les interactions tokens

Objectif : selectionner, deplacer et synchroniser les tokens sans comportement
aleatoire.

Taches :

- Garder React comme source de verite pour la position des tokens.
- Supprimer les mutations DOM directes pour les evenements `token_moved`.
- Selection GM : simple selection, multi-selection, deselection propre.
- Selection joueur : uniquement tokens possedes.
- Drag : preview locale pendant le drag, un seul appel API au relachement.
- Snap : appliquer la grille sur la position finale, pas sur chaque micro-delta.
- Clavier : deplacement par fleches pour les tokens selectionnes autorises.
- WebSocket : appliquer les mouvements recus dans l'etat React sans recharger la
  scene entiere.

Fichiers probables :

- `frontend/src/components/CampaignMap.tsx`
- `frontend/src/components/PlayerView.tsx`
- `frontend/src/App.tsx`
- `frontend/src/components/MapTools.tsx`

## Phase 4 - Unifier GM et joueur

Objectif : eviter deux cartes qui evoluent separement.

Introduire une configuration de mode :

```ts
type MapMode = "gm" | "player";

type MapPermissions = {
  canSelectToken: (tokenId: string) => boolean;
  canMoveToken: (tokenId: string) => boolean;
  canEditFog: boolean;
  canMultiSelect: boolean;
};
```

`CampaignMap` doit recevoir des permissions explicites au lieu de deduire trop
de logique depuis plusieurs props dispersees.

## Phase 5 - Faire du fog un outil

Objectif : le fog doit etre visible sans bloquer la carte.

Taches :

- Distinguer `showFog` et `drawFog`.
- `showFog` affiche seulement la couche.
- `drawFog` active la capture des clics.
- Ajouter rectangle, cercle et gomme si le perimetre reste raisonnable.
- Ajouter undo/reset cote GM.
- Synchroniser les changements fog via WebSocket ou invalidation ciblee.

Fichiers probables :

- `frontend/src/components/FogLayer.tsx`
- `frontend/src/components/MapToolbar.tsx`
- `backend/app/routers/vtt.py`

## Phase 6 - Tests et validation

Validation manuelle minimale sur le HP Mini :

- La carte s'ouvre centree sur la scene active.
- Le bouton recentrage remet la scene au centre.
- Le pan fonctionne sans selectionner accidentellement un token.
- Le zoom garde le point vise sous le curseur.
- Un token est cliquable avec fog visible.
- Un token GM peut etre deplace et reste a la bonne position apres reload.
- Un token joueur possede peut etre deplace si le mode l'autorise.
- Un token non possede ne peut pas etre deplace par un joueur.
- Le fog ne capture les clics qu'en mode dessin.
- Les evenements WebSocket `token_moved` mettent a jour l'affichage sans
  mutation DOM directe.

Commandes de verification cible :

```bash
cd frontend
npm ci
npx tsc --noEmit
npm run build

cd ../backend
uv sync
uv run ruff check .
uv run pytest --tb=short -q
```

## Decoupage recommande en PR

1. `refactor: split campaign map layers`
2. `fix: rebuild map viewport pan and centering`
3. `fix: rebuild token layer interactions`
4. `fix: isolate fog drawing from token clicks`
5. `test: add map interaction regression coverage`

## Priorite

Commencer par `MapViewport`, puis `TokenLayer`, puis les regles de couches.
Le fog doit etre traite ensuite comme un outil dedie, car il depend du modele
de couches et du mode d'interaction.
