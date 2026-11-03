"""Pydantic v2 schemas for all request/response models."""
from __future__ import annotations
from datetime import datetime
from typing import Literal, Optional
from pydantic import BaseModel, EmailStr, Field, ConfigDict


# ---------------------------------------------------------------------------
# Auth
# ---------------------------------------------------------------------------

class ResidentSignupRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=6, max_length=128)
    phone: Optional[str] = Field(None, max_length=30)
    address: Optional[str] = Field(None, max_length=300)


class AdminSignupRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=6, max_length=128)
    phone: Optional[str] = Field(None, max_length=30)
    address: Optional[str] = Field(None, max_length=300)
    admin_code: Optional[str] = Field(None, max_length=100)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., max_length=128)


class RefreshRequest(BaseModel):
    refreshToken: str = Field(..., min_length=10)


class UpdateProfileRequest(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=100)
    phone: Optional[str] = Field(None, max_length=30)
    address: Optional[str] = Field(None, max_length=300)
    profile_image: Optional[str] = None  # base64 encoded image, validated in endpoint


class ChangePasswordRequest(BaseModel):
    current_password: str = Field(..., max_length=128)
    new_password: str = Field(..., min_length=6, max_length=128)


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

    image_base64: str = Field(..., min_length=20)
    location_text: str = Field(..., min_length=2, max_length=500)
    latitude: Optional[float] = Field(0.0, ge=-90.0, le=90.0)
    longitude: Optional[float] = Field(0.0, ge=-180.0, le=180.0)
    landmark_type: Optional[str] = Field("general", max_length=50)
    odor_level: Optional[str] = Field("normal", max_length=20)
    is_drain_blocked: Optional[bool] = False
    is_road_blocked: Optional[bool] = False


class UpdateStatusRequest(BaseModel):
    status: Literal["pending", "approved", "rejected", "in_progress", "collected"]


# ---------------------------------------------------------------------------
# Schedule
# ---------------------------------------------------------------------------

class CreateScheduleRequest(BaseModel):
    zone_name: str = Field(..., min_length=2, max_length=100)
    waste_type: str = Field(..., min_length=2, max_length=100)
    collection_date: str = Field(..., min_length=4, max_length=100)
    status: Literal["scheduled", "completed", "delayed"] = "scheduled"


class UpdateScheduleRequest(BaseModel):
    status: Literal["scheduled", "completed", "delayed"]


# ---------------------------------------------------------------------------
# Rewards
# ---------------------------------------------------------------------------

class RedeemRequest(BaseModel):
    reward_title: str = Field(..., min_length=2, max_length=200)
    points_required: int = Field(..., gt=0, le=100000)


# ---------------------------------------------------------------------------
# Feedback
# ---------------------------------------------------------------------------

class CreateFeedbackRequest(BaseModel):
    subject: str = Field(..., min_length=3, max_length=200)
    message: str = Field(..., min_length=5, max_length=4000)


class RespondFeedbackRequest(BaseModel):
    admin_response: str = Field(..., min_length=2, max_length=4000)
    status: Literal["open", "in_progress", "resolved"] = "resolved"


# ---------------------------------------------------------------------------
# Organic (Legacy records)
# ---------------------------------------------------------------------------

class CreateOrganicRequest(BaseModel):
    report_id: Optional[str] = None
    quantity_kg: float = Field(..., gt=0, le=1000000)
    distributed_to: str = Field(..., min_length=2, max_length=200)
    distribution_date: str = Field(..., min_length=4, max_length=100)
    status: str = Field("Compost In-Transit", max_length=100)


class UpdateOrganicRequest(BaseModel):
    status: str = Field(..., max_length=100)


# ---------------------------------------------------------------------------
# Organic Marketplace (Listings & Requests)
# ---------------------------------------------------------------------------

class CreateOrganicListingRequest(BaseModel):
    total_kg: float = Field(..., gt=0, le=1000000)
    description: str = Field(..., min_length=3, max_length=2000)
    waste_type: str = Field("general", max_length=50)
    pickup_location: str = Field("", max_length=500)
    available_until: Optional[datetime] = None
    image_base64: str = Field("", max_length=20000000)


class CreateOrganicRequestBody(BaseModel):
    requested_kg: float = Field(..., gt=0, le=1000000)
    contact_info: str = Field(..., min_length=3, max_length=300)


class UpdateOrganicRequestStatus(BaseModel):
    status: Literal["approved", "rejected", "completed"]
    admin_note: Optional[str] = Field(None, max_length=1000)
