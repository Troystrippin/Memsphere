import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import AdminSidebarNav from '../components/admin/AdminSidebarNav';
import RejectionModal from '../components/admin/RejectionModal';
import { supabase } from '../lib/supabase';
import '../styles/AdminDashboard.css';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [avatarUrl, setAvatarUrl] = useState(null);
  
  // Modal state
  const [showRejectionModal, setShowRejectionModal] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState(null);
  
  // Data states
  const [applications, setApplications] = useState([]);
  const [recentOwners, setRecentOwners] = useState([]);
  const [stats, setStats] = useState({
    pendingApplications: 0,
    totalOwners: 0,
    totalUsers: 0,
    totalBusinesses: 0
  });

  // Add session check ref to prevent multiple calls
  const sessionChecked = React.useRef(false);

  useEffect(() => {
    // Prevent double execution in StrictMode
    if (sessionChecked.current) return;
    sessionChecked.current = true;
    
    checkAdmin();
  }, []);

  useEffect(() => {
    if (profile) {
      fetchDashboardData();
    }
  }, [profile]);

  const checkAdmin = async () => {
    try {
      setLoading(true);
      
      // Get session first to ensure we have a valid session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) throw sessionError;
      
      if (!session) {
        console.log('No session found, redirecting to login');
        navigate('/login');
        return;
      }

      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError) {
        // If we get an auth error, try to refresh the session
        if (userError.message?.includes('Auth session missing')) {
          console.log('Session missing, attempting to refresh...');
          const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
          
          if (refreshError || !refreshData.session) {
            navigate('/login');
            return;
          }
          
          // Retry with refreshed session
          const { data: retryUser, error: retryError } = await supabase.auth.getUser();
          if (retryError) throw retryError;
          user = retryUser;
        } else {
          throw userError;
        }
      }
      
      if (!user) {
        navigate('/login');
        return;
      }

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileError) {
        console.error('Profile error:', profileError);
        // If profile doesn't exist, create a default one
        if (profileError.code === 'PGRST116') {
          // Create default profile
          const { data: newProfile, error: createError } = await supabase
            .from('profiles')
            .insert([{
              id: user.id,
              email: user.email,
              role: 'admin',
              first_name: 'Admin',
              last_name: 'User',
              verification_status: 'approved'
            }])
            .select()
            .single();
            
          if (createError) throw createError;
          setProfile(newProfile);
        } else {
          throw profileError;
        }
      } else {
        setProfile(profileData);
      }

      if (profileData?.avatar_url) {
        downloadAvatar(profileData.avatar_url);
      }

    } catch (err) {
      console.error('Error checking admin:', err);
      
      // Handle specific error cases
      if (err.message?.includes('Auth session missing') || 
          err.message?.includes('JWT') ||
          err.message?.includes('refresh_token')) {
        console.log('Auth error, redirecting to login');
        navigate('/login');
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchDashboardData = async () => {
    try {
      await fetchStats();
      await fetchApplications();
      await fetchRecentOwners();
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      // Don't set error state here to avoid blocking the UI
    }
  };

  const fetchStats = async () => {
    try {
      // Check if we have a valid session before making requests
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.log('No session for stats fetch');
        return;
      }

      const { count: pendingApplications } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'pending_owner');

      const { count: totalOwners } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'owner');

      const { count: totalUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'client');

      const { count: totalBusinesses } = await supabase
        .from('businesses')
        .select('*', { count: 'exact', head: true });

      setStats({
        pendingApplications: pendingApplications || 0,
        totalOwners: totalOwners || 0,
        totalUsers: totalUsers || 0,
        totalBusinesses: totalBusinesses || 0
      });

    } catch (error) {
      console.error('Error fetching stats:', error);
      // Don't throw, just log
    }
  };

  const fetchApplications = async () => {
    try {
      // Check session before making request
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id,
          email,
          first_name,
          last_name,
          mobile,
          avatar_url,
          created_at,
          businesses (
            id,
            name,
            business_type,
            location,
            description,
            emoji,
            verification_status,
            submitted_at
          )
        `)
        .eq('role', 'pending_owner')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const processedData = await Promise.all((data || []).map(async (item) => {
        let avatarUrl = null;
        if (item.avatar_url) {
          avatarUrl = await getAvatarUrl(item.avatar_url, item.id);
        }
        return { ...item, avatarUrl };
      }));

      setApplications(processedData);
    } catch (error) {
      console.error('Error fetching applications:', error);
      // Don't throw, just log
    }
  };

  const fetchRecentOwners = async () => {
    try {
      // Check session before making request
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id,
          email,
          first_name,
          last_name,
          mobile,
          avatar_url,
          created_at,
          businesses (id, name, business_type, emoji)
        `)
        .eq('role', 'owner')
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;

      const processedData = await Promise.all((data || []).map(async (item) => {
        let avatarUrl = null;
        if (item.avatar_url) {
          avatarUrl = await getAvatarUrl(item.avatar_url, item.id);
        }
        return { ...item, avatarUrl };
      }));

      setRecentOwners(processedData);
    } catch (error) {
      console.error('Error fetching recent owners:', error);
      // Don't throw, just log
    }
  };

  const getAvatarUrl = async (avatarPath, userId) => {
    if (!avatarPath) return null;

    try {
      const { data: publicUrlData } = supabase
        .storage
        .from('avatars')
        .getPublicUrl(avatarPath);
      
      if (publicUrlData?.publicUrl) {
        try {
          const response = await fetch(publicUrlData.publicUrl, { method: 'HEAD' });
          if (response.ok) {
            return publicUrlData.publicUrl;
          }
        } catch (e) {
          console.log('Public URL not accessible, trying download...');
        }
      }

      const { data, error } = await supabase.storage
        .from('avatars')
        .download(avatarPath);

      if (error) throw error;

      return URL.createObjectURL(data);
    } catch (error) {
      console.error('Error getting avatar URL:', error);
      return null;
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

  const handleApproveClick = (application) => {
    setSelectedApplication(application);
    handleApproveOwner(application.id, application.businesses?.[0]?.id);
  };

  const handleRejectClick = (application) => {
    setSelectedApplication(application);
    setShowRejectionModal(true);
  };

  const handleApproveOwner = async (userId, businessId) => {
    try {
      // Check session before proceeding
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        alert('Your session has expired. Please login again.');
        navigate('/login');
        return;
      }

      // Get current admin profile
      const { data: adminProfile, error: adminError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', profile?.id)
        .single();

      if (adminError) throw adminError;

      // Update profile to owner
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ 
          role: 'owner', 
          verification_status: 'approved',
          approved_at: new Date(),
          approved_by: adminProfile?.id,
          application_reviewed_at: new Date()
        })
        .eq('id', userId);

      if (profileError) throw profileError;

      // Update business to approved
      const { error: businessError } = await supabase
        .from('businesses')
        .update({ 
          verification_status: 'approved',
          status: 'active',
          verified_at: new Date(),
          verified_by: adminProfile?.id
        })
        .eq('id', businessId);

      if (businessError) throw businessError;

      // Log verification
      await supabase
        .from('verification_logs')
        .insert({
          business_id: businessId,
          owner_id: userId,
          action_by: adminProfile?.id,
          action_type: 'approve',
          created_at: new Date()
        });

      // Notify owner
      await supabase
        .from('notifications')
        .insert({
          user_id: userId,
          type: 'application_approved',
          title: 'Application Approved! 🎉',
          message: 'Your business owner application has been approved! You can now log in and start managing your business.',
          data: { businessId },
          created_at: new Date()
        });

      fetchDashboardData();
      alert('Owner application approved successfully!');
    } catch (error) {
      console.error('Error approving owner:', error);
      
      // Handle session errors
      if (error.message?.includes('Auth session missing') || 
          error.message?.includes('JWT')) {
        alert('Your session has expired. Please login again.');
        navigate('/login');
      } else {
        alert('Failed to approve owner. Please try again.');
      }
    }
  };

  const handleRejectOwner = async (reason) => {
    if (!selectedApplication) return;

    const userId = selectedApplication.id;
    const businessId = selectedApplication.businesses?.[0]?.id;

    try {
      // Check session before proceeding
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        alert('Your session has expired. Please login again.');
        navigate('/login');
        return;
      }

      // Get current admin profile
      const { data: adminProfile, error: adminError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', profile?.id)
        .single();

      if (adminError) throw adminError;

      // Update profile to rejected_owner
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ 
          role: 'rejected_owner', 
          verification_status: 'rejected',
          rejected_at: new Date(),
          application_reviewed_at: new Date()
        })
        .eq('id', userId);

      if (profileError) throw profileError;

      // Update business to rejected
      const { error: businessError } = await supabase
        .from('businesses')
        .update({ 
          verification_status: 'rejected',
          status: 'rejected',
          rejection_reason: reason
        })
        .eq('id', businessId);

      if (businessError) throw businessError;

      // Log rejection
      await supabase
        .from('verification_logs')
        .insert({
          business_id: businessId,
          owner_id: userId,
          action_by: adminProfile?.id,
          action_type: 'reject',
          reason: reason,
          created_at: new Date()
        });

      // Notify owner
      await supabase
        .from('notifications')
        .insert({
          user_id: userId,
          type: 'application_rejected',
          title: 'Application Update',
          message: reason || 'Your application was not approved. Please contact support for more information.',
          data: { reason },
          created_at: new Date()
        });

      fetchDashboardData();
      alert('Owner application rejected.');
    } catch (error) {
      console.error('Error rejecting owner:', error);
      
      // Handle session errors
      if (error.message?.includes('Auth session missing') || 
          error.message?.includes('JWT')) {
        alert('Your session has expired. Please login again.');
        navigate('/login');
      } else {
        alert('Failed to reject application. Please try again.');
      }
    } finally {
      setShowRejectionModal(false);
      setSelectedApplication(null);
    }
  };

  const getInitials = (firstName, lastName) => {
    if (!firstName && !lastName) return '??';
    return `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}`.toUpperCase();
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (e) {
      return 'Invalid Date';
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

  // Add retry function
  const handleRetry = () => {
    sessionChecked.current = false;
    setError(null);
    setLoading(true);
    checkAdmin();
  };

  if (loading) {
    return (
      <div className="admin-loading">
        <div className="loading-spinner"></div>
        <p>Loading admin dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-error">
        <h2>Error</h2>
        <p>{error}</p>
        <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
          <button onClick={handleRetry} className="btn-error" style={{ background: '#2563eb' }}>
            Retry
          </button>
          <button onClick={handleSignOut} className="btn-error">
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  const firstName = profile?.first_name || 'Admin';

  return (
    <AdminSidebarNav>
      <div className="admin-dashboard-content">
        {/* Stats Cards */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon-wrapper pending">
              <span className="stat-icon">⏳</span>
            </div>
            <div className="stat-content">
              <span className="stat-value">{stats.pendingApplications}</span>
              <span className="stat-label">Pending Applications</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon-wrapper owners">
              <span className="stat-icon">👥</span>
            </div>
            <div className="stat-content">
              <span className="stat-value">{stats.totalOwners}</span>
              <span className="stat-label">Business Owners</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon-wrapper users">
              <span className="stat-icon">👤</span>
            </div>
            <div className="stat-content">
              <span className="stat-value">{stats.totalUsers}</span>
              <span className="stat-label">Total Users</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon-wrapper businesses">
              <span className="stat-icon">🏢</span>
            </div>
            <div className="stat-content">
              <span className="stat-value">{stats.totalBusinesses}</span>
              <span className="stat-label">Businesses</span>
            </div>
          </div>
        </div>

        {/* Pending Applications Section */}
        <div className="dashboard-section">
          <div className="section-header">
            <h2 className="section-title">Pending Applications</h2>
            {applications.length > 0 && (
              <Link to="/admin/users?tab=pending" className="view-all-link">
                View All ({applications.length})
              </Link>
            )}
          </div>
          
          {applications.length > 0 ? (
            <div className="applications-list">
              {applications.slice(0, 3).map((app) => (
                <div key={app.id} className="application-card">
                  <div className="application-header">
                    <div className="applicant-info">
                      <div className="applicant-avatar">
                        {app.avatarUrl ? (
                          <img src={app.avatarUrl} alt={app.first_name} />
                        ) : (
                          <div className="avatar-placeholder">
                            {getInitials(app.first_name, app.last_name)}
                          </div>
                        )}
                      </div>
                      <div className="applicant-details">
                        <h3>{app.first_name} {app.last_name}</h3>
                        <p>{app.email}</p>
                        <p className="applicant-phone">{app.mobile || 'No phone'}</p>
                      </div>
                    </div>
                    <div className="application-date">
                      Applied: {formatDate(app.created_at)}
                    </div>
                  </div>

                  {app.businesses && app.businesses.length > 0 && (
                    <div className="business-details">
                      <h4>Business Information</h4>
                      {app.businesses.map((business) => (
                        <div key={business.id} className="business-item">
                          <span className="business-emoji">{business.emoji || '🏢'}</span>
                          <div className="business-info">
                            <p className="business-name">{business.name}</p>
                            <p className="business-type">{business.business_type}</p>
                            <p className="business-location">{business.location}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="application-actions">
                    <button
                      className="btn-approve"
                      onClick={() => handleApproveClick(app)}
                    >
                      ✓ Approve
                    </button>
                    <button
                      className="btn-reject"
                      onClick={() => handleRejectClick(app)}
                    >
                      ✗ Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-icon">📋</div>
              <h3>No Pending Applications</h3>
              <p>There are no business owner applications to review.</p>
            </div>
          )}
        </div>

        {/* Recent Business Owners Section */}
        <div className="dashboard-section">
          <div className="section-header">
            <h2 className="section-title">Recent Business Owners</h2>
            {stats.totalOwners > 0 && (
              <Link to="/admin/users?tab=owners" className="view-all-link">
                View All ({stats.totalOwners})
              </Link>
            )}
          </div>
          
          {recentOwners.length > 0 ? (
            <div className="recent-owners-grid">
              {recentOwners.map((owner) => (
                <div key={owner.id} className="recent-owner-card">
                  <div className="recent-owner-header">
                    <div className="recent-owner-avatar">
                      {owner.avatarUrl ? (
                        <img src={owner.avatarUrl} alt={owner.first_name} />
                      ) : (
                        <div className="avatar-placeholder-small">
                          {getInitials(owner.first_name, owner.last_name)}
                        </div>
                      )}
                    </div>
                    <div className="recent-owner-info">
                      <h4>{owner.first_name} {owner.last_name}</h4>
                      <p>{owner.email}</p>
                    </div>
                  </div>
                  <div className="recent-owner-business">
                    {owner.businesses && owner.businesses.length > 0 ? (
                      <span className="business-badge">
                        {owner.businesses[0].emoji} {owner.businesses[0].name}
                      </span>
                    ) : (
                      <span className="no-business">No business yet</span>
                    )}
                  </div>
                  <div className="recent-owner-footer">
                    <span className="joined-date">
                      Joined {formatDate(owner.created_at)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-icon">👥</div>
              <h3>No Business Owners</h3>
              <p>There are no registered business owners yet.</p>
            </div>
          )}
        </div>
      </div>

      {/* Rejection Modal */}
      <RejectionModal
        isOpen={showRejectionModal}
        onClose={() => {
          setShowRejectionModal(false);
          setSelectedApplication(null);
        }}
        onConfirm={handleRejectOwner}
        ownerName={selectedApplication ? `${selectedApplication.first_name} ${selectedApplication.last_name}` : ''}
        businessName={selectedApplication?.businesses?.[0]?.name || ''}
      />
    </AdminSidebarNav>
  );
};

export default AdminDashboard;