"""FastAPI auth router — mirrors Express /auth/* endpoints exactly."""
import time
from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException, status
import asyncpg

from core.dependencies import get_db, get_current_user
from core.security import hash_password, verify_password, generate_tokens, decode_refresh_token
from db.queries.users import get_user_by_email, get_user_by_id, create_user, update_user_profile, update_user_password
from schemas.models import (
    ResidentSignupRequest, AdminSignupRequest, LoginRequest,
    RefreshRequest, AuthResponse, UserOut, TokensOut, UpdateProfileRequest,
    ChangePasswordRequest,
)

router = APIRouter(prefix="/auth", tags=["auth"])


def _user_out(row: asyncpg.Record) -> UserOut:
    return UserOut(
        id=row["id"],
        name=row["name"],
        email=row["email"],
        role=row["role"],
        address=row.get("address"),
        phone=row.get("phone"),
        profile_image=row.get("profile_image"),
        created_at=str(row["created_at"]) if row.get("created_at") else None,
    )


@router.post("/signup/resident", status_code=201, response_model=AuthResponse)
async def signup_resident(
    body: ResidentSignupRequest,
    conn: Annotated[asyncpg.Connection, Depends(get_db)],
):
    email = body.email.strip().lower()
    existing = await get_user_by_email(conn, email)
    if existing:
        raise HTTPException(status_code=422, detail="An account with this email address already exists")

    user_id = f"u-res-{int(time.time() * 1000):x}"
    new_user = await create_user(
        conn,
        id=user_id,
        name=body.name,
        email=email,
        password_hash=hash_password(body.password),
        phone=body.phone or "",
        role="resident",
        address=body.address or "",
    )
    tokens = generate_tokens(new_user["id"], new_user["email"], new_user["role"], new_user["name"])
    return AuthResponse(
        message="Resident registered successfully",
        user=_user_out(new_user),
        tokens=TokensOut(**tokens),
    )


@router.post("/signup/admin", status_code=201, response_model=AuthResponse)
async def signup_admin(
    body: AdminSignupRequest,
    conn: Annotated[asyncpg.Connection, Depends(get_db)],
):
    email = body.email.strip().lower()
    existing = await get_user_by_email(conn, email)
    if existing:
        raise HTTPException(status_code=422, detail="An account with this email address already exists")

    user_id = f"u-admin-{int(time.time() * 1000):x}"
    new_user = await create_user(
        conn,
        id=user_id,
        name=body.name,
        email=email,
        password_hash=hash_password(body.password),
        phone=body.phone or "",
        role="admin",
        address=body.address or "Municipal Operations Headquarters",
    )
    tokens = generate_tokens(new_user["id"], new_user["email"], new_user["role"], new_user["name"])
    return AuthResponse(
        message="Municipal Admin registered successfully",
        user=_user_out(new_user),
        tokens=TokensOut(**tokens),
    )


@router.post("/login", response_model=AuthResponse)
async def login(
    body: LoginRequest,
    conn: Annotated[asyncpg.Connection, Depends(get_db)],
):
    email = body.email.strip().lower()
    user = await get_user_by_email(conn, email)
    if not user or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    tokens = generate_tokens(user["id"], user["email"], user["role"], user["name"])
    return AuthResponse(
        message="Login successful",
        user=_user_out(user),
        tokens=TokensOut(**tokens),
    )


@router.get("/me", response_model=UserOut)
async def get_me(
    current_user: Annotated[dict, Depends(get_current_user)],
    conn: Annotated[asyncpg.Connection, Depends(get_db)],
):
    user = await get_user_by_id(conn, current_user["sub"])
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return _user_out(user)


@router.patch("/me", response_model=UserOut)
async def update_me(
    body: UpdateProfileRequest,
    current_user: Annotated[dict, Depends(get_current_user)],
    conn: Annotated[asyncpg.Connection, Depends(get_db)],
):
    """Update the current user's profile information."""
    updated = await update_user_profile(
        conn,
        user_id=current_user["sub"],
        name=body.name,
        phone=body.phone,
        address=body.address,
        profile_image=body.profile_image,
    )
    if not updated:
        raise HTTPException(status_code=404, detail="User not found")
    return _user_out(updated)


@router.post("/refresh", response_model=TokensOut)
async def refresh_token(
    body: RefreshRequest,
    conn: Annotated[asyncpg.Connection, Depends(get_db)],
):
    payload = decode_refresh_token(body.refreshToken)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired refresh token")

    user = await get_user_by_id(conn, payload["sub"])
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    tokens = generate_tokens(user["id"], user["email"], user["role"], user["name"])
    return TokensOut(**tokens)


@router.post("/change-password", status_code=200)
async def change_password(
    body: ChangePasswordRequest,
    current_user: Annotated[dict, Depends(get_current_user)],
    conn: Annotated[asyncpg.Connection, Depends(get_db)],
):
    """Change the current user's password after verifying the existing one."""
    user = await get_user_by_id(conn, current_user["sub"])
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if not verify_password(body.current_password, user["password_hash"]):
        raise HTTPException(status_code=422, detail="Current password is incorrect")
    new_hash = hash_password(body.new_password)
    await update_user_password(conn, current_user["sub"], new_hash)
    return {"message": "Password changed successfully. Please log in again."}
