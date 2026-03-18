import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import ClientNavbar from "../components/client/ClientNavbar";
import OwnerNavbar from "../components/owner/OwnerNavbar";
import "../styles/Profile.css";

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

        // Fetch memberships if user is client
        if (profile.role === "client") {
          await fetchMemberships(user.id);
        }
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
          plans:plan_id (
            id,
            name,
            price,
            duration,
            features
          )
        `,
        )
        .eq("user_id", userId)
        .eq("status", "approved") // Only show approved memberships
        .order("created_at", { ascending: false });

      if (error) throw error;

      setMemberships(data || []);
    } catch (error) {
      console.error("Error fetching memberships:", error);
    } finally {
      setLoadingMemberships(false);
    }
  };

  const uploadAvatar = async (event) => {
    try {
      setUploading(true);

      if (!event.target.files || event.target.files.length === 0) {
        throw new Error("You must select an image to upload.");
      }

      const file = event.target.files[0];

      // Validate file type
      if (!file.type.startsWith("image/")) {
        throw new Error("Please select an image file (JPEG, PNG, etc.)");
      }

      // Validate file size (max 2MB)
      if (file.size > 2 * 1024 * 1024) {
        throw new Error("Image size must be less than 2MB");
      }

      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      const filePath = fileName;

      // Upload image to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: true,
        });

      if (uploadError) {
        throw new Error(uploadError.message);
      }

      // Get the public URL
      const { data: urlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

      // Update profile with avatar_url
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

      // Set the avatar URL
      if (urlData?.publicUrl) {
        setAvatarUrl(urlData.publicUrl);
      }

      alert("Avatar uploaded successfully!");
    } catch (error) {
      console.error("Error in uploadAvatar:", error);
      alert(error.message || "Error uploading avatar!");
    } finally {
      setUploading(false);
      // Clear the file input
      event.target.value = "";
    }
  };

  // Profile editing functions
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

      // Refresh profile data
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

  // Password change functions
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

  const getUserRole = () => {
    if (userData.role === "owner") return "Business Owner";
    if (userData.role === "admin") return "Admin";
    return "Client";
  };

  const getRoleIcon = () => {
    if (userData.role === "owner") return "👑";
    if (userData.role === "admin") return "⚙️";
    return "👤";
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case "approved":
        return "status-badge approved";
      case "rejected":
        return "status-badge rejected";
      case "pending":
        return "status-badge pending";
      default:
        return "status-badge";
    }
  };

  const getPaymentMethodIcon = (method) => {
    switch (method) {
      case "gcash":
        return "📱";
      case "onsite":
        return "🏪";
      default:
        return "💳";
    }
  };

  const getPaymentMethodLabel = (method) => {
    switch (method) {
      case "gcash":
        return "GCash";
      case "onsite":
        return "Pay at Business";
      default:
        return method || "Not specified";
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="profile-loading">
        <div className="loading-spinner"></div>
        <p>Loading your profile...</p>
      </div>
    );
  }

  const firstName = getFirstName();
  const userRole = getUserRole();
  const roleIcon = getRoleIcon();
  const initials = getInitials();
  const fullName =
    `${userData.first_name} ${userData.last_name}`.trim() || firstName;

  return (
    <div className="profile-container">
      {/* Role-based Navbar */}
      {userData.role === "owner" ? (
        <OwnerNavbar profile={profile} avatarUrl={avatarUrl} />
      ) : (
        <ClientNavbar profile={profile} avatarUrl={avatarUrl} />
      )}

      {/* Mobile Welcome Message */}
      <div className="mobile-welcome">
        <p>Welcome, {firstName}!</p>
      </div>

      {/* Profile Main Content - Add padding-top to account for fixed navbar */}
      <div className="profile-main" style={{ paddingTop: "calc(70px + 2rem)" }}>
        {/* Profile Card */}
        <div className="profile-card">
          <div className="avatar-container">
            <div className="profile-avatar-large">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={fullName}
                  className="profile-avatar-image"
                />
              ) : (
                <div className="avatar-placeholder">
                  <span className="avatar-emoji">👤</span>
                </div>
              )}
              {uploading && <div className="uploading-spinner"></div>}
            </div>

            {/* Upload button - NOW OUTSIDE the avatar container */}
            <label htmlFor="avatar-upload" className="edit-avatar-btn">
              <span className="upload-icon">📷</span>
              <input
                id="avatar-upload"
                type="file"
                accept="image/*"
                onChange={uploadAvatar}
                disabled={uploading}
                style={{ display: "none" }}
              />
            </label>
          </div>

          {!isEditing ? (
            <>
              <div className="profile-info-content">
                <h1 className="profile-name">{fullName}</h1>
                <p className="profile-email">{userData.email}</p>

                {/* Role Badge - Now positioned below email */}
                <div className="role-badge-large">
                  <span className="role-icon">{roleIcon}</span>
                  <span className="role-text">{userRole}</span>
                </div>

                <div className="profile-details">
                  {userData.mobile && (
                    <div className="detail-item">
                      <span className="detail-label">📱 Phone:</span>
                      <span className="detail-value">{userData.mobile}</span>
                    </div>
                  )}
                  {userData.business_name && userData.role === "owner" && (
                    <div className="detail-item">
                      <span className="detail-label">🏢 Business:</span>
                      <span className="detail-value">
                        {userData.business_name}
                      </span>
                    </div>
                  )}
                  <div className="detail-item">
                    <span className="detail-label">📅 Member since:</span>
                    <span className="detail-value">
                      {user?.created_at ? formatDate(user.created_at) : "N/A"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="profile-actions">
                <button
                  className="edit-profile-btn"
                  onClick={() => setIsEditing(true)}
                >
                  <span>Edit Profile</span>
                  <span className="btn-icon">✎</span>
                </button>
                <button
                  className="change-password-btn"
                  onClick={() => setIsChangingPassword(true)}
                >
                  <span>Change Password</span>
                  <span className="btn-icon">🔒</span>
                </button>
              </div>
            </>
          ) : (
            <div className="edit-profile-form">
              <h3>Edit Profile</h3>

              <div className="form-row">
                <div className="form-group">
                  <label>First Name</label>
                  <input
                    type="text"
                    name="first_name"
                    value={userData.first_name}
                    onChange={handleInputChange}
                    className="form-input"
                    placeholder="Enter your first name"
                  />
                </div>

                <div className="form-group">
                  <label>Last Name</label>
                  <input
                    type="text"
                    name="last_name"
                    value={userData.last_name}
                    onChange={handleInputChange}
                    className="form-input"
                    placeholder="Enter your last name"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Mobile Number</label>
                <input
                  type="tel"
                  name="mobile"
                  value={userData.mobile}
                  onChange={handleInputChange}
                  className="form-input"
                  placeholder="09171234567"
                />
              </div>

              {userData.role === "owner" && (
                <div className="form-group">
                  <label>Business Name</label>
                  <input
                    type="text"
                    name="business_name"
                    value={userData.business_name}
                    onChange={handleInputChange}
                    className="form-input"
                    placeholder="Your Business Name"
                  />
                </div>
              )}

              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  name="email"
                  value={userData.email}
                  className="form-input"
                  disabled
                />
                <small className="field-note">Email cannot be changed</small>
              </div>

              <div className="form-actions">
                <button
                  className="save-btn"
                  onClick={handleSaveProfile}
                  disabled={saving}
                >
                  {saving ? "Saving..." : "Save Changes"}
                </button>
                <button
                  className="cancel-btn"
                  onClick={() => setIsEditing(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Memberships Section - Only for Clients */}
        {userData.role === "client" && (
          <div className="memberships-section">
            <h2 className="section-title">My Memberships</h2>

            {loadingMemberships ? (
              <div className="memberships-loading">
                <div className="loading-spinner-small"></div>
                <p>Loading your memberships...</p>
              </div>
            ) : memberships.length > 0 ? (
              <div className="memberships-grid">
                {memberships.map((membership) => (
                  <div key={membership.id} className="membership-card">
                    <div className="membership-card-header">
                      <div className="business-icon">
                        {membership.businesses?.emoji || "🏢"}
                      </div>
                      <div className="business-info">
                        <h3>{membership.businesses?.name}</h3>
                        <p className="business-owner">
                          <span className="owner-icon">👑</span>
                          {membership.businesses?.owner_name}
                        </p>
                      </div>
                      <div className={getStatusBadgeClass(membership.status)}>
                        {membership.status}
                      </div>
                    </div>

                    <div className="membership-card-body">
                      <div className="plan-info">
                        <h4>{membership.plans?.name}</h4>
                        <div className="plan-price">
                          ₱{membership.plans?.price?.toLocaleString()}
                          <span className="plan-duration">
                            /{membership.plans?.duration}
                          </span>
                        </div>
                      </div>

                      {/* Payment Method Display */}
                      <div className="payment-method-display">
                        <span className="payment-method-icon">
                          {getPaymentMethodIcon(membership.payment_method)}
                        </span>
                        <span className="payment-method-text">
                          Payment:{" "}
                          {getPaymentMethodLabel(membership.payment_method)}
                        </span>
                      </div>

                      <div className="membership-dates">
                        <div className="date-item">
                          <span className="date-label">Applied:</span>
                          <span className="date-value">
                            {formatDate(membership.created_at)}
                          </span>
                        </div>
                        {membership.end_date && (
                          <div className="date-item">
                            <span className="date-label">Valid until:</span>
                            <span className="date-value">
                              {formatDate(membership.end_date)}
                            </span>
                          </div>
                        )}
                      </div>

                      {membership.plans?.features &&
                        membership.plans.features.length > 0 && (
                          <div className="plan-features">
                            <p className="features-label">Features:</p>
                            <div className="features-list">
                              {membership.plans.features
                                .slice(0, 3)
                                .map((feature, idx) => (
                                  <span key={idx} className="feature-tag">
                                    {feature}
                                  </span>
                                ))}
                              {membership.plans.features.length > 3 && (
                                <span className="feature-tag more">
                                  +{membership.plans.features.length - 3}
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                    </div>

                    <div className="membership-card-footer">
                      <span className="business-location">
                        <span className="location-icon">📍</span>
                        {membership.businesses?.location ||
                          "Location not specified"}
                      </span>
                      <button
                        className="view-business-btn"
                        onClick={() => navigate("/browse")}
                      >
                        View Business
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="no-memberships">
                <div className="no-memberships-icon">📋</div>
                <h3>No Memberships Found</h3>
                <p>
                  You haven't joined any businesses yet or your memberships are
                  pending approval.
                </p>
                <button
                  className="browse-businesses-btn"
                  onClick={() => navigate("/browse")}
                >
                  Browse Businesses
                </button>
              </div>
            )}
          </div>
        )}

        {/* Password Change Modal with Eye Toggle */}
        {isChangingPassword && (
          <div className="password-modal-overlay">
            <div className="password-modal">
              <button
                className="modal-close"
                onClick={() => setIsChangingPassword(false)}
              >
                ×
              </button>

              <h2 className="modal-title">Change Password</h2>

              {passwordSuccess && (
                <div className="success-message">{passwordSuccess}</div>
              )}

              <form onSubmit={handlePasswordSubmit}>
                <div className="form-group">
                  <label>Current Password</label>
                  <div className="password-input-container">
                    <input
                      type={showCurrentPassword ? "text" : "password"}
                      name="currentPassword"
                      value={passwordData.currentPassword}
                      onChange={handlePasswordChange}
                      className={`password-input ${passwordErrors.currentPassword ? "error" : ""}`}
                      placeholder="Enter current password"
                    />
                    <button
                      type="button"
                      className="eye-toggle-btn"
                      onClick={() =>
                        setShowCurrentPassword(!showCurrentPassword)
                      }
                      tabIndex="-1"
                    >
                      {showCurrentPassword ? "👁️" : "👁️‍🗨️"}
                    </button>
                  </div>
                  {passwordErrors.currentPassword && (
                    <span className="error-message">
                      {passwordErrors.currentPassword}
                    </span>
                  )}
                </div>

                <div className="form-group">
                  <label>New Password</label>
                  <div className="password-input-container">
                    <input
                      type={showNewPassword ? "text" : "password"}
                      name="newPassword"
                      value={passwordData.newPassword}
                      onChange={handlePasswordChange}
                      className={`password-input ${passwordErrors.newPassword ? "error" : ""}`}
                      placeholder="Enter new password"
                    />
                    <button
                      type="button"
                      className="eye-toggle-btn"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      tabIndex="-1"
                    >
                      {showNewPassword ? "👁️" : "👁️‍🗨️"}
                    </button>
                  </div>
                  {passwordErrors.newPassword && (
                    <span className="error-message">
                      {passwordErrors.newPassword}
                    </span>
                  )}
                </div>

                <div className="form-group">
                  <label>Confirm New Password</label>
                  <div className="password-input-container">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      name="confirmPassword"
                      value={passwordData.confirmPassword}
                      onChange={handlePasswordChange}
                      className={`password-input ${passwordErrors.confirmPassword ? "error" : ""}`}
                      placeholder="Confirm new password"
                    />
                    <button
                      type="button"
                      className="eye-toggle-btn"
                      onClick={() =>
                        setShowConfirmPassword(!showConfirmPassword)
                      }
                      tabIndex="-1"
                    >
                      {showConfirmPassword ? "👁️" : "👁️‍🗨️"}
                    </button>
                  </div>
                  {passwordErrors.confirmPassword && (
                    <span className="error-message">
                      {passwordErrors.confirmPassword}
                    </span>
                  )}
                </div>

                <div className="modal-actions">
                  <button type="submit" className="save-btn">
                    Update Password
                  </button>
                  <button
                    type="button"
                    className="cancel-btn"
                    onClick={() => setIsChangingPassword(false)}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Profile;
