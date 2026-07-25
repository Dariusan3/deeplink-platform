import type { Metadata } from "next";
import Link from "next/link";
import { LegalShell } from "@/components/legal/legal-shell";

// Title omits the brand — the root layout's title template appends "| Tappr".
export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How Tappr collects, uses, shares and protects your personal data under GDPR and UK GDPR.",
  alternates: { canonical: "/privacy" },
};

// Generated from the compliance audit (docs/compliance-audit.md) to match
// what the code actually collects and which processors actually receive data.
// OPERATOR: replace the 【bracketed】 placeholders (legal entity, address,
// contact email) with your real details before relying on this. See
// docs/compliance-fixes.md → "Before you publish".
export default function PrivacyPage() {
  return (
    <LegalShell title="Privacy Policy" updated="4 July 2026">
      <div className="legal-note">
        This policy describes how we handle personal data. It is written to align
        with the EU General Data Protection Regulation (GDPR) and the UK GDPR.
        If anything here is unclear, contact us at{" "}
        <a href="mailto:privacy@tappr.me">privacy@tappr.me</a>.
      </div>

      <h2>1. Who we are</h2>
      <p>
        Tappr (&ldquo;we&rdquo;, &ldquo;us&rdquo;) provides a smart link-management
        platform at <strong>tappr.me</strong>. For the purposes of GDPR, the data
        controller is <strong>Tappr</strong>. For any privacy question or to
        exercise your rights, email{" "}
        <a href="mailto:privacy@tappr.me">privacy@tappr.me</a>.
      </p>

      <h2>2. What we collect</h2>
      <p>We only collect what the product actually needs to run:</p>
      <ul>
        <li>
          <strong>Account data</strong> — your email address and name, created when
          you sign up (including via Google sign-in).
        </li>
        <li>
          <strong>Links &amp; content you create</strong> — the short links,
          collections, A/B tests and any business context you add to the AI Brain.
        </li>
        <li>
          <strong>Click analytics</strong> — when someone opens one of your short
          links, we record the <strong>IP address</strong>, user-agent (browser/device),
          approximate country, device type and referrer of that visit. IP addresses
          are treated as personal data.
        </li>
        <li>
          <strong>AI conversations</strong> — the messages you send to the AI Brain
          and the analytics context they run against (see section 7).
        </li>
        <li>
          <strong>Instagram integration</strong> — if you connect Instagram, we store
          the access token and account username so we can show your profile insights.
        </li>
        <li>
          <strong>Support messages</strong> — anything you send us through the contact
          form (name, email, message).
        </li>
        <li>
          <strong>Billing data</strong> — subscription and payment status, handled
          through our payment provider (we do not store full card details).
        </li>
      </ul>

      <h2>3. Why we use it, and our lawful basis</h2>
      <ul>
        <li><strong>To provide the service</strong> (accounts, links, redirects, analytics) — <em>performance of a contract</em>.</li>
        <li><strong>To keep the service secure and prevent abuse</strong> (e.g. rate-limiting, spam filtering) — <em>legitimate interests</em>.</li>
        <li><strong>To send you service and account emails</strong> — <em>performance of a contract</em> / <em>legitimate interests</em>.</li>
        <li><strong>To provide AI features you choose to use</strong> — <em>performance of a contract</em>.</li>
        <li><strong>To meet legal and accounting obligations</strong> — <em>legal obligation</em>.</li>
      </ul>

      <h2>4. Who we share it with (sub-processors)</h2>
      <p>
        We use a small number of trusted providers to run Tappr. Each processes only
        the data it needs, on our instructions, under a data-processing agreement.
      </p>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Provider</th>
              <th>What it does</th>
              <th>Data it processes</th>
              <th>Region</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Supabase</td>
              <td>Database, authentication, hosting of your data</td>
              <td>Account data, links, click analytics, AI history</td>
              <td>EU / US</td>
            </tr>
            <tr>
              <td>Vercel</td>
              <td>Application hosting &amp; edge network</td>
              <td>Request metadata, IP addresses</td>
              <td>US (global edge)</td>
            </tr>
            <tr>
              <td>Groq</td>
              <td>AI model provider (the AI Brain, reports, anomaly checks)</td>
              <td>Your AI messages + analytics context you run them against</td>
              <td>US</td>
            </tr>
            <tr>
              <td>Resend</td>
              <td>Transactional &amp; notification email delivery</td>
              <td>Email address, name, message content</td>
              <td>US</td>
            </tr>
            <tr>
              <td>Fanbasis</td>
              <td>Payments &amp; subscription billing</td>
              <td>Billing and subscription data</td>
              <td>US</td>
            </tr>
            <tr>
              <td>Meta / Instagram</td>
              <td>Instagram integration (only if you connect it)</td>
              <td>Instagram account ID, username, access token</td>
              <td>US</td>
            </tr>
            <tr>
              <td>Google</td>
              <td>Sign in with Google (only if you use it)</td>
              <td>Email, name, profile identifier</td>
              <td>US</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p>
        We do not sell your personal data, and we do not use third-party advertising
        or cross-site tracking pixels.
      </p>

      <h2>5. International transfers</h2>
      <p>
        Several of the providers above are based in the United States, so your data
        may be transferred outside the EU/UK. Where that happens, the transfer is
        covered by an appropriate safeguard — Standard Contractual Clauses (SCCs) or
        an adequacy decision (including the EU–US and UK–US Data Privacy Framework
        where the provider is certified).
      </p>

      <h2>6. How long we keep it</h2>
      <ul>
        <li><strong>Account data and content</strong> — kept while your account is active, and deleted when you delete your account (see section 8).</li>
        <li><strong>Click analytics with IP addresses</strong> — retained for up to <strong>90 days</strong>, after which IP addresses are automatically removed while aggregate, non-identifying counts may be kept.</li>
        <li><strong>Support messages</strong> — kept only as long as needed to handle your request.</li>
        <li><strong>Billing records</strong> — kept as long as required for legal and accounting purposes.</li>
      </ul>

      <h2>7. AI features</h2>
      <p>
        The <strong>AI Brain</strong>, weekly reports and anomaly insights are powered
        by an AI model provided by <strong>Groq</strong>. When you use them, the
        messages you send and the analytics context they run against are sent to Groq
        to generate a response. Responses are <strong>AI-generated</strong> and may be
        inaccurate — treat them as suggestions, not professional advice. We do not use
        your content to train third-party models.
      </p>

      <h2>8. Your rights</h2>
      <p>Under GDPR / UK GDPR you can:</p>
      <ul>
        <li><strong>Access</strong> a copy of your data.</li>
        <li><strong>Delete your account and data</strong> — from{" "}
          <Link href="/dashboard/settings">Settings → Danger Zone</Link>, which
          permanently removes your account, links, analytics and connected
          integrations.</li>
        <li><strong>Correct</strong> inaccurate data (e.g. your name in Settings).</li>
        <li><strong>Object to or restrict</strong> certain processing.</li>
        <li><strong>Data portability</strong> — request an export of your data.</li>
      </ul>
      <p>
        To exercise any of these, use the in-app controls or email{" "}
        <a href="mailto:privacy@tappr.me">privacy@tappr.me</a>. You also have the right
        to complain to your local data protection authority (in the UK, the ICO).
      </p>

      <h2>9. Cookies</h2>
      <p>
        We use only <strong>essential cookies</strong> needed to keep you signed in and
        to run the service securely. We do not use analytics or advertising cookies, so
        no cookie-consent banner is required.
      </p>

      <h2>10. Children</h2>
      <p>
        Tappr is not directed at children under 16. We do not knowingly collect data
        from them. If you believe a child has given us data, contact us and we will
        delete it.
      </p>

      <h2>11. Changes</h2>
      <p>
        We may update this policy as the product evolves. Material changes will be
        reflected in the &ldquo;last updated&rdquo; date above and, where appropriate,
        notified to you.
      </p>
    </LegalShell>
  );
}
