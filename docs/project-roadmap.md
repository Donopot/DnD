# Roadmap produit DnD SaaS / VTT

Version cible actuelle : v0.10.x  
Dernière grande étape : interface MJ propre, panneaux libres, presets et cockpit GM.

## Vision produit

L'objectif du projet est de construire un VTT auto-heberge, fiable, rapide et adapte a une vraie table de jeu de role.

Le produit doit permettre :

- au MJ de preparer une campagne ;
- de lancer une session en direct ;
- de gerer scenes, cartes, tokens, combats, notes et secrets ;
- aux joueurs de rejoindre une interface simple et claire ;
- de separer strictement ce que voit le MJ et ce que voient les joueurs ;
- de conserver une experience fluide meme sur une machine modeste.

La priorite n'est pas d'ajouter un maximum de boutons.  
La priorite est de reduire la charge mentale du MJ.

Chaque fonctionnalite doit repondre a au moins un de ces objectifs :

- accelerer une action frequente ;
- eviter une erreur ;
- proteger une information secrete ;
- rendre le combat plus fluide ;
- soutenir l'improvisation ;
- ameliorer l'immersion ;
- simplifier l'interface joueur.

---

# Etat actuel du projet

## Socle deja construit

Le projet dispose deja de :

- backend FastAPI ;
- base PostgreSQL ;
- stockage MinIO ;
- Redis ;
- frontend React/Vite ;
- Docker Compose ;
- authentification ;
- campagnes ;
- personnages ;
- jets de des ;
- journal de session ;
- WebSocket temps reel ;
- scenes VTT ;
- tokens ;
- assets de carte ;
- combat minimal ;
- refonte frontend ;
- UX carte : drag token, snap, zoom, pan, mini-map ;
- interface MJ nettoyee avec modes Partie, Preparation et Avance ;
- panneaux flottants deplacables/redimensionnables ;
- presets de panneaux ;
- layout personnalise sauvegardable.

## Forces actuelles

- Le socle technique est coherent.
- Les principales briques VTT existent.
- Le backend est deja structure par phases.
- Les smoke tests couvrent les phases importantes.
- La carte est devenue utilisable.
- L'interface MJ commence a etre separee en modes.
- Les panneaux libres donnent une base d'ergonomie avancee.

## Faiblesses actuelles

- Gestion des tokens encore trop limitee.
- Pas encore de vraie interface joueur dediee.
- Pas de suppression/duplication token confortable.
- Pas de visibilite MJ/joueur fine sur tous les elements.
- Pas encore de brouillard de guerre.
- Pas de notes de scene avancees.
- Pas de PNJ/factions.
- Pas de moteur combat avance.
- Pas d'aperçu joueur.
- Pas encore de dock propre pour panneaux minimises.
- Pas encore de mode focus carte.
- Pas encore de sauvegarde de layout par campagne/scène.

---

# Principes UX obligatoires

## 1. Carte dominante

En session live, la carte doit occuper la majorite de l'ecran.

Objectif :

- 75% a 85% de l'espace visible pour la carte ;
- aucun formulaire long en mode Partie ;
- outils avances masques ou repliees ;
- mini-map et inspecteur compacts.

## 2. Trois modes MJ

### Mode Partie

Mode par defaut pendant une session.

Visible :

- carte ;
- cockpit MJ compact ;
- mini-map ;
- inspecteur MJ ;
- actions rapides ;
- journal court ;
- combat compact si actif.

Masque :

- creation scene ;
- upload carte ;
- choix fond ;
- liste tokens longue ;
- panneaux libres avances ;
- formulaires longs.

### Mode Preparation

Mode avant session.

Visible :

- scenes ;
- assets ;
- upload carte ;
- choix fond ;
- creation token ;
- liste tokens ;
- notes de scene ;
- preparation combat.

### Mode Avance

Mode expert.

Visible :

- panneaux flottants ;
- presets ;
- layout personnalise ;
- reset ;
- verrouillage/reduction/fermeture ;
- organisation libre de l'espace MJ.

## 3. Interface joueur separee

Le joueur ne doit pas voir les outils MJ.

Le joueur doit voir :

- carte joueur ;
- son personnage ;
- PV / CA / ressources ;
- bouton lancer de ;
- journal public ;
- etat combat ;
- son tour si combat actif.

Le joueur ne doit pas voir :

- upload carte ;
- creation scene ;
- outils MJ ;
- secrets ;
- panneaux libres MJ ;
- notes MJ ;
- PNJ caches ;
- tokens caches ;
- fog non revele.

## 4. Visibilite explicite

Tout contenu doit avoir un statut clair :

- MJ uniquement ;
- visible par tous ;
- visible par un joueur ;
- visible par un groupe ;
- pret a reveler ;
- archive.

Aucun contenu secret ne doit etre ambigu.

## 5. Actions frequentes en un clic

Les actions frequentes doivent etre accessibles rapidement :

- lancer de ;
- ajouter token ;
- centrer carte ;
- centrer token ;
- ping ;
- mesurer ;
- ajouter note ;
- tour suivant ;
- appliquer degats ;
- cacher/reveler token ;
- ouvrir aperçu joueur.

---

# Roadmap detaillee

## Phase 10-4 - Finalisation des panneaux MJ

Objectif : stabiliser definitivement les panneaux avant de passer aux tokens.

### 10-4A - Presets toujours accessibles

Fonctionnalites :

- garder le menu Gestion panneaux visible en mode Partie ;
- garder les presets visibles en mode Preparation ;
- cliquer un preset active automatiquement le mode Avance ;
- ajouter preset Personnalise ;
- sauvegarder le layout actuel ;
- restaurer le layout personnalise.

Criteres d'acceptation :

- presets cliquables depuis tous les modes ;
- layout personnalise sauvegarde ;
- layout personnalise restaure ;
- build OK ;
- smoke tests OK.

### 10-4B - Dock des panneaux reduits

Fonctionnalites :

- lorsqu'un panneau est reduit, il apparait dans un dock ;
- le dock affiche Mini-map, Token, Scene, Assets, Tokens ;
- clic sur un item du dock restaure le panneau ;
- le dock reste discret en mode Partie ;
- le dock est visible en mode Avance.

Criteres d'acceptation :

- reduire un panneau ne le rend pas introuvable ;
- dock lisible ;
- restauration fiable ;
- pas de doublon avec Gestion panneaux.

### 10-4C - Epingler / detacher panneau

Fonctionnalites :

- chaque panneau peut etre epingle dans la colonne droite ;
- chaque panneau peut etre detache en flottant ;
- l'etat epingle/flottant est sauvegarde ;
- le mode Partie utilise surtout des panneaux epingles ;
- le mode Avance permet tout flottant.

Criteres d'acceptation :

- Mini-map epinglable ;
- Ajout token detachable ;
- etat conserve apres refresh.

### 10-4D - Mode Focus carte

Fonctionnalites :

- bouton Focus carte ;
- masque cockpit, inspecteur, panneaux et formulaires ;
- garde carte, tokens, mini barre outils ;
- bouton retour Cockpit ;
- raccourci clavier possible.

Criteres d'acceptation :

- carte occupe presque tout l'ecran ;
- retour au mode precedent ;
- pas de perte de position/zoom.

### 10-4E - Densite interface

Fonctionnalites :

- densite Confortable ;
- densite Compacte ;
- densite Tres compacte ;
- stockage localStorage ;
- adaptation taille boutons, polices, paddings.

Criteres d'acceptation :

- changement visible sans reload ;
- persistance apres refresh ;
- mode tres compacte utilisable sur petit ecran.

### 10-4F - Review et merge

- build Docker ;
- smoke tests Phase 2 a 8 ;
- test navigateur complet ;
- merge main ;
- tag v0.10.1 si necessaire.

---

## Phase 11 - Gestion avancee des tokens

Objectif : rendre les tokens vraiment utilisables en session MJ.

### 11-1 - Backend token actions

Fonctionnalites backend :

- supprimer un token ;
- dupliquer un token ;
- patch complet token ;
- changer nom ;
- changer couleur ;
- changer taille ;
- changer position ;
- changer visibilite ;
- changer verrouillage ;
- changer z-index ;
- lier/delier personnage ;
- smoke test Phase 11.

Endpoints cibles :

- DELETE /api/tokens/{token_id}
- POST /api/tokens/{token_id}/duplicate
- PATCH /api/tokens/{token_id}
- POST /api/tokens/{token_id}/bring-forward
- POST /api/tokens/{token_id}/send-backward

Criteres :

- suppression persistante ;
- duplication persistante ;
- droits MJ respectes ;
- joueurs limites a leurs tokens si applicable ;
- anciens smoke tests OK.

### 11-2 - Inspecteur token editable

Fonctionnalites frontend :

- edition nom ;
- couleur ;
- taille ;
- x/y ;
- visible/cache ;
- verrouille/deverrouille ;
- hostile/neutre/allie ;
- bouton sauvegarder ;
- feedback visuel.

Criteres :

- edition depuis inspecteur MJ ;
- modification visible sur carte ;
- refresh conserve les changements.

### 11-3 - Actions rapides token

Actions :

- centrer ;
- dupliquer ;
- supprimer ;
- masquer ;
- reveler ;
- ajouter au combat ;
- retirer du combat ;
- envoyer devant ;
- envoyer derriere ;
- reset position ;
- verrouiller.

Criteres :

- boutons dans inspecteur ;
- confirmation suppression ;
- action temps reel si possible.

### 11-4 - Menu contextuel token

Fonctionnalites :

- clic droit sur token ;
- menu contextuel compact ;
- actions rapides ;
- raccourcis clavier ;
- fermeture clic exterieur.

Criteres :

- menu ne bloque pas drag ;
- utilisable en mode Partie ;
- pas visible joueur sauf interface joueur specifique.

### 11-5 - Etats visuels token

Etats :

- empoisonne ;
- etourdi ;
- inconscient ;
- invisible ;
- concentre ;
- KO ;
- mort ;
- vole ;
- entrave ;
- avantage ;
- desavantage.

Fonctionnalites :

- badges sur token ;
- liste dans inspecteur ;
- ajout/retrait rapide ;
- duree optionnelle.

### 11-6 - Groupes de tokens

Fonctionnalites :

- selection multiple ;
- deplacement groupe ;
- duplication groupe ;
- suppression groupe ;
- initiative groupe ennemis ;
- nommage automatique Gobelin 1, Gobelin 2.

---

## Phase 12 - Interface joueur

Objectif : creer une interface dediee, simple, sure et agreable pour les joueurs.

### 12-1 - Route/vue joueur

Fonctionnalites :

- vue joueur separee ;
- detection role campagne ;
- redirection MJ vers interface MJ ;
- redirection joueur vers interface joueur ;
- layout joueur minimal.

Visible joueur :

- carte ;
- son personnage ;
- PV / CA ;
- ressources principales ;
- lancer de ;
- journal public ;
- tour actuel.

Masque joueur :

- outils MJ ;
- scenes cachees ;
- tokens caches ;
- notes MJ ;
- assets non reveles ;
- panneaux libres.

### 12-2 - Carte joueur

Fonctionnalites :

- afficher uniquement scene active ;
- afficher fond de carte visible ;
- afficher tokens visibles ;
- pas de drag MJ ;
- ping joueur optionnel ;
- zoom/pan joueur ;
- pas d'outils admin.

### 12-3 - Fiche joueur compacte

Fonctionnalites :

- PV ;
- CA ;
- vitesse ;
- niveau ;
- classe ;
- ressources ;
- attaques rapides ;
- jets frequents.

### 12-4 - Des joueur

Fonctionnalites :

- lancer d20 ;
- lancer formule ;
- lancer attaque ;
- lancer sauvegarde ;
- lancer competence ;
- visible public / prive MJ ;
- historique personnel.

### 12-5 - Journal public

Fonctionnalites :

- messages publics ;
- jets publics ;
- revelations ;
- debut combat ;
- fin combat ;
- notes publiques.

### 12-6 - Tour joueur

Fonctionnalites :

- indication "c'est ton tour" ;
- actions disponibles ;
- bouton fin de tour ;
- reactions ;
- etats actifs.

---

## Phase 13 - Visibilite, secrets et aperçu joueur

Objectif : securiser la separation MJ/joueur.

### 13-1 - Mode aperçu joueur

Fonctionnalites :

- bouton aperçu joueur dans cockpit ;
- ouvrir mini-fenetre de ce que voient les joueurs ;
- afficher scene joueur ;
- afficher tokens visibles ;
- masquer infos MJ.

### 13-2 - Badges de visibilite

Badges :

- MJ ;
- Tous ;
- Joueur ;
- Groupe ;
- Pret a reveler ;
- Archive.

A appliquer a :

- tokens ;
- notes ;
- handouts ;
- scenes ;
- assets ;
- PNJ ;
- journal.

### 13-3 - Historique des revelations

Fonctionnalites :

- qui a vu quoi ;
- quand ;
- quel MJ/action ;
- annuler revelation si possible ;
- journal audit.

### 13-4 - Mode panique

Fonctionnalites :

- raccourci clavier ;
- masquer tout secret ;
- fermer panneaux MJ ;
- revenir vue safe ;
- utile partage ecran.

---

## Phase 14 - Brouillard de guerre et calques MJ

Objectif : permettre au MJ de cacher/reveler la carte.

### 14-1 - Fog manuel MVP

Fonctionnalites :

- tout cacher ;
- tout reveler ;
- reveler rectangle ;
- reveler cercle ;
- masquer zone ;
- sauvegarder fog par scene.

### 14-2 - Calque MJ

Calques :

- pieges ;
- secrets ;
- notes MJ ;
- DC ;
- spawn ;
- zones dangereuses ;
- portes cachees.

### 14-3 - Outils de revelation

Fonctionnalites :

- pinceau revelation ;
- gomme fog ;
- opacite fog ;
- aperçu joueur ;
- historique zones revelees.

### 14-4 - Fog par joueur plus tard

Fonctionnalites :

- vision individuelle ;
- zones vues par personnage ;
- partage vision groupe ;
- brouillard explore mais non visible.

---

## Phase 15 - Annotations, mesures et gabarits

Objectif : enrichir l'interaction avec la carte.

### 15-1 - Mesure de distance

Fonctionnalites :

- outil regle ;
- distance en cases ;
- distance en metres/pieds ;
- diagonales configurables ;
- mesure temporaire.

### 15-2 - Ping

Fonctionnalites :

- ping MJ ;
- ping joueur ;
- ping visible tous ;
- ping prive MJ ;
- animation legere.

### 15-3 - Dessin rapide

Fonctionnalites :

- trait libre ;
- fleche ;
- texte ;
- effacer ;
- couleur ;
- visible MJ ou public.

### 15-4 - Gabarits de sorts

Types :

- cercle ;
- cone ;
- ligne ;
- rectangle ;
- aura.

Fonctionnalites :

- taille configurable ;
- rotation ;
- couleur ;
- sauvegarde temporaire ;
- ciblage tokens touches.

---

## Phase 16 - Combat avance

Objectif : transformer le combat en tableau de commande fluide.

### 16-1 - Tracker initiative avance

Fonctionnalites :

- ordre clair ;
- round ;
- tour actif ;
- prochain joueur ;
- ennemis groupes ;
- initiative cachee ;
- retard ;
- pret.

### 16-2 - Tour suivant intelligent

Fonctionnalites :

- expiration effets ;
- rappel concentration ;
- reaction reset ;
- alerte joueur inactif ;
- log automatique.

### 16-3 - PV et degats

Fonctionnalites :

- appliquer degats ;
- soigner ;
- degats groupés ;
- resistance ;
- vulnerabilite ;
- immunite ;
- annuler dernier changement.

### 16-4 - Etats combat

Fonctionnalites :

- ajouter etat ;
- duree ;
- source ;
- expiration ;
- rappel ;
- immunite ;
- visibilite joueur.

### 16-5 - Fin de combat

Fonctionnalites :

- XP ;
- butin ;
- nettoyer etats ;
- corps/prisonniers/fuite ;
- resume combat ;
- consequences.

---

## Phase 17 - Notes, scenario et memoire de campagne

Objectif : transformer les notes en outil vivant pendant la session.

### 17-1 - Notes rapides

Fonctionnalites :

- champ note rapide ;
- lien automatique scene ;
- lien token selectionne ;
- horodatage ;
- tag rapide ;
- visibilite MJ.

### 17-2 - Notes de scene

Fonctionnalites :

- objectif scene ;
- secrets ;
- indices ;
- dangers ;
- PNJ presents ;
- ambiance ;
- transitions.

### 17-3 - Journal d'indices

Statuts :

- prevu ;
- donne ;
- compris ;
- ignore ;
- mal interprete ;
- confirme ;
- resolu.

### 17-4 - Chronologie

Fonctionnalites :

- evenements monde ;
- evenements session ;
- promesses ;
- dettes narratives ;
- consequences.

### 17-5 - Recherche globale

Recherche dans :

- notes ;
- PNJ ;
- scenes ;
- joueurs ;
- factions ;
- objets ;
- regles maison.

---

## Phase 18 - PNJ, creatures et factions

Objectif : gerer les entites narratives et tactiques.

### 18-1 - PNJ compact

Champs :

- nom ;
- portrait ;
- voix ;
- motivation ;
- peur ;
- faction ;
- attitude ;
- secrets ;
- scenes liees ;
- derniere apparition.

Actions :

- ajouter a scene ;
- ajouter au combat ;
- reveler portrait ;
- note rapide ;
- changer attitude.

### 18-2 - Creatures

Champs :

- statblock ;
- PV ;
- CA ;
- attaques ;
- traits ;
- resistances ;
- faiblesses ;
- tactique ;
- moral ;
- butin.

### 18-3 - Factions

Champs :

- objectifs ;
- ressources ;
- territoire ;
- allies ;
- ennemis ;
- horloges ;
- reputation groupe.

### 18-4 - Relations

Fonctionnalites :

- relation PNJ/joueur ;
- relation faction/faction ;
- graph simple ;
- tags ;
- historique interactions.

---

## Phase 19 - Immersion, handouts et ambiance

Objectif : permettre au MJ de mettre en scene sans perdre le rythme.

### 19-1 - Handouts

Fonctionnalites :

- upload image/document ;
- preview MJ ;
- reveler a tous ;
- reveler a joueur ;
- retirer ;
- historique revelation.

### 19-2 - Packs de scene

Un pack contient :

- carte ;
- musique ;
- ambiance ;
- description ;
- PNJ ;
- handouts ;
- secrets ;
- fog ;
- notes.

Action :

- activer pack scene.

### 19-3 - Ambiance audio

Fonctionnalites :

- playlist scene ;
- effet ponctuel ;
- volume ;
- boucle ;
- fondu ;
- stop global.

### 19-4 - Revelation dramatique

Fonctionnalites :

- texte court ;
- image ;
- zoom carte ;
- son ;
- fondu ;
- visible joueurs.

---

## Phase 20 - Performance, accessibilite et stabilite

Objectif : rendre le VTT fiable en vraie session.

### 20-1 - Prechargement assets

Fonctionnalites :

- precharger scene suivante ;
- statut assets charges ;
- miniatures ;
- basse resolution.

### 20-2 - Mode connexion faible

Fonctionnalites :

- desactiver animations ;
- images basse resolution ;
- file d'attente actions ;
- reconnexion automatique ;
- indicateur offline.

### 20-3 - Autosave et annulation

Fonctionnalites :

- autosave layout ;
- autosave notes ;
- historique actions ;
- annuler dernier changement ;
- restauration crash.

### 20-4 - Accessibilite

Fonctionnalites :

- contraste eleve ;
- police ajustable ;
- reduction animations ;
- navigation clavier ;
- tooltips ;
- zones cliquables plus grandes.

---

## Phase 21 - Multi-ecrans

Objectif : permettre plusieurs experiences selon l'appareil.

### 21-1 - Vue MJ principale

Cockpit complet.

### 21-2 - Vue joueur

Carte + personnage + des.

### 21-3 - Vue projecteur

Carte publique + images revelees.

### 21-4 - Vue tablette MJ

Notes, PNJ, des, combat rapide.

### 21-5 - Fenetre aperçu joueur

Mini preview dans cockpit MJ.

---

## Phase 22 - Assistant MJ et automatisations

Objectif : aider le MJ sans lui retirer le controle.

### 22-1 - Assistant preparation

Fonctionnalites :

- checklist session ;
- scenes incompletes ;
- PNJ incomplets ;
- combats non prepares ;
- arcs ouverts.

### 22-2 - Assistant improvisation

Generateurs :

- nom PNJ ;
- rumeur ;
- taverne ;
- objet ;
- rencontre ;
- meteo ;
- consequence.

### 22-3 - Assistant rythme

Fonctionnalites :

- combat trop long ;
- joueur inactif ;
- indice non donne ;
- tension faible ;
- pause recommandee.

### 22-4 - Assistant apres-session

Fonctionnalites :

- resume session ;
- decisions ;
- XP ;
- butin ;
- consequences ;
- taches MJ ;
- message recap joueurs.

---

## Phase 23 - Donnees, export et extensibilite

Objectif : rendre les campagnes durables.

### 23-1 - Export campagne

Formats :

- JSON ;
- Markdown ;
- ZIP assets ;
- personnages ;
- scenes ;
- notes ;
- logs.

### 23-2 - Import

Fonctionnalites :

- importer personnages ;
- importer cartes ;
- importer notes ;
- importer tokens ;
- mapping champs.

### 23-3 - Compendium

Contenus :

- monstres ;
- sorts ;
- objets ;
- regles ;
- tables aleatoires ;
- macros.

### 23-4 - Regles maison

Fonctionnalites :

- champs dynamiques ;
- formules ;
- statblocks custom ;
- systemes personnalisables.

### 23-5 - API et webhooks

Fonctionnalites :

- webhooks ;
- exports automatises ;
- integrations bots ;
- sauvegardes externes.

---

# Priorisation court terme

## Priorite immediate

1. Finaliser panneaux MJ :
   - presets toujours accessibles ;
   - preset personnalise ;
   - dock panneaux reduits ;
   - epingler/detacher ;
   - focus carte.

2. Gestion tokens :
   - supprimer ;
   - dupliquer ;
   - editer ;
   - cacher/reveler ;
   - verrouiller ;
   - menu clic droit.

3. Interface joueur :
   - route joueur ;
   - carte joueur ;
   - fiche compacte ;
   - des joueur ;
   - journal public.

## Priorite moyenne

4. Visibilite et aperçu joueur.
5. Fog manuel MVP.
6. Mesures, ping, annotations.
7. Combat avance.
8. Notes de scene.

## Priorite longue

9. PNJ/factions.
10. Handouts/immersion.
11. Performance/accessibilite.
12. Multi-ecrans.
13. Assistant MJ.
14. Export/import/compendium.

---

# Definition des releases

## v0.10.x - Interface MJ

Objectif :

- interface MJ propre ;
- panneaux utilisables ;
- presets ;
- layout personnalise ;
- focus carte.

## v0.11.x - Tokens avances

Objectif :

- edition ;
- suppression ;
- duplication ;
- visibilite ;
- verrouillage ;
- menu contextuel.

## v0.12.x - Interface joueur

Objectif :

- vue joueur dediee ;
- carte joueur ;
- fiche compacte ;
- des ;
- journal public.

## v0.13.x - Visibilite et secrets

Objectif :

- badges ;
- aperçu joueur ;
- historique revelations ;
- mode panique.

## v0.14.x - Fog et calques MJ

Objectif :

- fog manuel ;
- calques ;
- zones cachees ;
- aperçu joueur.

## v0.15.x - Outils carte

Objectif :

- mesures ;
- ping ;
- dessin ;
- gabarits.

## v0.16.x - Combat avance

Objectif :

- tracker complet ;
- effets ;
- degats ;
- fin de combat.

## v0.17.x - Notes et memoire

Objectif :

- notes rapides ;
- indices ;
- chronologie ;
- recherche.

## v0.18.x - PNJ, creatures, factions

Objectif :

- base narrative ;
- relations ;
- factions ;
- creatures.

## v0.19.x - Immersion

Objectif :

- handouts ;
- audio ;
- packs scene ;
- revelations dramatiques.

## v0.20.x - Stabilite et performance

Objectif :

- prechargement ;
- connexion faible ;
- autosave ;
- accessibilite.

---

# Checklist globale de qualite

Avant chaque merge important :

- git status clean ;
- build Docker OK ;
- health backend OK ;
- smoke tests OK ;
- frontend accessible ;
- test navigateur rapide ;
- documentation mise a jour ;
- commit clair ;
- push branche ;
- merge main ;
- tag si release.

Commandes standard :

- docker compose up -d --build
- sh scripts/wait-api.sh
- curl -fsS http://127.0.0.1:8091/api/health
- sh scripts/smoke-phase2.sh
- sh scripts/smoke-phase3.sh
- sh scripts/smoke-phase4.sh
- sh scripts/smoke-phase5.sh
- sh scripts/smoke-phase6.sh
- sh scripts/smoke-phase7.sh
- sh scripts/smoke-phase8.sh
- curl -I http://127.0.0.1:8090

---

# Regle de developpement

Chaque phase doit contenir :

1. une documentation ;
2. une implementation limitee ;
3. un smoke test si backend ;
4. une validation frontend ;
5. un commit propre ;
6. un merge uniquement apres validation.

Ne pas empiler des fonctionnalites dans le mode Partie.  
Tout outil lourd doit aller dans Preparation ou Avance.  
Tout outil joueur doit aller dans l'interface joueur dediee.  
Tout contenu secret doit avoir une visibilite explicite.
