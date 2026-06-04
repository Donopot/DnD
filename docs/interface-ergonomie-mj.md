# Refonte ergonomique de l'interface MJ

Document de cadrage pour ameliorer l'interface du VTT DnD, rendre la session
plus fluide, reduire la charge cognitive du MJ et lever les restrictions qui
empechent un maitre de jeu de reprendre la main rapidement pendant une partie.

Ce document complete `docs/frontend-ui.md` et `docs/vtt-map-fog.md` :

- `docs/frontend-ui.md` reste la reference des panneaux, du registre et du
  systeme de panneaux flottants.
- `docs/vtt-map-fog.md` reste la reference technique de la carte, des tokens et
  du fog of war.
- Ce document definit la direction produit/UX, les priorites et les comportements
  attendus pour une interface MJ plus ergonomique.

## Contexte GitHub

Etat observe via GitHub le 4 juin 2026, apres merge des PR GM-2F/3C/3D :

| PR | Sujet | Statut | Impact UI |
|----|-------|--------|-----------|
| #54 | Conditions panel | Mergee | Ajoute la gestion des etats en session live |
| #55 | Active encounter panel | Mergee | Ajoute une vue de rencontre active avec objectifs/loot |
| #57 | Review checklist AGENTS | Mergee | Renforce les regles de review UI/CSS |
| #58 | Quick actions dice row | Mergee | Ameliore les actions rapides et le scoping CSS |

Ces PR ont pose le socle des panneaux MJ recents : actions rapides, conditions,
rencontre active et checklist de review. La refonte ergonomique doit maintenant
organiser ces outils autour des workflows reels de session, au lieu d'ajouter des
panneaux de facon lineaire.

## Objectifs produit

1. **Carte dominante** : la carte doit etre le centre de gravite. Les panneaux
   doivent soutenir l'action, pas reduire la carte a une zone secondaire.
2. **MJ en controle** : un MJ doit pouvoir outrepasser rapidement les restrictions
   de visibilite, mouvement, fog, scene, initiative et documents quand la session
   l'exige.
3. **Moins de friction** : les actions frequentes doivent etre accessibles en un
   clic ou un raccourci, sans chercher dans plusieurs panneaux.
4. **Panneaux contextuels** : l'interface doit afficher les bons outils selon le
   mode de session, le token selectionne et l'etat du combat.
5. **Etat fiable** : aucune action importante ne doit dependre d'un etat React
   stale, d'une mutation DOM directe ou d'un localStorage parallele non synchronise.
6. **Lisibilite en session** : texte compact, controle stable, aucun bouton qui
   change de place pendant que le MJ manipule une scene.
7. **Architecture maintenable** : les ameliorations doivent reduire la taille de
   `App.tsx`, pas l'augmenter.

## Public cible

### MJ en session live

Le MJ doit pouvoir :

- deplacer et selectionner n'importe quel token ;
- basculer vite entre carte, combat, notes, jets, documents et visibilite ;
- corriger une erreur joueur sans passer par un flux admin ;
- masquer ou reveler une information immediatement ;
- garder les outils critiques visibles tout en conservant une grande carte.

### MJ en preparation

Le MJ doit pouvoir :

- preparer scenes, tokens, rencontres, notes et documents sans passer dans un
  mode live encombre ;
- tester ce que les joueurs verront ;
- creer des presets de layout pour retrouver une configuration de session.

### Joueur

Le joueur doit avoir une interface plus simple que le MJ :

- carte lisible ;
- onglets clairs ;
- actions autorisees visibles ;
- actions non autorisees masquees ou expliquees ;
- notifications non intrusives.

## Problemes UX actuels

### 1. Trop de panneaux au meme niveau

Le registre GM contient beaucoup de panneaux actifs ou en cours d'ajout. Le mode
`exploration` affiche deja une liste tres longue. Le MJ doit chercher le bon
outil dans une colonne plutot que travailler depuis un cockpit priorise.

Risque :

- surcharge visuelle ;
- scroll constant ;
- doublons entre `combat`, `initiative`, `active-encounter`, `conditions` ;
- outils critiques perdus dans les panneaux secondaires.

### 2. `App.tsx` centralise trop de rendu

`frontend/src/App.tsx` gere l'auth, le chargement des donnees, les websockets, la
vue GM, la vue joueur, les panneaux dockes, les panneaux flottants et une longue
serie de `panel.id === "..."`

Risque :

- chaque nouveau panneau augmente le risque de regression ;
- les dependances d'effets deviennent difficiles a raisonner ;
- les comportements websocket et chargement peuvent diverger entre panneaux ;
- les refontes UI restent couteuses.

### 3. Les restrictions MJ sont trop implicites

Certaines restrictions sont necessaires cote joueur, mais le MJ doit pouvoir les
outrepasser clairement. Aujourd'hui, les permissions sont dispersees entre
composants, routes et conventions.

Exemples de restrictions a clarifier :

- mouvement des tokens joueurs ;
- visibilite token / fog / scene ;
- gestion de l'initiative ;
- revelation de documents ;
- edition de conditions ;
- reprise de controle d'un token possede par un joueur.

### 4. La carte et les panneaux se concurrencent

Le layout trois colonnes est utile pour demarrer, mais trop contraignant pendant
une scene active. Le MJ doit pouvoir :

- passer en carte plein ecran ;
- garder 1 a 3 panneaux flottants critiques ;
- masquer tout le reste ;
- rappeler un panneau depuis un dock compact ;
- enregistrer un preset de disposition.

### 5. Les controles manquent de hierarchy

Les boutons d'action se ressemblent souvent. Les actions destructives,
temporaires, de mode et de sauvegarde ne sont pas toujours distinguees.

La refonte doit separer :

- action primaire ;
- action secondaire ;
- toggle de mode ;
- action dangereuse ;
- action de layout ;
- indicateur non interactif.

## Direction UX cible

### Principe : cockpit MJ, pas tableau de bord marketing

L'interface doit rester dense, utilitaire et orientee session. Pas de hero, pas
de grandes cartes decoratives, pas de sections marketing. Le premier ecran apres
connexion doit etre l'espace de travail.

### Structure cible du workspace MJ

```text
┌─────────────────────────────────────────────────────────────────────┐
│ Topbar compacte : campagne, mode, scene, statut, actions globales    │
├───────────────┬───────────────────────────────────────┬─────────────┤
│ Rail gauche   │ Carte VTT dominante                   │ Rail outils │
│ Campagnes     │ - scene                               │ Panneaux    │
│ Espaces       │ - tokens                              │ contextuels │
│ Presets       │ - fog                                 │ Dock        │
├───────────────┴───────────────────────────────────────┴─────────────┤
│ Dock flottant : panneaux minimises, notifications, statut websocket  │
└─────────────────────────────────────────────────────────────────────┘
```

### Topbar

La topbar doit rester courte et stable :

| Zone | Contenu |
|------|---------|
| Gauche | campagne active, scene active, statut websocket |
| Centre | mode de session : Exploration, Combat, Roleplay, Preparation rapide, Minimal |
| Droite | focus map, ouvrir panneaux, presets, parametres MJ |

Regles :

- pas de listes longues dans la topbar ;
- pas de boutons de panneau individuels hors menu/preset ;
- la scene active doit etre visible sans ouvrir un panneau.

### Rail gauche

Le rail gauche doit servir a la navigation de haut niveau :

- campagnes ;
- espaces de travail ;
- presets de session ;
- bouton retour lobby ;
- deconnexion.

Il ne doit pas contenir des controles de carte ou de combat.

### Carte centrale

La carte doit supporter trois tailles :

| Mode | Usage |
|------|-------|
| Normal | carte dominante + rail outils |
| Focus map | carte plein ecran + toolbar compacte |
| Floating map | carte detachable pour multi-ecran ou streaming |

Les controles de carte restent dans la carte :

- pan ;
- zoom ;
- recentrage ;
- grille ;
- fog display ;
- draw/erase fog ;
- outils de mesure ;
- ping ;
- selection ;
- mini-map.

### Rail outils droit

Le rail droit ne doit pas afficher tous les panneaux actifs en bloc. Il doit
afficher les panneaux utiles au mode courant et au contexte.

Exemple :

| Mode | Panneaux prioritaires |
|------|-----------------------|
| Combat | Rencontre active, Combat, Initiative, Conditions, Actions rapides, Token |
| Exploration | Carte, Visibilite, Notes, Handouts, Journal, Tokens |
| Roleplay | Notes MJ, Chat, Messages, Handouts, PNJ, Journal |
| Preparation rapide | Scenes, Tokens, Bibliotheque tokens, Bestiaire, Rencontres |
| Minimal | Token, Des, Journal compact |

## Lever les restrictions cote MJ

### Regle produit

Un MJ doit etre contraint par la securite serveur, mais pas par une friction UI.
Quand une action est autorisee par son role, l'interface doit la rendre accessible
directement.

### Capacites MJ a ajouter ou rendre explicites

| Capacite | Comportement cible |
|----------|--------------------|
| Override mouvement token | Le MJ peut deplacer tout token, meme possede par un joueur |
| Reprendre controle token | Action contextuelle "Prendre le controle temporaire" |
| Forcer visibilite token | Hide/reveal manuel depuis token, liste tokens et inspecteur |
| Bypass fog local | Voir/masquer le fog localement sans changer la vue joueur |
| Reveal joueur | Bouton clair "Reveler aux joueurs" pour zone, token, document |
| Reset fog scene | Action dangereuse avec confirmation |
| Forcer scene active | Changer la scene joueur depuis la topbar ou panneau scenes |
| Corriger combat | Changer round, tour, initiative, PV, conditions sans flow lourd |
| Editer tout document | MJ/co-MJ peuvent editer, reveler, retirer tout handout de campagne |
| Simuler vue joueur | Mode "Voir comme joueur" depuis la carte |

### Parametres MJ de permissions

Ajouter un panneau `Parametres MJ` ou enrichir le panneau campagne avec :

| Parametre | Valeur cible |
|-----------|--------------|
| `allow_player_token_move` | autorise les joueurs a deplacer leurs tokens |
| `show_player_hp` | affiche PV aux joueurs |
| `show_token_names` | affiche noms tokens aux joueurs |
| `fog_enabled` | active le fog cote joueur |
| `auto_reveal_on_move` | revele automatiquement selon vision |
| `player_ping_enabled` | autorise ping joueur |
| `player_measure_enabled` | autorise regle joueur |
| `dice_visibility_default` | public / MJ / prive |
| `handout_auto_notify` | notification joueur a la revelation |

Ces parametres doivent etre persistants cote backend, pas seulement en
localStorage.

### UX des actions sensibles

Les actions MJ puissantes doivent etre rapides mais lisibles :

- action dangereuse en rouge ;
- confirmation courte uniquement pour les destructions ou reset globaux ;
- pas de confirmation pour hide/reveal simple, mouvement, initiative, PV ;
- undo quand c'est moins intrusif qu'une confirmation ;
- journalisation des actions critiques dans le log MJ.

## Standards visuels et ergonomiques

### Palette

Conserver une ambiance fantasy sobre, mais reduire la dependance aux variations
d'un seul vert/dore. Le VTT doit pouvoir afficher longtemps sans fatigue.

Tokens CSS recommandes :

```css
:root {
  --ui-bg: #11161a;
  --ui-surface: #171f24;
  --ui-surface-raised: #202930;
  --ui-border: #344049;
  --ui-text: #ece8dc;
  --ui-muted: #a9b0aa;
  --ui-accent: #c7a64a;
  --ui-action: #6fb7ff;
  --ui-success: #5ec27f;
  --ui-warning: #e1b84d;
  --ui-danger: #ef6b5d;
}
```

Regles :

- accents reserves aux actions ou etats, pas aux surfaces entieres ;
- danger visible mais non agressif ;
- contraste suffisant sur les panneaux flottants ;
- pas de gros gradients decoratifs ;
- pas de cartes imbriquees.

### Densite

Un outil MJ doit etre compact mais respirable :

| Surface | Densite cible |
|---------|---------------|
| Carte | maximale, chrome minimal |
| Panneaux session live | compact, lignes et sections courtes |
| Bibliotheques | listes filtrables, pas grille de cartes par defaut |
| Fiches detail | panneaux scrollables avec sections repliees |
| Mobile | onglets, une zone active a la fois |

### Boutons et controles

Utiliser des icones `lucide-react` quand le symbole est standard :

| Action | Controle cible |
|--------|----------------|
| Fermer | X |
| Reduire | Minimize |
| Maximiser | Maximize |
| Centrer | Crosshair |
| Pan | Hand |
| Grille | Grid |
| Fog visible | Eye / EyeOff |
| Dessin fog | Pencil / Brush |
| Gomme | Eraser |
| Undo | Undo2 |
| Lock | Lock / Unlock |
| Reveler | Eye |
| Cacher | EyeOff |

Texte + icone seulement pour les actions ambigues ou dangereuses :

- "Reveler aux joueurs" ;
- "Reset fog" ;
- "Forcer scene active" ;
- "Prendre controle".

### Tooltips

Remplacer progressivement les `title=""` natifs par un composant `Tooltip` :

- delai court ;
- texte concis ;
- support clavier/focus ;
- pas d'instruction longue dans l'interface visible ;
- pas de tooltip sur les labels evidents.

## Workflows prioritaires

### Workflow 1 : demarrer une session

1. Choisir campagne.
2. Selectionner scene active.
3. Choisir preset de layout.
4. Ouvrir mode Session Live.
5. Verifier vue joueur.
6. Lancer le statut "session active".

Ameliorations :

- bouton "Demarrer session" ;
- resume des pre-requis : scene, joueurs connectes, tokens, fog, documents ;
- ouverture automatique du preset choisi.

### Workflow 2 : combat

Cockpit combat cible :

- carte ;
- rencontre active ;
- initiative ;
- conditions ;
- actions rapides ;
- detail token selectionne ;
- journal compact.

Actions en un clic :

- demarrer/terminer rencontre ;
- tour suivant/precedent ;
- appliquer degats/soin ;
- ajouter condition ;
- marquer vaincu ;
- cacher/reveler token ;
- centrer sur token actif.

### Workflow 3 : exploration et fog

Cockpit exploration cible :

- carte dominante ;
- visibility inspector ;
- notes MJ ;
- handouts ;
- token detail ;
- mini-map.

Actions en un clic :

- ping ;
- mesure ;
- draw/erase fog ;
- undo fog ;
- reveal token ;
- reveal handout ;
- "voir comme joueur".

### Workflow 4 : roleplay

Cockpit roleplay cible :

- notes MJ ;
- messages ;
- chat ;
- handouts ;
- PNJ ;
- journal ;
- des rapides.

Actions en un clic :

- envoyer message secret ;
- reveler document ;
- creer note liee a scene/token ;
- retrouver PNJ ;
- lancer jet cache.

### Workflow 5 : preparation rapide

Cockpit preparation cible :

- scenes ;
- tokens ;
- bibliotheque tokens ;
- bestiaire ;
- generateur rencontres ;
- notes ;
- documents.

Actions en un clic :

- creer scene ;
- importer image ;
- ajouter token depuis bibliotheque ;
- creer rencontre depuis scene ;
- dupliquer token ;
- tester vue joueur.

## Architecture React cible

### Decouper `App.tsx`

Objectif : `App.tsx` orchestre l'application, mais ne rend plus chaque panneau
un par un.

Structure cible :

```text
frontend/src/
  app/
    AppShell.tsx
    AuthGate.tsx
    RealtimeProvider.tsx
    CampaignDataProvider.tsx
  workspaces/
    gm/
      GmWorkspace.tsx
      GmTopbar.tsx
      GmNavigationRail.tsx
      GmToolRail.tsx
      GmPanelRenderer.tsx
      useGmWorkspaceState.ts
    player/
      PlayerWorkspace.tsx
      PlayerTabs.tsx
  panels/
    registry.ts
    panelComponents.ts
    panelPresets.ts
  map/
    MapViewport.tsx
    MapBoard.tsx
    MapLayers.tsx
    TokenLayer.tsx
    MapToolbar.tsx
```

### PanelRenderer

Remplacer les longues conditions `panel.id === "..."` par un registre de rendu :

```ts
type PanelRenderContext = {
  campaignId: string;
  token: string;
  selectedSceneId: string;
  selectedTokenId: string;
  actions: GmPanelActions;
};

type PanelComponent = (ctx: PanelRenderContext) => React.ReactNode;
```

Avantages :

- ajout de panneau sans modifier 4 zones d'`App.tsx` ;
- tests plus simples ;
- rendu docke/flottant partage la meme source ;
- props coherentes.

### Donnees et performance

Principes React a appliquer :

- charger les donnees independantes en parallele (`Promise.all`) ;
- eviter les waterfalls entre campagne, scenes, tokens, handouts si les donnees
  peuvent etre chargees ensemble ;
- dedupliquer les listeners websocket ;
- eviter les dependances d'effet non primitives quand elles relancent des fetchs ;
- memoiser les listes lourdes uniquement quand le calcul est reellement couteux ;
- utiliser `startTransition` ou etat differe pour les filtres de bibliotheque ;
- versionner les donnees localStorage (`layoutVersion`) et prevoir migration/reset.

### Source de verite

| Donnee | Source cible |
|--------|--------------|
| Positions tokens | backend + React state + websocket |
| Conditions combat | backend `combatants.conditions` |
| Notes rencontre personnelles | localStorage possible, versionne |
| Layout panneaux | localStorage versionne, plus tard backend |
| Parametres campagne/MJ | backend |
| Fog | backend + React state + websocket |
| Presence websocket | RealtimeProvider |

## Presets de layout

Ajouter des presets de disposition :

| Preset | Contenu |
|--------|---------|
| Combat | carte + rencontre + initiative + conditions + actions |
| Exploration | carte + visibilite + notes + documents |
| Roleplay | notes + messages + chat + PNJ + journal |
| Preparation | scenes + tokens + bibliotheques + rencontres |
| Streaming | carte large + journal compact + actions rapides |
| Minimal | carte + token detail + des |

Chaque preset definit :

- mode session ;
- panneaux dockes ;
- panneaux flottants ;
- tailles et positions ;
- carte focus ou non ;
- filtres actifs ;
- option "restaurer au prochain login".

## Interface joueur

La vue joueur doit rester simple et ne pas heriter de toute la complexite MJ.

### Cible

- carte en premier ;
- tabs : Personnage, Carte, Des, Documents, Combat, Journal ;
- notifications compactes ;
- actions joueur visibles uniquement si autorisees ;
- aucune action disabled sans explication si elle est critique.

### Permissions joueur visibles

Le joueur doit comprendre :

- pourquoi un token ne bouge pas ;
- pourquoi une zone est cachee ;
- si le MJ a desactive le mouvement ;
- si un document vient d'etre revele ;
- si un combat est actif.

## Accessibilite et utilisabilite

Minimum attendu :

- focus visible sur tous les boutons ;
- `aria-label` sur boutons icones ;
- raccourcis ignores dans inputs/textareas ;
- taille cible tactile minimale 32 px en desktop dense, 40 px en mobile ;
- pas de texte coupe dans les boutons ;
- scroll interne aux panneaux, pas a la page entiere ;
- `prefers-reduced-motion` pour transitions ;
- confirmations accessibles au clavier.

## Roadmap par PR

### PR 1 — Document et inventaire

Objectif : aligner les agents et le produit.

- Ajouter ce document.
- Lier depuis `docs/frontend-ui.md` ou `docs/README.md` si necessaire.
- Marquer les PR #54, #55, #57 et #58 comme socle deja merge dans `main`.
- Garder ce document comme cadrage vivant pour les prochaines refontes UI.

### PR 2 — PanelRenderer et registry de rendu

Objectif : reduire `App.tsx`.

- Creer `frontend/src/panels/panelComponents.tsx`.
- Centraliser le rendu docke/flottant.
- Conserver `gmPanels.ts` comme registre metier.
- Verifier `scripts/check-gm-panels-current.sh`.

### PR 3 — Presets et tool rail

Objectif : transformer la liste de panneaux en cockpit.

- Ajouter `panelPresets.ts`.
- Ajouter selecteur de preset dans topbar.
- Afficher seulement les panneaux du preset courant.
- Sauvegarder le preset actif.

### PR 4 — Libertés MJ / permissions explicites

Objectif : rendre les overrides visibles.

- Ajouter panneau ou section `Parametres MJ`.
- Ajouter actions contextuelles token : prendre controle, reveal, hide, center.
- Clarifier `MapPermissions`.
- Ajouter "voir comme joueur".

### PR 5 — Panneaux flottants v2

Objectif : ergonomie multi-outils.

- Ajouter pin/lock/maximize.
- Ajouter snap edges.
- Ajouter reset layout par preset.
- Ajouter version de localStorage.
- Ajouter dock compact.

### PR 6 — Focus map et mini-map

Objectif : carte dominante.

- Stabiliser focus map.
- Mini-map interactive.
- Toolbar compacte.
- Tests desktop/mobile.

### PR 7 — Joueur simplifié

Objectif : experience joueur claire.

- Tabs joueur plus compactes.
- Permissions visibles.
- Notifications ameliorees.
- Carte lisible mobile.

### PR 8 — Polish UI system

Objectif : finition professionnelle.

- Tooltip component.
- Toast component.
- Tokens CSS.
- Audit contrastes.
- Nettoyage CSS global.

## Checklist de validation

### Commandes

```bash
cd frontend
npm ci
npx tsc --noEmit
npm run build

cd ..
bash scripts/check-gm-panels-current.sh
bash scripts/check-gm-panel-css.sh

cd backend
uv sync
uv run pytest --tb=short -q
```

### Tests manuels MJ

- Le MJ peut demarrer une session depuis une campagne existante.
- La carte est visible et utilisable sans ouvrir de panneau.
- Le mode combat ouvre les outils critiques.
- Le mode roleplay ne montre pas les outils de preparation lourds.
- Le MJ peut deplacer tout token.
- Le MJ peut cacher/reveler un token.
- Le MJ peut voir ce que verra un joueur.
- Le MJ peut corriger initiative, PV et conditions.
- Le MJ peut reveler un handout.
- Les panneaux flottants gardent position et taille apres reload.
- Le reset layout restaure un preset propre.
- Le focus map masque les panneaux sans perdre l'etat.

### Tests manuels joueur

- Le joueur voit uniquement les tokens autorises.
- Le joueur comprend si le mouvement de token est interdit.
- Un handout revele apparait sans refresh.
- Le combat actif met a jour l'onglet Combat.
- La carte reste lisible sur petit ecran.

## Critères de réussite

La refonte est consideree reussie si :

- le MJ peut jouer une scene complete avec carte + 2 ou 3 panneaux critiques ;
- moins de 3 clics suffisent pour reveler une information aux joueurs ;
- moins de 3 clics suffisent pour corriger un token ou un combat ;
- `App.tsx` perd progressivement la responsabilite du rendu individuel des panneaux ;
- les restrictions joueur restent fortes, mais les overrides MJ sont explicites ;
- aucun nouvel outil ne depend d'un localStorage parallele quand le backend possede
  deja la donnee ;
- chaque nouvelle surface a un test manuel documente.

## Points de vigilance

- Ne pas fusionner la refonte map et la refonte panneaux dans une seule PR.
- Ne pas ajouter de nouveaux panneaux sans preset ou categorie claire.
- Ne pas transformer l'interface en landing page ou dashboard decoratif.
- Ne pas cacher les actions MJ puissantes derriere des menus profonds.
- Ne pas augmenter la taille de `App.tsx` pour chaque nouveau panneau.
- Ne pas introduire de theme unique trop monochrome.
- Ne pas rompre les permissions serveur pour "simplifier" l'UX.

## Ordre de priorité recommandé

1. Valider en session le socle merge : Quick Actions, Conditions et Rencontre active.
2. Introduire `PanelRenderer`.
3. Ajouter presets de layout.
4. Ajouter overrides MJ explicites.
5. Améliorer panneaux flottants.
6. Stabiliser focus map + mini-map.
7. Simplifier vue joueur.
8. Extraire le design system CSS.
