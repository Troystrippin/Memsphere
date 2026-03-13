import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import OwnerNavbar from '../components/owner/OwnerNavbar';
import '../styles/OwnerDashboard.css';

const OwnerDashboard = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [businesses, setBusinesses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [avatarUrl, setAvatarUrl] = useState(null);
  
  const [stats, setStats] = useState({
    totalMembers: 0,
    pendingRenewals: 0,
    newApplications: 0,
    monthlyRevenue: '0'
  });
  
  const [recentApplications, setRecentApplications] = useState([]);
  const [clientAvatars, setClientAvatars] = useState({});

  useEffect(() => {
    fetchOwnerData();
  }, []);

  const fetchOwnerData = async () => {
    try {
      setLoading(true);
      
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError) throw userError;
      
      if (!user) {
        navigate('/login');
        return;
      }

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileError) throw profileError;
      
      if (profileData?.role !== 'owner') {
        navigate('/ClientDashboard');
        return;
      }
      
      setProfile(profileData);

      if (profileData?.avatar_url) {
        downloadAvatar(profileData.avatar_url);
      }

      const { data: businessesData, error: businessesError } = await supabase
        .from('businesses')
        .select('*')
        .eq('owner_id', user.id);

      if (businessesError) throw businessesError;
      
      setBusinesses(businessesData || []);
      
      if (businessesData && businessesData.length > 0) {
        const businessIds = businessesData.map(b => b.id);
        await fetchBusinessStats(businessIds);
        await fetchRecentApplications(businessIds);
      }

    } catch (err) {
      console.error('Error fetching owner data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getClientAvatarUrl = async (avatarPath, userId) => {
    if (!avatarPath) return null;
    
    if (clientAvatars[userId]) {
      return clientAvatars[userId];
    }

    try {
      const { data: publicUrlData } = supabase
        .storage
        .from('avatars')
        .getPublicUrl(avatarPath);
      
      if (publicUrlData?.publicUrl) {
        try {
          const response = await fetch(publicUrlData.publicUrl, { method: 'HEAD' });
          if (response.ok) {
            setClientAvatars(prev => ({ ...prev, [userId]: publicUrlData.publicUrl }));
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

      const url = URL.createObjectURL(data);
      setClientAvatars(prev => ({ ...prev, [userId]: url }));
      return url;
    } catch (error) {
      console.error('Error getting client avatar:', error);
      return null;
    }
  };

  const fetchBusinessStats = async (businessIds) => {
    try {
      const { count: totalMembers } = await supabase
        .from('memberships')
        .select('*', { count: 'exact', head: true })
        .in('business_id', businessIds)
        .eq('status', 'approved');

      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);
      
      const { count: pendingRenewals } = await supabase
        .from('memberships')
        .select('*', { count: 'exact', head: true })
        .in('business_id', businessIds)
        .eq('status', 'approved')
        .lte('end_date', nextWeek.toISOString())
        .gte('end_date', new Date().toISOString());

      const { count: newApplications } = await supabase
        .from('memberships')
        .select('*', { count: 'exact', head: true })
        .in('business_id', businessIds)
        .eq('status', 'pending');

      const firstDayOfMonth = new Date();
      firstDayOfMonth.setDate(1);
      firstDayOfMonth.setHours(0, 0, 0, 0);

      const lastDayOfMonth = new Date();
      lastDayOfMonth.setMonth(lastDayOfMonth.getMonth() + 1);
      lastDayOfMonth.setDate(0);
      lastDayOfMonth.setHours(23, 59, 59, 999);

      const { data: monthlyApprovals } = await supabase
        .from('memberships')
        .select('price_paid')
        .in('business_id', businessIds)
        .eq('status', 'approved')
        .gte('created_at', firstDayOfMonth.toISOString())
        .lte('created_at', lastDayOfMonth.toISOString());

      const { data: monthlyPayments } = await supabase
        .from('payments')
        .select('amount')
        .in('business_id', businessIds)
        .eq('payment_status', 'paid')
        .gte('paid_at', firstDayOfMonth.toISOString())
        .lte('paid_at', lastDayOfMonth.toISOString());

      const membershipRevenue = monthlyApprovals?.reduce((sum, m) => sum + (m.price_paid || 0), 0) || 0;
      const paymentRevenue = monthlyPayments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;
      const totalMonthlyRevenue = membershipRevenue + paymentRevenue;

      setStats({
        totalMembers: totalMembers || 0,
        pendingRenewals: pendingRenewals || 0,
        newApplications: newApplications || 0,
        monthlyRevenue: totalMonthlyRevenue.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
      });

    } catch (error) {
      console.error('Error fetching business stats:', error);
    }
  };

  const fetchRecentApplications = async (businessIds) => {
    try {
      const { data: memberships } = await supabase
        .from('memberships')
        .select(`
          id,
          status,
          price_paid,
          payment_method,
          payment_status,
          created_at,
          user_id,
          profiles:user_id (
            id,
            first_name,
            last_name,
            email,
            avatar_url
          ),
          plans:plan_id (
            name,
            duration
          ),
          business:business_id (
            id,
            name
          )
        `)
        .in('business_id', businessIds)
        .order('created_at', { ascending: false })
        .limit(5);

      const processedApplications = await Promise.all((memberships || []).map(async (app) => {
        let avatarUrl = null;
        if (app.profiles?.avatar_url) {
          avatarUrl = await getClientAvatarUrl(app.profiles.avatar_url, app.profiles.id);
        }

        const timeAgo = getTimeAgo(new Date(app.created_at));
        const formattedDate = new Date(app.created_at).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });

        return {
          id: app.id,
          name: app.profiles ? 
            `${app.profiles.first_name || ''} ${app.profiles.last_name || ''}`.trim() || 
            app.profiles.email?.split('@')[0] || 
            'Unknown User' : 
            'Unknown User',
          email: app.profiles?.email || 'No email',
          plan: app.plans?.name || 'Standard Plan',
          amount: `₱${app.price_paid?.toLocaleString() || '0'}`,
          status: app.status,
          paymentStatus: app.payment_status,
          paymentMethod: app.payment_method,
          timeAgo: timeAgo,
          formattedDate: formattedDate,
          avatarUrl: avatarUrl,
          businessName: app.business?.name || 'Unknown Business'
        };
      }));

      setRecentApplications(processedApplications);

    } catch (error) {
      console.error('Error fetching recent applications:', error);
    }
  };

  const getTimeAgo = (date) => {
    const seconds = Math.floor((new Date() - date) / 1000);
    
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + ' years ago';
    
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + ' months ago';
    
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + ' days ago';
    
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + ' hours ago';
    
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + ' minutes ago';
    
    return Math.floor(seconds) + ' seconds ago';
  };

  const getStatusBadge = (status) => {
    switch(status) {
      case 'approved':
        return (
          <span className="status-badge-card approved">
            <span className="status-icon">✅</span>
            <span className="status-text">Approved</span>
          </span>
        );
      case 'pending':
        return (
          <span className="status-badge-card pending">
            <span className="status-icon">⏳</span>
            <span className="status-text">Pending</span>
          </span>
        );
      case 'rejected':
        return (
          <span className="status-badge-card rejected">
            <span className="status-icon">❌</span>
            <span className="status-text">Rejected</span>
          </span>
        );
      default:
        return <span className="status-badge-card">{status}</span>;
    }
  };

  const getPaymentStatusBadge = (status) => {
    switch(status?.toLowerCase()) {
      case 'paid':
        return (
          <span className="payment-badge-card paid">
            <span className="payment-icon">✓</span>
            <span className="payment-text">Paid</span>
          </span>
        );
      case 'pending':
        return (
          <span className="payment-badge-card pending">
            <span className="payment-icon">⏳</span>
            <span className="payment-text">Pending</span>
          </span>
        );
      default:
        return <span className="payment-badge-card">{status}</span>;
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

  const getFirstName = () => {
    if (profile?.first_name) {
      return profile.first_name;
    }
    return 'Owner';
  };

  const getInitials = (firstName, lastName) => {
    return `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}`.toUpperCase();
  };

  const handleViewApplication = (appId) => {
    navigate('/applications', { state: { highlightId: appId } });
  };

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="loading-spinner"></div>
        <p>Loading owner dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-error">
        <h2>Error</h2>
        <p>{error}</p>
        <button onClick={() => supabase.auth.signOut()} className="btn-error">
          Sign Out
        </button>
      </div>
    );
  }

  const firstName = getFirstName();

  return (
    <div className="dashboard-container">
      <OwnerNavbar 
        profile={profile} 
        avatarUrl={avatarUrl}
      />

      <div className="content-wrapper">
        <main className="dashboard-main">
          {/* Header - Matching Applications page style */}
          <div className="dashboard-header">
            <div className="header-left">
              <h2 className="page-title">
                Owner Dashboard
                <span className="title-glow"></span>
              </h2>
              <div className="header-decoration"></div>
            </div>
            <div className="header-right">
              <div className="user-greeting">
                <span className="greeting-wave">👋</span>
                <span className="greeting-text">Welcome back,</span>
                <span className="greeting-name">{firstName}</span>
              </div>
            </div>
          </div>

          {/* Enhanced Stats Cards - Without trend indicators */}
          <div className="stats-grid-enhanced">
            <div className="stat-card-enhanced">
              <div className="stat-icon-wrapper members">
                <span className="stat-icon">👥</span>
              </div>
              <div className="stat-content">
                <span className="stat-value">{stats.totalMembers}</span>
                <span className="stat-label">Total Members</span>
              </div>
            </div>
            
            <div className="stat-card-enhanced">
              <div className="stat-icon-wrapper renewals">
                <span className="stat-icon">🔄</span>
              </div>
              <div className="stat-content">
                <span className="stat-value">{stats.pendingRenewals}</span>
                <span className="stat-label">Pending Renewals</span>
              </div>
            </div>
            
            <div className="stat-card-enhanced highlight">
              <div className="stat-icon-wrapper applications">
                <span className="stat-icon">📝</span>
              </div>
              <div className="stat-content">
                <span className="stat-value">{stats.newApplications}</span>
                <span className="stat-label">New Applications</span>
                {stats.newApplications > 0 && (
                  <span className="stat-badge pulse">Needs Review</span>
                )}
              </div>
            </div>
            
            <div className="stat-card-enhanced">
              <div className="stat-icon-wrapper revenue">
                <span className="stat-icon">💰</span>
              </div>
              <div className="stat-content">
                <span className="stat-value">₱{stats.monthlyRevenue}</span>
                <span className="stat-label">Monthly Revenue</span>
              </div>
            </div>
          </div>

          {/* Recent Applications Section */}
          <div className="recent-applications-section-enhanced">
            <div className="section-header-enhanced">
              <div className="header-left">
                <h3 className="section-title-enhanced">
                  <span className="title-icon">📋</span>
                  Recent Applications
                </h3>
                <p className="section-subtitle-enhanced">Latest membership requests</p>
              </div>
              <button 
                className="view-all-btn-enhanced"
                onClick={() => navigate('/applications')}
              >
                View All Applications
                <span className="btn-arrow">→</span>
              </button>
            </div>
            
            {recentApplications.length > 0 ? (
              <div className="applications-grid-enhanced">
                {recentApplications.map((app) => (
                  <div key={app.id} className={`application-card-enhanced ${app.status}`}>
                    <div className="application-card-header">
                      <div className="applicant-avatar-large">
                        {app.avatarUrl ? (
                          <img 
                            src={app.avatarUrl} 
                            alt={app.name}
                            onError={(e) => {
                              e.target.style.display = 'none';
                              e.target.parentNode.innerHTML = `<div class="avatar-placeholder">${getInitials(app.name.split(' ')[0], app.name.split(' ')[1])}</div>`;
                            }}
                          />
                        ) : (
                          <div className="avatar-placeholder">
                            {getInitials(app.name.split(' ')[0], app.name.split(' ')[1])}
                          </div>
                        )}
                      </div>
                      <div className="applicant-info">
                        <h4 className="applicant-name">{app.name}</h4>
                        <span className="applicant-email">{app.email}</span>
                      </div>
                    </div>

                    <div className="application-card-body">
                      <div className="application-details-grid">
                        <div className="detail-item">
                          <span className="detail-label">Plan</span>
                          <span className="detail-value">{app.plan}</span>
                        </div>
                        <div className="detail-item">
                          <span className="detail-label">Amount</span>
                          <span className="detail-value amount">{app.amount}</span>
                        </div>
                        <div className="detail-item">
                          <span className="detail-label">Business</span>
                          <span className="detail-value">{app.businessName}</span>
                        </div>
                        <div className="detail-item">
                          <span className="detail-label">Payment</span>
                          <span className="detail-value capitalize">{app.paymentMethod || 'Not specified'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="application-card-footer">
                      <div className="application-badges">
                        {getStatusBadge(app.status)}
                        {getPaymentStatusBadge(app.paymentStatus)}
                      </div>
                      <div className="application-meta-info">
                        <span className="application-time" title={app.formattedDate}>
                          <span className="time-icon">🕒</span>
                          {app.timeAgo}
                        </span>
                        <button 
                          className="view-details-btn"
                          onClick={() => handleViewApplication(app.id)}
                        >
                          View Details
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state-enhanced">
                <div className="empty-icon">📋</div>
                <h3>No Recent Applications</h3>
                <p>When customers apply for memberships, they'll appear here</p>
                <button 
                  className="btn-view-pending"
                  onClick={() => navigate('/applications')}
                >
                  Go to Applications
                </button>
              </div>
            )}
          </div>

          {/* Your Businesses Section */}
          {businesses.length > 0 && (
            <div className="businesses-section-enhanced">
              <div className="section-header-enhanced">
                <h3 className="section-title-enhanced">
                  <span className="title-icon">🏢</span>
                  Your Businesses
                </h3>
              </div>
              <div className="businesses-grid-enhanced">
                {businesses.map(business => (
                  <div key={business.id} className="business-card-enhanced">
                    <span className="business-emoji-large">{business.emoji || '🏢'}</span>
                    <div className="business-card-info">
                      <h4 className="business-card-name">{business.name}</h4>
                      <p className="business-card-location">{business.location || 'No location set'}</p>
                      <span className="business-type-badge-large">{business.business_type}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default OwnerDashboard;