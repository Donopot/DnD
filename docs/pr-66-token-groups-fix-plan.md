# Fix plan — PR #66 Token groups / multi-select actions

## PR concernée

PR #66 — `feat: token groups — multi-select actions + auto-naming (4D)`

Branche : `agent/feature/token-groups-4d` → `main`

## Verdict de review

La PR apporte une bonne amélioration UX : les actions clavier peuvent s’appliquer à plusieurs tokens sélectionnés, le badge de multi-sélection rend l’état plus clair, et la duplication de token produit des noms plus propres.

Mais la PR ne doit pas être mergée telle quelle tant que les points ci-dessous ne sont pas corrigés.

## Problèmes à corriger avant merge

### P0 — PR non mergeable

GitHub indique que la PR n’est pas mergeable.

Action : synchroniser la branche avec `main`.

```bash
cd /home/donopot/dnd-saas

git fetch origin
git switch agent/feature/token-groups-4d
git pull --ff-only origin agent/feature/token-groups-4d

git merge origin/main
```

S’il y a conflit :

```bash
git status
```

Puis corriger les conflits, `git add`, `git commit`, et pousser :

```bash
git push origin agent/feature/token-groups-4d
```

---

### P0 — Suppression multi-token : nettoyer aussi le token sélectionné principal

La PR vide `selectedTokenIds` après une suppression multi, mais elle ne nettoie pas forcément `selectedTokenId`.

Risque :

```txt
selectedTokenIds = vide
selectedTokenId = id d’un token supprimé
```

Conséquences possibles :

- panneau détail token qui pointe vers un token supprimé ;
- panneau visibilité incohérent ;
- raccourcis clavier appliqués à un état fantôme ;
- erreur UI si un composant attend un token existant.

Correction recommandée dans `CampaignMap.tsx` :

```tsx
case "Delete":
case "Backspace":
  e.preventDefault();
  for (const t of targets) onTokenAction?.("delete", t);
  if (isMulti) {
    setSelectedTokenIds(new Set());
    selectToken("");
  }
  return;
```

Si le helper local n’est pas `selectToken`, utiliser la prop/handler équivalent permettant de vider `selectedTokenId`.

---

### P1 — Actions multi-token lancées en parallèle sans contrôle

La PR boucle directement :

```tsx
for (const t of targets) onTokenAction?.("delete", t);
for (const t of targets) onTokenAction?.("duplicate", t);
for (const t of targets) onTokenAction?.("front", t);
for (const t of targets) onTokenAction?.("back", t);
```

Or `onTokenAction` déclenche une fonction async côté `App.tsx` qui :

- met `isBusy` à `true` ;
- appelle l’API ;
- met à jour `sceneTokens` ;
- gère les erreurs ;
- remet `isBusy` à `false`.

Avec plusieurs tokens, cela lance plusieurs requêtes en parallèle avec plusieurs mises à jour concurrentes.

Correction minimale acceptable : garder le comportement parallèle pour cette PR, mais le documenter comme dette technique.

Correction recommandée : ajouter une action batch.

```tsx
type CampaignMapProps = {
  onTokenBatchAction?: (action: string, tokens: SceneToken[]) => void;
};
```

Puis côté `App.tsx`, implémenter une version séquentielle :

```tsx
async function handleTokenBatchAction(action: string, tokens: SceneToken[]) {
  setIsBusy(true);
  setMessage("");

  try {
    for (const token of tokens) {
      await performTokenAction(action, token);
    }
  } catch (error) {
    setMessage(error instanceof Error ? error.message : `Unable to ${action} tokens`);
  } finally {
    setIsBusy(false);
  }
}
```

Idéalement, extraire la logique actuelle de `handleTokenAction()` dans `performTokenAction()` pour éviter des `setIsBusy()` imbriqués.

---

### P1 — Toggle hide/reveal groupé plus intuitif

La PR utilise l’état du premier token sélectionné :

```tsx
const primaryHidden = targets[0].is_hidden;
const toggleAction = primaryHidden ? "reveal" : "hide";
```

Ce comportement est prévisible techniquement, mais peu intuitif si la sélection contient un mélange visible/caché.

Correction recommandée :

```tsx
const shouldHide = targets.some((t) => !t.is_hidden);
const toggleAction = shouldHide ? "hide" : "reveal";
```

Règle UX :

```txt
si au moins un token sélectionné est visible → Ctrl+H cache tout
si tous les tokens sélectionnés sont cachés → Ctrl+H révèle tout
```

---

### P1 — Regex backend de duplication à ancrer

La PR génère des noms de duplication plus propres :

```txt
Gobelin
Gobelin (2)
Gobelin (3)
```

C’est une bonne amélioration.

Mais le pattern SQL actuel peut matcher des noms plus larges si le nom de base est contenu dans une autre chaîne.

Correction recommandée dans `backend/app/routers/vtt.py` :

```py
pattern = r"^" + re.escape(stripped) + r"\s*\((\d+)\)$"
```

au lieu de :

```py
pattern = re.escape(stripped) + r"\s*\((\d+)\)"
```

Cela évite de compter des tokens dont le nom contient simplement le même fragment.

---

## Tests à faire avant merge

### Build

```bash
cd /home/donopot/dnd-saas/frontend
npm run build
```

### Test navigateur — multi-select

1. Ouvrir une campagne avec une scène contenant plusieurs tokens.
2. Sélectionner plusieurs tokens avec Shift-click.
3. Vérifier que le badge `N tokens sélectionnés` apparaît.
4. Cliquer sur `✕` dans le badge.
5. Vérifier que toute la sélection disparaît.

### Test suppression groupée

1. Sélectionner 2 ou 3 tokens.
2. Appuyer sur Delete.
3. Vérifier que les tokens disparaissent.
4. Vérifier que le panneau détail ne pointe plus vers un token supprimé.
5. Vérifier qu’aucune erreur console n’apparaît.

### Test duplication groupée

1. Sélectionner plusieurs tokens.
2. Appuyer sur Ctrl+D.
3. Vérifier que les duplicatas sont créés.
4. Vérifier le nommage : `Gobelin (2)`, `Gobelin (3)`, etc.
5. Vérifier que les tokens cachés restent cachés si ce comportement était déjà prévu.

### Test visibilité groupée

1. Sélectionner un mélange de tokens visibles et cachés.
2. Appuyer sur Ctrl+H.
3. Vérifier que tous deviennent cachés si au moins un était visible.
4. Appuyer à nouveau sur Ctrl+H.
5. Vérifier que tous deviennent révélés.

### Test ordre z-index

1. Sélectionner plusieurs tokens.
2. Appuyer sur `]`.
3. Vérifier que les tokens passent devant.
4. Appuyer sur `[`.
5. Vérifier que les tokens passent derrière.

### Test backend nommage

Créer manuellement ou via duplication :

```txt
Gobelin
Gobelin (2)
Gobelin (3)
Grand Gobelin (2)
```

Puis dupliquer `Gobelin`.

Résultat attendu :

```txt
Gobelin (4)
```

Pas :

```txt
Gobelin (5)
```

si `Grand Gobelin (2)` est compté par erreur.

---

## Checklist d’acceptation

- [ ] La PR est mergeable.
- [ ] `npm run build` passe.
- [ ] La suppression multi nettoie `selectedTokenIds` et `selectedTokenId`.
- [ ] Le badge multi-select fonctionne.
- [ ] Le bouton clear du badge fonctionne.
- [ ] Delete/Backspace fonctionne en mono-sélection.
- [ ] Delete/Backspace fonctionne en multi-sélection.
- [ ] Ctrl+D fonctionne en mono-sélection.
- [ ] Ctrl+D fonctionne en multi-sélection.
- [ ] Ctrl+H applique une règle claire à toute la sélection.
- [ ] `[` et `]` fonctionnent sur toute la sélection.
- [ ] Le nommage de duplication est ancré et ne compte pas les faux positifs.
- [ ] Aucun token fantôme ne reste sélectionné après suppression.
- [ ] Aucun appel API massif incontrôlé n’est déclenché par accident.

---

## Commandes utiles sur le HP Mini

```bash
cd /home/donopot/dnd-saas

git fetch origin
git switch agent/feature/token-groups-4d
git pull --ff-only origin agent/feature/token-groups-4d

git merge origin/main

cd frontend
npm run build
cd ..

docker compose up -d --build
```

Pour surveiller les logs pendant le test :

```bash
docker compose logs --tail=200 -f dnd-backend | grep -Ei "tokens|duplicate|move|422|500"
```

---

## Verdict final

La PR est intéressante et utile, mais elle doit être stabilisée avant merge.

Statut recommandé :

```txt
Request changes jusqu’à correction de la mergeabilité et du nettoyage selectedTokenId après suppression multi.
```
