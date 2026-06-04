# 06 — Authentification, permissions et sécurité

## Authentification

L'authentification répond à la question : qui est connecté ?

Dans le projet, l'utilisateur s'inscrit ou se connecte, puis reçoit un token JWT. Le frontend conserve ce token et l'envoie au backend dans l'en-tête `Authorization`.

## Autorisation

L'autorisation répond à la question : qu'a-t-il le droit de faire ?

Exemples :

- un MJ peut gérer sa campagne ;
- un joueur ne doit pas modifier un token de PNJ ;
- un co-MJ peut avoir plus de droits qu'un joueur ;
- une invitation joueur doit être valide.

## Fichiers importants

```text
backend/app/routers/auth.py
backend/app/deps.py
backend/app/security.py
backend/app/routers/vtt.py
backend/app/routers/session.py
backend/tests/test_vtt_permissions.py
frontend/src/api/client.ts
frontend/src/components/AuthPage.tsx
```

## Règles importantes

- Le backend doit toujours vérifier les permissions.
- Le frontend peut masquer un bouton, mais ça ne suffit jamais.
- Les erreurs doivent être compréhensibles côté utilisateur.
- Après un reset de base, les anciens comptes n'existent plus.
- Un ancien token local peut provoquer des comportements confus.

## Debug navigateur

Pour vider la session locale :

```js
localStorage.removeItem("dnd_access_token");
location.reload();
```

Pour nettoyer aussi le service worker et les caches :

```js
navigator.serviceWorker?.getRegistrations?.().then(rs => rs.forEach(r => r.unregister()));
caches?.keys?.().then(keys => keys.forEach(key => caches.delete(key)));
localStorage.removeItem("dnd_access_token");
location.reload();
```

## Exercice

Teste une inscription avec un mot de passe faible, puis lis la réponse réseau dans DevTools.
