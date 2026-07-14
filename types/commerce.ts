import type {
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
} from "@/types/database";

export interface Category {
  id: string;
  name: string;
  slug: string;
  isSystem: boolean;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  fabric: string;
  sizes: string[];
  stock: number;
  price: number;
  discount: number;
  images: string[];
  category: Category;
  isFeatured: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface StoreSettings {
  shippingCharge: number;
  codEnabled: boolean;
  taxRate: number;
  developerSupportNumber: string;
  designerSupportNumber: string;
}

export interface HomepageSlide {
  id: string;
  title: string;
  eyebrow: string | null;
  description: string | null;
  imageUrl: string;
  linkUrl: string;
  ctaLabel: string;
  sortOrder: number;
  startsAt: string | null;
  endsAt: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type PromoCodeType = "coupon" | "voucher";
export type PromoDiscountType = "percentage" | "fixed_amount";

export interface CheckoutPromoQuote {
  promoCodeId: string;
  code: string;
  codeType: PromoCodeType;
  discountType: PromoDiscountType;
  discountAmount: number;
  discountedSubtotal: number;
  message: string;
}

export interface CartItem {
  key: string;
  productId: string;
  slug: string;
  name: string;
  image: string;
  size: string;
  quantity: number;
  unitPrice: number;
  stock: number;
}

export interface CheckoutCustomer {
  customerName: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  landmark?: string;
  email?: string;
}

export interface CustomerProfile {
  id: string;
  email: string;
  fullName: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  landmark: string;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerAccountUser {
  id: string;
  email: string;
}

export interface CustomerAccountData {
  user: CustomerAccountUser | null;
  profile: CustomerProfile | null;
  orders: OrderSummary[];
}

export interface OrderItemSummary {
  id: string;
  productId: string;
  productName: string;
  selectedSize: string;
  quantity: number;
  priceAtTime: number;
  lineTotal: number;
}

export interface OrderSummary {
  id: string;
  orderNumber: string;
  customerName: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  landmark: string | null;
  email: string | null;
  subtotal: number;
  discountAmount: number;
  promoCode: string | null;
  shippingFee: number;
  taxAmount: number;
  total: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
  items: OrderItemSummary[];
}

export interface TrackingResult {
  orderId: string;
  orderNumber: string;
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
}
