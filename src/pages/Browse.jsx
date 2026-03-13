import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import ClientNavbar from "../components/client/ClientNavbar";
import "../styles/Browse.css";

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
    paymentMethod: ''
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

  const navigate = useNavigate();

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
    }
  }, [selectedBusinessType, user]);

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

  const fetchBusinesses = async () => {
    try {
      setLoading(true);

      let query = supabase
        .from("businesses")
        .select("*")
        .eq("status", "active");

      if (selectedBusinessType !== "all") {
        query = query.eq("business_type", selectedBusinessType);
      }

      const { data: businessesData, error: businessesError } = await query;

      if (businessesError) throw businessesError;

      setBusinesses(businessesData || []);

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
    } finally {
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

      // Create membership with correct field name: receipt_path (not receipt_url)
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
        receipt_path: receiptPath, // Fixed: changed from receipt_url to receipt_path
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
        paymentMethod: selectedPaymentMethod
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

  if (loading) {
    return (
      <div className="browse-loading">
        <div className="loading-spinner"></div>
        <p>Loading businesses...</p>
      </div>
    );
  }

  const firstName = getFirstName();

  return (
    <div className="browse-container">
      <ClientNavbar profile={profile} avatarUrl={avatarUrl} />

      <div className="mobile-welcome">
        <p>Welcome, {firstName}!</p>
      </div>

      <div className="browse-main">
        <div className="browse-header">
          <h1 className="browse-title">
            Find Your Perfect Business
            <span className="title-glow"></span>
          </h1>
          <p className="browse-subtitle">
            Discover and explore the best gyms, cafes, and bakeries near you
          </p>
        </div>

        <div className="search-section">
          <div className="search-container">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              placeholder={`Search ${selectedBusinessType === "all" ? "businesses" : selectedBusinessType + "s"} by name or owner...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
            {searchQuery && (
              <button
                className="clear-search"
                onClick={() => setSearchQuery("")}
              >
                ✕
              </button>
            )}
          </div>
        </div>

        <div className="business-type-section">
          <div className="business-type-scroll">
            {businessTypes.map((type) => (
              <button
                key={type.id}
                className={`business-type-chip ${selectedBusinessType === type.id ? "active" : ""}`}
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

        <div className="filters-bar">
          <div className="filter-group">
            <span className="filter-label">📍 Location:</span>
            <select
              className="filter-select"
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

          <div className="filter-group">
            <span className="filter-label">💰 Price Range (₱):</span>
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
              <span className="price-value">
                ₱{priceRange[0].toLocaleString()} - ₱
                {priceRange[1].toLocaleString()}
              </span>
            </div>
          </div>

          <div className="filter-group">
            <span className="results-count">
              {filteredBusinesses.length} businesses found
            </span>
          </div>
        </div>

        <div className="business-grid">
          {filteredBusinesses.length > 0 ? (
            filteredBusinesses.map((business) => (
              <div key={business.id} className="business-card">
                <div className="business-card-glow"></div>
                <div className="business-card-content">
                  <div className="business-card-header">
                    <div className="business-image-large">
                      {business.image_url ? (
                        <img
                          src={business.image_url}
                          alt={business.name}
                          className="business-image"
                        />
                      ) : (
                        <span className="business-emoji">
                          {getBusinessIcon(business)}
                        </span>
                      )}
                    </div>
                    <div className="business-card-tags">
                      <span className="business-type-tag">
                        {business.business_type}
                      </span>
                      <span className="business-rating-tag">
                        <span className="rating-star">⭐</span>
                        {business.rating || "0.0"}
                      </span>
                    </div>
                  </div>

                  <div className="business-card-body">
                    <h3 className="business-card-title">{business.name}</h3>
                    <p className="business-card-owner">
                      <span className="owner-icon">👑</span>
                      {business.owner_name}
                    </p>
                    <p className="business-card-description">
                      {business.short_description ||
                        business.description?.substring(0, 100)}
                      ...
                    </p>

                    <div className="business-card-details">
                      <div className="business-detail-item">
                        <span className="detail-icon">📍</span>
                        <span className="detail-text">{business.location}</span>
                      </div>
                      <div className="business-detail-item">
                        <span className="detail-icon">👥</span>
                        <span className="detail-text">
                          {business.members_count || 0} members
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="business-card-footer">
                    <div className="business-price">
                      <span className="price-amount">
                        ₱{business.price?.toLocaleString()}
                      </span>
                      <span className="price-period">/month</span>
                    </div>
                    <button
                      className="view-details-btn"
                      onClick={() => handleViewDetails(business)}
                    >
                      <span>View Details</span>
                      <span className="btn-icon">→</span>
                    </button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="no-results">
              <span className="no-results-icon">🔍</span>
              <h3>No businesses found</h3>
              <p>Try adjusting your filters or search query</p>
              <button
                className="clear-filters-btn"
                onClick={() => {
                  setSearchQuery("");
                  setSelectedBusinessType("all");
                  setSelectedLocation("All Locations");
                  setPriceRange([0, 10000]);
                }}
              >
                Clear All Filters
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Business Details Modal */}
      {showBusinessModal && selectedBusiness && (
        <div
          className="business-modal-overlay"
          onClick={() => {
            setShowBusinessModal(false);
            setGcashQrUrl("");
          }}
        >
          <div
            className="business-modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="modal-close-btn"
              onClick={() => {
                setShowBusinessModal(false);
                setGcashQrUrl("");
              }}
            >
              ×
            </button>

            <div className="modal-header">
              <div className="modal-business-icon">
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
                <h2>{selectedBusiness.name}</h2>
                <p className="modal-owner">
                  <span className="owner-icon">👑</span>
                  {selectedBusiness.owner_name}
                </p>
                <div className="modal-tags">
                  <span className="modal-type-tag">
                    {selectedBusiness.business_type}
                  </span>
                  <span className="modal-rating-tag">
                    <span className="rating-star">⭐</span>
                    {selectedBusiness.rating || "0.0"} (
                    {selectedBusiness.members_count || 0} members)
                  </span>
                </div>
              </div>
            </div>

            <div className="modal-body">
              <div className="modal-section">
                <h3>📍 Location</h3>
                <p>{selectedBusiness.address || selectedBusiness.location}</p>
                <p className="location-detail">
                  {selectedBusiness.city}, {selectedBusiness.province}
                </p>
              </div>

              <div className="modal-section">
                <h3>📝 Description</h3>
                <p>{selectedBusiness.description}</p>
              </div>

              <div className="modal-section">
                <h3>⏰ Business Hours</h3>
                {formatBusinessHours(selectedBusiness.business_hours)}
              </div>

              {selectedBusiness.amenities &&
                selectedBusiness.amenities.length > 0 && (
                  <div className="modal-section">
                    <h3>✨ Amenities</h3>
                    <div className="amenities-grid">
                      {formatAmenities(selectedBusiness.amenities).map(
                        (amenity, index) => (
                          <div key={index} className="amenity-item">
                            <span className="amenity-check">✓</span>
                            {amenity}
                          </div>
                        ),
                      )}
                    </div>
                  </div>
                )}

              <div className="modal-section">
                <h3>📞 Contact Information</h3>
                <div className="contact-info">
                  {selectedBusiness.contact_phone && (
                    <p>
                      <span className="contact-icon">📱</span>{" "}
                      {selectedBusiness.contact_phone}
                    </p>
                  )}
                  {selectedBusiness.contact_email && (
                    <p>
                      <span className="contact-icon">✉️</span>{" "}
                      {selectedBusiness.contact_email}
                    </p>
                  )}
                  {selectedBusiness.website && (
                    <p>
                      <span className="contact-icon">🌐</span>{" "}
                      {selectedBusiness.website}
                    </p>
                  )}
                </div>
              </div>

              <div className="modal-section">
                <h3>💳 Payment Options</h3>
                <div className="payment-options-grid">
                  <div className="payment-option-card">
                    <div className="payment-option-header">
                      <span className="payment-option-icon">📱</span>
                      <span className="payment-option-title">GCash</span>
                      {selectedBusiness.gcash_qr_code ? (
                        <span className="payment-option-badge available">
                          Available
                        </span>
                      ) : (
                        <span className="payment-option-badge unavailable">
                          Not Available
                        </span>
                      )}
                    </div>
                    {selectedBusiness.gcash_qr_code ? (
                      <div className="payment-option-preview">
                        <p className="payment-instruction">
                          Scan QR code to pay via GCash
                        </p>
                        <button
                          className="view-payment-btn"
                          onClick={() => handlePaymentOption("gcash")}
                        >
                          View QR Code
                        </button>
                      </div>
                    ) : (
                      <div className="payment-unavailable">
                        <p>GCash payment not available</p>
                      </div>
                    )}
                  </div>

                  <div className="payment-option-card">
                    <div className="payment-option-header">
                      <span className="payment-option-icon">🏪</span>
                      <span className="payment-option-title">
                        Pay at Business
                      </span>
                      <span className="payment-option-badge available">
                        Available
                      </span>
                    </div>
                    <div className="payment-option-preview">
                      <p className="payment-instruction">
                        Pay directly at the business premises
                      </p>
                      <button
                        className="view-payment-btn"
                        onClick={() => handlePaymentOption("onsite")}
                      >
                        View Details
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="modal-section">
                <h3>💎 Membership Plans</h3>
                {selectedBusiness.plans && selectedBusiness.plans.length > 0 ? (
                  <div className="plans-grid">
                    {selectedBusiness.plans.map((plan) => (
                      <div key={plan.id} className="plan-card">
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
                          className="join-plan-btn"
                          onClick={() =>
                            handleJoinNow(selectedBusiness.id, plan)
                          }
                          disabled={joiningPlan === plan.id}
                        >
                          {joiningPlan === plan.id
                            ? "Processing..."
                            : "Join Now"}
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="no-plans-message">
                    <p>No membership plans available for this business yet.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Payment Form Modal */}
      {showPaymentFormModal && selectedPlanForPayment && (
        <div
          className="payment-modal-overlay"
          onClick={() => setShowPaymentFormModal(false)}
        >
          <div
            className="payment-modal-content payment-form-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="payment-modal-close"
              onClick={() => setShowPaymentFormModal(false)}
            >
              ×
            </button>

            <div className="payment-modal-header">
              <span className="payment-modal-icon">💳</span>
              <h2>Complete Your Membership</h2>
            </div>

            <div className="payment-form-content">
              <div className="membership-summary-card">
                <h3>Membership Summary</h3>
                <div className="summary-row">
                  <span className="summary-label">Plan:</span>
                  <span className="summary-value">
                    {selectedPlanForPayment.name}
                  </span>
                </div>
                <div className="summary-row">
                  <span className="summary-label">Price:</span>
                  <span className="summary-value price">
                    ₱{selectedPlanForPayment.price.toLocaleString()}/
                    {selectedPlanForPayment.duration}
                  </span>
                </div>
                <div className="summary-row">
                  <span className="summary-label">Duration:</span>
                  <span className="summary-value">
                    {selectedPlanForPayment.duration}
                  </span>
                </div>
              </div>

              <div className="client-details-card">
                <h3>Your Information</h3>
                <div className="details-row">
                  <span className="details-label">Name:</span>
                  <span className="details-value">
                    {profile?.first_name} {profile?.last_name}
                  </span>
                </div>
                <div className="details-row">
                  <span className="details-label">Email:</span>
                  <span className="details-value">
                    {profile?.email || user?.email}
                  </span>
                </div>
                <div className="details-row">
                  <span className="details-label">Phone:</span>
                  <span className="details-value">
                    {profile?.mobile || "Not provided"}
                  </span>
                </div>
              </div>

              <div className="payment-method-section">
                <h3>Select Payment Method</h3>
                <div className="payment-method-options">
                  <label
                    className={`payment-method-card ${paymentFormData.paymentMethod === "gcash" ? "selected" : ""}`}
                  >
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="gcash"
                      checked={paymentFormData.paymentMethod === "gcash"}
                      onChange={() => handlePaymentMethodSelect("gcash")}
                    />
                    <div className="payment-method-content">
                      <span className="method-icon">📱</span>
                      <div className="method-info">
                        <span className="method-name">GCash</span>
                        <span className="method-description">
                          Pay via GCash and upload receipt
                        </span>
                      </div>
                    </div>
                  </label>

                  <label
                    className={`payment-method-card ${paymentFormData.paymentMethod === "onsite" ? "selected" : ""}`}
                  >
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="onsite"
                      checked={paymentFormData.paymentMethod === "onsite"}
                      onChange={() => handlePaymentMethodSelect("onsite")}
                    />
                    <div className="payment-method-content">
                      <span className="method-icon">🏪</span>
                      <div className="method-info">
                        <span className="method-name">Pay at Business</span>
                        <span className="method-description">
                          Pay directly at the business premises
                        </span>
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              {paymentFormData.paymentMethod === "gcash" && (
                <div className="receipt-upload-section">
                  <h3>Upload Payment Receipt</h3>
                  <p className="upload-instruction">
                    Please upload a screenshot of your GCash payment
                    confirmation
                  </p>

                  {!paymentFormData.receiptPreview ? (
                    <div className="upload-area">
                      <input
                        type="file"
                        id="receipt-upload"
                        accept="image/*"
                        onChange={handleReceiptUpload}
                        className="file-input"
                        disabled={uploadingReceipt}
                      />
                      <label htmlFor="receipt-upload" className="upload-label">
                        <span className="upload-icon">📎</span>
                        <span className="upload-text">
                          Click to upload receipt
                        </span>
                        <span className="upload-hint">PNG, JPG up to 5MB</span>
                      </label>
                    </div>
                  ) : (
                    <div className="receipt-preview">
                      <img
                        src={paymentFormData.receiptPreview}
                        alt="Receipt preview"
                      />
                      <button
                        className="remove-receipt-btn"
                        onClick={removeReceipt}
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </div>
              )}

              <div className="terms-section">
                <label className="terms-checkbox">
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
                  <span>
                    I agree to the{" "}
                    <a href="#" onClick={(e) => e.preventDefault()}>
                      terms and conditions
                    </a>{" "}
                    and confirm that the information provided is accurate
                  </span>
                </label>
              </div>

              <button
                className="submit-payment-btn"
                onClick={handleSubmitPayment}
                disabled={submittingPayment}
              >
                {submittingPayment ? "Processing..." : "Submit Application"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && selectedPaymentMethod && (
        <div
          className="payment-modal-overlay"
          onClick={() => {
            setShowPaymentModal(false);
            setSelectedPaymentMethod(null);
          }}
        >
          <div
            className="payment-modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="payment-modal-close"
              onClick={() => {
                setShowPaymentModal(false);
                setSelectedPaymentMethod(null);
              }}
            >
              ×
            </button>

            {selectedPaymentMethod === "gcash" &&
              selectedBusiness?.gcash_qr_code && (
                <>
                  <div className="payment-modal-header">
                    <span className="payment-modal-icon">📱</span>
                    <h2>GCash Payment</h2>
                  </div>

                  <div className="gcash-payment-content">
                    <div className="qr-code-container">
                      {gcashQrUrl ? (
                        <img
                          src={gcashQrUrl}
                          alt="GCash QR Code"
                          className="gcash-qr-large"
                        />
                      ) : (
                        <div className="qr-loading">Loading QR code...</div>
                      )}
                    </div>

                    {selectedBusiness.gcash_number && (
                      <div className="gcash-number-container">
                        <span className="gcash-number-label">
                          GCash Number:
                        </span>
                        <span className="gcash-number-value">
                          {selectedBusiness.gcash_number}
                        </span>
                      </div>
                    )}

                    <div className="payment-steps">
                      <h3>How to pay with GCash:</h3>
                      <ol className="steps-list">
                        <li>Open your GCash app</li>
                        <li>Tap on "Scan QR"</li>
                        <li>Scan the QR code above</li>
                        <li>
                          Enter the exact amount: ₱
                          {selectedPlanForPayment?.price?.toLocaleString() ||
                            "Plan price"}
                        </li>
                        <li>Confirm payment</li>
                        <li>Take a screenshot of the confirmation</li>
                      </ol>
                    </div>

                    <div className="payment-note">
                      <p>
                        ⚠️ Please screenshot the payment confirmation. You'll
                        need to upload it when applying.
                      </p>
                    </div>
                  </div>
                </>
              )}

            {selectedPaymentMethod === "onsite" && (
              <>
                <div className="payment-modal-header">
                  <span className="payment-modal-icon">🏪</span>
                  <h2>Pay at Business</h2>
                </div>

                <div className="onsite-payment-content">
                  <div className="business-address-card">
                    <h3>Business Location</h3>
                    <p className="business-name">{selectedBusiness?.name}</p>
                    <p className="business-address">
                      {selectedBusiness?.address || selectedBusiness?.location}
                    </p>
                    <p className="business-city">
                      {selectedBusiness?.city}, {selectedBusiness?.province}
                    </p>
                  </div>

                  <div className="payment-steps">
                    <h3>How to pay on-site:</h3>
                    <ol className="steps-list">
                      <li>Visit the business at the address above</li>
                      <li>
                        Inform the staff that you're applying for a membership
                      </li>
                      <li>Proceed to the counter to make your payment</li>
                      <li>Keep the receipt as proof of payment</li>
                    </ol>
                  </div>

                  <div className="business-hours-summary">
                    <h3>Business Hours</h3>
                    {formatBusinessHours(selectedBusiness?.business_hours)}
                  </div>
                </div>
              </>
            )}

            <div className="payment-modal-actions">
              <button
                className="payment-modal-btn primary"
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
          className="success-modal-overlay"
          onClick={() => setShowSuccessModal(false)}
        >
          <div
            className="success-modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="success-modal-close"
              onClick={() => setShowSuccessModal(false)}
            >
              ×
            </button>

            <div className="success-modal-icon">
              {successData.paymentMethod === "gcash" ? "📱" : "✅"}
            </div>

            <h2 className="success-modal-title">Application Submitted!</h2>

            <p className="success-modal-message">
              Your application for <strong>{successData.plan?.name}</strong> at{" "}
              <strong>{successData.business?.name}</strong> has been submitted
              successfully!
            </p>

            <div className="success-modal-payment">
              <div className="payment-instruction">
                <span className="payment-icon">
                  {successData.paymentMethod === "gcash" ? "⏳" : "💰"}
                </span>
                <div className="payment-text">
                  <p className="payment-title">
                    {successData.paymentMethod === "gcash"
                      ? "Pending Owner Approval"
                      : "Complete Payment at Business"}
                  </p>
                  <p className="payment-detail">
                    {successData.paymentMethod === "gcash"
                      ? "Your receipt has been uploaded and is now pending review. The business owner will verify your payment and activate your membership within 24-48 hours. You will receive a notification once your membership is approved."
                      : `Please visit ${successData.business?.name} at their premises within 7 days to complete your payment and finalize your membership. Bring a valid ID and mention your application.`}
                  </p>
                </div>
              </div>
            </div>

            {successData.paymentMethod === "onsite" && (
              <div className="business-address-highlight">
                <span className="address-icon">📍</span>
                <div className="address-details">
                  <strong>{successData.business?.name}</strong>
                  <p>{successData.business?.address || successData.business?.location}</p>
                  <p>
                    {successData.business?.city}, {successData.business?.province}
                  </p>
                </div>
              </div>
            )}

            {successData.paymentMethod === "gcash" && (
              <div className="approval-timeline">
                <h4>What happens next?</h4>
                <div className="timeline-steps">
                  <div className="timeline-step">
                    <span className="step-number">1</span>
                    <span className="step-text">
                      Owner reviews your receipt
                    </span>
                  </div>
                  <div className="timeline-step">
                    <span className="step-number">2</span>
                    <span className="step-text">
                      Payment verified (24-48 hours)
                    </span>
                  </div>
                  <div className="timeline-step">
                    <span className="step-number">3</span>
                    <span className="step-text">Membership activated</span>
                  </div>
                  <div className="timeline-step">
                    <span className="step-number">4</span>
                    <span className="step-text">Notification sent to you</span>
                  </div>
                </div>
              </div>
            )}

            <div className="success-modal-actions">
              <button
                className="success-modal-btn primary"
                onClick={() => {
                  setShowSuccessModal(false);
                  navigate("/ClientDashboard");
                }}
              >
                Go to Dashboard
              </button>
              <button
                className="success-modal-btn secondary"
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