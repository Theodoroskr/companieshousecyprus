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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      companies: {
        Row: {
          a4a_code: string | null
          address_full: string | null
          building: string | null
          district_el: string | null
          district_en: string | null
          is_foreign_address: boolean | null
          locality: string | null
          name: string
          official_no: string | null
          officials_count: number | null
          postcode: string | null
          reg_number: number
          registration_date: string | null
          report_years: number[] | null
          slug: string
          status_date: string | null
          status_el: string | null
          status_en: string | null
          status_group: string
          street: string | null
          subtype_el: string | null
          subtype_en: string | null
          type_code: string
          type_el: string | null
          type_en: string | null
          updated_at: string | null
        }
        Insert: {
          a4a_code?: string | null
          address_full?: string | null
          building?: string | null
          district_el?: string | null
          district_en?: string | null
          is_foreign_address?: boolean | null
          locality?: string | null
          name: string
          official_no?: string | null
          officials_count?: number | null
          postcode?: string | null
          reg_number: number
          registration_date?: string | null
          report_years?: number[] | null
          slug: string
          status_date?: string | null
          status_el?: string | null
          status_en?: string | null
          status_group: string
          street?: string | null
          subtype_el?: string | null
          subtype_en?: string | null
          type_code: string
          type_el?: string | null
          type_en?: string | null
          updated_at?: string | null
        }
        Update: {
          a4a_code?: string | null
          address_full?: string | null
          building?: string | null
          district_el?: string | null
          district_en?: string | null
          is_foreign_address?: boolean | null
          locality?: string | null
          name?: string
          official_no?: string | null
          officials_count?: number | null
          postcode?: string | null
          reg_number?: number
          registration_date?: string | null
          report_years?: number[] | null
          slug?: string
          status_date?: string | null
          status_el?: string | null
          status_en?: string | null
          status_group?: string
          street?: string | null
          subtype_el?: string | null
          subtype_en?: string | null
          type_code?: string
          type_el?: string | null
          type_en?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      import_runs: {
        Row: {
          created_at: string
          created_by: string | null
          filename: string | null
          finished_at: string | null
          id: string
          kind: string
          message: string | null
          mode: string
          rows_failed: number
          rows_processed: number
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          filename?: string | null
          finished_at?: string | null
          id?: string
          kind: string
          message?: string | null
          mode?: string
          rows_failed?: number
          rows_processed?: number
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          filename?: string | null
          finished_at?: string | null
          id?: string
          kind?: string
          message?: string | null
          mode?: string
          rows_failed?: number
          rows_processed?: number
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      job_state: {
        Row: {
          key: string
          last_error: string | null
          last_run_at: string | null
          locked_until: string | null
          paused: boolean
          updated_at: string
        }
        Insert: {
          key: string
          last_error?: string | null
          last_run_at?: string | null
          locked_until?: string | null
          paused?: boolean
          updated_at?: string
        }
        Update: {
          key?: string
          last_error?: string | null
          last_run_at?: string | null
          locked_until?: string | null
          paused?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      officials: {
        Row: {
          id: number
          person_name: string
          position_el: string | null
          position_en: string | null
          slug: string
        }
        Insert: {
          id?: number
          person_name: string
          position_el?: string | null
          position_en?: string | null
          slug: string
        }
        Update: {
          id?: number
          person_name?: string
          position_el?: string | null
          position_en?: string | null
          slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "officials_slug_fkey"
            columns: ["slug"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["slug"]
          },
        ]
      }
      order_documents: {
        Row: {
          content_type: string | null
          created_at: string
          id: string
          name: string
          order_id: string
          order_item_id: string
          path: string
          size_bytes: number
        }
        Insert: {
          content_type?: string | null
          created_at?: string
          id?: string
          name: string
          order_id: string
          order_item_id: string
          path: string
          size_bytes?: number
        }
        Update: {
          content_type?: string | null
          created_at?: string
          id?: string
          name?: string
          order_id?: string
          order_item_id?: string
          path?: string
          size_bytes?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_documents_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_documents_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "order_items"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          a4a_attempts: number
          a4a_code: string | null
          a4a_kind: string | null
          a4a_next_attempt_at: string | null
          a4a_reference: string | null
          company_name: string | null
          company_number: string | null
          company_slug: string | null
          created_at: string
          delivered_at: string | null
          document_name: string | null
          document_path: string | null
          document_price_cents: number
          document_size: number | null
          due_date: string | null
          fulfilment_message: string | null
          fulfilment_status: string
          id: string
          order_id: string
          product_name: string
          product_slug: string
          quantity: number
          report_json: Json | null
          service_fee_cents: number
          total_cents: number
          vat_cents: number
        }
        Insert: {
          a4a_attempts?: number
          a4a_code?: string | null
          a4a_kind?: string | null
          a4a_next_attempt_at?: string | null
          a4a_reference?: string | null
          company_name?: string | null
          company_number?: string | null
          company_slug?: string | null
          created_at?: string
          delivered_at?: string | null
          document_name?: string | null
          document_path?: string | null
          document_price_cents?: number
          document_size?: number | null
          due_date?: string | null
          fulfilment_message?: string | null
          fulfilment_status?: string
          id?: string
          order_id: string
          product_name: string
          product_slug: string
          quantity?: number
          report_json?: Json | null
          service_fee_cents?: number
          total_cents?: number
          vat_cents?: number
        }
        Update: {
          a4a_attempts?: number
          a4a_code?: string | null
          a4a_kind?: string | null
          a4a_next_attempt_at?: string | null
          a4a_reference?: string | null
          company_name?: string | null
          company_number?: string | null
          company_slug?: string | null
          created_at?: string
          delivered_at?: string | null
          document_name?: string | null
          document_path?: string | null
          document_price_cents?: number
          document_size?: number | null
          due_date?: string | null
          fulfilment_message?: string | null
          fulfilment_status?: string
          id?: string
          order_id?: string
          product_name?: string
          product_slug?: string
          quantity?: number
          report_json?: Json | null
          service_fee_cents?: number
          total_cents?: number
          vat_cents?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          access_token: string
          checkout_url: string | null
          created_at: string
          delivered_at: string | null
          due_date: string | null
          email: string
          firm: string | null
          full_name: string
          id: string
          notes: string | null
          paid_at: string | null
          payment_order_id: string | null
          payment_provider: string | null
          payment_state: string | null
          phone: string | null
          reference: string
          service_fee_cents: number
          status: string
          subtotal_cents: number
          total_cents: number
          updated_at: string
          user_id: string | null
          vat_cents: number
          vat_number: string | null
        }
        Insert: {
          access_token: string
          checkout_url?: string | null
          created_at?: string
          delivered_at?: string | null
          due_date?: string | null
          email: string
          firm?: string | null
          full_name: string
          id?: string
          notes?: string | null
          paid_at?: string | null
          payment_order_id?: string | null
          payment_provider?: string | null
          payment_state?: string | null
          phone?: string | null
          reference: string
          service_fee_cents?: number
          status?: string
          subtotal_cents?: number
          total_cents?: number
          updated_at?: string
          user_id?: string | null
          vat_cents?: number
          vat_number?: string | null
        }
        Update: {
          access_token?: string
          checkout_url?: string | null
          created_at?: string
          delivered_at?: string | null
          due_date?: string | null
          email?: string
          firm?: string | null
          full_name?: string
          id?: string
          notes?: string | null
          paid_at?: string | null
          payment_order_id?: string | null
          payment_provider?: string | null
          payment_state?: string | null
          phone?: string | null
          reference?: string
          service_fee_cents?: number
          status?: string
          subtotal_cents?: number
          total_cents?: number
          updated_at?: string
          user_id?: string | null
          vat_cents?: number
          vat_number?: string | null
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
      clear_officials: { Args: never; Returns: undefined }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      refresh_officials_count: { Args: never; Returns: number }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user" | "client"
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
      app_role: ["admin", "moderator", "user", "client"],
    },
  },
} as const
