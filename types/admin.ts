import type {
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
} from "@/types/database";
import type { Category, Product, StoreSettings } from "@/types/commerce";

export interface AdminOrderItem {
  id: string;
  productId: string;
  productName: string;
  selectedSize: string;
  quantity: number;
  priceAtTime: number;
  lineTotal: number;
}

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
  shippingFee: number;
  taxAmount: number;
  total: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
  items: AdminOrderItem[];
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

export interface AdminDashboardData {
  orders: AdminOrder[];
  products: Product[];
  categories: Category[];
  settings: StoreSettings;
  analytics: AnalyticsSummary;
}
