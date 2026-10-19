"""FastAPI organic waste marketplace router."""
import time
from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException
import asyncpg

from core.dependencies import get_db, get_current_user, require_admin
from db.queries.organic import (
    get_organic_records, create_organic_record, update_organic_status,
    create_listing, get_listings, get_listing_by_id,
    create_request, get_all_requests, get_requests_by_user,
    get_request_by_id, has_pending_request,
    approve_request_atomic, update_request_status,
)
from schemas.models import (
    CreateOrganicRequest, UpdateOrganicRequest,
    CreateOrganicListingRequest, CreateOrganicRequestBody,
    UpdateOrganicRequestStatus,
)

router = APIRouter(prefix="/organic", tags=["organic"])


# ---------------------------------------------------------------------------
# Legacy farm distribution records
# ---------------------------------------------------------------------------

@router.get("")
async def list_organic_records(
    current_user: Annotated[dict, Depends(get_current_user)],
    conn: Annotated[asyncpg.Connection, Depends(get_db)],
):
    rows = await get_organic_records(conn)
    return [dict(r) for r in rows]


@router.post("", status_code=201)
async def create_organic_entry(
    body: CreateOrganicRequest,
    current_user: Annotated[dict, Depends(require_admin)],
    conn: Annotated[asyncpg.Connection, Depends(get_db)],
):
    rec_id = f"org-{int(time.time() * 1000):x}"
    record = await create_organic_record(
        conn,
        id=rec_id,
        report_id=body.report_id,
        quantity_kg=body.quantity_kg,
        distributed_to=body.distributed_to,
        distribution_date=body.distribution_date,
        status=body.status,
    )
    return {"message": "Organic waste distribution record logged", "record": dict(record)}


@router.patch("/{record_id}")
async def update_organic_entry(
    record_id: str,
    body: UpdateOrganicRequest,
    current_user: Annotated[dict, Depends(require_admin)],
    conn: Annotated[asyncpg.Connection, Depends(get_db)],
):
    await update_organic_status(conn, record_id, body.status)
    return {"message": "Organic waste record updated", "id": record_id, "status": body.status}


# ---------------------------------------------------------------------------
# Organic Listings (Marketplace)
# ---------------------------------------------------------------------------

@router.get("/listings")
async def list_organic_listings(
    current_user: Annotated[dict, Depends(get_current_user)],
    conn: Annotated[asyncpg.Connection, Depends(get_db)],
    status: str | None = None,
):
    listings = await get_listings(conn, status=status)
    return [dict(l) for l in listings]


@router.post("/listings", status_code=201)
async def create_organic_listing_endpoint(
    body: CreateOrganicListingRequest,
    current_user: Annotated[dict, Depends(require_admin)],
    conn: Annotated[asyncpg.Connection, Depends(get_db)],
):
    listing_id = f"lst-{int(time.time() * 1000):x}"
    listing = await create_listing(
        conn,
        id=listing_id,
        posted_by=current_user["sub"],
        total_kg=body.total_kg,
        description=body.description,
        waste_type=body.waste_type,
        pickup_location=body.pickup_location,
        available_until=body.available_until,
        image_base64=body.image_base64,
    )
    return {"message": "Organic waste marketplace listing created", "listing": dict(listing)}


# ---------------------------------------------------------------------------
# Organic Requests (approval-based flow)
# ---------------------------------------------------------------------------

@router.get("/requests")
async def list_requests(
    current_user: Annotated[dict, Depends(get_current_user)],
    conn: Annotated[asyncpg.Connection, Depends(get_db)],
):
    """
    Admin: returns all requests with requester info.
    Resident: returns only their own requests.
    """
    if current_user["role"] == "admin":
        rows = await get_all_requests(conn)
    else:
        rows = await get_requests_by_user(conn, current_user["sub"])
    return [dict(r) for r in rows]


@router.post("/listings/{listing_id}/request", status_code=201)
async def create_organic_request_endpoint(
    listing_id: str,
    body: CreateOrganicRequestBody,
    current_user: Annotated[dict, Depends(get_current_user)],
    conn: Annotated[asyncpg.Connection, Depends(get_db)],
):
    """Resident submits a request for a portion of an organic listing."""
    if current_user["role"] == "admin":
        raise HTTPException(status_code=403, detail="Admins cannot submit requests.")

    # Validate listing exists and is open
    listing = await get_listing_by_id(conn, listing_id)
    if not listing:
        raise HTTPException(status_code=404, detail="Organic listing not found.")
    if listing["status"] != "open":
        raise HTTPException(status_code=422, detail="This listing is no longer available.")
    if body.requested_kg <= 0:
        raise HTTPException(status_code=422, detail="Requested quantity must be greater than 0.")
    if body.requested_kg > float(listing["available_kg"]):
        raise HTTPException(
            status_code=422,
            detail=f"Only {float(listing['available_kg']):.1f}kg available. Reduce your request."
        )

    # Duplicate prevention: one active request per user per listing
    already_requested = await has_pending_request(conn, listing_id, current_user["sub"])
    if already_requested:
        raise HTTPException(
            status_code=422,
            detail="You already have an active request for this listing. Check your request status."
        )

    request_id = f"req-{int(time.time() * 1000):x}"
    req = await create_request(
        conn,
        id=request_id,
        listing_id=listing_id,
        user_id=current_user["sub"],
        requested_kg=body.requested_kg,
        contact_info=body.contact_info,
    )
    return {
        "message": f"Request for {body.requested_kg:.1f}kg submitted! Awaiting admin approval.",
        "request": dict(req),
    }


@router.patch("/requests/{request_id}")
async def update_request_endpoint(
    request_id: str,
    body: UpdateOrganicRequestStatus,
    current_user: Annotated[dict, Depends(require_admin)],
    conn: Annotated[asyncpg.Connection, Depends(get_db)],
):
    """Admin approves, rejects, or marks a request as completed."""
    req = await get_request_by_id(conn, request_id)
    if not req:
        raise HTTPException(status_code=404, detail="Request not found.")

    if body.status == "approved":
        try:
            result = await approve_request_atomic(conn, request_id, admin_note=body.admin_note or "")
            return {
                "message": f"Request approved. {float(req['requested_kg']):.1f}kg reserved for requester.",
                **result,
            }
        except ValueError as err:
            raise HTTPException(status_code=422, detail=str(err))
    else:
        updated = await update_request_status(conn, request_id, body.status, admin_note=body.admin_note or "")
        return {
            "message": f"Request marked as {body.status}.",
            "request": dict(updated),
        }
