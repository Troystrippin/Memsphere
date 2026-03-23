import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import OwnerNavbar from "../components/owner/OwnerNavbar";
import { toast, Toaster } from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "../contexts/ThemeContext";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  UserPlus,
  RefreshCw,
  Calendar,
  CreditCard,
  Building,
  PieChart,
  BarChart3,
  Activity,
  Clock,
  CheckCircle,
  XCircle,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  ChevronDown,
  Award,
  Smartphone,
  Store,
} from "lucide-react";

const Analytics = () => {
  const navigate = useNavigate();
  const { isDarkMode, toggleTheme } = useTheme();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [timeRange, setTimeRange] = useState("month");
  const [businesses, setBusinesses] = useState([]);
  const [selectedBusinessId, setSelectedBusinessId] = useState("all");
  const [analyticsData, setAnalyticsData] = useState({
    totalRevenue: 0,
    previousPeriodRevenue: 0,
    revenueGrowth: 0,
    totalMembers: 0,
    activeMembers: 0,
    newMembers: 0,
    previousPeriodNewMembers: 0,
    memberGrowth: 0,
    renewalRate: 0,
    popularPlans: [],
    revenueByMonth: [],
    membershipTrend: [],
    paymentMethodBreakdown: {
      gcash: { count: 0, amount: 0 },
      onsite: { count: 0, amount: 0 },
    },
    revenueByPlan: [],
  });

  useEffect(() => {
    fetchUserProfile();
  }, []);

  useEffect(() => {
    if (profile) {
      fetchBusinesses();
    }
  }, [profile]);

  useEffect(() => {
    if (businesses.length > 0) {
      fetchAnalyticsData();
    }
  }, [businesses, timeRange, selectedBusinessId]);

  const fetchUserProfile = async () => {
    try {
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
      setProfile(profileData);

      if (profileData?.avatar_url) {
        downloadAvatar(profileData.avatar_url);
      }
    } catch (err) {
      console.error("Error fetching profile:", err);
      setError("Failed to load profile");
      toast.error("Failed to load profile");
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

  const fetchBusinesses = async () => {
    try {
      const { data, error } = await supabase
        .from("businesses")
        .select("id, name")
        .eq("owner_id", profile.id)
        .eq("status", "active");

      if (error) throw error;
      setBusinesses(data || []);

      if (data.length === 0) {
        setAnalyticsData({
          totalRevenue: 0,
          previousPeriodRevenue: 0,
          revenueGrowth: 0,
          totalMembers: 0,
          activeMembers: 0,
          newMembers: 0,
          previousPeriodNewMembers: 0,
          memberGrowth: 0,
          renewalRate: 0,
          popularPlans: [],
          revenueByMonth: [],
          membershipTrend: [],
          paymentMethodBreakdown: {
            gcash: { count: 0, amount: 0 },
            onsite: { count: 0, amount: 0 },
          },
          revenueByPlan: [],
        });
      }
    } catch (err) {
      console.error("Error fetching businesses:", err);
      setError("Failed to load businesses");
      toast.error("Failed to load businesses");
    }
  };

  const getDateRanges = (range) => {
    const now = new Date();
    const startDate = new Date();
    const previousStartDate = new Date();
    const previousEndDate = new Date();

    switch (range) {
      case "week":
        startDate.setDate(now.getDate() - 7);
        previousStartDate.setDate(now.getDate() - 14);
        previousEndDate.setDate(now.getDate() - 7);
        break;
      case "month":
        startDate.setMonth(now.getMonth() - 1);
        previousStartDate.setMonth(now.getMonth() - 2);
        previousEndDate.setMonth(now.getMonth() - 1);
        break;
      case "year":
        startDate.setFullYear(now.getFullYear() - 1);
        previousStartDate.setFullYear(now.getFullYear() - 2);
        previousEndDate.setFullYear(now.getFullYear() - 1);
        break;
      default:
        startDate.setMonth(now.getMonth() - 1);
        previousStartDate.setMonth(now.getMonth() - 2);
        previousEndDate.setMonth(now.getMonth() - 1);
    }

    return {
      currentStart: startDate,
      previousStart: previousStartDate,
      previousEnd: previousEndDate,
      now,
    };
  };

  const fetchAnalyticsData = async () => {
    if (businesses.length === 0) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      let businessIds = businesses.map((b) => b.id);
      if (selectedBusinessId !== "all") {
        businessIds = [selectedBusinessId];
      }

      const dates = getDateRanges(timeRange);

      const { data: memberships, error: membershipsError } = await supabase
        .from("memberships")
        .select(
          `
          id,
          user_id,
          status,
          created_at,
          end_date,
          price_paid,
          payment_status,
          payment_method,
          plan:plan_id (
            id,
            name,
            price,
            duration
          )
        `,
        )
        .in("business_id", businessIds)
        .eq("status", "approved")
        .order("created_at", { ascending: false });

      if (membershipsError) {
        console.error("Memberships error:", membershipsError);
        throw membershipsError;
      }

      const currentPeriodMemberships =
        memberships?.filter(
          (m) =>
            new Date(m.created_at) >= dates.currentStart &&
            new Date(m.created_at) <= dates.now,
        ) || [];

      const previousPeriodMemberships =
        memberships?.filter((m) => {
          const date = new Date(m.created_at);
          return date >= dates.previousStart && date < dates.currentStart;
        }) || [];

      const totalRevenue = currentPeriodMemberships.reduce(
        (sum, m) => sum + (m.price_paid || 0),
        0,
      );
      const previousRevenue = previousPeriodMemberships.reduce(
        (sum, m) => sum + (m.price_paid || 0),
        0,
      );
      const revenueGrowth =
        previousRevenue > 0
          ? ((totalRevenue - previousRevenue) / previousRevenue) * 100
          : totalRevenue > 0
            ? 100
            : 0;

      const uniqueMembers = new Set(memberships?.map((m) => m.user_id)).size;
      const activeMembers =
        memberships?.filter(
          (m) =>
            m.status === "approved" &&
            (!m.end_date || new Date(m.end_date) >= new Date()),
        ).length || 0;

      const newMembers = currentPeriodMemberships.length;
      const previousNewMembers = previousPeriodMemberships.length;

      const memberGrowth =
        previousNewMembers > 0
          ? ((newMembers - previousNewMembers) / previousNewMembers) * 100
          : newMembers > 0
            ? 100
            : 0;

      const renewalRate =
        uniqueMembers > 0
          ? Math.round((activeMembers / uniqueMembers) * 100)
          : 0;

      const planCounts = {};
      memberships?.forEach((m) => {
        if (m.plan?.name) {
          planCounts[m.plan.name] = (planCounts[m.plan.name] || 0) + 1;
        }
      });

      const popularPlans = Object.entries(planCounts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      const planRevenue = {};
      currentPeriodMemberships.forEach((m) => {
        const planName = m.plan?.name || "Unknown Plan";
        planRevenue[planName] =
          (planRevenue[planName] || 0) + (m.price_paid || 0);
      });

      const revenueByPlan = Object.entries(planRevenue)
        .map(([name, revenue]) => ({ name, revenue }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);

      const revenueByMonth = [];
      for (let i = 5; i >= 0; i--) {
        const month = new Date();
        month.setMonth(month.getMonth() - i);
        const monthStart = new Date(month.getFullYear(), month.getMonth(), 1);
        const monthEnd = new Date(month.getFullYear(), month.getMonth() + 1, 0);

        const monthRevenue =
          memberships
            ?.filter((m) => {
              const date = new Date(m.created_at);
              return date >= monthStart && date <= monthEnd;
            })
            .reduce((sum, m) => sum + (m.price_paid || 0), 0) || 0;

        revenueByMonth.push({
          month: month.toLocaleString("default", { month: "short" }),
          revenue: monthRevenue,
        });
      }

      const membershipTrend = [];
      for (let i = 5; i >= 0; i--) {
        const month = new Date();
        month.setMonth(month.getMonth() - i);
        const monthStart = new Date(month.getFullYear(), month.getMonth(), 1);
        const monthEnd = new Date(month.getFullYear(), month.getMonth() + 1, 0);

        const monthMembers =
          memberships?.filter((m) => {
            const date = new Date(m.created_at);
            return date >= monthStart && date <= monthEnd;
          }).length || 0;

        membershipTrend.push({
          month: month.toLocaleString("default", { month: "short" }),
          members: monthMembers,
        });
      }

      const paymentBreakdown = {
        gcash: { count: 0, amount: 0 },
        onsite: { count: 0, amount: 0 },
      };

      currentPeriodMemberships.forEach((m) => {
        const method = m.payment_method?.toLowerCase() || "onsite";
        if (method === "gcash") {
          paymentBreakdown.gcash.count++;
          paymentBreakdown.gcash.amount += m.price_paid || 0;
        } else if (method === "onsite") {
          paymentBreakdown.onsite.count++;
          paymentBreakdown.onsite.amount += m.price_paid || 0;
        }
      });

      setAnalyticsData({
        totalRevenue,
        previousPeriodRevenue: previousRevenue,
        revenueGrowth: Math.round(revenueGrowth * 10) / 10,
        totalMembers: uniqueMembers,
        activeMembers,
        newMembers,
        previousPeriodNewMembers: previousNewMembers,
        memberGrowth: Math.round(memberGrowth * 10) / 10,
        renewalRate,
        popularPlans,
        revenueByMonth,
        membershipTrend,
        paymentMethodBreakdown: paymentBreakdown,
        revenueByPlan,
      });
    } catch (err) {
      console.error("Error fetching analytics:", err);
      setError(err.message);
      toast.error("Failed to load analytics data");
    } finally {
      setLoading(false);
    }
  };

  const getFirstName = () => {
    if (profile?.first_name) return profile.first_name;
    return "Owner";
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatNumber = (num) => {
    return new Intl.NumberFormat("en-US").format(num);
  };

  const getGrowthColor = (growth) => {
    if (growth > 0) return "text-green-600 dark:text-green-400";
    if (growth < 0) return "text-red-600 dark:text-red-400";
    return "text-gray-500 dark:text-gray-400";
  };

  const getGrowthIcon = (growth) => {
    if (growth > 0) return <TrendingUp className="w-4 h-4" />;
    if (growth < 0) return <TrendingDown className="w-4 h-4" />;
    return <Minus className="w-4 h-4" />;
  };

  if (loading) {
    return (
      <div
        className={`fixed inset-0 flex items-center justify-center select-none ${
          isDarkMode
            ? "bg-gray-900"
            : "bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50"
        }`}
      >
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto"></div>
          <p
            className={`mt-4 font-medium ${isDarkMode ? "text-gray-300" : "text-gray-600"}`}
          >
            Loading analytics data...
          </p>
        </div>
      </div>
    );
  }

  const firstName = getFirstName();

  return (
    <div
      className={`fixed inset-0 overflow-hidden select-none ${
        isDarkMode
          ? "bg-gray-900"
          : "bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50"
      }`}
    >
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: isDarkMode ? "#1f2937" : "#363636",
            color: "#fff",
          },
        }}
      />
      <OwnerNavbar
        profile={profile}
        avatarUrl={avatarUrl}
        isDarkMode={isDarkMode}
        toggleDarkMode={toggleTheme}
      />

      <div className="h-full pt-20 overflow-y-auto overflow-x-hidden">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-12">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div>
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <h1
                      className={`text-4xl font-bold ${isDarkMode ? "text-white" : "bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent"}`}
                    >
                      Business Analytics
                    </h1>
                    <div className="absolute -bottom-2 left-0 w-20 h-1 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full animate-width-pulse"></div>
                  </div>
                </div>
                <p
                  className={`mt-2 flex items-center gap-2 ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}
                >
                  <BarChart3 className="w-4 h-4" />
                  Track your business performance and growth metrics
                </p>
              </div>
              <div
                className={`rounded-xl px-6 py-3 shadow-sm border ${isDarkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"}`}
              >
                <div className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-blue-500" />
                  <div>
                    <p
                      className={`text-sm font-semibold ${isDarkMode ? "text-white" : "text-gray-800"}`}
                    >
                      Real-time Analytics
                    </p>
                    <p
                      className={`text-xs ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}
                    >
                      Updated with each transaction
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Controls */}
          <div className="flex flex-col sm:flex-row justify-between gap-4 mb-6">
            {businesses.length > 1 && (
              <div className="flex items-center gap-3">
                <label
                  className={`text-sm font-medium ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}
                >
                  Business:
                </label>
                <select
                  value={selectedBusinessId}
                  onChange={(e) => setSelectedBusinessId(e.target.value)}
                  className={`px-4 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    isDarkMode
                      ? "bg-gray-800 border-gray-700 text-white"
                      : "bg-white border-gray-300 text-gray-900"
                  }`}
                >
                  <option value="all">All Businesses</option>
                  {businesses.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex gap-2">
              {["week", "month", "year"].map((range) => (
                <button
                  key={range}
                  onClick={() => setTimeRange(range)}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    timeRange === range
                      ? "bg-blue-500 text-white shadow-md"
                      : isDarkMode
                        ? "bg-gray-800 text-gray-300 border border-gray-700 hover:bg-gray-700"
                        : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  {range.charAt(0).toUpperCase() + range.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Key Metrics Cards - REMOVED progress bars from Total Members and Retention Rate */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            <div
              className={`rounded-2xl p-6 shadow-lg border transition-all ${isDarkMode ? "bg-gray-800 border-gray-700 hover:shadow-xl" : "bg-white border-gray-200 hover:shadow-xl"}`}
            >
              <div className="flex items-center justify-between mb-4">
                <div
                  className={`w-14 h-14 rounded-xl flex items-center justify-center ${isDarkMode ? "bg-blue-900/30" : "bg-blue-100"}`}
                >
                  <DollarSign
                    className={`w-7 h-7 ${isDarkMode ? "text-blue-400" : "text-blue-600"}`}
                  />
                </div>
                <div
                  className={`flex items-center gap-1 ${getGrowthColor(analyticsData.revenueGrowth)}`}
                >
                  {getGrowthIcon(analyticsData.revenueGrowth)}
                  <span className="text-base font-semibold">
                    {Math.abs(analyticsData.revenueGrowth)}%
                  </span>
                </div>
              </div>
              <p
                className={`text-3xl font-bold ${isDarkMode ? "text-white" : "text-gray-800"}`}
              >
                {formatCurrency(analyticsData.totalRevenue)}
              </p>
              <p
                className={`text-sm mt-1 ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}
              >
                Total Revenue
              </p>
              <p
                className={`text-xs mt-2 ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}
              >
                vs previous {timeRange}
              </p>
            </div>

            <div
              className={`rounded-2xl p-6 shadow-lg border transition-all ${isDarkMode ? "bg-gray-800 border-gray-700 hover:shadow-xl" : "bg-white border-gray-200 hover:shadow-xl"}`}
            >
              <div className="flex items-center justify-between mb-4">
                <div
                  className={`w-14 h-14 rounded-xl flex items-center justify-center ${isDarkMode ? "bg-green-900/30" : "bg-green-100"}`}
                >
                  <Users
                    className={`w-7 h-7 ${isDarkMode ? "text-green-400" : "text-green-600"}`}
                  />
                </div>
                <div
                  className={`text-base font-semibold ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}
                >
                  {analyticsData.activeMembers} active
                </div>
              </div>
              <p
                className={`text-3xl font-bold ${isDarkMode ? "text-white" : "text-gray-800"}`}
              >
                {formatNumber(analyticsData.totalMembers)}
              </p>
              <p
                className={`text-sm mt-1 ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}
              >
                Total Members
              </p>
              {/* Progress bar removed */}
            </div>

            <div
              className={`rounded-2xl p-6 shadow-lg border transition-all ${isDarkMode ? "bg-gray-800 border-gray-700 hover:shadow-xl" : "bg-white border-gray-200 hover:shadow-xl"}`}
            >
              <div className="flex items-center justify-between mb-4">
                <div
                  className={`w-14 h-14 rounded-xl flex items-center justify-center ${isDarkMode ? "bg-purple-900/30" : "bg-purple-100"}`}
                >
                  <UserPlus
                    className={`w-7 h-7 ${isDarkMode ? "text-purple-400" : "text-purple-600"}`}
                  />
                </div>
                <div
                  className={`flex items-center gap-1 ${getGrowthColor(analyticsData.memberGrowth)}`}
                >
                  {getGrowthIcon(analyticsData.memberGrowth)}
                  <span className="text-base font-semibold">
                    {Math.abs(analyticsData.memberGrowth)}%
                  </span>
                </div>
              </div>
              <p
                className={`text-3xl font-bold ${isDarkMode ? "text-white" : "text-gray-800"}`}
              >
                {formatNumber(analyticsData.newMembers)}
              </p>
              <p
                className={`text-sm mt-1 ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}
              >
                New Members
              </p>
              <p
                className={`text-xs mt-2 ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}
              >
                this {timeRange}
              </p>
            </div>

            <div
              className={`rounded-2xl p-6 shadow-lg border transition-all ${isDarkMode ? "bg-gray-800 border-gray-700 hover:shadow-xl" : "bg-white border-gray-200 hover:shadow-xl"}`}
            >
              <div className="flex items-center justify-between mb-4">
                <div
                  className={`w-14 h-14 rounded-xl flex items-center justify-center ${isDarkMode ? "bg-orange-900/30" : "bg-orange-100"}`}
                >
                  <RefreshCw
                    className={`w-7 h-7 ${isDarkMode ? "text-orange-400" : "text-orange-600"}`}
                  />
                </div>
                <div
                  className={`text-base font-semibold ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}
                >
                  Retention Rate
                </div>
              </div>
              <p
                className={`text-3xl font-bold ${isDarkMode ? "text-white" : "text-gray-800"}`}
              >
                {analyticsData.renewalRate}%
              </p>
              <p
                className={`text-sm mt-1 ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}
              >
                Renewal Rate
              </p>
              {/* Progress bar removed */}
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <div
              className={`rounded-2xl p-6 shadow-lg border ${isDarkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"}`}
            >
              <h3
                className={`text-lg font-semibold mb-4 flex items-center gap-2 ${isDarkMode ? "text-white" : "text-gray-800"}`}
              >
                <TrendingUp className="w-5 h-5 text-blue-500" />
                Revenue Trend
              </h3>
              <div className="h-64 flex items-end justify-between gap-2">
                {analyticsData.revenueByMonth.map((item, index) => {
                  const maxRevenue = Math.max(
                    ...analyticsData.revenueByMonth.map((d) => d.revenue),
                    1,
                  );
                  const height = (item.revenue / maxRevenue) * 200;
                  return (
                    <div
                      key={index}
                      className="flex-1 flex flex-col items-center gap-2"
                    >
                      <div className="relative w-full flex justify-center">
                        <div
                          className="w-full max-w-[40px] bg-gradient-to-t from-blue-500 to-blue-400 rounded-t-lg transition-all duration-500 hover:from-blue-600 hover:to-blue-500"
                          style={{ height: `${height}px` }}
                        />
                      </div>
                      <div className="text-center">
                        <p
                          className={`text-xs font-medium ${isDarkMode ? "text-gray-300" : "text-gray-600"}`}
                        >
                          {item.month}
                        </p>
                        <p
                          className={`text-xs ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}
                        >
                          ₱{(item.revenue / 1000).toFixed(0)}k
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div
              className={`rounded-2xl p-6 shadow-lg border ${isDarkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"}`}
            >
              <h3
                className={`text-lg font-semibold mb-4 flex items-center gap-2 ${isDarkMode ? "text-white" : "text-gray-800"}`}
              >
                <Users className="w-5 h-5 text-green-500" />
                Membership Growth
              </h3>
              <div className="h-64 flex items-end justify-between gap-2">
                {analyticsData.membershipTrend.map((item, index) => {
                  const maxMembers = Math.max(
                    ...analyticsData.membershipTrend.map((d) => d.members),
                    1,
                  );
                  const height = (item.members / maxMembers) * 200;
                  return (
                    <div
                      key={index}
                      className="flex-1 flex flex-col items-center gap-2"
                    >
                      <div className="relative w-full flex justify-center">
                        <div
                          className="w-full max-w-[40px] bg-gradient-to-t from-green-500 to-green-400 rounded-t-lg transition-all duration-500 hover:from-green-600 hover:to-green-500"
                          style={{ height: `${height}px` }}
                        />
                      </div>
                      <div className="text-center">
                        <p
                          className={`text-xs font-medium ${isDarkMode ? "text-gray-300" : "text-gray-600"}`}
                        >
                          {item.month}
                        </p>
                        <p
                          className={`text-xs ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}
                        >
                          {item.members}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Payment Methods Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div
              className={`rounded-2xl p-6 shadow-lg border ${isDarkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"}`}
            >
              <h3
                className={`text-lg font-semibold mb-4 flex items-center gap-2 ${isDarkMode ? "text-white" : "text-gray-800"}`}
              >
                <CreditCard className="w-5 h-5 text-purple-500" />
                Payment Methods
              </h3>
              <div className="space-y-4">
                <div
                  className={`rounded-xl p-4 ${isDarkMode ? "bg-blue-900/30" : "bg-gradient-to-r from-blue-50 to-indigo-50"}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Smartphone
                        className={`w-5 h-5 ${isDarkMode ? "text-blue-400" : "text-blue-600"}`}
                      />
                      <span
                        className={`font-semibold text-base ${isDarkMode ? "text-gray-200" : "text-gray-700"}`}
                      >
                        GCash
                      </span>
                    </div>
                    <span
                      className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}
                    >
                      {analyticsData.paymentMethodBreakdown.gcash.count}{" "}
                      memberships
                    </span>
                  </div>
                  <p
                    className={`text-2xl font-bold ${isDarkMode ? "text-blue-400" : "text-blue-600"}`}
                  >
                    {formatCurrency(
                      analyticsData.paymentMethodBreakdown.gcash.amount,
                    )}
                  </p>
                  <div
                    className={`w-full rounded-full h-2 mt-2 ${isDarkMode ? "bg-gray-700" : "bg-gray-200"}`}
                  >
                    <div
                      className="bg-blue-500 rounded-full h-2 transition-all"
                      style={{
                        width: `${
                          (analyticsData.paymentMethodBreakdown.gcash.amount /
                            (analyticsData.paymentMethodBreakdown.gcash.amount +
                              analyticsData.paymentMethodBreakdown.onsite
                                .amount)) *
                            100 || 0
                        }%`,
                      }}
                    />
                  </div>
                </div>

                <div
                  className={`rounded-xl p-4 ${isDarkMode ? "bg-green-900/30" : "bg-gradient-to-r from-green-50 to-emerald-50"}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Store
                        className={`w-5 h-5 ${isDarkMode ? "text-green-400" : "text-green-600"}`}
                      />
                      <span
                        className={`font-semibold text-base ${isDarkMode ? "text-gray-200" : "text-gray-700"}`}
                      >
                        On-site
                      </span>
                    </div>
                    <span
                      className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}
                    >
                      {analyticsData.paymentMethodBreakdown.onsite.count}{" "}
                      memberships
                    </span>
                  </div>
                  <p
                    className={`text-2xl font-bold ${isDarkMode ? "text-green-400" : "text-green-600"}`}
                  >
                    {formatCurrency(
                      analyticsData.paymentMethodBreakdown.onsite.amount,
                    )}
                  </p>
                  <div
                    className={`w-full rounded-full h-2 mt-2 ${isDarkMode ? "bg-gray-700" : "bg-gray-200"}`}
                  >
                    <div
                      className="bg-green-500 rounded-full h-2 transition-all"
                      style={{
                        width: `${
                          (analyticsData.paymentMethodBreakdown.onsite.amount /
                            (analyticsData.paymentMethodBreakdown.gcash.amount +
                              analyticsData.paymentMethodBreakdown.onsite
                                .amount)) *
                            100 || 0
                        }%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Revenue by Plan Section */}
            <div
              className={`rounded-2xl p-6 shadow-lg border ${isDarkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"}`}
            >
              <h3
                className={`text-lg font-semibold mb-4 flex items-center gap-2 ${isDarkMode ? "text-white" : "text-gray-800"}`}
              >
                <DollarSign className="w-5 h-5 text-yellow-500" />
                Revenue by Plan
              </h3>
              <div className="space-y-3">
                {analyticsData.revenueByPlan.length > 0 ? (
                  analyticsData.revenueByPlan.map((plan, index) => {
                    const totalRevenue = analyticsData.revenueByPlan.reduce(
                      (sum, p) => sum + p.revenue,
                      0,
                    );
                    const percentage =
                      totalRevenue > 0
                        ? (plan.revenue / totalRevenue) * 100
                        : 0;
                    return (
                      <div key={index} className="flex items-center gap-3">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                            index === 0
                              ? isDarkMode
                                ? "bg-yellow-900/50 text-yellow-400"
                                : "bg-yellow-100 text-yellow-600"
                              : index === 1
                                ? isDarkMode
                                  ? "bg-gray-700 text-gray-300"
                                  : "bg-gray-100 text-gray-600"
                                : index === 2
                                  ? isDarkMode
                                    ? "bg-orange-900/50 text-orange-400"
                                    : "bg-orange-100 text-orange-600"
                                  : isDarkMode
                                    ? "bg-blue-900/50 text-blue-400"
                                    : "bg-blue-100 text-blue-600"
                          }`}
                        >
                          {index + 1}
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between mb-1">
                            <span
                              className={`text-sm font-medium truncate max-w-[150px] ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}
                            >
                              {plan.name}
                            </span>
                            <div className="flex gap-2">
                              <span
                                className={`text-sm font-semibold ${isDarkMode ? "text-white" : "text-gray-800"}`}
                              >
                                {formatCurrency(plan.revenue)}
                              </span>
                              <span
                                className={`text-xs ${isDarkMode ? "text-gray-500" : "text-gray-500"}`}
                              >
                                ({percentage.toFixed(1)}%)
                              </span>
                            </div>
                          </div>
                          <div
                            className={`w-full rounded-full h-2 ${isDarkMode ? "bg-gray-700" : "bg-gray-200"}`}
                          >
                            <div
                              className={`h-2 rounded-full transition-all ${
                                index === 0
                                  ? "bg-yellow-500"
                                  : index === 1
                                    ? "bg-gray-500"
                                    : index === 2
                                      ? "bg-orange-500"
                                      : "bg-blue-500"
                              }`}
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-8">
                    <PieChart
                      className={`w-12 h-12 mx-auto mb-2 ${isDarkMode ? "text-gray-600" : "text-gray-300"}`}
                    />
                    <p
                      className={`${isDarkMode ? "text-gray-400" : "text-gray-500"}`}
                    >
                      No revenue data available
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Popular Plans Section */}
          <div
            className={`rounded-2xl p-6 shadow-lg border ${isDarkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"}`}
          >
            <h3
              className={`text-lg font-semibold mb-4 flex items-center gap-2 ${isDarkMode ? "text-white" : "text-gray-800"}`}
            >
              <Award className="w-5 h-5 text-yellow-500" />
              Most Popular Plans
            </h3>
            <div className="space-y-3">
              {analyticsData.popularPlans.length > 0 ? (
                analyticsData.popularPlans.map((plan, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                        index === 0
                          ? isDarkMode
                            ? "bg-yellow-900/50 text-yellow-400"
                            : "bg-yellow-100 text-yellow-600"
                          : index === 1
                            ? isDarkMode
                              ? "bg-gray-700 text-gray-300"
                              : "bg-gray-100 text-gray-600"
                            : index === 2
                              ? isDarkMode
                                ? "bg-orange-900/50 text-orange-400"
                                : "bg-orange-100 text-orange-600"
                              : isDarkMode
                                ? "bg-blue-900/50 text-blue-400"
                                : "bg-blue-100 text-blue-600"
                      }`}
                    >
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between mb-1">
                        <span
                          className={`text-sm font-medium ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}
                        >
                          {plan.name}
                        </span>
                        <span
                          className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}
                        >
                          {plan.count} members
                        </span>
                      </div>
                      <div
                        className={`w-full rounded-full h-2 ${isDarkMode ? "bg-gray-700" : "bg-gray-200"}`}
                      >
                        <div
                          className={`h-2 rounded-full transition-all ${
                            index === 0
                              ? "bg-yellow-500"
                              : index === 1
                                ? "bg-gray-500"
                                : index === 2
                                  ? "bg-orange-500"
                                  : "bg-blue-500"
                          }`}
                          style={{
                            width: `${(plan.count / analyticsData.popularPlans[0]?.count) * 100}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <PieChart
                    className={`w-12 h-12 mx-auto mb-2 ${isDarkMode ? "text-gray-600" : "text-gray-300"}`}
                  />
                  <p
                    className={`${isDarkMode ? "text-gray-400" : "text-gray-500"}`}
                  >
                    No plan data available
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
