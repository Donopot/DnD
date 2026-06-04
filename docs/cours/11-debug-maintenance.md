# 11 — Debug et maintenance quotidienne

## Objectif

Savoir diagnostiquer rapidement si un problème vient du navigateur, du frontend, du backend, de la base, du proxy ou de Docker.

## Ordre de diagnostic conseillé

1. Vérifier les conteneurs.
2. Vérifier `/api/health`.
3. Lire les logs backend.
4. Tester l'endpoint avec `curl`.
5. Tester via le frontend Nginx.
6. Tester via le domaine public.
7. Ouvrir DevTools navigateur.
8. Nettoyer localStorage et service worker si besoin.

## Commandes utiles

```bash
cd /home/donopot/dnd-saas

docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
sh scripts/wait-api.sh
curl -fsS http://127.0.0.1:8091/api/health
curl -I http://127.0.0.1:8090
```

Logs :

```bash
docker compose logs --tail=120 dnd-backend
docker compose logs --tail=120 dnd-frontend
```

Test auth via frontend Nginx :

```bash
EMAIL="debug+$(date +%Y%m%d%H%M%S)@dnd-smoke.fr"
PASSWORD="TestPass123!"

curl -i -sS -X POST http://127.0.0.1:8090/api/auth/register \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"display_name\":\"Debug\",\"password\":\"$PASSWORD\",\"confirm_password\":\"$PASSWORD\",\"account_type\":\"gm\",\"website\":\"\"}"
```

## Nettoyage navigateur

```js
localStorage.removeItem("dnd_access_token");
navigator.serviceWorker?.getRegistrations?.().then(rs => rs.forEach(r => r.unregister()));
caches?.keys?.().then(keys => keys.forEach(key => caches.delete(key)));
location.reload();
```

## Exercice

Provoque volontairement une erreur de login avec un mauvais mot de passe, puis retrouve la requête `POST /api/auth/login` dans DevTools.
