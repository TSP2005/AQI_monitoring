from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, EmailStr, Field
from enum import Enum

# -------------------------
# Enums (Match Database Enums)
# -------------------------

class UserRole(str, Enum):
    admin = "admin"
    user = "user"
    data_contributor = "data_contributor"

class AQICategory(str, Enum):
    good = "good"
    moderate = "moderate"
    unhealthy_sensitive = "unhealthy_sensitive"
    unhealthy = "unhealthy"
    very_unhealthy = "very_unhealthy"
    hazardous = "hazardous"

class NotificationType(str, Enum):
    threshold_alert = "threshold_alert"
    forecast_alert = "forecast_alert"
    system_update = "system_update"

class ContributionStatus(str, Enum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"

# -------------------------
# Base Schemas
# -------------------------

class UserBase(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr
    role: UserRole = UserRole.user

class StationBase(BaseModel):
    station_name: str = Field(..., max_length=100)
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    epa_name: Optional[str] = Field(None, max_length=100)
    epa_link: Optional[str] = Field(None, max_length=255)
    is_active: bool = True
    source: str = Field(..., max_length=50)

# -------------------------
# Request Schemas (Create/Update)
# -------------------------

class UserCreate(UserBase):
    password: str = Field(..., min_length=8)

    class Config:
        json_schema_extra = {
            "example": {
                "username": "johndoe",
                "email": "johndoe@example.com",
                "password": "strongpassword123",
                "role": "user"
            }
        }

class UserUpdate(BaseModel):
    username: Optional[str] = Field(None, min_length=3, max_length=50)
    email: Optional[EmailStr] = None
    password: Optional[str] = Field(None, min_length=8)
    role: Optional[UserRole] = None
    preferences: Optional[dict] = None
    is_active: Optional[bool] = None

class StationCreate(StationBase):
    pass

# -------------------------
# Response Schemas
# -------------------------

class UserResponse(UserBase):
    user_id: int
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
        exclude = {"password_hash"}

class MeasurementResponse(BaseModel):
    measurement_id: int
    station_id: int
    pm25: Optional[float] = None
    pm10: Optional[float] = None
    no2: Optional[float] = None
    co: Optional[float] = None
    so2: Optional[float] = None
    ozone: Optional[float] = None
    aqi: Optional[int] = None
    source: str
    timestamp: datetime
    created_at: datetime

    class Config:
        from_attributes = True

class StationResponse(StationBase):
    station_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    measurements: List[MeasurementResponse] = []

    class Config:
        from_attributes = True

class UserResponse(BaseModel):
    user_id: int
    username: str
    email: EmailStr
    role: UserRole
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

# New Forum Schemas
class PostBase(BaseModel):
    title: str = Field(..., max_length=255)
    content: str

class PostCreate(PostBase):
    title: str
    content: str

class PostResponse(PostBase):
    post_id: int
    title: str
    content: str
    user_id: int
    username: str
    created_at: datetime
    updated_at: datetime | None
    upvotes: int
    downvotes: int

    class Config:
        orm_mode = True

class CommentBase(BaseModel):
    content: str

class CommentCreate(CommentBase):
    post_id: int

class CommentResponse(CommentBase):
    comment_id: int
    post_id: int
    user_id: int
    username: str  # Added for frontend display
    upvotes: int
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True

class UserReputationResponse(BaseModel):
    user_id: int
    aura_points: int
    streak_points: int
    credibility_points: int
    last_streak_date: Optional[datetime]

    class Config:
        from_attributes = True

class ReportStatus(str, Enum):
    pending = "pending"
    verified = "verified"
    false = "false"

class ReportCreate(BaseModel):
    reported_user_id: int
    reason: str

class ReportResponse(BaseModel):
    report_id: int
    reporter_id: int
    reported_user_id: int
    reason: str
    status: ReportStatus
    created_at: datetime

    class Config:
        from_attributes = True

# -------------------------
# Authentication Schemas
# -------------------------

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None

# -------------------------
# Notification Schemas
# -------------------------

class NotificationBase(BaseModel):
    notification_type: NotificationType
    title: str = Field(..., max_length=100)
    message: str
    station_id: Optional[int] = None
    aqi_value: Optional[int] = None
    aqi_category: Optional[AQICategory] = None

class NotificationCreate(NotificationBase):
    user_ids: List[int] = Field(default_factory=list)

class NotificationResponse(NotificationBase):
    notification_id: int
    user_id: int
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True

# -------------------------
# Contribution Schemas
# -------------------------

class PublicContributionBase(BaseModel):
    pm25: Optional[float] = Field(None, ge=0)
    pm10: Optional[float] = Field(None, ge=0)
    no2: Optional[float] = Field(None, ge=0)
    co: Optional[float] = Field(None, ge=0)
    so2: Optional[float] = Field(None, ge=0)
    ozone: Optional[float] = Field(None, ge=0)
    overall_aqi: Optional[float] = Field(None, ge=0)
    source: str = Field(..., max_length=50)  # Added from previous changes
    additional_info: Optional[str] = None    # Added from previous changes

class PublicContributionCreate(PublicContributionBase):
    station_id: Optional[int] = None  # Made optional

class PublicContributionResponse(PublicContributionBase):
    contribution_id: int
    status: ContributionStatus
    created_at: datetime
    user_id: int
    station_id: Optional[int] = None  # Made optional

    class Config:
        from_attributes = True

# -------------------------
# Measurement Schemas
# -------------------------

class MeasurementCreate(BaseModel):
    station_id: int
    pm25: Optional[float] = None
    pm10: Optional[float] = None
    no2: Optional[float] = None
    co: Optional[float] = None
    so2: Optional[float] = None
    ozone: Optional[float] = None
    aqi: Optional[int] = None
    source: str
    timestamp: Optional[datetime] = None

# -------------------------
# Station Update Schema
# -------------------------

class StationUpdate(BaseModel):
    station_name: Optional[str] = Field(None, max_length=100)
    latitude: Optional[float] = Field(None, ge=-90, le=90)
    longitude: Optional[float] = Field(None, ge=-180, le=180)
    epa_name: Optional[str] = Field(None, max_length=100)
    epa_link: Optional[str] = Field(None, max_length=255)
    is_active: Optional[bool] = None
    source: Optional[str] = Field(None, max_length=50)

# -------------------------
# Utility Schemas
# -------------------------

class HealthCheck(BaseModel):
    status: str
    database_status: str
    environment: str
    version: str