"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { SignupForm } from "@/components/auth/signup-form";

// /signup — the canonical signup page. Still honours a legacy `?ref=CODE`
// query string (old shared links, the landing-page ReferralTracker), while the
// clean path-based link lives at /signup/@CODE (see ./[code]/page.tsx).
function SignupWithQueryRef() {
  const refCode = useSearchParams().get("ref");
  return <SignupForm refCode={refCode} />;
}

export default function SignupPage() {
  return (
    <Suspense fallback={<SignupForm refCode={null} />}>
      <SignupWithQueryRef />
    </Suspense>
  );
}
