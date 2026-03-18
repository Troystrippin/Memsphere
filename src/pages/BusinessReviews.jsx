import React, { useState, useEffect } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { supabase } from "../lib/supabase";
import ClientNavbar from "../components/client/ClientNavbar";
import "../styles/BusinessReviews.css";

const BusinessReviews = () => {
  const { businessId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [business, setBusiness] = useState(location.state?.business || null);
  const [reviews, setReviews] = useState(location.state?.reviews || []);
  const [loading, setLoading] = useState(!location.state?.reviews);
  const [hasMembership, setHasMembership] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedBusinessForReview, setSelectedBusinessForReview] = useState(null);
  const [reviewFormData, setReviewFormData] = useState({
    rating: 0,
    comment: "",
    hoverRating: 0
  });
  const [submittingReview, setSubmittingReview] = useState(false);

  useEffect(() => {
    checkUser();
  }, []);

  useEffect(() => {
    if (user && !location.state?.reviews) {
      fetchBusinessDetails();
      fetchAllReviews();
      checkUserMembership();
    }
  }, [user, businessId]);

  const checkUser = async () => {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) throw error;
      if (!user) {
        navigate("/login");
        return;
      }
      setUser(user);
      await getUserProfile(user);
    } catch (error) {
      console.error("Error checking user:", error);
      navigate("/login");
    }
  };

  const getUserProfile = async (user) => {
    try {
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (error && error.code !== "PGRST116") {
        console.error("Error fetching profile:", error);
      }

      setProfile(profile);

      if (profile?.avatar_url) {
        downloadAvatar(profile.avatar_url);
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
    }
  };

  const downloadAvatar = async (path) => {
    try {
      const { data, error } = await supabase.storage
        .from("avatars")
        .download(path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      setAvatarUrl(url);
    } catch (error) {
      console.error("Error downloading avatar:", error);
    }
  };

  const fetchBusinessDetails = async () => {
    try {
      const { data, error } = await supabase
        .from("businesses")
        .select("*")
        .eq("id", businessId)
        .single();

      if (error) throw error;
      setBusiness(data);
    } catch (error) {
      console.error("Error fetching business:", error);
    }
  };

  const fetchAllReviews = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("reviews")
        .select(`
          *,
          profiles:user_id (
            first_name,
            last_name,
            avatar_url
          )
        `)
        .eq("business_id", businessId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setReviews(data || []);
    } catch (error) {
      console.error("Error fetching reviews:", error);
    } finally {
      setLoading(false);
    }
  };

  const checkUserMembership = async () => {
    try {
      const { data, error } = await supabase
        .from("memberships")
        .select("id")
        .eq("user_id", user.id)
        .eq("business_id", businessId)
        .eq("status", "approved")
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      setHasMembership(!!data);
    } catch (error) {
      console.error("Error checking membership:", error);
    }
  };

  const checkExistingReview = async () => {
    try {
      const { data, error } = await supabase
        .from("reviews")
        .select("id, rating, comment")
        .eq("user_id", user.id)
        .eq("business_id", businessId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    } catch (error) {
      console.error("Error checking existing review:", error);
      return null;
    }
  };

  const handleOpenReviewModal = async () => {
    const existingReview = await checkExistingReview();
    
    setSelectedBusinessForReview(business);
    setReviewFormData({
      rating: existingReview?.rating || 0,
      comment: existingReview?.comment || "",
      hoverRating: 0
    });
    setShowReviewModal(true);
  };

  const handleRatingClick = (rating) => {
    setReviewFormData(prev => ({
      ...prev,
      rating: rating
    }));
  };

  const handleRatingHover = (rating) => {
    setReviewFormData(prev => ({
      ...prev,
      hoverRating: rating
    }));
  };

  const handleRatingLeave = () => {
    setReviewFormData(prev => ({
      ...prev,
      hoverRating: 0
    }));
  };

  const handleSubmitReview = async () => {
    if (reviewFormData.rating === 0) {
      alert("Please select a rating");
      return;
    }

    if (!reviewFormData.comment.trim()) {
      alert("Please write a review comment");
      return;
    }

    try {
      setSubmittingReview(true);

      const existingReview = await checkExistingReview();

      let result;
      
      if (existingReview) {
        const { data, error } = await supabase
          .from("reviews")
          .update({
            rating: reviewFormData.rating,
            comment: reviewFormData.comment.trim(),
            updated_at: new Date().toISOString()
          })
          .eq("id", existingReview.id)
          .select(`
            *,
            profiles:user_id (
              first_name,
              last_name,
              avatar_url
            )
          `);

        if (error) throw error;
        result = data[0];
      } else {
        const { data, error } = await supabase
          .from("reviews")
          .insert([{
            business_id: businessId,
            user_id: user.id,
            rating: reviewFormData.rating,
            comment: reviewFormData.comment.trim(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }])
          .select(`
            *,
            profiles:user_id (
              first_name,
              last_name,
              avatar_url
            )
          `);

        if (error) throw error;
        result = data[0];
      }

      // Update reviews list
      setReviews(prev => {
        const filtered = prev.filter(r => r.id !== result.id);
        return [result, ...filtered];
      });

      // Update business rating
      const allReviews = [result, ...reviews.filter(r => r.id !== result.id)];
      const avgRating = allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;
      
      await supabase
        .from("businesses")
        .update({ rating: avgRating })
        .eq("id", businessId);

      setShowReviewModal(false);
      alert(existingReview ? "Review updated successfully!" : "Review submitted successfully!");
      
    } catch (error) {
      console.error("Error submitting review:", error);
      alert("Failed to submit review. Please try again.");
    } finally {
      setSubmittingReview(false);
    }
  };

  const getBusinessIcon = (business) => {
    if (!business) return "🏢";
    switch (business.business_type) {
      case "gym":
        return business.emoji || "🏋️";
      case "cafe":
        return business.emoji || "☕";
      case "bakery":
        return business.emoji || "🥐";
      default:
        return business.emoji || "🏢";
    }
  };

  const renderStars = (rating) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;

    for (let i = 1; i <= 5; i++) {
      if (i <= fullStars) {
        stars.push(<span key={i} className="star full">★</span>);
      } else if (i === fullStars + 1 && hasHalfStar) {
        stars.push(<span key={i} className="star half">★</span>);
      } else {
        stars.push(<span key={i} className="star empty">☆</span>);
      }
    }
    return stars;
  };

  const calculateAverageRating = () => {
    if (reviews.length === 0) return 0;
    const sum = reviews.reduce((acc, review) => acc + review.rating, 0);
    return (sum / reviews.length).toFixed(1);
  };

  const getRatingDistribution = () => {
    const distribution = [0, 0, 0, 0, 0];
    reviews.forEach(review => {
      distribution[review.rating - 1]++;
    });
    return distribution;
  };

  if (loading) {
    return (
      <div className="reviews-loading">
        <div className="loading-spinner"></div>
        <p>Loading reviews...</p>
      </div>
    );
  }

  const ratingDistribution = getRatingDistribution();
  const averageRating = calculateAverageRating();

  return (
    <div className="business-reviews-container">
      <ClientNavbar profile={profile} avatarUrl={avatarUrl} />

      <div className="reviews-main">
        <button className="back-btn" onClick={() => navigate(-1)}>
          <span className="back-icon">←</span>
          Back
        </button>

        {business && (
          <>
            <div className="reviews-header-section">
              <div className="business-summary">
                <div className="business-icon-large">
                  <span>{getBusinessIcon(business)}</span>
                </div>
                <div className="business-info">
                  <h1>{business.name}</h1>
                  <p className="business-location">{business.location}</p>
                </div>
              </div>

              <div className="rating-summary">
                <div className="average-rating">
                  <span className="big-rating">{averageRating}</span>
                  <span className="rating-stars">
                    {renderStars(parseFloat(averageRating))}
                  </span>
                  <span className="total-reviews">
                    {reviews.length} {reviews.length === 1 ? 'review' : 'reviews'}
                  </span>
                </div>

                <div className="rating-breakdown">
                  {[5, 4, 3, 2, 1].map((stars) => {
                    const count = ratingDistribution[stars - 1];
                    const percentage = reviews.length > 0 
                      ? (count / reviews.length * 100).toFixed(0) 
                      : 0;
                    
                    return (
                      <div key={stars} className="rating-bar-row">
                        <span className="stars-label">{stars} ★</span>
                        <div className="rating-bar-container">
                          <div 
                            className="rating-bar-fill" 
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                        <span className="rating-count">{count}</span>
                      </div>
                    );
                  })}
                </div>

                {hasMembership && (
                  <button
                    className="write-review-large-btn"
                    onClick={handleOpenReviewModal}
                  >
                    <span className="btn-icon">✏️</span>
                    Write a Review
                  </button>
                )}
              </div>
            </div>

            <div className="reviews-list-section">
              <h2>Customer Reviews</h2>
              
              {reviews.length > 0 ? (
                <div className="all-reviews-list">
                  {reviews.map((review) => (
                    <div key={review.id} className="review-card">
                      <div className="review-card-header">
                        <div className="reviewer-avatar">
                          {review.profiles?.avatar_url ? (
                            <img src={review.profiles.avatar_url} alt="avatar" />
                          ) : (
                            <span className="avatar-placeholder">
                              {review.profiles?.first_name?.[0] || "U"}
                            </span>
                          )}
                        </div>
                        <div className="reviewer-info">
                          <span className="reviewer-name">
                            {review.profiles?.first_name} {review.profiles?.last_name}
                          </span>
                          <span className="review-date">
                            {new Date(review.created_at).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })}
                          </span>
                        </div>
                      </div>
                      <div className="review-content">
                        <div className="review-rating">
                          {renderStars(review.rating)}
                        </div>
                        <p className="review-text">{review.comment}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="no-reviews-section">
                  <span className="no-reviews-icon">📝</span>
                  <h3>No Reviews Yet</h3>
                  <p>Be the first to share your experience with this business!</p>
                  {hasMembership && (
                    <button
                      className="write-review-btn"
                      onClick={handleOpenReviewModal}
                    >
                      Write a Review
                    </button>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Review Modal */}
      {showReviewModal && selectedBusinessForReview && (
        <div
          className="review-modal-overlay"
          onClick={() => setShowReviewModal(false)}
        >
          <div
            className="review-modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="review-modal-close"
              onClick={() => setShowReviewModal(false)}
            >
              ×
            </button>

            <div className="review-modal-header">
              <span className="review-modal-icon">⭐</span>
              <h2>{reviewFormData.rating > 0 ? "Edit Your Review" : "Write a Review"}</h2>
            </div>

            <div className="review-business-info">
              <span className="review-business-icon">
                {getBusinessIcon(selectedBusinessForReview)}
              </span>
              <div className="review-business-details">
                <h3>{selectedBusinessForReview.name}</h3>
                <p>{selectedBusinessForReview.location}</p>
              </div>
            </div>

            <div className="review-form">
              <div className="rating-section">
                <label>Your Rating *</label>
                <div className="star-rating-container">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <span
                      key={star}
                      className={`star-rating ${
                        (reviewFormData.hoverRating || reviewFormData.rating) >= star
                          ? "active"
                          : ""
                      }`}
                      onClick={() => handleRatingClick(star)}
                      onMouseEnter={() => handleRatingHover(star)}
                      onMouseLeave={handleRatingLeave}
                    >
                      ★
                    </span>
                  ))}
                  <span className="rating-label">
                    {reviewFormData.rating === 1 && "Poor"}
                    {reviewFormData.rating === 2 && "Fair"}
                    {reviewFormData.rating === 3 && "Good"}
                    {reviewFormData.rating === 4 && "Very Good"}
                    {reviewFormData.rating === 5 && "Excellent"}
                  </span>
                </div>
              </div>

              <div className="comment-section">
                <label htmlFor="review-comment">Your Review *</label>
                <textarea
                  id="review-comment"
                  rows="5"
                  placeholder="Share your experience with this business... What did you like? What could be improved?"
                  value={reviewFormData.comment}
                  onChange={(e) => setReviewFormData(prev => ({
                    ...prev,
                    comment: e.target.value
                  }))}
                  maxLength="500"
                />
                <span className="comment-counter">
                  {reviewFormData.comment.length}/500
                </span>
              </div>

              <div className="review-guidelines">
                <h4>Review Guidelines:</h4>
                <ul>
                  <li>Be respectful and constructive</li>
                  <li>Share your honest experience</li>
                  <li>Avoid offensive language</li>
                  <li>Focus on the business and services</li>
                </ul>
              </div>

              <button
                className="submit-review-btn"
                onClick={handleSubmitReview}
                disabled={submittingReview}
              >
                {submittingReview 
                  ? "Submitting..." 
                  : reviewFormData.rating > 0 && reviewFormData.comment 
                    ? "Update Review" 
                    : "Submit Review"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BusinessReviews;