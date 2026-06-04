# Smoke tests manuels — Avant merge

Exécuter ces scénarios sur l'instance de dev (`dnd.dtmini.com`) avant chaque merge.

---

## Scénario 1 : Token CRUD complet

1. Ouvrir une campagne avec des tokens
2. Cliquer sur un token sur la carte → **TokenDetailPanel s'ouvre**
3. Éditer le nom du token → **le nom change sur la carte**
4. Modifier la taille (ex: medium → large) → **le token change de taille**
5. Changer la couleur → **la couleur du token change**
6. Masquer le token → **le token disparaît de la vue joueur**
7. Ré-afficher le token → **le token réapparaît**
8. Utiliser les flèches pour déplacer → **le token bouge**
9. Désélectionner → **le panneau affiche "Sélectionnez un token"**

---

## Scénario 2 : Journal — catégories et marqueurs

1. Aller dans l'onglet "Journal"
2. Ajouter une note "Début de session" → **apparaît dans le journal**
3. Changer la catégorie en "Combat" → **la catégorie s'affiche**
4. Filtrer par "Combat" → **seule cette entrée est visible**
5. Revenir à "Tous" → **toutes les entrées visibles**
6. Épingler l'entrée → **apparaît dans "Épinglés"**
7. Cliquer "Session" → **un marqueur de session est créé**

---

## Scénario 3 : Handouts — créer, révéler, supprimer

1. Aller dans l'onglet "Préparation" → "Documents"
2. Créer un document "Note secrète" (visibilité MJ) → **apparaît dans la liste**
3. Révéler aux joueurs → **le statut passe à "Joueurs (révélé)"**
4. Supprimer → **confirmation puis disparition**

---

## Scénario 4 : Visibilité des tokens

1. Sélectionner un token sur la carte
2. Aller dans "Visibilité"
3. Le token sélectionné est listé
4. Toggle visibilité → **le token change d'état**

---

## Scénario 5 : Combat

1. Aller dans "Combat"
2. Ajouter un token au combat
3. Vérifier que le token apparaît dans le tracker

---

## Résultat

| Scénario | Statut |
|---|---|
| 1. Token CRUD | ☐ |
| 2. Journal | ☐ |
| 3. Handouts | ☐ |
| 4. Visibilité | ☐ |
| 5. Combat | ☐ |
