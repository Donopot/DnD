# Frontend UX Audit — DnD VTT

**Date:** 2026-06-02  
**Scope:** 49 files (37 TSX, 1 CSS, 11 TS), ~11630 lines of TSX, ~13405 lines of CSS  
**Method:** Exhaustive code review of all components, CSS, hooks, and config files

---

## Executive Summary

| Area | Rating | Key Issue |
|------|--------|-----------|
| CSS Structure | ⚠️ Needs work | Monolithic 13K-line file with duplicate section overrides |
| Component Composition | ✅ Good | Clean lazy loading, well-structured Suspense boundaries |
| Theme System | ❌ Broken | 1,615 hardcoded colors vs. 2 `var(--)` usages — theme toggle is inert |
| Responsive Design | ✅ Good | 12 breakpoints, mobile-aware layouts, solid stacking |
| Loading States | ⚠️ Needs work | Skeletons only for code-split Suspense; no data-fetch loading |
| Accessibility | ⚠️ Needs work | 59 aria attrs but 0 tabIndex, 2 roles, no keyboard nav |
| Animation Quality | ✅ Good | Transitions, keyframes for pings/toasts/skeletons/bell |
| Visual Polish | ✅ Good | Consistent palette, depth via shadows, good icon/typography |

**Overall grade: B (76/100)** — Solid foundation with critical theme system bug and moderate structural debt.

---

## 1. CSS Structure

### 1.1 Monolithic Single File
`frontend/src/styles.css` is **13,405 lines** in a single file. No CSS modules, no component-scoped styles, no Tailwind.

**⚠️ Problems:**
- Every component's styles live in one global namespace — collision risk is high
- No build-time dead-code elimination possible
- 28KB source grows linearly with every feature

### 1.2 Duplicate Section Overrides

The file has **two competing sets of the same styles:**

| Section | Lines | What it defines |
|---------|-------|-----------------|
| Lines 244–784 | Lobby `.app-shell`, `.sidebar`, `.workspace-grid`, `.panel`, `.topbar` | Older lobby-focused styles |
| Lines 1633–1960 | Same classes `.app-shell`, `.sidebar`, `.workspace-grid`, `.panel`, `.topbar` | "R4-6 global workspace polish" overrides |

Both sections are active simultaneously. The later section (1633+) wins on specificity via identical selectors, but the earlier section's properties (like `min-height`, `padding`, old colors) bleed through. This causes **inconsistent border-radius** (8px old vs 16px new) on `.panel`, and **unclear precedence** for any future style changes.

**Example duplication:**
```css
/* Line 345 — old */
.panel {
  min-height: 260px;
  padding: 22px;
  border: 1px solid #d7d0c0;
  border-radius: 8px;
  background: #fffdf7;
}

/* Line 1725 — override */
.panel {
  border: 1px solid rgba(37, 48, 40, 0.14);
  border-radius: 16px;
  background: rgba(255, 253, 247, 0.92);
  box-shadow: 0 12px 30px rgba(35, 48, 40, 0.07);
}
```

### 1.3 CSS Variable Usage: Virtually Non-Existent

The `:root` block defines 14 CSS custom properties and `[data-theme="light"]` overrides them. However, the entire 13K-line stylesheet uses `var(--...)` **only 2 times** (lines 15–16 in body defaults). The other **1,615 color values** are hardcoded.

### 1.4 Organization

**✅ Good:** Sections are labeled with comments (`/* R4-6 ... */`, `/* Phase 21 ... */`, `/* ====== Bestiary Panel ====== */`)  
**⚠️ Issue:** Many section headers are inconsistent (some with `===`, some with `---`, some just `/*`)

---

## 2. Component Composition

### 2.1 Architecture

**✅ Strong points:**
- **Code splitting** via `React.lazy()` for 15 heavy components (CombatTracker, DiceRoller, EncounterBuilder, BestiaryPanel, etc.)
- **Suspense with skeleton fallback** (`PanelFallback`) wraps all lazy panels
- **Floating panel system** (`useFloatingPanels` hook + `FloatingPanel` component) with localStorage persistence for positions/sizes
- **Toast notification system** (`useToast` hook) replaces old message dock
- **Theme hook** (`useTheme`) with localStorage persistence

### 2.2 Component Tree (simplified)

```
App
├── AuthPage (unauth)
├── InvitePage (invite token route)
├── PlayerLobby / GmLobby (no campaign)
├── PlayerView (player with campaign)
│   ├── CampaignMap (isGM=false)
│   │   ├── FogLayer
│   │   ├── WeatherLayer
│   │   └── MapTools
│   ├── EditCharacterSheet
│   ├── MarkdownRenderer
│   └── PlayerNotifications
└── GM Shell (gm with campaign)
    ├── gm-sidebar (campaigns, members, actions)
    ├── gm-map-area
    │   ├── CampaignViewTabs
    │   └── CampaignMap (isGM=true)
    └── gm-panels (Suspense)
        ├── CombatTracker / EncounterBuilder / DiceRoller
        ├── QuickActions / GmMessagePanel
        ├── SessionLogPanel / SessionStats
        ├── DungeonGenerator / HandoutPanel
        ├── BestiaryPanel / SpellbookPanel / ItemCompendium
        ├── HomebrewPanel / RulesReference
        └── CharacterSection + EditCharacterSheet
    └── FloatingPanel[] (detachable overlays)
```

### 2.3 Props Drilling

**⚠️ Issue:** `token`, `selectedCampaign?.id`, and `isBusy` are drilled through many layers. Some panels receive these as props when they could use context.

---

## 3. Theme System

### 3.1 Rating: ❌ Broken

**Root cause:** The CSS variables defined in `:root` and `[data-theme="light"]` are almost never consumed. 1,615 of 1,617 color values use hardcoded hex/rgba.

```css
:root {
  --bg-primary: #0f1923;     /* defined but never used */
  --text-primary: #e0dcc8;   /* defined but never used */
  --accent: #c5b358;           /* defined but never used */
  /* ... etc */
}
```

**Impact:** The theme toggle button in the GM topbar (`toggleTheme`) sets `data-theme="light"` on `<html>`, which makes the `[data-theme="light"]` override kick in, but since nothing reads the variables, the UI stays dark. The GM campaign shell (line 9787) hardcodes `background: #0f1923` directly.

### 3.2 Hardcoded Color Analysis

| Component area | Hardcoded to | Should use |
|---------------|--------------|------------|
| `.gm-campaign-shell` | `#0f1923` | `var(--bg-primary)` |
| `.gm-sidebar` | `rgba(15, 25, 20, 0.95)` | `var(--bg-secondary)` |
| `.gm-panels` | `rgba(15, 25, 20, 0.95)` | `var(--bg-secondary)` |
| `.floating-panel` | `#1a2a24` | `var(--bg-surface)` |
| `.player-campaign-shell` | `#0f1923` | `var(--bg-primary)` |
| `.gm-panel-section summary` | `#c0c0a0` | `var(--text-secondary)` |
| ALL toast/skeleton/modal | Hardcoded dark only | Needs light variants |

### 3.3 Auth/Lobby Page Split

The auth page and old lobby views (lines 58–784) use a **completely different color system** — warm parchment tones (`#fffdf7`, `#d7d0c0`, `#1f5f43`) with no dark variant at all. These pages are always light-mode regardless of theme.

---

## 4. Responsive Design

### 4.1 Rating: ✅ Good

**Breakpoints (12 total, in order):**
- 1500px+ (wide desktop enhancement)
- 1350px (workspace grid collapse)
- 1300px (wide enhancement)
- 1250px (session workspace collapse)
- 1180px (workspace grid 2-col)
- 1100px (campaign tabs collapse)
- 1024px (GM shell sidebar → topbar, player panels → bottom)
- 980px (combat layout, VTT layout collapse)
- 900px (workspace grid 1-col, sidebar → horizontal)
- 780px (auth/app shell stack, mini-grid 2-col)
- 760px (multiple compact collapses)
- 620px (tabs stack to 1-col)
- 600px (mobile: minimal padding, 50vh map)

### 4.2 Strengths
- Player workspace handles narrow screens well (map → top, panels → bottom)
- GM sidebar collapses to horizontal bar on tablet
- Grid layouts adapt properly (6→3→2→1 column)
- Token move buttons collapse to full-width on narrow
- Auth shell stacks vertically on mobile

### 4.3 Issues
- **Breakpoint inconsistency:** Some use 760px, others 780px, others 900px — should standardize on 3-4 canonical breakpoints (mobile, tablet, laptop, wide)
- **No `min-device-pixel-ratio`** or `prefers-reduced-motion` media queries
- **No print styles** — if a GM prints a handout or character sheet, it will look broken
- **No landscape/portrait orientation** media queries for tablets

---

## 5. Loading States

### 5.1 Rating: ⚠️ Needs Work

**✅ What exists:**
- `PanelFallback` with skeleton shimmer animation for lazy-loaded component Suspense boundaries
- `isBusy` flag disables buttons with `cursor: wait` + `opacity: 0.62`

**❌ What's missing:**
- **No initial data-fetch loading state** — between login and campaign data appearing, the UI shows nothing or stale state
- **No per-panel loading** — panels like Bestiary, Spellbook, DungeonGenerator that fetch data have no in-panel spinners
- **No optimistic UI** — dice rolls, character creation, handout creation all block the button with `isBusy` but show no progress indication
- **No error boundaries** at component level — a single panel crash takes down the whole app
- **No retry mechanism** — failed data fetches just show a toast

### 5.2 Skeleton Implementation
The skeleton shimmer (lines 12700–12727) is well-implemented but only has 2 variants (title + text), and only renders in the top-level `Suspense` fallback, not inside individual panels.

---

## 6. Accessibility

### 6.1 Rating: ⚠️ Needs Work

| Metric | Count | Assessment |
|--------|-------|------------|
| `aria-*` attributes | 59 | Decent — mostly `aria-hidden` on decorative icons, `aria-label` on some forms |
| `role` attributes | 2 | Nearly absent — no roles on map, tokens, panels, dialogs |
| `tabIndex` | 0 | No explicit keyboard tab ordering anywhere |
| `alt` on images | 1 (`alt=""` on map bg) | Map background uses `aria-hidden="true"` which is correct |
| Focus management | `:focus-visible` outline | Only on generic selectors, not modal focus trapping |
| Semantic HTML | Mixed | `<button>`, `<form>`, `<label>` used properly, but `<details>`/`<summary>` used for panels without ARIA enhancement |

### 6.2 Critical Gaps

1. **Floating panels** — no `role="dialog"`, no `aria-modal`, no focus trapping, no Escape key to close
2. **Campaign map** — no `role="application"`, token elements are generic `<div>`s with no accessible name beyond `title` attribute, no keyboard navigation for token selection
3. **Modals** (CharacterWizard, BestiaryDetail) — open with a `<div className="modal-overlay">` but no focus trapping, no `aria-modal`, pressing Escape doesn't close them
4. **Color contrast** — dark theme uses `#6a7a6e` muted text on `#0f1923`/`#1a2a24` background — these may fail WCAG AA
5. **No skip-to-content link** — keyboard users must tab through the entire sidebar
6. **`font-size` uses `rem`/`clamp()`** ✅ — but some labels are `0.6rem`/`0.65rem` which is below the 12px recommended minimum

### 6.3 What's Done Well
- Decorative SVG icons consistently use `aria-hidden="true"`
- Forms use proper `<label>` elements with `<input>` nesting
- Buttons use `<button>` elements (not divs with onClick)
- Focus-visible outline exists on interactive elements
- `prefers-reduced-motion` is NOT checked (❌)

---

## 7. Animation Quality

### 7.1 Rating: ✅ Good

| Animation | Type | Implementation |
|-----------|------|---------------|
| Button hover lift | `transform: translateY(-1px)` | Lines 1861–1875, applied globally |
| Tab hover lift | `translateY(-1px) + box-shadow` | Campaign view tabs (1765–1773) |
| Toast slide-in | `@keyframes toastIn` (translateX + opacity) | Line 12780 |
| Combat notification | `combatNotifyIn/Out` (fade + translateY) | Line 10332 |
| Ping dot pulse | `@keyframes ping-fade` (scale + opacity) | Line 11093 |
| Bell notification pulse | `@keyframes pulse-bell` (scale) | Line 10934 |
| Skeleton shimmer | `@keyframes skeleton-shimmer` (bg-position) | Line 12721 |
| Quick dice button press | `scale(0.95)` on `:active` | Line 10315 |
| Tool-card border transition | `border-color, box-shadow` | Line 1851–1858 |
| Panel detach button | `all 0.15s` transition | Line 10010 |

### 7.2 What's Missing

- **No page/view transition** — switching between campaign views (live/journal/preparation/library) is instant with no crossfade
- **No expand/collapse animation** — `<details>` panels open/close instantly (hard to animate with pure CSS, would need JS)
- **No token drag feedback animation** — tokens snap on `pointermove`, no smooth interpolation
- **No scene transition animation** — `sceneTransitioning` state exists but just sets a class with no CSS keyframe
- **No dice roll animation** — roll result appears instantly
- **Reduced motion not respected** — no `@media (prefers-reduced-motion: reduce)` anywhere

### 7.3 Performance
Transitions use `transform` and `opacity` (GPU-compositable) ✅, not `left`/`top`/`width`. The map zoom uses `scale()` transform which is correct.

---

## 8. Visual Polish

### 8.1 Rating: ✅ Good

**Strengths:**
- **Consistent color palette:** Dark charcoal (#0f1923), deep forest green (#1b4332), muted gold (#c5b358), parchment (#e0dcc8) — evokes medieval fantasy
- **Depth hierarchy:** Box-shadows graduate from subtle (6px/8px on cards) to prominent (32px on floating panels, 24px on dropdowns)
- **Backdrop-filter blur:** Sticky sidebars and topbars use `backdrop-filter: blur(10px)` for glassmorphism effect
- **Custom scrollbars:** Green-tinted `::-webkit-scrollbar` styling
- **Border-radius system:** 4px (inputs, chips) → 6px (items, buttons) → 8px (cards, panels) → 10px (tabs) → 12px (command cards) → 16px (polished panels) → 999px (pills, tokens)
- **Typography:** Inter system font stack, `letter-spacing: -0.04em` on headings, good use of `font-weight: 600–950`
- **Lucide icons:** Consistent icon library with proper sizing
- **Condition emojis on tokens:** Clever visual system for status effects
- **Minimap:** Canvas-rendered overview with viewport indicator

**Issues:**
- **Two visual identities competing:** Old parchment lobby style (warm cream `#fffdf7`, green `#1f5f43`) vs dark GM shell (charcoal `#0f1923`, gold `#c5b358`). Same app, two different design languages.
- **Character inspector modal** uses class `bestiary-detail-modal` — naming confusion
- **Some text at 0.6rem** is below readability threshold on mobile
- **No light mode at all** for the main game interface

---

## 9. Findings by Severity

### 🔴 CRITICAL

#### C1. Theme system is non-functional
**File:** `frontend/src/styles.css` (entire file)  
**Root cause:** CSS custom properties defined in `:root`/`[data-theme="light"]` are consumed only 2 times out of 1,617 color declarations. Theme toggle has no visible effect.  
**Fix:** Audit every color value and replace hardcoded hex/rgba with `var(--token)`. Prioritize GM shell section (lines 9787–10686) which covers 90% of the in-game UI.

#### C2. Auth/lobby page always light mode
**File:** `frontend/src/styles.css:58–784`  
**Root cause:** Auth and lobby pages use hardcoded `#fffdf7`, `#d7d0c0`, `#1f5f43` with no dark variant at all.  
**Fix:** Either a) extend theme variables to cover auth surfaces, or b) keep auth always light (acceptable for onboarding).

### 🟠 MAJOR

#### M1. Double CSS definitions cause unpredictable cascade
**File:** `frontend/src/styles.css:244–784` vs `1633–1960`  
**Root cause:** Two sections define the same classes (`.app-shell`, `.sidebar`, `.workspace-grid`, `.panel`, `.topbar`) with different values.  
**Fix:** Remove the old lobby section (244–784) and consolidate into the polished section (1633+).

#### M2. No keyboard navigation
**Files:** All components  
**Root cause:** Zero `tabIndex` attributes, no focus management for modals/panels, no Escape key handlers for overlays.  
**Fix:** Add focus trapping to FloatingPanel, GmCharacterInspector modal, and CharacterWizard modal. Add `role="dialog"` and `aria-modal`.

#### M3. No loading states for data fetches
**Files:** All panel components (BestiaryPanel, SpellbookPanel, DungeonGenerator, etc.)  
**Root cause:** Data-fetching panels show nothing or stale content while loading. Only code-split Suspense has skeletons.  
**Fix:** Add per-panel loading states (inline spinners or panel-specific skeletons).

#### M4. No error boundaries
**Files:** Entire component tree  
**Root cause:** A crash in any panel propagates to the root, taking down the whole app.  
**Fix:** Add `ErrorBoundary` wrapper around each `<details>` panel section in `App.tsx`.

### 🟡 MODERATE

#### D1. Breakpoint proliferation
**File:** `frontend/src/styles.css`  
**12 different breakpoints** (600, 620, 760, 780, 900, 980, 1024, 1100, 1180, 1250, 1300, 1350) — many only differ by 20-40px.  
**Fix:** Standardize on 4 breakpoints: mobile (640px), tablet (1024px), laptop (1280px), wide (1536px).

#### D2. Monolithic CSS file
**File:** `frontend/src/styles.css` (13,405 lines)  
**Fix:** Consider CSS Modules or component-scoped styles for new features. Can be done incrementally.

#### D3. Token drag has no smooth interpolation
**File:** `frontend/src/components/CampaignMap.tsx:226–240`  
The `handleBoardPointerMove` calls `onMoveToken` directly, which triggers a server PATCH per grid-snap step. No client-side optimistic position update.  
**Fix:** Apply optimistic position on pointer move, reconcile on server response.

#### D4. `<details>` panels have no open/close animation
All GM panel sections use native `<details>`/`<summary>` which can't be smoothly animated with pure CSS.  
**Fix:** Either accept it (acceptable) or replace with custom accordion using JS height animation.

#### D5. No `prefers-reduced-motion` support
No media query for `prefers-reduced-motion: reduce` exists anywhere.  
**Fix:** Wrap all animations/transitions in a `@media (prefers-reduced-motion: no-preference)` block.

### 🟢 COSMETIC

#### V1. Modal class name confusion
**File:** `frontend/src/App.tsx:1611`  
`className="bestiary-detail-modal"` used for CharacterWizard modal — should be `"modal-content"` or similar.

#### V2. Inconsistent section comment format
CSS uses mixed conventions (`/* ==== */`, `/* ---- */`, `/* R4-6 */`, `/* Phase 21 */`).  
**Fix:** Standardize on a single format.

#### V3. Visual design language split
Old lobby pages (parchment) and GM shell (dark medieval) look like two different apps.  
**Fix:** Once theme system is functional, unify the lobby under the same variable-driven system.

#### V4. Panel scrolling on session side zone
The `.session-side-zone` (line 1833) has `max-height: calc(100vh - 190px)` — the constant 190px will break if the topbar height changes.  
**Fix:** Use CSS `sticky` + flexbox overflow instead of hardcoded calc.

#### V5. Minimap uses hardcoded canvas size
**File:** `frontend/src/components/CampaignMap.tsx:553`  
`width={160} height={120}` — should scale with viewport or be configurable.

---

## 10. Improvement Plan (Prioritized)

| Phase | Task | Priority | Est. Hours | Dependencies |
|-------|------|----------|------------|--------------|
| 1 | **Fix theme system** — replace ~100 hardcoded colors with CSS variables in GM shell, player shell, floating panels, modals | 🔴 Critical | 8 | None |
| 2 | **Consolidate duplicate CSS** — remove lines 244–784, keep 1633+ | 🟠 Major | 2 | Phase 1 |
| 3 | **Add keyboard navigation** — focus trapping, Escape handlers, tab order for panels/map | 🟠 Major | 6 | None |
| 4 | **Add loading states** — per-panel skeletons/spinners for data fetches | 🟠 Major | 4 | None |
| 5 | **Add error boundaries** — wrap each `<details>` panel, add retry buttons | 🟠 Major | 3 | None |
| 6 | **Standardize breakpoints** — reduce from 12 to 4 canonical breakpoints | 🟡 Moderate | 3 | Phase 2 |
| 7 | **Add reduced-motion support** | 🟡 Moderate | 1 | None |
| 8 | **Optimistic token movement** | 🟡 Moderate | 2 | None |
| 9 | **Unify lobby+game visual design** | 🟢 Cosmetic | 4 | Phase 1 |
| 10 | **Clean up naming, comments, constants** | 🟢 Cosmetic | 2 | None |

**Total estimated effort:** ~35 hours

---

## 11. Quick Wins (Do First)

1. **Replace GM shell hardcoded background** (1 line):
   ```css
   .gm-campaign-shell { background: var(--bg-primary); }
   ```

2. **Add Escape to close modals** (5 lines in App.tsx):
   ```tsx
   useEffect(() => {
     const handler = (e: KeyboardEvent) => e.key === 'Escape' && setShowCharacterWizard(false);
     window.addEventListener('keydown', handler);
     return () => window.removeEventListener('keydown', handler);
   }, []);
   ```

3. **Add `role="dialog"` to FloatingPanel** (1 attribute)

4. **Delete duplicate CSS block lines 244–784** (~540 lines removed)

5. **Add `@media (prefers-reduced-motion: reduce)`** wrapper around all animations
