# Roadmap DnD Interface

## Vision produit

DnD Interface est un SaaS VTT auto-heberge, browser-first et GM-first.

L'objectif n'est pas de cloner immediatement Foundry ou Roll20.
L'objectif est de construire une table virtuelle simple, rapide et fiable pour :

- preparer une campagne ;
- inviter des joueurs ;
- gerer des personnages ;
- jouer une session dans le navigateur ;
- lancer des des ;
- suivre le journal de session ;
- afficher une carte ;
- deplacer des tokens ;
- gerer un combat ;
- puis ajouter progressivement les assets, notes, handouts, regles et automatisations.

Le produit doit rester utilisable sur le HP Mini, avec une architecture simple, robuste et documentee.

## Principes directeurs

### 1. GM-first

Chaque phase doit aider le MJ a preparer ou conduire une session plus facilement.

Priorite aux actions utiles :
- creer une campagne ;
- inviter les joueurs ;
- preparer une scene ;
- poser des tokens ;
- lancer un combat ;
- suivre l'initiative ;
- conserver un journal.

### 2. Browser-first

Les joueurs doivent rejoindre depuis un navigateur, sans installation.

### 3. Auto-heberge et isole

Le projet reste separe du SaaS documentaire existant.

Stack actuelle :
- Docker Compose ;
- FastAPI ;
- PostgreSQL ;
- MinIO ;
- Redis ;
- React ;
- Nginx ;
- Caddy en frontal possible.

### 4. Progression par phases

Chaque phase doit avoir :
- une migration si necessaire ;
- des endpoints backend ;
- une interface frontend minimale si utile ;
- un smoke test ;
- une documentation ;
- une validation Docker sur le HP Mini.

### 5. Simplicite avant automatisation

Les regles DnD complexes, le fog of war, la lumiere dynamique, les reactions, la concentration et la bibliotheque SRD doivent arriver apres la surface de jeu stable.

## Etat actuel

### Phase 1 - Infrastructure isolee ✅
### Phase 2 - Authentification, campagnes et invitations ✅
### Phase 3 - Fiches personnages ✅
### Phase 4 - Des et journal de session ✅
### Phase 5 - Temps reel ✅
### Phase 6 - Session VTT minimale ✅
### Phase 7 - Combat manager minimal ✅
### Phase 8 - Cartes, assets et fonds de scene ✅
### Phase 9 - UX carte avancee ✅
### Phase 10 - Handouts, notes et documents ✅
### Phase 11 - Conditions et etats de combat ✅
### Phase 12 - Initiative et automatisation legeres ✅
### Phase 13 - Bibliotheque homebrew minimale ✅
### Phase 14 - Acces joueur et experience session ✅
### Phase 15 - Journal de campagne structure ✅
### Phase 16 - Fog of war simple ✅
### Phase 17 - Auth GM/Joueur distinct ✅
### Phase 18 - Interactions joueur (carte, journal, dés, import) ✅
### Phase 19 - Refonte Auth & Routage 4 Layouts ✅
### Phase 20 - Communication MJ↔Joueur (jet secret, annonces, messages privés) 🔜
### Phase 21 - Map interactive joueur (ping, déplacement token, mesure) 🔜
### Phase 22 - Gestion personnage par le MJ (items, XP, conditions visibles) 🔜
### Phase 23 - Mesures et gabarits
### Phase 24 - SRD et règles de base
### Phase 25 - Sauvegardes, maintenance et exploitation
### Phase 26 - Beta privée

## Roadmap detaillee

## Phase 8 - Cartes, assets et fonds de scene

### Objectif

Transformer la grille abstraite en vraie carte jouable.

Le MJ doit pouvoir uploader une image de carte, l'associer a une scene, puis voir les tokens au-dessus de cette image.

### Backend

Livrables :
- table campaign_assets ou scene_assets ;
- upload image vers MinIO ;
- endpoint POST /api/campaigns/{campaign_id}/assets ;
- endpoint GET /api/campaigns/{campaign_id}/assets ;
- endpoint PATCH /api/scenes/{scene_id}/background ;
- validation MIME image ;
- limite de taille fichier ;
- generation d'URL temporaire ou route proxy securisee ;
- smoke-phase8.sh.

### Frontend

Livrables :
- formulaire upload carte ;
- liste des assets de campagne ;
- bouton associer a la scene ;
- affichage image en fond de map-board ;
- conservation de la grille au-dessus de l'image ;
- controle largeur, hauteur, grid_size.

### Critere d'acceptation

- Le MJ upload une image.
- L'image apparait dans MinIO.
- La scene peut utiliser cette image comme fond.
- Les tokens restent visibles et deplacables.
- smoke-phase8.sh passe.

### Hors scope

- fog of war ;
- dynamic lighting ;
- compression avancee ;
- edition d'image ;
- marketplace d'assets.

## Phase 9 - UX carte avancee

### Objectif

Rendre la carte agreable en vraie session.

### Backend

Livrables :
- endpoints de mise a jour token plus fins ;
- event temps reel dedie token_moved ;
- option snap_to_grid par scene ;
- stockage zoom/pan utilisateur si necessaire.

### Frontend

Livrables :
- drag and drop token ;
- snap-to-grid ;
- zoom ;
- pan ;
- selection de token ;
- panneau detail token ;
- suppression de token ;
- duplication de token ;
- raccourcis clavier simples.

### Critere d'acceptation

- Le MJ peut deplacer un token naturellement.
- Les joueurs voient le deplacement en temps reel.
- La carte reste utilisable sur ecran modeste.

### Hors scope

- dynamic lighting ;
- mesure de distance complexe ;
- gabarits de sorts.

## Phase 10 - Handouts, notes et documents de campagne

### Objectif

Donner au MJ un espace de preparation partageable.

### Backend

Livrables :
- table handouts ;
- table notes privees GM ;
- lien optionnel vers MinIO ;
- permissions public/GM/player ;
- endpoints CRUD ;
- smoke-phase10.sh.

### Frontend

Livrables :
- panneau notes GM ;
- panneau handouts visibles joueurs ;
- upload image/document ;
- bouton partager aux joueurs ;
- affichage dans la session.

### Critere d'acceptation

- Le MJ cree une note privee.
- Le MJ cree un handout visible joueurs.
- Les joueurs ne voient pas les notes privees.
- Les fichiers sont stockes dans MinIO.

## Phase 11 - Conditions et etats de combat

### Objectif

Rendre le combat plus lisible sans automatiser tout DnD.

### Backend

Livrables :
- conditions structurees ;
- duree optionnelle ;
- source optionnelle ;
- concentration simple ;
- endpoints appliquer/retirer condition ;
- journalisation des changements ;
- smoke-phase11.sh.

### Frontend

Livrables :
- badges conditions ;
- ajout rapide poisoned, prone, stunned, restrained, invisible ;
- filtre des combattants KO ;
- indication concentration ;
- historique dans le journal.

### Critere d'acceptation

- Le MJ applique une condition.
- La condition apparait sur le combattant.
- Le changement est visible en temps reel.
- Le journal garde une trace.

## Phase 12 - Initiative et automatisation legere

### Objectif

Faire gagner du temps au MJ sans imposer un moteur de regles complet.

### Backend

Livrables :
- roll initiative depuis personnage ou token ;
- tri automatique initiative ;
- ajout automatique des tokens de scene a un encounter ;
- endpoint reroll initiative ;
- smoke-phase12.sh.

### Frontend

Livrables :
- bouton creer combat depuis scene ;
- bouton ajouter tous les tokens ;
- bouton lancer initiatives ;
- tri visuel ;
- mise en avant du tour actif.

### Critere d'acceptation

- Le MJ peut creer un combat depuis la scene active.
- Tous les tokens peuvent devenir combattants.
- L'initiative peut etre generee automatiquement.

## Phase 13 - Bibliotheque homebrew minimale

### Objectif

Permettre au MJ de reutiliser monstres, PNJ et objets simples.

### Backend

Livrables :
- table homebrew_creatures ;
- table homebrew_items ;
- CRUD basique ;
- import/export JSON ;
- creation de token ou combattant depuis creature ;
- smoke-phase13.sh.

### Frontend

Livrables :
- bibliotheque creatures ;
- creation creature ;
- bouton ajouter a la scene ;
- bouton ajouter au combat ;
- recherche simple.

### Critere d'acceptation

- Le MJ cree un monstre reusable.
- Le MJ l'ajoute comme token et combattant.
- Les donnees restent dans la campagne.

### Hors scope

- SRD complet ;
- import DnDBeyond ;
- marketplace.

## Phase 14 - Acces joueur et experience session

### Objectif

Rendre l'experience joueur plus claire et plus securisee.

### Backend

Livrables :
- endpoints orientes joueur ;
- restriction stricte des donnees GM ;
- visibilite token/handout ;
- invitations plus robustes ;
- audit permissions ;
- smoke-phase14.sh.

### Frontend

Livrables :
- vue joueur simplifiee ;
- fiche du joueur ;
- jets du joueur ;
- carte et tokens visibles ;
- handouts visibles ;
- pas de controles GM.

### Critere d'acceptation

- Un joueur invite rejoint une campagne.
- Il voit uniquement ce qui lui est autorise.
- Il peut lancer ses jets.
- Il ne peut pas modifier combat/scenes hors permission.

## Phase 15 - Journal de campagne structure

### Objectif

Transformer le journal en historique utile apres session.

### Backend

Livrables :
- categories de journal ;
- liens vers scene, combat, personnage ;
- export markdown ;
- resume de session ;
- smoke-phase15.sh.

### Frontend

Livrables :
- filtres journal ;
- timeline ;
- export ;
- epingler une entree ;
- notes post-session.

### Critere d'acceptation

- Le MJ retrouve les evenements importants.
- Une session peut etre exportee en markdown.
- Le journal reste lisible.

## Phase 16 - Fog of war simple

### Objectif

Ajouter un brouillard de guerre minimal, sans lumiere dynamique.

### Backend

Livrables :
- masque de scene ;
- zones revelees ;
- permissions GM/joueur ;
- stockage JSON ou geometrie simple ;
- smoke-phase16.sh.

### Frontend

Livrables :
- couche fog ;
- outil reveler/masquer ;
- affichage joueur masque ;
- affichage GM complet.

### Critere d'acceptation

- Le MJ masque une zone.
- Le joueur ne la voit pas.
- Le MJ peut reveler une zone.

## Phase 17 - Auth GM/Joueur distinct

### Objectif

Distinguer clairement les comptes MJ des comptes Joueur dès l'inscription.

### Backend

Livrables :
- colonne `account_type` (`gm`|`player`) sur `users` ;
- `POST /api/auth/register` enrichi avec `account_type` et `invite_token` ;
- validation joueur : invite token obligatoire, auto-join campagne ;
- `require_gm_account` : bloque les comptes player de créer des campagnes ;
- `UserPublic` enrichi avec `account_type` ;
- migration `016_account_type.sql`.

### Frontend

Livrables :
- `LandingPage.tsx` : deux chemins (MJ / Joueur) avec icônes et descriptions ;
- `AuthView.tsx` refondu : badge de rôle, champ code d'invitation pour joueurs ;
- `App.tsx` : landing step → auth step, routage par account_type ;
- `InvitePage.tsx` : force account_type=player, passe invite_token.

### Critère d'acceptation

- Un nouveau joueur arrive sur la landing page, choisit « Je suis Joueur ».
- Il entre un code d'invitation, crée son compte, est automatiquement ajouté à la campagne.
- Un nouveau MJ choisit « Je suis MJ », crée son compte, crée une campagne.
- Un compte player ne peut pas créer de campagne (erreur 403).

## Phase 18 - Interactions joueur (carte, journal, dés, import)

### Objectif

Donner au joueur une interface riche lui permettant de voir la carte, suivre la session, lancer des dés avec avantage/désavantage, et gérer ses personnages.

### Backend

Aucun — tous les endpoints étaient déjà prêts (player_scenes, player_scene_tokens, GET /log, POST /log, GET /rolls, POST /rolls, GET /characters, PATCH /characters, WebSocket existant).

### Frontend

Livrables :
- `PlayerMap.tsx` : carte read-only (scène active, tokens visibles, fog of war, zoom/pan local) ;
- WebSocket temps réel connecté dans PlayerView (mise à jour auto scène/token/handout/combat) ;
- Onglet Carte : intégration PlayerMap avec sélecteur de scènes ;
- Onglet Journal : historique session publique + écriture de notes ;
- Onglet Personnages : import/export JSON de fiche, boutons de jets par compétence ;
- Onglet Dés : toggle avantage/normal/désavantage ;
- Onglet Combat : badge « 🎯 Ton perso » sur les combattants player_controlled ;
- Onglet Documents : inchangé.

### Critère d'acceptation

- Le joueur voit la carte active avec les tokens et le brouillard.
- Le joueur écrit une note publique, elle apparaît dans le journal.
- Le joueur lance un dé avec avantage, le résultat est correct.
- Le joueur exporte sa fiche en JSON, puis l'importe dans une autre campagne.
- Les mises à jour du MJ (scène, tokens) sont visibles en temps réel.

## Phase 19 - Refonte Auth & Routage 4 Layouts

### Objectif

Unifier le flux d'authentification en une seule page login/register, puis router vers 4 layouts distincts selon account_type × has_campaign.

### Backend

Livrables :
- `RegisterRequest` enrichi : `confirm_password`, complexité mot de passe (minuscule/majuscule/chiffre), honeypot `website`
- `model_validator` passwords_match
- `field_validator` password_complexity
- Rejet silencieux honeypot dans `auth.py`
- 6 tests unitaires schema validation

### Frontend

Livrables :
- `AuthPage.tsx` : page unique login/register (choix GM/Joueur, indicateur force mot de passe, confirmation, honeypot)
- `PlayerLobby.tsx` : hall joueur sans campagne (entrer code invitation, preview, join)
- `GmLobby.tsx` : hall MJ sans campagne (formulaire création campagne)
- `InvitePreviewCard.tsx` : composant réutilisable preview + join
- `App.tsx` refonte : 7 branches de routage explicites
- Suppression `LandingPage.tsx` et `AuthView.tsx`

### Critère d'acceptation

- Un nouvel utilisateur arrive sur une seule page, s'inscrit comme MJ ou Joueur.
- Un MJ sans campagne voit le GmLobby (formulaire création).
- Un MJ avec campagne voit l'interface VTT complète.
- Un joueur sans campagne voit le PlayerLobby (entrer code invitation).
- Un joueur avec campagne voit le PlayerView.
- Le mot de passe est validé côté client ET serveur (complexité, confirmation).

## Phase 20 - Communication MJ↔Joueur (jet secret, annonces, messages privés)

### Objectif

Permettre les échanges discrets entre le MJ et les joueurs : jets cachés, annonces épinglées, messages privés.

### Backend

Livrables :
- Migration mineure : `recipient_user_id` sur `game_log_entries` pour les messages privés ;
- `POST /api/campaigns/{id}/log` accepte `recipient_user_id` (optionnel) ;
- `GET /api/campaigns/{id}/log` pour joueur filtre aussi `recipient_user_id = current_user OR recipient_user_id IS NULL` ;
- `POST /api/campaigns/{id}/rolls` supporte déjà `visibility=gm` (jet secret) — rien à changer ;
- Audit permission : seuls GM et co_GM peuvent définir `recipient_user_id`.

### Frontend

Livrables :
- **Jet secret** : toggle 🔒 Secret (MJ) dans le lanceur de dés joueur, envoi avec `visibility=gm` ;
- **Annonces épinglées** : le MJ poste une note avec `pinned=true`, un bandeau 📢 apparaît en haut de l'interface joueur ;
- **Messages privés** : le MJ sélectionne un joueur destinataire dans le panneau journal, le message n'est visible que par ce joueur ;
- Indicateur visuel dans le journal : 🔒 = secret, 📢 = épinglé, 💬 = privé.

### Critère d'acceptation

- Le joueur lance un jet secret, il apparaît dans le journal du MJ mais pas dans la vue publique des autres joueurs.
- Le MJ épingle « Vous trouvez un coffre », le bandeau apparaît chez tous les joueurs.
- Le MJ envoie un message privé à Elara, seul Elara le voit dans son journal.

### Hors scope

- Chat en temps réel (messages instantanés comme Discord).
- Fils de discussion (threaded messages).

## Phase 20 - Map interactive joueur (ping, déplacement token, mesure)

### Objectif

Permettre au joueur d'interagir avec la carte : signaler une position, déplacer son personnage, mesurer des distances.

### Backend

Livrables :
- `PATCH /api/tokens/{id}/move` : accepter le rôle `player` si le token est lié à un personnage dont `owner_user_id = current_user.id` ;
- Vérification dans le handler : `token.character_id → character.owner_user_id == current_user.id` ;
- Pas de stockage pour le ping (événement WebSocket uniquement).

### Frontend

Livrables :
- **Ping carte** : clic du joueur sur la carte → animation de pulse (cercle 2s) + pseudo, broadcast WebSocket à tous ;
- **Déplacement token** : les tokens `player_controlled` sont drag-and-drop sur la carte joueur ; mise à jour via `PATCH /api/tokens/{id}/move` ; broadcast WebSocket ;
- **Mesure distance** : outil 📏 dans la toolbar carte joueur, clic-drag affiche la distance en cases (calcul côté client basé sur `grid_size`) ;
- Curseur change selon l'outil actif (ping=pointer, déplacement=grab, mesure=crosshair).

### Critère d'acceptation

- Le joueur clique sur la carte, un ping « Donopot » pulse et tous les autres joueurs + MJ le voient.
- Le joueur drag son token Elara de 3 cases, la position est sauvegardée et broadcastée.
- Le joueur mesure 30 ft (6 cases), l'indicateur affiche « 30 ft · 6 cases ».
- Un joueur ne peut PAS déplacer un token qui ne lui appartient pas.

### Hors scope

- Gabarits de sorts (cercle, cône, rectangle) → Phase 22.
- Déplacement avec waypoints.

## Phase 21 - Gestion personnage par le MJ (items, XP, conditions visibles)

### Objectif

Permettre au MJ de gérer les personnages joueurs à distance : donner des objets, ajuster l'XP, appliquer des conditions visibles.

### Backend

Aucune migration requise — tout utilise les endpoints existants :
- `PATCH /api/characters/{id}` → `inventory` (merge JSONB), `level`, `hp_current`, `hp_max` ;
- `POST /api/campaigns/{id}/log` pour notifier le joueur ;
- Les conditions de combat existent déjà dans `combat.py` (conditions sur les combattants).

Livrables optionnels :
- Migration `character_conditions` si on veut des conditions persistantes hors combat (table séparée ou champ JSONB sur `characters`).

### Frontend

Livrables :
- **Attribuer item** : dans EditCharacterSheet (vue MJ), bouton « 🎁 Donner un objet » → formulaire nom + description → ajout dans `inventory` → notification joueur ;
- **Attribuer XP/level** : champ niveau éditable par le MJ avec indicateur de palier (5e, 9e, 13e, 17e = +1 proficiency bonus) ;
- **Ajuster PV** : boutons +1/-1 PV ou champ direct, avec notification joueur ;
- **Conditions visibles** : si le personnage a un combattant associé avec des conditions actives, les afficher sur la fiche personnage (badge « Empoisonné », « Paralysé ») ;
- Notification WebSocket au joueur quand son personnage est modifié par le MJ.

### Critère d'acceptation

- Le MJ ajoute « Épée +1 » dans l'inventaire d'Elara, Elara le voit apparaître.
- Le MJ passe Elara niveau 5, sa fiche est mise à jour (proficiency bonus recalculé).
- Le MJ applique « Empoisonné » au combattant d'Elara, le badge apparaît sur sa fiche personnage.

### Hors scope

- Feuille de trésor partagée (party loot).
- calcul automatique des PV par niveau (HP rolling).
- Gestions des sorts appris par niveau.

## Phase 22 - Mesures, gabarits et aides tactiques

### Objectif

Ajouter les outils tactiques les plus utiles.

### Backend

Livrables :
- stockage optionnel de gabarits temporaires ;
- events temps reel mesure/gabarit.

### Frontend

Livrables :
- mesure distance ;
- cercle ;
- cone ;
- rectangle ;
- suppression rapide ;
- affichage temps reel.

### Critere d'acceptation

- Le MJ mesure une distance.
- Le MJ affiche un gabarit de sort.
- Les joueurs le voient.

## Phase 23 - SRD et règles de base

### Objectif

Introduire une bibliotheque de reference sans surcharger le produit.

### Backend

Livrables :
- modele spells ;
- modele monsters ;
- modele conditions ;
- source/licence documentee ;
- import local ;
- recherche.

### Frontend

Livrables :
- recherche sort ;
- recherche monstre ;
- fiche reference ;
- ajout au combat depuis monstre.

### Critere d'acceptation

- Le MJ recherche un monstre ou sort.
- Le MJ peut utiliser une creature comme base de combattant.

## Phase 24 - Sauvegardes, maintenance et exploitation

### Objectif

Renforcer l'exploitation du SaaS sur le HP Mini.

### Backend/Infra

Livrables :
- scripts backup PostgreSQL ;
- scripts backup MinIO ;
- restore teste ;
- healthchecks avances ;
- logs applicatifs ;
- rotation logs ;
- documentation exploitation.

### Critere d'acceptation

- Backup manuel fonctionne.
- Restore de test fonctionne.
- Procedure documentee.

## Phase 25 - Beta privee

### Objectif

Preparer une premiere utilisation reelle avec un petit groupe.

### Livrables

- checklist securite ;
- checklist UX ;
- seed de demonstration ;
- documentation MJ ;
- documentation joueur ;
- page feedback ;
- suivi bugs ;
- tag release v0.20.0-beta.

### Critere d'acceptation

- Une vraie session peut etre jouee.
- Les retours sont collectes.
- Les bugs critiques sont identifies.

## Qualite et validation continue

Chaque phase doit passer :

1. Build Docker complet.
2. Healthcheck API.
3. Smoke tests precedents.
4. Smoke test de la phase.
5. Verification frontend.
6. Commit documente.
7. Merge dans main apres review.

Commandes standard :

docker compose up -d --build
sh scripts/wait-api.sh
curl -fsS http://127.0.0.1:8091/api/health
sh scripts/smoke-phase2.sh
sh scripts/smoke-phase3.sh
sh scripts/smoke-phase4.sh
sh scripts/smoke-phase5.sh
sh scripts/smoke-phase6.sh
sh scripts/smoke-phase7.sh

Les phases futures ajoutent leur smoke test a cette liste.

## Strategie de versions

Versions proposees :

- v0.7.0 : combat manager minimal.
- v0.8.0 : assets et fonds de scene.
- v0.9.0 : UX carte avancee.
- v0.10.0 : handouts et notes.
- v0.11.0 : conditions combat.
- v0.12.0 : initiative automatisee.
- v0.13.0 : homebrew minimal.
- v0.14.0 : experience joueur.
- v0.15.0 : journal structure.
- v0.16.0 : fog of war simple.
- v0.20.0-beta : beta privee.

## Risques principaux

### Complexite VTT

Risque : vouloir implementer trop vite fog, lighting, SRD, automation et marketplace.

Mitigation : garder des phases courtes et testables.

### Permissions

Risque : fuite d'informations GM vers les joueurs.

Mitigation : endpoints joueur separes, tests permissions, smoke tests dedies.

### Performance HP Mini

Risque : carte trop lourde, trop de WebSocket, assets trop volumineux.

Mitigation : limites upload, images optimisees, realtime simple, monitoring.

### Dette frontend

Risque : main.tsx devient trop gros.

Mitigation : a partir de Phase 8 ou 9, decouper le frontend en composants :
- AuthPanel ;
- CampaignList ;
- CharacterPanel ;
- VttBoard ;
- CombatPanel ;
- SessionLog ;
- HandoutPanel.

### Migrations

Risque : migrations appliquees automatiquement au startup.

Mitigation : garder des migrations simples, idempotentes, testees par rebuild Docker.

## Prochaine phase recommandee

La prochaine phase recommandee est :

**Phase 16 — Fog of war simple.**

Raison :
- toutes les phases 1→15 sont désormais full-stack ;
- le fog of war est la prochaine feature à forte valeur joueur ;
- le backend fog of war reste à concevoir (endpoints + migration).
