from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from ..models import Post, Comment, UserReputation, Report, User, ReportStatus
from ..schemas import (
    PostCreate, PostResponse, CommentCreate, CommentResponse,
    UserReputationResponse, ReportCreate, ReportResponse
)
from ..utils.auth import get_current_active_user, verify_admin
from ..utils.reputation import update_aura_points, update_credibility_points

router = APIRouter(prefix="/forum", tags=["Forum"])

# Posts
@router.post("/posts", response_model=PostResponse, status_code=status.HTTP_201_CREATED)
async def create_post(post: PostCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    new_post = Post(**post.model_dump(), user_id=current_user.user_id)
    db.add(new_post)
    db.commit()
    db.refresh(new_post)
    return {**new_post.__dict__, "username": current_user.username}

@router.get("/posts", response_model=List[PostResponse])
async def get_posts(db: Session = Depends(get_db)):
    posts = db.query(Post).join(User).all()
    return [{**post.__dict__, "username": post.user.username} for post in posts]

# Comments
@router.post("/comments", response_model=CommentResponse, status_code=status.HTTP_201_CREATED)
async def create_comment(comment: CommentCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    post = db.query(Post).filter(Post.post_id == comment.post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    new_comment = Comment(**comment.model_dump(), user_id=current_user.user_id)
    db.add(new_comment)
    db.commit()
    db.refresh(new_comment)
    return {**new_comment.__dict__, "username": current_user.username}

@router.get("/posts/{post_id}/comments", response_model=List[CommentResponse])
async def get_comments(post_id: int, db: Session = Depends(get_db)):
    comments = db.query(Comment).filter(Comment.post_id == post_id).join(User).all()
    return [{**comment.__dict__, "username": comment.user.username} for comment in comments]

# Voting - Posts
@router.post("/posts/{post_id}/upvote")
async def upvote_post(post_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    post = db.query(Post).filter(Post.post_id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    post.upvotes += 1
    db.commit()
    update_aura_points(db, post.user_id)
    return {"message": "Upvoted successfully"}

@router.delete("/posts/{post_id}/upvote")
async def undo_upvote_post(post_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    post = db.query(Post).filter(Post.post_id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    if post.upvotes > 0:
        post.upvotes -= 1
        db.commit()
        # Optionally, adjust reputation points here if needed
    return {"message": "Upvote removed"}

@router.post("/posts/{post_id}/downvote")
async def downvote_post(post_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    post = db.query(Post).filter(Post.post_id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    post.downvotes += 1
    db.commit()
    # Optionally, adjust reputation points here if needed
    return {"message": "Downvoted successfully"}

@router.delete("/posts/{post_id}/downvote")
async def undo_downvote_post(post_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    post = db.query(Post).filter(Post.post_id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    if post.downvotes > 0:
        post.downvotes -= 1
        db.commit()
        # Optionally, adjust reputation points here if needed
    return {"message": "Downvote removed"}

# Voting - Comments
@router.post("/comments/{comment_id}/upvote")
async def upvote_comment(comment_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    comment = db.query(Comment).filter(Comment.comment_id == comment_id).first()
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    comment.upvotes += 1
    db.commit()
    update_aura_points(db, comment.user_id)
    return {"message": "Upvoted successfully"}

@router.delete("/comments/{comment_id}/upvote")
async def undo_upvote_comment(comment_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    comment = db.query(Comment).filter(Comment.comment_id == comment_id).first()
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    if comment.upvotes > 0:
        comment.upvotes -= 1
        db.commit()
        # Optionally, adjust reputation points here if needed
    return {"message": "Upvote removed"}

@router.post("/comments/{comment_id}/downvote")
async def downvote_comment(comment_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    comment = db.query(Comment).filter(Comment.comment_id == comment_id).first()
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    comment.downvotes += 1
    db.commit()
    # Optionally, adjust reputation points here if needed
    return {"message": "Downvoted successfully"}

@router.delete("/comments/{comment_id}/downvote")
async def undo_downvote_comment(comment_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    comment = db.query(Comment).filter(Comment.comment_id == comment_id).first()
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    if comment.downvotes > 0:
        comment.downvotes -= 1
        db.commit()
        # Optionally, adjust reputation points here if needed
    return {"message": "Downvote removed"}

# Reputation
@router.get("/reputation/{user_id}", response_model=UserReputationResponse)
async def get_reputation(user_id: int, db: Session = Depends(get_db)):
    reputation = db.query(UserReputation).filter(UserReputation.user_id == user_id).first()
    if not reputation:
        raise HTTPException(status_code=404, detail="Reputation not found")
    return reputation

# Reports
@router.post("/reports", response_model=ReportResponse, status_code=status.HTTP_201_CREATED)
async def create_report(report: ReportCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    new_report = Report(**report.model_dump(), reporter_id=current_user.user_id)
    db.add(new_report)
    db.commit()
    db.refresh(new_report)
    return new_report

@router.patch("/reports/{report_id}", response_model=ReportResponse)
async def update_report_status(report_id: int, status: ReportStatus, db: Session = Depends(get_db), _: User = Depends(verify_admin)):
    report = db.query(Report).filter(Report.report_id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    report.status = status
    db.commit()
    update_credibility_points(db, report, status)
    db.refresh(report)
    return report