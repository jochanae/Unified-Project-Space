import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Star, Edit2, Trash2, Send } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface Review {
  id: string;
  professional_id: string;
  user_id: string;
  rating: number;
  review_text: string | null;
  created_at: string;
  updated_at: string;
  reviewer_display_name?: string;
}

interface ReviewerProfile {
  first_name: string | null;
  last_name: string | null;
}

interface ProfessionalReviewsProps {
  professionalId: string;
  onReviewChange?: () => void;
}

const StarRating = ({ 
  rating, 
  onChange, 
  readonly = false,
  size = "md"
}: { 
  rating: number; 
  onChange?: (rating: number) => void;
  readonly?: boolean;
  size?: "sm" | "md";
}) => {
  const [hoverRating, setHoverRating] = useState(0);
  const sizeClass = size === "sm" ? "h-4 w-4" : "h-6 w-6";
  
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readonly}
          onClick={() => onChange?.(star)}
          onMouseEnter={() => !readonly && setHoverRating(star)}
          onMouseLeave={() => !readonly && setHoverRating(0)}
          className={`${readonly ? 'cursor-default' : 'cursor-pointer hover:scale-110'} transition-transform`}
        >
          <Star
            className={`${sizeClass} ${
              star <= (hoverRating || rating)
                ? "text-amber-400 fill-amber-400"
                : "text-gray-300"
            }`}
          />
        </button>
      ))}
    </div>
  );
};

export const ProfessionalReviews = ({ professionalId, onReviewChange }: ProfessionalReviewsProps) => {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [userReview, setUserReview] = useState<Review | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  
  // Form state
  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState("");

  const getDisplayName = (firstName: string | null, lastName: string | null): string => {
    if (firstName && lastName) {
      return `${firstName} ${lastName.charAt(0)}.`;
    } else if (firstName) {
      return firstName;
    }
    return "Anonymous";
  };

  const fetchReviews = async () => {
    try {
      // Public, anonymized list (reviewer user_id intentionally hidden)
      const { data, error } = await supabase
        .from("professional_reviews_public" as any)
        .select("*")
        .eq("professional_id", professionalId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const reviewsList: Review[] = (data || []).map((r: any) => ({
        ...r,
        user_id: "", // hidden from public listing for privacy
        reviewer_display_name: "Verified Reviewer",
      }));

      setReviews(reviewsList);

      // Separately fetch the current user's own review (full row)
      if (user) {
        const { data: ownReview } = await supabase
          .from("professional_reviews")
          .select("*")
          .eq("professional_id", professionalId)
          .eq("user_id", user.id)
          .maybeSingle();

        if (ownReview) {
          setUserReview({
            ...ownReview,
            reviewer_display_name: "You",
          });
          setRating(ownReview.rating);
          setReviewText(ownReview.review_text || "");
        }
      }
    } catch (error) {
      console.error("Error fetching reviews:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, [professionalId, user]);

  const handleSubmit = async () => {
    if (!user) {
      toast.error("Please log in to leave a review");
      return;
    }
    
    if (rating === 0) {
      toast.error("Please select a rating");
      return;
    }

    setSubmitting(true);
    try {
      if (userReview) {
        // Update existing review
        const { error } = await supabase
          .from("professional_reviews")
          .update({
            rating,
            review_text: reviewText || null,
          })
          .eq("id", userReview.id);

        if (error) throw error;
        toast.success("Review updated!");
      } else {
        // Create new review
        const { error } = await supabase
          .from("professional_reviews")
          .insert({
            professional_id: professionalId,
            user_id: user.id,
            rating,
            review_text: reviewText || null,
          });

        if (error) throw error;
        toast.success("Review submitted!");
      }
      
      setIsEditing(false);
      await fetchReviews();
      onReviewChange?.();
    } catch (error: any) {
      console.error("Error submitting review:", error);
      toast.error(error.message || "Failed to submit review");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!userReview) return;
    
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from("professional_reviews")
        .delete()
        .eq("id", userReview.id);

      if (error) throw error;
      
      toast.success("Review deleted");
      setUserReview(null);
      setRating(0);
      setReviewText("");
      await fetchReviews();
      onReviewChange?.();
    } catch (error: any) {
      console.error("Error deleting review:", error);
      toast.error("Failed to delete review");
    } finally {
      setSubmitting(false);
    }
  };

  const otherReviews = reviews.filter(r => r.user_id !== user?.id);

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold">Reviews</h3>
      
      {/* User's review form or display */}
      {user && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-4">
            {userReview && !isEditing ? (
              // Display user's existing review
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Your Review</span>
                    <StarRating rating={userReview.rating} readonly size="sm" />
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setIsEditing(true)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={handleDelete}
                      disabled={submitting}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                {userReview.review_text && (
                  <p className="text-sm text-muted-foreground">{userReview.review_text}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  {format(new Date(userReview.updated_at), "MMM d, yyyy")}
                </p>
              </div>
            ) : (
              // Review form
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">
                    {userReview ? "Edit Your Review" : "Leave a Review"}
                  </span>
                  {isEditing && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setIsEditing(false);
                        if (userReview) {
                          setRating(userReview.rating);
                          setReviewText(userReview.review_text || "");
                        }
                      }}
                    >
                      Cancel
                    </Button>
                  )}
                </div>
                <StarRating rating={rating} onChange={setRating} />
                <Textarea
                  placeholder="Share your experience (optional)"
                  value={reviewText}
                  onChange={(e) => setReviewText(e.target.value)}
                  rows={3}
                  className="resize-none"
                />
                <Button
                  onClick={handleSubmit}
                  disabled={submitting || rating === 0}
                  className="w-full"
                  size="sm"
                >
                  <Send className="h-4 w-4 mr-2" />
                  {submitting ? "Submitting..." : userReview ? "Update Review" : "Submit Review"}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Other reviews */}
      {loading ? (
        <p className="text-sm text-muted-foreground text-center py-4">Loading reviews...</p>
      ) : otherReviews.length === 0 && !userReview ? (
        <p className="text-sm text-muted-foreground text-center py-4">
          No reviews yet. {user ? "Be the first to leave a review!" : "Log in to leave a review."}
        </p>
      ) : (
        <div className="space-y-3">
          {otherReviews.map((review) => (
            <Card key={review.id}>
              <CardContent className="p-3">
                <div className="flex items-start gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-primary/10 text-primary text-xs">
                      {review.reviewer_display_name?.charAt(0) || "A"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium">{review.reviewer_display_name || "Anonymous"}</span>
                      <StarRating rating={review.rating} readonly size="sm" />
                    </div>
                    {review.review_text && (
                      <p className="text-sm text-muted-foreground">{review.review_text}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      {format(new Date(review.created_at), "MMM d, yyyy")}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
