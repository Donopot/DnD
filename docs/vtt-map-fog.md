# Architecture VTT : Carte, Tokens et Brouillard de Guerre

Ce document fusionne le plan de refonte de la carte de campagne et la stabilisation
du Fog of War. Il sert de référence unique pour toute PR ou mission touchant à la
carte VTT, aux tokens ou au brouillard de guerre.

---

## 1. Architecture de la carte

### 1.1 Composants cibles

La carte doit être réorganisée autour de composants spécialisés, chacun avec une
responsabilité unique :

| Composant | Rôle |
|-----------|------|
| `CampaignMap` | Orchestration générale et compatibilité des props publiques |
| `MapViewport` | Pan, zoom, centrage, dimensions visibles, persistance par scène |
| `MapBoard` | Repère monde, taille de scène, conversion monde/écran |
| `MapLayers` | Ordre des couches et règles de `pointer-events` |
| `BackgroundLayer` | Image de carte ou fond (upload MinIO, rattachement à la scène) |
| `GridLayer` | Affichage de la grille, sans capture de clic |
| `FogLayer` | Affichage fog et capture uniquement quand l'outil de dessin est actif |
| `TokenLayer` | Sélection, drag preview, snap, clavier, mouvements persistants |
| `ToolOverlay` | Outils temporaires actifs, mesures, sélections, menus |
| `MapToolbar` | Modes d'interaction, zoom, recentrage, fog, grille |

### 1.2 Hooks associés

Les hooks isolent les responsabilités métier :

- `useMapViewport` : zoom, pan, recentrage, persistence locale.
- `useTokenInteractions` : sélection, drag, keyboard nudge, droits joueur/GM.
- `useMapPermissions` : permissions dérivées du rôle et des tokens possédés.
- `useSceneRealtime` : application des événements WebSocket dans l'état React.

### 1.3 Ordre des couches et capture du pointeur

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

Règles non négociables :

- Les couches purement visuelles utilisent `pointer-events: none`.
- Le fog capture les clics **uniquement** quand le mode dessin ou gomme est actif.
- Les tokens restent cliquables même quand le fog est visible.
- Les outils actifs déclarent explicitement quand ils capturent le pointeur.

### 1.4 Gestion des assets de carte

- Upload d'image de carte (PNG, JPEG, WebP, GIF, limite 15 MB).
- Stockage dans MinIO.
- Rattachement à une campagne puis association à une scène via `PATCH /api/scenes/{scene_id}/background`.
- L'image s'affiche sous la grille et les tokens.

---

## 2. Système de tokens

### 2.1 Principes fondamentaux

- React est la source de vérité pour la position des tokens — pas de mutation DOM
  directe.
- Un seul appel API au relâchement du drag, pas à chaque micro-delta.
- Snap-to-grid appliqué sur la position finale, pas en continu.
- WebSocket : appliquer les mouvements reçus dans l'état React sans recharger la
  scène entière.

### 2.2 Interactions token

| Interaction | GM | Joueur |
|-------------|-----|--------|
| Sélection simple | Tous les tokens | Uniquement tokens possédés |
| Multi-sélection | Oui | Non |
| Drag | Tous les tokens | Uniquement tokens possédés |
| Preview locale pendant drag | Oui | Oui |
| Clavier (flèches) | Tokens sélectionnés autorisés | Tokens sélectionnés possédés |
| Snap-to-grid | Optionnel (toggle G) | Optionnel (toggle G) |

### 2.3 Visibilité des tokens

Règle métier pour la vue joueur :

```
Visible joueur = token non caché manuellement ET centre du token dans une zone révélée
```

Côté MJ, tous les tokens sont visibles, avec des badges distincts :

- `🙈` : caché manuellement aux joueurs (`is_hidden=true`)
- `👁️‍🗨️` : caché par le brouillard de guerre (hors zone révélée)

### 2.4 Panneau détail token

Accessible depuis la carte ou la liste de tokens :

- Nom, personnage lié, position, taille, visibilité, couleur.
- Bouton « Centrer » pour recentrer la vue sur le token.
- Boutons directionnels pour déplacement case par case.
- Lien vers les paramètres de visibilité manuelle.

---

## 3. Brouillard de guerre (Fog of War)

### 3.1 Modèle de données

Le fog est représenté comme une **liste de zones révélées** (et non une liste de
zones obscures). Le canvas dessine un overlay noir complet, puis découpe les zones
révélées via l'opération `destination-out`.

Chaque zone possède :

```json
{
  "x": 100,
  "y": 200,
  "width": 300,
  "height": 300,
  "shape": "rect"
}
```

```json
{
  "x": 100,
  "y": 200,
  "width": 300,
  "height": 300,
  "shape": "circle"
}
```

Les shapes supportées : `rect`, `circle`. La validation backend limite `shape` à
ces deux valeurs.

### 3.2 Modes d'interaction

Deux concepts distincts à ne pas confondre :

| Concept | Description |
|---------|-------------|
| `showFog` | Affiche ou masque la couche de fog (affichage local MJ) |
| `drawFog` | Active la capture des clics pour dessiner/effacer le fog |

Le bouton Fog ON/OFF dans `CampaignMap` est un **affichage local MJ**. Il ne
modifie ni l'état global de la scène, ni l'affichage joueur. Son libellé doit
être clair : « Afficher fog / Masquer fog » avec tooltip « Affichage local MJ,
ne modifie pas la visibilité joueur. »

Quand le mode pan est actif, les modes Draw et Erase doivent être désactivés
automatiquement pour éviter toute contradiction visuelle ou fonctionnelle.

### 3.3 Outils de dessin

| Outil | Action |
|-------|--------|
| Draw rectangle | Ajoute une zone rectangulaire révélée |
| Draw cercle | Ajoute une zone circulaire révélée |
| Eraser | Supprime une zone (rectangle ou cercle) sous le clic |
| Undo | Annule la dernière opération de dessin ou d'effacement |
| Reset | Supprime toutes les zones de fog |

### 3.4 Auto-reveal (révélation automatique)

Quand un token avec `vision_radius > 0` est déplacé, une zone est automatiquement
révélée autour de sa nouvelle position.

**Problème identifié et corrigé** : conversion pieds → pixels.

Le `vision_radius` est exprimé en pieds. Il doit être converti en pixels selon
la grille de la scène :

```
radius_px = (vision_radius_ft / feet_per_square) * grid_size

Exemple :
  grille : 50 px pour 5 ft
  vision : 60 ft
  rayon attendu : 600 px
  rayon incorrect (avant correctif) : 60 px
```

L'auto-reveal doit créer une zone de `shape: "circle"` (et non `"rect"` comme
dans l'implémentation initiale).

**Endpoint backend** :

```py
class CircleRevealRequest(BaseModel):
    center_x: float
    center_y: float
    radius_px: float
```

Ou, si l'API reste en pieds :

```py
class CircleRevealRequest(BaseModel):
    center_x: float
    center_y: float
    radius_ft: float
    grid_size: float = 50
    feet_per_square: float = 5
```

### 3.5 Sauvegarde et robustesse

**Problème** : `saveFogZones()` applique `setFogZones(newZones)` de façon
optimiste avant que le PATCH backend ne confirme la sauvegarde. En cas d'échec,
le MJ voit une zone fantôme.

**Correctif** : conserver l'état précédent et rollback en cas d'erreur :

```tsx
const previousZones = fogZones;
setFogZones(newZones);

try {
  await api.patch(`/scenes/${sceneId}/fog`, { zones: newZones });
} catch {
  setFogZones(previousZones);
  setFogSaveError("Sauvegarde du brouillard impossible.");
}
```

### 3.6 Synchronisation WebSocket

**Problème** : `CampaignMap` écoute directement `wsRef.current`. Si le WebSocket
se reconnecte, le listener peut rester attaché à l'ancien socket.

**Correctif** : traitement centralisé dans `App.tsx` :

```
session_changed resource=fog scene_id=selectedSceneId
```

Le signal est transmis à `CampaignMap`, qui recharge les zones de fog depuis
l'API sans refresh complet.

### 3.7 Points à ne pas casser

- Le fog ne capture les clics que si Draw ou Erase est actif.
- Les tokens doivent rester cliquables quand Fog ON est actif mais Draw/Erase
  inactifs.
- Les joueurs ne voient jamais un token `is_hidden=true`.
- Les joueurs ne voient un token que si son centre est dans une zone révélée.
- La carte flottante ne crée pas deux instances actives de `CampaignMap`.
- Le mode cercle fonctionne en draw manuel ET en auto-reveal.
- La gomme fonctionne sur les rectangles ET les cercles.

---

## 4. Viewport, Pan et Zoom

### 4.1 Comportements

| Fonctionnalité | Comportement attendu |
|----------------|---------------------|
| Chargement initial | Centrage automatique sur la scène active |
| Bouton recentrage | Remet la scène au centre (touche `0`) |
| Pan | Mode main dédié, espace pour activer/désactiver |
| Pan bouton milieu | Support si possible |
| Zoom | Vers le curseur, pas vers le coin supérieur gauche |
| Zoom bornes | Entre 25 % et 300 % |
| Persistance | `pan`, `zoom` et `sceneId` sauvegardés localement |

### 4.2 Raccourcis clavier

| Touche | Action |
|--------|--------|
| Flèches | Déplacer le token sélectionné d'une case |
| `+` | Zoomer |
| `-` | Dézoomer |
| `0` | Reset vue (zoom 100 %, recentrage) |
| `Espace` | Activer/désactiver le mode pan |
| `G` | Activer/désactiver le snap-to-grid |
| `Échap` | Quitter la sélection et le mode pan |

Les raccourcis ne se déclenchent pas dans les champs de formulaire.

### 4.3 Mini-map

- Affiche la scène complète sans rognage, ratio réel conservé.
- Positionnée dans le panneau latéral VTT.
- Affiche les tokens et le viewport courant.
- Token sélectionné mis en avant.
- Clic dans la mini-map pour recentrer la carte principale.

---

## 5. Permissions

### 5.1 Modèle

```ts
type MapMode = "gm" | "player";

type MapPermissions = {
  canSelectToken: (tokenId: string) => boolean;
  canMoveToken: (tokenId: string) => boolean;
  canEditFog: boolean;
  canMultiSelect: boolean;
};
```

`CampaignMap` reçoit des permissions explicites plutôt que de déduire la logique
depuis des props dispersées. Cela unifie les vues GM et joueur autour d'un seul
composant configurable, évitant la duplication et la divergence.

### 5.2 Règles par rôle

| Capacité | GM | Co-MJ | Joueur |
|----------|-----|-------|--------|
| Sélectionner un token | Tous | Tous | Possédés uniquement |
| Déplacer un token | Tous | Tous | Possédés uniquement |
| Éditer le fog | Oui | Oui | Non |
| Multi-sélection | Oui | Oui | Non |
| Voir tous les tokens | Oui | Oui | Non (fog + hide) |
| Modifier visibilité manuelle | Oui | Oui | Non |

---

## 6. Phases d'implémentation

### Phase 1 — Stabiliser le viewport

Objectif : la carte s'ouvre au bon endroit et est déplaçable sans surprise.

- Centrer automatiquement la scène active au premier affichage.
- Ajouter un bouton de recentrage.
- Ajouter un mode main pour pan volontaire.
- Autoriser le pan via bouton milieu ou raccourci clavier.
- Faire un zoom vers le curseur.
- Borner le zoom entre 25 % et 300 %.
- Persister `pan`, `zoom` et `sceneId` localement.

### Phase 2 — Normaliser les couches

Objectif : une couche visuelle ne doit jamais casser une interaction token.

- Appliquer l'ordre des couches et les règles `pointer-events` (cf. section 1.3).
- Le fog capture les clics uniquement quand Draw/Erase est actif.
- Les tokens restent cliquables quand le fog est visible.

### Phase 3 — Refaire les interactions tokens

Objectif : sélectionner, déplacer et synchroniser les tokens sans comportement
aléatoire.

- React comme source de vérité.
- Supprimer les mutations DOM directes pour `token_moved`.
- Drag avec preview locale, un seul appel API au relâchement.
- Snap appliqué sur la position finale.
- Clavier : déplacement par flèches.
- WebSocket : appliquer les mouvements dans l'état React sans reload.

### Phase 4 — Unifier GM et joueur

Objectif : éviter deux cartes qui évoluent séparément.

- Introduire `MapPermissions` explicite (cf. section 5.1).
- Un seul `CampaignMap` piloté par le mode `"gm"` ou `"player"`.

### Phase 5 — Faire du fog un outil fiable

Objectif : le fog visible sans bloquer la carte, sauvegarde robuste,
synchronisation fiable.

- Distinguer `showFog` (affichage local MJ) et `drawFog` (mode dessin).
- Rectangle, cercle et gomme fonctionnels.
- Auto-reveal : conversion correcte ft → px, shape `circle`.
- Undo / Reset côté GM.
- Sauvegarde avec rollback en cas d'échec.
- WebSocket centralisé pour les changements de fog.
- Désactiver Draw/Erase quand le mode pan est actif.

### Phase 6 — Tests et validation

Validation manuelle minimale :

- La carte s'ouvre centrée sur la scène active.
- Le bouton recentrage remet la scène au centre.
- Le pan fonctionne sans sélectionner accidentellement un token.
- Le zoom garde le point visé sous le curseur.
- Un token est cliquable avec fog visible.
- Un token GM peut être déplacé et reste à la bonne position après reload.
- Un token joueur possédé peut être déplacé si le mode l'autorise.
- Un token non possédé ne peut pas être déplacé par un joueur.
- Le fog ne capture les clics qu'en mode dessin.
- Les événements WebSocket `token_moved` mettent à jour l'affichage sans
  mutation DOM directe.
- Draw rectangle, draw cercle, gomme, undo, reset fonctionnent.
- L'auto-reveal produit un cercle à la bonne taille.
- En cas d'échec de sauvegarde fog, l'UI rollback proprement.
- Token `is_hidden=true` invisible côté joueur, badge 🙈 côté MJ.
- Token hors zone révélée invisible côté joueur, badge 👁️‍🗨️ côté MJ.
- La carte flottante conserve les interactions fog.
- La synchronisation WebSocket fog fonctionne sur deux clients.

Commandes de vérification :

```bash
# Frontend
cd frontend
npm ci
npx tsc --noEmit
npm run build

# Backend
cd backend
uv sync
uv run ruff check .
uv run pytest --tb=short -q

# Docker
cp .env.example .env
docker compose config --quiet
```

### Découpage recommandé en PR

1. `refactor: split campaign map layers`
2. `fix: rebuild map viewport pan and centering`
3. `fix: rebuild token layer interactions`
4. `fix: isolate fog drawing from token clicks`
5. `fix: stabilize fog of war visibility, auto-reveal and map interactions`
6. `test: add map interaction regression coverage`

### Priorité d'exécution

1. `MapViewport` — la base de tout déplacement et centrage.
2. `TokenLayer` — les interactions utilisateur principales.
3. Règles de couches — pour que le fog et les tokens cohabitent.
4. Fog outil dédié — dépend du modèle de couches et du mode d'interaction.
5. Unification GM/Joueur — s'appuie sur la stabilité des couches précédentes.
6. Tests de régression — valident l'ensemble.

---

## Références croisées

- `docs/plan-refonte-map.md` — plan de refonte détaillé de la carte.
- `docs/archive/pr-fog-of-war-stabilization.md` — PR de stabilisation du fog.
- `docs/archive/phase-8-map-assets.md` — gestion des images de fond de carte.
- `docs/archive/phase-9-map-ux.md` — UX carte avancée (drag, zoom, mini-map).
- `docs/archive/phase-6-vtt-session.md` — sessions VTT, scènes, tokens.
- `docs/agent-coordination.md` — coordination multi-agent et registre des branches.
- `docs/frontend-panels.md` — architecture des panneaux UI.
- `docs/gm-panel-stabilization.md` — stabilisation des panneaux MJ.
