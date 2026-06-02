# Configuration Render — Checklist Déploiement

> Dernière mise à jour : 2026-06-02

## État

- [x] `render.yaml` créé et pushé
- [x] `VITE_API_URL` dynamique dans App.tsx
- [x] `.node-version` (Node 22.11.0)
- [ ] Groupe d'env `dnd-shared` créé sur Render
- [ ] Blueprint connecté au repo `Donopot/DnD`
- [ ] PostgreSQL externe provisionné
- [ ] Redis externe provisionné
- [ ] S3 externe provisionné
- [ ] `VITE_API_URL` configuré après 1er déploiement API

---

## Variables d'environnement (`dnd-shared`)

| Variable | Rôle | Où l'obtenir |
|----------|------|--------------|
| `BACKEND_CORS_ORIGINS` | Autorise le frontend à appeler l'API | URL du frontend Render |
| `BACKEND_SECRET_KEY` | Signe les tokens JWT | `openssl rand -hex 32` |
| `DATABASE_URL` | Connexion PostgreSQL | Neon / Supabase |
| `REDIS_URL` | Cache + sessions WebSocket | Upstash |
| `MINIO_ENDPOINT` | Stockage des images de carte | Cloudflare R2 |
| `MINIO_BUCKET` | Nom du bucket | `dnd-assets` |
| `MINIO_ACCESS_KEY` | Clé d'accès S3 | Dashboard R2 |
| `MINIO_SECRET_KEY` | Secret S3 | Dashboard R2 |
| `VITE_API_URL` | URL du backend pour le frontend | `https://dnd-api.onrender.com` |

---

## Services externes recommandés (gratuits)

| Service | Fournisseur | Plan gratuit |
|---------|-------------|--------------|
| PostgreSQL | [Neon](https://neon.tech) | 0.5 GB, 1 projet |
| PostgreSQL | [Supabase](https://supabase.com) | 500 MB, 2 projets |
| Redis | [Upstash](https://upstash.com) | 256 MB, 10k requêtes/jour |
| S3 | [Cloudflare R2](https://developers.cloudflare.com/r2/) | 10 GB stockage, pas de frais egress |
