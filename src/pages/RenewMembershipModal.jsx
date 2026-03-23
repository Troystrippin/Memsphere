// src/components/client/RenewMembershipModal.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from "../lib/supabase";
import { X, CreditCard, AlertCircle, CheckCircle, Upload, Trash2, RefreshCw, MapPin, Phone, Mail, Clock, Crown } from 'lucide-react';

const RenewMembershipModal = ({ isOpen, onClose, membershipId, businessId, businessName, planName: propPlanName, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [expiringMembership, setExpiringMembership] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('');
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  const [receiptFile, setReceiptFile] = useState(null);
  const [receiptPreview, setReceiptPreview] = useState(null);
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [gcashQrUrl, setGcashQrUrl] = useState('');
  const [showPaymentInfo, setShowPaymentInfo] = useState(false);
  const [profile, setProfile] = useState(null);
  const [businessDetails, setBusinessDetails] = useState(null);

  useEffect(() => {
    if (isOpen && membershipId) {
      fetchExpiringMembership();
      fetchUserProfile();
      fetchBusinessDetails();
    }
  }, [isOpen, membershipId]);

  // Fetch business details when businessId changes
  useEffect(() => {
    if (isOpen && businessId) {
      fetchBusinessDetails();
    }
  }, [isOpen, businessId]);

  const fetchExpiringMembership = async () => {
    try {
      setLoading(true);
      // Fetch the specific membership that is expiring/expired
      const { data: membership, error } = await supabase
        .from('memberships')
        .select(`
          *,
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
            owner_name,
            emoji
          )
        `)
        .eq('id', membershipId)
        .single();

      if (error) throw error;
      
      setExpiringMembership(membership);
      
      // Set the plan from the expiring membership (this is the only plan they can renew with)
      if (membership.plan) {
        setSelectedPlan(membership.plan);
      }
      
    } catch (error) {
      console.error('Error fetching expiring membership:', error);
      setError('Failed to load membership details');
    } finally {
      setLoading(false);
    }
  };

  const fetchUserProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('first_name, last_name, email, mobile')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      setProfile(profile);
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const fetchBusinessDetails = async () => {
    try {
      const { data, error } = await supabase
        .from('businesses')
        .select('name, address, location, city, province, gcash_qr_code, contact_phone, contact_email')
        .eq('id', businessId)
        .single();

      if (error) throw error;
      setBusinessDetails(data);

      if (data?.gcash_qr_code) {
        downloadGcashQrCode(data.gcash_qr_code);
      }
    } catch (error) {
      console.error('Error fetching business details:', error);
    }
  };

  const downloadGcashQrCode = async (path) => {
    try {
      const { data, error } = await supabase.storage
        .from('gcash-qr-codes')
        .download(path);

      if (error) throw error;
      const url = URL.createObjectURL(data);
      setGcashQrUrl(url);
    } catch (error) {
      console.error('Error downloading GCash QR code:', error);
    }
  };

  const handleReceiptUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file (PNG, JPG, JPEG)');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('File size must be less than 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setReceiptFile(file);
      setReceiptPreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const removeReceipt = () => {
    setReceiptFile(null);
    setReceiptPreview(null);
  };

  const handleRenew = async () => {
    if (!selectedPlan) {
      setError('Please select a plan');
      return;
    }

    if (!paymentMethod) {
      setError('Please select a payment method');
      return;
    }

    if (paymentMethod === 'gcash' && !receiptFile) {
      setError('Please upload your GCash payment receipt');
      return;
    }

    if (!agreeToTerms) {
      setError('Please agree to the terms and conditions');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      let receiptPath = null;
      if (paymentMethod === 'gcash' && receiptFile) {
        const fileExt = receiptFile.name.split('.').pop();
        const fileName = `${user.id}/receipt-renewal-${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('payment-receipts')
          .upload(fileName, receiptFile);

        if (uploadError) throw uploadError;
        receiptPath = fileName;
      }

      // Calculate end date based on plan duration
      const endDate = new Date();
      switch (selectedPlan.duration) {
        case 'month':
        case 'monthly':
          endDate.setMonth(endDate.getMonth() + 1);
          break;
        case 'year':
        case 'yearly':
          endDate.setFullYear(endDate.getFullYear() + 1);
          break;
        case 'week':
          endDate.setDate(endDate.getDate() + 7);
          break;
        case 'day':
          endDate.setDate(endDate.getDate() + 1);
          break;
        default:
          endDate.setMonth(endDate.getMonth() + 1);
      }

      const membershipData = {
        user_id: user.id,
        business_id: businessId,
        plan_id: selectedPlan.id,
        price_paid: selectedPlan.price,
        status: 'pending',
        start_date: new Date().toISOString(),
        end_date: endDate.toISOString(),
        payment_status: 'pending',
        payment_method: paymentMethod,
        receipt_path: receiptPath,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data: newMembership, error: membershipError } = await supabase
        .from('memberships')
        .insert([membershipData])
        .select();

      if (membershipError) throw membershipError;

      // Get business owner
      const { data: business } = await supabase
        .from('businesses')
        .select('owner_id')
        .eq('id', businessId)
        .single();

      // Create notification for owner
      if (business?.owner_id) {
        const applicantName = `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() || user.email;

        await supabase
          .from('notifications')
          .insert({
            user_id: business.owner_id,
            business_id: businessId,
            type: 'application_received',
            title: '📋 Renewal Application Received',
            message: `${applicantName} has submitted a renewal application for ${businessName || expiringMembership?.business?.name}`,
            data: {
              membership_id: newMembership[0]?.id,
              business_id: businessId,
              applicant_name: applicantName,
              plan_name: selectedPlan.name,
              amount: selectedPlan.price,
              status: 'pending',
              type: 'renewal',
              original_membership_id: membershipId
            },
            is_read: false
          });
      }

      setSuccess(true);
      setTimeout(() => {
        if (onSuccess) onSuccess();
        onClose();
      }, 2000);

    } catch (error) {
      console.error('Error renewing membership:', error);
      setError(error.message || 'Failed to renew membership. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  // Determine if the membership is expired or expiring soon
  const isExpired = expiringMembership?.end_date && new Date(expiringMembership.end_date) < new Date();
  const daysLeft = expiringMembership?.end_date 
    ? Math.ceil((new Date(expiringMembership.end_date) - new Date()) / (1000 * 60 * 60 * 24))
    : 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <CreditCard className="w-6 h-6 text-blue-500" />
            <h3 className="text-xl font-semibold text-gray-800">Renew Membership</h3>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {success ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <h4 className="text-lg font-semibold text-gray-800 mb-2">Renewal Submitted!</h4>
              <p className="text-gray-500">Your renewal application has been submitted and is pending approval.</p>
              <p className="text-sm text-gray-400 mt-4">You will receive a notification once approved.</p>
            </div>
          ) : loading ? (
            <div className="text-center py-12">
              <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-500">Loading membership details...</p>
            </div>
          ) : (
            <>
              {/* Expiring Membership Alert */}
              {expiringMembership && (
                <div className={`mb-6 p-4 rounded-xl border ${
                  isExpired 
                    ? 'bg-red-50 border-red-200' 
                    : 'bg-yellow-50 border-yellow-200'
                }`}>
                  <div className="flex items-center gap-3 mb-2">
                    {isExpired ? (
                      <AlertCircle className="w-5 h-5 text-red-500" />
                    ) : (
                      <Clock className="w-5 h-5 text-yellow-500" />
                    )}
                    <span className={`font-semibold ${
                      isExpired ? 'text-red-700' : 'text-yellow-700'
                    }`}>
                      {isExpired ? 'Membership Expired' : 'Membership Expiring Soon'}
                    </span>
                  </div>
                  <p className={`text-sm ${
                    isExpired ? 'text-red-600' : 'text-yellow-600'
                  }`}>
                    {isExpired 
                      ? `Your ${expiringMembership.plan?.name || 'membership'} expired on ${new Date(expiringMembership.end_date).toLocaleDateString()}. Renew now to continue enjoying benefits!`
                      : `Your ${expiringMembership.plan?.name || 'membership'} will expire in ${daysLeft} day${daysLeft > 1 ? 's' : ''} (${new Date(expiringMembership.end_date).toLocaleDateString()}). Renew now to avoid interruption.`
                    }
                  </p>
                </div>
              )}

              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                  <h4 className="text-sm font-medium text-gray-500 mb-3">Membership Summary</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Plan:</span>
                      <span className="text-sm font-semibold text-gray-800 flex items-center gap-1">
                        <Crown className="w-4 h-4 text-yellow-500" />
                        {selectedPlan?.name || 'Loading...'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Price:</span>
                      <span className="text-sm font-bold text-blue-600">₱{selectedPlan?.price?.toLocaleString() || '0'}/{selectedPlan?.duration || 'month'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Duration:</span>
                      <span className="text-sm text-gray-700 capitalize">{selectedPlan?.duration || 'Monthly'}</span>
                    </div>
                    <div className="mt-2 pt-2 border-t border-gray-200">
                      <span className="text-xs text-green-600 flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" />
                        Renewing your current plan
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                  <h4 className="text-sm font-medium text-gray-500 mb-3">Your Information</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Name:</span>
                      <span className="text-sm text-gray-800">{profile?.first_name} {profile?.last_name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Email:</span>
                      <span className="text-sm text-gray-800">{profile?.email}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Phone:</span>
                      <span className="text-sm text-gray-800">{profile?.mobile || 'Not provided'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Current Plan Display - Only the expiring plan */}
              {selectedPlan && (
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Membership Plan to Renew
                  </label>
                  <div className="bg-blue-50 border-2 border-blue-500 rounded-xl p-5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                          <Crown className="w-6 h-6 text-blue-600" />
                        </div>
                        <div>
                          <h4 className="text-lg font-bold text-gray-800">{selectedPlan.name}</h4>
                          <p className="text-sm text-gray-600 capitalize">{selectedPlan.duration} plan</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-blue-600">₱{selectedPlan.price.toLocaleString()}</p>
                        <p className="text-xs text-gray-500">/{selectedPlan.duration}</p>
                      </div>
                    </div>
                    {selectedPlan.features && selectedPlan.features.length > 0 && (
                      <div className="mt-4 pt-3 border-t border-blue-200">
                        <p className="text-xs font-medium text-gray-600 mb-2">Included Benefits:</p>
                        <div className="flex flex-wrap gap-2">
                          {selectedPlan.features.slice(0, 3).map((feature, idx) => (
                            <span key={idx} className="text-xs bg-white rounded-full px-2 py-1 text-gray-600">
                              ✓ {feature}
                            </span>
                          ))}
                          {selectedPlan.features.length > 3 && (
                            <span className="text-xs text-gray-500">+{selectedPlan.features.length - 3} more</span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    You are renewing your current {selectedPlan.name} plan. The same benefits will continue.
                  </p>
                </div>
              )}

              {/* Payment Method Section */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-3">Select Payment Method</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label
                    className={`flex items-center gap-3 p-4 border rounded-xl cursor-pointer transition-all ${
                      paymentMethod === 'gcash'
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-blue-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="gcash"
                      checked={paymentMethod === 'gcash'}
                      onChange={() => setPaymentMethod('gcash')}
                      className="w-4 h-4 text-blue-600"
                    />
                    <div className="flex-1">
                      <p className="font-medium text-gray-800">GCash</p>
                      <p className="text-sm text-gray-500">Pay via GCash and upload receipt</p>
                    </div>
                  </label>

                  <label
                    className={`flex items-center gap-3 p-4 border rounded-xl cursor-pointer transition-all ${
                      paymentMethod === 'onsite'
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-blue-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="onsite"
                      checked={paymentMethod === 'onsite'}
                      onChange={() => setPaymentMethod('onsite')}
                      className="w-4 h-4 text-blue-600"
                    />
                    <div className="flex-1">
                      <p className="font-medium text-gray-800">Pay at Business</p>
                      <p className="text-sm text-gray-500">Pay directly at the business premises</p>
                    </div>
                  </label>
                </div>
              </div>

              {/* GCash Upload Section */}
              {paymentMethod === 'gcash' && (
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-3">Upload Payment Receipt</label>
                  <p className="text-xs text-gray-500 mb-3">Please upload a screenshot of your GCash payment confirmation</p>

                  {!receiptPreview ? (
                    <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center">
                      <input
                        type="file"
                        id="receipt-upload"
                        accept="image/*"
                        onChange={handleReceiptUpload}
                        className="hidden"
                        disabled={uploadingReceipt}
                      />
                      <label htmlFor="receipt-upload" className="cursor-pointer block">
                        <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                        <span className="text-sm text-blue-600 hover:text-blue-700">Click to upload receipt</span>
                        <p className="text-xs text-gray-400 mt-1">PNG, JPG up to 5MB</p>
                      </label>
                    </div>
                  ) : (
                    <div className="relative">
                      <img src={receiptPreview} alt="Receipt preview" className="max-h-48 mx-auto rounded-lg border border-gray-200" />
                      <button
                        onClick={removeReceipt}
                        className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  {/* GCash QR Info Button */}
                  {businessDetails?.gcash_qr_code && (
                    <button
                      onClick={() => setShowPaymentInfo(!showPaymentInfo)}
                      className="mt-3 text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                    >
                      <CreditCard className="w-4 h-4" />
                      View GCash QR Code
                    </button>
                  )}

                  {showPaymentInfo && gcashQrUrl && (
                    <div className="mt-3 p-4 bg-gray-50 rounded-xl border border-gray-200">
                      <h5 className="text-sm font-medium text-gray-700 mb-2">GCash QR Code</h5>
                      <img src={gcashQrUrl} alt="GCash QR Code" className="w-48 h-48 mx-auto object-contain" />
                      {businessDetails?.contact_phone && (
                        <p className="text-xs text-gray-500 text-center mt-2">GCash Number: {businessDetails.contact_phone}</p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Onsite Payment Info */}
              {paymentMethod === 'onsite' && businessDetails && (
                <div className="mb-6 p-4 bg-gray-50 rounded-xl border border-gray-200">
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Business Information</h4>
                  <div className="space-y-2">
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
                      <div>
                        <p className="text-sm text-gray-800">{businessDetails.address || businessDetails.location}</p>
                        <p className="text-xs text-gray-500">{businessDetails.city}, {businessDetails.province}</p>
                      </div>
                    </div>
                    {businessDetails.contact_phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-600">{businessDetails.contact_phone}</span>
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-3">Please visit the business to complete your payment. Bring a valid ID for verification.</p>
                </div>
              )}

              {/* Terms and Conditions */}
              <div className="mb-6">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={agreeToTerms}
                    onChange={(e) => setAgreeToTerms(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 mt-0.5"
                  />
                  <span className="text-sm text-gray-600">
                    I agree to the <a href="#" className="text-blue-600 hover:underline" onClick={(e) => e.preventDefault()}>terms and conditions</a> and confirm that the information provided is accurate
                  </span>
                </label>
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}
            </>
          )}
        </div>

        {!success && !loading && (
          <div className="flex gap-3 p-6 border-t border-gray-200">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-gray-300 rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleRenew}
              disabled={loading}
              className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CreditCard className="w-4 h-4" />
                  Renew Plan
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default RenewMembershipModal;