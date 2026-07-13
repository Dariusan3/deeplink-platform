"use client";

import { useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { TeamContext } from "@/providers/team-provider";
import { UserContext } from "@/providers/user-provider";
import { createClient } from "@/lib/supabase/client";
import {
  purchaseIntent,
  isPaidPlan,
  planRank,
  PLAN_LABEL,
  PLAN_PRICE_EUR,
  type PlanKey,
} from "@/lib/plans";
import { planClickCap, hasClickCap } from "@/lib/alerts";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Check, AlertTriangle, ArrowRight } from "lucide-react";

// Calls /api/billing/checkout for the active team and bounces the user to
// the FanBasis hosted checkout page. If the user isn't logged in we send
// them to /signup so they can come back and pay.
//
// The button also knows what the team is ALREADY on: buying the plan you
// already have is not a thing we should let you do, and the server refuses it
// with a 409 anyway (see /api/billing/checkout). This is the polite half of
// that — the button says "Current plan" and doesn't take the click, instead of
// letting you walk all the way to a hosted checkout page before finding out.

// ── Knowing the plan without a flash ─────────────────────────────────────────
//
// /pricing is statically prerendered and lives outside the dashboard providers,
// so the button starts out knowing nothing: it takes an auth round-trip plus a
// team query to find out you're already on Agency. Rendering the normal "Try
// Agency" CTA during that window and then swapping it for "Current plan" is the
// visible flicker — the button changes its mind in front of you.
//
// Two things fix it, and both are needed:
//
//   1. Cache the last known plan in localStorage. On any repeat visit — which
//      includes the common path of clicking "Change Plan" on /dashboard/billing —
//      the correct state paints on the first frame, with no network wait at all.
//
//   2. When there is no cache but there IS a session token sitting in
//      localStorage, we know an auth check is about to say "logged in". Hold the
//      button in a disabled, muted state until the plan lands rather than showing
//      a CTA we may be about to retract. Logged-out visitors have no token, so
//      the marketing page never dims for them — which matters, since that's most
//      of /pricing's traffic.
const PLAN_CACHE_KEY = "tappr_current_plan";
type PlanCache = { userId: string; plan: string | null };

function readPlanCache(): PlanCache | null {
  try {
    const raw = localStorage.getItem(PLAN_CACHE_KEY);
    return raw ? (JSON.parse(raw) as PlanCache) : null;
  } catch { return null; }
}
function writePlanCache(value: PlanCache | null) {
  try {
    if (value) localStorage.setItem(PLAN_CACHE_KEY, JSON.stringify(value));
    else localStorage.removeItem(PLAN_CACHE_KEY);
  } catch { /* private mode, quota — the button still works, it just flickers */ }
}

// Is there plausibly a session? Used ONLY to decide whether the cached plan is
// worth painting before the auth check comes back — never to conclude someone is
// logged out. That distinction cost me a bug: an earlier version short-circuited
// "no token → logged out", and since our client is `createBrowserClient` from
// @supabase/ssr, the session lives in COOKIES, not localStorage. The check
// returned false for everyone, so every signed-in user who clicked a plan on
// /pricing was bounced to /signup.
//
// Both stores are checked now, and `resolvePlan` always asks Supabase for real.
function hasSessionToken(): boolean {
  try {
    if (/(?:^|;\s*)sb-[^;=]*auth-token/.test(document.cookie)) return true;
  } catch { /* no document */ }
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && /^sb-.*-auth-token/.test(key)) return true;
    }
  } catch { /* no localStorage */ }
  return false;
}

export function UpgradeButton({
  plan,
  children,
  className,
  variant,
}: {
  plan: PlanKey & ("starter" | "growth" | "agency");
  children: ReactNode;
  className?: string;
  variant?: "default" | "outline" | "ghost";
}) {
  // The pricing page is statically prerendered and rendered OUTSIDE the
  // dashboard providers — so TeamContext is undefined there. We can still
  // detect auth via Supabase directly (cookies are shared), and the
  // checkout endpoint figures out the team server-side. This avoids the
  // old bug where logged-in users on /pricing got bounced to /signup →
  // middleware → /dashboard, instead of starting checkout.
  const teamCtx = useContext(TeamContext);
  const userCtx = useContext(UserContext);
  const ctxUser = userCtx?.user ?? null;
  const ctxTeam = teamCtx?.activeTeam ?? null;
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  // Mirror auth + current plan from supabase when we're rendered without the
  // dashboard providers (the public /pricing page). Inside the dashboard,
  // ctxTeam already carries the plan and this effect is a no-op.
  const [supaUserId, setSupaUserId] = useState<string | null>(null);
  const [supaPlan, setSupaPlan] = useState<string | null>(null);
  // False only while we might still be about to learn we're logged in. Starts
  // false on the server and on the very first client render so SSR and hydration
  // agree; settled immediately after mount.
  const [settled, setSettled] = useState(false);

  const hasDashboardContext = !!ctxUser && !!ctxTeam;
  // Inside the dashboard the plan came with the context — nothing to wait for.
  const resolved = hasDashboardContext || settled;

  // Ask Supabase who this is and what plan their team is on. Returns the answer
  // as well as storing it, because the click handler needs it as a VALUE: a
  // setState it just fired isn't readable in the same tick.
  const resolvePlan = useCallback(async (): Promise<{ authed: boolean; plan: string | null }> => {
    // Always ask Supabase. Do NOT try to infer "logged out" from the absence of a
    // token — see hasSessionToken() for what that cost last time.
    try {
      const supabase = createClient();
      const { data } = await supabase.auth.getUser();
      const userId = data.user?.id ?? null;
      if (!userId) {
        setSupaUserId(null);
        setSupaPlan(null);
        setSettled(true);
        writePlanCache(null);
        return { authed: false, plan: null };
      }

      // Which plan is this user's owned team on? Same team the checkout
      // endpoint will resolve to when we POST without a team_id.
      const { data: owned } = await supabase
        .from("team_members")
        .select("teams(plan)")
        .eq("user_id", userId)
        .eq("role", "owner")
        .limit(1)
        .maybeSingle();
      const team = (owned as { teams?: { plan?: string } | { plan?: string }[] } | null)?.teams;
      const teamPlan = (Array.isArray(team) ? team[0]?.plan : team?.plan) ?? null;

      setSupaUserId(userId);
      setSupaPlan(teamPlan);
      setSettled(true);
      writePlanCache({ userId, plan: teamPlan });
      return { authed: true, plan: teamPlan };
    } catch {
      // Network/auth hiccup (AuthRetryableFetchError). A failed lookup is NOT
      // evidence of being logged out — bouncing a paying customer to /signup
      // because their wifi blinked is the worst thing this button can do. If a
      // session token is sitting there, assume they're in and let the checkout
      // endpoint be the one to say 401.
      setSettled(true);
      const probablyAuthed = hasSessionToken();
      if (!probablyAuthed) {
        setSupaUserId(null);
        setSupaPlan(null);
      }
      return { authed: probablyAuthed, plan: supaPlan };
    }
  }, [supaPlan]);

  useEffect(() => {
    if (hasDashboardContext) return; // dashboard context wins; nothing to fetch

    let cancelled = false;
    (async () => {
      // Paint the last known plan straight away, so the common path (arriving
      // from /dashboard/billing, where the cache was just written) shows the
      // right label on the first frame instead of correcting itself a beat later.
      const cached = hasSessionToken() ? readPlanCache() : null;
      if (cached && !cancelled) {
        setSupaUserId(cached.userId);
        setSupaPlan(cached.plan);
        setSettled(true);
      }
      // Revalidate regardless — the cache can belong to a different user, or the
      // plan can have changed since.
      await resolvePlan();
    })();
    return () => { cancelled = true; };
  }, [hasDashboardContext, resolvePlan]);

  // Keep the dashboard's own plan in the cache too, so the very first trip from
  // /dashboard/billing → /pricing already knows the answer.
  useEffect(() => {
    if (ctxUser && ctxTeam) writePlanCache({ userId: ctxUser.id, plan: ctxTeam.plan ?? null });
  }, [ctxUser, ctxTeam]);

  const isAuthed = !!ctxUser || !!supaUserId;
  const currentPlan = ctxTeam?.plan ?? supaPlan;

  // Logged out → we have no plan to compare against, so every plan is buyable.
  // That's correct: they'll sign up first.
  const intent = isAuthed ? purchaseIntent(currentPlan, plan) : "upgrade";
  const isCurrent = intent === "current";

  // Switching AWAY from a paid plan is not a click you should be able to make by
  // accident: it changes what you're charged and, on a downgrade, what your
  // account can do. Confirm it first. Coming from Free there's nothing at stake,
  // so that path stays a single click.
  const needsConfirm = isAuthed && !isCurrent && isPaidPlan(currentPlan);
  const [confirmOpen, setConfirmOpen] = useState(false);

  // The plan the dialog will show you're coming FROM. Normally the resolved
  // plan; on a click that raced the lookup, whatever the lookup just returned.
  const [confirmFrom, setConfirmFrom] = useState<PlanKey | null>(null);

  const handleClick = async () => {
    if (isCurrent) return; // belt; the button is disabled anyway

    // The button is deliberately NEVER disabled while the plan lookup is in
    // flight — a Switch Plan button you can't press is worse than one that takes
    // a moment. If you beat the lookup, we finish it here and then decide: this
    // is the only place the confirm dialog can be skipped by a race, so it's the
    // only place that has to close it.
    let plan_ = currentPlan;
    let authed = isAuthed;
    if (!resolved) {
      setLoading(true);
      const fresh = await resolvePlan();
      plan_ = fresh.plan;
      authed = fresh.authed;
      setLoading(false);
    }

    if (!authed) {
      // Truly logged out — push to signup so they create an account.
      router.push("/signup");
      return;
    }

    const freshIntent = purchaseIntent(plan_, plan);
    if (freshIntent === "current") {
      toast.info(`You're already on the ${PLAN_LABEL[plan]} plan.`);
      return;
    }

    if (isPaidPlan(plan_) && !confirmOpen) {
      setConfirmFrom((plan_ ?? "free") as PlanKey);
      setConfirmOpen(true);
      return;
    }

    setLoading(true);
    try {
      // team_id is optional. When ctxTeam exists (dashboard /billing), we
      // send it. Otherwise the endpoint picks the user's owned team.
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(ctxTeam ? { team_id: ctxTeam.id, plan } : { plan }),
      });
      const json = await res.json();
      if (!res.ok || !json.payment_link) {
        toast.error(json.error || "Could not start checkout");
        setLoading(false);
        return;
      }
      // Replace, not push — we don't want the user to come back to a stale
      // checkout via the back button.
      window.location.replace(json.payment_link);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Network error");
      setLoading(false);
    }
  };

  return (
    <>
      {/* Only ever disabled once we KNOW it's the current plan. Never while the
          lookup is in flight — that made the switch button unpressable for the
          first half-second, which reads as broken. */}
      <Button
        onClick={handleClick}
        disabled={loading || isCurrent}
        aria-current={isCurrent ? "true" : undefined}
        aria-busy={loading}
        variant={variant}
        className={cn(className, isCurrent && "opacity-60 cursor-default")}
      >
        {isCurrent ? (
          <>
            <Check className="w-4 h-4" />
            Current plan
          </>
        ) : loading ? (
          "Redirecting…"
        ) : intent === "downgrade" ? (
          "Switch to this plan"
        ) : (
          children
        )}
      </Button>

      {(needsConfirm || confirmFrom) && (
        <PlanChangeDialog
          open={confirmOpen}
          onOpenChange={(o) => { if (!loading) setConfirmOpen(o); }}
          from={confirmFrom ?? ((currentPlan ?? "free") as PlanKey)}
          to={plan}
          loading={loading}
          onConfirm={handleClick}
        />
      )}
    </>
  );
}

// Shown before a paid team is sent to checkout for a different plan. Its whole
// job is to say the two things the user cannot see from a pricing card: what
// their cap becomes, and that the old subscription does not stop on its own.
function PlanChangeDialog({
  open,
  onOpenChange,
  from,
  to,
  loading,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  from: PlanKey;
  to: PlanKey;
  loading: boolean;
  onConfirm: () => void;
}) {
  const downgrade = planRank(to) < planRank(from);

  const capLabel = (p: PlanKey) =>
    hasClickCap(p) ? `${planClickCap(p).toLocaleString()} clicks/mo` : "Unlimited clicks";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "glass-card bg-black/95 text-white sm:max-w-110",
          downgrade ? "border-amber-500/30" : "border-[#00D26A]/30"
        )}
      >
        <DialogTitle className="text-xl font-black tracking-tight uppercase">
          {downgrade ? "Switch down to " : "Switch to "}
          <span className={downgrade ? "text-amber-400" : "text-[#00D26A]"}>{PLAN_LABEL[to]}</span>?
        </DialogTitle>

        <DialogDescription className="sr-only">
          Review what changes before you are sent to checkout.
        </DialogDescription>

        <div className="space-y-4">
          {/* From → to, with the number that actually changes. */}
          <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-3">
            <div className="flex-1 min-w-0">
              <p className="text-[9px] font-black uppercase tracking-widest text-neutral-500">Now</p>
              <p className="text-sm font-black text-white">{PLAN_LABEL[from]} · €{PLAN_PRICE_EUR[from]}/mo</p>
              <p className="text-[10px] text-neutral-500">{capLabel(from)}</p>
            </div>
            <ArrowRight className="w-4 h-4 text-neutral-600 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-[9px] font-black uppercase tracking-widest text-neutral-500">After</p>
              <p className={cn("text-sm font-black", downgrade ? "text-amber-400" : "text-[#00D26A]")}>
                {PLAN_LABEL[to]} · €{PLAN_PRICE_EUR[to]}/mo
              </p>
              <p className="text-[10px] text-neutral-500">{capLabel(to)}</p>
            </div>
          </div>

          {downgrade && (
            <Warn tone="amber">
              Your monthly click cap drops to <b className="text-white">{capLabel(to)}</b>. Once
              you pass it, new visitors see the paused page until the cycle resets.
            </Warn>
          )}

          {/* The important one. We create a NEW FanBasis subscription — we do
              not, and currently cannot, stop the old recurring charge from
              here. Saying so is the difference between a switch and a double
              charge the user finds out about on their bank statement. */}
          <Warn tone="red">
            Your <b className="text-white">{PLAN_LABEL[from]}</b> subscription does not stop by
            itself. Cancel it from <b className="text-white">Billing</b> after this switch, or
            you&apos;ll be charged for both plans.
          </Warn>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={loading}
            className="text-white hover:bg-white/5 font-bold uppercase text-[10px] tracking-widest"
          >
            Keep {PLAN_LABEL[from]}
          </Button>
          <Button
            onClick={onConfirm}
            disabled={loading}
            className={cn(
              "font-black uppercase text-[10px] tracking-widest rounded-lg disabled:opacity-50",
              downgrade
                ? "bg-amber-500 hover:bg-amber-600 text-black"
                : "btn-primary text-black"
            )}
          >
            {loading ? "Redirecting…" : `Continue to checkout`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Warn({ tone, children }: { tone: "amber" | "red"; children: ReactNode }) {
  const style =
    tone === "red"
      ? "border-red-500/25 bg-red-500/[0.06] text-red-400"
      : "border-amber-500/25 bg-amber-500/[0.06] text-amber-400";
  return (
    <div className={cn("flex items-start gap-2.5 rounded-lg border p-3", style)}>
      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
      <p className="text-xs leading-relaxed text-neutral-300">{children}</p>
    </div>
  );
}
