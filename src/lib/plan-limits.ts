// AI Brain monthly chat limits. Derived from the central entitlements map so
// this can never drift from the pricing page.
//   free: 10 · starter/growth/agency: Unlimited
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
