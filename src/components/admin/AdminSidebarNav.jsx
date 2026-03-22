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
  LogOut as LogOutIcon
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
      const { data: { user } } = await supabase.auth.getUser();
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
        {mobileMenuOpen ? <X className="w-5 h-5 text-gray-600" /> : <Menu className="w-5 h-5 text-gray-600" />}
      </button>

      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{ width: collapsed ? 80 : 300 }}
        className={`fixed left-0 top-0 h-full bg-gradient-to-b from-slate-800 via-slate-800 to-slate-900 shadow-2xl z-40 transition-all duration-300 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Logo Section - Made Bigger */}
          <div className={`flex items-center ${collapsed ? 'justify-center' : 'justify-between'} p-5 border-b border-slate-700/50`}>
            {!collapsed && (
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="absolute inset-0 bg-blue-500/20 rounded-xl blur-md"></div>
                  <img src={logo} alt="Logo" className="relative h-11 w-auto" />
                </div>
                <div className="flex flex-col">
                  <span className="text-white font-bold text-xl tracking-wide">Memsphere</span>
                  <span className="text-xs text-slate-400">Admin Portal</span>
                </div>
              </div>
            )}
            {collapsed && (
              <div className="relative">
                <div className="absolute inset-0 bg-blue-500/20 rounded-xl blur-sm"></div>
                <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
                  <span className="text-white font-bold text-base">M</span>
                </div>
              </div>
            )}
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="hidden lg:block p-1.5 rounded-lg hover:bg-slate-700/50 transition-all duration-300 text-slate-400 hover:text-white"
            >
              {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
          </div>

          {/* Navigation - Fixed Blue Selected Color */}
          <nav className="flex-1 py-8 overflow-y-auto custom-scrollbar">
            <div className="space-y-1.5 px-3">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.path);
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group ${
                      active
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                        : 'text-slate-300 hover:bg-slate-700/50 hover:text-white'
                    }`}
                  >
                    <Icon className={`w-5 h-5 transition-colors ${active ? 'text-white' : 'text-slate-400 group-hover:text-white'}`} />
                    {!collapsed && (
                      <span className={`font-medium transition-colors ${active ? 'text-white' : 'text-slate-300 group-hover:text-white'}`}>
                        {item.label}
                      </span>
                    )}
                    {collapsed && (
                      <div className="absolute left-14 bg-slate-800 text-white text-sm px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50 shadow-lg">
                        {item.label}
                      </div>
                    )}
                  </Link>
                );
              })}
            </div>
          </nav>

          {/* Admin Profile Container */}
          <div className={`border-t border-slate-700/50 pt-4 pb-2 px-4 ${collapsed ? 'flex justify-center' : ''}`}>
            <div className={`flex items-center gap-3 ${collapsed ? 'justify-center' : ''}`}>
              {avatarUrl ? (
                <div className="relative">
                  <div className="absolute inset-0 bg-blue-500/20 rounded-full blur-sm"></div>
                  <img
                    src={avatarUrl}
                    alt="Profile"
                    className="relative w-10 h-10 rounded-full object-cover border-2 border-slate-600"
                  />
                </div>
              ) : (
                <div className="relative">
                  <div className="absolute inset-0 bg-blue-500/20 rounded-full blur-sm"></div>
                  <div className="relative w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold shadow-lg">
                    {getInitials()}
                  </div>
                </div>
              )}
              {!collapsed && (
                <div className="flex-1 min-w-0">
                  <p className="text-white font-semibold truncate">
                    {profile?.first_name || "Admin"} {profile?.last_name || ""}
                  </p>
                  <p className="text-slate-400 text-xs truncate flex items-center gap-1">
                    <Shield className="w-3 h-3" />
                    Administrator
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Logout Button - Below Admin Profile, Long Red Button with Icon on Right */}
          <div className={`p-4 pt-2 ${collapsed ? 'flex justify-center' : ''}`}>
            <button
              onClick={handleSignOut}
              className={`w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-semibold py-3 rounded-xl transition-all duration-300 flex items-center justify-between group shadow-lg hover:shadow-red-500/20 ${
                collapsed ? 'justify-center px-2' : 'px-5'
              }`}
            >
              {!collapsed && (
                <span className="text-sm tracking-wide">LOGOUT</span>
              )}
              <LogOutIcon className={`w-5 h-5 ${collapsed ? '' : 'group-hover:translate-x-1 transition-transform duration-300'}`} />
            </button>
          </div>

          {/* Version Info */}
          {!collapsed && (
            <div className="px-4 pb-4">
              <p className="text-xs text-slate-500 text-center">Version 2.0.0</p>
            </div>
          )}
        </div>
      </motion.aside>

      {/* Main Content */}
      <main
        className={`transition-all duration-300 ${
          collapsed ? 'lg:ml-20' : 'lg:ml-[300px]'
        }`}
      >
        <div className="p-6">
          {children}
        </div>
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
          background: #1e293b;
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #475569;
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #64748b;
        }
      `}</style>
    </div>
  );
};

export default AdminSidebarNav;