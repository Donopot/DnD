# Plan de fix — PR ouvertes de refactor App.tsx

Date : 2026-06-04

## Objectif

Ce document regroupe les fixes à apporter aux PR ouvertes de refactor du repo DnD.

PR concernées :

| PR | Branche | Sujet | Statut recommandé |
|---|---|---|---|
| #73 | `agent/refactor/use-auth-session` | Extraction `useAuthSession` | À corriger avant merge |
| #74 | `agent/refactor/use-campaign-data` | Extraction `useCampaignData` | À corriger avant merge |
| #75 | `agent/refactor/use-vtt-state` | Extraction `useVttState` | À corriger avant merge |
| #76 | `agent/refactor/use-token-actions` | Extraction `useTokenActions` | À corriger avant merge |
| #77 | `agent/refactor/use-realtime-session` | Extraction `useRealtimeSession` | Fix partiel appliqué, à tester |
| #72 | `agent/refactor/app-workspace` | Extraction `GmWorkspace` | À merger après les hooks |

## Ordre de merge recommandé

Ne pas merger dans l'ordre d'update GitHub.

Ordre logique :

```txt
1. #73 useAuthSession
2. #74 useCampaignData
3. #75 useVttState
4. #76 useTokenActions
5. #77 useRealtimeSession
6. #72 app workspace
```

Raison : les PR #74 à #77 dépendent progressivement des extractions précédentes. La PR #72 est la plus structurelle côté rendu et doit arriver après stabilisation des hooks, sinon les conflits seront plus difficiles.

---

## Fix transversal P0 — flow invite avec token stale

### Problème

Dans plusieurs PR, le flow `InvitePage` fait :

```tsx
onTokenChange={(newToken) => {
  login(newToken);
}}

onJoined={async () => {
  await campaign.loadCampaigns(token);
}}
```

Le `token` utilisé dans `onJoined` peut être l'ancien token capturé par closure. Si `InvitePage` fournit un nouveau token, `loadCampaigns(token)` risque de charger avec un token obsolète.

### Risque

- campagne non rechargée après acceptation d'invitation ;
- erreur 401 ou état incomplet ;
- nécessité de refresh manuel ;
- comportement intermittent difficile à reproduire.

### Correction recommandée

Option simple : stocker le dernier token reçu via une ref.

```tsx
const inviteAcceptedTokenRef = useRef<string | null>(null);
```

Dans `onTokenChange` :

```tsx
onTokenChange={(newToken) => {
  inviteAcceptedTokenRef.current = newToken;
  login(newToken);
}}
```

Dans `onJoined` :

```tsx
onJoined={async () => {
  await campaign.loadCampaigns(inviteAcceptedTokenRef.current ?? token);
  inviteAcceptedTokenRef.current = null;
  setInviteToken(null);
  window.history.pushState({}, "", "/");
}}
```

À appliquer au minimum dans les branches #73, #74, #75, #76 et #77 si le pattern y est présent.

---

## PR #73 — `useAuthSession`

### Intention

Extraire la gestion du token, du user et du localStorage hors de `App.tsx`.

### Points positifs

- Retire `TOKEN_STORAGE_KEY` de `App.tsx`.
- Centralise `login()` et `logout()`.
- Bootstrape `/api/auth/me` si un token existe déjà dans `localStorage`.

### Fix à apporter

#### P0 — corriger le flow invite avec token stale

Voir fix transversal.

#### P1 — clarifier `isAuthenticated`

Actuellement :

```tsx
isAuthenticated: !!user
```

Ce choix est prudent, mais il peut être ambigu pendant le bootstrap : un token existe, mais `user` n'est pas encore chargé.

Correction recommandée : ajouter un état explicite.

```tsx
type AuthStatus = "anonymous" | "checking" | "authenticated";
```

Retour du hook :

```tsx
status: AuthStatus;
isAuthenticated: status === "authenticated";
```

Cela évite de confondre :

```txt
token absent
token présent mais user en cours de chargement
token valide et user chargé
token invalide
```

#### P2 — éviter le double bootstrap

`useAuthSession` bootstrape `/api/auth/me`, puis `App.tsx` appelle encore `bootstrap()` pour charger les campagnes.

À terme, renommer `bootstrap()` dans `App.tsx` en `loadInitialCampaigns()` pour éviter la confusion avec le bootstrap auth.

### Checklist #73

- [ ] Login standard OK.
- [ ] Register standard OK.
- [ ] Refresh page avec token existant OK.
- [ ] Token expiré → logout propre.
- [ ] Invitation connecté → campagnes rechargées.
- [ ] Invitation non connecté → auth puis campagnes rechargées.

---

## PR #74 — `useCampaignData`

### Intention

Extraire campagnes, membres et invitations hors de `App.tsx`.

### Points positifs

- Centralise `campaigns`, `selectedCampaignId`, `members`, `latestInvite`, `activeInvites`.
- Supprime plusieurs handlers campaign/invite de `App.tsx`.
- Rend plus clair le domaine campagne.

### Fix à apporter

#### P0 — corriger le flow invite avec token stale

Voir fix transversal.

#### P1 — protéger `createInvite()` si aucune campagne n'est sélectionnée

Actuellement, le hook dépend de `selectedCampaignId`.

Correction recommandée :

```tsx
const createInvite = useCallback(async (): Promise<Invite> => {
  if (!selectedCampaignId) {
    throw new Error("No campaign selected");
  }

  const invite = await apiRequest<Invite>(
    `/api/campaigns/${selectedCampaignId}/invites`,
    token,
    {
      method: "POST",
      body: JSON.stringify({ role: "player", expires_in_days: 14, max_uses: 10 }),
    },
  );

  setLatestInvite(invite);
  void loadInvites(selectedCampaignId);
  return invite;
}, [token, selectedCampaignId, loadInvites]);
```

#### P1 — nettoyer les invitations quand on change de campagne

`selectCampaign()` devrait idéalement vider `latestInvite` pour éviter d'afficher un lien d'une autre campagne.

Correction :

```tsx
const selectCampaign = useCallback((id: string) => {
  setSelectedCampaignId(id);
  setLatestInvite(null);
}, []);
```

Si on veut garder cette responsabilité côté `App.tsx`, le documenter clairement.

#### P2 — remonter les erreurs membres/invites

`loadInvites()` ignore les erreurs. C'est acceptable pour un joueur, mais pas idéal pour un GM.

Évolution possible :

```tsx
useCampaignData(token, { onError: setMessage })
```

### Checklist #74

- [ ] Créer campagne OK.
- [ ] Changer de campagne OK.
- [ ] Membres rechargés sur campagne sélectionnée.
- [ ] Créer invitation OK.
- [ ] Révoquer invitation OK.
- [ ] `latestInvite` ne fuit pas entre campagnes.

---

## PR #75 — `useVttState`

### Intention

Extraire scènes, scène sélectionnée, tokens, assets et combat state hors de `App.tsx`.

### Points positifs

- `selectedScene` est dérivé dans le hook.
- `loadVttState()`, `loadSceneTokens()`, `loadCombatState()` sont centralisés.
- Les opérations tokens basiques sont préparées pour être réutilisées.

### Fix à apporter

#### P0 — corriger le flow invite avec token stale

Voir fix transversal si présent dans la branche.

#### P1 — ne pas avaler silencieusement les erreurs critiques

Plusieurs fonctions font :

```tsx
catch {
  // silently handled by caller
}
```

Mais le caller ne reçoit pas forcément l'erreur.

Correction recommandée : ajouter `onError` optionnel.

```tsx
export function useVttState(
  token: string,
  options?: { onError?: (message: string) => void },
): UseVttStateReturn {
```

Puis :

```tsx
catch (error) {
  options?.onError?.(
    error instanceof Error ? error.message : "Unable to load VTT state",
  );
}
```

À appliquer au minimum à :

```txt
loadSceneTokens
loadVttState
loadCombatState
loadAssets
loadEncounterDetail
```

#### P1 — garder `performTokenAction()` dans le bon domaine

`useVttState` contient déjà des actions métier tokens. C'est acceptable temporairement, mais dès #76, les actions doivent être portées par `useTokenActions` ou par un service `tokenApi`.

Règle recommandée :

```txt
useVttState = état VTT + loaders
useTokenActions = mutations tokens + busy/error/fog reveal
```

#### P1 — supprimer les états inutilisés si possible

Le hook garde :

```tsx
const [, setAssetList] = useState<Asset[]>([]);
const [, setSelectedAssetId] = useState<string>("");
const [, setCombatants] = useState<Combatant[]>([]);
```

Si ces valeurs ne sont pas exposées, soit les exposer proprement, soit supprimer la charge si elle n'est plus utile.

### Checklist #75

- [ ] Liste scènes OK.
- [ ] Sélection scène OK.
- [ ] Tokens scène chargés OK.
- [ ] Changement scène recharge les tokens.
- [ ] Combat state OK.
- [ ] Erreur API scène visible dans l'UI.
- [ ] Pas de régression sur carte flottante/dockée.

---

## PR #76 — `useTokenActions`

### Intention

Extraire déplacements, actions unitaires et batch tokens hors de `App.tsx`.

### Points positifs

- `moveToken()` centralise le move + auto-reveal fog.
- `wrapSingle()` et `wrapBatch()` rendent les actions clavier/multi-select plus sûres.
- `AbortController` fog reveal est correctement localisé dans le hook.

### Fix à apporter

#### P0 — corriger le flow invite avec token stale

Voir fix transversal si présent dans la branche.

#### P1 — ne pas utiliser `onError` pour un message de succès

Actuellement :

```tsx
if (action === "delete") {
  onError(`${tokens.length} token(s) supprimé(s).`);
}
```

C'est fonctionnel si `onError` pointe vers `setMessage`, mais le nom est faux et peut causer une UI d'erreur plus tard.

Correction recommandée : ajouter `onMessage`.

```tsx
export interface UseTokenActionsOptions {
  token: string;
  selectedScene: Scene | undefined;
  setSceneTokens: React.Dispatch<React.SetStateAction<SceneToken[]>>;
  performTokenAction: (...args) => Promise<SceneToken | void>;
  onError: (msg: string) => void;
  onMessage?: (msg: string) => void;
  onStart: () => void;
  onEnd: () => void;
}
```

Puis :

```tsx
if (action === "delete") {
  onMessage?.(`${tokens.length} token(s) supprimé(s).`);
}
```

Et côté `App.tsx` :

```tsx
const tokenActions = useTokenActions({
  token,
  selectedScene,
  setSceneTokens: vtt.setSceneTokens,
  performTokenAction: vtt.performTokenAction,
  onError: setMessage,
  onMessage: setMessage,
  onStart: () => { setIsBusy(true); setMessage(""); },
  onEnd: () => setIsBusy(false),
});
```

#### P1 — inclure `performTokenAction` dans les dépendances de `moveToken` si utilisé

`moveToken` ne l'utilise pas, donc pas besoin. En revanche, garder les deps de `wrapSingle` et `wrapBatch` strictes.

#### P1 — gérer le reveal fog après move

Le reveal `/api/tokens/{id}/reveal` est lancé en arrière-plan. En cas d'échec non AbortError, aucune erreur n'est remontée.

Correction légère :

```tsx
}).catch((err) => {
  if (err?.name === "AbortError") return;
  onError("Révélation automatique du brouillard impossible.");
});
```

À voir selon UX : afficher une erreur à chaque move peut être trop bruyant. Alternative : `console.warn` interdit si la politique no-console est stricte, donc préférer un toast discret si disponible.

### Checklist #76

- [ ] Move token OK.
- [ ] Auto-reveal fog OK.
- [ ] Delete mono token OK.
- [ ] Delete multi token OK.
- [ ] Duplicate mono/multi OK.
- [ ] Hide/reveal mono/multi OK.
- [ ] Z-index front/back OK.
- [ ] Aucun message de succès n'utilise une API nommée `onError`.

---

## PR #77 — `useRealtimeSession`

### Intention

Extraire la connexion WebSocket, la présence, le statut realtime, la reconnexion et les handlers de messages hors de `App.tsx`.

### Fix déjà appliqué

Commit appliqué sur la branche :

```txt
18be737 fix: avoid websocket reconnects on render
```

Le hook utilise maintenant :

```txt
callbacksRef
selectedSceneIdRef
```

Objectif : éviter que le WebSocket se reconnecte à chaque render ou à chaque changement de scène.

### Fix restant

#### P0 — corriger le flow invite avec token stale

Voir fix transversal si présent dans la branche.

#### P1 — sécuriser les callbacks App côté PR #77

Dans `App.tsx`, éviter :

```tsx
onSessionSceneToken: () => { void vtt.loadVttState(selectedCampaign!.id); }
```

Le `!` est fragile. Remplacer par :

```tsx
onSessionSceneToken: () => {
  if (selectedCampaign?.id) void vtt.loadVttState(selectedCampaign.id);
}
```

Même correction pour :

```txt
onSessionEncounter
onSessionHandout
onSessionLog
```

#### P1 — vérifier absence de reconnect sur changement de scène

La connexion WebSocket est par campagne :

```txt
/ws/campaigns/{campaignId}
```

Donc le changement de scène ne doit pas rouvrir le socket. Le commit `18be737` doit être validé en conditions réelles.

### Checklist #77

- [ ] Login GM ouvre un seul WebSocket.
- [ ] Changer de scène ne reconnecte pas le WebSocket.
- [ ] Changer de campagne reconnecte le WebSocket.
- [ ] Token expiré/auth WS fail → message clair.
- [ ] `token_moved` reçu seulement pour scène active.
- [ ] `session_changed` recharge scène/tokens/combat/handouts/log sans boucle.
- [ ] Deux navigateurs voient les mouvements tokens.

---

## PR #72 — `GmWorkspace`

### Intention

Extraire le layout GM complet hors de `App.tsx`.

### Points positifs

- Forte réduction du JSX dans `App.tsx`.
- Sépare routing/auth/data de l'affichage workspace GM.
- Prépare une future extraction sidebar/topbar/map/modals.

### Fix à apporter

#### P0 — merger après les hooks

Ne pas merger #72 avant #73 à #77.

Raison : #72 déplace beaucoup de JSX et props. Si on merge d'abord #72, les hooks devront être rebased sur une structure plus large, avec plus de conflits.

#### P1 — réduire la largeur de props

`GmWorkspace` reçoit beaucoup de props. C'est acceptable pour une première extraction, mais la suite doit regrouper par domaines.

Cible :

```tsx
<GmWorkspace
  auth={auth}
  campaign={campaign}
  vtt={vtt}
  journal={journal}
  handouts={handouts}
  tokenActions={tokenActions}
  realtime={realtime}
  ui={ui}
/>
```

Ne pas faire tout de suite dans #72 si cela augmente le risque. Le noter comme étape suivante.

#### P1 — éviter de recréer le monolithe dans `GmWorkspace`

Le but n'est pas de déplacer 1000 lignes de `App.tsx` vers `GmWorkspace` pour s'arrêter là.

Étapes suivantes recommandées :

```txt
GmSidebar.tsx
GmMapSection.tsx
GmTopbar.tsx
GmModals.tsx
GmToasts.tsx
```

#### P1 — vérifier ErrorBoundary

`GmWorkspace` doit rester enveloppé par `ErrorBoundary` ou inclure ses propres boundaries autour de zones critiques :

```txt
sidebar
map
panneaux dockés
panneaux flottants
modals/toasts
```

### Checklist #72

- [ ] `App.tsx` ne contient plus le gros JSX GM.
- [ ] Interface GM charge.
- [ ] Sidebar campagnes/membres OK.
- [ ] Topbar modes/focus/theme OK.
- [ ] Carte dockée OK.
- [ ] Carte flottante OK.
- [ ] Panneaux dockés OK.
- [ ] Panneaux flottants OK.
- [ ] Modales CharacterWizard / Inspector / shortcuts OK.
- [ ] Toasts OK.

---

## Tests globaux avant merge de chaque PR

### Frontend

```bash
cd /home/donopot/dnd-saas/frontend
npm run build
npx tsc --noEmit
```

### Backend

```bash
cd /home/donopot/dnd-saas/backend
uv run pytest tests/ -v
```

### Déploiement test

```bash
cd /home/donopot/dnd-saas
docker compose up -d --build
curl -i https://dnd.dtmini.com/api/health
```

### Logs à surveiller

```bash
docker compose logs --tail=200 -f dnd-backend | grep -Ei "error|warn|422|500|/ws|/tokens|/fog"
```

---

## Commandes de travail par PR

Exemple pour une PR :

```bash
cd /home/donopot/dnd-saas

git fetch origin
git switch agent/refactor/use-auth-session
git pull --ff-only origin agent/refactor/use-auth-session

cd frontend
npm run build
npx tsc --noEmit
```

Après correction :

```bash
cd /home/donopot/dnd-saas

git status
git add frontend/src/App.tsx frontend/src/hooks/*.ts
git commit -m "fix: stabilize auth refactor edge cases"
git push origin agent/refactor/use-auth-session
```

---

## Stratégie recommandée

1. Corriger #73 et merger.
2. Rebase #74 sur `main`, corriger, merger.
3. Rebase #75 sur `main`, corriger, merger.
4. Rebase #76 sur `main`, corriger, merger.
5. Rebase #77 sur `main`, garder le fix `18be737`, corriger les `selectedCampaign!`, merger.
6. Rebase #72 sur `main`, résoudre conflits de props, tester UI complète, merger.

## Ne pas faire

- Ne pas merger #72 avant les hooks.
- Ne pas merger #77 sans test WebSocket réel.
- Ne pas laisser `onError` servir à afficher des messages de succès.
- Ne pas avaler silencieusement les erreurs de chargement VTT critiques.
- Ne pas remplacer un monolithe `App.tsx` par un monolithe `GmWorkspace.tsx` sans plan de découpage suivant.
