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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      app_settings: {
        Row: {
          assistant_enabled: boolean
          bank_transfer_enabled: boolean
          cod_enabled: boolean
          gateway_label: string
          gst_percent: number
          id: number
          online_gateway_enabled: boolean
          store_name: string
          support_phone: string
          updated_at: string
        }
        Insert: {
          assistant_enabled?: boolean
          bank_transfer_enabled?: boolean
          cod_enabled?: boolean
          gateway_label?: string
          gst_percent?: number
          id?: number
          online_gateway_enabled?: boolean
          store_name?: string
          support_phone?: string
          updated_at?: string
        }
        Update: {
          assistant_enabled?: boolean
          bank_transfer_enabled?: boolean
          cod_enabled?: boolean
          gateway_label?: string
          gst_percent?: number
          id?: number
          online_gateway_enabled?: boolean
          store_name?: string
          support_phone?: string
          updated_at?: string
        }
        Relationships: []
      }
      banners: {
        Row: {
          badge_text: string
          created_at: string
          id: string
          image_url: string | null
          is_active: boolean
          kind: string
          link_url: string
          sort_order: number
          subtitle: string
          title: string
        }
        Insert: {
          badge_text?: string
          created_at?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          kind?: string
          link_url?: string
          sort_order?: number
          subtitle?: string
          title: string
        }
        Update: {
          badge_text?: string
          created_at?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          kind?: string
          link_url?: string
          sort_order?: number
          subtitle?: string
          title?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string
          id: string
          image_url: string | null
          name: string
          slug: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          id?: string
          image_url?: string | null
          name: string
          slug: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string | null
          name?: string
          slug?: string
          sort_order?: number
        }
        Relationships: []
      }
      order_items: {
        Row: {
          id: string
          line_total: number
          order_id: string
          product_id: string | null
          product_name: string
          quantity: number
          sku: string
          unit_price: number
        }
        Insert: {
          id?: string
          line_total: number
          order_id: string
          product_id?: string | null
          product_name: string
          quantity: number
          sku: string
          unit_price: number
        }
        Update: {
          id?: string
          line_total?: number
          order_id?: string
          product_id?: string | null
          product_name?: string
          quantity?: number
          sku?: string
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          created_at: string
          gst_amount: number
          gstin: string
          id: string
          notes: string
          order_no: number
          payment_method: string
          payment_status: string
          role_at_order: Database["public"]["Enums"]["app_role"]
          ship_address: string
          ship_city: string
          ship_name: string
          ship_phone: string
          ship_pincode: string
          status: string
          subtotal: number
          total: number
          user_id: string
        }
        Insert: {
          created_at?: string
          gst_amount?: number
          gstin?: string
          id?: string
          notes?: string
          order_no?: never
          payment_method: string
          payment_status?: string
          role_at_order: Database["public"]["Enums"]["app_role"]
          ship_address: string
          ship_city: string
          ship_name: string
          ship_phone: string
          ship_pincode: string
          status?: string
          subtotal?: number
          total?: number
          user_id: string
        }
        Update: {
          created_at?: string
          gst_amount?: number
          gstin?: string
          id?: string
          notes?: string
          order_no?: never
          payment_method?: string
          payment_status?: string
          role_at_order?: Database["public"]["Enums"]["app_role"]
          ship_address?: string
          ship_city?: string
          ship_name?: string
          ship_phone?: string
          ship_pincode?: string
          status?: string
          subtotal?: number
          total?: number
          user_id?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          brand: string
          category_id: string | null
          created_at: string
          dealer_moq: number
          description: string
          id: string
          image_url: string | null
          is_active: boolean
          is_featured: boolean
          name: string
          retail_price: number
          retailer_moq: number
          sku: string
          slug: string
          specs: Json
          stock: number
          unit: string
          updated_at: string
          wholesale_price: number
        }
        Insert: {
          brand?: string
          category_id?: string | null
          created_at?: string
          dealer_moq?: number
          description?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_featured?: boolean
          name: string
          retail_price?: number
          retailer_moq?: number
          sku: string
          slug: string
          specs?: Json
          stock?: number
          unit?: string
          updated_at?: string
          wholesale_price?: number
        }
        Update: {
          brand?: string
          category_id?: string | null
          created_at?: string
          dealer_moq?: number
          description?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_featured?: boolean
          name?: string
          retail_price?: number
          retailer_moq?: number
          sku?: string
          slug?: string
          specs?: Json
          stock?: number
          unit?: string
          updated_at?: string
          wholesale_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          business_name: string
          city: string
          created_at: string
          email: string | null
          full_name: string
          gstin: string
          id: string
          phone: string
          updated_at: string
        }
        Insert: {
          business_name?: string
          city?: string
          created_at?: string
          email?: string | null
          full_name?: string
          gstin?: string
          id: string
          phone?: string
          updated_at?: string
        }
        Update: {
          business_name?: string
          city?: string
          created_at?: string
          email?: string | null
          full_name?: string
          gstin?: string
          id?: string
          phone?: string
          updated_at?: string
        }
        Relationships: []
      }
      sponsored_ads: {
        Row: {
          body: string
          created_at: string
          cta_label: string
          headline: string
          id: string
          image_url: string | null
          is_active: boolean
          link_url: string
          sort_order: number
          sponsor_name: string
        }
        Insert: {
          body?: string
          created_at?: string
          cta_label?: string
          headline: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          link_url?: string
          sort_order?: number
          sponsor_name: string
        }
        Update: {
          body?: string
          created_at?: string
          cta_label?: string
          headline?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          link_url?: string
          sort_order?: number
          sponsor_name?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_exists: { Args: never; Returns: boolean }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      place_b2b_order: {
        Args: { p_items: Json; p_payment_method: string; p_shipping: Json }
        Returns: Json
      }
      set_user_role: {
        Args: {
          p_role: Database["public"]["Enums"]["app_role"]
          p_user: string
        }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "dealer" | "retailer"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["admin", "dealer", "retailer"],
    },
  },
} as const
