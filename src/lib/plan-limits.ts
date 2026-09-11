// AI Brain limits, split by mechanism — see PlanEntitlements.brainSessionHours
// in src/lib/entitlements.ts for why there are two.
//
//   free            — a 1-hour session per UTC day (brainSessionHours)
//   starter/growth  — N new conversations per UTC day (brainChats)
//   agency          — unlimited
//
// The day-count side is mirrored in SQL as brain_daily_chat_cap() (migration
// 031) and enforced there via RLS on brain_chats — this file is not the
// enforcement, it's what the UI reads to match what the server will do.
import { entitlements } from "./entitlements";

export const BRAIN_CHAT_LIMITS: Record<string, number> = {
  free: entitlements("free").brainChats,
  starter: entitlements("starter").brainChats,
  growth: entitlements("growth").brainChats,
  agency: entitlements("agency").brainChats,
};

export function getBrainChatLimit(plan: string): number {
  return entitlements(plan).brainChats;
}

// null = this plan doesn't use the session-timer model (it's on the
// per-day-conversation-count model instead — read getBrainChatLimit).
export function getBrainSessionHours(plan: string): number | null {
  return entitlements(plan).brainSessionHours;
}
