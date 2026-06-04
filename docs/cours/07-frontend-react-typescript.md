# 07 — Frontend React et TypeScript

## Rôle du frontend

Le frontend est l'interface utilisée par le MJ et les joueurs. Il affiche les campagnes, la carte, les panneaux, les personnages, les documents, le combat et les interactions temps réel.

## Technologies

- React : construire l'interface en composants.
- TypeScript : ajouter des types pour éviter des erreurs.
- Vite : builder et servir le frontend en développement.
- Nginx : servir le build final en Docker.

## Fichiers importants

```text
frontend/src/App.tsx
frontend/src/api/client.ts
frontend/src/api/types.ts
frontend/src/components/
frontend/src/styles.css
frontend/package.json
frontend/package-lock.json
```

## API frontend

Le fichier `frontend/src/api/client.ts` centralise les appels HTTP. En production, l'API doit rester relative : `/api/...`. Le proxy Nginx transmet ensuite au backend.

## TypeScript

TypeScript détecte des erreurs avant le navigateur : mauvais type, propriété manquante, fonction mal appelée.

## Commandes utiles

```bash
cd /home/donopot/dnd-saas/frontend
npm ci
npx tsc --noEmit
npm run build
```

Ou depuis la racine :

```bash
cd /home/donopot/dnd-saas
sh scripts/check-frontend-types.sh
```

## Exercice

Trouve le composant `AuthPage.tsx`, repère les champs du formulaire et compare-les avec les schémas backend dans `backend/app/schemas.py`.
