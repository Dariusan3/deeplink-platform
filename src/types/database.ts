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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      ab_tests: {
        Row: {
          id: string
          team_id: string
          name: string
          slug: string
          status: string
          variant_a_name: string
          variant_a_url: string
          variant_a_visits: number
          variant_a_conversions: number
          variant_b_name: string
          variant_b_url: string
          variant_b_visits: number
          variant_b_conversions: number
          auto_optimize: boolean
          min_conversions: number
          threshold_percent: number
          winner: string | null
          winner_selected_at: string | null
          variant_a_revenue: number
          variant_b_revenue: number
          cost_per_click: number
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          team_id: string
          name: string
          slug: string
          status?: string
          variant_a_name?: string
          variant_a_url: string
          variant_a_visits?: number
          variant_a_conversions?: number
          variant_b_name?: string
          variant_b_url: string
          variant_b_visits?: number
          variant_b_conversions?: number
          auto_optimize?: boolean
          min_conversions?: number
          threshold_percent?: number
          winner?: string | null
          winner_selected_at?: string | null
          variant_a_revenue?: number
          variant_b_revenue?: number
          cost_per_click?: number
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          team_id?: string
          name?: string
          slug?: string
          status?: string
          variant_a_name?: string
          variant_a_url?: string
          variant_a_visits?: number
          variant_a_conversions?: number
          variant_b_name?: string
          variant_b_url?: string
          variant_b_visits?: number
          variant_b_conversions?: number
          auto_optimize?: boolean
          min_conversions?: number
          threshold_percent?: number
          winner?: string | null
          winner_selected_at?: string | null
          variant_a_revenue?: number
          variant_b_revenue?: number
          cost_per_click?: number
          created_by?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ab_tests_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ab_tests_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      ab_test_events: {
        Row: {
          id: string
          test_id: string
          variant: string
          event_type: string
          revenue: number | null
          ip_address: string | null
          user_agent: string | null
          country: string | null
          device_type: string | null
          created_at: string
        }
        Insert: {
          id?: string
          test_id: string
          variant: string
          event_type: string
          revenue?: number | null
          ip_address?: string | null
          user_agent?: string | null
          country?: string | null
          device_type?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          test_id?: string
          variant?: string
          event_type?: string
          revenue?: number | null
          ip_address?: string | null
          user_agent?: string | null
          country?: string | null
          device_type?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ab_test_events_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "ab_tests"
            referencedColumns: ["id"]
          },
        ]
      }
      brain_chats: {
        Row: {
          created_at: string
          id: string
          messages: Json
          team_id: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          messages?: Json
          team_id: string
          title?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          messages?: Json
          team_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "brain_chats_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      business_brain: {
        Row: {
          content: Json | null
          created_at: string
          id: string
          team_id: string
          title: string | null
          updated_at: string
        }
        Insert: {
          content?: Json | null
          created_at?: string
          id?: string
          team_id: string
          title?: string | null
          updated_at?: string
        }
        Update: {
          content?: Json | null
          created_at?: string
          id?: string
          team_id?: string
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_brain_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      collections: {
        Row: {
          id: string
          team_id: string
          name: string
          description: string | null
          color: string | null
          click_goal: number | null
          click_goal_period: string | null
          created_at: string
          created_by: string
        }
        Insert: {
          id?: string
          team_id: string
          name: string
          description?: string | null
          color?: string | null
          click_goal?: number | null
          click_goal_period?: string | null
          created_at?: string
          created_by: string
        }
        Update: {
          id?: string
          team_id?: string
          name?: string
          description?: string | null
          color?: string | null
          click_goal?: number | null
          click_goal_period?: string | null
          created_at?: string
          created_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "collections_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collections_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      ig_integrations: {
        Row: {
          access_token: string
          created_at: string
          id: string
          ig_user_id: string
          ig_username: string | null
          is_active: boolean | null
          team_id: string
          token_expires_at: string | null
        }
        Insert: {
          access_token: string
          created_at?: string
          id?: string
          ig_user_id: string
          ig_username?: string | null
          is_active?: boolean | null
          team_id: string
          token_expires_at?: string | null
        }
        Update: {
          access_token?: string
          created_at?: string
          id?: string
          ig_user_id?: string
          ig_username?: string | null
          is_active?: boolean | null
          team_id?: string
          token_expires_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ig_integrations_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      link_clicks: {
        Row: {
          city: string | null
          clicked_at: string
          country: string | null
          device_type: string | null
          id: string
          ip_address: unknown
          link_id: string
          matched_rule_index: number | null
          referer: string | null
          user_agent: string | null
        }
        Insert: {
          city?: string | null
          clicked_at?: string
          country?: string | null
          device_type?: string | null
          id?: string
          ip_address?: unknown
          link_id: string
          matched_rule_index?: number | null
          referer?: string | null
          user_agent?: string | null
        }
        Update: {
          city?: string | null
          clicked_at?: string
          country?: string | null
          device_type?: string | null
          id?: string
          ip_address?: unknown
          link_id?: string
          matched_rule_index?: number | null
          referer?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "link_clicks_link_id_fkey"
            columns: ["link_id"]
            isOneToOne: false
            referencedRelation: "links"
            referencedColumns: ["id"]
          },
        ]
      }
      links: {
        Row: {
          click_goal: number | null
          click_goal_period: string | null
          collection_id: string | null
          created_at: string
          created_by: string
          destination_url: string
          id: string
          is_active: boolean | null
          redirect_rules: Json | null
          slug: string
          team_id: string
          title: string | null
          updated_at: string
        }
        Insert: {
          click_goal?: number | null
          click_goal_period?: string | null
          collection_id?: string | null
          created_at?: string
          created_by: string
          destination_url: string
          id?: string
          is_active?: boolean | null
          redirect_rules?: Json | null
          slug: string
          team_id: string
          title?: string | null
          updated_at?: string
        }
        Update: {
          click_goal?: number | null
          click_goal_period?: string | null
          collection_id?: string | null
          created_at?: string
          created_by?: string
          destination_url?: string
          id?: string
          is_active?: boolean | null
          redirect_rules?: Json | null
          slug?: string
          team_id?: string
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "links_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "links_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_members: {
        Row: {
          id: string
          joined_at: string
          role: string
          team_id: string
          user_id: string
        }
        Insert: {
          id?: string
          joined_at?: string
          role: string
          team_id: string
          user_id: string
        }
        Update: {
          id?: string
          joined_at?: string
          role?: string
          team_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          created_at: string
          created_by: string
          id: string
          name: string
          plan: string
          slug: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          name: string
          plan?: string
          slug: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          name?: string
          plan?: string
          slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "teams_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      team_settings: {
        Row: {
          id: string
          team_id: string
          show_link_creation_confirmation: boolean
          timezone: string
          default_domain: string
          show_app_tap_to_continue: boolean
          show_branding: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          team_id: string
          show_link_creation_confirmation?: boolean
          timezone?: string
          default_domain?: string
          show_app_tap_to_continue?: boolean
          show_branding?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          team_id?: string
          show_link_creation_confirmation?: boolean
          timezone?: string
          default_domain?: string
          show_app_tap_to_continue?: boolean
          show_branding?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_settings_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: true
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      api_keys: {
        Row: {
          id: string
          team_id: string
          user_id: string
          name: string
          key_hash: string
          key_prefix: string
          last_used_at: string | null
          expires_at: string | null
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          team_id: string
          user_id: string
          name?: string
          key_hash: string
          key_prefix: string
          last_used_at?: string | null
          expires_at?: string | null
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          team_id?: string
          user_id?: string
          name?: string
          key_hash?: string
          key_prefix?: string
          last_used_at?: string | null
          expires_at?: string | null
          is_active?: boolean
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "api_keys_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "api_keys_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      weekly_reports: {
        Row: {
          created_at: string
          id: string
          period_end: string
          period_start: string
          report_data: Json | null
          team_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          period_end: string
          period_start: string
          report_data?: Json | null
          team_id: string
        }
        Update: {
          created_at?: string
          id?: string
          period_end?: string
          period_start?: string
          report_data?: Json | null
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "weekly_reports_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliates: {
        Row: {
          id: string
          user_id: string
          referral_code: string
          total_earnings: number
          paid_earnings: number
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          referral_code: string
          total_earnings?: number
          paid_earnings?: number
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          referral_code?: string
          total_earnings?: number
          paid_earnings?: number
          is_active?: boolean
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "affiliates_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliate_referrals: {
        Row: {
          id: string
          referrer_id: string
          referred_user_id: string | null
          referred_email: string
          status: string
          plan: string | null
          plan_price: number
          commission_rate: number
          created_at: string
          activated_at: string | null
          churned_at: string | null
        }
        Insert: {
          id?: string
          referrer_id: string
          referred_user_id?: string | null
          referred_email: string
          status?: string
          plan?: string | null
          plan_price?: number
          commission_rate?: number
          created_at?: string
          activated_at?: string | null
          churned_at?: string | null
        }
        Update: {
          id?: string
          referrer_id?: string
          referred_user_id?: string | null
          referred_email?: string
          status?: string
          plan?: string | null
          plan_price?: number
          commission_rate?: number
          created_at?: string
          activated_at?: string | null
          churned_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_referrals_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "affiliates"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliate_payouts: {
        Row: {
          id: string
          affiliate_id: string
          amount: number
          status: string
          period_start: string
          period_end: string
          created_at: string
          paid_at: string | null
        }
        Insert: {
          id?: string
          affiliate_id: string
          amount: number
          status?: string
          period_start: string
          period_end: string
          created_at?: string
          paid_at?: string | null
        }
        Update: {
          id?: string
          affiliate_id?: string
          amount?: number
          status?: string
          period_start?: string
          period_end?: string
          created_at?: string
          paid_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_payouts_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliates"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_team_role: {
        Args: { team_uuid: string; user_uuid: string }
        Returns: string
      }
      is_team_member: {
        Args: { team_uuid: string; user_uuid: string }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
