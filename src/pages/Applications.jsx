import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import OwnerNavbar from "../components/owner/OwnerNavbar";
import { toast, Toaster } from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "../contexts/ThemeContext";
import {
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  Download,
  ChevronDown,
  ChevronUp,
  User,
  Mail,
  Phone,
  Building,
  CreditCard,
  Calendar,
  FileText,
  AlertCircle,
  Check,
  X,
  ExternalLink,
  Search,
  Filter,
  TrendingUp,
  Users,
  DollarSign,
} from "lucide-react";

const Applications = () => {
  const navigate = useNavigate();
  const { isDarkMode, toggleTheme } = useTheme();
  const [profile, setProfile] = useState(null);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState({});
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState("");
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [clientAvatars, setClientAvatars] = useState({});
  const [filter, setFilter] = useState("pending");
  const [expandedCard, setExpandedCard] = useState(null);
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchUserProfile();
    fetchApplications();
  }, []);

  useEffect(() => {
    fetchApplications();
  }, [filter]);

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

  const getClientAvatarUrl = async (avatarPath, userId) => {
    if (!avatarPath) return null;
    if (clientAvatars[userId]) return clientAvatars[userId];

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

  const getReceiptUrl = async (membership) => {
    let receiptPath = membership.receipt_path;
    if (!receiptPath && membership.payments && membership.payments.length > 0) {
      const payment = membership.payments[0];
      receiptPath = payment.receipt_path;
    }
    if (!receiptPath) return null;

    try {
      const { data: publicUrlData } = supabase.storage
        .from("payment-receipts")
        .getPublicUrl(receiptPath);

      if (publicUrlData?.publicUrl) {
        try {
          const response = await fetch(publicUrlData.publicUrl, {
            method: "HEAD",
          });
          if (response.ok) {
            return publicUrlData.publicUrl;
          }
        } catch (e) {
          console.log("Public URL not accessible, trying download...");
        }
      }

      const { data, error } = await supabase.storage
        .from("payment-receipts")
        .download(receiptPath);

      if (error) throw error;
      return URL.createObjectURL(data);
    } catch (error) {
      console.error("Error getting receipt URL:", error);
      return null;
    }
  };

  const fetchApplications = async () => {
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

      const { data: businessesData, error: businessesError } = await supabase
        .from("businesses")
        .select("id, verification_status")
        .eq("owner_id", user.id);

      if (businessesError) throw businessesError;

      if (!businessesData || businessesData.length === 0) {
        setApplications([]);
        setLoading(false);
        return;
      }

      const businessIds = businessesData.map((b) => b.id);
      const businessVerificationMap = {};
      businessesData.forEach((b) => {
        businessVerificationMap[b.id] = b.verification_status;
      });

      let query = supabase
        .from("memberships")
        .select(
          `
          *,
          applicant:user_id (
            id,
            first_name,
            last_name,
            email,
            mobile,
            avatar_url
          ),
          plan:plan_id (
            id,
            name,
            price,
            duration,
            features
          ),
          business:business_id (
            id,
            name,
            business_type,
            address,
            location,
            owner_id,
            verification_status
          ),
          payments:payments (
            id,
            amount,
            payment_method,
            payment_status,
            gcash_reference,
            gcash_number,
            receipt_path,
            receipt_public_url,
            created_at,
            verified_at
          )
        `,
        )
        .in("business_id", businessIds)
        .order("created_at", { ascending: false });

      if (filter !== "all") {
        query = query.eq("status", filter);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Query error:", error);
        throw error;
      }

      const processedData = await Promise.all(
        (data || []).map(async (app) => {
          let receiptUrl = null;
          let clientAvatarUrl = null;

          if (app.payment_method?.toLowerCase() === "gcash") {
            receiptUrl = await getReceiptUrl(app);
          }

          if (app.applicant?.avatar_url) {
            clientAvatarUrl = await getClientAvatarUrl(
              app.applicant.avatar_url,
              app.applicant.id,
            );
          }

          const businessVerification =
            app.business?.verification_status ||
            businessVerificationMap[app.business_id] ||
            "pending";

          return {
            ...app,
            receipt_url_display: receiptUrl,
            client_avatar_display: clientAvatarUrl,
            business_verification: businessVerification,
          };
        }),
      );

      setApplications(processedData || []);
    } catch (err) {
      console.error("Error fetching applications:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (membershipId) => {
    try {
      setProcessing((prev) => ({ ...prev, [membershipId]: true }));
      const { error } = await supabase
        .from("memberships")
        .update({
          status: "approved",
          payment_status: "paid",
          reviewed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", membershipId);

      if (error) throw error;
      toast.success("Application approved successfully!");
      fetchApplications();
    } catch (err) {
      console.error("Error approving application:", err);
      toast.error(err.message);
    } finally {
      setProcessing((prev) => ({ ...prev, [membershipId]: false }));
    }
  };

  const handleReject = async (membershipId) => {
    try {
      setProcessing((prev) => ({ ...prev, [membershipId]: true }));
      const { error } = await supabase
        .from("memberships")
        .update({
          status: "rejected",
          reviewed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", membershipId);

      if (error) throw error;
      toast.success("Application rejected successfully!");
      fetchApplications();
    } catch (err) {
      console.error("Error rejecting application:", err);
      toast.error(err.message);
    } finally {
      setProcessing((prev) => ({ ...prev, [membershipId]: false }));
    }
  };

  const handleVerifyPayment = async (membershipId) => {
    try {
      setProcessing((prev) => ({ ...prev, [membershipId]: true }));
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("memberships")
        .update({
          payment_status: "paid",
          payment_verified_at: new Date().toISOString(),
          verified_by: user.id,
          updated_at: new Date().toISOString(),
        })
        .eq("id", membershipId);

      if (error) throw error;
      toast.success("Payment verified successfully!");
      fetchApplications();
    } catch (err) {
      console.error("Error verifying payment:", err);
      toast.error(err.message);
    } finally {
      setProcessing((prev) => ({ ...prev, [membershipId]: false }));
    }
  };

  const viewReceipt = (receiptUrl) => {
    setSelectedReceipt(receiptUrl);
    setShowReceiptModal(true);
  };

  const toggleExpand = (id) => {
    setExpandedCard(expandedCard === id ? null : id);
  };

  const getFirstName = () => {
    if (profile?.first_name) return profile.first_name;
    return "Owner";
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getInitials = (firstName, lastName) => {
    return `${firstName?.charAt(0) || ""}${lastName?.charAt(0) || ""}`.toUpperCase();
  };

  const filteredApplications = applications.filter((app) => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      app.applicant?.first_name?.toLowerCase().includes(searchLower) ||
      app.applicant?.last_name?.toLowerCase().includes(searchLower) ||
      app.applicant?.email?.toLowerCase().includes(searchLower) ||
      app.business?.name?.toLowerCase().includes(searchLower) ||
      app.plan?.name?.toLowerCase().includes(searchLower)
    );
  });

  const getStats = () => {
    const total = applications.length;
    const pending = applications.filter((a) => a.status === "pending").length;
    const approved = applications.filter((a) => a.status === "approved").length;
    const rejected = applications.filter((a) => a.status === "rejected").length;
    return { total, pending, approved, rejected };
  };

  const stats = getStats();

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
            Loading applications...
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

      <div className="h-full pt-20 overflow-y-auto">
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
                      Membership Applications
                    </h1>
                    <div className="absolute -bottom-2 left-0 w-20 h-1 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full animate-width-pulse"></div>
                  </div>
                </div>
                <p
                  className={`mt-2 flex items-center gap-2 ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}
                >
                  <Users className="w-4 h-4" />
                  Review and manage customer membership applications
                </p>
              </div>
              <div
                className={`flex items-center gap-4 rounded-xl px-4 py-2 shadow-sm border ${isDarkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"}`}
              >
                <p
                  className={`text-xs ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}
                >
                  Total Applications
                </p>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {stats.total}
                </p>
              </div>
            </div>
          </motion.div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div
              className={`rounded-xl p-4 border shadow-sm ${isDarkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"}`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p
                    className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}
                  >
                    Pending
                  </p>
                  <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                    {stats.pending}
                  </p>
                </div>
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center ${isDarkMode ? "bg-yellow-900/30" : "bg-yellow-100"}`}
                >
                  <Clock
                    className={`w-5 h-5 ${isDarkMode ? "text-yellow-400" : "text-yellow-600"}`}
                  />
                </div>
              </div>
            </div>
            <div
              className={`rounded-xl p-4 border shadow-sm ${isDarkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"}`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p
                    className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}
                  >
                    Approved
                  </p>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {stats.approved}
                  </p>
                </div>
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center ${isDarkMode ? "bg-green-900/30" : "bg-green-100"}`}
                >
                  <CheckCircle
                    className={`w-5 h-5 ${isDarkMode ? "text-green-400" : "text-green-600"}`}
                  />
                </div>
              </div>
            </div>
            <div
              className={`rounded-xl p-4 border shadow-sm ${isDarkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"}`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p
                    className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}
                  >
                    Rejected
                  </p>
                  <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                    {stats.rejected}
                  </p>
                </div>
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center ${isDarkMode ? "bg-red-900/30" : "bg-red-100"}`}
                >
                  <XCircle
                    className={`w-5 h-5 ${isDarkMode ? "text-red-400" : "text-red-600"}`}
                  />
                </div>
              </div>
            </div>
            <div
              className={`rounded-xl p-4 border shadow-sm ${isDarkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"}`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p
                    className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}
                  >
                    Total Revenue
                  </p>
                  <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                    ₱
                    {applications
                      .filter((a) => a.status === "approved")
                      .reduce((sum, a) => sum + (a.price_paid || 0), 0)
                      .toLocaleString()}
                  </p>
                </div>
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center ${isDarkMode ? "bg-purple-900/30" : "bg-purple-100"}`}
                >
                  <DollarSign
                    className={`w-5 h-5 ${isDarkMode ? "text-purple-400" : "text-purple-600"}`}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Search and Filter */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1 relative">
              <Search
                className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}
              />
              <input
                type="text"
                placeholder="Search by name, email, business, or plan..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`w-full pl-10 pr-4 py-2.5 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  isDarkMode
                    ? "bg-gray-800 border-gray-700 text-white placeholder-gray-500"
                    : "bg-white border-gray-300 text-gray-900"
                }`}
              />
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0">
              {[
                {
                  id: "pending",
                  label: "Pending",
                  icon: Clock,
                  color: "yellow",
                },
                {
                  id: "approved",
                  label: "Approved",
                  icon: CheckCircle,
                  color: "green",
                },
                {
                  id: "rejected",
                  label: "Rejected",
                  icon: XCircle,
                  color: "red",
                },
                { id: "all", label: "All", icon: Filter, color: "blue" },
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = filter === tab.id;
                const count = tab.id === "all" ? stats.total : stats[tab.id];
                return (
                  <button
                    key={tab.id}
                    onClick={() => setFilter(tab.id)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all whitespace-nowrap ${
                      isActive
                        ? `bg-${tab.color}-500 text-white shadow-md`
                        : isDarkMode
                          ? "bg-gray-800 text-gray-300 border border-gray-700 hover:bg-gray-700"
                          : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{tab.label}</span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs ${isActive ? "bg-white/20" : isDarkMode ? "bg-gray-700" : "bg-gray-100"}`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Error/Success Messages */}
          {error && (
            <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/30 border-l-4 border-red-500 rounded-r-lg">
              <p className="text-red-700 dark:text-red-400">{error}</p>
            </div>
          )}

          {successMessage && (
            <div className="mb-4 p-4 bg-green-50 dark:bg-green-900/30 border-l-4 border-green-500 rounded-r-lg">
              <p className="text-green-700 dark:text-green-400">
                {successMessage}
              </p>
            </div>
          )}

          {/* Applications List */}
          {filteredApplications.length > 0 ? (
            <div className="space-y-4">
              {filteredApplications.map((app) => {
                const hasReceipt = app.receipt_url_display;
                const isGcash = app.payment_method?.toLowerCase() === "gcash";
                const isVerified = ["paid"].includes(
                  app.payment_status?.toLowerCase(),
                );
                const isExpanded = expandedCard === app.id;

                return (
                  <motion.div
                    key={app.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`rounded-2xl shadow-lg border overflow-hidden transition-all ${
                      isExpanded ? "shadow-xl" : ""
                    } ${isDarkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"}`}
                  >
                    {/* Card Header */}
                    <div
                      className="p-5 cursor-pointer"
                      onClick={() => toggleExpand(app.id)}
                    >
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                          <div
                            className={`w-14 h-14 rounded-full overflow-hidden flex items-center justify-center flex-shrink-0 ${
                              isDarkMode
                                ? "bg-gray-700"
                                : "bg-gradient-to-br from-blue-100 to-purple-100"
                            }`}
                          >
                            {app.client_avatar_display ? (
                              <img
                                src={app.client_avatar_display}
                                alt={`${app.applicant?.first_name}`}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.target.style.display = "none";
                                  e.target.parentElement.innerHTML = `<div class="text-blue-600 dark:text-blue-400 font-bold text-xl">${getInitials(app.applicant?.first_name, app.applicant?.last_name)}</div>`;
                                }}
                              />
                            ) : (
                              <div className="text-blue-600 dark:text-blue-400 font-bold text-xl">
                                {getInitials(
                                  app.applicant?.first_name,
                                  app.applicant?.last_name,
                                )}
                              </div>
                            )}
                          </div>
                          <div>
                            <h3
                              className={`text-lg font-semibold ${isDarkMode ? "text-white" : "text-gray-800"}`}
                            >
                              {app.applicant?.first_name}{" "}
                              {app.applicant?.last_name}
                            </h3>
                            <div className="flex flex-wrap gap-3 mt-1">
                              <span
                                className={`text-sm flex items-center gap-1 ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}
                              >
                                <Mail className="w-3 h-3" />
                                {app.applicant?.email}
                              </span>
                              {app.applicant?.mobile && (
                                <span
                                  className={`text-sm flex items-center gap-1 ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}
                                >
                                  <Phone className="w-3 h-3" />
                                  {app.applicant.mobile}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <div
                            className={`px-3 py-1.5 rounded-full text-sm font-semibold flex items-center gap-1 ${
                              app.status === "pending"
                                ? isDarkMode
                                  ? "bg-yellow-900/50 text-yellow-300"
                                  : "bg-yellow-100 text-yellow-700"
                                : app.status === "approved"
                                  ? isDarkMode
                                    ? "bg-green-900/50 text-green-300"
                                    : "bg-green-100 text-green-700"
                                  : isDarkMode
                                    ? "bg-red-900/50 text-red-300"
                                    : "bg-red-100 text-red-700"
                            }`}
                          >
                            {app.status === "pending" && (
                              <Clock className="w-3 h-3" />
                            )}
                            {app.status === "approved" && (
                              <CheckCircle className="w-3 h-3" />
                            )}
                            {app.status === "rejected" && (
                              <XCircle className="w-3 h-3" />
                            )}
                            <span className="capitalize">{app.status}</span>
                          </div>
                          <button
                            className={`p-2 rounded-lg transition-colors ${
                              isDarkMode
                                ? "hover:bg-gray-700 text-gray-300"
                                : "hover:bg-gray-100 text-gray-600"
                            }`}
                          >
                            {isExpanded ? (
                              <ChevronUp className="w-5 h-5" />
                            ) : (
                              <ChevronDown className="w-5 h-5" />
                            )}
                          </button>
                        </div>
                      </div>

                      <div
                        className={`grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4 pt-4 border-t ${isDarkMode ? "border-gray-700" : "border-gray-100"}`}
                      >
                        <div>
                          <p
                            className={`text-xs ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}
                          >
                            Business
                          </p>
                          <p
                            className={`text-sm font-medium truncate ${isDarkMode ? "text-gray-300" : "text-gray-800"}`}
                          >
                            {app.business?.name}
                          </p>
                        </div>
                        <div>
                          <p
                            className={`text-xs ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}
                          >
                            Plan
                          </p>
                          <p
                            className={`text-sm font-medium ${isDarkMode ? "text-gray-300" : "text-gray-800"}`}
                          >
                            {app.plan?.name}
                          </p>
                        </div>
                        <div>
                          <p
                            className={`text-xs ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}
                          >
                            Amount
                          </p>
                          <p
                            className={`text-sm font-bold ${isDarkMode ? "text-blue-400" : "text-blue-600"}`}
                          >
                            ₱{app.price_paid?.toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <p
                            className={`text-xs ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}
                          >
                            Applied
                          </p>
                          <p
                            className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}
                          >
                            {formatDate(app.created_at)}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Expanded Content */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3 }}
                          className={`border-t ${isDarkMode ? "border-gray-700" : "border-gray-100"}`}
                        >
                          <div
                            className={`p-5 ${isDarkMode ? "bg-gray-700/30" : "bg-gray-50/30"}`}
                          >
                            {/* Plan Details */}
                            <div className="mb-6">
                              <h4
                                className={`font-semibold mb-3 flex items-center gap-2 ${isDarkMode ? "text-white" : "text-gray-800"}`}
                              >
                                <Building className="w-4 h-4 text-blue-500" />
                                Plan Details
                              </h4>
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                <div
                                  className={`rounded-lg p-3 border ${isDarkMode ? "bg-gray-800 border-gray-600" : "bg-white border-gray-200"}`}
                                >
                                  <p
                                    className={`text-xs ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}
                                  >
                                    Plan Name
                                  </p>
                                  <p
                                    className={`font-medium ${isDarkMode ? "text-gray-300" : "text-gray-800"}`}
                                  >
                                    {app.plan?.name}
                                  </p>
                                </div>
                                <div
                                  className={`rounded-lg p-3 border ${isDarkMode ? "bg-gray-800 border-gray-600" : "bg-white border-gray-200"}`}
                                >
                                  <p
                                    className={`text-xs ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}
                                  >
                                    Price
                                  </p>
                                  <p
                                    className={`font-medium ${isDarkMode ? "text-blue-400" : "text-blue-600"}`}
                                  >
                                    ₱{app.price_paid?.toLocaleString()}/
                                    {app.plan?.duration}
                                  </p>
                                </div>
                                <div
                                  className={`rounded-lg p-3 border ${isDarkMode ? "bg-gray-800 border-gray-600" : "bg-white border-gray-200"}`}
                                >
                                  <p
                                    className={`text-xs ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}
                                  >
                                    Duration
                                  </p>
                                  <p
                                    className={`font-medium capitalize ${isDarkMode ? "text-gray-300" : "text-gray-800"}`}
                                  >
                                    {app.plan?.duration}
                                  </p>
                                </div>
                              </div>

                              {app.plan?.features &&
                                app.plan.features.length > 0 && (
                                  <div
                                    className={`mt-4 rounded-lg p-4 border ${isDarkMode ? "bg-gray-800 border-gray-600" : "bg-white border-gray-200"}`}
                                  >
                                    <p
                                      className={`text-sm font-semibold mb-2 ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}
                                    >
                                      Features
                                    </p>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                      {app.plan.features.map((feature, idx) => (
                                        <div
                                          key={idx}
                                          className="flex items-center gap-2 text-sm"
                                        >
                                          <Check className="w-4 h-4 text-green-500" />
                                          <span
                                            className={
                                              isDarkMode
                                                ? "text-gray-300"
                                                : "text-gray-600"
                                            }
                                          >
                                            {feature}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                            </div>

                            {/* Timeline */}
                            <div className="mb-6">
                              <h4
                                className={`font-semibold mb-3 flex items-center gap-2 ${isDarkMode ? "text-white" : "text-gray-800"}`}
                              >
                                <Calendar className="w-4 h-4 text-blue-500" />
                                Timeline
                              </h4>
                              <div className="space-y-2">
                                <div className="flex items-center gap-3 text-sm">
                                  <div
                                    className={`w-8 h-8 rounded-full flex items-center justify-center ${isDarkMode ? "bg-gray-700" : "bg-blue-100"}`}
                                  >
                                    <FileText
                                      className={`w-4 h-4 ${isDarkMode ? "text-blue-400" : "text-blue-600"}`}
                                    />
                                  </div>
                                  <div>
                                    <p
                                      className={`font-medium ${isDarkMode ? "text-gray-300" : "text-gray-800"}`}
                                    >
                                      Application Submitted
                                    </p>
                                    <p
                                      className={`text-xs ${isDarkMode ? "text-gray-500" : "text-gray-500"}`}
                                    >
                                      {formatDate(app.created_at)}
                                    </p>
                                  </div>
                                </div>
                                {app.payment_verified_at && (
                                  <div className="flex items-center gap-3 text-sm">
                                    <div
                                      className={`w-8 h-8 rounded-full flex items-center justify-center ${isDarkMode ? "bg-gray-700" : "bg-green-100"}`}
                                    >
                                      <CheckCircle
                                        className={`w-4 h-4 ${isDarkMode ? "text-green-400" : "text-green-600"}`}
                                      />
                                    </div>
                                    <div>
                                      <p
                                        className={`font-medium ${isDarkMode ? "text-gray-300" : "text-gray-800"}`}
                                      >
                                        Payment Verified
                                      </p>
                                      <p
                                        className={`text-xs ${isDarkMode ? "text-gray-500" : "text-gray-500"}`}
                                      >
                                        {formatDate(app.payment_verified_at)}
                                      </p>
                                    </div>
                                  </div>
                                )}
                                {app.reviewed_at && (
                                  <div className="flex items-center gap-3 text-sm">
                                    <div
                                      className={`w-8 h-8 rounded-full flex items-center justify-center ${isDarkMode ? "bg-gray-700" : "bg-purple-100"}`}
                                    >
                                      <Eye
                                        className={`w-4 h-4 ${isDarkMode ? "text-purple-400" : "text-purple-600"}`}
                                      />
                                    </div>
                                    <div>
                                      <p
                                        className={`font-medium ${isDarkMode ? "text-gray-300" : "text-gray-800"}`}
                                      >
                                        Application Reviewed
                                      </p>
                                      <p
                                        className={`text-xs ${isDarkMode ? "text-gray-500" : "text-gray-500"}`}
                                      >
                                        {formatDate(app.reviewed_at)}
                                      </p>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Payment Section */}
                            {isGcash && (
                              <div className="mb-6">
                                <h4
                                  className={`font-semibold mb-3 flex items-center gap-2 ${isDarkMode ? "text-white" : "text-gray-800"}`}
                                >
                                  <CreditCard className="w-4 h-4 text-blue-500" />
                                  Payment Details
                                </h4>
                                <div
                                  className={`rounded-lg p-4 border ${isDarkMode ? "bg-gray-800 border-gray-600" : "bg-white border-gray-200"}`}
                                >
                                  {hasReceipt ? (
                                    <div>
                                      <div className="mb-3">
                                        <p
                                          className={`text-sm mb-1 ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}
                                        >
                                          Payment Receipt
                                        </p>
                                        <div
                                          className={`rounded-lg p-2 inline-block cursor-pointer ${isDarkMode ? "bg-gray-700" : "bg-gray-100"}`}
                                          onClick={() =>
                                            viewReceipt(app.receipt_url_display)
                                          }
                                        >
                                          <img
                                            src={app.receipt_url_display}
                                            alt="Receipt"
                                            className="h-32 w-auto object-contain rounded"
                                            onError={(e) => {
                                              e.target.style.display = "none";
                                            }}
                                          />
                                          <p
                                            className={`text-xs text-center mt-1 ${isDarkMode ? "text-blue-400" : "text-blue-600"}`}
                                          >
                                            Click to enlarge
                                          </p>
                                        </div>
                                      </div>
                                      {app.payments && app.payments[0] && (
                                        <div className="grid grid-cols-2 gap-3 text-sm">
                                          <div>
                                            <p
                                              className={`${isDarkMode ? "text-gray-400" : "text-gray-500"}`}
                                            >
                                              Reference Number
                                            </p>
                                            <p
                                              className={`font-medium ${isDarkMode ? "text-gray-300" : "text-gray-800"}`}
                                            >
                                              {app.payments[0]
                                                .gcash_reference || "N/A"}
                                            </p>
                                          </div>
                                          <div>
                                            <p
                                              className={`${isDarkMode ? "text-gray-400" : "text-gray-500"}`}
                                            >
                                              GCash Number
                                            </p>
                                            <p
                                              className={`font-medium ${isDarkMode ? "text-gray-300" : "text-gray-800"}`}
                                            >
                                              {app.payments[0].gcash_number ||
                                                "N/A"}
                                            </p>
                                          </div>
                                        </div>
                                      )}
                                      {app.status === "pending" &&
                                        app.payment_status === "pending" && (
                                          <button
                                            className="mt-4 w-full py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors flex items-center justify-center gap-2"
                                            onClick={() =>
                                              handleVerifyPayment(app.id)
                                            }
                                            disabled={processing[app.id]}
                                          >
                                            {processing[app.id] ? (
                                              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                            ) : (
                                              <>
                                                <CheckCircle className="w-4 h-4" />
                                                Verify Payment
                                              </>
                                            )}
                                          </button>
                                        )}
                                      {isVerified && (
                                        <div
                                          className={`mt-3 p-2 rounded-lg text-sm flex items-center gap-2 ${isDarkMode ? "bg-green-900/30 text-green-300" : "bg-green-50 text-green-700"}`}
                                        >
                                          <CheckCircle className="w-4 h-4" />
                                          Payment verified - Ready for approval
                                        </div>
                                      )}
                                    </div>
                                  ) : (
                                    <div className="text-center py-6">
                                      <AlertCircle
                                        className={`w-12 h-12 mx-auto mb-2 ${isDarkMode ? "text-gray-600" : "text-gray-300"}`}
                                      />
                                      <p
                                        className={
                                          isDarkMode
                                            ? "text-gray-400"
                                            : "text-gray-500"
                                        }
                                      >
                                        No receipt uploaded
                                      </p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Onsite Payment Section */}
                            {app.payment_method?.toLowerCase() === "onsite" && (
                              <div className="mb-6">
                                <h4
                                  className={`font-semibold mb-3 flex items-center gap-2 ${isDarkMode ? "text-white" : "text-gray-800"}`}
                                >
                                  <Building className="w-4 h-4 text-blue-500" />
                                  Onsite Payment
                                </h4>
                                <div
                                  className={`rounded-lg p-4 border ${isDarkMode ? "bg-gray-800 border-gray-600" : "bg-white border-gray-200"}`}
                                >
                                  <div className="mb-3">
                                    <p
                                      className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}
                                    >
                                      Business Location
                                    </p>
                                    <p
                                      className={`font-medium ${isDarkMode ? "text-gray-300" : "text-gray-800"}`}
                                    >
                                      {app.business?.address ||
                                        app.business?.location ||
                                        "Address not provided"}
                                    </p>
                                  </div>
                                  <div className="mb-3">
                                    <p
                                      className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}
                                    >
                                      Amount to Collect
                                    </p>
                                    <p
                                      className={`text-xl font-bold ${isDarkMode ? "text-blue-400" : "text-blue-600"}`}
                                    >
                                      ₱{app.price_paid?.toLocaleString()}
                                    </p>
                                  </div>
                                  {app.status === "pending" &&
                                    app.payment_status === "pending" && (
                                      <button
                                        className="w-full py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors flex items-center justify-center gap-2"
                                        onClick={() =>
                                          handleVerifyPayment(app.id)
                                        }
                                        disabled={processing[app.id]}
                                      >
                                        {processing[app.id] ? (
                                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                        ) : (
                                          <>
                                            <CheckCircle className="w-4 h-4" />
                                            Mark as Paid
                                          </>
                                        )}
                                      </button>
                                    )}
                                </div>
                              </div>
                            )}

                            {/* Action Buttons - FIXED: Added text color for disabled state */}
                            {app.status === "pending" && (
                              <div className="flex gap-3">
                                <button
                                  className={`flex-1 py-2.5 rounded-lg font-semibold flex items-center justify-center gap-2 transition-all ${
                                    (isGcash && !isVerified) ||
                                    app.business_verification === "pending"
                                      ? isDarkMode
                                        ? "bg-gray-700 text-gray-400 cursor-not-allowed"
                                        : "bg-gray-300 text-gray-500 cursor-not-allowed"
                                      : "bg-gradient-to-r from-green-500 to-green-600 text-white hover:shadow-lg"
                                  }`}
                                  onClick={() => handleApprove(app.id)}
                                  disabled={
                                    processing[app.id] ||
                                    (isGcash && !isVerified) ||
                                    app.business_verification === "pending"
                                  }
                                >
                                  {processing[app.id] ? (
                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                  ) : (
                                    <>
                                      <CheckCircle className="w-4 h-4" />
                                      {app.business_verification === "pending"
                                        ? "Business Not Verified"
                                        : isGcash && !isVerified
                                          ? "Verify Payment First"
                                          : "Approve Application"}
                                    </>
                                  )}
                                </button>
                                <button
                                  className="flex-1 py-2.5 bg-red-500 text-white rounded-lg font-semibold hover:bg-red-600 transition-all flex items-center justify-center gap-2"
                                  onClick={() => handleReject(app.id)}
                                  disabled={processing[app.id]}
                                >
                                  {processing[app.id] ? (
                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                  ) : (
                                    <>
                                      <XCircle className="w-4 h-4" />
                                      Reject
                                    </>
                                  )}
                                </button>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <div
              className={`rounded-2xl shadow-lg p-12 text-center ${isDarkMode ? "bg-gray-800" : "bg-white"}`}
            >
              <div className="text-6xl mb-4">📋</div>
              <h3
                className={`text-xl font-semibold mb-2 ${isDarkMode ? "text-white" : "text-gray-800"}`}
              >
                No Applications Found
              </h3>
              <p
                className={`mb-4 ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}
              >
                There are no {filter !== "all" ? filter : ""} applications to
                display.
              </p>
              {filter !== "pending" && (
                <button
                  className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                  onClick={() => setFilter("pending")}
                >
                  View Pending Applications
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Receipt Modal */}
      {showReceiptModal && selectedReceipt && (
        <div
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
          onClick={() => setShowReceiptModal(false)}
        >
          <div
            className={`rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col ${isDarkMode ? "bg-gray-800" : "bg-white"}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className={`flex items-center justify-between p-4 border-b ${isDarkMode ? "border-gray-700" : "border-gray-200"}`}
            >
              <h3
                className={`text-lg font-semibold ${isDarkMode ? "text-white" : "text-gray-800"}`}
              >
                Payment Receipt
              </h3>
              <button
                onClick={() => setShowReceiptModal(false)}
                className={`p-1 rounded-lg transition-colors ${isDarkMode ? "hover:bg-gray-700" : "hover:bg-gray-100"}`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div
              className={`flex-1 overflow-y-auto p-4 ${isDarkMode ? "bg-gray-900" : "bg-gray-50"}`}
            >
              <img
                src={selectedReceipt}
                alt="Payment Receipt"
                className="max-w-full h-auto mx-auto rounded-lg shadow-lg"
              />
            </div>
            <div
              className={`flex justify-end gap-3 p-4 border-t ${isDarkMode ? "border-gray-700" : "border-gray-200"}`}
            >
              <a
                href={selectedReceipt}
                download="payment-receipt.jpg"
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Download className="w-4 h-4" />
                Download
              </a>
              <button
                onClick={() => setShowReceiptModal(false)}
                className={`px-4 py-2 border rounded-lg transition-colors ${isDarkMode ? "border-gray-600 text-gray-300 hover:bg-gray-700" : "border-gray-300 text-gray-700 hover:bg-gray-50"}`}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Applications;
