import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import ClientNavbar from "../components/client/ClientNavbar";
import OwnerNavbar from "../components/owner/OwnerNavbar";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "react-hot-toast";
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
  Bell,
  MessageSquare
} from "lucide-react";

const Profile = () => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [memberships, setMemberships] = useState([]);
  const [loadingMemberships, setLoadingMemberships] = useState(false);
  
  // Real data states
  const [stats, setStats] = useState({
    totalSpent: 0,
    activeMemberships: 0,
    totalVisits: 0,
    memberSince: "",
    pendingApplications: 0,
    totalBusinessesFollowed: 0,
    totalReviews: 0
  });
  
  const [recentActivities, setRecentActivities] = useState([]);
  const [achievements, setAchievements] = useState([]);
  const [loadingStats, setLoadingStats] = useState(false);
  const [loadingActivities, setLoadingActivities] = useState(false);
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
    role: "client",
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
          role: profile.role || "client",
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

        // Fetch all data
        await Promise.all([
          fetchMemberships(user.id),
          fetchUserStats(user.id),
          fetchRecentActivities(user.id),
          fetchAchievements(user.id)
        ]);
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMemberships = async (userId) => {
    try {
      setLoadingMemberships(true);

      const { data, error } = await supabase
        .from("memberships")
        .select(
          `
          *,
          businesses:business_id (
            id,
            name,
            owner_name,
            location,
            business_type,
            emoji
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

      if (error) throw error;

      setMemberships(data || []);
    } catch (error) {
      console.error("Error fetching memberships:", error);
    } finally {
      setLoadingMemberships(false);
    }
  };

  const fetchUserStats = async (userId) => {
    try {
      setLoadingStats(true);

      // Get total spent from payments
      const { data: payments, error: paymentsError } = await supabase
        .from("payments")
        .select("amount, payment_status")
        .eq("user_id", userId)
        .eq("payment_status", "paid");

      if (paymentsError) throw paymentsError;

      const totalSpent = payments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;

      // Get active memberships count
      const { count: activeCount, error: activeError } = await supabase
        .from("memberships")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("status", "approved")
        .gte("end_date", new Date().toISOString());

      if (activeError) throw activeError;

      // Get pending applications
      const { count: pendingCount, error: pendingError } = await supabase
        .from("memberships")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("status", "pending");

      if (pendingError) throw pendingError;

      // Get total reviews count
      const { count: reviewsCount, error: reviewsError } = await supabase
        .from("reviews")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId);

      if (reviewsError) throw reviewsError;

      // Get unique businesses followed (memberships count distinct business_id)
      const { data: businessesFollowed, error: businessesError } = await supabase
        .from("memberships")
        .select("business_id")
        .eq("user_id", userId)
        .eq("status", "approved");

      if (businessesError) throw businessesError;

      const uniqueBusinesses = new Set(businessesFollowed?.map(m => m.business_id));
      const totalBusinessesFollowed = uniqueBusinesses.size;

      // Get member since date from profile creation
      const { data: profileData } = await supabase
        .from("profiles")
        .select("created_at")
        .eq("id", userId)
        .single();

      const memberSince = profileData?.created_at || user?.created_at || new Date().toISOString();

      setStats({
        totalSpent,
        activeMemberships: activeCount || 0,
        totalVisits: activeCount || 0,
        memberSince: memberSince,
        pendingApplications: pendingCount || 0,
        totalBusinessesFollowed,
        totalReviews: reviewsCount || 0
      });
    } catch (error) {
      console.error("Error fetching user stats:", error);
    } finally {
      setLoadingStats(false);
    }
  };

  const fetchRecentActivities = async (userId) => {
    try {
      setLoadingActivities(true);

      const { data, error } = await supabase
        .from("notifications")
        .select("id, type, title, message, data, created_at, is_read, business_id")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(5);

      if (error) throw error;

      const activities = data?.map(notification => ({
        id: notification.id,
        action: notification.title || notification.message,
        time: formatTimeAgo(notification.created_at),
        icon: getActivityIcon(notification.type),
        isRead: notification.is_read,
        type: notification.type
      })) || [];

      setRecentActivities(activities);
    } catch (error) {
      console.error("Error fetching activities:", error);
    } finally {
      setLoadingActivities(false);
    }
  };

  const fetchAchievements = async (userId) => {
    try {
      setLoadingAchievements(true);

      // Calculate achievements based on real data
      const achievementsList = [];
      let profileComplete = 0;

      // Check profile completion
      if (userData.first_name) profileComplete += 25;
      if (userData.last_name) profileComplete += 25;
      if (userData.mobile) profileComplete += 25;
      if (avatarUrl) profileComplete += 25;

      // Get memberships count
      const { count: totalMemberships, error: membershipsError } = await supabase
        .from("memberships")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("status", "approved");

      if (membershipsError) throw membershipsError;

      // Get total spent
      const { data: payments, error: paymentsError } = await supabase
        .from("payments")
        .select("amount")
        .eq("user_id", userId)
        .eq("payment_status", "paid");

      if (paymentsError) throw paymentsError;

      const totalSpent = payments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;

      // Get reviews count
      const { count: reviewsCount, error: reviewsError } = await supabase
        .from("reviews")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId);

      if (reviewsError) throw reviewsError;

      // Get account age
      const accountAge = user?.created_at ? Math.floor((new Date() - new Date(user.created_at)) / (1000 * 60 * 60 * 24)) : 0;

      // Build achievements
      achievementsList.push({
        id: "first_membership",
        title: "First Membership",
        description: "Joined your first business",
        icon: <Trophy className="w-5 h-5" />,
        completed: (totalMemberships || 0) >= 1,
        progress: (totalMemberships || 0) >= 1 ? 100 : 0
      });

      achievementsList.push({
        id: "active_member",
        title: "Active Member",
        description: "Maintain an active membership",
        icon: <Zap className="w-5 h-5" />,
        completed: (stats.activeMemberships || 0) >= 1,
        progress: (stats.activeMemberships || 0) >= 1 ? 100 : 0
      });

      achievementsList.push({
        id: "loyal_member",
        title: "Loyal Member",
        description: "Join 3 or more businesses",
        icon: <Heart className="w-5 h-5" />,
        completed: (totalMemberships || 0) >= 3,
        progress: Math.min(100, ((totalMemberships || 0) / 3) * 100)
      });

      achievementsList.push({
        id: "big_spender",
        title: "Big Spender",
        description: "Spend ₱1,000 or more",
        icon: <DollarSign className="w-5 h-5" />,
        completed: totalSpent >= 1000,
        progress: Math.min(100, (totalSpent / 1000) * 100)
      });

      achievementsList.push({
        id: "reviewer",
        title: "Reviewer",
        description: "Leave your first review",
        icon: <Star className="w-5 h-5" />,
        completed: (reviewsCount || 0) >= 1,
        progress: (reviewsCount || 0) >= 1 ? 100 : 0
      });

      achievementsList.push({
        id: "profile_complete",
        title: "Profile Complete",
        description: "Complete your profile information",
        icon: <UserCheck className="w-5 h-5" />,
        completed: profileComplete >= 100,
        progress: profileComplete
      });

      achievementsList.push({
        id: "anniversary",
        title: "Anniversary",
        description: "Celebrate 30 days with us",
        icon: <CalendarIcon className="w-5 h-5" />,
        completed: accountAge >= 30,
        progress: Math.min(100, (accountAge / 30) * 100)
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

      if (uploadError) {
        throw new Error(uploadError.message);
      }

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

      if (updateError) {
        throw new Error(updateError.message);
      }

      if (urlData?.publicUrl) {
        setAvatarUrl(urlData.publicUrl);
      }

      toast.success("Avatar uploaded successfully!");
      await fetchAchievements(user.id);
    } catch (error) {
      console.error("Error in uploadAvatar:", error);
      toast.error(error.message || "Error uploading avatar!");
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
      toast.success("Profile updated successfully!");
      await fetchAchievements(user.id);
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("Failed to update profile. Please try again.");
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
    } else if (passwordData.newPassword === passwordData.currentPassword) {
      errors.newPassword = "New password cannot be the same as current password";
    } else if (!/^[a-zA-Z0-9!@#$%^&*]+$/.test(passwordData.newPassword)) {
      errors.newPassword = "Password must contain only letters, numbers, and special characters";
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
        toast.success("Password changed successfully!");
        setTimeout(() => setPasswordSuccess(""), 3000);
      } catch (error) {
        console.error("Error changing password:", error);
        setPasswordErrors({ currentPassword: "Current password is incorrect" });
        toast.error("Failed to change password. Please check your current password.");
      }
    } else {
      setPasswordErrors(errors);
    }
  };

  const getActivityIcon = (type) => {
    const iconMap = {
      membership_approved: <CheckCircle className="w-4 h-4 text-green-500" />,
      membership_pending: <Clock className="w-4 h-4 text-yellow-500" />,
      payment_received: <CreditCard className="w-4 h-4 text-blue-500" />,
      welcome: <Sparkles className="w-4 h-4 text-purple-500" />,
      announcement: <Bell className="w-4 h-4 text-indigo-500" />
    };
    return iconMap[type] || <Bell className="w-4 h-4 text-gray-500" />;
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
    return "User";
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
    return "U";
  };

  const getBusinessIcon = (business) => {
    switch (business.business_type) {
      case "gym":
        return business.emoji || "🏋️";
      case "cafe":
        return business.emoji || "☕";
      case "bookstore":
        return business.emoji || "📚";
      default:
        return business.emoji || "🏢";
    }
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
      month: "long",
      day: "numeric",
    });
  };

  // Loading screen with consistent layout
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-gray-50 to-gray-100 select-none">
        <div className="text-center select-none">
          <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4 select-none"></div>
          <p className="text-gray-600 font-medium select-none">Loading your profile...</p>
        </div>
      </div>
    );
  }

  const firstName = getFirstName();
  const userRole = getUserRole();
  const roleGradient = getRoleColor();
  const roleIcon = getRoleIcon();
  const initials = getInitials();
  const fullName =
    `${userData.first_name} ${userData.last_name}`.trim() || firstName;

  const completedAchievements = achievements.filter(a => a.completed).length;
  const totalAchievements = achievements.length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-indigo-50 select-none">
      {/* Role-based Navbar */}
      {userData.role === "owner" ? (
        <OwnerNavbar profile={profile} avatarUrl={avatarUrl} />
      ) : (
        <ClientNavbar profile={profile} avatarUrl={avatarUrl} />
      )}

      {/* Main Content - with proper navbar spacing */}
      <div className="pt-28 pb-16 px-4 sm:px-6 lg:px-8 min-h-screen">
        <div className="max-w-7xl mx-auto">
          {/* Animated Floating Background Elements */}
          <div className="fixed inset-0 pointer-events-none overflow-hidden">
            <motion.div
              animate={{
                y: [0, -30, 0],
                x: [0, 20, 0],
                scale: [1, 1.1, 1],
              }}
              transition={{
                duration: 12,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className="absolute top-10 left-5 w-96 h-96 bg-sky-400/20 rounded-full blur-3xl"
            />
            <motion.div
              animate={{
                y: [0, 30, 0],
                x: [0, -20, 0],
                scale: [1, 1.2, 1],
              }}
              transition={{
                duration: 15,
                repeat: Infinity,
                ease: "easeInOut",
                delay: 2,
              }}
              className="absolute bottom-10 right-5 w-[500px] h-[500px] bg-blue-400/20 rounded-full blur-3xl"
            />
          </div>

          {/* Left Sidebar Widget - Fixed position */}
          <div className="hidden xl:block fixed left-6 top-1/2 -translate-y-1/2 w-80 z-10">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2, type: "spring" }}
              className="space-y-4"
            >
              {/* Quick Stats Card */}
              <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-5 shadow-lg border border-white/20">
                <div className="flex items-center gap-2 mb-4">
                  <Activity className="w-5 h-5 text-sky-600" />
                  <h3 className="font-semibold text-gray-800">Quick Stats</h3>
                </div>
                <div className="space-y-3 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Active Memberships</span>
                    <span className="text-lg font-bold text-sky-600">{stats.activeMemberships}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Total Spent</span>
                    <span className="text-lg font-bold text-green-600">₱{stats.totalSpent.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Businesses Followed</span>
                    <span className="text-lg font-bold text-purple-600">{stats.totalBusinessesFollowed}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Reviews Written</span>
                    <span className="text-lg font-bold text-orange-600">{stats.totalReviews}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Pending Applications</span>
                    <span className="text-lg font-bold text-yellow-600">{stats.pendingApplications}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Member Since</span>
                    <span className="text-sm font-medium text-gray-700">{formatDate(stats.memberSince)}</span>
                  </div>
                </div>
              </div>

              {/* Achievements Card */}
              <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-5 shadow-lg border border-white/20">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-sky-600" />
                    <h3 className="font-semibold text-gray-800">Achievements</h3>
                  </div>
                  <span className="text-xs text-gray-500">{completedAchievements}/{totalAchievements}</span>
                </div>
                <div className="space-y-3 max-h-[320px] overflow-y-auto custom-scrollbar pr-2">
                  {achievements.slice(0, 5).map((achievement) => (
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

          {/* Right Sidebar Widget - Recent Activity */}
          <div className="hidden xl:block fixed right-6 top-1/2 -translate-y-1/2 w-80 z-10">
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2, type: "spring" }}
              className="space-y-4"
            >
              {/* Recent Activity Card */}
              <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-5 shadow-lg border border-white/20">
                <div className="flex items-center gap-2 mb-4">
                  <Activity className="w-5 h-5 text-sky-600" />
                  <h3 className="font-semibold text-gray-800">Recent Activity</h3>
                </div>
                {loadingActivities ? (
                  <div className="text-center py-4">
                    <div className="w-8 h-8 border-2 border-sky-200 border-t-sky-600 rounded-full animate-spin mx-auto"></div>
                  </div>
                ) : recentActivities.length > 0 ? (
                  <div className="space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
                    {recentActivities.map((activity) => (
                      <motion.div
                        key={activity.id}
                        whileHover={{ x: -5 }}
                        className="flex items-start gap-2 p-2 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <div className="p-1.5 bg-gray-100 rounded-lg">
                          {activity.icon}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm text-gray-700 line-clamp-2">{activity.action}</p>
                          <p className="text-xs text-gray-400 mt-1">{activity.time}</p>
                        </div>
                        {!activity.isRead && <div className="w-2 h-2 bg-sky-500 rounded-full"></div>}
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Bell className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">No recent activity</p>
                  </div>
                )}
              </div>

              {/* Quick Tips Card */}
              <div className="bg-gradient-to-br from-sky-500 to-blue-600 rounded-2xl p-5 shadow-lg text-white">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="w-5 h-5" />
                  <h3 className="font-semibold">Pro Tips</h3>
                </div>
                <div className="space-y-2">
                  <div className="flex items-start gap-2 text-sm">
                    <Check className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>Complete your profile to unlock more features</span>
                  </div>
                  <div className="flex items-start gap-2 text-sm">
                    <Check className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>Join businesses to earn loyalty rewards</span>
                  </div>
                  <div className="flex items-start gap-2 text-sm">
                    <Check className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>Write reviews to help other members</span>
                  </div>
                  <div className="flex items-start gap-2 text-sm">
                    <Check className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>Enable notifications to never miss updates</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Main Content - Wider Profile Card */}
          <div className="lg:mx-80 xl:mx-72 2xl:mx-64">
            {/* Profile Card */}
            <motion.div
              initial={{ opacity: 0, y: 30, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ type: "spring", stiffness: 100, damping: 20 }}
              className="relative bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl overflow-hidden border border-white/20"
            >
              {/* Animated Gradient Background */}
              <motion.div
                animate={{
                  backgroundPosition: ["0% 0%", "100% 100%"],
                }}
                transition={{
                  duration: 10,
                  repeat: Infinity,
                  ease: "linear",
                }}
                className="absolute inset-0 bg-gradient-to-r from-sky-600/10 via-blue-600/10 to-indigo-600/10"
                style={{ backgroundSize: "200% 200%" }}
              />

              {/* Cover Image */}
              <div className="relative h-48 overflow-hidden">
                <motion.div
                  animate={{
                    scale: [1, 1.05, 1],
                  }}
                  transition={{
                    duration: 20,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                  className="absolute inset-0 bg-gradient-to-r from-sky-600 via-blue-600 to-indigo-600"
                />
                <div className="absolute inset-0 bg-black/20" />
              </div>

              {/* Avatar Section - CIRCULAR */}
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
                      className="w-32 h-32 rounded-full bg-gradient-to-r from-sky-500 to-blue-500 p-1 shadow-2xl"
                    >
                      {avatarUrl ? (
                        <img
                          src={avatarUrl}
                          alt={fullName}
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        <div className={`w-full h-full rounded-full bg-gradient-to-br ${roleGradient} flex items-center justify-center`}>
                          <span className="text-4xl font-bold text-white">
                            {initials}
                          </span>
                        </div>
                      )}
                    </motion.div>
                    <motion.label
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                      htmlFor="avatar-upload"
                      className="absolute bottom-1 right-1 p-2 bg-white rounded-full cursor-pointer shadow-lg border-2 border-gray-200 hover:shadow-xl transition-all"
                    >
                      <Camera className="w-4 h-4 text-gray-600" />
                      <input
                        id="avatar-upload"
                        type="file"
                        accept="image/*"
                        onChange={uploadAvatar}
                        disabled={uploading}
                        className="hidden"
                      />
                    </motion.label>
                    {uploading && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center"
                      >
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity }}
                          className="w-8 h-8 border-4 border-white border-t-transparent rounded-full"
                        />
                      </motion.div>
                    )}
                  </div>
                </motion.div>

                {/* Profile Info */}
                <div className="pt-24 pb-8">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.2 }}
                      className="flex-1"
                    >
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
                      
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.3 }}
                        className="space-y-2"
                      >
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
                        {userData.business_name && userData.role === "owner" && (
                          <div className="flex items-center gap-3 text-gray-600">
                            <Building className="w-4 h-4" />
                            <span className="font-medium">{userData.business_name}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-3 text-gray-500 text-sm">
                          <Calendar className="w-4 h-4" />
                          <span>Joined {stats.memberSince ? formatDate(stats.memberSince) : "N/A"}</span>
                        </div>
                      </motion.div>
                    </motion.div>

                    <motion.div
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.25 }}
                      className="flex gap-3 flex-shrink-0"
                    >
                      {!isEditing ? (
                        <>
                          <motion.button
                            whileHover={{ scale: 1.05, y: -2 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => setIsEditing(true)}
                            className="px-6 py-2.5 bg-gradient-to-r from-sky-600 to-blue-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 flex items-center gap-2"
                          >
                            <Edit2 className="w-4 h-4" />
                            <span>Edit Profile</span>
                          </motion.button>
                          <motion.button
                            whileHover={{ scale: 1.05, y: -2 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => setIsChangingPassword(true)}
                            className="px-6 py-2.5 bg-gradient-to-r from-gray-600 to-gray-700 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 flex items-center gap-2"
                          >
                            <Lock className="w-4 h-4" />
                            <span>Change Password</span>
                          </motion.button>
                        </>
                      ) : (
                        <>
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={handleSaveProfile}
                            disabled={saving}
                            className="px-6 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all flex items-center gap-2 whitespace-nowrap"
                          >
                            <Save className="w-4 h-4" />
                            {saving ? "Saving..." : "Save Changes"}
                          </motion.button>
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => setIsEditing(false)}
                            className="px-6 py-2.5 bg-gray-200 text-gray-700 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all flex items-center gap-2 whitespace-nowrap"
                          >
                            <X className="w-4 h-4" />
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
                        <motion.h3
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="text-lg font-semibold text-gray-800 mb-4"
                        >
                          Edit Profile Information
                        </motion.h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.05 }}
                          >
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
                          <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.1 }}
                          >
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
                          <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.15 }}
                          >
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
                          {userData.role === "owner" && (
                            <motion.div
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: 0.2 }}
                            >
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
                          )}
                          <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.25 }}
                            className="md:col-span-2"
                          >
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
      <div className="xl:hidden fixed bottom-6 left-4 right-4">
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/95 backdrop-blur-xl rounded-2xl p-4 shadow-lg border border-white/20 flex gap-4 overflow-x-auto"
        >
          <div className="flex-1 min-w-[100px] text-center">
            <Activity className="w-5 h-5 text-sky-600 mx-auto mb-1" />
            <p className="text-xs text-gray-500">Active</p>
            <p className="text-lg font-bold text-sky-600">{stats.activeMemberships}</p>
          </div>
          <div className="flex-1 min-w-[100px] text-center">
            <DollarSign className="w-5 h-5 text-green-600 mx-auto mb-1" />
            <p className="text-xs text-gray-500">Spent</p>
            <p className="text-lg font-bold text-green-600">₱{stats.totalSpent.toLocaleString()}</p>
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
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 select-none"
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
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Current Password
                      </label>
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
                        <motion.p
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="text-red-500 text-xs mt-1"
                        >
                          {passwordErrors.currentPassword}
                        </motion.p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        New Password
                      </label>
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
                        <motion.p
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="text-red-500 text-xs mt-1"
                        >
                          {passwordErrors.newPassword}
                        </motion.p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Confirm New Password
                      </label>
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
                        <motion.p
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="text-red-500 text-xs mt-1"
                        >
                          {passwordErrors.confirmPassword}
                        </motion.p>
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

      {/* Custom Scrollbar Styles */}
      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #3b82f6;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #2563eb;
        }
      `}</style>
    </div>
  );
};

export default Profile;