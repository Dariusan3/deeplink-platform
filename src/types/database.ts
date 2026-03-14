// Database types for the deeplink platform
// These types mirror the Supabase schema

export type UserRole = "owner" | "editor" | "analyst" | "viewer";

export interface RedirectConditions {
  geo?: {
    countries?: string[];
    regions?: string[];
  };
  device?: {
    types?: ("mobile" | "tablet" | "desktop")[];
  };
  time?: {
    after?: string;
    before?: string;
    daysOfWeek?: number[];
  };
}

export interface RedirectRule {
  priority: number;
  conditions: RedirectConditions;
  destination_url: string;
  label?: string;
}

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          avatar_url?: string | null;
        };
        Update: {
          full_name?: string | null;
          avatar_url?: string | null;
          updated_at?: string;
        };
      };
      teams: {
        Row: {
          id: string;
          name: string;
          slug: string;
          created_by: string;
          created_at: string;
        };
        Insert: {
          name: string;
          slug: string;
          created_by: string;
        };
        Update: {
          name?: string;
          slug?: string;
        };
      };
      team_members: {
        Row: {
          id: string;
          team_id: string;
          user_id: string;
          role: UserRole;
          joined_at: string;
        };
        Insert: {
          team_id: string;
          user_id: string;
          role: UserRole;
        };
        Update: {
          role?: UserRole;
        };
      };
      links: {
        Row: {
          id: string;
          team_id: string;
          created_by: string;
          slug: string;
          destination_url: string;
          title: string | null;
          redirect_rules: RedirectRule[];
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          team_id: string;
          created_by: string;
          slug: string;
          destination_url: string;
          title?: string | null;
          redirect_rules?: RedirectRule[];
          is_active?: boolean;
        };
        Update: {
          slug?: string;
          destination_url?: string;
          title?: string | null;
          redirect_rules?: RedirectRule[];
          is_active?: boolean;
          updated_at?: string;
        };
      };
      link_clicks: {
        Row: {
          id: string;
          link_id: string;
          clicked_at: string;
          ip_address: string | null;
          user_agent: string | null;
          country: string | null;
          city: string | null;
          device_type: string | null;
          referer: string | null;
          matched_rule_index: number;
        };
        Insert: {
          link_id: string;
          ip_address?: string | null;
          user_agent?: string | null;
          country?: string | null;
          city?: string | null;
          device_type?: string | null;
          referer?: string | null;
          matched_rule_index?: number;
        };
        Update: never;
      };
      business_brain: {
        Row: {
          id: string;
          team_id: string;
          title: string | null;
          content: Record<string, unknown> | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          team_id: string;
          title?: string | null;
          content?: Record<string, unknown> | null;
        };
        Update: {
          title?: string | null;
          content?: Record<string, unknown> | null;
          updated_at?: string;
        };
      };
      ig_integrations: {
        Row: {
          id: string;
          team_id: string;
          ig_user_id: string;
          ig_username: string | null;
          access_token: string;
          token_expires_at: string | null;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          team_id: string;
          ig_user_id: string;
          ig_username?: string | null;
          access_token: string;
          token_expires_at?: string | null;
          is_active?: boolean;
        };
        Update: {
          ig_username?: string | null;
          access_token?: string;
          token_expires_at?: string | null;
          is_active?: boolean;
        };
      };
      weekly_reports: {
        Row: {
          id: string;
          team_id: string;
          report_data: Record<string, unknown> | null;
          period_start: string;
          period_end: string;
          created_at: string;
        };
        Insert: {
          team_id: string;
          report_data?: Record<string, unknown> | null;
          period_start: string;
          period_end: string;
        };
        Update: {
          report_data?: Record<string, unknown> | null;
        };
      };
    };
  };
}
