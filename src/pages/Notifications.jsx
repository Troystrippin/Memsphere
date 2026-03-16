// pages/Notifications.jsx - UPDATED
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import ClientNavbar from '../components/client/ClientNavbar';
import OwnerNavbar from '../components/owner/OwnerNavbar';
import AdminSidebarNav from '../components/admin/AdminSidebarNav'; // You might need to create this
import '../styles/Notifications.css';

const Notifications = () => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [highlightedId, setHighlightedId] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Check for highlighted notification ID from URL
    const params = new URLSearchParams(location.search);
    const highlightId = params.get('highlight');
    if (highlightId) {
      setHighlightedId(highlightId);
      // Mark the notification as read when highlighted
      markAsRead(highlightId);
      
      // Remove highlight from URL after 3 seconds
      setTimeout(() => {
        setHighlightedId(null);
        navigate('/notifications', { replace: true });
      }, 3000);
    }
  }, [location, navigate]);

  useEffect(() => {
    checkUser();
  }, []);

  useEffect(() => {
    if (user) {
      fetchNotifications();
      
      // Real-time subscription for new notifications
      const subscription = supabase
        .channel('notifications-channel')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`
          },
          (payload) => {
            console.log('New notification:', payload.new);
            setNotifications(prev => [payload.new, ...prev]);
          }
        )
        .subscribe();

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchNotifications();
    }
  }, [user, filter]);

  const checkUser = async () => {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      
      if (error) throw error;
      
      if (!user) {
        navigate('/login');
        return;
      }

      setUser(user);
      await getUserProfile(user);
    } catch (error) {
      console.error('Error checking user:', error);
      navigate('/login');
    }
  };

  const getUserProfile = async (user) => {
    try {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileError && profileError.code !== 'PGRST116') {
        console.error('Error fetching profile:', profileError);
      }

      setProfile(profile);
      setUserRole(profile?.role || 'client');

      if (profile?.avatar_url) {
        downloadAvatar(profile.avatar_url);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const downloadAvatar = async (path) => {
    try {
      const { data, error } = await supabase.storage
        .from('avatars')
        .download(path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      setAvatarUrl(url);
    } catch (error) {
      console.error('Error downloading avatar:', error);
    }
  };

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('notifications')
        .select(`
          *,
          business:business_id (
            id,
            name,
            emoji,
            business_type
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (filter === 'unread') {
        query = query.eq('is_read', false);
      } else if (filter === 'read') {
        query = query.eq('is_read', true);
      }

      const { data, error } = await query;

      if (error) throw error;

      setNotifications(data || []);
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

      setNotifications(notifications.map(n => 
        n.id === notificationId ? { ...n, is_read: true } : n
      ));
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
        .eq('user_id', user.id)
        .eq('is_read', false);

      if (error) throw error;

      setNotifications(notifications.map(n => ({ ...n, is_read: true })));
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const handleNotificationClick = async (notification) => {
    // Mark as read if unread
    if (!notification.is_read) {
      await markAsRead(notification.id);
    }

    // Parse data if it's a string
    const notificationData = typeof notification.data === 'string' 
      ? JSON.parse(notification.data) 
      : notification.data || {};

    // Different navigation based on user role and notification type
    if (userRole === 'admin') {
      // ADMIN NAVIGATION
      if (notification.type === 'new_owner_application') {
        navigate('/admin/users?tab=pending');
      } else if (notification.type === 'new_business') {
        navigate('/admin/businesses');
      } else if (notification.type === 'system_alert') {
        navigate('/admin/settings');
      } else if (notification.type === 'new_user_registered') {
        navigate('/admin/users');
      } else {
        navigate('/admin-dashboard');
      }
    } else if (userRole === 'owner') {
      // OWNER NAVIGATION
      if (notification.type === 'announcement') {
        if (notificationData.membership_id) {
          // New membership application - go to applications
          navigate('/applications');
        } else if (notificationData.payment_id) {
          // New payment - go to applications with payment tab
          navigate('/applications?tab=payments');
        } else if (notificationData.member_name) {
          // Member joined/removed - go to members page
          navigate('/members');
        } else {
          // General announcement - stay on notifications or go to dashboard
          navigate('/owner-dashboard');
        }
      } else if (notification.type === 'membership_approved') {
        // Member approved - go to member management
        navigate('/members');
      } else if (notification.type === 'promo') {
        // Promo related - go to my business
        navigate('/my-business');
      } else {
        navigate('/owner-dashboard');
      }
    } else {
      // CLIENT NAVIGATION
      if (notification.type === 'membership_approved') {
        // Membership approved - go to dashboard to see their membership
        navigate('/ClientDashboard');
      } else if (notification.type === 'membership_rejected') {
        // Membership rejected - go browse other businesses
        navigate('/browse');
      } else if (notification.type === 'announcement') {
        // Announcement from a business
        if (notification.business_id) {
          // Go to that specific business page
          navigate(`/browse?business=${notification.business_id}`);
        } else {
          navigate('/browse');
        }
      } else if (notification.type === 'promo') {
        // Promo notification - go to browse
        navigate('/browse');
      } else if (notification.type === 'welcome') {
        // Welcome notification - go to browse
        navigate('/browse');
      } else {
        navigate('/ClientDashboard');
      }
    }
  };

  const getNotificationIcon = (type, role) => {
    if (role === 'admin') {
      switch(type) {
        case 'new_owner_application':
          return '📝';
        case 'new_business':
          return '🏢';
        case 'system_alert':
          return '⚠️';
        case 'new_user_registered':
          return '👤';
        default:
          return '📋';
      }
    } else if (role === 'owner') {
      switch(type) {
        case 'announcement':
          return '📢';
        case 'membership_approved':
          return '✅';
        case 'promo':
          return '🏷️';
        default:
          return '📋';
      }
    } else {
      switch(type) {
        case 'welcome':
          return '🎉';
        case 'announcement':
          return '📢';
        case 'membership_approved':
          return '✅';
        case 'membership_rejected':
          return '❌';
        case 'promo':
          return '🏷️';
        default:
          return '📋';
      }
    }
  };

  const getNotificationTitle = (notification) => {
    if (notification.title) return notification.title;

    const data = typeof notification.data === 'string' 
      ? JSON.parse(notification.data) 
      : notification.data || {};

    if (userRole === 'admin') {
      switch(notification.type) {
        case 'new_owner_application':
          return 'New Owner Application';
        case 'new_business':
          return data.business_name 
            ? `New Business: ${data.business_name}`
            : 'New Business Registered';
        case 'system_alert':
          return '⚠️ System Alert';
        case 'new_user_registered':
          return 'New User Registered';
        default:
          return 'Admin Notification';
      }
    } else if (userRole === 'owner') {
      switch(notification.type) {
        case 'announcement':
          if (data.applicant_name) {
            return `New Application from ${data.applicant_name}`;
          } else if (data.member_name) {
            return `Member Update: ${data.member_name}`;
          } else if (data.payment_id) {
            return 'New Payment Received';
          }
          return 'New Notification';
        case 'membership_approved':
          return 'Member Approved';
        default:
          return 'Notification';
      }
    } else {
      switch(notification.type) {
        case 'welcome':
          return 'Welcome to Memsphere!';
        case 'membership_approved':
          return 'Membership Approved! 🎉';
        case 'membership_rejected':
          return 'Membership Update';
        case 'announcement':
          return data.business_name 
            ? `Announcement from ${data.business_name}`
            : 'New Announcement';
        case 'promo':
          return data.business_name 
            ? `Promo from ${data.business_name}`
            : 'Special Offer';
        default:
          return 'Notification';
      }
    }
  };

  const getNotificationMessage = (notification) => {
    if (notification.message) return notification.message;

    const data = typeof notification.data === 'string' 
      ? JSON.parse(notification.data) 
      : notification.data || {};

    if (userRole === 'admin') {
      switch(notification.type) {
        case 'new_owner_application':
          return data.applicant_name 
            ? `${data.applicant_name} has applied to become a business owner`
            : 'New owner application received';
        case 'new_business':
          return data.owner_name 
            ? `${data.owner_name} registered a new business: ${data.business_name}`
            : 'New business registered';
        case 'system_alert':
          return data.message || 'System requires attention';
        case 'new_user_registered':
          return data.user_name 
            ? `${data.user_name} just joined Memsphere`
            : 'New user registered';
        default:
          return 'You have a new notification';
      }
    } else if (userRole === 'owner') {
      switch(notification.type) {
        case 'announcement':
          if (data.applicant_name && data.plan_name) {
            return `${data.applicant_name} applied for ${data.plan_name} plan`;
          } else if (data.member_name) {
            return `${data.member_name} has been ${data.status || 'updated'}`;
          } else if (data.payment_id) {
            return `Payment received for membership`;
          }
          return 'New application received';
        case 'membership_approved':
          return 'A member has been approved';
        default:
          return 'You have a new notification';
      }
    } else {
      switch(notification.type) {
        case 'welcome':
          return 'Welcome to Memsphere! Start exploring businesses near you.';
        case 'membership_approved':
          return data.business_name 
            ? `Your membership at ${data.business_name} has been approved! You can now access all member benefits.`
            : 'Your membership has been approved!';
        case 'membership_rejected':
          return data.business_name 
            ? `Your application for ${data.business_name} was not approved at this time.`
            : 'Your membership application was not approved.';
        case 'announcement':
          return data.message || 'You have a new announcement';
        case 'promo':
          return data.message || 'Check out our latest promotions!';
        default:
          return 'You have a new notification';
      }
    }
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
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  };

  const getFirstName = () => {
    if (profile?.first_name) {
      return profile.first_name;
    }
    if (user?.email) {
      const username = user.email.split('@')[0];
      return username.charAt(0).toUpperCase() + username.slice(1);
    }
    return 'User';
  };

  if (loading && notifications.length === 0) {
    return (
      <div className="notifications-loading">
        <div className="loading-spinner"></div>
        <p>Loading notifications...</p>
      </div>
    );
  }

  const firstName = getFirstName();
  const unreadCount = notifications.filter(n => !n.is_read).length;

  // Render appropriate navbar based on role
  const renderNavbar = () => {
    if (userRole === 'owner') {
      return (
        <OwnerNavbar 
          profile={profile}
          avatarUrl={avatarUrl}
          unreadCount={unreadCount}
        />
      );
    } else if (userRole === 'admin') {
      // If you have an AdminNavbar component, use it here
      // Otherwise, you might want to create one or redirect
      return (
        <div className="admin-navbar-placeholder">
          {/* You can add a simple admin header here or use AdminSidebarNav */}
          <div className="admin-navbar">
            <div className="admin-navbar-content">
              <span className="admin-navbar-title">Admin Dashboard</span>
              <div className="admin-navbar-user">
                <span>{firstName}</span>
                {avatarUrl ? (
                  <img src={avatarUrl} alt={firstName} className="admin-navbar-avatar" />
                ) : (
                  <div className="admin-navbar-avatar-placeholder">
                    {firstName.charAt(0)}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      );
    } else {
      return (
        <ClientNavbar 
          profile={profile}
          avatarUrl={avatarUrl}
          unreadCount={unreadCount}
        />
      );
    }
  };

  return (
    <div className="notifications-container-page">
      {renderNavbar()}

      <div className="notifications-main" style={{ paddingTop: userRole === 'admin' ? '80px' : 'calc(70px + 2rem)' }}>
        <div className="notifications-header">
          <div className="header-left">
            <h1 className="page-title">
              Notifications
              {unreadCount > 0 && (
                <span className="unread-badge">{unreadCount} new</span>
              )}
            </h1>
            <div className="header-decoration"></div>
          </div>
          <div className="header-right">
            <div className="user-greeting">
              <span className="greeting-wave">👋</span>
              <span className="greeting-text">Hello,</span>
              <span className="greeting-name">{firstName}</span>
            </div>
          </div>
        </div>

        <div className="notifications-filter">
          <button
            className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            All
          </button>
          <button
            className={`filter-btn ${filter === 'unread' ? 'active' : ''}`}
            onClick={() => setFilter('unread')}
          >
            Unread
          </button>
          <button
            className={`filter-btn ${filter === 'read' ? 'active' : ''}`}
            onClick={() => setFilter('read')}
          >
            Read
          </button>
          
          {unreadCount > 0 && (
            <button
              className="mark-all-read-btn"
              onClick={markAllAsRead}
            >
              Mark all as read
            </button>
          )}
        </div>

        {notifications.length === 0 ? (
          <div className="no-notifications-state">
            <div className="no-notifications-icon">🔔</div>
            <h3>No notifications</h3>
            <p>You don't have any notifications at the moment.</p>
            <button 
              className="browse-btn"
              onClick={() => {
                if (userRole === 'admin') {
                  navigate('/admin-dashboard');
                } else if (userRole === 'owner') {
                  navigate('/owner-dashboard');
                } else {
                  navigate('/browse');
                }
              }}
            >
              {userRole === 'admin' ? 'Go to Dashboard' : 
               userRole === 'owner' ? 'Go to Dashboard' : 
               'Browse Businesses'}
            </button>
          </div>
        ) : (
          <div className="notifications-list">
            {notifications.map((notification) => {
              const notificationData = typeof notification.data === 'string' 
                ? JSON.parse(notification.data) 
                : notification.data || {};
              
              // Determine where this notification will take the user
              let navigateTo = '';
              if (userRole === 'admin') {
                if (notification.type === 'new_owner_application') navigateTo = 'Review Application';
                else if (notification.type === 'new_business') navigateTo = 'View Business';
                else if (notification.type === 'system_alert') navigateTo = 'Check System';
                else if (notification.type === 'new_user_registered') navigateTo = 'View User';
                else navigateTo = 'View Details';
              } else if (userRole === 'owner') {
                if (notification.type === 'announcement') {
                  if (notificationData.membership_id) navigateTo = 'Go to Applications';
                  else if (notificationData.payment_id) navigateTo = 'Go to Payments';
                  else if (notificationData.member_name) navigateTo = 'Go to Members';
                  else navigateTo = 'Go to Dashboard';
                } else if (notification.type === 'membership_approved') {
                  navigateTo = 'Go to Members';
                } else if (notification.type === 'promo') {
                  navigateTo = 'Go to My Business';
                } else {
                  navigateTo = 'Go to Dashboard';
                }
              } else {
                if (notification.type === 'membership_approved') navigateTo = 'Go to Dashboard';
                else if (notification.type === 'membership_rejected') navigateTo = 'Browse Businesses';
                else if (notification.type === 'announcement') navigateTo = 'View Business';
                else if (notification.type === 'promo') navigateTo = 'Browse Deals';
                else if (notification.type === 'welcome') navigateTo = 'Start Exploring';
                else navigateTo = 'View';
              }
              
              return (
                <div
                  key={notification.id}
                  className={`notification-card ${!notification.is_read ? 'unread' : ''} ${highlightedId === notification.id ? 'highlighted' : ''}`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="notification-icon-wrapper">
                    <span className="notification-icon-large">
                      {getNotificationIcon(notification.type, userRole)}
                    </span>
                  </div>
                  
                  <div className="notification-content">
                    <div className="notification-header">
                      <h3 className="notification-title">
                        {getNotificationTitle(notification)}
                      </h3>
                      <span className="notification-time">
                        {formatTime(notification.created_at)}
                      </span>
                    </div>
                    
                    <p className="notification-message">
                      {getNotificationMessage(notification)}
                    </p>
                    
                    {/* Business info if available */}
                    {notification.business && (
                      <div className="notification-meta">
                        <span className="meta-label">{notification.business.emoji || '🏢'}</span>
                        <span className="meta-value">
                          {notification.business.name}
                        </span>
                      </div>
                    )}
                    
                    {/* Admin-specific metadata */}
                    {userRole === 'admin' && notificationData.applicant_name && (
                      <div className="notification-meta">
                        <span className="meta-label">👤</span>
                        <span className="meta-value">
                          Applicant: {notificationData.applicant_name}
                        </span>
                      </div>
                    )}
                    
                    {/* Owner-specific metadata */}
                    {userRole === 'owner' && notificationData.applicant_name && (
                      <div className="notification-meta">
                        <span className="meta-label">👤</span>
                        <span className="meta-value">
                          Applicant: {notificationData.applicant_name}
                        </span>
                      </div>
                    )}
                    
                    {userRole === 'owner' && notificationData.plan_name && (
                      <div className="notification-meta">
                        <span className="meta-label">📋</span>
                        <span className="meta-value">
                          Plan: {notificationData.plan_name}
                        </span>
                      </div>
                    )}
                    
                    {userRole === 'owner' && notificationData.member_name && (
                      <div className="notification-meta">
                        <span className="meta-label">👥</span>
                        <span className="meta-value">
                          Member: {notificationData.member_name}
                        </span>
                      </div>
                    )}
                    
                    {/* Client-specific metadata */}
                    {userRole === 'client' && notificationData.business_name && (
                      <div className="notification-meta">
                        <span className="meta-label">🏢</span>
                        <span className="meta-value">
                          {notificationData.business_name}
                        </span>
                      </div>
                    )}
                    
                    {/* Click indicator */}
                    <div className="notification-click-indicator">
                      Click to {navigateTo}
                    </div>
                  </div>
                  
                  {!notification.is_read && (
                    <span className="unread-dot"></span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Notifications;