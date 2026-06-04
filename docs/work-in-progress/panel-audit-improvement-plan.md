# Audit Panneaux & Layout GM — Plan d'amélioration (révisé)

Date : 2026-06-04 — Révision : 2026-06-04 (feedback Donopot)

---

## 0. État des lieux — stabilité avant refonte

Avant d'attaquer les panneaux, stabiliser l'existant. Les correctifs du plan `open-prs-conflict-resolution-plan.md` ne sont pas tous appliqués dans `main` :

| Fix | main | Statut |
|---|---|---|
| `onMessage` dans `useHandouts` + `useSessionJournal` | ❌ `onError` pour succès | À merger |
| `callbacksRef` + `selectedSceneIdRef` dans `useRealtimeSession` | ❌ Reconnect à chaque render/scène | À merger |
| `selectedCampaign!.id` → `selectedCampaign?.id` | ❌ 4 assertions non-null | À merger |
| Code mort (`selectedCampaignId`, `selectedEncounterId`, `Scene`) | ❌ | À merger |

→ **PR #79bis — Stabilité** avant toute refonte panneaux.

---

## 1. Architecture actuelle

### Layout global (3 colonnes)

```
┌──────────┬───────────────────────┬────────────┐
│ Sidebar  │    Carte + Topbar     │  Panneaux  │
│ 240px    │        1fr            │  dockés    │
│          │                       │  340px     │
└──────────┴───────────────────────┴────────────┘
```

Voir le rapport initial pour le détail complet.

---

## 2. Problèmes (priorisés)

| # | Problème | Sévérité | Correction |
|---|---|---|---|
| P1 | 60 props spaghetti `GmWorkspace → GmDockedPanels → panneau` | 🔴 P0 | #80A + #80B |
| P2 | `GmDockedPanels.tsx` = 1115 lignes JSX répétitif | 🟠 P1 | #80B + #81 |
| P3 | Mode exploration = 26 panneaux (surcharge UX + perf) | 🟠 P1 | #82 |
| P4 | Duplication lazy imports docked/floating | 🟡 P2 | #81 |
| P5 | `SessionLogPanel` bypass le hook `loadSessionLog` | 🟡 P2 | #81 |
| P6 | `conditions` registre mais pas dans docked | 🟢 P3 | #81 |
| P7 | 9 panneaux eager dans le bundle principal | 🟢 P3 | #81 |
| P8 | Onglets `CampaignViewTabs` uniquement dans la topbar | 🟡 P2 | #82 |
| P9 | Pas de state URL (refresh = tout perdre) | 🟡 P2 | #83 |

---

## 3. Approche Context — pas de monolithe

❌ **Rejeté** : un seul `WorkspaceContext` avec tout l'état (remplace spaghetti de props par spaghetti de renders).

✅ **Adopté** : Contexts par domaine, migration progressive.

### 3.1 Les contexts

```
┌─────────────────────────────────────────────────────┐
│  WorkspaceStateContext                              │
│  (read-only : token, user, campaigns, characters,   │
│   handouts, rolls, scenes, tokens, encounters,      │
│   members, latestInvite, activeInvites)             │
│  → stable tant que la sélection ne change pas       │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│  WorkspaceActionsContext                            │
│  (callbacks stables via useCallback / refs :        │
│   onRoll, onQuickRoll, onLogNote, onCreateHandout,  │
│   onRevealHandout, onDeleteHandout, onMoveToken,    │
│   onCreateCharacter, onCreateInvite, onLogout…)     │
│  → dispatch stable, pas de re-render cascade        │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│  VttContext                                         │
│  (selectedSceneId, selectedTokenId,                 │
│   setSelectedSceneId, setSelectedTokenId,           │
│   loadSceneTokens, loadVttState, loadCombatState,   │
│   campaignMapProps, sceneBackgroundObjectUrl)       │
│  → tout ce qui touche la carte et les tokens        │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│  PanelContext                                       │
│  (gmView, setGmView, liveModePanelIds,              │
│   activeSessionLiveMode, setActiveSessionLiveMode,  │
│   isPanelsHidden, setIsPanelsHidden,                │
│   isFocusMap, setIsFocusMap,                        │
│   fp — floating panels state)                       │
│  → isolé du reste, ne re-render que sur changement  │
│     de tab ou de mode                               │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│  SessionContext                                     │
│  (presenceCount, realtimeStatus, wsRef,             │
│   isBusy, theme, toggleTheme,                       │
│   toasts, dismissToast, showShortcuts…)             │
│  → état « ambiance » de la session                  │
└─────────────────────────────────────────────────────┘
```

### 3.2 Hooks d'accès

```ts
// Un hook par contexte → un panneau ne subscribe qu'à ce dont il a besoin
function useWorkspaceState()    → WorkspaceStateContext
function useWorkspaceActions()  → WorkspaceActionsContext
function useVtt()               → VttContext (remplace le hook actuel ? à discuter)
function usePanel()             → PanelContext
function useSession()           → SessionContext
```

Un panneau qui a juste besoin des handouts :

```tsx
function HandoutPanel() {
  const { handouts, scenes, selectedCampaign } = useWorkspaceState();
  const { onCreateHandout, onRevealHandout, onDeleteHandout } = useWorkspaceActions();
  // → 2 hooks, pas 15 props
}
```

---

## 4. Plan révisé

### PR #79bis — Stabilité (prérequis)

**Objectif** : merger les correctifs du plan de conflit avant toute refonte.

| Tâche | Effort |
|---|---|
| Ajouter `onMessage` à `useHandouts` + `useSessionJournal` | 30min |
| Ajouter `callbacksRef` + `selectedSceneIdRef` dans `useRealtimeSession` | 1h |
| Remplacer `selectedCampaign!.id` par `selectedCampaign?.id` avec guard | 30min |
| Nettoyer code mort (`selectedCampaignId`, `selectedEncounterId`, import `Scene`) | 15min |
| Vérifier tsc + build + pytest (118/118) + pas de régression WS | 30min |

**Backend** : aucun.
**Livrable** : `main` stable, prêt pour la refonte.

---

### PR #80A — Contexts + pilotes (3–5 panneaux)

**Objectif** : introduire les 5 contexts dans `GmWorkspace`, migrer 3–5 panneaux pilotes pour valider l'approche.

| Tâche | Effort |
|---|---|
| Créer `WorkspaceStateContext` + Provider | 1h |
| Créer `WorkspaceActionsContext` + Provider (callbacks stabilisés via refs) | 1h |
| Créer `VttContext` + Provider | 45min |
| Créer `PanelContext` + Provider | 45min |
| Créer `SessionContext` + Provider | 30min |
| Wrapper `GmWorkspace` avec les 5 Providers | 30min |
| Migrer 3 panneaux pilotes vers `useWorkspaceState()` + `useWorkspaceActions()` | 2h |
| → `HandoutPanel`, `SessionLogPanel`, `TokenDetailPanel` | |
| Vérifier : les panneaux non migrés continuent de fonctionner via props | 1h |

**Backend** : aucun.
**Livrable** : contexts en place, 3 panneaux migrés, 0 régression.

**Panneaux pilotes recommandés** :
- `HandoutPanel` (296 lignes, utilise handouts + scenes + callbacks CRUD)
- `SessionLogPanel` (340 lignes, utilise rolls + logEntries + callbacks roll/note)
- `TokenDetailPanel` (421 lignes, utilise sceneTokens + selectedToken + callbacks move/hide)

---

### PR #80B — Migration complète + suppression props

**Objectif** : migrer tous les panneaux restants, supprimer le passage de props dans `GmDockedPanels` et `GmFloatingPanels`.

| Tâche | Effort |
|---|---|
| Migrer les 20 panneaux dockés restants | 4h |
| Migrer les panneaux flottants (TokenLibrary, Conditions, PartySummary) | 1h |
| Migrer les modales (CharacterWizard, GmCharacterInspector) | 1h |
| Supprimer les types `GmDockedPanelsProps` et `GmFloatingPanelsProps` | 30min |
| Simplifier `GmWorkspace` : ne passe plus les props aux enfants | 1h |
| Nettoyer les props non utilisées dans `GmWorkspaceProps` | 30min |
| Vérifier : tsc, build, chaque panneau render sans crash | 2h |

**Backend** : aucun.
**Livrable** : 0 prop passée de `GmWorkspace` à `GmDockedPanels`/`GmFloatingPanels`. Chaque panneau s'abonne aux contexts dont il a besoin.

---

### PR #81 — Registry + Nettoyage

**Objectif** : registry unique, suppression duplication, corrections.

| Tâche | Effort |
|---|---|
| Extraire `PANEL_REGISTRY` : `Map<GmPanelId, React.LazyComponent>` | 1h |
| `renderDockedPanel(id, liveModePanelIds, fpOpen)` → factory | 1h |
| Remplacer les 23 blocs `<details>` dans `GmDockedPanels` | 1h |
| Supprimer la duplication lazy entre `GmDockedPanels` et `GmFloatingPanels` | 30min |
| Ajouter `conditions` dans `GmDockedPanels` (via registry) | 15min |
| Lazy-loader les 9 panneaux eager | 1h |
| `SessionLogPanel` : utiliser `loadSessionLog` du hook au lieu de `fetch()` maison | 1h |
| Vérifier : split bundle (lazy = chunks séparés), pas d'erreur de chargement | 1h |

**Backend** : aucun.
**Livrable** : 0 duplication, 0 eager import, conditions visible, SessionLogPanel synchro avec le hook.

---

### PR #82 — Ergonomie & Layout

**Objectif** : réduire la charge cognitive, améliorer la navigation.

| Tâche | Effort |
|---|---|
| Réduire mode exploration : 26 → max 15 panneaux (garder essentiels) | 1h |
| → Supprimer de exploration : `conditions`, `npc-generator`, `active-encounter`, `ambiance`, `dungeon-generator`, `items`, `encounter-builder`, `spellbook`, `homebrew`, `rules`, `party-summary` | |
| Sidebar collapsible (toggle ☰ dans la topbar, pas juste resize) | 2h |
| Onglets `CampaignViewTabs` aussi dans la sidebar (sous le nom de campagne) | 1h |
| Panneaux redimensionnables en largeur (comme la sidebar, `resize: horizontal`) | 45min |
| CSS responsive tablette : stack vertical si largeur < 900px | 2h |
| Vérifier : UX sur desktop, tablette, mobile | 1h |

**Backend** : aucun.
**Livrable** : exploration léger, sidebar + panels redimensionnables, navigation onglets accessible des deux côtés.

---

### PR #83 — URL State & Persistence

**Objectif** : ne pas perdre l'état au refresh.

| Tâche | Effort |
|---|---|
| URL state : `?campaign=<id>&scene=<id>&tab=live&mode=exploration` | 2h |
| Restaurer depuis URL au chargement (validation IDs campagne/scène/tab) | 1h |
| `useEffect` → synchroniser URL quand l'état change | 1h |
| Sauvegarder largeurs sidebar/panels dans `localStorage` | 45min |
| Vérifier : refresh conserve campagne + scène + onglet + mode | 30min |

**Backend** : aucun.
**Livrable** : F5 = tout est là.

---

### PR #84A — Backend : Conditions + Initiative

**Objectif** : persistance des états et de l'ordre de tour.

| Tâche | Endpoint | Effort |
|---|---|---|
| Migration `conditions` table | — | 30min |
| `POST /api/campaigns/{id}/conditions` | Créer état | 1h |
| `GET /api/campaigns/{id}/conditions` | Lister états actifs | 45min |
| `DELETE /api/conditions/{id}` | Retirer état | 30min |
| `PATCH /api/campaigns/{id}/conditions/tick` | Avancer d'un round (décrémente durées) | 45min |
| `PUT /api/campaigns/{id}/initiative` | Sauvegarder ordre + round | 1h |
| `GET /api/campaigns/{id}/initiative` | Charger ordre | 45min |
| Frontend : `ConditionsPanel` → API, `InitiativePanel` → API | 2h |
| Tests backend + permissions MJ | 1h30 |

**Livrable** : conditions et initiative persistent entre sessions.

---

### PR #84B — Backend : Macros, Layout, Stats

**Objectif** : macros MJ, layout sauvegardé, stats enrichies.

| Tâche | Endpoint | Effort |
|---|---|---|
| Migration `campaign_layouts` table | — | 20min |
| Migration `quick_actions` table | — | 20min |
| `GET/PUT /api/campaigns/{id}/layout` | Layout par campagne | 1h30 |
| `GET/POST/DELETE /api/campaigns/{id}/quick-actions` | Macros MJ | 2h |
| `GET /api/campaigns/{id}/stats?since=` | Stats enrichies (heatmap, top rollers) | 3h |
| Frontend : `QuickActions` → API macros, layout → API layout | 2h |
| Tests backend + permissions | 1h30 |

**Livrable** : macros persistées, layout sauvegardé par campagne, stats détaillées.

---

## 5. Détail backend

Voir le rapport initial pour les schémas DB et exemples de payload.

---

## 6. Synthèse

| PR | Contenu | Effort | Backend | Dépend de |
|---|---|---|---|---|
| **#79bis** | Stabilité : onMessage, WS refs, `!` guards, code mort | 3h | ❌ | — |
| **#80A** | 5 contexts + 3 panneaux pilotes | 8h | ❌ | #79bis |
| **#80B** | Migration complète, suppression props | 10h | ❌ | #80A |
| **#81** | Registry, factory, lazy universel, fix conditions/log | 7h | ❌ | #80B |
| **#82** | Ergonomie, exploration réduit, responsive | 8h | ❌ | #81 |
| **#83** | URL state + persistence | 5h | ❌ | #82 |
| **#84A** | Backend conditions + initiative | 8h | ✅ | #83 |
| **#84B** | Backend macros + layout + stats | 10h | ✅ | #84A |
| **Total** | **8 PR** | **59h** | | |

### Ordre recommandé

```
#79bis → #80A → #80B → #81 → #82 → #83 → #84A → #84B
```

**Raison** : Chaque PR débloque la suivante. #79bis stabilise avant refonte. #80A/B sont le cœur de la migration (contexts). #81 nettoie. #82 améliore l'UX. #83 ajoute la persistence sans backend. #84A/B ferment avec le backend.
