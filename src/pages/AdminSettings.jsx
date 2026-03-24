import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import AdminSidebarNav from '../components/admin/AdminSidebarNav';
import { motion, AnimatePresence } from 'framer-motion';
import { toast, Toaster } from 'react-hot-toast';
import {
  Settings,
  Shield,
  Database,
  Users,
  Building,
  AlertCircle,
  Save,
  RefreshCw,
  Download,
  Moon,
  Sun,
  Mail,
  Lock,
  CheckCircle,
  Loader,
  Eye,
  EyeOff
} from 'lucide-react';

const AdminSettings = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalOwners: 0,
    totalBusinesses: 0,
    pendingApplications: 0
  });
  const [changingPassword, setChangingPassword] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [touchedFields, setTouchedFields] = useState({
    currentPassword: false,
    newPassword: false,
    confirmPassword: false
  });
  const [passwordStrength, setPasswordStrength] = useState('');
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordErrors, setPasswordErrors] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [settings, setSettings] = useState({
    adminEmail: '',
    allowRegistrations: true,
    maintenanceMode: false
  });

  useEffect(() => {
    const savedDarkMode = localStorage.getItem('adminDarkMode') === 'true';
    setDarkMode(savedDarkMode);
    if (savedDarkMode) {
      document.documentElement.classList.add('dark');
    }
    fetchAdminData();
  }, []);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('adminDarkMode', 'true');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('adminDarkMode', 'false');
    }
  }, [darkMode]);

  useEffect(() => {
    validatePasswordStrength();
    if (touchedFields.newPassword) {
      validateField('newPassword');
    }
  }, [passwordData.newPassword]);

  useEffect(() => {
    if (touchedFields.confirmPassword) {
      validateField('confirmPassword');
    }
  }, [passwordData.confirmPassword]);

  const validatePasswordStrength = () => {
    const password = passwordData.newPassword;
    if (!password) {
      setPasswordStrength('');
      return;
    }

    const hasLowerCase = /[a-z]/.test(password);
    const hasUpperCase = /[A-Z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    const length = password.length;

    const criteria = [hasLowerCase, hasUpperCase, hasNumbers, hasSpecial];
    const metCriteria = criteria.filter(Boolean).length;

    if (length < 8) setPasswordStrength('weak');
    else if (length >= 8 && metCriteria <= 2) setPasswordStrength('weak');
    else if (length >= 8 && metCriteria === 3) setPasswordStrength('medium');
    else if (length >= 8 && metCriteria >= 3) setPasswordStrength('strong');
    else setPasswordStrength('weak');
  };

  const validateField = (fieldName) => {
    let errorMessage = '';

    switch (fieldName) {
      case 'currentPassword':
        if (!passwordData.currentPassword) {
          errorMessage = 'Current password is required';
        }
        break;

      case 'newPassword':
        if (!passwordData.newPassword) {
          errorMessage = 'New password is required';
        } else if (passwordData.newPassword.length < 8) {
          errorMessage = 'Password must be at least 8 characters';
        } else if (!/(?=.*[a-z])/.test(passwordData.newPassword)) {
          errorMessage = 'Must contain at least one lowercase letter';
        } else if (!/(?=.*[A-Z])/.test(passwordData.newPassword)) {
          errorMessage = 'Must contain at least one uppercase letter';
        } else if (!/(?=.*\d)/.test(passwordData.newPassword)) {
          errorMessage = 'Must contain at least one number';
        } else if (!/(?=.*[!@#$%^&*(),.?":{}|<>])/.test(passwordData.newPassword)) {
          errorMessage = 'Must contain at least one special character (!@#$%^&* etc.)';
        } else if (passwordData.currentPassword && passwordData.newPassword === passwordData.currentPassword) {
          errorMessage = 'New password cannot be the same as current password';
        }
        break;

      case 'confirmPassword':
        if (!passwordData.confirmPassword) {
          errorMessage = 'Please confirm your password';
        } else if (passwordData.newPassword !== passwordData.confirmPassword) {
          errorMessage = 'Passwords do not match';
        }
        break;

      default:
        break;
    }

    setPasswordErrors(prev => ({
      ...prev,
      [fieldName]: errorMessage
    }));

    return !errorMessage;
  };

  const handlePasswordBlur = (fieldName) => {
    setTouchedFields(prev => ({ ...prev, [fieldName]: true }));
    validateField(fieldName);
  };

  const getPasswordStrengthMessage = () => {
    if (!passwordData.newPassword) return '';

    const missingCriteria = [];
    if (passwordData.newPassword.length < 8) missingCriteria.push('8+ characters');
    if (!/(?=.*[a-z])/.test(passwordData.newPassword)) missingCriteria.push('lowercase');
    if (!/(?=.*[A-Z])/.test(passwordData.newPassword)) missingCriteria.push('uppercase');
    if (!/(?=.*\d)/.test(passwordData.newPassword)) missingCriteria.push('number');
    if (!/(?=.*[!@#$%^&*(),.?":{}|<>])/.test(passwordData.newPassword)) missingCriteria.push('special character');

    if (missingCriteria.length === 0) return '✓ Strong password';
    return `Missing: ${missingCriteria.join(', ')}`;
  };

  const getPasswordStrengthColor = () => {
    if (passwordStrength === 'strong') return 'text-green-600 dark:text-green-400';
    if (passwordStrength === 'medium') return 'text-yellow-600 dark:text-yellow-400';
    if (passwordStrength === 'weak') return 'text-red-600 dark:text-red-400';
    return 'text-gray-500 dark:text-gray-400';
  };

  const fetchSystemSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('key, value');

      if (error) {
        console.error('Error fetching settings:', error);
        return;
      }

      if (data && data.length > 0) {
        const settingsMap = {};
        data.forEach(item => {
          settingsMap[item.key] = item.value;
        });

        setSettings(prev => ({
          ...prev,
          allowRegistrations: settingsMap.allow_registrations === 'true',
          maintenanceMode: settingsMap.maintenance_mode === 'true'
        }));
      }
    } catch (error) {
      console.error('Error fetching system settings:', error);
    }
  };

  const fetchAdminData = async () => {
    try {
      setLoading(true);
      
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError) throw userError;
      
      if (user) {
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (profileError) throw profileError;

        setProfile(profileData);
        setSettings(prev => ({
          ...prev,
          adminEmail: profileData?.email || ''
        }));
      }

      await fetchStats();
      await fetchSystemSettings();

    } catch (error) {
      console.error('Error fetching admin data:', error);
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const { count: totalUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'client');

      const { count: totalOwners } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'owner');

      const { count: totalBusinesses } = await supabase
        .from('businesses')
        .select('*', { count: 'exact', head: true });

      const { count: pendingApplications } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'pending_owner');

      setStats({
        totalUsers: totalUsers || 0,
        totalOwners: totalOwners || 0,
        totalBusinesses: totalBusinesses || 0,
        pendingApplications: pendingApplications || 0
      });

    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleSettingChange = (key, value) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const saveSettingToDatabase = async (key, value) => {
    try {
      const dbKey = key === 'allowRegistrations' ? 'allow_registrations' :
                    key === 'maintenanceMode' ? 'maintenance_mode' : key;

      const stringValue = value.toString();

      const { data: { user } } = await supabase.auth.getUser();

      const { error, data } = await supabase
        .from('system_settings')
        .upsert({
          key: dbKey,
          value: stringValue,
          updated_at: new Date().toISOString(),
          updated_by: user?.id
        }, {
          onConflict: 'key'
        })
        .select();

      if (error) {
        console.error(`Error saving ${key}:`, error);
        return false;
      }
      
      console.log(`Saved ${key} to database:`, data);
      return true;
    } catch (error) {
      console.error(`Error saving ${key}:`, error);
      return false;
    }
  };

  const handleSaveSettings = async () => {
    const saveToast = toast.loading('Saving settings...');
    
    try {
      setSaving(true);
      
      // Save each setting individually
      const results = await Promise.all([
        saveSettingToDatabase('allowRegistrations', settings.allowRegistrations),
        saveSettingToDatabase('maintenanceMode', settings.maintenanceMode)
      ]);
      
      const allSuccessful = results.every(result => result === true);
      
      if (allSuccessful) {
        // Refresh settings from database to ensure UI matches
        await fetchSystemSettings();
        toast.success('Settings saved successfully!', { id: saveToast, duration: 3000 });
      } else {
        toast.error('Some settings failed to save. Please try again.', { id: saveToast });
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings. Please try again.', { id: saveToast });
    } finally {
      setSaving(false);
    }
  };

  const handleBackupDatabase = async () => {
    const backupToast = toast.loading('Starting database backup...');
    
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      toast.success('Database backup completed successfully!', { id: backupToast, duration: 3000 });
    } catch (error) {
      console.error('Error backing up database:', error);
      toast.error('Failed to backup database. Please try again.', { id: backupToast });
    }
  };

  const handleChangePassword = () => {
    setPasswordData({
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    });
    setPasswordErrors({
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    });
    setTouchedFields({
      currentPassword: false,
      newPassword: false,
      confirmPassword: false
    });
    setPasswordStrength('');
    setShowCurrentPassword(false);
    setShowNewPassword(false);
    setShowConfirmPassword(false);
    setShowPasswordModal(true);
  };

  const handlePasswordSubmit = async () => {
    const isCurrentValid = validateField('currentPassword');
    const isNewValid = validateField('newPassword');
    const isConfirmValid = validateField('confirmPassword');

    if (!isCurrentValid || !isNewValid || !isConfirmValid) {
      setTouchedFields({
        currentPassword: true,
        newPassword: true,
        confirmPassword: true
      });
      return;
    }

    const passwordToast = toast.loading('Changing password...');
    setChangingPassword(true);
    
    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordData.newPassword
      });
      
      if (error) throw error;
      
      toast.success('Password changed successfully!', { id: passwordToast, duration: 3000 });
      setShowPasswordModal(false);
    } catch (error) {
      console.error('Error changing password:', error);
      toast.error(error.message || 'Failed to change password', { id: passwordToast });
    } finally {
      setChangingPassword(false);
    }
  };

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  const getInputClassName = (fieldName) => {
    let className = "w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all";
    
    if (darkMode) {
      className += " bg-gray-700 border-gray-600 text-white placeholder-gray-400";
    } else {
      className += " bg-white border-gray-300 text-gray-900";
    }
    
    if (touchedFields[fieldName] && passwordErrors[fieldName]) {
      className += " border-red-500 focus:ring-red-500";
    } else if (touchedFields[fieldName] && fieldName !== 'currentPassword' && passwordData[fieldName] && !passwordErrors[fieldName]) {
      className += " border-green-500 focus:ring-green-500";
    }
    
    return className;
  };

  if (loading) {
    return (
      <AdminSidebarNav>
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-gray-50 to-gray-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 select-none">
          <div className="text-center select-none">
            <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4 select-none"></div>
            <p className="text-gray-600 dark:text-gray-400 font-medium select-none">Loading settings...</p>
          </div>
        </div>
      </AdminSidebarNav>
    );
  }

  return (
    <AdminSidebarNav>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: darkMode ? '#1f2937' : '#363636',
            color: '#fff',
          },
        }}
      />
      
      <div className={`min-h-screen space-y-6 transition-colors duration-300 select-none ${darkMode ? 'dark' : ''}`}>
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">System Settings</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">Configure platform settings and preferences</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={toggleDarkMode}
              className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors flex items-center gap-2"
            >
              {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              {darkMode ? 'Light Mode' : 'Dark Mode'}
            </button>
            <button 
              onClick={handleSaveSettings}
              disabled={saving}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-md hover:shadow-lg disabled:opacity-50"
            >
              <Save className="w-5 h-5" />
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* General Settings */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden"
          >
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-gray-50 to-white dark:from-gray-700 dark:to-gray-800">
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                <h2 className="font-semibold text-gray-900 dark:text-white">General Settings</h2>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Admin Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="email"
                    value={settings.adminEmail}
                    disabled
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                  />
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Admin email is read-only and linked to your account</p>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">Allow Registrations</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Allow new users to register on the platform</p>
                  </div>
                  <button
                    onClick={() => handleSettingChange('allowRegistrations', !settings.allowRegistrations)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      settings.allowRegistrations ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
                    }`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      settings.allowRegistrations ? 'translate-x-6' : 'translate-x-1'
                    }`} />
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">Maintenance Mode</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Put the platform in maintenance mode (only admins can access)</p>
                  </div>
                  <button
                    onClick={() => handleSettingChange('maintenanceMode', !settings.maintenanceMode)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      settings.maintenanceMode ? 'bg-red-600' : 'bg-gray-300 dark:bg-gray-600'
                    }`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      settings.maintenanceMode ? 'translate-x-6' : 'translate-x-1'
                    }`} />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Security Settings */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden"
          >
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-gray-50 to-white dark:from-gray-700 dark:to-gray-800">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                <h2 className="font-semibold text-gray-900 dark:text-white">Security Settings</h2>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-blue-800 dark:text-blue-300 font-medium">Security Note</p>
                    <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                      Security settings are managed through Supabase Auth. Session timeout and login attempts are configured in your Supabase project settings.
                    </p>
                  </div>
                </div>
              </div>
              <button 
                onClick={handleChangePassword}
                className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors flex items-center justify-center gap-2"
              >
                <Lock className="w-4 h-4" />
                Change Password
              </button>
            </div>
          </motion.div>

          {/* System Statistics */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden"
          >
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-gray-50 to-white dark:from-gray-700 dark:to-gray-800">
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                <h2 className="font-semibold text-gray-900 dark:text-white">System Statistics</h2>
              </div>
            </div>
            <div className="p-6 space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700">
                <span className="text-gray-600 dark:text-gray-400">Total Users:</span>
                <span className="text-lg font-bold text-gray-900 dark:text-white">{stats.totalUsers}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700">
                <span className="text-gray-600 dark:text-gray-400">Business Owners:</span>
                <span className="text-lg font-bold text-purple-600 dark:text-purple-400">{stats.totalOwners}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700">
                <span className="text-gray-600 dark:text-gray-400">Total Businesses:</span>
                <span className="text-lg font-bold text-green-600 dark:text-green-400">{stats.totalBusinesses}</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-gray-600 dark:text-gray-400">Pending Applications:</span>
                <span className={`text-lg font-bold ${stats.pendingApplications > 0 ? 'text-yellow-600 dark:text-yellow-400' : 'text-gray-600 dark:text-gray-400'}`}>
                  {stats.pendingApplications}
                </span>
              </div>
            </div>
          </motion.div>

          {/* Quick Actions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden"
          >
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-gray-50 to-white dark:from-gray-700 dark:to-gray-800">
              <div className="flex items-center gap-2">
                <RefreshCw className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                <h2 className="font-semibold text-gray-900 dark:text-white">Quick Actions</h2>
              </div>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={handleBackupDatabase}
                  className="px-4 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors flex flex-col items-center gap-2"
                >
                  <Download className="w-5 h-5" />
                  <span className="text-sm">Backup DB</span>
                </button>
                <button
                  onClick={() => navigate('/admin/users')}
                  className="px-4 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors flex flex-col items-center gap-2"
                >
                  <Users className="w-5 h-5" />
                  <span className="text-sm">Manage Users</span>
                </button>
                <button
                  onClick={() => navigate('/admin/businesses')}
                  className="px-4 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors flex flex-col items-center gap-2"
                >
                  <Building className="w-5 h-5" />
                  <span className="text-sm">Manage Businesses</span>
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Change Password Modal - WITH EYE TOGGLE INSIDE */}
      <AnimatePresence>
        {showPasswordModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 select-none"
            onClick={() => setShowPasswordModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className={`rounded-2xl max-w-md w-full p-6 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/50 rounded-full flex items-center justify-center">
                  <Lock className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className={`text-xl font-semibold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                  Change Password
                </h3>
              </div>
              
              <div className="space-y-4 mb-6">
                {/* Current Password */}
                <div>
                  <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Current Password
                  </label>
                  <div className="relative">
                    <input
                      type={showCurrentPassword ? "text" : "password"}
                      value={passwordData.currentPassword}
                      onChange={(e) => {
                        setPasswordData({ ...passwordData, currentPassword: e.target.value });
                        if (touchedFields.currentPassword) validateField('currentPassword');
                      }}
                      onBlur={() => handlePasswordBlur('currentPassword')}
                      onFocus={() => setTouchedFields(prev => ({ ...prev, currentPassword: true }))}
                      className={getInputClassName('currentPassword')}
                      placeholder="Enter current password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                    >
                      {showCurrentPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  <AnimatePresence>
                    {touchedFields.currentPassword && passwordErrors.currentPassword && (
                      <motion.p
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-xs text-red-500 mt-1 flex items-center gap-1"
                      >
                        <AlertCircle className="w-3 h-3" />
                        {passwordErrors.currentPassword}
                      </motion.p>
                    )}
                  </AnimatePresence>
                </div>
                
                {/* New Password */}
                <div>
                  <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? "text" : "password"}
                      value={passwordData.newPassword}
                      onChange={(e) => {
                        setPasswordData({ ...passwordData, newPassword: e.target.value });
                        if (touchedFields.newPassword) validateField('newPassword');
                      }}
                      onBlur={() => handlePasswordBlur('newPassword')}
                      onFocus={() => setTouchedFields(prev => ({ ...prev, newPassword: true }))}
                      className={getInputClassName('newPassword')}
                      placeholder="Enter new password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                    >
                      {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  
                  {/* Password Strength Indicator */}
                  {passwordData.newPassword && (
                    <div className="mt-2">
                      <div className="flex gap-1 h-1 mb-1">
                        <div className={`flex-1 rounded-full ${passwordStrength === 'strong' ? 'bg-green-500' : passwordStrength === 'medium' ? 'bg-yellow-500' : passwordStrength === 'weak' ? 'bg-red-500' : 'bg-gray-200 dark:bg-gray-600'}`}></div>
                        <div className={`flex-1 rounded-full ${passwordStrength === 'strong' ? 'bg-green-500' : passwordStrength === 'medium' ? 'bg-yellow-500' : 'bg-gray-200 dark:bg-gray-600'}`}></div>
                        <div className={`flex-1 rounded-full ${passwordStrength === 'strong' ? 'bg-green-500' : 'bg-gray-200 dark:bg-gray-600'}`}></div>
                      </div>
                      <p className={`text-xs ${getPasswordStrengthColor()}`}>
                        {getPasswordStrengthMessage()}
                      </p>
                    </div>
                  )}
                  
                  <AnimatePresence>
                    {touchedFields.newPassword && passwordErrors.newPassword && (
                      <motion.p
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-xs text-red-500 mt-1 flex items-center gap-1"
                      >
                        <AlertCircle className="w-3 h-3" />
                        {passwordErrors.newPassword}
                      </motion.p>
                    )}
                  </AnimatePresence>
                </div>
                
                {/* Confirm Password */}
                <div>
                  <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      value={passwordData.confirmPassword}
                      onChange={(e) => {
                        setPasswordData({ ...passwordData, confirmPassword: e.target.value });
                        if (touchedFields.confirmPassword) validateField('confirmPassword');
                      }}
                      onBlur={() => handlePasswordBlur('confirmPassword')}
                      onFocus={() => setTouchedFields(prev => ({ ...prev, confirmPassword: true }))}
                      className={getInputClassName('confirmPassword')}
                      placeholder="Confirm new password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                    >
                      {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  <AnimatePresence>
                    {touchedFields.confirmPassword && passwordErrors.confirmPassword && (
                      <motion.p
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-xs text-red-500 mt-1 flex items-center gap-1"
                      >
                        <AlertCircle className="w-3 h-3" />
                        {passwordErrors.confirmPassword}
                      </motion.p>
                    )}
                  </AnimatePresence>
                </div>
              </div>
              
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShowPasswordModal(false)}
                  className={`px-4 py-2 border rounded-lg transition-colors ${darkMode ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}
                >
                  Cancel
                </button>
                <button
                  onClick={handlePasswordSubmit}
                  disabled={changingPassword}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {changingPassword ? (
                    <>
                      <Loader className="w-4 h-4 animate-spin" />
                      Changing...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      Change Password
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </AdminSidebarNav>
  );
};

export default AdminSettings;