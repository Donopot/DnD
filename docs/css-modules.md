# CSS Modules — DnD VTT

**Dernière mise à jour :** 2026-06-01

## Structure

`App.tsx` importe `styles/index.css` qui charge 11 modules dans l'ordre de cascade :

```
frontend/src/styles/
├── index.css          # @import de tous les modules
├── tokens.css         # Variables CSS (:root), palette, espacements (1 344 lignes)
├── reset.css          # Reset/normalize global (226 lignes)
├── typography.css     # Font stack, headings, monospace (22 lignes)
├── components.css     # Boutons, inputs, modales, skeletons, toasts, bestiary (1 984 lignes)
├── shell-gm.css       # Topbar, SideRail, layout GM, combat tracker, quick actions (4 385 lignes)
├── map.css            # Carte, fog of war, AoE, tokens, snap, minimap (736 lignes)
├── widgets.css        # Fenêtres flottantes React (331 lignes)
├── player.css         # Écran joueur, sheets, journal, dés (975 lignes)
├── lobby-auth.css     # Auth, lobby, invitations, landing (587 lignes)
├── responsive.css     # Breakpoints tablette/mobile (211 lignes)
└── themes.css         # Light theme, reduced-motion, focus, selection (81 lignes)
```

**Total :** 10 896 lignes / 195 Ko (après nettoyage : −67 Ko de CSS mort)

## Nettoyage du CSS mort

Après chaque suppression de composant legacy, lancer :

```bash
python3 scripts/clean-dead-css.py
```

Ce script :
1. Extrait toutes les classes CSS de `styles.css`
2. Vérifie leur présence dans le code source (`.tsx` + `.ts`)
3. Supprime les règles dont **tous** les sélecteurs sont inutilisés
4. Protège `:root`, `@media`, `@keyframes`, sélecteurs HTML, pseudo-classes
5. Crée `styles.css.bak` automatiquement

## Split en modules

```bash
python3 scripts/split-css.py
```

Découpe `styles.css` en utilisant les marqueurs de section (`/* Phase X */`, `/* ── Nom ── */`).

**⚠️ Piège `:root` splitté :** Les marqueurs à l'intérieur de `:root { }` font croire au script que le bloc est terminé. Résultat : variables CSS hors de `:root` → `lightningcss` rejette avec `Invalid token in pseudo element`.

**Vérification post-split :**
```bash
grep -c "\-\-bg-global\|\-\-text-xs\|\-\-radius-sm" frontend/src/styles/tokens.css
```
Si < nombre attendu → reconstruire `tokens.css` depuis l'original.

## Audit de couverture

```bash
python3 scripts/audit-dead-css.py
```

Rapporte le nombre de classes utilisées vs inutilisées, par catégorie.
