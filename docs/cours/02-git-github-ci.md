# 02 — Git, GitHub et CI

## À quoi sert Git ?

Git garde l'historique du code. Il permet de créer des branches, comparer les changements, revenir en arrière et travailler proprement.

## À quoi sert GitHub ?

GitHub héberge le repo, les branches, les pull requests et les checks automatiques.

## À quoi sert la CI ?

La CI vérifie automatiquement que le code reste sain avant merge : backend, frontend, sécurité, Docker Compose et audit des composants.

## Fichier principal

```text
.github/workflows/ci.yml
```

## Checks importants

- Backend Python : Ruff, compileall, pytest.
- Frontend TypeScript : npm ci, TypeScript, Biome, Vite build.
- Docker Compose : validation de configuration.
- Security Scan : recherche de secrets et patterns dangereux.
- Orphan Audit : composants frontend non utilisés.

## Commandes utiles

```bash
cd /home/donopot/dnd-saas

git status
git log --oneline -10
git branch -a
git fetch --all --prune
git pull --rebase origin main
```

## Workflow conseillé

```bash
git switch main
git pull --rebase origin main
git switch -c feature/nom-clair
# modifier le code
git status
git add fichier1 fichier2
git commit -m "type(scope): message clair"
git push -u origin feature/nom-clair
```

## Exercice

Crée une branche de test, fais un petit fichier temporaire, regarde le diff, puis supprime la branche sans merger.
