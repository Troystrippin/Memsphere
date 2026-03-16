// components/admin/AdminProfile.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import '../../styles/AdminProfile.css';

const AdminProfile = () => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Password visibility states
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const navigate = useNavigate();

  // User data state
  const [userData, setUserData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    mobile: '',
    role: 'admin',
    department: '',
    position: ''
  });

  // Password change state
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [passwordErrors, setPasswordErrors] = useState({});
  const [passwordSuccess, setPasswordSuccess] = useState('');

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
        // Verify admin role
        if (profile.role !== 'admin') {
          navigate('/dashboard');
          return;
        }

        setUserData({
          first_name: profile.first_name || '',
          last_name: profile.last_name || '',
          email: profile.email || user.email,
          mobile: profile.mobile || '',
          role: profile.role || 'admin',
          department: profile.department || 'Administration',
          position: profile.position || 'System Administrator'
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
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const uploadAvatar = async (event) => {
    try {
      setUploading(true);

      if (!event.target.files || event.target.files.length === 0) {
        throw new Error('You must select an image to upload.');
      }

      const file = event.target.files[0];
      
      // Validate file type
      if (!file.type.startsWith('image/')) {
        throw new Error('Please select an image file (JPEG, PNG, etc.)');
      }

      // Validate file size (max 2MB)
      if (file.size > 2 * 1024 * 1024) {
        throw new Error('Image size must be less than 2MB');
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      const filePath = fileName;

      // Upload image to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) {
        throw new Error(uploadError.message);
      }

      // Get the public URL
      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // Update profile with avatar_url
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ 
          avatar_url: filePath,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (updateError) {
        throw new Error(updateError.message);
      }
      
      // Set the avatar URL
      if (urlData?.publicUrl) {
        setAvatarUrl(urlData.publicUrl);
      }

      alert('Avatar uploaded successfully!');
      
    } catch (error) {
      console.error('Error in uploadAvatar:', error);
      alert(error.message || 'Error uploading avatar!');
    } finally {
      setUploading(false);
      // Clear the file input
      event.target.value = '';
    }
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          first_name: userData.first_name,
          last_name: userData.last_name,
          mobile: userData.mobile,
          department: userData.department,
          position: userData.position,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) throw error;

      setIsEditing(false);
      alert('Profile updated successfully!');
      
      // Refresh profile data
      await getUserProfile(user);
      
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Failed to update profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setUserData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({
      ...prev,
      [name]: value
    }));
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
        setIsChangingPassword(false);
        setTimeout(() => setPasswordSuccess(''), 3000);
      } catch (error) {
        console.error('Error changing password:', error);
        setPasswordErrors({ currentPassword: 'Current password is incorrect' });
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
      const username = user.email.split('@')[0];
      return username.charAt(0).toUpperCase() + username.slice(1);
    }
    return 'Admin';
  };

  const getInitials = () => {
    if (userData.first_name && userData.last_name) {
      return `${userData.first_name.charAt(0)}${userData.last_name.charAt(0)}`;
    }
    if (userData.first_name) {
      return userData.first_name.charAt(0).toUpperCase();
    }
    if (user?.email) {
      return user.email.charAt(0).toUpperCase();
    }
    return 'A';
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="admin-profile-loading">
        <div className="loading-spinner"></div>
        <p>Loading admin profile...</p>
      </div>
    );
  }

  const firstName = getFirstName();
  const initials = getInitials();
  const fullName = `${userData.first_name} ${userData.last_name}`.trim() || firstName;

  return (
    <div className="admin-profile-wrapper">
      {/* Admin Profile Content */}
      <div className="admin-profile-container">
        {/* Profile Header Card */}
        <div className="profile-header-card">
          <div className="profile-avatar-section">
            <div className="profile-avatar-large">
              {avatarUrl ? (
                <img 
                  src={avatarUrl} 
                  alt={fullName} 
                  className="profile-avatar-image"
                />
              ) : (
                <div className="avatar-placeholder admin-avatar">
                  <span className="avatar-initials">{initials}</span>
                </div>
              )}
              
              <label htmlFor="admin-avatar-upload" className="edit-avatar-btn admin-edit-btn">
                <span className="upload-icon">📷</span>
                <input
                  id="admin-avatar-upload"
                  type="file"
                  accept="image/*"
                  onChange={uploadAvatar}
                  disabled={uploading}
                  style={{ display: 'none' }}
                />
              </label>
              {uploading && <div className="uploading-spinner"></div>}
            </div>
          </div>

          <div className="profile-title-section">
            <h1 className="admin-profile-name">{fullName}</h1>
            <div className="admin-badge">
              <span className="admin-icon">⚙️</span>
              <span className="admin-role">Administrator</span>
            </div>
            <p className="admin-email">{userData.email}</p>
          </div>

          <div className="profile-stats">
            <div className="stat-item">
              <span className="stat-value">150+</span>
              <span className="stat-label">Users</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">25</span>
              <span className="stat-label">Businesses</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">12</span>
              <span className="stat-label">Reports</span>
            </div>
          </div>
        </div>

        {/* Profile Content Grid */}
        <div className="profile-content-grid">
          {/* Left Column - Personal Info */}
          <div className="profile-card admin-card">
            <div className="card-header">
              <h2>
                <span className="card-icon">👤</span>
                Personal Information
              </h2>
              {!isEditing && (
                <button className="edit-card-btn" onClick={() => setIsEditing(true)}>
                  Edit
                </button>
              )}
            </div>

            {!isEditing ? (
              <div className="info-grid">
                <div className="info-row">
                  <span className="info-label">First Name</span>
                  <span className="info-value">{userData.first_name || 'Not set'}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Last Name</span>
                  <span className="info-value">{userData.last_name || 'Not set'}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Mobile</span>
                  <span className="info-value">{userData.mobile || 'Not provided'}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Department</span>
                  <span className="info-value">{userData.department}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Position</span>
                  <span className="info-value">{userData.position}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Member Since</span>
                  <span className="info-value">{formatDate(user?.created_at)}</span>
                </div>
              </div>
            ) : (
              <div className="edit-form">
                <div className="form-row">
                  <div className="form-group">
                    <label>First Name</label>
                    <input
                      type="text"
                      name="first_name"
                      value={userData.first_name}
                      onChange={handleInputChange}
                      className="admin-input"
                      placeholder="First name"
                    />
                  </div>
                  <div className="form-group">
                    <label>Last Name</label>
                    <input
                      type="text"
                      name="last_name"
                      value={userData.last_name}
                      onChange={handleInputChange}
                      className="admin-input"
                      placeholder="Last name"
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
                    className="admin-input"
                    placeholder="09171234567"
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Department</label>
                    <input
                      type="text"
                      name="department"
                      value={userData.department}
                      onChange={handleInputChange}
                      className="admin-input"
                      placeholder="Department"
                    />
                  </div>
                  <div className="form-group">
                    <label>Position</label>
                    <input
                      type="text"
                      name="position"
                      value={userData.position}
                      onChange={handleInputChange}
                      className="admin-input"
                      placeholder="Position"
                    />
                  </div>
                </div>

                <div className="form-actions">
                  <button className="save-btn admin-save-btn" onClick={handleSaveProfile} disabled={saving}>
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                  <button className="cancel-btn admin-cancel-btn" onClick={() => setIsEditing(false)}>
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Account & Security */}
          <div className="profile-card admin-card">
            <div className="card-header">
              <h2>
                <span className="card-icon">🔒</span>
                Account Security
              </h2>
            </div>

            <div className="security-section">
              <div className="security-item">
                <div className="security-info">
                  <span className="security-label">Email Address</span>
                  <span className="security-value">{userData.email}</span>
                  <span className="verified-badge">✓ Verified</span>
                </div>
              </div>

              <div className="security-item">
                <div className="security-info">
                  <span className="security-label">Password</span>
                  <span className="security-value">••••••••</span>
                  <span className="last-changed">Last changed: 30 days ago</span>
                </div>
                <button className="change-password-btn admin-password-btn" onClick={() => setIsChangingPassword(true)}>
                  Change Password
                </button>
              </div>

              <div className="security-item">
                <div className="security-info">
                  <span className="security-label">Two-Factor Authentication</span>
                  <span className="security-value status-inactive">Not enabled</span>
                </div>
                <button className="enable-2fa-btn">Enable</button>
              </div>

              <div className="security-item">
                <div className="security-info">
                  <span className="security-label">Login Sessions</span>
                  <span className="security-value">1 active session</span>
                </div>
                <button className="manage-sessions-btn">Manage</button>
              </div>
            </div>

            {/* Activity Log */}
            <div className="activity-section">
              <h3>Recent Activity</h3>
              <div className="activity-list">
                <div className="activity-item">
                  <span className="activity-icon">🔑</span>
                  <div className="activity-details">
                    <span className="activity-action">Logged in</span>
                    <span className="activity-time">2 hours ago</span>
                  </div>
                </div>
                <div className="activity-item">
                  <span className="activity-icon">👤</span>
                  <div className="activity-details">
                    <span className="activity-action">Updated profile</span>
                    <span className="activity-time">Yesterday</span>
                  </div>
                </div>
                <div className="activity-item">
                  <span className="activity-icon">⚙️</span>
                  <div className="activity-details">
                    <span className="activity-action">System settings changed</span>
                    <span className="activity-time">3 days ago</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Password Change Modal */}
      {isChangingPassword && (
        <div className="password-modal-overlay">
          <div className="password-modal admin-modal">
            <button className="modal-close" onClick={() => setIsChangingPassword(false)}>×</button>
            
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
                    className={`admin-input ${passwordErrors.currentPassword ? 'error' : ''}`}
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
                    className={`admin-input ${passwordErrors.newPassword ? 'error' : ''}`}
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
                    className={`admin-input ${passwordErrors.confirmPassword ? 'error' : ''}`}
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
              
              <div className="modal-actions">
                <button type="submit" className="save-btn admin-save-btn">Update Password</button>
                <button type="button" className="cancel-btn admin-cancel-btn" onClick={() => setIsChangingPassword(false)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminProfile;