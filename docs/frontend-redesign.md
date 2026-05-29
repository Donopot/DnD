# Refonte frontend

## Objectif

Le frontend actuel a permis de valider les phases 2 a 8, mais il n'est pas adapte a une utilisation reelle.

Problemes actuels :

- main.tsx trop gros ;
- trop de responsabilites dans un seul fichier ;
- interface dense ;
- parcours MJ peu clair ;
- carte et combat peu ergonomiques ;
- manque de separation entre vue MJ et vue joueur ;
- composants non reutilisables ;
- etat global difficile a maintenir.

## Objectif produit

Construire une interface utilisable en vraie session :

- navigation claire ;
- dashboard campagnes ;
- vue campagne propre ;
- vue session dediee ;
- carte centrale lisible ;
- panneaux lateraux ;
- combat manager accessible ;
- journal de session lisible ;
- fiche personnage consultable rapidement ;
- experience MJ-first ;
- experience joueur simplifiee.

## Strategie technique

Refactorer progressivement sans casser le backend.

Le backend reste stable.
Les smoke tests Phase 2 a 8 restent la reference.

## Nouvelle structure cible

frontend/src/
- main.tsx
- App.tsx
- api/
  - client.ts
  - types.ts
- hooks/
  - useAuth.ts
  - useCampaigns.ts
  - useRealtime.ts
- components/
  - Layout.tsx
  - AuthView.tsx
  - CampaignSidebar.tsx
  - CampaignDashboard.tsx
  - CharacterPanel.tsx
  - VttBoard.tsx
  - AssetPanel.tsx
  - CombatPanel.tsx
  - SessionLogPanel.tsx
- styles/
  - globals.css
  - layout.css
  - panels.css
  - vtt.css
  - combat.css

## Phase frontend R1 - Nettoyage structurel

Objectif :

- sortir les types dans api/types.ts ;
- sortir le client API dans api/client.ts ;
- creer App.tsx ;
- garder le comportement identique ;
- build Docker OK.

Critere d'acceptation :

- npm run build passe ;
- docker compose up -d --build passe ;
- smoke tests Phase 2 a 8 passent.

## Phase frontend R2 - Layout application

Objectif :

- creer un layout stable ;
- sidebar campagnes ;
- zone principale ;
- topbar statut utilisateur/realtime ;
- meilleure gestion mobile.

## Phase frontend R3 - Vue campagne

Objectif :

- separer les panneaux :
  - membres ;
  - invitations ;
  - personnages ;
  - assets ;
  - notes futures.

## Phase frontend R4 - Vue session

Objectif :

- creer une vraie vue de session :
  - carte au centre ;
  - combat a droite ;
  - log en bas ou a gauche ;
  - outils scene/tokens/assets ;
  - mode MJ.

## Phase frontend R5 - UX carte

Objectif :

- meilleure carte ;
- zoom/pan ;
- selection token ;
- panneau details token ;
- drag and drop plus tard.

## Phase frontend R6 - Vue joueur

Objectif :

- masquer controles MJ ;
- afficher seulement fiche, carte, jets, journal public ;
- preparer les permissions frontend.

## Contraintes

- Ne pas casser les endpoints existants.
- Ne pas changer le backend pendant R1 sauf bug bloquant.
- Garder chaque refactor petit et testable.
- Commit par etape.

## Etape R4-6 - Harmonisation globale

Objectif :

- workspace plus large ;
- sidebar plus compacte ;
- topbar sticky ;
- panneaux plus lisibles ;
- meilleure lisibilite de la vue Session ;
- style plus proche d'une application VTT utilisable.

Critere d'acceptation :

- build Docker OK ;
- smoke tests Phase 2 a 8 OK ;
- frontend accessible sur http://127.0.0.1:8090 ;
- navigation campagne plus confortable.

## Etape R4-7 - Actions rapides MJ

Objectif :

- ajouter une barre d'actions rapides dans la vue Session ;
- permettre au MJ d'acceder rapidement a la carte ;
- ouvrir rapidement le panneau ajouter token ;
- ouvrir rapidement le lancer de de ;
- ouvrir rapidement l'ajout de combattant ;
- avancer au tour suivant sans chercher dans les panneaux.

Critere d'acceptation :

- build Docker OK ;
- smoke tests Phase 2 a 8 OK ;
- la vue Session affiche une barre d'actions rapides ;
- les boutons ouvrent les panneaux correspondants.

## Etape R4-8 - Review finale frontend redesign

Objectif :

- valider la refonte frontend R1 a R4 ;
- confirmer que le frontend build avec Docker ;
- confirmer que les smoke tests backend Phase 2 a 8 restent OK ;
- confirmer que le frontend reste accessible sur le port 8090 ;
- merger la branche feature/frontend-redesign dans main.

Resume des ameliorations :

- extraction de App.tsx depuis main.tsx ;
- extraction des types API ;
- extraction des composants principaux ;
- navigation par vues campagne ;
- vue Session dediee ;
- panneaux VTT repliables ;
- combat manager plus compact ;
- journal plus lisible ;
- polish global workspace ;
- barre d'actions rapides MJ.

Critere d'acceptation :

- docker compose up -d --build OK ;
- /api/health OK ;
- smoke-phase2 a smoke-phase8 OK ;
- HTTP 200 sur le frontend ;
- working tree clean avant merge ;
- merge dans main effectue.
