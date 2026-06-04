# Checklist de non-régression — Par panneau GM

À exécuter **avant merge de toute PR touchant les panneaux**.

---

## Général (tous panneaux)

- [ ] `tsc --noEmit` : 0 erreur
- [ ] `npm run build` : succès
- [ ] `scripts/check-gm-panel-css.sh` : OK
- [ ] `pytest` : 118/118
- [ ] Pas d'import inutilisé
- [ ] Pas de classe CSS orpheline
- [ ] Pattern `gm-panel-content` + `data-vtt-panel` respecté

---

## SessionLogPanel

- [ ] Catégories : le `<select>` par entrée fonctionne → PATCH `/api/log-entries/{id}/category`
- [ ] Marqueur session : bouton "Session" → POST `/api/campaigns/{id}/log/session-marker`
- [ ] Pin/unpin : bouton épingle → PATCH `/api/log-entries/{id}/pin`
- [ ] Filtres catégorie : chaque bouton appelle `onRefresh(cat.id)`
- [ ] Lancer de dé : formulaire submit → `onRoll`
- [ ] Ajout note : formulaire submit → `onAddNote`
- [ ] Dernier jet : affiché après un roll
- [ ] Stats : compteurs jets/épingles/sessions corrects
- [ ] Entrées avec `session_marker: true` → classe CSS `session-marker`
- [ ] Rafraîchir (bouton "Tous") → `onRefresh()`

---

## TokenDetailPanel

- [ ] Sélection token → affiche nom, taille, couleur, hostilité
- [ ] Édition inline nom → PATCH `/api/scene-tokens/{id}` avec `{ name: ... }`
- [ ] Édition taille → PATCH `{ size: ... }`
- [ ] Édition couleur → PATCH `{ color: ... }`
- [ ] Bouton masquer/afficher → `onToggleTokenHidden`
- [ ] Flèches nudge → `onNudgeSelectedToken(dx, dy)`
- [ ] Désélection → panneau vide "Sélectionnez un token"
- [ ] Mise à jour token → `onTokenUpdated` → state synchronisé

---

## HandoutPanel

- [ ] Création document → formulaire submit → `onCreateHandout`
- [ ] Révéler → `onRevealHandout` → statut mis à jour
- [ ] Supprimer → confirmation → `onDeleteHandout`
- [ ] Filtre par scène fonctionnel
- [ ] Historique de révélation (localStorage)

---

## TokenPanel

- [ ] Liste des tokens affichée
- [ ] Suppression → `DELETE /api/tokens/{id}`
- [ ] Ajout token → apparaît dans la liste
- [ ] `onTokensChanged` appelé après modif

---

## CombatTracker

- [ ] Affichage des créatures en combat
- [ ] Ajout au combat fonctionnel
- [ ] `onEncounterChange` → recharge l'état

---

## VisibilityInspectorPanel

- [ ] Affiche les tokens de la scène
- [ ] Toggle visibilité → `onToggleTokenHidden`
- [ ] Ouverture panneau → `onOpenPanel(panelId)`

---

## GmNotesPanel

- [ ] Notes sauvegardées par campagne
- [ ] Notes liées à la scène sélectionnée
- [ ] Notes liées au token sélectionné

---

*(À compléter pour chaque panneau)*
