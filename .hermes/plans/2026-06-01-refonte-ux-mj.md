# Plan de refonte UX — Interface MJ ergonomique

> **Pour Hermes :** Utiliser `subagent-driven-development` pour implémenter ce plan PR par PR.

**Objectif :** Refondre l'interface MJ du VTT DnD selon la roadmap à 8 PR du document `docs/interface-ergonomie-mj.md`, en transformant le cockpit MJ progressivement sans régresser.

**Architecture actuelle :**
- ✅ PR 1 (Document) : `docs/interface-ergonomie-mj.md` existe
- ✅ PR 2 (PanelRenderer + registre) : déjà implémenté — `panelRenderer.tsx` (671 lignes, switch → 27 panneaux), 5 contextes domaine (`WorkspaceState`, `WorkspaceActions`, `VttContext`, `PanelContext`, `SessionContext`), `GmDockedPanels.tsx` lit des contextes sans prop-drilling, `GmWorkspace.tsx` (312 lignes) est l'orchestrateur
- ✅ Mode filtering : `SESSION_LIVE_PANEL_SETS` défini pour 5 modes, `liveModePanelIds` propagé via `PanelContext`, `GmDockedPanels` filtre par mode
- ⚠️ PR 3 (Presets) : les modes fonctionnent mais le preset n'est pas persisté en localStorage
- ❌ PR 4-8 : non implémentés

**Prérequis :** Toutes les branches partent de `main` à jour. `tsc --noEmit` + `pytest` + `npm run build` après chaque sprint.

---

## PR 0 — Stabilité et nettoyage pré-refactoring

> **Branche :** `agent/fix/pre-ux-stability`
> **Effort estimé :** 3-4h

Avant de commencer la refonte UX, corriger les problèmes existants sur `main` pour partir d'une base saine.

### Sprint 1 — CI verte
- Diagnostiquer et corriger les erreurs Ruff (64) et Biome (198) sur `main`
- Corriger `ci.yml` : ports Docker (déjà faits sur `agent/fix/post-merge-review-p1`, merger d'abord)
- Vérifier que le smoke test E2E passe avec le seed script
- **Fichiers :** `.github/workflows/ci.yml`, `scripts/seed-test-data.sh`, fix Ruff/Biome

### Sprint 2 — Nettoyage code mort et imports
- Supprimer imports inutilisés résiduels (`tsc --noEmit` ne détecte pas tout)
- Nettoyer CSS mort avec `scripts/clean-dead-css.py`
- Vérifier pas de classes orphelines (pattern `gm-panel-*`)
- **Fichiers :** divers `*.tsx`, `styles/*.css`

### Sprint 3 — Audit et documentation
- Mettre à jour `docs/frontend-ui.md` avec l'état actuel post-PanelRenderer
- Documenter l'architecture à 5 contextes dans `docs/`
- Vérifier que tous les panneaux du registre sont effectivement rendus (pas de lazy-load orphelin)
- **Fichiers :** `docs/frontend-ui.md`, `docs/architecture-contexts.md`

**🎯 Livrable PR 0 :** CI verte, 0 erreur `tsc`, build OK, docs à jour.

---

## PR 1 — Presets de session persistants

> **Branche :** `agent/ui/mode-presets-persistence`
> **Base :** `main` (après merge PR 0)
> **Effort estimé :** 2-3h

### Contexte
Les modes de session (Exploration, Combat, Roleplay, Quick-Prep, Minimal) fonctionnent via `SESSION_LIVE_PANEL_SETS` et filtrent les panneaux dockés. Mais le preset actif n'est pas sauvegardé — au rechargement, le mode revient à sa valeur par défaut.

### Sprint 1 — Persistance du mode actif
- Sauvegarder `activeSessionLiveMode` dans localStorage (clé `dnd_active_mode_v1`)
- Restaurer au chargement dans `PanelContext` / `GmWorkspaceProvider`
- Gérer le cas où le mode sauvegardé n'existe plus (fallback `exploration`)
- **Fichiers :** `frontend/src/contexts/PanelContext.tsx`, `frontend/src/contexts/GmWorkspaceProvider.tsx`

### Sprint 2 — Indicateur visuel du preset actif
- Ajouter un badge ou highlight permanent sur le bouton de mode actif
- Ajouter un tooltip décrivant le mode (utiliser le `description` de `SESSION_LIVE_MODES`)
- **Fichiers :** `frontend/src/app/GmWorkspace.tsx`, `frontend/src/styles/shell-gm.css`

### Sprint 3 — Vérification
- `tsc --noEmit`, `npm run build`, `pytest`
- Test manuel : changer de mode → recharger → le mode est restauré
- Commit + push

**🎯 Livrable PR 1 :** Le mode de session survit au rechargement. Indicateur visuel clair.

---

## PR 2 — Presets de layout (sauvegarde/restauration positions panneaux)

> **Branche :** `agent/ui/layout-presets`
> **Base :** `main` (après merge PR 1)
> **Effort estimé :** 3-4h

### Contexte
Les panneaux flottants gardent déjà leur position (via le composant `GmFloatingPanels` et `fp.open`). Mais il n'y a pas de persistance versionnée, pas de preset nommé, pas de reset layout.

### Sprint 1 — Versionner le storage des panneaux flottants
- Ajouter `LAYOUT_VERSION = "v1"` dans le composant de floating panels
- Clé localStorage : `dnd_fp_v1_{campaignId}`
- Ignorer silencieusement les anciennes entrées non versionnées
- **Fichiers :** `frontend/src/panels/GmFloatingPanels.tsx` (ou hook dédié `useFloatingPanels.ts`)

### Sprint 2 — Bouton "Reset layout"
- Ajouter un bouton dans la topbar ou le menu : "Réinitialiser la disposition"
- Remet tous les panneaux flottants à leur position par défaut, ferme tout
- Confirmation légère ("Disposition réinitialisée")
- **Fichiers :** `frontend/src/app/GmWorkspace.tsx`, `frontend/src/styles/shell-gm.css`

### Sprint 3 — Snaps edges (optionnel, reportable)
- Ajouter un comportement de snap aux bords de la fenêtre pour les panneaux flottants
- Activé/désactivé via un toggle dans les paramètres
- **Fichiers :** hook dédié `useSnapEdges.ts`, `GmFloatingPanels.tsx`

**🎯 Livrable PR 2 :** Layout versionné, reset fonctionnel, base pour presets nommés ultérieure.

---

## PR 3 — Libertés MJ / Overrides explicites

> **Branche :** `agent/ui/gm-overrides`
> **Base :** `main` (après merge PR 2)
> **Effort estimé :** 5-6h

### Contexte
Le document liste 10 capacités MJ à rendre explicites (override mouvement token, reprendre contrôle, forcer visibilité, bypass fog, reveal joueur, reset fog, forcer scène active, corriger combat, éditer tout document, simuler vue joueur). Actuellement ces actions existent peut-être en backend mais sont peu accessibles ou dispersées.

### Sprint 1 — Mode "Voir comme joueur"
- Ajouter un toggle dans la topbar : "👁️ Vue joueur"
- Quand actif : la carte affiche ce que le joueur verrait (fog joueur, tokens filtrés, pas de contrôles MJ)
- Utiliser le hook `useFogOfWar` existant avec `isGM=false` en override local
- **Fichiers :** `frontend/src/app/GmWorkspace.tsx`, `frontend/src/hooks/useFogOfWar.ts`, `frontend/src/components/CampaignMap.tsx`

### Sprint 2 — Actions contextuelles token (clic droit)
- Ajouter un menu contextuel sur les tokens (clic droit) avec :
  - "Prendre le contrôle" (override ownership temporaire)
  - "Révéler aux joueurs" / "Cacher aux joueurs" (toggle `is_hidden`)
  - "Centrer la vue" (recenter map)
- Réutiliser `handleToggleTokenHidden` existant
- **Fichiers :** `frontend/src/components/CampaignMap.tsx`, `frontend/src/styles/map.css`

### Sprint 3 — Panneau "Paramètres MJ"
- Créer `components/GmSettingsPanel.tsx`
- Afficher les paramètres du document (allow_player_token_move, show_player_hp, fog_enabled, etc.)
- Persister dans `campaigns.gm_settings jsonb` côté backend
- Ajouter route `PATCH /api/campaigns/{id}/settings`
- **Fichiers backend :** `routers/campaigns.py` (ajout route), `schemas.py` (GmSettings)
- **Fichiers frontend :** `GmSettingsPanel.tsx`, registre dans `panelRenderer.tsx`, ajouter dans `gmPanels.ts`

### Sprint 4 — Bouton "Forcer scène active"
- Dans le panneau Scenes, ajouter un bouton "Forcer scène active (joueurs)"
- Appelle `PATCH /api/scenes/{id}/activate` (à créer si inexistant)
- **Fichiers :** `ScenePanel.tsx`, `routers/vtt.py`

**🎯 Livrable PR 3 :** Le MJ peut voir comme un joueur, a des actions contextuelles sur les tokens, et peut configurer les permissions de campagne.

---

## PR 4 — Panneaux flottants v2

> **Branche :** `agent/ui/floating-panels-v2`
> **Base :** `main` (après merge PR 3)
> **Effort estimé :** 3-4h

### Sprint 1 — Pin / Lock / Maximize
- Ajouter des boutons dans la barre de titre des panneaux flottants :
  - 📌 Pin (reste au premier plan)
  - 🔒 Lock (empêche le déplacement/redimensionnement)
  - 🖥️ Maximize (plein écran temporaire)
- **Fichiers :** `frontend/src/panels/GmFloatingPanels.tsx`, `frontend/src/styles/widgets.css`

### Sprint 2 — Dock compact
- Le `PanelDock` actuel est basique. L'enrichir :
  - Afficher l'icône emoji du panneau (via `gmPanels.ts`)
  - Badge de notification (ex: nouveau message chat)
  - Redimensionner horizontalement
- **Fichiers :** `frontend/src/components/PanelDock.tsx`, `frontend/src/styles/widgets.css`

### Sprint 3 — Sauvegarde preset nommé
- Permettre de sauvegarder la disposition courante sous un nom ("Mon setup combat")
- Stocker dans localStorage : `dnd_presets_v1` → `{ name: string, panels: [...], mode: string }`
- Selecteur de preset dans la topbar (dropdown à côté des modes)
- **Fichiers :** `frontend/src/app/GmWorkspace.tsx`, nouveau `useLayoutPresets.ts`

**🎯 Livrable PR 4 :** Panneaux flottants avec pin/lock/maximize, dock enrichi, presets nommés.

---

## PR 5 — Focus map + Mini-map

> **Branche :** `agent/ui/focus-map-minimap`
> **Base :** `main` (après merge PR 4)
> **Effort estimé :** 4-5h

### Sprint 1 — Stabiliser le focus map
- Le bouton "Focus map" existe déjà (`setIsFocusMap`). Vérifier :
  - Les panneaux sont bien masqués (pas juste `display:none`)
  - La carte occupe 100% de la zone
  - Les raccourcis clavier fonctionnent en mode focus (Escape pour sortir)
  - Le panneau flottant "carte détachée" fonctionne en parallèle
- **Fichiers :** `frontend/src/app/GmWorkspace.tsx`, `frontend/src/styles/shell-gm.css`

### Sprint 2 — Mini-map interactive
- Créer `components/MiniMap.tsx`
- Afficher une version réduite de la carte en bas à droite (ou dans la toolbar)
- Rectangle indiquant la zone visible dans la vue principale
- Cliquer sur la mini-map pour se déplacer (recenter)
- Toggle pour afficher/masquer (bouton dans la toolbar)
- **Fichiers :** `MiniMap.tsx`, `CampaignMap.tsx` (intégration), `map.css`

### Sprint 3 — Toolbar compacte en mode focus
- En mode focus map, réduire la topbar à une barre d'outils horizontale compacte
- Garder : mode session, scène active, bouton quitter focus, mini-map toggle
- Masquer : sidebar gauche, panneaux droits
- **Fichiers :** `GmWorkspace.tsx`, `shell-gm.css`

**🎯 Livrable PR 5 :** Focus map fluide, mini-map fonctionnelle, toolbar adaptative.

---

## PR 6 — Interface joueur simplifiée

> **Branche :** `agent/ui/player-ux`
> **Base :** `main` (après merge PR 5)
> **Effort estimé :** 3-4h

### Sprint 1 — Onglets joueur plus compacts
- Revoir `PlayerView.tsx` : réduire la hauteur des onglets, utiliser des icônes + texte court
- Prioriser : Carte, Personnage, Dés en premier
- **Fichiers :** `frontend/src/components/PlayerView.tsx`, `player.css`

### Sprint 2 — Permissions visibles
- Afficher un indicateur quand une action est désactivée + raison ("Mouvement désactivé par le MJ")
- Utiliser les `gm_settings` de la campagne (chargés via API)
- Hook `usePlayerPermissions()` qui lit les settings
- **Fichiers :** `PlayerView.tsx`, nouveau `hooks/usePlayerPermissions.ts`

### Sprint 3 — Notifications améliorées
- Toast quand un document est révélé
- Toast quand le combat démarre
- Toast quand la scène change
- Réutiliser le système de toast existant dans `SessionContext`
- **Fichiers :** `PlayerView.tsx`, `contexts/SessionContext.tsx`

**🎯 Livrable PR 6 :** Interface joueur plus lisible, permissions explicites, notifications contextuelles.

---

## PR 7 — Polish design system

> **Branche :** `agent/ui/design-polish`
> **Base :** `main` (après merge PR 6)
> **Effort estimé :** 4-5h

### Sprint 1 — Tooltip component
- Créer `components/Tooltip.tsx`
- Remplacer les `title=""` natifs par le composant Tooltip
- Support clavier (focus visible), délai court (300ms), positionnement intelligent
- **Fichiers :** `Tooltip.tsx`, remplacement dans tous les panneaux (progressif)

### Sprint 2 — Toast component v2
- Améliorer le système de toast existant : animations, types (info/success/warning/error), durée configurable
- **Fichiers :** `contexts/SessionContext.tsx`, `styles/components.css`

### Sprint 3 — Audit contrastes et accessibilité
- Vérifier les ratios de contraste (WCAG AA)
- Ajouter `aria-label` sur les boutons icônes manquants
- Tester au clavier : tous les boutons sont focusables, ordre de tabulation logique
- `prefers-reduced-motion` pour les transitions
- **Fichiers :** divers CSS, `*.tsx`

### Sprint 4 — Palette CSS
- Appliquer les tokens CSS du document (`--ui-bg: #11161a`, `--ui-surface: #171f24`, etc.)
- Remplacer les couleurs hardcodées progressivement
- **Fichiers :** `styles/tokens.css`, `styles/shell-gm.css`, `styles/map.css`

**🎯 Livrable PR 7 :** Interface polie, tooltips, accessibilité de base, palette cohérente.

---

## Dépendances entre PR

```
PR 0 (stabilité)
  └─▶ PR 1 (presets persistants)
       └─▶ PR 2 (layout presets)
            └─▶ PR 3 (libertés MJ)
                 └─▶ PR 4 (floating v2)
                      └─▶ PR 5 (focus map)
                           └─▶ PR 6 (joueur simplifié)
                                └─▶ PR 7 (polish)
```

Les PR 5 et 6 sont indépendantes (focus map et joueur n'interfèrent pas), mais on garde l'ordre du document.

## Fichiers sensibles (modifier avec prudence)

| Fichier | Risque | PR concernées |
|---------|--------|---------------|
| `App.tsx` | Orchestre tout, 744 lignes | PR 0, indirectement |
| `GmWorkspace.tsx` | Layout principal MJ, 312 lignes | PR 1, 2, 3, 4, 5 |
| `CampaignMap.tsx` | Carte VTT, tokens, fog | PR 3, 5 |
| `PlayerView.tsx` | Vue joueur | PR 6 |
| `panelRenderer.tsx` | Registre panneaux, 671 lignes | PR 3 (ajout GmSettings) |
| `sessionLiveModes.ts` | Définition des modes | PR 1 (stable, lecture seule) |
| `gmPanels.ts` | Registre IDs panneaux | PR 3 (ajout settings) |

## Vérifications par PR

```bash
# Chaque PR doit passer :
cd frontend && npx tsc --noEmit && npm run build
cd backend && uv run pytest --tb=short -q
bash scripts/check-gm-panels-current.sh
bash scripts/check-gm-panel-css.sh
```

## Points de vigilance

- Ne pas fusionner refonte map et refonte panneaux dans une même PR
- Ne pas casser les permissions serveur pour simplifier l'UX
- Ne pas augmenter `GmWorkspace.tsx` au-delà de 400 lignes — extraire en hooks si nécessaire
- Chaque PR doit laisser l'interface utilisable (pas de régression entre deux PR)
- Toute nouvelle feature de layout est versionnée en localStorage
