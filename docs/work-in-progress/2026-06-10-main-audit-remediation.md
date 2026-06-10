# Plan de remédiation après audit de `main`

> Statut : actif
> Audit de référence : branche `main`, commit `4a1561d`, 2026-06-10
> Objectif : fermer les failles d'autorisation, stabiliser les parcours carte/temps
> réel, puis terminer l'adoption du design system.

## 1. Règles d'exécution

- Ne pas mélanger sécurité, stabilisation fonctionnelle et polish UI dans une
  même PR.
- Toute permission critique doit être imposée par le backend. Le filtrage
  frontend seul n'est jamais une protection.
- Toute ressource chargée par UUID doit être revalidée contre la campagne de
  l'utilisateur courant.
- Chaque correctif P0/P1 doit ajouter un test de non-régression qui échoue avant
  le correctif.
- Les contrats REST et WebSocket doivent appliquer les mêmes permissions.
- Ne commencer le sprint UI qu'après validation des sprints sécurité et
  stabilité.

## 2. Synthèse des risques

| ID | Priorité | Risque | Zone principale |
|---|---|---|---|
| SEC-01 | P0 | Les scènes secrètes ne forment pas une frontière de sécurité | API scènes, tokens, fog, assets |
| SEC-02 | P0 | Des données MJ sont accessibles aux joueurs | Journal, personnages, rencontres |
| SEC-03 | P0 | Le déplacement WebSocket peut contourner campagne et réglages | WebSocket session |
| SEC-04 | P0 | Les messages privés sont diffusés à toute la campagne | Chat WebSocket |
| STAB-01 | P1 | Plusieurs appels frontend omettent le préfixe `/api` | Fog, homebrew |
| STAB-02 | P1 | Le panneau paramètres est inaccessible et les défauts divergent | Workspace, permissions |
| STAB-03 | P1 | Des abonnements WebSocket ne survivent pas toujours à une reconnexion | Chat, fog, carte |
| QA-01 | P1 | Les tests ne couvrent pas les frontières MJ/joueur | Backend et E2E |
| UI-01 | P2 | Navigation et dock exposent des vues mortes ou ambiguës | Shell MJ |
| UI-02 | P2 | Le design system documenté est peu adopté | Composants et CSS |
| TOOL-01 | P2 | La toolchain backend n'est pas reproductible | Python, uv, CI |

## 3. Sprint 1 - Fermer les frontières d'autorisation

**Branche conseillée :** `agent/fix/security-campaign-boundaries`
**Bloque :** toutes les fonctionnalités qui exposent des données joueur.

### 3.1 Scènes secrètes

Correctifs :

- Persister `is_secret` lors de `POST /api/campaigns/{campaign_id}/scenes`.
- Ajouter `is_secret` au schéma de mise à jour d'une scène.
- Ajouter `is_secret` au type frontend `Scene`.
- Ajouter un contrôle MJ explicite dans le panneau de scène.
- Refuser à un joueur l'accès direct à une scène secrète, même s'il connaît son
  UUID.
- Appliquer la même vérification aux tokens, au fog et aux assets associés.
- Quand une scène active devient secrète, la retirer immédiatement de la vue
  joueur et diffuser l'événement WebSocket adapté.

Tests obligatoires :

- Un MJ et un co-MJ peuvent créer, lire et modifier une scène secrète.
- Un joueur ne voit pas la scène dans la liste filtrée.
- Un joueur reçoit `404` ou `403` sur l'accès direct par UUID.
- Un joueur ne peut pas récupérer tokens, fog ou image de fond de cette scène.
- Le passage public vers secret retire la scène des clients joueur connectés.

### 3.2 Données MJ exposées

Correctifs :

- Filtrer l'export de journal selon la visibilité de chaque entrée.
- Créer un DTO joueur minimal pour les personnages non possédés.
- Restreindre la fiche complète au MJ, co-MJ, propriétaire ou utilisateur
  explicitement autorisé.
- Créer une représentation joueur d'une rencontre active.
- Ne jamais exposer les notes MJ, les rencontres brouillon, ni les statistiques
  masquées.
- Restreindre la liste et le téléchargement des assets selon leur usage et leur
  visibilité.

Tests obligatoires :

- Matrice de rôles `gm`, `co_gm`, `player propriétaire`, `player tiers`.
- Export journal sans entrée `gm_only` pour un joueur.
- Accès direct à une rencontre inactive refusé au joueur.
- Les champs privés ne sont pas seulement vides : ils sont absents du contrat.

### 3.3 Critères de sortie du sprint

- Chaque endpoint joueur possède au moins un test positif et un test de refus.
- Aucun endpoint générique ne contourne les endpoints joueur filtrés.
- Les réponses `403`/`404` ne révèlent pas l'existence de ressources d'une
  autre campagne.
- `uv run pytest --tb=short -q` passe.

## 4. Sprint 2 - Sécuriser le temps réel

**Branche conseillée :** `agent/fix/websocket-permissions-privacy`
**Dépend de :** Sprint 1.

### 4.1 Déplacement de token

Correctifs :

- Extraire une fonction d'autorisation partagée par REST et WebSocket.
- Charger le token avec sa scène et sa campagne avant tout déplacement.
- Vérifier que la campagne du token correspond à celle de la socket.
- Pour un joueur, imposer `allow_player_token_move=true` et la propriété du
  token.
- Pour un MJ/co-MJ, imposer au minimum l'appartenance à la campagne.
- Valider `x`, `y`, `size` et `angle` avant l'écriture.
- Diffuser l'événement uniquement après une mise à jour réussie.

### 4.2 Messages privés

Correctifs :

- Remplacer le destinataire basé sur un nom d'affichage par un identifiant
  utilisateur stable.
- Ajouter une primitive de diffusion ciblée dans le gestionnaire WebSocket.
- Envoyer un whisper uniquement à l'émetteur, au destinataire et, si la règle
  produit le prévoit, aux MJ.
- Filtrer défensivement les messages côté frontend.
- Journaliser le type de message sans exposer son contenu dans les logs serveur.

### 4.3 Reconnexion et abonnements

Correctifs :

- Exposer un identifiant de génération de socket (`wsEpoch`) ou une API
  d'abonnement stable.
- Réattacher les écouteurs Chat, Fog et MapTools après chaque reconnexion.
- Éviter de recréer la connexion joueur à chaque changement de scène.
- Ajouter un backoff borné et un état visible `connecté / reconnexion / hors
  ligne`.

Tests obligatoires :

- Un joueur ne déplace pas un token d'une autre campagne.
- Un réglage désactivé bloque REST et WebSocket.
- Un whisper n'arrive jamais à un troisième joueur.
- Après coupure/reconnexion, chat, fog et déplacement fonctionnent encore.

## 5. Sprint 3 - Réparer les parcours fonctionnels

**Branche conseillée :** `agent/fix/frontend-api-settings`.

### 5.1 Appels API

- Corriger les routes fog vers `/api/scenes/{scene_id}/fog`.
- Corriger les suppressions et exports Homebrew vers `/api/...`.
- Centraliser la construction des URLs dans le client API.
- Interdire progressivement les chemins littéraux dans les composants et hooks.
- Ajouter un test qui vérifie qu'une réponse HTML SPA ne peut pas être traitée
  comme une réponse API valide.

### 5.2 Paramètres et valeurs par défaut

- Corriger le mapping navigation `settings` vers la catégorie `settings`.
- Définir une seule table de valeurs par défaut côté backend.
- Retourner les valeurs effectives dans l'API au lieu de laisser le frontend
  deviner les valeurs absentes.
- Aligner `show_initiative_to_players`, déplacement de token, modification PV,
  pan et fog.
- Ajouter une migration de normalisation des campagnes existantes si nécessaire.
- Afficher clairement au MJ l'effet de chaque permission.

### 5.3 Critères de sortie du sprint

- Fog : chargement, dessin, sauvegarde, rollback et synchronisation validés.
- Homebrew : suppression créature, suppression objet et export validés.
- Le panneau Paramètres est accessible depuis le rail.
- Les mêmes permissions effectives sont visibles côté frontend et appliquées
  côté backend.

## 6. Sprint 4 - Rendre la CI représentative

**Branche conseillée :** `agent/test/security-realtime-e2e`.

### 6.1 Backend

- Ajouter des fixtures multi-campagnes et multi-rôles.
- Remplacer les overrides inefficaces de `get_pool` par une stratégie cohérente
  avec les appels directs actuels, ou injecter réellement le pool.
- Tester les accès directs par UUID et pas uniquement les endpoints de liste.
- Ajouter les tests secrets, assets, journal, personnages, rencontres,
  déplacement WebSocket et whispers.
- Remplacer les valeurs mutables Pydantic par `Field(default_factory=...)`.

### 6.2 Frontend et E2E

- Réparer le smoke test qui attend `data-testid="campaign-card"`.
- Ajouter un parcours authentifié MJ : campagne, scène, carte, token, paramètres.
- Ajouter un parcours joueur : scène filtrée, token possédé, chat, reconnexion.
- Étendre l'accessibilité aux écrans authentifiés et aux panneaux principaux.
- Exécuter le contrôle des couleurs littérales dans la CI.

### 6.3 Toolchain

- Épingler Python 3.12 dans `.python-version`.
- Ajouter un `pyproject.toml` backend et un `uv.lock`.
- Utiliser `uv sync --frozen` dans la CI.
- Aligner strictement les commandes CI sur `docs/deployment-ops.md`.
- Documenter les prérequis certificat/proxy pour les machines locales.

Critères de sortie :

- Une PR ne peut pas merger si les tests d'autorisation ou E2E critiques
  échouent.
- Une installation propre utilise les versions verrouillées sans choisir une
  version Python implicite.
- Les statuts GitHub Actions sont visibles et requis sur `main`.

## 7. Sprint 5 - Simplifier et moderniser l'interface

**Branche conseillée :** `agent/ui/design-system-adoption`
**Dépend de :** Sprints 1 à 4.

### 7.1 Navigation et charge cognitive

- Retirer ou masquer les cinq onglets factices de `GmDock` tant qu'ils ne sont
  pas fonctionnels.
- Séparer explicitement les destinations Carte et Combat.
- Réduire le mode exploration à un noyau de panneaux utiles en session.
- Conserver les outils secondaires dans un catalogue ou un drawer, pas dans la
  vue active.
- Vérifier qu'aucun panneau ne masque les interactions de la carte.

### 7.2 Adoption du design system

- Généraliser `IconButton` pour les commandes icône et ajouter un tooltip
  accessible.
- Généraliser `Drawer` pour les outils secondaires.
- Remplacer les emojis d'interface par les icônes Lucide prévues par
  `docs/DESIGN.md`.
- Migrer les couleurs littérales vers les variables de palette.
- Unifier hauteurs, paddings, focus visible, états disabled et zones tactiles.
- Déplacer les styles embarqués des composants vers les feuilles structurées.
- Découper en priorité `PlayerView.tsx`, `App.tsx`, `CampaignMap.tsx` et
  `panelRenderer.tsx`.

Critères de sortie :

- Tous les boutons icône ont un nom accessible et un tooltip.
- Navigation clavier complète sur topbar, rail, dock, drawers et panneaux.
- Contraste WCAG AA sur les vues principales.
- Aucun onglet visible ne mène à un placeholder.
- La carte reste dominante sur desktop et tablette.

## 8. Découpage recommandé en PR

| Ordre | PR | Périmètre |
|---|---|---|
| 1 | `fix: enforce secret scene boundaries` | Scènes, tokens, fog, assets |
| 2 | `fix: filter player-visible campaign data` | Journal, personnages, rencontres |
| 3 | `fix: enforce websocket movement permissions` | Déplacement token REST/WS |
| 4 | `fix: make whispers private` | Diffusion ciblée et frontend |
| 5 | `fix: repair frontend api routes and settings` | Fog, homebrew, paramètres |
| 6 | `test: cover player security boundaries` | Backend, WS, multi-campagnes |
| 7 | `test: restore authenticated e2e coverage` | Smoke, MJ, joueur, a11y |
| 8 | `build: lock backend toolchain with uv` | Python 3.12, lockfile, CI |
| 9 | `ui: remove dead navigation and reduce live panels` | Navigation, dock, modes |
| 10 | `ui: adopt design system components and tokens` | Tooltips, icônes, CSS |

## 9. Checklist commune à chaque PR

- [ ] Périmètre limité à un risque ou un contrat.
- [ ] Test de non-régression ajouté.
- [ ] Matrice MJ/co-MJ/joueur vérifiée si une permission change.
- [ ] Isolation entre deux campagnes vérifiée.
- [ ] Contrats REST et WebSocket comparés.
- [ ] `cd backend && uv sync && uv run ruff check . && uv run pytest --tb=short -q`
- [ ] `cd frontend && npm ci && npx tsc --noEmit && npm run build`
- [ ] E2E ciblé exécuté pour tout parcours utilisateur modifié.
- [ ] Documentation permanente mise à jour si le contrat change.
- [ ] Aucun secret, fichier `.env` ou artefact local commité.

## 10. Conditions de clôture du plan

Le plan peut être archivé lorsque :

- les quatre risques P0 possèdent un correctif mergé et un test de
  non-régression ;
- les parcours fog, homebrew et paramètres sont validés en navigateur ;
- la CI utilise une toolchain verrouillée et protège `main` ;
- les vues mortes ont été retirées ou rendues fonctionnelles ;
- les écarts restants au design system sont suivis dans la documentation
  permanente.
