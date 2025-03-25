from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime, timezone
from typing import List
from ..database import get_db
from ..models import Comment, User, Post
from ..schemas import CommentCreate, CommentResponse
from ..utils.auth import get_current_active_user

router = APIRouter(prefix="/forum/comments", tags=["Forum Comments"])

@router.post("/", response_model=CommentResponse, status_code=status.HTTP_201_CREATED)
async def create_comment(
    comment_data: CommentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Create a new comment on a forum post."""
    try:
        # Verify post exists
        post = db.query(Post).get(comment_data.post_id)
        if not post:
            raise HTTPException(status_code=404, detail="Post not found")
            
        current_time = datetime.now(timezone.utc)
        new_comment = Comment(
            post_id=comment_data.post_id,
            user_id=current_user.user_id,
            content=comment_data.content,
            created_at=current_time,
            updated_at=current_time,
            upvotes=0
        )
        
        db.add(new_comment)
        db.commit()
        db.refresh(new_comment)
        
        return CommentResponse(
            comment_id=new_comment.comment_id,
            post_id=new_comment.post_id,
            user_id=new_comment.user_id,
            username=current_user.username,
            content=new_comment.content,
            created_at=new_comment.created_at,
            updated_at=new_comment.updated_at or current_time,
            upvotes=new_comment.upvotes
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create comment: {str(e)}")

@router.get("/{post_id}", response_model=List[CommentResponse])
async def get_comments(
    post_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get all comments for a specific post."""
    post = db.query(Post).get(post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
        
    comments = db.query(Comment).join(User).filter(Comment.post_id == post_id).order_by(Comment.created_at).all()
    
    return [
        CommentResponse(
            comment_id=comment.comment_id,
            post_id=comment.post_id,
            user_id=comment.user_id,
            username=comment.user.username,
            content=comment.content,
            created_at=comment.created_at,
            updated_at=comment.updated_at or comment.created_at,
            upvotes=comment.upvotes
        )
        for comment in comments
    ]