// Partner system types — kept in a dedicated file so we don't fight
// the generated `database.ts` on regenerations. If you regenerate types
// later, these will still match the migration 015 schema.

export type PartnerStatus = "pending" | "active" | "churned";

// User-facing labels. The DB value stays "churned" (the schema constraint and
// all the commission logic key off it), but "churned" is jargon that reads
// harshly to a partner, so it's shown as "Inactive".
export const PARTNER_STATUS_LABEL: Record<string, string> = {
  pending: "Pending",
  active: "Active",
  churned: "Inactive",
};

export function partnerStatusLabel(status: string): string {
  return PARTNER_STATUS_LABEL[status] ?? status;
}
export type PartnerEarningStatus = "pending" | "paid";
export type PartnerEarningType = "commission" | "bonus";
export type PartnerPayoutStatus = "requested" | "paid" | "rejected";
export type PartnerSuggestionStatus = "open" | "in_progress" | "done" | "rejected";

export interface PartnerProfile {
  id: string;
  user_id: string;
  referral_code: string;
  commission_rate: number;
  total_earned: number;
  pending_payout: number;
  payout_method: PartnerPayoutMethod | null;
  activated_at: string;
  created_at: string;
}

// One row per referral code a partner has ever held. Old codes are never
// deleted — see supabase/migrations/028_partner_vanity_codes.sql. `is_primary`
// only picks which one the UI shows; every row resolves.
export interface PartnerCode {
  code: string;
  is_primary: boolean;
  created_at: string;
}

export interface PartnerPayoutMethod {
  // Crypto-only payouts. Older rows may still carry paypal/bank shapes;
  // kept in the union so existing data type-checks, but the UI only
  // writes/reads crypto going forward.
  type: "crypto" | "paypal" | "bank";
  // Crypto fields
  network?: string;        // e.g. "USDT (TRC20)", "USDC (ERC20)", "BTC", "ETH"
  wallet_address?: string;
  // Legacy fields (paypal / bank) — read-only fallback for old rows.
  email?: string;
  iban?: string;
  account_holder?: string;
}

export interface PartnerReferral {
  id: string;
  partner_id: string;
  referred_user_id: string;
  referred_email: string;
  plan: string | null;
  monthly_value: number;
  status: PartnerStatus;
  signed_up_at: string;
  converted_at: string | null;
}

export interface PartnerEarning {
  id: string;
  partner_id: string;
  referral_id: string | null;
  amount: number;
  type: PartnerEarningType;
  status: PartnerEarningStatus;
  period_month: string; // ISO date
  created_at: string;
}

export interface PartnerPayout {
  id: string;
  partner_id: string;
  amount: number;
  method: string | null;
  status: PartnerPayoutStatus;
  reference: string | null;
  requested_at: string;
  paid_at: string | null;
}

export interface PartnerSuggestion {
  id: string;
  partner_id: string;
  title: string;
  body: string;
  status: PartnerSuggestionStatus;
  votes: number;
  created_at: string;
}

export interface PartnerReferralClick {
  id: string;
  partner_id: string;
  country: string | null;
  device: string | null;
  converted: boolean;
  clicked_at: string;
}

// Aggregated stats returned by /api/partner/stats
export interface PartnerStats {
  totalClicks: number;
  totalSignups: number;
  totalConversions: number;
  conversionRate: number; // 0-1
  clicksByDay: { date: string; count: number }[]; // last 14 days
  countries: { country: string; count: number }[];
  devices: { device: string; count: number }[];
}
