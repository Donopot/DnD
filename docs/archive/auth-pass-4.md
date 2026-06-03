# Passe 4 — Auth & Sécurité (Juin 2026)

**Méthode :** Vérification systématique de tous les routeurs, WebSocket, frontend state,  
headers de sécurité, et edge cases cross-cutting.

---

## ✅ Confirmé propre

Tous les endpoints des 12 routeurs sont correctement protégés :
- **50 endpoints** avec `Depends(get_current_user)` → 100% de couverture auth ✅
- **GM-only** : protégés par `require_campaign_role(..., {"gm", "co_gm"})` ✅
- **Player-accessible** : `{"gm", "co_gm", "player"}` ✅
- **Public sans auth** : `/invites/{token}` (preview) + `/api/auth/login` + `/api/auth/register` + `/api/health` ✅

---

## 🔴 Problèmes restants

### 1. JWT exposé dans l'URL WebSocket
**Fichier :** `App.tsx:173` + `session.py:327`

```tsx
// Le token est passé en query string → visible dans les logs serveur/proxy
const socket = new WebSocket(
  `${protocol}://${window.location.host}/ws/campaigns/${id}?token=${encodeURIComponent(token)}`
);
```

Les query strings des WebSocket sont loggées par nginx, Caddy, les proxys, et apparaissent dans les devtools.  
Un token JWT volé dans ces logs donne 7 jours d'accès.

**Correction :** Envoyer le token comme premier message après connexion :

```tsx
socket.onopen = () => {
  socket.send(JSON.stringify({ type: "auth", token }));
};
```

```python
# session.py — premier message = auth
message = await websocket.receive_json()
if message.get("type") != "auth":
    await websocket.close(1008)
    return
token = message.get("token")
```

### 2. Aucune reconnexion WebSocket automatique
**Fichier :** `App.tsx:202-210`

Quand le WS se déconnecte (réseau instable, timeout), l'état passe à "offline" définitivement.  
Pas de retry avec backoff exponentiel.

**Correction :**
```tsx
socket.onclose = () => {
  if (wsRef.current === socket) {
    setRealtimeStatus("offline");
    // Retry after 2s, then 4s, 8s, up to 30s
    const delay = Math.min(2000 * Math.pow(2, retryCount), 30000);
    setTimeout(() => { /* reconnect */ }, delay);
  }
};
```

### 3. Pas de Content-Security-Policy ni headers de sécurité
**Fichier :** `frontend/nginx.conf`

Aucun header de sécurité HTTP n'est défini :
- `Content-Security-Policy`
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy`

**Correction :**
```nginx
add_header X-Content-Type-Options "nosniff" always;
add_header X-Frame-Options "DENY" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;
```

### 4. Pas de limite de taille sur le body des requêtes
**Fichier :** `backend/app/main.py`

FastAPI n'impose pas de limite. Un attaquant peut envoyer un JSON de plusieurs GB sur `/api/auth/login`.

**Correction :**
```python
from starlette.middleware.base import BaseHTTPMiddleware

class MaxBodySizeMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        content_length = request.headers.get("content-length")
        if content_length and int(content_length) > 1_000_000:  # 1 MB
            return JSONResponse({"detail": "Request too large"}, status_code=413)
        return await call_next(request)

app.add_middleware(MaxBodySizeMiddleware)
```

### 5. Pas de validation Content-Type sur login/register
Les endpoints `/api/auth/login` et `/api/auth/register` acceptent n'importe quel Content-Type.  
Si quelqu'un envoie `Content-Type: text/plain` avec un body JSON, FastAPI le parse quand même (ce qui est OK),  
mais un `Content-Type: application/x-www-form-urlencoded` avec un body JSON serait rejeté par Pydantic avec une 422.  
Pas critique, mais à documenter.

### 6. Pas d'API versioning
Tous les endpoints sont sous `/api/...` sans version (`/api/v1/...`). Si le schéma change, les clients existants cassent.

**Recommandation :** Ajouter un préfixe `/api/v1/` (quand le moment sera venu de stabiliser l'API).

---

## 🟡 Améliorations mineures

### 7. `ws.onmessage` sans try/catch
```tsx
// App.tsx:184
const payload = JSON.parse(event.data);  // ← peut throw sur données mal formées
```

**Correction :**
```tsx
socket.onmessage = (event) => {
  try {
    const payload = JSON.parse(event.data);
    // ...
  } catch { /* ignore malformed messages */ }
};
```

### 8. `/me` refait un DB fetch alors que `get_current_user` vient de le faire
`get_current_user` fait déjà un `SELECT ... FROM users WHERE id = $1`. Puis `/me` prend ce `Record` et le convertit en `UserPublic`. C'est efficace (pas de double fetch), mais la route pourrait être simplifiée.

### 9. Pas de caractères interdits dans `display_name`
Un utilisateur peut mettre `display_name: "<script>alert('xss')</script>"`. React échappe automatiquement en JSX, donc pas de XSS. Mais si on génère des emails ou des exports plus tard, attention.

### 10. Le `password` dans `RegisterRequest` n'est pas vérifié contre une liste de mots de passe communs
Pas de vérification "password123", "admin123", etc. Pour une app de jeu, c'est acceptable, mais pour la sécurité future, `zxcvbn` ou une liste noire serait utile.

---

## 📊 Bilan de la 4ème passe

| # | Problème | Sévérité | Action |
|---|---------|----------|--------|
| 1 | JWT dans URL WebSocket | 🔴 | Fix immédiat (first-message auth) |
| 2 | Pas de WS reconnect | 🟠 | Ajouter backoff |
| 3 | Pas de security headers | 🟠 | Ajouter dans nginx.conf |
| 4 | Pas de max body size | 🟡 | Middleware 1MB |
| 5 | Content-Type non validé | 🟢 | Documenter |
| 6 | Pas d'API versioning | 🟢 | Pour plus tard |
| 7 | JSON.parse sans try/catch | 🟡 | Ajouter try/catch |
