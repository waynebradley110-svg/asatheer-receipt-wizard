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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      analytics_snapshots: {
        Row: {
          active_members: number | null
          cafe_revenue: number | null
          card_revenue: number | null
          cash_revenue: number | null
          churn_count: number | null
          created_at: string
          expired_members: number | null
          football_revenue: number | null
          id: string
          massage_revenue: number | null
          new_members: number | null
          peak_hour: number | null
          pt_revenue: number | null
          retention_rate: number | null
          snapshot_date: string
          snapshot_type: string
          total_attendance: number | null
          total_members: number | null
          total_revenue: number | null
        }
        Insert: {
          active_members?: number | null
          cafe_revenue?: number | null
          card_revenue?: number | null
          cash_revenue?: number | null
          churn_count?: number | null
          created_at?: string
          expired_members?: number | null
          football_revenue?: number | null
          id?: string
          massage_revenue?: number | null
          new_members?: number | null
          peak_hour?: number | null
          pt_revenue?: number | null
          retention_rate?: number | null
          snapshot_date?: string
          snapshot_type?: string
          total_attendance?: number | null
          total_members?: number | null
          total_revenue?: number | null
        }
        Update: {
          active_members?: number | null
          cafe_revenue?: number | null
          card_revenue?: number | null
          cash_revenue?: number | null
          churn_count?: number | null
          created_at?: string
          expired_members?: number | null
          football_revenue?: number | null
          id?: string
          massage_revenue?: number | null
          new_members?: number | null
          peak_hour?: number | null
          pt_revenue?: number | null
          retention_rate?: number | null
          snapshot_date?: string
          snapshot_type?: string
          total_attendance?: number | null
          total_members?: number | null
          total_revenue?: number | null
        }
        Relationships: []
      }
      attendance: {
        Row: {
          check_in_time: string
          created_at: string | null
          id: string
          member_id: string
          status: string | null
          zone: Database["public"]["Enums"]["zone_type"] | null
        }
        Insert: {
          check_in_time?: string
          created_at?: string | null
          id?: string
          member_id: string
          status?: string | null
          zone?: Database["public"]["Enums"]["zone_type"] | null
        }
        Update: {
          check_in_time?: string
          created_at?: string | null
          id?: string
          member_id?: string
          status?: string | null
          zone?: Database["public"]["Enums"]["zone_type"] | null
        }
        Relationships: [
          {
            foreignKeyName: "attendance_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      cafe_sales: {
        Row: {
          amount: number
          card_amount: number | null
          cash_amount: number | null
          cashier_name: string | null
          created_at: string | null
          created_by: string | null
          id: string
          item_description: string
          notes: string | null
          payment_method: string
          sale_date: string
        }
        Insert: {
          amount: number
          card_amount?: number | null
          cash_amount?: number | null
          cashier_name?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          item_description: string
          notes?: string | null
          payment_method: string
          sale_date?: string
        }
        Update: {
          amount?: number
          card_amount?: number | null
          cash_amount?: number | null
          cashier_name?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          item_description?: string
          notes?: string | null
          payment_method?: string
          sale_date?: string
        }
        Relationships: []
      }
      coaches: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      deleted_members_log: {
        Row: {
          deleted_at: string | null
          deleted_by: string | null
          id: string
          member_data: Json
          original_member_id: string
        }
        Insert: {
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          member_data: Json
          original_member_id: string
        }
        Update: {
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          member_data?: Json
          original_member_id?: string
        }
        Relationships: []
      }
      event_registrations: {
        Row: {
          age_group: string | null
          amount: number
          created_at: string | null
          created_by: string | null
          current_registrations: number | null
          event_date: string | null
          event_name: string
          event_time: string | null
          event_type: string
          id: string
          max_capacity: number | null
          member_id: string | null
          notes: string | null
          participant_email: string | null
          participant_name: string
          participant_phone: string
          payment_method: Database["public"]["Enums"]["payment_method"]
          payment_status: string | null
          updated_at: string | null
          venue: string | null
        }
        Insert: {
          age_group?: string | null
          amount: number
          created_at?: string | null
          created_by?: string | null
          current_registrations?: number | null
          event_date?: string | null
          event_name: string
          event_time?: string | null
          event_type: string
          id?: string
          max_capacity?: number | null
          member_id?: string | null
          notes?: string | null
          participant_email?: string | null
          participant_name: string
          participant_phone: string
          payment_method: Database["public"]["Enums"]["payment_method"]
          payment_status?: string | null
          updated_at?: string | null
          venue?: string | null
        }
        Update: {
          age_group?: string | null
          amount?: number
          created_at?: string | null
          created_by?: string | null
          current_registrations?: number | null
          event_date?: string | null
          event_name?: string
          event_time?: string | null
          event_type?: string
          id?: string
          max_capacity?: number | null
          member_id?: string | null
          notes?: string | null
          participant_email?: string | null
          participant_name?: string
          participant_phone?: string
          payment_method?: Database["public"]["Enums"]["payment_method"]
          payment_status?: string | null
          updated_at?: string | null
          venue?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_registrations_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          category: Database["public"]["Enums"]["expense_category"]
          created_at: string | null
          created_by: string | null
          description: string
          expense_date: string
          id: string
          notes: string | null
          receipt_url: string | null
          updated_at: string | null
        }
        Insert: {
          amount: number
          category: Database["public"]["Enums"]["expense_category"]
          created_at?: string | null
          created_by?: string | null
          description: string
          expense_date?: string
          id?: string
          notes?: string | null
          receipt_url?: string | null
          updated_at?: string | null
        }
        Update: {
          amount?: number
          category?: Database["public"]["Enums"]["expense_category"]
          created_at?: string | null
          created_by?: string | null
          description?: string
          expense_date?: string
          id?: string
          notes?: string | null
          receipt_url?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      financial_audit_trail: {
        Row: {
          action_by: string
          action_type: string
          description: string | null
          id: string
          record_id: string | null
          table_name: string
          timestamp: string | null
        }
        Insert: {
          action_by: string
          action_type: string
          description?: string | null
          id?: string
          record_id?: string | null
          table_name: string
          timestamp?: string | null
        }
        Update: {
          action_by?: string
          action_type?: string
          description?: string | null
          id?: string
          record_id?: string | null
          table_name?: string
          timestamp?: string | null
        }
        Relationships: []
      }
      football_sales: {
        Row: {
          card_amount: number
          cash_amount: number
          cashier_name: string | null
          created_at: string | null
          created_by: string | null
          description: string
          id: string
          notes: string | null
          sale_date: string
          total_amount: number | null
        }
        Insert: {
          card_amount?: number
          cash_amount?: number
          cashier_name?: string | null
          created_at?: string | null
          created_by?: string | null
          description: string
          id?: string
          notes?: string | null
          sale_date?: string
          total_amount?: number | null
        }
        Update: {
          card_amount?: number
          cash_amount?: number
          cashier_name?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string
          id?: string
          notes?: string | null
          sale_date?: string
          total_amount?: number | null
        }
        Relationships: []
      }
      massage_sales: {
        Row: {
          amount: number
          card_amount: number
          cash_amount: number
          cashier_name: string | null
          created_at: string | null
          created_by: string | null
          customer_name: string
          id: string
          notes: string | null
          sale_date: string
        }
        Insert: {
          amount: number
          card_amount?: number
          cash_amount?: number
          cashier_name?: string | null
          created_at?: string | null
          created_by?: string | null
          customer_name: string
          id?: string
          notes?: string | null
          sale_date?: string
        }
        Update: {
          amount?: number
          card_amount?: number
          cash_amount?: number
          cashier_name?: string | null
          created_at?: string | null
          created_by?: string | null
          customer_name?: string
          id?: string
          notes?: string | null
          sale_date?: string
        }
        Relationships: []
      }
      member_services: {
        Row: {
          coach_name: string | null
          created_at: string | null
          expiry_date: string
          freeze_status: string | null
          id: string
          is_active: boolean | null
          member_id: string
          notes: string | null
          start_date: string
          subscription_plan: Database["public"]["Enums"]["subscription_plan"]
          zone: Database["public"]["Enums"]["zone_type"]
        }
        Insert: {
          coach_name?: string | null
          created_at?: string | null
          expiry_date: string
          freeze_status?: string | null
          id?: string
          is_active?: boolean | null
          member_id: string
          notes?: string | null
          start_date: string
          subscription_plan: Database["public"]["Enums"]["subscription_plan"]
          zone: Database["public"]["Enums"]["zone_type"]
        }
        Update: {
          coach_name?: string | null
          created_at?: string | null
          expiry_date?: string
          freeze_status?: string | null
          id?: string
          is_active?: boolean | null
          member_id?: string
          notes?: string | null
          start_date?: string
          subscription_plan?: Database["public"]["Enums"]["subscription_plan"]
          zone?: Database["public"]["Enums"]["zone_type"]
        }
        Relationships: [
          {
            foreignKeyName: "member_services_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      members: {
        Row: {
          barcode: string
          created_at: string | null
          date_of_birth: string | null
          full_name: string
          gender: Database["public"]["Enums"]["gender_type"]
          id: string
          member_id: string
          notes: string | null
          phone_number: string
          updated_at: string | null
        }
        Insert: {
          barcode: string
          created_at?: string | null
          date_of_birth?: string | null
          full_name: string
          gender: Database["public"]["Enums"]["gender_type"]
          id?: string
          member_id: string
          notes?: string | null
          phone_number: string
          updated_at?: string | null
        }
        Update: {
          barcode?: string
          created_at?: string | null
          date_of_birth?: string | null
          full_name?: string
          gender?: Database["public"]["Enums"]["gender_type"]
          id?: string
          member_id?: string
          notes?: string | null
          phone_number?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      membership_freezes: {
        Row: {
          action_type: string
          created_at: string | null
          created_by: string | null
          freeze_end: string | null
          freeze_start: string
          id: string
          member_id: string
          notes: string | null
          reason: string | null
          resumed_at: string | null
          resumed_by: string | null
          service_id: string
          status: string | null
        }
        Insert: {
          action_type: string
          created_at?: string | null
          created_by?: string | null
          freeze_end?: string | null
          freeze_start: string
          id?: string
          member_id: string
          notes?: string | null
          reason?: string | null
          resumed_at?: string | null
          resumed_by?: string | null
          service_id: string
          status?: string | null
        }
        Update: {
          action_type?: string
          created_at?: string | null
          created_by?: string | null
          freeze_end?: string | null
          freeze_start?: string
          id?: string
          member_id?: string
          notes?: string | null
          reason?: string | null
          resumed_at?: string | null
          resumed_by?: string | null
          service_id?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "membership_freezes_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "membership_freezes_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "member_services"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_queue: {
        Row: {
          channel: string
          created_at: string
          error_message: string | null
          id: string
          member_id: string | null
          message: string
          notification_type: string
          recipient: string
          retry_count: number | null
          scheduled_at: string
          sent_at: string | null
          status: string | null
          subject: string | null
          template_id: string | null
          variables: Json | null
        }
        Insert: {
          channel?: string
          created_at?: string
          error_message?: string | null
          id?: string
          member_id?: string | null
          message: string
          notification_type: string
          recipient: string
          retry_count?: number | null
          scheduled_at?: string
          sent_at?: string | null
          status?: string | null
          subject?: string | null
          template_id?: string | null
          variables?: Json | null
        }
        Update: {
          channel?: string
          created_at?: string
          error_message?: string | null
          id?: string
          member_id?: string | null
          message?: string
          notification_type?: string
          recipient?: string
          retry_count?: number | null
          scheduled_at?: string
          sent_at?: string | null
          status?: string | null
          subject?: string | null
          template_id?: string | null
          variables?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "notification_queue_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_queue_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "notification_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_settings: {
        Row: {
          description: string | null
          id: string
          setting_key: string
          setting_value: Json
          updated_at: string
        }
        Insert: {
          description?: string | null
          id?: string
          setting_key: string
          setting_value: Json
          updated_at?: string
        }
        Update: {
          description?: string | null
          id?: string
          setting_key?: string
          setting_value?: Json
          updated_at?: string
        }
        Relationships: []
      }
      notification_templates: {
        Row: {
          channels: string[] | null
          created_at: string
          id: string
          is_active: boolean | null
          message_template: string
          name: string
          subject: string | null
          trigger_days: number[] | null
          type: string
          updated_at: string
        }
        Insert: {
          channels?: string[] | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          message_template: string
          name: string
          subject?: string | null
          trigger_days?: number[] | null
          type: string
          updated_at?: string
        }
        Update: {
          channels?: string[] | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          message_template?: string
          name?: string
          subject?: string | null
          trigger_days?: number[] | null
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string | null
          id: string
          is_read: boolean | null
          member_id: string | null
          message: string
          title: string
          type: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          member_id?: string | null
          message: string
          title: string
          type: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          member_id?: string | null
          message?: string
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_receipts: {
        Row: {
          amount: number
          cashier_name: string | null
          created_at: string | null
          id: string
          member_id: string
          payment_method: Database["public"]["Enums"]["payment_method"]
          receipt_pdf_url: string | null
          subscription_plan: Database["public"]["Enums"]["subscription_plan"]
          transaction_id: string | null
          zone: Database["public"]["Enums"]["zone_type"]
        }
        Insert: {
          amount: number
          cashier_name?: string | null
          created_at?: string | null
          id?: string
          member_id: string
          payment_method: Database["public"]["Enums"]["payment_method"]
          receipt_pdf_url?: string | null
          subscription_plan: Database["public"]["Enums"]["subscription_plan"]
          transaction_id?: string | null
          zone: Database["public"]["Enums"]["zone_type"]
        }
        Update: {
          amount?: number
          cashier_name?: string | null
          created_at?: string | null
          id?: string
          member_id?: string
          payment_method?: Database["public"]["Enums"]["payment_method"]
          receipt_pdf_url?: string | null
          subscription_plan?: Database["public"]["Enums"]["subscription_plan"]
          transaction_id?: string | null
          zone?: Database["public"]["Enums"]["zone_type"]
        }
        Relationships: [
          {
            foreignKeyName: "payment_receipts_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      whatsapp_receipt_logs: {
        Row: {
          created_at: string | null
          error_message: string | null
          id: string
          member_id: string
          pdf_url: string | null
          phone: string
          retry_count: number | null
          sent_at: string | null
          status: string | null
          whatsapp_sender: string | null
        }
        Insert: {
          created_at?: string | null
          error_message?: string | null
          id?: string
          member_id: string
          pdf_url?: string | null
          phone: string
          retry_count?: number | null
          sent_at?: string | null
          status?: string | null
          whatsapp_sender?: string | null
        }
        Update: {
          created_at?: string | null
          error_message?: string | null
          id?: string
          member_id?: string
          pdf_url?: string | null
          phone?: string
          retry_count?: number | null
          sent_at?: string | null
          status?: string | null
          whatsapp_sender?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_receipt_logs_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_roles: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"][]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "receptionist" | "accounts"
      expense_category: "business" | "owner"
      gender_type: "male" | "female"
      payment_method: "cash" | "card" | "online"
      subscription_plan:
        | "1_day"
        | "1_month"
        | "3_months"
        | "6_months"
        | "1_year"
        | "2_months"
      zone_type:
        | "gym"
        | "crossfit"
        | "football"
        | "football_student"
        | "swimming"
        | "other"
        | "ladies_gym"
        | "pt"
        | "football_court"
        | "paddle_court"
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
      app_role: ["admin", "receptionist", "accounts"],
      expense_category: ["business", "owner"],
      gender_type: ["male", "female"],
      payment_method: ["cash", "card", "online"],
      subscription_plan: [
        "1_day",
        "1_month",
        "3_months",
        "6_months",
        "1_year",
        "2_months",
      ],
      zone_type: [
        "gym",
        "crossfit",
        "football",
        "football_student",
        "swimming",
        "other",
        "ladies_gym",
        "pt",
        "football_court",
        "paddle_court",
      ],
    },
  },
} as const
