# Developer toolchain — normes obligatoires

Ce document est la **source unique de vérité** pour la toolchain du projet.
Toute CI, tout agent IA, tout développeur doit s'y conformer.

---

## Python / Backend

| Outil | Obligatoire | Usage |
|-------|:-----------:|-------|
| **uv** | ✅ | Gestionnaire de paquets et d'environnement Python |
| **ruff** | ✅ | Linting + formatting Python |
| **pytest** | ✅ | Tests unitaires backend |

### Commandes canoniques

```bash
cd backend

# Installer les dépendances (reproductible, lock via uv.lock)
uv sync

# Lint
uv run ruff check .

# Compilation check
uv run python -m compileall -q app

# Tests
uv run pytest --tb=short -q
```

### Interdit

- `pip install` (pas reproductible, pas de lock)
- `python -m venv` manuel
- `python3` nu — toujours passer par `uv run python`

---

## TypeScript / Frontend

| Outil | Obligatoire | Usage |
|-------|:-----------:|-------|
| **Node** via `.node-version` | ✅ | Version Node — le fichier `frontend/.node-version` fait foi |
| **npm ci** | ✅ | Installation reproductible (basée sur `package-lock.json`) |
| **tsc** | ✅ | Type-checking |
| **Biome** | ✅ | Linting + formatting (si présent dans `package.json`) |
| **Vite** | ✅ | Build de production |

### Commandes canoniques

```bash
cd frontend

# Installer (reproductible)
npm ci

# TypeScript check
npx tsc --noEmit

# Lint
npx biome check --max-diagnostics=50 .

# Build
npm run build
```

### Interdit

- Version Node hardcodée dans la CI (`node-version: "22"`) — toujours utiliser `node-version-file: frontend/.node-version`
- `tsc -b` (mode project references, non configuré dans ce projet)
- `npm install` — utiliser `npm ci` pour la reproductibilité

---

## Docker

```bash
cp .env.example .env
docker compose config --quiet   # validation
docker compose up -d --build    # déploiement
```

---

## CI (GitHub Actions)

Les workflows CI **doivent** utiliser les mêmes commandes canoniques que ci-dessus.
Pas de variante « quick and dirty » — la cohérence locale ↔ CI est obligatoire.

### Règles CI

1. Backend : `uv` (via `astral-sh/setup-uv@v5`), pas `pip`
2. Frontend : `node-version-file`, pas `node-version` hardcodé
3. Orphan audit : `python3 scripts/audit-orphans.py frontend/src` (passer le path explicitement)
4. Baseline orphelins : la valeur dans `scripts/pre-commit.sh` fait foi — la CI doit utiliser la même

---

## Pré-commit local

```bash
./scripts/pre-commit.sh          # complet (pytest + build)
./scripts/pre-commit.sh --quick  # rapide (lint + tsc + orphan audit)
```

La baseline orphelins dans `scripts/pre-commit.sh` **doit** correspondre à celle de la CI.

---

## Pourquoi ces règles

| Règle | Raison |
|-------|--------|
| `uv` pas `pip` | Lock reproductible (`uv.lock`), résolution rapide, pas de venv manuel |
| `.node-version` pas hardcodé | Une seule source de vérité, CI suit automatiquement |
| `tsc --noEmit` pas `tsc -b` | Le projet n'utilise pas les project references TypeScript |
| `npm ci` pas `npm install` | `package-lock.json` fait foi, build déterministe |
| Path explicite pour audit-orphans | Le fallback hardcodé ne fonctionne que localement |
