from pathlib import Path

import asyncpg

from app.config import get_settings

settings = get_settings()
pool: asyncpg.Pool | None = None


async def connect_db() -> None:
    global pool
    pool = await asyncpg.create_pool(settings.database_url, min_size=1, max_size=10)
    await run_migrations()


async def close_db() -> None:
    if pool is not None:
        await pool.close()


def get_pool() -> asyncpg.Pool:
    if pool is None:
        raise RuntimeError("Database pool is not initialized")
    return pool


async def run_migrations() -> None:
    if pool is None:
        raise RuntimeError("Database pool is not initialized")

    migrations_dir = Path(__file__).parent / "migrations"
    migration_files = sorted(migrations_dir.glob("*.sql"))

    async with pool.acquire() as connection, connection.transaction():
        await connection.execute(
            """
                create table if not exists schema_migrations (
                    version text primary key,
                    applied_at timestamptz not null default now()
                )
                """
        )

        applied = {
            row["version"]
            for row in await connection.fetch("select version from schema_migrations")
        }

        for migration in migration_files:
            if migration.name in applied:
                continue
            await connection.execute(migration.read_text(encoding="utf-8"))
            await connection.execute(
                "insert into schema_migrations (version) values ($1)",
                migration.name,
            )

