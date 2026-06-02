# Roadmap technique backend-first

## Objectif

Cette roadmap remplace la logique précédente centrée uniquement sur les panneaux GM.

Le projet dispose déjà d'un socle backend utilisable : authentification, campagnes, membres, personnages, scènes, tokens, assets, WebSocket de session et combat minimal. La priorité devient donc de solidifier le backend autour des données persistantes nécessaires à l'interface GM.

## Principe directeur

Avant d'ajouter de nouveaux panneaux GM, on stabilise les données serveur que ces panneaux doivent consommer.

Ordre cible :

1. rendre le backend testable et sûr ;
2. persister les Notes MJ ;
3. persister les layouts et réglages de campagne ;
4. construire les documents révélables ;
5. construire la bibliothèque de tokens ;
6. connecter ensuite les panneaux GM aux APIs stables ;
7. reprendre l'interface joueur seulement après stabilisation GM + backend.

## État backend existant à conserver

Le backend actuel doit être renforcé, pas remplacé.

Modules déjà présents :

- FastAPI ;
- PostgreSQL via asyncpg ;
- migrations SQL au démarrage ;
- MinIO / S3-compatible ;
- auth JWT ;
- campagnes et membres ;
- invitations ;
- personnages ;
- scènes VTT ;
- tokens de scène ;
- assets ;
- journal/session ;
- WebSocket ;
- rencontres/combatants/initiative backend.

Conséquence :

- ne pas recréer un deuxième backend de combat ;
- ne pas recréer un deuxième système de fichiers ;
- ne pas recréer un deuxième système de rôles ;
- ajouter des routers spécialisés et cohérents avec l'existant.

## Règles de développement backend

Chaque nouvelle brique backend doit respecter :

- une migration SQL dédiée ;
- des schemas Pydantic dédiés ;
- un router FastAPI dédié si le domaine est nouveau ;
- des permissions basées sur les rôles campagne existants ;
- des tests ou scripts smoke ;
- une documentation dans ce dossier ;
- un commit clair ;
- une validation Docker.

## Gouvernance migrations

Le repo utilise déjà des migrations SQL appliquées au démarrage.

Règles :

- une migration = une intention métier ;
- nommer les migrations de façon monotone ;
- ne jamais modifier une migration déjà mergée ;
- ajouter seulement de nouvelles migrations ;
- éviter les changements destructifs sans étape de transition ;
- ajouter les indexes dès la création de la table si le volume futur est évident ;
- garder les données JSONB pour les structures évolutives, pas pour les données relationnelles simples.

Convention proposée :

```text
backend/app/migrations/00X_feature_name.sql
```

## Gouvernance CI / validation

Chaque sprint backend doit passer :

```bash
python -m compileall backend/app

# si pytest est installé
pytest -q || true

docker compose up -d --build
sh scripts/wait-api.sh
curl -fsS http://127.0.0.1:8091/api/health
```

À mettre en place dans BE-0 :

- script smoke backend authentifié ;
- vérification health ;
- register/login/me ;
- création campagne ;
- création personnage ;
- création scène ;
- création token ;
- création rencontre ;
- ajout combattant ;
- start encounter ;
- next turn.

## Feature flags et rollout

Les nouvelles fonctions backend doivent pouvoir être activées progressivement.

Flags proposés :

```text
backend_gm_notes_enabled
backend_gm_layouts_enabled
campaign_settings_enabled
document_reveal_enabled
token_library_enabled
```

Version simple au départ : variables d'environnement.

Version cible : table `feature_flags` ou settings campagne.

Règle frontend :

- si API disponible et flag actif : utiliser backend ;
- si API indisponible pour Notes/Layout : fallback local temporaire ;
- afficher clairement les données locales non synchronisées.

# Roadmap backend prioritaire

## BE-0 - Stabilisation backend et smoke tests

### Objectif

Rendre le backend vérifiable avant toute nouvelle brique métier.

### Livrables

- script `scripts/smoke-backend.sh` ;
- script Python ou shell pour cycle complet API ;
- documentation `docs/backend-smoke-tests.md` ;
- vérification que les migrations s'appliquent sur base fraîche ;
- vérification Docker complète ;
- inventaire des endpoints existants.

### Smoke flow minimal

1. health ;
2. register user GM ;
3. login ;
4. auth/me ;
5. create campaign ;
6. list campaigns ;
7. create character ;
8. create scene ;
9. create token ;
10. update token ;
11. create encounter ;
12. create combatant ;
13. start encounter ;
14. next turn.

### Critères d'acceptation

- backend démarre en Docker ;
- `/api/health` retourne database ok et object_storage ok ;
- smoke script retourne 0 ;
- aucune régression sur frontend build ;
- documentation mise à jour.

### Dépendances

Aucune.

### Statut

Prochaine étape immédiate.

## BE-1 - Notes MJ persistantes

### Objectif

Remplacer progressivement les notes locales navigateur par une API serveur.

### Modèle de données

Table proposée : `gm_notes`.

Champs :

- id ;
- campaign_id ;
- scene_id nullable ;
- token_id nullable ;
- author_user_id ;
- title ;
- content ;
- visibility : `gm_team` ou `author_only` ;
- version ;
- created_at ;
- updated_at.

### Endpoints

```text
GET    /api/campaigns/{campaign_id}/gm-notes
POST   /api/campaigns/{campaign_id}/gm-notes
GET    /api/gm-notes/{note_id}
PATCH  /api/gm-notes/{note_id}
DELETE /api/gm-notes/{note_id}
```

### Permissions

- GM : CRUD complet ;
- co-GM : CRUD complet ou limité selon visibilité ;
- joueur : aucun accès.

### Frontend associé

Panneau concerné : Notes MJ.

Comportement :

- charger depuis API ;
- si API indisponible, fallback localStorage temporaire ;
- proposer import d'une note locale vers serveur ;
- afficher l'état `local uniquement` ou `synchronisé`.

### Critères d'acceptation

- migration appliquée ;
- endpoints CRUD OK ;
- permissions testées ;
- note liée à campagne/scène/token ;
- version incrementée à chaque update ;
- frontend conserve la note après refresh et changement navigateur.

## BE-2 - Layouts GM persistants

### Objectif

Sauvegarder les layouts de panneaux côté serveur par utilisateur et campagne.

### Modèle de données

Table proposée : `gm_workspace_layouts`.

Champs :

- id ;
- campaign_id ;
- user_id ;
- name ;
- layout_key ;
- data jsonb ;
- is_default ;
- version ;
- created_at ;
- updated_at.

### Endpoints

```text
GET    /api/campaigns/{campaign_id}/gm-layouts
POST   /api/campaigns/{campaign_id}/gm-layouts
PATCH  /api/gm-layouts/{layout_id}
DELETE /api/gm-layouts/{layout_id}
```

### Frontend associé

- menu Panneaux ;
- sauvegarde layout actuel ;
- preset personnalisé ;
- restauration après connexion sur autre poste.

### Critères d'acceptation

- layout sauvegardé sur serveur ;
- layout restauré après refresh ;
- layout restauré sur autre navigateur avec même compte ;
- localStorage reste un cache, pas la source de vérité.

## BE-3 - Paramètres campagne

### Objectif

Centraliser les réglages de campagne qui influencent l'interface GM et joueur.

### Modèle de données

Table proposée : `campaign_settings`.

Champs initiaux :

- campaign_id ;
- dice_visibility ;
- allow_player_token_move ;
- show_player_hp ;
- show_token_names ;
- fog_enabled ;
- game_system ;
- extra jsonb ;
- updated_by_user_id ;
- updated_at.

### Endpoints

```text
GET   /api/campaigns/{campaign_id}/settings
PATCH /api/campaigns/{campaign_id}/settings
```

### Frontend associé

- onglet Paramètres ;
- permissions joueurs ;
- visibilité tokens ;
- options jets ;
- options brouillard.

### Critères d'acceptation

- settings créés automatiquement avec valeurs par défaut ;
- GM/co-GM peuvent modifier ;
- joueurs lisent seulement la projection publique si nécessaire ;
- modification propagée au frontend après refresh.

## BE-4 - Documents révélables

### Objectif

Construire un système de handouts/documents révélables au-dessus des assets existants.

### Modèles de données

Tables proposées :

- campaign_documents ;
- campaign_document_grants ;
- campaign_document_events.

### Endpoints

```text
GET    /api/campaigns/{campaign_id}/documents
POST   /api/campaigns/{campaign_id}/documents
PATCH  /api/documents/{document_id}
POST   /api/documents/{document_id}/reveal
POST   /api/documents/{document_id}/hide
GET    /api/documents/{document_id}/download
```

### Permissions

- GM/co-GM : CRUD et révélation ;
- joueur : lecture uniquement si document révélé à lui ou à tous.

### Frontend associé

- futur panneau Documents révélables ;
- journal de révélation ;
- lien avec assets/MinIO.

### Critères d'acceptation

- document privé invisible joueur ;
- document révélé visible joueur ;
- révocation possible ;
- événements historisés ;
- download protégé par permissions.

## BE-5 - Bibliothèque tokens et conditions normalisées

### Objectif

Ajouter des tokens réutilisables et préparer une meilleure intégration combat/tokens.

### Modèles de données

Tables proposées :

- token_library_items ;
- token_library_favorites ;
- condition_definitions ;
- token_conditions ou combatant_conditions selon arbitrage ;
- lien amélioré token/combatant si nécessaire.

### Endpoints token library

```text
GET    /api/campaigns/{campaign_id}/token-library
POST   /api/campaigns/{campaign_id}/token-library
PATCH  /api/token-library/{item_id}
DELETE /api/token-library/{item_id}
POST   /api/token-library/{item_id}/favorite
POST   /api/token-library/{item_id}/spawn
```

### Frontend associé

- Bibliothèque tokens ;
- Ajout token amélioré ;
- favoris ;
- derniers utilisés ;
- spawn sur scène.

### Critères d'acceptation

- item bibliothèque créé ;
- item favori par utilisateur ;
- spawn crée un vrai scene_token ;
- conditions normalisées prêtes pour combat et visibilité ;
- pas de duplication inutile avec scene_tokens.

# Alignement frontend GM

## À suspendre pour l'instant

- nouveaux panneaux lourds sans backend ;
- Initiative locale séparée du backend combat ;
- systèmes persistants uniquement localStorage.

## À reprendre après BE-1

- Notes MJ serveur ;
- indicateur de synchronisation ;
- import localStorage vers serveur.

## À reprendre après BE-2

- sauvegarde layout actuel côté serveur ;
- presets personnalisés par compte ;
- reset layout serveur.

## À reprendre après BE-3

- onglet Paramètres réel ;
- options campagne ;
- permissions joueurs.

## À reprendre après BE-4

- panneau Documents révélables ;
- révéler/cacher aux joueurs ;
- historique.

## À reprendre après BE-5

- Bibliothèque tokens ;
- spawn token ;
- favoris ;
- préparation scènes améliorée.

# Séquence recommandée immédiate

1. Créer branche `feature/be-0-backend-stabilization`.
2. Ajouter smoke tests backend.
3. Valider Docker + health.
4. Merger BE-0.
5. Créer branche `feature/be-1-gm-notes`.
6. Ajouter migration, schemas, router et tests Notes MJ.
7. Connecter le frontend Notes MJ.

# Définition de fini générale

Une phase backend est terminée seulement si :

- migrations OK sur base fraîche ;
- app démarre ;
- health OK ;
- smoke OK ;
- endpoints documentés ;
- permissions testées ;
- frontend compatible ;
- documentation mise à jour ;
- commit + push effectués.

# Mode opératoire développeur

À chaque nouvelle étape :

1. lire l'état Git ;
2. créer une branche courte ;
3. modifier migration/schema/router/service ;
4. ajouter ou mettre à jour les scripts ;
5. lancer validation ;
6. documenter ;
7. commit ;
8. indiquer clairement la prochaine étape.

Ce document devient la source de vérité pour les prochaines phases backend-first.