import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import "../styles/Register.css";

const RegisterPage = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("client");
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [focusedField, setFocusedField] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [touchedFields, setTouchedFields] = useState({});
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    mobile: "",
    businessName: "",
    businessCategory: "",
    businessAddress: "",
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
    businessAddress: "",
    businessDescription: "",
  });

  const [passwordStrength, setPasswordStrength] = useState("");

  // Business categories
  const businessCategories = [
    { id: "gym", label: "Gym / Fitness Center", icon: "🏋️" },
    { id: "cafe", label: "Cafe / Coffee Shop", icon: "☕" },
    { id: "bakery", label: "Bakery / Pastry Shop", icon: "🥐" },
  ];

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

      if (length < 6) setPasswordStrength("weak");
      else if (length >= 6 && metCriteria <= 2) setPasswordStrength("weak");
      else if (length >= 6 && metCriteria === 3) setPasswordStrength("medium");
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
      validateField("businessAddress");
      validateField("businessDescription");
    }
  }, [
    formData.firstName,
    formData.lastName,
    formData.email,
    formData.mobile,
    formData.businessName,
    formData.businessCategory,
    formData.businessAddress,
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

      case "businessAddress":
        if (activeTab === "owner" && !formData.businessAddress.trim()) {
          errorMessage = "Business address is required";
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

  const validateForm = () => {
    // First Name validation
    if (!formData.firstName.trim()) {
      alert("First name is required");
      return false;
    } else if (!/^[A-Za-z\s.-]+$/.test(formData.firstName)) {
      alert(
        "First name can only contain letters, spaces, dots (.) and hyphens (-)",
      );
      return false;
    }

    // Last Name validation
    if (!formData.lastName.trim()) {
      alert("Last name is required");
      return false;
    } else if (!/^[A-Za-z\s.-]+$/.test(formData.lastName)) {
      alert(
        "Last name can only contain letters, spaces, dots (.) and hyphens (-)",
      );
      return false;
    }

    // Email validation - STRICT GMAIL ONLY
    if (!formData.email.trim()) {
      alert("Email is required");
      return false;
    } else if (!/^[a-zA-Z0-9._%+-]+@gmail\.com$/.test(formData.email)) {
      alert("Please enter a valid Gmail address (example@gmail.com)");
      return false;
    }

    // Mobile validation
    if (!formData.mobile) {
      alert("Mobile number is required");
      return false;
    } else if (!/^09\d{9}$/.test(formData.mobile)) {
      alert("Please enter a valid PH mobile number (09xxxxxxxxx - 11 digits)");
      return false;
    }

    // Owner fields validation
    if (activeTab === "owner") {
      if (!formData.businessName.trim()) {
        alert("Business name is required");
        return false;
      }
      if (!formData.businessCategory) {
        alert("Please select a business category");
        return false;
      }
      if (!formData.businessAddress.trim()) {
        alert("Business address is required");
        return false;
      }
      if (!formData.businessDescription.trim()) {
        alert("Business description is required");
        return false;
      }
    }

    // Password validation
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

    // Confirm Password validation
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
        "businessAddress",
        "businessDescription",
      );
    }

    const touched = {};
    allFields.forEach((field) => {
      touched[field] = true;
    });
    setTouchedFields(touched);

    if (!validateForm()) return;

    setIsLoading(true);

    try {
      console.log("Starting registration with mobile:", formData.mobile);

      // Sign up with Supabase Auth - include ALL metadata for the trigger
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            first_name: formData.firstName,
            last_name: formData.lastName,
            mobile: formData.mobile, // This is now properly included
            user_type: activeTab,
            business_name: activeTab === "owner" ? formData.businessName : null,
          },
          emailRedirectTo: `${window.location.origin}/login`,
        },
      });

      if (authError) {
        console.error("Auth error:", authError);
        throw authError;
      }

      if (authData.user) {
        console.log("User created successfully:", authData.user.id);

        // Small delay to let the trigger complete
        await new Promise((resolve) => setTimeout(resolve, 1000));

        // If registering as owner, create business entry
        if (activeTab === "owner") {
          // Extract location from address
          const location =
            formData.businessAddress.split(",").pop().trim() || "Downtown";

          // Create business entry
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
                address: formData.businessAddress,
                emoji:
                  formData.businessCategory === "gym"
                    ? "🏋️"
                    : formData.businessCategory === "cafe"
                      ? "☕"
                      : "🥐",
                rating: 0,
                members_count: 0,
                status: "active",
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              },
            ]);

          if (businessError) {
            console.error("Business creation error:", businessError);
            throw businessError;
          }

          console.log("Business created successfully");
        }
      }

      console.log("Registration successful!");
      setShowSuccess(true);

      // Redirect to login after 3 seconds
      setTimeout(() => {
        setShowSuccess(false);
        setFormData({
          firstName: "",
          lastName: "",
          email: "",
          mobile: "",
          businessName: "",
          businessCategory: "",
          businessAddress: "",
          businessDescription: "",
          password: "",
          confirmPassword: "",
        });
        setTouchedFields({});
        setFieldErrors({
          firstName: "",
          lastName: "",
          email: "",
          mobile: "",
          businessName: "",
          businessCategory: "",
          businessAddress: "",
          businessDescription: "",
        });
        navigate("/login");
      }, 3000);
    } catch (error) {
      console.error("Registration failed:", error);

      if (error.message.includes("User already registered")) {
        alert(
          "This email is already registered. Please try logging in instead.",
        );
      } else {
        alert(error.message || "Registration failed. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignInClick = (e) => {
    e.preventDefault();
    navigate("/login");
  };

  const getInputClassName = (fieldName) => {
    let className = "input-group";
    if (focusedField === fieldName) className += " focused";

    if (touchedFields[fieldName] && fieldErrors[fieldName]) {
      className += " error";
    } else if (
      touchedFields[fieldName] &&
      formData[fieldName] &&
      !fieldErrors[fieldName]
    ) {
      if (fieldName !== "password" && fieldName !== "confirmPassword") {
        className += " valid";
      }
    }

    return className;
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

  return (
    <div className="register-container">
      {/* Left Side - Branding */}
      <div className="register-brand">
        <div className="brand-content">
          <div className="brand-title">
            <span className="logo-icon">
              <svg
                width="48"
                height="48"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M12 2L2 7L12 12L22 7L12 2Z"
                  stroke="white"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M2 17L12 22L22 17"
                  stroke="white"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M2 12L12 17L22 12"
                  stroke="white"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <circle cx="12" cy="12" r="2" fill="white" />
              </svg>
            </span>
            <span>Memsphere</span>
          </div>
          <h2>Welcome to Memsphere</h2>
          <p>Join our community and start your journey with us today.</p>

          <div className="brand-features">
            <div className="brand-feature">
              <span className="feature-icon">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M20 6L9 17L4 12"
                    stroke="white"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
              <span className="feature-text">Secure and encrypted data</span>
            </div>

            <div className="brand-feature">
              <span className="feature-icon">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M20 6L9 17L4 12"
                    stroke="white"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
              <span className="feature-text">Easy to use platform</span>
            </div>

            <div className="brand-feature">
              <span className="feature-icon">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M20 6L9 17L4 12"
                    stroke="white"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
              <span className="feature-text">24/7 customer support</span>
            </div>

            <div className="brand-feature">
              <span className="feature-icon">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M20 6L9 17L4 12"
                    stroke="white"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
              <span className="feature-text">Free 30-day trial</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Registration Form */}
      <div className="register-form-container">
        <div className="app-header">
          <div className="logo-container">
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="logo-svg"
            >
              <path
                d="M12 2L2 7L12 12L22 7L12 2Z"
                stroke="#00b4ff"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M2 17L12 22L22 17"
                stroke="#00b4ff"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M2 12L12 17L22 12"
                stroke="#00b4ff"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle cx="12" cy="12" r="2" fill="#00b4ff" />
            </svg>
            <h1 className="logo">Memsphere</h1>
          </div>
          <h2 className="register-title">Register</h2>
        </div>

        {showSuccess && (
          <div className="success-message">
            ✨ Registration successful! Redirecting to login...
          </div>
        )}

        <div className="tab-selector">
          <button
            className={`tab-btn ${activeTab === "client" ? "active" : ""}`}
            onClick={() => setActiveTab("client")}
          >
            Client
          </button>
          <button
            className={`tab-btn ${activeTab === "owner" ? "active" : ""}`}
            onClick={() => setActiveTab("owner")}
          >
            Business Owner
          </button>
        </div>

        <form onSubmit={handleSubmit} className="register-form">
          {/* First Name and Last Name */}
          <div className="name-row">
            <div className={getInputClassName("firstName")}>
              <label>FIRST NAME</label>
              <input
                type="text"
                name="firstName"
                value={formData.firstName}
                onChange={handleInputChange}
                onFocus={() => setFocusedField("firstName")}
                onBlur={() => handleBlur("firstName")}
                placeholder="John"
                disabled={isLoading}
                maxLength={50}
              />
              {touchedFields.firstName && fieldErrors.firstName && (
                <span className="error-hint">{fieldErrors.firstName}</span>
              )}
            </div>

            <div className={getInputClassName("lastName")}>
              <label>LAST NAME</label>
              <input
                type="text"
                name="lastName"
                value={formData.lastName}
                onChange={handleInputChange}
                onFocus={() => setFocusedField("lastName")}
                onBlur={() => handleBlur("lastName")}
                placeholder="Doe"
                disabled={isLoading}
                maxLength={50}
              />
              {touchedFields.lastName && fieldErrors.lastName && (
                <span className="error-hint">{fieldErrors.lastName}</span>
              )}
            </div>
          </div>

          {/* Email Address */}
          <div className={getInputClassName("email")}>
            <label>EMAIL ADDRESS</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              onFocus={() => setFocusedField("email")}
              onBlur={() => handleBlur("email")}
              placeholder="example@gmail.com"
              disabled={isLoading}
            />
            {touchedFields.email && fieldErrors.email && (
              <span className="error-hint">{fieldErrors.email}</span>
            )}
            {touchedFields.email && formData.email && !fieldErrors.email && (
              <span className="valid-hint">✓ Valid Gmail address</span>
            )}
          </div>

          {/* Mobile Number */}
          <div className={getInputClassName("mobile")}>
            <label>MOBILE NUMBER (PH Format)</label>
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
            />
            {touchedFields.mobile && fieldErrors.mobile && (
              <span className="error-hint">{fieldErrors.mobile}</span>
            )}
            {formData.mobile &&
              formData.mobile.length > 0 &&
              !fieldErrors.mobile && (
                <span className="hint-text">
                  Format: 09xxxxxxxxx (11 digits)
                </span>
              )}
          </div>

          {/* Owner-only fields */}
          {activeTab === "owner" && (
            <>
              <div className={getInputClassName("businessName")}>
                <label>BUSINESS NAME</label>
                <input
                  type="text"
                  name="businessName"
                  value={formData.businessName}
                  onChange={handleInputChange}
                  onFocus={() => setFocusedField("businessName")}
                  onBlur={() => handleBlur("businessName")}
                  placeholder="My Awesome Business"
                  disabled={isLoading}
                />
                {touchedFields.businessName && fieldErrors.businessName && (
                  <span className="error-hint">{fieldErrors.businessName}</span>
                )}
              </div>

              <div className={getInputClassName("businessCategory")}>
                <label>BUSINESS CATEGORY</label>
                <select
                  name="businessCategory"
                  value={formData.businessCategory}
                  onChange={handleInputChange}
                  onFocus={() => setFocusedField("businessCategory")}
                  onBlur={() => handleBlur("businessCategory")}
                  disabled={isLoading}
                  className="select-input"
                >
                  <option value="">Select a category</option>
                  {businessCategories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.icon} {cat.label}
                    </option>
                  ))}
                </select>
                {touchedFields.businessCategory &&
                  fieldErrors.businessCategory && (
                    <span className="error-hint">
                      {fieldErrors.businessCategory}
                    </span>
                  )}
              </div>

              <div className={getInputClassName("businessAddress")}>
                <label>BUSINESS ADDRESS</label>
                <input
                  type="text"
                  name="businessAddress"
                  value={formData.businessAddress}
                  onChange={handleInputChange}
                  onFocus={() => setFocusedField("businessAddress")}
                  onBlur={() => handleBlur("businessAddress")}
                  placeholder="123 Main St, Downtown, City"
                  disabled={isLoading}
                />
                {touchedFields.businessAddress &&
                  fieldErrors.businessAddress && (
                    <span className="error-hint">
                      {fieldErrors.businessAddress}
                    </span>
                  )}
              </div>

              <div className={getInputClassName("businessDescription")}>
                <label>BUSINESS DESCRIPTION</label>
                <textarea
                  name="businessDescription"
                  value={formData.businessDescription}
                  onChange={handleInputChange}
                  onFocus={() => setFocusedField("businessDescription")}
                  onBlur={() => handleBlur("businessDescription")}
                  placeholder="Describe your business, services, and what makes it special..."
                  disabled={isLoading}
                  rows="3"
                  className="textarea-input"
                />
                {touchedFields.businessDescription &&
                  fieldErrors.businessDescription && (
                    <span className="error-hint">
                      {fieldErrors.businessDescription}
                    </span>
                  )}
              </div>
            </>
          )}

          {/* Password */}
          <div className={getInputClassName("password")}>
            <label>PASSWORD</label>
            <div className="password-input-wrapper">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                onFocus={() => setFocusedField("password")}
                onBlur={() => handleBlur("password")}
                placeholder="••••••••"
                disabled={isLoading}
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => togglePasswordVisibility("password")}
                tabIndex="-1"
              >
                {showPassword ? "👁️" : "👁️‍🗨️"}
              </button>
            </div>
            {formData.password && (
              <>
                <div className="password-strength">
                  <div className={`strength-bar ${passwordStrength}`}></div>
                </div>
                <div className={`strength-text ${passwordStrength}`}>
                  {getPasswordStrengthMessage()}
                </div>
              </>
            )}
          </div>

          {/* Confirm Password */}
          <div className={getInputClassName("confirmPassword")}>
            <label>CONFIRM PASSWORD</label>
            <div className="password-input-wrapper">
              <input
                type={showConfirmPassword ? "text" : "password"}
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                onFocus={() => setFocusedField("confirmPassword")}
                onBlur={() => handleBlur("confirmPassword")}
                placeholder="••••••••"
                disabled={isLoading}
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => togglePasswordVisibility("confirm")}
                tabIndex="-1"
              >
                {showConfirmPassword ? "👁️" : "👁️‍🗨️"}
              </button>
            </div>
            {touchedFields.confirmPassword &&
              formData.password !== formData.confirmPassword && (
                <span className="error-hint">Passwords do not match</span>
              )}
          </div>

          {/* Register Button */}
          <button type="submit" className="register-btn" disabled={isLoading}>
            {isLoading ? (
              <>
                <span className="btn-spinner"></span>
                REGISTERING...
              </>
            ) : activeTab === "owner" ? (
              "REGISTER AS OWNER"
            ) : (
              "REGISTER AS CLIENT"
            )}
          </button>
        </form>

        {/* Login Redirect */}
        <div className="login-redirect">
          Already have an account?{" "}
          <a href="/login" onClick={handleSignInClick}>
            Sign in
          </a>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
