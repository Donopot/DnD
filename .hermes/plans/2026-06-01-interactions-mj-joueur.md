# Proposition : Interactions MJ ↔ Joueur additionnelles

> **Date :** 2026-06-01
> **Contexte :** Phase 18 a livré la carte joueur, le journal, les dés améliorés et l'import/export. Quelles sont les prochaines interactions à ajouter ?

---

## Audit des interactions table réelle → digitales

Une partie de D&D en présentiel génère ces échanges MJ↔joueurs :

| # | Interaction physique | Équivalent digital |
|---|---------------------|-------------------|
| 1 | Le joueur passe un papier plié au MJ | **Jet secret / whisper** |
| 2 | Le MJ dit "tout le monde entend ça" | **Annonce publique épinglée** |
| 3 | Le MJ donne une carte d'objet magique | **Attribuer un item/loot** |
| 4 | Le joueur pose son doigt sur la carte "je vais là" | **Ping sur la carte** |
| 5 | Le MJ glisse une note à un joueur spécifique | **Message privé MJ→joueur** |
| 6 | Le joueur lève la main "je veux faire un jet de perception" | **Demande de jet** |
| 7 | Le joueur déplace sa figurine | **Déplacement token par le joueur** |
| 8 | Le MJ dit "tout le monde est prêt ?" | **Ready check** |
| 9 | Le MJ distribue des PV/XP | **Attribuer PV/XP** |
| 10 | Le joueur consulte le PHB | **Référence règles / sorts** |
| 11 | Le MJ montre une illustration | **Partage d'image rapide** |
| 12 | Le groupe discute d'un plan | **Chat de groupe** |
| 13 | Le MJ note discrètement un résultat | **Note MJ privée liée au joueur** |
| 14 | Le joueur mesure une distance avec une règle | **Outil de mesure pour le joueur** |

---

## Filtrage par faisabilité

### ✅ Backend déjà prêt (frontend uniquement)

| Feature | Endpoint/API existant | Effort |
|---------|----------------------|--------|
| **Jet secret** (player→GM whisper roll) | `POST /rolls` avec `visibility=gm` | 1h |
| **Annonces épinglées** | `POST /log` avec `pinned=true`, WebSocket | 1.5h |
| **Attribuer item/loot** | `PATCH /characters/{id}` → `inventory` | 2h |
| **Attribuer PV/XP** | `PATCH /characters/{id}` → `hp_current`, `level` | 1h |
| **Ping sur carte** | WebSocket (événement custom, pas de stockage) | 2h |
| **Demande de jet** | `POST /log` ou WebSocket event | 1.5h |
| **Partage d'image rapide** | `POST /assets` + handout auto-créé | 2h |

### ⚠️ Backend léger requis

| Feature | Ce qu'il faut ajouter | Effort |
|---------|----------------------|--------|
| **Messages privés GM↔joueur** | `recipient_user_id` sur `game_log_entries` + filtre | 3h |
| **Ready check** | WebSocket message type `ready_check` | 2h |
| **Déplacement token par le joueur** | `PATCH /tokens/{id}/move` avec permission player | 2h |

### ❌ Backend lourd (phase séparée)

| Feature | Complexité |
|---------|-----------|
| Chat de groupe | Nouveau système de messages + WebSocket |
| Référence règles/SRD | Base de données de règles, recherche |
| Calendrier in-game | Nouveau module complet |

---

## Proposition : 3 lots prioritaires

### Lot A — Communication MJ↔Joueur (3 features, ~4h)

#### A1. Jet secret (Whisper Roll)

**Principe :** Le joueur lance un dé que seul le MJ voit.

**UX Joueur :**
```
┌─ Lanceur de dés ─────────────────────────┐
│ Formule: [1d20+5________________]         │
│ Libellé: [Test de perception_______]      │
│                                            │
│ [Normal] [⬆ Avantage] [⬇ Désavantage]    │
│                                            │
│ Visibilité: [🌐 Public] [🔒 Secret (MJ)]  │
│                                            │
│ [🎲 Lancer]                                │
└────────────────────────────────────────────┘
```

**Backend :** `POST /rolls` avec `visibility=gm` — déjà supporté ✅
**Résultat :** Le jet apparaît dans le journal du MJ mais pas dans la vue publique du joueur.

#### A2. Annonces épinglées du MJ

**Principe :** Le MJ peut épingler un message qui s'affiche en haut de l'interface joueur.

**UX Joueur (bandeau en haut) :**
```
┌─────────────────────────────────────────────────────────────┐
│ 📢 MJ : « Vous entrez dans la caverne. Il fait noir. »      │
└─────────────────────────────────────────────────────────────┘
```

**Backend :** `POST /log` avec `pinned=true`, `visibility=public`, WebSocket broadcast ✅
**Frontend :** PlayerView écoute les messages épinglés et affiche le dernier dans un bandeau.

#### A3. Messages privés GM → joueur

**Principe :** Le MJ écrit une note visible uniquement par un joueur spécifique.

**Backend nécessaire :**
```sql
alter table game_log_entries add column recipient_user_id uuid references users(id);
```
- `POST /log` accepte `recipient_user_id`
- `GET /log` pour player filtre aussi `recipient_user_id = current_user OR recipient_user_id IS NULL`

**UX Joueur :** Onglet Journal avec un filtre "Messages du MJ".

---

### Lot B — Map interactive joueur (3 features, ~5h)

#### B1. Ping sur la carte

**Principe :** Le joueur clique sur la carte, un ping temporaire apparaît pour tous (MJ + joueurs).

**UX :**
```
Le joueur clique sur la carte →
  🌟 animation de ping (cercle qui pulse, 2 secondes)
  Visible par : tous les joueurs + MJ
  WebSocket event : { type: "ping", x, y, user_id, display_name }
```

**Backend :** Aucun — événement WebSocket uniquement, pas de stockage ✅

#### B2. Déplacement token par le joueur

**Principe :** Le joueur peut déplacer SES tokens (`player_controlled`) sur la carte.

**Backend :**
- `PATCH /api/tokens/{id}/move` accepte le rôle `player` si le token est lié à un personnage du joueur
- Vérification : `token.character_id.owner_user_id == current_user.id`

**UX :** Sur la carte joueur, les tokens `player_controlled` sont drag-and-drop. Les autres sont statiques.

#### B3. Outil de mesure pour le joueur

**Principe :** Le joueur peut mesurer une distance sur la carte (clic → drag → affichage distance en cases).

**Backend :** Aucun — calcul côté client uniquement.

**UX :** Bouton "📏 Mesurer" dans la toolbar carte joueur. Clic-drag affiche la distance.

---

### Lot C — Gestion personnage par le MJ (3 features, ~4h)

#### C1. Attribuer item/loot

**Principe :** Le MJ sélectionne un personnage joueur et ajoute un objet à son inventaire.

**Backend :** `PATCH /characters/{id}` avec merge dans `inventory` ✅

**UX MJ :** Dans CharacterPanel ou EditCharacterSheet, bouton "🎁 Donner un objet" → formulaire nom + description → ajout à l'inventaire. Notification WebSocket au joueur.

#### C2. Attribuer XP / niveau

**Principe :** Le MJ donne de l'XP, le niveau est recalculé automatiquement.

**Backend :** `PATCH /characters/{id}` → `level` field ✅

**UX MJ :** Slider ou champ niveau dans EditCharacterSheet. Le joueur voit la mise à jour en temps réel.

#### C3. Appliquer condition visible

**Principe :** Le MJ applique une condition (poisoned, paralyzed, etc.) et le joueur la voit sur sa fiche.

**Backend :** Le système de conditions existe dans `combat.py` mais n'est pas lié aux personnages (seulement aux combattants). 
→ À étendre : `character_conditions` table ou utiliser `characters.resources`.

---

## Synthèse

| Lot | Features | Effort | Backend |
|-----|----------|--------|---------|
| **A** | Jet secret + Annonces + Messages privés | ~4h | 1 migration légère |
| **B** | Ping carte + Déplacement token + Mesure | ~5h | Permission token move |
| **C** | Items + XP + Conditions | ~4h | Rien ou quasi rien |

**Recommandation :** Commencer par le **Lot A** (communication) — c'est le plus impactant pour l'expérience de jeu et nécessite le moins de backend. Le Lot B (map interactive) vient ensuite, puis le Lot C (gestion perso).

---

## Maquettes rapides

### Jet secret dans PlayerView

```
┌─ Onglet Dés ──────────────────────────────────────────────┐
│                                                             │
│  Formule    [1d20+5________________________]               │
│  Libellé    [Discrétion contre les gardes___]               │
│                                                             │
│  Mode       [Normal] [⬆ Avantage] [⬇ Désavantage]         │
│                                                             │
│  Visibilité ● 🌐 Public   ○ 🔒 Secret (MJ uniquement)      │
│                                                             │
│  [🎲 Lancer]                                                │
│                                                             │
│  ─── Historique ───────────────────────────────────────    │
│  18  1d20+5 · Discrétion (secret) 🔒                       │
│  22  1d20+3 · Perception · Elara                           │
│  7   1d6 · Dégâts · Elara                                  │
└─────────────────────────────────────────────────────────────┘
```

### Annonce MJ dans PlayerView

```
┌──────────────────────────────────────────────────────────────┐
│ 📢 Message du MJ — 14:32                                     │
│ « Le gobelin vous tend un parchemin froissé. »               │
│                                               [✕ Fermer]     │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  [Contenu normal de l'interface joueur...]                    │
│                                                               │
```

### Ping sur la carte

```
┌─ Carte ───────────────────────────────────────────────────┐
│                                                            │
│         🧝‍♀️ Elara                                          │
│                                                            │
│                    💥 ← "Je vais là !" (clic de Donopot)  │
│                              🧙‍♂️ Gandalf                   │
│                                                            │
│   👹 Gobelin                                              │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

---

## Plan d'exécution

```
Phase 19-A — Lot A : Communication (jet secret, annonces, messages privés)
Phase 19-B — Lot B : Map interactive (ping, déplacement token, mesure)
Phase 19-C — Lot C : Gestion perso (items, XP, conditions visibles)
```

**Prêt à attaquer le Lot A sur ton GO.**
