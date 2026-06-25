export type UserRole = "user" | "admin";
export type ReviewStatus = "pending" | "approved" | "rejected";
export type AccountStatus = "active" | "warned" | "restricted" | "blocked";

export interface Profile {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  phone: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  postalCode: string;
  accountStatus: AccountStatus;
  moderationMessage: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProfileInput {
  fullName: string;
  phone: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  postalCode: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  isSystem: boolean;
  createdAt: string;
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
