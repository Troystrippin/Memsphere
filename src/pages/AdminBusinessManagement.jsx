import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import AdminSidebarNav from '../components/admin/AdminSidebarNav';
import RejectionModal from '../components/admin/RejectionModal';
import PermitViewerModal from '../components/admin/PermitViewerModal';
import { motion, AnimatePresence } from 'framer-motion';

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
        return <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">Active</span>;
      case 'pending':
        return <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">Pending</span>;
      case 'suspended':
        return <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">Suspended</span>;
      case 'rejected':
        return <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">Rejected</span>;
      default:
        return <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">{status}</span>;
    }
  };

  const getPermitBadge = (business) => {
    if (!business.permit_document) {
      return <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">📄 No Permit</span>;
    }
    if (business.permit_verified) {
      return <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">✅ Permit Verified</span>;
    }
    return <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">⏳ Permit Pending</span>;
  };

  if (loading) {
    return (
      <AdminSidebarNav>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Loading businesses...</p>
          </div>
        </div>
      </AdminSidebarNav>
    );
  }

  return (
    <AdminSidebarNav>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Business Management</h1>
            <p className="text-gray-600 mt-1">Manage and verify business accounts</p>
          </div>
          <button 
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-md hover:shadow-lg"
            onClick={() => navigate('/admin/businesses/add')}
          >
            <span>➕</span> Add Business
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl shadow-lg p-5 hover:shadow-xl transition-shadow">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                <span className="text-2xl">🏢</span>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                <p className="text-sm text-gray-600">Total Businesses</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-5 hover:shadow-xl transition-shadow">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
                <span className="text-2xl">✅</span>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.verified}</p>
                <p className="text-sm text-gray-600">Fully Verified</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-5 hover:shadow-xl transition-shadow">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-yellow-100 flex items-center justify-center">
                <span className="text-2xl">⏳</span>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.permitPending}</p>
                <p className="text-sm text-gray-600">Permit Pending</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-5 hover:shadow-xl transition-shadow">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center">
                <span className="text-2xl">⚠️</span>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.suspended}</p>
                <p className="text-sm text-gray-600">Suspended</p>
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filter Bar */}
        <div className="bg-white rounded-xl shadow-lg p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-lg">🔍</span>
              <input
                type="text"
                placeholder="Search businesses by name, type, permit #, or owner..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {searchTerm && (
                <button 
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  onClick={() => setSearchTerm('')}
                >
                  ✕
                </button>
              )}
            </div>

            <div className="flex gap-2">
              <select
                value={verificationFilter}
                onChange={(e) => setVerificationFilter(e.target.value)}
                className="px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="all">All Verification</option>
                <option value="approved">Fully Verified</option>
                <option value="pending">Pending</option>
                <option value="rejected">Rejected</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
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
                className="px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
              >
                {businessTypes.map(type => (
                  <option key={type.id} value={type.id}>
                    {type.icon} {type.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Results count */}
        <div className="text-sm text-gray-600">
          Showing {filteredBusinesses.length} of {businesses.length} businesses
        </div>

        {/* Businesses Grid */}
        {filteredBusinesses.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredBusinesses.map((business, index) => (
              <motion.div
                key={business.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300"
              >
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center text-3xl">
                        {getBusinessIcon(business)}
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg text-gray-900">{business.name}</h3>
                        <span className="text-sm text-gray-500">{business.business_type}</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {getStatusBadge(business.status)}
                      {getPermitBadge(business)}
                    </div>
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-gray-500 w-20">👑 Owner:</span>
                      <span className="text-gray-700">
                        {business.owner ? `${business.owner.first_name || ''} ${business.owner.last_name || ''}`.trim() || business.owner.email : 'No owner'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-gray-500 w-20">📍 Location:</span>
                      <span className="text-gray-700">{business.location || 'Not specified'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-gray-500 w-20">📄 Permit #:</span>
                      <span className="text-gray-700">{business.permit_number || 'Not submitted'}</span>
                      {business.permit_document && (
                        <button
                          onClick={() => handleViewPermit(business)}
                          className="text-blue-600 hover:text-blue-700 text-sm underline ml-2"
                        >
                          View Document
                        </button>
                      )}
                    </div>
                    {business.permit_expiry && (
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-gray-500 w-20">📅 Expiry:</span>
                        <span className="text-gray-700">{formatDate(business.permit_expiry)}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-gray-500 w-20">📅 Created:</span>
                      <span className="text-gray-700">{formatDate(business.created_at)}</span>
                    </div>
                    {business.description && (
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <p className="text-sm text-gray-600 line-clamp-2">
                          {business.description.length > 100 ? `${business.description.substring(0, 100)}...` : business.description}
                        </p>
                      </div>
                    )}
                    {business.rejection_reason && (
                      <div className="mt-2 p-2 bg-red-50 rounded-lg">
                        <p className="text-xs text-red-600 font-medium">Rejection reason:</p>
                        <p className="text-sm text-red-700">{business.rejection_reason}</p>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2 pt-4 border-t border-gray-100">
                    {/* Permit Verification Button */}
                    {business.permit_document && !business.permit_verified && (
                      <button
                        onClick={() => handleVerifyPermit(business.id)}
                        disabled={actionLoading[business.id]}
                        className="flex-1 px-3 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors text-sm font-medium disabled:opacity-50"
                      >
                        {actionLoading[business.id] === 'verifyPermit' ? (
                          <div className="flex items-center justify-center gap-2">
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            Verifying...
                          </div>
                        ) : (
                          <>✓ Verify Permit</>
                        )}
                      </button>
                    )}

                    {/* Approval/Rejection buttons for pending businesses */}
                    {business.verification_status === 'pending' && business.permit_document && (
                      <>
                        <button
                          onClick={() => handleApproveBusiness(business)}
                          disabled={actionLoading[business.id]}
                          className="flex-1 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium disabled:opacity-50"
                        >
                          {actionLoading[business.id] === 'approve' ? (
                            <div className="flex items-center justify-center gap-2">
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                              Approving...
                            </div>
                          ) : (
                            <>✓ Approve</>
                          )}
                        </button>
                        <button
                          onClick={() => handleRejectClick(business)}
                          disabled={actionLoading[business.id]}
                          className="flex-1 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium disabled:opacity-50"
                        >
                          {actionLoading[business.id] === 'reject' ? (
                            <div className="flex items-center justify-center gap-2">
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                              Rejecting...
                            </div>
                          ) : (
                            <>✗ Reject</>
                          )}
                        </button>
                      </>
                    )}

                    {business.status === 'active' ? (
                      <button
                        onClick={() => handleSuspendBusiness(business.id)}
                        disabled={actionLoading[business.id]}
                        className="flex-1 px-3 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm font-medium disabled:opacity-50"
                      >
                        {actionLoading[business.id] === 'suspend' ? (
                          <div className="flex items-center justify-center gap-2">
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            Suspending...
                          </div>
                        ) : (
                          <>⚠️ Suspend</>
                        )}
                      </button>
                    ) : business.status === 'suspended' ? (
                      <button
                        onClick={() => handleActivateBusiness(business.id)}
                        disabled={actionLoading[business.id]}
                        className="flex-1 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium disabled:opacity-50"
                      >
                        {actionLoading[business.id] === 'activate' ? (
                          <div className="flex items-center justify-center gap-2">
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            Activating...
                          </div>
                        ) : (
                          <>✓ Activate</>
                        )}
                      </button>
                    ) : business.status === 'rejected' && business.permit_document && (
                      <button
                        onClick={() => handleApproveBusiness(business)}
                        disabled={actionLoading[business.id]}
                        className="flex-1 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium disabled:opacity-50"
                      >
                        {actionLoading[business.id] === 'approve' ? (
                          <div className="flex items-center justify-center gap-2">
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            Reactivating...
                          </div>
                        ) : (
                          <>🔄 Reactivate</>
                        )}
                      </button>
                    )}

                    <button
                      onClick={() => handleViewDetails(business)}
                      className="flex-1 px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm font-medium"
                    >
                      👁️ View Details
                    </button>

                    <button
                      onClick={() => handleDeleteBusiness(business.id)}
                      disabled={actionLoading[business.id]}
                      className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium disabled:opacity-50"
                    >
                      {actionLoading[business.id] === 'delete' ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <>🗑️ Delete</>
                      )}
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-white rounded-xl shadow-lg">
            <div className="text-6xl mb-4">🏢</div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">No Businesses Found</h3>
            <p className="text-gray-500">Try adjusting your search or filter to find what you're looking for.</p>
            {(searchTerm || statusFilter !== 'all' || typeFilter !== 'all' || verificationFilter !== 'all') && (
              <button
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
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

        {/* Business Details Modal - Tailwind Styled */}
        <AnimatePresence>
          {showDetailsModal && selectedBusiness && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowDetailsModal(false)}>
              <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{getBusinessIcon(selectedBusiness)}</span>
                    <h2 className="text-xl font-bold text-white">{selectedBusiness.name}</h2>
                  </div>
                  <button onClick={() => setShowDetailsModal(false)} className="text-white hover:bg-white/20 rounded-full w-8 h-8 flex items-center justify-center">
                    ×
                  </button>
                </div>
                
                <div className="overflow-y-auto max-h-[calc(90vh-120px)] p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Business Information */}
                    <div className="space-y-4">
                      <h3 className="font-semibold text-gray-900 border-b pb-2">Business Information</h3>
                      <div className="space-y-2">
                        <div><span className="text-gray-500">Type:</span> {selectedBusiness.business_type}</div>
                        <div><span className="text-gray-500">Status:</span> {getStatusBadge(selectedBusiness.status)}</div>
                        <div><span className="text-gray-500">Verification:</span> {getPermitBadge(selectedBusiness)}</div>
                        <div><span className="text-gray-500">Location:</span> {selectedBusiness.location || 'Not specified'}</div>
                        <div><span className="text-gray-500">Address:</span> {selectedBusiness.address || 'Not specified'}</div>
                      </div>
                    </div>

                    {/* Owner Information */}
                    <div className="space-y-4">
                      <h3 className="font-semibold text-gray-900 border-b pb-2">Owner Information</h3>
                      <div className="space-y-2">
                        <div><span className="text-gray-500">Name:</span> {selectedBusiness.owner ? `${selectedBusiness.owner.first_name || ''} ${selectedBusiness.owner.last_name || ''}`.trim() || 'N/A' : 'No owner'}</div>
                        <div><span className="text-gray-500">Email:</span> {selectedBusiness.owner?.email || 'N/A'}</div>
                      </div>
                    </div>

                    {/* Permit Information */}
                    <div className="space-y-4">
                      <h3 className="font-semibold text-gray-900 border-b pb-2">Permit Information</h3>
                      <div className="space-y-2">
                        <div><span className="text-gray-500">Permit Number:</span> {selectedBusiness.permit_number || 'Not provided'}</div>
                        <div><span className="text-gray-500">Expiry Date:</span> {selectedBusiness.permit_expiry ? new Date(selectedBusiness.permit_expiry).toLocaleDateString() : 'Not provided'}</div>
                        {selectedBusiness.permit_document && (
                          <div><button onClick={() => { setShowDetailsModal(false); handleViewPermit(selectedBusiness); }} className="text-blue-600 hover:underline">📄 View Permit Document</button></div>
                        )}
                      </div>
                    </div>

                    {/* Contact Information */}
                    <div className="space-y-4">
                      <h3 className="font-semibold text-gray-900 border-b pb-2">Contact Information</h3>
                      <div className="space-y-2">
                        <div><span className="text-gray-500">Phone:</span> {selectedBusiness.contact_phone || 'Not provided'}</div>
                        <div><span className="text-gray-500">Email:</span> {selectedBusiness.contact_email || 'Not provided'}</div>
                        <div><span className="text-gray-500">Website:</span> {selectedBusiness.website || 'Not provided'}</div>
                      </div>
                    </div>

                    {/* Business Metrics */}
                    <div className="space-y-4">
                      <h3 className="font-semibold text-gray-900 border-b pb-2">Business Metrics</h3>
                      <div className="space-y-2">
                        <div><span className="text-gray-500">Members:</span> {selectedBusiness.members_count || 0}</div>
                        <div><span className="text-gray-500">Rating:</span> {selectedBusiness.rating || '0.0'} ⭐</div>
                        <div><span className="text-gray-500">Created:</span> {formatDate(selectedBusiness.created_at)}</div>
                        <div><span className="text-gray-500">Last Updated:</span> {formatDate(selectedBusiness.updated_at)}</div>
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  <div className="mt-6">
                    <h3 className="font-semibold text-gray-900 border-b pb-2">Description</h3>
                    <p className="mt-2 text-gray-700">{selectedBusiness.description || 'No description provided.'}</p>
                  </div>

                  {/* Rejection Reason */}
                  {selectedBusiness.rejection_reason && (
                    <div className="mt-4 p-4 bg-red-50 rounded-lg">
                      <h3 className="font-semibold text-red-800">Rejection Reason</h3>
                      <p className="text-red-700">{selectedBusiness.rejection_reason}</p>
                    </div>
                  )}
                </div>

                <div className="border-t border-gray-200 px-6 py-4 flex justify-end gap-3">
                  <button onClick={() => setShowDetailsModal(false)} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors">
                    Close
                  </button>
                  {selectedBusiness.verification_status === 'pending' && selectedBusiness.permit_document && (
                    <>
                      <button onClick={() => { setShowDetailsModal(false); handleApproveBusiness(selectedBusiness); }} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
                        ✓ Approve Business
                      </button>
                      <button onClick={() => { setShowDetailsModal(false); handleRejectClick(selectedBusiness); }} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">
                        ✗ Reject Business
                      </button>
                    </>
                  )}
                  <button onClick={() => { setShowDetailsModal(false); navigate(`/admin/businesses/edit/${selectedBusiness.id}`); }} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                    Edit Business
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

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
          ownerName={selectedBusiness ? `${selectedBusiness.owner?.first_name || ''} ${selectedBusiness.owner?.last_name || ''}`.trim() : ''}
          businessName={selectedBusiness?.name || ''}
        />
      </div>
    </AdminSidebarNav>
  );
};

export default AdminBusinessManagement;