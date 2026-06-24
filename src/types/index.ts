export type UserRole = "user" | "admin";
export type ReviewStatus = "pending" | "approved" | "rejected";

export interface Profile {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  createdAt?: string;
}

export interface Design {
  id: string;
  name: string;
  slug: string;
  category: string;
  price: number;
  fabric: string;
  description: string;
  tags: string[];
  images: string[];
  featured: boolean;
  available: boolean;
  color: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Review {
  id: string;
  productId: string;
  productName: string;
  userId: string;
  authorName: string;
  rating: number;
  comment: string;
  status: ReviewStatus;
  moderationNote: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ReviewInput {
  productId: string;
  rating: number;
  comment: string;
}

export type Category =
  | "All"
  | "Lehenga"
  | "Anarkali"
  | "Saree"
  | "Gown"
  | "Sharara"
  | "Kurti";
