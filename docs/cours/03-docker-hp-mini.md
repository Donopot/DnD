# 03 — Docker et HP Mini

## Rôle de Docker

Docker lance chaque service dans un conteneur isolé. Le projet utilise Docker Compose pour démarrer plusieurs conteneurs ensemble.

## Services DnD typiques

- `dnd-frontend` : interface React servie par Nginx.
- `dnd-backend` : API FastAPI.
- `dnd-postgres` : base de données.
- `dnd-minio` : stockage fichiers.
- `dnd-redis` : cache et services rapides.

## Attention à Hermes

Hermes peut tourner sur le même HP Mini. Ne coupe pas tout le serveur si tu veux garder Hermes disponible.

## Commandes utiles

Voir les conteneurs :

```bash
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
```

Relancer uniquement DnD :

```bash
cd /home/donopot/dnd-saas
docker compose up -d --build
```

Arrêter seulement le frontend :

```bash
cd /home/donopot/dnd-saas
docker compose stop dnd-frontend
```

Voir les logs :

```bash
cd /home/donopot/dnd-saas
docker compose logs --tail=100 dnd-backend
docker compose logs --tail=100 dnd-frontend
```

## Volumes

Les volumes gardent les données même si les conteneurs redémarrent. Les supprimer revient souvent à repartir d'une base vide.

## Exercice

Lance `docker ps`, repère les conteneurs DnD et vérifie qu'Hermes n'est pas impacté par une commande ciblée sur `dnd-frontend`.
