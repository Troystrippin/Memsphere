import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import OwnerNavbar from '../components/owner/OwnerNavbar';
import '../styles/Analytics.css';

const Analytics = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [timeRange, setTimeRange] = useState('month'); // week, month, year
  const [analyticsData, setAnalyticsData] = useState({
    totalRevenue: 0,
    totalMembers: 0,
    activeMembers: 0,
    newMembers: 0,
    renewalRate: 0,
    popularPlans: [],
    revenueByMonth: [],
    membershipTrend: []
  });

  useEffect(() => {
    fetchUserProfile();
    fetchAnalyticsData();
  }, [timeRange]);

  const fetchUserProfile = async () => {
    try {
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
      
      setProfile(profileData);

      if (profileData?.avatar_url) {
        downloadAvatar(profileData.avatar_url);
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
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

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError) throw userError;
      
      if (!user) {
        navigate('/login');
        return;
      }

      // Get owner's businesses
      const { data: businessesData, error: businessesError } = await supabase
        .from('businesses')
        .select('id, name')
        .eq('owner_id', user.id);

      if (businessesError) throw businessesError;

      if (!businessesData || businessesData.length === 0) {
        setAnalyticsData({
          totalRevenue: 0,
          totalMembers: 0,
          activeMembers: 0,
          newMembers: 0,
          renewalRate: 0,
          popularPlans: [],
          revenueByMonth: generateSampleRevenueData(),
          membershipTrend: generateSampleMembershipData()
        });
        setLoading(false);
        return;
      }

      const businessIds = businessesData.map(b => b.id);

      // Calculate date range
      const now = new Date();
      let startDate = new Date();
      if (timeRange === 'week') {
        startDate.setDate(now.getDate() - 7);
      } else if (timeRange === 'month') {
        startDate.setMonth(now.getMonth() - 1);
      } else if (timeRange === 'year') {
        startDate.setFullYear(now.getFullYear() - 1);
      }

      // Fetch memberships for these businesses
      const { data: membershipsData, error: membershipsError } = await supabase
        .from('memberships')
        .select(`
          *,
          plans:plan_id (
            id,
            name,
            price,
            duration
          )
        `)
        .in('business_id', businessIds)
        .gte('created_at', startDate.toISOString());

      if (membershipsError) throw membershipsError;

      // Calculate analytics
      const totalRevenue = membershipsData?.reduce((sum, m) => sum + (m.price_paid || 0), 0) || 0;
      const totalMembers = membershipsData?.length || 0;
      const activeMembers = membershipsData?.filter(m => m.status === 'active').length || 0;
      const newMembers = membershipsData?.filter(m => {
        const created = new Date(m.created_at);
        const daysAgo = (now - created) / (1000 * 60 * 60 * 24);
        return daysAgo <= 30;
      }).length || 0;

      // Calculate renewal rate (simplified)
      const renewalRate = totalMembers > 0 ? Math.round((activeMembers / totalMembers) * 100) : 0;

      // Get popular plans
      const planCounts = {};
      membershipsData?.forEach(m => {
        if (m.plans?.name) {
          planCounts[m.plans.name] = (planCounts[m.plans.name] || 0) + 1;
        }
      });

      const popularPlans = Object.entries(planCounts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      // Generate revenue by month (simplified - would normally aggregate by month)
      const revenueByMonth = generateSampleRevenueData();
      
      // Generate membership trend
      const membershipTrend = generateSampleMembershipData();

      setAnalyticsData({
        totalRevenue,
        totalMembers,
        activeMembers,
        newMembers,
        renewalRate,
        popularPlans,
        revenueByMonth,
        membershipTrend
      });

    } catch (err) {
      console.error('Error fetching analytics:', err);
      setError(err.message);
      
      // Set sample data for demo
      setAnalyticsData({
        totalRevenue: 45600,
        totalMembers: 156,
        activeMembers: 142,
        newMembers: 18,
        renewalRate: 91,
        popularPlans: [
          { name: 'Premium Plan', count: 78 },
          { name: 'Basic Plan', count: 45 },
          { name: 'Annual Plan', count: 23 },
          { name: 'Family Plan', count: 10 }
        ],
        revenueByMonth: generateSampleRevenueData(),
        membershipTrend: generateSampleMembershipData()
      });
    } finally {
      setLoading(false);
    }
  };

  // Sample data generators
  const generateSampleRevenueData = () => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return months.map(month => ({
      month,
      revenue: Math.floor(Math.random() * 50000) + 20000
    }));
  };

  const generateSampleMembershipData = () => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return months.map(month => ({
      month,
      members: Math.floor(Math.random() * 50) + 100
    }));
  };

  const getFirstName = () => {
    if (profile?.first_name) {
      return profile.first_name;
    }
    return 'Owner';
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="analytics-loading">
        <div className="loading-spinner"></div>
        <p>Loading analytics data...</p>
      </div>
    );
  }

  const firstName = getFirstName();

  return (
    <div className="dashboard-container">
      {/* Use the reusable OwnerNavbar */}
      <OwnerNavbar 
        profile={profile} 
        avatarUrl={avatarUrl}
      />

      {/* Mobile Welcome Message */}
      <div className="mobile-welcome">
        <p>Welcome, {profile?.first_name || 'Owner'}!</p>
      </div>

      {/* Main Content */}
      <main className="analytics-main-full">
        {/* Page Header */}
        <div className="analytics-header">
          <div className="header-left">
            <h2 className="page-title">
              Business Analytics
              <span className="title-glow"></span>
            </h2>
            <div className="header-decoration"></div>
          </div>
          <div className="header-right">
            <div className="user-greeting">
              <span className="greeting-wave">👋</span>
              <span className="greeting-text">Analyzing,</span>
              <span className="greeting-name">{firstName}</span>
            </div>
          </div>
        </div>

        {/* Time Range Selector */}
        <div className="time-range-selector">
          <button
            className={`time-range-btn ${timeRange === 'week' ? 'active' : ''}`}
            onClick={() => setTimeRange('week')}
          >
            Week
          </button>
          <button
            className={`time-range-btn ${timeRange === 'month' ? 'active' : ''}`}
            onClick={() => setTimeRange('month')}
          >
            Month
          </button>
          <button
            className={`time-range-btn ${timeRange === 'year' ? 'active' : ''}`}
            onClick={() => setTimeRange('year')}
          >
            Year
          </button>
        </div>

        {/* Key Metrics */}
        <div className="metrics-grid">
          <div className="metric-card">
            <div className="metric-icon">💰</div>
            <div className="metric-content">
              <span className="metric-value">{formatCurrency(analyticsData.totalRevenue)}</span>
              <span className="metric-label">Total Revenue</span>
            </div>
          </div>
          <div className="metric-card">
            <div className="metric-icon">👥</div>
            <div className="metric-content">
              <span className="metric-value">{analyticsData.totalMembers}</span>
              <span className="metric-label">Total Members</span>
            </div>
          </div>
          <div className="metric-card">
            <div className="metric-icon">✅</div>
            <div className="metric-content">
              <span className="metric-value">{analyticsData.activeMembers}</span>
              <span className="metric-label">Active Members</span>
            </div>
          </div>
          <div className="metric-card">
            <div className="metric-icon">🆕</div>
            <div className="metric-content">
              <span className="metric-value">{analyticsData.newMembers}</span>
              <span className="metric-label">New Members</span>
            </div>
          </div>
          <div className="metric-card">
            <div className="metric-icon">🔄</div>
            <div className="metric-content">
              <span className="metric-value">{analyticsData.renewalRate}%</span>
              <span className="metric-label">Renewal Rate</span>
            </div>
          </div>
        </div>

        {/* Charts Row */}
        <div className="charts-row">
          {/* Revenue Chart */}
          <div className="chart-card">
            <h3 className="chart-title">Revenue Trend</h3>
            <div className="chart-container">
              <div className="bar-chart">
                {analyticsData.revenueByMonth.slice(-6).map((item, index) => (
                  <div key={index} className="chart-bar-group">
                    <div className="bar-label">{item.month}</div>
                    <div className="bar-container">
                      <div 
                        className="bar revenue-bar"
                        style={{ 
                          height: `${(item.revenue / 80000) * 150}px`,
                          width: '30px'
                        }}
                      ></div>
                    </div>
                    <div className="bar-value">₱{(item.revenue/1000).toFixed(0)}k</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Membership Trend */}
          <div className="chart-card">
            <h3 className="chart-title">Membership Growth</h3>
            <div className="chart-container">
              <div className="bar-chart">
                {analyticsData.membershipTrend.slice(-6).map((item, index) => (
                  <div key={index} className="chart-bar-group">
                    <div className="bar-label">{item.month}</div>
                    <div className="bar-container">
                      <div 
                        className="bar members-bar"
                        style={{ 
                          height: `${(item.members / 200) * 150}px`,
                          width: '30px'
                        }}
                      ></div>
                    </div>
                    <div className="bar-value">{item.members}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Popular Plans */}
        <div className="popular-plans-section">
          <h3 className="section-title">Popular Membership Plans</h3>
          <div className="plans-ranking">
            {analyticsData.popularPlans.map((plan, index) => (
              <div key={index} className="plan-rank-item">
                <div className="rank-number">{index + 1}</div>
                <div className="plan-rank-info">
                  <span className="plan-rank-name">{plan.name}</span>
                  <span className="plan-rank-count">{plan.count} members</span>
                </div>
                <div className="plan-rank-bar">
                  <div 
                    className="rank-bar-fill"
                    style={{ 
                      width: `${(plan.count / analyticsData.popularPlans[0]?.count) * 100}%` 
                    }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Analytics;