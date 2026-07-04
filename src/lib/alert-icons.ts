// Per-alert-type lucide icons. Single source of truth for the alerts page
// and the header notification bell, so both render the same SVG glyph
// instead of the emoji we used to prefix onto alert titles.
import {
  Link2,
  TrendingDown,
  ShieldAlert,
  Gauge,
  Trophy,
  Target,
  Rocket,
  Clock,
  Globe,
  Smartphone,
  Trash2,
  CreditCard,
  type LucideIcon,
} from "lucide-react";
import type { AlertType } from "@/lib/alerts";

export const ALERT_ICONS: Record<AlertType, LucideIcon> = {
  // Tier 1
  destination_broken: Link2,
  click_drop:         TrendingDown,
  click_spam:         ShieldAlert,
  plan_limit:         Gauge,
  // Tier 2
  ab_winner:          Trophy,
  goal_hit:           Target,
  traffic_spike:      Rocket,
  peak_hour_shift:    Clock,
  // Tier 3
  country_shift:      Globe,
  device_shift:       Smartphone,
  stale_links:        Trash2,
  // Tier 4
  subscription_expiring: CreditCard,
};
