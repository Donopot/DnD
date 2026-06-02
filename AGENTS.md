# AGENTS.md — Règles développeur pour agent IA

## Mission

Tu es un agent IA développeur senior travaillant sur le repo `Donopot/DnD`.

Ta priorité absolue est de développer proprement, sans casser le projet, sans écraser le travail existant, et sans modifier `main` directement.

Le projet est une application DnD SaaS / VTT avec :

- Frontend React + Vite + TypeScript
- Backend FastAPI Python
- PostgreSQL / MinIO / Redis
- Docker Compose
- WebSocket
- Interface MJ / joueur
- Gestion de campagnes, personnages, cartes, tokens, combat, journal, handouts

La branche stable est `main`.

---

## Règles Git obligatoires

1. Ne travaille jamais directement sur `main`.
2. Avant toute modification, pars toujours de `main` à jour :

```bash
git switch main
git pull origin main
```

3. Crée une branche dédiée pour chaque tâche :

```bash
git switch -c agent/<type>/<objectif-court>
```

4. Types de branches autorisés :

```
agent/fix/...
agent/feature/...
agent/ui/...
agent/backend/...
agent/db/...
agent/test/...
agent/docs/...
agent/refactor/...
agent/experiment/...
```

5. Une branche = une mission claire. Ne mélange pas plusieurs gros sujets.
6. Fais des commits courts, explicites et regroupés logiquement.

Exemples de messages de commit :

```
ui: simplify gm panel headers
fix: repair websocket auth validation
backend: add campaign permission checks
test: add smoke test for player invite flow
docs: document merge strategy
```

---

## Règles de sécurité

- Ne crée jamais de vrai secret dans le repo.
- Ne modifie jamais un fichier `.env` réel.
- Ne commit jamais : mot de passe, token, clé API, secret JWT, identifiant de production, URL privée sensible.
- Utilise uniquement des fichiers exemple comme `.env.example`.
- Si une variable d'environnement est nécessaire, ajoute-la dans `.env.example` avec une valeur factice.

Exemple :

```
JWT_SECRET=change-me-in-production
```

---

## Règles de modification du code

- Ne modifie que les fichiers nécessaires à la tâche.
- Ne réécris pas toute l'architecture sans demande explicite.
- Ne supprime pas du code existant sauf si tu expliques pourquoi.
- Ne remplace pas brutalement un fichier entier si une modification ciblée suffit.
- Préserve la compatibilité avec l'existant.
- Respecte le style du projet.
- Si tu touches une API backend, vérifie que le frontend reste compatible.
- Si tu touches le frontend, vérifie que les routes et composants existants ne sont pas cassés.
- Si tu touches WebSocket, vérifie le comportement MJ + joueur.
- Si tu touches Docker, explique précisément l'impact.

---

## Fichiers sensibles

Modifier avec prudence :

- `docker-compose.yml`
- `.env.example`
- `backend/app/main.py`
- `backend/app/routers/*`
- `backend/app/models/*`
- `backend/app/database*`
- `backend/migrations/*`
- `frontend/src/App.tsx`
- `frontend/src/index.css`
- `frontend/src/main.tsx`
- `frontend/src/components/*`

Avant de modifier ces fichiers :
1. Expliquer pourquoi la modification est nécessaire.
2. Limiter le changement au strict nécessaire.
3. Vérifier les impacts.

---

## Règles backend

Si tu modifies le backend :

- Respecte l'architecture FastAPI existante.
- Ne casse pas les routes existantes.
- Ajoute ou adapte les tests quand c'est pertinent.
- Vérifie les permissions : MJ, co-MJ, joueur, propriétaire de personnage.
- Vérifie que les endpoints ne permettent pas d'accéder aux données d'une autre campagne.
- Garde les erreurs HTTP propres : 400, 401, 403, 404, 500.
- Si tu ajoutes une migration, elle doit être cohérente, réversible si possible, et documentée.

---

## Règles frontend

Si tu modifies le frontend :

- Respecte React + TypeScript.
- Ne casse pas le build Vite.
- Ne laisse pas d'import inutilisé.
- Ne crée pas de composant orphelin.
- Évite les gros fichiers illisibles.
- Sépare clairement : logique métier, composants UI, appels API, état local.

Pour l'interface MJ / VTT :
- Éviter les doubles headers de panneaux.
- Garder les panneaux déplaçables lisibles.
- Préserver fermer / réduire / dock / rouvrir.
- Ne pas bloquer la carte.
- Garder une interface utile en session réelle.

---

## Tests à lancer

Backend :

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
pytest --tb=short -q
```

Frontend :

```bash
cd frontend
npm ci
npx tsc --noEmit
npm run build
```

Docker :

```bash
cp .env.example .env
docker compose config --quiet
```

Si un test ne peut pas être lancé, l'agent doit l'indiquer clairement et expliquer pourquoi.

---

## Documentation

Mettre à jour la documentation si modification de :

- Commande de lancement
- Variable d'environnement
- Route API
- Fonctionnalité utilisateur
- Logique de permission
- Docker
- Panneaux UI
- Workflow de développement

La documentation doit être claire, réutilisable et placée dans `docs/` si possible.

---

## Rapport final obligatoire

À la fin de chaque mission, fournir :

```
## Branche
agent/<type>/<objectif>

## Résumé
...

## Fichiers modifiés
- ...

## Tests exécutés
- ...

## Résultat
...

## Risques
- ...

## Prochaine étape
...
```

---

## Règles de merge

**Ne jamais merger dans main sans validation humaine.**

Workflow attendu :

```
agent/<type>/<objectif>
        ↓
Pull Request
        ↓
validation humaine
        ↓
integration/ai si nécessaire
        ↓
main
```

- Pour une grosse fonctionnalité, proposer une PR vers `integration/ai`.
- Pour une petite correction sûre, proposer une PR vers `main`, mais ne pas merger sans validation.

---

## Règle absolue

Si une action peut casser le projet, supprimer des données, modifier la production, toucher aux secrets ou réécrire une partie importante de l'architecture, l'agent doit s'arrêter et demander validation avant d'agir.

Le code livré doit être propre, testable, documenté, sécurisé et facile à merger.
