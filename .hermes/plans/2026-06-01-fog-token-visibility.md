# Plan — Brouillard de guerre × Tokens (5 améliorations)

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Corriger la visibilité des tokens sous le fog (A), ajouter un indicateur MJ (B), l'auto-révélation autour des tokens joueurs (C), la révélation circulaire (D), et l'aperçu fog sur la minimap (E).

**Architecture:** A est un fix frontend pur (filtrage des tokens hors zones révélées). B est un ajout visuel frontend pour le MJ. C nécessite backend (nouveau type de zone circulaire + calcul d'intersection) + frontend (auto-révélation au drag). D étend le FogLayer pour accepter un mode cercle. E lit les zones de fog dans le canvas de la minimap.

**Tech Stack:** React/TypeScript frontend, FastAPI/Python backend, PostgreSQL (jsonb fog_zones)

**Conventions:** Voir `.hermes/developer-rules.md` et `writing-plans/references/dnd-vtt-conventions.md` — branches `agent/feat/*`, pas de push direct sur main, TDD backend, tsc --noEmit + npm run build frontend, lazy loading dans App.tsx.

---

## A — Filtrer les tokens par zone de fog (🔴 CRITIQUE)

### Objectif
Pour les joueurs : si le centre d'un token n'est dans aucune zone de fog révélée → ne pas le rendre du tout. Pour le MJ : toujours visible, inchangé.

### Principe
Actuellement le fog est un overlay semi-transparent (canvas à z-index 10, tokens à z-index 5). Les tokens sous le fog sont **assombris mais visibles**. Le fix ne touche pas au canvas — il **filtre côté React** : on ne rend tout simplement pas les tokens hors des zones révélées.

### Algorithme
```
Pour chaque token :
  centre_x = token.x + (token.size * gridSize) / 2
  centre_y = token.y + (token.size * gridSize) / 2
  Si isGM → toujours afficher
  Sinon :
    visible = zones.any(zone =>
      centre_x >= zone.x &&
      centre_x <= zone.x + zone.width &&
      centre_y >= zone.y &&
      centre_y <= zone.y + zone.height
    )
    Si !visible → ne pas rendre le token
```

### Tâches

#### Task A-1: Récupérer les fog_zones dans CampaignMap

**Objective:** Charger les zones de fog et les passer au rendu des tokens.

**Files:**
- Modify: `frontend/src/components/CampaignMap.tsx`

**Step 1: Ajouter l'état `fogZones` et le chargement**

```tsx
// Ajouter après la ligne ~75 (après weatherEnabled):
const [fogZones, setFogZones] = useState<FogZone[]>([]);
```

**Step 2: Ajouter le useEffect de chargement**

```tsx
// Après le useEffect du weather (~ligne 100):
useEffect(() => {
  if (!selectedScene?.id) return;
  const t = localStorage.getItem("dnd_access_token") || "";
  fetch(`/api/scenes/${selectedScene.id}/fog`, {
    headers: { Authorization: `Bearer ${t}` },
  })
    .then((r) => r.json())
    .then((d) => setFogZones(d.fog_zones || []))
    .catch(() => {});
}, [selectedScene?.id]);
```

**Step 3: Écouter les broadcasts WebSocket pour rafraîchir**

Ajouter dans le handler WebSocket existant (s'il y en a un dans CampaignMap) ou via un callback — si `payload.resource === "fog"`, recharger les zones.

```tsx
// Dans le useEffect qui écoute wsRef:
if (msg.resource === "fog" && msg.scene_id === selectedSceneId) {
  // re-fetch fog zones
}
```

Si CampaignMap n'a pas de listener WebSocket direct, passer par un nouvel effet :

```tsx
useEffect(() => {
  const ws = wsRef.current;
  if (!ws) return;
  const originalOnMessage = ws.onmessage;
  ws.onmessage = (event) => {
    originalOnMessage?.call(ws, event);
    try {
      const data = JSON.parse(event.data);
      if (data.type === "vtt_change" && data.resource === "fog" && data.scene_id === selectedSceneId) {
        const t = localStorage.getItem("dnd_access_token") || "";
        fetch(`/api/scenes/${selectedSceneId}/fog`, {
          headers: { Authorization: `Bearer ${t}` },
        })
          .then((r) => r.json())
          .then((d) => setFogZones(d.fog_zones || []))
          .catch(() => {});
      }
    } catch {}
  };
  return () => { ws.onmessage = originalOnMessage; };
}, [wsRef, selectedSceneId]);
```

**Step 4: Filtrer les tokens au rendu**

Dans la boucle `sceneTokens.map(...)` (ligne ~496), ajouter avant le `return` :

```tsx
{sceneTokens.map((token) => {
  // ── Fog visibility filter (players only) ──
  if (!isGM && fogZones.length > 0) {
    const tokenCenterX = token.x + (token.size * gridSize) / 2;
    const tokenCenterY = token.y + (token.size * gridSize) / 2;
    const isRevealed = fogZones.some(
      (zone) =>
        tokenCenterX >= zone.x &&
        tokenCenterX <= zone.x + zone.width &&
        tokenCenterY >= zone.y &&
        tokenCenterY <= zone.y + zone.height,
    );
    if (!isRevealed) return null;  // Skip unrevealed tokens
  }
  // ... reste du rendu inchangé
```

**Step 5: Edge case — pas de zones de fog**

Si `fogZones.length === 0`, tout est révélé → ne pas filtrer (comportement actuel inchangé).

**Step 6: Vérification**

```bash
cd frontend && npx tsc --noEmit && npm run build
```

Comportement attendu :
- MJ : tous les tokens visibles, inchangé
- Joueur avec fog actif : seuls les tokens dans les zones révélées sont visibles
- Joueur sans fog : tous les tokens visibles (fogZones vide → pas de filtre)
- Quand le MJ révèle une nouvelle zone → WebSocket → les tokens apparaissent

---

## B — Indicateur visuel MJ sur les tokens cachés par le fog

### Objectif
Le MJ voit un liseré violet + icône 👁️‍🗨️ sur les tokens qui sont dans une zone NON révélée (donc invisibles aux joueurs).

### Tâches

#### Task B-1: Ajouter la classe CSS et le calcul

**Objective:** Quand `isGM && !isRevealed`, ajouter une classe `fog-hidden` au token.

**Files:**
- Modify: `frontend/src/components/CampaignMap.tsx`
- Modify: `frontend/src/styles/map.css`

**Step 1: Calcul dans la boucle token**

Dans la boucle `sceneTokens.map`, après le filtre fog :

```tsx
// ── GM fog indicator ──
let isFogHidden = false;
if (isGM && fogZones.length > 0) {
  const tokenCenterX = token.x + (token.size * gridSize) / 2;
  const tokenCenterY = token.y + (token.size * gridSize) / 2;
  isFogHidden = !fogZones.some(
    (zone) =>
      tokenCenterX >= zone.x &&
      tokenCenterX <= zone.x + zone.width &&
      tokenCenterY >= zone.y &&
      tokenCenterY <= zone.y + zone.height,
  );
}

return (
  <div
    className={`campaign-map-token ... ${isFogHidden ? "fog-hidden" : ""}`}
    ...
  >
    ...
    {isFogHidden && <span className="token-fog-icon" title="Caché aux joueurs (fog)">👁️‍🗨️</span>}
  </div>
);
```

**Step 2: CSS**

Ajouter dans `frontend/src/styles/map.css` :

```css
/* ── Fog-hidden token (GM indicator) ─────────────────────────────────────── */

.campaign-map-token.fog-hidden {
  border-color: rgba(180, 130, 255, 0.7) !important;
  box-shadow: 0 0 6px rgba(160, 100, 255, 0.5);
}

.token-fog-icon {
  position: absolute;
  top: -10px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 12px;
  z-index: 6;
  pointer-events: none;
  filter: drop-shadow(0 0 3px rgba(160, 100, 255, 0.6));
}
```

**Step 3: Vérification**

```bash
cd frontend && npx tsc --noEmit && npm run build
```

---

## C — Auto-révélation autour des tokens joueurs

### Objectif
Quand un token lié à un personnage-joueur (`character_id` non-null) est déplacé, révéler automatiquement un cercle de rayon `vision_radius` (défaut 60 ft = 12 cellules).

### Architecture
- **Backend** : ajouter un champ `vision_radius` sur `scene_tokens` (migration) + accepter des zones circulaires dans `fog_zones` + endpoint `POST /api/tokens/{id}/reveal` qui ajoute une zone circulaire au fog.
- **Frontend** : après chaque `moveToken`, si `token.character_id` est défini, appeler l'endpoint reveal.

### Backend Tasks

#### Task C-1: Migration — ajouter vision_radius aux tokens

**Objective:** Ajouter la colonne `vision_radius` à `scene_tokens`.

**Files:**
- Create: `backend/app/migrations/016_phase17_token_vision.sql`

```sql
-- 016_phase17_token_vision.sql
alter table scene_tokens
    add column if not exists vision_radius integer not null default 0;

comment on column scene_tokens.vision_radius is
'Vision radius in feet for auto fog reveal (0 = disabled). Player-character tokens use this to auto-reveal fog around them.';
```

#### Task C-2: Schéma Pydantic — ajouter vision_radius

**Objective:** Ajouter `vision_radius` aux schémas Token.

**Files:**
- Modify: `backend/app/schemas.py`

Dans `TokenCreateRequest`, `TokenUpdateRequest`, `TokenPublic` :

```python
vision_radius: int = Field(default=0, ge=0, description="Vision radius in feet for fog auto-reveal")
```

#### Task C-3: Endpoint POST /api/tokens/{id}/reveal

**Objective:** Endpoint qui ajoute une zone circulaire au fog de la scène.

**Files:**
- Modify: `backend/app/routers/vtt.py`

```python
class CircleRevealRequest(BaseModel):
    center_x: float
    center_y: float
    radius_ft: float

@router.post("/tokens/{token_id}/reveal")
async def reveal_around_token(
    token_id: UUID,
    payload: CircleRevealRequest,
    current_user=Depends(get_current_user),
):
    """Add a circular revealed zone around a token position."""
    existing = await get_token_or_404(token_id)
    await require_campaign_role(
        existing["campaign_id"], current_user["id"], {"gm", "co_gm", "player"}
    )

    scene = await get_scene_or_404(existing["scene_id"])
    current_zones: list = decode_json(scene.get("fog_zones")) or []

    # Convert circle to a bounding square for storage
    # (we keep rectangles in fog_zones, but the radius comes from the token)
    r = payload.radius_ft
    square = {
        "x": payload.center_x - r,
        "y": payload.center_y - r,
        "width": r * 2,
        "height": r * 2,
    }

    # Don't add duplicate/identical zones
    already = any(
        abs(z.get("x", 0) - square["x"]) < 1 and
        abs(z.get("y", 0) - square["y"]) < 1
        for z in current_zones
    )
    if not already:
        current_zones.append(square)

    await get_pool().fetchrow(
        """
        update campaign_scenes
        set fog_zones = $2::jsonb, updated_at = now()
        where id = $1
        returning *
        """,
        existing["scene_id"],
        jsonb(current_zones),
    )

    await cache_invalidate(f"fog:{existing['scene_id']}*")
    await broadcast_vtt_change(
        existing["campaign_id"], "fog", existing["scene_id"]
    )
    return {"fog_zones": current_zones}
```

#### Task C-4: Update token create/update pour vision_radius

**Objective:** Persister `vision_radius` dans les endpoints create/update.

**Files:**
- Modify: `backend/app/routers/vtt.py`

Dans `create_token` (ligne ~257) :

```python
# Ajouter vision_radius dans l'INSERT
insert into scene_tokens (
    scene_id, character_id, name, x, y, size, color, is_hidden, metadata, vision_radius
)
values ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10)
```

Dans `update_token` (ligne ~315) :

```python
# Ajouter vision_radius dans l'UPDATE
update scene_tokens
set
    ...
    vision_radius = $11,
    ...
```

#### Task C-5: Tests backend

```bash
cd backend && python -m pytest tests/ -k "token" --tb=short -q
```

### Frontend Tasks

#### Task C-6: Appel reveal après déplacement de token

**Objective:** Après un `moveToken`, si le token a `character_id` et `vision_radius > 0`, appeler `/api/tokens/{id}/reveal`.

**Files:**
- Modify: `frontend/src/components/CampaignMap.tsx` (ou le composant parent qui gère `onMoveToken`)

Dans `handleMoveToken` (ou l'endroit où `onMoveToken` est appelé) :

```tsx
async function handleMoveToken(token: SceneToken, dx: number, dy: number) {
  // ... existing move logic ...

  // ── Auto fog reveal ──
  if (token.character_id && (token.vision_radius ?? 0) > 0) {
    await fetch(`/api/tokens/${token.id}/reveal`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        center_x: token.x + (token.size * gridSize) / 2,
        center_y: token.y + (token.size * gridSize) / 2,
        radius_ft: token.vision_radius,
      }),
    }).catch(() => {});
  }
}
```

**Attention:** Le `moveToken` est déjà appelé via `onMoveToken` dans `App.tsx`. L'appel reveal doit être fait APRÈS le move réussi.

#### Task C-7: Rafraîchir les fog zones après reveal

Le WebSocket broadcast `vtt_change` avec `resource: "fog"` déclenchera le rechargement des fog zones (mis en place dans la tâche A-3), donc les tokens apparaîtront automatiquement.

#### Task C-8: Vérification

```bash
cd backend && python -m pytest --tb=short -q  # doit rester 80/80
cd frontend && npx tsc --noEmit && npm run build
```

---

## D — Révélation circulaire (mode cercle dans FogLayer)

### Objectif
Le MJ peut choisir entre rectangle et cercle pour révéler le fog. Le cercle est plus naturel pour les torches, sorts de lumière, lanternes.

### Principe
Ajouter un toggle `circleMode` dans le FogLayer. En mode cercle, le `mouseDown→mouseMove→mouseUp` dessine un cercle (centre + rayon) au lieu d'un rectangle.

### Tâches

#### Task D-1: Ajouter le toggle circleMode au FogLayer

**Objective:** Bouton toggle entre rectangle et cercle dans la toolbar du FogLayer.

**Files:**
- Modify: `frontend/src/components/FogLayer.tsx`

**Step 1: État**

```tsx
const [circleMode, setCircleMode] = useState(false);
```

**Step 2: Dessin du cercle pendant le drag**

Dans `handleMouseMove` :

```tsx
if (circleMode) {
  const cx = start.x;
  const cy = start.y;
  const rx = Math.abs(x - start.x);
  const ry = Math.abs(y - start.y);
  // For true circle, use the larger radius
  const radius = Math.max(rx, ry);
  setCurrentRect({
    x: cx - radius,
    y: cy - radius,
    width: radius * 2,
    height: radius * 2,
  });
} else {
  // existing rectangle logic
}
```

**Step 3: Dessin du cercle visuel dans draw()**

Dans la fonction `draw()`, quand `currentRect` est affiché :

```tsx
if (currentRect && isGM) {
  if (circleMode) {
    // Draw circle preview
    ctx.beginPath();
    ctx.arc(
      currentRect.x + currentRect.width / 2,
      currentRect.y + currentRect.height / 2,
      currentRect.width / 2,
      0, Math.PI * 2,
    );
    ctx.strokeStyle = "#D6A84F";
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = "rgba(214, 168, 79, 0.15)";
    ctx.fill();
  } else {
    // existing rect preview
  }
}
```

**Step 4: Appliquer le cercle comme zone de fog**

Le stockage reste rectangulaire (bounding box du cercle). Si on veut un vrai cercle dans le rendu du fog, il faut utiliser `ctx.arc()` avec `destination-out`. Mais pour la v1, la bounding box carrée est acceptable.

**Step 5: Bouton toggle**

Dans la toolbar :

```tsx
<button
  className={`ghost-button compact ${circleMode ? "active" : ""}`}
  onClick={() => setCircleMode(!circleMode)}
  type="button"
  title={circleMode ? "Mode rectangle" : "Mode cercle"}
>
  {circleMode ? "◯" : "▭"}
</button>
```

#### Task D-2: Rendu circulaire des zones dans draw()

**Objective:** Si une zone a été créée en mode cercle, la rendre comme un cercle.

Pour cela, il faut stocker le type de zone. Étendre `FogZone` :

```tsx
type FogZone = {
  x: number;
  y: number;
  width: number;
  height: number;
  shape?: "rect" | "circle";  // default "rect" for backward compat
};
```

Et dans `draw()`, pour le `destination-out` :

```tsx
for (const zone of zones) {
  if (zone.shape === "circle") {
    ctx.beginPath();
    ctx.arc(
      zone.x + zone.width / 2,
      zone.y + zone.height / 2,
      zone.width / 2,
      0, Math.PI * 2,
    );
    ctx.fillStyle = "white";
    ctx.fill();
  } else {
    ctx.fillStyle = "white";
    ctx.fillRect(zone.x, zone.y, zone.width, zone.height);
  }
}
```

#### Task D-3: Synchroniser le shape avec le backend

Modifier `FogZone` backend :

```python
class FogZone(BaseModel):
    x: float
    y: float
    width: float
    height: float
    shape: str = "rect"  # "rect" or "circle"
```

Et dans la fonction `reveal_around_token` (tâche C-3), le nouveau carré est `"rect"` (ou `"circle"` mais c'est déjà un carré).

---

## E — Aperçu fog sur la minimap

### Objectif
La minimap canvas (160×120) affiche les zones de fog révélées en surbrillance.

### Tâches

#### Task E-1: Ajouter fogZones à la minimap

**Objective:** Dessiner les rectangles de fog révélés sur le canvas de la minimap.

**Files:**
- Modify: `frontend/src/components/CampaignMap.tsx`

**Step 1: Effet de dessin sur la minimap**

Ajouter un `useEffect` qui redessine la minimap quand `fogZones`, `selectedScene`, `zoom`, ou `scrollRef` change :

```tsx
useEffect(() => {
  const canvas = minimapRef.current;
  const scene = selectedScene;
  if (!canvas || !scene) return;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const mw = 160;
  const mh = 120;
  const sx = scene.width;
  const sy = scene.height;

  ctx.clearRect(0, 0, mw, mh);

  // ── Fog revealed zones ──
  if (fogZones.length > 0 && showFog !== false) {
    ctx.fillStyle = "rgba(214, 168, 79, 0.5)";
    for (const zone of fogZones) {
      ctx.fillRect(
        (zone.x / sx) * mw,
        (zone.y / sy) * mh,
        (zone.width / sx) * mw,
        (zone.height / sy) * mh,
      );
    }
  }

  // ── Viewport rectangle ──
  const el = scrollRef.current;
  if (el) {
    const vx = el.scrollLeft / zoom;
    const vy = el.scrollTop / zoom;
    const vw = el.clientWidth / zoom;
    const vh = el.clientHeight / zoom;
    ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
    ctx.lineWidth = 1;
    ctx.strokeRect(
      (vx / sx) * mw,
      (vy / sy) * mh,
      (vw / sx) * mw,
      (vh / sy) * mh,
    );
  }
}, [fogZones, selectedScene, zoom, scrollRef]);
```

**Step 2: Props à passer**

S'assurer que `fogZones` et `showFog` sont accessibles dans le scope. `fogZones` est déjà ajouté via la tâche A-1. `showFog` est interne à `FogLayer` — il faut soit le remonter, soit utiliser une ref.

**Option : remonter `showFog`** → ajouter un callback `onFogToggle` ou passer `showFog` en prop. Ou plus simple : lire le fog state depuis le FogLayer via une ref.

**Approche recommandée :** Passer `showFog` et `setShowFog` comme props au FogLayer (lifting state up). C'est un petit refactor :

```tsx
// Dans CampaignMap :
const [showFog, setShowFog] = useState(true);

// Passer à FogLayer :
<FogLayer
  ...
  showFog={showFog}
  onToggleFog={setShowFog}
/>

// Dans FogLayer, remplacer l'état local par les props :
// const [showFog, setShowFog] = useState(true);  ← supprimer
// Utiliser props.showFog et props.onToggleFog
```

---

## Ordre d'exécution recommandé

```
A → B → D → C → E
│    │    │    │    │
│    │    │    │    └─ Dépend du showFog remonté (D)
│    │    │    └─ Dépend des fogZones chargés (A) + backend (C-1→5)
│    │    └─ Dépend du FogLayer (A modifie le contexte)
│    └─ Dépend du calcul isFogHidden (A)
└─ Fondation : charge les fogZones + filtre les tokens
```

**Branches :**
- Lot 1 : A + B (fix critique + indicateur MJ) → branche `agent/feat/fog-token-visibility`
- Lot 2 : D (révélation circulaire) → branche `agent/feat/fog-circle-reveal`
- Lot 3 : C (auto-révélation tokens) → branche `agent/feat/fog-auto-reveal`
- Lot 4 : E (minimap fog) → branche `agent/feat/fog-minimap`

---

## Vérification finale

```bash
# Backend
cd backend && python -m pytest --tb=short -q

# Frontend
cd frontend && npx tsc --noEmit && npm run build

# Docker
docker compose config --quiet
```
