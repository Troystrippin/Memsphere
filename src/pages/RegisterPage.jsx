import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  AlertCircle,
  Users,
  TrendingUp,
  Sparkles,
  Shield,
  Crown,
  CheckCircle,
  User,
  Phone,
  Building,
  MapPin,
  Briefcase,
} from "lucide-react";
import logo from "../assets/logo3.png";

const RegisterPage = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("client");
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [focusedField, setFocusedField] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [touchedFields, setTouchedFields] = useState({});
  const [registrationsEnabled, setRegistrationsEnabled] = useState(true);
  const [checkingStatus, setCheckingStatus] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    mobile: "",
    businessName: "",
    businessCategory: "",
    businessLocation: "",
    businessDescription: "",
    password: "",
    confirmPassword: "",
  });

  const [fieldErrors, setFieldErrors] = useState({
    firstName: "",
    lastName: "",
    email: "",
    mobile: "",
    businessName: "",
    businessCategory: "",
    businessLocation: "",
    businessDescription: "",
  });

  const [passwordStrength, setPasswordStrength] = useState("");

  // Business categories
  const businessCategories = [
    { id: "gym", label: "Gym / Fitness Center", icon: "🏋️" },
    { id: "cafe", label: "Cafe / Coffee Shop", icon: "☕" },
    { id: "bookstore", label: "Bookstore", icon: "📚" },
  ];

  // Business locations (same as Browse page)
  const businessLocations = [
    { value: "Downtown", label: "Downtown" },
    { value: "Arellano", label: "Arellano" },
    { value: "Pantal", label: "Pantal" },
    { value: "Perez", label: "Perez" },
    { value: "PNR", label: "PNR" },
    { value: "Bonuan", label: "Bonuan" },
    { value: "AB Fernandez", label: "AB Fernandez" },
  ];

  const features = [
    {
      icon: Shield,
      text: "Secure Data",
      value: "Encrypted",
      color: "from-blue-500 to-cyan-500",
    },
    {
      icon: Users,
      text: "Easy to Use",
      value: "Simple",
      color: "from-green-500 to-emerald-500",
    },
    {
      icon: TrendingUp,
      text: "Support",
      value: "24/7",
      color: "from-purple-500 to-pink-500",
    },
    {
      icon: Crown,
      text: "Trial",
      value: "30 Days",
      color: "from-yellow-500 to-orange-500",
    },
  ];

  const benefits = [
    "Secure and encrypted data",
    "Easy to use platform",
    "24/7 customer support",
    "Free 30-day trial",
  ];

  // Check if registrations are enabled
  useEffect(() => {
    const checkRegistrationStatus = async () => {
      try {
        const { data, error } = await supabase
          .from("system_settings")
          .select("value")
          .eq("key", "allow_registrations")
          .single();

        if (!error && data && data.value === "false") {
          setRegistrationsEnabled(false);
          setErrorMessage(
            "Registrations are currently disabled by the administrator.",
          );
        } else {
          setRegistrationsEnabled(true);
          setErrorMessage("");
        }
      } catch (error) {
        console.error("Error checking registration status:", error);
        setRegistrationsEnabled(true);
      } finally {
        setCheckingStatus(false);
      }
    };

    checkRegistrationStatus();
  }, []);

  // Password strength checker
  useEffect(() => {
    if (formData.password) {
      const hasLowerCase = /[a-z]/.test(formData.password);
      const hasUpperCase = /[A-Z]/.test(formData.password);
      const hasNumbers = /\d/.test(formData.password);
      const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(formData.password);
      const length = formData.password.length;

      const criteria = [hasLowerCase, hasUpperCase, hasNumbers, hasSpecial];
      const metCriteria = criteria.filter(Boolean).length;

      if (length < 8) setPasswordStrength("weak");
      else if (length >= 8 && metCriteria <= 2) setPasswordStrength("weak");
      else if (length >= 8 && metCriteria === 3) setPasswordStrength("medium");
      else if (length >= 8 && metCriteria >= 3) setPasswordStrength("strong");
      else setPasswordStrength("weak");
    } else {
      setPasswordStrength("");
    }
  }, [formData.password]);

  // Validate individual fields
  useEffect(() => {
    validateField("firstName");
    validateField("lastName");
    validateField("email");
    validateField("mobile");
    if (activeTab === "owner") {
      validateField("businessName");
      validateField("businessCategory");
      validateField("businessLocation");
      validateField("businessDescription");
    }
  }, [
    formData.firstName,
    formData.lastName,
    formData.email,
    formData.mobile,
    formData.businessName,
    formData.businessCategory,
    formData.businessLocation,
    formData.businessDescription,
    activeTab,
  ]);

  const validateField = (fieldName) => {
    let errorMessage = "";

    switch (fieldName) {
      case "firstName":
        if (!formData.firstName.trim()) {
          errorMessage = "First name is required";
        } else if (!/^[A-Za-z\s.-]+$/.test(formData.firstName)) {
          errorMessage = "Letters, spaces, dots (.) and hyphens (-) only";
        }
        break;

      case "lastName":
        if (!formData.lastName.trim()) {
          errorMessage = "Last name is required";
        } else if (!/^[A-Za-z\s.-]+$/.test(formData.lastName)) {
          errorMessage = "Letters, spaces, dots (.) and hyphens (-) only";
        }
        break;

      case "email":
        if (!formData.email.trim()) {
          errorMessage = "Email is required";
        } else if (!/^[a-zA-Z0-9._%+-]+@gmail\.com$/.test(formData.email)) {
          errorMessage = "Must be a valid Gmail address (example@gmail.com)";
        }
        break;

      case "mobile":
        if (!formData.mobile) {
          errorMessage = "Mobile number is required";
        } else if (!/^09\d{9}$/.test(formData.mobile)) {
          errorMessage = "Must be 11 digits starting with 09";
        }
        break;

      case "businessName":
        if (activeTab === "owner" && !formData.businessName.trim()) {
          errorMessage = "Business name is required";
        }
        break;

      case "businessCategory":
        if (activeTab === "owner" && !formData.businessCategory) {
          errorMessage = "Please select a business category";
        }
        break;

      case "businessLocation":
        if (activeTab === "owner" && !formData.businessLocation) {
          errorMessage = "Please select a business location";
        }
        break;

      case "businessDescription":
        if (activeTab === "owner" && !formData.businessDescription.trim()) {
          errorMessage = "Business description is required";
        }
        break;

      default:
        break;
    }

    setFieldErrors((prev) => ({
      ...prev,
      [fieldName]: errorMessage,
    }));

    return !errorMessage;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    if (name === "mobile") {
      const numericValue = value.replace(/\D/g, "");
      setFormData((prev) => ({
        ...prev,
        [name]: numericValue,
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const handleBlur = (fieldName) => {
    setFocusedField(null);
    setTouchedFields((prev) => ({ ...prev, [fieldName]: true }));
    validateField(fieldName);
  };

  const togglePasswordVisibility = (field) => {
    if (field === "password") {
      setShowPassword(!showPassword);
    } else {
      setShowConfirmPassword(!showConfirmPassword);
    }
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (tab === "client") {
      setFormData((prev) => ({
        ...prev,
        businessName: "",
        businessCategory: "",
        businessLocation: "",
        businessDescription: "",
      }));
    }
  };

  const validateForm = () => {
    if (!formData.firstName.trim()) {
      alert("First name is required");
      return false;
    } else if (!/^[A-Za-z\s.-]+$/.test(formData.firstName)) {
      alert(
        "First name can only contain letters, spaces, dots (.) and hyphens (-)",
      );
      return false;
    }

    if (!formData.lastName.trim()) {
      alert("Last name is required");
      return false;
    } else if (!/^[A-Za-z\s.-]+$/.test(formData.lastName)) {
      alert(
        "Last name can only contain letters, spaces, dots (.) and hyphens (-)",
      );
      return false;
    }

    if (!formData.email.trim()) {
      alert("Email is required");
      return false;
    } else if (!/^[a-zA-Z0-9._%+-]+@gmail\.com$/.test(formData.email)) {
      alert("Please enter a valid Gmail address (example@gmail.com)");
      return false;
    }

    if (!formData.mobile) {
      alert("Mobile number is required");
      return false;
    } else if (!/^09\d{9}$/.test(formData.mobile)) {
      alert("Please enter a valid PH mobile number (09xxxxxxxxx - 11 digits)");
      return false;
    }

    if (activeTab === "owner") {
      if (!formData.businessName.trim()) {
        alert("Business name is required");
        return false;
      }
      if (!formData.businessCategory) {
        alert("Please select a business category");
        return false;
      }
      if (!formData.businessLocation) {
        alert("Please select a business location");
        return false;
      }
      if (!formData.businessDescription.trim()) {
        alert("Business description is required");
        return false;
      }
    }

    if (!formData.password) {
      alert("Password is required");
      return false;
    } else if (formData.password.length < 8) {
      alert("Password must be at least 8 characters long");
      return false;
    } else if (!/(?=.*[a-z])/.test(formData.password)) {
      alert("Password must contain at least one lowercase letter");
      return false;
    } else if (!/(?=.*[A-Z])/.test(formData.password)) {
      alert("Password must contain at least one uppercase letter");
      return false;
    } else if (!/(?=.*\d)/.test(formData.password)) {
      alert("Password must contain at least one number");
      return false;
    } else if (!/(?=.*[!@#$%^&*(),.?":{}|<>])/.test(formData.password)) {
      alert(
        "Password must contain at least one special character (!@#$%^&* etc.)",
      );
      return false;
    }

    if (!formData.confirmPassword) {
      alert("Please confirm your password");
      return false;
    } else if (formData.password !== formData.confirmPassword) {
      alert("Passwords do not match");
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!registrationsEnabled) {
      setErrorMessage(
        "Registrations are currently disabled. Please try again later.",
      );
      return;
    }

    const allFields = [
      "firstName",
      "lastName",
      "email",
      "mobile",
      "password",
      "confirmPassword",
    ];
    if (activeTab === "owner") {
      allFields.push(
        "businessName",
        "businessCategory",
        "businessLocation",
        "businessDescription",
      );
    }

    const touched = {};
    allFields.forEach((field) => {
      touched[field] = true;
    });
    setTouchedFields(touched);

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setErrorMessage("");

    try {
      const { data: settingsData, error: settingsError } = await supabase
        .from("system_settings")
        .select("value")
        .eq("key", "allow_registrations")
        .single();

      if (!settingsError && settingsData && settingsData.value === "false") {
        setRegistrationsEnabled(false);
        setErrorMessage(
          "Registrations are currently disabled. Please try again later.",
        );
        setIsLoading(false);
        return;
      }

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            first_name: formData.firstName,
            last_name: formData.lastName,
            mobile: formData.mobile,
            user_type: activeTab,
          },
          emailRedirectTo: `${window.location.origin}/login?verified=true`,
        },
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error("No user data returned from signup");

      // Store email for resend verification
      localStorage.setItem('pending_verification_email', formData.email);

      await new Promise((resolve) => setTimeout(resolve, 2000));

      const { data: profile, error: profileCheckError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", authData.user.id)
        .maybeSingle();

      if (!profile) {
        const { error: insertError } = await supabase.from("profiles").insert({
          id: authData.user.id,
          email: formData.email,
          first_name: formData.firstName,
          last_name: formData.lastName,
          mobile: formData.mobile,
          role: activeTab === "owner" ? "owner" : "client",
          verification_status: "approved",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

        if (insertError) throw insertError;
      } else {
        if (profile.role !== activeTab) {
          await supabase
            .from("profiles")
            .update({ role: activeTab })
            .eq("id", authData.user.id);
        }
      }

      if (activeTab === "owner") {
        // Use the selected location for the location field
        const location = formData.businessLocation;
        // Address is just the location now (no street address)
        const fullAddress = location;

        // Get emoji based on business category
        let emoji = "🏢";
        if (formData.businessCategory === "gym") emoji = "🏋️";
        else if (formData.businessCategory === "cafe") emoji = "☕";
        else if (formData.businessCategory === "bookstore") emoji = "📚";

        const { error: businessError } = await supabase
          .from("businesses")
          .insert([
            {
              name: formData.businessName,
              owner_name: `${formData.firstName} ${formData.lastName}`,
              owner_id: authData.user.id,
              business_type: formData.businessCategory,
              description: formData.businessDescription,
              price: 0,
              location: location,
              address: fullAddress,
              emoji: emoji,
              rating: 0,
              members_count: 0,
              status: "active",
              verification_status: "pending",
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
          ]);

        if (businessError) throw businessError;
      }

      setShowSuccess(true);

      setTimeout(() => {
        setShowSuccess(false);
        navigate("/login");
      }, 2000);
    } catch (error) {
      console.error("Registration failed:", error);
      setErrorMessage(
        error.message || "Registration failed. Please try again.",
      );
      setIsLoading(false);
    }
  };

  const getPasswordStrengthMessage = () => {
    if (!formData.password) return "";

    const missingCriteria = [];
    if (formData.password.length < 8) missingCriteria.push("8+ characters");
    if (!/(?=.*[a-z])/.test(formData.password))
      missingCriteria.push("lowercase");
    if (!/(?=.*[A-Z])/.test(formData.password))
      missingCriteria.push("uppercase");
    if (!/(?=.*\d)/.test(formData.password)) missingCriteria.push("number");
    if (!/(?=.*[!@#$%^&*(),.?":{}|<>])/.test(formData.password))
      missingCriteria.push("special character");

    if (missingCriteria.length === 0) return "✓ Strong password";
    return `Missing: ${missingCriteria.join(", ")}`;
  };

  const getPasswordStrengthColor = () => {
    if (passwordStrength === "strong") return "text-green-600";
    if (passwordStrength === "medium") return "text-yellow-600";
    if (passwordStrength === "weak") return "text-red-600";
    return "text-gray-500";
  };

  const getPasswordStrengthBar = () => {
    if (passwordStrength === "strong") return "bg-green-500";
    if (passwordStrength === "medium") return "bg-yellow-500";
    if (passwordStrength === "weak") return "bg-red-500";
    return "bg-gray-200";
  };

  const getInputClassName = (fieldName) => {
    let className =
      "w-full pl-12 pr-4 py-3 border rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all";

    if (touchedFields[fieldName] && fieldErrors[fieldName]) {
      className += " border-red-500 focus:ring-red-500";
    } else if (
      touchedFields[fieldName] &&
      formData[fieldName] &&
      !fieldErrors[fieldName]
    ) {
      if (fieldName !== "password" && fieldName !== "confirmPassword") {
        className += " border-green-500 focus:ring-green-500";
      } else {
        className += " border-gray-300";
      }
    } else {
      className += " border-gray-300";
    }

    return className;
  };

  const getSelectClassName = (fieldName) => {
    let className =
      "w-full pl-12 pr-4 py-3 border rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all appearance-none bg-white";

    if (touchedFields[fieldName] && fieldErrors[fieldName]) {
      className += " border-red-500 focus:ring-red-500";
    } else if (
      touchedFields[fieldName] &&
      formData[fieldName] &&
      !fieldErrors[fieldName]
    ) {
      className += " border-green-500 focus:ring-green-500";
    } else {
      className += " border-gray-300";
    }

    return className;
  };

  if (checkingStatus) {
    return (
      <div className="h-screen w-screen overflow-hidden bg-gradient-to-br from-slate-50 via-gray-50 to-gray-100 select-none">
        <div className="h-full w-full flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600 font-medium">
              Checking registration status...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!registrationsEnabled) {
    return (
      <div className="h-screen w-screen overflow-hidden bg-gradient-to-br from-slate-50 via-gray-50 to-gray-100 select-none">
        <div className="h-full w-full overflow-y-auto">
          <div className="min-h-full flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
              <div className="text-6xl mb-4">🔒</div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">
                Registration Closed
              </h2>
              <p className="text-gray-600 mb-6">
                New user registrations are currently disabled. Please check back
                later.
              </p>
              <button
                onClick={() => navigate("/login")}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Go to Login
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen overflow-hidden bg-gradient-to-br from-slate-50 via-gray-50 to-gray-100 select-none">
      {/* Decorative Elements */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-blue-500/5 rounded-full blur-3xl"></div>
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl"></div>

      <div className="h-full w-full overflow-y-auto">
        <div className="min-h-full flex items-center justify-center p-4">
          <div className="max-w-6xl w-full mx-auto">
            <div className="grid lg:grid-cols-2 gap-12">
              {/* Left Side - Branding */}
              <motion.div
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6 }}
                className="hidden lg:block"
              >
                <div className="space-y-8">
                  <div>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-24 h-24 rounded-2xl flex items-center justify-center overflow-hidden">
                        <img
                          src={logo}
                          alt="Memsphere Logo"
                          className="w-full h-full object-contain"
                        />
                      </div>
                      <div>
                        <h1 className="text-3xl font-bold text-gray-900">
                          Memsphere
                        </h1>
                        <p className="text-gray-500 text-sm">
                          Membership Management Platform
                        </p>
                      </div>
                    </div>
                    <p className="text-gray-600 text-lg">
                      Join our community and start your journey with us today.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {features.map((feature, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 + index * 0.1 }}
                        className="p-4 bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow"
                      >
                        <div
                          className={`w-10 h-10 rounded-xl bg-gradient-to-r ${feature.color} flex items-center justify-center mb-3`}
                        >
                          <feature.icon className="w-6 h-6 text-white" />
                        </div>
                        <div className="text-2xl font-bold text-gray-900 mb-1">
                          {feature.value}
                        </div>
                        <div className="text-xs text-gray-600">
                          {feature.text}
                        </div>
                      </motion.div>
                    ))}
                  </div>

                  <div className="space-y-3">
                    <p className="text-gray-800 text-sm font-semibold">
                      Why choose Memsphere?
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      {benefits.map((benefit, index) => (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.6 + index * 0.1 }}
                          className="flex items-center gap-2"
                        >
                          <CheckCircle className="w-4 h-4 text-green-500" />
                          <span className="text-sm text-gray-700 font-medium">
                            {benefit}
                          </span>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Right Side - Registration Form */}
              <motion.div
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6 }}
                className="bg-white rounded-2xl shadow-xl p-8"
              >
                <div className="text-center mb-8">
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 rounded-full mb-4">
                    <Sparkles className="w-4 h-4 text-blue-600" />
                    <span className="text-xs text-blue-600 font-medium">
                      Join Us
                    </span>
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    Create Account
                  </h2>
                  <p className="text-gray-500 text-sm">
                    Start your journey with Memsphere today
                  </p>
                </div>

                {/* Error Alert */}
                <AnimatePresence>
                  {errorMessage && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3"
                    >
                      <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                      <p className="text-sm text-red-600">{errorMessage}</p>
                    </motion.div>
                  )}
                </AnimatePresence>

                {showSuccess && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl flex items-start gap-3"
                  >
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                    <p className="text-sm text-green-600">
                      ✨ Registration successful! Redirecting to login...
                    </p>
                  </motion.div>
                )}

                <div className="flex gap-3 mb-6">
                  <button
                    className={`flex-1 py-2.5 rounded-xl font-semibold transition-all ${
                      activeTab === "client"
                        ? "bg-blue-600 text-white shadow-md"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                    onClick={() => handleTabChange("client")}
                  >
                    Client
                  </button>
                  <button
                    className={`flex-1 py-2.5 rounded-xl font-semibold transition-all ${
                      activeTab === "owner"
                        ? "bg-blue-600 text-white shadow-md"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                    onClick={() => handleTabChange("owner")}
                  >
                    Business Owner
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* First Name and Last Name */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        First Name
                      </label>
                      <div className="relative">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                          type="text"
                          name="firstName"
                          value={formData.firstName}
                          onChange={handleInputChange}
                          onFocus={() => setFocusedField("firstName")}
                          onBlur={() => handleBlur("firstName")}
                          placeholder="John"
                          disabled={isLoading}
                          className={getInputClassName("firstName")}
                        />
                      </div>
                      <AnimatePresence>
                        {touchedFields.firstName && fieldErrors.firstName && (
                          <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="text-xs text-red-500 mt-1 flex items-center gap-1"
                          >
                            <AlertCircle className="w-3 h-3" />{" "}
                            {fieldErrors.firstName}
                          </motion.p>
                        )}
                      </AnimatePresence>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Last Name
                      </label>
                      <div className="relative">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                          type="text"
                          name="lastName"
                          value={formData.lastName}
                          onChange={handleInputChange}
                          onFocus={() => setFocusedField("lastName")}
                          onBlur={() => handleBlur("lastName")}
                          placeholder="Doe"
                          disabled={isLoading}
                          className={getInputClassName("lastName")}
                        />
                      </div>
                      <AnimatePresence>
                        {touchedFields.lastName && fieldErrors.lastName && (
                          <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="text-xs text-red-500 mt-1 flex items-center gap-1"
                          >
                            <AlertCircle className="w-3 h-3" />{" "}
                            {fieldErrors.lastName}
                          </motion.p>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>

                  {/* Email Address */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        onFocus={() => setFocusedField("email")}
                        onBlur={() => handleBlur("email")}
                        placeholder="example@gmail.com"
                        disabled={isLoading}
                        className={getInputClassName("email")}
                      />
                    </div>
                    <AnimatePresence>
                      {touchedFields.email && fieldErrors.email && (
                        <motion.p
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="text-xs text-red-500 mt-1 flex items-center gap-1"
                        >
                          <AlertCircle className="w-3 h-3" />{" "}
                          {fieldErrors.email}
                        </motion.p>
                      )}
                    </AnimatePresence>
                    {touchedFields.email &&
                      formData.email &&
                      !fieldErrors.email && (
                        <p className="text-xs text-green-500 mt-1 flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" /> ✓ Valid Gmail
                          address
                        </p>
                      )}
                  </div>

                  {/* Mobile Number */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Mobile Number (PH Format)
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="tel"
                        name="mobile"
                        value={formData.mobile}
                        onChange={handleInputChange}
                        onFocus={() => setFocusedField("mobile")}
                        onBlur={() => handleBlur("mobile")}
                        placeholder="09171234567"
                        disabled={isLoading}
                        maxLength={11}
                        className={getInputClassName("mobile")}
                      />
                    </div>
                    <AnimatePresence>
                      {touchedFields.mobile && fieldErrors.mobile && (
                        <motion.p
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="text-xs text-red-500 mt-1 flex items-center gap-1"
                        >
                          <AlertCircle className="w-3 h-3" />{" "}
                          {fieldErrors.mobile}
                        </motion.p>
                      )}
                    </AnimatePresence>
                    {formData.mobile &&
                      formData.mobile.length > 0 &&
                      !fieldErrors.mobile && (
                        <p className="text-xs text-gray-500 mt-1">
                          Format: 09xxxxxxxxx (11 digits)
                        </p>
                      )}
                  </div>

                  {/* Owner-only fields */}
                  {activeTab === "owner" && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Business Name
                        </label>
                        <div className="relative">
                          <Building className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                          <input
                            type="text"
                            name="businessName"
                            value={formData.businessName}
                            onChange={handleInputChange}
                            onFocus={() => setFocusedField("businessName")}
                            onBlur={() => handleBlur("businessName")}
                            placeholder="My Awesome Business"
                            disabled={isLoading}
                            className={getInputClassName("businessName")}
                          />
                        </div>
                        <AnimatePresence>
                          {touchedFields.businessName &&
                            fieldErrors.businessName && (
                              <motion.p
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="text-xs text-red-500 mt-1 flex items-center gap-1"
                              >
                                <AlertCircle className="w-3 h-3" />{" "}
                                {fieldErrors.businessName}
                              </motion.p>
                            )}
                        </AnimatePresence>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Business Category
                        </label>
                        <div className="relative">
                          <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                          <select
                            name="businessCategory"
                            value={formData.businessCategory}
                            onChange={handleInputChange}
                            onFocus={() => setFocusedField("businessCategory")}
                            onBlur={() => handleBlur("businessCategory")}
                            disabled={isLoading}
                            className={getSelectClassName("businessCategory")}
                          >
                            <option value="">Select a category</option>
                            {businessCategories.map((cat) => (
                              <option key={cat.id} value={cat.id}>
                                {cat.icon} {cat.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        <AnimatePresence>
                          {touchedFields.businessCategory &&
                            fieldErrors.businessCategory && (
                              <motion.p
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="text-xs text-red-500 mt-1 flex items-center gap-1"
                              >
                                <AlertCircle className="w-3 h-3" />{" "}
                                {fieldErrors.businessCategory}
                              </motion.p>
                            )}
                        </AnimatePresence>
                      </div>

                      {/* Business Location - No Icons */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Business Location *
                        </label>
                        <div className="relative">
                          <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                          <select
                            name="businessLocation"
                            value={formData.businessLocation}
                            onChange={handleInputChange}
                            onFocus={() => setFocusedField("businessLocation")}
                            onBlur={() => handleBlur("businessLocation")}
                            disabled={isLoading}
                            className={getSelectClassName("businessLocation")}
                          >
                            <option value="">Select a location</option>
                            {businessLocations.map((loc) => (
                              <option key={loc.value} value={loc.value}>
                                {loc.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        <AnimatePresence>
                          {touchedFields.businessLocation &&
                            fieldErrors.businessLocation && (
                              <motion.p
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="text-xs text-red-500 mt-1 flex items-center gap-1"
                              >
                                <AlertCircle className="w-3 h-3" />{" "}
                                {fieldErrors.businessLocation}
                              </motion.p>
                            )}
                        </AnimatePresence>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Business Description
                        </label>
                        <textarea
                          name="businessDescription"
                          value={formData.businessDescription}
                          onChange={handleInputChange}
                          onFocus={() => setFocusedField("businessDescription")}
                          onBlur={() => handleBlur("businessDescription")}
                          placeholder="Describe your business, services, and what makes it special..."
                          disabled={isLoading}
                          rows="3"
                          className={`w-full px-4 py-3 border rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-none ${
                            touchedFields.businessDescription &&
                            fieldErrors.businessDescription
                              ? "border-red-500"
                              : "border-gray-300"
                          }`}
                        />
                        <AnimatePresence>
                          {touchedFields.businessDescription &&
                            fieldErrors.businessDescription && (
                              <motion.p
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="text-xs text-red-500 mt-1 flex items-center gap-1"
                              >
                                <AlertCircle className="w-3 h-3" />{" "}
                                {fieldErrors.businessDescription}
                              </motion.p>
                            )}
                        </AnimatePresence>
                      </div>
                    </>
                  )}

                  {/* Password */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type={showPassword ? "text" : "password"}
                        name="password"
                        value={formData.password}
                        onChange={handleInputChange}
                        onFocus={() => setFocusedField("password")}
                        onBlur={() => handleBlur("password")}
                        placeholder="Enter your password"
                        disabled={isLoading}
                        className={`w-full pl-12 pr-12 py-3 border rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${
                          touchedFields.password && fieldErrors.password
                            ? "border-red-500"
                            : "border-gray-300"
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => togglePasswordVisibility("password")}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        {showPassword ? (
                          <EyeOff className="w-5 h-5" />
                        ) : (
                          <Eye className="w-5 h-5" />
                        )}
                      </button>
                    </div>
                    {formData.password && (
                      <div className="mt-2">
                        <div className="flex gap-1 h-1 mb-1">
                          <div
                            className={`flex-1 rounded-full ${getPasswordStrengthBar()}`}
                          ></div>
                          <div
                            className={`flex-1 rounded-full ${passwordStrength === "strong" ? "bg-green-500" : passwordStrength === "medium" ? "bg-yellow-500" : "bg-gray-200"}`}
                          ></div>
                          <div
                            className={`flex-1 rounded-full ${passwordStrength === "strong" ? "bg-green-500" : "bg-gray-200"}`}
                          ></div>
                        </div>
                        <p className={`text-xs ${getPasswordStrengthColor()}`}>
                          {getPasswordStrengthMessage()}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Confirm Password */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Confirm Password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        name="confirmPassword"
                        value={formData.confirmPassword}
                        onChange={handleInputChange}
                        onFocus={() => setFocusedField("confirmPassword")}
                        onBlur={() => handleBlur("confirmPassword")}
                        placeholder="Confirm your password"
                        disabled={isLoading}
                        className={`w-full pl-12 pr-12 py-3 border rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${
                          touchedFields.confirmPassword &&
                          fieldErrors.confirmPassword
                            ? "border-red-500"
                            : "border-gray-300"
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => togglePasswordVisibility("confirm")}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="w-5 h-5" />
                        ) : (
                          <Eye className="w-5 h-5" />
                        )}
                      </button>
                    </div>
                    <AnimatePresence>
                      {touchedFields.confirmPassword &&
                        formData.password !== formData.confirmPassword && (
                          <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="text-xs text-red-500 mt-1 flex items-center gap-1"
                          >
                            <AlertCircle className="w-3 h-3" /> Passwords do not
                            match
                          </motion.p>
                        )}
                    </AnimatePresence>
                  </div>

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        REGISTERING...
                      </>
                    ) : (
                      <>
                        {activeTab === "owner"
                          ? "REGISTER AS OWNER"
                          : "REGISTER AS CLIENT"}
                        <ArrowRight className="w-5 h-5" />
                      </>
                    )}
                  </motion.button>
                </form>

                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200"></div>
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="px-4 bg-white text-gray-500">
                      Already have an account?
                    </span>
                  </div>
                </div>

                <div className="text-center">
                  <Link
                    to="/login"
                    className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium transition-colors group"
                  >
                    Sign in
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;