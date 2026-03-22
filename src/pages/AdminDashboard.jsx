// src/pages/AdminDashboard.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import AdminSidebarNav from "../components/admin/AdminSidebarNav";
import { motion } from "framer-motion";
import {
  Users,
  Store,
  Clock,
  Shield,
  Activity,
  Building,
  Settings,
  RefreshCw,
  ChevronRight,
  Check,
  X,
  Bell
} from "lucide-react";

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalBusinesses: 0,
    pendingVerifications: 0,
    activeBusinesses: 0,
    newUsersThisMonth: 0,
    newBusinessesThisMonth: 0,
    userGrowth: 0
  });
  
  const [recentUsers, setRecentUsers] = useState([]);
  const [recentBusinesses, setRecentBusinesses] = useState([]);
  const [pendingVerifications, setPendingVerifications] = useState([]);
  const [recentActivities, setRecentActivities] = useState([]);
  
  const [loadingStats, setLoadingStats] = useState(false);
  const [loadingRecent, setLoadingRecent] = useState(false);
  const [loadingVerifications, setLoadingVerifications] = useState(false);

  useEffect(() => {
    fetchAdminData();
  }, []);

  const fetchAdminData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        fetchStats(),
        fetchRecentUsers(),
        fetchRecentBusinesses(),
        fetchPendingVerifications(),
        fetchRecentActivities()
      ]);
    } catch (error) {
      console.error("Error fetching admin data:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      setLoadingStats(true);

      // Get total users
      const { count: totalUsers } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true });

      // Get new users this month
      const firstDayOfMonth = new Date();
      firstDayOfMonth.setDate(1);
      firstDayOfMonth.setHours(0, 0, 0, 0);
      
      const { count: newUsersThisMonth } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .gte("created_at", firstDayOfMonth.toISOString());

      // Get total businesses
      const { count: totalBusinesses } = await supabase
        .from("businesses")
        .select("*", { count: "exact", head: true });

      // Get active businesses
      const { count: activeBusinesses } = await supabase
        .from("businesses")
        .select("*", { count: "exact", head: true })
        .eq("status", "active");

      // Get new businesses this month
      const { count: newBusinessesThisMonth } = await supabase
        .from("businesses")
        .select("*", { count: "exact", head: true })
        .gte("created_at", firstDayOfMonth.toISOString());

      // Get pending verifications
      const { count: pendingVerifications } = await supabase
        .from("businesses")
        .select("*", { count: "exact", head: true })
        .eq("verification_status", "pending");

      // Calculate user growth
      const { count: lastMonthUsersCount } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .lt("created_at", firstDayOfMonth.toISOString());
      
      const userGrowth = lastMonthUsersCount > 0 
        ? ((newUsersThisMonth - lastMonthUsersCount) / lastMonthUsersCount) * 100 
        : newUsersThisMonth > 0 ? 100 : 0;

      setStats({
        totalUsers: totalUsers || 0,
        totalBusinesses: totalBusinesses || 0,
        pendingVerifications: pendingVerifications || 0,
        activeBusinesses: activeBusinesses || 0,
        newUsersThisMonth: newUsersThisMonth || 0,
        newBusinessesThisMonth: newBusinessesThisMonth || 0,
        userGrowth: parseFloat(userGrowth.toFixed(1))
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setLoadingStats(false);
    }
  };

  const fetchRecentUsers = async () => {
    try {
      setLoadingRecent(true);
      
      const { data, error } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, email, role, created_at, avatar_url")
        .order("created_at", { ascending: false })
        .limit(5);

      if (error) throw error;

      const users = data?.map(user => ({
        id: user.id,
        name: `${user.first_name || ""} ${user.last_name || ""}`.trim() || "Unknown",
        email: user.email,
        role: user.role || "client",
        joined: formatTimeAgo(user.created_at),
        avatar: user.avatar_url
      })) || [];

      setRecentUsers(users);
    } catch (error) {
      console.error("Error fetching recent users:", error);
    } finally {
      setLoadingRecent(false);
    }
  };

  const fetchRecentBusinesses = async () => {
    try {
      const { data, error } = await supabase
        .from("businesses")
        .select("id, name, owner_name, business_type, created_at, verification_status, emoji")
        .order("created_at", { ascending: false })
        .limit(5);

      if (error) throw error;

      const businesses = data?.map(business => ({
        id: business.id,
        name: business.name,
        owner: business.owner_name,
        type: business.business_type,
        joined: formatTimeAgo(business.created_at),
        status: business.verification_status,
        emoji: business.emoji || "🏢"
      })) || [];

      setRecentBusinesses(businesses);
    } catch (error) {
      console.error("Error fetching recent businesses:", error);
    }
  };

  const fetchPendingVerifications = async () => {
    try {
      setLoadingVerifications(true);
      
      const { data, error } = await supabase
        .from("businesses")
        .select("id, name, owner_name, business_type, created_at, verification_status, emoji")
        .eq("verification_status", "pending")
        .order("created_at", { ascending: false })
        .limit(5);

      if (error) throw error;

      const pending = data?.map(business => ({
        id: business.id,
        name: business.name,
        owner: business.owner_name,
        type: business.business_type,
        requested: formatTimeAgo(business.created_at),
        emoji: business.emoji || "🏢"
      })) || [];

      setPendingVerifications(pending);
    } catch (error) {
      console.error("Error fetching pending verifications:", error);
    } finally {
      setLoadingVerifications(false);
    }
  };

  const fetchRecentActivities = async () => {
    try {
      // Get recent notifications for admin
      const { data, error } = await supabase
        .from("notifications")
        .select("id, type, title, message, created_at, is_read")
        .order("created_at", { ascending: false })
        .limit(5);

      if (error) throw error;

      const activities = data?.map(notification => ({
        id: notification.id,
        action: notification.title || notification.message,
        time: formatTimeAgo(notification.created_at),
        type: notification.type,
        isRead: notification.is_read
      })) || [];

      setRecentActivities(activities);
    } catch (error) {
      console.error("Error fetching activities:", error);
    }
  };

  const formatTimeAgo = (dateString) => {
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
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case "owner":
        return "bg-purple-100 text-purple-700";
      case "admin":
        return "bg-red-100 text-red-700";
      default:
        return "bg-blue-100 text-blue-700";
    }
  };

  const getStatusBadgeColor = (status) => {
    switch (status) {
      case "verified":
        return "bg-green-100 text-green-700";
      case "pending":
        return "bg-yellow-100 text-yellow-700";
      case "rejected":
        return "bg-red-100 text-red-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const handleVerifyBusiness = async (businessId) => {
    try {
      const { error } = await supabase
        .from("businesses")
        .update({
          verification_status: "verified",
          verified_at: new Date().toISOString(),
          verified_by: (await supabase.auth.getUser()).data.user?.id
        })
        .eq("id", businessId);

      if (error) throw error;

      // Refresh data
      await Promise.all([
        fetchStats(),
        fetchPendingVerifications(),
        fetchRecentBusinesses()
      ]);
      
      alert("Business verified successfully!");
    } catch (error) {
      console.error("Error verifying business:", error);
      alert("Failed to verify business");
    }
  };

  const handleRejectBusiness = async (businessId) => {
    const reason = prompt("Please enter reason for rejection:");
    if (!reason) return;

    try {
      const { error } = await supabase
        .from("businesses")
        .update({
          verification_status: "rejected",
          rejection_reason: reason
        })
        .eq("id", businessId);

      if (error) throw error;

      // Refresh data
      await Promise.all([
        fetchStats(),
        fetchPendingVerifications(),
        fetchRecentBusinesses()
      ]);
      
      alert("Business rejected!");
    } catch (error) {
      console.error("Error rejecting business:", error);
      alert("Failed to reject business");
    }
  };

  if (loading) {
    return (
      <AdminSidebarNav>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Loading dashboard...</p>
          </div>
        </div>
      </AdminSidebarNav>
    );
  }

  return (
    <AdminSidebarNav>
      <div className="min-h-screen space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="pt-4"
        >
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-600 mt-1">Manage users, businesses, and platform analytics</p>
        </motion.div>

        {/* Stats Grid - 4 Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Total Users */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-shadow"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <span className="text-sm font-semibold text-green-600 bg-green-100 px-2 py-1 rounded-full">
                +{stats.userGrowth}%
              </span>
            </div>
            <p className="text-3xl font-bold text-gray-900">{stats.totalUsers}</p>
            <p className="text-sm text-gray-600 mt-1">Total Users</p>
            <p className="text-xs text-gray-500 mt-2">+{stats.newUsersThisMonth} this month</p>
          </motion.div>

          {/* Total Businesses */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-shadow"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                <Store className="w-6 h-6 text-purple-600" />
              </div>
            </div>
            <p className="text-3xl font-bold text-gray-900">{stats.totalBusinesses}</p>
            <p className="text-sm text-gray-600 mt-1">Total Businesses</p>
            <p className="text-xs text-gray-500 mt-2">+{stats.newBusinessesThisMonth} this month</p>
          </motion.div>

          {/* Active Businesses */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-shadow"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <Building className="w-6 h-6 text-green-600" />
              </div>
            </div>
            <p className="text-3xl font-bold text-gray-900">{stats.activeBusinesses}</p>
            <p className="text-sm text-gray-600 mt-1">Active Businesses</p>
            <p className="text-xs text-gray-500 mt-2">{Math.round((stats.activeBusinesses / stats.totalBusinesses) * 100)}% of total</p>
          </motion.div>

          {/* Pending Verifications */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-shadow cursor-pointer"
            onClick={() => navigate("/admin/businesses")}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
                <Clock className="w-6 h-6 text-yellow-600" />
              </div>
              {stats.pendingVerifications > 0 && (
                <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full animate-pulse">
                  {stats.pendingVerifications}
                </span>
              )}
            </div>
            <p className="text-3xl font-bold text-gray-900">{stats.pendingVerifications}</p>
            <p className="text-sm text-gray-600 mt-1">Pending Verifications</p>
            <p className="text-xs text-blue-600 mt-2">Click to review →</p>
          </motion.div>
        </div>

        {/* Recent Activity and Pending Verifications Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Users */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-white rounded-2xl shadow-lg overflow-hidden"
          >
            <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-600" />
                  <h3 className="font-semibold text-gray-900">Recent Users</h3>
                </div>
                <button
                  onClick={() => navigate("/admin/users")}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                >
                  View All <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="divide-y divide-gray-100">
              {loadingRecent ? (
                <div className="p-8 text-center">
                  <div className="w-8 h-8 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto" />
                </div>
              ) : recentUsers.length > 0 ? (
                recentUsers.map((user) => (
                  <div key={user.id} className="p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold">
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">{user.name}</p>
                        <p className="text-sm text-gray-500 truncate">{user.email}</p>
                      </div>
                      <div className="text-right">
                        <span className={`text-xs px-2 py-1 rounded-full ${getRoleBadgeColor(user.role)}`}>
                          {user.role}
                        </span>
                        <p className="text-xs text-gray-400 mt-1">{user.joined}</p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-gray-500">
                  No recent users
                </div>
              )}
            </div>
          </motion.div>

          {/* Recent Businesses */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6 }}
            className="bg-white rounded-2xl shadow-lg overflow-hidden"
          >
            <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Store className="w-5 h-5 text-purple-600" />
                  <h3 className="font-semibold text-gray-900">Recent Businesses</h3>
                </div>
                <button
                  onClick={() => navigate("/admin/businesses")}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                >
                  View All <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="divide-y divide-gray-100">
              {recentBusinesses.length > 0 ? (
                recentBusinesses.map((business) => (
                  <div key={business.id} className="p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center text-2xl">
                        {business.emoji}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">{business.name}</p>
                        <p className="text-sm text-gray-500 truncate">by {business.owner}</p>
                      </div>
                      <div className="text-right">
                        <span className={`text-xs px-2 py-1 rounded-full ${getStatusBadgeColor(business.status)}`}>
                          {business.status}
                        </span>
                        <p className="text-xs text-gray-400 mt-1">{business.joined}</p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-gray-500">
                  No recent businesses
                </div>
              )}
            </div>
          </motion.div>

          {/* Recent Activities */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.7 }}
            className="bg-white rounded-2xl shadow-lg overflow-hidden"
          >
            <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-green-600" />
                <h3 className="font-semibold text-gray-900">Recent Activities</h3>
              </div>
            </div>
            <div className="divide-y divide-gray-100 max-h-[400px] overflow-y-auto">
              {recentActivities.length > 0 ? (
                recentActivities.map((activity) => (
                  <div key={activity.id} className="p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                        <Bell className="w-4 h-4 text-gray-600" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-gray-800">{activity.action}</p>
                        <p className="text-xs text-gray-400 mt-1">{activity.time}</p>
                      </div>
                      {!activity.isRead && <div className="w-2 h-2 bg-blue-600 rounded-full"></div>}
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-gray-500">
                  No recent activities
                </div>
              )}
            </div>
          </motion.div>
        </div>

        {/* Pending Verifications Section */}
        {pendingVerifications.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="bg-white rounded-2xl shadow-lg overflow-hidden"
          >
            <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-yellow-50 to-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-yellow-600" />
                  <h3 className="font-semibold text-gray-900">Pending Business Verifications</h3>
                  <span className="bg-yellow-100 text-yellow-700 text-xs px-2 py-1 rounded-full">
                    {pendingVerifications.length}
                  </span>
                </div>
                <button
                  onClick={() => navigate("/admin/businesses")}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  View All
                </button>
              </div>
            </div>
            <div className="divide-y divide-gray-100">
              {loadingVerifications ? (
                <div className="p-8 text-center">
                  <div className="w-8 h-8 border-2 border-yellow-200 border-t-yellow-600 rounded-full animate-spin mx-auto" />
                </div>
              ) : (
                pendingVerifications.map((business) => (
                  <div key={business.id} className="p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-yellow-100 to-orange-100 flex items-center justify-center text-2xl">
                          {business.emoji}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">{business.name}</p>
                          <p className="text-sm text-gray-500">{business.owner} • {business.type}</p>
                          <p className="text-xs text-gray-400 mt-1">Requested {business.requested}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleVerifyBusiness(business.id)}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 text-sm font-medium"
                        >
                          <Check className="w-4 h-4" />
                          Verify
                        </button>
                        <button
                          onClick={() => handleRejectBusiness(business.id)}
                          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2 text-sm font-medium"
                        >
                          <X className="w-4 h-4" />
                          Reject
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9 }}
          className="grid grid-cols-1 md:grid-cols-4 gap-4 pb-8"
        >
          <button
            onClick={() => navigate("/admin/users")}
            className="group p-4 bg-white rounded-xl shadow-lg hover:shadow-xl transition-all text-left border border-gray-100"
          >
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mb-3 group-hover:bg-blue-600 transition-colors">
              <Users className="w-5 h-5 text-blue-600 group-hover:text-white transition-colors" />
            </div>
            <h4 className="font-semibold text-gray-900">Manage Users</h4>
            <p className="text-sm text-gray-500 mt-1">View, edit, and manage user accounts</p>
          </button>

          <button
            onClick={() => navigate("/admin/businesses")}
            className="group p-4 bg-white rounded-xl shadow-lg hover:shadow-xl transition-all text-left border border-gray-100"
          >
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mb-3 group-hover:bg-purple-600 transition-colors">
              <Store className="w-5 h-5 text-purple-600 group-hover:text-white transition-colors" />
            </div>
            <h4 className="font-semibold text-gray-900">Manage Businesses</h4>
            <p className="text-sm text-gray-500 mt-1">Review and verify business applications</p>
          </button>

          <button
            onClick={() => navigate("/admin/settings")}
            className="group p-4 bg-white rounded-xl shadow-lg hover:shadow-xl transition-all text-left border border-gray-100"
          >
            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center mb-3 group-hover:bg-gray-600 transition-colors">
              <Settings className="w-5 h-5 text-gray-600 group-hover:text-white transition-colors" />
            </div>
            <h4 className="font-semibold text-gray-900">Platform Settings</h4>
            <p className="text-sm text-gray-500 mt-1">Configure system settings and preferences</p>
          </button>

          <button
            onClick={() => window.location.reload()}
            className="group p-4 bg-white rounded-xl shadow-lg hover:shadow-xl transition-all text-left border border-gray-100"
          >
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mb-3 group-hover:bg-green-600 transition-colors">
              <RefreshCw className="w-5 h-5 text-green-600 group-hover:text-white transition-colors" />
            </div>
            <h4 className="font-semibold text-gray-900">Refresh Data</h4>
            <p className="text-sm text-gray-500 mt-1">Update dashboard with latest information</p>
          </button>
        </motion.div>
      </div>
    </AdminSidebarNav>
  );
};

export default AdminDashboard;