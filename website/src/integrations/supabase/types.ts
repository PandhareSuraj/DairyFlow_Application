export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      audit_log: {
        Row: {
          created_at: string
          id: string
          new_data: Json | null
          old_data: Json | null
          operation: string
          table_name: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          operation: string
          table_name: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          operation?: string
          table_name?: string
          user_id?: string | null
        }
        Relationships: []
      }
      customer_subscriptions: {
        Row: {
          created_at: string
          customer_id: string
          dairy_id: string
          days_of_week: string[] | null
          delivery_time: string | null
          end_date: string | null
          frequency: string
          id: string
          next_delivery_date: string
          product_id: string
          quantity: number
          special_instructions: string | null
          start_date: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          dairy_id: string
          days_of_week?: string[] | null
          delivery_time?: string | null
          end_date?: string | null
          frequency: string
          id?: string
          next_delivery_date: string
          product_id: string
          quantity: number
          special_instructions?: string | null
          start_date: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          dairy_id?: string
          days_of_week?: string[] | null
          delivery_time?: string | null
          end_date?: string | null
          frequency?: string
          id?: string
          next_delivery_date?: string
          product_id?: string
          quantity?: number
          special_instructions?: string | null
          start_date?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_customer_subscriptions_customer"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_customer_subscriptions_dairy"
            columns: ["dairy_id"]
            isOneToOne: false
            referencedRelation: "dairies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_customer_subscriptions_product"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          address: string
          anniversary_date: string | null
          area: string | null
          birthday: string | null
          created_at: string
          dairy_id: string
          email: string | null
          id: string
          latitude: number | null
          location_notes: string | null
          longitude: number | null
          loyalty_points: number
          name: string
          phone: string
          preferred_language: string | null
          referral_code: string | null
          status: string
          tier: Database["public"]["Enums"]["loyalty_tier"]
          updated_at: string
        }
        Insert: {
          address: string
          anniversary_date?: string | null
          area?: string | null
          birthday?: string | null
          created_at?: string
          dairy_id: string
          email?: string | null
          id?: string
          latitude?: number | null
          location_notes?: string | null
          longitude?: number | null
          loyalty_points?: number
          name: string
          phone: string
          preferred_language?: string | null
          referral_code?: string | null
          status?: string
          tier?: Database["public"]["Enums"]["loyalty_tier"]
          updated_at?: string
        }
        Update: {
          address?: string
          anniversary_date?: string | null
          area?: string | null
          birthday?: string | null
          created_at?: string
          dairy_id?: string
          email?: string | null
          id?: string
          latitude?: number | null
          location_notes?: string | null
          longitude?: number | null
          loyalty_points?: number
          name?: string
          phone?: string
          preferred_language?: string | null
          referral_code?: string | null
          status?: string
          tier?: Database["public"]["Enums"]["loyalty_tier"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customers_dairy_id_fkey"
            columns: ["dairy_id"]
            isOneToOne: false
            referencedRelation: "dairies"
            referencedColumns: ["id"]
          },
        ]
      }
      dairies: {
        Row: {
          address: string
          created_at: string
          description: string | null
          id: string
          name: string
          owner_email: string | null
          owner_name: string
          owner_phone: string
          updated_at: string
        }
        Insert: {
          address: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          owner_email?: string | null
          owner_name: string
          owner_phone: string
          updated_at?: string
        }
        Update: {
          address?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          owner_email?: string | null
          owner_name?: string
          owner_phone?: string
          updated_at?: string
        }
        Relationships: []
      }
      delivery_boys: {
        Row: {
          address: string | null
          created_at: string
          dairy_id: string
          email: string | null
          id: string
          name: string
          phone: string
          status: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          dairy_id: string
          email?: string | null
          id?: string
          name: string
          phone: string
          status?: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          dairy_id?: string
          email?: string | null
          id?: string
          name?: string
          phone?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "delivery_boys_dairy_id_fkey"
            columns: ["dairy_id"]
            isOneToOne: false
            referencedRelation: "dairies"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_ratings: {
        Row: {
          created_at: string
          customer_id: string
          dairy_id: string
          delivery_feedback: string | null
          delivery_rating: number
          id: string
          order_id: string
          product_feedback: string | null
          product_rating: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          dairy_id: string
          delivery_feedback?: string | null
          delivery_rating: number
          id?: string
          order_id: string
          product_feedback?: string | null
          product_rating: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          dairy_id?: string
          delivery_feedback?: string | null
          delivery_rating?: number
          id?: string
          order_id?: string
          product_feedback?: string | null
          product_rating?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "delivery_ratings_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_ratings_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          action_label: string | null
          action_path: string | null
          category: string
          created_at: string
          id: string
          message: string
          read: boolean
          sent_push: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          action_label?: string | null
          action_path?: string | null
          category?: string
          created_at?: string
          id?: string
          message: string
          read?: boolean
          sent_push?: boolean
          title: string
          type?: string
          user_id: string
        }
        Update: {
          action_label?: string | null
          action_path?: string | null
          category?: string
          created_at?: string
          id?: string
          message?: string
          read?: boolean
          sent_push?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      orders: {
        Row: {
          created_at: string
          customer_id: string
          dairy_id: string
          delivery_boy_id: string | null
          delivery_date: string
          delivery_time: string | null
          discount_applied: number | null
          id: string
          order_type: string
          points_earned: number | null
          points_redeemed: number | null
          price: number
          product_id: string
          quantity: number
          special_instructions: string | null
          status: string
          total_price: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          dairy_id: string
          delivery_boy_id?: string | null
          delivery_date: string
          delivery_time?: string | null
          discount_applied?: number | null
          id?: string
          order_type?: string
          points_earned?: number | null
          points_redeemed?: number | null
          price: number
          product_id: string
          quantity: number
          special_instructions?: string | null
          status?: string
          total_price: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          dairy_id?: string
          delivery_boy_id?: string | null
          delivery_date?: string
          delivery_time?: string | null
          discount_applied?: number | null
          id?: string
          order_type?: string
          points_earned?: number | null
          points_redeemed?: number | null
          price?: number
          product_id?: string
          quantity?: number
          special_instructions?: string | null
          status?: string
          total_price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_orders_customer"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_orders_dairy"
            columns: ["dairy_id"]
            isOneToOne: false
            referencedRelation: "dairies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_orders_delivery_boy"
            columns: ["delivery_boy_id"]
            isOneToOne: false
            referencedRelation: "delivery_boys"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_orders_product"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      points_transactions: {
        Row: {
          balance_after: number
          created_at: string
          customer_id: string
          description: string | null
          id: string
          order_id: string | null
          points: number
          transaction_type: string
        }
        Insert: {
          balance_after: number
          created_at?: string
          customer_id: string
          description?: string | null
          id?: string
          order_id?: string | null
          points: number
          transaction_type: string
        }
        Update: {
          balance_after?: number
          created_at?: string
          customer_id?: string
          description?: string | null
          id?: string
          order_id?: string | null
          points?: number
          transaction_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "points_transactions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "points_transactions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category: string
          created_at: string
          dairy_id: string
          description: string | null
          id: string
          name: string
          price: number
          stock_quantity: number
          unit: string
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          dairy_id: string
          description?: string | null
          id?: string
          name: string
          price: number
          stock_quantity?: number
          unit: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          dairy_id?: string
          description?: string | null
          id?: string
          name?: string
          price?: number
          stock_quantity?: number
          unit?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_dairy_id_fkey"
            columns: ["dairy_id"]
            isOneToOne: false
            referencedRelation: "dairies"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          address: string | null
          created_at: string
          dairy_id: string | null
          email: string | null
          id: string
          name: string
          onboarding_completed: boolean | null
          phone: string | null
          preferred_language: string | null
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
          username: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          dairy_id?: string | null
          email?: string | null
          id: string
          name: string
          onboarding_completed?: boolean | null
          phone?: string | null
          preferred_language?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          username: string
        }
        Update: {
          address?: string | null
          created_at?: string
          dairy_id?: string | null
          email?: string | null
          id?: string
          name?: string
          onboarding_completed?: boolean | null
          phone?: string | null
          preferred_language?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          username?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_dairy_id_fkey"
            columns: ["dairy_id"]
            isOneToOne: false
            referencedRelation: "dairies"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          device_info: string | null
          endpoint: string
          id: string
          p256dh: string
          updated_at: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          device_info?: string | null
          endpoint: string
          id?: string
          p256dh: string
          updated_at?: string
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          device_info?: string | null
          endpoint?: string
          id?: string
          p256dh?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      referrals: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          points_awarded: number | null
          referred_customer_id: string
          referrer_customer_id: string
          status: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: string
          points_awarded?: number | null
          referred_customer_id: string
          referrer_customer_id: string
          status?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          points_awarded?: number | null
          referred_customer_id?: string
          referrer_customer_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "referrals_referred_customer_id_fkey"
            columns: ["referred_customer_id"]
            isOneToOne: true
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_referrer_customer_id_fkey"
            columns: ["referrer_customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      reward_history: {
        Row: {
          awarded_at: string
          created_at: string
          customer_id: string
          id: string
          points_awarded: number
          reward_type: string
          reward_year: number
          tier: string
        }
        Insert: {
          awarded_at?: string
          created_at?: string
          customer_id: string
          id?: string
          points_awarded: number
          reward_type: string
          reward_year: number
          tier: string
        }
        Update: {
          awarded_at?: string
          created_at?: string
          customer_id?: string
          id?: string
          points_awarded?: number
          reward_type?: string
          reward_year?: number
          tier?: string
        }
        Relationships: [
          {
            foreignKeyName: "reward_history_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      system_settings: {
        Row: {
          created_at: string
          google_maps_api_key: string | null
          id: string
          singleton_lock: boolean | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          google_maps_api_key?: string | null
          id?: string
          singleton_lock?: boolean | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          google_maps_api_key?: string | null
          id?: string
          singleton_lock?: boolean | null
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          dairy_id: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          dairy_id?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          dairy_id?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_dairy_id_fkey"
            columns: ["dairy_id"]
            isOneToOne: false
            referencedRelation: "dairies"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_customer_tier: {
        Args: { points: number }
        Returns: Database["public"]["Enums"]["loyalty_tier"]
      }
      get_user_dairy_id: { Args: { user_id: string }; Returns: string }
      get_user_role: {
        Args: { user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      is_super_admin: { Args: { user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "super_admin" | "dairy_owner" | "delivery_boy" | "customer"
      loyalty_tier: "bronze" | "silver" | "gold" | "platinum"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["super_admin", "dairy_owner", "delivery_boy", "customer"],
      loyalty_tier: ["bronze", "silver", "gold", "platinum"],
    },
  },
} as const
