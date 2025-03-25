from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from ..database import get_db
from ..models import PublicContribution, User, UserRole, Station
from ..schemas import (
    PublicContributionCreate,
    PublicContributionResponse,
    ContributionStatus
)
from ..utils.auth import get_current_active_user

router = APIRouter(prefix="/contributions", tags=["Contributions"])

# Helper function to verify admin role
async def verify_admin(current_user: User = Depends(get_current_active_user)):
    if current_user.role != UserRole.admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privileges required"
        )
    return current_user

# Helper function to verify data_contributor role
async def verify_data_contributor(current_user: User = Depends(get_current_active_user)):
    if current_user.role != UserRole.data_contributor:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permissions. Only data contributors can access this resource."
        )
    return current_user

@router.post(
    "/",
    response_model=PublicContributionResponse,
    status_code=status.HTTP_201_CREATED
)
async def create_contribution(
    contribution: PublicContributionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(verify_data_contributor)
):
    # Check if this is an AQI contribution (at least one AQI field is provided)
    aqi_fields = ["pm25", "pm10", "no2", "co", "so2", "ozone", "overall_aqi"]
    is_aqi_contribution = any(getattr(contribution, field) is not None for field in aqi_fields)

    # Require station_id for AQI contributions
    if is_aqi_contribution and contribution.station_id is None:
        raise HTTPException(
            status_code=400,
            detail="Station ID is required for AQI contributions"
        )

    # Validate station exists if station_id is provided
    if contribution.station_id is not None:
        station = db.query(Station).get(contribution.station_id)
        if not station:
            raise HTTPException(status_code=404, detail="Station not found")

    # Validate numeric fields
    numeric_fields = ["pm25", "pm10", "no2", "co", "so2", "ozone", "overall_aqi"]
    for field in numeric_fields:
        value = getattr(contribution, field)
        if value is not None and not isinstance(value, (int, float)):
            raise HTTPException(
                status_code=400,
                detail=f"{field} must be a number, got {type(value).__name__}"
            )

    # Create new contribution
    new_contribution = PublicContribution(
        **contribution.model_dump(),
        user_id=current_user.user_id,
        status=ContributionStatus.pending
    )

    db.add(new_contribution)
    db.commit()
    db.refresh(new_contribution)
    return new_contribution

@router.get("/", response_model=List[PublicContributionResponse])
async def get_contributions(
    db: Session = Depends(get_db),
    status_filter: Optional[ContributionStatus] = None,
    limit: int = 100,
    offset: int = 0,
    current_user: User = Depends(verify_data_contributor)  # Restrict to data_contributors
):
    query = db.query(PublicContribution)

    if status_filter:
        query = query.filter(PublicContribution.status == status_filter)

    return query.order_by(PublicContribution.created_at.desc()).limit(limit).offset(offset).all()

@router.get("/{contribution_id}", response_model=PublicContributionResponse)
async def get_contribution_details(
    contribution_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(verify_data_contributor)  # Restrict to data_contributors
):
    contribution = db.query(PublicContribution).get(contribution_id)
    if not contribution:
        raise HTTPException(status_code=404, detail="Contribution not found")
    return contribution

@router.patch("/{contribution_id}", response_model=PublicContributionResponse)
async def update_contribution_status(
    contribution_id: int,
    new_status: ContributionStatus,
    db: Session = Depends(get_db),
    _: User = Depends(verify_admin)
):
    contribution = db.query(PublicContribution).get(contribution_id)
    if not contribution:
        raise HTTPException(status_code=404, detail="Contribution not found")

    contribution.status = new_status
    db.commit()
    db.refresh(contribution)
    return contribution

@router.delete("/{contribution_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_contribution(
    contribution_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(verify_admin)
):
    contribution = db.query(PublicContribution).get(contribution_id)
    if not contribution:
        raise HTTPException(status_code=404, detail="Contribution not found")

    db.delete(contribution)
    db.commit()