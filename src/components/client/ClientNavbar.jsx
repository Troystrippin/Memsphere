import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import logo from '../../assets/logo.png';
import './ClientNavbar.css';

const ClientNavbar = ({ profile, avatarUrl, unreadCount: propUnreadCount }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [showDropdown, setShowDropdown] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(propUnreadCount || 0);
  const [user, setUser] = useState(null);
  const [subscription, setSubscription] = useState(null);

  useEffect(() => {
    // Get current user
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    getUser();
  }, []);

  useEffect(() => {
    // Update unread count when prop changes
    if (propUnreadCount !== undefined) {
      setUnreadCount(propUnreadCount);
    }
  }, [propUnreadCount]);

  useEffect(() => {
    if (!user) return;

    console.log('Setting up notifications for user:', user.id);

    // Fetch initial unread count and recent notifications
    fetchUnreadCount();
    fetchRecentNotifications();

    // Clean up existing subscription
    if (subscription) {
      subscription.unsubscribe();
    }

    // Set up real-time subscription for new notifications
    const newSubscription = supabase
      .channel(`navbar-notifications-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('🔔 New notification received:', payload);
          
          // Increment unread count
          setUnreadCount(prev => prev + 1);
          
          // Add to notifications list (keep only 5 most recent)
          setNotifications(prev => {
            // Check if notification already exists to prevent duplicates
            const exists = prev.some(n => n.id === payload.new.id);
            if (exists) return prev;
            
            const newList = [payload.new, ...prev].slice(0, 5);
            return newList;
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('📝 Notification updated:', payload);
          
          // Handle updates (like marking as read)
          if (payload.new.is_read === true && payload.old.is_read === false) {
            setUnreadCount(prev => Math.max(0, prev - 1));
          }
          
          // Update notifications list
          setNotifications(prev => 
            prev.map(n => n.id === payload.new.id ? payload.new : n)
          );
        }
      )
      .subscribe((status) => {
        console.log('Subscription status:', status);
      });

    setSubscription(newSubscription);

    return () => {
      console.log('Cleaning up subscription');
      if (newSubscription) {
        newSubscription.unsubscribe();
      }
    };
  }, [user]);

  const fetchUnreadCount = async () => {
    if (!user) return;
    
    try {
      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_read', false);

      if (error) throw error;
      console.log('Unread count:', count);
      setUnreadCount(count || 0);
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  };

  const fetchRecentNotifications = async () => {
    if (!user) return;
    
    try {
      console.log('Fetching recent notifications for user:', user.id);
      
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10); // Increased from 5 to 10

      if (error) throw error;
      
      console.log('Fetched notifications:', data?.length || 0, 'notifications');
      setNotifications(data || []);
      
      // Also update unread count
      const unread = data?.filter(n => !n.is_read).length || 0;
      setUnreadCount(unread);
    } catch (error) {
      console.error('Error fetching recent notifications:', error);
    }
  };

  const handleNotificationClick = async (notification) => {
    // Mark as read
    if (!notification.is_read) {
      try {
        await supabase
          .from('notifications')
          .update({ 
            is_read: true,
            read_at: new Date().toISOString() 
          })
          .eq('id', notification.id);
        
        // Update local state
        setUnreadCount(prev => Math.max(0, prev - 1));
        setNotifications(prev => 
          prev.map(n => n.id === notification.id ? { ...n, is_read: true } : n)
        );
      } catch (error) {
        console.error('Error marking notification as read:', error);
      }
    }

    // Navigate based on notification type
    if (notification.type === 'membership_pending') {
      navigate('/ClientDashboard');
    } else if (notification.type === 'membership_approved') {
      navigate('/ClientDashboard');
    } else if (notification.type === 'membership_rejected') {
      navigate('/browse');
    } else if (notification.type === 'membership_cancelled') {
      navigate('/browse');
    } else {
      navigate(`/notifications?highlight=${notification.id}`);
    }
    
    setShowNotifications(false);
  };

  const markAllAsRead = async () => {
    if (!user) return;
    
    try {
      await supabase
        .from('notifications')
        .update({ 
          is_read: true,
          read_at: new Date().toISOString() 
        })
        .eq('user_id', user.id)
        .eq('is_read', false);

      setUnreadCount(0);
      setNotifications(notifications.map(n => ({ ...n, is_read: true })));
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const handleViewAll = () => {
    navigate('/notifications');
    setShowNotifications(false);
  };

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
    return 'Client';
  };

  const getInitials = () => {
    if (profile?.first_name) {
      return profile.first_name.charAt(0).toUpperCase();
    }
    return 'C';
  };

  const getUserRole = () => {
    if (profile?.role === 'client') return 'Member';
    return 'Client';
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hour ago`;
    if (diffDays < 7) return `${diffDays} day ago`;
    
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  const getNotificationIcon = (type) => {
    switch(type) {
      case 'welcome':
        return '🎉';
      case 'announcement':
        return '📢';
      case 'direct':
        return '✉️';
      case 'membership_pending':
        return '📋';
      case 'membership_approved':
        return '✅';
      case 'membership_rejected':
        return '❌';
      case 'membership_cancelled':
        return '📢';
      case 'promo':
        return '🏷️';
      default:
        return '📋';
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
          onClick={() => handleNavigation('/ClientDashboard')}
        >
          <img src={logo} alt="Memsphere Logo" className="logo-image" />
          <span className="logo-text">MEMSPHERE</span>
        </div>
        
        <div className="nav-links">
          <button
            className={`nav-link ${location.pathname === '/ClientDashboard' ? 'active' : ''}`}
            onClick={() => handleNavigation('/ClientDashboard')}
          >
            <span className="nav-label">Dashboard</span>
            {location.pathname === '/ClientDashboard' && <span className="nav-indicator"></span>}
          </button>
          <button
            className={`nav-link ${location.pathname === '/browse' ? 'active' : ''}`}
            onClick={() => handleNavigation('/browse')}
          >
            <span className="nav-label">Browse</span>
            {location.pathname === '/browse' && <span className="nav-indicator"></span>}
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
              if (!showNotifications) {
                fetchRecentNotifications(); // Refresh when opening
              }
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
                {notifications.length > 0 ? (
                  notifications.map(notification => (
                    <div 
                      key={notification.id} 
                      className={`notification-item ${!notification.is_read ? 'unread' : ''}`}
                      onClick={() => handleNotificationClick(notification)}
                    >
                      <div className="notification-item-icon">
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="notification-item-content">
                        <p className="notification-text">
                          {notification.title || notification.type}
                        </p>
                        <span className="notification-time">
                          {formatTime(notification.created_at)}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="no-notifications">
                    No new notifications
                  </div>
                )}
              </div>
              {notifications.length > 0 && (
                <div className="notification-footer">
                  <button onClick={handleViewAll} className="view-all-btn">
                    View All
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* User Menu */}
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
                  <span className="dropdown-user-email">{profile?.email || user?.email || 'client@example.com'}</span>
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
                    handleNavigation('/notifications');
                  }}
                >
                  <span className="dropdown-icon">🔔</span>
                  <span className="dropdown-item-text">
                    Notifications
                    {unreadCount > 0 && <span className="dropdown-badge">{unreadCount}</span>}
                  </span>
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

export default ClientNavbar;