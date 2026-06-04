# Architecture globale — DnD SaaS / VTT

## Objectif

Ce document est la porte d’entrée technique du projet. Il donne une vue globale de l’architecture sans remplacer les documents spécialisés.

Pour le détail par domaine :

- produit et roadmap : `01-product-roadmap.md` ;
- interface et panneaux : `03-frontend-ui.md` ;
- carte, tokens et fog : `04-vtt-map-fog.md` ;
- backend et API : `05-backend-api.md` ;
- sécurité et auth : `06-security-auth.md` ;
- déploiement et opérations : `07-deployment-ops.md`.

---

## Stack

Le projet est un VTT auto-hébergé full-stack.

| Couche | Technologie |
|---|---|
| Frontend | React, TypeScript, Vite |
| Backend | FastAPI, Python |
| Base de données | PostgreSQL |
| Cache / temps réel | Redis |
| Stockage fichiers | MinIO / S3-compatible |
| Déploiement | Docker Compose |
| Reverse proxy | Caddy puis Nginx frontend |
| Temps réel | WebSocket campagne |

---

## Flux applicatif

```txt
Navigateur
  ↓ HTTPS
Caddy
  ↓
Frontend Nginx / API backend
  ↓
FastAPI
  ↓
PostgreSQL / Redis / MinIO
```

Le frontend ne doit jamais devenir la source de vérité des données métier. Les permissions, l’état durable et les validations critiques doivent rester côté backend.

---

## Structure du dépôt

```txt
backend/
  app/
    routers/
    schemas/
    migrations/
frontend/
  src/
    api/
    components/
    config/
    hooks/
    styles/
docs/
  README.md
  01-product-roadmap.md
  02-architecture.md
  ...
```

---

## Principes de séparation

### Backend

Le backend porte :

- les données persistantes ;
- les permissions ;
- les règles métier critiques ;
- les broadcasts WebSocket ;
- les migrations ;
- les endpoints API.

### Frontend

Le frontend porte :

- l’expérience MJ et joueur ;
- les interactions carte/tokens ;
- les panneaux flottants ;
- les états transitoires d’UI ;
- les appels API ;
- les previews locales.

### Documentation

La documentation active doit rester limitée aux documents numérotés. Les plans de PR temporaires vont dans `work-in-progress/`. Les anciens documents vont dans `archive/`.

---

## Règles techniques courtes

- Une nouvelle donnée durable implique une migration.
- Une nouvelle capacité MJ/joueur implique une permission backend.
- Une nouvelle interaction temps réel implique un message WebSocket documenté.
- Une nouvelle UI durable doit être documentée dans le document spécialisé.
- Un nouveau panneau MJ doit être déclaré dans `frontend/src/config/gmPanels.ts`.
- Un plan de correction temporaire ne doit pas rester à la racine de `docs/`.
