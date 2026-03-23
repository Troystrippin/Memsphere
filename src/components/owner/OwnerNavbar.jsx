import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import logo from "../../assets/logo.png";
import logoDark from "../../assets/logo2.png";
import {
  Bell,
  User,
  Settings,
  LogOut,
  ChevronDown,
  LayoutDashboard,
  Store,
  Users,
  BarChart3,
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Sparkles,
  Menu,
  X,
  Gift,
  BellRing,
  CheckCheck,
  RefreshCw,
  Crown,
  Shield,
  Camera,
  HelpCircle,
  Moon,
  Sun,
  Mail,
  Building2,
  UserPlus,
  TrendingUp,
  Briefcase,
  UserCircle,
} from "lucide-react";

const OwnerNavbar = ({ profile, avatarUrl, isDarkMode, toggleDarkMode }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [showDropdown, setShowDropdown] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);
  const [subscription, setSubscription] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const dropdownRef = useRef(null);
  const notificationRef = useRef(null);
  const mobileMenuRef = useRef(null);

  // Fetch user on mount
  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);
    };
    getUser();
  }, []);

  // Fetch real notifications from Supabase
  useEffect(() => {
    if (!profile?.id && !user?.id) return;

    const userId = profile?.id || user?.id;
    fetchNotifications(userId);

    // Set up real-time subscription for new notifications
    const newSubscription = supabase
      .channel(`owner-notifications-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          console.log("New notification received:", payload);
          setNotifications((prev) => {
            const exists = prev.some((n) => n.id === payload.new.id);
            if (exists) return prev;
            return [payload.new, ...prev].slice(0, 20);
          });
          setUnreadCount((prev) => prev + 1);

          // Browser notification
          if (Notification.permission === "granted") {
            new Notification("New Notification", {
              body: payload.new.message || "You have a new notification",
              icon: isDarkMode ? logoDark : logo,
            });
          }
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          if (payload.new.is_read === true && payload.old.is_read === false) {
            setUnreadCount((prev) => Math.max(0, prev - 1));
          }
          setNotifications((prev) =>
            prev.map((n) => (n.id === payload.new.id ? payload.new : n)),
          );
        },
      )
      .subscribe();

    setSubscription(newSubscription);

    // Request notification permission
    if (Notification.permission === "default") {
      Notification.requestPermission();
    }

    return () => {
      if (newSubscription) {
        newSubscription.unsubscribe();
      }
    };
  }, [profile?.id, user?.id, isDarkMode]);

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
      if (
        notificationRef.current &&
        !notificationRef.current.contains(event.target)
      ) {
        setShowNotifications(false);
      }
      if (
        mobileMenuRef.current &&
        !mobileMenuRef.current.contains(event.target) &&
        !event.target.closest(".md\\:hidden")
      ) {
        setMobileMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const fetchNotifications = async (userId) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("notifications")
        .select(
          `
          *,
          business:business_id (
            id,
            name,
            emoji
          )
        `,
        )
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;

      setNotifications(data || []);
      setUnreadCount(data?.filter((n) => !n.is_read).length || 0);
    } catch (error) {
      console.error("Error fetching notifications:", error);
    } finally {
      setLoading(false);
    }
  };

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
          n.id === notificationId ? { ...n, is_read: true } : n,
        ),
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const markAllAsRead = async () => {
    const userId = profile?.id || user?.id;
    if (!userId) return;

    try {
      const { error } = await supabase
        .from("notifications")
        .update({
          is_read: true,
          read_at: new Date().toISOString(),
        })
        .eq("user_id", userId)
        .eq("is_read", false);

      if (error) throw error;

      setNotifications(notifications.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error("Error marking all as read:", error);
    }
  };

  const handleNotificationClick = async (notification) => {
    // Mark as read
    if (!notification.is_read) {
      await markAsRead(notification.id);
    }

    setShowNotifications(false);

    // Parse data if it's a string
    const notificationData =
      typeof notification.data === "string"
        ? JSON.parse(notification.data)
        : notification.data || {};

    // Navigate based on notification type and data
    const navigationMap = {
      membership_pending: "/applications",
      membership_approved: "/members",
      membership_rejected: "/applications",
      application_received: "/applications",
      payment_received: "/applications?tab=payments",
      payment_failed: "/applications?tab=payments",
      promo_created: "/my-business",
      business_verified: "/my-business",
      announcement: "/my-business",
      welcome: "/owner-dashboard",
    };

    let path = navigationMap[notification.type] || "/owner-dashboard";

    // Handle specific cases
    if (notificationData.membership_id) {
      path = "/applications";
    } else if (notificationData.payment_id) {
      path = "/applications?tab=payments";
    } else if (notification.type === "application_approved") {
      path = "/owner-dashboard?approved=true";
    }

    navigate(path);
  };

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      navigate("/login");
    } catch (err) {
      console.error("Error signing out:", err);
    }
  };

  const handleNavigation = (path) => {
    navigate(path);
    setShowDropdown(false);
    setShowNotifications(false);
    setMobileMenuOpen(false);
  };

  const getFirstName = () => {
    if (profile?.first_name) {
      return profile.first_name;
    }
    return "Owner";
  };

  const getFullName = () => {
    if (profile?.first_name && profile?.last_name) {
      return `${profile.first_name} ${profile.last_name}`;
    }
    return profile?.first_name || "Business Owner";
  };

  const getInitials = () => {
    if (profile?.first_name && profile?.last_name) {
      return `${profile.first_name.charAt(0)}${profile.last_name.charAt(0)}`.toUpperCase();
    }
    return profile?.first_name?.charAt(0).toUpperCase() || "O";
  };

  const getUserRole = () => {
    if (profile?.role === "owner") return "Business Owner";
    if (profile?.role === "admin") return "Administrator";
    return "Owner";
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
    if (diffHours < 24)
      return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;

    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  const getNotificationIcon = (type) => {
    const iconMap = {
      welcome: <Sparkles className="w-5 h-5 text-yellow-500" />,
      announcement: <BellRing className="w-5 h-5 text-purple-500" />,
      application_received: <FileText className="w-5 h-5 text-blue-500" />,
      membership_pending: <Clock className="w-5 h-5 text-orange-500" />,
      membership_approved: <CheckCircle className="w-5 h-5 text-green-500" />,
      membership_rejected: <XCircle className="w-5 h-5 text-red-500" />,
      payment_received: <CheckCircle className="w-5 h-5 text-green-500" />,
      payment_failed: <AlertCircle className="w-5 h-5 text-red-500" />,
      promo_created: <Gift className="w-5 h-5 text-pink-500" />,
      business_verified: <Shield className="w-5 h-5 text-blue-500" />,
    };
    return iconMap[type] || <Bell className="w-5 h-5 text-blue-500" />;
  };

  const getNotificationText = (notification) => {
    if (notification.message) return notification.message;

    const data =
      typeof notification.data === "string"
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

    switch (notification.type) {
      case "announcement":
        return "New announcement";
      case "membership_approved":
        return "Member approved";
      case "promo":
        return "New promotion";
      case "application_approved":
        return "Your application has been approved!";
      case "application_rejected":
        return data.reason || "Your application was not approved";
      case "payment_received":
        return `Payment received: $${data.amount || "0"}`;
      default:
        return "New notification";
    }
  };

  const firstName = getFirstName();
  const fullName = getFullName();
  const userRole = getUserRole();
  const initials = getInitials();

  // Navigation items for owner
  const navItems = [
    { path: "/owner-dashboard", label: "Overview", icon: LayoutDashboard },
    { path: "/my-business", label: "My Business", icon: Store },
    { path: "/applications", label: "Applications", icon: FileText },
    { path: "/members", label: "Members", icon: Users },
    { path: "/analytics", label: "Analytics", icon: BarChart3 },
  ];

  return (
    <nav
      className={`
      fixed top-0 left-0 right-0 z-50 w-full
      transition-all duration-300
      ${isDarkMode ? "bg-gray-900" : "bg-gradient-to-r from-blue-600 to-blue-700"}
      shadow-lg
    `}
    >
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          {/* Left section - Logo */}
          <div className="flex items-center flex-shrink-0">
            <div
              onClick={() => handleNavigation("/owner-dashboard")}
              className="flex items-center space-x-3 cursor-pointer transform transition-all duration-300 hover:scale-105 active:scale-95"
            >
              <img
                src={isDarkMode ? logoDark : logo}
                alt="Memsphere Logo"
                className="h-12 w-auto transition-all duration-300"
              />
              <span className="text-2xl font-bold text-white tracking-wider">
                MEMSPHERE
              </span>
            </div>
          </div>

          {/* Center section - Navigation Links */}
          <div className="hidden md:flex items-center justify-center flex-1 space-x-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;

              return (
                <button
                  key={item.path}
                  onClick={() => handleNavigation(item.path)}
                  className={`
                    relative px-6 py-2.5 rounded-xl font-medium text-sm transition-all duration-300
                    flex items-center space-x-2 whitespace-nowrap
                    ${
                      isActive
                        ? "bg-white text-blue-600 shadow-lg scale-105"
                        : "text-white hover:bg-white/20 hover:scale-105"
                    }
                  `}
                >
                  <Icon
                    className={`w-4 h-4 ${
                      isActive ? "text-blue-600" : "text-white"
                    }`}
                  />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>

          {/* Right section - Notifications & User Menu */}
          <div className="flex items-center space-x-2 flex-shrink-0">
            {/* Dark Mode Toggle */}
            <button
              onClick={toggleDarkMode}
              className="hidden sm:block p-2.5 rounded-xl bg-white/10 hover:bg-white/20 transition-all duration-300 group"
            >
              {isDarkMode ? (
                <Sun className="w-5 h-5 text-white group-hover:rotate-180 transition-transform duration-500" />
              ) : (
                <Moon className="w-5 h-5 text-white group-hover:rotate-180 transition-transform duration-500" />
              )}
            </button>

            {/* Notifications */}
            <div ref={notificationRef} className="relative">
              <button
                onClick={() => {
                  setShowNotifications(!showNotifications);
                  setShowDropdown(false);
                }}
                className="relative p-2.5 rounded-xl bg-white/10 hover:bg-white/20 transition-all duration-300 group"
              >
                <Bell className="w-5 h-5 text-white group-hover:scale-110 transition-transform" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1 border-2 border-blue-600 animate-bounce">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>

              {/* Notifications Dropdown */}
              {showNotifications && (
                <div
                  className={`absolute right-0 mt-3 w-96 rounded-2xl shadow-2xl border overflow-hidden animate-slideDown ${
                    isDarkMode
                      ? "bg-gray-800 border-gray-700"
                      : "bg-white border-gray-100"
                  }`}
                >
                  <div
                    className={`p-4 border-b ${
                      isDarkMode
                        ? "bg-gray-700 border-gray-600"
                        : "bg-gradient-to-r from-blue-50 to-indigo-50 border-gray-100"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Bell
                          className={`w-5 h-5 ${isDarkMode ? "text-blue-400" : "text-blue-600"}`}
                        />
                        <h3
                          className={`font-semibold ${isDarkMode ? "text-white" : "text-gray-800"}`}
                        >
                          Notifications
                        </h3>
                      </div>
                      {unreadCount > 0 && (
                        <button
                          onClick={markAllAsRead}
                          className={`text-sm font-medium flex items-center space-x-1 px-3 py-1.5 rounded-lg shadow-sm hover:shadow transition-all ${
                            isDarkMode
                              ? "bg-gray-600 text-blue-400 hover:bg-gray-500"
                              : "bg-white text-blue-600 hover:bg-blue-50"
                          }`}
                        >
                          <CheckCheck className="w-4 h-4" />
                          <span>Mark all read</span>
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                    {loading ? (
                      <div className="p-8 text-center">
                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        <p
                          className={`mt-2 text-sm ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}
                        >
                          Loading...
                        </p>
                      </div>
                    ) : notifications.length > 0 ? (
                      notifications.slice(0, 5).map((notification) => (
                        <div
                          key={notification.id}
                          onClick={() => handleNotificationClick(notification)}
                          className={`
                            flex items-start space-x-3 p-4 border-b cursor-pointer
                            transition-all duration-300 hover:pl-6
                            ${!notification.is_read ? (isDarkMode ? "bg-gray-700/50" : "bg-blue-50/30") : ""}
                            ${isDarkMode ? "border-gray-700 hover:bg-gray-700" : "border-gray-50 hover:bg-gray-50"}
                          `}
                        >
                          <div
                            className={`flex-shrink-0 w-10 h-10 rounded-xl shadow-sm flex items-center justify-center ${
                              isDarkMode ? "bg-gray-600" : "bg-white"
                            }`}
                          >
                            {getNotificationIcon(notification.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p
                              className={`text-sm font-medium mb-1 line-clamp-2 ${isDarkMode ? "text-white" : "text-gray-800"}`}
                            >
                              {getNotificationText(notification)}
                            </p>
                            {notification.business?.name && (
                              <p
                                className={`text-xs mb-2 ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}
                              >
                                {notification.business.emoji}{" "}
                                {notification.business.name}
                              </p>
                            )}
                            <p
                              className={`text-xs flex items-center ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}
                            >
                              <Clock className="w-3 h-3 mr-1" />
                              {formatTime(notification.created_at)}
                            </p>
                          </div>
                          {!notification.is_read && (
                            <span className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></span>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="p-12 text-center">
                        <Bell
                          className={`w-16 h-16 mx-auto mb-4 ${isDarkMode ? "text-gray-600" : "text-gray-200"}`}
                        />
                        <p
                          className={`font-semibold mb-1 ${isDarkMode ? "text-white" : "text-gray-700"}`}
                        >
                          All caught up!
                        </p>
                        <p
                          className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}
                        >
                          No new notifications
                        </p>
                      </div>
                    )}
                  </div>

                  {notifications.length > 0 && (
                    <div
                      className={`p-3 border-t ${
                        isDarkMode
                          ? "bg-gray-700 border-gray-600"
                          : "bg-gray-50 border-gray-100"
                      }`}
                    >
                      <button
                        onClick={() => {
                          handleNavigation("/owner-notifications");
                          setShowNotifications(false);
                        }}
                        className={`w-full py-3 text-sm font-medium rounded-xl transition-all duration-300 ${
                          isDarkMode
                            ? "text-blue-400 hover:text-blue-300 hover:bg-gray-600"
                            : "text-blue-600 hover:text-blue-700 hover:bg-white"
                        }`}
                      >
                        View All Notifications ({notifications.length})
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* User Menu */}
            <div ref={dropdownRef} className="relative">
              <button
                onClick={() => {
                  setShowDropdown(!showDropdown);
                  setShowNotifications(false);
                }}
                className="flex items-center space-x-3 bg-white/10 hover:bg-white/20 rounded-full pl-2 pr-4 py-2 transition-all duration-300 group hover:scale-105 active:scale-95"
              >
                <div className="relative">
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt={firstName}
                      className="w-10 h-10 rounded-full border-2 border-white object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 border-2 border-white flex items-center justify-center text-white font-bold text-lg shadow-lg">
                      {initials}
                    </div>
                  )}
                  <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 border-2 border-white rounded-full animate-pulse"></span>
                </div>

                {/* UPDATED: Profile text with dark mode support */}
                <div className="hidden lg:block text-left">
                  <p className="text-sm font-semibold text-white dark:text-gray-200 flex items-center space-x-1">
                    <span>{firstName}</span>
                    <Crown className="w-3 h-3 text-yellow-300 ml-1" />
                  </p>
                  <p className="text-xs text-blue-100 dark:text-gray-400">
                    {userRole}
                  </p>
                </div>

                <ChevronDown
                  className={`w-4 h-4 text-white transition-all duration-300 ${showDropdown ? "rotate-180" : ""}`}
                />
              </button>

              {/* Profile Dropdown */}
              {showDropdown && (
                <div
                  className={`absolute right-0 mt-3 w-80 rounded-2xl shadow-2xl border overflow-hidden animate-slideDown ${
                    isDarkMode
                      ? "bg-gray-800 border-gray-700"
                      : "bg-white border-gray-100"
                  }`}
                >
                  {/* Header */}
                  <div className="p-5 bg-gradient-to-r from-blue-600 to-blue-700 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-8 -mt-8"></div>
                    <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full -ml-8 -mb-8"></div>

                    <div className="relative flex items-center space-x-4">
                      <div className="relative group/avatar">
                        {avatarUrl ? (
                          <img
                            src={avatarUrl}
                            alt={fullName}
                            className="w-16 h-16 rounded-full border-3 border-white/50 object-cover shadow-xl"
                          />
                        ) : (
                          <div className="w-16 h-16 rounded-full bg-white/20 border-3 border-white/50 flex items-center justify-center text-white font-bold text-2xl shadow-xl">
                            {initials}
                          </div>
                        )}
                        <button className="absolute bottom-0 right-0 w-6 h-6 bg-blue-500 rounded-full border-2 border-white flex items-center justify-center opacity-0 group-hover/avatar:opacity-100 transition-opacity">
                          <Camera className="w-3 h-3 text-white" />
                        </button>
                      </div>
                      <div className="flex-1 text-white min-w-0">
                        <p className="font-bold text-lg truncate">{fullName}</p>
                        <p className="text-sm text-blue-100 truncate flex items-center space-x-1">
                          <Mail className="w-3 h-3 flex-shrink-0" />
                          <span className="truncate">
                            {profile?.email || user?.email}
                          </span>
                        </p>
                        <div className="flex items-center space-x-2 mt-2">
                          <span className="px-2 py-0.5 bg-white/20 rounded-full text-xs font-medium flex items-center space-x-1">
                            <Shield className="w-3 h-3" />
                            <span>{userRole}</span>
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Business Info (if available) */}
                  {profile?.business_name && (
                    <div
                      className={`px-4 py-3 border-b ${
                        isDarkMode
                          ? "bg-gray-700 border-gray-600"
                          : "bg-gray-50 border-gray-100"
                      }`}
                    >
                      <div className="flex items-center space-x-2 text-sm">
                        <Building2
                          className={`w-4 h-4 ${isDarkMode ? "text-blue-400" : "text-blue-600"}`}
                        />
                        <span
                          className={
                            isDarkMode ? "text-gray-300" : "text-gray-700"
                          }
                        >
                          {profile.business_name}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Menu Items */}
                  <div className="p-2">
                    {/* Profile Button */}
                    <button
                      onClick={() => handleNavigation("/owner-profile")}
                      className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-300 group ${
                        isDarkMode
                          ? "text-gray-200 hover:bg-gray-700"
                          : "text-gray-700 hover:bg-blue-50"
                      }`}
                    >
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                          isDarkMode
                            ? "bg-gray-700 group-hover:bg-blue-600"
                            : "bg-blue-100 group-hover:bg-blue-600"
                        }`}
                      >
                        <UserCircle
                          className={`w-4 h-4 ${isDarkMode ? "text-gray-400 group-hover:text-white" : "text-blue-600 group-hover:text-white"}`}
                        />
                      </div>
                      <div className="flex-1 text-left">
                        <span className="font-medium block">Profile</span>
                        <span
                          className={`text-xs ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}
                        >
                          View and edit your owner profile
                        </span>
                      </div>
                    </button>

                    <div
                      className={`my-2 border-t ${isDarkMode ? "border-gray-700" : "border-gray-100"}`}
                    ></div>

                    {/* Logout */}
                    <button
                      onClick={handleSignOut}
                      className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-300 group ${
                        isDarkMode
                          ? "text-red-400 hover:bg-gray-700"
                          : "text-red-600 hover:bg-red-50"
                      }`}
                    >
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                          isDarkMode
                            ? "bg-gray-700 group-hover:bg-red-600"
                            : "bg-red-100 group-hover:bg-red-600"
                        }`}
                      >
                        <LogOut
                          className={`w-4 h-4 ${isDarkMode ? "text-red-400 group-hover:text-white" : "text-red-600 group-hover:text-white"}`}
                        />
                      </div>
                      <div className="flex-1 text-left">
                        <span className="font-medium block">Logout</span>
                        <span
                          className={`text-xs ${isDarkMode ? "text-red-400" : "text-red-400"}`}
                        >
                          Sign out of your account
                        </span>
                      </div>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2.5 rounded-xl bg-white/10 hover:bg-white/20 transition-all duration-300"
            >
              {mobileMenuOpen ? (
                <X className="w-6 h-6 text-white" />
              ) : (
                <Menu className="w-6 h-6 text-white" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation Menu */}
      {mobileMenuOpen && (
        <div
          ref={mobileMenuRef}
          className={`md:hidden border-t animate-slideDown shadow-xl ${
            isDarkMode
              ? "bg-gray-800 border-gray-700"
              : "bg-white border-gray-100"
          }`}
        >
          <div className="px-4 py-3 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <button
                  key={item.path}
                  onClick={() => handleNavigation(item.path)}
                  className={`
                    w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-300
                    ${
                      isActive
                        ? isDarkMode
                          ? "bg-gray-700 text-blue-400"
                          : "bg-blue-50 text-blue-600"
                        : isDarkMode
                          ? "text-gray-300 hover:bg-gray-700"
                          : "text-gray-700 hover:bg-gray-50"
                    }
                  `}
                >
                  <Icon
                    className={`w-5 h-5 ${
                      isActive
                        ? isDarkMode
                          ? "text-blue-400"
                          : "text-blue-600"
                        : isDarkMode
                          ? "text-gray-400"
                          : "text-gray-500"
                    }`}
                  />
                  <span className="font-medium">{item.label}</span>
                </button>
              );
            })}

            {/* Mobile Profile Button */}
            <button
              onClick={() => {
                handleNavigation("/owner-profile");
                setMobileMenuOpen(false);
              }}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-300 ${
                location.pathname === "/owner-profile"
                  ? isDarkMode
                    ? "bg-gray-700 text-blue-400"
                    : "bg-blue-50 text-blue-600"
                  : isDarkMode
                    ? "text-gray-300 hover:bg-gray-700"
                    : "text-gray-700 hover:bg-gray-50"
              }`}
            >
              <UserCircle className="w-5 h-5" />
              <span className="font-medium">Profile</span>
            </button>

            <div
              className={`border-t my-2 pt-2 ${isDarkMode ? "border-gray-700" : "border-gray-100"}`}
            >
              <button
                onClick={toggleDarkMode}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all ${
                  isDarkMode
                    ? "text-gray-300 hover:bg-gray-700"
                    : "text-gray-700 hover:bg-gray-50"
                }`}
              >
                {isDarkMode ? (
                  <Sun className="w-5 h-5 text-yellow-500" />
                ) : (
                  <Moon className="w-5 h-5 text-gray-500" />
                )}
                <span className="font-medium">
                  {isDarkMode ? "Light Mode" : "Dark Mode"}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default OwnerNavbar;
