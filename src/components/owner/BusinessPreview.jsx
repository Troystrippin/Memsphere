import React from 'react';
import { MapPin, Users, Clock, CreditCard, Star, Building } from 'lucide-react';

const BusinessPreview = ({ business, formData, businessHours, gcashQrUrl, gcashNumber, profile }) => {
  const data = business || formData;
  
  const getStatusBadge = (status) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-700';
      case 'pending':
        return 'bg-yellow-100 text-yellow-700';
      case 'inactive':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const convertTo12Hour = (time24) => {
    if (!time24) return { time: "09:00", ampm: "AM" };
    const [hours, minutes] = time24.split(":");
    const h = parseInt(hours);
    const ampm = h >= 12 ? "PM" : "AM";
    const h12 = h % 12 || 12;
    return { time: `${h12.toString().padStart(2, "0")}:${minutes}`, ampm };
  };

  return (
    <div className="space-y-8">
      {/* Business Card Preview */}
      <div>
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <Building className="w-5 h-5 text-blue-500" />
          Business Card Preview
        </h3>
        <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl border border-gray-200 overflow-hidden shadow-lg max-w-2xl mx-auto">
          <div className="p-6">
            <div className="flex items-start gap-4">
              <div className="text-6xl bg-gradient-to-br from-blue-100 to-purple-100 rounded-2xl w-20 h-20 flex items-center justify-center">
                {data.emoji || "🏢"}
              </div>
              <div className="flex-1">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-xl font-bold text-gray-800">{data.name || "Business Name"}</h4>
                    <p className="text-gray-500 text-sm mt-1">{data.short_description || "No description"}</p>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusBadge(data.status || 'active')}`}>
                    {data.status || 'Active'}
                  </span>
                </div>
                
                <div className="flex flex-wrap gap-4 mt-4">
                  <div className="flex items-center gap-1 text-sm text-gray-600">
                    <MapPin className="w-4 h-4" />
                    {data.location || "Location"}
                  </div>
                  <div className="flex items-center gap-1 text-sm text-gray-600">
                    <Users className="w-4 h-4" />
                    {data.members_count || 0} members
                  </div>
                  <div className="flex items-center gap-1 text-sm text-gray-600">
                    <Star className="w-4 h-4 text-yellow-400" />
                    {data.rating || "0.0"} rating
                  </div>
                </div>
              </div>
            </div>
            
            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="flex justify-between items-center">
                <div>
                  <span className="text-2xl font-bold text-blue-600">₱{(data.price || 0).toLocaleString()}</span>
                  <span className="text-gray-500">/{data.price_unit || "month"}</span>
                </div>
                <button className="px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-medium cursor-default opacity-75">
                  View Details →
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Business Hours Preview */}
      <div>
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5 text-blue-500" />
          Business Hours
        </h3>
        <div className="bg-gray-50 rounded-xl p-6 border border-gray-200 max-w-2xl mx-auto">
          {businessHours ? (
            <div className="space-y-2">
              {Object.entries(businessHours).map(([day, hours]) => {
                const openTime = hours.open ? convertTo12Hour(hours.open) : null;
                const closeTime = hours.close ? convertTo12Hour(hours.close) : null;
                return (
                  <div key={day} className="flex items-center justify-between py-2 border-b border-gray-200 last:border-0">
                    <span className="font-medium text-gray-700 capitalize w-24">{day}:</span>
                    <span className="text-gray-600">
                      {hours.closed ? (
                        <span className="text-red-500">Closed</span>
                      ) : (
                        `${openTime?.time || "09:00"} ${openTime?.ampm || "AM"} - ${closeTime?.time || "06:00"} ${closeTime?.ampm || "PM"}`
                      )}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-gray-500 text-center">No business hours set</p>
          )}
        </div>
      </div>

      {/* Payment Methods Preview */}
      <div>
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <CreditCard className="w-5 h-5 text-blue-500" />
          Payment Methods
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
          {/* GCash */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h4 className="font-semibold text-gray-800">GCash</h4>
                <p className="text-xs text-gray-500">Mobile Payment</p>
              </div>
              {gcashQrUrl ? (
                <span className="ml-auto text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full">Available</span>
              ) : (
                <span className="ml-auto text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-full">Not Set</span>
              )}
            </div>
            {gcashQrUrl ? (
              <div className="text-center">
                <img src={gcashQrUrl} alt="GCash QR" className="w-32 h-32 mx-auto rounded-lg border border-gray-200" />
                {gcashNumber && (
                  <p className="text-sm text-gray-600 mt-2">📱 {gcashNumber}</p>
                )}
                <p className="text-xs text-gray-400 mt-2">Scan to pay with GCash</p>
              </div>
            ) : (
              <p className="text-sm text-gray-500 text-center py-4">GCash payment not available</p>
            )}
          </div>

          {/* On-site Payment */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <Building className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <h4 className="font-semibold text-gray-800">Pay at Location</h4>
                <p className="text-xs text-gray-500">In-person Payment</p>
              </div>
              <span className="ml-auto text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full">Available</span>
            </div>
            <p className="text-sm text-gray-600 text-center py-4">
              Pay directly at {data.name || "the business"} location
            </p>
            <div className="text-xs text-gray-400 text-center">
              📍 {data.address || data.location || "Business address"}
            </div>
          </div>
        </div>
      </div>

      {/* Preview Note */}
      <div className="bg-blue-50 rounded-lg p-4 border border-blue-200 max-w-2xl mx-auto">
        <p className="text-sm text-blue-800 flex items-center gap-2">
          <span className="text-lg">✨</span>
          This is how your business will appear to customers
        </p>
      </div>
    </div>
  );
};

export default BusinessPreview;