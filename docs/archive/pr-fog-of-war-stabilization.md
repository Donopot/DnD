# PR — Stabilisation complète du Fog of War

## Titre proposé

`fix: stabilize fog of war visibility, auto-reveal and map interactions`

## Contexte

Le sous-système Fog of War a déjà été fortement amélioré :

- `CampaignMap` est maintenant la source de vérité des zones de fog côté frontend.
- `FogLayer` reçoit les zones, les modes et les callbacks depuis le parent.
- Les zones rectangulaires et circulaires sont supportées.
- Les tokens cachés manuellement (`is_hidden`) sont maintenant distingués des tokens cachés par le fog.
- La carte peut être détachée dans un panneau flottant.

Cette PR vise à stabiliser la logique restante, notamment l’auto-reveal, la synchronisation WebSocket, l’UX des modes fog et la robustesse de sauvegarde.

---

## Objectifs de la PR

1. Corriger l’auto-reveal autour des tokens.
2. Clarifier la différence entre visibilité manuelle et visibilité par brouillard.
3. Rendre la synchronisation fog plus fiable entre clients.
4. Éviter les modes contradictoires : pan, draw, erase.
5. Améliorer la robustesse en cas d’échec de sauvegarde du fog.
6. Préserver le comportement de la carte flottante.

---

## Problèmes constatés

### 1. Auto-reveal : confusion entre pieds et pixels

Actuellement, le frontend envoie `vision_radius` dans un champ nommé `radius_ft`, puis le backend l’utilise directement comme valeur en pixels.

Exemple :

- grille : 50 px pour 5 ft
- vision : 60 ft
- rayon attendu : 600 px
- rayon actuel : 60 px

Le reveal est donc beaucoup trop petit.

### 2. Auto-reveal circulaire stocké en rectangle

L’endpoint backend indique une intention de reveal circulaire autour du token, mais stocke actuellement :

```json
{
  "shape": "rect"
}
```

Cela produit une zone carrée, pas une vraie zone circulaire.

### 3. WebSocket fog fragile

`CampaignMap` écoute directement `wsRef.current`. Si le WebSocket se reconnecte, le listener peut rester attaché à l’ancien socket.

Il faut centraliser ou fiabiliser le refresh fog après message :

```txt
session_changed / resource=fog
```

### 4. `showFog` est local au composant

Le bouton `Fog ON/OFF` agit localement dans `CampaignMap`. Il ne modifie pas un état global de scène ni l’affichage joueur.

Le libellé peut induire en erreur. Il faut clarifier que c’est un affichage local MJ, ou créer plus tard un vrai paramètre global.

### 5. Modes Pan / Draw / Erase contradictoires

Le fog ne capture pas les événements quand `panMode` est actif, ce qui est correct. Mais les boutons Draw/Erase peuvent rester visuellement actifs alors que le pan les rend inutilisables.

### 6. Sauvegarde optimiste sans rollback

`saveFogZones()` applique immédiatement `setFogZones(newZones)` avant de confirmer que le PATCH backend a réussi.

En cas d’échec, le MJ peut voir une zone qui n’a pas été sauvegardée.

---

## Changements proposés

### Backend

#### Remplacer ou compléter `CircleRevealRequest`

Option recommandée : introduire un champ explicite en pixels.

```py
class CircleRevealRequest(BaseModel):
    center_x: float
    center_y: float
    radius_px: float
```

Ou, si l’API doit rester en pieds :

```py
class CircleRevealRequest(BaseModel):
    center_x: float
    center_y: float
    radius_ft: float
    grid_size: float = 50
    feet_per_square: float = 5
```

Puis convertir :

```py
radius_px = (payload.radius_ft / payload.feet_per_square) * payload.grid_size
```

#### Stocker l’auto-reveal comme cercle

```py
zone = {
    "x": payload.center_x - radius_px,
    "y": payload.center_y - radius_px,
    "width": radius_px * 2,
    "height": radius_px * 2,
    "shape": "circle",
}
```

#### Garder la validation

Conserver :

- coordonnées finies ;
- rayon positif ;
- rayon maximum ;
- `shape` limité à `rect` ou `circle`.

---

### Frontend

#### Convertir correctement la vision du token

Dans `handleMoveToken`, calculer le rayon en pixels avant l’appel reveal.

```tsx
const gridSize = selectedScene.grid_size ?? 50;
const feetPerSquare = 5;
const radiusPx = (visionRadius / feetPerSquare) * gridSize;
```

Puis envoyer :

```tsx
body: JSON.stringify({
  center_x: centerX,
  center_y: centerY,
  radius_px: radiusPx,
})
```

ou, si l’API reste en `radius_ft`, envoyer aussi `grid_size` et `feet_per_square`.

#### Clarifier l’UI Fog ON/OFF

Renommer le bouton de :

```txt
Fog ON / Fog OFF
```

vers :

```txt
Afficher fog / Masquer fog
```

ou ajouter un tooltip :

```txt
Affichage local MJ, ne modifie pas la visibilité joueur.
```

#### Désactiver les modes fog quand le pan est activé

Quand `panMode` passe à `true`, faire :

```tsx
setFogDrawMode(false);
setFogEraseMode(false);
setFogDrawing(false);
setFogCurrentRect(null);
```

#### Robustesse de sauvegarde

Conserver l’état précédent avant sauvegarde :

```tsx
const previousZones = fogZones;
setFogZones(newZones);
```

Puis, en cas d’erreur :

```tsx
setFogZones(previousZones);
setFogSaveError("Sauvegarde du brouillard impossible.");
```

Ou recharger depuis l’API après erreur.

#### WebSocket fog

Préférer un traitement central dans `App.tsx` :

```txt
session_changed resource=fog scene_id=selectedSceneId
```

Puis transmettre un signal à `CampaignMap`, ou forcer le rechargement du VTT/fog.

---

## Points à ne pas casser

- Le fog ne doit capturer les clics que si Draw ou Erase est actif.
- Les tokens doivent rester cliquables quand Fog ON est actif mais Draw/Erase inactifs.
- Les joueurs ne doivent jamais voir un token `is_hidden=true`.
- Les joueurs ne doivent voir un token visible que si son centre est dans une zone révélée.
- La carte flottante ne doit pas créer deux instances actives de `CampaignMap`.
- Le mode cercle doit continuer à fonctionner pour le draw manuel.
- La gomme doit fonctionner sur rectangles et cercles.

---

## Tests manuels recommandés

### MJ seul

1. Activer Fog ON.
2. Dessiner une zone rectangulaire.
3. Dessiner une zone circulaire.
4. Vérifier que les deux zones découpent bien le fog.
5. Utiliser la gomme sur un rectangle.
6. Utiliser la gomme sur un cercle.
7. Utiliser Undo.
8. Utiliser Reset.
9. Rafraîchir la page et vérifier que les zones sont persistées.
10. Détacher la carte et refaire un draw fog.
11. Fermer la carte flottante et vérifier que la carte dockée recharge correctement le fog.

### MJ + joueur

1. Créer un token visible.
2. Le placer hors zone révélée.
3. Vérifier que le joueur ne le voit pas.
4. Révéler une zone contenant le centre du token.
5. Vérifier que le joueur le voit.
6. Cacher manuellement le token via le panneau Visibilité.
7. Vérifier que le joueur ne le voit plus, même dans une zone révélée.
8. Révéler manuellement le token.
9. Vérifier que le joueur le revoit si le fog le permet.
10. Déplacer un token avec `vision_radius > 0`.
11. Vérifier que l’auto-reveal produit un cercle à la bonne taille.
12. Vérifier que le deuxième client reçoit les changements fog sans refresh.

---

## Tests techniques recommandés

### Frontend

```bash
cd frontend
npm run build
```

### Backend

```bash
cd backend
uv run pytest --tb=short -q
```

### Déploiement local

```bash
docker compose up -d --build
curl -i https://dnd.dtmini.com/api/health
```

---

## Checklist d’acceptation

- [ ] Auto-reveal convertit correctement ft → pixels.
- [ ] Auto-reveal crée une zone `shape: "circle"`.
- [ ] Draw rectangle fonctionne.
- [ ] Draw cercle fonctionne.
- [ ] Eraser fonctionne sur rectangles.
- [ ] Eraser fonctionne sur cercles.
- [ ] Undo fonctionne.
- [ ] Reset fonctionne.
- [ ] Fog ne bloque pas les tokens hors mode Draw/Erase.
- [ ] Pan désactive ou neutralise clairement Draw/Erase.
- [ ] Token `is_hidden=true` est invisible côté joueur.
- [ ] Token hors zone révélée est invisible côté joueur.
- [ ] Badge 🙈 indique le hide manuel.
- [ ] Badge 👁️‍🗨️ indique le hide par fog.
- [ ] La map flottante conserve les interactions fog.
- [ ] La synchronisation WebSocket fog fonctionne sur deux clients.
- [ ] En cas d’échec de sauvegarde, l’UI ne ment pas au MJ.

---

## Notes de conception

Le système actuel représente le fog comme une liste de zones révélées, non comme une liste de zones obscures. C’est cohérent avec le canvas qui dessine un overlay noir complet, puis découpe les zones révélées via `destination-out`.

La règle métier à conserver est :

```txt
Visible joueur = token non caché manuellement ET centre du token dans une zone révélée
```

Côté MJ, il faut continuer à afficher tous les tokens, mais avec des indicateurs distincts :

```txt
🙈 = caché manuellement aux joueurs
👁️‍🗨️ = caché par le brouillard de guerre
```
