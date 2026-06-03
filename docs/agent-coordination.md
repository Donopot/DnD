# Coordination Codex / Hermes

Ce document est destine aux agents IA qui interviennent sur `Donopot/DnD`.
Il ne remplace pas `AGENTS.md` ni `docs/developer-toolchain.md`; il sert a
coordonner les passations entre agents et a eviter les doublons, conflits et
corrections partielles.

## Objectif

- Partager rapidement l'etat exact du travail entre Codex, Hermes et tout agent
  futur.
- Garder une trace exploitable des decisions techniques, risques et limites de
  verification.
- Eviter de travailler sur une base locale sale, en retard ou differente de
  `origin/main`.

## Regle de depart

Avant toute mission, l'agent doit etablir son contexte:

```bash
git status --short --branch
git log --oneline --decorate -5
git fetch origin
```

Si le workspace local est sale ou tres en retard, creer une worktree propre
depuis `origin/main` et y travailler. Ne jamais nettoyer, reset ou supprimer les
changements d'un autre agent sans demande explicite.

## Branches et ownership

- `main` reste stable et ne doit pas etre modifie directement.
- Codex utilise par defaut `codex/<objectif-court>`.
- Hermes utilise par defaut `agent/<type>/<objectif-court>` ou sa convention
  deja active.
- Une branche ne doit contenir qu'une mission claire.
- Si une branche existe deja pour le meme sujet, l'agent doit la lire avant de
  creer une nouvelle branche.

## Handoff obligatoire

Quand un agent termine ou laisse une mission incomplete, il doit laisser un
resume court dans la PR, le ticket, ou le message final. Le format attendu:

```markdown
## Etat
Termine | Partiel | Bloque

## Base
- Branche:
- Commit de depart:
- Commit final:

## Changements
- ...

## Tests
- Commande: resultat
- Commande non lancee: raison

## Risques / suites
- ...
```

## Review entre agents

Un agent qui relit le travail d'un autre doit verifier dans cet ordre:

1. Le diff correspond-il exactement a la mission annoncee ?
2. Les fichiers sensibles sont-ils limites au strict necessaire ?
3. Les permissions backend sont-elles verifiees cote serveur ?
4. Les caches ne contournent-ils pas les controles d'acces ?
5. Le frontend reste-t-il compatible avec les schemas API ?
6. Les workflows CI et pre-commit utilisent-ils la toolchain canonique ?
7. Les tests couvrent-ils le risque modifie ?

Les findings doivent etre classes `P0`, `P1`, `P2`, `P3`, avec un lien fichier
et une ligne precise.

## Zones a risque connues

- Auth, JWT, invites et roles campagne.
- Endpoints VTT: scenes, tokens, fog of war, WebSocket.
- Donnees visibles aux joueurs: handouts, metadata tokens, journal, messages.
- Cache Redis: toujours controler les permissions avant de retourner une valeur
  cachee ou inclure le role dans la cle.
- Markdown rendu avec HTML: sanitizer obligatoire si `dangerouslySetInnerHTML`
  est utilise.
- CI/toolchain: `docs/developer-toolchain.md` doit rester coherent avec
  `.github/workflows/ci.yml` et `scripts/pre-commit.sh`.

## Quand demander validation humaine

Demander validation avant de:

- modifier la strategie de migration DB;
- toucher aux secrets, `.env`, volumes ou donnees de production;
- changer les roles ou permissions applicatives;
- reecrire une surface frontend majeure;
- merger, fermer ou supprimer une branche/PR d'un autre agent;
- lancer une commande destructive.

## Regle finale

Un agent ne doit jamais masquer une incertitude. Si une verification n'a pas pu
etre executee, il faut l'indiquer clairement avec la raison et la commande qui
aurait du etre lancee.
