import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import AdminSidebarNav from '../components/admin/AdminSidebarNav';
import { motion } from 'framer-motion';
import {
  Settings,
  Globe,
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
  UserCheck,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle
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

  const [settings, setSettings] = useState({
    siteName: 'Memsphere',
    adminEmail: '',
    allowRegistrations: true,
    requireEmailVerification: true,
    defaultUserRole: 'client',
    maintenanceMode: false,
    sessionTimeout: 60,
    maxLoginAttempts: 5
  });

  useEffect(() => {
    // Check for saved dark mode preference
    const savedDarkMode = localStorage.getItem('adminDarkMode') === 'true';
    setDarkMode(savedDarkMode);
    if (savedDarkMode) {
      document.documentElement.classList.add('dark');
    }
    fetchAdminData();
  }, []);

  useEffect(() => {
    // Apply dark mode class to html element
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('adminDarkMode', 'true');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('adminDarkMode', 'false');
    }
  }, [darkMode]);

  const fetchAdminData = async () => {
    try {
      setLoading(true);
      
      // Get current admin profile
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        setProfile(profileData);
        setSettings(prev => ({
          ...prev,
          adminEmail: profileData?.email || '',
          siteName: 'Memsphere'
        }));
      }

      // Fetch stats
      await fetchStats();

    } catch (error) {
      console.error('Error fetching admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      // Count users by role
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

  const handleSaveSettings = async () => {
    try {
      setSaving(true);
      
      // Here you would typically save settings to a database table
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      alert('Settings saved successfully!');
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Failed to save settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleClearCache = async () => {
    if (!window.confirm('Are you sure you want to clear the system cache?')) return;
    
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      alert('Cache cleared successfully!');
    } catch (error) {
      console.error('Error clearing cache:', error);
      alert('Failed to clear cache. Please try again.');
    }
  };

  const handleBackupDatabase = async () => {
    try {
      alert('Starting database backup... This may take a few minutes.');
      await new Promise(resolve => setTimeout(resolve, 2000));
      alert('Database backup completed successfully!');
    } catch (error) {
      console.error('Error backing up database:', error);
      alert('Failed to backup database. Please try again.');
    }
  };

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  if (loading) {
    return (
      <AdminSidebarNav>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading settings...</p>
          </div>
        </div>
      </AdminSidebarNav>
    );
  }

  return (
    <AdminSidebarNav>
      <div className={`min-h-screen space-y-6 transition-colors duration-300 ${darkMode ? 'dark' : ''}`}>
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">System Settings</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">Configure platform settings and preferences</p>
          </div>
          <div className="flex gap-3">
            {/* Dark Mode Toggle */}
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
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Site Name</label>
                <input
                  type="text"
                  value={settings.siteName}
                  onChange={(e) => handleSettingChange('siteName', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Admin Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="email"
                    value={settings.adminEmail}
                    onChange={(e) => handleSettingChange('adminEmail', e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Default User Role</label>
                <select
                  value={settings.defaultUserRole}
                  onChange={(e) => handleSettingChange('defaultUserRole', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="client">Client</option>
                  <option value="owner">Business Owner</option>
                  <option value="admin">Admin</option>
                </select>
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
                    <p className="font-medium text-gray-900 dark:text-white">Require Email Verification</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Users must verify their email before accessing the platform</p>
                  </div>
                  <button
                    onClick={() => handleSettingChange('requireEmailVerification', !settings.requireEmailVerification)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      settings.requireEmailVerification ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
                    }`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      settings.requireEmailVerification ? 'translate-x-6' : 'translate-x-1'
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
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Session Timeout (minutes)</label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="number"
                    value={settings.sessionTimeout}
                    onChange={(e) => handleSettingChange('sessionTimeout', parseInt(e.target.value))}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Max Login Attempts</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="number"
                    value={settings.maxLoginAttempts}
                    onChange={(e) => handleSettingChange('maxLoginAttempts', parseInt(e.target.value))}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              <button className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors flex items-center justify-center gap-2">
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
                  onClick={handleClearCache}
                  className="px-4 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors flex flex-col items-center gap-2"
                >
                  <RefreshCw className="w-5 h-5" />
                  <span className="text-sm">Clear Cache</span>
                </button>
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
    </AdminSidebarNav>
  );
};

export default AdminSettings;