import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import OwnerNavbar from "../components/owner/OwnerNavbar";
import { motion, AnimatePresence } from "framer-motion";
import {
  User,
  Mail,
  Phone,
  Building,
  Calendar,
  Edit2,
  Lock,
  Camera,
  Save,
  X,
  Eye,
  EyeOff,
  Crown,
  Shield,
  UserCheck,
  Briefcase,
  MapPin,
  CreditCard,
  CheckCircle,
  Clock,
  AlertCircle,
  TrendingUp,
  Star,
  Award,
  Sparkles,
  Heart,
  Zap,
  Layers,
  Gift,
  Activity,
  Users,
  DollarSign,
  BarChart3,
  Target,
  Trophy,
  Coffee,
  Smile,
  ThumbsUp,
  Calendar as CalendarIcon,
  Check,
  ChevronRight,
  ShoppingBag,
  MessageSquare,
  Store,
  PieChart,
  TrendingDown,
  Percent,
  CalendarDays,
  StarHalf,
  Medal,
  Rocket,
  Target as TargetIcon
} from "lucide-react";

const OwnerProfile = () => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Owner specific data states
  const [businesses, setBusinesses] = useState([]);
  const [selectedBusiness, setSelectedBusiness] = useState(null);
  const [businessStats, setBusinessStats] = useState({
    totalMembers: 0,
    activeMemberships: 0,
    pendingApplications: 0,
    totalRevenue: 0,
    monthlyRevenue: 0,
    averageRating: 0,
    totalReviews: 0,
    membershipGrowth: 0,
    revenueGrowth: 0
  });
  
  const [recentMembers, setRecentMembers] = useState([]);
  const [recentApplications, setRecentApplications] = useState([]);
  const [achievements, setAchievements] = useState([]);
  const [loadingStats, setLoadingStats] = useState(false);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [loadingApplications, setLoadingApplications] = useState(false);
  const [loadingAchievements, setLoadingAchievements] = useState(false);

  // Password visibility states
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const navigate = useNavigate();

  // User data state
  const [userData, setUserData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    mobile: "",
    business_name: "",
    role: "owner",
  });

  // Password change state
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [passwordErrors, setPasswordErrors] = useState({});
  const [passwordSuccess, setPasswordSuccess] = useState("");

  useEffect(() => {
    checkUser();
  }, []);

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

      if (profile) {
        setUserData({
          first_name: profile.first_name || "",
          last_name: profile.last_name || "",
          email: profile.email || user.email,
          mobile: profile.mobile || "",
          business_name: profile.business_name || "",
          role: profile.role || "owner",
        });

        // Get avatar URL if exists
        if (profile.avatar_url) {
          const { data } = supabase.storage
            .from("avatars")
            .getPublicUrl(profile.avatar_url);

          if (data?.publicUrl) {
            setAvatarUrl(data.publicUrl);
          }
        }

        // Fetch owner-specific data
        await fetchOwnerBusinesses(user.id);
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchOwnerBusinesses = async (userId) => {
    try {
      setLoadingStats(true);
      
      // Fetch businesses owned by this user
      const { data: businessesData, error: businessesError } = await supabase
        .from("businesses")
        .select("*")
        .eq("owner_id", userId);

      if (businessesError) throw businessesError;

      setBusinesses(businessesData || []);
      
      if (businessesData && businessesData.length > 0) {
        setSelectedBusiness(businessesData[0]);
        await Promise.all([
          fetchBusinessStats(businessesData[0].id),
          fetchRecentMembers(businessesData[0].id),
          fetchRecentApplications(businessesData[0].id),
          fetchBusinessAchievements(businessesData[0].id, userId)
        ]);
      }
    } catch (error) {
      console.error("Error fetching businesses:", error);
    } finally {
      setLoadingStats(false);
    }
  };

  const fetchBusinessStats = async (businessId) => {
    try {
      // Get total members (approved memberships)
      const { count: totalMembers, error: membersError } = await supabase
        .from("memberships")
        .select("*", { count: "exact", head: true })
        .eq("business_id", businessId)
        .eq("status", "approved");

      if (membersError) throw membersError;

      // Get active members (end_date >= today)
      const { count: activeMembers, error: activeError } = await supabase
        .from("memberships")
        .select("*", { count: "exact", head: true })
        .eq("business_id", businessId)
        .eq("status", "approved")
        .gte("end_date", new Date().toISOString());

      if (activeError) throw activeError;

      // Get pending applications
      const { count: pendingApps, error: pendingError } = await supabase
        .from("memberships")
        .select("*", { count: "exact", head: true })
        .eq("business_id", businessId)
        .eq("status", "pending");

      if (pendingError) throw pendingError;

      // Get ALL payments with status 'paid' for total revenue
      const { data: allPaidPayments, error: allPaymentsError } = await supabase
        .from("payments")
        .select("amount, paid_at")
        .eq("business_id", businessId)
        .eq("payment_status", "paid");

      if (allPaymentsError) throw allPaymentsError;

      const totalRevenue = allPaidPayments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;

      // Calculate monthly revenue (current month) - using paid_at
      const currentDate = new Date();
      const currentMonth = currentDate.getMonth();
      const currentYear = currentDate.getFullYear();
      
      const monthlyRevenue = allPaidPayments?.filter(p => {
        if (!p.paid_at) return false;
        const paidDate = new Date(p.paid_at);
        return paidDate.getMonth() === currentMonth && paidDate.getFullYear() === currentYear;
      }).reduce((sum, p) => sum + (p.amount || 0), 0) || 0;

      // Get reviews and rating
      const { data: reviews, error: reviewsError } = await supabase
        .from("reviews")
        .select("rating")
        .eq("business_id", businessId);

      if (reviewsError) throw reviewsError;

      const averageRating = reviews?.length > 0 
        ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length 
        : 0;

      const totalReviews = reviews?.length || 0;

      // Calculate revenue growth (compare with last month)
      const lastMonth = new Date();
      lastMonth.setMonth(lastMonth.getMonth() - 1);
      const lastMonthStart = new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 1);
      const lastMonthEnd = new Date(lastMonth.getFullYear(), lastMonth.getMonth() + 1, 0, 23, 59, 59);
      
      const lastMonthRevenue = allPaidPayments?.filter(p => {
        if (!p.paid_at) return false;
        const paidDate = new Date(p.paid_at);
        return paidDate >= lastMonthStart && paidDate <= lastMonthEnd;
      }).reduce((sum, p) => sum + (p.amount || 0), 0) || 0;

      const revenueGrowth = lastMonthRevenue > 0 
        ? ((monthlyRevenue - lastMonthRevenue) / lastMonthRevenue) * 100 
        : monthlyRevenue > 0 ? 100 : 0;

      // Calculate membership growth (compare with last month)
      const lastMonthMembersStart = new Date();
      lastMonthMembersStart.setMonth(lastMonthMembersStart.getMonth() - 1);
      lastMonthMembersStart.setDate(1);
      lastMonthMembersStart.setHours(0, 0, 0, 0);
      
      const lastMonthMembersEnd = new Date(lastMonthMembersStart);
      lastMonthMembersEnd.setMonth(lastMonthMembersEnd.getMonth() + 1);
      lastMonthMembersEnd.setDate(0);
      lastMonthMembersEnd.setHours(23, 59, 59, 999);
      
      const { count: lastMonthMembers, error: lastMonthError } = await supabase
        .from("memberships")
        .select("*", { count: "exact", head: true })
        .eq("business_id", businessId)
        .eq("status", "approved")
        .lt("created_at", lastMonthMembersEnd.toISOString());

      let membershipGrowth = 0;
      if (!lastMonthError) {
        membershipGrowth = lastMonthMembers > 0 
          ? ((totalMembers - lastMonthMembers) / lastMonthMembers) * 100 
          : totalMembers > 0 ? 100 : 0;
      }

      setBusinessStats({
        totalMembers: totalMembers || 0,
        activeMemberships: activeMembers || 0,
        pendingApplications: pendingApps || 0,
        totalRevenue,
        monthlyRevenue,
        averageRating: parseFloat(averageRating.toFixed(1)),
        totalReviews,
        membershipGrowth: parseFloat(membershipGrowth.toFixed(1)),
        revenueGrowth: parseFloat(revenueGrowth.toFixed(1))
      });
    } catch (error) {
      console.error("Error fetching business stats:", error);
    }
  };

  const fetchRecentMembers = async (businessId) => {
    try {
      setLoadingMembers(true);

      const { data, error } = await supabase
        .from("memberships")
        .select(`
          id,
          user_id,
          created_at,
          price_paid,
          payment_method,
          profiles:user_id (
            first_name,
            last_name,
            email,
            avatar_url
          ),
          membership_plans:plan_id (
            name
          )
        `)
        .eq("business_id", businessId)
        .eq("status", "approved")
        .order("created_at", { ascending: false })
        .limit(5);

      if (error) throw error;

      const members = data?.map(m => ({
        id: m.id,
        name: `${m.profiles?.first_name || ""} ${m.profiles?.last_name || ""}`.trim() || "Unknown",
        email: m.profiles?.email,
        plan: m.membership_plans?.name || "Standard Plan",
        amount: m.price_paid,
        joined: formatTimeAgo(m.created_at),
        avatar: m.profiles?.avatar_url
      })) || [];

      setRecentMembers(members);
    } catch (error) {
      console.error("Error fetching recent members:", error);
    } finally {
      setLoadingMembers(false);
    }
  };

  const fetchRecentApplications = async (businessId) => {
    try {
      setLoadingApplications(true);

      const { data, error } = await supabase
        .from("memberships")
        .select(`
          id,
          user_id,
          created_at,
          price_paid,
          payment_method,
          status,
          profiles:user_id (
            first_name,
            last_name,
            email,
            avatar_url
          ),
          membership_plans:plan_id (
            name
          )
        `)
        .eq("business_id", businessId)
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(5);

      if (error) throw error;

      const applications = data?.map(app => ({
        id: app.id,
        name: `${app.profiles?.first_name || ""} ${app.profiles?.last_name || ""}`.trim() || "Unknown",
        email: app.profiles?.email,
        plan: app.membership_plans?.name || "Standard Plan",
        amount: app.price_paid,
        timeAgo: formatTimeAgo(app.created_at),
        avatar: app.profiles?.avatar_url
      })) || [];

      setRecentApplications(applications);
    } catch (error) {
      console.error("Error fetching recent applications:", error);
    } finally {
      setLoadingApplications(false);
    }
  };

  const fetchBusinessAchievements = async (businessId, ownerId) => {
    try {
      setLoadingAchievements(true);

      const achievementsList = [];
      let businessComplete = 0;

      // Check business profile completion
      const business = businesses.find(b => b.id === businessId);
      if (business) {
        if (business.name && business.name !== "") businessComplete += 20;
        if (business.description && business.description !== "") businessComplete += 20;
        if (business.location && business.location !== "") businessComplete += 20;
        if (business.business_type && business.business_type !== "") businessComplete += 20;
        if (business.contact_phone || business.contact_email) businessComplete += 20;
      }

      // Get total members count
      const { count: totalMembers } = await supabase
        .from("memberships")
        .select("*", { count: "exact", head: true })
        .eq("business_id", businessId)
        .eq("status", "approved");

      // Get total revenue from PAID payments only
      const { data: paidPayments } = await supabase
        .from("payments")
        .select("amount")
        .eq("business_id", businessId)
        .eq("payment_status", "paid");

      const totalRevenue = paidPayments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;

      // Get reviews count and rating
      const { data: reviews } = await supabase
        .from("reviews")
        .select("rating")
        .eq("business_id", businessId);

      const reviewsCount = reviews?.length || 0;
      const averageRating = reviews?.length > 0 
        ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length 
        : 0;

      // Build achievements
      achievementsList.push({
        id: "first_member",
        title: "First Member",
        description: "Get your first member",
        icon: <Users className="w-5 h-5" />,
        completed: (totalMembers || 0) >= 1,
        progress: (totalMembers || 0) >= 1 ? 100 : 0
      });

      achievementsList.push({
        id: "growing_business",
        title: "Growing Business",
        description: "Reach 10 members",
        icon: <TrendingUp className="w-5 h-5" />,
        completed: (totalMembers || 0) >= 10,
        progress: Math.min(100, ((totalMembers || 0) / 10) * 100)
      });

      // Revenue Milestone - Check total revenue from PAID payments
      achievementsList.push({
        id: "revenue_milestone",
        title: "Revenue Milestone",
        description: "Earn ₱10,000 total revenue",
        icon: <DollarSign className="w-5 h-5" />,
        completed: totalRevenue >= 10000,
        progress: Math.min(100, (totalRevenue / 10000) * 100)
      });

      // Top Rated - Check average rating from reviews
      achievementsList.push({
        id: "top_rated",
        title: "Top Rated",
        description: "Achieve 4.5+ star rating",
        icon: <Star className="w-5 h-5" />,
        completed: averageRating >= 4.5,
        progress: Math.min(100, (averageRating / 5) * 100)
      });

      achievementsList.push({
        id: "first_review",
        title: "First Review",
        description: "Receive your first review",
        icon: <MessageSquare className="w-5 h-5" />,
        completed: (reviewsCount || 0) >= 1,
        progress: (reviewsCount || 0) >= 1 ? 100 : 0
      });

      achievementsList.push({
        id: "business_complete",
        title: "Business Complete",
        description: "Complete your business profile",
        icon: <Store className="w-5 h-5" />,
        completed: businessComplete >= 100,
        progress: businessComplete
      });

      achievementsList.push({
        id: "verified_business",
        title: "Verified Business",
        description: "Get your business verified",
        icon: <Shield className="w-5 h-5" />,
        completed: business?.verification_status === "verified",
        progress: business?.verification_status === "verified" ? 100 : 0
      });

      setAchievements(achievementsList);
    } catch (error) {
      console.error("Error fetching achievements:", error);
    } finally {
      setLoadingAchievements(false);
    }
  };

  const uploadAvatar = async (event) => {
    try {
      setUploading(true);

      if (!event.target.files || event.target.files.length === 0) {
        throw new Error("You must select an image to upload.");
      }

      const file = event.target.files[0];

      if (!file.type.startsWith("image/")) {
        throw new Error("Please select an image file (JPEG, PNG, etc.)");
      }

      if (file.size > 2 * 1024 * 1024) {
        throw new Error("Image size must be less than 2MB");
      }

      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      const filePath = fileName;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          avatar_url: filePath,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);

      if (updateError) throw updateError;

      if (urlData?.publicUrl) {
        setAvatarUrl(urlData.publicUrl);
      }

      alert("Avatar uploaded successfully!");
    } catch (error) {
      console.error("Error in uploadAvatar:", error);
      alert(error.message || "Error uploading avatar!");
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          first_name: userData.first_name,
          last_name: userData.last_name,
          mobile: userData.mobile,
          business_name: userData.business_name,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);

      if (error) throw error;

      setIsEditing(false);
      alert("Profile updated successfully!");
      await getUserProfile(user);
    } catch (error) {
      console.error("Error updating profile:", error);
      alert("Failed to update profile. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setUserData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData((prev) => ({
      ...prev,
      [name]: value,
    }));
    setPasswordErrors((prev) => ({ ...prev, [name]: "" }));
    setPasswordSuccess("");
  };

  const validatePassword = () => {
    const errors = {};

    if (!passwordData.currentPassword) {
      errors.currentPassword = "Current password is required";
    }

    if (!passwordData.newPassword) {
      errors.newPassword = "New password is required";
    } else if (passwordData.newPassword.length < 8) {
      errors.newPassword = "Password must be at least 8 characters";
    }

    if (!passwordData.confirmPassword) {
      errors.confirmPassword = "Please confirm your password";
    } else if (passwordData.newPassword !== passwordData.confirmPassword) {
      errors.confirmPassword = "Passwords do not match";
    }

    return errors;
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    const errors = validatePassword();

    if (Object.keys(errors).length === 0) {
      try {
        const { error } = await supabase.auth.updateUser({
          password: passwordData.newPassword,
        });

        if (error) throw error;

        setPasswordSuccess("Password changed successfully!");
        setPasswordData({
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        });
        setIsChangingPassword(false);
        setTimeout(() => setPasswordSuccess(""), 3000);
      } catch (error) {
        console.error("Error changing password:", error);
        setPasswordErrors({ currentPassword: "Current password is incorrect" });
      }
    } else {
      setPasswordErrors(errors);
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

  const getFirstName = () => {
    if (userData.first_name) {
      return userData.first_name;
    }
    if (user?.email) {
      const username = user.email.split("@")[0];
      return username.charAt(0).toUpperCase() + username.slice(1);
    }
    return "Owner";
  };

  const getInitials = () => {
    if (userData.first_name) {
      return userData.first_name.charAt(0).toUpperCase();
    }
    if (userData.last_name) {
      return userData.last_name.charAt(0).toUpperCase();
    }
    if (user?.email) {
      return user.email.charAt(0).toUpperCase();
    }
    return "O";
  };

  const getUserRole = () => {
    if (userData.role === "owner") return "Business Owner";
    if (userData.role === "admin") return "Admin";
    return "Client";
  };

  const getRoleColor = () => {
    if (userData.role === "owner") return "from-blue-500 to-cyan-500";
    if (userData.role === "admin") return "from-purple-500 to-pink-500";
    return "from-green-500 to-emerald-500";
  };

  const getRoleIcon = () => {
    if (userData.role === "owner") return <Crown className="w-4 h-4" />;
    if (userData.role === "admin") return <Shield className="w-4 h-4" />;
    return <UserCheck className="w-4 h-4" />;
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatCurrency = (amount) => {
    return `₱${amount?.toLocaleString() || 0}`;
  };

  const handleBusinessChange = async (businessId) => {
    const business = businesses.find(b => b.id === businessId);
    setSelectedBusiness(business);
    await Promise.all([
      fetchBusinessStats(businessId),
      fetchRecentMembers(businessId),
      fetchRecentApplications(businessId),
      fetchBusinessAchievements(businessId, user.id)
    ]);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sky-50 via-blue-50 to-indigo-50">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="w-20 h-20 border-4 border-sky-200 border-t-sky-600 rounded-full mx-auto mb-4"
          />
          <motion.p className="text-gray-600 font-medium">Loading your profile...</motion.p>
        </motion.div>
      </div>
    );
  }

  const firstName = getFirstName();
  const userRole = getUserRole();
  const roleGradient = getRoleColor();
  const roleIcon = getRoleIcon();
  const initials = getInitials();
  const fullName = `${userData.first_name} ${userData.last_name}`.trim() || firstName;

  const completedAchievements = achievements.filter(a => a.completed).length;
  const totalAchievements = achievements.length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-indigo-50">
      {/* Owner Navbar */}
      <OwnerNavbar profile={profile} avatarUrl={avatarUrl} />

      {/* Main Content - Added z-index and proper positioning */}
      <div className="relative z-10 pt-24 pb-16 px-4 sm:px-6 lg:px-8 min-h-screen">
        <div className="max-w-7xl mx-auto">
          {/* Animated Floating Background Elements - Lower z-index */}
          <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
            <motion.div
              animate={{ y: [0, -30, 0], x: [0, 20, 0], scale: [1, 1.1, 1] }}
              transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
              className="absolute top-10 left-5 w-96 h-96 bg-sky-400/20 rounded-full blur-3xl"
            />
            <motion.div
              animate={{ y: [0, 30, 0], x: [0, -20, 0], scale: [1, 1.2, 1] }}
              transition={{ duration: 15, repeat: Infinity, ease: "easeInOut", delay: 2 }}
              className="absolute bottom-10 right-5 w-[500px] h-[500px] bg-blue-400/20 rounded-full blur-3xl"
            />
          </div>

          {/* Left Sidebar - Business Stats - Fixed positioning with top offset to avoid navbar */}
          <div className="hidden xl:block fixed left-4 top-32 w-80">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2, type: "spring" }}
              className="space-y-4 max-h-[calc(100vh-8rem)] overflow-y-auto custom-scrollbar"
            >
              {/* Business Selector */}
              {businesses.length > 1 && (
                <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-5 shadow-lg border border-white/20">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Select Business</label>
                  <select
                    value={selectedBusiness?.id || ""}
                    onChange={(e) => handleBusinessChange(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                  >
                    {businesses.map(business => (
                      <option key={business.id} value={business.id}>
                        {business.name} {business.verification_status === "verified" ? "✓" : ""}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Business Stats Card */}
              <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-5 shadow-lg border border-white/20">
                <div className="flex items-center gap-2 mb-4">
                  <Store className="w-5 h-5 text-sky-600" />
                  <h3 className="font-semibold text-gray-800">Business Stats</h3>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Total Members</span>
                    <span className="text-lg font-bold text-sky-600">{businessStats.totalMembers}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Active Members</span>
                    <span className="text-lg font-bold text-green-600">{businessStats.activeMemberships}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Pending Applications</span>
                    <span className="text-lg font-bold text-yellow-600">{businessStats.pendingApplications}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Total Revenue</span>
                    <span className="text-lg font-bold text-purple-600">{formatCurrency(businessStats.totalRevenue)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Monthly Revenue</span>
                    <span className="text-lg font-bold text-blue-600">{formatCurrency(businessStats.monthlyRevenue)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Rating</span>
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                      <span className="text-lg font-bold text-gray-800">{businessStats.averageRating}</span>
                      <span className="text-xs text-gray-500">({businessStats.totalReviews})</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Business Achievements */}
              <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-5 shadow-lg border border-white/20">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-sky-600" />
                    <h3 className="font-semibold text-gray-800">Business Achievements</h3>
                  </div>
                  <span className="text-xs text-gray-500">{completedAchievements}/{totalAchievements}</span>
                </div>
                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                  {achievements.map((achievement) => (
                    <div key={achievement.id} className="group">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <div className={`p-1.5 rounded-lg ${achievement.completed ? 'bg-sky-100 text-sky-600' : 'bg-gray-100 text-gray-400'}`}>
                            {achievement.icon}
                          </div>
                          <div>
                            <p className={`text-xs font-medium ${achievement.completed ? 'text-gray-800' : 'text-gray-500'}`}>
                              {achievement.title}
                            </p>
                            <p className="text-xs text-gray-400">{achievement.description}</p>
                          </div>
                        </div>
                        {achievement.completed && <Check className="w-3 h-3 text-green-500" />}
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-1.5">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${achievement.progress}%` }}
                          transition={{ duration: 1 }}
                          className={`h-1.5 rounded-full ${achievement.completed ? 'bg-sky-500' : 'bg-sky-300'}`}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>

          {/* Right Sidebar - Recent Activity - Fixed positioning with top offset to avoid navbar */}
          <div className="hidden xl:block fixed right-4 top-32 w-80">
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2, type: "spring" }}
              className="space-y-4 max-h-[calc(100vh-8rem)] overflow-y-auto custom-scrollbar"
            >
              {/* Recent Members */}
              <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-5 shadow-lg border border-white/20">
                <div className="flex items-center gap-2 mb-4">
                  <Users className="w-5 h-5 text-sky-600" />
                  <h3 className="font-semibold text-gray-800">Newest Members</h3>
                </div>
                {loadingMembers ? (
                  <div className="text-center py-4">
                    <div className="w-8 h-8 border-2 border-sky-200 border-t-sky-600 rounded-full animate-spin mx-auto" />
                  </div>
                ) : recentMembers.length > 0 ? (
                  <div className="space-y-3 max-h-[300px] overflow-y-auto">
                    {recentMembers.map((member) => (
                      <div key={member.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 transition-colors">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-sky-500 to-blue-500 flex items-center justify-center text-white text-sm font-bold">
                          {member.name.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800 truncate">{member.name}</p>
                          <p className="text-xs text-gray-500">{member.plan}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-semibold text-green-600">{formatCurrency(member.amount)}</p>
                          <p className="text-xs text-gray-400">{member.joined}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Users className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">No members yet</p>
                  </div>
                )}
              </div>

              {/* Pending Applications */}
              <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-5 shadow-lg border border-white/20">
                <div className="flex items-center gap-2 mb-4">
                  <Clock className="w-5 h-5 text-sky-600" />
                  <h3 className="font-semibold text-gray-800">Pending Applications</h3>
                  {businessStats.pendingApplications > 0 && (
                    <span className="px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">
                      {businessStats.pendingApplications}
                    </span>
                  )}
                </div>
                {loadingApplications ? (
                  <div className="text-center py-4">
                    <div className="w-8 h-8 border-2 border-sky-200 border-t-sky-600 rounded-full animate-spin mx-auto" />
                  </div>
                ) : recentApplications.length > 0 ? (
                  <div className="space-y-3 max-h-[300px] overflow-y-auto">
                    {recentApplications.map((app) => (
                      <div key={app.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                        onClick={() => navigate("/applications")}>
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center text-white text-sm font-bold">
                          {app.name.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800 truncate">{app.name}</p>
                          <p className="text-xs text-gray-500">{app.plan}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-semibold text-yellow-600">{formatCurrency(app.amount)}</p>
                          <p className="text-xs text-gray-400">{app.timeAgo}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <CheckCircle className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">No pending applications</p>
                  </div>
                )}
              </div>

              {/* Quick Tips for Owners */}
              <div className="bg-gradient-to-br from-sky-500 to-blue-600 rounded-2xl p-5 shadow-lg text-white">
                <div className="flex items-center gap-2 mb-3">
                  <Rocket className="w-5 h-5" />
                  <h3 className="font-semibold">Owner Tips</h3>
                </div>
                <div className="space-y-2">
                  <div className="flex items-start gap-2 text-sm">
                    <Check className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>Review applications promptly to retain members</span>
                  </div>
                  <div className="flex items-start gap-2 text-sm">
                    <Check className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>Update your business profile to attract more customers</span>
                  </div>
                  <div className="flex items-start gap-2 text-sm">
                    <Check className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>Respond to reviews to build trust</span>
                  </div>
                  <div className="flex items-start gap-2 text-sm">
                    <Check className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>Promote special offers to increase memberships</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Main Content - Centered */}
          <div className="xl:mx-80">
            {/* Profile Card */}
            <motion.div
              initial={{ opacity: 0, y: 30, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ type: "spring", stiffness: 100, damping: 20 }}
              className="relative bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl overflow-hidden border border-white/20"
            >
              {/* Animated Gradient Background */}
              <motion.div
                animate={{ backgroundPosition: ["0% 0%", "100% 100%"] }}
                transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                className="absolute inset-0 bg-gradient-to-r from-sky-600/10 via-blue-600/10 to-indigo-600/10"
                style={{ backgroundSize: "200% 200%" }}
              />

              {/* Cover Image */}
              <div className="relative h-48 overflow-hidden">
                <motion.div
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute inset-0 bg-gradient-to-r from-sky-600 via-blue-600 to-indigo-600"
                />
                <div className="absolute inset-0 bg-black/20" />
                
                {/* Floating Particles */}
                {[...Array(20)].map((_, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{
                      opacity: [0, 0.5, 0],
                      scale: [0, 1, 0],
                      x: [Math.random() * window.innerWidth, Math.random() * window.innerWidth],
                      y: [Math.random() * 200, Math.random() * 200],
                    }}
                    transition={{ duration: 3 + Math.random() * 2, repeat: Infinity, delay: Math.random() * 2 }}
                    className="absolute w-2 h-2 bg-white/60 rounded-full"
                    style={{ left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%` }}
                  />
                ))}
              </div>

              {/* Avatar Section */}
              <div className="relative px-8 sm:px-12">
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.1 }}
                  className="absolute -top-20 left-8 sm:left-12"
                >
                  <div className="relative group">
                    <motion.div
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.98 }}
                      className="w-32 h-32 rounded-2xl bg-gradient-to-r from-sky-500 to-blue-500 p-1 shadow-2xl"
                    >
                      {avatarUrl ? (
                        <img src={avatarUrl} alt={fullName} className="w-full h-full rounded-xl object-cover" />
                      ) : (
                        <div className={`w-full h-full rounded-xl bg-gradient-to-br ${roleGradient} flex items-center justify-center`}>
                          <span className="text-4xl font-bold text-white">{initials}</span>
                        </div>
                      )}
                    </motion.div>
                    <motion.label
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                      htmlFor="avatar-upload"
                      className="absolute bottom-0 right-0 p-2 bg-white rounded-full cursor-pointer shadow-lg border-2 border-gray-200 hover:shadow-xl transition-all"
                    >
                      <Camera className="w-4 h-4 text-gray-600" />
                      <input id="avatar-upload" type="file" accept="image/*" onChange={uploadAvatar} disabled={uploading} className="hidden" />
                    </motion.label>
                    {uploading && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="absolute inset-0 bg-black/50 rounded-2xl flex items-center justify-center"
                      >
                        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity }} className="w-8 h-8 border-4 border-white border-t-transparent rounded-full" />
                      </motion.div>
                    )}
                  </div>
                </motion.div>

                {/* Profile Info */}
                <div className="pt-24 pb-8">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                    <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
                      <div className="flex items-center gap-3 mb-3 flex-wrap">
                        <motion.h1
                          animate={{ backgroundPosition: ["0% 0%", "100% 100%"] }}
                          transition={{ duration: 5, repeat: Infinity }}
                          className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent"
                        >
                          {fullName}
                        </motion.h1>
                        <motion.span
                          whileHover={{ scale: 1.05 }}
                          className={`px-4 py-1.5 rounded-full text-sm font-medium text-white shadow-lg bg-gradient-to-r ${roleGradient} flex items-center gap-2`}
                        >
                          {roleIcon}
                          <span>{userRole}</span>
                        </motion.span>
                      </div>
                      
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="space-y-2">
                        <div className="flex items-center gap-3 text-gray-600">
                          <Mail className="w-4 h-4" />
                          <span>{userData.email}</span>
                        </div>
                        {userData.mobile && (
                          <div className="flex items-center gap-3 text-gray-600">
                            <Phone className="w-4 h-4" />
                            <span>{userData.mobile}</span>
                          </div>
                        )}
                        {selectedBusiness && (
                          <div className="flex items-center gap-3 text-gray-600">
                            <Store className="w-4 h-4" />
                            <span className="font-medium">{selectedBusiness.name}</span>
                            {selectedBusiness.verification_status === "verified" && (
                              <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full flex items-center gap-1">
                                <CheckCircle className="w-3 h-3" /> Verified
                              </span>
                            )}
                          </div>
                        )}
                        <div className="flex items-center gap-3 text-gray-500 text-sm">
                          <Calendar className="w-4 h-4" />
                          <span>Owner since {user?.created_at ? formatDate(user.created_at) : "N/A"}</span>
                        </div>
                      </motion.div>
                    </motion.div>

                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.25 }} className="flex gap-3">
                      {!isEditing ? (
                        <>
                          <motion.button
                            whileHover={{ scale: 1.05, y: -2 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => setIsEditing(true)}
                            className="group relative px-8 py-3 bg-gradient-to-r from-sky-600 to-blue-600 text-white rounded-2xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden"
                          >
                            <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                            <div className="relative flex items-center gap-3">
                              <Edit2 className="w-5 h-5" />
                              <span>Edit Profile</span>
                            </div>
                          </motion.button>
                          <motion.button
                            whileHover={{ scale: 1.05, y: -2 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => setIsChangingPassword(true)}
                            className="group relative px-8 py-3 bg-white text-gray-700 rounded-2xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 border-2 border-gray-200 overflow-hidden"
                          >
                            <div className="absolute inset-0 bg-gradient-to-r from-gray-50 to-gray-100 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                            <div className="relative flex items-center gap-3">
                              <Lock className="w-5 h-5" />
                              <span>Change Password</span>
                            </div>
                          </motion.button>
                        </>
                      ) : (
                        <>
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={handleSaveProfile}
                            disabled={saving}
                            className="px-8 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-2xl font-semibold shadow-lg hover:shadow-xl transition-all flex items-center gap-3"
                          >
                            <Save className="w-5 h-5" />
                            {saving ? "Saving..." : "Save Changes"}
                          </motion.button>
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => setIsEditing(false)}
                            className="px-8 py-3 bg-gray-100 text-gray-700 rounded-2xl font-semibold shadow-lg hover:shadow-xl transition-all flex items-center gap-3"
                          >
                            <X className="w-5 h-5" />
                            Cancel
                          </motion.button>
                        </>
                      )}
                    </motion.div>
                  </div>

                  {/* Edit Form */}
                  <AnimatePresence>
                    {isEditing && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3 }}
                        className="mt-8 pt-8 border-t border-gray-200"
                      >
                        <motion.h3 initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-lg font-semibold text-gray-800 mb-4">
                          Edit Profile Information
                        </motion.h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.05 }}>
                            <label className="block text-sm font-medium text-gray-700 mb-2">First Name</label>
                            <input
                              type="text"
                              name="first_name"
                              value={userData.first_name}
                              onChange={handleInputChange}
                              className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all"
                              placeholder="Enter your first name"
                            />
                          </motion.div>
                          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Last Name</label>
                            <input
                              type="text"
                              name="last_name"
                              value={userData.last_name}
                              onChange={handleInputChange}
                              className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all"
                              placeholder="Enter your last name"
                            />
                          </motion.div>
                          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 }}>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Mobile Number</label>
                            <input
                              type="tel"
                              name="mobile"
                              value={userData.mobile}
                              onChange={handleInputChange}
                              className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all"
                              placeholder="09171234567"
                            />
                          </motion.div>
                          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Business Name</label>
                            <input
                              type="text"
                              name="business_name"
                              value={userData.business_name}
                              onChange={handleInputChange}
                              className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all"
                              placeholder="Your Business Name"
                            />
                          </motion.div>
                          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.25 }} className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                            <input
                              type="email"
                              name="email"
                              value={userData.email}
                              className="w-full px-4 py-2 border border-gray-300 rounded-xl bg-gray-50 text-gray-500"
                              disabled
                            />
                            <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
                          </motion.div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Mobile Bottom Bar */}
      <div className="xl:hidden fixed bottom-6 left-4 right-4 z-20">
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/95 backdrop-blur-xl rounded-2xl p-4 shadow-lg border border-white/20 flex gap-4 overflow-x-auto"
        >
          <div className="flex-1 min-w-[100px] text-center">
            <Users className="w-5 h-5 text-sky-600 mx-auto mb-1" />
            <p className="text-xs text-gray-500">Members</p>
            <p className="text-lg font-bold text-sky-600">{businessStats.totalMembers}</p>
          </div>
          <div className="flex-1 min-w-[100px] text-center">
            <DollarSign className="w-5 h-5 text-green-600 mx-auto mb-1" />
            <p className="text-xs text-gray-500">Revenue</p>
            <p className="text-lg font-bold text-green-600">{formatCurrency(businessStats.monthlyRevenue)}</p>
          </div>
          <div className="flex-1 min-w-[100px] text-center">
            <Trophy className="w-5 h-5 text-yellow-500 mx-auto mb-1" />
            <p className="text-xs text-gray-500">Achievements</p>
            <p className="text-lg font-bold text-yellow-500">{completedAchievements}/{totalAchievements}</p>
          </div>
        </motion.div>
      </div>

      {/* Password Change Modal */}
      <AnimatePresence>
        {isChangingPassword && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setIsChangingPassword(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-gradient-to-r from-sky-600 to-blue-600 p-6">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <Lock className="w-6 h-6 text-white" />
                    <h2 className="text-2xl font-bold text-white">Change Password</h2>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setIsChangingPassword(false)}
                    className="p-1 hover:bg-white/20 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5 text-white" />
                  </motion.button>
                </div>
              </div>

              <div className="p-6">
                {passwordSuccess && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-4 p-3 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm flex items-center gap-2"
                  >
                    <CheckCircle className="w-4 h-4" />
                    {passwordSuccess}
                  </motion.div>
                )}

                <form onSubmit={handlePasswordSubmit}>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Current Password</label>
                      <div className="relative">
                        <input
                          type={showCurrentPassword ? "text" : "password"}
                          name="currentPassword"
                          value={passwordData.currentPassword}
                          onChange={handlePasswordChange}
                          className={`w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all ${
                            passwordErrors.currentPassword ? "border-red-500" : "border-gray-300"
                          }`}
                          placeholder="Enter current password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                        >
                          {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      {passwordErrors.currentPassword && (
                        <p className="text-red-500 text-xs mt-1">{passwordErrors.currentPassword}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">New Password</label>
                      <div className="relative">
                        <input
                          type={showNewPassword ? "text" : "password"}
                          name="newPassword"
                          value={passwordData.newPassword}
                          onChange={handlePasswordChange}
                          className={`w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all ${
                            passwordErrors.newPassword ? "border-red-500" : "border-gray-300"
                          }`}
                          placeholder="Enter new password (min. 8 characters)"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                        >
                          {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      {passwordErrors.newPassword && (
                        <p className="text-red-500 text-xs mt-1">{passwordErrors.newPassword}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Confirm New Password</label>
                      <div className="relative">
                        <input
                          type={showConfirmPassword ? "text" : "password"}
                          name="confirmPassword"
                          value={passwordData.confirmPassword}
                          onChange={handlePasswordChange}
                          className={`w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all ${
                            passwordErrors.confirmPassword ? "border-red-500" : "border-gray-300"
                          }`}
                          placeholder="Confirm new password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                        >
                          {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      {passwordErrors.confirmPassword && (
                        <p className="text-red-500 text-xs mt-1">{passwordErrors.confirmPassword}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-3 mt-6">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      type="submit"
                      className="flex-1 px-4 py-2.5 bg-gradient-to-r from-sky-600 to-blue-600 text-white rounded-xl font-medium shadow-md hover:shadow-lg transition-all"
                    >
                      Update Password
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      type="button"
                      onClick={() => setIsChangingPassword(false)}
                      className="flex-1 px-4 py-2.5 border-2 border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-all"
                    >
                      Cancel
                    </motion.button>
                  </div>
                </form>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default OwnerProfile;