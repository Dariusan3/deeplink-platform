// Plan ordering. Isolated in its own module because both a client component
// (UpgradeButton, which renders on the public /pricing page) and a server route
// (/api/billing/checkout) need it — and fanbasis.ts, the obvious home, carries
// the FanBasis API key and must never be pulled into a client bundle.

export type PlanKey = "free" | "starter" | "growth" | "agency";

export const PLAN_RANK: Record<PlanKey, number> = {
  free: 0,
  starter: 1,
  growth: 2,
  agency: 3,
};

export const PLAN_LABEL: Record<PlanKey, string> = {
  free: "Free",
  starter: "Starter",
  growth: "Growth",
  agency: "Agency",
};

// Monthly price in euros. Must match TAPPR_PLANS.amountCents in fanbasis.ts and
// the public /pricing page.
export const PLAN_PRICE_EUR: Record<PlanKey, number> = {
  free: 0,
  starter: 97,
  growth: 297,
  agency: 997,
};

// True when the target plan is a paid one the user could actually be switching
// away from — i.e. there is money and a cap at stake in the change.
export function isPaidPlan(plan: string | null | undefined): boolean {
  return planRank(plan) > 0;
}

export function planRank(plan: string | null | undefined): number {
  return PLAN_RANK[(plan ?? "free") as PlanKey] ?? 0;
}

// What a "buy this plan" button should do, given what the team is already on.
//   current  — they already have it. Nothing to sell.
//   upgrade  — the normal path.
//   downgrade— allowed, but it should not look like an upgrade.
export function purchaseIntent(
  currentPlan: string | null | undefined,
  targetPlan: PlanKey
): "current" | "upgrade" | "downgrade" {
  const from = planRank(currentPlan);
  const to = planRank(targetPlan);
  if (from === to) return "current";
  return to > from ? "upgrade" : "downgrade";
}
