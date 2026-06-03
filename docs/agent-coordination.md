# Agent Coordination Protocol — DnD VTT

Ce document est destiné aux agents IA (Codex, Hermes, ou tout agent futur)
qui interviennent sur `Donopot/DnD`. Il ne remplace pas `AGENTS.md` ni
`docs/developer-toolchain.md` ; il sert à coordonner les passations entre
agents et à éviter les doublons, conflits et corrections partielles.

Il est **contraignant** — tout agent doit le lire avant de commencer une mission.

---

## 0. Règle de départ

Avant toute mission, l'agent établit son contexte :

```bash
git status --short --branch
git log --oneline --decorate -5
git fetch origin
```

Si le workspace local est sale ou très en retard, créer une **worktree propre**
depuis `origin/main` et y travailler. **Ne jamais nettoyer, reset ou supprimer
les changements d'un autre agent sans demande explicite.**

---

## 1. Registre des branches actives

### 1.1 Vérification obligatoire

```bash
# Lister les branches agent/* et codex/* actives (locales + remote)
git branch -a | grep -E '(agent/|codex/)'

# Vérifier les PRs ouvertes (si gh CLI disponible)
gh pr list --state open 2>/dev/null || \
  echo "gh CLI non installé — vérifier https://github.com/Donopot/DnD/pulls"
```

### 1.2 Conventions de nommage

| Agent  | Convention                  | Exemple                              |
|--------|-----------------------------|--------------------------------------|
| Hermes | `agent/<type>/<objectif>`   | `agent/fix/security-p1`             |
| Codex  | `codex/<objectif-court>`    | `codex/fix-ci-workflows`            |
| Autre  | `agent/<type>/<objectif>`   | `agent/feature/dark-mode`           |

Types autorisés : `fix`, `feature`, `ui`, `backend`, `db`, `test`, `docs`, `refactor`, `experiment`.

### 1.3 Règles de collision

| Situation | Règle |
|-----------|-------|
| Branche `fix/*` existe sur le même module | Attendre le merge du fix avant de créer une feature |
| Branche `feature/*` existe sur le même module | Ne pas ouvrir de 2e feature — attendre ou proposer un merge partiel |
| Branche `docs/*` | Pas de restriction (la doc peut évoluer en parallèle) |
| PR ouverte depuis > 48h sans merge | L'agent peut proposer de reprendre, pas de force-push |
| Branche d'un autre agent existe pour le même sujet | Lire la branche existante avant d'en créer une nouvelle |

### 1.4 Fichiers à risque

Si deux branches modifient le même fichier sensible, la 2e branche **doit**
attendre le merge de la 1re :

```
backend/app/routers/vtt.py
backend/app/routers/session.py
backend/app/routers/characters.py
backend/app/routers/handouts.py
frontend/src/App.tsx
frontend/src/components/CampaignMap.tsx
docker-compose.yml
.github/workflows/ci.yml
```

---

## 2. Convention des plans

### 2.1 Emplacement

Tous les plans d'implémentation vont dans `.hermes/plans/`.

### 2.2 Nommage

```
.hermes/plans/YYYY-MM-DD-<sujet-court>.md
```

### 2.3 Structure minimale

```markdown
# <Titre>

## Objectif
Une phrase.

## Tâches
- [ ] Tâche 1 — fichier(s) touché(s)
- [ ] Tâche 2 — fichier(s) touché(s)

## Ordre d'exécution
1. Lot 1 : ...
2. Lot 2 : ...

## Vérification
- [ ] Backend tests pass
- [ ] Frontend build OK
- [ ] Orphan audit clean

## Branche
agent/<type>/<sujet-court>

## Agent
<nom ou identifiant>
```

---

## 3. Protocole de conflit

Quand un agent détecte un conflit potentiel :

### 3.1 Détection

- **Fichier modifié par une autre branche** → `git log --oneline origin/<autre-branche>`
- **PR ouverte sur le même scope** → ne pas créer de branche concurrente
- **`.hermes/plans/` contient un plan actif sur le même sujet** → collaborer, pas forker

### 3.2 Résolution

| Conflit | Action agent |
|---------|-------------|
| Même fichier, branches complémentaires | Signaler à l'humain, proposer un ordre de merge |
| Même fichier, branches incompatibles | Ne pas créer la branche — demander arbitrage |
| Même scope fonctionnel | Attendre ou proposer `integration/ai` comme cible commune |
| Plan existant non complété | Lire le plan, reprendre les tâches restantes |

### 3.3 Signalement

Tout conflit est signalé dans le **rapport final** sous la section `## Risques`.

---

## 4. Review entre agents

Un agent qui relit le travail d'un autre doit vérifier dans cet ordre :

1. Le diff correspond-il exactement à la mission annoncée ?
2. Les fichiers sensibles sont-ils limités au strict nécessaire ?
3. Les permissions backend sont-elles vérifiées côté serveur ?
4. Les caches ne contournent-ils pas les contrôles d'accès ?
5. Le frontend reste-t-il compatible avec les schémas API ?
6. Les workflows CI et pre-commit utilisent-ils la toolchain canonique ?
7. Les tests couvrent-ils le risque modifié ?

Les findings doivent être classés `P0`, `P1`, `P2`, `P3`, avec un lien fichier
et une ligne précise.

---

## 5. Format de handoff

Quand un agent termine ou laisse une mission incomplète, il doit laisser un
résumé dans la PR, le ticket, ou le message final.

### 5.1 Handoff standard

```markdown
## Handoff — agent/<type>/<sujet> (ou codex/<sujet>)

### État
Terminé | Partiel | Bloqué

### Contexte
- Branche : agent/<type>/<sujet>
- Commit final : <sha>
- PR : <url> (si ouverte)

### Tâches
- [x] Tâche 1 — complétée
- [ ] Tâche 2 — en attente (raison)
- [ ] Tâche 3 — non commencée

### Fichiers modifiés
- backend/app/routers/vtt.py — +150 lignes (fog endpoints)
- frontend/src/components/FogLayer.tsx — nouveau
- tests/test_vtt_permissions.py — +30 tests

### Tests exécutés
- uv run pytest --tb=short -q → 115 passed
- npx tsc --noEmit → 0 errors
- npm run build → OK

### Points d'attention
- Le cache Redis doit être flushé après déploiement
- La migration 016 dépend de 015 (ordre important)

### Commande de reprise
git checkout agent/<type>/<sujet>
uv run pytest --tb=short -q
```

### 5.2 Où sauvegarder

Le handoff est sauvegardé dans `.hermes/handoffs/` :

```
.hermes/handoffs/YYYY-MM-DD-<agent>-<sujet>.md
```

---

## 6. Règles de précédence

Quand plusieurs tâches sont en file d'attente, l'ordre est :

1. **`fix/security-*`** — vulnérabilités P0/P1 (bloquant)
2. **`fix/*`** — bugs fonctionnels
3. **`test/*`** — couverture de tests
4. **`backend/*`** — nouvelles routes / migrations
5. **`feature/*`** — nouvelles fonctionnalités
6. **`ui/*`** — améliorations UI
7. **`refactor/*`** — refactoring non urgent
8. **`docs/*`** — documentation

**Règle absolue** : un `fix/security-*` bloque tout le reste. Aucune feature
ne doit être mergée tant qu'un P1 de sécurité est ouvert.

---

## 7. Zones à risque connues

- **Auth** : JWT, invites, rôles campagne, rate limiting.
- **Endpoints VTT** : scènes, tokens, fog of war, WebSocket.
- **Données visibles aux joueurs** : handouts, metadata tokens, journal, messages.
- **Cache Redis** : toujours contrôler les permissions avant de retourner une
  valeur cachée, ou inclure le rôle dans la clé.
- **Markdown + HTML** : sanitizer obligatoire si `dangerouslySetInnerHTML` est
  utilisé (`DOMPurify`).
- **CI/toolchain** : `docs/developer-toolchain.md` doit rester cohérent avec
  `.github/workflows/ci.yml` et `scripts/pre-commit.sh`. La baseline orphelins
  doit être identique dans les deux.

---

## 8. Quand demander validation humaine

Demander validation avant de :

- modifier la stratégie de migration DB ;
- toucher aux secrets, `.env`, volumes ou données de production ;
- changer les rôles ou permissions applicatives ;
- réécrire une surface frontend majeure ;
- merger, fermer ou supprimer une branche/PR d'un autre agent ;
- lancer une commande destructive.

---

## 9. Session active — tracking

### 9.1 Fichier de session

Chaque agent maintient un fichier de session dans `.hermes/sessions/` :

```
.hermes/sessions/<agent>-<date>.md
```

Contenu minimal :

```markdown
# Session hermes — 2026-06-03

## Branche active
agent/fix/security-p1

## État
- [x] P1.1 Handout cache fix
- [ ] P1.2 Scene/fog cache bypass → en cours

## Bloqueurs
Aucun.

## Prochaine action
Commit + push → PR.
```

### 9.2 Nettoyage

Les sessions mergées depuis > 7 jours peuvent être archivées dans
`.hermes/archive/`.

---

## 10. Règle finale

Un agent ne doit jamais masquer une incertitude. Si une vérification n'a pas pu
être exécutée, il faut l'indiquer clairement avec la raison et la commande qui
aurait dû être lancée.

---

## 11. Références

| Document | Contenu |
|----------|---------|
| `AGENTS.md` | Règles individuelles (git, sécurité, toolchain, tests) |
| `docs/developer-toolchain.md` | Commandes canoniques obligatoires |
| `docs/deployment.md` | Procédure de déploiement HP Mini |
| `.hermes/plans/` | Plans d'implémentation |
| `.hermes/handoffs/` | Handoffs entre agents |
| `.hermes/sessions/` | Sessions actives |
| `.hermes/archive/` | Sessions archivées |
