import React, { useState, useEffect } from 'react';
import './Profile.css';

const Profile = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('access_token');
      
      if (!token) {
        // For testing purposes, use a mock user if no token is found
        setUser(getMockUser());
        setLoading(false);
        return;
      }

      // First request - fetch user data
      const userResponse = await fetch('http://localhost:8002/auth/me', {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include' // Include credentials if using cookies
      });
      
      if (!userResponse.ok) {
        // If authentication fails, use mock data for testing the UI
        console.error(`User data fetch failed with status: ${userResponse.status}`);
        setUser(getMockUser());
        setLoading(false);
        return;
      }
      
      const userData = await userResponse.json();
      console.log("User data fetched successfully:", userData);
      
      // Second request - fetch reputation data
      let reputationData = { streak_points: 0, aura_points: 0, credibility_points: 0 };
      try {
        const reputationResponse = await fetch(`http://localhost:8002/forum/reputation/${userData.user_id}`, {
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          credentials: 'include'
        });
        
        if (reputationResponse.ok) {
          reputationData = await reputationResponse.json();
          console.log("Reputation data fetched successfully:", reputationData);
        } else {
          console.warn(`Reputation data fetch failed with status: ${reputationResponse.status}`);
        }
      } catch (repError) {
        console.warn("Failed to fetch reputation data:", repError);
      }
      
      // Third request - fetch posts data
      let userPosts = [];
      try {
        const postsResponse = await fetch('http://localhost:8002/forum/posts', {
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          credentials: 'include'
        });
        
        if (postsResponse.ok) {
          const posts = await postsResponse.json();
          userPosts = posts.filter(post => post.user_id === userData.user_id);
          console.log("Posts data fetched successfully:", userPosts);
        } else {
          console.warn(`Posts data fetch failed with status: ${postsResponse.status}`);
        }
      } catch (postsError) {
        console.warn("Failed to fetch posts data:", postsError);
      }
      
      // Build the user object with fetched data
      setUser({
        username: userData.username || "User",
        avatar: "/api/placeholder/150/150",
        joinDate: userData.created_at ? new Date(userData.created_at).toLocaleDateString() : "Unknown",
        scores: {
          streak: reputationData.streak_points || 0,
          aura: reputationData.aura_points || 0,
          credibility: reputationData.credibility_points || 0
        },
        stats: {
          posts: userPosts.length,
          comments: 0,
          upvotesReceived: userPosts.reduce((sum, post) => sum + (post.upvotes || 0), 0),
          downvotesReceived: userPosts.reduce((sum, post) => sum + (post.downvotes || 0), 0),
          reports: 0
        },
        badges: ["Air Quality Advocate", "Active Contributor", "Community Explorer"],
        recentActivity: userPosts.slice(0, 3).map(post => ({
          type: "post",
          title: post.title || "Untitled Post",
          timestamp: post.created_at ? new Date(post.created_at).toLocaleString() : "Unknown date",
          upvotes: post.upvotes || 0
        }))
      });
      setLoading(false);
    } catch (error) {
      console.error('Error fetching profile:', error);
      // For testing UI, fall back to mock data
      setUser(getMockUser());
      setLoading(false);
    }
  };

  // Mock user data for testing UI when API fails
  const getMockUser = () => {
    return {
      username: "DemoUser",
      avatar: "/api/placeholder/150/150",
      joinDate: "01/10/2024",
      scores: {
        streak: 12,
        aura: 85,
        credibility: 92
      },
      stats: {
        posts: 24,
        comments: 73,
        upvotesReceived: 128,
        downvotesReceived: 5,
        reports: 0
      },
      badges: ["Air Quality Advocate", "Active Contributor", "Community Explorer"],
      recentActivity: [
        {
          type: "post",
          title: "How to reduce carbon footprint in urban areas",
          timestamp: "03/15/2025, 10:30:45 AM",
          upvotes: 32
        },
        {
          type: "post",
          title: "Results from my neighborhood air quality study",
          timestamp: "03/10/2025, 2:15:30 PM",
          upvotes: 47
        },
        {
          type: "post",
          title: "Proposal for community green space initiative",
          timestamp: "03/05/2025, 9:45:12 AM",
          upvotes: 21
        }
      ]
    };
  };

  const getScoreClass = (score) => {
    if (score >= 90) return "excellent";
    if (score >= 70) return "good";
    if (score >= 50) return "average";
    return "needs-improvement";
  };

  if (loading) return (
    <div className="profile-loading">
      <div className="loader"></div>
      <p>Loading your profile...</p>
    </div>
  );

  if (!user) return null;

  return (
    <div className="profile-container">
      <div className="profile-header">
        <div className="profile-avatar-section">
          <div className="avatar-container">
            <img src={user.avatar} alt={`${user.username}'s avatar`} className="profile-avatar" />
          </div>
          <div className="profile-info">
            <h2 className="profile-username">{user.username}</h2>
            <p className="profile-join-date">
              <i className="fas fa-calendar-alt"></i> Member since {user.joinDate}
            </p>
          </div>
        </div>
        <div className="profile-scores">
          <div className="score-card">
            <div className="score-value streak">{user.scores.streak}</div>
            <div className="score-label">
              <i className="fas fa-fire"></i> Day Streak
            </div>
          </div>
          <div className="score-card">
            <div className={`score-value ${getScoreClass(user.scores.aura)}`}>
              {user.scores.aura}
            </div>
            <div className="score-label">
              <i className="fas fa-star"></i> Aura Score
            </div>
          </div>
          <div className="score-card">
            <div className={`score-value ${getScoreClass(user.scores.credibility)}`}>
              {user.scores.credibility}
            </div>
            <div className="score-label">
              <i className="fas fa-award"></i> Credibility
            </div>
          </div>
        </div>
      </div>
      
      <div className="profile-content">
        <div className="profile-section">
          <h3 className="section-title">
            <i className="fas fa-chart-line"></i> Activity Stats
          </h3>
          <div className="stats-grid">
            <div className="stat-item">
              <div className="stat-value">{user.stats.posts}</div>
              <div className="stat-label">
                <i className="fas fa-file-alt"></i> Posts
              </div>
            </div>
            <div className="stat-item">
              <div className="stat-value">{user.stats.comments}</div>
              <div className="stat-label">
                <i className="fas fa-comment"></i> Comments
              </div>
            </div>
            <div className="stat-item">
              <div className="stat-value">{user.stats.upvotesReceived}</div>
              <div className="stat-label">
                <i className="fas fa-arrow-up"></i> Upvotes
              </div>
            </div>
            <div className="stat-item">
              <div className="stat-value">{user.stats.downvotesReceived}</div>
              <div className="stat-label">
                <i className="fas fa-arrow-down"></i> Downvotes
              </div>
            </div>
          </div>
        </div>
        
        <div className="profile-section">
          <h3 className="section-title">
            <i className="fas fa-medal"></i> Badges
          </h3>
          <div className="badges-container">
            {user.badges.map((badge, index) => (
              <div className="badge" key={index}>
                <i className="fas fa-award"></i>
                <span>{badge}</span>
              </div>
            ))}
          </div>
        </div>
        
        <div className="profile-section">
          <h3 className="section-title">
            <i className="fas fa-history"></i> Recent Activity
          </h3>
          {user.recentActivity && user.recentActivity.length > 0 ? (
            <div className="activity-list">
              {user.recentActivity.map((activity, index) => (
                <div className="activity-item" key={index}>
                  <div className="activity-icon">
                    <i className="fas fa-file-alt"></i>
                  </div>
                  <div className="activity-details">
                    <div className="activity-title">{activity.title}</div>
                    <div className="activity-meta">
                      <span><i className="fas fa-clock"></i> {activity.timestamp}</span>
                      <span className="upvotes">
                        <i className="fas fa-arrow-up"></i> {activity.upvotes}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-activity">
              <p>No recent activity to display</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;