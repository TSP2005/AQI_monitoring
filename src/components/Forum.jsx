import React, { useState, useEffect } from 'react';
import './Forum.css';

// Authentication headers utility
const getAuthHeaders = () => {
  const token = localStorage.getItem('access_token');
  return token
    ? { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
    : { 'Content-Type': 'application/json' };
};

// Build a comment tree from a flat list
const buildCommentTree = (comments) => {
  const commentMap = {};
  comments.forEach((comment) => {
    comment.replies = [];
    commentMap[comment.comment_id] = comment;
  });
  const roots = [];
  comments.forEach((comment) => {
    if (comment.parent_comment_id) {
      const parent = commentMap[comment.parent_comment_id];
      if (parent) parent.replies.push(comment);
    } else {
      roots.push(comment);
    }
  });
  return roots;
};

// Function to convert URLs in text to clickable links
const linkify = (text) => {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  return text.split(urlRegex).map((part, index) => {
    if (part.match(urlRegex)) {
      return (
        <a
          key={index}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className="post-link"
        >
          {part}
        </a>
      );
    }
    return part;
  });
};

// Comment component for recursive rendering
const Comment = ({ comment, onReply, onVote }) => {
  const [showReplyInput, setShowReplyInput] = useState(false);
  const [replyContent, setReplyContent] = useState('');

  const handleReply = () => {
    if (replyContent.trim()) {
      onReply(comment.comment_id, replyContent);
      setReplyContent('');
      setShowReplyInput(false);
    }
  };

  return (
    <div className="comment">
      <div className="comment-header">
        <span className="comment-author">
          <i className="fas fa-user-circle"></i> {comment.author || comment.username}
        </span>
        <span className="comment-time">{new Date(comment.created_at).toLocaleString()}</span>
      </div>
      <p className="comment-text">{comment.content}</p>
      <div className="comment-actions">
        <button
          className={`comment-vote ${comment.userVote === 'up' ? 'voted' : ''}`}
          onClick={() => onVote(comment.comment_id)}
        >
          <i className="fas fa-arrow-up"></i> {comment.upvotes || 0}
        </button>
        <button
          className="comment-reply"
          onClick={() => setShowReplyInput(!showReplyInput)}
        >
          <i className="fas fa-reply"></i> Reply
        </button>
      </div>
      {showReplyInput && (
        <div className="reply-input-section">
          <textarea
            placeholder="Write a reply..."
            value={replyContent}
            onChange={(e) => setReplyContent(e.target.value)}
          />
          <button onClick={handleReply}>
            <i className="fas fa-paper-plane"></i> Submit
          </button>
        </div>
      )}
      {comment.replies && comment.replies.length > 0 && (
        <div className="replies">
          {comment.replies.map((reply) => (
            <Comment
              key={reply.comment_id}
              comment={reply}
              onReply={onReply}
              onVote={onVote}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// Main Forum component
const Forum = () => {
  const [posts, setPosts] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [activeCommentPost, setActiveCommentPost] = useState(null);
  const [showCreatePostModal, setShowCreatePostModal] = useState(false);
  const [newPost, setNewPost] = useState({ title: '', content: '' });
  const [activeFilter, setActiveFilter] = useState('new');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportingPost, setReportingPost] = useState(null);
  const [reportReason, setReportReason] = useState('');

  useEffect(() => {
    fetchPosts();
  }, [activeFilter]);

  const fetchPosts = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`http://localhost:8002/forum/posts?sort=${activeFilter}`, {
        headers: getAuthHeaders(),
      });
      if (!response.ok) throw new Error('Failed to fetch posts');
      const data = await response.json();
      const postsWithComments = await Promise.all(
        data.map(async (post) => {
          try {
            const commentsResponse = await fetch(
              `http://localhost:8002/forum/posts/${post.post_id}/comments`,
              { headers: getAuthHeaders() }
            );
            const comments = commentsResponse.ok ? await commentsResponse.json() : [];
            const commentTree = buildCommentTree(comments);
            return {
              ...post,
              id: post.post_id,
              author: post.username,
              timestamp: new Date(post.created_at).toLocaleString(),
              comments: commentTree,
              showFullContent: false,
            };
          } catch (error) {
            console.error(`Error fetching comments for post ${post.post_id}:`, error);
            return {
              ...post,
              id: post.post_id,
              author: post.username,
              timestamp: new Date(post.created_at).toLocaleString(),
              comments: [],
              showFullContent: false,
            };
          }
        })
      );
      setPosts(postsWithComments);
    } catch (error) {
      console.error('Error fetching posts:', error);
      setError('Failed to load posts. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVote = async (postId, isUpvote) => {
    try {
      const post = posts.find(p => p.id === postId);
      const currentVote = post.userVote; // 'up', 'down', or null

      let endpoint, newVoteState, voteChange;
      if (isUpvote) {
        if (currentVote === 'up') {
          endpoint = `/forum/posts/${postId}/upvote`;
          newVoteState = null;
          voteChange = { upvotes: -1 };
        } else if (currentVote === 'down') {
          endpoint = `/forum/posts/${postId}/upvote`;
          newVoteState = 'up';
          voteChange = { downvotes: -1, upvotes: 1 };
        } else {
          endpoint = `/forum/posts/${postId}/upvote`;
          newVoteState = 'up';
          voteChange = { upvotes: 1 };
        }
      } else {
        if (currentVote === 'down') {
          endpoint = `/forum/posts/${postId}/downvote`;
          newVoteState = null;
          voteChange = { downvotes: -1 };
        } else if (currentVote === 'up') {
          endpoint = `/forum/posts/${postId}/downvote`;
          newVoteState = 'down';
          voteChange = { upvotes: -1, downvotes: 1 };
        } else {
          endpoint = `/forum/posts/${postId}/downvote`;
          newVoteState = 'down';
          voteChange = { downvotes: 1 };
        }
      }

      const response = await fetch(`http://localhost:8002${endpoint}`, {
        method: currentVote && currentVote === (isUpvote ? 'up' : 'down') ? 'DELETE' : 'POST',
        headers: getAuthHeaders(),
      });

      if (response.ok) {
        setPosts(posts.map((p) =>
          p.id === postId
            ? {
                ...p,
                upvotes: p.upvotes + (voteChange.upvotes || 0),
                downvotes: p.downvotes + (voteChange.downvotes || 0),
                userVote: newVoteState
              }
            : p
        ));
      } else {
        throw new Error('Failed to update vote');
      }
    } catch (error) {
      console.error('Error voting:', error);
      setError('Failed to vote. Please try again.');
    }
  };

  const handleCommentVote = async (postId, commentId) => {
    try {
      const response = await fetch(`http://localhost:8002/forum/comments/${commentId}/upvote`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });
      if (response.ok) {
        setPosts(posts.map((post) =>
          post.id === postId
            ? { ...post, comments: updateCommentVotes(post.comments, commentId) }
            : post
        ));
      }
    } catch (error) {
      console.error('Error voting on comment:', error);
      setError('Failed to vote on comment. Please try again.');
    }
  };

  const updateCommentVotes = (comments, commentId) => {
    return comments.map((comment) => {
      if (comment.comment_id === commentId) {
        return { ...comment, upvotes: comment.upvotes + 1 };
      } else if (comment.replies && comment.replies.length > 0) {
        return { ...comment, replies: updateCommentVotes(comment.replies, commentId) };
      }
      return comment;
    });
  };

  const handleAddComment = async (postId, parentCommentId, content) => {
    if (!content.trim()) return;
    try {
      const response = await fetch('http://localhost:8002/forum/comments', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ post_id: postId, content, parent_comment_id: parentCommentId }),
      });
      if (response.ok) {
        const newCommentData = await response.json();
        const newComment = {
          ...newCommentData,
          comment_id: newCommentData.comment_id,
          author: newCommentData.username,
          created_at: new Date().toISOString(),
          upvotes: 0,
          replies: [],
        };
        setPosts(posts.map((post) => {
          if (post.id === postId) {
            if (parentCommentId) {
              return { ...post, comments: addCommentToTree(post.comments, parentCommentId, newComment) };
            } else {
              return { ...post, comments: [...post.comments, newComment] };
            }
          }
          return post;
        }));
        if (!parentCommentId) setNewComment('');
      } else {
        throw new Error('Failed to add comment');
      }
    } catch (error) {
      console.error('Error adding comment:', error);
      setError('Failed to add comment. Please try again.');
    }
  };

  const addCommentToTree = (comments, parentId, newComment) => {
    return comments.map((comment) => {
      if (comment.comment_id === parentId) {
        return { ...comment, replies: [...comment.replies, newComment] };
      } else if (comment.replies && comment.replies.length > 0) {
        return { ...comment, replies: addCommentToTree(comment.replies, parentId, newComment) };
      }
      return comment;
    });
  };

  const handleCreatePost = async () => {
    if (!newPost.title.trim() || !newPost.content.trim()) return;
    try {
      const response = await fetch('http://localhost:8002/forum/posts', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ title: newPost.title, content: newPost.content }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to create post');
      }
      const createdPost = await response.json();
      const formattedPost = {
        ...createdPost,
        id: createdPost.post_id,
        author: createdPost.username,
        timestamp: new Date(createdPost.created_at).toLocaleString(),
        comments: [],
        showFullContent: false,
      };
      setPosts([formattedPost, ...posts]);
      setShowCreatePostModal(false);
      setNewPost({ title: '', content: '' });
      setError(null);
    } catch (error) {
      console.error('Error creating post:', error);
      setError(error.message);
    }
  };

  const handleSubmitReport = async () => {
    if (!reportReason.trim()) {
      alert('Please provide a reason for reporting.');
      return;
    }
    try {
      const response = await fetch('http://localhost:8002/forum/reports', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ reported_user_id: reportingPost.user_id, reason: reportReason }),
      });
      if (response.ok) {
        alert('Thank you. This post has been reported for review.');
        setShowReportModal(false);
        setReportReason('');
      } else {
        throw new Error('Failed to report post');
      }
    } catch (error) {
      console.error('Error reporting:', error);
      alert('Failed to report post. Please try again.');
    }
  };

  const toggleContentExpansion = (postId) => {
    setPosts(posts.map((post) =>
      post.id === postId ? { ...post, showFullContent: !post.showFullContent } : post
    ));
  };

  return (
    <div className="forum-container content-container">
      {error && <div className="error-message">{error}</div>}
      <div className="forum-header">
        <h1>EcoForum</h1>
        <p>Discuss air quality improvement initiatives and share your ideas</p>
        <button className="new-post-btn" onClick={() => setShowCreatePostModal(true)}>
          <i className="fas fa-plus-circle"></i> Create New Post
        </button>
      </div>

      <div className="filter-options">
        <button
          className={`filter-btn ${activeFilter === 'hot' ? 'active' : ''}`}
          onClick={() => setActiveFilter('hot')}
        >
          <i className="fas fa-fire"></i> Hot
        </button>
        <button
          className={`filter-btn ${activeFilter === 'new' ? 'active' : ''}`}
          onClick={() => setActiveFilter('new')}
        >
          <i className="fas fa-clock"></i> New
        </button>
        <button
          className={`filter-btn ${activeFilter === 'top' ? 'active' : ''}`}
          onClick={() => setActiveFilter('top')}
        >
          <i className="fas fa-award"></i> Top
        </button>
      </div>

      {isLoading ? (
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading posts...</p>
        </div>
      ) : (
        <div className="posts-container">
          {posts.length === 0 ? (
            <div className="no-posts-message">
              <i className="fas fa-comment-slash"></i>
              <p>No posts yet. Be the first to create a discussion!</p>
            </div>
          ) : (
            posts.map((post) => (
              <div className="post-card" key={post.id}>
                <div className="vote-section">
                  <button
                    className={`vote-btn up ${post.userVote === 'up' ? 'voted' : ''}`}
                    onClick={() => handleVote(post.id, true)}
                  >
                    <i className="fas fa-arrow-up"></i>
                  </button>
                  <span className="vote-count">{post.upvotes - post.downvotes}</span>
                  <button
                    className={`vote-btn down ${post.userVote === 'down' ? 'voted' : ''}`}
                    onClick={() => handleVote(post.id, false)}
                  >
                    <i className="fas fa-arrow-down"></i>
                  </button>
                </div>

                <div className="post-content">
                  <h3>{post.title}</h3>
                  <p className="post-author">
                    <i className="fas fa-user-circle"></i> {post.author} • {post.timestamp}
                  </p>

                  <div className="post-text">
                    {post.content.length > 200 && !post.showFullContent ? (
                      <>
                        <p>{linkify(post.content.substring(0, 200))}...</p>
                        <button
                          className="read-more-btn"
                          onClick={() => toggleContentExpansion(post.id)}
                        >
                          Read More <i className="fas fa-chevron-down"></i>
                        </button>
                      </>
                    ) : (
                      <>
                        <p>{linkify(post.content)}</p>
                        {post.content.length > 200 && (
                          <button
                            className="read-more-btn"
                            onClick={() => toggleContentExpansion(post.id)}
                          >
                            Show Less <i className="fas fa-chevron-up"></i>
                          </button>
                        )}
                      </>
                    )}
                  </div>

                  <div className="post-actions">
                    <button
                      className="action-btn comment"
                      onClick={() => setActiveCommentPost(activeCommentPost === post.id ? null : post.id)}
                    >
                      <i className="fas fa-comment"></i> {post.comments.length} Comments
                    </button>
                    <button className="action-btn share">
                      <i className="fas fa-share"></i> Share
                    </button>
                    <button
                      className="action-btn report"
                      onClick={() => {
                        setReportingPost(post);
                        setShowReportModal(true);
                      }}
                    >
                      <i className="fas fa-flag"></i> Report
                    </button>
                  </div>

                  {activeCommentPost === post.id && (
                    <>
                      <div className="comment-input-section">
                        <textarea
                          placeholder="Write a comment..."
                          value={newComment}
                          onChange={(e) => setNewComment(e.target.value)}
                        />
                        <button onClick={() => handleAddComment(post.id, null, newComment)}>
                          <i className="fas fa-paper-plane"></i> Submit
                        </button>
                      </div>

                      <div className="comments-section">
                        {post.comments.length === 0 ? (
                          <p className="no-comments">No comments yet. Be the first to share your thoughts!</p>
                        ) : (
                          post.comments.map((comment) => (
                            <Comment
                              key={comment.comment_id}
                              comment={comment}
                              onReply={(parentId, content) => handleAddComment(post.id, parentId, content)}
                              onVote={(commentId) => handleCommentVote(post.id, commentId)}
                            />
                          ))
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {showCreatePostModal && (
        <div className="modal-overlay">
          <div className="create-post-modal">
            <div className="modal-header">
              <h2>Create a New Post</h2>
              <button className="close-modal-btn" onClick={() => setShowCreatePostModal(false)}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label htmlFor="post-title">Title</label>
                <input
                  id="post-title"
                  type="text"
                  placeholder="Give your post a title"
                  value={newPost.title}
                  onChange={(e) => setNewPost({ ...newPost, title: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label htmlFor="post-content">Content</label>
                <textarea
                  id="post-content"
                  placeholder="What would you like to discuss?"
                  value={newPost.content}
                  onChange={(e) => setNewPost({ ...newPost, content: e.target.value })}
                  rows={6}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="cancel-btn" onClick={() => setShowCreatePostModal(false)}>
                Cancel
              </button>
              <button
                className="submit-post-btn"
                onClick={handleCreatePost}
                disabled={!newPost.title.trim() || !newPost.content.trim()}
              >
                Post
              </button>
            </div>
          </div>
        </div>
      )}

      {showReportModal && (
        <div className="modal-overlay">
          <div className="report-modal">
            <div className="modal-header">
              <h2>Report Post</h2>
              <button className="close-modal-btn" onClick={() => setShowReportModal(false)}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="modal-body">
              <p>Post Title: {reportingPost.title}</p>
              <div className="form-group">
                <label htmlFor="report-reason">Reason for Reporting</label>
                <textarea
                  id="report-reason"
                  placeholder="Please provide a detailed reason for reporting this post."
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  rows={4}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="cancel-btn" onClick={() => setShowReportModal(false)}>
                Cancel
              </button>
              <button className="submit-report-btn" onClick={handleSubmitReport}>
                Submit Report
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Forum;