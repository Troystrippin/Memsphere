import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import OwnerNavbar from '../components/owner/OwnerNavbar';
import '../styles/OwnerMemberManagement.css';

const OwnerMemberManagement = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [businesses, setBusinesses] = useState([]);
  const [selectedBusiness, setSelectedBusiness] = useState('all');
  const [members, setMembers] = useState([]);
  const [filteredMembers, setFilteredMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [memberAvatars, setMemberAvatars] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [messageSubject, setMessageSubject] = useState('');
  const [messageContent, setMessageContent] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState(null);
  const [messageType, setMessageType] = useState('announcement');
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  useEffect(() => {
    fetchOwnerData();
  }, []);

  useEffect(() => {
    filterMembers();
  }, [searchTerm, statusFilter, members, selectedBusiness]);

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
        await fetchMembers(businessIds);
      } else {
        setMembers([]);
        setFilteredMembers([]);
      }

    } catch (err) {
      console.error('Error fetching owner data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchMembers = async (businessIds) => {
    try {
      // First, get all memberships
      const { data: memberships, error: membershipsError } = await supabase
        .from('memberships')
        .select('*')
        .in('business_id', businessIds)
        .eq('status', 'approved')
        .order('created_at', { ascending: false });

      if (membershipsError) throw membershipsError;

      if (!memberships || memberships.length === 0) {
        setMembers([]);
        setFilteredMembers([]);
        return;
      }

      // Get all unique user IDs, plan IDs, and business IDs
      const userIds = [...new Set(memberships.map(m => m.user_id))];
      const planIds = [...new Set(memberships.map(m => m.plan_id))];
      const uniqueBusinessIds = [...new Set(memberships.map(m => m.business_id))];

      // Fetch all related data in parallel
      const [profilesResponse, plansResponse, businessesResponse] = await Promise.all([
        supabase.from('profiles').select('*').in('id', userIds),
        supabase.from('membership_plans').select('*').in('id', planIds),
        supabase.from('businesses').select('*').in('id', uniqueBusinessIds)
      ]);

      if (profilesResponse.error) throw profilesResponse.error;
      if (plansResponse.error) throw plansResponse.error;
      if (businessesResponse.error) throw businessesResponse.error;

      // Create lookup maps for faster access
      const profilesMap = Object.fromEntries(
        (profilesResponse.data || []).map(p => [p.id, p])
      );
      const plansMap = Object.fromEntries(
        (plansResponse.data || []).map(p => [p.id, p])
      );
      const businessesMap = Object.fromEntries(
        (businessesResponse.data || []).map(b => [b.id, b])
      );

      // Process memberships with related data
      const processedMembers = await Promise.all((memberships || []).map(async (membership) => {
        const profile = profilesMap[membership.user_id];
        const plan = plansMap[membership.plan_id];
        const business = businessesMap[membership.business_id];

        let avatarUrl = null;
        if (profile?.avatar_url) {
          avatarUrl = await getMemberAvatarUrl(profile.avatar_url, profile.id);
        }

        // Calculate membership status
        const now = new Date();
        const endDate = new Date(membership.end_date);
        const daysUntilExpiry = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));
        
        let membershipStatus = 'active';
        if (daysUntilExpiry < 0) {
          membershipStatus = 'expired';
        } else if (daysUntilExpiry <= 7) {
          membershipStatus = 'expiring_soon';
        }

        // Format dates
        const startDate = membership.start_date ? new Date(membership.start_date).toISOString() : null;
        const endDateFormatted = membership.end_date ? new Date(membership.end_date).toISOString() : null;
        const joinedDate = membership.created_at ? new Date(membership.created_at).toISOString() : null;

        return {
          id: membership.id,
          membershipId: membership.id,
          userId: profile?.id,
          name: profile ? 
            `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 
            profile.email?.split('@')[0] || 
            'Unknown User' : 
            'Unknown User',
          email: profile?.email || 'No email',
          phone: profile?.mobile || 'Not provided',
          plan: plan?.name || 'Standard Plan',
          planId: plan?.id,
          planDuration: plan?.duration,
          amount: `₱${membership.price_paid?.toLocaleString() || '0'}`,
          pricePaid: membership.price_paid,
          paymentStatus: membership.payment_status || 'pending',
          paymentMethod: membership.payment_method || 'Not specified',
          startDate: startDate,
          endDate: endDateFormatted,
          joinedDate: joinedDate,
          daysUntilExpiry,
          membershipStatus,
          avatarUrl,
          businessName: business?.name || 'Unknown Business',
          businessId: business?.id,
          businessEmoji: business?.emoji || '🏢'
        };
      }));

      setMembers(processedMembers);
      setFilteredMembers(processedMembers);

    } catch (error) {
      console.error('Error fetching members:', error);
      setError('Failed to load members: ' + error.message);
    }
  };

  const getMemberAvatarUrl = async (avatarPath, userId) => {
    if (!avatarPath) return null;
    
    // Check cache first
    if (memberAvatars[userId]) {
      return memberAvatars[userId];
    }

    try {
      // Try to get public URL first
      const { data: publicUrlData } = supabase
        .storage
        .from('avatars')
        .getPublicUrl(avatarPath);
      
      if (publicUrlData?.publicUrl) {
        // Test if the public URL is accessible
        try {
          const response = await fetch(publicUrlData.publicUrl, { method: 'HEAD' });
          if (response.ok) {
            setMemberAvatars(prev => ({ ...prev, [userId]: publicUrlData.publicUrl }));
            return publicUrlData.publicUrl;
          }
        } catch (e) {
          console.log('Public URL not accessible, trying download...');
        }
      }

      // Fallback to downloading the image
      const { data, error } = await supabase.storage
        .from('avatars')
        .download(avatarPath);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      setMemberAvatars(prev => ({ ...prev, [userId]: url }));
      return url;
    } catch (error) {
      console.error('Error getting member avatar:', error);
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

  const filterMembers = () => {
    let filtered = [...members];

    // Filter by business
    if (selectedBusiness !== 'all') {
      filtered = filtered.filter(member => member.businessId === selectedBusiness);
    }

    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(member => 
        member.name.toLowerCase().includes(term) ||
        member.email.toLowerCase().includes(term) ||
        member.plan.toLowerCase().includes(term) ||
        member.businessName.toLowerCase().includes(term)
      );
    }

    // Filter by membership status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(member => member.membershipStatus === statusFilter);
    }

    setFilteredMembers(filtered);
  };

  const handleSelectAll = () => {
    if (selectedMembers.length === filteredMembers.length) {
      setSelectedMembers([]);
    } else {
      setSelectedMembers(filteredMembers.map(m => m.membershipId));
    }
  };

  const handleSelectMember = (membershipId) => {
    if (selectedMembers.includes(membershipId)) {
      setSelectedMembers(selectedMembers.filter(id => id !== membershipId));
    } else {
      setSelectedMembers([...selectedMembers, membershipId]);
    }
  };

  // FIXED: Updated to use allowed notification types only
  const handleSendMessage = async () => {
    if (!messageSubject.trim() || !messageContent.trim()) {
      alert('Please enter both subject and message');
      return;
    }

    if (selectedMembers.length === 0) {
      alert('Please select at least one member');
      return;
    }

    setSendingMessage(true);

    try {
      // Get selected members' details
      const recipients = members.filter(m => selectedMembers.includes(m.membershipId));
      
      // Determine notification type - only use allowed types from the constraint
      // Allowed types: 'welcome', 'announcement', 'membership_approved', 'membership_rejected', 'promo'
      let notificationType = 'announcement'; // Default
      
      if (messageType === 'promo') {
        notificationType = 'promo';
      } else if (messageType === 'direct') {
        // For direct messages, use 'announcement' as it's the closest allowed type
        notificationType = 'announcement';
      }
      
      // Create notifications in database with correct column names
      const notifications = recipients.map(recipient => ({
        user_id: recipient.userId,
        type: notificationType, // Only using allowed types
        title: messageSubject,
        message: messageContent,
        business_id: recipient.businessId,
        is_read: false,
        created_at: new Date().toISOString(),
        // Store the original message type and sender info in data field
        data: {
          sender: 'owner',
          sender_name: profile ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() : 'Owner',
          sender_id: profile?.id,
          business_name: recipient.businessName,
          business_id: recipient.businessId,
          original_message_type: messageType, // Store original type for reference
          recipient_count: recipients.length
        }
      }));

      console.log('Sending notifications:', notifications);

      const { error } = await supabase
        .from('notifications')
        .insert(notifications);

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      setToastMessage(`Message sent to ${recipients.length} member(s) successfully!`);
      setShowSuccessToast(true);
      setTimeout(() => setShowSuccessToast(false), 3000);

      // Reset form
      setMessageSubject('');
      setMessageContent('');
      setSelectedMembers([]);
      setShowMessageModal(false);
      setMessageType('announcement');

    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message: ' + error.message);
    } finally {
      setSendingMessage(false);
    }
  };

  // FIXED: Updated to use 'cancelled' status (allowed value)
  const handleRemoveMember = async () => {
    if (!memberToRemove) return;

    try {
      // Update membership status to 'cancelled' (allowed value from constraint)
      const { error } = await supabase
        .from('memberships')
        .update({ 
          status: 'cancelled', // Changed from 'inactive' to 'cancelled'
          updated_at: new Date().toISOString()
        })
        .eq('id', memberToRemove.membershipId);

      if (error) throw error;

      // Create a notification for the removed member
      await supabase.from('notifications').insert({
        user_id: memberToRemove.userId,
        type: 'announcement', // Using allowed type
        title: 'Membership Cancelled',
        message: `Your membership at ${memberToRemove.businessName || 'the business'} has been cancelled. Please contact the business owner for more information.`,
        business_id: memberToRemove.businessId,
        data: {
          membership_id: memberToRemove.membershipId,
          status: 'cancelled',
          removed_at: new Date().toISOString(),
          business_name: memberToRemove.businessName
        },
        is_read: false,
        created_at: new Date().toISOString()
      });

      // Also create a notification for the owner (for record keeping)
      await supabase.from('notifications').insert({
        user_id: profile?.id,
        type: 'announcement',
        title: 'Member Removed',
        message: `${memberToRemove.name} has been removed from your members.`,
        business_id: memberToRemove.businessId,
        data: {
          membership_id: memberToRemove.membershipId,
          member_name: memberToRemove.name,
          member_email: memberToRemove.email,
          removed_at: new Date().toISOString()
        },
        is_read: false,
        created_at: new Date().toISOString()
      });

      // Remove from local state
      setMembers(members.filter(m => m.membershipId !== memberToRemove.membershipId));
      setFilteredMembers(filteredMembers.filter(m => m.membershipId !== memberToRemove.membershipId));
      
      setToastMessage(`${memberToRemove.name} has been removed from members`);
      setShowSuccessToast(true);
      setTimeout(() => setShowSuccessToast(false), 3000);

      setShowRemoveConfirm(false);
      setMemberToRemove(null);

    } catch (error) {
      console.error('Error removing member:', error);
      alert('Failed to remove member. Please try again.');
    }
  };

  const getInitials = (firstName, lastName) => {
    if (!firstName && !lastName) return '??';
    return `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}`.toUpperCase();
  };

  const getMembershipStatusBadge = (status) => {
    switch(status) {
      case 'active':
        return <span className="member-status-badge active">Active</span>;
      case 'expiring_soon':
        return <span className="member-status-badge expiring">Expiring Soon</span>;
      case 'expired':
        return <span className="member-status-badge expired">Expired</span>;
      default:
        return <span className="member-status-badge">{status}</span>;
    }
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

  if (loading) {
    return (
      <div className="member-management-loading">
        <div className="loading-spinner"></div>
        <p>Loading member management...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="member-management-error">
        <h2>Error</h2>
        <p>{error}</p>
        <button onClick={() => window.location.reload()} className="btn-error">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="member-management-container">
      <OwnerNavbar 
        profile={profile} 
        avatarUrl={avatarUrl}
      />

      <div className="content-wrapper">
        <main className="member-management-main">
          {/* Header */}
          <div className="member-management-header">
            <div className="header-left">
              <h2 className="page-title">
                Member Management
                <span className="title-glow"></span>
              </h2>
              <div className="header-decoration"></div>
            </div>
            <div className="header-right">
              <div className="member-count-badge">
                <span className="count-number">{filteredMembers.length}</span>
                <span className="count-label">Total Members</span>
              </div>
            </div>
          </div>

          {/* Success Toast */}
          {showSuccessToast && (
            <div className="success-toast">
              <span className="toast-icon">✅</span>
              <span className="toast-message">{toastMessage}</span>
            </div>
          )}

          {/* Action Bar */}
          <div className="action-bar">
            <div className="action-buttons">
              <button 
                className="action-btn send-message"
                onClick={() => setShowMessageModal(true)}
                disabled={selectedMembers.length === 0}
              >
                <span className="btn-icon">✉️</span>
                Send Message ({selectedMembers.length})
              </button>
            </div>
            <div className="filter-bar">
              <div className="search-box">
                <span className="search-icon">🔍</span>
                <input
                  type="text"
                  placeholder="Search members..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="search-input"
                />
              </div>
              <select 
                className="filter-select"
                value={selectedBusiness}
                onChange={(e) => setSelectedBusiness(e.target.value)}
              >
                <option value="all">All Businesses</option>
                {businesses.map(business => (
                  <option key={business.id} value={business.id}>
                    {business.emoji} {business.name}
                  </option>
                ))}
              </select>
              <select 
                className="filter-select"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="expiring_soon">Expiring Soon</option>
                <option value="expired">Expired</option>
              </select>
            </div>
          </div>

          {/* Members Table */}
          {filteredMembers.length > 0 ? (
            <div className="members-table-container">
              <table className="members-table">
                <thead>
                  <tr>
                    <th className="checkbox-col">
                      <input
                        type="checkbox"
                        checked={selectedMembers.length === filteredMembers.length && filteredMembers.length > 0}
                        onChange={handleSelectAll}
                        className="select-checkbox"
                      />
                    </th>
                    <th>Member</th>
                    <th>Business</th>
                    <th>Plan</th>
                    <th>Membership Period</th>
                    <th>Status</th>
                    <th>Payment</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMembers.map((member) => (
                    <tr key={member.membershipId} className={selectedMembers.includes(member.membershipId) ? 'selected' : ''}>
                      <td className="checkbox-col">
                        <input
                          type="checkbox"
                          checked={selectedMembers.includes(member.membershipId)}
                          onChange={() => handleSelectMember(member.membershipId)}
                          className="select-checkbox"
                        />
                      </td>
                      <td className="member-info-cell">
                        <div className="member-avatar-small">
                          {member.avatarUrl ? (
                            <img 
                              src={member.avatarUrl} 
                              alt={member.name}
                              onError={(e) => {
                                e.target.style.display = 'none';
                                e.target.parentNode.innerHTML = `<div class="avatar-placeholder-small">${getInitials(member.name.split(' ')[0], member.name.split(' ')[1])}</div>`;
                              }}
                            />
                          ) : (
                            <div className="avatar-placeholder-small">
                              {getInitials(member.name.split(' ')[0], member.name.split(' ')[1])}
                            </div>
                          )}
                        </div>
                        <div className="member-details">
                          <span className="member-name">{member.name}</span>
                          <span className="member-email">{member.email}</span>
                        </div>
                      </td>
                      <td>
                        <span className="business-badge">
                          {member.businessEmoji} {member.businessName}
                        </span>
                      </td>
                      <td>
                        <div className="plan-info">
                          <span className="plan-name">{member.plan}</span>
                          <span className="plan-price">{member.amount}</span>
                        </div>
                      </td>
                      <td>
                        <div className="membership-dates">
                          <span className="date-range">
                            {formatDate(member.startDate)} - {formatDate(member.endDate)}
                          </span>
                          {member.daysUntilExpiry > 0 && member.daysUntilExpiry <= 30 && (
                            <span className="expiry-warning">
                              {member.daysUntilExpiry} days left
                            </span>
                          )}
                        </div>
                      </td>
                      <td>
                        {getMembershipStatusBadge(member.membershipStatus)}
                      </td>
                      <td>
                        <span className={`payment-status-badge ${member.paymentStatus}`}>
                          {member.paymentStatus === 'paid' ? '✓' : '⏳'} {member.paymentStatus}
                        </span>
                      </td>
                      <td>
                        <div className="action-buttons-cell">
                          <button 
                            className="table-action-btn view"
                            onClick={() => navigate(`/member/${member.userId}`)}
                            title="View Profile"
                          >
                            👤
                          </button>
                          <button 
                            className="table-action-btn message"
                            onClick={() => {
                              setSelectedMembers([member.membershipId]);
                              setShowMessageModal(true);
                            }}
                            title="Send Message"
                          >
                            ✉️
                          </button>
                          <button 
                            className="table-action-btn remove"
                            onClick={() => {
                              setMemberToRemove(member);
                              setShowRemoveConfirm(true);
                            }}
                            title="Remove Member"
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-icon">👥</div>
              <h3>No Members Found</h3>
              <p>There are no active members matching your criteria</p>
              {businesses.length === 0 && (
                <p className="empty-subtext">You don't have any businesses yet. Create a business to start adding members.</p>
              )}
            </div>
          )}

          {/* Send Message Modal */}
          {showMessageModal && (
            <div className="modal-overlay">
              <div className="modal-content message-modal">
                <div className="modal-header">
                  <h3>Send Message to Members</h3>
                  <button 
                    className="close-modal"
                    onClick={() => setShowMessageModal(false)}
                  >
                    ×
                  </button>
                </div>
                <div className="modal-body">
                  <div className="recipient-info">
                    <span className="recipient-count">
                      Sending to: <strong>{selectedMembers.length} member(s)</strong>
                    </span>
                  </div>
                  
                  <div className="form-group">
                    <label>Message Type</label>
                    <div className="message-type-selector">
                      <label className="radio-label">
                        <input
                          type="radio"
                          name="messageType"
                          value="announcement"
                          checked={messageType === 'announcement'}
                          onChange={(e) => setMessageType(e.target.value)}
                        />
                        <span className="radio-custom"></span>
                        Announcement (General announcement for all members)
                      </label>
                      <label className="radio-label">
                        <input
                          type="radio"
                          name="messageType"
                          value="promo"
                          checked={messageType === 'promo'}
                          onChange={(e) => setMessageType(e.target.value)}
                        />
                        <span className="radio-custom"></span>
                        Promo (Special offers and promotions)
                      </label>
                      <label className="radio-label">
                        <input
                          type="radio"
                          name="messageType"
                          value="direct"
                          checked={messageType === 'direct'}
                          onChange={(e) => setMessageType(e.target.value)}
                        />
                        <span className="radio-custom"></span>
                        Direct Message (Personal communication)
                      </label>
                    </div>
                    <small className="form-hint">
                      Note: Direct messages will be sent as announcements to comply with notification settings
                    </small>
                  </div>

                  <div className="form-group">
                    <label>Subject</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Enter message subject..."
                      value={messageSubject}
                      onChange={(e) => setMessageSubject(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label>Message</label>
                    <textarea
                      className="form-textarea"
                      placeholder="Type your message here..."
                      rows="6"
                      value={messageContent}
                      onChange={(e) => setMessageContent(e.target.value)}
                    ></textarea>
                  </div>
                </div>
                <div className="modal-footer">
                  <button 
                    className="btn-cancel"
                    onClick={() => setShowMessageModal(false)}
                  >
                    Cancel
                  </button>
                  <button 
                    className="btn-send"
                    onClick={handleSendMessage}
                    disabled={sendingMessage}
                  >
                    {sendingMessage ? 'Sending...' : 'Send Message'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Remove Confirmation Modal */}
          {showRemoveConfirm && memberToRemove && (
            <div className="modal-overlay">
              <div className="modal-content confirm-modal">
                <div className="modal-header">
                  <h3>Remove Member</h3>
                  <button 
                    className="close-modal"
                    onClick={() => setShowRemoveConfirm(false)}
                  >
                    ×
                  </button>
                </div>
                <div className="modal-body">
                  <div className="warning-icon">⚠️</div>
                  <p className="confirm-message">
                    Are you sure you want to remove <strong>{memberToRemove.name}</strong> from your members?
                  </p>
                  <p className="confirm-submessage">
                    This will mark their membership as cancelled. The member will be notified of this change.
                  </p>
                </div>
                <div className="modal-footer">
                  <button 
                    className="btn-cancel"
                    onClick={() => setShowRemoveConfirm(false)}
                  >
                    Cancel
                  </button>
                  <button 
                    className="btn-remove"
                    onClick={handleRemoveMember}
                  >
                    Remove Member
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default OwnerMemberManagement;