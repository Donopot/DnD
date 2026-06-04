# Plan complet — résolution des conflits PR ouvertes

Date : 2026-06-04

## Objectif

Ce document analyse l’état des PR ouvertes du repo DnD et propose une méthode de résolution des conflits.

Le contexte actuel est une série de PR de refactor progressif de `App.tsx` : extraction des hooks, extraction du workspace GM, puis stabilisation du rendu.

## État observé des PR

| PR | Titre | Branche | État | Mergeable | Action |
|---|---|---|---|---|---|
| #72 | `Agent/refactor/app workspace` | `agent/refactor/app-workspace` | open | false | À traiter en dernier |
| #73 | `refactor(App-3): extract useAuthSession` | `agent/refactor/use-auth-session` | merged | false | Déjà mergée |
| #74 | `Agent/refactor/use campaign data` | `agent/refactor/use-campaign-data` | merged | false | Déjà mergée |
| #75 | `Agent/refactor/use vtt state` | `agent/refactor/use-vtt-state` | open | false | Rebase/merge depuis `main` |
| #76 | `Agent/refactor/use token actions` | `agent/refactor/use-token-actions` | open | false | Rebase/merge après #75 |
| #77 | `Agent/refactor/use realtime session` | `agent/refactor/use-realtime-session` | open | false | Rebase/merge après #76 |
| #78 | `Agent/refactor/use session journal` | `agent/refactor/use-session-journal` | open | false | Rebase/merge après #77 |
| #79 | `Agent/refactor/use handouts` | `agent/refactor/use-handouts` | open | false | Rebase/merge après #78 |

## Conclusion rapide

Les PR #73 et #74 sont déjà mergées.

Toutes les PR ouvertes restantes sont actuellement non mergeables :

```txt
#72
#75
#76
#77
#78
#79
```

La cause principale n’est pas forcément un conflit métier profond. C’est surtout que ces PR ont été créées en série depuis des bases proches, puis `main` a avancé avec #73 et #74. Chaque branche contient donc des versions anciennes de `App.tsx` et parfois des hooks déjà modifiés dans `main`.

## Stratégie recommandée

Ne pas corriger toutes les branches en parallèle.

Il faut traiter les PR dans l’ordre logique des dépendances :

```txt
1. #75 useVttState
2. #76 useTokenActions
3. #77 useRealtimeSession
4. #78 useSessionJournal
5. #79 useHandouts
6. #72 app workspace
```

Pourquoi :

- #73 `useAuthSession` est déjà dans `main` ;
- #74 `useCampaignData` est déjà dans `main` ;
- #75 doit maintenant se baser sur `main` avec ces deux hooks ;
- #76 dépend de l’état VTT extrait par #75 ;
- #77 dépend des états et callbacks extraits ;
- #78 et #79 sont plus haut niveau ;
- #72 déplace beaucoup de JSX et doit être le dernier refactor structurel.

## Règle d’or

Sur chaque PR :

```txt
Garder la version de main pour les hooks déjà mergés.
Garder la valeur ajoutée de la PR courante.
Ne jamais résoudre App.tsx avec --ours ou --theirs en bloc.
```

En pratique :

- `useAuthSession.ts` vient de `main` ;
- `useCampaignData.ts` vient de `main` ;
- la PR courante apporte son hook spécifique ;
- `App.tsx` doit être fusionné manuellement.

---

# Commande générique pour analyser une PR

Remplacer `<branch>` par la branche concernée.

```bash
cd /home/donopot/dnd-saas

git fetch origin
git switch <branch>
git pull --ff-only origin <branch>

git merge origin/main
```

Si conflit :

```bash
git status
grep -R "<<<<<<<\|=======\|>>>>>>>" -n frontend/src backend docs .github 2>/dev/null
```

Après résolution :

```bash
grep -R "<<<<<<<\|=======\|>>>>>>>" -n frontend/src backend docs .github 2>/dev/null

git add frontend backend docs .github
git commit -m "fix: resolve conflicts after main refactors"
```

Puis tests :

```bash
cd /home/donopot/dnd-saas/frontend
npm exec -- biome check --write .
npm exec -- biome check --max-diagnostics=50 .
npx tsc -b --pretty false
npm run build

cd /home/donopot/dnd-saas/backend
source /home/donopot/venv/bin/activate
python -m ruff check .
python -m pytest tests/ -v
```

Push :

```bash
cd /home/donopot/dnd-saas
git push origin <branch>
```

---

# PR #75 — useVttState

## Branche

```txt
agent/refactor/use-vtt-state
```

## État

```txt
open
mergeable: false
```

## Cause probable du conflit

`main` contient maintenant :

- `useAuthSession` ;
- `useCampaignData` ;
- fixes récents dans `App.tsx` ;
- documentation ajoutée.

La PR #75 tente d’extraire :

```txt
scenes
selectedSceneId
selectedScene
sceneTokens
encounters
selectedEncounterId
loadVttState
loadSceneTokens
loadCombatState
loadAssets
performTokenAction
handleToggleTokenHidden
```

Le conflit principal sera probablement dans `frontend/src/App.tsx`, autour de la zone des imports, des states, des callbacks VTT, et du routing GM.

## Résolution recommandée

### À garder depuis `main`

```tsx
const auth = useAuthSession();
const { token, user, login } = auth;
const authLogout = auth.logout;

const campaign = useCampaignData(token);
const { campaigns, selectedCampaignId, selectedCampaign, members, latestInvite, activeInvites } = campaign;

const inviteAcceptedTokenRef = useRef<string | null>(null);
```

### À garder depuis #75

```tsx
import { useVttState } from "./hooks/useVttState";

const vtt = useVttState(token);
const {
  scenes,
  selectedSceneId,
  selectedScene,
  sceneTokens,
  encounters,
  selectedEncounterId,
} = vtt;
```

### Remplacements attendus dans `App.tsx`

```txt
setScenes                → vtt internal
setSelectedSceneId       → vtt.setSelectedSceneId
setSceneTokens           → vtt.setSceneTokens
loadVttState             → vtt.loadVttState
loadSceneTokens          → vtt.loadSceneTokens
loadCombatState          → vtt.loadCombatState
loadAssets               → vtt.loadAssets
performTokenAction       → vtt.performTokenAction
handleToggleTokenHidden  → vtt.handleToggleTokenHidden ou wrapper App si besoin message/busy
```

## Points à surveiller

### Ne pas avaler les erreurs critiques

Si `useVttState` contient des `catch {}` silencieux, accepter temporairement si le comportement existant ne se dégrade pas. Mais noter en dette : ajouter `onError` au hook.

### Ne pas perdre la sélection scène

Après `loadVttState(campaignId)`, il faut conserver la scène sélectionnée si elle existe encore, sinon basculer sur la première scène.

## Checklist #75

- [ ] `useAuthSession.ts` = version `main`.
- [ ] `useCampaignData.ts` = version `main`.
- [ ] `useVttState.ts` présent.
- [ ] `App.tsx` ne déclare plus directement `scenes`, `selectedSceneId`, `sceneTokens`, `encounters` si ces états sont dans le hook.
- [ ] Carte GM affiche les scènes.
- [ ] Changement de scène OK.
- [ ] Tokens chargés OK.
- [ ] Combat state OK.
- [ ] `npm exec -- biome check --max-diagnostics=50 .` passe.
- [ ] `npx tsc -b --pretty false` passe.

---

# PR #76 — useTokenActions

## Branche

```txt
agent/refactor/use-token-actions
```

## État

```txt
open
mergeable: false
```

## Dépendance

À résoudre après #75.

Cette PR doit partir d’un `main` où `useVttState` est déjà mergé.

## Cause probable du conflit

Conflit dans `App.tsx` autour de :

- `handleMoveToken` ;
- `handleTokenAction` ;
- `handleTokenBatchAction` ;
- `fogRevealAbortRef` ;
- props passées à `CampaignMap`, `GmDockedPanels`, `GmFloatingPanels`.

## Résolution recommandée

### À garder depuis #76

```tsx
import { useTokenActions } from "./hooks/useTokenActions";

const tokenActions = useTokenActions({
  token,
  selectedScene,
  setSceneTokens: vtt.setSceneTokens,
  performTokenAction: vtt.performTokenAction,
  onError: setMessage,
  onMessage: setMessage,
  onStart: () => {
    setIsBusy(true);
    setMessage("");
  },
  onEnd: () => setIsBusy(false),
});
```

Si `onMessage` n’est pas encore dans le hook, il faut l’ajouter.

### Remplacements attendus

```txt
handleMoveToken        → tokenActions.moveToken
handleTokenAction      → tokenActions.wrapSingle
handleTokenBatchAction → tokenActions.wrapBatch
```

### Correction sémantique obligatoire

Ne pas utiliser `onError` pour les messages de succès.

Mauvais :

```tsx
onError(`${tokens.length} token(s) supprimé(s).`);
```

Bon :

```tsx
onMessage?.(`${tokens.length} token(s) supprimé(s).`);
```

## Checklist #76

- [ ] #75 déjà mergée.
- [ ] `useTokenActions.ts` présent.
- [ ] `fogRevealAbortRef` retiré de `App.tsx` si déplacé dans le hook.
- [ ] Actions token mono OK.
- [ ] Actions token batch OK.
- [ ] Move token OK.
- [ ] Auto-reveal fog après move OK.
- [ ] Aucun message de succès ne passe par `onError`.
- [ ] Biome/TS/build OK.

---

# PR #77 — useRealtimeSession

## Branche

```txt
agent/refactor/use-realtime-session
```

## État

```txt
open
mergeable: false
```

## Dépendance

À résoudre après #76.

## Cause probable du conflit

Conflit dans `App.tsx` autour de :

- `wsRef` ;
- `presenceCount` ;
- `realtimeStatus` ;
- `connect()` ;
- `useEffect` WebSocket ;
- handlers `session_changed` et `token_moved`.

## Fix déjà connu à conserver

Le hook `useRealtimeSession` doit éviter les reconnexions à chaque render.

Il doit contenir :

```txt
callbacksRef
selectedSceneIdRef
```

Et `connect` doit dépendre seulement de :

```txt
token
campaignId
```

Pas de dépendance directe à `selectedSceneId` ou aux callbacks recréés à chaque render.

## Résolution recommandée

### À garder depuis #77

```tsx
import { useRealtimeSession } from "./hooks/useRealtimeSession";

const ws = useRealtimeSession({
  token,
  campaignId: selectedCampaign?.id,
  selectedSceneId: selectedScene?.id,
  onError: setMessage,
  onSessionSceneToken: () => {
    if (selectedCampaign?.id) void vtt.loadVttState(selectedCampaign.id);
  },
  onSessionEncounter: () => {
    if (selectedCampaign?.id) void vtt.loadCombatState(selectedCampaign.id);
  },
  onSessionHandout: () => {
    if (selectedCampaign?.id) void loadHandouts(selectedCampaign.id);
  },
  onSessionLog: () => {
    if (selectedCampaign?.id) void loadSessionLog(selectedCampaign.id);
  },
  onTokenMoved: (tokenId, x, y) => {
    vtt.setSceneTokens((current) =>
      current.map((t) => (t.id === tokenId ? { ...t, x, y } : t)),
    );
  },
});

const { presenceCount, realtimeStatus } = ws;
```

### À éviter

Ne pas utiliser `selectedCampaign!.id` dans les callbacks.

Mauvais :

```tsx
void vtt.loadVttState(selectedCampaign!.id);
```

Bon :

```tsx
if (selectedCampaign?.id) void vtt.loadVttState(selectedCampaign.id);
```

### Remplacements attendus

```txt
wsRef            → ws.wsRef
presenceCount    → ws.presenceCount
realtimeStatus   → ws.realtimeStatus
connect()        → supprimé de App.tsx
MAX_RECONNECT    → dans useRealtimeSession.ts
reconnectTimer   → dans useRealtimeSession.ts
```

## Checklist #77

- [ ] #76 déjà mergée.
- [ ] `useRealtimeSession.ts` contient `callbacksRef`.
- [ ] `useRealtimeSession.ts` contient `selectedSceneIdRef`.
- [ ] `connect` ne dépend pas de `selectedSceneId`.
- [ ] `App.tsx` ne contient plus de `connect()` WebSocket.
- [ ] Changer de scène ne reconnecte pas le WebSocket.
- [ ] Changer de campagne reconnecte le WebSocket.
- [ ] Deux navigateurs reçoivent les mouvements de token.
- [ ] Biome/TS/build OK.

---

# PR #78 — useSessionJournal

## Branche

```txt
agent/refactor/use-session-journal
```

## État

```txt
open
mergeable: false
```

## Dépendance

À résoudre après #77.

## Cause probable du conflit

Conflit dans `App.tsx` autour de :

- `rolls` ;
- `logEntries` ;
- `loadSessionLog` ;
- `handleRoll` ;
- `handleQuickRoll` ;
- `handleLogNote` ;
- props `SessionLogPanel`, `GmDockedPanels`, `GmFloatingPanels`.

## Résolution recommandée

### À garder depuis #78

```tsx
import { useSessionJournal } from "./hooks/useSessionJournal";

const journal = useSessionJournal({
  token,
  onError: setMessage,
  onMessage: setMessage,
  onBusyStart: () => {
    setIsBusy(true);
    setMessage("");
  },
  onBusyEnd: () => setIsBusy(false),
});

const {
  rolls,
  logEntries,
  setLogEntries,
  loadSessionLog,
  doRoll,
  quickRoll,
  addLogNote,
  clearJournal,
} = journal;
```

Si `onMessage` n’existe pas encore, même remarque que pour #76 : éviter d’utiliser `onError` pour les succès.

### Remplacements attendus

```txt
setRolls            → journal internal ou journal.setRolls si exposé
setLogEntries       → journal.setLogEntries si nécessaire
loadSessionLog      → journal.loadSessionLog
handleRoll          → wrapper vers journal.doRoll
handleQuickRoll     → wrapper vers journal.quickRoll
handleLogNote       → wrapper vers journal.addLogNote
```

## Point à surveiller

Les composants attendent parfois des handlers de formulaire :

```tsx
handleRoll(e: FormEvent<HTMLFormElement>)
handleLogNote(e: FormEvent<HTMLFormElement>)
```

Si le hook expose des fonctions métier plus propres, garder dans `App.tsx` de petits wrappers d’adaptation. Ne pas remettre toute la logique dans `App.tsx`.

## Checklist #78

- [ ] #77 déjà mergée.
- [ ] `useSessionJournal.ts` présent.
- [ ] Lancer un jet depuis UI OK.
- [ ] Quick roll OK.
- [ ] Ajouter note OK.
- [ ] Session log refresh WebSocket OK.
- [ ] `limit=500` compatible avec backend ou frontend corrigé.
- [ ] Biome/TS/build OK.

---

# PR #79 — useHandouts

## Branche

```txt
agent/refactor/use-handouts
```

## État

```txt
open
mergeable: false
```

## Dépendance

À résoudre après #78.

## Cause probable du conflit

`main` a avancé avec #73 et #74, et les branches #75-#78 doivent idéalement être mergées avant.

PR #79 concentre beaucoup de changements et inclut plusieurs hooks déjà extraits. Elle risque donc d’avoir des conflits dans :

```txt
frontend/src/App.tsx
frontend/src/hooks/useRealtimeSession.ts
frontend/src/hooks/useTokenActions.ts
frontend/src/hooks/useSessionJournal.ts
frontend/src/hooks/useHandouts.ts
```

## Fix déjà connu à conserver

Dans `useRealtimeSession.ts`, garder le fix anti-reconnexion :

```txt
callbacksRef
selectedSceneIdRef
connect dépend seulement de token + campaignId
```

## Résolution recommandée

### À garder depuis #79

```tsx
import { useHandouts } from "./hooks/useHandouts";

const handoutsHook = useHandouts({
  token,
  onError: setMessage,
  onMessage: setMessage,
  onBusyStart: () => {
    setIsBusy(true);
    setMessage("");
  },
  onBusyEnd: () => setIsBusy(false),
});

const {
  handouts,
  loadHandouts,
  createHandout,
  revealHandout,
  deleteHandout,
} = handoutsHook;
```

### Correction sémantique obligatoire

Ne pas utiliser `onError` pour les succès.

Mauvais :

```tsx
onError("Handout cree.");
onError(`Handout "${updated.title}" partage aux joueurs.`);
onError("Handout supprime.");
```

Bon :

```tsx
onMessage?.("Handout créé.");
onMessage?.(`Handout "${updated.title}" partagé aux joueurs.`);
onMessage?.("Handout supprimé.");
```

## Checklist #79

- [ ] #78 déjà mergée.
- [ ] `useHandouts.ts` présent.
- [ ] `useHandouts` accepte `onMessage`.
- [ ] Créer handout OK.
- [ ] Révéler handout OK.
- [ ] Supprimer handout OK.
- [ ] WebSocket handout refresh OK.
- [ ] Backend pytest OK.
- [ ] Ruff OK.
- [ ] Biome/TS/build OK.

---

# PR #72 — GmWorkspace

## Branche

```txt
agent/refactor/app-workspace
```

## État

```txt
open
mergeable: false
```

## Dépendance

À traiter en dernier.

## Cause probable du conflit

#72 extrait un gros morceau JSX de `App.tsx` vers :

```txt
frontend/src/app/GmWorkspace.tsx
```

Mais depuis sa création, plusieurs hooks ont été ajoutés ou mergés. Les props que #72 passe à `GmWorkspace` ne sont probablement plus alignées avec l’état final après #75-#79.

## Résolution recommandée

Ne pas résoudre #72 maintenant si les hooks #75-#79 ne sont pas encore mergés.

Après merge de #75-#79 :

```bash
cd /home/donopot/dnd-saas

git fetch origin
git switch agent/refactor/app-workspace
git pull --ff-only origin agent/refactor/app-workspace

git merge origin/main
```

Puis résoudre `App.tsx` en gardant :

- le routing Auth / Invite / Player / GM Lobby dans `App.tsx` ;
- les hooks métier dans `App.tsx` ;
- le gros rendu GM dans `GmWorkspace` ;
- les props regroupées progressivement.

## Cible de rendu

À terme, `App.tsx` devrait ressembler à :

```tsx
return (
  <ErrorBoundary>
    <GmWorkspace
      auth={auth}
      campaign={campaign}
      vtt={vtt}
      journal={journal}
      handouts={handoutsHook}
      tokenActions={tokenActions}
      realtime={ws}
      ui={uiState}
    />
  </ErrorBoundary>
);
```

Mais pour la PR #72, ne pas forcer ce regroupement si cela augmente trop le risque. Accepter une première version avec beaucoup de props, puis prévoir une PR suivante.

## Checklist #72

- [ ] #75-#79 déjà mergées.
- [ ] `GmWorkspace.tsx` compile.
- [ ] `App.tsx` ne contient plus le gros JSX GM.
- [ ] Sidebar GM OK.
- [ ] Topbar GM OK.
- [ ] Carte dockée OK.
- [ ] Carte flottante OK.
- [ ] Panneaux dockés OK.
- [ ] Panneaux flottants OK.
- [ ] Modales OK.
- [ ] Toasts OK.
- [ ] ErrorBoundary couvre le workspace.
- [ ] Biome/TS/build OK.

---

# Commandes spécifiques par branche

## #75

```bash
cd /home/donopot/dnd-saas
git fetch origin
git switch agent/refactor/use-vtt-state
git pull --ff-only origin agent/refactor/use-vtt-state
git merge origin/main
```

## #76

```bash
cd /home/donopot/dnd-saas
git fetch origin
git switch agent/refactor/use-token-actions
git pull --ff-only origin agent/refactor/use-token-actions
git merge origin/main
```

## #77

```bash
cd /home/donopot/dnd-saas
git fetch origin
git switch agent/refactor/use-realtime-session
git pull --ff-only origin agent/refactor/use-realtime-session
git merge origin/main
```

## #78

```bash
cd /home/donopot/dnd-saas
git fetch origin
git switch agent/refactor/use-session-journal
git pull --ff-only origin agent/refactor/use-session-journal
git merge origin/main
```

## #79

```bash
cd /home/donopot/dnd-saas
git fetch origin
git switch agent/refactor/use-handouts
git pull --ff-only origin agent/refactor/use-handouts
git merge origin/main
```

## #72

```bash
cd /home/donopot/dnd-saas
git fetch origin
git switch agent/refactor/app-workspace
git pull --ff-only origin agent/refactor/app-workspace
git merge origin/main
```

---

# Tests CI locaux à lancer après chaque résolution

## Frontend

```bash
cd /home/donopot/dnd-saas/frontend
npm exec -- biome check --write .
npm exec -- biome check --max-diagnostics=50 .
npx tsc -b --pretty false
npm run build
```

## Backend

```bash
cd /home/donopot/dnd-saas/backend
source /home/donopot/venv/bin/activate
python -m ruff check .
python -m pytest tests/ -v
```

## Docker compose

```bash
cd /home/donopot/dnd-saas
cp .env.example .env.ci-check
# ne pas remplacer le vrai .env de prod

docker compose config --quiet
```

---

# Ordre de push recommandé

Après résolution d’une PR :

```bash
git status
git push origin <branch>
```

Attendre que GitHub recalcule :

```txt
mergeable: true
CI: green
```

Puis seulement merger et passer à la PR suivante.

# Ne pas faire

- Ne pas résoudre toutes les branches en parallèle.
- Ne pas merger #72 avant les hooks.
- Ne pas choisir `git checkout --ours frontend/src/App.tsx` ou `--theirs` en bloc.
- Ne pas perdre le fix `inviteAcceptedTokenRef`.
- Ne pas perdre le `AuthStatus` de `useAuthSession`.
- Ne pas réintroduire le WebSocket reconnect à chaque render.
- Ne pas utiliser `onError` pour afficher des succès.

# Résumé exécutable

```txt
#73 merged
#74 merged
#75 resolve + test + merge
#76 resolve + test + merge
#77 resolve + test + merge
#78 resolve + test + merge
#79 resolve + test + merge
#72 resolve + test + merge
```
