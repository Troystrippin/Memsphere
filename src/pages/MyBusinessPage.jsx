import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import OwnerNavbar from "../components/owner/OwnerNavbar";
import "../styles/MyBusinessPage.css";

const MyBusinessPage = () => {
  const navigate = useNavigate();
  const [business, setBusiness] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState("");
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({});
  const [activeTab, setActiveTab] = useState("basic");
  const [profile, setProfile] = useState(null);
  const [avatarUrl, setAvatarUrl] = useState(null);
  
  // Validation states
  const [touchedFields, setTouchedFields] = useState({});
  const [focusedField, setFocusedField] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});

  // GCash QR Code state
  const [gcashQrCode, setGcashQrCode] = useState(null);
  const [gcashQrUrl, setGcashQrUrl] = useState("");
  const [uploadingQr, setUploadingQr] = useState(false);
  const [gcashNumber, setGcashNumber] = useState("");

  // Business Permit state
  const [permitFile, setPermitFile] = useState(null);
  const [permitPreview, setPermitPreview] = useState(null);
  const [uploadingPermit, setUploadingPermit] = useState(false);
  const [permitNumber, setPermitNumber] = useState("");
  const [permitExpiry, setPermitExpiry] = useState("");
  const [showVerificationBanner, setShowVerificationBanner] = useState(true);

  // Membership plans state
  const [membershipPlans, setMembershipPlans] = useState([]);
  const [editingPlan, setEditingPlan] = useState(null);
  const [showPlanForm, setShowPlanForm] = useState(false);
  const [planFormData, setPlanFormData] = useState({
    name: "",
    price: 0,
    duration: "month",
    features: [""],
    is_active: true,
  });

  // Business hours state
  const [businessHours, setBusinessHours] = useState({
    monday: { open: "09:00", close: "18:00", closed: false },
    tuesday: { open: "09:00", close: "18:00", closed: false },
    wednesday: { open: "09:00", close: "18:00", closed: false },
    thursday: { open: "09:00", close: "18:00", closed: false },
    friday: { open: "09:00", close: "18:00", closed: false },
    saturday: { open: "10:00", close: "17:00", closed: false },
    sunday: { open: "10:00", close: "15:00", closed: true },
  });

  // Business categories from RegisterPage
  const businessCategories = [
    { id: "gym", label: "Gym / Fitness Center", icon: "🏋️" },
    { id: "cafe", label: "Cafe / Coffee Shop", icon: "☕" },
    { id: "bakery", label: "Bakery / Pastry Shop", icon: "🥐" },
  ];

  // Location options from Browse.jsx
  const locationOptions = [
    { value: "Downtown", label: "Downtown" },
    { value: "Arellano", label: "Arellano" },
    { value: "Pantal", label: "Pantal" },
    { value: "Perez", label: "Perez" },
    { value: "PNR", label: "PNR" },
    { value: "Bonuan", label: "Bonuan" },
    { value: "AB Fernandez", label: "AB Fernandez" },
  ];

  const daysOfWeek = [
    { id: "monday", label: "Monday" },
    { id: "tuesday", label: "Tuesday" },
    { id: "wednesday", label: "Wednesday" },
    { id: "thursday", label: "Thursday" },
    { id: "friday", label: "Friday" },
    { id: "saturday", label: "Saturday" },
    { id: "sunday", label: "Sunday" },
  ];

  useEffect(() => {
    fetchUserProfile();
    fetchBusiness();
  }, []);

  useEffect(() => {
    if (business?.id) {
      fetchMembershipPlans();
      // Parse business hours if they exist
      if (business.business_hours) {
        setBusinessHours(business.business_hours);
      }
      // Load GCash QR code if exists
      if (business.gcash_qr_code) {
        setGcashQrCode(business.gcash_qr_code);
        downloadGcashQrCode(business.gcash_qr_code);
      }
      if (business.gcash_number) {
        setGcashNumber(business.gcash_number);
      }
      // Set permit data if exists
      if (business.permit_number) {
        setPermitNumber(business.permit_number);
      }
      if (business.permit_expiry) {
        setPermitExpiry(business.permit_expiry);
      }
    }
  }, [business]);

  // Clean up preview URL
  useEffect(() => {
    return () => {
      if (permitPreview) {
        URL.revokeObjectURL(permitPreview);
      }
    };
  }, [permitPreview]);

  // Validate fields when formData changes
  useEffect(() => {
    if (editMode) {
      validateField('name');
      validateField('business_type');
      validateField('short_description');
      validateField('description');
      validateField('location');
      validateField('address');
      validateField('price');
      validateField('contact_phone');
      validateField('contact_email');
      validateField('website');
      validateField('gcash_number');
    }
  }, [formData, editMode]);

  const validateField = (fieldName) => {
    let errorMessage = '';

    switch (fieldName) {
      case 'name':
        if (!formData.name?.trim()) {
          errorMessage = 'Business name is required';
        }
        break;

      case 'business_type':
        if (!formData.business_type) {
          errorMessage = 'Please select a business category';
        }
        break;

      case 'short_description':
        if (formData.short_description?.length > 200) {
          errorMessage = 'Short description must be less than 200 characters';
        }
        break;

      case 'location':
        if (!formData.location) {
          errorMessage = 'Please select a location';
        }
        break;

      case 'address':
        if (!formData.address?.trim()) {
          errorMessage = 'Address is required';
        }
        break;

      case 'price':
        if (formData.price < 0) {
          errorMessage = 'Price cannot be negative';
        }
        break;

      case 'contact_phone':
        if (formData.contact_phone && !/^(\+63|0)[0-9]{10}$/.test(formData.contact_phone.replace(/\s/g, ''))) {
          errorMessage = 'Invalid phone number format';
        }
        break;

      case 'contact_email':
        if (formData.contact_email && !/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(formData.contact_email)) {
          errorMessage = 'Invalid email format';
        }
        break;

      case 'website':
        if (formData.website && !/^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/.test(formData.website)) {
          errorMessage = 'Invalid website URL';
        }
        break;

      case 'gcash_number':
        if (formData.gcash_number && !/^09\d{9}$/.test(formData.gcash_number.replace(/\s/g, ''))) {
          errorMessage = 'GCash number must be 11 digits starting with 09';
        }
        break;

      default:
        break;
    }

    setFieldErrors(prev => ({
      ...prev,
      [fieldName]: errorMessage
    }));

    return !errorMessage;
  };

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
          emoji: getEmojiForCategory(profile?.business_category) || "🏢",
          contact_phone: profile?.mobile || "",
          contact_email: profile?.email || "",
          website: "",
          status: "active",
          members_count: 0,
          rating: 0,
          gcash_number: "",
          gcash_qr_code: null,
        });
        setEditMode(true);
      }
    } catch (err) {
      console.error("Error fetching business:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchMembershipPlans = async () => {
    try {
      const { data, error } = await supabase
        .from("membership_plans")
        .select("*")
        .eq("business_id", business.id)
        .order("price", { ascending: true });

      if (error) throw error;

      setMembershipPlans(data || []);
    } catch (err) {
      console.error("Error fetching membership plans:", err);
    }
  };

  const getEmojiForCategory = (category) => {
    switch (category) {
      case "gym":
        return "🏋️";
      case "cafe":
        return "☕";
      case "bakery":
        return "🥐";
      default:
        return "🏢";
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    // Special handling for phone numbers
    if (name === 'contact_phone' || name === 'gcash_number') {
      const numericValue = value.replace(/\D/g, '');
      setFormData((prev) => ({
        ...prev,
        [name]: numericValue
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const handleNumberChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: parseFloat(value) || 0,
    }));
  };

  const handleJsonChange = (field, value) => {
    try {
      const parsed = JSON.parse(value);
      setFormData((prev) => ({
        ...prev,
        [field]: parsed,
      }));
    } catch (e) {
      console.error("Invalid JSON:", e);
    }
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

  const handleBlur = (fieldName) => {
    setFocusedField(null);
    setTouchedFields(prev => ({ ...prev, [fieldName]: true }));
    validateField(fieldName);
  };

  const handleGcashQrUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Check file type
    if (!file.type.startsWith("image/")) {
      setError("Please upload an image file");
      return;
    }

    // Check file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      setError("File size must be less than 2MB");
      return;
    }

    try {
      setUploadingQr(true);
      setError(null);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError) throw userError;

      // Create a unique file name
      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}/gcash-qr-${Date.now()}.${fileExt}`;

      // Upload file to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from("gcash-qr-codes")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("gcash-qr-codes")
        .getPublicUrl(fileName);

      setGcashQrCode(fileName);
      setGcashQrUrl(urlData.publicUrl);

      // Update formData with the QR code path
      setFormData((prev) => ({
        ...prev,
        gcash_qr_code: fileName,
      }));

      setSuccessMessage("GCash QR code uploaded successfully!");
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err) {
      console.error("Error uploading GCash QR code:", err);
      setError("Failed to upload QR code. Please try again.");
    } finally {
      setUploadingQr(false);
    }
  };

  const removeGcashQr = async () => {
    if (!gcashQrCode) return;

    if (!window.confirm("Are you sure you want to remove the GCash QR code?")) {
      return;
    }

    try {
      const { error } = await supabase.storage
        .from("gcash-qr-codes")
        .remove([gcashQrCode]);

      if (error) throw error;

      setGcashQrCode(null);
      setGcashQrUrl("");
      setFormData((prev) => ({
        ...prev,
        gcash_qr_code: null,
      }));

      setSuccessMessage("GCash QR code removed successfully!");
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err) {
      console.error("Error removing GCash QR code:", err);
      setError("Failed to remove QR code. Please try again.");
    }
  };

  // Permit Upload Functions
  const uploadPermit = async () => {
    if (!permitFile) {
      setError("Please select a permit file to upload");
      return;
    }

    if (!permitNumber.trim()) {
      setError("Please enter permit number");
      return;
    }

    if (!permitExpiry) {
      setError("Please select permit expiry date");
      return;
    }

    // Validate expiry date
    const expiryDate = new Date(permitExpiry);
    const today = new Date();
    if (expiryDate < today) {
      setError("Permit expiry date must be in the future");
      return;
    }

    try {
      setUploadingPermit(true);
      setError(null);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError) throw userError;

      // Create a unique file name
      const fileExt = permitFile.name.split(".").pop();
      const fileName = `${user.id}/permit_${Date.now()}.${fileExt}`;

      // Upload file to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from("business-permits")
        .upload(fileName, permitFile);

      if (uploadError) throw uploadError;

      // Update business with permit information
      const { error: updateError } = await supabase
        .from("businesses")
        .update({
          permit_document: fileName,
          permit_number: permitNumber,
          permit_expiry: permitExpiry,
          permit_verified: false,
          permit_uploaded_at: new Date().toISOString(),
          verification_status: "pending",
          updated_at: new Date().toISOString()
        })
        .eq("id", business.id);

      if (updateError) throw updateError;

      // Refresh business data
      await fetchBusiness();

      setSuccessMessage("Permit uploaded successfully! Waiting for admin verification.");
      setTimeout(() => setSuccessMessage(""), 3000);

      // Reset form
      setPermitFile(null);
      setPermitPreview(null);
      setPermitNumber("");
      setPermitExpiry("");

    } catch (err) {
      console.error("Error uploading permit:", err);
      setError("Failed to upload permit. Please try again.");
    } finally {
      setUploadingPermit(false);
    }
  };

  const handlePermitFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Check file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      setError("Please upload a JPG, PNG, or PDF file");
      return;
    }

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError("File size must be less than 5MB");
      return;
    }

    setPermitFile(file);
    
    // Create preview URL for images
    if (permitPreview) {
      URL.revokeObjectURL(permitPreview);
    }
    
    if (file.type.startsWith('image/')) {
      setPermitPreview(URL.createObjectURL(file));
    } else {
      setPermitPreview(null);
    }
    
    setError(null);
  };

  const removePermit = async () => {
    if (!business?.permit_document) return;

    if (!window.confirm("Are you sure you want to remove the permit document?")) {
      return;
    }

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
          verification_status: "pending"
        })
        .eq("id", business.id);

      await fetchBusiness();

      setSuccessMessage("Permit removed successfully!");
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err) {
      console.error("Error removing permit:", err);
      setError("Failed to remove permit. Please try again.");
    }
  };

  const validateForm = () => {
    const fieldsToValidate = ['name', 'business_type', 'location', 'address', 'price'];
    let isValid = true;

    fieldsToValidate.forEach(field => {
      if (!validateField(field)) {
        isValid = false;
      }
    });

    // Mark all fields as touched
    const touched = {};
    fieldsToValidate.forEach(field => { touched[field] = true; });
    setTouchedFields(touched);

    return isValid;
  };

  const saveBusiness = async () => {
    if (!validateForm()) {
      setError("Please fix the errors before saving");
      return;
    }

    try {
      setSaving(true);
      setError(null);
      setSuccessMessage("");

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;

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
      setSuccessMessage(
        business?.id
          ? "Business updated successfully!"
          : "Business created successfully!",
      );

      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err) {
      console.error("Error saving business:", err);
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // Membership Plan Handlers
  const handlePlanInputChange = (e) => {
    const { name, value } = e.target;
    setPlanFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleFeatureChange = (index, value) => {
    const updatedFeatures = [...planFormData.features];
    updatedFeatures[index] = value;
    setPlanFormData((prev) => ({
      ...prev,
      features: updatedFeatures,
    }));
  };

  const addFeature = () => {
    setPlanFormData((prev) => ({
      ...prev,
      features: [...prev.features, ""],
    }));
  };

  const removeFeature = (index) => {
    const updatedFeatures = planFormData.features.filter((_, i) => i !== index);
    setPlanFormData((prev) => ({
      ...prev,
      features: updatedFeatures,
    }));
  };

  const resetPlanForm = () => {
    setPlanFormData({
      name: "",
      price: 0,
      duration: "month",
      features: [""],
      is_active: true,
    });
    setEditingPlan(null);
    setShowPlanForm(false);
  };

  const saveMembershipPlan = async () => {
    try {
      setSaving(true);

      const filteredFeatures = planFormData.features.filter(
        (f) => f.trim() !== "",
      );

      const planData = {
        business_id: business.id,
        name: planFormData.name,
        price: planFormData.price,
        duration: planFormData.duration,
        features: filteredFeatures,
        is_active: planFormData.is_active,
      };

      let result;

      if (editingPlan) {
        result = await supabase
          .from("membership_plans")
          .update(planData)
          .eq("id", editingPlan.id)
          .select();
      } else {
        result = await supabase
          .from("membership_plans")
          .insert([planData])
          .select();
      }

      const { data, error } = result;

      if (error) throw error;

      await fetchMembershipPlans();
      resetPlanForm();
      setSuccessMessage(
        editingPlan
          ? "Plan updated successfully!"
          : "Plan created successfully!",
      );
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err) {
      console.error("Error saving membership plan:", err);
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const editPlan = (plan) => {
    setEditingPlan(plan);
    setPlanFormData({
      name: plan.name,
      price: plan.price,
      duration: plan.duration,
      features: plan.features.length > 0 ? plan.features : [""],
      is_active: plan.is_active,
    });
    setShowPlanForm(true);
  };

  const deletePlan = async (planId) => {
    if (
      !window.confirm("Are you sure you want to delete this membership plan?")
    ) {
      return;
    }

    try {
      const { error } = await supabase
        .from("membership_plans")
        .delete()
        .eq("id", planId);

      if (error) throw error;

      await fetchMembershipPlans();
      setSuccessMessage("Plan deleted successfully!");
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err) {
      console.error("Error deleting plan:", err);
      setError(err.message);
    }
  };

  const togglePlanStatus = async (plan) => {
    try {
      const { error } = await supabase
        .from("membership_plans")
        .update({ is_active: !plan.is_active })
        .eq("id", plan.id);

      if (error) throw error;

      await fetchMembershipPlans();
    } catch (err) {
      console.error("Error toggling plan status:", err);
      setError(err.message);
    }
  };

  const cancelEdit = () => {
    setFormData(business || {});
    setEditMode(false);
    setError(null);
    setTouchedFields({});
  };

  const getFirstName = () => {
    if (profile?.first_name) {
      return profile.first_name;
    }
    return "Owner";
  };

  const getInputClassName = (fieldName) => {
    let className = 'form-group';
    if (focusedField === fieldName) className += ' focused';
    
    if (touchedFields[fieldName] && fieldErrors[fieldName]) {
      className += ' error';
    } else if (touchedFields[fieldName] && formData[fieldName] && !fieldErrors[fieldName]) {
      className += ' valid';
    }
    
    return className;
  };

  if (loading) {
    return (
      <div className="business-page-loading">
        <div className="loading-spinner"></div>
        <p>Loading business information...</p>
      </div>
    );
  }

  const firstName = getFirstName();

  return (
    <div className="dashboard-container">
      <OwnerNavbar profile={profile} avatarUrl={avatarUrl} />

      <div className="content-wrapper">
        <div className="mobile-welcome">
          <p>Welcome, {profile?.first_name || "Owner"}!</p>
        </div>

        <main className="dashboard-main-full">
          <div className="dashboard-header">
            <div className="header-left">
              <h2 className="page-title">
                My Business
                <span className="title-glow"></span>
              </h2>
              <div className="header-decoration"></div>
            </div>
            <div className="header-right">
              <div className="user-greeting">
                <span className="greeting-wave">👋</span>
                <span className="greeting-text">Managing,</span>
                <span className="greeting-name">{firstName}</span>
              </div>
            </div>
          </div>

          <div className="my-business-page-content">
            {error && <div className="business-error-message">{error}</div>}

            {successMessage && (
              <div className="business-success-message">{successMessage}</div>
            )}

            {/* Verification Status Banner */}
            {business && business.verification_status === 'pending' && showVerificationBanner && (
              <div className="verification-banner pending">
                <div className="banner-icon">⏳</div>
                <div className="banner-content">
                  <h3>Business Verification Pending</h3>
                  <p>Please upload your business permit for verification. Once verified, your business will be fully visible to customers.</p>
                </div>
                <button className="banner-close" onClick={() => setShowVerificationBanner(false)}>✕</button>
              </div>
            )}

            {business && business.verification_status === 'approved' && business.permit_verified && (
              <div className="verification-banner approved">
                <div className="banner-icon">✅</div>
                <div className="banner-content">
                  <h3>Business Verified!</h3>
                  <p>Your business is fully verified and visible to customers.</p>
                </div>
              </div>
            )}

            {business && business.verification_status === 'rejected' && (
              <div className="verification-banner rejected">
                <div className="banner-icon">❌</div>
                <div className="banner-content">
                  <h3>Verification Rejected</h3>
                  <p>Reason: {business.rejection_reason || 'Your permit was not approved. Please upload a valid permit.'}</p>
                </div>
              </div>
            )}

            {!business && !editMode ? (
              <div className="no-business-state">
                <div className="no-business-icon">🏢</div>
                <h2>No Business Found</h2>
                <p>You haven't registered a business yet.</p>
                <button
                  className="btn-create-business"
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
                        getEmojiForCategory(profile?.business_category) || "🏢",
                      contact_phone: profile?.mobile || "",
                      contact_email: profile?.email || "",
                      website: "",
                      status: "active",
                      members_count: 0,
                      rating: 0,
                      gcash_number: "",
                      gcash_qr_code: null,
                    });
                  }}
                >
                  Create Your Business
                </button>
              </div>
            ) : (
              <div className="business-content">
                {!editMode && business && (
                  <div className="business-page-header">
                    <button
                      className="btn-edit-business"
                      onClick={() => setEditMode(true)}
                    >
                      <span className="btn-icon">✏️</span>
                      Edit Business
                    </button>
                  </div>
                )}

                <div className="business-tabs">
                  <button
                    className={`business-tab ${activeTab === "basic" ? "active" : ""}`}
                    onClick={() => setActiveTab("basic")}
                  >
                    Basic Info
                  </button>
                  <button
                    className={`business-tab ${activeTab === "details" ? "active" : ""}`}
                    onClick={() => setActiveTab("details")}
                  >
                    Details
                  </button>
                  <button
                    className={`business-tab ${activeTab === "contact" ? "active" : ""}`}
                    onClick={() => setActiveTab("contact")}
                  >
                    Contact
                  </button>
                  <button
                    className={`business-tab ${activeTab === "payment" ? "active" : ""}`}
                    onClick={() => setActiveTab("payment")}
                  >
                    Payment
                  </button>
                  <button
                    className={`business-tab ${activeTab === "permit" ? "active" : ""}`}
                    onClick={() => setActiveTab("permit")}
                  >
                    📄 Business Permit
                  </button>
                  <button
                    className={`business-tab ${activeTab === "plans" ? "active" : ""}`}
                    onClick={() => setActiveTab("plans")}
                  >
                    Membership Plans
                  </button>
                  <button
                    className={`business-tab ${activeTab === "preview" ? "active" : ""}`}
                    onClick={() => setActiveTab("preview")}
                  >
                    Preview
                  </button>
                </div>

                <div className="business-tab-content">
                  {/* Basic Info Tab */}
                  {activeTab === "basic" && (
                    <div className="business-form-section">
                      <h2 className="section-subtitle">Basic Information</h2>

                      <div className="form-row">
                        <div className={editMode ? getInputClassName('name') : 'form-group'}>
                          <label>Business Name *</label>
                          {editMode ? (
                            <>
                              <input
                                type="text"
                                name="name"
                                value={formData.name || profile?.business_name || ""}
                                onChange={handleInputChange}
                                onFocus={() => setFocusedField('name')}
                                onBlur={() => handleBlur('name')}
                                placeholder="Enter business name"
                                required
                              />
                              {touchedFields.name && fieldErrors.name && (
                                <span className="error-hint">{fieldErrors.name}</span>
                              )}
                            </>
                          ) : (
                            <p className="view-field">
                              {business?.name || profile?.business_name || "—"}
                            </p>
                          )}
                        </div>

                        <div className="form-group">
                          <label>Owner Name *</label>
                          {editMode ? (
                            <input
                              type="text"
                              name="owner_name"
                              value={
                                formData.owner_name ||
                                (profile?.first_name && profile?.last_name
                                  ? `${profile.first_name} ${profile.last_name}`.trim()
                                  : "")
                              }
                              onChange={handleInputChange}
                              placeholder="Enter owner name"
                              required
                              disabled={true}
                            />
                          ) : (
                            <p className="view-field">
                              {business?.owner_name ||
                                (profile?.first_name && profile?.last_name
                                  ? `${profile.first_name} ${profile.last_name}`.trim()
                                  : "—")}
                            </p>
                          )}
                          {editMode && (
                            <small className="field-hint">
                              Auto-filled from your profile
                            </small>
                          )}
                        </div>
                      </div>

                      <div className="form-row">
                        <div className={editMode ? getInputClassName('business_type') : 'form-group'}>
                          <label>Business Category *</label>
                          {editMode ? (
                            <>
                              <select
                                name="business_type"
                                value={formData.business_type || profile?.business_category || ""}
                                onChange={handleInputChange}
                                onFocus={() => setFocusedField('business_type')}
                                onBlur={() => handleBlur('business_type')}
                                required
                                className="select-input"
                              >
                                <option value="">Select a category</option>
                                {businessCategories.map((cat) => (
                                  <option key={cat.id} value={cat.id}>
                                    {cat.icon} {cat.label}
                                  </option>
                                ))}
                              </select>
                              {touchedFields.business_type && fieldErrors.business_type && (
                                <span className="error-hint">{fieldErrors.business_type}</span>
                              )}
                            </>
                          ) : (
                            <p className="view-field">
                              {business?.business_type ||
                                profile?.business_category ||
                                "—"}
                            </p>
                          )}
                        </div>

                        <div className="form-group">
                          <label>Status & Icon</label>
                          <div className="status-icon-row">
                            {editMode ? (
                              <>
                                <select
                                  name="status"
                                  value={formData.status || "active"}
                                  onChange={handleInputChange}
                                  className="status-select"
                                >
                                  <option value="active">Active</option>
                                  <option value="pending">Pending</option>
                                  <option value="inactive">Inactive</option>
                                </select>
                                <div className="icon-input-wrapper">
                                  <input
                                    type="text"
                                    name="emoji"
                                    value={
                                      formData.emoji ||
                                      getEmojiForCategory(
                                        formData.business_type,
                                      ) ||
                                      "🏢"
                                    }
                                    onChange={handleInputChange}
                                    placeholder="🏢"
                                    className="icon-input"
                                  />
                                </div>
                              </>
                            ) : (
                              <div className="status-icon-display">
                                <span
                                  className={`status-badge ${business?.status}`}
                                >
                                  {business?.status || "active"}
                                </span>
                                <span className="display-emoji">
                                  {business?.emoji ||
                                    getEmojiForCategory(
                                      business?.business_type,
                                    ) ||
                                    "🏢"}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="form-row">
                        <div className={editMode ? getInputClassName('short_description') : 'form-group full-width'}>
                          <label>Short Description</label>
                          {editMode ? (
                            <>
                              <input
                                type="text"
                                name="short_description"
                                value={formData.short_description || ""}
                                onChange={handleInputChange}
                                onFocus={() => setFocusedField('short_description')}
                                onBlur={() => handleBlur('short_description')}
                                placeholder="Brief description (max 200 chars)"
                                maxLength="200"
                              />
                              {touchedFields.short_description && fieldErrors.short_description && (
                                <span className="error-hint">{fieldErrors.short_description}</span>
                              )}
                              <small className="char-count">
                                {formData.short_description?.length || 0}/200
                              </small>
                            </>
                          ) : (
                            <p className="view-field">
                              {business?.short_description || "—"}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="form-row">
                        <div className={editMode ? getInputClassName('description') : 'form-group full-width'}>
                          <label>Full Description</label>
                          {editMode ? (
                            <>
                              <textarea
                                name="description"
                                value={formData.description || ""}
                                onChange={handleInputChange}
                                onFocus={() => setFocusedField('description')}
                                onBlur={() => handleBlur('description')}
                                placeholder="Detailed description of your business"
                                rows="5"
                              />
                              {touchedFields.description && fieldErrors.description && (
                                <span className="error-hint">{fieldErrors.description}</span>
                              )}
                            </>
                          ) : (
                            <p className="view-field description-text">
                              {business?.description || "—"}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Details Tab */}
                  {activeTab === "details" && (
                    <div className="business-form-section">
                      <h2 className="section-subtitle">Location & Pricing</h2>

                      <div className="form-row">
                        <div className={editMode ? getInputClassName('location') : 'form-group'}>
                          <label>Location *</label>
                          {editMode ? (
                            <>
                              <select
                                name="location"
                                value={formData.location || "Downtown"}
                                onChange={handleInputChange}
                                onFocus={() => setFocusedField('location')}
                                onBlur={() => handleBlur('location')}
                                required
                                className="select-input"
                              >
                                <option value="">Select a location</option>
                                {locationOptions.map((loc) => (
                                  <option key={loc.value} value={loc.value}>
                                    {loc.label}
                                  </option>
                                ))}
                              </select>
                              {touchedFields.location && fieldErrors.location && (
                                <span className="error-hint">{fieldErrors.location}</span>
                              )}
                            </>
                          ) : (
                            <p className="view-field">
                              {business?.location || "—"}
                            </p>
                          )}
                        </div>

                        <div className={editMode ? getInputClassName('address') : 'form-group'}>
                          <label>Address *</label>
                          {editMode ? (
                            <>
                              <input
                                type="text"
                                name="address"
                                value={formData.address || ""}
                                onChange={handleInputChange}
                                onFocus={() => setFocusedField('address')}
                                onBlur={() => handleBlur('address')}
                                placeholder="Street address"
                                required
                              />
                              {touchedFields.address && fieldErrors.address && (
                                <span className="error-hint">{fieldErrors.address}</span>
                              )}
                            </>
                          ) : (
                            <p className="view-field">
                              {business?.address || "—"}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="form-row">
                        <div className="form-group">
                          <label>City</label>
                          {editMode ? (
                            <input
                              type="text"
                              name="city"
                              value="Dagupan"
                              disabled
                              className="readonly-field"
                            />
                          ) : (
                            <p className="view-field">
                              {business?.city || "Dagupan"}
                            </p>
                          )}
                        </div>

                        <div className="form-group">
                          <label>Province</label>
                          {editMode ? (
                            <input
                              type="text"
                              name="province"
                              value="Pangasinan"
                              disabled
                              className="readonly-field"
                            />
                          ) : (
                            <p className="view-field">
                              {business?.province || "Pangasinan"}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="form-row">
                        <div className={editMode ? getInputClassName('price') : 'form-group'}>
                          <label>Price *</label>
                          {editMode ? (
                            <>
                              <input
                                type="number"
                                name="price"
                                value={formData.price || 0}
                                onChange={handleNumberChange}
                                onFocus={() => setFocusedField('price')}
                                onBlur={() => handleBlur('price')}
                                placeholder="0.00"
                                min="0"
                                step="0.01"
                              />
                              {touchedFields.price && fieldErrors.price && (
                                <span className="error-hint">{fieldErrors.price}</span>
                              )}
                            </>
                          ) : (
                            <p className="view-field">
                              ₱{business?.price?.toFixed(2) || "0.00"}
                            </p>
                          )}
                        </div>

                        <div className="form-group">
                          <label>Price Unit</label>
                          {editMode ? (
                            <select
                              name="price_unit"
                              value={formData.price_unit || "month"}
                              onChange={handleInputChange}
                            >
                              <option value="month">per month</option>
                              <option value="year">per year</option>
                              <option value="week">per week</option>
                              <option value="day">per day</option>
                              <option value="session">per session</option>
                            </select>
                          ) : (
                            <p className="view-field">
                              per {business?.price_unit || "month"}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Contact Tab */}
                  {activeTab === "contact" && (
                    <div className="business-form-section">
                      <h2 className="section-subtitle">Contact Information</h2>

                      <div className="form-row">
                        <div className={editMode ? getInputClassName('contact_phone') : 'form-group'}>
                          <label>Contact Phone</label>
                          {editMode ? (
                            <>
                              <input
                                type="tel"
                                name="contact_phone"
                                value={formData.contact_phone || profile?.mobile || ""}
                                onChange={handleInputChange}
                                onFocus={() => setFocusedField('contact_phone')}
                                onBlur={() => handleBlur('contact_phone')}
                                placeholder="09171234567"
                                maxLength={11}
                              />
                              {touchedFields.contact_phone && fieldErrors.contact_phone && (
                                <span className="error-hint">{fieldErrors.contact_phone}</span>
                              )}
                              {formData.contact_phone && formData.contact_phone.length > 0 && !fieldErrors.contact_phone && (
                                <span className="hint-text">Format: 09xxxxxxxxx (11 digits)</span>
                              )}
                            </>
                          ) : (
                            <p className="view-field">
                              {business?.contact_phone ||
                                profile?.mobile ||
                                "—"}
                            </p>
                          )}
                        </div>

                        <div className={editMode ? getInputClassName('contact_email') : 'form-group'}>
                          <label>Contact Email</label>
                          {editMode ? (
                            <>
                              <input
                                type="email"
                                name="contact_email"
                                value={formData.contact_email || profile?.email || ""}
                                onChange={handleInputChange}
                                onFocus={() => setFocusedField('contact_email')}
                                onBlur={() => handleBlur('contact_email')}
                                placeholder="business@example.com"
                              />
                              {touchedFields.contact_email && fieldErrors.contact_email && (
                                <span className="error-hint">{fieldErrors.contact_email}</span>
                              )}
                            </>
                          ) : (
                            <p className="view-field">
                              {business?.contact_email || profile?.email || "—"}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="form-row">
                        <div className={editMode ? getInputClassName('website') : 'form-group full-width'}>
                          <label>Website</label>
                          {editMode ? (
                            <>
                              <input
                                type="url"
                                name="website"
                                value={formData.website || ""}
                                onChange={handleInputChange}
                                onFocus={() => setFocusedField('website')}
                                onBlur={() => handleBlur('website')}
                                placeholder="https://example.com"
                              />
                              {touchedFields.website && fieldErrors.website && (
                                <span className="error-hint">{fieldErrors.website}</span>
                              )}
                            </>
                          ) : (
                            <p className="view-field">
                              {business?.website || "—"}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="form-row">
                        <div className="form-group">
                          <label>Amenities</label>
                          {editMode ? (
                            <textarea
                              value={
                                formData.amenities
                                  ? JSON.stringify(formData.amenities, null, 2)
                                  : "[]"
                              }
                              onChange={(e) =>
                                handleJsonChange("amenities", e.target.value)
                              }
                              placeholder='["wifi", "parking", "lockers"]'
                              rows="4"
                            />
                          ) : (
                            <div className="amenities-list">
                              {business?.amenities?.map((item, index) => (
                                <span key={index} className="amenity-tag">
                                  {item}
                                </span>
                              )) || "—"}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="form-group full-width">
                        <label>Business Hours</label>
                        {editMode ? (
                          <div className="business-hours-container">
                            {daysOfWeek.map((day) => (
                              <div key={day.id} className="business-hour-row">
                                <div className="day-label">{day.label}</div>
                                <div className="hour-controls">
                                  <label className="closed-checkbox">
                                    <input
                                      type="checkbox"
                                      checked={
                                        businessHours[day.id]?.closed || false
                                      }
                                      onChange={(e) =>
                                        handleBusinessHourChange(
                                          day.id,
                                          "closed",
                                          e.target.checked,
                                        )
                                      }
                                    />
                                    Closed
                                  </label>
                                  {!businessHours[day.id]?.closed && (
                                    <>
                                      <div className="time-input">
                                        <span>Open:</span>
                                        <input
                                          type="time"
                                          value={
                                            businessHours[day.id]?.open ||
                                            "09:00"
                                          }
                                          onChange={(e) =>
                                            handleBusinessHourChange(
                                              day.id,
                                              "open",
                                              e.target.value,
                                            )
                                          }
                                        />
                                      </div>
                                      <div className="time-input">
                                        <span>Close:</span>
                                        <input
                                          type="time"
                                          value={
                                            businessHours[day.id]?.close ||
                                            "18:00"
                                          }
                                          onChange={(e) =>
                                            handleBusinessHourChange(
                                              day.id,
                                              "close",
                                              e.target.value,
                                            )
                                          }
                                        />
                                      </div>
                                    </>
                                  )}
                                </div>
                              </div>
                            ))}
                            <p className="hours-hint">
                              Set your business hours for each day of the week
                            </p>
                          </div>
                        ) : (
                          <div className="business-hours-display">
                            {business?.business_hours ? (
                              Object.entries(business.business_hours).map(
                                ([day, hours]) => (
                                  <div key={day} className="hour-display-row">
                                    <span className="day">{day}:</span>
                                    <span className="hours">
                                      {hours.closed
                                        ? "Closed"
                                        : `${hours.open} - ${hours.close}`}
                                    </span>
                                  </div>
                                ),
                              )
                            ) : (
                              <p className="view-field">
                                No business hours set
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Payment Tab - GCash QR Code */}
                  {activeTab === "payment" && (
                    <div className="business-form-section">
                      <h2 className="section-subtitle">Payment Settings</h2>

                      <div className="payment-section">
                        <div className="payment-info">
                          <div className="payment-icon">💳</div>
                          <div className="payment-description">
                            <h3>GCash Payment</h3>
                            <p>
                              Upload your GCash QR code so customers can scan
                              and pay easily. Maximum file size: 2MB (PNG, JPG,
                              JPEG)
                            </p>
                          </div>
                        </div>

                        <div className="form-row">
                          <div className={editMode ? getInputClassName('gcash_number') : 'form-group full-width'}>
                            <label>GCash Mobile Number</label>
                            {editMode ? (
                              <>
                                <input
                                  type="tel"
                                  name="gcash_number"
                                  value={gcashNumber}
                                  onChange={(e) => {
                                    const numericValue = e.target.value.replace(/\D/g, '');
                                    setGcashNumber(numericValue);
                                    setFormData(prev => ({ ...prev, gcash_number: numericValue }));
                                  }}
                                  onFocus={() => setFocusedField('gcash_number')}
                                  onBlur={() => handleBlur('gcash_number')}
                                  placeholder="09171234567"
                                  className="gcash-input"
                                  maxLength={11}
                                />
                                {touchedFields.gcash_number && fieldErrors.gcash_number && (
                                  <span className="error-hint">{fieldErrors.gcash_number}</span>
                                )}
                                {gcashNumber && gcashNumber.length > 0 && !fieldErrors.gcash_number && (
                                  <span className="hint-text">Format: 09xxxxxxxxx (11 digits)</span>
                                )}
                              </>
                            ) : (
                              <p className="view-field">
                                {business?.gcash_number || "—"}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="qr-code-section">
                          <label>GCash QR Code</label>

                          {editMode ? (
                            <div className="qr-upload-container">
                              {gcashQrUrl ? (
                                <div className="qr-preview">
                                  <img
                                    src={gcashQrUrl}
                                    alt="GCash QR Code"
                                    className="qr-image"
                                  />
                                  <button
                                    type="button"
                                    className="btn-remove-qr"
                                    onClick={removeGcashQr}
                                    disabled={uploadingQr}
                                  >
                                    Remove QR Code
                                  </button>
                                </div>
                              ) : (
                                <div className="qr-upload-placeholder">
                                  <div className="upload-icon">📱</div>
                                  <p>No GCash QR code uploaded yet</p>
                                  <input
                                    type="file"
                                    id="gcash-qr-upload"
                                    accept="image/*"
                                    onChange={handleGcashQrUpload}
                                    disabled={uploadingQr}
                                    className="file-input"
                                  />
                                  <label
                                    htmlFor="gcash-qr-upload"
                                    className="btn-upload-qr"
                                  >
                                    {uploadingQr
                                      ? "Uploading..."
                                      : "Upload QR Code"}
                                  </label>
                                </div>
                              )}
                              <p className="qr-hint">
                                Upload a clear image of your GCash QR code.
                                Customers will scan this to pay.
                              </p>
                            </div>
                          ) : (
                            <div className="qr-view">
                              {business?.gcash_qr_code ? (
                                <div className="qr-display">
                                  <img
                                    src={gcashQrUrl}
                                    alt="GCash QR Code"
                                    className="qr-image-large"
                                  />
                                  {business?.gcash_number && (
                                    <p className="gcash-number-display">
                                      GCash Number: {business.gcash_number}
                                    </p>
                                  )}
                                </div>
                              ) : (
                                <div className="no-qr-message">
                                  <p>No GCash QR code set</p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="payment-note">
                          <p>
                            ℹ️ Once uploaded, customers can scan this QR code to
                            make payments through GCash.
                          </p>
                          <p>Make sure the QR code is clear and readable.</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Business Permit Tab */}
                  {activeTab === "permit" && (
                    <div className="business-form-section">
                      <h2 className="section-subtitle">Business Permit Verification</h2>
                      
                      <div className="permit-section">
                        <div className="permit-info">
                          <div className="permit-icon">📄</div>
                          <div className="permit-description">
                            <h3>Upload Your Business Permit</h3>
                            <p>
                              To verify your business, please upload a clear image or PDF of your current business permit.
                              Maximum file size: 5MB (JPG, PNG, PDF)
                            </p>
                          </div>
                        </div>

                        {/* Current Permit Status */}
                        {business?.permit_document && (
                          <div className="current-permit">
                            <h4>Current Permit Document</h4>
                            <div className="permit-document-info">
                              <span className="permit-number">Permit #: {business.permit_number || 'N/A'}</span>
                              <span className="permit-expiry">Expires: {business.permit_expiry ? new Date(business.permit_expiry).toLocaleDateString() : 'N/A'}</span>
                              <span className={`permit-status ${business.permit_verified ? 'verified' : 'pending'}`}>
                                {business.permit_verified ? '✅ Verified' : '⏳ Pending Verification'}
                              </span>
                            </div>
                            <div className="permit-document-preview">
                              {business.permit_document && (
                                <div className="permit-file-link">
                                  <a 
                                    href={supabase.storage.from('business-permits').getPublicUrl(business.permit_document).data.publicUrl} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="btn-view-permit"
                                  >
                                    📄 View Uploaded Permit
                                  </a>
                                  <button
                                    className="btn-remove-permit"
                                    onClick={removePermit}
                                    disabled={uploadingPermit}
                                  >
                                    Remove
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Upload New Permit Form */}
                        {(!business?.permit_document || business?.verification_status === 'rejected') && (
                          <div className="permit-upload-form">
                            <h4>{business?.permit_document ? 'Re-upload New Permit' : 'Upload Your Permit'}</h4>
                            
                            <div className="form-row">
                              <div className="form-group">
                                <label>Permit Number *</label>
                                <input
                                  type="text"
                                  value={permitNumber}
                                  onChange={(e) => setPermitNumber(e.target.value)}
                                  placeholder="Enter permit number"
                                  disabled={uploadingPermit}
                                />
                              </div>

                              <div className="form-group">
                                <label>Permit Expiry Date *</label>
                                <input
                                  type="date"
                                  value={permitExpiry}
                                  onChange={(e) => setPermitExpiry(e.target.value)}
                                  min={new Date().toISOString().split('T')[0]}
                                  disabled={uploadingPermit}
                                />
                              </div>
                            </div>

                            <div className="permit-file-upload">
                              <div className="file-upload-area">
                                {permitPreview ? (
                                  <div className="permit-preview">
                                    <img src={permitPreview} alt="Permit Preview" className="permit-preview-image" />
                                    <button
                                      type="button"
                                      className="btn-remove-file"
                                      onClick={() => {
                                        setPermitFile(null);
                                        setPermitPreview(null);
                                      }}
                                    >
                                      ✕
                                    </button>
                                  </div>
                                ) : (
                                  <>
                                    <input
                                      type="file"
                                      id="permit-upload"
                                      accept=".jpg,.jpeg,.png,.pdf"
                                      onChange={handlePermitFileChange}
                                      disabled={uploadingPermit}
                                      className="file-input"
                                    />
                                    <label htmlFor="permit-upload" className="file-upload-label">
                                      <span className="upload-icon">📎</span>
                                      <span className="upload-text">
                                        {permitFile ? permitFile.name : 'Choose file or drag here'}
                                      </span>
                                    </label>
                                  </>
                                )}
                              </div>
                              
                              <button
                                className="btn-upload-permit"
                                onClick={uploadPermit}
                                disabled={!permitFile || !permitNumber || !permitExpiry || uploadingPermit}
                              >
                                {uploadingPermit ? 'Uploading...' : 'Upload Permit'}
                              </button>
                            </div>

                            <p className="permit-note">
                              ℹ️ After uploading, your permit will be reviewed by an admin. This usually takes 1-2 business days.
                            </p>
                          </div>
                        )}

                        {/* Verified Message */}
                        {business?.permit_verified && (
                          <div className="permit-verified-message">
                            <div className="verified-icon">✅</div>
                            <div className="verified-content">
                              <h4>Permit Verified!</h4>
                              <p>Your business permit has been verified. You now have full access to all business features.</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Membership Plans Tab */}
                  {activeTab === "plans" && (
                    <div className="membership-plans-tab">
                      <div className="plans-header">
                        <h2 className="section-subtitle">Membership Plans</h2>
                        <button
                          className="btn-add-plan"
                          onClick={() => {
                            resetPlanForm();
                            setShowPlanForm(true);
                          }}
                        >
                          <span className="btn-icon">➕</span>
                          Add New Plan
                        </button>
                      </div>

                      {showPlanForm && (
                        <div className="plan-form-container">
                          <h3>
                            {editingPlan ? "Edit Plan" : "Create New Plan"}
                          </h3>

                          <div className="form-row">
                            <div className="form-group">
                              <label>Plan Name *</label>
                              <input
                                type="text"
                                name="name"
                                value={planFormData.name}
                                onChange={handlePlanInputChange}
                                placeholder="e.g., Coffee Lover, Basic Plan"
                                required
                              />
                            </div>

                            <div className="form-group">
                              <label>Price *</label>
                              <input
                                type="number"
                                name="price"
                                value={planFormData.price}
                                onChange={handlePlanInputChange}
                                placeholder="0.00"
                                min="0"
                                step="0.01"
                                required
                              />
                            </div>
                          </div>

                          <div className="form-row">
                            <div className="form-group">
                              <label>Duration</label>
                              <select
                                name="duration"
                                value={planFormData.duration}
                                onChange={handlePlanInputChange}
                              >
                                <option value="month">per month</option>
                                <option value="year">per year</option>
                                <option value="week">per week</option>
                                <option value="day">per day</option>
                                <option value="session">per session</option>
                              </select>
                            </div>

                            <div className="form-group">
                              <label>Status</label>
                              <select
                                name="is_active"
                                value={planFormData.is_active}
                                onChange={(e) =>
                                  setPlanFormData((prev) => ({
                                    ...prev,
                                    is_active: e.target.value === "true",
                                  }))
                                }
                              >
                                <option value="true">Active</option>
                                <option value="false">Inactive</option>
                              </select>
                            </div>
                          </div>

                          <div className="form-group full-width">
                            <label>Features</label>
                            {planFormData.features.map((feature, index) => (
                              <div key={index} className="feature-input-row">
                                <input
                                  type="text"
                                  value={feature}
                                  onChange={(e) =>
                                    handleFeatureChange(index, e.target.value)
                                  }
                                  placeholder={`Feature ${index + 1}`}
                                  className="feature-input"
                                />
                                <button
                                  type="button"
                                  className="remove-feature-btn"
                                  onClick={() => removeFeature(index)}
                                  disabled={planFormData.features.length === 1}
                                >
                                  ✕
                                </button>
                              </div>
                            ))}
                            <button
                              type="button"
                              className="add-feature-btn"
                              onClick={addFeature}
                            >
                              + Add Feature
                            </button>
                          </div>

                          <div className="plan-form-actions">
                            <button
                              className="btn-save-plan"
                              onClick={saveMembershipPlan}
                              disabled={saving}
                            >
                              {saving
                                ? "Saving..."
                                : editingPlan
                                  ? "Update Plan"
                                  : "Create Plan"}
                            </button>
                            <button
                              className="btn-cancel-plan"
                              onClick={resetPlanForm}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}

                      {membershipPlans.length > 0 ? (
                        <div className="plans-grid-owner">
                          {membershipPlans.map((plan) => (
                            <div
                              key={plan.id}
                              className={`plan-card-owner ${!plan.is_active ? "inactive" : ""}`}
                            >
                              <div className="plan-card-header">
                                <h4>{plan.name}</h4>
                                <div className="plan-badge">
                                  {plan.is_active ? "Active" : "Inactive"}
                                </div>
                              </div>
                              <div className="plan-price">
                                ₱{plan.price.toLocaleString()}
                                <span className="plan-duration">
                                  /{plan.duration}
                                </span>
                              </div>
                              <ul className="plan-features-list">
                                {plan.features.map((feature, idx) => (
                                  <li key={idx}>
                                    <span className="feature-check">✓</span>
                                    {feature}
                                  </li>
                                ))}
                              </ul>
                              <div className="plan-actions">
                                <button
                                  className="plan-action-btn edit"
                                  onClick={() => editPlan(plan)}
                                >
                                  ✏️ Edit
                                </button>
                                <button
                                  className="plan-action-btn toggle"
                                  onClick={() => togglePlanStatus(plan)}
                                >
                                  {plan.is_active
                                    ? "🔴 Deactivate"
                                    : "🟢 Activate"}
                                </button>
                                <button
                                  className="plan-action-btn delete"
                                  onClick={() => deletePlan(plan.id)}
                                >
                                  🗑️ Delete
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="no-plans-state">
                          <p>No membership plans created yet.</p>
                          <p>
                            Create your first plan to start offering
                            memberships!
                          </p>
                        </div>
                      )}

                      <div className="plans-preview-section">
                        <h3 className="preview-subtitle">
                          Preview - How plans will appear to clients
                        </h3>
                        <div className="plans-grid-preview">
                          {membershipPlans.filter((p) => p.is_active).length >
                          0 ? (
                            membershipPlans
                              .filter((p) => p.is_active)
                              .map((plan, index) => (
                                <div
                                  key={plan.id}
                                  className="plan-card-preview"
                                >
                                  <h4>{plan.name}</h4>
                                  <div className="plan-price">
                                    ₱{plan.price.toLocaleString()}
                                    <span className="plan-duration">
                                      /{plan.duration}
                                    </span>
                                  </div>
                                  <ul className="plan-features">
                                    {plan.features.map((feature, idx) => (
                                      <li key={idx}>
                                        <span className="feature-check">✓</span>
                                        {feature}
                                      </li>
                                    ))}
                                  </ul>
                                  <button
                                    className="join-plan-btn-preview"
                                    disabled
                                  >
                                    Join Now
                                  </button>
                                </div>
                              ))
                          ) : (
                            <div className="no-active-plans-message">
                              No active plans to display. Activate plans to show
                              them to clients.
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Preview Tab */}
                  {activeTab === "preview" && (
                    <div className="business-preview">
                      <h3 className="section-subtitle">
                        Preview - How your business will appear in Browse
                      </h3>

                      {/* Business Card Preview */}
                      <div className="preview-business-card">
                        <div className="business-card-glow"></div>
                        <div className="business-card-content">
                          <div className="business-card-header">
                            <div className="business-image-large">
                              <span className="business-emoji-preview">
                                {formData.emoji ||
                                  getEmojiForCategory(formData.business_type) ||
                                  "🏢"}
                              </span>
                            </div>
                            <div className="business-card-tags">
                              <span className="business-type-tag">
                                {formData.business_type?.toUpperCase() ||
                                  "BUSINESS"}
                              </span>
                              <span className="business-rating-tag">
                                <span className="rating-star">⭐</span>
                                {formData.rating || "0.0"}
                              </span>
                            </div>
                          </div>

                          <div className="business-card-body">
                            <h3 className="business-card-title">
                              {formData.name || "Business Name"}
                            </h3>
                            <p className="business-card-owner">
                              <span className="owner-icon">👑</span>
                              {formData.owner_name ||
                                (profile?.first_name && profile?.last_name
                                  ? `${profile.first_name} ${profile.last_name}`.trim()
                                  : "Owner Name")}
                            </p>
                            <p className="business-card-description">
                              {formData.short_description ||
                                formData.description?.substring(0, 100) ||
                                "No description provided..."}
                            </p>

                            <div className="business-card-details">
                              <div className="business-detail-item">
                                <span className="detail-icon">📍</span>
                                <span className="detail-text">
                                  {formData.location || "Location"}
                                </span>
                              </div>
                              <div className="business-detail-item">
                                <span className="detail-icon">👥</span>
                                <span className="detail-text">
                                  {formData.members_count || 0} members
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="business-card-footer">
                            <div className="business-price">
                              <span className="price-amount">
                                ₱{(formData.price || 0).toLocaleString()}
                              </span>
                              <span className="price-period">
                                /{formData.price_unit || "month"}
                              </span>
                            </div>
                            <button
                              className="view-details-btn-preview"
                              disabled
                            >
                              <span>View Details →</span>
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Payment Methods Preview - How clients will see payment options */}
                      <div className="payment-methods-preview">
                        <h4 className="preview-subtitle">
                          Payment Methods - How clients will pay
                        </h4>

                        <div className="payment-options-preview">
                          {/* GCash Payment Option */}
                          <div className="payment-option-card">
                            <div className="payment-option-header">
                              <span className="payment-option-icon">📱</span>
                              <span className="payment-option-title">
                                GCash
                              </span>
                              {gcashQrUrl ? (
                                <span className="payment-option-badge available">
                                  Available
                                </span>
                              ) : (
                                <span className="payment-option-badge unavailable">
                                  Not Set
                                </span>
                              )}
                            </div>

                            {gcashQrUrl ? (
                              <div className="gcash-preview-content">
                                <div className="qr-code-preview">
                                  <img
                                    src={gcashQrUrl}
                                    alt="GCash QR Code"
                                    className="preview-qr-image"
                                  />
                                </div>
                                <div className="gcash-details-preview">
                                  <p className="gcash-number-preview">
                                    <span className="preview-label">
                                      Number:
                                    </span>
                                    {gcashNumber || "0917 123 4567"}
                                  </p>
                                  <p className="gcash-instruction">
                                    Scan the QR code with your GCash app to pay
                                  </p>
                                  <div className="gcash-steps">
                                    <span className="step">1. Open GCash</span>
                                    <span className="step-arrow">→</span>
                                    <span className="step">2. Scan QR</span>
                                    <span className="step-arrow">→</span>
                                    <span className="step">
                                      3. Enter amount
                                    </span>
                                    <span className="step-arrow">→</span>
                                    <span className="step">4. Pay</span>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div className="payment-unavailable">
                                <p>GCash payment not available</p>
                                <p className="unavailable-note">
                                  Owner hasn't set up GCash yet
                                </p>
                              </div>
                            )}
                          </div>

                          {/* On-site Payment Option (always available) */}
                          <div className="payment-option-card">
                            <div className="payment-option-header">
                              <span className="payment-option-icon">🏪</span>
                              <span className="payment-option-title">
                                Pay at the Business
                              </span>
                              <span className="payment-option-badge available">
                                Available
                              </span>
                            </div>
                            <div className="onsite-preview-content">
                              <p className="onsite-instruction">
                                Pay directly at{" "}
                                {formData.name || "the business"} premises
                              </p>
                              <div className="onsite-details">
                                <p>
                                  <span className="preview-label">
                                    Location:
                                  </span>{" "}
                                  {formData.location || "Downtown"}
                                </p>
                                <p>
                                  <span className="preview-label">
                                    Address:
                                  </span>{" "}
                                  {formData.address ||
                                    formData.location ||
                                    "Business location"}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Preview Note */}
                        <div className="preview-note">
                          <p>
                            ✨ This is how payment options will appear to
                            clients when they view your business
                          </p>
                          <p>
                            Make sure your GCash QR code is clear and readable
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {editMode && (
                  <div className="business-form-actions">
                    <button
                      className="btn-save-business"
                      onClick={saveBusiness}
                      disabled={saving}
                    >
                      {saving
                        ? "Saving..."
                        : business?.id
                          ? "Update Business"
                          : "Create Business"}
                    </button>
                    <button
                      className="btn-cancel-edit"
                      onClick={cancelEdit}
                      disabled={saving}
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default MyBusinessPage;