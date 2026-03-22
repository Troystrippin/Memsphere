import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import AdminSidebarNav from './AdminSidebarNav';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User,
  Mail,
  Phone,
  Calendar,
  Edit2,
  Lock,
  Camera,
  Save,
  X,
  Eye,
  EyeOff,
  Shield,
  CheckCircle,
  Clock,
  Activity,
  Key,
  Fingerprint,
  LogOut,
  Settings,
  Bell,
  Award,
  Users,
  Building,
  TrendingUp,
  Globe,
  Zap,
  Star,
  Heart,
  ChevronRight,
  Download,
  RefreshCw,
  Monitor,
  Smartphone,
  Tablet,
  MoreVertical,
  UserPlus,
  Plus,
  Trash2
} from 'lucide-react';

const AdminProfile = () => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  
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
    department: 'Administration',
    position: 'System Administrator',
    bio: 'Platform administrator with expertise in system management and user support.',
    timezone: 'Asia/Manila',
    language: 'English'
  });

  // Password change state
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [passwordErrors, setPasswordErrors] = useState({});
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [stats, setStats] = useState({
    usersManaged: 0,
    businessesManaged: 0,
    reportsGenerated: 0,
    daysActive: 0,
    loginStreak: 0,
    totalActions: 0
  });

  useEffect(() => {
    checkUser();
    fetchAdminStats();
  }, []);

  const fetchAdminStats = async () => {
    try {
      const { count: totalUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      const { count: totalBusinesses } = await supabase
        .from('businesses')
        .select('*', { count: 'exact', head: true });

      setStats({
        usersManaged: totalUsers || 0,
        businessesManaged: totalBusinesses || 0,
        reportsGenerated: 24,
        daysActive: 156,
        loginStreak: 7,
        totalActions: 342
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

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
          position: profile.position || 'System Administrator',
          bio: profile.bio || 'Platform administrator with expertise in system management and user support.',
          timezone: profile.timezone || 'Asia/Manila',
          language: profile.language || 'English'
        });

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
      const file = event.target.files[0];
      
      if (!file.type.startsWith('image/')) {
        throw new Error('Please select an image file');
      }
      if (file.size > 2 * 1024 * 1024) {
        throw new Error('Image size must be less than 2MB');
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      const filePath = fileName;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { cacheControl: '3600', upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(filePath);
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: filePath, updated_at: new Date().toISOString() })
        .eq('id', user.id);

      if (updateError) throw updateError;
      
      if (urlData?.publicUrl) setAvatarUrl(urlData.publicUrl);
      alert('Avatar uploaded successfully!');
    } catch (error) {
      alert(error.message || 'Error uploading avatar!');
    } finally {
      setUploading(false);
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
          bio: userData.bio,
          timezone: userData.timezone,
          language: userData.language,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) throw error;

      setIsEditing(false);
      alert('Profile updated successfully!');
      await getUserProfile(user);
    } catch (error) {
      alert('Failed to update profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setUserData(prev => ({ ...prev, [name]: value }));
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({ ...prev, [name]: value }));
    setPasswordErrors(prev => ({ ...prev, [name]: '' }));
    setPasswordSuccess('');
  };

  const validatePassword = () => {
    const errors = {};
    if (!passwordData.currentPassword) errors.currentPassword = 'Current password is required';
    if (!passwordData.newPassword) errors.newPassword = 'New password is required';
    else if (passwordData.newPassword.length < 8) errors.newPassword = 'Password must be at least 8 characters';
    if (!passwordData.confirmPassword) errors.confirmPassword = 'Please confirm your password';
    else if (passwordData.newPassword !== passwordData.confirmPassword) errors.confirmPassword = 'Passwords do not match';
    return errors;
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    const errors = validatePassword();
    
    if (Object.keys(errors).length === 0) {
      try {
        const { error } = await supabase.auth.updateUser({ password: passwordData.newPassword });
        if (error) throw error;
        setPasswordSuccess('Password changed successfully!');
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
        setIsChangingPassword(false);
        setTimeout(() => setPasswordSuccess(''), 3000);
      } catch (error) {
        setPasswordErrors({ currentPassword: 'Current password is incorrect' });
      }
    } else {
      setPasswordErrors(errors);
    }
  };

  const getInitials = () => {
    if (userData.first_name && userData.last_name) {
      return `${userData.first_name.charAt(0)}${userData.last_name.charAt(0)}`.toUpperCase();
    }
    return userData.first_name?.charAt(0).toUpperCase() || 'A';
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
      <AdminSidebarNav>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Loading profile...</p>
          </div>
        </div>
      </AdminSidebarNav>
    );
  }

  const fullName = `${userData.first_name} ${userData.last_name}`.trim() || 'Administrator';

  return (
    <AdminSidebarNav>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-gray-100 to-gray-200">
        {/* Hero Section */}
        <div className="relative bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 overflow-hidden">
          {/* Animated Background */}
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-0 right-0 w-96 h-96 bg-white rounded-full -mr-48 -mt-48 animate-pulse"></div>
            <div className="absolute bottom-0 left-0 w-96 h-96 bg-white rounded-full -ml-48 -mb-48 animate-pulse delay-1000"></div>
          </div>
          
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="flex flex-col md:flex-row items-center gap-8">
              {/* Avatar with Stats Ring */}
              <div className="relative">
                <div className="absolute inset-0 bg-white/20 rounded-full blur-xl"></div>
                <div className="relative w-32 h-32 rounded-2xl bg-white/20 backdrop-blur-sm p-1 shadow-2xl">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt={fullName} className="w-full h-full rounded-xl object-cover" />
                  ) : (
                    <div className="w-full h-full rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                      <span className="text-4xl font-bold text-white">{getInitials()}</span>
                    </div>
                  )}
                </div>
                <label
                  htmlFor="avatar-upload"
                  className="absolute -bottom-2 -right-2 p-2 bg-white rounded-full cursor-pointer shadow-lg hover:shadow-xl transition-all"
                >
                  <Camera className="w-4 h-4 text-gray-600" />
                  <input id="avatar-upload" type="file" accept="image/*" onChange={uploadAvatar} disabled={uploading} className="hidden" />
                </label>
              </div>

              {/* Profile Info */}
              <div className="flex-1 text-center md:text-left">
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mb-3">
                  <h1 className="text-3xl md:text-4xl font-bold text-white">{fullName}</h1>
                  <span className="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-sm text-white flex items-center gap-2">
                    <Shield className="w-4 h-4" />
                    System Administrator
                  </span>
                </div>
                <p className="text-blue-100 mb-4">Managing platform operations and user accounts with dedication</p>
                <div className="flex flex-wrap gap-4 justify-center md:justify-start">
                  <div className="flex items-center gap-2 text-white/80">
                    <Mail className="w-4 h-4" />
                    <span className="text-sm">{userData.email}</span>
                  </div>
                  {userData.mobile && (
                    <div className="flex items-center gap-2 text-white/80">
                      <Phone className="w-4 h-4" />
                      <span className="text-sm">{userData.mobile}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-white/80">
                    <Calendar className="w-4 h-4" />
                    <span className="text-sm">Joined {formatDate(user?.created_at)}</span>
                  </div>
                </div>
              </div>

              {/* Stats Badge */}
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 text-center min-w-[120px]">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Zap className="w-5 h-5 text-yellow-400" />
                  <span className="text-2xl font-bold text-white">{stats.loginStreak}</span>
                </div>
                <p className="text-xs text-white/80">Day Streak</p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Tabs */}
          <div className="flex flex-wrap gap-2 mb-8 border-b border-gray-200">
            {['overview', 'personal', 'security', 'activity'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-3 text-sm font-medium transition-all relative ${
                  activeTab === tab
                    ? 'text-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
                {activeTab === tab && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"
                  />
                )}
              </button>
            ))}
          </div>

          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              {/* Stats Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                      <Users className="w-6 h-6 text-blue-600" />
                    </div>
                    <TrendingUp className="w-5 h-5 text-green-500" />
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{stats.usersManaged}</p>
                  <p className="text-sm text-gray-600">Users Managed</p>
                </div>

                <div className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                      <Building className="w-6 h-6 text-purple-600" />
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{stats.businessesManaged}</p>
                  <p className="text-sm text-gray-600">Businesses Managed</p>
                </div>

                <div className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                      <Activity className="w-6 h-6 text-green-600" />
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalActions}</p>
                  <p className="text-sm text-gray-600">Total Actions</p>
                </div>

                <div className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
                      <Award className="w-6 h-6 text-yellow-600" />
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{stats.daysActive}</p>
                  <p className="text-sm text-gray-600">Days Active</p>
                </div>
              </div>

              {/* Recent Activity & Quick Actions */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
                    <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                      <Activity className="w-5 h-5 text-blue-600" />
                      Recent Activity
                    </h3>
                  </div>
                  <div className="divide-y divide-gray-100">
                    {[
                      { action: 'Logged in', time: '2 hours ago', icon: Key },
                      { action: 'Updated system settings', time: 'Yesterday', icon: Settings },
                      { action: 'Approved new business', time: '3 days ago', icon: Building },
                      { action: 'Generated monthly report', time: '5 days ago', icon: Download },
                    ].map((activity, idx) => (
                      <div key={idx} className="p-4 hover:bg-gray-50 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                            <activity.icon className="w-4 h-4 text-gray-600" />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm text-gray-800">{activity.action}</p>
                            <p className="text-xs text-gray-400">{activity.time}</p>
                          </div>
                          <ChevronRight className="w-4 h-4 text-gray-400" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
                    <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                      <Zap className="w-5 h-5 text-yellow-500" />
                      Quick Actions
                    </h3>
                  </div>
                  <div className="p-6 space-y-3">
                    <button className="w-full px-4 py-3 bg-blue-50 text-blue-700 rounded-xl hover:bg-blue-100 transition-colors flex items-center justify-between group">
                      <span className="font-medium">Invite New Admin</span>
                      <UserPlus className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </button>
                    <button className="w-full px-4 py-3 bg-purple-50 text-purple-700 rounded-xl hover:bg-purple-100 transition-colors flex items-center justify-between group">
                      <span className="font-medium">Generate System Report</span>
                      <Download className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </button>
                    <button className="w-full px-4 py-3 bg-green-50 text-green-700 rounded-xl hover:bg-green-100 transition-colors flex items-center justify-between group">
                      <span className="font-medium">Clear System Cache</span>
                      <RefreshCw className="w-4 h-4 group-hover:rotate-180 transition-transform" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Active Sessions */}
              <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
                  <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                    <Monitor className="w-5 h-5 text-blue-600" />
                    Active Sessions
                  </h3>
                </div>
                <div className="divide-y divide-gray-100">
                  <div className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Monitor className="w-8 h-8 text-gray-400" />
                      <div>
                        <p className="font-medium text-gray-900">Current Session</p>
                        <p className="text-sm text-gray-500">Chrome on Windows • Manila, Philippines</p>
                      </div>
                    </div>
                    <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded-full">Active Now</span>
                  </div>
                  <div className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Smartphone className="w-8 h-8 text-gray-400" />
                      <div>
                        <p className="font-medium text-gray-900">Mobile Session</p>
                        <p className="text-sm text-gray-500">Safari on iPhone • 2 hours ago</p>
                      </div>
                    </div>
                    <button className="text-sm text-red-600 hover:text-red-700">End</button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Personal Tab */}
          {activeTab === 'personal' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl shadow-lg overflow-hidden"
            >
              <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
                <div className="flex items-center justify-between">
                  <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                    <User className="w-5 h-5 text-blue-600" />
                    Personal Information
                  </h2>
                  {!isEditing && (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors flex items-center gap-2"
                    >
                      <Edit2 className="w-4 h-4" />
                      Edit Profile
                    </button>
                  )}
                </div>
              </div>

              <div className="p-6">
                {!isEditing ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <label className="text-xs text-gray-500 uppercase tracking-wider">Full Name</label>
                        <p className="text-gray-900 font-medium mt-1">{fullName}</p>
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 uppercase tracking-wider">Email Address</label>
                        <p className="text-gray-900 font-medium mt-1">{userData.email}</p>
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 uppercase tracking-wider">Mobile Number</label>
                        <p className="text-gray-900 font-medium mt-1">{userData.mobile || 'Not provided'}</p>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <label className="text-xs text-gray-500 uppercase tracking-wider">Department</label>
                        <p className="text-gray-900 font-medium mt-1">{userData.department}</p>
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 uppercase tracking-wider">Position</label>
                        <p className="text-gray-900 font-medium mt-1">{userData.position}</p>
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 uppercase tracking-wider">Timezone</label>
                        <p className="text-gray-900 font-medium mt-1">{userData.timezone}</p>
                      </div>
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-xs text-gray-500 uppercase tracking-wider">Bio</label>
                      <p className="text-gray-700 mt-1 leading-relaxed">{userData.bio}</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">First Name</label>
                        <input
                          type="text"
                          name="first_name"
                          value={userData.first_name}
                          onChange={handleInputChange}
                          className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Last Name</label>
                        <input
                          type="text"
                          name="last_name"
                          value={userData.last_name}
                          onChange={handleInputChange}
                          className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Mobile Number</label>
                      <input
                        type="tel"
                        name="mobile"
                        value={userData.mobile}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="09171234567"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Department</label>
                        <input
                          type="text"
                          name="department"
                          value={userData.department}
                          onChange={handleInputChange}
                          className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Position</label>
                        <input
                          type="text"
                          name="position"
                          value={userData.position}
                          onChange={handleInputChange}
                          className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Timezone</label>
                        <select
                          name="timezone"
                          value={userData.timezone}
                          onChange={handleInputChange}
                          className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="Asia/Manila">Asia/Manila (GMT+8)</option>
                          <option value="Asia/Tokyo">Asia/Tokyo (GMT+9)</option>
                          <option value="America/New_York">America/New_York (GMT-5)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Language</label>
                        <select
                          name="language"
                          value={userData.language}
                          onChange={handleInputChange}
                          className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="English">English</option>
                          <option value="Tagalog">Tagalog</option>
                          <option value="Spanish">Spanish</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Bio</label>
                      <textarea
                        name="bio"
                        value={userData.bio}
                        onChange={handleInputChange}
                        rows="3"
                        className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div className="flex gap-3 pt-4">
                      <button
                        onClick={handleSaveProfile}
                        disabled={saving}
                        className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                      >
                        <Save className="w-4 h-4" />
                        {saving ? 'Saving...' : 'Save Changes'}
                      </button>
                      <button
                        onClick={() => setIsEditing(false)}
                        className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* Security Tab */}
          {activeTab === 'security' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
                  <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                    <Lock className="w-5 h-5 text-blue-600" />
                    Security Settings
                  </h2>
                </div>
                <div className="divide-y divide-gray-100">
                  <div className="p-6 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">Password</p>
                      <p className="text-sm text-gray-500">Last changed 30 days ago</p>
                    </div>
                    <button
                      onClick={() => setIsChangingPassword(true)}
                      className="px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      Change Password
                    </button>
                  </div>
                  <div className="p-6 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">Two-Factor Authentication</p>
                      <p className="text-sm text-gray-500">Add an extra layer of security</p>
                    </div>
                    <button className="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
                      Enable
                    </button>
                  </div>
                  <div className="p-6 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">Login Notifications</p>
                      <p className="text-sm text-gray-500">Get notified on new device logins</p>
                    </div>
                    <div className="relative inline-flex h-6 w-11 items-center rounded-full bg-blue-600">
                      <span className="inline-block h-4 w-4 transform translate-x-6 rounded-full bg-white"></span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
                  <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                    <Fingerprint className="w-5 h-5 text-blue-600" />
                    Recent Login History
                  </h2>
                </div>
                <div className="divide-y divide-gray-100">
                  {[
                    { device: 'Chrome on Windows', location: 'Manila, Philippines', time: '2 hours ago', ip: '192.168.1.1' },
                    { device: 'Safari on iPhone', location: 'Manila, Philippines', time: 'Yesterday', ip: '192.168.1.2' },
                    { device: 'Firefox on Mac', location: 'Cebu, Philippines', time: '3 days ago', ip: '192.168.1.3' },
                  ].map((session, idx) => (
                    <div key={idx} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                      <div className="flex items-center gap-3">
                        <Monitor className="w-8 h-8 text-gray-400" />
                        <div>
                          <p className="font-medium text-gray-900">{session.device}</p>
                          <p className="text-sm text-gray-500">{session.location} • IP: {session.ip}</p>
                          <p className="text-xs text-gray-400">{session.time}</p>
                        </div>
                      </div>
                      {idx === 0 && <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded-full">Current</span>}
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* Activity Tab */}
          {activeTab === 'activity' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl shadow-lg overflow-hidden"
            >
              <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
                <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                  <Activity className="w-5 h-5 text-blue-600" />
                  Activity Log
                </h2>
              </div>
              <div className="divide-y divide-gray-100">
                {[
                  { action: 'Logged in successfully', time: '2 hours ago', status: 'success', details: 'IP: 192.168.1.1' },
                  { action: 'Updated system settings', time: 'Yesterday', status: 'success', details: 'Changed email notification preferences' },
                  { action: 'Approved business "Coffee Shop"', time: '3 days ago', status: 'success', details: 'Business ID: BUS-12345' },
                  { action: 'Generated monthly report', time: '5 days ago', status: 'success', details: 'Report: January 2024' },
                  { action: 'Failed login attempt', time: '1 week ago', status: 'error', details: 'Invalid password' },
                ].map((activity, idx) => (
                  <div key={idx} className="p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg ${
                        activity.status === 'success' ? 'bg-green-100' : 'bg-red-100'
                      }`}>
                        {activity.status === 'success' ? (
                          <CheckCircle className="w-4 h-4 text-green-600" />
                        ) : (
                          <X className="w-4 h-4 text-red-600" />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{activity.action}</p>
                        <p className="text-sm text-gray-500">{activity.details}</p>
                        <p className="text-xs text-gray-400 mt-1">{activity.time}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* Password Change Modal */}
      <AnimatePresence>
        {isChangingPassword && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setIsChangingPassword(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <Lock className="w-6 h-6 text-white" />
                    <h2 className="text-2xl font-bold text-white">Change Password</h2>
                  </div>
                  <button
                    onClick={() => setIsChangingPassword(false)}
                    className="p-1 hover:bg-white/20 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5 text-white" />
                  </button>
                </div>
              </div>

              <div className="p-6">
                {passwordSuccess && (
                  <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    {passwordSuccess}
                  </div>
                )}

                <form onSubmit={handlePasswordSubmit}>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Current Password</label>
                      <div className="relative">
                        <input
                          type={showCurrentPassword ? "text" : "password"}
                          name="currentPassword"
                          value={passwordData.currentPassword}
                          onChange={handlePasswordChange}
                          className={`w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500 ${
                            passwordErrors.currentPassword ? "border-red-500" : "border-gray-300"
                          }`}
                          placeholder="Enter current password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                        >
                          {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      {passwordErrors.currentPassword && (
                        <p className="text-red-500 text-xs mt-1">{passwordErrors.currentPassword}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">New Password</label>
                      <div className="relative">
                        <input
                          type={showNewPassword ? "text" : "password"}
                          name="newPassword"
                          value={passwordData.newPassword}
                          onChange={handlePasswordChange}
                          className={`w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500 ${
                            passwordErrors.newPassword ? "border-red-500" : "border-gray-300"
                          }`}
                          placeholder="Enter new password (min. 8 characters)"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                        >
                          {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      {passwordErrors.newPassword && (
                        <p className="text-red-500 text-xs mt-1">{passwordErrors.newPassword}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Confirm New Password</label>
                      <div className="relative">
                        <input
                          type={showConfirmPassword ? "text" : "password"}
                          name="confirmPassword"
                          value={passwordData.confirmPassword}
                          onChange={handlePasswordChange}
                          className={`w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500 ${
                            passwordErrors.confirmPassword ? "border-red-500" : "border-gray-300"
                          }`}
                          placeholder="Confirm new password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                        >
                          {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      {passwordErrors.confirmPassword && (
                        <p className="text-red-500 text-xs mt-1">{passwordErrors.confirmPassword}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-3 mt-6">
                    <button
                      type="submit"
                      className="flex-1 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-medium hover:shadow-lg transition-all"
                    >
                      Update Password
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsChangingPassword(false)}
                      className="flex-1 px-4 py-2.5 border-2 border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-all"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </AdminSidebarNav>
  );
};

export default AdminProfile;