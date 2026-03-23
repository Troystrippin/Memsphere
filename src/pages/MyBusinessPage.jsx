import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  lazy,
  Suspense,
} from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import OwnerNavbar from "../components/owner/OwnerNavbar";
import { useTheme } from "../contexts/ThemeContext";
import { toast, Toaster } from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import {
  Save,
  X,
  Edit2,
  Eye,
  Star,
  Clock,
  MapPin,
  Phone,
  Mail,
  Globe,
  CreditCard,
  Image,
  FileText,
  Users,
  Award,
  AlertCircle,
  CheckCircle,
  Loader,
  ChevronRight,
  ChevronLeft,
  Plus,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Upload,
  QrCode,
  Calendar,
  Building,
  Info,
  Shield,
  AlertTriangle,
} from "lucide-react";

// Lazy load heavy components
const MembershipPlansManager = lazy(
  () => import("../components/owner/MembershipPlansManager"),
);
const ReviewsManager = lazy(() => import("../components/owner/ReviewsManager"));
const BusinessPreview = lazy(
  () => import("../components/owner/BusinessPreview"),
);

// Custom hooks
const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
};

const useLocalStorage = (key, initialValue) => {
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch {
      return initialValue;
    }
  });
  const setValue = (value) => {
    try {
      setStoredValue(value);
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error("Error saving to localStorage:", error);
    }
  };
  return [storedValue, setValue];
};

const MyBusinessPage = () => {
  const navigate = useNavigate();
  const { isDarkMode, toggleTheme } = useTheme();
  const [business, setBusiness] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({});
  const [activeTab, setActiveTab] = useState("basic");
  const [profile, setProfile] = useState(null);
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [draftSaved, setDraftSaved] = useLocalStorage("business_draft", null);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
  const [showVerifiedMessage, setShowVerifiedMessage] = useState(false);

  // Validation states
  const [touchedFields, setTouchedFields] = useState({});
  const [fieldErrors, setFieldErrors] = useState({});
  const [validationProgress, setValidationProgress] = useState(0);

  // Upload states
  const [uploadProgress, setUploadProgress] = useState({});
  const [uploadingQr, setUploadingQr] = useState(false);
  const [gcashNumber, setGcashNumber] = useState("");
  const [gcashQrCode, setGcashQrCode] = useState(null);
  const [gcashQrUrl, setGcashQrUrl] = useState("");

  // Business Permit state
  const [permitFile, setPermitFile] = useState(null);
  const [permitPreview, setPermitPreview] = useState(null);
  const [uploadingPermit, setUploadingPermit] = useState(false);
  const [permitNumber, setPermitNumber] = useState("");
  const [permitExpiry, setPermitExpiry] = useState("");

  // UI states
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showUnsavedChangesModal, setShowUnsavedChangesModal] = useState(false);
  const [analytics, setAnalytics] = useState(null);

  // Business hours state with advanced features
  const [businessHours, setBusinessHours] = useState({
    monday: {
      open: "09:00",
      close: "18:00",
      closed: false,
      openAMPM: "AM",
      closeAMPM: "PM",
      breaks: [],
    },
    tuesday: {
      open: "09:00",
      close: "18:00",
      closed: false,
      openAMPM: "AM",
      closeAMPM: "PM",
      breaks: [],
    },
    wednesday: {
      open: "09:00",
      close: "18:00",
      closed: false,
      openAMPM: "AM",
      closeAMPM: "PM",
      breaks: [],
    },
    thursday: {
      open: "09:00",
      close: "18:00",
      closed: false,
      openAMPM: "AM",
      closeAMPM: "PM",
      breaks: [],
    },
    friday: {
      open: "09:00",
      close: "18:00",
      closed: false,
      openAMPM: "AM",
      closeAMPM: "PM",
      breaks: [],
    },
    saturday: {
      open: "10:00",
      close: "17:00",
      closed: false,
      openAMPM: "AM",
      closeAMPM: "PM",
      breaks: [],
    },
    sunday: {
      open: "10:00",
      close: "15:00",
      closed: true,
      openAMPM: "AM",
      closeAMPM: "PM",
      breaks: [],
    },
  });

  // Enhanced categories with icons and metadata
  const businessCategories = [
    {
      id: "gym",
      label: "Gym / Fitness Center",
      icon: "🏋️",
      color: "from-green-500 to-emerald-500",
      description: "Health & Wellness",
    },
    {
      id: "cafe",
      label: "Cafe / Coffee Shop",
      icon: "☕",
      color: "from-amber-500 to-orange-500",
      description: "Food & Beverage",
    },
    {
      id: "bakery",
      label: "Bakery / Pastry Shop",
      icon: "🥐",
      color: "from-yellow-500 to-amber-500",
      description: "Food & Beverage",
    },
    {
      id: "restaurant",
      label: "Restaurant",
      icon: "🍽️",
      color: "from-red-500 to-orange-500",
      description: "Food & Beverage",
    },
    {
      id: "salon",
      label: "Salon / Spa",
      icon: "💇",
      color: "from-pink-500 to-rose-500",
      description: "Beauty & Wellness",
    },
    {
      id: "retail",
      label: "Retail Store",
      icon: "🛍️",
      color: "from-blue-500 to-cyan-500",
      description: "Shopping",
    },
  ];

  const locationOptions = [
    {
      value: "Downtown",
      label: "Downtown",
      coordinates: { lat: 16.0489, lng: 120.3364 },
      popular: true,
    },
    {
      value: "Arellano",
      label: "Arellano",
      coordinates: { lat: 16.047, lng: 120.337 },
      popular: false,
    },
    {
      value: "Pantal",
      label: "Pantal",
      coordinates: { lat: 16.05, lng: 120.33 },
      popular: false,
    },
    {
      value: "Perez",
      label: "Perez",
      coordinates: { lat: 16.045, lng: 120.335 },
      popular: true,
    },
    {
      value: "PNR",
      label: "PNR",
      coordinates: { lat: 16.042, lng: 120.338 },
      popular: false,
    },
    {
      value: "Bonuan",
      label: "Bonuan",
      coordinates: { lat: 16.06, lng: 120.34 },
      popular: true,
    },
    {
      value: "AB Fernandez",
      label: "AB Fernandez",
      coordinates: { lat: 16.044, lng: 120.333 },
      popular: false,
    },
  ];

  const daysOfWeek = [
    { id: "monday", label: "Monday", short: "Mon" },
    { id: "tuesday", label: "Tuesday", short: "Tue" },
    { id: "wednesday", label: "Wednesday", short: "Wed" },
    { id: "thursday", label: "Thursday", short: "Thu" },
    { id: "friday", label: "Friday", short: "Fri" },
    { id: "saturday", label: "Saturday", short: "Sat" },
    { id: "sunday", label: "Sunday", short: "Sun" },
  ];

  // Helper functions
  const convertTo12Hour = (time24) => {
    if (!time24) return { time: "09:00", ampm: "AM" };
    const [hours, minutes] = time24.split(":");
    const h = parseInt(hours);
    const ampm = h >= 12 ? "PM" : "AM";
    const h12 = h % 12 || 12;
    return { time: `${h12.toString().padStart(2, "0")}:${minutes}`, ampm };
  };

  const convertTo24Hour = (time12, ampm) => {
    if (!time12) return "09:00";
    const [hours, minutes] = time12.split(":");
    let h = parseInt(hours);
    if (ampm === "PM" && h !== 12) h += 12;
    if (ampm === "AM" && h === 12) h = 0;
    return `${h.toString().padStart(2, "0")}:${minutes}`;
  };

  const handleBusinessHourChange = (day, field, value) => {
    setBusinessHours((prev) => ({
      ...prev,
      [day]: {
        ...prev[day],
        [field]: value,
      },
    }));
  };

  const handleTimeChange = (day, type, value) => {
    const current = businessHours[day];
    if (type === "openTime") {
      handleBusinessHourChange(
        day,
        "open",
        convertTo24Hour(value, current.openAMPM),
      );
    } else if (type === "closeTime") {
      handleBusinessHourChange(
        day,
        "close",
        convertTo24Hour(value, current.closeAMPM),
      );
    } else {
      handleBusinessHourChange(day, type, value);
    }
  };

  // Debounced form data for auto-save
  const debouncedFormData = useDebounce(formData, 3000);

  // Auto-save effect
  useEffect(() => {
    if (
      autoSaveEnabled &&
      editMode &&
      debouncedFormData &&
      Object.keys(debouncedFormData).length > 0
    ) {
      const saveDraft = async () => {
        try {
          setDraftSaved({
            ...debouncedFormData,
            lastSaved: new Date().toISOString(),
            businessHours,
          });
          toast.success("Draft auto-saved", { icon: "💾", duration: 2000 });
        } catch (error) {
          console.error("Auto-save failed:", error);
        }
      };
      saveDraft();
    }
  }, [debouncedFormData, businessHours, editMode, autoSaveEnabled]);

  // Fetch business data
  const fetchBusiness = async () => {
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

      const { data, error } = await supabase
        .from("businesses")
        .select("*")
        .eq("owner_id", user.id)
        .maybeSingle();
      if (error) throw error;

      if (data) {
        setBusiness(data);
        setFormData(data);
        if (data.gcash_number) setGcashNumber(data.gcash_number);
        if (data.gcash_qr_code) {
          setGcashQrCode(data.gcash_qr_code);
          const { data: urlData } = supabase.storage
            .from("gcash-qr-codes")
            .getPublicUrl(data.gcash_qr_code);
          setGcashQrUrl(urlData.publicUrl);
        }
        if (data.permit_number) setPermitNumber(data.permit_number || "");
        if (data.permit_expiry) setPermitExpiry(data.permit_expiry || "");

        // Show verified message for 3 seconds if newly verified
        if (data.permit_verified === true && !showVerifiedMessage) {
          setShowVerifiedMessage(true);
          setTimeout(() => {
            setShowVerifiedMessage(false);
          }, 3000);
        }
      } else {
        setBusiness(null);
        setFormData({
          name: profile?.business_name || "",
          owner_name:
            profile?.first_name && profile?.last_name
              ? `${profile.first_name} ${profile.last_name}`.trim()
              : "",
          business_type: profile?.business_category || "",
          description: "",
          short_description: "",
          location: "Downtown",
          address: "",
          city: "Dagupan",
          province: "Pangasinan",
          price: 0,
          price_unit: "month",
          emoji:
            businessCategories.find((c) => c.id === profile?.business_category)
              ?.icon || "🏢",
          contact_phone: profile?.mobile || "",
          contact_email: profile?.email || "",
          website: "",
          status: "active",
        });
        setEditMode(true);
      }
    } catch (err) {
      console.error("Error fetching business:", err);
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Fetch user profile
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
    } catch (err) {
      console.error("Error fetching profile:", err);
    }
  };

  useEffect(() => {
    fetchUserProfile();
    fetchBusiness();
  }, []);

  // Simplified image upload
  const handleGcashQrUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error("File size must be less than 2MB");
      return;
    }

    setUploadingQr(true);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) {
        toast.error("User not authenticated");
        return;
      }

      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}/gcash-qr-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("gcash-qr-codes")
        .upload(fileName, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("gcash-qr-codes")
        .getPublicUrl(fileName);

      setGcashQrCode(fileName);
      setGcashQrUrl(urlData.publicUrl);
      setFormData((prev) => ({
        ...prev,
        gcash_qr_code: fileName,
      }));

      toast.success("GCash QR code uploaded successfully!");
    } catch (err) {
      console.error("Error uploading GCash QR code:", err);
      toast.error(err.message || "Failed to upload QR code");
    } finally {
      setUploadingQr(false);
    }
  };

  // Business Permit upload
  const handlePermitUpload = async () => {
    if (!permitFile) {
      toast.error("Please select a permit file");
      return;
    }

    if (!permitNumber.trim()) {
      toast.error("Please enter permit number");
      return;
    }

    if (!permitExpiry) {
      toast.error("Please select permit expiry date");
      return;
    }

    const expiryDate = new Date(permitExpiry);
    if (expiryDate < new Date()) {
      toast.error("Permit expiry date must be in the future");
      return;
    }

    try {
      setUploadingPermit(true);
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError) throw userError;

      const fileExt = permitFile.name.split(".").pop();
      const fileName = `${user.id}/permit_${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("business-permits")
        .upload(fileName, permitFile);

      if (uploadError) throw uploadError;

      const { error: updateError } = await supabase
        .from("businesses")
        .update({
          permit_document: fileName,
          permit_number: permitNumber,
          permit_expiry: permitExpiry,
          permit_verified: false,
          permit_uploaded_at: new Date().toISOString(),
          verification_status: "pending",
          updated_at: new Date().toISOString(),
        })
        .eq("id", business.id);

      if (updateError) throw updateError;

      await fetchBusiness();
      toast.success("Permit uploaded successfully! Awaiting verification.");

      setPermitFile(null);
      setPermitPreview(null);
      setPermitNumber("");
      setPermitExpiry("");
    } catch (err) {
      console.error("Error uploading permit:", err);
      toast.error("Failed to upload permit");
    } finally {
      setUploadingPermit(false);
    }
  };

  const handlePermitFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const allowedTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "application/pdf",
    ];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Please upload a JPG, PNG, or PDF file");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("File size must be less than 5MB");
      return;
    }

    setPermitFile(file);
    if (permitPreview) URL.revokeObjectURL(permitPreview);
    if (file.type.startsWith("image/")) {
      setPermitPreview(URL.createObjectURL(file));
    } else {
      setPermitPreview(null);
    }
  };

  const removePermit = async () => {
    if (!business?.permit_document) return;
    if (!window.confirm("Remove permit document?")) return;

    try {
      const { error } = await supabase.storage
        .from("business-permits")
        .remove([business.permit_document]);

      if (error) throw error;

      await supabase
        .from("businesses")
        .update({
          permit_document: null,
          permit_number: null,
          permit_expiry: null,
          permit_verified: false,
          verification_status: "pending",
        })
        .eq("id", business.id);

      await fetchBusiness();
      toast.success("Permit removed successfully!");
    } catch (err) {
      console.error("Error removing permit:", err);
      toast.error("Failed to remove permit");
    }
  };

  // Validation
  const validateField = useCallback(
    (fieldName, value) => {
      let errorMessage = "";

      switch (fieldName) {
        case "name":
          if (!value?.trim()) errorMessage = "Business name is required";
          else if (value.length < 3)
            errorMessage = "Name must be at least 3 characters";
          else if (value.length > 100)
            errorMessage = "Name must be less than 100 characters";
          break;
        case "business_type":
          if (!value) errorMessage = "Please select a business category";
          break;
        case "short_description":
          if (value?.length > 200)
            errorMessage = "Short description must be less than 200 characters";
          break;
        case "description":
          if (value?.length > 5000)
            errorMessage = "Description must be less than 5000 characters";
          break;
        case "location":
          if (!value) errorMessage = "Please select a location";
          break;
        case "address":
          if (!value?.trim()) errorMessage = "Address is required";
          break;
        case "price":
          if (value < 0) errorMessage = "Price cannot be negative";
          break;
        case "contact_phone":
          if (value && !/^(\+63|0)[0-9]{10}$/.test(value.replace(/\s/g, ""))) {
            errorMessage = "Invalid phone number format (e.g., 09171234567)";
          }
          break;
        case "contact_email":
          if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
            errorMessage = "Invalid email format";
          }
          break;
        case "gcash_number":
          if (value && !/^09\d{9}$/.test(value.replace(/\s/g, ""))) {
            errorMessage = "GCash number must be 11 digits starting with 09";
          }
          break;
        default:
          break;
      }

      setFieldErrors((prev) => ({ ...prev, [fieldName]: errorMessage }));

      const fields = ["name", "business_type", "location", "address", "price"];
      const validatedFields = fields.filter(
        (f) => !fieldErrors[f] && formData[f],
      );
      const progress = (validatedFields.length / fields.length) * 100;
      setValidationProgress(progress);

      return !errorMessage;
    },
    [formData, fieldErrors],
  );

  // Save business
  const saveBusiness = async () => {
    const fieldsToValidate = [
      "name",
      "business_type",
      "location",
      "address",
      "price",
    ];
    const errors = [];

    fieldsToValidate.forEach((field) => {
      if (!validateField(field, formData[field])) {
        errors.push(field);
      }
    });

    if (errors.length > 0) {
      toast.error(`Please fix ${errors.length} error(s) before saving`);
      return;
    }

    const saveToast = toast.loading("Saving business information...");

    try {
      setSaving(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        navigate("/login");
        return;
      }

      const businessData = {
        ...formData,
        owner_id: user.id,
        owner_name:
          profile?.first_name && profile?.last_name
            ? `${profile.first_name} ${profile.last_name}`.trim()
            : formData.owner_name,
        city: "Dagupan",
        province: "Pangasinan",
        members_count: business?.members_count || 0,
        rating: business?.rating || 0,
        business_hours: businessHours,
        gcash_number: gcashNumber,
        gcash_qr_code: gcashQrCode,
        updated_at: new Date().toISOString(),
      };

      let result;

      if (business?.id) {
        result = await supabase
          .from("businesses")
          .update(businessData)
          .eq("id", business.id)
          .select();
      } else {
        result = await supabase
          .from("businesses")
          .insert([businessData])
          .select();
      }

      const { data, error } = result;

      if (error) throw error;

      setBusiness(data[0]);
      setFormData(data[0]);
      setEditMode(false);
      setDraftSaved(null);

      toast.success(
        business?.id
          ? "Business updated successfully!"
          : "Business created successfully!",
        {
          id: saveToast,
          duration: 3000,
        },
      );
    } catch (err) {
      console.error("Error saving business:", err);
      toast.error(err.message || "Failed to save business", { id: saveToast });
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    if (JSON.stringify(formData) !== JSON.stringify(business)) {
      setShowUnsavedChangesModal(true);
    } else {
      cancelEdit();
    }
  };

  const cancelEdit = () => {
    setFormData(business || {});
    setEditMode(false);
    setFieldErrors({});
    setTouchedFields({});
    setValidationProgress(0);
  };

  const addBreakTime = (day) => {
    const newBreak = {
      start: "12:00",
      end: "13:00",
      startAMPM: "PM",
      endAMPM: "PM",
    };
    setBusinessHours((prev) => ({
      ...prev,
      [day]: {
        ...prev[day],
        breaks: [...(prev[day].breaks || []), newBreak],
      },
    }));
  };

  const removeBreakTime = (day, breakIndex) => {
    setBusinessHours((prev) => ({
      ...prev,
      [day]: {
        ...prev[day],
        breaks: prev[day].breaks.filter((_, i) => i !== breakIndex),
      },
    }));
  };

  const getCompletionPercentage = useMemo(() => {
    const requiredFields = [
      "name",
      "business_type",
      "location",
      "address",
      "price",
    ];
    const completed = requiredFields.filter((field) => formData[field]).length;
    return (completed / requiredFields.length) * 100;
  }, [formData]);

  const activeCategory = useMemo(() => {
    return businessCategories.find((cat) => cat.id === formData.business_type);
  }, [formData.business_type]);

  // Check if business is verified
  const isVerified = business?.permit_verified === true;
  const isPending =
    business?.verification_status === "pending" ||
    (!business?.permit_verified && business?.permit_document);
  const isRejected = business?.verification_status === "rejected";

  if (loading) {
    return (
      <div
        className={`fixed inset-0 flex items-center justify-center z-50 select-none ${
          isDarkMode
            ? "bg-gray-900"
            : "bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50"
        }`}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="w-20 h-20 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto"></div>
          <p
            className={`mt-6 font-medium ${isDarkMode ? "text-gray-300" : "text-gray-600"}`}
          >
            Loading your business...
          </p>
        </motion.div>
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
          duration: 4000,
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
                      My Business
                    </h1>
                    <div className="absolute -bottom-2 left-0 w-20 h-1 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full animate-width-pulse"></div>
                  </div>
                  {activeCategory && (
                    <span
                      className={`px-3 py-1 bg-gradient-to-r ${activeCategory.color} text-white text-xs font-semibold rounded-full shadow-md`}
                    >
                      {activeCategory.icon} {activeCategory.label}
                    </span>
                  )}
                </div>
                <p
                  className={`mt-2 flex items-center gap-2 ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}
                >
                  <Info className="w-4 h-4" />
                  Manage your business profile, settings, and services
                </p>
              </div>
            </div>

            {editMode && (
              <div className="mt-4">
                <div
                  className={`flex justify-between text-xs mb-1 ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}
                >
                  <span>Profile Completion</span>
                  <span>{Math.round(getCompletionPercentage)}%</span>
                </div>
                <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${getCompletionPercentage}%` }}
                    className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full"
                  />
                </div>
              </div>
            )}
          </motion.div>

          {/* VERIFIED MESSAGE - Fades out after 3 seconds */}
          <AnimatePresence>
            {showVerifiedMessage && isVerified && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                className="mb-6"
              >
                <div className="bg-green-50 dark:bg-green-900/30 border-l-4 border-green-500 rounded-r-lg p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0">
                      <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-sm font-semibold text-green-800 dark:text-green-300">
                        Business Verified ✓
                      </h3>
                      <p className="text-sm text-green-700 dark:text-green-400 mt-1">
                        Your business is verified and visible to customers. You
                        can now accept memberships and payments.
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* VERIFICATION BANNERS - Persistent for unverified businesses */}
          {business && !isVerified && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6"
            >
              {isPending && (
                <div className="bg-yellow-50 dark:bg-yellow-900/30 border-l-4 border-yellow-500 rounded-r-lg p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0">
                      <Clock className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-sm font-semibold text-yellow-800 dark:text-yellow-300">
                        Business Verification Pending
                      </h3>
                      <p className="text-sm text-yellow-700 dark:text-yellow-400 mt-1">
                        Your business permit is under review. Your business is
                        currently hidden from customers until verified. This
                        usually takes 1-2 business days.
                      </p>
                      <div className="mt-3">
                        <button
                          onClick={() => setActiveTab("permit")}
                          className="text-sm text-yellow-800 dark:text-yellow-300 font-medium hover:text-yellow-900 dark:hover:text-yellow-200 underline"
                        >
                          View Permit Status →
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {isRejected && (
                <div className="bg-red-50 dark:bg-red-900/30 border-l-4 border-red-500 rounded-r-lg p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0">
                      <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-sm font-semibold text-red-800 dark:text-red-300">
                        Verification Failed - Action Required!
                      </h3>
                      <p className="text-sm text-red-700 dark:text-red-400 mt-1">
                        Your business permit was not approved.{" "}
                        {business.rejection_reason
                          ? `Reason: ${business.rejection_reason}`
                          : "Please upload a valid business permit."}
                      </p>
                      <p className="text-sm text-red-700 dark:text-red-400 mt-1 font-medium">
                        ⚠️ Your business is NOT visible to customers until
                        verification is approved.
                      </p>
                      <div className="mt-3">
                        <button
                          onClick={() => setActiveTab("permit")}
                          className="text-sm text-red-800 dark:text-red-300 font-medium hover:text-red-900 dark:hover:text-red-200 underline"
                        >
                          Upload New Permit →
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {!business?.permit_document && !business?.permit_verified && (
                <div className="bg-orange-50 dark:bg-orange-900/30 border-l-4 border-orange-500 rounded-r-lg p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0">
                      <Shield className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-sm font-semibold text-orange-800 dark:text-orange-300">
                        Business Not Verified
                      </h3>
                      <p className="text-sm text-orange-700 dark:text-orange-400 mt-1">
                        Your business is currently NOT visible to customers.
                        Please upload your business permit for verification.
                      </p>
                      <div className="mt-3">
                        <button
                          onClick={() => setActiveTab("permit")}
                          className="text-sm text-orange-800 dark:text-orange-300 font-medium hover:text-orange-900 dark:hover:text-orange-200 underline"
                        >
                          Upload Business Permit →
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* No Business State */}
          <AnimatePresence>
            {!business && !editMode && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className={`rounded-2xl shadow-xl p-12 text-center ${isDarkMode ? "bg-gray-800" : "bg-white"}`}
              >
                <div className="text-7xl mb-4">🏢</div>
                <h2
                  className={`text-2xl font-semibold mb-2 ${isDarkMode ? "text-white" : "text-gray-800"}`}
                >
                  No Business Found
                </h2>
                <p
                  className={`mb-6 ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}
                >
                  You haven't registered a business yet.
                </p>
                <button
                  onClick={() => {
                    setEditMode(true);
                    setFormData({
                      name: profile?.business_name || "",
                      owner_name:
                        profile?.first_name && profile?.last_name
                          ? `${profile.first_name} ${profile.last_name}`.trim()
                          : "",
                      business_type: profile?.business_category || "",
                      description: "",
                      short_description: "",
                      location: "Downtown",
                      address: "",
                      city: "Dagupan",
                      province: "Pangasinan",
                      price: 0,
                      price_unit: "month",
                      emoji:
                        businessCategories.find(
                          (c) => c.id === profile?.business_category,
                        )?.icon || "🏢",
                      contact_phone: profile?.mobile || "",
                      contact_email: profile?.email || "",
                      website: "",
                      status: "active",
                    });
                  }}
                  className="px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200"
                >
                  Create Your Business
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Main Content */}
          {business || editMode ? (
            <div className="flex gap-6">
              {/* Sidebar */}
              <motion.div
                animate={{ width: sidebarCollapsed ? "64px" : "260px" }}
                transition={{ duration: 0.2, ease: "easeInOut" }}
                className={`rounded-2xl shadow-lg border overflow-hidden flex-shrink-0 sticky top-6 h-[calc(100vh-120px)] ${
                  isDarkMode
                    ? "bg-gray-800 border-gray-700"
                    : "bg-white border-gray-200"
                }`}
              >
                <div
                  className={`flex items-center justify-between px-3 py-3 border-b ${
                    isDarkMode ? "border-gray-700" : "border-gray-200"
                  }`}
                >
                  {!sidebarCollapsed && (
                    <span
                      className={`text-xs font-semibold uppercase tracking-wider ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}
                    >
                      Menu
                    </span>
                  )}
                  <button
                    onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                    className={`p-1.5 rounded-lg transition-colors ${
                      isDarkMode
                        ? "hover:bg-gray-700 text-gray-400 hover:text-gray-200"
                        : "hover:bg-gray-100 text-gray-500 hover:text-gray-700"
                    } ${sidebarCollapsed ? "mx-auto" : ""}`}
                  >
                    {sidebarCollapsed ? (
                      <ChevronRight className="w-4 h-4" />
                    ) : (
                      <ChevronLeft className="w-4 h-4" />
                    )}
                  </button>
                </div>

                <div className="py-2 overflow-y-auto h-[calc(100%-52px)]">
                  {[
                    {
                      id: "basic",
                      label: "Basic Info",
                      icon: Building,
                      color: "text-blue-500",
                    },
                    {
                      id: "contact",
                      label: "Contact & Hours",
                      icon: Clock,
                      color: "text-green-500",
                    },
                    {
                      id: "payment",
                      label: "Payment",
                      icon: CreditCard,
                      color: "text-purple-500",
                    },
                    {
                      id: "permit",
                      label: "Permit",
                      icon: FileText,
                      color: "text-orange-500",
                    },
                    {
                      id: "plans",
                      label: "Membership Plans",
                      icon: Award,
                      color: "text-pink-500",
                    },
                    {
                      id: "reviews",
                      label: "Reviews",
                      icon: Star,
                      color: "text-yellow-500",
                    },
                    {
                      id: "preview",
                      label: "Preview",
                      icon: Eye,
                      color: "text-indigo-500",
                    },
                  ].map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`w-full flex items-center gap-3 py-2.5 transition-all duration-150 ${
                          isActive
                            ? isDarkMode
                              ? "bg-gray-700 text-blue-400 border-r-4 border-blue-500"
                              : "bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 border-r-4 border-blue-500"
                            : isDarkMode
                              ? "text-gray-400 hover:bg-gray-700 hover:text-gray-200"
                              : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                        } ${sidebarCollapsed ? "justify-center px-2" : "px-4"}`}
                        title={sidebarCollapsed ? tab.label : ""}
                      >
                        <Icon
                          className={`w-5 h-5 flex-shrink-0 ${isActive ? tab.color : ""}`}
                        />
                        {!sidebarCollapsed && (
                          <span className="text-sm font-medium whitespace-nowrap">
                            {tab.label}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {editMode && !sidebarCollapsed && (
                  <div
                    className={`border-t p-3 ${isDarkMode ? "border-gray-700" : "border-gray-200"}`}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-xs ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}
                      >
                        Auto-save
                      </span>
                      <button
                        onClick={() => setAutoSaveEnabled(!autoSaveEnabled)}
                        className="p-1"
                      >
                        {autoSaveEnabled ? (
                          <ToggleRight className="w-4 h-4 text-blue-500" />
                        ) : (
                          <ToggleLeft className="w-4 h-4 text-gray-400" />
                        )}
                      </button>
                    </div>
                    {draftSaved && (
                      <p
                        className={`text-xs mt-2 ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}
                      >
                        Last saved:{" "}
                        {new Date(draftSaved.lastSaved).toLocaleTimeString()}
                      </p>
                    )}
                  </div>
                )}
              </motion.div>

              {/* Main Content */}
              <div
                className={`flex-1 rounded-2xl shadow-lg border overflow-hidden flex flex-col ${
                  isDarkMode
                    ? "bg-gray-800 border-gray-700"
                    : "bg-white border-gray-200"
                }`}
              >
                <div
                  className={`border-b px-6 py-4 flex items-center justify-between sticky top-0 z-10 ${
                    isDarkMode
                      ? "bg-gray-700/50 border-gray-600"
                      : "bg-gray-50/50 border-gray-200"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {activeCategory && !editMode && (
                      <div
                        className={`w-10 h-10 bg-gradient-to-r ${activeCategory.color} rounded-xl flex items-center justify-center text-2xl`}
                      >
                        {activeCategory.icon}
                      </div>
                    )}
                    <div>
                      <h2
                        className={`text-xl font-semibold ${isDarkMode ? "text-white" : "text-gray-800"}`}
                      >
                        {activeTab === "basic" && "Basic Information"}
                        {activeTab === "contact" && "Contact & Business Hours"}
                        {activeTab === "payment" && "Payment Settings"}
                        {activeTab === "permit" && "Business Permit"}
                        {activeTab === "plans" && "Membership Plans"}
                        {activeTab === "reviews" && "Customer Reviews"}
                        {activeTab === "preview" && "Business Preview"}
                      </h2>
                      {!editMode && business && (
                        <p
                          className={`text-sm mt-1 ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}
                        >
                          Last updated:{" "}
                          {new Date(business.updated_at).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>

                  {!editMode && business && (
                    <button
                      onClick={() => setEditMode(true)}
                      className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:shadow-lg transition-all"
                    >
                      <Edit2 className="w-4 h-4" />
                      <span>Edit Business</span>
                    </button>
                  )}
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={activeTab}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.2 }}
                    >
                      {/* Basic Info Tab */}
                      {activeTab === "basic" && (
                        <div className="space-y-8">
                          {/* Preview Card with Verification Status Badge */}
                          <div
                            className={`bg-gradient-to-r ${isDarkMode ? "from-gray-700 to-gray-800" : "from-blue-50 to-indigo-50"} rounded-xl p-6 border ${isDarkMode ? "border-gray-600" : "border-blue-100"} relative`}
                          >
                            {business && !isVerified && (
                              <div className="absolute top-4 right-4">
                                <span className="px-3 py-1 bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 rounded-full text-xs font-semibold flex items-center gap-1">
                                  <AlertCircle className="w-3 h-3" />
                                  Not Verified
                                </span>
                              </div>
                            )}
                            {business && isVerified && (
                              <div className="absolute top-4 right-4">
                                <span className="px-3 py-1 bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 rounded-full text-xs font-semibold flex items-center gap-1">
                                  <CheckCircle className="w-3 h-3" />
                                  Verified
                                </span>
                              </div>
                            )}
                            <div className="flex items-center gap-4">
                              <div className="text-5xl">
                                {formData.emoji || activeCategory?.icon || "🏢"}
                              </div>
                              <div className="flex-1">
                                <h3
                                  className={`text-xl font-bold ${isDarkMode ? "text-white" : "text-gray-800"}`}
                                >
                                  {formData.name || "Your Business Name"}
                                </h3>
                                <p
                                  className={`text-sm mt-1 line-clamp-2 ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}
                                >
                                  {formData.short_description ||
                                    "Add a short description"}
                                </p>
                                <div className="flex gap-4 mt-2">
                                  <span
                                    className={`text-xs flex items-center gap-1 ${isDarkMode ? "text-gray-500" : "text-gray-500"}`}
                                  >
                                    <MapPin className="w-3 h-3" />
                                    {formData.location || "Location"}
                                  </span>
                                  <span
                                    className={`text-xs flex items-center gap-1 ${isDarkMode ? "text-gray-500" : "text-gray-500"}`}
                                  >
                                    <Users className="w-3 h-3" />
                                    {business?.members_count || 0} members
                                  </span>
                                </div>
                              </div>
                              {editMode && validationProgress === 100 && (
                                <div className="text-green-500">
                                  <CheckCircle className="w-8 h-8" />
                                </div>
                              )}
                            </div>
                            {!isVerified && !editMode && (
                              <div className="mt-4 pt-3 border-t border-blue-200 dark:border-gray-600">
                                <p className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
                                  <AlertTriangle className="w-3 h-3" />
                                  Your business is not visible to customers.
                                  Please upload your business permit for
                                  verification.
                                </p>
                              </div>
                            )}
                          </div>

                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            {/* Left Column */}
                            <div className="space-y-5">
                              <h3
                                className={`text-lg font-semibold flex items-center gap-2 ${isDarkMode ? "text-white" : "text-gray-800"}`}
                              >
                                <Building className="w-5 h-5 text-blue-500" />
                                Basic Information
                              </h3>

                              <div>
                                <label
                                  className={`block text-xs font-semibold uppercase tracking-wider mb-1 ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}
                                >
                                  Business Name *
                                </label>
                                {editMode ? (
                                  <>
                                    <input
                                      type="text"
                                      name="name"
                                      value={formData.name || ""}
                                      onChange={(e) => {
                                        setFormData((prev) => ({
                                          ...prev,
                                          name: e.target.value,
                                        }));
                                        validateField("name", e.target.value);
                                      }}
                                      onBlur={() =>
                                        setTouchedFields((prev) => ({
                                          ...prev,
                                          name: true,
                                        }))
                                      }
                                      className={`w-full px-4 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                        isDarkMode
                                          ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                                          : "bg-white border-gray-300 text-gray-900"
                                      } ${touchedFields.name && fieldErrors.name ? "border-red-500" : ""}`}
                                      placeholder="Enter business name"
                                    />
                                    {touchedFields.name && fieldErrors.name && (
                                      <p className="text-xs text-red-500 mt-1">
                                        {fieldErrors.name}
                                      </p>
                                    )}
                                  </>
                                ) : (
                                  <p
                                    className={`w-full px-4 py-3 border rounded-xl text-sm ${isDarkMode ? "bg-gray-700 border-gray-600 text-gray-300" : "bg-gray-50 border-gray-200 text-gray-800"}`}
                                  >
                                    {business?.name || "—"}
                                  </p>
                                )}
                              </div>

                              <div>
                                <label
                                  className={`block text-xs font-semibold uppercase tracking-wider mb-1 ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}
                                >
                                  Business Category *
                                </label>
                                {/* Business Category - READ ONLY (cannot be edited after registration) */}
                                {editMode ? (
                                  <div
                                    className={`w-full px-4 py-3 border rounded-xl text-sm cursor-not-allowed ${isDarkMode ? "bg-gray-700 border-gray-600 text-gray-400" : "bg-gray-100 border-gray-300 text-gray-600"}`}
                                  >
                                    <div className="flex items-center gap-2">
                                      <span className="text-xl">
                                        {activeCategory?.icon || "🏢"}
                                      </span>
                                      <span>
                                        {activeCategory?.label ||
                                          formData.business_type ||
                                          "Not selected"}
                                      </span>
                                    </div>
                                    <p
                                      className={`text-xs mt-1 ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}
                                    >
                                      Business category cannot be changed after
                                      registration
                                    </p>
                                  </div>
                                ) : (
                                  <p
                                    className={`w-full px-4 py-3 border rounded-xl text-sm ${isDarkMode ? "bg-gray-700 border-gray-600 text-gray-300" : "bg-gray-50 border-gray-200 text-gray-800"}`}
                                  >
                                    <span className="flex items-center gap-2">
                                      <span className="text-xl">
                                        {businessCategories.find(
                                          (c) =>
                                            c.id === business?.business_type,
                                        )?.icon || "🏢"}
                                      </span>
                                      <span>
                                        {businessCategories.find(
                                          (c) =>
                                            c.id === business?.business_type,
                                        )?.label || "—"}
                                      </span>
                                    </span>
                                  </p>
                                )}
                              </div>

                              {/* Short Description */}
                              <div>
                                <label
                                  className={`block text-xs font-semibold uppercase tracking-wider mb-1 ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}
                                >
                                  Short Description
                                </label>
                                {editMode ? (
                                  <>
                                    <textarea
                                      name="short_description"
                                      value={formData.short_description || ""}
                                      onChange={(e) => {
                                        setFormData((prev) => ({
                                          ...prev,
                                          short_description: e.target.value,
                                        }));
                                        validateField(
                                          "short_description",
                                          e.target.value,
                                        );
                                      }}
                                      rows="2"
                                      className={`w-full px-4 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                        isDarkMode
                                          ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                                          : "bg-white border-gray-300 text-gray-900"
                                      }`}
                                      placeholder="Brief description (max 200 chars)"
                                      maxLength="200"
                                    />
                                    <div className="flex justify-between mt-1">
                                      <p
                                        className={`text-xs ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}
                                      >
                                        A short tagline for your business
                                        (appears in search results)
                                      </p>
                                      <span
                                        className={`text-xs ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}
                                      >
                                        {formData.short_description?.length ||
                                          0}
                                        /200
                                      </span>
                                    </div>
                                    {touchedFields.short_description &&
                                      fieldErrors.short_description && (
                                        <p className="text-xs text-red-500 mt-1">
                                          {fieldErrors.short_description}
                                        </p>
                                      )}
                                  </>
                                ) : (
                                  <p
                                    className={`w-full px-4 py-3 border rounded-xl text-sm whitespace-pre-wrap ${isDarkMode ? "bg-gray-700 border-gray-600 text-gray-300" : "bg-gray-50 border-gray-200 text-gray-800"}`}
                                  >
                                    {business?.short_description || "—"}
                                  </p>
                                )}
                              </div>

                              {/* Full Description */}
                              <div>
                                <label
                                  className={`block text-xs font-semibold uppercase tracking-wider mb-1 ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}
                                >
                                  Full Description
                                </label>
                                {editMode ? (
                                  <>
                                    <textarea
                                      name="description"
                                      value={formData.description || ""}
                                      onChange={(e) => {
                                        setFormData((prev) => ({
                                          ...prev,
                                          description: e.target.value,
                                        }));
                                        validateField(
                                          "description",
                                          e.target.value,
                                        );
                                      }}
                                      rows="6"
                                      className={`w-full px-4 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                        isDarkMode
                                          ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                                          : "bg-white border-gray-300 text-gray-900"
                                      }`}
                                      placeholder="Detailed description of your business, services, history, and what makes you special..."
                                    />
                                    <div className="flex justify-between mt-1">
                                      <p
                                        className={`text-xs ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}
                                      >
                                        Detailed description (max 5000
                                        characters)
                                      </p>
                                      <span
                                        className={`text-xs ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}
                                      >
                                        {formData.description?.length || 0}/5000
                                      </span>
                                    </div>
                                    {touchedFields.description &&
                                      fieldErrors.description && (
                                        <p className="text-xs text-red-500 mt-1">
                                          {fieldErrors.description}
                                        </p>
                                      )}
                                  </>
                                ) : (
                                  <div
                                    className={`w-full px-4 py-3 border rounded-xl text-sm whitespace-pre-wrap max-h-48 overflow-y-auto ${isDarkMode ? "bg-gray-700 border-gray-600 text-gray-300" : "bg-gray-50 border-gray-200 text-gray-800"}`}
                                  >
                                    {business?.description || "—"}
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Right Column */}
                            <div className="space-y-5">
                              <h3
                                className={`text-lg font-semibold flex items-center gap-2 ${isDarkMode ? "text-white" : "text-gray-800"}`}
                              >
                                <MapPin className="w-5 h-5 text-blue-500" />
                                Location & Pricing
                              </h3>

                              <div>
                                <label
                                  className={`block text-xs font-semibold uppercase tracking-wider mb-1 ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}
                                >
                                  Location *
                                </label>
                                {editMode ? (
                                  <select
                                    value={formData.location || "Downtown"}
                                    onChange={(e) => {
                                      setFormData((prev) => ({
                                        ...prev,
                                        location: e.target.value,
                                      }));
                                      validateField("location", e.target.value);
                                    }}
                                    className={`w-full px-4 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                      isDarkMode
                                        ? "bg-gray-700 border-gray-600 text-white"
                                        : "bg-white border-gray-300 text-gray-900"
                                    }`}
                                  >
                                    <option value="">Select a location</option>
                                    {locationOptions.map((loc) => (
                                      <option key={loc.value} value={loc.value}>
                                        {loc.popular ? "⭐ " : ""}
                                        {loc.label}
                                      </option>
                                    ))}
                                  </select>
                                ) : (
                                  <p
                                    className={`w-full px-4 py-3 border rounded-xl text-sm ${isDarkMode ? "bg-gray-700 border-gray-600 text-gray-300" : "bg-gray-50 border-gray-200 text-gray-800"}`}
                                  >
                                    {business?.location || "—"}
                                  </p>
                                )}
                              </div>

                              <div>
                                <label
                                  className={`block text-xs font-semibold uppercase tracking-wider mb-1 ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}
                                >
                                  Address *
                                </label>
                                {editMode ? (
                                  <input
                                    type="text"
                                    name="address"
                                    value={formData.address || ""}
                                    onChange={(e) => {
                                      setFormData((prev) => ({
                                        ...prev,
                                        address: e.target.value,
                                      }));
                                      validateField("address", e.target.value);
                                    }}
                                    className={`w-full px-4 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                      isDarkMode
                                        ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                                        : "bg-white border-gray-300 text-gray-900"
                                    }`}
                                    placeholder="Street address"
                                  />
                                ) : (
                                  <p
                                    className={`w-full px-4 py-3 border rounded-xl text-sm ${isDarkMode ? "bg-gray-700 border-gray-600 text-gray-300" : "bg-gray-50 border-gray-200 text-gray-800"}`}
                                  >
                                    {business?.address || "—"}
                                  </p>
                                )}
                              </div>

                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <label
                                    className={`block text-xs font-semibold uppercase tracking-wider mb-1 ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}
                                  >
                                    Price *
                                  </label>
                                  {editMode ? (
                                    <div className="relative">
                                      <span
                                        className={`absolute left-3 top-1/2 -translate-y-1/2 ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}
                                      >
                                        ₱
                                      </span>
                                      <input
                                        type="number"
                                        name="price"
                                        value={formData.price || 0}
                                        onChange={(e) => {
                                          setFormData((prev) => ({
                                            ...prev,
                                            price:
                                              parseFloat(e.target.value) || 0,
                                          }));
                                          validateField(
                                            "price",
                                            parseFloat(e.target.value),
                                          );
                                        }}
                                        className={`w-full pl-8 pr-3 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                          isDarkMode
                                            ? "bg-gray-700 border-gray-600 text-white"
                                            : "bg-white border-gray-300 text-gray-900"
                                        }`}
                                        min="0"
                                        step="0.01"
                                      />
                                    </div>
                                  ) : (
                                    <p
                                      className={`w-full px-4 py-3 border rounded-xl text-sm ${isDarkMode ? "bg-gray-700 border-gray-600 text-gray-300" : "bg-gray-50 border-gray-200 text-gray-800"}`}
                                    >
                                      ₱{business?.price?.toFixed(2) || "0.00"}
                                    </p>
                                  )}
                                </div>
                                <div>
                                  <label
                                    className={`block text-xs font-semibold uppercase tracking-wider mb-1 ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}
                                  >
                                    Price Unit
                                  </label>
                                  {editMode ? (
                                    <select
                                      value={formData.price_unit || "month"}
                                      onChange={(e) =>
                                        setFormData((prev) => ({
                                          ...prev,
                                          price_unit: e.target.value,
                                        }))
                                      }
                                      className={`w-full px-4 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                        isDarkMode
                                          ? "bg-gray-700 border-gray-600 text-white"
                                          : "bg-white border-gray-300 text-gray-900"
                                      }`}
                                    >
                                      <option value="month">per month</option>
                                      <option value="year">per year</option>
                                      <option value="week">per week</option>
                                      <option value="day">per day</option>
                                      <option value="session">
                                        per session
                                      </option>
                                    </select>
                                  ) : (
                                    <p
                                      className={`w-full px-4 py-3 border rounded-xl text-sm ${isDarkMode ? "bg-gray-700 border-gray-600 text-gray-300" : "bg-gray-50 border-gray-200 text-gray-800"}`}
                                    >
                                      per {business?.price_unit || "month"}
                                    </p>
                                  )}
                                </div>
                              </div>

                              <div>
                                <label
                                  className={`block text-xs font-semibold uppercase tracking-wider mb-1 ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}
                                >
                                  Status
                                </label>
                                {editMode ? (
                                  <div className="flex gap-3">
                                    {["active", "pending", "inactive"].map(
                                      (status) => (
                                        <label
                                          key={status}
                                          className="flex items-center gap-2 cursor-pointer"
                                        >
                                          <input
                                            type="radio"
                                            name="status"
                                            value={status}
                                            checked={formData.status === status}
                                            onChange={(e) =>
                                              setFormData((prev) => ({
                                                ...prev,
                                                status: e.target.value,
                                              }))
                                            }
                                            className="w-4 h-4 text-blue-600"
                                          />
                                          <span
                                            className={`text-sm capitalize ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}
                                          >
                                            {status}
                                          </span>
                                        </label>
                                      ),
                                    )}
                                  </div>
                                ) : (
                                  <p
                                    className={`w-full px-4 py-3 border rounded-xl text-sm ${isDarkMode ? "bg-gray-700 border-gray-600 text-gray-300" : "bg-gray-50 border-gray-200 text-gray-800"}`}
                                  >
                                    <span
                                      className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                        business?.status === "active"
                                          ? "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300"
                                          : business?.status === "pending"
                                            ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300"
                                            : "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300"
                                      }`}
                                    >
                                      {business?.status || "active"}
                                    </span>
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Contact Tab */}
                      {activeTab === "contact" && (
                        <div className="space-y-6">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                              <label
                                className={`block text-xs font-semibold uppercase tracking-wider mb-1 ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}
                              >
                                Contact Phone
                              </label>
                              {editMode ? (
                                <input
                                  type="tel"
                                  name="contact_phone"
                                  value={formData.contact_phone || ""}
                                  onChange={(e) => {
                                    const numericValue = e.target.value.replace(
                                      /\D/g,
                                      "",
                                    );
                                    setFormData((prev) => ({
                                      ...prev,
                                      contact_phone: numericValue,
                                    }));
                                    validateField(
                                      "contact_phone",
                                      numericValue,
                                    );
                                  }}
                                  className={`w-full px-4 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                    isDarkMode
                                      ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                                      : "bg-white border-gray-300 text-gray-900"
                                  }`}
                                  placeholder="09171234567"
                                  maxLength={11}
                                />
                              ) : (
                                <p
                                  className={`w-full px-4 py-3 border rounded-xl text-sm ${isDarkMode ? "bg-gray-700 border-gray-600 text-gray-300" : "bg-gray-50 border-gray-200 text-gray-800"}`}
                                >
                                  {business?.contact_phone || "—"}
                                </p>
                              )}
                            </div>

                            <div>
                              <label
                                className={`block text-xs font-semibold uppercase tracking-wider mb-1 ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}
                              >
                                Contact Email
                              </label>
                              {editMode ? (
                                <input
                                  type="email"
                                  name="contact_email"
                                  value={formData.contact_email || ""}
                                  onChange={(e) => {
                                    setFormData((prev) => ({
                                      ...prev,
                                      contact_email: e.target.value,
                                    }));
                                    validateField(
                                      "contact_email",
                                      e.target.value,
                                    );
                                  }}
                                  className={`w-full px-4 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                    isDarkMode
                                      ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                                      : "bg-white border-gray-300 text-gray-900"
                                  }`}
                                  placeholder="business@example.com"
                                />
                              ) : (
                                <p
                                  className={`w-full px-4 py-3 border rounded-xl text-sm ${isDarkMode ? "bg-gray-700 border-gray-600 text-gray-300" : "bg-gray-50 border-gray-200 text-gray-800"}`}
                                >
                                  {business?.contact_email || "—"}
                                </p>
                              )}
                            </div>

                            <div>
                              <label
                                className={`block text-xs font-semibold uppercase tracking-wider mb-1 ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}
                              >
                                Website
                              </label>
                              {editMode ? (
                                <input
                                  type="url"
                                  name="website"
                                  value={formData.website || ""}
                                  onChange={(e) =>
                                    setFormData((prev) => ({
                                      ...prev,
                                      website: e.target.value,
                                    }))
                                  }
                                  className={`w-full px-4 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                    isDarkMode
                                      ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                                      : "bg-white border-gray-300 text-gray-900"
                                  }`}
                                  placeholder="https://example.com"
                                />
                              ) : (
                                <p
                                  className={`w-full px-4 py-3 border rounded-xl text-sm ${isDarkMode ? "bg-gray-700 border-gray-600 text-gray-300" : "bg-gray-50 border-gray-200 text-gray-800"}`}
                                >
                                  {business?.website ? (
                                    <a
                                      href={business.website}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-blue-600 dark:text-blue-400 hover:underline"
                                    >
                                      {business.website}
                                    </a>
                                  ) : (
                                    "—"
                                  )}
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Business Hours */}
                          <div>
                            <label
                              className={`block text-xs font-semibold uppercase tracking-wider mb-4 ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}
                            >
                              Business Hours
                            </label>

                            {editMode ? (
                              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
                                {daysOfWeek.map((day) => {
                                  const dayHours = businessHours[day.id];
                                  const openTime = dayHours?.open
                                    ? convertTo12Hour(dayHours.open)
                                    : { time: "09:00", ampm: "AM" };
                                  const closeTime = dayHours?.close
                                    ? convertTo12Hour(dayHours.close)
                                    : { time: "18:00", ampm: "PM" };

                                  return (
                                    <div
                                      key={day.id}
                                      className={`border rounded-xl p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${isDarkMode ? "border-gray-600" : "border-gray-200"}`}
                                    >
                                      <div className="flex items-center justify-between mb-3">
                                        <span
                                          className={`font-semibold w-24 ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}
                                        >
                                          {day.label}
                                        </span>
                                        <label className="flex items-center gap-2 cursor-pointer">
                                          <input
                                            type="checkbox"
                                            checked={dayHours?.closed || false}
                                            onChange={(e) =>
                                              handleBusinessHourChange(
                                                day.id,
                                                "closed",
                                                e.target.checked,
                                              )
                                            }
                                            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                          />
                                          <span
                                            className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}
                                          >
                                            Closed
                                          </span>
                                        </label>
                                      </div>

                                      {!dayHours?.closed && (
                                        <div className="space-y-3 pl-24">
                                          <div className="flex items-center gap-3 flex-wrap">
                                            <span
                                              className={`text-sm w-12 ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}
                                            >
                                              Open:
                                            </span>
                                            <input
                                              type="text"
                                              value={openTime.time}
                                              onChange={(e) =>
                                                handleTimeChange(
                                                  day.id,
                                                  "openTime",
                                                  e.target.value,
                                                )
                                              }
                                              className={`w-20 px-2 py-1 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 ${isDarkMode ? "bg-gray-700 border-gray-600 text-white" : "bg-white border-gray-300"}`}
                                            />
                                            <select
                                              value={
                                                dayHours?.openAMPM ||
                                                openTime.ampm
                                              }
                                              onChange={(e) =>
                                                handleBusinessHourChange(
                                                  day.id,
                                                  "openAMPM",
                                                  e.target.value,
                                                )
                                              }
                                              className={`px-2 py-1 border rounded-lg text-sm ${isDarkMode ? "bg-gray-700 border-gray-600 text-white" : "bg-white border-gray-300"}`}
                                            >
                                              <option>AM</option>
                                              <option>PM</option>
                                            </select>
                                            <span
                                              className={`${isDarkMode ? "text-gray-500" : "text-gray-400"}`}
                                            >
                                              to
                                            </span>
                                            <input
                                              type="text"
                                              value={closeTime.time}
                                              onChange={(e) =>
                                                handleTimeChange(
                                                  day.id,
                                                  "closeTime",
                                                  e.target.value,
                                                )
                                              }
                                              className={`w-20 px-2 py-1 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 ${isDarkMode ? "bg-gray-700 border-gray-600 text-white" : "bg-white border-gray-300"}`}
                                            />
                                            <select
                                              value={
                                                dayHours?.closeAMPM ||
                                                closeTime.ampm
                                              }
                                              onChange={(e) =>
                                                handleBusinessHourChange(
                                                  day.id,
                                                  "closeAMPM",
                                                  e.target.value,
                                                )
                                              }
                                              className={`px-2 py-1 border rounded-lg text-sm ${isDarkMode ? "bg-gray-700 border-gray-600 text-white" : "bg-white border-gray-300"}`}
                                            >
                                              <option>AM</option>
                                              <option>PM</option>
                                            </select>
                                          </div>

                                          {/* Break Times */}
                                          {(dayHours?.breaks || []).map(
                                            (breakTime, idx) => (
                                              <div
                                                key={idx}
                                                className="flex items-center gap-3 pl-12 flex-wrap"
                                              >
                                                <span
                                                  className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}
                                                >
                                                  Break {idx + 1}:
                                                </span>
                                                <input
                                                  type="text"
                                                  value={breakTime.start}
                                                  onChange={(e) => {
                                                    const newBreaks = [
                                                      ...(dayHours.breaks ||
                                                        []),
                                                    ];
                                                    newBreaks[idx].start =
                                                      e.target.value;
                                                    handleBusinessHourChange(
                                                      day.id,
                                                      "breaks",
                                                      newBreaks,
                                                    );
                                                  }}
                                                  className={`w-20 px-2 py-1 border rounded-lg text-sm ${isDarkMode ? "bg-gray-700 border-gray-600 text-white" : "bg-white border-gray-300"}`}
                                                />
                                                <select
                                                  value={
                                                    breakTime.startAMPM || "PM"
                                                  }
                                                  onChange={(e) => {
                                                    const newBreaks = [
                                                      ...(dayHours.breaks ||
                                                        []),
                                                    ];
                                                    newBreaks[idx].startAMPM =
                                                      e.target.value;
                                                    handleBusinessHourChange(
                                                      day.id,
                                                      "breaks",
                                                      newBreaks,
                                                    );
                                                  }}
                                                  className={`px-2 py-1 border rounded-lg text-sm ${isDarkMode ? "bg-gray-700 border-gray-600 text-white" : "bg-white border-gray-300"}`}
                                                >
                                                  <option>AM</option>
                                                  <option>PM</option>
                                                </select>
                                                <span>to</span>
                                                <input
                                                  type="text"
                                                  value={breakTime.end}
                                                  onChange={(e) => {
                                                    const newBreaks = [
                                                      ...(dayHours.breaks ||
                                                        []),
                                                    ];
                                                    newBreaks[idx].end =
                                                      e.target.value;
                                                    handleBusinessHourChange(
                                                      day.id,
                                                      "breaks",
                                                      newBreaks,
                                                    );
                                                  }}
                                                  className={`w-20 px-2 py-1 border rounded-lg text-sm ${isDarkMode ? "bg-gray-700 border-gray-600 text-white" : "bg-white border-gray-300"}`}
                                                />
                                                <select
                                                  value={
                                                    breakTime.endAMPM || "PM"
                                                  }
                                                  onChange={(e) => {
                                                    const newBreaks = [
                                                      ...(dayHours.breaks ||
                                                        []),
                                                    ];
                                                    newBreaks[idx].endAMPM =
                                                      e.target.value;
                                                    handleBusinessHourChange(
                                                      day.id,
                                                      "breaks",
                                                      newBreaks,
                                                    );
                                                  }}
                                                  className={`px-2 py-1 border rounded-lg text-sm ${isDarkMode ? "bg-gray-700 border-gray-600 text-white" : "bg-white border-gray-300"}`}
                                                >
                                                  <option>AM</option>
                                                  <option>PM</option>
                                                </select>
                                                <button
                                                  onClick={() =>
                                                    removeBreakTime(day.id, idx)
                                                  }
                                                  className="text-red-500 hover:text-red-600"
                                                >
                                                  <Trash2 className="w-4 h-4" />
                                                </button>
                                              </div>
                                            ),
                                          )}

                                          <button
                                            onClick={() => addBreakTime(day.id)}
                                            className={`text-sm flex items-center gap-1 pl-12 ${isDarkMode ? "text-blue-400 hover:text-blue-300" : "text-blue-600 hover:text-blue-700"}`}
                                          >
                                            <Plus className="w-4 h-4" />
                                            Add Break Time
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <div className="space-y-2 max-h-[500px] overflow-y-auto">
                                {business?.business_hours ? (
                                  Object.entries(business.business_hours).map(
                                    ([day, hours]) => {
                                      const openTime = hours.open
                                        ? convertTo12Hour(hours.open)
                                        : null;
                                      const closeTime = hours.close
                                        ? convertTo12Hour(hours.close)
                                        : null;
                                      return (
                                        <div
                                          key={day}
                                          className={`flex items-center py-2 border-b ${isDarkMode ? "border-gray-700" : "border-gray-100"}`}
                                        >
                                          <span
                                            className={`w-24 font-medium capitalize ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}
                                          >
                                            {day}:
                                          </span>
                                          <span
                                            className={
                                              isDarkMode
                                                ? "text-gray-300"
                                                : "text-gray-800"
                                            }
                                          >
                                            {hours.closed ? (
                                              <span className="text-gray-400">
                                                Closed
                                              </span>
                                            ) : (
                                              `${openTime?.time || "09:00"} ${openTime?.ampm || "AM"} - ${closeTime?.time || "06:00"} ${closeTime?.ampm || "PM"}`
                                            )}
                                          </span>
                                          {hours.breaks?.length > 0 && (
                                            <span
                                              className={`ml-2 text-xs ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}
                                            >
                                              ({hours.breaks.length} break
                                              {hours.breaks.length > 1
                                                ? "s"
                                                : ""}
                                              )
                                            </span>
                                          )}
                                        </div>
                                      );
                                    },
                                  )
                                ) : (
                                  <p
                                    className={`${isDarkMode ? "text-gray-500" : "text-gray-500"}`}
                                  >
                                    No business hours set
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Payment Tab */}
                      {activeTab === "payment" && (
                        <div className="space-y-6">
                          <div>
                            <label
                              className={`block text-xs font-semibold uppercase tracking-wider mb-1 ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}
                            >
                              GCash Mobile Number
                            </label>
                            {editMode ? (
                              <>
                                <input
                                  type="tel"
                                  value={gcashNumber}
                                  onChange={(e) => {
                                    const numericValue = e.target.value.replace(
                                      /\D/g,
                                      "",
                                    );
                                    setGcashNumber(numericValue);
                                    setFormData((prev) => ({
                                      ...prev,
                                      gcash_number: numericValue,
                                    }));
                                    validateField("gcash_number", numericValue);
                                  }}
                                  className={`w-full px-4 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                    isDarkMode
                                      ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                                      : "bg-white border-gray-300 text-gray-900"
                                  }`}
                                  placeholder="09171234567"
                                  maxLength={11}
                                />
                                {fieldErrors.gcash_number && (
                                  <p className="text-xs text-red-500 mt-1">
                                    {fieldErrors.gcash_number}
                                  </p>
                                )}
                              </>
                            ) : (
                              <p
                                className={`w-full px-4 py-3 border rounded-xl text-sm ${isDarkMode ? "bg-gray-700 border-gray-600 text-gray-300" : "bg-gray-50 border-gray-200 text-gray-800"}`}
                              >
                                {business?.gcash_number || "—"}
                              </p>
                            )}
                          </div>

                          <div>
                            <label
                              className={`block text-xs font-semibold uppercase tracking-wider mb-1 ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}
                            >
                              GCash QR Code
                            </label>
                            {editMode ? (
                              <div className="space-y-3">
                                {gcashQrUrl ? (
                                  <div className="text-center">
                                    <img
                                      src={gcashQrUrl}
                                      alt="GCash QR Code"
                                      className="w-48 h-48 mx-auto object-cover rounded-xl border-2 border-gray-200 dark:border-gray-600 shadow-md"
                                    />
                                    <button
                                      onClick={async () => {
                                        if (
                                          window.confirm(
                                            "Remove GCash QR code?",
                                          )
                                        ) {
                                          if (gcashQrCode) {
                                            await supabase.storage
                                              .from("gcash-qr-codes")
                                              .remove([gcashQrCode]);
                                          }
                                          setGcashQrCode(null);
                                          setGcashQrUrl("");
                                          setFormData((prev) => ({
                                            ...prev,
                                            gcash_qr_code: null,
                                          }));
                                          toast.success("QR code removed");
                                        }
                                      }}
                                      className="mt-3 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 text-sm flex items-center gap-1 mx-auto"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                      Remove QR Code
                                    </button>
                                  </div>
                                ) : (
                                  <label
                                    className={`flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-xl cursor-pointer hover:border-blue-500 transition-colors ${isDarkMode ? "border-gray-600 hover:bg-gray-700" : "border-gray-300 hover:bg-gray-50"}`}
                                  >
                                    <QrCode
                                      className={`w-12 h-12 mb-3 ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}
                                    />
                                    <span
                                      className={`text-sm mb-1 ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}
                                    >
                                      Click to upload QR code
                                    </span>
                                    <span
                                      className={`text-xs ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}
                                    >
                                      PNG, JPG up to 2MB
                                    </span>
                                    <input
                                      type="file"
                                      accept="image/*"
                                      onChange={handleGcashQrUpload}
                                      className="hidden"
                                      disabled={uploadingQr}
                                    />
                                  </label>
                                )}
                              </div>
                            ) : (
                              <div>
                                {gcashQrUrl ? (
                                  <img
                                    src={gcashQrUrl}
                                    alt="GCash QR Code"
                                    className="w-48 h-48 object-cover rounded-xl border border-gray-200 dark:border-gray-600"
                                  />
                                ) : (
                                  <p
                                    className={`${isDarkMode ? "text-gray-500" : "text-gray-500"}`}
                                  >
                                    No QR code uploaded
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Permit Tab */}
                      {activeTab === "permit" && (
                        <div className="space-y-6">
                          <div
                            className={`rounded-xl p-6 ${isDarkMode ? "bg-gray-700/50" : "bg-blue-50"}`}
                          >
                            <div className="flex items-center gap-3 mb-4">
                              <FileText
                                className={`w-8 h-8 ${isDarkMode ? "text-blue-400" : "text-blue-600"}`}
                              />
                              <div>
                                <h3
                                  className={`font-semibold ${isDarkMode ? "text-white" : "text-gray-800"}`}
                                >
                                  Business Permit Verification
                                </h3>
                                <p
                                  className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}
                                >
                                  Upload your business permit for verification
                                </p>
                              </div>
                            </div>

                            {business?.permit_document && (
                              <div
                                className={`rounded-lg p-4 mb-4 ${isDarkMode ? "bg-gray-800" : "bg-gray-50"}`}
                              >
                                <h4
                                  className={`font-medium mb-2 ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}
                                >
                                  Current Permit
                                </h4>
                                <p
                                  className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}
                                >
                                  Permit #: {business.permit_number || "N/A"}
                                </p>
                                <p
                                  className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}
                                >
                                  Expires:{" "}
                                  {business.permit_expiry
                                    ? new Date(
                                        business.permit_expiry,
                                      ).toLocaleDateString()
                                    : "N/A"}
                                </p>
                                <p className="text-sm mt-2">
                                  Status:
                                  <span
                                    className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
                                      business.permit_verified
                                        ? "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300"
                                        : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300"
                                    }`}
                                  >
                                    {business.permit_verified
                                      ? "Verified"
                                      : "Pending"}
                                  </span>
                                </p>
                                <div className="flex gap-2 mt-3">
                                  <a
                                    href={
                                      supabase.storage
                                        .from("business-permits")
                                        .getPublicUrl(business.permit_document)
                                        .data.publicUrl
                                    }
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                                  >
                                    View Permit
                                  </a>
                                  {editMode && (
                                    <button
                                      onClick={removePermit}
                                      className="px-3 py-1 border border-red-500 text-red-600 dark:text-red-400 rounded text-sm hover:bg-red-50 dark:hover:bg-red-900/20"
                                    >
                                      Remove
                                    </button>
                                  )}
                                </div>
                              </div>
                            )}

                            {editMode &&
                              (!business?.permit_document ||
                                business?.verification_status ===
                                  "rejected") && (
                                <div className="space-y-4">
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                      <label
                                        className={`block text-sm font-medium mb-1 ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}
                                      >
                                        Permit Number *
                                      </label>
                                      <input
                                        type="text"
                                        value={permitNumber}
                                        onChange={(e) =>
                                          setPermitNumber(e.target.value)
                                        }
                                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                                          isDarkMode
                                            ? "bg-gray-700 border-gray-600 text-white"
                                            : "bg-white border-gray-300"
                                        }`}
                                        placeholder="Enter permit number"
                                      />
                                    </div>
                                    <div>
                                      <label
                                        className={`block text-sm font-medium mb-1 ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}
                                      >
                                        Expiry Date *
                                      </label>
                                      <input
                                        type="date"
                                        value={permitExpiry}
                                        onChange={(e) =>
                                          setPermitExpiry(e.target.value)
                                        }
                                        min={
                                          new Date().toISOString().split("T")[0]
                                        }
                                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                                          isDarkMode
                                            ? "bg-gray-700 border-gray-600 text-white"
                                            : "bg-white border-gray-300"
                                        }`}
                                      />
                                    </div>
                                  </div>

                                  <div>
                                    <label
                                      className={`block text-sm font-medium mb-1 ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}
                                    >
                                      Permit Document *
                                    </label>
                                    <input
                                      type="file"
                                      accept=".jpg,.jpeg,.png,.pdf"
                                      onChange={handlePermitFileChange}
                                      className={`w-full px-3 py-2 border rounded-lg ${
                                        isDarkMode
                                          ? "bg-gray-700 border-gray-600 text-white"
                                          : "bg-white border-gray-300"
                                      }`}
                                    />
                                    {permitPreview && (
                                      <img
                                        src={permitPreview}
                                        alt="Preview"
                                        className="mt-2 h-32 object-cover rounded"
                                      />
                                    )}
                                  </div>

                                  <button
                                    onClick={handlePermitUpload}
                                    disabled={
                                      !permitFile ||
                                      !permitNumber ||
                                      !permitExpiry ||
                                      uploadingPermit
                                    }
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                                  >
                                    {uploadingPermit
                                      ? "Uploading..."
                                      : "Upload Permit"}
                                  </button>

                                  <p
                                    className={`text-xs mt-2 ${isDarkMode ? "text-gray-500" : "text-gray-500"}`}
                                  >
                                    ℹ️ After uploading, your permit will be
                                    reviewed by an admin. This usually takes 1-2
                                    business days.
                                  </p>
                                </div>
                              )}
                          </div>
                        </div>
                      )}

                      {/* Preview Tab */}
                      {activeTab === "preview" && (
                        <Suspense
                          fallback={
                            <div className="flex items-center justify-center py-12">
                              <Loader className="w-8 h-8 animate-spin text-blue-500" />
                            </div>
                          }
                        >
                          <BusinessPreview
                            business={business}
                            formData={formData}
                            businessHours={businessHours}
                            gcashQrUrl={gcashQrUrl}
                            gcashNumber={gcashNumber}
                            profile={profile}
                          />
                        </Suspense>
                      )}

                      {/* Plans Tab */}
                      {activeTab === "plans" && (
                        <Suspense
                          fallback={
                            <div className="flex items-center justify-center py-12">
                              <Loader className="w-8 h-8 animate-spin text-blue-500" />
                            </div>
                          }
                        >
                          <MembershipPlansManager businessId={business?.id} />
                        </Suspense>
                      )}

                      {/* Reviews Tab */}
                      {activeTab === "reviews" && (
                        <Suspense
                          fallback={
                            <div className="flex items-center justify-center py-12">
                              <Loader className="w-8 h-8 animate-spin text-blue-500" />
                            </div>
                          }
                        >
                          <ReviewsManager businessId={business?.id} />
                        </Suspense>
                      )}
                    </motion.div>
                  </AnimatePresence>
                </div>

                {editMode && (
                  <div
                    className={`border-t p-6 flex justify-end gap-3 ${isDarkMode ? "bg-gray-700/50 border-gray-600" : "bg-gray-50/50 border-gray-200"}`}
                  >
                    <button
                      onClick={handleCancelEdit}
                      className={`px-6 py-2.5 border rounded-lg font-medium transition-colors flex items-center gap-2 ${
                        isDarkMode
                          ? "border-gray-600 text-gray-300 hover:bg-gray-700"
                          : "border-gray-300 text-gray-700 hover:bg-gray-100"
                      }`}
                    >
                      <X className="w-4 h-4" />
                      Cancel
                    </button>
                    <button
                      onClick={saveBusiness}
                      disabled={saving}
                      className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-medium hover:shadow-lg transition-all flex items-center gap-2 disabled:opacity-50"
                    >
                      {saving ? (
                        <>
                          <Loader className="w-4 h-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4" />
                          {business?.id ? "Update Business" : "Create Business"}
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {/* Unsaved Changes Modal */}
      <AnimatePresence>
        {showUnsavedChangesModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowUnsavedChangesModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className={`rounded-2xl max-w-md w-full p-6 ${isDarkMode ? "bg-gray-800" : "bg-white"}`}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900/50 rounded-full flex items-center justify-center">
                  <AlertCircle className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
                </div>
                <h3
                  className={`text-xl font-semibold ${isDarkMode ? "text-white" : "text-gray-800"}`}
                >
                  Unsaved Changes
                </h3>
              </div>
              <p
                className={`mb-6 ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}
              >
                You have unsaved changes. Are you sure you want to leave? Your
                changes will be lost.
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShowUnsavedChangesModal(false)}
                  className={`px-4 py-2 border rounded-lg ${isDarkMode ? "border-gray-600 text-gray-300 hover:bg-gray-700" : "border-gray-300 text-gray-700 hover:bg-gray-50"}`}
                >
                  Continue Editing
                </button>
                <button
                  onClick={() => {
                    setShowUnsavedChangesModal(false);
                    cancelEdit();
                  }}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  Discard Changes
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MyBusinessPage;
