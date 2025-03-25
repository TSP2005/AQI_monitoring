# air_quality_backend/utils/reputation.py
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from ..models import UserReputation, Report, ReportStatus

def update_streak(db: Session, user_id: int):
    today = datetime.now().date()
    reputation = db.query(UserReputation).filter(UserReputation.user_id == user_id).first()
    if not reputation:
        reputation = UserReputation(user_id=user_id, last_streak_date=today, streak_points=1)
        db.add(reputation)
    else:
        last_streak = reputation.last_streak_date
        if last_streak == today:
            pass  # Already logged in today
        elif last_streak == today - timedelta(days=1):
            reputation.streak_points += 1
            reputation.last_streak_date = today
        else:
            reputation.streak_points = 1
            reputation.last_streak_date = today
    db.commit()

def update_aura_points(db: Session, user_id: int):
    reputation = db.query(UserReputation).filter(UserReputation.user_id == user_id).first()
    if not reputation:
        reputation = UserReputation(user_id=user_id, aura_points=1)
        db.add(reputation)
    else:
        reputation.aura_points += 1
    db.commit()

def update_credibility_points(db: Session, report: Report, status: ReportStatus):
    reporter_reputation = db.query(UserReputation).filter(UserReputation.user_id == report.reporter_id).first()
    reported_reputation = db.query(UserReputation).filter(UserReputation.user_id == report.reported_user_id).first()

    if not reporter_reputation:
        reporter_reputation = UserReputation(user_id=report.reporter_id, credibility_points=100)
        db.add(reporter_reputation)
    if not reported_reputation:
        reported_reputation = UserReputation(user_id=report.reported_user_id, credibility_points=100)
        db.add(reported_reputation)

    if status == ReportStatus.verified:
        reported_reputation.credibility_points -= 10  # Adjustable value
        reporter_reputation.credibility_points += 5   # Adjustable value
    elif status == ReportStatus.false:
        reporter_reputation.credibility_points -= 10  # Adjustable value

    db.commit()