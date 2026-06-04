# 05 — PostgreSQL et migrations

## Rôle de PostgreSQL

PostgreSQL stocke les données métier : utilisateurs, campagnes, personnages, scènes, tokens, combats, documents, notes et autres entités du jeu.

## Rôle des migrations

Une migration est un fichier SQL versionné qui fait évoluer la structure de la base.

Le projet lance les migrations au démarrage backend. Une base vide doit donc pouvoir être reconstruite uniquement avec les fichiers présents dans `backend/app/migrations/`.

## Fichiers importants

```text
backend/app/db.py
backend/app/migrations/
```

## Règles

- Une migration doit être idempotente autant que possible.
- Utiliser `create table if not exists` quand c'est pertinent.
- Utiliser `create index if not exists` pour les index.
- Ne jamais supprimer brutalement une donnée sans stratégie.
- Ajouter les extensions PostgreSQL nécessaires avant les index qui les utilisent.

## Exemple appris

Les index `gin_trgm_ops` nécessitent l'extension PostgreSQL `pg_trgm`. Sans elle, le backend échoue au démarrage des migrations.

## Commandes utiles

```bash
cd /home/donopot/dnd-saas
ls backend/app/migrations

docker compose exec dnd-postgres sh -lc 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "select version, applied_at from schema_migrations order by version;"'
```

## Reset local dangereux

Cette commande supprime les données locales du backend DnD :

```bash
cd /home/donopot/dnd-saas
docker compose stop dnd-backend dnd-frontend dnd-postgres dnd-minio dnd-redis
docker volume rm dnd_postgres_data dnd_redis_data dnd_minio_data
```

À utiliser seulement si tu veux repartir à zéro.

## Exercice

Lis trois migrations et explique quelle table ou fonctionnalité chacune ajoute.
