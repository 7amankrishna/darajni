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
export type PromoCodeType = "coupon" | "voucher";
export type PromoDiscountType = "percentage" | "fixed_amount";

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
      customer_profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string;
          phone: string;
          address: string;
          city: string;
          state: string;
          pincode: string;
          landmark: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email?: string;
          full_name?: string;
          phone?: string;
          address?: string;
          city?: string;
          state?: string;
          pincode?: string;
          landmark?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["customer_profiles"]["Insert"]>;
      };
      orders: {
        Row: {
          id: string;
          order_number: string;
          customer_id: string | null;
          customer_name: string;
          phone: string;
          address: string;
          city: string;
          state: string;
          pincode: string;
          landmark: string | null;
          email: string | null;
          subtotal: number;
          discount_amount: number;
          promo_code_id: string | null;
          promo_code: string | null;
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
          customer_id?: string | null;
          customer_name: string;
          phone: string;
          address: string;
          city: string;
          state: string;
          pincode: string;
          landmark?: string | null;
          email?: string | null;
          subtotal: number;
          discount_amount?: number;
          promo_code_id?: string | null;
          promo_code?: string | null;
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
      promo_codes: {
        Row: {
          id: string;
          code: string;
          title: string;
          description: string | null;
          code_type: PromoCodeType;
          discount_type: PromoDiscountType;
          discount_value: number;
          minimum_subtotal: number;
          maximum_discount: number | null;
          usage_limit: number | null;
          per_phone_limit: number;
          starts_at: string | null;
          ends_at: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          code: string;
          title: string;
          description?: string | null;
          code_type?: PromoCodeType;
          discount_type: PromoDiscountType;
          discount_value: number;
          minimum_subtotal?: number;
          maximum_discount?: number | null;
          usage_limit?: number | null;
          per_phone_limit?: number;
          starts_at?: string | null;
          ends_at?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["promo_codes"]["Insert"]>;
      };
      promo_redemptions: {
        Row: {
          id: string;
          promo_code_id: string;
          order_id: string | null;
          order_number: string;
          phone_last10: string;
          subtotal_at_time: number;
          discount_amount: number;
          redeemed_at: string;
        };
        Insert: {
          id?: string;
          promo_code_id: string;
          order_id?: string | null;
          order_number: string;
          phone_last10: string;
          subtotal_at_time: number;
          discount_amount: number;
          redeemed_at?: string;
        };
        Update: never;
      };
      homepage_slides: {
        Row: {
          id: string;
          title: string;
          eyebrow: string | null;
          description: string | null;
          image_url: string;
          link_url: string;
          cta_label: string;
          sort_order: number;
          starts_at: string | null;
          ends_at: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          eyebrow?: string | null;
          description?: string | null;
          image_url: string;
          link_url?: string;
          cta_label?: string;
          sort_order?: number;
          starts_at?: string | null;
          ends_at?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["homepage_slides"]["Insert"]>;
      };
      requested_dresses: {
        Row: {
          id: string;
          image_url: string;
          storage_path: string;
          description: string | null;
          status: "pending" | "published" | "hidden" | "rejected";
          consented_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          image_url: string;
          storage_path: string;
          description?: string | null;
          status?: "pending" | "published" | "hidden" | "rejected";
          consented_at: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["requested_dresses"]["Insert"]>;
      };
      requested_dress_comments: {
        Row: {
          id: string;
          requested_dress_id: string;
          comment_text: string;
          status: "pending" | "approved" | "rejected";
          created_at: string;
        };
        Insert: {
          id?: string;
          requested_dress_id: string;
          comment_text: string;
          status?: "pending" | "approved" | "rejected";
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["requested_dress_comments"]["Insert"]>;
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
      create_checkout_order: {
        Args: {
          p_customer: Json;
          p_items: Json;
          p_payment_method: PaymentMethod;
          p_promo_code?: string | null;
        };
        Returns: {
          order_id: string;
          order_number: string;
          subtotal: number;
          discount_amount: number;
          promo_code: string | null;
          shipping_fee: number;
          tax_amount: number;
          total: number;
          status: OrderStatus;
        }[];
      };
      quote_checkout_discount: {
        Args: {
          p_promo_code: string;
          p_items: Json;
          p_phone?: string | null;
        };
        Returns: {
          promo_code_id: string;
          code: string;
          code_type: PromoCodeType;
          discount_type: PromoDiscountType;
          discount_amount: number;
          discounted_subtotal: number;
          message: string;
        }[];
      };
      run_store_maintenance: {
        Args: Record<PropertyKey, never>;
        Returns: {
          archived_orders: number;
          deleted_archives: number;
          cancelled_expired_razorpay: number;
        }[];
      };
      cancel_order_reservation: {
        Args: {
          p_order_id: string;
          p_payment_failed?: boolean;
        };
        Returns: undefined;
      };
      confirm_razorpay_payment: {
        Args: {
          p_order_id: string;
          p_razorpay_order_id: string;
          p_razorpay_payment_id: string;
        };
        Returns: string;
      };
    };
    Enums: {
      order_status: OrderStatus;
      payment_method: PaymentMethod;
      payment_status: PaymentStatus;
      promo_code_type: PromoCodeType;
      promo_discount_type: PromoDiscountType;
    };
    CompositeTypes: Record<string, never>;
  };
}
