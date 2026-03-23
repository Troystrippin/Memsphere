import React from "react";
import { MapPin, Users, Clock, CreditCard, Star, Building } from "lucide-react";
import { useTheme } from "../../contexts/ThemeContext";

const BusinessPreview = ({
  business,
  formData,
  businessHours,
  gcashQrUrl,
  gcashNumber,
  profile,
}) => {
  const { isDarkMode } = useTheme();
  const data = business || formData;

  const getStatusBadge = (status) => {
    switch (status) {
      case "active":
        return isDarkMode
          ? "bg-green-900/50 text-green-300"
          : "bg-green-100 text-green-700";
      case "pending":
        return isDarkMode
          ? "bg-yellow-900/50 text-yellow-300"
          : "bg-yellow-100 text-yellow-700";
      case "inactive":
        return isDarkMode
          ? "bg-red-900/50 text-red-300"
          : "bg-red-100 text-red-700";
      default:
        return isDarkMode
          ? "bg-gray-700 text-gray-300"
          : "bg-gray-100 text-gray-700";
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
        <h3
          className={`text-lg font-semibold mb-4 flex items-center gap-2 ${isDarkMode ? "text-white" : "text-gray-800"}`}
        >
          <Building className="w-5 h-5 text-blue-500" />
          Business Card Preview
        </h3>
        <div
          className={`rounded-2xl border overflow-hidden shadow-lg max-w-2xl mx-auto ${
            isDarkMode
              ? "bg-gray-800 border-gray-700"
              : "bg-gradient-to-br from-white to-gray-50 border-gray-200"
          }`}
        >
          <div className="p-6">
            <div className="flex items-start gap-4">
              <div
                className={`text-6xl rounded-2xl w-20 h-20 flex items-center justify-center ${
                  isDarkMode
                    ? "bg-gray-700"
                    : "bg-gradient-to-br from-blue-100 to-purple-100"
                }`}
              >
                {data.emoji || "🏢"}
              </div>
              <div className="flex-1">
                <div className="flex items-start justify-between">
                  <div>
                    <h4
                      className={`text-xl font-bold ${isDarkMode ? "text-white" : "text-gray-800"}`}
                    >
                      {data.name || "Business Name"}
                    </h4>
                    <p
                      className={`text-sm mt-1 ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}
                    >
                      {data.short_description || "No description"}
                    </p>
                  </div>
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusBadge(data.status || "active")}`}
                  >
                    {data.status || "Active"}
                  </span>
                </div>

                <div className="flex flex-wrap gap-4 mt-4">
                  <div
                    className={`flex items-center gap-1 text-sm ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}
                  >
                    <MapPin className="w-4 h-4" />
                    {data.location || "Location"}
                  </div>
                  <div
                    className={`flex items-center gap-1 text-sm ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}
                  >
                    <Users className="w-4 h-4" />
                    {data.members_count || 0} members
                  </div>
                  <div className="flex items-center gap-1 text-sm">
                    <Star className="w-4 h-4 text-yellow-400" />
                    <span
                      className={isDarkMode ? "text-gray-400" : "text-gray-600"}
                    >
                      {data.rating || "0.0"} rating
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div
              className={`mt-6 pt-6 border-t ${isDarkMode ? "border-gray-700" : "border-gray-200"}`}
            >
              <div className="flex justify-between items-center">
                <div>
                  <span
                    className={`text-2xl font-bold ${isDarkMode ? "text-blue-400" : "text-blue-600"}`}
                  >
                    ₱{(data.price || 0).toLocaleString()}
                  </span>
                  <span
                    className={isDarkMode ? "text-gray-400" : "text-gray-500"}
                  >
                    /{data.price_unit || "month"}
                  </span>
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
        <h3
          className={`text-lg font-semibold mb-4 flex items-center gap-2 ${isDarkMode ? "text-white" : "text-gray-800"}`}
        >
          <Clock className="w-5 h-5 text-blue-500" />
          Business Hours
        </h3>
        <div
          className={`rounded-xl p-6 border max-w-2xl mx-auto ${
            isDarkMode
              ? "bg-gray-800 border-gray-700"
              : "bg-gray-50 border-gray-200"
          }`}
        >
          {businessHours ? (
            <div className="space-y-2">
              {Object.entries(businessHours).map(([day, hours]) => {
                const openTime = hours.open
                  ? convertTo12Hour(hours.open)
                  : null;
                const closeTime = hours.close
                  ? convertTo12Hour(hours.close)
                  : null;
                return (
                  <div
                    key={day}
                    className={`flex items-center justify-between py-2 border-b last:border-0 ${
                      isDarkMode ? "border-gray-700" : "border-gray-200"
                    }`}
                  >
                    <span
                      className={`font-medium capitalize w-24 ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}
                    >
                      {day}:
                    </span>
                    <span
                      className={isDarkMode ? "text-gray-400" : "text-gray-600"}
                    >
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
            <p
              className={`text-center ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}
            >
              No business hours set
            </p>
          )}
        </div>
      </div>

      {/* Payment Methods Preview */}
      <div>
        <h3
          className={`text-lg font-semibold mb-4 flex items-center gap-2 ${isDarkMode ? "text-white" : "text-gray-800"}`}
        >
          <CreditCard className="w-5 h-5 text-blue-500" />
          Payment Methods
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
          {/* GCash */}
          <div
            className={`rounded-xl border p-5 ${isDarkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"}`}
          >
            <div className="flex items-center gap-2 mb-3">
              <div
                className={`w-10 h-10 rounded-lg flex items-center justify-center ${isDarkMode ? "bg-gray-700" : "bg-blue-100"}`}
              >
                <CreditCard
                  className={`w-5 h-5 ${isDarkMode ? "text-blue-400" : "text-blue-600"}`}
                />
              </div>
              <div>
                <h4
                  className={`font-semibold ${isDarkMode ? "text-white" : "text-gray-800"}`}
                >
                  GCash
                </h4>
                <p
                  className={`text-xs ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}
                >
                  Mobile Payment
                </p>
              </div>
              {gcashQrUrl ? (
                <span
                  className={`ml-auto text-xs px-2 py-1 rounded-full ${isDarkMode ? "bg-green-900/50 text-green-300" : "bg-green-100 text-green-700"}`}
                >
                  Available
                </span>
              ) : (
                <span
                  className={`ml-auto text-xs px-2 py-1 rounded-full ${isDarkMode ? "bg-gray-700 text-gray-400" : "bg-gray-100 text-gray-600"}`}
                >
                  Not Set
                </span>
              )}
            </div>
            {gcashQrUrl ? (
              <div className="text-center">
                <img
                  src={gcashQrUrl}
                  alt="GCash QR"
                  className="w-32 h-32 mx-auto rounded-lg border dark:border-gray-600"
                />
                {gcashNumber && (
                  <p
                    className={`text-sm mt-2 ${isDarkMode ? "text-gray-300" : "text-gray-600"}`}
                  >
                    📱 {gcashNumber}
                  </p>
                )}
                <p
                  className={`text-xs mt-2 ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}
                >
                  Scan to pay with GCash
                </p>
              </div>
            ) : (
              <p
                className={`text-sm text-center py-4 ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}
              >
                GCash payment not available
              </p>
            )}
          </div>

          {/* On-site Payment */}
          <div
            className={`rounded-xl border p-5 ${isDarkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"}`}
          >
            <div className="flex items-center gap-2 mb-3">
              <div
                className={`w-10 h-10 rounded-lg flex items-center justify-center ${isDarkMode ? "bg-gray-700" : "bg-green-100"}`}
              >
                <Building
                  className={`w-5 h-5 ${isDarkMode ? "text-green-400" : "text-green-600"}`}
                />
              </div>
              <div>
                <h4
                  className={`font-semibold ${isDarkMode ? "text-white" : "text-gray-800"}`}
                >
                  Pay at Location
                </h4>
                <p
                  className={`text-xs ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}
                >
                  In-person Payment
                </p>
              </div>
              <span
                className={`ml-auto text-xs px-2 py-1 rounded-full ${isDarkMode ? "bg-green-900/50 text-green-300" : "bg-green-100 text-green-700"}`}
              >
                Available
              </span>
            </div>
            <p
              className={`text-sm text-center py-4 ${isDarkMode ? "text-gray-300" : "text-gray-600"}`}
            >
              Pay directly at {data.name || "the business"} location
            </p>
            <div
              className={`text-xs text-center ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}
            >
              📍 {data.address || data.location || "Business address"}
            </div>
          </div>
        </div>
      </div>

      {/* Preview Note */}
      <div
        className={`rounded-lg p-4 border max-w-2xl mx-auto ${
          isDarkMode
            ? "bg-blue-900/30 border-blue-800"
            : "bg-blue-50 border-blue-200"
        }`}
      >
        <p
          className={`text-sm flex items-center gap-2 ${isDarkMode ? "text-blue-300" : "text-blue-800"}`}
        >
          <span className="text-lg">✨</span>
          This is how your business will appear to customers
        </p>
      </div>
    </div>
  );
};

export default BusinessPreview;
