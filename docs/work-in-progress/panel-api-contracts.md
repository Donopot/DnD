# Contrats API — Par panneau GM

Chaque panneau GM a des contrats API stricts. Avant toute migration context,
**documenter le contrat actuel** puis vérifier que la migration le préserve.

---

## SessionLogPanel

### Endpoints utilisés

| Action | Méthode | Endpoint | Payload |
|---|---|---|---|
| Pin/unpin entrée | `PATCH` | `/api/log-entries/{entry_id}/pin` | `{ pinned: boolean }` |
| Changer catégorie | `PATCH` | `/api/log-entries/{entry_id}/category?category=X` | — |
| Créer marqueur session | `POST` | `/api/campaigns/{campaign_id}/log/session-marker` | `{ label: "Nouvelle session" }` |
| Lancer dé | via `onRoll` | → `POST /api/campaigns/{id}/roll` | `{ formula, label, mode, visibility, character_id }` |
| Ajouter note | via `onAddNote` | → `POST /api/campaigns/{id}/log` | `{ message, visibility }` |
| Rafraîchir (filtre) | via `onRefresh(category)` | → `GET /api/campaigns/{id}/log?limit=100&category=X` | — |

### Props requises

| Prop | Type | Source |
|---|---|---|
| `characters` | `Character[]` | `useWorkspaceState()` |
| `selectedCharacter` | `Character \| undefined` | `useWorkspaceState()` |
| `rolls` | `Roll[]` | `useWorkspaceState()` |
| `logEntries` | `GameLogEntry[]` | `useWorkspaceState()` |
| `isBusy` | `boolean` | `usePanelContext()` |
| `token` | `string` | `useWorkspaceState()` |
| `onRoll` | `(FormEvent) => void` | `useWorkspaceActions()` |
| `onAddNote` | `(FormEvent) => void` | `useWorkspaceActions()` |
| `onRefresh` | `(category?: string) => void` | **Prop directe** (GmDockedPanels) |

### Comportements à vérifier (smoke test)

- [ ] Sélectionner un personnage → le lancer de dé pré-remplit le personnage
- [ ] Lancer un dé → apparaît dans "Dernier jet"
- [ ] Ajouter une note → apparaît dans le journal
- [ ] Filtrer par catégorie → seules les entrées de cette catégorie s'affichent
- [ ] Changer catégorie d'une entrée → l'entrée change de catégorie
- [ ] Épingler/désépingler une entrée
- [ ] Créer un marqueur de session → une nouvelle entrée avec `session_marker: true`
- [ ] Les marqueurs existants affichent la classe CSS `session-marker`

---

## TokenDetailPanel

### Endpoints utilisés

| Action | Méthode | Endpoint | Payload |
|---|---|---|---|
| Modifier champ token | `PATCH` | `/api/scene-tokens/{token_id}` | `{ [field]: value }` |
| Masquer/afficher | via `onToggleTokenHidden` | → `PATCH /api/tokens/{id}` | `{ is_hidden: boolean }` |
| Déplacer (nudge) | via `onNudgeSelectedToken` | → `POST /api/tokens/{id}/move` | `{ dx, dy }` |
| Désélectionner | via `onDeselectToken` | → local `setSelectedTokenId("")` | — |
| Mise à jour token | via `onTokenUpdated` | → local `setSceneTokens(...)` | — |

### Comportements à vérifier

- [ ] Sélectionner un token sur la carte → le panneau affiche nom, taille, couleur
- [ ] Éditer le nom → PATCH /api/scene-tokens/{id}
- [ ] Éditer la taille → PATCH
- [ ] Éditer la couleur → PATCH
- [ ] Masquer le token → le token disparaît de la carte joueur
- [ ] Déplacer (flèches) → le token bouge sur la carte
- [ ] Désélectionner → le panneau affiche "Sélectionnez un token"

---

## HandoutPanel

### Endpoints utilisés

| Action | Méthode | Endpoint | Payload |
|---|---|---|---|
| Créer handout | via `onCreateHandout` | → `POST /api/campaigns/{id}/handouts` | `{ title, content, visibility, scene_id }` |
| Révéler handout | via `onRevealHandout` | → `POST /api/handouts/{id}/reveal` | `{ visibility }` |
| Supprimer handout | via `onDeleteHandout` | → `DELETE /api/handouts/{id}` | — |

### Comportements à vérifier

- [ ] Créer un document → apparaît dans la liste
- [ ] Révéler un document aux joueurs → le statut change
- [ ] Supprimer un document → confirmation puis disparition
- [ ] Filtrer par scène

---

## TokenPanel

### Endpoints utilisés

| Action | Méthode | Endpoint |
|---|---|---|
| Supprimer token | `DELETE` | `/api/tokens/{token_id}` |

### Comportements à vérifier

- [ ] Lister les tokens de la scène
- [ ] Supprimer un token → confirmation puis disparition
- [ ] Ajouter un token → apparaît sur la carte
- [ ] `onTokensChanged` → recharge les tokens

---

*(À compléter pour chaque panneau avant migration)*
