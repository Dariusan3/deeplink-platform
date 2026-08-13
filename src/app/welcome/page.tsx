import { Suspense } from "react";
import { InviteGate } from "@/components/auth/invite-gate";

// /welcome — the quarantine screen for an account that exists but has no
// referral attached (`users.signup_status = 'pending_referral'`).
//
// Deliberately a separate route from /signup rather than a state of it: the
// middleware redirects any signed-in user away from /signup to /dashboard, and
// a quarantined account would ping-pong between the two forever.
//
// `?code=` is set by the middleware when a signed-in quarantined user clicks a
// referral link — the right move there is to claim the code onto the account
// they already have, not to offer them a second signup form.

export const dynamic = "force-dynamic";

export default async function WelcomePage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  const { code } = await searchParams;
  return (
    <Suspense>
      <InviteGate mode="claim" initialCode={code ?? null} />
    </Suspense>
  );
}
