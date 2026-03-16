import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import logo from '../../assets/logo.png'; // Import the logo
import './OwnerNavbar.css';

const OwnerNavbar = ({ profile, avatarUrl }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [showDropdown, setShowDropdown] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  // Fetch real notifications from Supabase
  useEffect(() => {
    if (profile?.id) {
      fetchNotifications();
      
      // Set up real-time subscription for new notifications
      const subscription = supabase
        .channel('owner-notifications')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${profile.id}`
          },
          (payload) => {
            console.log('New notification received:', payload);
            // Add new notification to the list
            setNotifications(prev => [payload.new, ...prev]);
            setUnreadCount(prev => prev + 1);
          }
        )
        .subscribe();

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [profile?.id]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.user-menu') && !event.target.closest('.notifications-container')) {
        setShowDropdown(false);
        setShowNotifications(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('notifications')
        .select(`
          *,
          business:business_id (
            id,
            name,
            emoji
          )
        `)
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      setNotifications(data || []);
      setUnreadCount(data?.filter(n => !n.is_read).length || 0);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ 
          is_read: true,
          read_at: new Date().toISOString() 
        })
        .eq('id', notificationId);

      if (error) throw error;

      // Update local state
      setNotifications(notifications.map(n => 
        n.id === notificationId ? { ...n, is_read: true } : n
      ));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ 
          is_read: true,
          read_at: new Date().toISOString() 
        })
        .eq('user_id', profile.id)
        .eq('is_read', false);

      if (error) throw error;

      // Update local state
      setNotifications(notifications.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const handleNotificationClick = async (notification) => {
    // Mark as read
    if (!notification.is_read) {
      await markAsRead(notification.id);
    }

    // Navigate based on notification type and data
    setShowNotifications(false);

    // Parse data if it's a string
    const notificationData = typeof notification.data === 'string' 
      ? JSON.parse(notification.data) 
      : notification.data || {};

    // Navigate to relevant page
    if (notificationData.membership_id) {
      navigate('/applications');
    } else if (notificationData.payment_id) {
      navigate('/applications?tab=payments');
    } else if (notification.type === 'membership_approved') {
      navigate('/members');
    } else if (notification.type === 'promo') {
      navigate('/my-business');
    } else if (notification.type === 'application_approved') {
      // Owner application approved
      navigate('/owner-dashboard?approved=true');
    } else {
      // Default to dashboard
      navigate('/owner-dashboard');
    }
  };

  const handleViewAllNotifications = () => {
    navigate('/owner-notifications'); // ← CHANGED to owner-specific notifications page
    setShowNotifications(false);
  };

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      navigate('/login');
    } catch (err) {
      console.error('Error signing out:', err);
    }
  };

  const handleNavigation = (path) => {
    navigate(path);
    setShowDropdown(false);
    setShowNotifications(false);
  };

  const getFirstName = () => {
    if (profile?.first_name) {
      return profile.first_name;
    }
    return 'Owner';
  };

  const getInitials = () => {
    if (profile?.first_name) {
      return profile.first_name.charAt(0).toUpperCase();
    }
    return 'O';
  };

  const getUserRole = () => {
    if (profile?.role === 'owner') return 'Business Owner';
    return 'Owner';
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  const getNotificationText = (notification) => {
    if (notification.message) return notification.message;

    const data = typeof notification.data === 'string' 
      ? JSON.parse(notification.data) 
      : notification.data || {};

    if (data.applicant_name && data.plan_name) {
      return `${data.applicant_name} applied for ${data.plan_name} plan`;
    }
    if (data.applicant_name) {
      return `New application from ${data.applicant_name}`;
    }
    if (data.member_name) {
      return `${data.member_name} has joined your business`;
    }
    
    switch(notification.type) {
      case 'announcement':
        return 'New announcement';
      case 'membership_approved':
        return 'Member approved';
      case 'promo':
        return 'New promotion';
      case 'application_approved':
        return 'Your application has been approved!';
      case 'application_rejected':
        return data.reason || 'Your application was not approved';
      default:
        return 'New notification';
    }
  };

  const firstName = getFirstName();
  const userRole = getUserRole();
  const initials = getInitials();

  return (
    <nav className="top-navbar">
      <div className="nav-left">
        <div 
          className="navbar-logo" 
          onClick={() => handleNavigation('/owner-dashboard')}
        >
          <img src={logo} alt="Memsphere Logo" className="logo-image" />
          <span className="logo-text">MEMSPHERE</span>
        </div>
        
        <div className="nav-links">
          <button
            className={`nav-link ${location.pathname === '/owner-dashboard' ? 'active' : ''}`}
            onClick={() => handleNavigation('/owner-dashboard')}
          >
            <span className="nav-label">Overview</span>
            {location.pathname === '/owner-dashboard' && <span className="nav-indicator"></span>}
          </button>
          <button
            className={`nav-link ${location.pathname === '/my-business' ? 'active' : ''}`}
            onClick={() => handleNavigation('/my-business')}
          >
            <span className="nav-label">My Business</span>
            {location.pathname === '/my-business' && <span className="nav-indicator"></span>}
          </button>
          <button
            className={`nav-link ${location.pathname === '/applications' ? 'active' : ''}`}
            onClick={() => handleNavigation('/applications')}
          >
            <span className="nav-label">Applications</span>
            {location.pathname === '/applications' && <span className="nav-indicator"></span>}
          </button>
          <button
            className={`nav-link ${location.pathname === '/members' ? 'active' : ''}`}
            onClick={() => handleNavigation('/members')}
          >
            <span className="nav-label">Members</span>
            {location.pathname === '/members' && <span className="nav-indicator"></span>}
          </button>
          <button
            className={`nav-link ${location.pathname === '/analytics' ? 'active' : ''}`}
            onClick={() => handleNavigation('/analytics')}
          >
            <span className="nav-label">Analytics</span>
            {location.pathname === '/analytics' && <span className="nav-indicator"></span>}
          </button>
        </div>
      </div>

      <div className="nav-right">
        {/* Notification Section */}
        <div className="notifications-container">
          <button 
            className="notification-icon"
            onClick={() => {
              setShowNotifications(!showNotifications);
              setShowDropdown(false);
            }}
          >
            🔔
            {unreadCount > 0 && (
              <span className="notification-badge">{unreadCount}</span>
            )}
          </button>
          
          {showNotifications && (
            <div className="notification-dropdown">
              <div className="notification-header">
                <h3>Notifications</h3>
                {unreadCount > 0 && (
                  <button onClick={markAllAsRead} className="mark-read-btn">
                    Mark all as read
                  </button>
                )}
              </div>
              <div className="notification-list">
                {loading ? (
                  <div className="notification-loading">
                    <div className="spinner-small"></div>
                    <span>Loading...</span>
                  </div>
                ) : notifications.length > 0 ? (
                  <>
                    {notifications.slice(0, 5).map(notification => (
                      <div 
                        key={notification.id} 
                        className={`notification-item ${!notification.is_read ? 'unread' : ''}`}
                        onClick={() => handleNotificationClick(notification)}
                      >
                        <div className="notification-content-wrapper">
                          <span className="notification-icon-small">
                            {notification.business?.emoji || '📢'}
                          </span>
                          <div className="notification-text-wrapper">
                            <p className="notification-text">
                              {getNotificationText(notification)}
                            </p>
                            <span className="notification-time">
                              {formatTime(notification.created_at)}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                    {notifications.length > 5 && (
                      <div className="notification-view-all">
                        <button 
                          className="view-all-btn"
                          onClick={handleViewAllNotifications}
                        >
                          View all {notifications.length} notifications
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="no-notifications">
                    <span className="no-notifications-icon">🔔</span>
                    <p>No new notifications</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Menu with Enhanced Blue Dropdown */}
        <div className="user-menu" onClick={() => setShowDropdown(!showDropdown)}>
          <div className="user-avatar-wrapper">
            {avatarUrl ? (
              <img 
                src={avatarUrl} 
                alt={firstName} 
                className="user-avatar-image"
              />
            ) : (
              <div className="user-avatar">
                {initials}
              </div>
            )}
            <span className="user-status"></span>
          </div>
          <div className="user-info">
            <span className="user-name">{firstName}</span>
            <span className="user-role">{userRole}</span>
          </div>
          <span className="dropdown-arrow">▼</span>
          
          {showDropdown && (
            <div className="profile-dropdown">
              <div className="dropdown-header">
                <div className="dropdown-avatar">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt={firstName} />
                  ) : (
                    <div className="dropdown-avatar-placeholder">{initials}</div>
                  )}
                </div>
                <div className="dropdown-user-info">
                  <span className="dropdown-user-name">{firstName}</span>
                  <span className="dropdown-user-email">{profile?.email || 'owner@example.com'}</span>
                  <span className="dropdown-user-role">{userRole}</span>
                </div>
              </div>
              <div className="dropdown-menu">
                <button 
                  className="dropdown-item"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleNavigation('/profile');
                  }}
                >
                  <span className="dropdown-icon">👤</span>
                  <span className="dropdown-item-text">My Profile</span>
                </button>
                <button 
                  className="dropdown-item"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleNavigation('/members');
                  }}
                >
                  <span className="dropdown-icon">👥</span>
                  <span className="dropdown-item-text">Member Management</span>
                </button>
                <button 
                  className="dropdown-item"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleNavigation('/owner-notifications'); // ← CHANGED to owner-specific notifications page
                  }}
                >
                  <span className="dropdown-icon">🔔</span>
                  <span className="dropdown-item-text">Notifications</span>
                  {unreadCount > 0 && (
                    <span className="dropdown-badge">{unreadCount}</span>
                  )}
                </button>
                <button 
                  className="dropdown-item"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowDropdown(false);
                    alert('Settings page coming soon!');
                  }}
                >
                  <span className="dropdown-icon">⚙️</span>
                  <span className="dropdown-item-text">Settings</span>
                </button>
                <div className="dropdown-divider"></div>
                <button 
                  className="dropdown-item logout"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSignOut();
                  }}
                >
                  <span className="dropdown-icon">🚪</span>
                  <span className="dropdown-item-text">Logout</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default OwnerNavbar;