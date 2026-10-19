"""asyncpg connection pool — singleton, initialised in app lifespan."""
from typing import Optional
import asyncpg
from core.config import get_settings

import asyncio
import logging

logger = logging.getLogger(__name__)

_pool: Optional[asyncpg.Pool] = None


async def init_pool() -> None:
    global _pool
    settings = get_settings()
    if not settings.database_url:
        raise RuntimeError(
            "DATABASE_URL is not set. Add it to backend/.env before starting the server."
        )

    max_retries = 5
    retry_delay = 2.0

    for attempt in range(1, max_retries + 1):
        try:
            logger.info(f"[DB Pool] Initializing asyncpg pool (attempt {attempt}/{max_retries})...")
            _pool = await asyncpg.create_pool(
                settings.database_url,
                min_size=2,
                max_size=10,
                command_timeout=60,
                max_inactive_connection_lifetime=60.0,
            )
            async with _pool.acquire() as conn:
                # Run schema and migrations
                await conn.execute("""
                    ALTER TABLE reports ADD COLUMN IF NOT EXISTS hidden_for TEXT DEFAULT NULL;
                    ALTER TABLE reports ADD COLUMN IF NOT EXISTS estimated_waste_kg REAL DEFAULT 0.0;
                    ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_image TEXT DEFAULT '';
                """)
            logger.info("[DB Pool] Connection pool initialized successfully.")
            return
        except Exception as exc:
            logger.warning(
                f"[DB Pool] Connection attempt {attempt}/{max_retries} failed: {exc}. "
                f"Retrying in {retry_delay:.1f}s..."
            )
            if _pool:
                try:
                    await _pool.close()
                except Exception:
                    pass
                _pool = None

            if attempt == max_retries:
                logger.error("[DB Pool] Could not connect to database after maximum retries.")
                raise exc
            await asyncio.sleep(retry_delay)
            retry_delay *= 1.5


async def close_pool() -> None:
    global _pool
    if _pool:
        await _pool.close()
        _pool = None


def get_pool() -> asyncpg.Pool:
    if _pool is None:
        raise RuntimeError("Database pool not initialised. Call init_pool() first.")
    return _pool
