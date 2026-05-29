# Skill - TypeScript React nullability

## Objectif

Eviter les erreurs TypeScript recurrentes du type :

- Object is possibly 'null'
- Object is possibly 'undefined'
- Argument of type 'HTMLElement | null' is not assignable to parameter of type 'HTMLElement'
- selectedScene is possibly undefined
- scrollRef.current is possibly null

Ces erreurs arrivent souvent dans React quand une valeur nullable est verifiee au debut d'un bloc, puis reutilisee dans une fonction interne, un event handler, une closure, un callback ou un listener.

## Regle principale

Apres un guard null/undefined, toujours capturer la valeur dans une constante locale non-null si elle sera utilisee dans une fonction interne.

### Mauvais exemple

```ts
const root = document.querySelector<HTMLElement>(".vtt-control-panel");

if (!root) {
  return;
}

function updateDock() {
  const widgets = getControlledWidgets(root);
}
```

TypeScript peut encore considerer `root` comme `HTMLElement | null` dans la fonction interne.

### Bon exemple

```ts
const root = document.querySelector<HTMLElement>(".vtt-control-panel");

if (!root) {
  return;
}

const rootElement = root;

function updateDock() {
  const widgets = getControlledWidgets(rootElement);
}
```

## Regle pour les refs React

### Mauvais exemple

```ts
if (!scrollRef.current) {
  return;
}

function updateViewport() {
  scrollRef.current.scrollLeft = 0;
}
```

### Bon exemple

```ts
const scrollElement = scrollRef.current;

if (!scrollElement) {
  return;
}

const element = scrollElement;

function updateViewport() {
  element.scrollLeft = 0;
}
```

## Regle pour les states optionnels

### Mauvais exemple

```ts
if (!selectedScene) {
  return;
}

function updateViewport() {
  const width = selectedScene.width;
}
```

### Bon exemple

```ts
if (!selectedScene) {
  return;
}

const scene = selectedScene;

function updateViewport() {
  const width = scene.width;
}
```

## Checklist avant de proposer un patch React/TypeScript

Avant de modifier un fichier `.tsx` ou `.ts`, verifier :

- est-ce qu'une valeur peut etre `null` ?
- est-ce qu'une valeur peut etre `undefined` ?
- est-ce qu'elle vient d'un `ref.current` ?
- est-ce qu'elle vient d'un `querySelector` ?
- est-ce qu'elle vient d'un state React optionnel ?
- est-ce qu'elle est utilisee dans une fonction interne ?
- est-ce qu'elle est utilisee dans un event listener ?
- est-ce qu'elle est utilisee dans un callback async ?
- est-ce qu'elle est utilisee apres un `setTimeout`, `requestAnimationFrame`, `addEventListener` ou `Promise` ?

Si oui, capturer dans une constante locale non-null apres le guard.

## Pattern standard a utiliser

```ts
const maybeElement = ref.current;

if (!maybeElement) {
  return;
}

const element = maybeElement;

function callback() {
  element.focus();
}
```

## Pattern standard avec plusieurs dependances

```ts
const scrollElement = scrollRef.current;

if (!scrollElement || !selectedScene) {
  return;
}

const element = scrollElement;
const scene = selectedScene;

function updateViewport() {
  const visibleWidth = element.clientWidth;
  const sceneWidth = scene.width;
}
```

## Regle pour les effets React

Dans un `useEffect`, ne jamais utiliser directement dans une fonction interne :

- `ref.current`
- une valeur issue de `querySelector`
- un state optionnel comme `selectedScene`
- une prop optionnelle
- une variable qui peut etre `null`

Toujours faire :

```ts
const value = nullableValue;

if (!value) {
  return;
}

const safeValue = value;
```

Puis utiliser uniquement `safeValue` dans les fonctions internes.

## Validation obligatoire

Apres modification frontend TypeScript :

```bash
cd /home/donopot/dnd-saas/frontend
npm run build
```

Ou validation complete :

```bash
cd /home/donopot/dnd-saas
docker compose up -d --build
```

## Erreurs deja rencontrees dans le projet

### `selectedScene is possibly undefined`

Correction :

```ts
if (!selectedScene) {
  return;
}

const scene = selectedScene;
```

### `scrollElement is possibly null`

Correction :

```ts
const scrollElement = scrollRef.current;

if (!scrollElement) {
  return;
}

const element = scrollElement;
```

### `root is possibly null`

Correction :

```ts
const root = document.querySelector<HTMLElement>(rootSelector);

if (!root) {
  return;
}

const rootElement = root;
```

## Regle de qualite

Un patch React/TypeScript n'est pas considere pret tant que :

- les valeurs nullable sont capturees apres guard ;
- les closures n'utilisent pas directement une valeur nullable ;
- `npm run build` passe ;
- le build Docker passe si le changement est integre a une phase.
