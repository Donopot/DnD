# Documentation DnD SaaS / VTT

Ce dossier contient la documentation active du projet.

## Lecture rapide

| Besoin | Document |
|---|---|
| Comprendre le produit | `01-product-roadmap.md` |
| Comprendre l'architecture globale | `02-architecture.md` |
| Travailler sur l'interface et les panneaux | `03-frontend-ui.md` |
| Travailler sur la carte, les tokens ou le fog | `04-vtt-map-fog.md` |
| Travailler sur les endpoints, la DB ou le WebSocket | `05-backend-api.md` |
| Travailler sur l'auth et les permissions | `06-security-auth.md` |
| Déployer, diagnostiquer ou opérer le serveur | `07-deployment-ops.md` |
| Référence contenu SRD | `08-srd-content.md` |

## Documents principaux

| Fichier | Rôle |
|---|---|
| `01-product-roadmap.md` | Vision produit, principes UX, roadmap, règles de développement |
| `02-architecture.md` | Vue globale de la stack, flux applicatif, structure du repo |
| `03-frontend-ui.md` | Registre des panneaux, standards CSS, floating panels, checklist tests |
| `04-vtt-map-fog.md` | Architecture carte VTT, tokens, brouillard de guerre, viewport, permissions |
| `05-backend-api.md` | Architecture backend, endpoints, base de données, WebSocket, smoke tests |
| `06-security-auth.md` | Authentification JWT, sécurité, permissions, dépannage |
| `07-deployment-ops.md` | Infrastructure, Docker, déploiement, toolchain, workflow agent, backups |
| `08-srd-content.md` | Référence contenu SRD : créatures, sorts, races, classes |

## Dossiers

| Dossier | Rôle |
|---|---|
| `learning/` | Cours et notes pédagogiques |
| `skills/` | Notes techniques réutilisables |
| `work-in-progress/` | Plans temporaires de PR ou de correction |
| `archive/` | Anciennes notes de phase, audits, plans remplacés |

## Plan actif

| Document | Objectif |
|---|---|
| `work-in-progress/2026-06-10-main-audit-remediation.md` | Fermer les failles d'autorisation, stabiliser le temps réel et les parcours carte, renforcer la CI puis terminer le design system |

## Règle de maintenance

1. Ne pas créer de nouveau fichier à la racine de `docs/` sans justification.
2. Les documents permanents doivent être intégrés dans les 8 documents principaux.
3. Les plans de PR vont dans `work-in-progress/`.
4. Les notes pédagogiques vont dans `learning/`.
5. Les notes techniques réutilisables vont dans `skills/`.
6. Une fois une PR mergeée, son plan part en `archive/` ou est intégré à une doc permanente.
7. Le README est la seule porte d'entrée officielle de la documentation.
