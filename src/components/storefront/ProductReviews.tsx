"use client";

import * as React from "react";
import Link from "next/link";
import { Star, MessageSquare, CheckCircle, Send, User } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ReviewItem {
  id: string;
  rating: number;
  comment: string;
  authorName: string;
  createdAt: string;
}

interface ProductReviewsProps {
  productId: string;
}

export function ProductReviews({ productId }: ProductReviewsProps) {
  const [reviews, setReviews] = React.useState<ReviewItem[]>([]);
  const [averageRating, setAverageRating] = React.useState(5.0);
  const [totalReviews, setTotalReviews] = React.useState(0);
  const [isLoading, setIsLoading] = React.useState(true);

  // Submission Form State
  const [newRating, setNewRating] = React.useState(5);
  const [hoverRating, setHoverRating] = React.useState(0);
  const [comment, setComment] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [submitMessage, setSubmitMessage] = React.useState<string | null>(null);
  const [isError, setIsError] = React.useState(false);

  React.useEffect(() => {
    async function loadReviews() {
      try {
        setIsLoading(true);
        const res = await fetch(`/api/reviews?productId=${encodeURIComponent(productId)}`);
        if (res.ok) {
          const data = await res.json();
          setReviews(data.reviews || []);
          setAverageRating(data.averageRating || 5.0);
          setTotalReviews(data.totalReviews || 0);
        }
      } catch (err) {
        console.error("Failed to load reviews:", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadReviews();
  }, [productId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) return;

    try {
      setIsSubmitting(true);
      setSubmitMessage(null);
      setIsError(false);

      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId,
          rating: newRating,
          comment: comment.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setIsError(true);
        setSubmitMessage(data.error || "Failed to submit review.");
      } else {
        setIsError(false);
        setSubmitMessage("Thank you! Your verified review has been posted.");
        setComment("");
        if (data.review) {
          setReviews((prev) => [data.review, ...prev]);
          setTotalReviews((prev) => prev + 1);
        }
      }
    } catch {
      setIsError(true);
      setSubmitMessage("Network error submitting review.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mt-16 pt-10 border-t border-neutral-200">
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-neutral-100 gap-4">
        <div>
          <span className="text-xs uppercase tracking-wider text-rose-800 font-bold block mb-1">
            Customer Love
          </span>
          <h2 className="text-2xl font-serif font-bold text-neutral-900 tracking-tight">
            Verified Customer Reviews
          </h2>
        </div>

        {/* Rating summary pill */}
        <div className="flex items-center gap-3 bg-rose-50/60 border border-rose-200/80 px-4 py-2.5 rounded-2xl self-start md:self-auto">
          <div className="flex items-center text-amber-500">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                className={`w-4 h-4 ${
                  star <= Math.round(averageRating) ? "fill-amber-400 text-amber-400" : "text-neutral-300"
                }`}
              />
            ))}
          </div>
          <span className="text-sm font-bold text-rose-950 font-serif">
            {averageRating.toFixed(1)} / 5.0
          </span>
          <span className="text-xs text-neutral-500 font-medium">
            ({totalReviews} verified {totalReviews === 1 ? "review" : "reviews"})
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
        {/* Left: Review Submission Form */}
        <div className="bg-white p-6 rounded-2xl border border-rose-100 shadow-sm">
          <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-900 mb-2">
            Leave a Review
          </h3>
          <p className="text-xs text-neutral-500 mb-4">
            Bought this piece from us? Share your thoughts with other jewelry lovers!
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Interactive Star Picker */}
            <div>
              <label className="text-xs font-semibold text-neutral-700 block mb-1.5">
                Your Rating
              </label>
              <div className="flex items-center gap-1.5">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setNewRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    className="p-1 text-neutral-300 hover:scale-110 transition-transform"
                    aria-label={`${star} star rating`}
                  >
                    <Star
                      className={`w-6 h-6 ${
                        star <= (hoverRating || newRating)
                          ? "fill-amber-400 text-amber-400"
                          : "text-neutral-300"
                      }`}
                    />
                  </button>
                ))}
                <span className="text-xs font-bold text-neutral-700 ml-2">
                  {hoverRating || newRating} / 5 Stars
                </span>
              </div>
            </div>

            {/* Comment */}
            <div>
              <label className="text-xs font-semibold text-neutral-700 block mb-1.5">
                Your Feedback
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="What did you think of the design, beads, and packaging?"
                rows={3}
                required
                className="w-full p-3 border border-neutral-300 rounded-xl text-xs text-neutral-800 focus:outline-none focus:ring-2 focus:ring-rose-800"
              />
            </div>

            {submitMessage && (
              <div
                className={`p-3 rounded-xl text-xs font-medium ${
                  isError
                    ? "bg-red-50 text-red-700 border border-red-200"
                    : "bg-emerald-50 text-emerald-800 border border-emerald-200"
                }`}
              >
                {submitMessage}
                {isError && submitMessage.includes("log in") && (
                  <Link href="/login" className="block mt-1 font-bold underline">
                    Click here to Log In &rarr;
                  </Link>
                )}
              </div>
            )}

            <Button
              type="submit"
              disabled={isSubmitting || !comment.trim()}
              className="w-full bg-rose-900 hover:bg-rose-950 text-white text-xs font-semibold rounded-xl h-10 gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              {isSubmitting ? "Submitting..." : "Post Review"}
            </Button>
          </form>
        </div>

        {/* Right: Reviews List */}
        <div className="lg:col-span-2 space-y-4">
          {isLoading ? (
            <div className="p-8 text-center text-xs text-neutral-500">Loading reviews...</div>
          ) : reviews.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-2xl border border-neutral-200">
              <MessageSquare className="w-8 h-8 text-neutral-300 mx-auto mb-2" />
              <p className="text-xs font-semibold text-neutral-700">No reviews yet for this piece</p>
              <p className="text-[11px] text-neutral-500 mt-0.5">
                Be the first to share your experience!
              </p>
            </div>
          ) : (
            reviews.map((rev) => (
              <div
                key={rev.id}
                className="bg-white p-5 rounded-2xl border border-neutral-200/80 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-rose-100 text-rose-900 flex items-center justify-center font-bold text-xs">
                      {rev.authorName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-neutral-900 flex items-center gap-1">
                        <span>{rev.authorName}</span>
                        <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200 font-semibold inline-flex items-center gap-0.5">
                          <CheckCircle className="w-2.5 h-2.5" /> Verified
                        </span>
                      </p>
                      <p className="text-[10px] text-neutral-400">
                        {new Date(rev.createdAt).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center text-amber-400">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`w-3.5 h-3.5 ${
                          star <= rev.rating ? "fill-amber-400 text-amber-400" : "text-neutral-200"
                        }`}
                      />
                    ))}
                  </div>
                </div>

                <p className="mt-3 text-xs text-neutral-700 leading-relaxed font-sans">
                  "{rev.comment}"
                </p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

