import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import ClientNavbar from "../components/client/ClientNavbar";
import { useTheme } from "../contexts/ThemeContext";
import { motion } from "framer-motion";
import {
  ChevronRight,
  Compass,
  Crown,
  CheckCircle,
  XCircle,
  Clock,
  Calendar,
  Award,
  TrendingUp,
  Heart,
  Bookmark,
  Star,
  Users,
  MapPin,
  Plus,
} from "lucide-react";

const ClientDashboard = () => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [memberships, setMemberships] = useState([]);
  const [loadingMemberships, setLoadingMemberships] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState({});
  const [recommendedBusinesses, setRecommendedBusinesses] = useState([]);
  const [loadingRecommendations, setLoadingRecommendations] = useState(false);
  const [sortBy, setSortBy] = useState("expiry");

  const { isDarkMode } = useTheme();
  const navigate = useNavigate();

  useEffect(() => {
    console.log("ClientDashboard mounted");
    checkUser();
  }, []);

  useEffect(() => {
    if (memberships.length > 0) {
      const timer = setInterval(() => {
        updateTimeRemaining();
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [memberships]);

  const checkUser = async () => {
    try {
      console.log("Checking user in ClientDashboard");
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error) {
        console.error("Error getting user:", error);
        throw error;
      }

      if (!user) {
        console.log("No user found, redirecting to login");
        navigate("/login", { replace: true });
        return;
      }

      console.log("User found:", user.id);
      setUser(user);
      await getUserData(user);
    } catch (error) {
      console.error("Error checking user:", error);
      navigate("/login", { replace: true });
    }
  };

  const getUserData = async (user) => {
    try {
      console.log("Fetching profile for user:", user.id);

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select(
          "id, first_name, last_name, email, role, avatar_url, created_at, updated_at",
        )
        .eq("id", user.id)
        .single();

      if (profileError) {
        console.error("Error fetching profile:", profileError);
      }

      console.log("Profile data:", profile);
      setProfile(profile);

      if (profile?.avatar_url) {
        downloadAvatar(profile.avatar_url);
      }

      await fetchMemberships(user.id);
      await fetchRecommendedBusinesses();
    } catch (error) {
      console.error("Error fetching user data:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMemberships = async (userId) => {
    try {
      setLoadingMemberships(true);
      console.log("Fetching memberships for user:", userId);

      const { data, error } = await supabase
        .from("memberships")
        .select(
          `
          id,
          created_at,
          start_date,
          end_date,
          status,
          price_paid,
          payment_status,
          businesses:business_id (
            id,
            name,
            owner_name,
            business_type,
            emoji,
            location,
            city,
            province,
            address
          ),
          membership_plans:plan_id (
            id,
            name,
            price,
            duration,
            features
          )
        `,
        )
        .eq("user_id", userId)
        .eq("status", "approved")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching memberships:", error);
        throw error;
      }

      console.log("Memberships found:", data?.length || 0);
      setMemberships(data || []);
      updateTimeRemaining(data || []);
    } catch (error) {
      console.error("Error in fetchMemberships:", error);
    } finally {
      setLoadingMemberships(false);
    }
  };

  const fetchRecommendedBusinesses = async () => {
    try {
      setLoadingRecommendations(true);
      console.log("Fetching recommended businesses");

      const { data, error } = await supabase
        .from("businesses")
        .select(
          `
          id,
          name,
          owner_name,
          business_type,
          description,
          short_description,
          location,
          city,
          province,
          price,
          price_unit,
          emoji,
          rating,
          members_count,
          amenities,
          status
        `,
        )
        .eq("status", "active")
        .eq("verification_status", "approved")
        .order("members_count", { ascending: false })
        .order("rating", { ascending: false })
        .limit(10);

      if (error) {
        console.error("Error fetching recommended businesses:", error);
        throw error;
      }

      const businessesWithRatings = data?.filter((b) => b.rating != null) || [];
      const businessesWithoutRatings =
        data?.filter((b) => b.rating == null) || [];

      const sortedWithRatings = businessesWithRatings.sort(
        (a, b) => b.rating - a.rating,
      );

      const sortedBusinesses = [
        ...sortedWithRatings,
        ...businessesWithoutRatings,
      ];

      setRecommendedBusinesses(sortedBusinesses.slice(0, 5));
    } catch (error) {
      console.error("Error in fetchRecommendedBusinesses:", error);
    } finally {
      setLoadingRecommendations(false);
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

  const updateTimeRemaining = (membershipsData = memberships) => {
    const now = new Date();
    const newTimeRemaining = {};

    membershipsData.forEach((membership) => {
      if (membership.end_date) {
        const endDate = new Date(membership.end_date);
        const diffTime = endDate - now;

        if (diffTime > 0) {
          const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
          const diffHours = Math.floor(
            (diffTime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60),
          );

          newTimeRemaining[membership.id] = {
            days: diffDays,
            hours: diffHours,
            expired: false,
            endDate: membership.end_date,
          };
        } else {
          newTimeRemaining[membership.id] = {
            days: 0,
            hours: 0,
            expired: true,
            endDate: membership.end_date,
          };
        }
      }
    });

    setTimeRemaining(newTimeRemaining);
  };

  const getSortedMemberships = () => {
    if (!memberships || memberships.length === 0) return [];

    const membershipsWithTime = memberships.map((membership) => ({
      ...membership,
      timeData: timeRemaining[membership.id] || null,
    }));

    if (sortBy === "expiry") {
      return membershipsWithTime.sort((a, b) => {
        const aEndDate = a.end_date
          ? new Date(a.end_date)
          : new Date(9999, 11, 31);
        const bEndDate = b.end_date
          ? new Date(b.end_date)
          : new Date(9999, 11, 31);
        return aEndDate - bEndDate;
      });
    } else {
      return membershipsWithTime.sort((a, b) => {
        const aDate = a.created_at ? new Date(a.created_at) : new Date(0);
        const bDate = b.created_at ? new Date(b.created_at) : new Date(0);
        return bDate - aDate;
      });
    }
  };

  const getExpiryStatus = (timeData) => {
    if (!timeData) return null;
    if (timeData.expired) return "expired";
    if (timeData.days <= 7) return "critical";
    if (timeData.days <= 30) return "warning";
    return "healthy";
  };

  const getFirstName = () => {
    if (profile?.first_name) {
      return profile.first_name;
    }
    if (user?.email) {
      const username = user.email.split("@")[0];
      return username.charAt(0).toUpperCase() + username.slice(1);
    }
    return "User";
  };

  const getActiveMembership = () => {
    if (memberships && memberships.length > 0) {
      const activeMembership = memberships[0];
      if (activeMembership) {
        return {
          id: activeMembership.id,
          businessId: activeMembership.businesses?.id,
          businessName: activeMembership.businesses?.name || "Business",
          planName:
            activeMembership.membership_plans?.name || "Membership Plan",
          applied: new Date(activeMembership.created_at).toLocaleDateString(
            "en-US",
            {
              year: "numeric",
              month: "long",
              day: "numeric",
            },
          ),
          startDate: activeMembership.start_date
            ? new Date(activeMembership.start_date).toLocaleDateString(
                "en-US",
                {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                },
              )
            : "N/A",
          validUntil: activeMembership.end_date
            ? new Date(activeMembership.end_date).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })
            : "N/A",
          features: activeMembership.membership_plans?.features || [],
          emoji: activeMembership.businesses?.emoji || "🏢",
          timeRemaining: timeRemaining[activeMembership.id],
        };
      }
    }
    return null;
  };

  const getMembershipCount = () => {
    return memberships?.length || 0;
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatTimeRemaining = (timeData) => {
    if (!timeData) return null;
    if (timeData.expired) {
      return (
        <div className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-600 rounded-lg text-sm">
          <XCircle size={16} />
          <span>Expired</span>
        </div>
      );
    }

    const status = getExpiryStatus(timeData);
    const statusColors = {
      critical: "bg-red-100 text-red-600",
      warning: "bg-yellow-100 text-yellow-600",
      healthy: "bg-green-100 text-green-600",
    };

    const colorClass = statusColors[status] || statusColors.healthy;

    if (timeData.days > 30) {
      return (
        <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-sm ${colorClass}`}>
          <Clock size={16} />
          <span>{timeData.days} days remaining</span>
        </div>
      );
    }

    return (
      <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-sm ${colorClass}`}>
        <Clock size={16} />
        <span>
          {timeData.days}d {timeData.hours}h remaining
        </span>
      </div>
    );
  };

  const handleViewBusiness = (businessId) => {
    navigate(`/business/${businessId}`);
  };

  if (loading) {
    return (
      <div className={`min-h-screen w-full ${isDarkMode ? 'dark bg-gray-900' : 'bg-gray-50'}`}>
        <ClientNavbar profile={profile} avatarUrl={avatarUrl} />
        <div className="flex items-center justify-center min-h-[calc(100vh-64px)]">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
            <p className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Loading your dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  const firstName = getFirstName();
  const membershipCount = getMembershipCount();
  const activeMembership = getActiveMembership();
  const sortedMemberships = getSortedMemberships();

  return (
    <div className={`min-h-screen w-full transition-colors duration-300 ${isDarkMode ? 'dark bg-gray-900' : 'bg-gray-50'}`}>
      <ClientNavbar profile={profile} avatarUrl={avatarUrl} />

      <div className="w-full px-4 sm:px-6 lg:px-8 py-6 md:py-8">
        {/* Header Section - Greeting on Right */}
        <div className="flex justify-end mb-8">
          <div className={`flex items-center gap-2 px-4 py-2 rounded-full shadow-sm transition-colors duration-300 ${
            isDarkMode ? 'bg-gray-800' : 'bg-white'
          }`}>
            <span className="text-xl">👋</span>
            <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Good to see you,</span>
            <span className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              {firstName}
            </span>
          </div>
        </div>

        {/* Stats Cards with Animations */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            whileHover={{ scale: 1.02, y: -5 }}
            className={`rounded-2xl shadow-lg p-6 border transition-all duration-300 ${
              isDarkMode 
                ? 'bg-gray-800 border-gray-700 hover:shadow-xl' 
                : 'bg-white border-gray-100 hover:shadow-xl'
            }`}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-md">
                <Award className="w-6 h-6 text-white" />
              </div>
              <div className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded-full">
                Active
              </div>
            </div>
            <p className={`text-sm mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Active Memberships</p>
            <p className={`text-3xl font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{membershipCount}</p>
            <div className={`flex items-center gap-1 text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
              <TrendingUp size={12} />
              <span>Currently active</span>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            whileHover={{ scale: 1.02, y: -5 }}
            className={`rounded-2xl shadow-lg p-6 border transition-all duration-300 ${
              isDarkMode 
                ? 'bg-gray-800 border-gray-700 hover:shadow-xl' 
                : 'bg-white border-gray-100 hover:shadow-xl'
            }`}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl flex items-center justify-center shadow-md">
                <Calendar className="w-6 h-6 text-white" />
              </div>
            </div>
            <p className={`text-sm mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Member Since</p>
            <p className={`text-3xl font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              {profile?.created_at
                ? new Date(profile.created_at).toLocaleDateString("en-US", {
                    month: "short",
                    year: "numeric",
                  })
                : "N/A"}
            </p>
            <div className={`flex items-center gap-1 text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
              <Calendar size={12} />
              <span>Join date</span>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            whileHover={{ scale: 1.02, y: -5 }}
            className={`rounded-2xl shadow-lg p-6 border transition-all duration-300 ${
              isDarkMode 
                ? 'bg-gray-800 border-gray-700 hover:shadow-xl' 
                : 'bg-white border-gray-100 hover:shadow-xl'
            }`}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-green-600 rounded-xl flex items-center justify-center shadow-md">
                <Heart className="w-6 h-6 text-white" />
              </div>
            </div>
            <p className={`text-sm mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Saved Businesses</p>
            <p className={`text-3xl font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>0</p>
            <div className={`flex items-center gap-1 text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
              <Bookmark size={12} />
              <span>Your favorites</span>
            </div>
          </motion.div>
        </div>

        {/* Membership Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              My Memberships
            </span>
          </div>
          <div className="flex gap-2">
            <button
              className={`px-3 py-1.5 rounded-lg text-sm flex items-center gap-1 transition-all ${
                sortBy === "expiry"
                  ? "bg-blue-600 text-white shadow-md"
                  : isDarkMode 
                    ? "bg-gray-700 text-gray-300 hover:bg-gray-600" 
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
              onClick={() => setSortBy("expiry")}
            >
              <Clock size={14} />
              <span>Closest to Expiry</span>
            </button>
            <button
              className={`px-3 py-1.5 rounded-lg text-sm flex items-center gap-1 transition-all ${
                sortBy === "recent"
                  ? "bg-blue-600 text-white shadow-md"
                  : isDarkMode 
                    ? "bg-gray-700 text-gray-300 hover:bg-gray-600" 
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
              onClick={() => setSortBy("recent")}
            >
              <Calendar size={14} />
              <span>Most Recent</span>
            </button>
          </div>
        </div>

        {/* Active Membership Card */}
        {!loadingMemberships && activeMembership ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`rounded-2xl shadow-lg p-6 mb-8 border transition-colors duration-300 ${
              isDarkMode 
                ? 'bg-gradient-to-r from-gray-800 to-gray-900 border-gray-700' 
                : 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-100'
            }`}
          >
            <div className="flex items-start gap-4 mb-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-3xl shadow-lg">
                {activeMembership.emoji}
              </div>
              <div className="flex-1">
                <h2 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  {activeMembership.businessName}
                </h2>
                <div className="flex items-center gap-2 mt-1">
                  <Crown size={16} className="text-yellow-500" />
                  <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    {activeMembership.planName}
                  </span>
                  <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">
                    Active
                  </span>
                </div>
              </div>
            </div>

            <div className="mb-4">
              {activeMembership.timeRemaining &&
                formatTimeRemaining(activeMembership.timeRemaining)}
            </div>

            <div className="space-y-3 mb-4">
              <div className="flex items-center gap-3 text-sm">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span className={`w-20 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Applied:</span>
                <span className={isDarkMode ? 'text-gray-300' : 'text-gray-900'}>{activeMembership.applied}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span className={`w-20 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Started:</span>
                <span className={isDarkMode ? 'text-gray-300' : 'text-gray-900'}>{activeMembership.startDate}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span className={`w-20 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Valid Until:</span>
                <span className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  {activeMembership.validUntil}
                </span>
              </div>
            </div>

            {activeMembership.features && activeMembership.features.length > 0 && (
              <div>
                <h4 className={`text-sm font-semibold mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Membership Benefits
                </h4>
                <div className="flex flex-wrap gap-2">
                  {activeMembership.features.slice(0, 4).map((feature, idx) => (
                    <div
                      key={idx}
                      className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs shadow-sm ${
                        isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-white text-gray-600'
                      }`}
                    >
                      <CheckCircle size={12} className="text-green-500" />
                      <span>{feature}</span>
                    </div>
                  ))}
                  {activeMembership.features.length > 4 && (
                    <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs shadow-sm ${
                      isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-white text-gray-600'
                    }`}>
                      <Plus size={12} />
                      <span>{activeMembership.features.length - 4} more</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        ) : (
          !loadingMemberships &&
          !activeMembership && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`rounded-2xl shadow-lg p-12 text-center mb-8 border transition-colors duration-300 ${
                isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'
              }`}
            >
              <div className="text-6xl mb-4">📋</div>
              <h3 className={`text-xl font-semibold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                No Active Membership
              </h3>
              <p className={`mb-6 max-w-md mx-auto ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                You haven't joined any businesses yet. Explore our recommended
                businesses below and find the perfect membership for you!
              </p>
              <button
                className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors flex items-center gap-2 mx-auto"
                onClick={() => navigate("/browse")}
              >
                <Compass size={20} />
                <span>Browse Businesses</span>
                <ChevronRight size={20} />
              </button>
            </motion.div>
          )
        )}

        {/* All Memberships Table */}
        {!loadingMemberships && memberships.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className={`rounded-2xl shadow-lg overflow-hidden mb-8 transition-colors duration-300 ${
              isDarkMode ? 'bg-gray-800' : 'bg-white'
            }`}
          >
            <div className={`px-6 py-4 border-b flex justify-between items-center ${
              isDarkMode ? 'border-gray-700' : 'border-gray-200'
            }`}>
              <h3 className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>All Memberships</h3>
              <button
                className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                onClick={() => navigate("/memberships")}
              >
                <span>View All</span>
                <ChevronRight size={16} />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className={`border-b ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
                  <tr>
                    <th className={`px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Business</th>
                    <th className={`px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Plan</th>
                    <th className={`px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Applied</th>
                    <th className={`px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Valid Until</th>
                    <th className={`px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Status</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${isDarkMode ? 'divide-gray-700' : 'divide-gray-100'}`}>
                  {sortedMemberships.map((membership, index) => {
                    const timeData = timeRemaining[membership.id];
                    const expiryStatus = getExpiryStatus(timeData);
                    const statusColors = {
                      critical: "text-red-600",
                      warning: "text-yellow-600",
                      healthy: "text-green-600",
                    };
                    const statusColor = statusColors[expiryStatus] || "text-green-600";
                    
                    return (
                      <motion.tr
                        key={membership.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className={`hover:bg-gray-50 transition-colors ${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'}`}
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <span className="text-xl">{membership.businesses?.emoji || "🏢"}</span>
                            <span className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                              {membership.businesses?.name}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            isDarkMode ? 'bg-blue-900/50 text-blue-300' : 'bg-blue-100 text-blue-700'
                          }`}>
                            {membership.membership_plans?.name || "Membership"}
                          </span>
                        </td>
                        <td className={`px-6 py-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          {formatDate(membership.created_at)}
                        </td>
                        <td className={`px-6 py-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          {formatDate(membership.end_date)}
                        </td>
                        <td className="px-6 py-4">
                          {timeData && !timeData.expired ? (
                            <div className={`flex items-center gap-1 text-sm ${statusColor}`}>
                              <Clock size={14} />
                              <span>{timeData.days}d left</span>
                            </div>
                          ) : (
                            <div className={`flex items-center gap-1 text-sm ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                              <XCircle size={14} />
                              <span>Expired</span>
                            </div>
                          )}
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {/* Recommended Section */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-2">
              <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                Recommended for You
              </h3>
              <span className="text-xl animate-pulse">🔥</span>
            </div>
            <button
              className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
              onClick={() => navigate("/browse")}
            >
              <span>View All</span>
              <ChevronRight size={16} />
            </button>
          </div>

          {loadingRecommendations ? (
            <div className="text-center py-12">
              <div className="w-8 h-8 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-2"></div>
              <p className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>Finding recommendations for you...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
              {recommendedBusinesses.map((business, index) => (
                <motion.div
                  key={business.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  whileHover={{ y: -8, scale: 1.02 }}
                  className={`rounded-xl shadow-lg overflow-hidden hover:shadow-2xl transition-all cursor-pointer group ${
                    isDarkMode ? 'bg-gray-800' : 'bg-white'
                  }`}
                  onClick={() => handleViewBusiness(business.id)}
                >
                  <div className={`p-4 relative ${
                    isDarkMode ? 'bg-gradient-to-br from-gray-700 to-gray-800' : 'bg-gradient-to-br from-blue-50 to-purple-50'
                  }`}>
                    <div className="text-5xl text-center py-4">
                      {business.emoji || "🏢"}
                    </div>
                    <div className="absolute top-2 right-2 flex gap-1">
                      <div className="bg-yellow-500 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1 shadow-md">
                        <Star size={10} fill="currentColor" />
                        <span>
                          {business.rating !== null && business.rating !== undefined
                            ? Number(business.rating).toFixed(1)
                            : "New"}
                        </span>
                      </div>
                      {business.members_count > 0 && (
                        <div className="bg-gray-800/80 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1 shadow-md">
                          <Users size={10} />
                          <span>{business.members_count}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="p-4">
                    <h4 className={`font-semibold mb-1 truncate ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      {business.name}
                    </h4>
                    <div className="flex items-center gap-1 text-xs text-gray-500 mb-2">
                      <Crown size={12} className="text-yellow-500" />
                      <span className="truncate">{business.owner_name}</span>
                    </div>
                    {business.short_description && (
                      <p className={`text-xs mb-3 line-clamp-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        {business.short_description}
                      </p>
                    )}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <MapPin size={12} />
                        <span className="truncate">{business.city || business.location || "Location"}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-bold text-blue-600">
                          ₱{business.price}
                        </span>
                        <span className="text-xs text-gray-500">/{business.price_unit}</span>
                      </div>
                    </div>
                    <button className={`w-full py-2 text-sm rounded-lg transition-colors flex items-center justify-center gap-1 ${
                      isDarkMode 
                        ? 'text-blue-400 border border-blue-500/50 hover:bg-blue-500/20' 
                        : 'text-blue-600 border border-blue-200 hover:bg-blue-50'
                    }`}>
                      <span>View Details</span>
                      <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {!loadingRecommendations && recommendedBusinesses.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className={`text-center py-12 rounded-2xl shadow-lg ${
                isDarkMode ? 'bg-gray-800' : 'bg-white'
              }`}
            >
              <p className={`mb-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>No recommendations available at the moment.</p>
              <button
                className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors flex items-center gap-2 mx-auto"
                onClick={() => navigate("/browse")}
              >
                <Compass size={20} />
                <span>Browse All Businesses</span>
              </button>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ClientDashboard;