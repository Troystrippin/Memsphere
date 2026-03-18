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
  const [businesses, setBusinesses] = useState([]);
  const [selectedBusinessId, setSelectedBusinessId] = useState('all');
  const [analyticsData, setAnalyticsData] = useState({
    totalRevenue: 0,
    previousPeriodRevenue: 0,
    revenueGrowth: 0,
    totalMembers: 0,
    activeMembers: 0,
    newMembers: 0,
    previousPeriodNewMembers: 0,
    memberGrowth: 0,
    renewalRate: 0,
    popularPlans: [],
    revenueByMonth: [],
    membershipTrend: [],
    paymentMethodBreakdown: {
      gcash: { count: 0, amount: 0 },
      onsite: { count: 0, amount: 0 }
    },
    recentPayments: []
  });

  useEffect(() => {
    fetchUserProfile();
  }, []);

  useEffect(() => {
    if (profile) {
      fetchBusinesses();
    }
  }, [profile]);

  useEffect(() => {
    if (businesses.length > 0) {
      fetchAnalyticsData();
    }
  }, [businesses, timeRange, selectedBusinessId]);

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
      setError('Failed to load profile');
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

  const fetchBusinesses = async () => {
    try {
      const { data, error } = await supabase
        .from('businesses')
        .select('id, name')
        .eq('owner_id', profile.id)
        .eq('status', 'active');

      if (error) throw error;

      setBusinesses(data || []);
      
      if (data.length === 0) {
        setAnalyticsData({
          totalRevenue: 0,
          previousPeriodRevenue: 0,
          revenueGrowth: 0,
          totalMembers: 0,
          activeMembers: 0,
          newMembers: 0,
          previousPeriodNewMembers: 0,
          memberGrowth: 0,
          renewalRate: 0,
          popularPlans: [],
          revenueByMonth: [],
          membershipTrend: [],
          paymentMethodBreakdown: {
            gcash: { count: 0, amount: 0 },
            onsite: { count: 0, amount: 0 }
          },
          recentPayments: []
        });
      }
    } catch (err) {
      console.error('Error fetching businesses:', err);
      setError('Failed to load businesses');
    }
  };

  const getDateRanges = (range) => {
    const now = new Date();
    const startDate = new Date();
    const previousStartDate = new Date();
    const previousEndDate = new Date();

    switch(range) {
      case 'week':
        startDate.setDate(now.getDate() - 7);
        previousStartDate.setDate(now.getDate() - 14);
        previousEndDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(now.getMonth() - 1);
        previousStartDate.setMonth(now.getMonth() - 2);
        previousEndDate.setMonth(now.getMonth() - 1);
        break;
      case 'year':
        startDate.setFullYear(now.getFullYear() - 1);
        previousStartDate.setFullYear(now.getFullYear() - 2);
        previousEndDate.setFullYear(now.getFullYear() - 1);
        break;
      default:
        startDate.setMonth(now.getMonth() - 1);
        previousStartDate.setMonth(now.getMonth() - 2);
        previousEndDate.setMonth(now.getMonth() - 1);
    }

    return {
      currentStart: startDate,
      previousStart: previousStartDate,
      previousEnd: previousEndDate,
      now
    };
  };

  const fetchAnalyticsData = async () => {
    if (businesses.length === 0) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      // Get business IDs to filter
      let businessIds = businesses.map(b => b.id);
      if (selectedBusinessId !== 'all') {
        businessIds = [selectedBusinessId];
      }

      const dates = getDateRanges(timeRange);

      // Fetch payments for current period
      const { data: currentPayments, error: paymentsError } = await supabase
        .from('payments')
        .select(`
          *,
          memberships (
            user_id,
            plan_id,
            membership_plans (
              name
            )
          )
        `)
        .in('business_id', businessIds)
        .gte('created_at', dates.currentStart.toISOString())
        .lte('created_at', dates.now.toISOString())
        .order('created_at', { ascending: false });

      if (paymentsError) throw paymentsError;

      // Fetch payments for previous period (for growth comparison)
      const { data: previousPayments, error: previousError } = await supabase
        .from('payments')
        .select('amount, created_at')
        .in('business_id', businessIds)
        .gte('created_at', dates.previousStart.toISOString())
        .lt('created_at', dates.currentStart.toISOString());

      if (previousError) throw previousError;

      // Fetch all memberships for this business
      const { data: memberships, error: membershipsError } = await supabase
        .from('memberships')
        .select(`
          id,
          user_id,
          status,
          created_at,
          end_date,
          plan:plan_id (
            id,
            name,
            price,
            duration
          )
        `)
        .in('business_id', businessIds);

      if (membershipsError) throw membershipsError;

      // Calculate revenue metrics
      const totalRevenue = currentPayments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;
      const previousRevenue = previousPayments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;
      const revenueGrowth = previousRevenue > 0 
        ? ((totalRevenue - previousRevenue) / previousRevenue) * 100 
        : totalRevenue > 0 ? 100 : 0;

      // Calculate member metrics
      const uniqueMembers = new Set(memberships?.map(m => m.user_id)).size;
      const activeMembers = memberships?.filter(m => 
        m.status === 'active' && 
        (!m.end_date || new Date(m.end_date) >= new Date())
      ).length || 0;

      // New members in current period
      const newMembers = memberships?.filter(m => 
        new Date(m.created_at) >= dates.currentStart
      ).length || 0;

      // New members in previous period
      const previousNewMembers = memberships?.filter(m => {
        const date = new Date(m.created_at);
        return date >= dates.previousStart && date < dates.currentStart;
      }).length || 0;

      const memberGrowth = previousNewMembers > 0 
        ? ((newMembers - previousNewMembers) / previousNewMembers) * 100 
        : newMembers > 0 ? 100 : 0;

      // Calculate renewal rate (active members / total unique members)
      const renewalRate = uniqueMembers > 0 
        ? Math.round((activeMembers / uniqueMembers) * 100) 
        : 0;

      // Get popular plans
      const planCounts = {};
      memberships?.forEach(m => {
        if (m.plan?.name) {
          planCounts[m.plan.name] = (planCounts[m.plan.name] || 0) + 1;
        }
      });

      const popularPlans = Object.entries(planCounts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      // Generate revenue by month (last 6 months)
      const revenueByMonth = [];
      for (let i = 5; i >= 0; i--) {
        const month = new Date();
        month.setMonth(month.getMonth() - i);
        const monthStart = new Date(month.getFullYear(), month.getMonth(), 1);
        const monthEnd = new Date(month.getFullYear(), month.getMonth() + 1, 0);

        const monthRevenue = currentPayments?.filter(p => {
          const date = new Date(p.created_at);
          return date >= monthStart && date <= monthEnd;
        }).reduce((sum, p) => sum + (p.amount || 0), 0) || 0;

        revenueByMonth.push({
          month: month.toLocaleString('default', { month: 'short' }),
          revenue: monthRevenue
        });
      }

      // Generate membership trend (last 6 months)
      const membershipTrend = [];
      for (let i = 5; i >= 0; i--) {
        const month = new Date();
        month.setMonth(month.getMonth() - i);
        const monthStart = new Date(month.getFullYear(), month.getMonth(), 1);
        const monthEnd = new Date(month.getFullYear(), month.getMonth() + 1, 0);

        const monthMembers = memberships?.filter(m => {
          const date = new Date(m.created_at);
          return date >= monthStart && date <= monthEnd;
        }).length || 0;

        membershipTrend.push({
          month: month.toLocaleString('default', { month: 'short' }),
          members: monthMembers
        });
      }

      // Payment method breakdown
      const paymentBreakdown = {
        gcash: { count: 0, amount: 0 },
        onsite: { count: 0, amount: 0 }
      };

      currentPayments?.forEach(p => {
        const method = p.payment_method || 'onsite';
        if (paymentBreakdown[method]) {
          paymentBreakdown[method].count++;
          paymentBreakdown[method].amount += p.amount || 0;
        }
      });

      // Recent payments for table display
      const recentPayments = currentPayments?.slice(0, 10).map(p => ({
        id: p.id,
        date: p.created_at,
        amount: p.amount,
        method: p.payment_method,
        status: p.payment_status,
        member: p.memberships?.user_id ? 'Member' : 'Guest',
        plan: p.memberships?.membership_plans?.name || 'N/A'
      })) || [];

      setAnalyticsData({
        totalRevenue,
        previousPeriodRevenue: previousRevenue,
        revenueGrowth: Math.round(revenueGrowth * 10) / 10,
        totalMembers: uniqueMembers,
        activeMembers,
        newMembers,
        previousPeriodNewMembers: previousNewMembers,
        memberGrowth: Math.round(memberGrowth * 10) / 10,
        renewalRate,
        popularPlans,
        revenueByMonth,
        membershipTrend,
        paymentMethodBreakdown: paymentBreakdown,
        recentPayments
      });

    } catch (err) {
      console.error('Error fetching analytics:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
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

  const formatNumber = (num) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  const getGrowthClass = (growth) => {
    if (growth > 0) return 'positive-growth';
    if (growth < 0) return 'negative-growth';
    return 'neutral-growth';
  };

  const getGrowthIcon = (growth) => {
    if (growth > 0) return '📈';
    if (growth < 0) return '📉';
    return '➡️';
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
      <OwnerNavbar 
        profile={profile} 
        avatarUrl={avatarUrl}
      />

      <div className="mobile-welcome">
        <p>Welcome, {profile?.first_name || 'Owner'}!</p>
      </div>

      <main className="analytics-main-full">
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

        {/* Business Selector and Time Range */}
        <div className="analytics-controls">
          {businesses.length > 1 && (
            <div className="business-selector">
              <label>Business:</label>
              <select 
                value={selectedBusinessId} 
                onChange={(e) => setSelectedBusinessId(e.target.value)}
                className="business-select"
              >
                <option value="all">All Businesses</option>
                {businesses.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
          )}
          
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
        </div>

        {/* Key Metrics */}
        <div className="metrics-grid">
          <div className="metric-card">
            <div className="metric-icon">💰</div>
            <div className="metric-content">
              <span className="metric-value">{formatCurrency(analyticsData.totalRevenue)}</span>
              <span className="metric-label">Total Revenue</span>
              <div className={`metric-growth ${getGrowthClass(analyticsData.revenueGrowth)}`}>
                <span className="growth-icon">{getGrowthIcon(analyticsData.revenueGrowth)}</span>
                <span className="growth-value">{Math.abs(analyticsData.revenueGrowth)}%</span>
                <span className="growth-period">vs previous {timeRange}</span>
              </div>
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-icon">👥</div>
            <div className="metric-content">
              <span className="metric-value">{formatNumber(analyticsData.totalMembers)}</span>
              <span className="metric-label">Total Members</span>
              <div className="metric-sub">
                <span className="active-badge">✅ {analyticsData.activeMembers} active</span>
              </div>
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-icon">🆕</div>
            <div className="metric-content">
              <span className="metric-value">{formatNumber(analyticsData.newMembers)}</span>
              <span className="metric-label">New Members</span>
              <div className={`metric-growth ${getGrowthClass(analyticsData.memberGrowth)}`}>
                <span className="growth-icon">{getGrowthIcon(analyticsData.memberGrowth)}</span>
                <span className="growth-value">{Math.abs(analyticsData.memberGrowth)}%</span>
                <span className="growth-period">growth</span>
              </div>
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-icon">🔄</div>
            <div className="metric-content">
              <span className="metric-value">{analyticsData.renewalRate}%</span>
              <span className="metric-label">Renewal Rate</span>
              <div className="metric-sub">
                <span className="retention-badge">📊 Member retention</span>
              </div>
            </div>
          </div>
        </div>

        {/* Charts Row */}
        <div className="charts-row">
          <div className="chart-card">
            <h3 className="chart-title">Revenue Trend</h3>
            <div className="chart-container">
              <div className="bar-chart">
                {analyticsData.revenueByMonth.map((item, index) => (
                  <div key={index} className="chart-bar-group">
                    <div className="bar-label">{item.month}</div>
                    <div className="bar-container">
                      <div 
                        className="bar revenue-bar"
                        style={{ 
                          height: `${Math.min((item.revenue / Math.max(...analyticsData.revenueByMonth.map(d => d.revenue), 1)) * 150, 150)}px`,
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

          <div className="chart-card">
            <h3 className="chart-title">Membership Growth</h3>
            <div className="chart-container">
              <div className="bar-chart">
                {analyticsData.membershipTrend.map((item, index) => (
                  <div key={index} className="chart-bar-group">
                    <div className="bar-label">{item.month}</div>
                    <div className="bar-container">
                      <div 
                        className="bar members-bar"
                        style={{ 
                          height: `${Math.min((item.members / Math.max(...analyticsData.membershipTrend.map(d => d.members), 1)) * 150, 150)}px`,
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

        {/* Payment Methods Breakdown */}
        <div className="payment-breakdown-section">
          <h3 className="section-title">Payment Methods</h3>
          <div className="payment-methods-grid">
            <div className="payment-method-card gcash">
              <div className="payment-method-header">
                <span className="method-icon">📱</span>
                <span className="method-name">GCash</span>
              </div>
              <div className="method-stats">
                <div className="stat-row">
                  <span className="stat-label">Transactions:</span>
                  <span className="stat-value">{analyticsData.paymentMethodBreakdown.gcash.count}</span>
                </div>
                <div className="stat-row">
                  <span className="stat-label">Total Amount:</span>
                  <span className="stat-value">{formatCurrency(analyticsData.paymentMethodBreakdown.gcash.amount)}</span>
                </div>
              </div>
            </div>

            <div className="payment-method-card onsite">
              <div className="payment-method-header">
                <span className="method-icon">🏪</span>
                <span className="method-name">On-site</span>
              </div>
              <div className="method-stats">
                <div className="stat-row">
                  <span className="stat-label">Transactions:</span>
                  <span className="stat-value">{analyticsData.paymentMethodBreakdown.onsite.count}</span>
                </div>
                <div className="stat-row">
                  <span className="stat-label">Total Amount:</span>
                  <span className="stat-value">{formatCurrency(analyticsData.paymentMethodBreakdown.onsite.amount)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Popular Plans */}
        <div className="popular-plans-section">
          <h3 className="section-title">Popular Membership Plans</h3>
          <div className="plans-ranking">
            {analyticsData.popularPlans.length > 0 ? (
              analyticsData.popularPlans.map((plan, index) => (
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
              ))
            ) : (
              <div className="no-data-message">No plan data available</div>
            )}
          </div>
        </div>

        {/* Recent Payments Table */}
        <div className="recent-payments-section">
          <h3 className="section-title">Recent Transactions</h3>
          <div className="payments-table-container">
            {analyticsData.recentPayments.length > 0 ? (
              <table className="payments-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Amount</th>
                    <th>Method</th>
                    <th>Status</th>
                    <th>Plan</th>
                  </tr>
                </thead>
                <tbody>
                  {analyticsData.recentPayments.map((payment) => (
                    <tr key={payment.id}>
                      <td>{new Date(payment.date).toLocaleDateString()}</td>
                      <td className="amount-cell">{formatCurrency(payment.amount)}</td>
                      <td>
                        <span className={`method-badge ${payment.method}`}>
                          {payment.method === 'gcash' ? '📱 GCash' : '🏪 On-site'}
                        </span>
                      </td>
                      <td>
                        <span className={`status-badge ${payment.status}`}>
                          {payment.status || 'completed'}
                        </span>
                      </td>
                      <td>{payment.plan}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="no-data-message">No recent payments</div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Analytics;