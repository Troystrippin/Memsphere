import React, { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { Star, Trash2, User, Calendar } from "lucide-react";
import toast from "react-hot-toast";
import { useTheme } from "../../contexts/ThemeContext";

const ReviewsManager = ({ businessId }) => {
  const { isDarkMode } = useTheme();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    average: 0,
    total: 0,
    distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
  });
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    if (businessId) {
      fetchReviews();
    }
  }, [businessId]);

  const fetchReviews = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("reviews")
        .select(
          `
          *,
          profiles:user_id (
            first_name,
            last_name,
            avatar_url
          )
        `,
        )
        .eq("business_id", businessId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      setReviews(data || []);

      if (data && data.length > 0) {
        const total = data.length;
        const sum = data.reduce((acc, review) => acc + review.rating, 0);
        const average = sum / total;

        const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        data.forEach((review) => {
          distribution[review.rating]++;
        });

        setStats({ average, total, distribution });
      }
    } catch (error) {
      console.error("Error fetching reviews:", error);
      toast.error("Failed to load reviews");
    } finally {
      setLoading(false);
    }
  };

  const deleteReview = async (reviewId) => {
    if (!window.confirm("Are you sure you want to delete this review?")) return;

    try {
      setDeletingId(reviewId);
      const { error } = await supabase
        .from("reviews")
        .delete()
        .eq("id", reviewId);

      if (error) throw error;

      toast.success("Review deleted successfully!");
      await fetchReviews();
    } catch (error) {
      console.error("Error deleting review:", error);
      toast.error("Failed to delete review");
    } finally {
      setDeletingId(null);
    }
  };

  const renderStars = (rating) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <Star
          key={i}
          className={`w-4 h-4 ${
            i <= rating
              ? "text-yellow-400 fill-yellow-400"
              : isDarkMode
                ? "text-gray-600"
                : "text-gray-300"
          }`}
        />,
      );
    }
    return stars;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div
          className={`w-8 h-8 border-2 rounded-full animate-spin ${
            isDarkMode
              ? "border-gray-600 border-t-blue-400"
              : "border-blue-200 border-t-blue-600"
          }`}
        ></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Rating Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div
          className={`rounded-xl p-6 text-center ${
            isDarkMode
              ? "bg-gradient-to-br from-gray-800 to-gray-700"
              : "bg-gradient-to-br from-yellow-50 to-orange-50"
          }`}
        >
          <div
            className={`text-5xl font-bold mb-2 ${isDarkMode ? "text-yellow-400" : "text-yellow-600"}`}
          >
            {stats.average.toFixed(1)}
          </div>
          <div className="flex justify-center gap-1 mb-2">
            {renderStars(Math.round(stats.average))}
          </div>
          <p className={isDarkMode ? "text-gray-400" : "text-gray-600"}>
            Based on {stats.total} reviews
          </p>
        </div>

        <div
          className={`rounded-xl p-6 border ${isDarkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"}`}
        >
          <h4
            className={`font-semibold mb-3 ${isDarkMode ? "text-white" : "text-gray-800"}`}
          >
            Rating Distribution
          </h4>
          <div className="space-y-2">
            {[5, 4, 3, 2, 1].map((stars) => {
              const count = stats.distribution[stars];
              const percentage =
                stats.total > 0 ? (count / stats.total) * 100 : 0;
              return (
                <div key={stars} className="flex items-center gap-3">
                  <span
                    className={`w-12 text-sm ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}
                  >
                    {stars} ★
                  </span>
                  <div
                    className={`flex-1 h-2 rounded-full overflow-hidden ${isDarkMode ? "bg-gray-700" : "bg-gray-200"}`}
                  >
                    <div
                      className="h-full bg-yellow-400 rounded-full transition-all"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <span
                    className={`w-10 text-sm ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}
                  >
                    {count}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Reviews List */}
      <div>
        <h4
          className={`font-semibold mb-4 ${isDarkMode ? "text-white" : "text-gray-800"}`}
        >
          All Reviews ({stats.total})
        </h4>

        {reviews.length > 0 ? (
          <div className="space-y-4">
            {reviews.map((review) => (
              <div
                key={review.id}
                className={`rounded-xl border p-5 hover:shadow-md transition-all ${
                  isDarkMode
                    ? "bg-gray-800 border-gray-700"
                    : "bg-white border-gray-200"
                }`}
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        isDarkMode
                          ? "bg-gray-700"
                          : "bg-gradient-to-br from-blue-100 to-purple-100"
                      }`}
                    >
                      <User
                        className={`w-5 h-5 ${isDarkMode ? "text-blue-400" : "text-blue-600"}`}
                      />
                    </div>
                    <div>
                      <p
                        className={`font-medium ${isDarkMode ? "text-white" : "text-gray-800"}`}
                      >
                        {review.profiles?.first_name}{" "}
                        {review.profiles?.last_name}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex gap-0.5">
                          {renderStars(review.rating)}
                        </div>
                        <span
                          className={`text-xs flex items-center gap-1 ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}
                        >
                          <Calendar className="w-3 h-3" />
                          {new Date(review.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => deleteReview(review.id)}
                    disabled={deletingId === review.id}
                    className="text-red-500 hover:text-red-600 transition-colors disabled:opacity-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <p
                  className={`leading-relaxed ${isDarkMode ? "text-gray-300" : "text-gray-600"}`}
                >
                  {review.comment}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div
            className={`text-center py-12 rounded-xl border ${isDarkMode ? "bg-gray-800 border-gray-700" : "bg-gray-50 border-gray-200"}`}
          >
            <div className="text-5xl mb-3">⭐</div>
            <p className={isDarkMode ? "text-gray-400" : "text-gray-500"}>
              No reviews yet
            </p>
            <p
              className={`text-sm ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}
            >
              Reviews will appear here when customers leave feedback
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReviewsManager;
