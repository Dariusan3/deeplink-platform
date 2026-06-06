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
      ab_test_events: {
        Row: {
          country: string | null
          created_at: string
          device_type: string | null
          event_type: string
          id: string
          ip_address: unknown
          revenue: number | null
          test_id: string
          user_agent: string | null
          variant: string
        }
        Insert: {
          country?: string | null
          created_at?: string
          device_type?: string | null
          event_type: string
          id?: string
          ip_address?: unknown
          revenue?: number | null
          test_id: string
          user_agent?: string | null
          variant: string
        }
        Update: {
          country?: string | null
          created_at?: string
          device_type?: string | null
          event_type?: string
          id?: string
          ip_address?: unknown
          revenue?: number | null
          test_id?: string
          user_agent?: string | null
          variant?: string
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
      ab_tests: {
        Row: {
          auto_optimize: boolean
          cost_per_click: number
          created_at: string
          created_by: string
          id: string
          min_conversions: number
          name: string
          slug: string
          status: string
          team_id: string
          threshold_percent: number
          updated_at: string
          variant_a_conversions: number
          variant_a_name: string
          variant_a_revenue: number
          variant_a_url: string
          variant_a_visits: number
          variant_b_conversions: number
          variant_b_name: string
          variant_b_revenue: number
          variant_b_url: string
          variant_b_visits: number
          winner: string | null
          winner_selected_at: string | null
        }
        Insert: {
          auto_optimize?: boolean
          cost_per_click?: number
          created_at?: string
          created_by: string
          id?: string
          min_conversions?: number
          name: string
          slug: string
          status?: string
          team_id: string
          threshold_percent?: number
          updated_at?: string
          variant_a_conversions?: number
          variant_a_name?: string
          variant_a_revenue?: number
          variant_a_url: string
          variant_a_visits?: number
          variant_b_conversions?: number
          variant_b_name?: string
          variant_b_revenue?: number
          variant_b_url: string
          variant_b_visits?: number
          winner?: string | null
          winner_selected_at?: string | null
        }
        Update: {
          auto_optimize?: boolean
          cost_per_click?: number
          created_at?: string
          created_by?: string
          id?: string
          min_conversions?: number
          name?: string
          slug?: string
          status?: string
          team_id?: string
          threshold_percent?: number
          updated_at?: string
          variant_a_conversions?: number
          variant_a_name?: string
          variant_a_revenue?: number
          variant_a_url?: string
          variant_a_visits?: number
          variant_b_conversions?: number
          variant_b_name?: string
          variant_b_revenue?: number
          variant_b_url?: string
          variant_b_visits?: number
          winner?: string | null
          winner_selected_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ab_tests_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ab_tests_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliate_payouts: {
        Row: {
          affiliate_id: string
          amount: number
          created_at: string
          id: string
          paid_at: string | null
          period_end: string
          period_start: string
          status: string
        }
        Insert: {
          affiliate_id: string
          amount: number
          created_at?: string
          id?: string
          paid_at?: string | null
          period_end: string
          period_start: string
          status?: string
        }
        Update: {
          affiliate_id?: string
          amount?: number
          created_at?: string
          id?: string
          paid_at?: string | null
          period_end?: string
          period_start?: string
          status?: string
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
      affiliate_referrals: {
        Row: {
          activated_at: string | null
          churned_at: string | null
          commission_rate: number
          created_at: string
          id: string
          plan: string | null
          plan_price: number
          referred_email: string
          referred_user_id: string | null
          referrer_id: string
          status: string
        }
        Insert: {
          activated_at?: string | null
          churned_at?: string | null
          commission_rate?: number
          created_at?: string
          id?: string
          plan?: string | null
          plan_price?: number
          referred_email: string
          referred_user_id?: string | null
          referrer_id: string
          status?: string
        }
        Update: {
          activated_at?: string | null
          churned_at?: string | null
          commission_rate?: number
          created_at?: string
          id?: string
          plan?: string | null
          plan_price?: number
          referred_email?: string
          referred_user_id?: string | null
          referrer_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_referrals_referred_user_id_fkey"
            columns: ["referred_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_referrals_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "affiliates"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliates: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          paid_earnings: number
          pyramid_joined_at: string | null
          pyramid_position: number | null
          referral_code: string
          total_earnings: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          paid_earnings?: number
          pyramid_joined_at?: string | null
          pyramid_position?: number | null
          referral_code: string
          total_earnings?: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          paid_earnings?: number
          pyramid_joined_at?: string | null
          pyramid_position?: number | null
          referral_code?: string
          total_earnings?: number
          user_id?: string
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
      anomaly_alerts: {
        Row: {
          acknowledged_at: string | null
          action: string | null
          affected_link: string | null
          alert_type: string | null
          change_percent: number | null
          created_at: string
          dedup_key: string | null
          description: string
          emailed: boolean
          id: string
          is_dismissed: boolean
          is_read: boolean
          metadata: Json | null
          re_verified_after_ack: boolean
          root_cause: string | null
          severity: string
          team_id: string
          title: string
        }
        Insert: {
          acknowledged_at?: string | null
          action?: string | null
          affected_link?: string | null
          alert_type?: string | null
          change_percent?: number | null
          created_at?: string
          dedup_key?: string | null
          description: string
          emailed?: boolean
          id?: string
          is_dismissed?: boolean
          is_read?: boolean
          metadata?: Json | null
          re_verified_after_ack?: boolean
          root_cause?: string | null
          severity: string
          team_id: string
          title: string
        }
        Update: {
          acknowledged_at?: string | null
          action?: string | null
          affected_link?: string | null
          alert_type?: string | null
          change_percent?: number | null
          created_at?: string
          dedup_key?: string | null
          description?: string
          emailed?: boolean
          id?: string
          is_dismissed?: boolean
          is_read?: boolean
          metadata?: Json | null
          re_verified_after_ack?: boolean
          root_cause?: string | null
          severity?: string
          team_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "anomaly_alerts_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      api_keys: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          is_active: boolean
          key_hash: string
          key_prefix: string
          last_used_at: string | null
          name: string
          team_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          key_hash: string
          key_prefix: string
          last_used_at?: string | null
          name?: string
          team_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          key_hash?: string
          key_prefix?: string
          last_used_at?: string | null
          name?: string
          team_id?: string
          user_id?: string
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
          click_goal: number | null
          click_goal_period: string | null
          color: string | null
          created_at: string | null
          created_by: string
          description: string | null
          id: string
          is_rotator: boolean
          is_starred: boolean
          name: string
          parent_id: string | null
          position_x: number | null
          position_y: number | null
          rotator_slug: string | null
          team_id: string
        }
        Insert: {
          click_goal?: number | null
          click_goal_period?: string | null
          color?: string | null
          created_at?: string | null
          created_by: string
          description?: string | null
          id?: string
          is_rotator?: boolean
          is_starred?: boolean
          name: string
          parent_id?: string | null
          position_x?: number | null
          position_y?: number | null
          rotator_slug?: string | null
          team_id: string
        }
        Update: {
          click_goal?: number | null
          click_goal_period?: string | null
          color?: string | null
          created_at?: string | null
          created_by?: string
          description?: string | null
          id?: string
          is_rotator?: boolean
          is_starred?: boolean
          name?: string
          parent_id?: string | null
          position_x?: number | null
          position_y?: number | null
          rotator_slug?: string | null
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "collections_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collections_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
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
          is_favorite: boolean
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
          is_favorite?: boolean
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
          is_favorite?: boolean
          redirect_rules?: Json | null
          slug?: string
          team_id?: string
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "links_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "collections"
            referencedColumns: ["id"]
          },
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
      partner_earnings: {
        Row: {
          amount: number
          created_at: string
          id: string
          partner_id: string
          period_month: string
          referral_id: string | null
          status: string
          type: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          partner_id: string
          period_month: string
          referral_id?: string | null
          status?: string
          type?: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          partner_id?: string
          period_month?: string
          referral_id?: string | null
          status?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_earnings_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partner_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_earnings_referral_id_fkey"
            columns: ["referral_id"]
            isOneToOne: false
            referencedRelation: "partner_referrals"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_payouts: {
        Row: {
          amount: number
          id: string
          method: string | null
          paid_at: string | null
          partner_id: string
          reference: string | null
          requested_at: string
          status: string
        }
        Insert: {
          amount: number
          id?: string
          method?: string | null
          paid_at?: string | null
          partner_id: string
          reference?: string | null
          requested_at?: string
          status?: string
        }
        Update: {
          amount?: number
          id?: string
          method?: string | null
          paid_at?: string | null
          partner_id?: string
          reference?: string | null
          requested_at?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_payouts_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partner_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_profiles: {
        Row: {
          activated_at: string
          commission_rate: number
          created_at: string
          id: string
          payout_method: Json | null
          pending_payout: number
          referral_code: string
          total_earned: number
          user_id: string
        }
        Insert: {
          activated_at?: string
          commission_rate?: number
          created_at?: string
          id?: string
          payout_method?: Json | null
          pending_payout?: number
          referral_code: string
          total_earned?: number
          user_id: string
        }
        Update: {
          activated_at?: string
          commission_rate?: number
          created_at?: string
          id?: string
          payout_method?: Json | null
          pending_payout?: number
          referral_code?: string
          total_earned?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_referral_clicks: {
        Row: {
          clicked_at: string
          converted: boolean
          country: string | null
          device: string | null
          id: string
          partner_id: string
        }
        Insert: {
          clicked_at?: string
          converted?: boolean
          country?: string | null
          device?: string | null
          id?: string
          partner_id: string
        }
        Update: {
          clicked_at?: string
          converted?: boolean
          country?: string | null
          device?: string | null
          id?: string
          partner_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_referral_clicks_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partner_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_referrals: {
        Row: {
          converted_at: string | null
          id: string
          monthly_value: number
          partner_id: string
          plan: string | null
          referred_email: string
          referred_user_id: string
          signed_up_at: string
          status: string
        }
        Insert: {
          converted_at?: string | null
          id?: string
          monthly_value?: number
          partner_id: string
          plan?: string | null
          referred_email: string
          referred_user_id: string
          signed_up_at?: string
          status?: string
        }
        Update: {
          converted_at?: string | null
          id?: string
          monthly_value?: number
          partner_id?: string
          plan?: string | null
          referred_email?: string
          referred_user_id?: string
          signed_up_at?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_referrals_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partner_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_referrals_referred_user_id_fkey"
            columns: ["referred_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_suggestion_votes: {
        Row: {
          created_at: string
          suggestion_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          suggestion_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          suggestion_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_suggestion_votes_suggestion_id_fkey"
            columns: ["suggestion_id"]
            isOneToOne: false
            referencedRelation: "partner_suggestions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_suggestion_votes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_suggestions: {
        Row: {
          body: string
          created_at: string
          id: string
          partner_id: string
          status: string
          title: string
          votes: number
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          partner_id: string
          status?: string
          title: string
          votes?: number
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          partner_id?: string
          status?: string
          title?: string
          votes?: number
        }
        Relationships: [
          {
            foreignKeyName: "partner_suggestions_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partner_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_blocked_hosts: {
        Row: {
          created_at: string
          host: string
        }
        Insert: {
          created_at?: string
          host: string
        }
        Update: {
          created_at?: string
          host?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          created_at: string
          customer_email: string | null
          expires_at: string | null
          fanbasis_checkout_session_id: number | null
          fanbasis_product_id: string | null
          fanbasis_subscription_id: number | null
          granted_by: string | null
          id: string
          is_free: boolean
          notes: string | null
          plan: string
          starts_at: string
          status: string
          team_id: string
        }
        Insert: {
          created_at?: string
          customer_email?: string | null
          expires_at?: string | null
          fanbasis_checkout_session_id?: number | null
          fanbasis_product_id?: string | null
          fanbasis_subscription_id?: number | null
          granted_by?: string | null
          id?: string
          is_free?: boolean
          notes?: string | null
          plan: string
          starts_at?: string
          status?: string
          team_id: string
        }
        Update: {
          created_at?: string
          customer_email?: string | null
          expires_at?: string | null
          fanbasis_checkout_session_id?: number | null
          fanbasis_product_id?: string | null
          fanbasis_subscription_id?: number | null
          granted_by?: string | null
          id?: string
          is_free?: boolean
          notes?: string | null
          plan?: string
          starts_at?: string
          status?: string
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_team_id_fkey"
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
      team_settings: {
        Row: {
          created_at: string
          default_domain: string
          id: string
          show_app_tap_to_continue: boolean
          show_branding: boolean
          show_link_creation_confirmation: boolean
          team_id: string
          tiktok_browser_mode: string
          timezone: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          default_domain?: string
          id?: string
          show_app_tap_to_continue?: boolean
          show_branding?: boolean
          show_link_creation_confirmation?: boolean
          team_id: string
          tiktok_browser_mode?: string
          timezone?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          default_domain?: string
          id?: string
          show_app_tap_to_continue?: boolean
          show_branding?: boolean
          show_link_creation_confirmation?: boolean
          team_id?: string
          tiktok_browser_mode?: string
          timezone?: string
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
          is_admin: boolean
          is_partner: boolean
          partner_activated_at: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          is_admin?: boolean
          is_partner?: boolean
          partner_activated_at?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          is_admin?: boolean
          is_partner?: boolean
          partner_activated_at?: string | null
          updated_at?: string
        }
        Relationships: []
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      extract_hostname: { Args: { url: string }; Returns: string }
      get_team_role: {
        Args: { team_uuid: string; user_uuid: string }
        Returns: string
      }
      increment_ab_conversion: {
        Args: { p_revenue?: number; p_test_id: string; p_variant: string }
        Returns: undefined
      }
      increment_ab_visit: {
        Args: { p_test_id: string; p_variant: string }
        Returns: undefined
      }
      is_partner_owner: { Args: { profile_id: string }; Returns: boolean }
      is_team_member: {
        Args: { team_uuid: string; user_uuid: string }
        Returns: boolean
      }
      normalize_destination_url: { Args: { url: string }; Returns: string }
      partner_vote_suggestion: {
        Args: { p_suggestion_id: string }
        Returns: undefined
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
