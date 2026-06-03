# Plan — Nettoyage des orphelins & éléments morts

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Identifier et résoudre tous les orphelins (code mort, CSS inutilisé, baselines désynchronisées) sans casser le projet. Principe : développer les features manquantes avant suppression, supprimer uniquement le vieux code obsolète.

**Architecture:** Audit en 6 axes → classification → action par lot.

**Tech Stack:** React/TypeScript frontend, FastAPI/Python backend, CSS modular.

**Conventions:** Voir `.hermes/developer-rules.md` et `writing-plans/references/dnd-vtt-conventions.md`.

---

## 📊 Résultats de l'audit

### Audit composants (frontend/src/components/)

| Type | Compte | Statut |
|------|--------|--------|
| Fichiers `.tsx` | 46 | — |
| Lazy-loadés dans App.tsx | 18 | ✅ Tous rendus (via `panel.id ===` ou JSX) |
| Importés directement | 20 | ✅ Tous rendus |
| Importés indirectement (par d'autres composants) | 8 | ✅ Tous utilisés |
| **VRAIS orphelins** | **0** | Aucun composant à supprimer |

### Audit hooks (frontend/src/hooks/)

| Hook | Références | Statut |
|------|-----------|--------|
| `useFloatingPanels` | 3 | ✅ |
| `useKeyboard` | 1 | ✅ |
| `useSceneBackground` | 2 | ✅ |
| `useTheme` | 1 | ✅ |
| `useToast` | 1 | ✅ |

### Audit API files (frontend/src/api/)

| Fichier | Références | Statut |
|---------|-----------|--------|
| `client.ts` | 4 | ✅ |
| `types.ts` | 25 | ✅ |

### Audit backend endpoints

| Catégorie | Compte | Statut |
|-----------|--------|--------|
| Endpoints totaux | ~95 | — |
| Appelés par le frontend | ~90+ | ✅ |
| Admin/débug (audit) | 1 | ✅ Intentionnel |
| Nouveau (reveal) | 1 | ✅ Fresh |

---

## 🔴 Problèmes confirmés

### 1. Pre-commit baseline désynchronisée

**Fichier:** `scripts/pre-commit.sh`
**Problème:** `BASELINE=16` mais 18 composants lazy-loadés dans `App.tsx`.
**Impact:** `pre-commit.sh` échoue avec `2 NEW orphan component(s) detected`.
**Action:** Mettre à jour `BASELINE=18`.

### 2. CSS mort — `.vtt-board-panel`

**Fichiers:** `frontend/src/styles/reset.css:58`, `frontend/src/styles/shell-gm.css:136`
**Problème:** Classe CSS `.vtt-board-panel` non utilisée dans aucun `.tsx`/`.ts`. C'est un vestige de l'ancien `VttBoard.tsx` supprimé en PANEL-1.
**Impact:** CSS mort (~10 lignes), aucun impact fonctionnel.
**Action:** Supprimer les règles `.vtt-board-panel`.

### 3. CSS mort — `.quick-actions-panel` / `.quick-actions-panel-compact`

**Fichier:** `frontend/src/styles/shell-gm.css` (lignes ~1474 et ~1871)
**Problème:** Le composant `QuickActions.tsx` utilise `className="quick-actions"` (sans suffixe `-panel`). Les classes `.quick-actions-panel` et `.quick-actions-panel-compact` dans le CSS ne matchent jamais.
**Impact:** CSS mort (~20 lignes), le composant QuickActions n'a pas le style prévu.
**Action:** Renommer les classes CSS pour matcher `quick-actions` → `quick-actions` (sans `-panel`), OU renommer le className dans QuickActions.tsx.

### 4. Script `audit-orphans.py` — faux positifs

**Fichier:** `scripts/audit-orphans.py`
**Problème:** Le script signale 18 « orphelins » alors qu'ils sont tous lazy-loadés via `lazy(() => import("./components/X"))`. La regex ne détecte pas ce pattern d'import.
**Impact:** Faux positifs systématiques, le script n'est pas fiable.
**Action:** Ajouter la détection des imports lazy dans le script.

### 5. `frontend/src/styles.css` (191 Ko) — backup monolithique

**Fichier:** `frontend/src/styles.css`
**Problème:** Le fichier original n'est plus importé (remplacé par `styles/index.css` + 11 modules). Il est conservé comme fallback.
**Impact:** Aucun (le build ignore les fichiers non importés). Occupe 191 Ko sur le disque.
**Action:** À CONSERVER (documenté dans les conventions). **Pas un orphelin à supprimer.**

---

## 📋 Plan d'action — 5 tâches

### Tâche 1 : Mettre à jour la baseline pre-commit

**Fichier:** `scripts/pre-commit.sh`
**Action:** `BASELINE=16` → `BASELINE=18`
**Vérification:** `grep -c "const.*= lazy" frontend/src/App.tsx` → 18

### Tâche 2 : Supprimer le CSS mort `.vtt-board-panel`

**Fichier:** `frontend/src/styles/reset.css`
**Action:** Supprimer `.vtt-board-panel,\n` de la règle de reset.

**Fichier:** `frontend/src/styles/shell-gm.css`
**Action:** Supprimer le bloc de règles `.vtt-board-panel { ... }` (ligne 136 et ses propriétés).

### Tâche 3 : Réparer le CSS de QuickActions

**Fichier:** `frontend/src/styles/shell-gm.css`
**Action:** Renommer `.quick-actions-panel` → `.quick-actions` et `.quick-actions-panel-compact` → `.quick-actions-compact` pour matcher le `className` utilisé dans `QuickActions.tsx`.

### Tâche 4 : Corriger le script `audit-orphans.py`

**Fichier:** `scripts/audit-orphans.py`
**Action:** Ajouter une passe qui lit `App.tsx`, extrait tous les `lazy(() => import("./components/X"))`, et les marque comme « référencés ». Le compteur d'orphelins doit exclure ces composants.

**Logique à ajouter :**
```python
# Extraire les composants lazy-loadés
lazy_components = set()
with open("frontend/src/App.tsx") as f:
    for line in f:
        m = re.search(r'import\("\./components/(\w+)"\)', line)
        if m:
            lazy_components.add(m.group(1))
# ... puis dans la boucle d'audit :
# if component_name in lazy_components: continue  # pas orphelin
```

### Tâche 5 : Vérification finale

```bash
# Vérifier que le pre-commit passe
cd /opt/data/workspace/DnD
bash scripts/pre-commit.sh --quick

# Vérifier que tsc + build passent
cd frontend && npx tsc --noEmit && npm run build

# Vérifier que le script d'audit ne produit plus de faux positifs
python3 scripts/audit-orphans.py
```

---

## Ordre d'exécution

```
Tâche 1 → Tâche 2 → Tâche 3 → Tâche 4 → Tâche 5
```

Toutes sur la même branche `agent/fix/orphan-cleanup`.

---

## Classification : feature à développer vs vieux code à supprimer

| Élément | Classification | Action |
|---------|---------------|--------|
| `.vtt-board-panel` CSS | Vieux code (VttBoard supprimé) | **Supprimer** |
| `.quick-actions-panel` CSS | Bug (mismatch nom) | **Renommer** (corriger) |
| `BASELINE=16` | Désynchro | **Mettre à jour** |
| `audit-orphans.py` | Bug (faux positifs) | **Corriger** |
| `styles.css` (191Ko) | Backup intentionnel | **Conserver** |
| `/api/.../audit` | Debug endpoint | **Conserver** |
