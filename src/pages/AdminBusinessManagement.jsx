import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import AdminSidebarNav from '../components/admin/AdminSidebarNav';
import RejectionModal from '../components/admin/RejectionModal';
import PermitViewerModal from '../components/admin/PermitViewerModal';
import '../styles/AdminBusinessManagement.css';

const AdminBusinessManagement = () => {
  const navigate = useNavigate();
  const [businesses, setBusinesses] = useState([]);
  const [filteredBusinesses, setFilteredBusinesses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [verificationFilter, setVerificationFilter] = useState('all');
  const [selectedBusiness, setSelectedBusiness] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showRejectionModal, setShowRejectionModal] = useState(false);
  const [showPermitModal, setShowPermitModal] = useState(false);
  const [actionLoading, setActionLoading] = useState({});
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    pending: 0,
    suspended: 0,
    verified: 0,
    unverified: 0,
    permitPending: 0
  });

  // Business types for filter
  const businessTypes = [
    { id: 'all', label: 'All Types', icon: '🏢' },
    { id: 'gym', label: 'Gym', icon: '🏋️' },
    { id: 'cafe', label: 'Cafe', icon: '☕' },
    { id: 'bakery', label: 'Bakery', icon: '🥐' },
  ];

  useEffect(() => {
    fetchBusinesses();
  }, []);

  useEffect(() => {
    filterBusinesses();
  }, [searchTerm, statusFilter, typeFilter, verificationFilter, businesses]);

  const fetchBusinesses = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('businesses')
        .select(`
          *,
          owner:profiles!businesses_owner_id_fkey (
            id,
            email,
            first_name,
            last_name,
            role,
            verification_status
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setBusinesses(data || []);
      setFilteredBusinesses(data || []);
      
      // Calculate stats with permit info
      const stats = {
        total: data?.length || 0,
        active: data?.filter(b => b.status === 'active').length || 0,
        pending: data?.filter(b => b.verification_status === 'pending').length || 0,
        suspended: data?.filter(b => b.status === 'suspended').length || 0,
        verified: data?.filter(b => b.verification_status === 'approved' && b.permit_verified).length || 0,
        unverified: data?.filter(b => b.verification_status === 'pending' || !b.verification_status).length || 0,
        permitPending: data?.filter(b => b.permit_document && !b.permit_verified).length || 0
      };
      setStats(stats);

    } catch (error) {
      console.error('Error fetching businesses:', error);
      alert('Failed to load businesses. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const filterBusinesses = () => {
    let filtered = [...businesses];

    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(business => 
        business.name?.toLowerCase().includes(term) ||
        business.business_type?.toLowerCase().includes(term) ||
        business.owner?.email?.toLowerCase().includes(term) ||
        business.owner?.first_name?.toLowerCase().includes(term) ||
        business.owner?.last_name?.toLowerCase().includes(term) ||
        business.location?.toLowerCase().includes(term) ||
        business.permit_number?.toLowerCase().includes(term)
      );
    }

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(business => business.status === statusFilter);
    }

    // Filter by business type
    if (typeFilter !== 'all') {
      filtered = filtered.filter(business => business.business_type === typeFilter);
    }

    // Filter by verification status
    if (verificationFilter !== 'all') {
      filtered = filtered.filter(business => business.verification_status === verificationFilter);
    }

    setFilteredBusinesses(filtered);
  };

  const handleApproveBusiness = async (business) => {
    try {
      setActionLoading(prev => ({ ...prev, [business.id]: 'approve' }));

      // Check if permit is uploaded
      if (!business.permit_document) {
        alert('This business has not uploaded a business permit. Please ask them to upload a permit first.');
        return;
      }

      // Get current admin profile
      const { data: adminProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('role', 'admin')
        .maybeSingle();

      // Update business with full approval
      const { error: businessError } = await supabase
        .from('businesses')
        .update({ 
          verification_status: 'approved',
          status: 'active',
          permit_verified: true,
          permit_verified_at: new Date().toISOString(),
          permit_verified_by: adminProfile?.id || null,
          verified_at: new Date().toISOString(),
          verified_by: adminProfile?.id || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', business.id);

      if (businessError) throw businessError;

      // Check if owner exists and needs to be approved
      if (business.owner_id) {
        const { data: ownerData } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', business.owner_id)
          .maybeSingle();

        if (ownerData?.role === 'pending_owner') {
          await supabase
            .from('profiles')
            .update({ 
              role: 'owner',
              verification_status: 'approved',
              approved_at: new Date().toISOString(),
              approved_by: adminProfile?.id || null,
              updated_at: new Date().toISOString()
            })
            .eq('id', business.owner_id);
        }
      }

      // Log verification
      await supabase
        .from('verification_logs')
        .insert({
          business_id: business.id,
          owner_id: business.owner_id,
          action_by: adminProfile?.id || null,
          action_type: 'approve',
          created_at: new Date().toISOString()
        });

      // Notify business owner
      await supabase
        .from('notifications')
        .insert({
          user_id: business.owner_id,
          type: 'business_approved',
          title: '✅ Business Approved!',
          message: `Your business "${business.name}" has been verified and approved with your business permit.`,
          data: { 
            businessId: business.id,
            businessName: business.name
          },
          created_at: new Date().toISOString()
        });

      await fetchBusinesses();
      alert('Business approved successfully!');
    } catch (error) {
      console.error('Error approving business:', error);
      alert('Failed to approve business. Please try again.');
    } finally {
      setActionLoading(prev => ({ ...prev, [business.id]: null }));
    }
  };

  const handleRejectBusiness = async (business, reason) => {
    try {
      setActionLoading(prev => ({ ...prev, [business.id]: 'reject' }));

      const { data: adminProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('role', 'admin')
        .maybeSingle();

      // Update business to rejected
      const { error: businessError } = await supabase
        .from('businesses')
        .update({ 
          verification_status: 'rejected',
          status: 'rejected',
          rejection_reason: reason,
          permit_verified: false,
          verified_at: new Date().toISOString(),
          verified_by: adminProfile?.id || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', business.id);

      if (businessError) throw businessError;

      // Log rejection
      await supabase
        .from('verification_logs')
        .insert({
          business_id: business.id,
          owner_id: business.owner_id,
          action_by: adminProfile?.id || null,
          action_type: 'reject',
          reason: reason,
          created_at: new Date().toISOString()
        });

      // Notify business owner
      await supabase
        .from('notifications')
        .insert({
          user_id: business.owner_id,
          type: 'business_rejected',
          title: '❌ Business Application Update',
          message: reason || `Your business "${business.name}" was not approved. Please check your permit and try again.`,
          data: { 
            businessId: business.id,
            businessName: business.name,
            reason: reason
          },
          created_at: new Date().toISOString()
        });

      await fetchBusinesses();
      alert('Business rejected successfully.');
    } catch (error) {
      console.error('Error rejecting business:', error);
      alert('Failed to reject business. Please try again.');
    } finally {
      setActionLoading(prev => ({ ...prev, [business.id]: null }));
      setShowRejectionModal(false);
      setSelectedBusiness(null);
    }
  };

  const handleRejectClick = (business) => {
    setSelectedBusiness(business);
    setShowRejectionModal(true);
  };

  const handleVerifyPermit = async (businessId) => {
    try {
      setActionLoading(prev => ({ ...prev, [businessId]: 'verifyPermit' }));

      const { data: adminProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('role', 'admin')
        .maybeSingle();

      const { error } = await supabase
        .from('businesses')
        .update({ 
          permit_verified: true,
          permit_verified_at: new Date().toISOString(),
          permit_verified_by: adminProfile?.id || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', businessId);

      if (error) throw error;

      await fetchBusinesses();
      alert('Permit verified successfully!');
    } catch (error) {
      console.error('Error verifying permit:', error);
      alert('Failed to verify permit. Please try again.');
    } finally {
      setActionLoading(prev => ({ ...prev, [businessId]: null }));
    }
  };

  const handleSuspendBusiness = async (businessId) => {
    if (!window.confirm('Are you sure you want to suspend this business? The business will not be visible to users.')) return;

    try {
      setActionLoading(prev => ({ ...prev, [businessId]: 'suspend' }));

      const { error } = await supabase
        .from('businesses')
        .update({ 
          status: 'suspended',
          updated_at: new Date().toISOString()
        })
        .eq('id', businessId);

      if (error) throw error;

      // Notify owner
      const business = businesses.find(b => b.id === businessId);
      if (business) {
        await supabase
          .from('notifications')
          .insert({
            user_id: business.owner_id,
            type: 'business_suspended',
            title: '⚠️ Business Suspended',
            message: `Your business "${business.name}" has been suspended. Please contact admin for more information.`,
            data: { businessId },
            created_at: new Date().toISOString()
          });
      }

      await fetchBusinesses();
      alert('Business suspended successfully!');
    } catch (error) {
      console.error('Error suspending business:', error);
      alert('Failed to suspend business. Please try again.');
    } finally {
      setActionLoading(prev => ({ ...prev, [businessId]: null }));
    }
  };

  const handleActivateBusiness = async (businessId) => {
    if (!window.confirm('Are you sure you want to activate this business?')) return;

    try {
      setActionLoading(prev => ({ ...prev, [businessId]: 'activate' }));

      const { error } = await supabase
        .from('businesses')
        .update({ 
          status: 'active',
          updated_at: new Date().toISOString()
        })
        .eq('id', businessId);

      if (error) throw error;

      // Notify owner
      const business = businesses.find(b => b.id === businessId);
      if (business) {
        await supabase
          .from('notifications')
          .insert({
            user_id: business.owner_id,
            type: 'business_activated',
            title: '✅ Business Activated',
            message: `Your business "${business.name}" has been activated and is now visible to customers.`,
            data: { businessId },
            created_at: new Date().toISOString()
          });
      }

      await fetchBusinesses();
      alert('Business activated successfully!');
    } catch (error) {
      console.error('Error activating business:', error);
      alert('Failed to activate business. Please try again.');
    } finally {
      setActionLoading(prev => ({ ...prev, [businessId]: null }));
    }
  };

  const handleDeleteBusiness = async (businessId) => {
    if (!window.confirm('⚠️ ARE YOU ABSOLUTELY SURE?\n\nDeleting this business will permanently remove all associated data including:\n• Business information\n• Membership plans\n• Member memberships\n• Applications\n• Payment records\n\nThis action CANNOT be undone!')) return;

    try {
      setActionLoading(prev => ({ ...prev, [businessId]: 'delete' }));

      const { error } = await supabase
        .from('businesses')
        .delete()
        .eq('id', businessId);

      if (error) throw error;

      await fetchBusinesses();
      alert('Business deleted successfully.');
    } catch (error) {
      console.error('Error deleting business:', error);
      alert('Failed to delete business. Please try again.');
    } finally {
      setActionLoading(prev => ({ ...prev, [businessId]: null }));
    }
  };

  const handleViewPermit = (business) => {
    setSelectedBusiness(business);
    setShowPermitModal(true);
  };

  const handleViewDetails = (business) => {
    setSelectedBusiness(business);
    setShowDetailsModal(true);
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

  const getBusinessIcon = (business) => {
    switch (business.business_type) {
      case 'gym':
        return business.emoji || '🏋️';
      case 'cafe':
        return business.emoji || '☕';
      case 'bakery':
        return business.emoji || '🥐';
      default:
        return business.emoji || '🏢';
    }
  };

  const getStatusBadge = (status) => {
    switch(status) {
      case 'active':
        return <span className="status-badge active">Active</span>;
      case 'pending':
        return <span className="status-badge pending">Pending</span>;
      case 'suspended':
        return <span className="status-badge suspended">Suspended</span>;
      case 'rejected':
        return <span className="status-badge rejected">Rejected</span>;
      default:
        return <span className="status-badge">{status}</span>;
    }
  };

  const getVerificationBadge = (business) => {
    if (business.verification_status === 'approved' && business.permit_verified) {
      return <span className="verification-badge approved">✅ Fully Verified</span>;
    } else if (business.verification_status === 'approved' && !business.permit_verified) {
      return <span className="verification-badge pending">📄 Permit Pending</span>;
    } else if (business.verification_status === 'pending') {
      return <span className="verification-badge pending">⏳ Pending Review</span>;
    } else if (business.verification_status === 'rejected') {
      return <span className="verification-badge rejected">❌ Rejected</span>;
    }
    return <span className="verification-badge">Not Set</span>;
  };

  const getPermitBadge = (business) => {
    if (!business.permit_document) {
      return <span className="permit-badge missing">📄 No Permit</span>;
    }
    if (business.permit_verified) {
      return <span className="permit-badge verified">✅ Permit Verified</span>;
    }
    return <span className="permit-badge pending">⏳ Permit Pending</span>;
  };

  if (loading) {
    return (
      <AdminSidebarNav>
        <div className="admin-loading">
          <div className="loading-spinner"></div>
          <p>Loading businesses...</p>
        </div>
      </AdminSidebarNav>
    );
  }

  return (
    <AdminSidebarNav>
      <div className="business-management-container">
        {/* Header */}
        <div className="business-management-header">
          <div className="header-left">
            <h1 className="page-title">Business Management</h1>
            <div className="header-decoration"></div>
          </div>
          <div className="header-right">
            <button 
              className="btn-primary"
              onClick={() => navigate('/admin/businesses/add')}
            >
              <span className="btn-icon">➕</span>
              Add Business
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon-wrapper total">
              <span className="stat-icon">🏢</span>
            </div>
            <div className="stat-content">
              <span className="stat-value">{stats.total}</span>
              <span className="stat-label">Total Businesses</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon-wrapper verified">
              <span className="stat-icon">✅</span>
            </div>
            <div className="stat-content">
              <span className="stat-value">{stats.verified}</span>
              <span className="stat-label">Fully Verified</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon-wrapper pending">
              <span className="stat-icon">⏳</span>
            </div>
            <div className="stat-content">
              <span className="stat-value">{stats.permitPending}</span>
              <span className="stat-label">Permit Pending</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon-wrapper suspended">
              <span className="stat-icon">⚠️</span>
            </div>
            <div className="stat-content">
              <span className="stat-value">{stats.suspended}</span>
              <span className="stat-label">Suspended</span>
            </div>
          </div>
        </div>

        {/* Search and Filter Bar */}
        <div className="filters-bar">
          <div className="search-box">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              placeholder="Search businesses by name, type, permit #, or owner..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
            {searchTerm && (
              <button 
                className="clear-search"
                onClick={() => setSearchTerm('')}
              >
                ✕
              </button>
            )}
          </div>

          <div className="filter-group">
            <select
              value={verificationFilter}
              onChange={(e) => setVerificationFilter(e.target.value)}
              className="filter-select"
            >
              <option value="all">All Verification</option>
              <option value="approved">Fully Verified</option>
              <option value="pending">Pending</option>
              <option value="rejected">Rejected</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="filter-select"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="pending">Pending</option>
              <option value="suspended">Suspended</option>
              <option value="rejected">Rejected</option>
            </select>

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="filter-select"
            >
              {businessTypes.map(type => (
                <option key={type.id} value={type.id}>
                  {type.icon} {type.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Results count */}
        <div className="results-info">
          <span className="results-count">
            Showing {filteredBusinesses.length} of {businesses.length} businesses
          </span>
        </div>

        {/* Businesses Grid */}
        {filteredBusinesses.length > 0 ? (
          <div className="businesses-grid">
            {filteredBusinesses.map((business) => (
              <div key={business.id} className="business-card">
                <div className="business-card-header">
                  <div className="business-icon-large">
                    <span className="business-emoji-large">{getBusinessIcon(business)}</span>
                  </div>
                  <div className="business-title-section">
                    <h3 className="business-name">{business.name}</h3>
                    <span className="business-type-badge">
                      {getBusinessIcon(business)} {business.business_type}
                    </span>
                  </div>
                  <div className="badge-group">
                    {getStatusBadge(business.status)}
                    {getPermitBadge(business)}
                  </div>
                </div>

                <div className="business-card-body">
                  <div className="business-info-row">
                    <span className="info-label">👑 Owner:</span>
                    <span className="info-value">
                      {business.owner ? (
                        <>
                          {business.owner.first_name} {business.owner.last_name}
                          <span className="owner-email"> ({business.owner.email})</span>
                        </>
                      ) : 'No owner assigned'}
                    </span>
                  </div>

                  <div className="business-info-row">
                    <span className="info-label">📍 Location:</span>
                    <span className="info-value">{business.location || 'Not specified'}</span>
                  </div>

                  <div className="business-info-row">
                    <span className="info-label">📄 Permit #:</span>
                    <span className="info-value">
                      {business.permit_number || 'Not submitted'}
                      {business.permit_document && (
                        <button
                          className="view-permit-link"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewPermit(business);
                          }}
                        >
                          View Document
                        </button>
                      )}
                    </span>
                  </div>

                  {business.permit_expiry && (
                    <div className="business-info-row">
                      <span className="info-label">📅 Permit Expiry:</span>
                      <span className="info-value">{formatDate(business.permit_expiry)}</span>
                    </div>
                  )}

                  <div className="business-info-row">
                    <span className="info-label">📅 Created:</span>
                    <span className="info-value">{formatDate(business.created_at)}</span>
                  </div>

                  <div className="business-description">
                    <span className="info-label">📝 Description:</span>
                    <p className="description-text">
                      {business.description 
                        ? business.description.length > 100 
                          ? `${business.description.substring(0, 100)}...` 
                          : business.description
                        : 'No description provided'}
                    </p>
                  </div>

                  {business.rejection_reason && (
                    <div className="rejection-reason">
                      <span className="rejection-icon">❌</span>
                      <span className="rejection-text">Rejection reason: {business.rejection_reason}</span>
                    </div>
                  )}
                </div>

                <div className="business-card-footer">
                  <div className="action-buttons">
                    {/* Permit Verification Button */}
                    {business.permit_document && !business.permit_verified && (
                      <button
                        className="action-btn verify-permit"
                        onClick={() => handleVerifyPermit(business.id)}
                        disabled={actionLoading[business.id]}
                      >
                        {actionLoading[business.id] === 'verifyPermit' ? (
                          <span className="loading-spinner-small"></span>
                        ) : (
                          <>
                            <span className="btn-icon">✓</span>
                            Verify Permit
                          </>
                        )}
                      </button>
                    )}

                    {/* Approval/Rejection buttons for pending businesses */}
                    {business.verification_status === 'pending' && business.permit_document && (
                      <>
                        <button
                          className="action-btn approve"
                          onClick={() => handleApproveBusiness(business)}
                          disabled={actionLoading[business.id]}
                        >
                          {actionLoading[business.id] === 'approve' ? (
                            <span className="loading-spinner-small"></span>
                          ) : (
                            <>
                              <span className="btn-icon">✓</span>
                              Approve
                            </>
                          )}
                        </button>
                        <button
                          className="action-btn reject"
                          onClick={() => handleRejectClick(business)}
                          disabled={actionLoading[business.id]}
                        >
                          {actionLoading[business.id] === 'reject' ? (
                            <span className="loading-spinner-small"></span>
                          ) : (
                            <>
                              <span className="btn-icon">✗</span>
                              Reject
                            </>
                          )}
                        </button>
                      </>
                    )}

                    {business.status === 'active' ? (
                      <button
                        className="action-btn suspend"
                        onClick={() => handleSuspendBusiness(business.id)}
                        disabled={actionLoading[business.id]}
                      >
                        {actionLoading[business.id] === 'suspend' ? (
                          <span className="loading-spinner-small"></span>
                        ) : (
                          <>
                            <span className="btn-icon">⚠️</span>
                            Suspend
                          </>
                        )}
                      </button>
                    ) : business.status === 'suspended' ? (
                      <button
                        className="action-btn activate"
                        onClick={() => handleActivateBusiness(business.id)}
                        disabled={actionLoading[business.id]}
                      >
                        {actionLoading[business.id] === 'activate' ? (
                          <span className="loading-spinner-small"></span>
                        ) : (
                          <>
                            <span className="btn-icon">✓</span>
                            Activate
                          </>
                        )}
                      </button>
                    ) : business.status === 'rejected' && business.permit_document && (
                      <button
                        className="action-btn reactivate"
                        onClick={() => handleApproveBusiness(business)}
                        disabled={actionLoading[business.id]}
                      >
                        {actionLoading[business.id] === 'approve' ? (
                          <span className="loading-spinner-small"></span>
                        ) : (
                          <>
                            <span className="btn-icon">🔄</span>
                            Reactivate
                          </>
                        )}
                      </button>
                    )}

                    <button
                      className="action-btn view"
                      onClick={() => handleViewDetails(business)}
                    >
                      <span className="btn-icon">👁️</span>
                      View
                    </button>

                    <button
                      className="action-btn delete"
                      onClick={() => handleDeleteBusiness(business.id)}
                      disabled={actionLoading[business.id]}
                    >
                      {actionLoading[business.id] === 'delete' ? (
                        <span className="loading-spinner-small"></span>
                      ) : (
                        <>
                          <span className="btn-icon">🗑️</span>
                          Delete
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-icon">🏢</div>
            <h3>No Businesses Found</h3>
            <p>Try adjusting your search or filter to find what you're looking for.</p>
            {(searchTerm || statusFilter !== 'all' || typeFilter !== 'all' || verificationFilter !== 'all') && (
              <button
                className="clear-filters-btn"
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('all');
                  setTypeFilter('all');
                  setVerificationFilter('all');
                }}
              >
                Clear All Filters
              </button>
            )}
          </div>
        )}

        {/* Business Details Modal */}
        {showDetailsModal && selectedBusiness && (
          <div className="modal-overlay" onClick={() => setShowDetailsModal(false)}>
            <div className="modal-content business-details-modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <div className="modal-title">
                  <span className="modal-icon">{getBusinessIcon(selectedBusiness)}</span>
                  <h2>{selectedBusiness.name}</h2>
                </div>
                <button className="modal-close" onClick={() => setShowDetailsModal(false)}>×</button>
              </div>

              <div className="modal-body">
                <div className="details-grid">
                  <div className="detail-section">
                    <h3>Business Information</h3>
                    <div className="detail-item">
                      <span className="detail-label">Type:</span>
                      <span className="detail-value">{selectedBusiness.business_type}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Status:</span>
                      <span className="detail-value">{getStatusBadge(selectedBusiness.status)}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Verification:</span>
                      <span className="detail-value">{getVerificationBadge(selectedBusiness)}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Location:</span>
                      <span className="detail-value">{selectedBusiness.location || 'Not specified'}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Address:</span>
                      <span className="detail-value">{selectedBusiness.address || 'Not specified'}</span>
                    </div>
                  </div>

                  <div className="detail-section">
                    <h3>Owner Information</h3>
                    <div className="detail-item">
                      <span className="detail-label">Name:</span>
                      <span className="detail-value">
                        {selectedBusiness.owner ? (
                          `${selectedBusiness.owner.first_name} ${selectedBusiness.owner.last_name}`
                        ) : 'No owner'}
                      </span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Email:</span>
                      <span className="detail-value">{selectedBusiness.owner?.email || 'N/A'}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Owner Status:</span>
                      <span className="detail-value">
                        {selectedBusiness.owner?.role === 'owner' ? (
                          <span className="status-badge active">Approved Owner</span>
                        ) : (
                          'Unknown'
                        )}
                      </span>
                    </div>
                  </div>

                  <div className="detail-section">
                    <h3>Permit Information</h3>
                    <div className="detail-item">
                      <span className="detail-label">Permit Number:</span>
                      <span className="detail-value">{selectedBusiness.permit_number || 'Not provided'}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Expiry Date:</span>
                      <span className="detail-value">
                        {selectedBusiness.permit_expiry 
                          ? new Date(selectedBusiness.permit_expiry).toLocaleDateString() 
                          : 'Not provided'}
                      </span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Permit Status:</span>
                      <span className="detail-value">
                        {selectedBusiness.permit_verified ? (
                          <span className="status-badge active">Verified</span>
                        ) : selectedBusiness.permit_document ? (
                          <span className="status-badge pending">Pending Verification</span>
                        ) : (
                          <span className="status-badge">Not Uploaded</span>
                        )}
                      </span>
                    </div>
                    {selectedBusiness.permit_document && (
                      <div className="detail-item">
                        <span className="detail-label">Document:</span>
                        <button
                          className="view-permit-button"
                          onClick={() => {
                            setShowDetailsModal(false);
                            handleViewPermit(selectedBusiness);
                          }}
                        >
                          📄 View Permit Document
                        </button>
                      </div>
                    )}
                    {selectedBusiness.rejection_reason && (
                      <div className="detail-item">
                        <span className="detail-label">Rejection:</span>
                        <span className="detail-value rejection-text">{selectedBusiness.rejection_reason}</span>
                      </div>
                    )}
                  </div>

                  <div className="detail-section">
                    <h3>Contact Information</h3>
                    <div className="detail-item">
                      <span className="detail-label">Phone:</span>
                      <span className="detail-value">{selectedBusiness.contact_phone || 'Not provided'}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Email:</span>
                      <span className="detail-value">{selectedBusiness.contact_email || 'Not provided'}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Website:</span>
                      <span className="detail-value">{selectedBusiness.website || 'Not provided'}</span>
                    </div>
                  </div>

                  <div className="detail-section">
                    <h3>Business Metrics</h3>
                    <div className="detail-item">
                      <span className="detail-label">Members:</span>
                      <span className="detail-value">{selectedBusiness.members_count || 0}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Rating:</span>
                      <span className="detail-value">{selectedBusiness.rating || '0.0'} ⭐</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Created:</span>
                      <span className="detail-value">{formatDate(selectedBusiness.created_at)}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Last Updated:</span>
                      <span className="detail-value">{formatDate(selectedBusiness.updated_at)}</span>
                    </div>
                  </div>

                  {selectedBusiness.rejection_reason && (
                    <div className="detail-section full-width">
                      <h3>Rejection Reason</h3>
                      <div className="rejection-detail">
                        <p>{selectedBusiness.rejection_reason}</p>
                      </div>
                    </div>
                  )}

                  <div className="detail-section full-width">
                    <h3>Description</h3>
                    <p className="full-description">
                      {selectedBusiness.description || 'No description provided.'}
                    </p>
                  </div>

                  {selectedBusiness.business_hours && (
                    <div className="detail-section full-width">
                      <h3>Business Hours</h3>
                      <div className="hours-grid">
                        {Object.entries(selectedBusiness.business_hours).map(([day, hours]) => (
                          <div key={day} className="hours-row">
                            <span className="hours-day">{day}:</span>
                            <span className="hours-time">
                              {hours.closed ? 'Closed' : `${hours.open} - ${hours.close}`}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedBusiness.amenities && selectedBusiness.amenities.length > 0 && (
                    <div className="detail-section full-width">
                      <h3>Amenities</h3>
                      <div className="amenities-list">
                        {selectedBusiness.amenities.map((amenity, index) => (
                          <span key={index} className="amenity-tag">{amenity}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="modal-footer">
                <button className="btn-secondary" onClick={() => setShowDetailsModal(false)}>
                  Close
                </button>
                {selectedBusiness.verification_status === 'pending' && selectedBusiness.permit_document && (
                  <>
                    <button 
                      className="btn-approve"
                      onClick={() => {
                        setShowDetailsModal(false);
                        handleApproveBusiness(selectedBusiness);
                      }}
                    >
                      ✓ Approve Business
                    </button>
                    <button 
                      className="btn-reject"
                      onClick={() => {
                        setShowDetailsModal(false);
                        handleRejectClick(selectedBusiness);
                      }}
                    >
                      ✗ Reject Business
                    </button>
                  </>
                )}
                <button 
                  className="btn-primary"
                  onClick={() => {
                    setShowDetailsModal(false);
                    navigate(`/admin/businesses/edit/${selectedBusiness.id}`);
                  }}
                >
                  Edit Business
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Permit Viewer Modal */}
        <PermitViewerModal
          isOpen={showPermitModal}
          onClose={() => {
            setShowPermitModal(false);
            setSelectedBusiness(null);
          }}
          business={selectedBusiness}
        />

        {/* Rejection Modal */}
        <RejectionModal
          isOpen={showRejectionModal}
          onClose={() => {
            setShowRejectionModal(false);
            setSelectedBusiness(null);
          }}
          onConfirm={(reason) => handleRejectBusiness(selectedBusiness, reason)}
          ownerName={selectedBusiness ? `${selectedBusiness.owner?.first_name} ${selectedBusiness.owner?.last_name}` : ''}
          businessName={selectedBusiness?.name || ''}
        />
      </div>
    </AdminSidebarNav>
  );
};

export default AdminBusinessManagement;