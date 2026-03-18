import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import OwnerNavbar from '../components/owner/OwnerNavbar';
import '../styles/OwnerSettings.css';

const OwnerSettings = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');
  
  // Profile settings state
  const [profileData, setProfileData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    mobile: '',
    business_name: ''
  });
  
  // Notification preferences
  const [notificationPrefs, setNotificationPrefs] = useState({
    email_notifications: true,
    push_notifications: true,
    application_alerts: true,
    member_activity: true,
    payment_updates: true,
    promotional_emails: false
  });
  
  // Business settings
  const [businessSettings, setBusinessSettings] = useState({
    auto_approve_memberships: false,
    allow_reviews: true,
    show_member_count: true,
    public_email: true,
    public_phone: true
  });
  
  // Security settings
  const [securitySettings, setSecuritySettings] = useState({
    two_factor_auth: false,
    session_timeout: '30',
    login_alerts: true
  });
  
  // Password change state
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordErrors, setPasswordErrors] = useState({});
  const [passwordSuccess, setPasswordSuccess] = useState('');
  
  // Password visibility states
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // Success/Error messages
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      
      if (error) throw error;
      
      if (!user) {
        navigate('/login');
        return;
      }

      setUser(user);
      await getUserProfile(user);
    } catch (error) {
      console.error('Error checking user:', error);
      navigate('/login');
    }
  };

  const getUserProfile = async (user) => {
    try {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileError && profileError.code !== 'PGRST116') {
        console.error('Error fetching profile:', profileError);
      }

      setProfile(profile);

      if (profile) {
        setProfileData({
          first_name: profile.first_name || '',
          last_name: profile.last_name || '',
          email: profile.email || user.email,
          mobile: profile.mobile || '',
          business_name: profile.business_name || ''
        });

        // Get avatar URL if exists
        if (profile.avatar_url) {
          const { data } = supabase.storage
            .from('avatars')
            .getPublicUrl(profile.avatar_url);
          
          if (data?.publicUrl) {
            setAvatarUrl(data.publicUrl);
          }
        }

        // Load saved preferences from localStorage or set defaults
        const savedPrefs = localStorage.getItem(`settings_${user.id}`);
        if (savedPrefs) {
          const parsed = JSON.parse(savedPrefs);
          setNotificationPrefs(parsed.notificationPrefs || notificationPrefs);
          setBusinessSettings(parsed.businessSettings || businessSettings);
          setSecuritySettings(parsed.securitySettings || securitySettings);
        }
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setProfileData(prev => ({ ...prev, [name]: value }));
  };

  const handleNotificationChange = (key) => {
    setNotificationPrefs(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleBusinessSettingChange = (key) => {
    setBusinessSettings(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSecurityChange = (key, value) => {
    if (typeof value === 'boolean') {
      setSecuritySettings(prev => ({ ...prev, [key]: !prev[key] }));
    } else {
      setSecuritySettings(prev => ({ ...prev, [key]: value }));
    }
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({ ...prev, [name]: value }));
    setPasswordErrors(prev => ({ ...prev, [name]: '' }));
    setPasswordSuccess('');
  };

  const validatePassword = () => {
    const errors = {};
    
    if (!passwordData.currentPassword) {
      errors.currentPassword = 'Current password is required';
    }
    
    if (!passwordData.newPassword) {
      errors.newPassword = 'New password is required';
    } else if (passwordData.newPassword.length < 8) {
      errors.newPassword = 'Password must be at least 8 characters';
    }
    
    if (!passwordData.confirmPassword) {
      errors.confirmPassword = 'Please confirm your password';
    } else if (passwordData.newPassword !== passwordData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }
    
    return errors;
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    const errors = validatePassword();
    
    if (Object.keys(errors).length === 0) {
      try {
        const { error } = await supabase.auth.updateUser({
          password: passwordData.newPassword
        });

        if (error) throw error;

        setPasswordSuccess('Password changed successfully!');
        setPasswordData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
        setTimeout(() => setPasswordSuccess(''), 3000);
      } catch (error) {
        console.error('Error changing password:', error);
        setPasswordErrors({ currentPassword: 'Current password is incorrect' });
      }
    } else {
      setPasswordErrors(errors);
    }
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    setErrorMessage('');
    setSuccessMessage('');
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          first_name: profileData.first_name,
          last_name: profileData.last_name,
          mobile: profileData.mobile,
          business_name: profileData.business_name,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) throw error;

      setSuccessMessage('Profile updated successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Error updating profile:', error);
      setErrorMessage('Failed to update profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSettings = () => {
    // Save settings to localStorage (in a real app, this would go to database)
    localStorage.setItem(`settings_${user.id}`, JSON.stringify({
      notificationPrefs,
      businessSettings,
      securitySettings
    }));
    
    setSuccessMessage('Settings saved successfully!');
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  const getFirstName = () => {
    if (profileData.first_name) return profileData.first_name;
    return 'Owner';
  };

  const getInitials = () => {
    if (profileData.first_name) {
      return profileData.first_name.charAt(0).toUpperCase();
    }
    return 'O';
  };

  if (loading) {
    return (
      <div className="settings-loading">
        <div className="loading-spinner"></div>
        <p>Loading settings...</p>
      </div>
    );
  }

  const firstName = getFirstName();

  return (
    <div className="settings-container">
      <OwnerNavbar profile={profile} avatarUrl={avatarUrl} />

      <div className="settings-main">
        <div className="settings-header">
          <h1 className="settings-title">
            Settings
            <span className="title-glow"></span>
          </h1>
          <p className="settings-subtitle">Manage your account preferences and business settings</p>
        </div>

        <div className="settings-content">
          <div className="settings-sidebar">
            <button
              className={`settings-tab ${activeTab === 'profile' ? 'active' : ''}`}
              onClick={() => setActiveTab('profile')}
            >
              <span className="tab-icon">👤</span>
              <span className="tab-label">Profile</span>
            </button>
            <button
              className={`settings-tab ${activeTab === 'notifications' ? 'active' : ''}`}
              onClick={() => setActiveTab('notifications')}
            >
              <span className="tab-icon">🔔</span>
              <span className="tab-label">Notifications</span>
            </button>
            <button
              className={`settings-tab ${activeTab === 'business' ? 'active' : ''}`}
              onClick={() => setActiveTab('business')}
            >
              <span className="tab-icon">🏢</span>
              <span className="tab-label">Business Settings</span>
            </button>
            <button
              className={`settings-tab ${activeTab === 'security' ? 'active' : ''}`}
              onClick={() => setActiveTab('security')}
            >
              <span className="tab-icon">🔒</span>
              <span className="tab-label">Security</span>
            </button>
          </div>

          <div className="settings-panel">
            {successMessage && (
              <div className="settings-success">{successMessage}</div>
            )}
            {errorMessage && (
              <div className="settings-error">{errorMessage}</div>
            )}

            {/* Profile Settings */}
            {activeTab === 'profile' && (
              <div className="settings-section">
                <h2 className="section-title">Profile Information</h2>
                
                <div className="profile-avatar-section">
                  <div className="avatar-container">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt={firstName} className="profile-avatar" />
                    ) : (
                      <div className="profile-avatar-placeholder">
                        {getInitials()}
                      </div>
                    )}
                  </div>
                  <div className="avatar-info">
                    <p className="avatar-name">{firstName} {profileData.last_name}</p>
                    <p className="avatar-email">{profileData.email}</p>
                    <p className="avatar-role">Business Owner</p>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>First Name</label>
                    <input
                      type="text"
                      name="first_name"
                      value={profileData.first_name}
                      onChange={handleProfileChange}
                      className="form-input"
                      placeholder="Enter your first name"
                    />
                  </div>
                  <div className="form-group">
                    <label>Last Name</label>
                    <input
                      type="text"
                      name="last_name"
                      value={profileData.last_name}
                      onChange={handleProfileChange}
                      className="form-input"
                      placeholder="Enter your last name"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Email Address</label>
                  <input
                    type="email"
                    value={profileData.email}
                    className="form-input"
                    disabled
                  />
                  <small className="field-note">Email cannot be changed</small>
                </div>

                <div className="form-group">
                  <label>Mobile Number</label>
                  <input
                    type="tel"
                    name="mobile"
                    value={profileData.mobile}
                    onChange={handleProfileChange}
                    className="form-input"
                    placeholder="09171234567"
                  />
                </div>

                <div className="form-group">
                  <label>Business Name</label>
                  <input
                    type="text"
                    name="business_name"
                    value={profileData.business_name}
                    onChange={handleProfileChange}
                    className="form-input"
                    placeholder="Your Business Name"
                  />
                </div>

                <button 
                  className="save-settings-btn"
                  onClick={handleSaveProfile}
                  disabled={saving}
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            )}

            {/* Notification Settings */}
            {activeTab === 'notifications' && (
              <div className="settings-section">
                <h2 className="section-title">Notification Preferences</h2>
                
                <div className="settings-group">
                  <h3 className="group-title">Email Notifications</h3>
                  
                  <label className="toggle-item">
                    <span className="toggle-label">Enable email notifications</span>
                    <input
                      type="checkbox"
                      checked={notificationPrefs.email_notifications}
                      onChange={() => handleNotificationChange('email_notifications')}
                      className="toggle-checkbox"
                    />
                    <span className="toggle-slider"></span>
                  </label>

                  <label className="toggle-item">
                    <span className="toggle-label">New member applications</span>
                    <input
                      type="checkbox"
                      checked={notificationPrefs.application_alerts}
                      onChange={() => handleNotificationChange('application_alerts')}
                      className="toggle-checkbox"
                      disabled={!notificationPrefs.email_notifications}
                    />
                    <span className="toggle-slider"></span>
                  </label>

                  <label className="toggle-item">
                    <span className="toggle-label">Member activity updates</span>
                    <input
                      type="checkbox"
                      checked={notificationPrefs.member_activity}
                      onChange={() => handleNotificationChange('member_activity')}
                      className="toggle-checkbox"
                      disabled={!notificationPrefs.email_notifications}
                    />
                    <span className="toggle-slider"></span>
                  </label>

                  <label className="toggle-item">
                    <span className="toggle-label">Payment updates</span>
                    <input
                      type="checkbox"
                      checked={notificationPrefs.payment_updates}
                      onChange={() => handleNotificationChange('payment_updates')}
                      className="toggle-checkbox"
                      disabled={!notificationPrefs.email_notifications}
                    />
                    <span className="toggle-slider"></span>
                  </label>

                  <label className="toggle-item">
                    <span className="toggle-label">Promotional emails</span>
                    <input
                      type="checkbox"
                      checked={notificationPrefs.promotional_emails}
                      onChange={() => handleNotificationChange('promotional_emails')}
                      className="toggle-checkbox"
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </div>

                <div className="settings-group">
                  <h3 className="group-title">Push Notifications</h3>
                  
                  <label className="toggle-item">
                    <span className="toggle-label">Enable push notifications</span>
                    <input
                      type="checkbox"
                      checked={notificationPrefs.push_notifications}
                      onChange={() => handleNotificationChange('push_notifications')}
                      className="toggle-checkbox"
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </div>

                <button 
                  className="save-settings-btn"
                  onClick={handleSaveSettings}
                >
                  Save Preferences
                </button>
              </div>
            )}

            {/* Business Settings */}
            {activeTab === 'business' && (
              <div className="settings-section">
                <h2 className="section-title">Business Settings</h2>
                
                <div className="settings-group">
                  <h3 className="group-title">Membership Settings</h3>
                  
                  <label className="toggle-item">
                    <span className="toggle-label">Auto-approve new memberships</span>
                    <input
                      type="checkbox"
                      checked={businessSettings.auto_approve_memberships}
                      onChange={() => handleBusinessSettingChange('auto_approve_memberships')}
                      className="toggle-checkbox"
                    />
                    <span className="toggle-slider"></span>
                  </label>
                  <p className="setting-description">
                    Automatically approve membership applications without manual review
                  </p>
                </div>

                <div className="settings-group">
                  <h3 className="group-title">Reviews & Ratings</h3>
                  
                  <label className="toggle-item">
                    <span className="toggle-label">Allow customer reviews</span>
                    <input
                      type="checkbox"
                      checked={businessSettings.allow_reviews}
                      onChange={() => handleBusinessSettingChange('allow_reviews')}
                      className="toggle-checkbox"
                    />
                    <span className="toggle-slider"></span>
                  </label>
                  <p className="setting-description">
                    Let customers leave reviews and ratings for your business
                  </p>
                </div>

                <div className="settings-group">
                  <h3 className="group-title">Business Visibility</h3>
                  
                  <label className="toggle-item">
                    <span className="toggle-label">Show member count on profile</span>
                    <input
                      type="checkbox"
                      checked={businessSettings.show_member_count}
                      onChange={() => handleBusinessSettingChange('show_member_count')}
                      className="toggle-checkbox"
                    />
                    <span className="toggle-slider"></span>
                  </label>

                  <label className="toggle-item">
                    <span className="toggle-label">Show email on business profile</span>
                    <input
                      type="checkbox"
                      checked={businessSettings.public_email}
                      onChange={() => handleBusinessSettingChange('public_email')}
                      className="toggle-checkbox"
                    />
                    <span className="toggle-slider"></span>
                  </label>

                  <label className="toggle-item">
                    <span className="toggle-label">Show phone on business profile</span>
                    <input
                      type="checkbox"
                      checked={businessSettings.public_phone}
                      onChange={() => handleBusinessSettingChange('public_phone')}
                      className="toggle-checkbox"
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </div>

                <button 
                  className="save-settings-btn"
                  onClick={handleSaveSettings}
                >
                  Save Business Settings
                </button>
              </div>
            )}

            {/* Security Settings */}
            {activeTab === 'security' && (
              <div className="settings-section">
                <h2 className="section-title">Security Settings</h2>
                
                <div className="settings-group">
                  <h3 className="group-title">Change Password</h3>
                  
                  <form onSubmit={handlePasswordSubmit}>
                    <div className="form-group">
                      <label>Current Password</label>
                      <div className="password-input-container">
                        <input
                          type={showCurrentPassword ? "text" : "password"}
                          name="currentPassword"
                          value={passwordData.currentPassword}
                          onChange={handlePasswordChange}
                          className={`form-input ${passwordErrors.currentPassword ? 'error' : ''}`}
                          placeholder="Enter current password"
                        />
                        <button
                          type="button"
                          className="eye-toggle-btn"
                          onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                        >
                          {showCurrentPassword ? "👁️" : "👁️‍🗨️"}
                        </button>
                      </div>
                      {passwordErrors.currentPassword && (
                        <span className="error-message">{passwordErrors.currentPassword}</span>
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
                          className={`form-input ${passwordErrors.newPassword ? 'error' : ''}`}
                          placeholder="Enter new password"
                        />
                        <button
                          type="button"
                          className="eye-toggle-btn"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                        >
                          {showNewPassword ? "👁️" : "👁️‍🗨️"}
                        </button>
                      </div>
                      {passwordErrors.newPassword && (
                        <span className="error-message">{passwordErrors.newPassword}</span>
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
                          className={`form-input ${passwordErrors.confirmPassword ? 'error' : ''}`}
                          placeholder="Confirm new password"
                        />
                        <button
                          type="button"
                          className="eye-toggle-btn"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        >
                          {showConfirmPassword ? "👁️" : "👁️‍🗨️"}
                        </button>
                      </div>
                      {passwordErrors.confirmPassword && (
                        <span className="error-message">{passwordErrors.confirmPassword}</span>
                      )}
                    </div>

                    {passwordSuccess && (
                      <div className="password-success">{passwordSuccess}</div>
                    )}

                    <button type="submit" className="save-settings-btn">
                      Update Password
                    </button>
                  </form>
                </div>

                <div className="settings-group">
                  <h3 className="group-title">Session Settings</h3>
                  
                  <label className="toggle-item">
                    <span className="toggle-label">Two-factor authentication</span>
                    <input
                      type="checkbox"
                      checked={securitySettings.two_factor_auth}
                      onChange={() => handleSecurityChange('two_factor_auth')}
                      className="toggle-checkbox"
                    />
                    <span className="toggle-slider"></span>
                  </label>
                  
                  <div className="form-group">
                    <label>Session Timeout (minutes)</label>
                    <select
                      value={securitySettings.session_timeout}
                      onChange={(e) => handleSecurityChange('session_timeout', e.target.value)}
                      className="form-select"
                    >
                      <option value="15">15 minutes</option>
                      <option value="30">30 minutes</option>
                      <option value="60">1 hour</option>
                      <option value="120">2 hours</option>
                      <option value="240">4 hours</option>
                    </select>
                  </div>

                  <label className="toggle-item">
                    <span className="toggle-label">Login alerts</span>
                    <input
                      type="checkbox"
                      checked={securitySettings.login_alerts}
                      onChange={() => handleSecurityChange('login_alerts')}
                      className="toggle-checkbox"
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </div>

                <button 
                  className="save-settings-btn"
                  onClick={handleSaveSettings}
                >
                  Save Security Settings
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OwnerSettings;