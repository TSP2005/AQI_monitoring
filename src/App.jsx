import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes, Link, useLocation, Navigate } from 'react-router-dom';
import WeatherDetails from './components/WeatherDetails';
import Map from './components/Map';
import Login from './components/Login/Login';
import Register from './components/Login/Register';
import Forum from './components/Forum';
import Profile from './components/Profile';
import PublicContributors from './components/PublicContributors'; // Assumed to be available
import './App.css';

const App = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(
    !!localStorage.getItem('access_token')
  );
  const [userRole, setUserRole] = useState(null);

  useEffect(() => {
    if (isAuthenticated) {
      localStorage.setItem('auth_status', 'true');
      const fetchUserRole = async () => {
        try {
          const response = await fetch('http://localhost:8002/users/me', {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('access_token')}`
            }
          });
          if (response.ok) {
            const userData = await response.json();
            setUserRole(userData.role);
          } else {
            setIsAuthenticated(false);
            localStorage.removeItem('access_token');
            setUserRole(null);
          }
        } catch (error) {
          console.error('Error fetching user role:', error);
          setIsAuthenticated(false);
          localStorage.removeItem('access_token');
          setUserRole(null);
        }
      };
      fetchUserRole();
    } else {
      localStorage.removeItem('auth_status');
      localStorage.removeItem('access_token');
      setUserRole(null);
    }
  }, [isAuthenticated]);

  return (
    <Router>
      <MainLayout
        isAuthenticated={isAuthenticated}
        setIsAuthenticated={setIsAuthenticated}
        userRole={userRole}
      />
    </Router>
  );
};

const MainLayout = ({ isAuthenticated, setIsAuthenticated, userRole }) => {
  const location = useLocation();
  const showSidebar = location.pathname !== '/login' && location.pathname !== '/register';

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('access_token');
  };

  return (
    <>
      {showSidebar && (
        <nav className="sidebar">
          {isAuthenticated ? (
            <button className="logout-btn" onClick={handleLogout}>
              Logout
            </button>
          ) : (
            <>
              <Link to="/login" className="nav-link button-link">
                Login
              </Link>
              <Link to="/register" className="nav-link button-link register-btn">
                Register
              </Link>
            </>
          )}
          <Link to="/map" className="nav-link">
            <i className="fas fa-map"></i>
          </Link>
          <Link to="/weather" className="nav-link">
            <i className="fas fa-cloud-sun"></i>
          </Link>
          <Link to="/forum" className="nav-link">
            <i className="fas fa-comments"></i>
          </Link>
          <Link to="/contributors" className="nav-link">
            <i className="fas fa-users"></i>
          </Link>
          {isAuthenticated && (
            <Link to="/profile" className="nav-link">
              <i className="fas fa-user"></i>
            </Link>
          )}
        </nav>
      )}
      <div className={`content-wrapper ${showSidebar ? 'with-sidebar' : ''}`}>
        <Routes>
          <Route path="/login" element={<Login onLoginSuccess={() => setIsAuthenticated(true)} />} />
          <Route path="/register" element={<Register />} />
          <Route path="/map" element={<Map />} />
          <Route path="/weather" element={<WeatherDetails />} />
          <Route path="/forum" element={<Forum />} />
          <Route
            path="/profile"
            element={isAuthenticated ? <Profile /> : <Navigate to="/login" replace />}
          />
          <Route
            path="/contributors"
            element={
              isAuthenticated
                ? userRole === 'data_contributor'
                  ? <PublicContributors />
                  : <div className="permission-error">You don't have permissions. Only data contributors can access this page.</div>
                : <Navigate to="/login" replace />
            }
          />
          <Route path="/" element={<Navigate to="/map" replace />} />
        </Routes>
      </div>
    </>
  );
};

export default App;