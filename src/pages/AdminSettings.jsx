import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import AdminSidebarNav from '../components/admin/AdminSidebarNav';
import '../styles/AdminSettings.css';

const AdminSettings = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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
    maintenanceMode: false
  });

  useEffect(() => {
    fetchAdminData();
  }, []);

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
      // For now, we'll just simulate a save
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
      // Simulate cache clearing
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
      // Simulate backup
      await new Promise(resolve => setTimeout(resolve, 2000));
      alert('Database backup completed successfully!');
    } catch (error) {
      console.error('Error backing up database:', error);
      alert('Failed to backup database. Please try again.');
    }
  };

  if (loading) {
    return (
      <AdminSidebarNav>
        <div className="admin-loading">
          <div className="loading-spinner"></div>
          <p>Loading settings...</p>
        </div>
      </AdminSidebarNav>
    );
  }

  return (
    <AdminSidebarNav>
      <div className="settings-container">
        <h1 className="page-title">System Settings</h1>

        <div className="settings-grid">
          {/* General Settings */}
          <div className="settings-card">
            <h2>General Settings</h2>
            
            <div className="settings-form">
              <div className="form-group">
                <label>Site Name</label>
                <input
                  type="text"
                  value={settings.siteName}
                  onChange={(e) => handleSettingChange('siteName', e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Admin Email</label>
                <input
                  type="email"
                  value={settings.adminEmail}
                  onChange={(e) => handleSettingChange('adminEmail', e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Default User Role</label>
                <select
                  value={settings.defaultUserRole}
                  onChange={(e) => handleSettingChange('defaultUserRole', e.target.value)}
                >
                  <option value="client">Client</option>
                  <option value="owner">Owner</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <div className="toggle-group">
                <span>Allow Registrations</span>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={settings.allowRegistrations}
                    onChange={(e) => handleSettingChange('allowRegistrations', e.target.checked)}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>

              <div className="toggle-group">
                <span>Require Email Verification</span>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={settings.requireEmailVerification}
                    onChange={(e) => handleSettingChange('requireEmailVerification', e.target.checked)}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>

              <div className="toggle-group">
                <span>Maintenance Mode</span>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={settings.maintenanceMode}
                    onChange={(e) => handleSettingChange('maintenanceMode', e.target.checked)}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>
            </div>
          </div>

          {/* Security Settings */}
          <div className="settings-card">
            <h2>Security Settings</h2>
            
            <div className="settings-form">
              <div className="form-group">
                <label>Session Timeout (minutes)</label>
                <input
                  type="number"
                  defaultValue="60"
                />
              </div>

              <div className="form-group">
                <label>Max Login Attempts</label>
                <input
                  type="number"
                  defaultValue="5"
                />
              </div>

              <button className="btn-secondary">
                Change Password
              </button>
            </div>
          </div>

          {/* System Stats */}
          <div className="settings-card">
            <h2>System Statistics</h2>
            <div className="stats-list">
              <div className="stat-item">
                <span>Total Users:</span>
                <span className="stat-value">{stats.totalUsers}</span>
              </div>
              <div className="stat-item">
                <span>Business Owners:</span>
                <span className="stat-value">{stats.totalOwners}</span>
              </div>
              <div className="stat-item">
                <span>Total Businesses:</span>
                <span className="stat-value">{stats.totalBusinesses}</span>
              </div>
              <div className="stat-item">
                <span>Pending Applications:</span>
                <span className="stat-value pending">{stats.pendingApplications}</span>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="settings-card">
            <h2>Quick Actions</h2>
            <div className="quick-actions">
              <button onClick={handleClearCache} className="quick-action-btn">
                <span className="btn-icon">🗑️</span>
                Clear Cache
              </button>
              <button onClick={handleBackupDatabase} className="quick-action-btn">
                <span className="btn-icon">💾</span>
                Backup Database
              </button>
              <button onClick={() => navigate('/admin/users')} className="quick-action-btn">
                <span className="btn-icon">👥</span>
                Manage Users
              </button>
              <button onClick={() => navigate('/admin/businesses')} className="quick-action-btn">
                <span className="btn-icon">🏢</span>
                Manage Businesses
              </button>
            </div>
          </div>

          {/* Save Button */}
          <div className="settings-card save-card">
            <button
              onClick={handleSaveSettings}
              disabled={saving}
              className="btn-primary save-btn"
            >
              {saving ? (
                <>
                  <div className="loading-spinner-small"></div>
                  Saving...
                </>
              ) : (
                <>
                  💾 Save Settings
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </AdminSidebarNav>
  );
};

export default AdminSettings;