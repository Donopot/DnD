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

### Phase 1 - Infrastructure isolee

Statut : terminee.

Livrables :
- stack Docker dediee ;
- backend FastAPI ;
- frontend React/Nginx ;
- PostgreSQL dedie ;
- MinIO dedie ;
- Redis dedie ;
- ports locaux 8090 et 8091 ;
- documentation initiale.

### Phase 2 - Authentification, campagnes et invitations

Statut : terminee.

Livrables :
- inscription ;
- connexion ;
- JWT ;
- campagnes ;
- membres ;
- roles GM, co-GM, player ;
- invitations ;
- smoke test Phase 2.

### Phase 3 - Fiches personnages

Statut : terminee.

Livrables :
- creation de personnage ;
- rattachement a une campagne ;
- proprietaire de fiche ;
- attributs, PV, CA, vitesse, inventaire, sorts, notes ;
- permissions joueurs/MJ ;
- smoke test Phase 3.

### Phase 4 - Des et journal de session

Statut : terminee.

Livrables :
- parser de formules de des ;
- jets normaux, avantage, desavantage ;
- journal de session ;
- notes de session ;
- visibilite publique ou GM ;
- smoke test Phase 4.

### Phase 5 - Temps reel

Statut : terminee.

Livrables :
- WebSocket par campagne ;
- presence simple ;
- broadcast session_changed ;
- rechargement frontend du journal ;
- smoke test Phase 5.

### Phase 6 - Session VTT minimale

Statut : terminee.

Livrables :
- scenes de campagne ;
- tokens de scene ;
- position x/y ;
- grille simple ;
- creation et deplacement de token ;
- proxy Nginx local pour /api et /ws ;
- frontend VTT minimal ;
- smoke test Phase 6.

### Phase 7 - Combat manager minimal

Statut : terminee.

Livrables :
- encounters ;
- combattants ;
- initiative ;
- round ;
- tour actif ;
- demarrage du combat ;
- tour suivant ;
- fin du combat ;
- PV, CA, conditions simples ;
- frontend combat minimal ;
- smoke test Phase 7.

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

## Phase 17 - Mesures, gabarits et aides tactiques

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

## Phase 18 - SRD et regles de base

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

## Phase 19 - Sauvegardes, maintenance et exploitation

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

## Phase 20 - Beta privee

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

Phase 8 - Cartes, assets et fonds de scene.

Raison :
- les scenes, tokens et combats existent deja ;
- la carte reste abstraite ;
- l'upload d'image via MinIO donnera une forte valeur produit ;
- cela exploite directement l'infrastructure deja en place.
