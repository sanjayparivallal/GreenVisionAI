"""Pydantic v2 schemas for all request/response models."""
from __future__ import annotations
from datetime import datetime
from typing import Literal, Optional
from pydantic import BaseModel, EmailStr, Field, ConfigDict


# ---------------------------------------------------------------------------
# Auth
# ---------------------------------------------------------------------------

class ResidentSignupRequest(BaseModel):
    name: str = Field(..., min_length=2)
    email: EmailStr
    password: str = Field(..., min_length=6)
    phone: Optional[str] = None
    address: Optional[str] = None


class AdminSignupRequest(BaseModel):
    name: str = Field(..., min_length=2)
    email: EmailStr
    password: str = Field(..., min_length=6)
    phone: Optional[str] = None
    address: Optional[str] = None
    admin_code: Optional[str] = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class RefreshRequest(BaseModel):
    refreshToken: str


class UpdateProfileRequest(BaseModel):
    name: Optional[str] = Field(None, min_length=2)
    phone: Optional[str] = None
    address: Optional[str] = None
    profile_image: Optional[str] = None  # base64 encoded image


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=6)


class UserOut(BaseModel):
    id: str
    name: str
    email: str
    role: str
    address: Optional[str] = None
    phone: Optional[str] = None
    profile_image: Optional[str] = None
    created_at: Optional[str] = None


class TokensOut(BaseModel):
    accessToken: str
    refreshToken: str


class AuthResponse(BaseModel):
    message: str
    user: UserOut
    tokens: TokensOut


# ---------------------------------------------------------------------------
# Reports
# ---------------------------------------------------------------------------

class CreateReportRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    image_base64: str
    location_text: str
    latitude: Optional[float] = 0.0
    longitude: Optional[float] = 0.0


class UpdateStatusRequest(BaseModel):
    status: Literal["pending", "approved", "rejected", "in_progress", "collected"]


# ---------------------------------------------------------------------------
# Schedule
# ---------------------------------------------------------------------------

class CreateScheduleRequest(BaseModel):
    zone_name: str
    waste_type: str
    collection_date: str
    status: Literal["scheduled", "completed", "delayed"] = "scheduled"


class UpdateScheduleRequest(BaseModel):
    status: Literal["scheduled", "completed", "delayed"]


# ---------------------------------------------------------------------------
# Rewards
# ---------------------------------------------------------------------------

class RedeemRequest(BaseModel):
    reward_title: str
    points_required: int = Field(..., gt=0)


# ---------------------------------------------------------------------------
# Feedback
# ---------------------------------------------------------------------------

class CreateFeedbackRequest(BaseModel):
    subject: str = Field(..., min_length=3)
    message: str = Field(..., min_length=5)


class RespondFeedbackRequest(BaseModel):
    admin_response: str
    status: Literal["open", "in_progress", "resolved"] = "resolved"


# ---------------------------------------------------------------------------
# Organic (Legacy records)
# ---------------------------------------------------------------------------

class CreateOrganicRequest(BaseModel):
    report_id: Optional[str] = None
    quantity_kg: float = Field(..., gt=0)
    distributed_to: str
    distribution_date: str
    status: str = "Compost In-Transit"


class UpdateOrganicRequest(BaseModel):
    status: str


# ---------------------------------------------------------------------------
# Organic Marketplace (Listings & Requests)
# ---------------------------------------------------------------------------

class CreateOrganicListingRequest(BaseModel):
    total_kg: float = Field(..., gt=0)
    description: str = Field(..., min_length=3)
    waste_type: str = "general"
    pickup_location: str = ""
    available_until: Optional[datetime] = None   # ISO datetime object
    image_base64: str = ""


class CreateOrganicRequestBody(BaseModel):
    requested_kg: float = Field(..., gt=0)
    contact_info: str = Field(..., min_length=3)


class UpdateOrganicRequestStatus(BaseModel):
    status: Literal["approved", "rejected", "completed"]
    admin_note: Optional[str] = None
