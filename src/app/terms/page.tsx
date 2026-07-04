import type { Metadata } from "next";
import Link from "next/link";
import { LegalShell } from "@/components/legal/legal-shell";

export const metadata: Metadata = {
  title: "Terms of Service — Tappr",
  description: "The terms that govern your use of the Tappr link-management platform.",
};

// OPERATOR: replace the 【bracketed】 placeholders (legal entity, governing law)
// before relying on this. These terms are a sensible baseline, not a substitute
// for legal review. See docs/compliance-fixes.md → "Before you publish".
export default function TermsPage() {
  return (
    <LegalShell title="Terms of Service" updated="4 July 2026">
      <div className="legal-note">
        These terms are a plain-English baseline for using Tappr. They are not a
        substitute for advice from a qualified lawyer for your specific situation.
      </div>

      <h2>1. Agreement</h2>
      <p>
        By creating an account or using <strong>tappr.me</strong> (&ldquo;the
        Service&rdquo;), provided by <strong>【Legal entity name】</strong>{" "}
        (&ldquo;we&rdquo;, &ldquo;us&rdquo;), you agree to these Terms and to our{" "}
        <Link href="/privacy">Privacy Policy</Link>. If you don&apos;t agree, don&apos;t
        use the Service.
      </p>

      <h2>2. Your account</h2>
      <ul>
        <li>You must provide accurate information and keep your login credentials secure.</li>
        <li>You&apos;re responsible for activity that happens under your account.</li>
        <li>You must be at least 16 years old to use the Service.</li>
      </ul>

      <h2>3. Acceptable use</h2>
      <p>You agree not to use Tappr to create links to, or distribute, content that:</p>
      <ul>
        <li>is illegal, malicious (malware, phishing), or infringes others&apos; rights;</li>
        <li>is deceptive, spammy, or intended to defraud;</li>
        <li>harasses, abuses, or harms others.</li>
      </ul>
      <p>
        We may suspend or remove links or accounts that breach these rules or put the
        Service or its users at risk.
      </p>

      <h2>4. Your content</h2>
      <p>
        You keep ownership of the links, destinations and content you create. You grant
        us the limited licence needed to host and operate the Service (for example,
        serving your redirects and showing your analytics).
      </p>

      <h2>5. AI features</h2>
      <p>
        The AI Brain, reports and anomaly insights produce <strong>AI-generated</strong>{" "}
        output that can be wrong or incomplete. You&apos;re responsible for decisions you
        make based on it. It is not professional, legal, or financial advice.
      </p>

      <h2>6. Plans, billing and cancellation</h2>
      <ul>
        <li>Paid plans are billed through our payment provider on the terms shown at checkout.</li>
        <li>You can cancel at any time; access continues until the end of the paid period unless stated otherwise.</li>
        <li>Fees are non-refundable except where required by law.</li>
      </ul>

      <h2>7. Availability</h2>
      <p>
        We work to keep the Service reliable but provide it &ldquo;as is&rdquo; and
        &ldquo;as available&rdquo;. We don&apos;t guarantee uninterrupted or error-free
        operation.
      </p>

      <h2>8. Liability</h2>
      <p>
        To the extent permitted by law, we are not liable for indirect or consequential
        losses, or for loss of profits, data or goodwill. Nothing in these Terms limits
        liability that cannot be limited by law.
      </p>

      <h2>9. Termination</h2>
      <p>
        You can stop using the Service and delete your account at any time from{" "}
        <Link href="/dashboard/settings">Settings</Link>. We may suspend or terminate
        accounts that breach these Terms.
      </p>

      <h2>10. Changes &amp; governing law</h2>
      <p>
        We may update these Terms; material changes will be reflected in the
        &ldquo;last updated&rdquo; date above. These Terms are governed by the laws of{" "}
        <strong>【governing jurisdiction】</strong>. Questions? Email{" "}
        <a href="mailto:hello@tappr.me">hello@tappr.me</a>.
      </p>
    </LegalShell>
  );
}
