export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type OrderStatus =
  | "pending"
  | "confirmed"
  | "packed"
  | "shipped"
  | "delivered"
  | "cancelled";

export type PaymentMethod = "cod" | "razorpay";
export type PaymentStatus = "pending" | "paid" | "failed" | "refunded";

export interface Database {
  public: {
    Tables: {
      admin_users: {
        Row: {
          id: string;
          created_at: string;
        };
        Insert: {
          id: string;
          created_at?: string;
        };
        Update: never;
      };
      categories: {
        Row: {
          id: string;
          name: string;
          slug: string;
          is_system: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          is_system?: boolean;
          created_at?: string;
        };
        Update: {
          name?: string;
          slug?: string;
          is_system?: boolean;
        };
      };
      products: {
        Row: {
          id: string;
          name: string;
          slug: string;
          description: string;
          fabric: string;
          size: string[];
          stock: number;
          price: number;
          discount: number;
          images: string[];
          category_id: string;
          is_featured: boolean;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          description: string;
          fabric: string;
          size?: string[];
          stock?: number;
          price: number;
          discount?: number;
          images: string[];
          category_id: string;
          is_featured?: boolean;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["products"]["Insert"]>;
      };
      orders: {
        Row: {
          id: string;
          order_number: string;
          customer_name: string;
          phone: string;
          address: string;
          city: string;
          state: string;
          pincode: string;
          landmark: string | null;
          email: string | null;
          subtotal: number;
          total: number;
          shipping_fee: number;
          tax_amount: number;
          payment_method: PaymentMethod;
          payment_status: PaymentStatus;
          razorpay_order_id: string | null;
          razorpay_payment_id: string | null;
          status: OrderStatus;
          delivered_at: string | null;
          cancelled_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          order_number?: string;
          customer_name: string;
          phone: string;
          address: string;
          city: string;
          state: string;
          pincode: string;
          landmark?: string | null;
          email?: string | null;
          subtotal: number;
          total: number;
          shipping_fee?: number;
          tax_amount?: number;
          payment_method: PaymentMethod;
          payment_status?: PaymentStatus;
          razorpay_order_id?: string | null;
          razorpay_payment_id?: string | null;
          status?: OrderStatus;
          delivered_at?: string | null;
          cancelled_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["orders"]["Insert"]>;
      };
      order_items: {
        Row: {
          id: string;
          order_id: string;
          product_id: string;
          product_name_at_time: string;
          selected_size: string;
          quantity: number;
          price_at_time: number;
          line_total: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          product_id: string;
          product_name_at_time: string;
          selected_size: string;
          quantity: number;
          price_at_time: number;
          created_at?: string;
        };
        Update: never;
      };
      archived_orders: {
        Row: {
          id: string;
          original_order_id: string;
          customer_name: string;
          phone: string;
          total: number;
          date_archived: string;
        };
        Insert: {
          id?: string;
          original_order_id: string;
          customer_name: string;
          phone: string;
          total: number;
          date_archived?: string;
        };
        Update: never;
      };
      settings: {
        Row: {
          id: boolean;
          shipping_charge: number;
          cod_enabled: boolean;
          tax_rate: number;
          developer_support_number: string;
          designer_support_number: string;
          updated_at: string;
        };
        Insert: {
          id?: boolean;
          shipping_charge?: number;
          cod_enabled?: boolean;
          tax_rate?: number;
          developer_support_number?: string;
          designer_support_number?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["settings"]["Insert"]>;
      };
    };
    Views: Record<string, never>;
    Functions: {
      is_admin: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
      track_order: {
        Args: {
          p_order_reference: string;
          p_phone: string;
        };
        Returns: {
          order_id: string;
          order_number: string;
          status: OrderStatus;
          created_at: string;
          updated_at: string;
        }[];
      };
    };
    Enums: {
      order_status: OrderStatus;
      payment_method: PaymentMethod;
      payment_status: PaymentStatus;
    };
    CompositeTypes: Record<string, never>;
  };
}
