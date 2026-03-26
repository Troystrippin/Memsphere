// src/components/admin/AdminSidebarNav.jsx
import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Users,
  Store,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  User,
  Shield,
  Bell,
  Search,
  Home,
  BarChart3,
  FileText,
  HelpCircle,
  ChevronDown,
  Crown,
  LogOut as LogOutIcon,
} from "lucide-react";
import logo from "../../assets/logo.png";

const AdminSidebarNav = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profile, setProfile] = useState(null);
  const [avatarUrl, setAvatarUrl] = useState(null);

  useEffect(() => {
    fetchAdminProfile();
  }, []);

  const fetchAdminProfile = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();

        setProfile(profile);

        if (profile?.avatar_url) {
          const { data } = supabase.storage
            .from("avatars")
            .getPublicUrl(profile.avatar_url);
          if (data?.publicUrl) {
            setAvatarUrl(data.publicUrl);
          }
        }
      }
    } catch (error) {
      console.error("Error fetching admin profile:", error);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  const getInitials = () => {
    if (profile?.first_name && profile?.last_name) {
      return `${profile.first_name.charAt(0)}${profile.last_name.charAt(0)}`.toUpperCase();
    }
    return "A";
  };

  const navItems = [
    { path: "/admin-dashboard", label: "Dashboard", icon: LayoutDashboard },
    { path: "/admin/users", label: "User Management", icon: Users },
    { path: "/admin/businesses", label: "Business Management", icon: Store },
    { path: "/admin/notifications", label: "Notifications", icon: Bell },
    { path: "/admin/settings", label: "Settings", icon: Settings },
    { path: "/admin/profile", label: "Profile", icon: User },
  ];

  const isActive = (path) => {
    return location.pathname === path;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100">
      {/* Mobile Menu Button */}
      <button
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-lg shadow-lg hover:shadow-xl transition-all"
      >
        {mobileMenuOpen ? (
          <X className="w-5 h-5 text-gray-600" />
        ) : (
          <Menu className="w-5 h-5 text-gray-600" />
        )}
      </button>

      {/* Sidebar - White Background */}
      <div
        className={`fixed left-0 top-0 h-full bg-white shadow-2xl z-40 transition-none cursor-pointer ${
          collapsed ? "w-20" : "w-[300px]"
        } ${mobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}
        onClick={() => collapsed && setCollapsed(false)}
      >
        <div className="flex flex-col h-full">
          {/* Logo Section - Blue Gradient Header */}
          <div
            className={`flex items-center ${collapsed ? "justify-center" : "justify-between"} py-4 px-3 bg-gradient-to-r from-blue-600 to-blue-700`}
          >
            {!collapsed && (
              <div className="flex items-center gap-2.5">
                <img src={logo} alt="Logo" className="h-9 w-auto" />
                <div className="flex flex-col leading-tight">
                  <span className="text-white font-bold text-lg tracking-wide">
                    MEMSPHERE
                  </span>
                  <span className="text-xs text-blue-100">Admin Portal</span>
                </div>
              </div>
            )}
            {collapsed && <img src={logo} alt="Logo" className="h-8 w-auto" />}
            {/* Only show collapse button when sidebar is open */}
            {!collapsed && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setCollapsed(true);
                }}
                className="p-1 rounded-lg hover:bg-white/10 transition-all duration-300 text-white"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Navigation - Dark Text on White Background */}
          <nav className="flex-1 py-8 overflow-y-auto custom-scrollbar">
            <div className="px-3 space-y-1.5">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.path);
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center gap-3 rounded-xl transition-all duration-200 group ${
                      active
                        ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20"
                        : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                    } ${collapsed ? "py-2 justify-center w-14 mx-auto" : "py-3 px-3 justify-start"}`}
                  >
                    <Icon
                      className={`w-5 h-5 transition-colors ${active ? "text-white" : "text-gray-500 group-hover:text-gray-700"}`}
                    />
                    {!collapsed && (
                      <span
                        className={`font-medium transition-colors ${active ? "text-white" : "text-gray-700 group-hover:text-gray-900"}`}
                      >
                        {item.label}
                      </span>
                    )}
                    {collapsed && (
                      <div className="absolute left-14 bg-gray-800 text-white text-sm px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50 shadow-lg">
                        {item.label}
                      </div>
                    )}
                  </Link>
                );
              })}
            </div>
          </nav>

          {/* Footer Section - Blue Gradient Footer */}
          <div
            className={`bg-white ${collapsed ? "flex justify-center py-4" : "py-4 px-3"}`}
          >
            {!collapsed ? (
              <div className="flex items-center justify-between gap-3">
                {/* Profile Info - Full with text */}
                <div className="flex items-center gap-2.5">
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt="Profile"
                      className="w-9 h-9 rounded-full object-cover border border-white/30"
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-sm shadow-lg">
                      {getInitials()}
                    </div>
                  )}
                  <div className="flex flex-col">
                    <p
                      className="text-blue-500 font-semibold text-sm truncate max-w-[140px] : text-white"
                      style={{ color: "blue" }}
                    >
                      {profile?.first_name || "Admin"}{" "}
                      {profile?.last_name || ""}
                    </p>
                    <p
                      className="text-blue-500 text-xs truncate flex items-center gap-1 : text-white"
                      style={{ color: "blue" }}
                    >
                      <Shield
                        className="w-3 h-3 text-blue-400"
                        style={{ color: "blue" }}
                      />
                      Administrator
                    </p>
                  </div>
                </div>

                {/* Logout Icon Button - Red Background */}
                <button
                  onClick={handleSignOut}
                  className="p-1.5 rounded-lg bg-red-500 hover:bg-red-600 transition-all duration-300 group shadow-md"
                  title="Logout"
                >
                  <LogOutIcon className="w-5 h-5 text-white" />
                </button>
              </div>
            ) : (
              /* Collapsed Mode - Only profile picture */
              <div className="flex justify-center">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt="Profile"
                    className="w-9 h-9 rounded-full object-cover border border-white/30"
                  />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-sm shadow-lg">
                    {getInitials()}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main
        className={`transition-all duration-300 ${
          collapsed ? "lg:ml-20" : "lg:ml-[300px]"
        }`}
      >
        <div className="p-6">{children}</div>
      </main>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-30 lg:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Custom Scrollbar Styles */}
      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
      `}</style>
    </div>
  );
};

export default AdminSidebarNav;