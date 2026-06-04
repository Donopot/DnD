# Plan de fix — PR #74 useCampaignData

Date : 2026-06-04

## PR concernée

PR #74 — `Agent/refactor/use campaign data`

Branche : `agent/refactor/use-campaign-data` → `main`

État observé :

```txt
state: open
mergeable: false
changed_files: 3
commits: 6
```

## Objectif de la PR

La PR extrait la logique campagne hors de `App.tsx` vers un hook dédié :

```txt
frontend/src/hooks/useCampaignData.ts
```

Le hook gère :

- `campaigns`
- `selectedCampaignId`
- `selectedCampaign`
- `members`
- `latestInvite`
- `activeInvites`
- chargement des campagnes
- sélection de campagne
- création de campagne
- chargement des membres
- chargement / création / révocation des invitations

## Verdict

La direction est bonne, mais la PR est actuellement bloquée par conflit avec `main`.

Elle doit être synchronisée avec les changements récents déjà mergés dans `main`, notamment :

- `useAuthSession` enrichi avec `AuthStatus` ;
- fix du flow invite avec `inviteAcceptedTokenRef` ;
- documentation et base `main` plus récente.

## Cause probable du conflit

La branche #74 embarque encore une ancienne version de `frontend/src/hooks/useAuthSession.ts`.

Sur `main`, `useAuthSession` expose maintenant :

```tsx
export type AuthStatus = "anonymous" | "checking" | "authenticated";

export interface UseAuthSessionReturn {
  token: string;
  user: User | null;
  status: AuthStatus;
  isAuthenticated: boolean;
  login: (accessToken: string, user?: User) => void;
  logout: () => void;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
}
```

Sur la branche #74, le hook est encore plus ancien et ne contient pas `status`.

Donc, lors du merge avec `main`, conserver la version de `main` pour `useAuthSession.ts`.

## Fix P0 — résoudre le conflit avec main

### Commandes

```bash
cd /home/donopot/dnd-saas

git fetch origin
git switch agent/refactor/use-campaign-data
git pull --ff-only origin agent/refactor/use-campaign-data

git merge origin/main
```

Puis vérifier les fichiers en conflit :

```bash
git status
grep -R "<<<<<<<\|=======\|>>>>>>>" -n frontend/src/App.tsx frontend/src/hooks/useAuthSession.ts frontend/src/hooks/useCampaignData.ts
```

### Résolution recommandée pour `useAuthSession.ts`

Conserver la version de `main` :

```bash
git checkout --theirs frontend/src/hooks/useAuthSession.ts
git add frontend/src/hooks/useAuthSession.ts
```

Dans le contexte d’un `git merge origin/main`, `--theirs` correspond à `origin/main`.

### Résolution recommandée pour `App.tsx`

Ne pas choisir `--ours` ou `--theirs` en bloc.

Il faut garder à la fois :

- les changements de #74 ;
- les fixes récents de `main`.

À garder depuis #74 :

```tsx
import { useCampaignData } from "./hooks/useCampaignData";

const campaign = useCampaignData(token);
const { campaigns, selectedCampaignId, selectedCampaign, members, latestInvite, activeInvites } = campaign;
```

À garder depuis `main` :

```tsx
const inviteAcceptedTokenRef = useRef<string | null>(null);
```

et le fix du flow invitation :

```tsx
onTokenChange={(newToken) => {
  inviteAcceptedTokenRef.current = newToken;
  login(newToken);
}}

onJoined={async () => {
  await campaign.loadCampaigns(inviteAcceptedTokenRef.current ?? token);
  inviteAcceptedTokenRef.current = null;
  setInviteToken(null);
  if (window.history.pushState) {
    window.history.pushState({}, "", "/");
  }
}}
```

## Fix P1 — sécuriser `useCampaignData`

Le hook est globalement correct, mais quelques points doivent être validés.

### 1. `createInvite()` doit refuser l’absence de campagne

La branche contient déjà :

```tsx
if (!selectedCampaignId) {
  throw new Error("No campaign selected");
}
```

C’est à garder.

### 2. `selectCampaign()` doit vider `latestInvite`

La branche contient déjà :

```tsx
const selectCampaign = useCallback((id: string) => {
  setSelectedCampaignId(id);
  setLatestInvite(null);
}, []);
```

C’est à garder pour éviter d’afficher un lien d’invitation d’une autre campagne.

### 3. `loadInvites()` peut rester silencieux temporairement

Actuellement :

```tsx
catch {
  // Silently ignore — user may not be GM
}
```

Acceptable pour cette PR, car un joueur peut ne pas avoir le droit de lister les invitations.

Amélioration future : passer `onError` au hook avec un mode silencieux selon le rôle.

## Fix P1 — vérifier les anciens setters supprimés

Après résolution, `App.tsx` ne doit plus utiliser ces setters directs :

```txt
setCampaigns
setSelectedCampaignId
setMembers
setLatestInvite
setActiveInvites
```

Ils doivent être remplacés par :

```txt
campaign.loadCampaigns()
campaign.selectCampaign()
campaign.clearCampaigns()
campaign.loadMembers()
campaign.clearMembers()
campaign.createCampaign()
campaign.createInvite()
campaign.revokeInvite()
campaign.loadInvites()
campaign.clearInvites()
campaign.clearLatestInvite()
```

Commande de vérification :

```bash
grep -nE "setCampaigns|setSelectedCampaignId|setMembers|setLatestInvite|setActiveInvites" frontend/src/App.tsx
```

Résultat attendu : aucun usage, sauf si une compatibilité temporaire est explicitement assumée.

## Fix P1 — vérifier le flow logout

Le logout doit appeler :

```tsx
authLogout();
campaign.clearCampaigns();
campaign.clearMembers();
campaign.clearInvites();
```

et continuer à nettoyer les états hors-campagne :

```tsx
setCharacters([]);
setRolls([]);
setLogEntries([]);
setPresenceCount(0);
setSelectedCharacterId("");
```

## Fix P2 — nommage à clarifier

Dans `App.tsx`, éviter de nommer une variable locale `campaign` dans `handleCreateCampaign`, car `campaign` désigne déjà le hook.

Préférer :

```tsx
const createdCampaign = await campaign.createCampaign(...);
```

ou ne pas stocker le retour si inutile.

## Commandes de résolution complète

```bash
cd /home/donopot/dnd-saas

git fetch origin
git switch agent/refactor/use-campaign-data
git pull --ff-only origin agent/refactor/use-campaign-data

git merge origin/main
```

Si conflit sur `useAuthSession.ts` :

```bash
git checkout --theirs frontend/src/hooks/useAuthSession.ts
git add frontend/src/hooks/useAuthSession.ts
```

Corriger `App.tsx` manuellement, puis :

```bash
grep -R "<<<<<<<\|=======\|>>>>>>>" -n frontend/src/App.tsx frontend/src/hooks/useAuthSession.ts frontend/src/hooks/useCampaignData.ts

git add frontend/src/App.tsx frontend/src/hooks/useAuthSession.ts frontend/src/hooks/useCampaignData.ts
git commit -m "fix: resolve campaign data refactor conflicts"
```

## Tests à lancer

### Frontend

```bash
cd /home/donopot/dnd-saas/frontend

npm exec -- biome check --write .
npm exec -- biome check --max-diagnostics=50 .
npx tsc -b --pretty false
npm run build
```

### Backend

```bash
cd /home/donopot/dnd-saas/backend

source /home/donopot/venv/bin/activate
python -m ruff check .
python -m pytest tests/ -v
```

### Push

```bash
cd /home/donopot/dnd-saas

git status
git push origin agent/refactor/use-campaign-data
```

## Checklist de validation PR #74

- [ ] PR repasse `mergeable: true` sur GitHub.
- [ ] `useAuthSession.ts` conserve `AuthStatus` depuis `main`.
- [ ] `App.tsx` utilise `useCampaignData(token)`.
- [ ] Plus d’usage direct de `setCampaigns`, `setSelectedCampaignId`, `setMembers`, `setLatestInvite`, `setActiveInvites` dans `App.tsx`.
- [ ] Le flow invitation utilise `inviteAcceptedTokenRef` pour éviter le token stale.
- [ ] Créer campagne fonctionne.
- [ ] Changer de campagne fonctionne.
- [ ] Les membres se rechargent sur changement de campagne.
- [ ] Créer invitation fonctionne.
- [ ] Révoquer invitation fonctionne.
- [ ] `latestInvite` ne fuit pas entre campagnes.
- [ ] `npm exec -- biome check --max-diagnostics=50 .` passe.
- [ ] `npx tsc -b --pretty false` passe.
- [ ] `npm run build` passe.
- [ ] `python -m ruff check .` passe.
- [ ] `python -m pytest tests/ -v` passe.

## Verdict final

Statut recommandé :

```txt
Request changes jusqu’à résolution du conflit et validation CI locale.
```

Après résolution, cette PR peut être mergée avant les PR suivantes :

```txt
#75 useVttState
#76 useTokenActions
#77 useRealtimeSession
#78 useSessionJournal
#79 useHandouts
#72 GmWorkspace
```
