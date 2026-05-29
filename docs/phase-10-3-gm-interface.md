# Phase 10-3 - Interface MJ propre

## Etape 10-3B - Modes MJ Partie / Preparation / Avance

Objectif :

- separer clairement l'interface MJ en trois modes ;
- rendre le mode Partie propre et non surcharge ;
- conserver les outils de creation dans le mode Preparation ;
- garder les panneaux libres dans le mode Avance.

Modes :

### Partie

Interface de jeu en direct.

Visible :

- carte principale dominante ;
- mini-map ;
- detail token ;
- barre d'actions ;
- boutons carte essentiels.

Cache :

- creation scene ;
- upload carte ;
- choix fond ;
- liste token longue ;
- formulaires avancees.

### Preparation

Interface de configuration avant session.

Visible :

- outils scene ;
- upload carte ;
- choix du fond ;
- ajout token ;
- liste tokens.

### Avance

Interface flexible pour MJ expert.

Visible :

- panneaux libres ;
- presets ;
- reset panneaux ;
- deplacement/redimensionnement libre.

Critere d'acceptation :

- build Docker OK ;
- smoke tests Phase 2 a 8 OK ;
- le mode Partie est selectionne par defaut ;
- le mode Partie masque les formulaires longs ;
- le mode Preparation affiche les outils ;
- le mode Avance active les panneaux libres.

## Etape 10-3C - Cockpit MJ compact

Objectif :

- ajouter un cockpit MJ lisible au-dessus de la carte ;
- afficher la scene active ;
- afficher le mode MJ courant ;
- afficher le nombre de tokens ;
- afficher le token selectionne ;
- afficher le zoom ;
- proposer des actions rapides sans ouvrir de longs formulaires.

Actions rapides :

- centrer la carte ;
- ajouter un token ;
- ouvrir les outils de scene ;
- revenir au mode Partie ;
- passer en mode Avance.

Critere d'acceptation :

- build Docker OK ;
- smoke tests Phase 2 a 8 OK ;
- le cockpit est visible mais compact ;
- la carte reste dominante ;
- les actions rapides fonctionnent ;
- le mode Partie reste l'interface par defaut.

## Etape 10-3E - Nettoyage final du mode Partie MJ

Objectif :

- retirer les doublons visuels en mode Partie ;
- masquer les outils avances pendant la session live ;
- masquer le panneau detail token complet, car l'inspecteur MJ resume deja le token actif ;
- masquer les controles de panneaux libres en mode Partie ;
- garder la carte dominante ;
- conserver mini-map et inspecteur MJ comme panneau droit compact.

Mode Partie final :

Visible :

- cockpit MJ compact ;
- carte principale ;
- controle zoom / snap / pan / reset carte ;
- mini-map compacte ;
- inspecteur MJ contextuel.

Masque :

- creation scene ;
- upload carte ;
- choix fond ;
- ajout token ;
- liste tokens longue ;
- panneaux libres ;
- reset panneaux ;
- menu panneaux ;
- detail token complet.

Les outils masques restent accessibles via :

- mode Preparation ;
- mode Avance ;
- actions rapides du cockpit.

Critere d'acceptation :

- build Docker OK ;
- smoke tests Phase 2 a 8 OK ;
- la carte occupe la majorite de l'ecran ;
- le mode Partie ne montre plus les formulaires longs ;
- le mode Preparation conserve les outils MJ ;
- le mode Avance conserve les panneaux libres.
