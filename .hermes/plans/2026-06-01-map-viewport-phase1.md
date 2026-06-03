# Phase 1 — Stabiliser le viewport — Plan d'implémentation

> **Pour Hermes :** Implémenter tâche par tâche en TDD strict.

**Goal:** Extraire la logique viewport (zoom, pan, centrage, persistance) dans un hook `useMapViewport` et corriger les défauts : zoom bounds 25%-300%, pan sans saut ni sélection accidentelle, bouton milieu, recentrage, persistance localStorage.

**Architecture:** Un hook `useMapViewport` encapsule toute la logique viewport. `CampaignMap` devient consommateur du hook. Aucune nouvelle dépendance.

**Tech Stack:** React 18, TypeScript, localStorage, pointer events.

**Conventions:** `uv` / `npm ci` / `npx tsc --noEmit`, tests dans `frontend/src/__tests__/`, commits conventionnels.

---

## Audit du code existant

### ✅ Ce qui est déjà bon
- `updateZoom(delta, cursorX, cursorY)` — zoom vers le curseur déjà fonctionnel
- Gestion wheel avec `{ passive: false }` pour `preventDefault`
- `panMode` toggle via barre espace
- Raccourci `0` pour reset zoom + centrage
- `sceneTransitioning` pour transition fluide

### ❌ Ce qui manque ou est cassé
| Problème | Cause | Fix |
|----------|-------|-----|
| Zoom max à 300% au lieu de 300% | `MAX_ZOOM = 3.0` → OK, min=0.2 à changer en 0.25 | Changer `MIN_ZOOM` de 0.2 à 0.25 |
| Pan uniquement quand `panMode` ON + pas GM | `handlePanPointerDown` skip si `isGM && !panMode` | Middle-click toujours actif ; pan mode existant conservé |
| Pas de pan bouton milieu | Aucun handler `auxclick` | Ajouter handler `onAuxClick` |
| "Saut" au début du pan | `panOrigin` setté au `pointerDown`, scroll mis à jour avec delta relatif depuis l'origine → OK en fait | Vérifier que le code actuel ne saute pas |
| Pas de bouton recentrage | Pas de bouton dans la toolbar | Ajouter bouton avec icône `Crosshair` |
| Pas de persistance | Aucun localStorage pour viewport | Ajouter `localStorage` dans `useMapViewport` |
| Pas de centrage initial fiable | `useEffect([selectedSceneId])` réinitialise à chaque changement | Conserver + ajouter fallback au premier mount |

---

## Tâches

### Task 1: Créer le hook `useMapViewport`

**Fichiers:**
- Create: `frontend/src/hooks/useMapViewport.ts`
- Modify: aucun pour l'instant

**Step 1: Écrire les tests**

```ts
// frontend/src/__tests__/useMapViewport.test.ts
import { renderHook, act } from "@testing-library/react";
import { useMapViewport } from "../hooks/useMapViewport";

describe("useMapViewport", () => {
  beforeEach(() => localStorage.clear());

  it("starts with zoom=1 and default pan", () => {
    const { result } = renderHook(() => useMapViewport({ sceneWidth: 2800, sceneHeight: 2100, sceneId: "s1" }));
    expect(result.current.zoom).toBe(1);
    expect(result.current.viewportState.scrollLeft).toBe(0);
    expect(result.current.viewportState.scrollTop).toBe(0);
  });

  it("clamps zoom between 0.25 and 3.0", () => {
    const { result } = renderHook(() => useMapViewport({ sceneWidth: 2800, sceneHeight: 2100, sceneId: "s1" }));
    act(() => result.current.zoomIn(0.5, 0, 0, 800, 600)); // zoom toward cursor
    expect(result.current.zoom).toBeLessThanOrEqual(3);
    act(() => result.current.zoomOut(0.5, 0, 0, 800, 600));
    expect(result.current.zoom).toBeGreaterThanOrEqual(0.25);
  });

  it("persists and restores viewport from localStorage", () => {
    // First mount — save something
    const { result, unmount } = renderHook(() =>
      useMapViewport({ sceneWidth: 2800, sceneHeight: 2100, sceneId: "s1" })
    );
    act(() => {
      result.current.setViewportState({ scrollLeft: 500, scrollTop: 300, zoom: 1.5 });
    });
    unmount();

    // Second mount — should restore
    const { result: r2 } = renderHook(() =>
      useMapViewport({ sceneWidth: 2800, sceneHeight: 2100, sceneId: "s1" })
    );
    expect(r2.current.zoom).toBe(1.5);
    expect(r2.current.viewportState.scrollLeft).toBe(500);
    expect(r2.current.viewportState.scrollTop).toBe(300);
  });

  it("does not restore when sceneId changes", () => {
    const { result: r1, unmount } = renderHook(() =>
      useMapViewport({ sceneWidth: 2800, sceneHeight: 2100, sceneId: "s1" })
    );
    act(() => r1.current.setViewportState({ scrollLeft: 100, scrollTop: 200, zoom: 2 }));
    unmount();

    const { result: r2 } = renderHook(() =>
      useMapViewport({ sceneWidth: 2800, sceneHeight: 2100, sceneId: "s2" })
    );
    expect(r2.current.zoom).toBe(1); // different scene → fresh state
  });

  it("recenter calculates centered scroll position", () => {
    const { result } = renderHook(() =>
      useMapViewport({ sceneWidth: 2800, sceneHeight: 2100, sceneId: "s1" })
    );
    // Simulate a viewport size
    const pos = result.current.getCenteredPosition(800, 600);
    expect(pos.scrollLeft).toBe(1000); // (2800-800)/2
    expect(pos.scrollTop).toBe(750);   // (2100-600)/2
  });
});
```

**Step 2: Run → FAIL**

**Step 3: Implémenter le hook**

```ts
// frontend/src/hooks/useMapViewport.ts
import { useCallback, useEffect, useRef, useState } from "react";

const MIN_ZOOM = 0.25;
const MAX_ZOOM = 3.0;
const ZOOM_STEP = 0.1;

type ViewportState = {
  scrollLeft: number;
  scrollTop: number;
  zoom: number;
};

type UseMapViewportParams = {
  sceneWidth: number;
  sceneHeight: number;
  sceneId: string;
};

const STORAGE_KEY_PREFIX = "dnd_map_viewport_";

function loadViewport(sceneId: string): ViewportState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PREFIX + sceneId);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (
      typeof parsed.scrollLeft === "number" &&
      typeof parsed.scrollTop === "number" &&
      typeof parsed.zoom === "number"
    ) {
      return parsed;
    }
  } catch { /* ignore */ }
  return null;
}

function saveViewport(sceneId: string, state: ViewportState) {
  try {
    localStorage.setItem(STORAGE_KEY_PREFIX + sceneId, JSON.stringify(state));
  } catch { /* ignore */ }
}

export function useMapViewport({ sceneWidth, sceneHeight, sceneId }: UseMapViewportParams) {
  const [viewportState, setViewportStateRaw] = useState<ViewportState>(() => {
    const persisted = loadViewport(sceneId);
    return persisted ?? { scrollLeft: 0, scrollTop: 0, zoom: 1 };
  });
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const prevSceneId = useRef(sceneId);

  // Reset viewport when scene changes
  useEffect(() => {
    if (prevSceneId.current !== sceneId) {
      prevSceneId.current = sceneId;
      const persisted = loadViewport(sceneId);
      if (persisted) {
        setViewportStateRaw(persisted);
      } else {
        // Center on scene
        const el = scrollRef.current;
        const cw = el?.clientWidth ?? 800;
        const ch = el?.clientHeight ?? 600;
        setViewportStateRaw({
          scrollLeft: Math.max(0, (sceneWidth - cw) / 2),
          scrollTop: Math.max(0, (sceneHeight - ch) / 2),
          zoom: 1,
        });
      }
    }
  }, [sceneId, sceneWidth, sceneHeight]);

  const setViewportState = useCallback((next: Partial<ViewportState>) => {
    setViewportStateRaw((prev) => {
      const merged = { ...prev, ...next };
      saveViewport(sceneId, merged);
      return merged;
    });
  }, [sceneId]);

  const zoom = viewportState.zoom;
  const zoomPercent = Math.round(zoom * 100);

  const zoomAt = useCallback(
    (delta: number, cursorX: number, cursorY: number, viewportW: number, viewportH: number) => {
      setViewportStateRaw((prev) => {
        const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, prev.zoom + delta));
        if (newZoom === prev.zoom) return prev;
        const scale = newZoom / prev.zoom;
        const newScrollLeft = (prev.scrollLeft + cursorX) * scale - cursorX;
        const newScrollTop = (prev.scrollTop + cursorY) * scale - cursorY;
        const next = { ...prev, zoom: newZoom, scrollLeft: newScrollLeft, scrollTop: newScrollTop };
        saveViewport(sceneId, next);
        return next;
      });
    },
    [sceneId],
  );

  const zoomIn = useCallback(
    (cursorX: number, cursorY: number, viewportW: number, viewportH: number) =>
      zoomAt(ZOOM_STEP, cursorX, cursorY, viewportW, viewportH),
    [zoomAt],
  );

  const zoomOut = useCallback(
    (cursorX: number, cursorY: number, viewportW: number, viewportH: number) =>
      zoomAt(-ZOOM_STEP, cursorX, cursorY, viewportW, viewportH),
    [zoomAt],
  );

  const getCenteredPosition = useCallback(
    (viewportW: number, viewportH: number) => ({
      scrollLeft: Math.max(0, (sceneWidth - viewportW) / 2),
      scrollTop: Math.max(0, (sceneHeight - viewportH) / 2),
    }),
    [sceneWidth, sceneHeight],
  );

  const recenter = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const pos = getCenteredPosition(el.clientWidth, el.clientHeight);
    setViewportState({ scrollLeft: pos.scrollLeft, scrollTop: pos.scrollTop, zoom: 1 });
  }, [getCenteredPosition, setViewportState]);

  return {
    scrollRef,
    zoom,
    zoomPercent,
    viewportState,
    setViewportState,
    zoomIn,
    zoomOut,
    recenter,
    getCenteredPosition,
  };
}
```

**Step 4: Run tests → PASS**

**Step 5: Commit** `feat: add useMapViewport hook with persistence`

---

### Task 2: Intégrer `useMapViewport` dans `CampaignMap`

**Fichiers:**
- Modify: `frontend/src/components/CampaignMap.tsx`
- Modify: `frontend/src/components/MapToolbar.tsx` (nouveau composant toolbar)

**Objectif:**
- Remplacer le state local `zoom`, `panMode`, etc. par le hook
- Ajouter bouton recentrage (Crosshair)
- Ajouter middle-click pan
- Conserver la compatibilité des props

Étapes précises :

1. Importer `useMapViewport`
2. Remplacer `const [zoom, setZoom] = useState(1)` par le hook
3. Remplacer `updateZoom` par `zoomIn`/`zoomOut` du hook
4. Ajouter `onAuxClick` (bouton milieu) pour pan
5. Ajuster `handleWheel` pour utiliser `zoomIn`/`zoomOut`
6. Remplacer le centrage du `useEffect([selectedSceneId])` par le hook
7. Ajouter le bouton recentrage dans la toolbar
8. Supprimer les anciens états devenus inutiles

**Step 1: Vérifier que tsc passe avant modification**

**Step 2: Appliquer les patches**

**Step 3: Commit** `refactor: integrate useMapViewport in CampaignMap`

---

### Task 3: TSC + Build + Tests finaux

```bash
cd frontend && npx tsc --noEmit && npm run build
cd ../backend && uv run pytest --tb=short -q
```

**Step 4: Commit final + push + PR**

---

## Vérification

- [ ] `npx tsc --noEmit` → 0 erreur
- [ ] `npm run build` → succès
- [ ] `uv run pytest --tb=short -q` → 118/118
- [ ] Zoom borné 25%–300%
- [ ] Zoom vers le curseur conservé
- [ ] Pan middle-click fonctionnel
- [ ] Bouton recentrage présent
- [ ] localStorage persiste viewport par scène
