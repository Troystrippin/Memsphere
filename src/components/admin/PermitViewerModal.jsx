import React from 'react';
import { supabase } from '../../lib/supabase';
import './PermitViewerModal.css';

const PermitViewerModal = ({ isOpen, onClose, business }) => {
  if (!isOpen || !business) return null;

  const getPermitUrl = () => {
    if (!business.permit_document) return null;
    const { data } = supabase.storage
      .from('business-permits')
      .getPublicUrl(business.permit_document);
    return data.publicUrl;
  };

  const permitUrl = getPermitUrl();

  const isImage = (url) => {
    return url?.match(/\.(jpg|jpeg|png|gif|webp)$/i);
  };

  return (
    <div className="permit-modal-overlay" onClick={onClose}>
      <div className="permit-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="permit-modal-header">
          <h2>Business Permit - {business.name}</h2>
          <button className="permit-modal-close" onClick={onClose}>×</button>
        </div>
        
        <div className="permit-modal-body">
          <div className="permit-info">
            <p><strong>Permit Number:</strong> {business.permit_number || 'N/A'}</p>
            <p><strong>Expiry Date:</strong> {business.permit_expiry ? new Date(business.permit_expiry).toLocaleDateString() : 'N/A'}</p>
            <p><strong>Status:</strong> 
              <span className={`permit-status-badge ${business.permit_verified ? 'verified' : 'pending'}`}>
                {business.permit_verified ? '✅ Verified' : '⏳ Pending Verification'}
              </span>
            </p>
          </div>
          
          <div className="permit-document-viewer">
            {permitUrl ? (
              isImage(permitUrl) ? (
                <img 
                  src={permitUrl} 
                  alt="Business Permit" 
                  className="permit-image"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = 'https://via.placeholder.com/400x300?text=Image+not+found';
                  }}
                />
              ) : (
                <iframe
                  src={permitUrl}
                  title="Business Permit"
                  className="permit-pdf"
                  width="100%"
                  height="600px"
                />
              )
            ) : (
              <div className="no-permit-message">
                <span className="no-permit-icon">📄</span>
                <p>No permit document uploaded</p>
              </div>
            )}
          </div>
        </div>
        
        <div className="permit-modal-footer">
          {permitUrl && (
            <a 
              href={permitUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="btn-download"
            >
              📥 Download Permit
            </a>
          )}
          <button className="btn-close" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default PermitViewerModal;