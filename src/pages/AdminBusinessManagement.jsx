import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import AdminSidebarNav from '../components/admin/AdminSidebarNav';
import '../styles/AdminBusinessManagement.css';

const AdminBusinessManagement = () => {
  const navigate = useNavigate();
  const [businesses, setBusinesses] = useState([]);
  const [filteredBusinesses, setFilteredBusinesses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [selectedBusiness, setSelectedBusiness] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [actionLoading, setActionLoading] = useState({});
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    pending: 0,
    suspended: 0
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
  }, [searchTerm, statusFilter, typeFilter, businesses]);

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
            last_name
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setBusinesses(data || []);
      setFilteredBusinesses(data || []);
      
      // Calculate stats
      const stats = {
        total: data?.length || 0,
        active: data?.filter(b => b.status === 'active').length || 0,
        pending: data?.filter(b => b.status === 'pending').length || 0,
        suspended: data?.filter(b => b.status === 'suspended').length || 0
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
        business.location?.toLowerCase().includes(term)
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

    setFilteredBusinesses(filtered);
  };

  const handleVerifyBusiness = async (businessId) => {
    if (!window.confirm('Are you sure you want to verify this business?')) return;

    try {
      setActionLoading(prev => ({ ...prev, [businessId]: 'verify' }));

      const { error } = await supabase
        .from('businesses')
        .update({ 
          verified: true, 
          status: 'active',
          updated_at: new Date().toISOString()
        })
        .eq('id', businessId);

      if (error) throw error;

      // Refresh data
      await fetchBusinesses();
      
      alert('Business verified successfully!');
    } catch (error) {
      console.error('Error verifying business:', error);
      alert('Failed to verify business. Please try again.');
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

      // Refresh data
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

      // Refresh data
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

      // Refresh data
      await fetchBusinesses();
      
      alert('Business deleted successfully.');
    } catch (error) {
      console.error('Error deleting business:', error);
      alert('Failed to delete business. Please try again.');
    } finally {
      setActionLoading(prev => ({ ...prev, [businessId]: null }));
    }
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
      default:
        return <span className="status-badge">{status}</span>;
    }
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
            <div className="stat-icon-wrapper active">
              <span className="stat-icon">✅</span>
            </div>
            <div className="stat-content">
              <span className="stat-value">{stats.active}</span>
              <span className="stat-label">Active</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon-wrapper pending">
              <span className="stat-icon">⏳</span>
            </div>
            <div className="stat-content">
              <span className="stat-value">{stats.pending}</span>
              <span className="stat-label">Pending</span>
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
              placeholder="Search businesses by name, type, or owner..."
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
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="filter-select"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="pending">Pending</option>
              <option value="suspended">Suspended</option>
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
                  {getStatusBadge(business.status)}
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

                  {business.verified && (
                    <div className="verified-badge">
                      <span className="verified-icon">✓</span>
                      Verified Business
                    </div>
                  )}
                </div>

                <div className="business-card-footer">
                  <div className="action-buttons">
                    {!business.verified && business.status === 'active' && (
                      <button
                        className="action-btn verify"
                        onClick={() => handleVerifyBusiness(business.id)}
                        disabled={actionLoading[business.id]}
                      >
                        {actionLoading[business.id] === 'verify' ? (
                          <span className="loading-spinner-small"></span>
                        ) : (
                          <>
                            <span className="btn-icon">✓</span>
                            Verify
                          </>
                        )}
                      </button>
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
                    ) : null}

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
            {(searchTerm || statusFilter !== 'all' || typeFilter !== 'all') && (
              <button
                className="clear-filters-btn"
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('all');
                  setTypeFilter('all');
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
                      <span className="detail-label">Verified:</span>
                      <span className="detail-value">
                        {selectedBusiness.verified ? '✅ Yes' : '❌ No'}
                      </span>
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
                      <span className="detail-label">Owner ID:</span>
                      <span className="detail-value">{selectedBusiness.owner_id || 'N/A'}</span>
                    </div>
                  </div>

                  <div className="detail-section full-width">
                    <h3>Description</h3>
                    <p className="full-description">
                      {selectedBusiness.description || 'No description provided.'}
                    </p>
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
      </div>
    </AdminSidebarNav>
  );
};

export default AdminBusinessManagement;