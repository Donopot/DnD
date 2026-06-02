# Plan de correction & amélioration UX — DnD VTT

> **Contexte :** Audits de coordination backend-frontend et UX réalisés le 2026-06-02.
> **Sources :** `.hermes/api-ws-coordination-audit.md`, `frontend-ux-audit.md`

---

## PARTIE 1 — Corrections (bugs & warnings)

### ✅ Phase 59b — Ruler WebSocket (DÉJÀ FAIT — `6da6d96`)
Le handler `ruler` était imbriqué dans `chat_message` → corrigé.

### 🔴 Phase 60 — Thème fonctionnel (CRITIQUE)
**Problème :** 1 615 couleurs hardcodées, 2 `var(--theme)` utilisées. Toggle light/dark inerte.
**Plan :**
1. Définir les tokens CSS manquants (bg-surface, bg-card, bg-input, text-primary/secondary/muted, border, accent, gold, danger, success)
2. Remplacer ~100 couleurs hardcodées dans `.gm-campaign-shell`, `.gm-sidebar`, `.gm-panels`, `.floating-panel`, `.player-campaign-shell`
3. Mapper `[data-theme="light"]` avec les bonnes valeurs claires
4. Vérifier que le toggle fonctionne sur tout l'interface de jeu
5. **Fichiers :** `frontend/src/styles.css` (tout le bloc GM shell, ~900 lignes), `frontend/src/hooks/useTheme.ts`

### 🟠 Phase 61 — Nettoyage CSS dupliqué (MAJEUR)
**Problème :** Deux blocs définissent les mêmes classes (`.app-shell`, `.sidebar`, `.panel`, etc.) aux lignes 244-784 et 1633-1960.
**Plan :**
1. Supprimer le vieux bloc (244-784, ~540 lignes)
2. Vérifier qu'aucune règle unique n'est perdue
3. Vérifier le build (tsc + vite)

### 🟠 Phase 62 — Navigation clavier (MAJEUR)
**Problème :** 0 `tabIndex`, pas de focus trapping, pas d'Escape pour fermer les modales.
**Plan :**
1. FloatingPanel : `role="dialog"`, `aria-modal`, Escape ferme, focus trapping
2. CharacterWizard : Escape ferme
3. BestiaryDetail modal : Escape ferme
4. Ajouter `:focus-visible` sur les éléments interactifs manquants
5. **Fichiers :** `FloatingPanel.tsx`, `App.tsx`, `CampaignMap.tsx`

### 🟠 Phase 63 — Loading states par panel (MAJEUR)
**Problème :** Les panels qui fetch des données (Bestiaire, Grimoire, Donjons, Équipement, Stats) montrent du vide.
**Plan :**
1. Créer un composant `InlineSpinner` (spinner CSS + texte "Chargement…")
2. Ajouter un état `loading` dans BestiaryPanel, SpellbookPanel, DungeonGenerator, ItemCompendium, SessionStats
3. Afficher `InlineSpinner` quand `loading && !data`
4. **Fichiers :** Créer `InlineSpinner.tsx`, modifier les 5 panels

### 🟠 Phase 64 — Error boundaries (MAJEUR)
**Problème :** Un crash dans un panel fait tomber toute l'app.
**Plan :**
1. Créer `ErrorBoundary.tsx` (catch les erreurs React, affiche "Erreur" + bouton réessayer)
2. Wrapper chaque `<details>` panel dans `App.tsx` avec `<ErrorBoundary>`
3. Wrapper le bloc map également
4. **Fichiers :** Créer `ErrorBoundary.tsx`, modifier `App.tsx`

### ⚠️ Phase 64b — Warnings mineurs (3 fixes rapides)
1. **Auto-reconnect WebSocket** — timer de 3s dans App.tsx + PlayerView.tsx (10 lignes)
2. **Homebrew Pydantic** — normaliser `creature_to_token()` et `creature_to_combatant()` (20 lignes)
3. **Chat persistence** — retirer `suppress(Exception)`, logger l'erreur au lieu de la masquer (5 lignes)

---

## PARTIE 2 — Améliorations UX

### 🟡 Phase 65 — Standardisation breakpoints
**Problème :** 12 breakpoints entre 600px et 1500px, beaucoup ne diffèrent que de 20px.
**Plan :**
1. Remplacer par 4 breakpoints canoniques : `640px` (mobile), `1024px` (tablet), `1280px` (laptop), `1536px` (wide)
2. Mapper chaque ancien breakpoint vers le plus proche canonique
3. Vérifier le responsive sur les 4 tailles
4. **Fichiers :** `frontend/src/styles.css`

### 🟡 Phase 66 — Reduced motion
**Problème :** Aucune media query `prefers-reduced-motion`.
**Plan :**
1. Ajouter `@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; } }`
2. **Fichiers :** `frontend/src/styles.css` (1 bloc de 10 lignes)

### 🟡 Phase 67 — Token drag optimiste
**Problème :** Le drag de token attend le serveur avant de bouger visuellement.
**Plan :**
1. Dans `CampaignMap.tsx` : appliquer la position localement immédiatement sur `pointermove`
2. Envoyer la PATCH au serveur en arrière-plan
3. Corriger si le serveur renvoie une position différente
4. **Fichiers :** `CampaignMap.tsx`

### 🟢 Phase 68 — Unification lobby + jeu
**Problème :** Deux identités visuelles distinctes (parchemin vs dark).
**Plan :**
1. Après Phase 60 (thème fonctionnel), appliquer les mêmes CSS variables au lobby
2. Le lobby supporte désormais light et dark
3. **Fichiers :** `frontend/src/styles.css` (lignes 58-784)

### 🟢 Phase 69 — Nettoyage naming + commentaires
**Plan :**
1. Renommer `bestiary-detail-modal` → `modal-content` dans App.tsx
2. Standardiser les commentaires CSS (adopter `/* ── Section ── */`)
3. **Fichiers :** `App.tsx`, `frontend/src/styles.css`

---

## 📋 Ordre d'exécution

| Ordre | Phase | Temps | Dépend de |
|-------|-------|-------|-----------|
| ~~1~~ | ~~59b — Ruler WS~~ | ~~Fait~~ | — |
| **1** | **60 — Thème fonctionnel** | 8h | — |
| **2** | **61 — Nettoyage CSS dupliqué** | 2h | 60 |
| **3** | **62 — Navigation clavier** | 6h | — |
| **4** | **63 — Loading states** | 4h | — |
| **5** | **64 — Error boundaries** | 3h | — |
| 6 | 64b — Warnings mineurs | 1h | — |
| 7 | 65 — Standardisation breakpoints | 3h | 61 |
| 8 | 66 — Reduced motion | 1h | — |
| 9 | 67 — Token drag optimiste | 2h | — |
| 10 | 68 — Unification lobby+jeu | 4h | 60 |
| 11 | 69 — Nettoyage naming | 2h | — |

**Total : ~35h | 11 phases | 5 critiques bloquantes d'abord**

---

## 🎯 Priorité immédiate : Phase 60 (Thème)

C'est le chantier le plus lourd (8h) et c'est le prérequis pour les phases 61 et 68.
Une fois le thème fonctionnel, le toggle light/dark deviendra utile, le lobby pourra être unifié,
et le nettoyage CSS dupliqué pourra être fait proprement.
