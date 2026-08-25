import type {
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  PromoCodeType,
  PromoDiscountType,
} from "@/types/database";
import type {
  Category,
  HomepageSlide,
  EventBanner,
  Product,
  StoreSettings,
} from "@/types/commerce";

export interface AdminOrderItem {
  id: string;
  productId: string;
  productName: string;
  selectedSize: string;
  quantity: number;
  priceAtTime: number;
  lineTotal: number;
}

export type OrderDeliverabilityStatus =
  | "unverified"
  | "serviceable"
  | "cod_unavailable"
  | "not_serviceable";

export interface AdminOrder {
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
  deliverabilityStatus: OrderDeliverabilityStatus;
  deliverabilityDays: number | null;
  createdAt: string;
  updatedAt: string;
  items: AdminOrderItem[];
}

export interface AdminPromoCode {
  id: string;
  code: string;
  title: string;
  description: string | null;
  codeType: PromoCodeType;
  discountType: PromoDiscountType;
  discountValue: number;
  minimumSubtotal: number;
  maximumDiscount: number | null;
  usageLimit: number | null;
  perPhoneLimit: number;
  startsAt: string | null;
  endsAt: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  redemptionCount: number;
  redeemedAmount: number;
}

export interface AnalyticsSummary {
  dailyOrders: number;
  weeklyOrders: number;
  dailyRevenue: number;
  weeklyRevenue: number;
  activeOrders: number;
  lowStock: Product[];
  topProducts: Array<{
    productId: string;
    name: string;
    quantity: number;
    revenue: number;
  }>;
}

export interface AdminRequestedDress {
  id: string;
  imageUrl: string;
  storagePath: string;
  description: string | null;
  status: "pending" | "published" | "hidden" | "rejected";
  consentedAt: string;
  createdAt: string;
  userId?: string | null;
  userName?: string | null;
  userEmail?: string | null;
  userPhone?: string | null;
}

export interface AdminDressComment {
  id: string;
  requestedDressId: string;
  commentText: string;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
}

export interface AdminDashboardData {
  orders: AdminOrder[];
  products: Product[];
  categories: Category[];
  promos: AdminPromoCode[];
  homepageSlides: HomepageSlide[];
  eventBanners: EventBanner[];
  settings: StoreSettings;
  analytics: AnalyticsSummary;
  requestedDresses: AdminRequestedDress[];
  dressComments: AdminDressComment[];
}
