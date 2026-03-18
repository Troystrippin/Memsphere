// pages/OwnerNotifications.jsx
import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "../lib/supabase";
import OwnerNavbar from "../components/owner/OwnerNavbar";
import "../styles/OwnerNotifications.css"; // You can reuse the same CSS or create a new one

const OwnerNotifications = () => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [highlightedId, setHighlightedId] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  // Use refs to track subscriptions
  const subscriptionRef = useRef(null);
  const initialFetchDone = useRef(false);
  const notificationIdsRef = useRef(new Set());

  useEffect(() => {
    // Check for highlighted notification ID from URL
    const params = new URLSearchParams(location.search);
    const highlightId = params.get("highlight");
    if (highlightId) {
      setHighlightedId(highlightId);
      // Mark the notification as read when highlighted
      markAsRead(highlightId);

      // Remove highlight from URL after 3 seconds
      setTimeout(() => {
        setHighlightedId(null);
        navigate("/owner-notifications", { replace: true });
      }, 3000);
    }
  }, [location, navigate]);

  useEffect(() => {
    checkUser();

    // Cleanup subscription on unmount
    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
      }
    };
  }, []);

  // Fetch notifications when user OR filter changes
  useEffect(() => {
    if (user) {
      if (!initialFetchDone.current || filter !== "all") {
        fetchNotifications();
      }
    }
  }, [user, filter]);

  const checkUser = async () => {
    try {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error) throw error;

      if (!user) {
        navigate("/login");
        return;
      }

      setUser(user);
      await getUserProfile(user);
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

      setProfile(profile);

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
      setAvatarUrl(url);
    } catch (error) {
      console.error("Error downloading avatar:", error);
    }
  };

  const fetchNotifications = async () => {
    if (!user) return;

    try {
      setLoading(true);

      let query = supabase
        .from("notifications")
        .select(
          `
          *,
          business:business_id (
            id,
            name,
            emoji,
            business_type
          )
        `
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (filter === "unread") {
        query = query.eq("is_read", false);
      } else if (filter === "read") {
        query = query.eq("is_read", true);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Update the ref with current notification IDs
      if (data) {
        notificationIdsRef.current = new Set(data.map((n) => n.id));
        setNotifications(data);
      }

      initialFetchDone.current = true;
    } catch (error) {
      console.error("Error fetching notifications:", error);
    } finally {
      setLoading(false);
    }
  };

  // Set up real-time subscription AFTER initial fetch
  useEffect(() => {
    if (!user || !initialFetchDone.current) return;

    // Clean up existing subscription
    if (subscriptionRef.current) {
      subscriptionRef.current.unsubscribe();
    }

    // Real-time subscription for new notifications
    const subscription = supabase
      .channel("owner-notifications-channel")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log("New notification:", payload.new);

          // Check if this notification is already in our state
          if (!notificationIdsRef.current.has(payload.new.id)) {
            notificationIdsRef.current.add(payload.new.id);

            if (
              filter === "all" ||
              (filter === "unread" && !payload.new.is_read)
            ) {
              setNotifications((prev) => [payload.new, ...prev]);
            }
          }
        }
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
          // Handle updates (like marking as read)
          setNotifications((prev) =>
            prev.map((n) => (n.id === payload.new.id ? payload.new : n))
          );
        }
      )
      .subscribe();

    subscriptionRef.current = subscription;

    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
      }
    };
  }, [user, filter]);

  const markAsRead = async (notificationId) => {
    try {
      const { error } = await supabase
        .from("notifications")
        .update({
          is_read: true,
          read_at: new Date().toISOString(),
        })
        .eq("id", notificationId);

      if (error) throw error;

      setNotifications(
        notifications.map((n) =>
          n.id === notificationId ? { ...n, is_read: true } : n
        )
      );
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const { error } = await supabase
        .from("notifications")
        .update({
          is_read: true,
          read_at: new Date().toISOString(),
        })
        .eq("user_id", user.id)
        .eq("is_read", false);

      if (error) throw error;

      setNotifications(notifications.map((n) => ({ ...n, is_read: true })));
    } catch (error) {
      console.error("Error marking all as read:", error);
    }
  };

  const handleNotificationClick = async (notification) => {
    // Mark as read if unread
    if (!notification.is_read) {
      await markAsRead(notification.id);
    }

    // Parse data if it's a string
    const notificationData =
      typeof notification.data === "string"
        ? JSON.parse(notification.data)
        : notification.data || {};

    // Owner navigation logic
    if (notification.type === "announcement") {
      if (notificationData.membership_id) {
        navigate("/applications");
      } else if (notificationData.payment_id) {
        navigate("/applications?tab=payments");
      } else if (notificationData.member_name) {
        navigate("/members");
      } else {
        navigate("/owner-dashboard");
      }
    } else if (notification.type === "membership_approved") {
      navigate("/members");
    } else if (notification.type === "promo") {
      navigate("/my-business");
    } else {
      navigate("/owner-dashboard");
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case "announcement":
        return "📢";
      case "membership_approved":
        return "✅";
      case "membership_rejected":
        return "❌";
      case "promo":
        return "🏷️";
      case "application_approved":
        return "🎉";
      case "application_rejected":
        return "😞";
      default:
        return "📋";
    }
  };

  const getNotificationTitle = (notification) => {
    if (notification.title) return notification.title;

    const data =
      typeof notification.data === "string"
        ? JSON.parse(notification.data)
        : notification.data || {};

    switch (notification.type) {
      case "announcement":
        if (data.applicant_name) {
          return `New Application from ${data.applicant_name}`;
        } else if (data.member_name) {
          return `Member Update: ${data.member_name}`;
        } else if (data.payment_id) {
          return "New Payment Received";
        }
        return "New Notification";
      case "membership_approved":
        return "Member Approved";
      case "membership_rejected":
        return "Member Rejected";
      case "promo":
        return "Promotion Update";
      case "application_approved":
        return "🎉 Owner Application Approved!";
      case "application_rejected":
        return "Owner Application Update";
      default:
        return "Notification";
    }
  };

  const getNotificationMessage = (notification) => {
    if (notification.message) return notification.message;

    const data =
      typeof notification.data === "string"
        ? JSON.parse(notification.data)
        : notification.data || {};

    switch (notification.type) {
      case "announcement":
        if (data.applicant_name && data.plan_name) {
          return `${data.applicant_name} applied for ${data.plan_name} plan`;
        } else if (data.applicant_name) {
          return `New application from ${data.applicant_name}`;
        } else if (data.member_name) {
          return `${data.member_name} has been ${data.status || "updated"}`;
        } else if (data.payment_id) {
          return `Payment received for membership`;
        }
        return "New application received";
      case "membership_approved":
        return "A member has been approved and can now access your business";
      case "membership_rejected":
        return data.reason || "A membership application has been rejected";
      case "promo":
        return data.message || "Your promotion has been updated";
      case "application_approved":
        return "Congratulations! Your application to become a business owner has been approved. You can now start managing your business.";
      case "application_rejected":
        return data.reason || "Your owner application was not approved at this time.";
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
      year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
    });
  };

  const getFirstName = () => {
    if (profile?.first_name) {
      return profile.first_name;
    }
    if (user?.email) {
      const username = user.email.split("@")[0];
      return username.charAt(0).toUpperCase() + username.slice(1);
    }
    return "Owner";
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
  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <div className="notifications-container-page">
      <OwnerNavbar profile={profile} avatarUrl={avatarUrl} unreadCount={unreadCount} />

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
            <button className="browse-btn" onClick={() => navigate("/owner-dashboard")}>
              Go to Dashboard
            </button>
          </div>
        ) : (
          <div className="notifications-list">
            {notifications.map((notification) => {
              const notificationData =
                typeof notification.data === "string"
                  ? JSON.parse(notification.data)
                  : notification.data || {};

              // Determine navigation text
              let navigateTo = "";
              if (notification.type === "announcement") {
                if (notificationData.membership_id) navigateTo = "Go to Applications";
                else if (notificationData.payment_id) navigateTo = "Go to Payments";
                else if (notificationData.member_name) navigateTo = "Go to Members";
                else navigateTo = "Go to Dashboard";
              } else if (notification.type === "membership_approved") {
                navigateTo = "Go to Members";
              } else if (notification.type === "promo") {
                navigateTo = "Go to My Business";
              } else if (notification.type === "application_approved") {
                navigateTo = "Go to Dashboard";
              } else {
                navigateTo = "View Details";
              }

              return (
                <div
                  key={notification.id}
                  className={`notification-card ${!notification.is_read ? "unread" : ""} ${
                    highlightedId === notification.id ? "highlighted" : ""
                  }`}
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

                    {/* Business info if available */}
                    {notification.business && (
                      <div className="notification-meta">
                        <span className="meta-label">{notification.business.emoji || "🏢"}</span>
                        <span className="meta-value">{notification.business.name}</span>
                      </div>
                    )}

                    {/* Applicant info */}
                    {notificationData.applicant_name && (
                      <div className="notification-meta">
                        <span className="meta-label">👤</span>
                        <span className="meta-value">
                          Applicant: {notificationData.applicant_name}
                        </span>
                      </div>
                    )}

                    {/* Plan info */}
                    {notificationData.plan_name && (
                      <div className="notification-meta">
                        <span className="meta-label">📋</span>
                        <span className="meta-value">
                          Plan: {notificationData.plan_name}
                        </span>
                      </div>
                    )}

                    {/* Member info */}
                    {notificationData.member_name && (
                      <div className="notification-meta">
                        <span className="meta-label">👥</span>
                        <span className="meta-value">
                          Member: {notificationData.member_name}
                        </span>
                      </div>
                    )}

                    {/* Amount if available */}
                    {notificationData.amount && (
                      <div className="notification-meta">
                        <span className="meta-label">💰</span>
                        <span className="meta-value">
                          Amount: ₱{notificationData.amount.toLocaleString()}
                        </span>
                      </div>
                    )}

                    {/* Click indicator */}
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

export default OwnerNotifications;