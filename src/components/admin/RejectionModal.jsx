import React, { useState } from 'react';
import './RejectionModal.css';

const RejectionModal = ({ isOpen, onClose, onConfirm, ownerName, businessName }) => {
  const [reason, setReason] = useState('');
  const [otherReason, setOtherReason] = useState('');
  const [selectedReason, setSelectedReason] = useState('');

  const rejectionReasons = [
    'Incomplete business information',
    'Invalid business documents',
    'Business type not supported',
    'Duplicate application',
    'Suspicious activity',
    'Other'
  ];

  const handleReasonSelect = (e) => {
    setSelectedReason(e.target.value);
    if (e.target.value !== 'Other') {
      setReason(e.target.value);
      setOtherReason('');
    } else {
      setReason('');
    }
  };

  const handleOtherReasonChange = (e) => {
    setOtherReason(e.target.value);
    setReason(e.target.value);
  };

  const handleSubmit = () => {
    if (selectedReason === 'Other' && !otherReason.trim()) {
      alert('Please provide a reason for rejection');
      return;
    }
    if (!selectedReason) {
      alert('Please select a reason for rejection');
      return;
    }
    onConfirm(reason || selectedReason);
  };

  const handleClose = () => {
    setReason('');
    setOtherReason('');
    setSelectedReason('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="rejection-modal-overlay">
      <div className="rejection-modal">
        <div className="rejection-modal-header">
          <h3>Reject Application</h3>
          <button className="close-btn" onClick={handleClose}>×</button>
        </div>
        
        <div className="rejection-modal-body">
          <div className="applicant-info">
            <p>
              <strong>Owner:</strong> {ownerName}
            </p>
            <p>
              <strong>Business:</strong> {businessName}
            </p>
          </div>
          
          <div className="form-group">
            <label htmlFor="rejection-reason">Reason for Rejection</label>
            <select
              id="rejection-reason"
              value={selectedReason}
              onChange={handleReasonSelect}
              className="reason-select"
            >
              <option value="">Select a reason</option>
              {rejectionReasons.map((reason, index) => (
                <option key={index} value={reason}>
                  {reason}
                </option>
              ))}
            </select>
          </div>

          {selectedReason === 'Other' && (
            <div className="form-group">
              <label htmlFor="other-reason">Please specify</label>
              <textarea
                id="other-reason"
                value={otherReason}
                onChange={handleOtherReasonChange}
                placeholder="Enter reason for rejection..."
                rows="4"
                className="reason-textarea"
                autoFocus
              />
            </div>
          )}
        </div>

        <div className="rejection-modal-footer">
          <button onClick={handleClose} className="btn-cancel">
            Cancel
          </button>
          <button onClick={handleSubmit} className="btn-reject">
            Reject Application
          </button>
        </div>
      </div>
    </div>
  );
};

export default RejectionModal;