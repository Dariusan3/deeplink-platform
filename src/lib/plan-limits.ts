export const BRAIN_CHAT_LIMITS: Record<string, number> = {
  free:    5,
  starter: 20,
  growth:  50,
  agency:  Infinity,
};

export function getBrainChatLimit(plan: string): number {
  return BRAIN_CHAT_LIMITS[plan] ?? BRAIN_CHAT_LIMITS.free;
}
