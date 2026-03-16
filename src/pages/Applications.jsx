import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import OwnerNavbar from '../components/owner/OwnerNavbar';
import '../styles/Applications.css';

const Applications = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState({});
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [clientAvatars, setClientAvatars] = useState({});
  const [filter, setFilter] = useState('pending');
  const [expandedCard, setExpandedCard] = useState(null);
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);

  useEffect(() => {
    fetchUserProfile();
    fetchApplications();
  }, []);

  useEffect(() => {
    fetchApplications();
  }, [filter]);

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

  const getReceiptUrl = async (membership) => {
    let receiptPath = membership.receipt_path;
    
    if (!receiptPath && membership.payments && membership.payments.length > 0) {
      const payment = membership.payments[0];
      receiptPath = payment.receipt_path;
    }

    if (!receiptPath) return null;

    try {
      const { data: publicUrlData } = supabase
        .storage
        .from('payment-receipts')
        .getPublicUrl(receiptPath);
      
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
        .from('payment-receipts')
        .download(receiptPath);

      if (error) throw error;

      return URL.createObjectURL(data);
    } catch (error) {
      console.error('Error getting receipt URL:', error);
      return null;
    }
  };

  const fetchApplications = async () => {
    try {
      setLoading(true);
      
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError) throw userError;
      
      if (!user) {
        navigate('/login');
        return;
      }

      const { data: businessesData, error: businessesError } = await supabase
        .from('businesses')
        .select('id, verification_status')
        .eq('owner_id', user.id);

      if (businessesError) throw businessesError;

      if (!businessesData || businessesData.length === 0) {
        setApplications([]);
        setLoading(false);
        return;
      }

      const businessIds = businessesData.map(b => b.id);
      
      const businessVerificationMap = {};
      businessesData.forEach(b => {
        businessVerificationMap[b.id] = b.verification_status;
      });

      let query = supabase
        .from('memberships')
        .select(`
          *,
          applicant:user_id (
            id,
            first_name,
            last_name,
            email,
            mobile,
            avatar_url
          ),
          plan:plan_id (
            id,
            name,
            price,
            duration,
            features
          ),
          business:business_id (
            id,
            name,
            business_type,
            address,
            location,
            owner_id,
            verification_status
          ),
          payments:payments (
            id,
            amount,
            payment_method,
            payment_status,
            gcash_reference,
            gcash_number,
            receipt_path,
            receipt_public_url,
            created_at,
            verified_at
          )
        `)
        .in('business_id', businessIds)
        .order('created_at', { ascending: false });

      if (filter !== 'all') {
        query = query.eq('status', filter);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Query error:', error);
        throw error;
      }

      const processedData = await Promise.all((data || []).map(async (app) => {
        let receiptUrl = null;
        let clientAvatarUrl = null;
        
        if (app.payment_method?.toLowerCase() === 'gcash') {
          receiptUrl = await getReceiptUrl(app);
        }
        
        if (app.applicant?.avatar_url) {
          clientAvatarUrl = await getClientAvatarUrl(app.applicant.avatar_url, app.applicant.id);
        }
        
        const businessVerification = app.business?.verification_status || businessVerificationMap[app.business_id] || 'pending';
        
        return {
          ...app,
          receipt_url_display: receiptUrl,
          client_avatar_display: clientAvatarUrl,
          business_verification: businessVerification
        };
      }));

      setApplications(processedData || []);
    } catch (err) {
      console.error('Error fetching applications:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (membershipId) => {
    try {
      setProcessing(prev => ({ ...prev, [membershipId]: true }));
      
      const { error } = await supabase
        .from('memberships')
        .update({ 
          status: 'approved',
          payment_status: 'paid',
          reviewed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', membershipId);

      if (error) throw error;

      setSuccessMessage('Application approved successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
      fetchApplications();
    } catch (err) {
      console.error('Error approving application:', err);
      setError(err.message);
    } finally {
      setProcessing(prev => ({ ...prev, [membershipId]: false }));
    }
  };

  const handleReject = async (membershipId) => {
    try {
      setProcessing(prev => ({ ...prev, [membershipId]: true }));
      
      const { error } = await supabase
        .from('memberships')
        .update({ 
          status: 'rejected',
          reviewed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', membershipId);

      if (error) throw error;

      setSuccessMessage('Application rejected successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
      fetchApplications();
    } catch (err) {
      console.error('Error rejecting application:', err);
      setError(err.message);
    } finally {
      setProcessing(prev => ({ ...prev, [membershipId]: false }));
    }
  };

  const handleVerifyPayment = async (membershipId) => {
    try {
      setProcessing(prev => ({ ...prev, [membershipId]: true }));
      
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('memberships')
        .update({ 
          payment_status: 'paid',
          payment_verified_at: new Date().toISOString(),
          verified_by: user.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', membershipId);

      if (error) throw error;

      setSuccessMessage('Payment verified successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
      fetchApplications();
    } catch (err) {
      console.error('Error verifying payment:', err);
      setError(err.message);
    } finally {
      setProcessing(prev => ({ ...prev, [membershipId]: false }));
    }
  };

  const viewReceipt = (receiptUrl) => {
    setSelectedReceipt(receiptUrl);
    setShowReceiptModal(true);
  };

  const toggleExpand = (id) => {
    setExpandedCard(expandedCard === id ? null : id);
  };

  const getFirstName = () => {
    if (profile?.first_name) {
      return profile.first_name;
    }
    return 'Owner';
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getInitials = (firstName, lastName) => {
    return `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}`.toUpperCase();
  };

  const getPaymentStatusBadge = (status) => {
    switch(status?.toLowerCase()) {
      case 'paid':
        return <span className="payment-badge paid">✓ Paid</span>;
      case 'pending':
        return <span className="payment-badge pending">⏳ Pending</span>;
      case 'failed':
        return <span className="payment-badge failed">✗ Failed</span>;
      case 'refunded':
        return <span className="payment-badge refunded">↩ Refunded</span>;
      default:
        return <span className="payment-badge">{status || 'pending'}</span>;
    }
  };

  if (loading) {
    return (
      <div className="applications-loading">
        <div className="loading-spinner"></div>
        <p>Loading applications...</p>
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

      <div className="applications-wrapper">
        <div className="mobile-welcome">
          <p>Welcome, {profile?.first_name || 'Owner'}!</p>
        </div>

        <main className="applications-main-full">
          <div className="applications-header">
            <div className="header-left">
              <h2 className="page-title">
                Membership Applications
                <span className="title-glow"></span>
              </h2>
              <div className="header-decoration"></div>
            </div>
            <div className="header-right">
              <div className="user-greeting">
                <span className="greeting-wave">👋</span>
                <span className="greeting-text">Reviewing,</span>
                <span className="greeting-name">{firstName}</span>
              </div>
            </div>
          </div>

          <div className="applications-filter-tabs">
            <button
              className={`filter-tab ${filter === 'all' ? 'active' : ''}`}
              onClick={() => setFilter('all')}
            >
              <span className="filter-label">All</span>
              <span className="filter-count">
                {applications.length}
              </span>
            </button>
            <button
              className={`filter-tab ${filter === 'pending' ? 'active' : ''}`}
              onClick={() => setFilter('pending')}
            >
              <span className="filter-label">Pending</span>
              <span className="filter-count">
                {applications.filter(a => a.status === 'pending').length}
              </span>
            </button>
            <button
              className={`filter-tab ${filter === 'approved' ? 'active' : ''}`}
              onClick={() => setFilter('approved')}
            >
              <span className="filter-label">Approved</span>
              <span className="filter-count">
                {applications.filter(a => a.status === 'approved').length}
              </span>
            </button>
            <button
              className={`filter-tab ${filter === 'rejected' ? 'active' : ''}`}
              onClick={() => setFilter('rejected')}
            >
              <span className="filter-label">Rejected</span>
              <span className="filter-count">
                {applications.filter(a => a.status === 'rejected').length}
              </span>
            </button>
          </div>

          {error && (
            <div className="applications-error-message">
              {error}
            </div>
          )}

          {successMessage && (
            <div className="applications-success-message">
              {successMessage}
            </div>
          )}

          {applications.length > 0 ? (
            <div className="applications-list">
              {applications.map((app) => {
                const hasReceipt = app.receipt_url_display;
                const isGcash = app.payment_method?.toLowerCase() === 'gcash';
                const isVerified = ['paid'].includes(app.payment_status?.toLowerCase());
                
                return (
                  <div 
                    key={app.id} 
                    className={`application-card-enhanced ${expandedCard === app.id ? 'expanded' : ''}`}
                  >
                    <div className="application-card-header-enhanced">
                      <div className="applicant-profile">
                        <div className="applicant-avatar-large">
                          {app.client_avatar_display ? (
                            <img 
                              src={app.client_avatar_display} 
                              alt={`${app.applicant?.first_name} ${app.applicant?.last_name}`}
                              onError={(e) => {
                                console.error('Error loading client avatar');
                                e.target.style.display = 'none';
                                e.target.parentNode.innerHTML = `<div class="avatar-placeholder">${getInitials(app.applicant?.first_name, app.applicant?.last_name)}</div>`;
                              }}
                            />
                          ) : (
                            <div className="avatar-placeholder">
                              {getInitials(app.applicant?.first_name, app.applicant?.last_name)}
                            </div>
                          )}
                        </div>
                        <div className="applicant-details">
                          <h3 className="applicant-name">
                            {app.applicant?.first_name} {app.applicant?.last_name}
                          </h3>
                          <div className="applicant-contact">
                            <span className="contact-item">
                              <span className="contact-icon">✉️</span>
                              {app.applicant?.email}
                            </span>
                            {app.applicant?.mobile && (
                              <span className="contact-item">
                                <span className="contact-icon">📱</span>
                                {app.applicant.mobile}
                              </span>
                            )}
                          </div>
                          
                          <div className="business-verification-badge-container">
                            {app.business_verification === 'pending' && (
                              <div className="verification-badge pending">
                                <span className="badge-icon">⏳</span>
                                <span className="badge-text">Business Pending Verification</span>
                              </div>
                            )}
                            {app.business_verification === 'approved' && (
                              <div className="verification-badge approved">
                                <span className="badge-icon">✅</span>
                                <span className="badge-text">Business Verified</span>
                              </div>
                            )}
                            {app.business_verification === 'rejected' && (
                              <div className="verification-badge rejected">
                                <span className="badge-icon">❌</span>
                                <span className="badge-text">Business Rejected</span>
                              </div>
                            )}
                          </div>
                          
                        </div>
                      </div>
                      
                      <div className="application-meta">
                        <div className={`status-badge-large ${app.status}`}>
                          <span className="status-icon">
                            {app.status === 'pending' && '⏳'}
                            {app.status === 'approved' && '✅'}
                            {app.status === 'rejected' && '❌'}
                          </span>
                          <span className="status-text">{app.status}</span>
                        </div>
                        {isGcash && app.payment_status === 'pending' && hasReceipt && (
                          <div className="payment-alert-badge">
                            <span className="alert-icon">💰</span>
                            <span className="alert-text">Receipt uploaded</span>
                          </div>
                        )}
                        {isGcash && isVerified && (
                          <div className="payment-verified-badge">
                            <span className="verified-icon">✓</span>
                            <span className="verified-text">Payment verified</span>
                          </div>
                        )}
                        <button 
                          className="expand-btn"
                          onClick={() => toggleExpand(app.id)}
                        >
                          {expandedCard === app.id ? '▲' : '▼'}
                        </button>
                      </div>
                    </div>

                    <div className="application-preview">
                      <div className="preview-item">
                        <span className="preview-label">Business</span>
                        <span className="preview-value">{app.business?.name}</span>
                      </div>
                      <div className="preview-item">
                        <span className="preview-label">Plan</span>
                        <span className="preview-value">{app.plan?.name}</span>
                      </div>
                      <div className="preview-item">
                        <span className="preview-label">Price</span>
                        <span className="preview-value price">₱{app.price_paid?.toLocaleString()}/{app.plan?.duration}</span>
                      </div>
                      <div className="preview-item">
                        <span className="preview-label">Applied</span>
                        <span className="preview-value">{formatDate(app.created_at)}</span>
                      </div>
                    </div>

                    {expandedCard === app.id && (
                      <div className="application-expanded">
                        <div className="expanded-section">
                          <h4 className="section-title-small">Plan Details</h4>
                          <div className="plan-details-grid">
                            <div className="plan-detail-item">
                              <span className="detail-label">Plan Name</span>
                              <span className="detail-value">{app.plan?.name}</span>
                            </div>
                            <div className="plan-detail-item">
                              <span className="detail-label">Price</span>
                              <span className="detail-value">₱{app.price_paid?.toLocaleString()}/{app.plan?.duration}</span>
                            </div>
                            <div className="plan-detail-item">
                              <span className="detail-label">Duration</span>
                              <span className="detail-value capitalize">{app.plan?.duration}</span>
                            </div>
                          </div>

                          {app.plan?.features && app.plan.features.length > 0 && (
                            <div className="features-section">
                              <h5 className="features-title">Features</h5>
                              <div className="features-grid">
                                {app.plan.features.map((feature, idx) => (
                                  <div key={idx} className="feature-item">
                                    <span className="feature-check">✓</span>
                                    <span className="feature-text">{feature}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="expanded-section">
                          <h4 className="section-title-small">Application Timeline</h4>
                          <div className="timeline">
                            <div className="timeline-item">
                              <div className="timeline-icon">📅</div>
                              <div className="timeline-content">
                                <span className="timeline-label">Applied On</span>
                                <span className="timeline-date">{formatDate(app.created_at)}</span>
                              </div>
                            </div>
                            <div className="timeline-item">
                              <div className="timeline-icon">💰</div>
                              <div className="timeline-content">
                                <span className="timeline-label">Payment Method</span>
                                <span className="timeline-date capitalize">{app.payment_method}</span>
                              </div>
                            </div>
                            {app.payment_verified_at && (
                              <div className="timeline-item">
                                <div className="timeline-icon">✓</div>
                                <div className="timeline-content">
                                  <span className="timeline-label">Payment Verified</span>
                                  <span className="timeline-date">{formatDate(app.payment_verified_at)}</span>
                                </div>
                              </div>
                            )}
                            {app.reviewed_at && (
                              <div className="timeline-item">
                                <div className="timeline-icon">📋</div>
                                <div className="timeline-content">
                                  <span className="timeline-label">Reviewed On</span>
                                  <span className="timeline-date">{formatDate(app.reviewed_at)}</span>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        {isGcash && (
                          <div className="expanded-section receipt-section">
                            <h4 className="section-title-small">
                              <span className="receipt-title-icon">🧾</span>
                              Payment Receipt
                            </h4>
                            
                            {hasReceipt ? (
                              <div className="receipt-viewer">
                                <div className="receipt-image-container">
                                  <img 
                                    src={app.receipt_url_display} 
                                    alt="Payment Receipt"
                                    className="receipt-main-image"
                                    onClick={() => viewReceipt(app.receipt_url_display)}
                                    onError={(e) => {
                                      console.error('Error loading receipt image');
                                      e.target.style.display = 'none';
                                    }}
                                  />
                                  <button 
                                    className="btn-enlarge-receipt"
                                    onClick={() => viewReceipt(app.receipt_url_display)}
                                  >
                                    <span className="enlarge-icon">🔍</span>
                                    Click to enlarge
                                  </button>
                                </div>
                                
                                {app.payments && app.payments.length > 0 && (
                                  <div className="receipt-details">
                                    <h5>Payment Information</h5>
                                    <div className="receipt-info-grid">
                                      <div className="receipt-info-item">
                                        <span className="info-label">Amount:</span>
                                        <span className="info-value">₱{app.payments[0].amount?.toLocaleString() || app.price_paid?.toLocaleString()}</span>
                                      </div>
                                      <div className="receipt-info-item">
                                        <span className="info-label">Reference:</span>
                                        <span className="info-value">{app.payments[0].gcash_reference || 'Not provided'}</span>
                                      </div>
                                      <div className="receipt-info-item">
                                        <span className="info-label">GCash Number:</span>
                                        <span className="info-value">{app.payments[0].gcash_number || 'Not provided'}</span>
                                      </div>
                                      <div className="receipt-info-item">
                                        <span className="info-label">Uploaded:</span>
                                        <span className="info-value">{formatDate(app.payments[0].created_at)}</span>
                                      </div>
                                    </div>
                                  </div>
                                )}

                                {app.status === 'pending' && app.payment_status === 'pending' && (
                                  <div className="receipt-actions">
                                    <button
                                      className="btn-verify-receipt"
                                      onClick={() => handleVerifyPayment(app.id)}
                                      disabled={processing[app.id]}
                                    >
                                      {processing[app.id] ? (
                                        <>
                                          <span className="spinner-small"></span>
                                          Verifying...
                                        </>
                                      ) : (
                                        <>
                                          <span className="btn-icon">✓</span>
                                          Verify Payment
                                        </>
                                      )}
                                    </button>
                                  </div>
                                )}

                                {isVerified && (
                                  <div className="verification-badge">
                                    <span className="badge-icon">✅</span>
                                    <span className="badge-text">Payment Verified - Ready for approval</span>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="no-receipt-message">
                                <span className="message-icon">⚠️</span>
                                <p>No receipt uploaded for this GCash payment</p>
                                {process.env.NODE_ENV === 'development' && (
                                  <small className="debug-info">
                                    Payment method: {app.payment_method}, 
                                    Status: {app.payment_status}
                                  </small>
                                )}
                              </div>
                            )}
                          </div>
                        )}

                        {app.payment_method?.toLowerCase() === 'onsite' && (
                          <div className="expanded-section onsite-section">
                            <h4 className="section-title-small">
                              <span className="onsite-title-icon">🏪</span>
                              Onsite Payment
                            </h4>
                            
                            <div className="onsite-instructions">
                              <div className="instruction-card">
                                <span className="instruction-icon">📍</span>
                                <div className="instruction-content">
                                  <h5>Business Location</h5>
                                  <p>{app.business?.address || app.business?.location || 'Address not provided'}</p>
                                </div>
                              </div>
                              
                              <div className="instruction-card">
                                <span className="instruction-icon">💰</span>
                                <div className="instruction-content">
                                  <h5>Payment Amount</h5>
                                  <p className="amount">₱{app.price_paid?.toLocaleString()}</p>
                                </div>
                              </div>

                              <div className="instruction-note">
                                <p>Customer will pay at the business premises. No receipt upload required.</p>
                              </div>

                              {app.status === 'pending' && app.payment_status === 'pending' && (
                                <div className="onsite-actions">
                                  <button
                                    className="btn-mark-paid"
                                    onClick={() => handleVerifyPayment(app.id)}
                                    disabled={processing[app.id]}
                                  >
                                    {processing[app.id] ? (
                                      <>
                                        <span className="spinner-small"></span>
                                        Processing...
                                      </>
                                    ) : (
                                      <>
                                        <span className="btn-icon">💰</span>
                                        Mark as Paid
                                      </>
                                    )}
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {app.status === 'pending' && (
                      <div className="application-card-actions-enhanced">
                        <button
                          className="btn-approve-enhanced"
                          onClick={() => handleApprove(app.id)}
                          disabled={processing[app.id] || (isGcash && !isVerified) || app.business_verification === 'pending'}
                        >
                          {processing[app.id] ? (
                            <>
                              <span className="spinner-small"></span>
                              Processing...
                            </>
                          ) : (
                            <>
                              <span className="btn-icon">✓</span>
                              {app.business_verification === 'pending' 
                                ? 'Business Not Verified' 
                                : (isGcash && !isVerified) 
                                  ? 'Verify Payment First' 
                                  : 'Approve Application'}
                            </>
                          )}
                        </button>
                        <button
                          className="btn-reject-enhanced"
                          onClick={() => handleReject(app.id)}
                          disabled={processing[app.id]}
                        >
                          {processing[app.id] ? (
                            <>
                              <span className="spinner-small"></span>
                              Processing...
                            </>
                          ) : (
                              <>
                                <span className="btn-icon">✗</span>
                                Reject Application
                              </>
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="no-applications-state-enhanced">
                <div className="no-applications-icon">📋</div>
                <h3>No Applications Found</h3>
                <p>There are no {filter !== 'all' ? filter : ''} applications to display.</p>
                {filter !== 'pending' && (
                  <button 
                    className="btn-view-pending-enhanced"
                    onClick={() => setFilter('pending')}
                  >
                    View Pending Applications
                  </button>
                )}
              </div>
            )}
          </main>
        </div>

        {showReceiptModal && selectedReceipt && (
          <div className="receipt-modal-overlay" onClick={() => setShowReceiptModal(false)}>
            <div className="receipt-modal" onClick={(e) => e.stopPropagation()}>
              <div className="receipt-modal-header">
                <h3>Payment Receipt</h3>
                <button className="modal-close" onClick={() => setShowReceiptModal(false)}>×</button>
              </div>
              <div className="receipt-modal-content">
                <img 
                  src={selectedReceipt} 
                  alt="Payment Receipt Full View"
                  className="receipt-full-image"
                />
              </div>
              <div className="receipt-modal-footer">
                <a 
                  href={selectedReceipt} 
                  download="payment-receipt.jpg"
                  className="btn-download-receipt"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Download Receipt
                </a>
                <button 
                  className="modal-btn-close"
                  onClick={() => setShowReceiptModal(false)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
  );
};

export default Applications;