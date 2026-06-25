"use client";

import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { supabase } from "../lib/supabase";
import { Review, ReviewInput, ReviewStatus } from "../types";
import { useAuth } from "./AuthContext";

interface ReviewContextValue {
  approvedReviews: Review[];
  myReviews: Review[];
  adminReviews: Review[];
  loading: boolean;
  submitReview: (input: ReviewInput) => Promise<string | null>;
  updateMyReview: (id: string, rating: number, comment: string) => Promise<string | null>;
  deleteReview: (id: string) => Promise<string | null>;
  moderateReview: (
    id: string,
    status: Exclude<ReviewStatus, "pending">,
    note: string,
  ) => Promise<string | null>;
  refreshReviews: () => Promise<void>;
}

const ReviewContext = createContext<ReviewContextValue | undefined>(undefined);

function fromRow(row: Record<string, unknown>): Review {
  const product = row.products as { name?: string } | null;
  return {
    id: String(row.id),
    productId: String(row.product_id),
    productName: product?.name || "Design",
    userId: String(row.user_id),
    authorName: String(row.author_name || "Customer"),
    rating: Number(row.rating),
    comment: String(row.comment),
    status: row.status as ReviewStatus,
    moderationNote: row.moderation_note ? String(row.moderation_note) : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function friendlyReviewError(message: string) {
  if (message.includes("Review posting is disabled")) {
    return "Your account cannot submit or edit reviews. Check the private account notice in your dashboard.";
  }
  if (message.includes("Review rate limit reached")) {
    return "You have reached the review limit. Please wait 24 hours before submitting another review.";
  }
  if (message.toLowerCase().includes("row-level security")) {
    return "Your account is not permitted to perform this review action.";
  }
  return message;
}

export function ReviewProvider({ children }: { children: ReactNode }) {
  const { user, profile, isAdmin } = useAuth();
  const [approvedReviews, setApprovedReviews] = useState<Review[]>([]);
  const [myReviews, setMyReviews] = useState<Review[]>([]);
  const [adminReviews, setAdminReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshReviews = useCallback(async () => {
    setLoading(true);
    if (!supabase) {
      setApprovedReviews([]);
      setMyReviews([]);
      setAdminReviews([]);
      setLoading(false);
      return;
    }

    const approvedQuery = supabase
      .from("reviews")
      .select("*, products(name)")
      .eq("status", "approved")
      .order("created_at", { ascending: false });
    const mineQuery = user
      ? supabase
          .from("reviews")
          .select("*, products(name)")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
      : null;
    const adminQuery = isAdmin
      ? supabase
          .from("reviews")
          .select("*, products(name)")
          .order("created_at", { ascending: false })
      : null;

    const [approved, mine, all] = await Promise.all([approvedQuery, mineQuery, adminQuery]);
    setApprovedReviews((approved.data || []).map((row) => fromRow(row)));
    setMyReviews((mine?.data || []).map((row) => fromRow(row)));
    setAdminReviews((all?.data || []).map((row) => fromRow(row)));
    setLoading(false);
  }, [isAdmin, user]);

  useEffect(() => {
    void refreshReviews();
  }, [refreshReviews]);

  const submitReview = useCallback(
    async ({ productId, rating, comment }: ReviewInput) => {
      if (!supabase || !user || !profile) return "Please sign in before leaving a review.";
      if (!["active", "warned"].includes(profile.accountStatus)) {
        return "Your account cannot currently submit reviews. Check your dashboard notice.";
      }
      if (rating < 1 || rating > 5) return "Choose a rating from 1 to 5.";
      if (comment.trim().length < 10) return "Please write at least 10 characters.";

      const { error } = await supabase.from("reviews").insert({
        product_id: productId,
        user_id: user.id,
        rating,
        comment: comment.trim(),
      });
      if (error?.code === "23505") {
        return "You have already reviewed this design. Manage it from your dashboard.";
      }
      if (error) return friendlyReviewError(error.message);
      await refreshReviews();
      return null;
    },
    [profile, refreshReviews, user],
  );

  const updateMyReview = useCallback(
    async (id: string, rating: number, comment: string) => {
      if (!supabase || !user || !profile) return "Please sign in.";
      if (!["active", "warned"].includes(profile.accountStatus)) {
        return "Your account cannot currently edit reviews.";
      }
      if (comment.trim().length < 10) return "Please write at least 10 characters.";
      const { data, error } = await supabase
        .from("reviews")
        .update({
          rating,
          comment: comment.trim(),
          status: "pending",
          moderation_note: null,
        })
        .eq("id", id)
        .eq("user_id", user.id)
        .select("id")
        .maybeSingle();
      if (error) return friendlyReviewError(error.message);
      if (!data) return "Your account is not permitted to edit this review.";
      await refreshReviews();
      return null;
    },
    [profile, refreshReviews, user],
  );

  const deleteReview = useCallback(
    async (id: string) => {
      if (!supabase || !user) return "Please sign in.";
      const { error } = await supabase.from("reviews").delete().eq("id", id);
      if (error) return error.message;
      await refreshReviews();
      return null;
    },
    [refreshReviews, user],
  );

  const moderateReview = useCallback(
    async (id: string, status: "approved" | "rejected", note: string) => {
      if (!supabase || !isAdmin) return "Administrator access is required.";
      const { error } = await supabase
        .from("reviews")
        .update({ status, moderation_note: note.trim() || null })
        .eq("id", id);
      if (error) return error.message;
      await refreshReviews();
      return null;
    },
    [isAdmin, refreshReviews],
  );

  const value = useMemo(
    () => ({
      approvedReviews,
      myReviews,
      adminReviews,
      loading,
      submitReview,
      updateMyReview,
      deleteReview,
      moderateReview,
      refreshReviews,
    }),
    [
      adminReviews,
      approvedReviews,
      deleteReview,
      loading,
      moderateReview,
      myReviews,
      refreshReviews,
      submitReview,
      updateMyReview,
    ],
  );

  return <ReviewContext.Provider value={value}>{children}</ReviewContext.Provider>;
}

export function useReviews() {
  const context = useContext(ReviewContext);
  if (!context) throw new Error("useReviews must be used inside ReviewProvider");
  return context;
}
