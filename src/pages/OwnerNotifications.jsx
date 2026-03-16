import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import OwnerNavbar from '../components/owner/OwnerNavbar';
import '../styles/OwnerNotifications.css';

const OwnerNotifications = () => {
  const [profile, setProfile] = useState(null);
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const navigate = useNavigate();

  useEffect(() => {
    fetchUserProfile();
  }, []);

  useEffect(() => {
    if (profile) {
      fetchNotifications();
    }
  }, [profile, filter]);

  const fetchUserProfile = async () => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError) throw userError;
      
      if (!user) {
        navigate('/login');
        return;
      }

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileError) throw profileError;
      
      setProfile(profileData);

      if (profileData?.avatar_url) {
        downloadAvatar(profileData.avatar_url);
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
            emoji
          )
        `)
        .eq('user_id', profile.id)
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
        .eq('user_id', profile.id)
        .eq('is_read', false);

      if (error) throw error;

      setNotifications(notifications.map(n => ({ ...n, is_read: true })));
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const handleNotificationClick = async (notification) => {
    if (!notification.is_read) {
      await markAsRead(notification.id);
    }

    const notificationData = typeof notification.data === 'string' 
      ? JSON.parse(notification.data) 
      : notification.data || {};

    if (notificationData.membership_id) {
      navigate('/applications');
    } else if (notificationData.payment_id) {
      navigate('/applications?tab=payments');
    } else if (notification.type === 'membership_approved') {
      navigate('/members');
    } else if (notification.type === 'promo') {
      navigate('/my-business');
    } else if (notification.type === 'application_approved') {
      // Owner application approved - go to dashboard
      navigate('/owner-dashboard?approved=true');
    } else if (notification.type === 'application_rejected') {
      // Owner application rejected - stay on notifications
      // No navigation
    } else {
      navigate('/owner-dashboard');
    }
  };

  const getNotificationIcon = (type) => {
    switch(type) {
      case 'application_approved':
        return '✅';
      case 'application_rejected':
        return '❌';
      case 'membership_approved':
        return '🎉';
      case 'promo':
        return '🏷️';
      case 'announcement':
        return '📢';
      default:
        return '📋';
    }
  };

  const getNotificationTitle = (notification) => {
    if (notification.title) return notification.title;

    const data = typeof notification.data === 'string' 
      ? JSON.parse(notification.data) 
      : notification.data || {};

    switch(notification.type) {
      case 'application_approved':
        return 'Application Approved! 🎉';
      case 'application_rejected':
        return 'Application Update';
      case 'membership_approved':
        return data.member_name 
          ? `${data.member_name} Joined`
          : 'New Member';
      case 'promo':
        return 'Promotion Opportunity';
      case 'announcement':
        return data.applicant_name 
          ? `New Application: ${data.applicant_name}`
          : 'New Notification';
      default:
        return 'Notification';
    }
  };

  const getNotificationMessage = (notification) => {
    if (notification.message) return notification.message;

    const data = typeof notification.data === 'string' 
      ? JSON.parse(notification.data) 
      : notification.data || {};

    switch(notification.type) {
      case 'application_approved':
        return 'Your business owner application has been approved! You can now log in and start managing your business.';
      case 'application_rejected':
        return data.reason || 'Your application was not approved. Please contact support for more information.';
      case 'membership_approved':
        return data.member_name 
          ? `${data.member_name} has joined as a member`
          : 'A new member has joined';
      case 'promo':
        return 'Create a promotion to attract more members';
      case 'announcement':
        if (data.applicant_name && data.plan_name) {
          return `${data.applicant_name} applied for ${data.plan_name} plan`;
        }
        return 'You have a new notification';
      default:
        return 'You have a new notification';
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
      year: 'numeric'
    });
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  if (loading) {
    return (
      <div className="notifications-loading">
        <div className="loading-spinner"></div>
        <p>Loading notifications...</p>
      </div>
    );
  }

  return (
    <div className="notifications-container-page">
      <OwnerNavbar profile={profile} avatarUrl={avatarUrl} />

      <div className="notifications-main">
        <div className="notifications-header">
          <div className="header-left">
            <h1 className="page-title">
              Notifications
              {unreadCount > 0 && (
                <span className="unread-badge">{unreadCount} new</span>
              )}
            </h1>
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
            <button className="mark-all-read-btn" onClick={markAllAsRead}>
              Mark all as read
            </button>
          )}
        </div>

        {notifications.length === 0 ? (
          <div className="no-notifications-state">
            <div className="no-notifications-icon">🔔</div>
            <h3>No notifications</h3>
            <p>You don't have any notifications at the moment.</p>
          </div>
        ) : (
          <div className="notifications-list">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={`notification-card ${!notification.is_read ? 'unread' : ''}`}
                onClick={() => handleNotificationClick(notification)}
              >
                <div className="notification-icon-wrapper">
                  <span className="notification-icon-large">
                    {getNotificationIcon(notification.type)}
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
                  
                  {notification.business && (
                    <div className="notification-meta">
                      <span className="meta-label">{notification.business.emoji || '🏢'}</span>
                      <span className="meta-value">{notification.business.name}</span>
                    </div>
                  )}
                </div>
                
                {!notification.is_read && <span className="unread-dot"></span>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default OwnerNotifications;