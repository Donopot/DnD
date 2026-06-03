# Matrice de test - Panneaux GM

## Objectif

Verifier que tous les boutons et tous les panneaux fonctionnent dans tous les cas utiles.

## Préparation

1. Ouvrir l'application.
2. Se connecter.
3. Ouvrir une campagne avec au moins une scène.
4. Créer au moins deux tokens.
5. Aller dans Session Live.
6. Faire Ctrl+F5.

Nettoyage localStorage optionnel :

```js
Object.keys(localStorage)
  .filter((key) => key.startsWith("dnd-floating-widget:"))
  .forEach((key) => localStorage.removeItem(key));

location.reload();
