import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import OwnerNavbar from "../components/owner/OwnerNavbar";
import { toast, Toaster } from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "../contexts/ThemeContext";
import {
  Users,
  Search,
  Filter,
  Mail,
  Trash2,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  Calendar,
  DollarSign,
  CreditCard,
  Building,
  User,
  Phone,
  MapPin,
  Award,
  ChevronDown,
  ChevronUp,
  Download,
  Send,
  MessageSquare,
  UserPlus,
  TrendingUp,
  Activity,
  Star,
  Settings,
  AlertTriangle,
} from "lucide-react";

const OwnerMemberManagement = () => {
  const navigate = useNavigate();
  const { isDarkMode, toggleTheme } = useTheme();
  const [profile, setProfile] = useState(null);
  const [businesses, setBusinesses] = useState([]);
  const [members, setMembers] = useState([]);
  const [filteredMembers, setFilteredMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [memberAvatars, setMemberAvatars] = useState({});
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [messageSubject, setMessageSubject] = useState("");
  const [messageContent, setMessageContent] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState(null);
  const [messageType, setMessageType] = useState("announcement");
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [memberStats, setMemberStats] = useState(null);
  const [memberPayments, setMemberPayments] = useState([]);

  useEffect(() => {
    fetchOwnerData();
  }, []);

  useEffect(() => {
    filterMembers();
  }, [searchTerm, statusFilter, members]);

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

      if (businessesData && businessesData.length > 0) {
        const businessIds = businessesData.map((b) => b.id);
        await fetchMembers(businessIds);
      } else {
        setMembers([]);
        setFilteredMembers([]);
      }
    } catch (err) {
      console.error("Error fetching owner data:", err);
      setError(err.message);
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchMembers = async (businessIds) => {
    try {
      const { data: memberships, error: membershipsError } = await supabase
        .from("memberships")
        .select("*")
        .in("business_id", businessIds)
        .eq("status", "approved")
        .order("created_at", { ascending: false });

      if (membershipsError) throw membershipsError;

      if (!memberships || memberships.length === 0) {
        setMembers([]);
        setFilteredMembers([]);
        return;
      }

      const userIds = [...new Set(memberships.map((m) => m.user_id))];
      const planIds = [...new Set(memberships.map((m) => m.plan_id))];
      const uniqueBusinessIds = [
        ...new Set(memberships.map((m) => m.business_id)),
      ];

      const [profilesResponse, plansResponse, businessesResponse] =
        await Promise.all([
          supabase.from("profiles").select("*").in("id", userIds),
          supabase.from("membership_plans").select("*").in("id", planIds),
          supabase.from("businesses").select("*").in("id", uniqueBusinessIds),
        ]);

      if (profilesResponse.error) throw profilesResponse.error;
      if (plansResponse.error) throw plansResponse.error;
      if (businessesResponse.error) throw businessesResponse.error;

      const profilesMap = Object.fromEntries(
        (profilesResponse.data || []).map((p) => [p.id, p]),
      );
      const plansMap = Object.fromEntries(
        (plansResponse.data || []).map((p) => [p.id, p]),
      );
      const businessesMap = Object.fromEntries(
        (businessesResponse.data || []).map((b) => [b.id, b]),
      );

      const processedMembers = await Promise.all(
        (memberships || []).map(async (membership) => {
          const memberProfile = profilesMap[membership.user_id];
          const plan = plansMap[membership.plan_id];
          const business = businessesMap[membership.business_id];

          let avatarUrl = null;
          if (memberProfile?.avatar_url) {
            avatarUrl = await getMemberAvatarUrl(
              memberProfile.avatar_url,
              memberProfile.id,
            );
          }

          const now = new Date();
          const endDate = new Date(membership.end_date);
          const daysUntilExpiry = Math.ceil(
            (endDate - now) / (1000 * 60 * 60 * 24),
          );

          let membershipStatus = "active";
          if (daysUntilExpiry < 0) {
            membershipStatus = "expired";
          } else if (daysUntilExpiry <= 7) {
            membershipStatus = "expiring_soon";
          }

          return {
            id: membership.id,
            membershipId: membership.id,
            userId: memberProfile?.id,
            name: memberProfile
              ? `${memberProfile.first_name || ""} ${memberProfile.last_name || ""}`.trim() ||
                memberProfile.email?.split("@")[0] ||
                "Unknown User"
              : "Unknown User",
            email: memberProfile?.email || "No email",
            phone: memberProfile?.mobile || "Not provided",
            plan: plan?.name || "Standard Plan",
            planId: plan?.id,
            planDuration: plan?.duration,
            amount: `₱${membership.price_paid?.toLocaleString() || "0"}`,
            pricePaid: membership.price_paid,
            paymentStatus: membership.payment_status || "pending",
            paymentMethod: membership.payment_method || "Not specified",
            startDate: membership.start_date,
            endDate: membership.end_date,
            joinedDate: membership.created_at,
            daysUntilExpiry,
            membershipStatus,
            avatarUrl,
            businessName: business?.name || "Unknown Business",
            businessId: business?.id,
            businessEmoji: business?.emoji || "🏢",
            businessAddress: business?.address || "Not provided",
            businessLocation: business?.location || "Not provided",
            membershipStartDate: membership.start_date,
            membershipEndDate: membership.end_date,
          };
        }),
      );

      setMembers(processedMembers);
      setFilteredMembers(processedMembers);
    } catch (error) {
      console.error("Error fetching members:", error);
      setError("Failed to load members: " + error.message);
      toast.error("Failed to load members");
    }
  };

  const fetchMemberDetails = async (member) => {
    try {
      const { data: payments, error: paymentsError } = await supabase
        .from("payments")
        .select("*")
        .eq("membership_id", member.membershipId)
        .order("created_at", { ascending: false });

      if (paymentsError) throw paymentsError;

      const { data: activities, error: activitiesError } = await supabase
        .from("member_activities")
        .select("*")
        .eq("user_id", member.userId)
        .eq("business_id", member.businessId)
        .order("created_at", { ascending: false })
        .limit(10);

      if (activitiesError && activitiesError.code !== "PGRST116") {
        console.error("Error fetching activities:", activitiesError);
      }

      const totalPaid =
        payments?.reduce((sum, p) => sum + (p.amount || 0), 0) ||
        member.pricePaid ||
        0;
      const paymentCount = payments?.length || 1;

      setMemberStats({
        totalPaid,
        paymentCount,
        avgPayment: totalPaid / paymentCount,
        lastPayment: payments?.[0]?.created_at || member.joinedDate,
        activitiesCount: activities?.length || 0,
      });

      setMemberPayments(payments || []);
      setSelectedMember(member);
      setShowProfileModal(true);
    } catch (error) {
      console.error("Error fetching member details:", error);
      toast.error("Failed to load member details");
    }
  };

  const getMemberAvatarUrl = async (avatarPath, userId) => {
    if (!avatarPath) return null;
    if (memberAvatars[userId]) return memberAvatars[userId];

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
            setMemberAvatars((prev) => ({
              ...prev,
              [userId]: publicUrlData.publicUrl,
            }));
            return publicUrlData.publicUrl;
          }
        } catch (e) {
          console.log("Public URL not accessible");
        }
      }

      const { data, error } = await supabase.storage
        .from("avatars")
        .download(avatarPath);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      setMemberAvatars((prev) => ({ ...prev, [userId]: url }));
      return url;
    } catch (error) {
      console.error("Error getting member avatar:", error);
      return null;
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

  const filterMembers = () => {
    let filtered = [...members];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (member) =>
          member.name.toLowerCase().includes(term) ||
          member.email.toLowerCase().includes(term) ||
          member.plan.toLowerCase().includes(term) ||
          member.businessName.toLowerCase().includes(term),
      );
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter(
        (member) => member.membershipStatus === statusFilter,
      );
    }

    setFilteredMembers(filtered);
  };

  const handleSelectAll = () => {
    if (selectedMembers.length === filteredMembers.length) {
      setSelectedMembers([]);
    } else {
      setSelectedMembers(filteredMembers.map((m) => m.membershipId));
    }
  };

  const handleSelectMember = (membershipId) => {
    if (selectedMembers.includes(membershipId)) {
      setSelectedMembers(selectedMembers.filter((id) => id !== membershipId));
    } else {
      setSelectedMembers([...selectedMembers, membershipId]);
    }
  };

  const handleSendMessage = async () => {
    if (!messageSubject.trim() || !messageContent.trim()) {
      toast.error("Please enter both subject and message");
      return;
    }

    if (selectedMembers.length === 0) {
      toast.error("Please select at least one member");
      return;
    }

    setSendingMessage(true);

    try {
      const recipients = members.filter((m) =>
        selectedMembers.includes(m.membershipId),
      );
      let notificationType = "announcement";

      if (messageType === "promo") {
        notificationType = "promo";
      }

      const notifications = recipients.map((recipient) => ({
        user_id: recipient.userId,
        type: notificationType,
        title: messageSubject,
        message: messageContent,
        business_id: recipient.businessId,
        is_read: false,
        created_at: new Date().toISOString(),
        data: {
          sender: "owner",
          sender_name: profile
            ? `${profile.first_name || ""} ${profile.last_name || ""}`.trim()
            : "Owner",
          sender_id: profile?.id,
          business_name: recipient.businessName,
          business_id: recipient.businessId,
        },
      }));

      const { error } = await supabase
        .from("notifications")
        .insert(notifications);

      if (error) throw error;

      toast.success(
        `Message sent to ${recipients.length} member(s) successfully!`,
      );

      setMessageSubject("");
      setMessageContent("");
      setSelectedMembers([]);
      setShowMessageModal(false);
      setMessageType("announcement");
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Failed to send message: " + error.message);
    } finally {
      setSendingMessage(false);
    }
  };

  const handleRemoveMember = async () => {
    if (!memberToRemove) return;

    try {
      const { error } = await supabase
        .from("memberships")
        .update({
          status: "cancelled",
          updated_at: new Date().toISOString(),
        })
        .eq("id", memberToRemove.membershipId);

      if (error) throw error;

      setMembers(
        members.filter((m) => m.membershipId !== memberToRemove.membershipId),
      );
      setFilteredMembers(
        filteredMembers.filter(
          (m) => m.membershipId !== memberToRemove.membershipId,
        ),
      );

      toast.success(`${memberToRemove.name} has been removed from members`);
      setShowRemoveConfirm(false);
      setMemberToRemove(null);
    } catch (error) {
      console.error("Error removing member:", error);
      toast.error("Failed to remove member. Please try again.");
    }
  };

  const getInitials = (firstName, lastName) => {
    if (!firstName && !lastName) return "??";
    return `${firstName?.charAt(0) || ""}${lastName?.charAt(0) || ""}`.toUpperCase();
  };

  const getMembershipStatusBadge = (status) => {
    switch (status) {
      case "active":
        return (
          <span className="inline-flex items-center justify-center gap-1 px-2 py-1 bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 rounded-full text-xs font-semibold">
            <CheckCircle className="w-3 h-3" /> Active
          </span>
        );
      case "expiring_soon":
        return (
          <span className="inline-flex items-center justify-center gap-1 px-2 py-1 bg-yellow-100 dark:bg-yellow-900/50 text-yellow-700 dark:text-yellow-300 rounded-full text-xs font-semibold">
            <Clock className="w-3 h-3" /> Expiring Soon
          </span>
        );
      case "expired":
        return (
          <span className="inline-flex items-center justify-center gap-1 px-2 py-1 bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 rounded-full text-xs font-semibold">
            <XCircle className="w-3 h-3" /> Expired
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center justify-center px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full text-xs font-semibold">
            {status}
          </span>
        );
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    try {
      return new Date(dateString).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch (e) {
      return "Invalid Date";
    }
  };

  const getStats = () => {
    const total = members.length;
    const active = members.filter(
      (m) => m.membershipStatus === "active",
    ).length;
    const expiringSoon = members.filter(
      (m) => m.membershipStatus === "expiring_soon",
    ).length;
    const expired = members.filter(
      (m) => m.membershipStatus === "expired",
    ).length;
    return { total, active, expiringSoon, expired };
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
            Loading members...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className={`fixed inset-0 flex items-center justify-center ${
          isDarkMode
            ? "bg-gray-900"
            : "bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50"
        }`}
      >
        <div
          className={`rounded-2xl p-8 text-center max-w-md ${isDarkMode ? "bg-gray-800" : "bg-white"}`}
        >
          <div className="text-6xl mb-4">⚠️</div>
          <h2
            className={`text-xl font-semibold mb-2 ${isDarkMode ? "text-white" : "text-gray-800"}`}
          >
            Error Loading Members
          </h2>
          <p
            className={`mb-4 ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}
          >
            {error}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

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
                      Member Management
                    </h1>
                    <div className="absolute -bottom-2 left-0 w-20 h-1 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full animate-width-pulse"></div>
                  </div>
                </div>
                <p
                  className={`mt-2 flex items-center gap-2 ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}
                >
                  <Users className="w-4 h-4" />
                  Manage your business members and their memberships
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
                    Total Members
                  </p>
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {stats.total}
                  </p>
                </div>
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center ${isDarkMode ? "bg-blue-900/30" : "bg-blue-100"}`}
                >
                  <Users
                    className={`w-5 h-5 ${isDarkMode ? "text-blue-400" : "text-blue-600"}`}
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
                    Active Members
                  </p>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {stats.active}
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
                    Expiring Soon
                  </p>
                  <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                    {stats.expiringSoon}
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
                    Expired
                  </p>
                  <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                    {stats.expired}
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
          </div>

          {/* Action Bar */}
          <div className="flex flex-col lg:flex-row gap-4 mb-6">
            <div className="flex gap-2">
              <button
                className={`px-6 py-2.5 rounded-lg font-semibold flex items-center gap-2 transition-all ${
                  selectedMembers.length > 0
                    ? "bg-blue-500 text-white hover:bg-blue-600 shadow-md"
                    : isDarkMode
                      ? "bg-gray-700 text-gray-400 cursor-not-allowed"
                      : "bg-gray-100 text-gray-400 cursor-not-allowed"
                }`}
                onClick={() => setShowMessageModal(true)}
                disabled={selectedMembers.length === 0}
              >
                <Mail className="w-4 h-4" />
                Send Message ({selectedMembers.length})
              </button>
            </div>
            <div className="flex-1 flex flex-col sm:flex-row gap-3">
              <div className="flex-1 relative">
                <Search
                  className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}
                />
                <input
                  type="text"
                  placeholder="Search by name, email, business, or plan..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={`w-full pl-10 pr-4 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    isDarkMode
                      ? "bg-gray-800 border-gray-700 text-white placeholder-gray-500"
                      : "bg-white border-gray-300 text-gray-900"
                  }`}
                />
              </div>
              <select
                className={`px-4 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  isDarkMode
                    ? "bg-gray-800 border-gray-700 text-white"
                    : "bg-white border-gray-300 text-gray-900"
                }`}
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="expiring_soon">Expiring Soon</option>
                <option value="expired">Expired</option>
              </select>
            </div>
          </div>

          {/* Members Table */}
          {filteredMembers.length > 0 ? (
            <div
              className={`rounded-2xl shadow-lg border overflow-hidden ${
                isDarkMode
                  ? "bg-gray-800 border-gray-700"
                  : "bg-white border-gray-200"
              }`}
            >
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead
                    className={`border-b ${isDarkMode ? "bg-gray-700/50 border-gray-600" : "bg-gray-50 border-gray-200"}`}
                  >
                    <tr>
                      <th className="w-12 px-4 py-3 text-center">
                        <input
                          type="checkbox"
                          checked={
                            selectedMembers.length === filteredMembers.length &&
                            filteredMembers.length > 0
                          }
                          onChange={handleSelectAll}
                          className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700"
                        />
                      </th>
                      <th
                        className={`text-left px-4 py-3 text-xs font-semibold uppercase ${isDarkMode ? "text-gray-300" : "text-gray-600"}`}
                      >
                        Member
                      </th>
                      <th
                        className={`text-center px-4 py-3 text-xs font-semibold uppercase ${isDarkMode ? "text-gray-300" : "text-gray-600"}`}
                      >
                        Business
                      </th>
                      <th
                        className={`text-center px-4 py-3 text-xs font-semibold uppercase ${isDarkMode ? "text-gray-300" : "text-gray-600"}`}
                      >
                        Plan
                      </th>
                      <th
                        className={`text-center px-4 py-3 text-xs font-semibold uppercase ${isDarkMode ? "text-gray-300" : "text-gray-600"}`}
                      >
                        Membership Period
                      </th>
                      <th
                        className={`text-center px-4 py-3 text-xs font-semibold uppercase ${isDarkMode ? "text-gray-300" : "text-gray-600"}`}
                      >
                        Status
                      </th>
                      <th
                        className={`text-center px-4 py-3 text-xs font-semibold uppercase ${isDarkMode ? "text-gray-300" : "text-gray-600"}`}
                      >
                        Payment
                      </th>
                      <th
                        className={`text-center px-4 py-3 text-xs font-semibold uppercase ${isDarkMode ? "text-gray-300" : "text-gray-600"}`}
                      >
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody
                    className={`divide-y ${isDarkMode ? "divide-gray-700" : "divide-gray-200"}`}
                  >
                    {filteredMembers.map((member) => (
                      <tr
                        key={member.membershipId}
                        className={`transition-colors ${selectedMembers.includes(member.membershipId) ? (isDarkMode ? "bg-blue-900/20" : "bg-blue-50") : ""} ${isDarkMode ? "hover:bg-gray-700" : "hover:bg-gray-50"}`}
                      >
                        <td className="px-4 py-3 text-center">
                          <input
                            type="checkbox"
                            checked={selectedMembers.includes(
                              member.membershipId,
                            )}
                            onChange={() =>
                              handleSelectMember(member.membershipId)
                            }
                            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-10 h-10 rounded-full overflow-hidden flex items-center justify-center flex-shrink-0 ${
                                isDarkMode
                                  ? "bg-gray-700"
                                  : "bg-gradient-to-br from-blue-100 to-purple-100"
                              }`}
                            >
                              {member.avatarUrl ? (
                                <img
                                  src={member.avatarUrl}
                                  alt={member.name}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    e.target.style.display = "none";
                                    e.target.parentElement.innerHTML = `<div class="text-blue-600 dark:text-blue-400 font-bold">${getInitials(member.name.split(" ")[0], member.name.split(" ")[1])}</div>`;
                                  }}
                                />
                              ) : (
                                <div className="text-blue-600 dark:text-blue-400 font-bold">
                                  {getInitials(
                                    member.name.split(" ")[0],
                                    member.name.split(" ")[1],
                                  )}
                                </div>
                              )}
                            </div>
                            <div>
                              <p
                                className={`font-medium ${isDarkMode ? "text-white" : "text-gray-800"}`}
                              >
                                {member.name}
                              </p>
                              <p
                                className={`text-xs ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}
                              >
                                {member.email}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className={`inline-flex items-center justify-center gap-1 px-2 py-1 rounded-lg text-sm ${
                              isDarkMode
                                ? "bg-gray-700 text-gray-300"
                                : "bg-gray-100 text-gray-700"
                            }`}
                          >
                            <span>{member.businessEmoji}</span>
                            <span>{member.businessName}</span>
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div>
                            <p
                              className={`font-medium ${isDarkMode ? "text-white" : "text-gray-800"}`}
                            >
                              {member.plan}
                            </p>
                            <p
                              className={`text-xs ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}
                            >
                              {member.amount}
                            </p>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="text-sm">
                            <p
                              className={
                                isDarkMode ? "text-gray-300" : "text-gray-600"
                              }
                            >
                              {formatDate(member.startDate)} -{" "}
                              {formatDate(member.endDate)}
                            </p>
                            {member.daysUntilExpiry > 0 &&
                              member.daysUntilExpiry <= 30 && (
                                <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                                  {member.daysUntilExpiry} days left
                                </p>
                              )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex justify-center">
                            {getMembershipStatusBadge(member.membershipStatus)}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className={`inline-flex items-center justify-center gap-1 px-2 py-1 rounded-lg text-xs font-medium ${
                              member.paymentStatus === "paid"
                                ? isDarkMode
                                  ? "bg-green-900/50 text-green-300"
                                  : "bg-green-100 text-green-700"
                                : isDarkMode
                                  ? "bg-yellow-900/50 text-yellow-300"
                                  : "bg-yellow-100 text-yellow-700"
                            }`}
                          >
                            {member.paymentStatus === "paid" ? "✓" : "⏳"}{" "}
                            {member.paymentStatus}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => fetchMemberDetails(member)}
                              className={`p-2 rounded-lg transition-colors ${isDarkMode ? "text-blue-400 hover:bg-gray-700" : "text-blue-500 hover:bg-blue-50"}`}
                              title="View Profile"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                setSelectedMembers([member.membershipId]);
                                setShowMessageModal(true);
                              }}
                              className={`p-2 rounded-lg transition-colors ${isDarkMode ? "text-green-400 hover:bg-gray-700" : "text-green-500 hover:bg-green-50"}`}
                              title="Send Message"
                            >
                              <Mail className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                setMemberToRemove(member);
                                setShowRemoveConfirm(true);
                              }}
                              className={`p-2 rounded-lg transition-colors ${isDarkMode ? "text-red-400 hover:bg-gray-700" : "text-red-500 hover:bg-red-50"}`}
                              title="Remove Member"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div
              className={`rounded-2xl shadow-lg p-12 text-center ${isDarkMode ? "bg-gray-800" : "bg-white"}`}
            >
              <div className="text-6xl mb-4">👥</div>
              <h3
                className={`text-xl font-semibold mb-2 ${isDarkMode ? "text-white" : "text-gray-800"}`}
              >
                No Members Found
              </h3>
              <p
                className={`${isDarkMode ? "text-gray-400" : "text-gray-500"}`}
              >
                There are no members matching your search criteria
              </p>
              {businesses.length === 0 && (
                <p
                  className={`mt-2 ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}
                >
                  You don't have any businesses yet. Create a business to start
                  adding members.
                </p>
              )}
            </div>
          )}

          {/* Send Message Modal */}
          <AnimatePresence>
            {showMessageModal && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
                onClick={() => setShowMessageModal(false)}
              >
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.9, opacity: 0 }}
                  className={`rounded-2xl max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col ${isDarkMode ? "bg-gray-800" : "bg-white"}`}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div
                    className={`flex items-center justify-between p-6 border-b ${isDarkMode ? "border-gray-700" : "border-gray-200"}`}
                  >
                    <h3
                      className={`text-xl font-semibold ${isDarkMode ? "text-white" : "text-gray-800"}`}
                    >
                      Send Message to Members
                    </h3>
                    <button
                      onClick={() => setShowMessageModal(false)}
                      className={`p-1 rounded-lg ${isDarkMode ? "hover:bg-gray-700" : "hover:bg-gray-100"}`}
                    >
                      <XCircle
                        className={`w-5 h-5 ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}
                      />
                    </button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-6">
                    <div
                      className={`mb-4 p-3 rounded-lg ${isDarkMode ? "bg-blue-900/30" : "bg-blue-50"}`}
                    >
                      <p
                        className={`text-sm ${isDarkMode ? "text-blue-300" : "text-blue-700"}`}
                      >
                        Sending to:{" "}
                        <strong>{selectedMembers.length} member(s)</strong>
                      </p>
                    </div>

                    <div className="mb-4">
                      <label
                        className={`block text-sm font-medium mb-2 ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}
                      >
                        Message Type
                      </label>
                      <div className="space-y-2">
                        {[
                          {
                            value: "announcement",
                            label: "Announcement",
                            icon: "📢",
                          },
                          { value: "promo", label: "Promo", icon: "🎉" },
                        ].map((type) => (
                          <label
                            key={type.value}
                            className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                              isDarkMode
                                ? "border-gray-600 hover:bg-gray-700"
                                : "border-gray-200 hover:bg-gray-50"
                            }`}
                          >
                            <input
                              type="radio"
                              name="messageType"
                              value={type.value}
                              checked={messageType === type.value}
                              onChange={(e) => setMessageType(e.target.value)}
                              className="w-4 h-4 text-blue-600"
                            />
                            <span className="text-lg">{type.icon}</span>
                            <span
                              className={`text-sm font-medium ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}
                            >
                              {type.label}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="mb-4">
                      <label
                        className={`block text-sm font-medium mb-2 ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}
                      >
                        Subject
                      </label>
                      <input
                        type="text"
                        className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          isDarkMode
                            ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                            : "bg-white border-gray-300 text-gray-900"
                        }`}
                        placeholder="Enter message subject..."
                        value={messageSubject}
                        onChange={(e) => setMessageSubject(e.target.value)}
                      />
                    </div>

                    <div className="mb-4">
                      <label
                        className={`block text-sm font-medium mb-2 ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}
                      >
                        Message
                      </label>
                      <textarea
                        className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none ${
                          isDarkMode
                            ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                            : "bg-white border-gray-300 text-gray-900"
                        }`}
                        rows="6"
                        placeholder="Type your message here..."
                        value={messageContent}
                        onChange={(e) => setMessageContent(e.target.value)}
                      ></textarea>
                    </div>
                  </div>
                  <div
                    className={`flex justify-end gap-3 p-6 border-t ${isDarkMode ? "border-gray-700" : "border-gray-200"}`}
                  >
                    <button
                      onClick={() => setShowMessageModal(false)}
                      className={`px-6 py-2.5 border rounded-lg font-medium transition-colors ${
                        isDarkMode
                          ? "border-gray-600 text-gray-300 hover:bg-gray-700"
                          : "border-gray-300 text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSendMessage}
                      disabled={sendingMessage}
                      className="px-6 py-2.5 bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-600 transition-colors disabled:opacity-50 flex items-center gap-2 shadow-md"
                    >
                      {sendingMessage ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                      {sendingMessage ? "Sending..." : "Send Message"}
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Member Profile Modal */}
          <AnimatePresence>
            {showProfileModal && selectedMember && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
                onClick={() => setShowProfileModal(false)}
              >
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.9, opacity: 0 }}
                  className={`rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col ${isDarkMode ? "bg-gray-800" : "bg-white"}`}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="relative bg-gradient-to-r from-blue-500 to-indigo-600 p-6 text-white">
                    <button
                      onClick={() => setShowProfileModal(false)}
                      className="absolute top-4 right-4 text-white hover:text-gray-200"
                    >
                      <XCircle className="w-6 h-6" />
                    </button>
                    <div className="flex items-center gap-4">
                      <div className="w-20 h-20 rounded-full overflow-hidden bg-white/20 backdrop-blur flex items-center justify-center">
                        {selectedMember.avatarUrl ? (
                          <img
                            src={selectedMember.avatarUrl}
                            alt={selectedMember.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <User className="w-10 h-10 text-white" />
                        )}
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold">
                          {selectedMember.name}
                        </h2>
                        <p className="text-blue-100">{selectedMember.email}</p>
                        {selectedMember.phone &&
                          selectedMember.phone !== "Not provided" && (
                            <p className="text-blue-100 text-sm flex items-center gap-1 mt-1">
                              <Phone className="w-3 h-3" />
                              {selectedMember.phone}
                            </p>
                          )}
                      </div>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-6">
                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <div
                        className={`rounded-lg p-3 text-center ${isDarkMode ? "bg-gray-700" : "bg-gray-50"}`}
                      >
                        <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                          {memberStats?.totalPaid?.toLocaleString() ||
                            selectedMember.pricePaid?.toLocaleString()}
                        </p>
                        <p
                          className={`text-xs ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}
                        >
                          Total Paid
                        </p>
                      </div>
                      <div
                        className={`rounded-lg p-3 text-center ${isDarkMode ? "bg-gray-700" : "bg-gray-50"}`}
                      >
                        <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                          {memberStats?.paymentCount || 1}
                        </p>
                        <p
                          className={`text-xs ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}
                        >
                          Payments Made
                        </p>
                      </div>
                      <div
                        className={`rounded-lg p-3 text-center ${isDarkMode ? "bg-gray-700" : "bg-gray-50"}`}
                      >
                        <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                          {selectedMember.plan}
                        </p>
                        <p
                          className={`text-xs ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}
                        >
                          Current Plan
                        </p>
                      </div>
                      <div
                        className={`rounded-lg p-3 text-center ${isDarkMode ? "bg-gray-700" : "bg-gray-50"}`}
                      >
                        <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                          {selectedMember.daysUntilExpiry > 0
                            ? `${selectedMember.daysUntilExpiry}d`
                            : "Expired"}
                        </p>
                        <p
                          className={`text-xs ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}
                        >
                          Days Remaining
                        </p>
                      </div>
                    </div>

                    <div className="mb-6">
                      <h3
                        className={`font-semibold mb-3 flex items-center gap-2 ${isDarkMode ? "text-white" : "text-gray-800"}`}
                      >
                        <Calendar className="w-4 h-4 text-blue-500" />
                        Membership Details
                      </h3>
                      <div
                        className={`rounded-lg p-4 space-y-2 ${isDarkMode ? "bg-gray-700" : "bg-gray-50"}`}
                      >
                        <div className="flex justify-between">
                          <span
                            className={
                              isDarkMode ? "text-gray-400" : "text-gray-600"
                            }
                          >
                            Start Date:
                          </span>
                          <span
                            className={`font-medium ${isDarkMode ? "text-white" : "text-gray-800"}`}
                          >
                            {formatDate(selectedMember.startDate)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span
                            className={
                              isDarkMode ? "text-gray-400" : "text-gray-600"
                            }
                          >
                            End Date:
                          </span>
                          <span
                            className={`font-medium ${isDarkMode ? "text-white" : "text-gray-800"}`}
                          >
                            {formatDate(selectedMember.endDate)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span
                            className={
                              isDarkMode ? "text-gray-400" : "text-gray-600"
                            }
                          >
                            Joined:
                          </span>
                          <span
                            className={`font-medium ${isDarkMode ? "text-white" : "text-gray-800"}`}
                          >
                            {formatDate(selectedMember.joinedDate)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span
                            className={
                              isDarkMode ? "text-gray-400" : "text-gray-600"
                            }
                          >
                            Status:
                          </span>
                          {getMembershipStatusBadge(
                            selectedMember.membershipStatus,
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="mb-6">
                      <h3
                        className={`font-semibold mb-3 flex items-center gap-2 ${isDarkMode ? "text-white" : "text-gray-800"}`}
                      >
                        <Building className="w-4 h-4 text-blue-500" />
                        Business Information
                      </h3>
                      <div
                        className={`rounded-lg p-4 space-y-2 ${isDarkMode ? "bg-gray-700" : "bg-gray-50"}`}
                      >
                        <div className="flex justify-between">
                          <span
                            className={
                              isDarkMode ? "text-gray-400" : "text-gray-600"
                            }
                          >
                            Business:
                          </span>
                          <span
                            className={`font-medium ${isDarkMode ? "text-white" : "text-gray-800"}`}
                          >
                            {selectedMember.businessName}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span
                            className={
                              isDarkMode ? "text-gray-400" : "text-gray-600"
                            }
                          >
                            Address:
                          </span>
                          <span
                            className={`font-medium ${isDarkMode ? "text-white" : "text-gray-800"}`}
                          >
                            {selectedMember.businessAddress}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span
                            className={
                              isDarkMode ? "text-gray-400" : "text-gray-600"
                            }
                          >
                            Location:
                          </span>
                          <span
                            className={`font-medium ${isDarkMode ? "text-white" : "text-gray-800"}`}
                          >
                            {selectedMember.businessLocation}
                          </span>
                        </div>
                      </div>
                    </div>

                    {memberPayments.length > 0 && (
                      <div>
                        <h3
                          className={`font-semibold mb-3 flex items-center gap-2 ${isDarkMode ? "text-white" : "text-gray-800"}`}
                        >
                          <CreditCard className="w-4 h-4 text-blue-500" />
                          Payment History
                        </h3>
                        <div className="space-y-2">
                          {memberPayments.slice(0, 5).map((payment, idx) => (
                            <div
                              key={idx}
                              className={`rounded-lg p-3 flex justify-between items-center ${isDarkMode ? "bg-gray-700" : "bg-gray-50"}`}
                            >
                              <div>
                                <p
                                  className={`font-medium ${isDarkMode ? "text-white" : "text-gray-800"}`}
                                >
                                  ₱{payment.amount?.toLocaleString()}
                                </p>
                                <p
                                  className={`text-xs ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}
                                >
                                  {formatDate(payment.created_at)}
                                </p>
                              </div>
                              <span
                                className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  payment.payment_status === "paid"
                                    ? isDarkMode
                                      ? "bg-green-900/50 text-green-300"
                                      : "bg-green-100 text-green-700"
                                    : isDarkMode
                                      ? "bg-yellow-900/50 text-yellow-300"
                                      : "bg-yellow-100 text-yellow-700"
                                }`}
                              >
                                {payment.payment_status || "pending"}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div
                    className={`flex justify-end gap-3 p-6 border-t ${isDarkMode ? "border-gray-700" : "border-gray-200"}`}
                  >
                    <button
                      onClick={() => {
                        setSelectedMembers([selectedMember.membershipId]);
                        setShowProfileModal(false);
                        setShowMessageModal(true);
                      }}
                      className="px-6 py-2.5 border border-blue-500 text-blue-500 dark:text-blue-400 rounded-lg font-medium hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors flex items-center gap-2"
                    >
                      <Mail className="w-4 h-4" />
                      Send Message
                    </button>
                    <button
                      onClick={() => setShowProfileModal(false)}
                      className={`px-6 py-2.5 rounded-lg font-medium transition-colors ${
                        isDarkMode
                          ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                    >
                      Close
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Remove Confirmation Modal */}
          <AnimatePresence>
            {showRemoveConfirm && memberToRemove && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
                onClick={() => setShowRemoveConfirm(false)}
              >
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.9, opacity: 0 }}
                  className={`rounded-2xl max-w-md w-full p-6 ${isDarkMode ? "bg-gray-800" : "bg-white"}`}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="text-center mb-4">
                    <div
                      className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${isDarkMode ? "bg-red-900/30" : "bg-red-100"}`}
                    >
                      <AlertTriangle
                        className={`w-8 h-8 ${isDarkMode ? "text-red-400" : "text-red-600"}`}
                      />
                    </div>
                    <h3
                      className={`text-xl font-semibold mb-2 ${isDarkMode ? "text-white" : "text-gray-800"}`}
                    >
                      Remove Member
                    </h3>
                    <p
                      className={`${isDarkMode ? "text-gray-400" : "text-gray-600"}`}
                    >
                      Are you sure you want to remove{" "}
                      <strong
                        className={isDarkMode ? "text-white" : "text-gray-800"}
                      >
                        {memberToRemove.name}
                      </strong>{" "}
                      from your members?
                    </p>
                    <p
                      className={`text-sm mt-2 ${isDarkMode ? "text-gray-500" : "text-gray-500"}`}
                    >
                      This will mark their membership as cancelled. The member
                      will be notified of this change.
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowRemoveConfirm(false)}
                      className={`flex-1 px-4 py-2.5 border rounded-lg font-medium transition-colors ${
                        isDarkMode
                          ? "border-gray-600 text-gray-300 hover:bg-gray-700"
                          : "border-gray-300 text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleRemoveMember}
                      className="flex-1 px-4 py-2.5 bg-red-500 text-white rounded-lg font-semibold hover:bg-red-600 transition-colors"
                    >
                      Remove Member
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default OwnerMemberManagement;
