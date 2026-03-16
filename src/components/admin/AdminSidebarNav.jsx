import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import './AdminSidebarNav.css';
// Import the logo from src/assets
import logo from '../../assets/logo.png';

const AdminSidebarNav = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [profile, setProfile] = useState(null);
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [stats, setStats] = useState({
    pendingApplications: 0,
    totalUsers: 0,
    totalBusinesses: 0
  });

  useEffect(() => {
    fetchProfile();
    fetchStats();
  }, []);

  const fetchProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate('/login');
        return;
      }

      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      setProfile(profileData);

      if (profileData?.avatar_url) {
        downloadAvatar(profileData.avatar_url);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const fetchStats = async () => {
    try {
      // Get pending owner applications
      const { count: pendingCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'pending_owner');

      // Get total users
      const { count: usersCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      // Get total businesses
      const { count: businessesCount } = await supabase
        .from('businesses')
        .select('*', { count: 'exact', head: true });

      setStats({ 
        pendingApplications: pendingCount || 0,
        totalUsers: usersCount || 0,
        totalBusinesses: businessesCount || 0
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const downloadAvatar = async (path) => {
    try {
      const { data, error } = await supabase.storage
        .from('avatars')
        .download(path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      setAvatarUrl(url);
    } catch (error) {
      console.error('Error downloading avatar:', error);
    }
  };

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      navigate('/login');
    } catch (err) {
      console.error('Error signing out:', err);
    }
  };

  const getInitials = (firstName, lastName) => {
    if (!firstName && !lastName) return 'A';
    return `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}`.toUpperCase();
  };

  const isActive = (path) => {
    return location.pathname === path;
  };

  const menuItems = [
    {
      path: '/admin-dashboard',
      icon: '📊',
      label: 'Dashboard',
      badge: null
    },
    {
      path: '/admin/users',
      icon: '👥',
      label: 'User Management',
      badge: stats.pendingApplications > 0 ? stats.pendingApplications : null
    },
    {
      path: '/admin/businesses',
      icon: '🏢',
      label: 'Business Management',
      badge: stats.totalBusinesses > 0 ? stats.totalBusinesses : null
    },
    {
      path: '/admin/settings',
      icon: '⚙️',
      label: 'Settings',
      badge: null
    },
    {
      path: '/admin/profile',
      icon: '👤',
      label: 'Profile',
      badge: null
    }
  ];

  return (
    <div className={`admin-layout ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      {/* Sidebar */}
      <aside className="admin-sidebar">
        <div className="sidebar-header">
          <div className="sidebar-logo" onClick={() => setSidebarCollapsed(!sidebarCollapsed)}>
            <img 
              src={logo} 
              alt="MEMSPHERE Logo" 
              className="sidebar-logo-image"
            />
            {!sidebarCollapsed && <span className="sidebar-logo-text">MEMSPHERE</span>}
          </div>
          <button className="sidebar-toggle" onClick={() => setSidebarCollapsed(!sidebarCollapsed)}>
            {sidebarCollapsed ? '→' : '←'}
          </button>
        </div>

        <nav className="sidebar-nav">
          {menuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`sidebar-nav-item ${isActive(item.path) ? 'active' : ''}`}
            >
              <span className="nav-icon">{item.icon}</span>
              {!sidebarCollapsed && (
                <>
                  <span className="nav-label">{item.label}</span>
                  {item.badge && item.badge > 0 && (
                    <span className="nav-badge">{item.badge}</span>
                  )}
                </>
              )}
              {sidebarCollapsed && item.badge && item.badge > 0 && (
                <span className="nav-badge collapsed">{item.badge}</span>
              )}
            </Link>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div 
            className="sidebar-user" 
            onClick={() => navigate('/admin/profile')}
            style={{ cursor: 'pointer' }}
          >
            <div className="user-avatar">
              {avatarUrl ? (
                <img src={avatarUrl} alt={profile?.first_name} />
              ) : (
                <div className="avatar-placeholder">
                  {getInitials(profile?.first_name, profile?.last_name)}
                </div>
              )}
            </div>
            {!sidebarCollapsed && (
              <div className="user-info">
                <span className="user-name">
                  {profile?.first_name ? `${profile.first_name} ${profile.last_name || ''}` : 'Admin User'}
                </span>
                <span className="user-role">Administrator</span>
              </div>
            )}
          </div>
          <button className="sidebar-logout" onClick={handleSignOut}>
            <span className="nav-icon">🚪</span>
            {!sidebarCollapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="admin-main">
        {/* Header */}
        <header className="admin-header">
          <h1 className="page-title">
            {menuItems.find(item => item.path === location.pathname)?.label || 'Admin Dashboard'}
          </h1>
          <div className="header-actions">
            <button className="notification-btn" onClick={() => navigate('/notifications')}>
              <span className="notification-icon">🔔</span>
              {stats.pendingApplications > 0 && (
                <span className="notification-badge">{stats.pendingApplications}</span>
              )}
            </button>
            <div className="user-greeting">
              <span className="greeting-wave">👋</span>
              <span className="greeting-text">Welcome,</span>
              <span className="greeting-name">{profile?.first_name || 'Admin'}</span>
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="admin-content">
          {children}
        </div>
      </main>
    </div>
  );
};

export default AdminSidebarNav;