import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import ClientNavbar from "../components/client/ClientNavbar";
import { useTheme } from "../contexts/ThemeContext";
import "../styles/Browse.css";
import {
  // Navigation & Actions
  ChevronRight,
  Compass,
  Search,
  Filter,
  Bookmark,
  Share2,
  MoreVertical,
  Download,
  Upload,
  RefreshCw,
  Settings,
  HelpCircle,
  LogOut,

  // User & Profile
  User,
  Mail,
  Phone,
  Globe,
  Crown,
  Medal,
  Target,
  Flag,

  // Business & Memberships
  Briefcase,
  GraduationCap,
  Coffee,
  Dumbbell,
  Brain,
  BookOpen,
  Music,
  Camera,
  Video,
  Palette,
  Code,
  PenTool,

  // Health & Wellness
  Heart,
  HeartPulse,
  Activity,
  Shield,
  Zap,

  // Status & Indicators
  CheckCircle,
  XCircle,
  AlertCircle,
  Info,
  Award,
  Star,
  TrendingUp,
  Sparkles,
  Bell,
  Gift,
  CreditCard,

  // Time & Date
  Clock,
  Calendar,
  Play,

  // Location
  MapPin,
  Map,
  PhoneCall,
  MessageCircle,

  // Social
  Users,

  // Actions
  Plus,
  Minus,
  Edit,
  Trash2,
  Copy,
  Check,

  // Misc
  MoreHorizontal,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  X,
} from "lucide-react";

const Browse = () => {
  const [selectedBusinessType, setSelectedBusinessType] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [businesses, setBusinesses] = useState([]);
  const [membershipPlans, setMembershipPlans] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedBusiness, setSelectedBusiness] = useState(null);
  const [showBusinessModal, setShowBusinessModal] = useState(false);
  const [joiningPlan, setJoiningPlan] = useState(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successData, setSuccessData] = useState({
    business: null,
    plan: null,
    paymentMethod: "",
  });
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(null);
  const [gcashQrUrl, setGcashQrUrl] = useState("");
  const [showPaymentFormModal, setShowPaymentFormModal] = useState(false);
  const [selectedPlanForPayment, setSelectedPlanForPayment] = useState(null);
  const [paymentFormData, setPaymentFormData] = useState({
    paymentMethod: "",
    receiptFile: null,
    receiptPreview: null,
    agreeToTerms: false,
  });
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  const [submittingPayment, setSubmittingPayment] = useState(false);

  // Review State
  const [businessReviews, setBusinessReviews] = useState({});
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedBusinessForReview, setSelectedBusinessForReview] =
    useState(null);
  const [reviewFormData, setReviewFormData] = useState({
    rating: 0,
    comment: "",
    hoverRating: 0,
  });
  const [submittingReview, setSubmittingReview] = useState(false);
  const [userMemberships, setUserMemberships] = useState([]);
  const [hasMembership, setHasMembership] = useState({});

  const navigate = useNavigate();
  const { isDarkMode } = useTheme();

  const locations = [
    "All Locations",
    "Downtown",
    "Arellano",
    "Pantal",
    "Perez",
    "PNR",
    "Bonuan",
    "AB Fernandez",
  ];

  const [selectedLocation, setSelectedLocation] = useState("All Locations");
  const [priceRange, setPriceRange] = useState([0, 5000]);

  const businessTypes = [
    { id: "all", label: "All", icon: "🏢" },
    { id: "gym", label: "Gym", icon: "🏋️" },
    { id: "cafe", label: "Cafe", icon: "☕" },
    { id: "bakery", label: "Bakery", icon: "🥐" },
  ];

  useEffect(() => {
    checkUser();
  }, []);

  useEffect(() => {
    if (user) {
      fetchBusinesses();
      fetchUserMemberships();
    }
  }, [selectedBusinessType, user]);

  useEffect(() => {
    if (selectedBusiness && selectedBusiness.id) {
      fetchBusinessReviews(selectedBusiness.id);
    }
  }, [selectedBusiness]);

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

      if (profile?.avatar_url) {
        downloadAvatar(profile.avatar_url);
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
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

  const downloadGcashQrCode = async (path) => {
    try {
      const { data, error } = await supabase.storage
        .from("gcash-qr-codes")
        .download(path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      setGcashQrUrl(url);
    } catch (error) {
      console.error("Error downloading GCash QR code:", error);
    }
  };

  const fetchUserMemberships = async () => {
    try {
      const { data, error } = await supabase
        .from("memberships")
        .select("business_id, status")
        .eq("user_id", user.id)
        .eq("status", "approved");

      if (error) throw error;

      setUserMemberships(data || []);

      const membershipMap = {};
      data?.forEach((m) => {
        membershipMap[m.business_id] = true;
      });
      setHasMembership(membershipMap);
    } catch (error) {
      console.error("Error fetching user memberships:", error);
    }
  };

  const fetchBusinessReviews = async (businessId) => {
    try {
      const { data, error } = await supabase
        .from("reviews")
        .select(
          `
          *,
          profiles:user_id (
            first_name,
            last_name,
            avatar_url
          )
        `,
        )
        .eq("business_id", businessId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      setBusinessReviews((prev) => ({
        ...prev,
        [businessId]: data || [],
      }));

      // Update business rating
      if (data && data.length > 0) {
        const avgRating =
          data.reduce((sum, r) => sum + r.rating, 0) / data.length;
        await supabase
          .from("businesses")
          .update({ rating: avgRating })
          .eq("id", businessId);
      }
    } catch (error) {
      console.error("Error fetching reviews:", error);
    }
  };

  const fetchBusinesses = async () => {
    try {
      setLoading(true);

      let query = supabase
        .from("businesses")
        .select("*")
        .eq("status", "active")
        .eq("verification_status", "approved")
        .eq("permit_verified", true);

      if (selectedBusinessType !== "all") {
        query = query.eq("business_type", selectedBusinessType);
      }

      const { data: businessesData, error: businessesError } = await query;

      if (businessesError) throw businessesError;

      // Fetch REAL member counts for each business
      if (businessesData && businessesData.length > 0) {
        for (let business of businessesData) {
          // Get count of APPROVED memberships for this business
          const { count, error } = await supabase
            .from("memberships")
            .select("*", { count: "exact", head: true })
            .eq("business_id", business.id)
            .eq("status", "approved");

          if (!error) {
            business.members_count = count || 0;
          }

          // Get reviews count
          const { count: reviewCount, error: reviewError } = await supabase
            .from("reviews")
            .select("*", { count: "exact", head: true })
            .eq("business_id", business.id);

          if (!reviewError) {
            business.review_count = reviewCount || 0;
          }
        }
      }

      setBusinesses(businessesData || []);
      setLoading(false);

      if (businessesData && businessesData.length > 0) {
        const businessIds = businessesData.map((b) => b.id);

        const { data: plansData, error: plansError } = await supabase
          .from("membership_plans")
          .select("*")
          .in("business_id", businessIds)
          .eq("is_active", true);

        if (plansError) throw plansError;

        const plansByBusiness = {};
        plansData.forEach((plan) => {
          if (!plansByBusiness[plan.business_id]) {
            plansByBusiness[plan.business_id] = [];
          }
          plansByBusiness[plan.business_id].push(plan);
        });

        setMembershipPlans(plansByBusiness);
      }
    } catch (error) {
      console.error("Error fetching businesses:", error);
      setLoading(false);
    }
  };

  const fetchMembershipPlansForBusiness = async (businessId) => {
    try {
      const { data, error } = await supabase
        .from("membership_plans")
        .select("*")
        .eq("business_id", businessId)
        .eq("is_active", true)
        .order("price", { ascending: true });

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error("Error fetching membership plans:", error);
      return [];
    }
  };

  const handleViewDetails = async (business) => {
    const plans = await fetchMembershipPlansForBusiness(business.id);

    if (business.gcash_qr_code) {
      await downloadGcashQrCode(business.gcash_qr_code);
    } else {
      setGcashQrUrl("");
    }

    setSelectedBusiness({ ...business, plans: plans || [] });
    setShowBusinessModal(true);
  };

  const handleJoinNow = (businessId, plan) => {
    setSelectedPlanForPayment({ ...plan, businessId });
    setShowPaymentFormModal(true);
    setShowBusinessModal(false);
  };

  const handleReceiptUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Please upload an image file (PNG, JPG, JPEG)");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert("File size must be less than 5MB");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setPaymentFormData((prev) => ({
        ...prev,
        receiptFile: file,
        receiptPreview: reader.result,
      }));
    };
    reader.readAsDataURL(file);
  };

  const removeReceipt = () => {
    setPaymentFormData((prev) => ({
      ...prev,
      receiptFile: null,
      receiptPreview: null,
    }));
  };

  const handlePaymentMethodSelect = (method) => {
    setPaymentFormData((prev) => ({
      ...prev,
      paymentMethod: method,
    }));
  };

  const handleSubmitPayment = async () => {
    if (!paymentFormData.paymentMethod) {
      alert("Please select a payment method");
      return;
    }

    if (
      paymentFormData.paymentMethod === "gcash" &&
      !paymentFormData.receiptFile
    ) {
      alert("Please upload your GCash payment receipt");
      return;
    }

    if (!paymentFormData.agreeToTerms) {
      alert("Please agree to the terms and conditions");
      return;
    }

    try {
      setSubmittingPayment(true);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError) throw userError;

      let endDate = new Date();
      switch (selectedPlanForPayment.duration) {
        case "month":
          endDate.setMonth(endDate.getMonth() + 1);
          break;
        case "year":
          endDate.setFullYear(endDate.getFullYear() + 1);
          break;
        case "week":
          endDate.setDate(endDate.getDate() + 7);
          break;
        case "day":
          endDate.setDate(endDate.getDate() + 1);
          break;
        default:
          endDate.setMonth(endDate.getMonth() + 1);
      }

      let receiptPath = null;
      if (
        paymentFormData.paymentMethod === "gcash" &&
        paymentFormData.receiptFile
      ) {
        const fileExt = paymentFormData.receiptFile.name.split(".").pop();
        const fileName = `${user.id}/receipt-${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from("payment-receipts")
          .upload(fileName, paymentFormData.receiptFile);

        if (uploadError) throw uploadError;
        receiptPath = fileName;
      }

      const membershipData = {
        user_id: user.id,
        business_id: selectedPlanForPayment.businessId,
        plan_id: selectedPlanForPayment.id,
        price_paid: selectedPlanForPayment.price,
        status: "pending",
        start_date: new Date().toISOString(),
        end_date: endDate.toISOString(),
        payment_status: "pending",
        payment_method: paymentFormData.paymentMethod,
        receipt_path: receiptPath,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      console.log("Creating membership with data:", membershipData);

      const { data, error } = await supabase
        .from("memberships")
        .insert([membershipData])
        .select();

      if (error) {
        console.error("Insert error details:", error);
        throw error;
      }

      console.log("Membership created successfully:", data);

      const business = businesses.find(
        (b) => b.id === selectedPlanForPayment.businessId,
      );

      const selectedPaymentMethod = paymentFormData.paymentMethod;

      setPaymentFormData({
        paymentMethod: "",
        receiptFile: null,
        receiptPreview: null,
        agreeToTerms: false,
      });
      setShowPaymentFormModal(false);

      setSuccessData({
        business: business,
        plan: selectedPlanForPayment,
        paymentMethod: selectedPaymentMethod,
      });

      setShowSuccessModal(true);
    } catch (error) {
      console.error("Error submitting payment:", error);
      console.error("Error message:", error.message);
      console.error("Error details:", error.details);
      alert(
        `Failed to submit payment: ${error.message || "Please try again."}`,
      );
    } finally {
      setSubmittingPayment(false);
    }
  };

  const handlePaymentOption = (method) => {
    setSelectedPaymentMethod(method);
    setShowPaymentModal(true);
  };

  // ========== REVIEW HANDLERS ==========

  const checkExistingReview = async (businessId) => {
    try {
      const { data, error } = await supabase
        .from("reviews")
        .select("id, rating, comment")
        .eq("user_id", user.id)
        .eq("business_id", businessId)
        .single();

      if (error && error.code !== "PGRST116") throw error;
      return data;
    } catch (error) {
      console.error("Error checking existing review:", error);
      return null;
    }
  };

  const handleOpenReviewModal = async (business) => {
    // Check if user already has a review for this business
    const existingReview = await checkExistingReview(business.id);

    setSelectedBusinessForReview(business);
    setReviewFormData({
      rating: existingReview?.rating || 0,
      comment: existingReview?.comment || "",
      hoverRating: 0,
    });
    setShowReviewModal(true);
  };

  const handleRatingClick = (rating) => {
    setReviewFormData((prev) => ({
      ...prev,
      rating: rating,
    }));
  };

  const handleRatingHover = (rating) => {
    setReviewFormData((prev) => ({
      ...prev,
      hoverRating: rating,
    }));
  };

  const handleRatingLeave = () => {
    setReviewFormData((prev) => ({
      ...prev,
      hoverRating: 0,
    }));
  };

  const handleSubmitReview = async () => {
    if (reviewFormData.rating === 0) {
      alert("Please select a rating");
      return;
    }

    if (!reviewFormData.comment.trim()) {
      alert("Please write a review comment");
      return;
    }

    try {
      setSubmittingReview(true);

      // Check if user already reviewed this business
      const existingReview = await checkExistingReview(
        selectedBusinessForReview.id,
      );

      let result;

      if (existingReview) {
        // Update existing review
        const { data, error } = await supabase
          .from("reviews")
          .update({
            rating: reviewFormData.rating,
            comment: reviewFormData.comment.trim(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingReview.id).select(`
            *,
            profiles:user_id (
              first_name,
              last_name,
              avatar_url
            )
          `);

        if (error) throw error;
        result = data[0];
        alert("Your review has been updated!");
      } else {
        // Insert new review
        const { data, error } = await supabase.from("reviews").insert([
          {
            business_id: selectedBusinessForReview.id,
            user_id: user.id,
            rating: reviewFormData.rating,
            comment: reviewFormData.comment.trim(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ]).select(`
            *,
            profiles:user_id (
              first_name,
              last_name,
              avatar_url
            )
          `);

        if (error) throw error;
        result = data[0];
        alert("Review submitted successfully!");
      }

      // Update reviews state
      setBusinessReviews((prev) => ({
        ...prev,
        [selectedBusinessForReview.id]: [
          result,
          ...(prev[selectedBusinessForReview.id]?.filter(
            (r) => r.id !== result.id,
          ) || []),
        ],
      }));

      // Update business rating
      const allReviews = businessReviews[selectedBusinessForReview.id] || [];
      const newReviews = [
        result,
        ...allReviews.filter((r) => r.id !== result.id),
      ];
      const avgRating =
        newReviews.reduce((sum, r) => sum + r.rating, 0) / newReviews.length;

      await supabase
        .from("businesses")
        .update({ rating: avgRating })
        .eq("id", selectedBusinessForReview.id);

      // Update businesses list with new rating
      setBusinesses((prev) =>
        prev.map((b) =>
          b.id === selectedBusinessForReview.id
            ? { ...b, rating: avgRating, review_count: newReviews.length }
            : b,
        ),
      );

      setShowReviewModal(false);
      setSelectedBusinessForReview(null);
    } catch (error) {
      console.error("Error submitting review:", error);
      alert("Failed to submit review. Please try again.");
    } finally {
      setSubmittingReview(false);
    }
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

  const filteredBusinesses = businesses.filter((business) => {
    const matchesSearch =
      business.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      business.owner_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesLocation =
      selectedLocation === "All Locations" ||
      business.location === selectedLocation;
    const matchesPrice =
      business.price >= priceRange[0] && business.price <= priceRange[1];
    const matchesBusinessType =
      selectedBusinessType === "all" ||
      business.business_type === selectedBusinessType;

    return (
      matchesSearch && matchesLocation && matchesPrice && matchesBusinessType
    );
  });

  const getBusinessIcon = (business) => {
    switch (business.business_type) {
      case "gym":
        return business.emoji || "🏋️";
      case "cafe":
        return business.emoji || "☕";
      case "bakery":
        return business.emoji || "🥐";
      default:
        return business.emoji || "🏢";
    }
  };

  const formatBusinessHours = (hours) => {
    if (!hours) return "Not specified";

    try {
      const hoursObj = typeof hours === "string" ? JSON.parse(hours) : hours;
      return (
        <div className="business-hours-details">
          <div className="hours-row">
            <span>Monday:</span>{" "}
            {hoursObj.monday?.closed
              ? "Closed"
              : `${hoursObj.monday?.open || "9:00 AM"} - ${hoursObj.monday?.close || "6:00 PM"}`}
          </div>
          <div className="hours-row">
            <span>Tuesday:</span>{" "}
            {hoursObj.tuesday?.closed
              ? "Closed"
              : `${hoursObj.tuesday?.open || "9:00 AM"} - ${hoursObj.tuesday?.close || "6:00 PM"}`}
          </div>
          <div className="hours-row">
            <span>Wednesday:</span>{" "}
            {hoursObj.wednesday?.closed
              ? "Closed"
              : `${hoursObj.wednesday?.open || "9:00 AM"} - ${hoursObj.wednesday?.close || "6:00 PM"}`}
          </div>
          <div className="hours-row">
            <span>Thursday:</span>{" "}
            {hoursObj.thursday?.closed
              ? "Closed"
              : `${hoursObj.thursday?.open || "9:00 AM"} - ${hoursObj.thursday?.close || "6:00 PM"}`}
          </div>
          <div className="hours-row">
            <span>Friday:</span>{" "}
            {hoursObj.friday?.closed
              ? "Closed"
              : `${hoursObj.friday?.open || "9:00 AM"} - ${hoursObj.friday?.close || "6:00 PM"}`}
          </div>
          <div className="hours-row">
            <span>Saturday:</span>{" "}
            {hoursObj.saturday?.closed
              ? "Closed"
              : `${hoursObj.saturday?.open || "10:00 AM"} - ${hoursObj.saturday?.close || "5:00 PM"}`}
          </div>
          <div className="hours-row">
            <span>Sunday:</span>{" "}
            {hoursObj.sunday?.closed
              ? "Closed"
              : `${hoursObj.sunday?.open || "10:00 AM"} - ${hoursObj.sunday?.close || "3:00 PM"}`}
          </div>
        </div>
      );
    } catch {
      return <div>{hours}</div>;
    }
  };

  const formatAmenities = (amenities) => {
    if (!amenities) return [];

    try {
      return typeof amenities === "string" ? JSON.parse(amenities) : amenities;
    } catch {
      return [];
    }
  };

  const renderStars = (rating, isYellow = true) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;

    for (let i = 1; i <= 5; i++) {
      if (i <= fullStars) {
        stars.push(
          <span key={i} className={`star full ${isYellow ? "yellow" : ""}`}>
            ★
          </span>,
        );
      } else if (i === fullStars + 1 && hasHalfStar) {
        stars.push(
          <span key={i} className={`star half ${isYellow ? "yellow" : ""}`}>
            ★
          </span>,
        );
      } else {
        stars.push(
          <span key={i} className={`star empty ${isYellow ? "yellow" : ""}`}>
            ☆
          </span>,
        );
      }
    }
    return stars;
  };

  if (loading) {
    return (
      <div className={`browse-loading ${isDarkMode ? "dark-mode" : ""}`}>
        <div
          className={`loading-spinner ${isDarkMode ? "dark-mode" : ""}`}
        ></div>
        <p className={`loading-text ${isDarkMode ? "dark-mode" : ""}`}>
          Loading amazing businesses for you...
        </p>
      </div>
    );
  }

  return (
    <div className={`browse-container ${isDarkMode ? "dark-mode" : ""}`}>
      <ClientNavbar profile={profile} avatarUrl={avatarUrl} />

      <div className={`browse-main ${isDarkMode ? "dark-mode" : ""}`}>
        {/* Header Section */}
        <div className="browse-header">
          <h1 className={`browse-title ${isDarkMode ? "dark-mode" : ""}`}>
            Discover & Connect
            <span className="title-glow"></span>
          </h1>
          <p className={`browse-subtitle ${isDarkMode ? "dark-mode" : ""}`}>
            Find the perfect gym, cafe, or bakery that matches your lifestyle
          </p>
        </div>

        {/* Business Type Selector */}
        <div className="business-type-section">
          <div className="business-type-scroll">
            {businessTypes.map((type) => (
              <button
                key={type.id}
                className={`business-type-chip ${selectedBusinessType === type.id ? "active" : ""} ${isDarkMode ? "dark-mode" : ""}`}
                onClick={() => {
                  setSelectedBusinessType(type.id);
                }}
              >
                <span className="business-type-icon">{type.icon}</span>
                <span className="business-type-label">{type.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Filters Bar - Switched order: Price first, then Location */}
        <div className={`filters-bar ${isDarkMode ? "dark-mode" : ""}`}>
          {/* Search Input */}
          <div className="search-container">
            <Search
              className={`search-icon ${isDarkMode ? "dark-mode" : ""}`}
              size={18}
            />
            <input
              type="text"
              placeholder={`Search ${selectedBusinessType === "all" ? "businesses" : selectedBusinessType + "s"}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`search-input ${isDarkMode ? "dark-mode" : ""}`}
            />
            {searchQuery && (
              <button
                className={`clear-search ${isDarkMode ? "dark-mode" : ""}`}
                onClick={() => setSearchQuery("")}
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Price Range - Now first */}
          <div className={`filter-group ${isDarkMode ? "dark-mode" : ""}`}>
            <span className={`filter-label ${isDarkMode ? "dark-mode" : ""}`}>
              Price:
            </span>
            <div className="price-range">
              <input
                type="range"
                min="0"
                max="10000"
                step="100"
                value={priceRange[1]}
                onChange={(e) =>
                  setPriceRange([priceRange[0], parseInt(e.target.value)])
                }
                className="price-slider"
              />
              <span className={`price-value ${isDarkMode ? "dark-mode" : ""}`}>
                ₱{priceRange[0].toLocaleString()} - ₱
                {priceRange[1].toLocaleString()}
              </span>
            </div>
          </div>

          {/* Location - Now second */}
          <div className={`filter-group ${isDarkMode ? "dark-mode" : ""}`}>
            <MapPin
              size={16}
              className={`filter-icon ${isDarkMode ? "dark-mode" : ""}`}
            />
            <span className={`filter-label ${isDarkMode ? "dark-mode" : ""}`}>
              Location:
            </span>
            <select
              className={`filter-select ${isDarkMode ? "dark-mode" : ""}`}
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
            >
              {locations.map((loc) => (
                <option key={loc} value={loc}>
                  {loc}
                </option>
              ))}
            </select>
          </div>

          <div className={`results-badge ${isDarkMode ? "dark-mode" : ""}`}>
            <span className={`results-count ${isDarkMode ? "dark-mode" : ""}`}>
              {filteredBusinesses.length}
            </span>
            <span className={`results-label ${isDarkMode ? "dark-mode" : ""}`}>
              found
            </span>
          </div>
        </div>

        {/* Business Grid - Wider Cards */}
        <div className="business-grid">
          {filteredBusinesses.length > 0 ? (
            filteredBusinesses.map((business, index) => (
              <div
                key={business.id}
                className={`business-card-enhanced ${isDarkMode ? "dark-mode" : ""}`}
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="card-gradient-bg"></div>
                <div className="card-content">
                  {/* Card Header with Image/Icon */}
                  <div className="card-header">
                    <div className="business-image-wrapper">
                      {business.image_url ? (
                        <img
                          src={business.image_url}
                          alt={business.name}
                          className="business-image"
                        />
                      ) : (
                        <span className="business-emoji-large">
                          {getBusinessIcon(business)}
                        </span>
                      )}
                    </div>
                    <div className="business-tags">
                      <span
                        className={`business-type-badge ${isDarkMode ? "dark-mode" : ""}`}
                      >
                        {business.business_type}
                      </span>
                      <span
                        className={`rating-badge ${isDarkMode ? "dark-mode" : ""}`}
                      >
                        <Star size={12} fill="currentColor" />
                        <span>
                          {business.rating ? business.rating.toFixed(1) : "0.0"}
                        </span>
                      </span>
                    </div>
                  </div>

                  {/* Business Details */}
                  <div className="business-details">
                    <h3
                      className={`business-title ${isDarkMode ? "dark-mode" : ""}`}
                    >
                      {business.name}
                    </h3>

                    <div
                      className={`owner-highlight ${isDarkMode ? "dark-mode" : ""}`}
                    >
                      <Crown size={14} className="owner-icon" />
                      <span
                        className={`owner-name ${isDarkMode ? "dark-mode" : ""}`}
                      >
                        {business.owner_name}
                      </span>
                      <span className="owner-badge">Owner</span>
                    </div>

                    <p
                      className={`business-description ${isDarkMode ? "dark-mode" : ""}`}
                    >
                      {business.short_description ||
                        business.description?.substring(0, 80)}
                      {!business.short_description &&
                      business.description?.length > 80
                        ? "..."
                        : ""}
                    </p>

                    <div
                      className={`business-stats ${isDarkMode ? "dark-mode" : ""}`}
                    >
                      <div
                        className={`stat-item ${isDarkMode ? "dark-mode" : ""}`}
                      >
                        <MapPin size={14} />
                        <span>{business.location}</span>
                      </div>
                      <div
                        className={`stat-item ${isDarkMode ? "dark-mode" : ""}`}
                      >
                        <Users size={14} />
                        <span>{business.members_count || 0} members</span>
                      </div>
                      <div
                        className={`stat-item ${isDarkMode ? "dark-mode" : ""}`}
                      >
                        <MessageCircle size={14} />
                        <span>{business.review_count || 0} reviews</span>
                      </div>
                    </div>
                  </div>

                  {/* Card Footer */}
                  <div
                    className={`card-footer ${isDarkMode ? "dark-mode" : ""}`}
                  >
                    <div className="price-tag">
                      <span
                        className={`price-amount ${isDarkMode ? "dark-mode" : ""}`}
                      >
                        ₱{business.price?.toLocaleString()}
                      </span>
                      <span
                        className={`price-period ${isDarkMode ? "dark-mode" : ""}`}
                      >
                        /mo
                      </span>
                    </div>
                    <button
                      className={`view-details-btn-enhanced ${isDarkMode ? "dark-mode" : ""}`}
                      onClick={() => handleViewDetails(business)}
                    >
                      <span>View</span>
                      <ChevronRight size={16} className="btn-icon" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div
              className={`no-results-enhanced ${isDarkMode ? "dark-mode" : ""}`}
            >
              <Search
                className={`no-results-icon ${isDarkMode ? "dark-mode" : ""}`}
                size={48}
              />
              <h3 className={isDarkMode ? "dark-mode" : ""}>
                No businesses found
              </h3>
              <p className={isDarkMode ? "dark-mode" : ""}>
                Try adjusting your filters or search query
              </p>
              <button
                className={`clear-filters-btn-enhanced ${isDarkMode ? "dark-mode" : ""}`}
                onClick={() => {
                  setSearchQuery("");
                  setSelectedBusinessType("all");
                  setSelectedLocation("All Locations");
                  setPriceRange([0, 10000]);
                }}
              >
                <RefreshCw size={16} />
                <span>Clear All Filters</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Business Details Modal */}
      {showBusinessModal && selectedBusiness && (
        <div
          className={`modal-overlay ${isDarkMode ? "dark-mode" : ""}`}
          onClick={() => {
            setShowBusinessModal(false);
            setGcashQrUrl("");
          }}
        >
          <div
            className={`modal-content business-modal ${isDarkMode ? "dark-mode" : ""}`}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className={`modal-close ${isDarkMode ? "dark-mode" : ""}`}
              onClick={() => {
                setShowBusinessModal(false);
                setGcashQrUrl("");
              }}
            >
              <X size={20} />
            </button>

            {/* Modal Header */}
            <div
              className={`modal-header-enhanced ${isDarkMode ? "dark-mode" : ""}`}
            >
              <div className="modal-business-icon-large">
                {selectedBusiness.image_url ? (
                  <img
                    src={selectedBusiness.image_url}
                    alt={selectedBusiness.name}
                  />
                ) : (
                  <span>{getBusinessIcon(selectedBusiness)}</span>
                )}
              </div>
              <div className="modal-business-info">
                <h2 className={isDarkMode ? "dark-mode" : ""}>
                  {selectedBusiness.name}
                </h2>
                <div
                  className={`modal-owner-highlight ${isDarkMode ? "dark-mode" : ""}`}
                >
                  <Crown size={16} />
                  <span className={isDarkMode ? "dark-mode" : ""}>
                    {selectedBusiness.owner_name}
                  </span>
                  <span className="owner-badge">Business Owner</span>
                </div>
                <div className={`modal-tags ${isDarkMode ? "dark-mode" : ""}`}>
                  <span
                    className={`business-type-tag ${isDarkMode ? "dark-mode" : ""}`}
                  >
                    {selectedBusiness.business_type}
                  </span>
                  <div
                    className={`rating-container ${isDarkMode ? "dark-mode" : ""}`}
                  >
                    <div className="stars">
                      {renderStars(selectedBusiness.rating || 0, true)}
                    </div>
                    <span
                      className={`rating-number ${isDarkMode ? "dark-mode" : ""}`}
                    >
                      {selectedBusiness.rating
                        ? selectedBusiness.rating.toFixed(1)
                        : "0.0"}
                    </span>
                    <span
                      className={`review-count ${isDarkMode ? "dark-mode" : ""}`}
                    >
                      ({selectedBusiness.review_count || 0} reviews)
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Body */}
            <div
              className={`modal-body-enhanced ${isDarkMode ? "dark-mode" : ""}`}
            >
              {/* Location */}
              <div className={`info-section ${isDarkMode ? "dark-mode" : ""}`}>
                <h3 className={isDarkMode ? "dark-mode" : ""}>
                  <MapPin size={18} />
                  Location
                </h3>
                <p className={`address ${isDarkMode ? "dark-mode" : ""}`}>
                  {selectedBusiness.address || selectedBusiness.location}
                </p>
                <p className={`city ${isDarkMode ? "dark-mode" : ""}`}>
                  {selectedBusiness.city}, {selectedBusiness.province}
                </p>
              </div>

              {/* Description */}
              {selectedBusiness.description && (
                <div
                  className={`info-section ${isDarkMode ? "dark-mode" : ""}`}
                >
                  <h3 className={isDarkMode ? "dark-mode" : ""}>
                    <Info size={18} />
                    Description
                  </h3>
                  <p className={isDarkMode ? "dark-mode" : ""}>
                    {selectedBusiness.description}
                  </p>
                </div>
              )}

              {/* Business Hours */}
              {selectedBusiness.business_hours && (
                <div
                  className={`info-section ${isDarkMode ? "dark-mode" : ""}`}
                >
                  <h3 className={isDarkMode ? "dark-mode" : ""}>
                    <Clock size={18} />
                    Business Hours
                  </h3>
                  {formatBusinessHours(selectedBusiness.business_hours)}
                </div>
              )}

              {/* Amenities */}
              {selectedBusiness.amenities &&
                selectedBusiness.amenities.length > 0 && (
                  <div
                    className={`info-section ${isDarkMode ? "dark-mode" : ""}`}
                  >
                    <h3 className={isDarkMode ? "dark-mode" : ""}>
                      <Sparkles size={18} />
                      Amenities
                    </h3>
                    <div
                      className={`amenities-grid-enhanced ${isDarkMode ? "dark-mode" : ""}`}
                    >
                      {formatAmenities(selectedBusiness.amenities).map(
                        (amenity, index) => (
                          <div
                            key={index}
                            className={`amenity-chip ${isDarkMode ? "dark-mode" : ""}`}
                          >
                            <CheckCircle size={14} />
                            {amenity}
                          </div>
                        ),
                      )}
                    </div>
                  </div>
                )}

              {/* Contact Information */}
              <div className={`info-section ${isDarkMode ? "dark-mode" : ""}`}>
                <h3 className={isDarkMode ? "dark-mode" : ""}>
                  <PhoneCall size={18} />
                  Contact Information
                </h3>
                <div
                  className={`contact-info-enhanced ${isDarkMode ? "dark-mode" : ""}`}
                >
                  {selectedBusiness.contact_phone && (
                    <div
                      className={`contact-item ${isDarkMode ? "dark-mode" : ""}`}
                    >
                      <Phone size={16} />
                      <span className={isDarkMode ? "dark-mode" : ""}>
                        {selectedBusiness.contact_phone}
                      </span>
                    </div>
                  )}
                  {selectedBusiness.contact_email && (
                    <div
                      className={`contact-item ${isDarkMode ? "dark-mode" : ""}`}
                    >
                      <Mail size={16} />
                      <span className={isDarkMode ? "dark-mode" : ""}>
                        {selectedBusiness.contact_email}
                      </span>
                    </div>
                  )}
                  {selectedBusiness.website && (
                    <div
                      className={`contact-item ${isDarkMode ? "dark-mode" : ""}`}
                    >
                      <Globe size={16} />
                      <span className={isDarkMode ? "dark-mode" : ""}>
                        {selectedBusiness.website}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Reviews Section */}
              <div
                className={`info-section reviews-section-enhanced ${isDarkMode ? "dark-mode" : ""}`}
              >
                <div
                  className={`reviews-header-enhanced ${isDarkMode ? "dark-mode" : ""}`}
                >
                  <div
                    className={`reviews-title ${isDarkMode ? "dark-mode" : ""}`}
                  >
                    <MessageCircle size={18} />
                    <h3 className={isDarkMode ? "dark-mode" : ""}>
                      Customer Reviews
                    </h3>
                    {businessReviews[selectedBusiness.id]?.length > 0 && (
                      <span
                        className={`reviews-count ${isDarkMode ? "dark-mode" : ""}`}
                      >
                        {businessReviews[selectedBusiness.id].length}
                      </span>
                    )}
                  </div>
                  {hasMembership[selectedBusiness.id] && (
                    <button
                      className={`write-review-btn-enhanced ${isDarkMode ? "dark-mode" : ""}`}
                      onClick={() => handleOpenReviewModal(selectedBusiness)}
                    >
                      <Star size={14} />
                      <span>Write a Review</span>
                    </button>
                  )}
                </div>

                {businessReviews[selectedBusiness.id]?.length > 0 ? (
                  <>
                    <div
                      className={`reviews-list-enhanced ${isDarkMode ? "dark-mode" : ""}`}
                    >
                      {businessReviews[selectedBusiness.id]
                        .slice(0, 3)
                        .map((review) => (
                          <div
                            key={review.id}
                            className={`review-card ${isDarkMode ? "dark-mode" : ""}`}
                          >
                            <div
                              className={`review-card-header ${isDarkMode ? "dark-mode" : ""}`}
                            >
                              <div className="reviewer-avatar">
                                {review.profiles?.avatar_url ? (
                                  <img
                                    src={review.profiles.avatar_url}
                                    alt={review.profiles?.first_name}
                                    onError={(e) => {
                                      e.target.onerror = null;
                                      e.target.style.display = "none";
                                      e.target.parentElement.innerHTML =
                                        '<div class="avatar-placeholder">' +
                                        (review.profiles?.first_name?.[0] ||
                                          "U") +
                                        "</div>";
                                    }}
                                  />
                                ) : (
                                  <div className="avatar-placeholder">
                                    {review.profiles?.first_name?.[0] || "U"}
                                  </div>
                                )}
                              </div>
                              <div className="reviewer-info">
                                <span
                                  className={`reviewer-name ${isDarkMode ? "dark-mode" : ""}`}
                                >
                                  {review.profiles?.first_name}{" "}
                                  {review.profiles?.last_name}
                                </span>
                                <span
                                  className={`review-date ${isDarkMode ? "dark-mode" : ""}`}
                                >
                                  {new Date(
                                    review.created_at,
                                  ).toLocaleDateString("en-US", {
                                    year: "numeric",
                                    month: "short",
                                    day: "numeric",
                                  })}
                                </span>
                              </div>
                              <div
                                className={`review-rating ${isDarkMode ? "dark-mode" : ""}`}
                              >
                                {renderStars(review.rating, true)}
                              </div>
                            </div>
                            <p
                              className={`review-comment ${isDarkMode ? "dark-mode" : ""}`}
                            >
                              {review.comment}
                            </p>
                          </div>
                        ))}
                    </div>

                    {businessReviews[selectedBusiness.id]?.length >= 1 && (
                      <button
                        className={`view-all-reviews-btn-enhanced ${isDarkMode ? "dark-mode" : ""}`}
                        onClick={() => {
                          navigate(`/business-reviews/${selectedBusiness.id}`, {
                            state: {
                              business: selectedBusiness,
                              reviews: businessReviews[selectedBusiness.id],
                            },
                          });
                        }}
                      >
                        <span>View All Reviews</span>
                        <ChevronRight size={16} />
                      </button>
                    )}
                  </>
                ) : (
                  <div
                    className={`no-reviews-enhanced ${isDarkMode ? "dark-mode" : ""}`}
                  >
                    <MessageCircle size={32} />
                    <p className={isDarkMode ? "dark-mode" : ""}>
                      No reviews yet for this business.
                    </p>
                    {hasMembership[selectedBusiness.id] && (
                      <p
                        className={`be-first ${isDarkMode ? "dark-mode" : ""}`}
                      >
                        Be the first to write a review!
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Payment Options */}
              <div className={`info-section ${isDarkMode ? "dark-mode" : ""}`}>
                <h3 className={isDarkMode ? "dark-mode" : ""}>
                  <CreditCard size={18} />
                  Payment Options
                </h3>
                <div
                  className={`payment-options-enhanced ${isDarkMode ? "dark-mode" : ""}`}
                >
                  <div
                    className={`payment-option ${isDarkMode ? "dark-mode" : ""}`}
                  >
                    <div
                      className={`payment-option-header ${isDarkMode ? "dark-mode" : ""}`}
                    >
                      <span
                        className={`payment-icon ${isDarkMode ? "dark-mode" : ""}`}
                      >
                        📱
                      </span>
                      <span
                        className={`payment-title ${isDarkMode ? "dark-mode" : ""}`}
                      >
                        GCash
                      </span>
                      {selectedBusiness.gcash_qr_code ? (
                        <span className="payment-badge available">
                          Available
                        </span>
                      ) : (
                        <span className="payment-badge unavailable">
                          Not Available
                        </span>
                      )}
                    </div>
                    {selectedBusiness.gcash_qr_code && (
                      <button
                        className={`view-payment-btn-enhanced ${isDarkMode ? "dark-mode" : ""}`}
                        onClick={() => handlePaymentOption("gcash")}
                      >
                        View QR Code
                      </button>
                    )}
                  </div>

                  <div
                    className={`payment-option ${isDarkMode ? "dark-mode" : ""}`}
                  >
                    <div
                      className={`payment-option-header ${isDarkMode ? "dark-mode" : ""}`}
                    >
                      <span
                        className={`payment-icon ${isDarkMode ? "dark-mode" : ""}`}
                      >
                        🏪
                      </span>
                      <span
                        className={`payment-title ${isDarkMode ? "dark-mode" : ""}`}
                      >
                        Pay at Business
                      </span>
                      <span className="payment-badge available">Available</span>
                    </div>
                    <button
                      className={`view-payment-btn-enhanced ${isDarkMode ? "dark-mode" : ""}`}
                      onClick={() => handlePaymentOption("onsite")}
                    >
                      View Details
                    </button>
                  </div>
                </div>
              </div>

              {/* Membership Plans */}
              <div className={`info-section ${isDarkMode ? "dark-mode" : ""}`}>
                <h3 className={isDarkMode ? "dark-mode" : ""}>
                  <Award size={18} />
                  Membership Plans
                </h3>
                {selectedBusiness.plans && selectedBusiness.plans.length > 0 ? (
                  <div
                    className={`plans-grid-enhanced ${isDarkMode ? "dark-mode" : ""}`}
                  >
                    {selectedBusiness.plans.map((plan) => (
                      <div
                        key={plan.id}
                        className={`plan-card-enhanced ${isDarkMode ? "dark-mode" : ""}`}
                      >
                        <h4 className={isDarkMode ? "dark-mode" : ""}>
                          {plan.name}
                        </h4>
                        <div
                          className={`plan-price ${isDarkMode ? "dark-mode" : ""}`}
                        >
                          ₱{plan.price.toLocaleString()}
                          <span
                            className={`plan-duration ${isDarkMode ? "dark-mode" : ""}`}
                          >
                            /{plan.duration}
                          </span>
                        </div>
                        <ul
                          className={`plan-features ${isDarkMode ? "dark-mode" : ""}`}
                        >
                          {plan.features.map((feature, idx) => (
                            <li
                              key={idx}
                              className={isDarkMode ? "dark-mode" : ""}
                            >
                              <CheckCircle size={14} />
                              {feature}
                            </li>
                          ))}
                        </ul>
                        <button
                          className={`join-plan-btn-enhanced ${isDarkMode ? "dark-mode" : ""}`}
                          onClick={() =>
                            handleJoinNow(selectedBusiness.id, plan)
                          }
                          disabled={joiningPlan === plan.id}
                        >
                          {joiningPlan === plan.id ? (
                            <>
                              <RefreshCw size={16} className="spinning" />
                              Processing...
                            </>
                          ) : (
                            <>
                              Join Now
                              <ChevronRight size={16} />
                            </>
                          )}
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div
                    className={`no-plans-message ${isDarkMode ? "dark-mode" : ""}`}
                  >
                    <p className={isDarkMode ? "dark-mode" : ""}>
                      No membership plans available for this business yet.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Review Modal */}
      {showReviewModal && selectedBusinessForReview && (
        <div
          className={`modal-overlay ${isDarkMode ? "dark-mode" : ""}`}
          onClick={() => setShowReviewModal(false)}
        >
          <div
            className={`modal-content review-modal ${isDarkMode ? "dark-mode" : ""}`}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className={`modal-close ${isDarkMode ? "dark-mode" : ""}`}
              onClick={() => setShowReviewModal(false)}
            >
              <X size={20} />
            </button>

            <div
              className={`review-modal-header ${isDarkMode ? "dark-mode" : ""}`}
            >
              <Star
                size={32}
                className={`review-icon ${isDarkMode ? "dark-mode" : ""}`}
              />
              <h2 className={isDarkMode ? "dark-mode" : ""}>
                {reviewFormData.rating > 0
                  ? "Edit Your Review"
                  : "Write a Review"}
              </h2>
            </div>

            <div
              className={`review-business-info ${isDarkMode ? "dark-mode" : ""}`}
            >
              <div
                className={`review-business-icon ${isDarkMode ? "dark-mode" : ""}`}
              >
                {getBusinessIcon(selectedBusinessForReview)}
              </div>
              <div>
                <h3 className={isDarkMode ? "dark-mode" : ""}>
                  {selectedBusinessForReview.name}
                </h3>
                <p className={isDarkMode ? "dark-mode" : ""}>
                  {selectedBusinessForReview.location}
                </p>
              </div>
            </div>

            <div className={`review-form ${isDarkMode ? "dark-mode" : ""}`}>
              {/* Rating Stars */}
              <div
                className={`rating-section ${isDarkMode ? "dark-mode" : ""}`}
              >
                <label className={isDarkMode ? "dark-mode" : ""}>
                  Your Rating *
                </label>
                <div
                  className={`star-rating-container ${isDarkMode ? "dark-mode" : ""}`}
                >
                  {[1, 2, 3, 4, 5].map((star) => (
                    <span
                      key={star}
                      className={`star-rating ${
                        (reviewFormData.hoverRating || reviewFormData.rating) >=
                        star
                          ? "active"
                          : ""
                      } ${isDarkMode ? "dark-mode" : ""}`}
                      onClick={() => handleRatingClick(star)}
                      onMouseEnter={() => handleRatingHover(star)}
                      onMouseLeave={handleRatingLeave}
                    >
                      ★
                    </span>
                  ))}
                  <span
                    className={`rating-label ${isDarkMode ? "dark-mode" : ""}`}
                  >
                    {reviewFormData.rating === 1 && "Poor"}
                    {reviewFormData.rating === 2 && "Fair"}
                    {reviewFormData.rating === 3 && "Good"}
                    {reviewFormData.rating === 4 && "Very Good"}
                    {reviewFormData.rating === 5 && "Excellent"}
                  </span>
                </div>
              </div>

              {/* Comment */}
              <div
                className={`comment-section ${isDarkMode ? "dark-mode" : ""}`}
              >
                <label
                  htmlFor="review-comment"
                  className={isDarkMode ? "dark-mode" : ""}
                >
                  Your Review *
                </label>
                <textarea
                  id="review-comment"
                  rows="5"
                  placeholder="Share your experience with this business... What did you like? What could be improved?"
                  value={reviewFormData.comment}
                  onChange={(e) =>
                    setReviewFormData((prev) => ({
                      ...prev,
                      comment: e.target.value,
                    }))
                  }
                  maxLength="500"
                  className={isDarkMode ? "dark-mode" : ""}
                />
                <div
                  className={`comment-counter ${isDarkMode ? "dark-mode" : ""}`}
                >
                  {reviewFormData.comment.length}/500
                </div>
              </div>

              {/* Guidelines */}
              <div
                className={`review-guidelines ${isDarkMode ? "dark-mode" : ""}`}
              >
                <h4 className={isDarkMode ? "dark-mode" : ""}>
                  Review Guidelines:
                </h4>
                <ul>
                  <li className={isDarkMode ? "dark-mode" : ""}>
                    ✓ Be respectful and constructive
                  </li>
                  <li className={isDarkMode ? "dark-mode" : ""}>
                    ✓ Share your honest experience
                  </li>
                  <li className={isDarkMode ? "dark-mode" : ""}>
                    ✓ Avoid offensive language
                  </li>
                  <li className={isDarkMode ? "dark-mode" : ""}>
                    ✓ Focus on the business and services
                  </li>
                </ul>
              </div>

              <button
                className={`submit-review-btn-enhanced ${isDarkMode ? "dark-mode" : ""}`}
                onClick={handleSubmitReview}
                disabled={submittingReview}
              >
                {submittingReview ? (
                  <>
                    <RefreshCw size={16} className="spinning" />
                    Submitting...
                  </>
                ) : reviewFormData.rating > 0 && reviewFormData.comment ? (
                  "Update Review"
                ) : (
                  "Submit Review"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Form Modal */}
      {showPaymentFormModal && selectedPlanForPayment && (
        <div
          className={`modal-overlay ${isDarkMode ? "dark-mode" : ""}`}
          onClick={() => setShowPaymentFormModal(false)}
        >
          <div
            className={`modal-content payment-form-modal ${isDarkMode ? "dark-mode" : ""}`}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className={`modal-close ${isDarkMode ? "dark-mode" : ""}`}
              onClick={() => setShowPaymentFormModal(false)}
            >
              <X size={20} />
            </button>

            <div
              className={`payment-modal-header ${isDarkMode ? "dark-mode" : ""}`}
            >
              <CreditCard
                size={32}
                className={`payment-icon ${isDarkMode ? "dark-mode" : ""}`}
              />
              <h2 className={isDarkMode ? "dark-mode" : ""}>
                Complete Your Membership
              </h2>
            </div>

            <div
              className={`payment-form-content ${isDarkMode ? "dark-mode" : ""}`}
            >
              {/* Summary Cards */}
              <div className={`summary-cards ${isDarkMode ? "dark-mode" : ""}`}>
                <div
                  className={`summary-card ${isDarkMode ? "dark-mode" : ""}`}
                >
                  <h3 className={isDarkMode ? "dark-mode" : ""}>
                    Membership Summary
                  </h3>
                  <div
                    className={`summary-row ${isDarkMode ? "dark-mode" : ""}`}
                  >
                    <span className={isDarkMode ? "dark-mode" : ""}>Plan:</span>
                    <strong className={isDarkMode ? "dark-mode" : ""}>
                      {selectedPlanForPayment.name}
                    </strong>
                  </div>
                  <div
                    className={`summary-row ${isDarkMode ? "dark-mode" : ""}`}
                  >
                    <span className={isDarkMode ? "dark-mode" : ""}>
                      Price:
                    </span>
                    <strong
                      className={`price ${isDarkMode ? "dark-mode" : ""}`}
                    >
                      ₱{selectedPlanForPayment.price.toLocaleString()}/
                      {selectedPlanForPayment.duration}
                    </strong>
                  </div>
                  <div
                    className={`summary-row ${isDarkMode ? "dark-mode" : ""}`}
                  >
                    <span className={isDarkMode ? "dark-mode" : ""}>
                      Duration:
                    </span>
                    <span className={isDarkMode ? "dark-mode" : ""}>
                      {selectedPlanForPayment.duration}
                    </span>
                  </div>
                </div>

                <div
                  className={`summary-card ${isDarkMode ? "dark-mode" : ""}`}
                >
                  <h3 className={isDarkMode ? "dark-mode" : ""}>
                    Your Information
                  </h3>
                  <div
                    className={`summary-row ${isDarkMode ? "dark-mode" : ""}`}
                  >
                    <span className={isDarkMode ? "dark-mode" : ""}>Name:</span>
                    <span className={isDarkMode ? "dark-mode" : ""}>
                      {profile?.first_name} {profile?.last_name}
                    </span>
                  </div>
                  <div
                    className={`summary-row ${isDarkMode ? "dark-mode" : ""}`}
                  >
                    <span className={isDarkMode ? "dark-mode" : ""}>
                      Email:
                    </span>
                    <span className={isDarkMode ? "dark-mode" : ""}>
                      {profile?.email || user?.email}
                    </span>
                  </div>
                  <div
                    className={`summary-row ${isDarkMode ? "dark-mode" : ""}`}
                  >
                    <span className={isDarkMode ? "dark-mode" : ""}>
                      Phone:
                    </span>
                    <span className={isDarkMode ? "dark-mode" : ""}>
                      {profile?.mobile || "Not provided"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Payment Method Selection */}
              <div
                className={`payment-method-section ${isDarkMode ? "dark-mode" : ""}`}
              >
                <h3 className={isDarkMode ? "dark-mode" : ""}>
                  Select Payment Method
                </h3>
                <div
                  className={`payment-method-options ${isDarkMode ? "dark-mode" : ""}`}
                >
                  <label
                    className={`payment-method-card ${paymentFormData.paymentMethod === "gcash" ? "selected" : ""} ${isDarkMode ? "dark-mode" : ""}`}
                  >
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="gcash"
                      checked={paymentFormData.paymentMethod === "gcash"}
                      onChange={() => handlePaymentMethodSelect("gcash")}
                    />
                    <div className="payment-method-content">
                      <span
                        className={`method-icon ${isDarkMode ? "dark-mode" : ""}`}
                      >
                        📱
                      </span>
                      <div className="method-info">
                        <span
                          className={`method-name ${isDarkMode ? "dark-mode" : ""}`}
                        >
                          GCash
                        </span>
                        <span
                          className={`method-description ${isDarkMode ? "dark-mode" : ""}`}
                        >
                          Pay via GCash and upload receipt
                        </span>
                      </div>
                    </div>
                  </label>

                  <label
                    className={`payment-method-card ${paymentFormData.paymentMethod === "onsite" ? "selected" : ""} ${isDarkMode ? "dark-mode" : ""}`}
                  >
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="onsite"
                      checked={paymentFormData.paymentMethod === "onsite"}
                      onChange={() => handlePaymentMethodSelect("onsite")}
                    />
                    <div className="payment-method-content">
                      <span
                        className={`method-icon ${isDarkMode ? "dark-mode" : ""}`}
                      >
                        🏪
                      </span>
                      <div className="method-info">
                        <span
                          className={`method-name ${isDarkMode ? "dark-mode" : ""}`}
                        >
                          Pay at Business
                        </span>
                        <span
                          className={`method-description ${isDarkMode ? "dark-mode" : ""}`}
                        >
                          Pay directly at the business premises
                        </span>
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Receipt Upload for GCash */}
              {paymentFormData.paymentMethod === "gcash" && (
                <div
                  className={`receipt-upload-section ${isDarkMode ? "dark-mode" : ""}`}
                >
                  <h3 className={isDarkMode ? "dark-mode" : ""}>
                    Upload Payment Receipt
                  </h3>
                  <p
                    className={`upload-instruction ${isDarkMode ? "dark-mode" : ""}`}
                  >
                    Please upload a screenshot of your GCash payment
                    confirmation
                  </p>

                  {!paymentFormData.receiptPreview ? (
                    <div
                      className={`upload-area ${isDarkMode ? "dark-mode" : ""}`}
                    >
                      <input
                        type="file"
                        id="receipt-upload"
                        accept="image/*"
                        onChange={handleReceiptUpload}
                        className="file-input"
                        disabled={uploadingReceipt}
                      />
                      <label
                        htmlFor="receipt-upload"
                        className={`upload-label ${isDarkMode ? "dark-mode" : ""}`}
                      >
                        <Upload size={32} />
                        <span
                          className={`upload-text ${isDarkMode ? "dark-mode" : ""}`}
                        >
                          Click to upload receipt
                        </span>
                        <span
                          className={`upload-hint ${isDarkMode ? "dark-mode" : ""}`}
                        >
                          PNG, JPG up to 5MB
                        </span>
                      </label>
                    </div>
                  ) : (
                    <div
                      className={`receipt-preview ${isDarkMode ? "dark-mode" : ""}`}
                    >
                      <img
                        src={paymentFormData.receiptPreview}
                        alt="Receipt preview"
                      />
                      <button
                        className={`remove-receipt-btn ${isDarkMode ? "dark-mode" : ""}`}
                        onClick={removeReceipt}
                      >
                        <Trash2 size={14} />
                        Remove
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Terms Agreement */}
              <div className={`terms-section ${isDarkMode ? "dark-mode" : ""}`}>
                <label
                  className={`terms-checkbox ${isDarkMode ? "dark-mode" : ""}`}
                >
                  <input
                    type="checkbox"
                    checked={paymentFormData.agreeToTerms}
                    onChange={(e) =>
                      setPaymentFormData((prev) => ({
                        ...prev,
                        agreeToTerms: e.target.checked,
                      }))
                    }
                  />
                  <span className={isDarkMode ? "dark-mode" : ""}>
                    I agree to the{" "}
                    <a href="#" onClick={(e) => e.preventDefault()}>
                      terms and conditions
                    </a>{" "}
                    and confirm that the information provided is accurate
                  </span>
                </label>
              </div>

              <button
                className={`submit-payment-btn-enhanced ${isDarkMode ? "dark-mode" : ""}`}
                onClick={handleSubmitPayment}
                disabled={submittingPayment}
              >
                {submittingPayment ? (
                  <>
                    <RefreshCw size={16} className="spinning" />
                    Processing...
                  </>
                ) : (
                  "Submit Application"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && selectedPaymentMethod && (
        <div
          className={`modal-overlay ${isDarkMode ? "dark-mode" : ""}`}
          onClick={() => {
            setShowPaymentModal(false);
            setSelectedPaymentMethod(null);
          }}
        >
          <div
            className={`modal-content payment-info-modal ${isDarkMode ? "dark-mode" : ""}`}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className={`modal-close ${isDarkMode ? "dark-mode" : ""}`}
              onClick={() => {
                setShowPaymentModal(false);
                setSelectedPaymentMethod(null);
              }}
            >
              <X size={20} />
            </button>

            {selectedPaymentMethod === "gcash" &&
              selectedBusiness?.gcash_qr_code && (
                <>
                  <div
                    className={`payment-info-header ${isDarkMode ? "dark-mode" : ""}`}
                  >
                    <span
                      className={`info-icon ${isDarkMode ? "dark-mode" : ""}`}
                    >
                      📱
                    </span>
                    <h2 className={isDarkMode ? "dark-mode" : ""}>
                      GCash Payment
                    </h2>
                  </div>

                  <div
                    className={`gcash-payment-content ${isDarkMode ? "dark-mode" : ""}`}
                  >
                    <div
                      className={`qr-code-container ${isDarkMode ? "dark-mode" : ""}`}
                    >
                      {gcashQrUrl ? (
                        <img
                          src={gcashQrUrl}
                          alt="GCash QR Code"
                          className={`gcash-qr-large ${isDarkMode ? "dark-mode" : ""}`}
                        />
                      ) : (
                        <div
                          className={`qr-loading ${isDarkMode ? "dark-mode" : ""}`}
                        >
                          Loading QR code...
                        </div>
                      )}
                    </div>

                    {selectedBusiness.gcash_number && (
                      <div
                        className={`gcash-number ${isDarkMode ? "dark-mode" : ""}`}
                      >
                        <span
                          className={`number-label ${isDarkMode ? "dark-mode" : ""}`}
                        >
                          GCash Number:
                        </span>
                        <span
                          className={`number-value ${isDarkMode ? "dark-mode" : ""}`}
                        >
                          {selectedBusiness.gcash_number}
                        </span>
                      </div>
                    )}

                    <div
                      className={`payment-steps ${isDarkMode ? "dark-mode" : ""}`}
                    >
                      <h3 className={isDarkMode ? "dark-mode" : ""}>
                        How to pay with GCash:
                      </h3>
                      <ol
                        className={`steps-list ${isDarkMode ? "dark-mode" : ""}`}
                      >
                        <li className={isDarkMode ? "dark-mode" : ""}>
                          Open your GCash app
                        </li>
                        <li className={isDarkMode ? "dark-mode" : ""}>
                          Tap on "Scan QR"
                        </li>
                        <li className={isDarkMode ? "dark-mode" : ""}>
                          Scan the QR code above
                        </li>
                        <li className={isDarkMode ? "dark-mode" : ""}>
                          Enter the exact amount: ₱
                          {selectedPlanForPayment?.price?.toLocaleString() ||
                            "Plan price"}
                        </li>
                        <li className={isDarkMode ? "dark-mode" : ""}>
                          Confirm payment
                        </li>
                        <li className={isDarkMode ? "dark-mode" : ""}>
                          Take a screenshot of the confirmation
                        </li>
                      </ol>
                    </div>

                    <div
                      className={`payment-note ${isDarkMode ? "dark-mode" : ""}`}
                    >
                      <AlertCircle size={16} />
                      <p className={isDarkMode ? "dark-mode" : ""}>
                        Please screenshot the payment confirmation. You'll need
                        to upload it when applying.
                      </p>
                    </div>
                  </div>
                </>
              )}

            {selectedPaymentMethod === "onsite" && (
              <>
                <div
                  className={`payment-info-header ${isDarkMode ? "dark-mode" : ""}`}
                >
                  <span
                    className={`info-icon ${isDarkMode ? "dark-mode" : ""}`}
                  >
                    🏪
                  </span>
                  <h2 className={isDarkMode ? "dark-mode" : ""}>
                    Pay at Business
                  </h2>
                </div>

                <div
                  className={`onsite-payment-content ${isDarkMode ? "dark-mode" : ""}`}
                >
                  <div
                    className={`business-address-card ${isDarkMode ? "dark-mode" : ""}`}
                  >
                    <h3 className={isDarkMode ? "dark-mode" : ""}>
                      Business Location
                    </h3>
                    <p
                      className={`business-name ${isDarkMode ? "dark-mode" : ""}`}
                    >
                      {selectedBusiness?.name}
                    </p>
                    <p
                      className={`business-address ${isDarkMode ? "dark-mode" : ""}`}
                    >
                      {selectedBusiness?.address || selectedBusiness?.location}
                    </p>
                    <p
                      className={`business-city ${isDarkMode ? "dark-mode" : ""}`}
                    >
                      {selectedBusiness?.city}, {selectedBusiness?.province}
                    </p>
                  </div>

                  <div
                    className={`payment-steps ${isDarkMode ? "dark-mode" : ""}`}
                  >
                    <h3 className={isDarkMode ? "dark-mode" : ""}>
                      How to pay on-site:
                    </h3>
                    <ol
                      className={`steps-list ${isDarkMode ? "dark-mode" : ""}`}
                    >
                      <li className={isDarkMode ? "dark-mode" : ""}>
                        Visit the business at the address above
                      </li>
                      <li className={isDarkMode ? "dark-mode" : ""}>
                        Inform the staff that you're applying for a membership
                      </li>
                      <li className={isDarkMode ? "dark-mode" : ""}>
                        Proceed to the counter to make your payment
                      </li>
                      <li className={isDarkMode ? "dark-mode" : ""}>
                        Keep the receipt as proof of payment
                      </li>
                    </ol>
                  </div>

                  <div
                    className={`business-hours-summary ${isDarkMode ? "dark-mode" : ""}`}
                  >
                    <h3 className={isDarkMode ? "dark-mode" : ""}>
                      Business Hours
                    </h3>
                    {formatBusinessHours(selectedBusiness?.business_hours)}
                  </div>
                </div>
              </>
            )}

            <div className={`modal-actions ${isDarkMode ? "dark-mode" : ""}`}>
              <button
                className={`modal-btn primary ${isDarkMode ? "dark-mode" : ""}`}
                onClick={() => {
                  setShowPaymentModal(false);
                  setSelectedPaymentMethod(null);
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {showSuccessModal && (
        <div
          className={`modal-overlay ${isDarkMode ? "dark-mode" : ""}`}
          onClick={() => setShowSuccessModal(false)}
        >
          <div
            className={`modal-content success-modal ${isDarkMode ? "dark-mode" : ""}`}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className={`modal-close ${isDarkMode ? "dark-mode" : ""}`}
              onClick={() => setShowSuccessModal(false)}
            >
              <X size={20} />
            </button>

            <div className={`success-icon ${isDarkMode ? "dark-mode" : ""}`}>
              {successData.paymentMethod === "gcash" ? "📱" : "✅"}
            </div>

            <h2 className={`success-title ${isDarkMode ? "dark-mode" : ""}`}>
              Application Submitted!
            </h2>

            <p className={`success-message ${isDarkMode ? "dark-mode" : ""}`}>
              Your application for{" "}
              <strong className={isDarkMode ? "dark-mode" : ""}>
                {successData.plan?.name}
              </strong>{" "}
              at{" "}
              <strong className={isDarkMode ? "dark-mode" : ""}>
                {successData.business?.name}
              </strong>{" "}
              has been submitted successfully!
            </p>

            <div
              className={`success-payment-info ${isDarkMode ? "dark-mode" : ""}`}
            >
              <div className={`payment-icon ${isDarkMode ? "dark-mode" : ""}`}>
                {successData.paymentMethod === "gcash" ? "⏳" : "💰"}
              </div>
              <div className={`payment-text ${isDarkMode ? "dark-mode" : ""}`}>
                <h4 className={isDarkMode ? "dark-mode" : ""}>
                  {successData.paymentMethod === "gcash"
                    ? "Pending Owner Approval"
                    : "Complete Payment at Business"}
                </h4>
                <p className={isDarkMode ? "dark-mode" : ""}>
                  {successData.paymentMethod === "gcash"
                    ? "Your receipt has been uploaded and is now pending review. The business owner will verify your payment and activate your membership within 24-48 hours. You will receive a notification once your membership is approved."
                    : `Please visit ${successData.business?.name} at their premises within 7 days to complete your payment and finalize your membership. Bring a valid ID and mention your application.`}
                </p>
              </div>
            </div>

            {successData.paymentMethod === "onsite" && (
              <div
                className={`business-address ${isDarkMode ? "dark-mode" : ""}`}
              >
                <MapPin size={16} />
                <div>
                  <strong className={isDarkMode ? "dark-mode" : ""}>
                    {successData.business?.name}
                  </strong>
                  <p className={isDarkMode ? "dark-mode" : ""}>
                    {successData.business?.address ||
                      successData.business?.location}
                  </p>
                  <p className={isDarkMode ? "dark-mode" : ""}>
                    {successData.business?.city},{" "}
                    {successData.business?.province}
                  </p>
                </div>
              </div>
            )}

            {successData.paymentMethod === "gcash" && (
              <div className={`timeline ${isDarkMode ? "dark-mode" : ""}`}>
                <h4 className={isDarkMode ? "dark-mode" : ""}>
                  What happens next?
                </h4>
                <div
                  className={`timeline-steps ${isDarkMode ? "dark-mode" : ""}`}
                >
                  <div
                    className={`timeline-step ${isDarkMode ? "dark-mode" : ""}`}
                  >
                    <span className="step-number">1</span>
                    <span
                      className={`step-text ${isDarkMode ? "dark-mode" : ""}`}
                    >
                      Owner reviews your receipt
                    </span>
                  </div>
                  <div
                    className={`timeline-step ${isDarkMode ? "dark-mode" : ""}`}
                  >
                    <span className="step-number">2</span>
                    <span
                      className={`step-text ${isDarkMode ? "dark-mode" : ""}`}
                    >
                      Payment verified (24-48 hours)
                    </span>
                  </div>
                  <div
                    className={`timeline-step ${isDarkMode ? "dark-mode" : ""}`}
                  >
                    <span className="step-number">3</span>
                    <span
                      className={`step-text ${isDarkMode ? "dark-mode" : ""}`}
                    >
                      Membership activated
                    </span>
                  </div>
                  <div
                    className={`timeline-step ${isDarkMode ? "dark-mode" : ""}`}
                  >
                    <span className="step-number">4</span>
                    <span
                      className={`step-text ${isDarkMode ? "dark-mode" : ""}`}
                    >
                      Notification sent to you
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div className={`modal-actions ${isDarkMode ? "dark-mode" : ""}`}>
              <button
                className={`modal-btn primary ${isDarkMode ? "dark-mode" : ""}`}
                onClick={() => {
                  setShowSuccessModal(false);
                  navigate("/ClientDashboard");
                }}
              >
                Go to Dashboard
              </button>
              <button
                className={`modal-btn secondary ${isDarkMode ? "dark-mode" : ""}`}
                onClick={() => setShowSuccessModal(false)}
              >
                Continue Browsing
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Browse;
