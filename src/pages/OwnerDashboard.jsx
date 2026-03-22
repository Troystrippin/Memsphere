import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "../lib/supabase";
import OwnerNavbar from "../components/owner/OwnerNavbar";
import { useDarkMode } from "../contexts/DarkModeContext";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Users, Clock, FileText, TrendingUp, UserPlus, 
  Calendar, CheckCircle, XCircle, AlertCircle,
  ArrowRight, Building, CreditCard, Activity,
  BarChart3, Star, Zap, Award, Sparkles,
  Rocket, Target, Trophy, Globe, Heart
} from 'lucide-react';

const OwnerDashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isDarkMode, toggleDarkMode } = useDarkMode();
  const [profile, setProfile] = useState(null);
  const [businesses, setBusinesses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [showWelcomeBanner, setShowWelcomeBanner] = useState(false);
  const [businessVerificationStatus, setBusinessVerificationStatus] = useState({});

  const [stats, setStats] = useState({
    totalMembers: 0,
    pendingRenewals: 0,
    newApplications: 0,
    monthlyRevenue: "0",
  });

  const [recentApplications, setRecentApplications] = useState([]);
  const [clientAvatars, setClientAvatars] = useState({});

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("approved") === "true") {
      setShowWelcomeBanner(true);
      setTimeout(() => setShowWelcomeBanner(false), 5000);
    }
  }, [location]);

  useEffect(() => {
    fetchOwnerData();
  }, []);

  const fetchOwnerData = async () => {
    try {
      setLoading(true);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;

      if (!user) {
        navigate("/login");
        return;
      }

      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (profileError) throw profileError;

      if (profileData?.role !== "owner") {
        navigate("/ClientDashboard");
        return;
      }

      setProfile(profileData);

      if (profileData?.avatar_url) {
        downloadAvatar(profileData.avatar_url);
      }

      const { data: businessesData, error: businessesError } = await supabase
        .from("businesses")
        .select("*")
        .eq("owner_id", user.id);

      if (businessesError) throw businessesError;

      setBusinesses(businessesData || []);

      const verificationStatus = {};
      businessesData?.forEach((b) => {
        verificationStatus[b.id] = b.verification_status;
      });
      setBusinessVerificationStatus(verificationStatus);

      if (businessesData && businessesData.length > 0) {
        const businessIds = businessesData.map((b) => b.id);
        await fetchBusinessStats(businessIds);
        await fetchRecentApplications(businessIds);
      }
    } catch (err) {
      console.error("Error fetching owner data:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getClientAvatarUrl = async (avatarPath, userId) => {
    if (!avatarPath) return null;

    if (clientAvatars[userId]) {
      return clientAvatars[userId];
    }

    try {
      const { data: publicUrlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(avatarPath);

      if (publicUrlData?.publicUrl) {
        try {
          const response = await fetch(publicUrlData.publicUrl, {
            method: "HEAD",
          });
          if (response.ok) {
            setClientAvatars((prev) => ({
              ...prev,
              [userId]: publicUrlData.publicUrl,
            }));
            return publicUrlData.publicUrl;
          }
        } catch (e) {
          console.log("Public URL not accessible, trying download...");
        }
      }

      const { data, error } = await supabase.storage
        .from("avatars")
        .download(avatarPath);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      setClientAvatars((prev) => ({ ...prev, [userId]: url }));
      return url;
    } catch (error) {
      console.error("Error getting client avatar:", error);
      return null;
    }
  };

  const fetchBusinessStats = async (businessIds) => {
    try {
      const { count: totalMembers } = await supabase
        .from("memberships")
        .select("*", { count: "exact", head: true })
        .in("business_id", businessIds)
        .eq("status", "approved");

      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);

      const { count: pendingRenewals } = await supabase
        .from("memberships")
        .select("*", { count: "exact", head: true })
        .in("business_id", businessIds)
        .eq("status", "approved")
        .lte("end_date", nextWeek.toISOString())
        .gte("end_date", new Date().toISOString());

      const { count: newApplications } = await supabase
        .from("memberships")
        .select("*", { count: "exact", head: true })
        .in("business_id", businessIds)
        .eq("status", "pending");

      const firstDayOfMonth = new Date();
      firstDayOfMonth.setDate(1);
      firstDayOfMonth.setHours(0, 0, 0, 0);

      const lastDayOfMonth = new Date();
      lastDayOfMonth.setMonth(lastDayOfMonth.getMonth() + 1);
      lastDayOfMonth.setDate(0);
      lastDayOfMonth.setHours(23, 59, 59, 999);

      const { data: monthlyApprovals } = await supabase
        .from("memberships")
        .select("price_paid")
        .in("business_id", businessIds)
        .eq("status", "approved")
        .gte("created_at", firstDayOfMonth.toISOString())
        .lte("created_at", lastDayOfMonth.toISOString());

      const { data: monthlyPayments } = await supabase
        .from("payments")
        .select("amount")
        .in("business_id", businessIds)
        .eq("payment_status", "paid")
        .gte("paid_at", firstDayOfMonth.toISOString())
        .lte("paid_at", lastDayOfMonth.toISOString());

      const membershipRevenue =
        monthlyApprovals?.reduce((sum, m) => sum + (m.price_paid || 0), 0) || 0;
      const paymentRevenue =
        monthlyPayments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;
      const totalMonthlyRevenue = membershipRevenue + paymentRevenue;

      setStats({
        totalMembers: totalMembers || 0,
        pendingRenewals: pendingRenewals || 0,
        newApplications: newApplications || 0,
        monthlyRevenue: totalMonthlyRevenue.toLocaleString("en-US", {
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        }),
      });
    } catch (error) {
      console.error("Error fetching business stats:", error);
    }
  };

  const fetchRecentApplications = async (businessIds) => {
    try {
      const { data: memberships } = await supabase
        .from("memberships")
        .select(
          `
          id,
          status,
          price_paid,
          payment_method,
          payment_status,
          created_at,
          user_id,
          profiles:user_id (
            id,
            first_name,
            last_name,
            email,
            avatar_url
          ),
          plans:plan_id (
            name,
            duration
          ),
          business:business_id (
            id,
            name,
            verification_status
          )
        `
        )
        .in("business_id", businessIds)
        .order("created_at", { ascending: false })
        .limit(5);

      const processedApplications = await Promise.all(
        (memberships || []).map(async (app) => {
          let avatarUrl = null;
          if (app.profiles?.avatar_url) {
            avatarUrl = await getClientAvatarUrl(
              app.profiles.avatar_url,
              app.profiles.id
            );
          }

          const timeAgo = getTimeAgo(new Date(app.created_at));

          return {
            id: app.id,
            name: app.profiles
              ? `${app.profiles.first_name || ""} ${app.profiles.last_name || ""}`.trim() ||
                app.profiles.email?.split("@")[0] ||
                "Unknown User"
              : "Unknown User",
            email: app.profiles?.email || "No email",
            plan: app.plans?.name || "Standard Plan",
            amount: `₱${app.price_paid?.toLocaleString() || "0"}`,
            status: app.status,
            paymentMethod: app.payment_method,
            timeAgo: timeAgo,
            avatarUrl: avatarUrl,
            businessName: app.business?.name || "Unknown Business",
            businessVerification: app.business?.verification_status || "pending",
          };
        })
      );

      setRecentApplications(processedApplications);
    } catch (error) {
      console.error("Error fetching recent applications:", error);
    }
  };

  const getTimeAgo = (date) => {
    const seconds = Math.floor((new Date() - date) / 1000);

    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + " years ago";

    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + " months ago";

    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + " days ago";

    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + " hours ago";

    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + " minutes ago";

    return Math.floor(seconds) + " seconds ago";
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

  const getFirstName = () => {
    if (profile?.first_name) {
      return profile.first_name;
    }
    return "Owner";
  };

  const getInitials = (firstName, lastName) => {
    return `${firstName?.charAt(0) || ""}${lastName?.charAt(0) || ""}`.toUpperCase();
  };

  const handleViewApplication = (appId) => {
    navigate("/applications", { state: { highlightId: appId } });
  };

  if (loading) {
    return (
      <div className={`h-screen w-full flex items-center justify-center select-none ${
        isDarkMode ? 'bg-gray-900' : 'bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50'
      }`}>
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className={`text-lg font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`h-screen w-full flex items-center justify-center p-4 select-none ${
        isDarkMode ? 'bg-gray-900' : 'bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50'
      }`}>
        <div className={`rounded-2xl shadow-xl p-8 max-w-md text-center ${
          isDarkMode ? 'bg-gray-800' : 'bg-white'
        }`}>
          <div className="text-6xl mb-4">❌</div>
          <h2 className={`text-2xl font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>Error Loading Dashboard</h2>
          <p className={`mb-6 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{error}</p>
          <button
            onClick={() => supabase.auth.signOut()}
            className="px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-medium cursor-pointer select-none"
          >
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  const firstName = getFirstName();

  return (
    <div className={`min-h-screen w-full transition-colors duration-300 select-none ${
      isDarkMode ? 'bg-gray-900' : 'bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50'
    }`}>
      <OwnerNavbar 
        profile={profile} 
        avatarUrl={avatarUrl}
        isDarkMode={isDarkMode}
        toggleDarkMode={toggleDarkMode}
      />
      
      {/* Main Content */}
      <div className="w-full pt-20">
        <div className="w-full px-6 md:px-8 lg:px-10 xl:px-12 2xl:px-16 py-6 md:py-8">
          {/* Welcome Banner */}
          <AnimatePresence>
            {showWelcomeBanner && (
              <motion.div
                initial={{ opacity: 0, y: -20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.95 }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
                className="mb-6 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl p-5 flex items-center justify-between shadow-lg select-none"
              >
                <div className="flex items-center gap-4">
                  <motion.div 
                    className="text-3xl"
                    animate={{ rotate: [0, 10, -10, 0] }}
                    transition={{ duration: 0.5, repeat: 2 }}
                  >
                    🎉
                  </motion.div>
                  <div>
                    <h3 className="font-bold text-white text-lg">Welcome to Owner Dashboard!</h3>
                    <p className="text-green-50 text-sm">Your business application has been approved. Start managing your business now.</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowWelcomeBanner(false)}
                  className="text-white hover:bg-white/20 rounded-full w-8 h-8 flex items-center justify-center transition-all hover:scale-110 cursor-pointer select-none"
                >
                  ×
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Verification Banner */}
          {Object.values(businessVerificationStatus).some(status => status === "pending") && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="mb-6 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-xl p-5 flex items-center gap-4 shadow-lg select-none"
            >
              <motion.div 
                className="text-2xl"
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
              >
                ⏳
              </motion.div>
              <div className="flex-1">
                <h4 className="font-semibold text-white">Business Verification Pending</h4>
                <p className="text-yellow-50 text-sm">Some businesses are pending admin verification. Features may be limited until verified.</p>
              </div>
            </motion.div>
          )}

          {/* Header Section */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 200, damping: 20 }}
            className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-8 select-none"
          >
            <div>
              <motion.h1 
                className={`text-3xl md:text-4xl font-bold ${
                  isDarkMode 
                    ? 'text-white' 
                    : 'bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent'
                }`}
                whileHover={{ scale: 1.02 }}
                transition={{ type: "spring", stiffness: 400 }}
              >
                Owner Dashboard
              </motion.h1>
              <motion.p 
                className={`mt-1 flex items-center gap-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                <BarChart3 className={`w-4 h-4 ${isDarkMode ? 'text-blue-400' : 'text-blue-500'} animate-pulse`} />
                Manage your business and members
              </motion.p>
            </div>
            <motion.div 
              className={`flex items-center gap-3 rounded-full px-5 py-2.5 shadow-md hover:shadow-lg transition-all select-none ${
                isDarkMode ? 'bg-gray-800' : 'bg-white'
              }`}
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
            >
              <motion.span 
                className="text-2xl"
                animate={{ rotate: [0, 15, -10, 5, 0] }}
                transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
              >
                👋
              </motion.span>
              <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Welcome back,</span>
              <span className={`font-semibold text-lg ${
                isDarkMode 
                  ? 'text-blue-400' 
                  : 'bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent'
              }`}>
                {firstName}
              </span>
            </motion.div>
          </motion.div>

          {/* Stats Cards - FIXED: All text now properly visible in dark mode */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 select-none">
            {/* Total Members */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ delay: 0.1, type: "spring" }}
              whileHover={{ 
                scale: 1.05, 
                y: -5,
                transition: { type: "spring", stiffness: 400 }
              }}
              className={`rounded-2xl shadow-lg p-6 border cursor-default transition-all ${
                isDarkMode 
                  ? 'bg-gray-800 border-gray-700' 
                  : 'bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200'
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                <motion.div 
                  className={`w-14 h-14 rounded-xl flex items-center justify-center shadow-md ${
                    isDarkMode ? 'bg-gray-700' : 'bg-white'
                  }`}
                  whileHover={{ rotate: 5, scale: 1.1 }}
                  transition={{ type: "spring", stiffness: 400 }}
                >
                  <Users className={`w-7 h-7 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                </motion.div>
                <motion.div 
                  className={`text-sm font-semibold px-2 py-1 rounded-full ${
                    isDarkMode 
                      ? 'bg-blue-900/50 text-blue-300' 
                      : 'bg-blue-100 text-blue-600'
                  }`}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3 }}
                >
                  +12% this month
                </motion.div>
              </div>
              <div>
                <motion.p 
                  className={`text-3xl font-bold ${isDarkMode ? 'text-blue-400' : 'text-gray-800'}`}
                  initial={{ scale: 0.5 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: "spring" }}
                >
                  {stats.totalMembers}
                </motion.p>
                <p className={`text-sm mt-1 font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Total Members</p>
              </div>
            </motion.div>

            {/* Pending Renewals */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ delay: 0.2, type: "spring" }}
              whileHover={{ 
                scale: 1.05, 
                y: -5,
                transition: { type: "spring", stiffness: 400 }
              }}
              className={`rounded-2xl shadow-lg p-6 border cursor-default transition-all ${
                isDarkMode 
                  ? 'bg-gray-800 border-gray-700' 
                  : 'bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200'
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                <motion.div 
                  className={`w-14 h-14 rounded-xl flex items-center justify-center shadow-md ${
                    isDarkMode ? 'bg-gray-700' : 'bg-white'
                  }`}
                  whileHover={{ rotate: -5, scale: 1.1 }}
                  transition={{ type: "spring", stiffness: 400 }}
                >
                  <Clock className={`w-7 h-7 ${isDarkMode ? 'text-orange-400' : 'text-orange-600'}`} />
                </motion.div>
              </div>
              <div>
                <p className={`text-3xl font-bold ${isDarkMode ? 'text-orange-400' : 'text-gray-800'}`}>{stats.pendingRenewals}</p>
                <p className={`text-sm mt-1 font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Pending Renewals</p>
              </div>
            </motion.div>

            {/* New Applications */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ delay: 0.3, type: "spring" }}
              whileHover={{ 
                scale: 1.05, 
                y: -5,
                transition: { type: "spring", stiffness: 400 }
              }}
              className={`rounded-2xl shadow-lg p-6 border relative cursor-default transition-all ${
                isDarkMode 
                  ? 'bg-gray-800 border-gray-700' 
                  : 'bg-gradient-to-br from-red-50 to-red-100 border-red-200'
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                <motion.div 
                  className={`w-14 h-14 rounded-xl flex items-center justify-center shadow-md ${
                    isDarkMode ? 'bg-gray-700' : 'bg-white'
                  }`}
                  whileHover={{ rotate: 5, scale: 1.1 }}
                  transition={{ type: "spring", stiffness: 400 }}
                >
                  <FileText className={`w-7 h-7 ${isDarkMode ? 'text-red-400' : 'text-red-600'}`} />
                </motion.div>
                {stats.newApplications > 0 && (
                  <motion.span 
                    className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full"
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 1, repeat: Infinity }}
                  >
                    {stats.newApplications} New
                  </motion.span>
                )}
              </div>
              <div>
                <p className={`text-3xl font-bold ${isDarkMode ? 'text-red-400' : 'text-gray-800'}`}>{stats.newApplications}</p>
                <p className={`text-sm mt-1 font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>New Applications</p>
              </div>
            </motion.div>

            {/* Monthly Revenue */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ delay: 0.4, type: "spring" }}
              whileHover={{ 
                scale: 1.05, 
                y: -5,
                transition: { type: "spring", stiffness: 400 }
              }}
              className={`rounded-2xl shadow-lg p-6 border cursor-default transition-all ${
                isDarkMode 
                  ? 'bg-gray-800 border-gray-700' 
                  : 'bg-gradient-to-br from-green-50 to-green-100 border-green-200'
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                <motion.div 
                  className={`w-14 h-14 rounded-xl flex items-center justify-center shadow-md ${
                    isDarkMode ? 'bg-gray-700' : 'bg-white'
                  }`}
                  whileHover={{ rotate: -5, scale: 1.1 }}
                  transition={{ type: "spring", stiffness: 400 }}
                >
                  <TrendingUp className={`w-7 h-7 ${isDarkMode ? 'text-green-400' : 'text-green-600'}`} />
                </motion.div>
              </div>
              <div>
                <motion.p 
                  className={`text-3xl font-bold ${isDarkMode ? 'text-green-400' : 'text-gray-800'}`}
                  initial={{ scale: 0.5 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.5, type: "spring" }}
                >
                  ₱{stats.monthlyRevenue}
                </motion.p>
                <p className={`text-sm mt-1 font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Monthly Revenue</p>
              </div>
            </motion.div>
          </div>

          {/* Recent Applications Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className={`rounded-2xl shadow-lg mb-8 overflow-hidden border ${
              isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
            } select-none`}
          >
            <div className={`px-6 py-5 border-b flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 ${
              isDarkMode 
                ? 'bg-gray-700/50 border-gray-600' 
                : 'bg-gradient-to-r from-gray-50 to-white border-gray-200'
            }`}>
              <div>
                <h3 className={`text-xl font-bold flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                  <motion.span
                    animate={{ rotate: [0, 5, -5, 0] }}
                    transition={{ duration: 1, repeat: Infinity, repeatDelay: 3 }}
                  >
                    📋
                  </motion.span>
                  Recent Applications
                </h3>
                <p className={`text-sm mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Latest membership requests</p>
              </div>
              <motion.button
                onClick={() => navigate("/applications")}
                className={`font-medium inline-flex items-center gap-2 transition-all cursor-pointer select-none ${
                  isDarkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'
                }`}
                whileHover={{ gap: "0.75rem", x: 3 }}
                whileTap={{ scale: 0.95 }}
              >
                View All Applications <ArrowRight className="w-4 h-4" />
              </motion.button>
            </div>

            {recentApplications.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px]">
                  <thead className={`border-b ${isDarkMode ? 'bg-gray-700/50 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
                    <tr className="select-none">
                      <th className={`px-6 py-4 text-center text-xs font-semibold uppercase tracking-wider ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>Applicant</th>
                      <th className={`px-6 py-4 text-center text-xs font-semibold uppercase tracking-wider ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>Plan</th>
                      <th className={`px-6 py-4 text-center text-xs font-semibold uppercase tracking-wider ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>Amount</th>
                      <th className={`px-6 py-4 text-center text-xs font-semibold uppercase tracking-wider ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>Business</th>
                      <th className={`px-6 py-4 text-center text-xs font-semibold uppercase tracking-wider ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>Status</th>
                      <th className={`px-6 py-4 text-center text-xs font-semibold uppercase tracking-wider ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>Time</th>
                      <th className={`px-6 py-4 text-center text-xs font-semibold uppercase tracking-wider ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}></th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${isDarkMode ? 'divide-gray-700' : 'divide-gray-100'}`}>
                    {recentApplications.map((app, index) => (
                      <motion.tr
                        key={app.id}
                        onClick={() => handleViewApplication(app.id)}
                        className={`transition-colors group cursor-pointer select-none ${isDarkMode ? 'hover:bg-gray-700/50' : 'hover:bg-gray-50'}`}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        whileHover={{ scale: 1.01 }}
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-center gap-3">
                            <motion.div 
                              className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm shadow-md flex-shrink-0 select-none"
                              whileHover={{ scale: 1.1, rotate: 5 }}
                              transition={{ type: "spring", stiffness: 400 }}
                            >
                              {app.avatarUrl ? (
                                <img src={app.avatarUrl} alt={app.name} className="w-full h-full rounded-xl object-cover" />
                              ) : (
                                <span>{getInitials(app.name.split(" ")[0], app.name.split(" ")[1])}</span>
                              )}
                            </motion.div>
                            <div className="text-left">
                              <div className={`font-semibold transition-colors select-none ${isDarkMode ? 'text-gray-200 group-hover:text-blue-400' : 'text-gray-800 group-hover:text-blue-600'}`}>
                                {app.name}
                              </div>
                              <div className={`text-xs mt-0.5 select-none ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{app.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <motion.span 
                            className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium select-none ${
                              isDarkMode 
                                ? 'bg-blue-900/30 text-blue-300 border border-blue-800' 
                                : 'bg-blue-50 text-blue-700 border border-blue-100'
                            }`}
                            whileHover={{ scale: 1.05 }}
                          >
                            {app.plan}
                          </motion.span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`font-semibold select-none ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>{app.amount}</span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className={`flex items-center justify-center gap-1.5 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                            <Building className="w-3 h-3" />
                            <span className="text-sm select-none">{app.businessName}</span>
                            {app.businessVerification === "pending" && (
                              <AlertCircle className="w-3 h-3 text-yellow-500" title="Pending verification" />
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <motion.span 
                            className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium select-none ${
                              app.status === "pending" 
                                ? isDarkMode ? 'bg-yellow-900/30 text-yellow-300 border border-yellow-800' : 'bg-yellow-50 text-yellow-700 border border-yellow-200'
                                : app.status === "approved" 
                                ? isDarkMode ? 'bg-green-900/30 text-green-300 border border-green-800' : 'bg-green-50 text-green-700 border border-green-200'
                                : isDarkMode ? 'bg-red-900/30 text-red-300 border border-red-800' : 'bg-red-50 text-red-700 border border-red-200'
                            }`}
                            whileHover={{ scale: 1.05 }}
                          >
                            {app.status === "pending" && <Clock className="w-3 h-3 mr-1" />}
                            {app.status === "approved" && <CheckCircle className="w-3 h-3 mr-1" />}
                            {app.status === "rejected" && <XCircle className="w-3 h-3 mr-1" />}
                            {app.status === "pending" ? "Pending" : app.status === "approved" ? "Approved" : "Rejected"}
                          </motion.span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className={`flex items-center justify-center gap-1.5 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            <Calendar className="w-3 h-3" /> <span className="select-none">{app.timeAgo}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <motion.button
                            onClick={(e) => { e.stopPropagation(); handleViewApplication(app.id); }}
                            className={`font-medium text-sm transition-all inline-flex items-center gap-1 cursor-pointer select-none ${
                              isDarkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'
                            }`}
                            whileHover={{ x: 3, gap: "0.5rem" }}
                            whileTap={{ scale: 0.95 }}
                          >
                            View <ArrowRight className="w-3 h-3" />
                          </motion.button>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className={`text-center py-16 select-none ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                <div className="text-7xl mb-4 opacity-50">📋</div>
                <h3 className={`text-lg font-semibold mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-800'}`}>No Recent Applications</h3>
                <p className="mb-6">When customers apply for memberships, they'll appear here</p>
                <motion.button
                  onClick={() => navigate("/applications")}
                  className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:shadow-lg transition-all font-medium cursor-pointer select-none"
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Go to Applications
                </motion.button>
              </div>
            )}
          </motion.div>

          {/* Quick Actions Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className={`rounded-2xl shadow-lg overflow-hidden border ${
              isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
            } select-none`}
          >
            <div className={`px-6 py-5 border-b ${
              isDarkMode 
                ? 'bg-gray-700/50 border-gray-600' 
                : 'bg-gradient-to-r from-gray-50 to-white border-gray-200'
            }`}>
              <h3 className={`text-xl font-bold flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                <motion.div
                  animate={{ rotate: [0, 10, -10, 0] }}
                  transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 3 }}
                >
                  <Zap className="w-5 h-5 text-yellow-500" />
                </motion.div>
                Quick Actions
              </h3>
              <p className={`text-sm mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Manage your business efficiently</p>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {/* View Members */}
                <motion.div 
                  onClick={() => navigate("/members")}
                  className={`group flex items-start gap-4 p-5 rounded-xl border cursor-pointer select-none transition-all ${
                    isDarkMode 
                      ? 'bg-gray-700/50 border-gray-600 hover:bg-gray-700' 
                      : 'bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-100 hover:shadow-lg'
                  }`}
                  whileHover={{ 
                    scale: 1.02, 
                    y: -5,
                    boxShadow: isDarkMode ? "0 20px 25px -5px rgba(0, 0, 0, 0.3)" : "0 20px 25px -5px rgba(0, 0, 0, 0.1)"
                  }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ type: "spring", stiffness: 400 }}
                >
                  <motion.div 
                    className="text-3xl"
                    whileHover={{ scale: 1.2, rotate: 5 }}
                    transition={{ type: "spring", stiffness: 400 }}
                  >
                    <Users className={`w-8 h-8 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                  </motion.div>
                  <div className="flex-1">
                    <h4 className={`font-semibold mb-1 transition-colors select-none ${isDarkMode ? 'text-gray-200 group-hover:text-blue-400' : 'text-gray-800 group-hover:text-blue-600'}`}>
                      View Members
                    </h4>
                    <p className={`text-sm select-none ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Manage your active members and their memberships</p>
                    <motion.div 
                      className={`mt-3 flex items-center text-sm font-medium gap-1 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}
                      whileHover={{ x: 5 }}
                    >
                      Go to Members <ArrowRight className="w-3 h-3" />
                    </motion.div>
                  </div>
                </motion.div>

                {/* Review Applications */}
                <motion.div 
                  onClick={() => navigate("/applications")}
                  className={`group flex items-start gap-4 p-5 rounded-xl border cursor-pointer select-none transition-all ${
                    isDarkMode 
                      ? 'bg-gray-700/50 border-gray-600 hover:bg-gray-700' 
                      : 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-100 hover:shadow-lg'
                  }`}
                  whileHover={{ 
                    scale: 1.02, 
                    y: -5,
                    boxShadow: isDarkMode ? "0 20px 25px -5px rgba(0, 0, 0, 0.3)" : "0 20px 25px -5px rgba(0, 0, 0, 0.1)"
                  }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ type: "spring", stiffness: 400 }}
                >
                  <motion.div 
                    className="text-3xl"
                    whileHover={{ scale: 1.2, rotate: -5 }}
                    transition={{ type: "spring", stiffness: 400 }}
                  >
                    <FileText className={`w-8 h-8 ${isDarkMode ? 'text-green-400' : 'text-green-600'}`} />
                  </motion.div>
                  <div className="flex-1">
                    <h4 className={`font-semibold mb-1 transition-colors select-none ${isDarkMode ? 'text-gray-200 group-hover:text-green-400' : 'text-gray-800 group-hover:text-green-600'}`}>
                      Review Applications
                    </h4>
                    <p className={`text-sm select-none ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Review and process new membership applications</p>
                    {stats.newApplications > 0 && (
                      <motion.div 
                        className="mt-2"
                        animate={{ scale: [1, 1.05, 1] }}
                        transition={{ duration: 1, repeat: Infinity }}
                      >
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-500 text-white select-none">
                          {stats.newApplications} pending
                        </span>
                      </motion.div>
                    )}
                    <motion.div 
                      className={`mt-3 flex items-center text-sm font-medium gap-1 ${isDarkMode ? 'text-green-400' : 'text-green-600'}`}
                      whileHover={{ x: 5 }}
                    >
                      Review Now <ArrowRight className="w-3 h-3" />
                    </motion.div>
                  </div>
                </motion.div>

                {/* View Analytics */}
                <motion.div 
                  onClick={() => navigate("/analytics")}
                  className={`group flex items-start gap-4 p-5 rounded-xl border cursor-pointer select-none transition-all ${
                    isDarkMode 
                      ? 'bg-gray-700/50 border-gray-600 hover:bg-gray-700' 
                      : 'bg-gradient-to-br from-purple-50 to-pink-50 border-purple-100 hover:shadow-lg'
                  }`}
                  whileHover={{ 
                    scale: 1.02, 
                    y: -5,
                    boxShadow: isDarkMode ? "0 20px 25px -5px rgba(0, 0, 0, 0.3)" : "0 20px 25px -5px rgba(0, 0, 0, 0.1)"
                  }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ type: "spring", stiffness: 400 }}
                >
                  <motion.div 
                    className="text-3xl"
                    whileHover={{ scale: 1.2, rotate: 5 }}
                    transition={{ type: "spring", stiffness: 400 }}
                  >
                    <BarChart3 className={`w-8 h-8 ${isDarkMode ? 'text-purple-400' : 'text-purple-600'}`} />
                  </motion.div>
                  <div className="flex-1">
                    <h4 className={`font-semibold mb-1 transition-colors select-none ${isDarkMode ? 'text-gray-200 group-hover:text-purple-400' : 'text-gray-800 group-hover:text-purple-600'}`}>
                      View Analytics
                    </h4>
                    <p className={`text-sm select-none ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Track your business performance and growth</p>
                    <motion.div 
                      className={`mt-3 flex items-center text-sm font-medium gap-1 ${isDarkMode ? 'text-purple-400' : 'text-purple-600'}`}
                      whileHover={{ x: 5 }}
                    >
                      View Insights <ArrowRight className="w-3 h-3" />
                    </motion.div>
                  </div>
                </motion.div>

                {/* Edit Business */}
                <motion.div 
                  onClick={() => navigate("/my-business")}
                  className={`group flex items-start gap-4 p-5 rounded-xl border cursor-pointer select-none transition-all ${
                    isDarkMode 
                      ? 'bg-gray-700/50 border-gray-600 hover:bg-gray-700' 
                      : 'bg-gradient-to-br from-orange-50 to-amber-50 border-orange-100 hover:shadow-lg'
                  }`}
                  whileHover={{ 
                    scale: 1.02, 
                    y: -5,
                    boxShadow: isDarkMode ? "0 20px 25px -5px rgba(0, 0, 0, 0.3)" : "0 20px 25px -5px rgba(0, 0, 0, 0.1)"
                  }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ type: "spring", stiffness: 400 }}
                >
                  <motion.div 
                    className="text-3xl"
                    whileHover={{ scale: 1.2, rotate: -5 }}
                    transition={{ type: "spring", stiffness: 400 }}
                  >
                    <Building className={`w-8 h-8 ${isDarkMode ? 'text-orange-400' : 'text-orange-600'}`} />
                  </motion.div>
                  <div className="flex-1">
                    <h4 className={`font-semibold mb-1 transition-colors select-none ${isDarkMode ? 'text-gray-200 group-hover:text-orange-400' : 'text-gray-800 group-hover:text-orange-600'}`}>
                      Edit Business
                    </h4>
                    <p className={`text-sm select-none ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Update your business information and settings</p>
                    <motion.div 
                      className={`mt-3 flex items-center text-sm font-medium gap-1 ${isDarkMode ? 'text-orange-400' : 'text-orange-600'}`}
                      whileHover={{ x: 5 }}
                    >
                      Edit Now <ArrowRight className="w-3 h-3" />
                    </motion.div>
                  </div>
                </motion.div>

                {/* Manage Plans */}
                <motion.div 
                  onClick={() => navigate("/my-business?tab=plans")}
                  className={`group flex items-start gap-4 p-5 rounded-xl border cursor-pointer select-none transition-all ${
                    isDarkMode 
                      ? 'bg-gray-700/50 border-gray-600 hover:bg-gray-700' 
                      : 'bg-gradient-to-br from-cyan-50 to-blue-50 border-cyan-100 hover:shadow-lg'
                  }`}
                  whileHover={{ 
                    scale: 1.02, 
                    y: -5,
                    boxShadow: isDarkMode ? "0 20px 25px -5px rgba(0, 0, 0, 0.3)" : "0 20px 25px -5px rgba(0, 0, 0, 0.1)"
                  }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ type: "spring", stiffness: 400 }}
                >
                  <motion.div 
                    className="text-3xl"
                    whileHover={{ scale: 1.2, rotate: 5 }}
                    transition={{ type: "spring", stiffness: 400 }}
                  >
                    <Award className={`w-8 h-8 ${isDarkMode ? 'text-cyan-400' : 'text-cyan-600'}`} />
                  </motion.div>
                  <div className="flex-1">
                    <h4 className={`font-semibold mb-1 transition-colors select-none ${isDarkMode ? 'text-gray-200 group-hover:text-cyan-400' : 'text-gray-800 group-hover:text-cyan-600'}`}>
                      Manage Plans
                    </h4>
                    <p className={`text-sm select-none ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Create and manage membership plans</p>
                    <motion.div 
                      className={`mt-3 flex items-center text-sm font-medium gap-1 ${isDarkMode ? 'text-cyan-400' : 'text-cyan-600'}`}
                      whileHover={{ x: 5 }}
                    >
                      Manage Plans <ArrowRight className="w-3 h-3" />
                    </motion.div>
                  </div>
                </motion.div>

                {/* View Payments */}
                <motion.div 
                  onClick={() => navigate("/payments")}
                  className={`group flex items-start gap-4 p-5 rounded-xl border cursor-pointer select-none transition-all ${
                    isDarkMode 
                      ? 'bg-gray-700/50 border-gray-600 hover:bg-gray-700' 
                      : 'bg-gradient-to-br from-teal-50 to-green-50 border-teal-100 hover:shadow-lg'
                  }`}
                  whileHover={{ 
                    scale: 1.02, 
                    y: -5,
                    boxShadow: isDarkMode ? "0 20px 25px -5px rgba(0, 0, 0, 0.3)" : "0 20px 25px -5px rgba(0, 0, 0, 0.1)"
                  }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ type: "spring", stiffness: 400 }}
                >
                  <motion.div 
                    className="text-3xl"
                    whileHover={{ scale: 1.2, rotate: -5 }}
                    transition={{ type: "spring", stiffness: 400 }}
                  >
                    <CreditCard className={`w-8 h-8 ${isDarkMode ? 'text-teal-400' : 'text-teal-600'}`} />
                  </motion.div>
                  <div className="flex-1">
                    <h4 className={`font-semibold mb-1 transition-colors select-none ${isDarkMode ? 'text-gray-200 group-hover:text-teal-400' : 'text-gray-800 group-hover:text-teal-600'}`}>
                      View Payments
                    </h4>
                    <p className={`text-sm select-none ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Track and manage payment transactions</p>
                    <motion.div 
                      className={`mt-3 flex items-center text-sm font-medium gap-1 ${isDarkMode ? 'text-teal-400' : 'text-teal-600'}`}
                      whileHover={{ x: 5 }}
                    >
                      View Transactions <ArrowRight className="w-3 h-3" />
                    </motion.div>
                  </div>
                </motion.div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Custom Animations */}
      <style jsx>{`
        @keyframes slide-down {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .animate-slide-down {
          animation: slide-down 0.5s ease-out;
        }
        
        @keyframes wave {
          0%, 100% { transform: rotate(0deg); }
          10% { transform: rotate(14deg); }
          20% { transform: rotate(-8deg); }
          30% { transform: rotate(14deg); }
          40% { transform: rotate(-4deg); }
          50% { transform: rotate(10deg); }
          60% { transform: rotate(0deg); }
        }
        
        .animate-wave {
          animation: wave 2.5s infinite;
          display: inline-block;
        }
        
        @keyframes bounce {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }
        
        .animate-bounce {
          animation: bounce 1s ease;
        }
        
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
        
        .animate-pulse {
          animation: pulse 1.5s infinite;
        }
      `}</style>
    </div>
  );
};

export default OwnerDashboard;