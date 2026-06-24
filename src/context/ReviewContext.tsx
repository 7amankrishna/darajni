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
import { useCatalog } from "./CatalogContext";

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
const DEMO_REVIEWS_KEY = "darjana_demo_reviews";

function fromRow(row: Record<string, unknown>): Review {
  const product = row.products as { name?: string } | null;
  return {
    id: String(row.id),
    productId: String(row.product_id),
    productName: product?.name || String(row.product_name || "Design"),
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

function readDemoReviews(): Review[] {
  try {
    return JSON.parse(localStorage.getItem(DEMO_REVIEWS_KEY) || "[]") as Review[];
  } catch {
    return [];
  }
}

export function ReviewProvider({ children }: { children: ReactNode }) {
  const { user, profile, isAdmin } = useAuth();
  const { designs } = useCatalog();
  const [approvedReviews, setApprovedReviews] = useState<Review[]>([]);
  const [myReviews, setMyReviews] = useState<Review[]>([]);
  const [adminReviews, setAdminReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshReviews = useCallback(async () => {
    setLoading(true);
    if (!supabase) {
      const all = readDemoReviews();
      setApprovedReviews(all.filter((review) => review.status === "approved"));
      setMyReviews(user ? all.filter((review) => review.userId === user.id) : []);
      setAdminReviews(isAdmin ? all : []);
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

    const [approved, mine, all] = await Promise.all([
      approvedQuery,
      mineQuery,
      adminQuery,
    ]);
    setApprovedReviews((approved.data || []).map((row) => fromRow(row)));
    setMyReviews((mine?.data || []).map((row) => fromRow(row)));
    setAdminReviews((all?.data || []).map((row) => fromRow(row)));
    setLoading(false);
  }, [isAdmin, user]);

  useEffect(() => {
    void refreshReviews();
  }, [refreshReviews]);

  const writeDemo = (reviews: Review[]) => {
    localStorage.setItem(DEMO_REVIEWS_KEY, JSON.stringify(reviews));
    void refreshReviews();
  };

  const submitReview = useCallback(
    async ({ productId, rating, comment }: ReviewInput) => {
      if (!user || !profile) return "Please sign in before leaving a review.";
      if (rating < 1 || rating > 5) return "Choose a rating from 1 to 5.";
      if (comment.trim().length < 10) return "Please write at least 10 characters.";

      if (!supabase) {
        const current = readDemoReviews();
        if (current.some((review) => review.userId === user.id && review.productId === productId)) {
          return "You have already reviewed this design. Manage it from your dashboard.";
        }
        const productName = designs.find((design) => design.id === productId)?.name || "Design";
        writeDemo([
          {
            id: crypto.randomUUID(),
            productId,
            productName,
            userId: user.id,
            authorName: profile.fullName,
            rating,
            comment: comment.trim(),
            status: "pending",
            moderationNote: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          ...current,
        ]);
        return null;
      }

      const { error } = await supabase.from("reviews").insert({
        product_id: productId,
        user_id: user.id,
        rating,
        comment: comment.trim(),
      });
      if (error?.code === "23505") {
        return "You have already reviewed this design. Manage it from your dashboard.";
      }
      if (error) return error.message;
      await refreshReviews();
      return null;
    },
    [designs, profile, refreshReviews, user],
  );

  const updateMyReview = useCallback(
    async (id: string, rating: number, comment: string) => {
      if (!user) return "Please sign in.";
      if (comment.trim().length < 10) return "Please write at least 10 characters.";
      if (!supabase) {
        writeDemo(
          readDemoReviews().map((review) =>
            review.id === id && review.userId === user.id
              ? {
                  ...review,
                  rating,
                  comment: comment.trim(),
                  status: "pending",
                  moderationNote: null,
                  updatedAt: new Date().toISOString(),
                }
              : review,
          ),
        );
        return null;
      }
      const { error } = await supabase
        .from("reviews")
        .update({
          rating,
          comment: comment.trim(),
          status: "pending",
          moderation_note: null,
        })
        .eq("id", id)
        .eq("user_id", user.id);
      if (error) return error.message;
      await refreshReviews();
      return null;
    },
    [refreshReviews, user],
  );

  const deleteReview = useCallback(
    async (id: string) => {
      if (!user) return "Please sign in.";
      if (!supabase) {
        writeDemo(
          readDemoReviews().filter(
            (review) => review.id !== id || (!isAdmin && review.userId !== user.id),
          ),
        );
        return null;
      }
      const { error } = await supabase.from("reviews").delete().eq("id", id);
      if (error) return error.message;
      await refreshReviews();
      return null;
    },
    [isAdmin, refreshReviews, user],
  );

  const moderateReview = useCallback(
    async (id: string, status: "approved" | "rejected", note: string) => {
      if (!isAdmin) return "Administrator access is required.";
      if (!supabase) {
        writeDemo(
          readDemoReviews().map((review) =>
            review.id === id
              ? {
                  ...review,
                  status,
                  moderationNote: note.trim() || null,
                  updatedAt: new Date().toISOString(),
                }
              : review,
          ),
        );
        return null;
      }
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
