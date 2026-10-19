from typing import Annotated
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import asyncpg

from core.security import decode_access_token
from db.pool import get_pool

bearer = HTTPBearer(auto_error=False)


async def get_db() -> asyncpg.Connection:
    """Yields a checked-out connection from the pool."""
    pool = get_pool()
    async with pool.acquire() as conn:
        yield conn


async def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer)],
) -> dict:
    """Decode the Bearer JWT and return the token payload."""
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token required",
        )

    payload = decode_access_token(credentials.credentials)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session expired or invalid token",
        )
    return payload


def require_admin(current_user: Annotated[dict, Depends(get_current_user)]) -> dict:
    """Raises 403 if the authenticated user is not an admin."""
    if current_user.get("role") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to do that",
        )
    return current_user
