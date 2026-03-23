// pages/Notifications.jsx - FIXED with correct column names
import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "../lib/supabase";
import ClientNavbar from "../components/client/ClientNavbar";
import "../styles/Notifications.css";

const Notifications = () => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [highlightedId, setHighlightedId] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  const subscriptionRef = useRef(null);
  const initialFetchDone = useRef(false);
  const notificationIdsRef = useRef(new Set());
  const isMounted = useRef(true);
  const fetchInProgress = useRef(false);

  useEffect(() => {
    isMounted.current = true;
    
    const params = new URLSearchParams(location.search);
    const highlightId = params.get("highlight");
    if (highlightId) {
      setHighlightedId(highlightId);
      markAsRead(highlightId);
      setTimeout(() => {
        if (isMounted.current) {
          setHighlightedId(null);
          navigate("/notifications", { replace: true });
        }
      }, 3000);
    }

    return () => {
      isMounted.current = false;
    };
  }, [location, navigate]);

  useEffect(() => {
    checkUser();
    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
      }
    };
  }, []);

  useEffect(() => {
    if (user && isMounted.current) {
      fetchNotifications();
    }
  }, [user, filter]);

  const checkUser = async () => {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) throw error;
      if (!user) {
        navigate("/login");
        return;
      }
      if (isMounted.current) {
        setUser(user);
        await getUserProfile(user);
      }
    } catch (error) {
      console.error("Error checking user:", error);
      navigate("/login");
    }
  };

  const getUserProfile = async (user) => {
    try {
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (profileError && profileError.code !== "PGRST116") {
        console.error("Error fetching profile:", profileError);
      }

      if (isMounted.current) {
        setProfile(profile);
      }

      if (profile?.avatar_url) {
        downloadAvatar(profile.avatar_url);
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
    }
  };

  const downloadAvatar = async (path) => {
    try {
      const { data, error } = await supabase.storage
        .from("avatars")
        .download(path);
      if (error) throw error;
      const url = URL.createObjectURL(data);
      if (isMounted.current) {
        setAvatarUrl(url);
      }
    } catch (error) {
      console.error("Error downloading avatar:", error);
    }
  };

  const fetchNotifications = async () => {
    if (!user || !isMounted.current) return;
    if (fetchInProgress.current) return;
    
    try {
      fetchInProgress.current = true;
      setLoading(true);

      let query = supabase
        .from("notifications")
        .select(`
          *,
          business:business_id (
            id,
            name,
            emoji,
            business_type
          )
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (filter === "unread") {
        query = query.eq("is_read", false);  // FIXED: changed 'read' to 'is_read'
      } else if (filter === "read") {
        query = query.eq("is_read", true);   // FIXED: changed 'read' to 'is_read'
      }

      const { data, error } = await query;
      if (error) throw error;

      if (isMounted.current && data) {
        notificationIdsRef.current.clear();
        data.forEach(n => notificationIdsRef.current.add(n.id));
        setNotifications(data);
        initialFetchDone.current = true;
      }
    } catch (error) {
      console.error("Error fetching notifications:", error);
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
      fetchInProgress.current = false;
    }
  };

  useEffect(() => {
    if (!user || !initialFetchDone.current || !isMounted.current) return;

    if (subscriptionRef.current) {
      subscriptionRef.current.unsubscribe();
      subscriptionRef.current = null;
    }

    const subscription = supabase
      .channel(`notifications-channel-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          if (isMounted.current && !notificationIdsRef.current.has(payload.new.id)) {
            notificationIdsRef.current.add(payload.new.id);
            if (filter === "all" || (filter === "unread" && !payload.new.is_read)) {
              setNotifications((prev) => {
                const exists = prev.some(n => n.id === payload.new.id);
                if (exists) return prev;
                return [payload.new, ...prev];
              });
            }
          }
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          if (isMounted.current) {
            setNotifications((prev) => {
              const exists = prev.some(n => n.id === payload.new.id);
              if (!exists) return prev;
              return prev.map((n) => (n.id === payload.new.id ? payload.new : n));
            });
          }
        },
      )
      .subscribe();

    subscriptionRef.current = subscription;

    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
        subscriptionRef.current = null;
      }
    };
  }, [user, filter]);

  const markAsRead = async (notificationId) => {
    try {
      const { error } = await supabase
        .from("notifications")
        .update({
          is_read: true,  // FIXED: changed 'read' to 'is_read'
          read_at: new Date().toISOString(),
        })
        .eq("id", notificationId);

      if (error) throw error;

      if (isMounted.current) {
        setNotifications(prev =>
          prev.map(n =>
            n.id === notificationId ? { ...n, is_read: true, read_at: new Date().toISOString() } : n
          )
        );
      }
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const markAllAsRead = async () => {
    if (!user) return;
    
    try {
      const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id);
      
      if (unreadIds.length === 0) {
        console.log("No unread notifications to mark");
        return;
      }

      const { error } = await supabase
        .from("notifications")
        .update({
          is_read: true,  // FIXED: changed 'read' to 'is_read'
          read_at: new Date().toISOString(),
        })
        .eq("user_id", user.id)
        .eq("is_read", false);  // FIXED: changed 'read' to 'is_read'

      if (error) throw error;

      if (isMounted.current) {
        setNotifications(prev =>
          prev.map(notification => ({
            ...notification,
            is_read: true,
            read_at: new Date().toISOString()
          }))
        );
      }
    } catch (error) {
      console.error("Error marking all as read:", error);
    }
  };

  const handleNotificationClick = async (notification) => {
    if (!notification.is_read) {
      await markAsRead(notification.id);
    }

    const notificationData = typeof notification.data === "string"
      ? JSON.parse(notification.data)
      : notification.data || {};

    if (notification.type === "membership_approved") {
      navigate("/ClientDashboard");
    } else if (notification.type === "membership_rejected") {
      navigate("/browse");
    } else if (notification.type === "announcement") {
      if (notification.business_id) {
        navigate(`/browse?business=${notification.business_id}`);
      } else {
        navigate("/browse");
      }
    } else if (notification.type === "promo") {
      navigate("/browse");
    } else if (notification.type === "welcome") {
      navigate("/browse");
    } else {
      navigate("/ClientDashboard");
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case "welcome":
        return "🎉";
      case "announcement":
        return "📢";
      case "membership_approved":
        return "✅";
      case "membership_rejected":
        return "❌";
      case "promo":
        return "🏷️";
      default:
        return "📋";
    }
  };

  const getNotificationTitle = (notification) => {
    if (notification.title) return notification.title;

    const data = typeof notification.data === "string"
      ? JSON.parse(notification.data)
      : notification.data || {};

    switch (notification.type) {
      case "welcome":
        return "Welcome to Memsphere!";
      case "membership_approved":
        return "Membership Approved! 🎉";
      case "membership_rejected":
        return "Membership Update";
      case "announcement":
        return data.business_name
          ? `Announcement from ${data.business_name}`
          : "New Announcement";
      case "promo":
        return data.business_name
          ? `Promo from ${data.business_name}`
          : "Special Offer";
      default:
        return "Notification";
    }
  };

  const getNotificationMessage = (notification) => {
    if (notification.message) return notification.message;

    const data = typeof notification.data === "string"
      ? JSON.parse(notification.data)
      : notification.data || {};

    switch (notification.type) {
      case "welcome":
        return "Welcome to Memsphere! Start exploring businesses near you.";
      case "membership_approved":
        return data.business_name
          ? `Your membership at ${data.business_name} has been approved! You can now access all member benefits.`
          : "Your membership has been approved!";
      case "membership_rejected":
        return data.business_name
          ? `Your application for ${data.business_name} was not approved at this time.`
          : "Your membership application was not approved.";
      case "announcement":
        return data.message || "You have a new announcement";
      case "promo":
        return data.message || "Check out our latest promotions!";
      default:
        return "You have a new notification";
    }
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? "s" : ""} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  if (loading && notifications.length === 0) {
    return (
      <div className="notifications-loading">
        <div className="loading-spinner"></div>
        <p>Loading notifications...</p>
      </div>
    );
  }

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <div className="notifications-container-page">
      <ClientNavbar profile={profile} avatarUrl={avatarUrl} unreadCount={unreadCount} />

      <div className="notifications-main" style={{ paddingTop: "calc(70px + 2rem)" }}>
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
        </div>

        <div className="notifications-filter">
          <button
            className={`filter-btn ${filter === "all" ? "active" : ""}`}
            onClick={() => setFilter("all")}
          >
            All
          </button>
          <button
            className={`filter-btn ${filter === "unread" ? "active" : ""}`}
            onClick={() => setFilter("unread")}
          >
            Unread
          </button>
          <button
            className={`filter-btn ${filter === "read" ? "active" : ""}`}
            onClick={() => setFilter("read")}
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
            <button className="browse-btn" onClick={() => navigate("/browse")}>
              Browse Businesses
            </button>
          </div>
        ) : (
          <div className="notifications-list">
            {notifications.map((notification) => {
              const notificationData = typeof notification.data === "string"
                ? JSON.parse(notification.data)
                : notification.data || {};

              let navigateTo = "";
              if (notification.type === "membership_approved")
                navigateTo = "Go to Dashboard";
              else if (notification.type === "membership_rejected")
                navigateTo = "Browse Businesses";
              else if (notification.type === "announcement")
                navigateTo = "View Business";
              else if (notification.type === "promo")
                navigateTo = "Browse Deals";
              else if (notification.type === "welcome")
                navigateTo = "Start Exploring";
              else navigateTo = "View";

              return (
                <div
                  key={notification.id}
                  className={`notification-card ${!notification.is_read ? "unread" : ""} ${highlightedId === notification.id ? "highlighted" : ""}`}
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
                        <span className="meta-label">
                          {notification.business.emoji || "🏢"}
                        </span>
                        <span className="meta-value">
                          {notification.business.name}
                        </span>
                      </div>
                    )}

                    {notificationData.plan_name && (
                      <div className="notification-meta">
                        <span className="meta-label">📋</span>
                        <span className="meta-value">
                          Plan: {notificationData.plan_name}
                        </span>
                      </div>
                    )}

                    <div className="notification-click-indicator">
                      Click to {navigateTo}
                    </div>
                  </div>

                  {!notification.is_read && <span className="unread-dot"></span>}
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