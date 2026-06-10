---
version: alpha
name: Dark Refined
description: Table de jeu moderne — sobre, charbon profond, or vibrant. Carte dominante, panneaux effacés, lisibilité maximale.
colors:
  bg-root: "#0a0c0f"
  bg-canvas: "#0d1117"
  bg-surface: "#111820"
  bg-elevated: "#161e28"
  bg-overlay: "#1a2330"
  gold: "#e6b84f"
  gold-hover: "#f0c960"
  emerald: "#3dd68c"
  text-primary: "#ece8e0"
  text-secondary: "#b0aca5"
  text-muted: "#6b6760"
  danger: "#e54d4d"
  success: "#3dd68c"
  warning: "#e6b84f"
  border: "rgba(255,255,255,0.06)"
  border-hover: "rgba(255,255,255,0.10)"
  border-active: "{colors.gold}"
typography:
  h1:
    fontFamily: Inter
    fontSize: 1.5rem
    fontWeight: 700
    lineHeight: 1.2
  h2:
    fontFamily: Inter
    fontSize: 1.25rem
    fontWeight: 700
    lineHeight: 1.3
  body-md:
    fontFamily: Inter
    fontSize: 0.875rem
    lineHeight: 1.5
  label-sm:
    fontFamily: Inter
    fontSize: 0.75rem
    fontWeight: 600
  caption:
    fontFamily: Inter
    fontSize: 0.6875rem
    lineHeight: 1.4
rounded:
  sm: 6px
  md: 8px
  lg: 12px
  xl: 16px
spacing:
  xs: 4px
  sm: 8px
  md: 12px
  lg: 16px
  xl: 24px
  "2xl": 32px
components:
  icon-button:
    backgroundColor: "transparent"
    textColor: "{colors.text-muted}"
    rounded: "{rounded.md}"
    size: 36px
  icon-button-hover:
    backgroundColor: "rgba(230,184,79,0.06)"
    textColor: "{colors.text-secondary}"
  icon-button-active:
    backgroundColor: "rgba(230,184,79,0.10)"
    textColor: "{colors.gold}"
  rail:
    backgroundColor: "{colors.bg-elevated}"
    width: 56px
  topbar:
    backgroundColor: "rgba(17,24,32,0.92)"
    height: 48px
  panel:
    backgroundColor: "{colors.bg-elevated}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.lg}"
  drawer:
    backgroundColor: "{colors.bg-elevated}"
    textColor: "{colors.text-primary}"
    width: 320px
---

## Overview

Dark Refined est une interface de table de jeu virtuelle conçue pour le Maître
du Jeu. Sobre, professionnelle, elle met la carte au centre et efface tout le
reste. Le fond charbon profond (`#0a0c0f`) n'est jamais noir plat — un dégradé
subtil et une texture visuelle lui donnent de la profondeur. L'or vibrant
(`#e6b84f`) est réservé aux actions importantes et aux sélections, jamais
décoratif. Une légère nuance émeraude (`#3dd68c`) porte l'identité de succès
et de connexion.

## Colors

- **bg-root (`#0a0c0f`):** Fond global de l'application. Jamais noir pur.
- **bg-canvas (`#0d1117`):** Zone de carte / scène. Légèrement plus clair que
  le fond pour distinguer le plan de jeu.
- **bg-surface (`#111820`):** Surfaces neutres — barres, conteneurs.
- **bg-elevated (`#161e28`):** Panneaux, menus, dropdowns. Une élévation
  au-dessus de la surface.
- **bg-overlay (`#1a2330`):** Modales, tooltips. Niveau le plus élevé.
- **gold (`#e6b84f`):** Or vibrant — actions principales, sélections, états
  actifs. Jamais plus d'un élément doré par vue.
- **gold-hover (`#f0c960`):** Survol des éléments dorés.
- **emerald (`#3dd68c`):** Succès, connexion, stats positives. Identité
  secondaire.
- **text-primary (`#ece8e0`):** Texte principal — titres, contenu courant.
  Contraste > 12:1 sur fond.
- **text-secondary (`#b0aca5`):** Texte secondaire — descriptions, métadonnées.
- **text-muted (`#6b6760`):** Texte discret — placeholders, états vides.
- **danger (`#e54d4d`):** Destruction, erreurs, dégâts. Rouge uniquement ici.
- **border (`rgba(255,255,255,0.06)`):** Bordures subtiles sur fonds sombres.
- **border-active (`{colors.gold}`):** Bordure active / sélectionnée.

## Typography

Inter pour tout le texte. La hiérarchie est portée par la taille et la graisse,
pas par la famille. Pas de texte inférieur à 11px. Les labels sont en 12px
semi-bold. Le corps de texte UI est en 14px.

## Layout

Le layout MJ est une grille 3 colonnes : rail 56px | carte fluide |
inspecteur 320px. La barre supérieure fait 48px. Le dock inférieur est
rétractable (40px fermé, 240px ouvert).

## Shapes

Rayons limités à 6-8px. 12px pour les panneaux, 16px pour les modales.
Pas de rayons supérieurs à 16px.

## Elevation & Depth

Les ombres sont réservées aux éléments réellement superposés (modales,
dropdowns, tooltips). Les panneaux dockés n'ont pas d'ombre. Le glass
(`backdrop-filter: blur(12px)`) est utilisé sur la topbar et le dock.

## Components

- `icon-button`: Bouton icône 36×36px. 3 variantes : default (gris),
  primary (or), danger (rouge). État actif = fond or 10%.
- `rail`: Navigation principale 56px. Icônes Lucide 20px. État actif avec
  accent gauche doré de 3px.
- `topbar`: Barre supérieure 48px, glass, informations de session uniquement.
- `panel`: Panneau docké standard — fond `bg-elevated`, radius 12px, sans ombre.
- `drawer`: Panneau overlay coulissant depuis la droite, 320px, avec backdrop.

## Do's and Don'ts

- **Do** utiliser les icônes Lucide exclusivement (pas d'emojis dans
  l'interface).
- **Do** réserver l'or aux actions principales — un seul élément doré par vue.
- **Do** laisser la carte dominer visuellement — les panneaux ne doivent pas
  la concurrencer.
- **Don't** utiliser de bordures épaisses ou de panneaux imbriqués.
- **Don't** descendre en dessous de 11px pour le texte.
- **Don't** ajouter d'ombres aux éléments non superposés.
- **Don't** introduire de couleurs hors palette sans extension documentée.
