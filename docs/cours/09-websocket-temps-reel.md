# 09 — WebSocket et temps réel

## Pourquoi du temps réel ?

Un VTT a besoin de synchroniser plusieurs utilisateurs : MJ, joueurs, tokens, scènes, messages, journal et présence.

HTTP suffit pour créer ou lire des données. WebSocket sert à pousser des événements sans attendre que le navigateur recharge.

## Concepts

- HTTP : requête ponctuelle.
- WebSocket : connexion persistante.
- Événement : message envoyé à un ou plusieurs clients.
- Présence : nombre ou état des utilisateurs connectés.

## Fichiers importants

```text
backend/app/main.py
backend/app/routers/session.py
frontend/src/App.tsx
```

## Règles de sécurité

- Ne pas passer le token dans l'URL si possible.
- Authentifier la connexion WebSocket.
- Ignorer proprement les messages invalides.
- Ne pas laisser une erreur casser la boucle WebSocket.
- Vérifier les permissions côté backend avant de diffuser une action.

## Debug

Regarder les logs backend :

```bash
cd /home/donopot/dnd-saas
docker compose logs --tail=120 dnd-backend
```

Vérifier que l'API est disponible :

```bash
sh scripts/wait-api.sh
```

## Exercice

Ouvre deux navigateurs sur la même campagne et observe si la présence change.
