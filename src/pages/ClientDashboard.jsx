import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import ClientNavbar from '../components/client/ClientNavbar';
import '../styles/ClientDashboard.css';

const ClientDashboard = () => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [memberships, setMemberships] = useState([]);
  const [loadingMemberships, setLoadingMemberships] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [businessLogos, setBusinessLogos] = useState({});
  const [timeRemaining, setTimeRemaining] = useState({});
  const navigate = useNavigate();

  useEffect(() => {
    console.log('ClientDashboard mounted');
    checkUser();
  }, []);

  useEffect(() => {
    if (memberships.length > 0) {
      const timer = setInterval(() => {
        updateTimeRemaining();
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [memberships]);

  const checkUser = async () => {
    try {
      console.log('Checking user in ClientDashboard');
      const { data: { user }, error } = await supabase.auth.getUser();
      
      if (error) {
        console.error('Error getting user:', error);
        throw error;
      }
      
      if (!user) {
        console.log('No user found, redirecting to login');
        navigate('/login', { replace: true });
        return;
      }

      console.log('User found:', user.id);
      setUser(user);
      await getUserData(user);
    } catch (error) {
      console.error('Error checking user:', error);
      navigate('/login', { replace: true });
    }
  };

  const getUserData = async (user) => {
    try {
      console.log('Fetching profile for user:', user.id);
      
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email, role, avatar_url, created_at, updated_at')
        .eq('id', user.id)
        .single();

      if (profileError) {
        console.error('Error fetching profile:', profileError);
      }

      console.log('Profile data:', profile);
      setProfile(profile);

      if (profile?.avatar_url) {
        downloadAvatar(profile.avatar_url);
      }

      await fetchMemberships(user.id);

    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMemberships = async (userId) => {
    try {
      setLoadingMemberships(true);
      console.log('Fetching memberships for user:', userId);
      
      const { data, error } = await supabase
        .from('memberships')
        .select(`
          id,
          created_at,
          start_date,
          end_date,
          status,
          price_paid,
          payment_status,
          businesses:business_id (
            id,
            name,
            owner_name,
            business_type,
            emoji,
            location,
            logo_url
          ),
          plans:plan_id (
            id,
            name,
            price,
            duration,
            features
          )
        `)
        .eq('user_id', userId)
        .eq('status', 'approved')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching memberships:', error);
        throw error;
      }

      console.log('Memberships found:', data?.length || 0);
      setMemberships(data || []);
      
      if (data && data.length > 0) {
        data.forEach(membership => {
          if (membership.businesses?.logo_url) {
            downloadBusinessLogo(membership.businesses.id, membership.businesses.logo_url);
          }
        });
      }

      updateTimeRemaining(data || []);
      
    } catch (error) {
      console.error('Error in fetchMemberships:', error);
    } finally {
      setLoadingMemberships(false);
    }
  };

  const downloadBusinessLogo = async (businessId, logoPath) => {
    try {
      const { data, error } = await supabase.storage
        .from('business-logos')
        .download(logoPath);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      setBusinessLogos(prev => ({ ...prev, [businessId]: url }));
    } catch (error) {
      console.error('Error downloading business logo:', error);
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

  const updateTimeRemaining = (membershipsData = memberships) => {
    const now = new Date();
    const newTimeRemaining = {};

    membershipsData.forEach(membership => {
      if (membership.end_date) {
        const endDate = new Date(membership.end_date);
        const diffTime = endDate - now;
        
        if (diffTime > 0) {
          const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
          const diffHours = Math.floor((diffTime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
          const diffMinutes = Math.floor((diffTime % (1000 * 60 * 60)) / (1000 * 60));

          newTimeRemaining[membership.id] = {
            days: diffDays,
            hours: diffHours,
            minutes: diffMinutes,
            expired: false
          };
        } else {
          newTimeRemaining[membership.id] = {
            days: 0,
            hours: 0,
            minutes: 0,
            expired: true
          };
        }
      }
    });

    setTimeRemaining(newTimeRemaining);
  };

  const getFirstName = () => {
    if (profile?.first_name) {
      return profile.first_name;
    }
    if (user?.email) {
      const username = user.email.split('@')[0];
      return username.charAt(0).toUpperCase() + username.slice(1);
    }
    return 'User';
  };

  const getActiveMembership = () => {
    if (memberships && memberships.length > 0) {
      const activeMembership = memberships[0];
      if (activeMembership) {
        return {
          id: activeMembership.id,
          businessId: activeMembership.businesses?.id,
          businessName: activeMembership.businesses?.name || 'Business',
          businessLogo: businessLogos[activeMembership.businesses?.id],
          planName: activeMembership.plans?.name || 'Membership Plan',
          applied: new Date(activeMembership.created_at).toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          }),
          startDate: activeMembership.start_date 
            ? new Date(activeMembership.start_date).toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })
            : 'N/A',
          validUntil: activeMembership.end_date 
            ? new Date(activeMembership.end_date).toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })
            : 'N/A',
          price: activeMembership.plans?.price || activeMembership.price_paid,
          duration: activeMembership.plans?.duration || 'month',
          features: activeMembership.plans?.features || [],
          businessType: activeMembership.businesses?.business_type,
          emoji: activeMembership.businesses?.emoji || '🏢',
          location: activeMembership.businesses?.location,
          timeRemaining: timeRemaining[activeMembership.id]
        };
      }
    }
    return null;
  };

  const getMembershipCount = () => {
    return memberships?.length || 0;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTimeRemaining = (timeData) => {
    if (!timeData) return null;
    if (timeData.expired) return <span className="badge expired">Expired</span>;
    
    if (timeData.days > 30) {
      return (
        <div className="simple-timer">
          <span className="timer-icon">⏳</span>
          <span className="timer-text">{timeData.days} days remaining</span>
        </div>
      );
    }
    
    return (
      <div className="simple-timer">
        <span className="timer-icon">⏳</span>
        <span className="timer-text">
          {timeData.days}d {timeData.hours}h remaining
        </span>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="loading-spinner"></div>
        <p>Loading your dashboard...</p>
      </div>
    );
  }

  const firstName = getFirstName();
  const membershipCount = getMembershipCount();
  const activeMembership = getActiveMembership();

  const recommendedGyms = [
    { id: 1, name: "Troy's Ultimate Gym", owner: "Caster Troy Andres", rating: 4.8, image: "🏋️" },
    { id: 2, name: "Elite Fitness Center", owner: "Sarah Johnson", rating: 4.9, image: "💪" },
    { id: 3, name: "Powerhouse Gym", owner: "Mike Thompson", rating: 4.7, image: "🏆" },
    { id: 4, name: "Yoga & Wellness Studio", owner: "Emma Wilson", rating: 4.9, image: "🧘" },
    { id: 5, name: "CrossFit Arena", owner: "Alex Rodriguez", rating: 4.8, image: "🔥" },
  ];

  return (
    <div className="dashboard-container">
      <ClientNavbar 
        profile={profile}
        avatarUrl={avatarUrl}
      />

      <div className="dashboard-main-full" style={{ paddingTop: 'calc(70px + 2rem)' }}>
        <div className="dashboard-header">
          <div className="header-left">
            <h2 className="page-title">
              Client Dashboard
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

        <div className="membership-status-wrapper">
          <div className="membership-status-row">
            <span className="membership-label">My memberships</span>
            <span className="membership-colon">:</span>
            <span className="membership-value">{membershipCount}</span>
          </div>
          <div className="status-decoration"></div>
        </div>

        {loadingMemberships && (
          <div className="memberships-loading">
            <div className="loading-spinner-small"></div>
            <p>Loading your memberships...</p>
          </div>
        )}

        {!loadingMemberships && activeMembership ? (
          <div className="membership-card-enhanced">
            <div className="card-bg-pattern"></div>
            <div className="card-content">
              <div className="card-header-compact">
                <div className="gym-icon">
                  {activeMembership.businessLogo ? (
                    <img 
                      src={activeMembership.businessLogo} 
                      alt={activeMembership.businessName}
                      className="business-logo-image"
                    />
                  ) : (
                    activeMembership.emoji
                  )}
                </div>
                <div className="membership-header-info">
                  <h3 className="compact-gym-name">{activeMembership.businessName}</h3>
                  <p className="compact-plan-name">{activeMembership.planName}</p>
                </div>
              </div>

              {activeMembership.timeRemaining && !activeMembership.timeRemaining.expired && (
                <div className="timer-container">
                  {formatTimeRemaining(activeMembership.timeRemaining)}
                </div>
              )}

              {activeMembership.timeRemaining?.expired && (
                <div className="timer-container">
                  <span className="badge expired">Expired</span>
                </div>
              )}

              <div className="compact-dates">
                <div className="date-row">
                  <span className="date-icon">📅</span>
                  <span className="date-label">Applied on</span>
                  <span className="date-value">{activeMembership.applied}</span>
                </div>
                <div className="date-row">
                  <span className="date-icon">▶️</span>
                  <span className="date-label">Started on</span>
                  <span className="date-value">{activeMembership.startDate}</span>
                </div>
                <div className="date-row">
                  <span className="date-icon">⏳</span>
                  <span className="date-label">Valid until</span>
                  <span className="date-value">{activeMembership.validUntil}</span>
                </div>
              </div>

              {activeMembership.features && activeMembership.features.length > 0 && (
                <div className="membership-features">
                  <p className="features-label">Features:</p>
                  <div className="features-list">
                    {activeMembership.features.slice(0, 3).map((feature, idx) => (
                      <span key={idx} className="feature-tag">{feature}</span>
                    ))}
                    {activeMembership.features.length > 3 && (
                      <span className="feature-tag more">+{activeMembership.features.length - 3}</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : !loadingMemberships && !activeMembership && (
          <div className="no-membership-card">
            <div className="no-membership-content">
              <span className="no-membership-icon">📋</span>
              <h3>No Active Membership</h3>
              <p>You haven't joined any businesses yet or your membership is pending approval.</p>
              <button 
                className="browse-businesses-btn"
                onClick={() => navigate('/browse')}
              >
                Browse Businesses
              </button>
            </div>
          </div>
        )}

        {!loadingMemberships && memberships.length > 1 && (
          <div className="all-memberships-section">
            <h3 className="section-subtitle">All Your Memberships</h3>
            <div className="memberships-mini-grid">
              {memberships.map((membership) => (
                <div key={membership.id} className="membership-mini-card">
                  <div className="mini-card-header">
                    <span className="mini-business-icon">
                      {businessLogos[membership.businesses?.id] ? (
                        <img 
                          src={businessLogos[membership.businesses?.id]} 
                          alt={membership.businesses?.name}
                          className="mini-business-logo"
                        />
                      ) : (
                        membership.businesses?.emoji || '🏢'
                      )}
                    </span>
                    <div className="mini-info">
                      <h4>{membership.businesses?.name}</h4>
                      <p className="mini-plan">{membership.plans?.name}</p>
                    </div>
                  </div>
                  <div className="mini-dates">
                    <span>Applied: {formatDate(membership.created_at)}</span>
                    <span>Valid until: {formatDate(membership.end_date)}</span>
                  </div>
                  {timeRemaining[membership.id] && !timeRemaining[membership.id].expired && (
                    <div className="mini-timer">
                      <span className="timer-icon">⏳</span>
                      <span className="timer-text">
                        {timeRemaining[membership.id].days}d {timeRemaining[membership.id].hours}h left
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="recommended-section-enhanced">
          <div className="section-header-enhanced">
            <div className="header-title-wrapper">
              <h3 className="section-title-enhanced">Recommended for you</h3>
              <span className="section-emoji">🔥</span>
            </div>
            <button className="view-all-btn-enhanced" onClick={() => navigate('/browse')}>
              <span>View All</span>
              <span className="btn-arrow">→</span>
            </button>
          </div>

          <div className="recommended-grid-enhanced">
            {recommendedGyms.map((gym, index) => (
              <div key={gym.id} className="recommended-card-enhanced" style={{ '--delay': `${index * 0.1}s` }}>
                <div className="card-glow"></div>
                <div className="card-content-wrapper">
                  <div className="gym-image-wrapper">
                    <span className="gym-image">{gym.image}</span>
                    <div className="rating-badge">
                      <span className="rating-star">⭐</span>
                      <span className="rating-value">{gym.rating}</span>
                    </div>
                  </div>
                  <div className="gym-details">
                    <h4 className="gym-name-enhanced">{gym.name}</h4>
                    <p className="owner-name-enhanced">
                      <span className="owner-icon">👑</span>
                      {gym.owner}
                    </p>
                  </div>
                  <button className="view-details-btn-enhanced" onClick={() => navigate('/browse')}>
                    <span>View Details</span>
                    <span className="btn-icon">→</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClientDashboard;