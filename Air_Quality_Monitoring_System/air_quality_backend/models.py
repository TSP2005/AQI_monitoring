from sqlalchemy import (
    Column, Integer, String, ForeignKey,
    DateTime, Boolean, DECIMAL,
    JSON, Enum, text
)
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from .database import Base
import enum

class UserRole(enum.Enum):
    admin = "admin"
    user = "user"
    data_contributor = "data_contributor"

class NotificationType(enum.Enum):
    threshold_alert = "threshold_alert"
    forecast_alert = "forecast_alert"
    system_update = "system_update"

class ContributionStatus(enum.Enum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"

class User(Base):
    __tablename__ = "users"

    user_id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, nullable=False)
    email = Column(String(100), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(
        Enum(UserRole, name="user_role"),
        nullable=False,
        server_default="user"
    )
    preferences = Column(JSON, server_default=text("'{}'::jsonb"))
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())
    last_login = Column(DateTime)
    is_active = Column(Boolean, default=True)
    posts = relationship("Post", back_populates="user")
    comments = relationship("Comment", back_populates="user")
    reputation = relationship("UserReputation", back_populates="user", uselist=False)

class Station(Base):
    __tablename__ = "stations"

    station_id = Column(Integer, primary_key=True, index=True)
    station_name = Column(String(100), nullable=False)
    latitude = Column(DECIMAL(10, 7), nullable=False)
    longitude = Column(DECIMAL(10, 7), nullable=False)
    epa_name = Column(String(100))
    epa_link = Column(String(255))
    is_active = Column(Boolean, default=True)
    source = Column(String(50), nullable=False)
    last_updated = Column(DateTime)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())

    measurements = relationship("Measurement", back_populates="station")

class Measurement(Base):  # Renamed from TspAqi
    __tablename__ = "measurements"

    measurement_id = Column(Integer, primary_key=True, index=True)
    station_id = Column(Integer, ForeignKey("stations.station_id"), nullable=False)
    timestamp = Column(DateTime, server_default=func.now())
    pm25 = Column(DECIMAL(5, 2))
    pm10 = Column(DECIMAL(5, 2))
    no2 = Column(DECIMAL(5, 2))
    co = Column(DECIMAL(5, 2))
    so2 = Column(DECIMAL(5, 2))
    ozone = Column(DECIMAL(5, 2))
    aqi = Column(Integer)
    source = Column(String(50), nullable=False)
    station = relationship("Station", back_populates="measurements")

class WeatherCondition(Base):
    __tablename__ = "weather_conditions"

    weather_id = Column(Integer, primary_key=True, index=True)
    station_id = Column(Integer, ForeignKey("stations.station_id"), nullable=False)
    temperature = Column(DECIMAL(5, 2))
    humidity = Column(DECIMAL(5, 2))
    wind_speed = Column(DECIMAL(5, 2))
    pressure = Column(DECIMAL(10, 2))
    precipitation = Column(DECIMAL(5, 2))
    weather_condition = Column(String(50))
    measurement_time = Column(DateTime, server_default=func.now())
    created_at = Column(DateTime, server_default=func.now())

class AQIAggregation(Base):
    __tablename__ = "aqi_aggregations"

    aggregation_id = Column(Integer, primary_key=True, index=True)
    station_id = Column(Integer, ForeignKey("stations.station_id"), nullable=False)
    avg_value = Column(DECIMAL(10, 4), nullable=False)
    min_value = Column(DECIMAL(10, 4))
    max_value = Column(DECIMAL(10, 4))
    aqi_category = Column(Enum(
        'good', 'moderate', 'unhealthy_sensitive',
        'unhealthy', 'very_unhealthy', 'hazardous',
        name='aqi_category'
    ))
    aggregation_type = Column(String(20), nullable=False)
    start_time = Column(DateTime, nullable=False)
    end_time = Column(DateTime, nullable=False)
    created_at = Column(DateTime, server_default=func.now())

class Prediction(Base):
    __tablename__ = "predictions"

    prediction_id = Column(Integer, primary_key=True, index=True)
    station_id = Column(Integer, ForeignKey("stations.station_id"), nullable=False)
    predicted_value = Column(DECIMAL(10, 4), nullable=False)
    predicted_aqi = Column(Integer)
    confidence = Column(DECIMAL(5, 4))
    prediction_time = Column(DateTime, nullable=False)
    created_at = Column(DateTime, server_default=func.now())

class Notification(Base):
    __tablename__ = "notifications"

    notification_id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.user_id"))
    notification_type = Column(Enum(NotificationType, name="notification_type"), nullable=False)
    title = Column(String(100), nullable=False)
    message = Column(String, nullable=False)
    station_id = Column(Integer, ForeignKey("stations.station_id"))
    aqi_value = Column(Integer)
    aqi_category = Column(Enum(
        'good', 'moderate', 'unhealthy_sensitive',
        'unhealthy', 'very_unhealthy', 'hazardous',
        name='aqi_category'
    ))
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, server_default=func.now())

class PublicContribution(Base):
    __tablename__ = "public_contributions"

    contribution_id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.user_id"))
    station_id = Column(Integer, ForeignKey("stations.station_id"), nullable=True)  # Made nullable
    pm25 = Column(DECIMAL(5, 2))
    pm10 = Column(DECIMAL(5, 2))
    no2 = Column(DECIMAL(5, 2))
    co = Column(DECIMAL(5, 2))
    so2 = Column(DECIMAL(5, 2))
    ozone = Column(DECIMAL(5, 2))
    overall_aqi = Column(DECIMAL(5, 2))
    source = Column(String(50), nullable=False)  # Added from previous changes
    additional_info = Column(String, nullable=True)  # Added from previous changes
    status = Column(Enum(ContributionStatus, name="contribution_status"), default="pending")
    created_at = Column(DateTime, server_default=func.now())

class SystemLog(Base):
    __tablename__ = "system_logs"

    log_id = Column(Integer, primary_key=True, index=True)
    log_level = Column(String(20), nullable=False)
    component = Column(String(50), nullable=False)
    message = Column(String, nullable=False)
    log_time = Column(DateTime, server_default=func.now())

class Post(Base):
    __tablename__ = "posts"

    post_id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.user_id"), nullable=False)
    title = Column(String(255), nullable=False)
    content = Column(String, nullable=False)
    upvotes = Column(Integer, default=0)
    downvotes = Column(Integer, default=0)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now())

    user = relationship("User", back_populates="posts")
    comments = relationship("Comment", back_populates="post")

class Comment(Base):
    __tablename__ = "comments"

    comment_id = Column(Integer, primary_key=True, index=True)
    post_id = Column(Integer, ForeignKey("posts.post_id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.user_id"), nullable=False)
    content = Column(String, nullable=False)
    upvotes = Column(Integer, default=0)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())

    post = relationship("Post", back_populates="comments")
    user = relationship("User", back_populates="comments")

class UserReputation(Base):
    __tablename__ = "user_reputation"

    reputation_id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.user_id"), unique=True, nullable=False)
    aura_points = Column(Integer, default=0)
    streak_points = Column(Integer, default=0)
    credibility_points = Column(Integer, default=100)
    last_streak_date = Column(DateTime)

    user = relationship("User", back_populates="reputation")

class ReportStatus(enum.Enum):
    pending = "pending"
    verified = "verified"
    false = "false"

class Report(Base):
    __tablename__ = "reports"

    report_id = Column(Integer, primary_key=True, index=True)
    reporter_id = Column(Integer, ForeignKey("users.user_id"), nullable=False)
    reported_user_id = Column(Integer, ForeignKey("users.user_id"), nullable=False)
    reason = Column(String, nullable=False)
    status = Column(Enum(ReportStatus, name="report_status"), default="pending")
    created_at = Column(DateTime, server_default=func.now())

    reporter = relationship("User", foreign_keys=[reporter_id])
    reported_user = relationship("User", foreign_keys=[reported_user_id])