import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import ClientNavbar from "../components/client/ClientNavbar";
import "../styles/ClientDashboard.css";
import {
  // Navigation & Actions
  ChevronRight,
  Compass,
  Home,
  Search,
  Filter,
  Bookmark,
  Share2,
  MoreVertical,
  Download,
  Upload,
  RefreshCw,
  Settings,
  HelpCircle,
  LogOut,

  // User & Profile
  User,
  Mail,
  Phone,
  Globe,
  Crown,
  Medal,
  Target,
  Flag,

  // Business & Memberships
  Briefcase,
  GraduationCap,
  Coffee,
  Dumbbell,
  Brain,
  BookOpen,
  Music,
  Camera,
  Video,
  Palette,
  Code,
  PenTool,

  // Health & Wellness
  Heart,
  HeartPulse,
  Activity,
  Shield,
  Zap,

  // Status & Indicators
  CheckCircle,
  XCircle,
  AlertCircle,
  Info,
  Award,
  Star,
  TrendingUp,
  Sparkles,
  Bell,
  Gift,
  CreditCard,
  DollarSign,

  // Time & Date
  Clock,
  Calendar,
  Play,

  // Location
  MapPin,
  Map,
  PhoneCall,
  MessageCircle,

  // Social
  Users,

  // Actions
  Plus,

  // Misc
  MoreHorizontal,
} from "lucide-react";

const ClientDashboard = () => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [memberships, setMemberships] = useState([]);
  const [loadingMemberships, setLoadingMemberships] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState({});
  const [recommendedBusinesses, setRecommendedBusinesses] = useState([]);
  const [loadingRecommendations, setLoadingRecommendations] = useState(false);
  const [sortBy, setSortBy] = useState("expiry");
  const navigate = useNavigate();

  useEffect(() => {
    console.log("ClientDashboard mounted");
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
      console.log("Checking user in ClientDashboard");
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error) {
        console.error("Error getting user:", error);
        throw error;
      }

      if (!user) {
        console.log("No user found, redirecting to login");
        navigate("/login", { replace: true });
        return;
      }

      console.log("User found:", user.id);
      setUser(user);
      await getUserData(user);
    } catch (error) {
      console.error("Error checking user:", error);
      navigate("/login", { replace: true });
    }
  };

  const getUserData = async (user) => {
    try {
      console.log("Fetching profile for user:", user.id);

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select(
          "id, first_name, last_name, email, role, avatar_url, created_at, updated_at",
        )
        .eq("id", user.id)
        .single();

      if (profileError) {
        console.error("Error fetching profile:", profileError);
      }

      console.log("Profile data:", profile);
      setProfile(profile);

      if (profile?.avatar_url) {
        downloadAvatar(profile.avatar_url);
      }

      await fetchMemberships(user.id);
      await fetchRecommendedBusinesses();
    } catch (error) {
      console.error("Error fetching user data:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMemberships = async (userId) => {
    try {
      setLoadingMemberships(true);
      console.log("Fetching memberships for user:", userId);

      const { data, error } = await supabase
        .from("memberships")
        .select(
          `
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
            city,
            province,
            address
          ),
          membership_plans:plan_id (
            id,
            name,
            price,
            duration,
            features
          )
        `,
        )
        .eq("user_id", userId)
        .eq("status", "approved")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching memberships:", error);
        throw error;
      }

      console.log("Memberships found:", data?.length || 0);
      console.log("All memberships data:", data);

      setMemberships(data || []);
      updateTimeRemaining(data || []);
    } catch (error) {
      console.error("Error in fetchMemberships:", error);
    } finally {
      setLoadingMemberships(false);
    }
  };

  const fetchRecommendedBusinesses = async () => {
    try {
      setLoadingRecommendations(true);
      console.log("Fetching recommended businesses");

      const { data, error } = await supabase
        .from("businesses")
        .select(
          `
          id,
          name,
          owner_name,
          business_type,
          description,
          short_description,
          location,
          city,
          province,
          price,
          price_unit,
          emoji,
          rating,
          members_count,
          amenities,
          status
        `,
        )
        .eq("status", "active")
        .eq("verification_status", "approved")
        .order("members_count", { ascending: false })
        .order("rating", { ascending: false })
        .limit(10);

      if (error) {
        console.error("Error fetching recommended businesses:", error);
        throw error;
      }

      console.log("Recommended businesses found:", data?.length || 0);
      console.log(
        "Business ratings:",
        data?.map((b) => ({ name: b.name, rating: b.rating })),
      );

      const businessesWithRatings = data?.filter((b) => b.rating != null) || [];
      const businessesWithoutRatings =
        data?.filter((b) => b.rating == null) || [];

      const sortedWithRatings = businessesWithRatings.sort(
        (a, b) => b.rating - a.rating,
      );

      const sortedBusinesses = [
        ...sortedWithRatings,
        ...businessesWithoutRatings,
      ];

      setRecommendedBusinesses(sortedBusinesses.slice(0, 5));
    } catch (error) {
      console.error("Error in fetchRecommendedBusinesses:", error);
    } finally {
      setLoadingRecommendations(false);
    }
  };

  const downloadAvatar = async (path) => {
    try {
      const { data, error } = await supabase.storage
        .from("avatars")
        .download(path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      setAvatarUrl(url);
    } catch (error) {
      console.error("Error downloading avatar:", error);
    }
  };

  const updateTimeRemaining = (membershipsData = memberships) => {
    const now = new Date();
    const newTimeRemaining = {};

    membershipsData.forEach((membership) => {
      if (membership.end_date) {
        const endDate = new Date(membership.end_date);
        const diffTime = endDate - now;

        if (diffTime > 0) {
          const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
          const diffHours = Math.floor(
            (diffTime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60),
          );
          const diffMinutes = Math.floor(
            (diffTime % (1000 * 60 * 60)) / (1000 * 60),
          );

          newTimeRemaining[membership.id] = {
            days: diffDays,
            hours: diffHours,
            minutes: diffMinutes,
            expired: false,
            endDate: membership.end_date,
          };
        } else {
          newTimeRemaining[membership.id] = {
            days: 0,
            hours: 0,
            minutes: 0,
            expired: true,
            endDate: membership.end_date,
          };
        }
      }
    });

    setTimeRemaining(newTimeRemaining);
  };

  const getSortedMemberships = () => {
    if (!memberships || memberships.length === 0) return [];

    const membershipsWithTime = memberships.map((membership) => ({
      ...membership,
      timeData: timeRemaining[membership.id] || null,
    }));

    if (sortBy === "expiry") {
      return membershipsWithTime.sort((a, b) => {
        const aEndDate = a.end_date
          ? new Date(a.end_date)
          : new Date(9999, 11, 31);
        const bEndDate = b.end_date
          ? new Date(b.end_date)
          : new Date(9999, 11, 31);
        return aEndDate - bEndDate;
      });
    } else {
      return membershipsWithTime.sort((a, b) => {
        const aDate = a.created_at ? new Date(a.created_at) : new Date(0);
        const bDate = b.created_at ? new Date(b.created_at) : new Date(0);
        return bDate - aDate;
      });
    }
  };

  const getExpiryStatus = (timeData) => {
    if (!timeData) return null;
    if (timeData.expired) return "expired";
    if (timeData.days <= 7) return "critical";
    if (timeData.days <= 30) return "warning";
    return "healthy";
  };

  const getFirstName = () => {
    if (profile?.first_name) {
      return profile.first_name;
    }
    if (user?.email) {
      const username = user.email.split("@")[0];
      return username.charAt(0).toUpperCase() + username.slice(1);
    }
    return "User";
  };

  const getActiveMembership = () => {
    if (memberships && memberships.length > 0) {
      const activeMembership = memberships[0];
      if (activeMembership) {
        return {
          id: activeMembership.id,
          businessId: activeMembership.businesses?.id,
          businessName: activeMembership.businesses?.name || "Business",
          businessLocation:
            activeMembership.businesses?.city ||
            activeMembership.businesses?.location ||
            "Unknown location",
          planName:
            activeMembership.membership_plans?.name || "Membership Plan",
          applied: new Date(activeMembership.created_at).toLocaleDateString(
            "en-US",
            {
              year: "numeric",
              month: "long",
              day: "numeric",
            },
          ),
          startDate: activeMembership.start_date
            ? new Date(activeMembership.start_date).toLocaleDateString(
                "en-US",
                {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                },
              )
            : "N/A",
          validUntil: activeMembership.end_date
            ? new Date(activeMembership.end_date).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })
            : "N/A",
          price:
            activeMembership.membership_plans?.price ||
            activeMembership.price_paid,
          duration: activeMembership.membership_plans?.duration || "month",
          features: activeMembership.membership_plans?.features || [],
          businessType: activeMembership.businesses?.business_type,
          emoji: activeMembership.businesses?.emoji || "🏢",
          timeRemaining: timeRemaining[activeMembership.id],
        };
      }
    }
    return null;
  };

  const getMembershipCount = () => {
    return memberships?.length || 0;
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatTimeRemaining = (timeData) => {
    if (!timeData) return null;
    if (timeData.expired) {
      return (
        <div className="expired-badge">
          <XCircle size={18} />
          <span>Expired</span>
        </div>
      );
    }

    const status = getExpiryStatus(timeData);
    const statusClass =
      status === "critical"
        ? "timer-critical"
        : status === "warning"
          ? "timer-warning"
          : "timer";

    if (timeData.days > 30) {
      return (
        <div className={statusClass}>
          <Clock className="timer-icon" size={18} />
          <span className="timer-text">{timeData.days} days remaining</span>
        </div>
      );
    }

    return (
      <div className={statusClass}>
        <Clock className="timer-icon" size={18} />
        <span className="timer-text">
          {timeData.days}d {timeData.hours}h remaining
        </span>
      </div>
    );
  };

  const handleViewBusiness = (businessId) => {
    navigate(`/business/${businessId}`);
  };

  if (loading) {
    return (
      <div className="dashboard-container">
        <ClientNavbar profile={profile} avatarUrl={avatarUrl} />
        <div className="dashboard-main">
          <div className="loading-container">
            <div className="spinner"></div>
            <p className="loading-text">Loading your dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  const firstName = getFirstName();
  const membershipCount = getMembershipCount();
  const activeMembership = getActiveMembership();
  const sortedMemberships = getSortedMemberships();

  console.log("Total memberships:", memberships.length);
  console.log("Sorted memberships:", sortedMemberships.length);

  return (
    <div className="dashboard-container">
      <ClientNavbar profile={profile} avatarUrl={avatarUrl} />

      <div className="dashboard-main">
        {/* Header Section - Only greeting, no welcome back text */}
        <div className="dashboard-header">
          <div className="user-greeting">
            <span className="greeting-wave">👋</span>
            <span className="greeting-text">Good to see you,</span>
            <span className="greeting-name">{firstName}</span>
          </div>
        </div>

        {/* Enhanced Stats Cards with Smaller Icons */}
        <div className="enhanced-stats-grid">
          <div className="enhanced-stat-card">
            <div className="stat-icon-wrapper gradient-blue">
              <Award className="stat-icon" />
            </div>
            <div className="stat-content">
              <div className="stat-label">Active Memberships</div>
              <div className="stat-value-large">{membershipCount}</div>
              <div className="stat-footer">
                <TrendingUp size={14} />
                <span>Currently active</span>
              </div>
            </div>
            <div className="stat-decoration"></div>
          </div>

          <div className="enhanced-stat-card">
            <div className="stat-icon-wrapper gradient-purple">
              <Clock className="stat-icon" />
            </div>
            <div className="stat-content">
              <div className="stat-label">Member Since</div>
              <div className="stat-value-large">
                {profile?.created_at
                  ? new Date(profile.created_at).toLocaleDateString("en-US", {
                      month: "short",
                      year: "numeric",
                    })
                  : "N/A"}
              </div>
              <div className="stat-footer">
                <Calendar size={14} />
                <span>Join date</span>
              </div>
            </div>
            <div className="stat-decoration"></div>
          </div>

          <div className="enhanced-stat-card">
            <div className="stat-icon-wrapper gradient-green">
              <Heart className="stat-icon" />
            </div>
            <div className="stat-content">
              <div className="stat-label">Saved Businesses</div>
              <div className="stat-value-large">0</div>
              <div className="stat-footer">
                <Bookmark size={14} />
                <span>Your favorites</span>
              </div>
            </div>
            <div className="stat-decoration"></div>
          </div>
        </div>

        {/* Membership Status - Removed count badge */}
        <div className="membership-header">
          <div className="membership-status">
            <div className="status-badge">
              <span className="status-dot"></span>
              <span className="status-label">My Memberships</span>
            </div>
          </div>
          <div className="sort-controls">
            <button
              className={`sort-btn ${sortBy === "expiry" ? "active" : ""}`}
              onClick={() => setSortBy("expiry")}
            >
              <Clock size={14} />
              <span>Closest to Expiry</span>
            </button>
            <button
              className={`sort-btn ${sortBy === "recent" ? "active" : ""}`}
              onClick={() => setSortBy("recent")}
            >
              <Calendar size={14} />
              <span>Most Recent</span>
            </button>
          </div>
        </div>

        {/* Loading State */}
        {loadingMemberships && (
          <div className="loading-container">
            <div className="spinner-small"></div>
            <p className="loading-text">Loading your memberships...</p>
          </div>
        )}

        {/* Active Membership Card */}
        {!loadingMemberships && activeMembership ? (
          <div className="membership-card-enhanced">
            <div className="card-gradient-bg"></div>
            <div className="card-header-enhanced">
              <div className="business-icon-large">
                <span>{activeMembership.emoji}</span>
              </div>
              <div className="business-info-enhanced">
                <h2 className="business-name-enhanced">
                  {activeMembership.businessName}
                </h2>
                <div className="plan-badge-container">
                  <Crown size={16} />
                  <span>{activeMembership.planName}</span>
                  <span className="active-badge">Active</span>
                </div>
              </div>
            </div>

            <div className="timer-section">
              {activeMembership.timeRemaining &&
                formatTimeRemaining(activeMembership.timeRemaining)}
            </div>

            <div className="dates-timeline">
              <div className="timeline-item">
                <div className="timeline-marker"></div>
                <div className="timeline-content">
                  <span className="timeline-label">Applied</span>
                  <span className="timeline-value">
                    {activeMembership.applied}
                  </span>
                </div>
              </div>
              <div className="timeline-item">
                <div className="timeline-marker"></div>
                <div className="timeline-content">
                  <span className="timeline-label">Started</span>
                  <span className="timeline-value">
                    {activeMembership.startDate}
                  </span>
                </div>
              </div>
              <div className="timeline-item">
                <div className="timeline-marker"></div>
                <div className="timeline-content">
                  <span className="timeline-label">Valid Until</span>
                  <span className="timeline-value">
                    {activeMembership.validUntil}
                  </span>
                </div>
              </div>
            </div>

            {activeMembership.features &&
              activeMembership.features.length > 0 && (
                <div className="features-container">
                  <h4 className="features-title">Membership Benefits</h4>
                  <div className="benefits-grid">
                    {activeMembership.features
                      .slice(0, 4)
                      .map((feature, idx) => (
                        <div key={idx} className="benefit-item">
                          <CheckCircle size={16} />
                          <span>{feature}</span>
                        </div>
                      ))}
                    {activeMembership.features.length > 4 && (
                      <div className="benefit-item more">
                        <Plus size={16} />
                        <span>{activeMembership.features.length - 4} more</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
          </div>
        ) : (
          !loadingMemberships &&
          !activeMembership && (
            <div className="empty-state-enhanced">
              <div className="empty-icon-large">📋</div>
              <h3 className="empty-title-large">No Active Membership</h3>
              <p className="empty-description-enhanced">
                You haven't joined any businesses yet. Explore our recommended
                businesses below and find the perfect membership for you!
              </p>
              <button
                className="btn-primary-enhanced"
                onClick={() => navigate("/browse")}
              >
                <Compass size={20} />
                <span>Browse Businesses</span>
                <ChevronRight size={20} />
              </button>
            </div>
          )
        )}

        {/* All Memberships Table - No count badge, no blue line */}
        {!loadingMemberships && memberships.length > 0 && (
          <div className="memberships-table-container">
            <div className="section-header no-bottom-border">
              <div className="section-title">
                <h3 className="title-text">All Memberships</h3>
              </div>
              <button
                className="view-all-btn"
                onClick={() => navigate("/memberships")}
              >
                <span>View All</span>
                <ChevronRight size={16} className="btn-arrow" />
              </button>
            </div>

            <div className="memberships-table">
              <div className="table-header blue-theme">
                <div className="table-cell">Business</div>
                <div className="table-cell">Plan</div>
                <div className="table-cell">Applied</div>
                <div className="table-cell">Valid Until</div>
                <div className="table-cell">Status</div>
              </div>
              <div className="table-body">
                {sortedMemberships.map((membership) => {
                  const timeData = timeRemaining[membership.id];
                  const expiryStatus = getExpiryStatus(timeData);

                  return (
                    <div key={membership.id} className="table-row">
                      <div className="table-cell business-cell">
                        <div className="business-mini-icon centered">
                          {membership.businesses?.emoji || "🏢"}
                        </div>
                        <span className="business-name-mini">
                          {membership.businesses?.name}
                        </span>
                      </div>
                      <div className="table-cell plan-cell">
                        <span className="plan-tag">
                          {membership.membership_plans?.name || "Membership"}
                        </span>
                      </div>
                      <div className="table-cell date-cell">
                        {formatDate(membership.created_at)}
                      </div>
                      <div className="table-cell date-cell">
                        {formatDate(membership.end_date)}
                      </div>
                      <div className="table-cell status-cell">
                        {timeData && !timeData.expired ? (
                          <div className={`status-indicator ${expiryStatus}`}>
                            <Clock size={14} />
                            <span>{timeData.days}d left</span>
                          </div>
                        ) : (
                          <div className="status-indicator expired">
                            <XCircle size={14} />
                            <span>Expired</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Recommended Section - Fire icon on the right, no blue line */}
        <div className="recommended-section">
          <div className="section-header no-bottom-border">
            <div className="section-title">
              <h3 className="title-text">Recommended for You</h3>
              <span className="title-icon-fire">🔥</span>
            </div>
            <button
              className="view-all-btn"
              onClick={() => navigate("/browse")}
            >
              <span>View All</span>
              <ChevronRight size={16} className="btn-arrow" />
            </button>
          </div>

          {loadingRecommendations ? (
            <div className="loading-container">
              <div className="spinner-small"></div>
              <p className="loading-text">Finding recommendations for you...</p>
            </div>
          ) : (
            <div className="recommended-grid-enhanced">
              {recommendedBusinesses.map((business, index) => (
                <div
                  key={business.id}
                  className="recommended-card-enhanced"
                  style={{ animationDelay: `${index * 0.1}s` }}
                  onClick={() => handleViewBusiness(business.id)}
                >
                  <div className="card-media-enhanced">
                    <div className="business-avatar-large">
                      {business.emoji || "🏢"}
                    </div>
                    <div className="rating-badge-enhanced">
                      <Star size={14} fill="currentColor" />
                      <span>
                        {business.rating !== null &&
                        business.rating !== undefined
                          ? Number(business.rating).toFixed(1)
                          : "New"}
                      </span>
                    </div>
                    {business.members_count > 0 && (
                      <div className="members-badge-enhanced">
                        <Users size={12} />
                        <span>{business.members_count}</span>
                      </div>
                    )}
                  </div>

                  <h4 className="card-title-enhanced">{business.name}</h4>

                  <div className="owner-highlight">
                    <Crown size={14} className="owner-icon" />
                    <span className="owner-name">{business.owner_name}</span>
                    <span className="owner-badge">Owner</span>
                  </div>

                  {business.short_description && (
                    <p className="card-description-enhanced">
                      {business.short_description}
                    </p>
                  )}

                  <div className="card-meta-enhanced">
                    <span className="meta-item-enhanced">
                      <MapPin size={14} />
                      {business.city || business.location}
                    </span>
                    <span className="meta-item-enhanced price">
                      <span className="price-value">₱{business.price}</span>
                      <span className="price-unit">/{business.price_unit}</span>
                    </span>
                  </div>

                  <button className="card-btn-enhanced">
                    <span>View Details</span>
                    <ChevronRight size={16} className="btn-icon" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {!loadingRecommendations && recommendedBusinesses.length === 0 && (
            <div className="empty-container-enhanced">
              <p className="empty-text">
                No recommendations available at the moment.
              </p>
              <button
                className="btn-primary-enhanced"
                onClick={() => navigate("/browse")}
              >
                <Compass size={20} />
                <span>Browse All Businesses</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ClientDashboard;