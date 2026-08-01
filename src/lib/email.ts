import { Resend } from "resend";
import { PARTNER_MIN_PAYOUT, PARTNER_COMMISSION_RATE } from "@/lib/partner-config";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "Tappr Alerts <alerts@tappr.me>";
const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL || "support@tappr.me";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function sendAnomalyEmail({
  to,
  teamName,
  severity,
  title,
  description,
  rootCause,
  action,
}: {
  to: string;
  teamName: string;
  severity: string;
  title: string;
  description: string;
  rootCause?: string | null;
  action?: string | null;
}) {
  if (!resend) {
    console.warn("RESEND_API_KEY not set — skipping email");
    return;
  }

  const severityColor = severity === "high" ? "#ef4444" : severity === "medium" ? "#f59e0b" : "#6b7280";
  const severityLabel = severity.toUpperCase();

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; background: #000; color: #fff; border-radius: 16px; overflow: hidden; border: 1px solid rgba(255,255,255,0.1);">
      <div style="padding: 24px 24px 16px; border-bottom: 1px solid rgba(255,255,255,0.05);">
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="font-size: 20px; font-weight: 900; color: #fff;">Ta<span style="color: #00D26A;">ppr</span></span>
          <span style="font-size: 10px; font-weight: 800; color: ${severityColor}; background: ${severityColor}20; padding: 2px 8px; border-radius: 20px; text-transform: uppercase; letter-spacing: 0.1em;">${severityLabel} ALERT</span>
        </div>
        <p style="font-size: 11px; color: #666; margin: 4px 0 0; text-transform: uppercase; letter-spacing: 0.15em; font-weight: 700;">Team: ${teamName}</p>
      </div>
      <div style="padding: 20px 24px;">
        <h2 style="font-size: 18px; font-weight: 900; color: #fff; margin: 0 0 8px;">${title}</h2>
        <p style="font-size: 14px; color: #999; line-height: 1.6; margin: 0 0 16px;">${description}</p>
        ${rootCause ? `
        <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.05); border-radius: 8px; padding: 12px; margin-bottom: 12px;">
          <p style="font-size: 10px; color: #666; text-transform: uppercase; letter-spacing: 0.1em; font-weight: 800; margin: 0 0 4px;">Root Cause</p>
          <p style="font-size: 13px; color: #ccc; margin: 0;">${rootCause}</p>
        </div>` : ""}
        ${action ? `
        <div style="background: rgba(0,210,106,0.05); border: 1px solid rgba(0,210,106,0.15); border-radius: 8px; padding: 12px;">
          <p style="font-size: 10px; color: #00D26A; text-transform: uppercase; letter-spacing: 0.1em; font-weight: 800; margin: 0 0 4px;">Recommended Action</p>
          <p style="font-size: 13px; color: #ccc; margin: 0;">${action}</p>
        </div>` : ""}
      </div>
      <div style="padding: 16px 24px; border-top: 1px solid rgba(255,255,255,0.05); text-align: center;">
        <a href="https://tappr.me/dashboard/alerts" style="display: inline-block; background: #00D26A; color: #000; font-size: 12px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.1em; padding: 10px 24px; border-radius: 8px; text-decoration: none;">View in Dashboard</a>
      </div>
      <div style="padding: 12px 24px; text-align: center;">
        <p style="font-size: 10px; color: #444; margin: 0;">Tappr AI Anomaly Detection — Real-time monitoring for your links</p>
      </div>
    </div>
  `;

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject: `[${severityLabel}] ${title} — ${teamName}`,
      html,
    });
  } catch (err) {
    console.error("Failed to send anomaly email:", err);
  }
}

// Deliverability defaults shared by notification emails. A List-Unsubscribe
// header (plus a plain-text alternative and a natural, non-shouty subject) is
// what keeps Gmail/Yahoo from binning notification mail as spam.
const ALERT_HEADERS = {
  "List-Unsubscribe": `<mailto:${SUPPORT_EMAIL}?subject=unsubscribe%20alerts>, <https://tappr.me/dashboard/alerts>`,
};

type DigestAlert = {
  severity: string;
  title: string;
  description: string;
  affectedLink?: string | null;
  detectedAt?: string | null; // ISO date; renders a small "when" line if present
};

const SEVERITY_META: Record<string, { label: string; color: string; bg: string }> = {
  high:   { label: "Critical", color: "#ef4444", bg: "rgba(239,68,68,0.14)" },
  medium: { label: "Warning",  color: "#f59e0b", bg: "rgba(245,158,11,0.14)" },
  low:    { label: "Heads up", color: "#9ca3af", bg: "rgba(156,163,175,0.14)" },
};
const sevMeta = (s: string) => SEVERITY_META[s] ?? SEVERITY_META.low;

// Bold the numbers that carry the news (percentages, status codes) so the eye
// lands on "404" / "63%" instead of reading the whole sentence.
function emphasizeNumbers(s: string): string {
  return escapeHtml(s).replace(
    /(\d[\d,.]*%|\b\d{3,}\b)/g,
    '<strong style="color:#fff;">$1</strong>'
  );
}

function whenLabel(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

// One digest per team per run — never N separate emails. This is the ONLY alert
// email path: it fires from the detector cron on freshly-inserted alerts, so a
// persistent condition (which the detector dedup refuses to re-insert) can't
// re-email day after day.
export async function sendAlertDigestEmail({
  to,
  teamName,
  alerts,
}: {
  to: string;
  teamName: string;
  alerts: DigestAlert[];
}) {
  if (!resend) {
    console.warn("RESEND_API_KEY not set — skipping alert digest");
    return;
  }
  if (alerts.length === 0) return;

  const count = alerts.length;
  const top = alerts[0];
  const subject =
    count === 1 ? `${top.title} — ${teamName}` : `${count} new alerts for ${teamName}`;

  // Inbox preview line (preheader) — the first bit of text Gmail shows next to
  // the subject. Summarize instead of leaking raw markup.
  const sevCounts = alerts.reduce<Record<string, number>>((m, a) => {
    m[a.severity] = (m[a.severity] ?? 0) + 1;
    return m;
  }, {});
  const preheader =
    Object.entries(sevCounts)
      .map(([s, n]) => `${n} ${sevMeta(s).label.toLowerCase()}`)
      .join(" · ") + ` on ${teamName}`;

  const rows = alerts
    .map((a) => {
      const m = sevMeta(a.severity);
      const when = whenLabel(a.detectedAt);
      const linkHref = a.affectedLink
        ? (a.affectedLink.startsWith("http") ? a.affectedLink : `https://${a.affectedLink}`)
        : null;
      return `
        <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-left: 3px solid ${m.color}; border-radius: 10px; padding: 14px 16px; margin-bottom: 10px;">
          <span style="display:inline-block; font-size:9px; font-weight:900; text-transform:uppercase; letter-spacing:0.12em; color:${m.color}; background:${m.bg}; padding:3px 8px; border-radius:20px;">${m.label}</span>
          ${when ? `<span style="font-size:10px; color:#555; margin-left:8px;">${when}</span>` : ""}
          <p style="font-size: 15px; font-weight: 800; color: #fff; margin: 8px 0 4px;">${escapeHtml(a.title)}</p>
          <p style="font-size: 13px; color: #9aa0a6; line-height: 1.6; margin: 0;">${emphasizeNumbers(a.description)}</p>
          ${linkHref ? `<a href="${linkHref}" style="display:inline-block; font-size: 12px; color: #00D26A; margin: 8px 0 0; font-family: ui-monospace, monospace; text-decoration:none;">${escapeHtml(a.affectedLink as string)} &rarr;</a>` : ""}
        </div>`;
    })
    .join("");

  const html = `
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${escapeHtml(preheader)}</div>
    <div style="background:#0b0b0b; padding:24px 12px;">
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; background: #000; color: #fff; border-radius: 16px; overflow: hidden; border: 1px solid rgba(255,255,255,0.1);">
        <div style="padding: 24px 24px 18px; border-bottom: 1px solid rgba(255,255,255,0.05);">
          <span style="font-size: 20px; font-weight: 900; color: #fff;">Ta<span style="color: #00D26A;">ppr</span></span>
          <p style="font-size: 11px; color: #666; margin: 6px 0 0; text-transform: uppercase; letter-spacing: 0.15em; font-weight: 700;">${count === 1 ? "New alert" : `${count} new alerts`} · ${escapeHtml(teamName)}</p>
          <p style="font-size: 13px; color: #9aa0a6; margin: 10px 0 0;">Here's what needs your attention on <strong style="color:#fff;">${escapeHtml(teamName)}</strong>.</p>
        </div>
        <div style="padding: 20px 24px;">${rows}</div>
        <div style="padding: 4px 24px 22px; text-align: center;">
          <a href="https://tappr.me/dashboard/alerts" style="display: inline-block; background: #00D26A; color: #000; font-size: 12px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.1em; padding: 11px 26px; border-radius: 8px; text-decoration: none;">View in dashboard</a>
        </div>
        <div style="padding: 14px 24px; text-align: center; border-top: 1px solid rgba(255,255,255,0.05);">
          <p style="font-size: 10px; color: #555; margin: 0; line-height:1.6;">You're getting this because alerts are on for ${escapeHtml(teamName)}.<br/>
            <a href="https://tappr.me/dashboard/alerts" style="color:#888; text-decoration:underline;">Manage alerts</a>
            &nbsp;·&nbsp;
            <a href="mailto:${SUPPORT_EMAIL}?subject=unsubscribe%20alerts" style="color:#888; text-decoration:underline;">Unsubscribe</a>
          </p>
        </div>
      </div>
    </div>`;

  const text = [
    preheader,
    "",
    ...alerts.map((a) => {
      const when = whenLabel(a.detectedAt);
      return `• [${sevMeta(a.severity).label.toUpperCase()}]${when ? ` (${when})` : ""} ${a.title}\n  ${a.description}${a.affectedLink ? `\n  ${a.affectedLink}` : ""}`;
    }),
    "",
    "View in dashboard: https://tappr.me/dashboard/alerts",
    "",
    `You're getting this because alerts are on for ${teamName}.`,
    "Manage alerts: https://tappr.me/dashboard/alerts",
    `Unsubscribe: email ${SUPPORT_EMAIL} with subject "unsubscribe alerts"`,
  ].join("\n");

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to,
      replyTo: SUPPORT_EMAIL,
      subject,
      html,
      text,
      headers: ALERT_HEADERS,
    });
  } catch (err) {
    console.error("Failed to send alert digest:", err);
  }
}

export async function sendABWinnerEmail({
  to,
  teamName,
  testName,
  testSlug,
  winnerName,
  winnerUrl,
  winnerVisits,
  winnerConversions,
  loserName,
  loserVisits,
  loserConversions,
}: {
  to: string;
  teamName: string;
  testName: string;
  testSlug: string;
  winnerName: string;
  winnerUrl: string;
  winnerVisits: number;
  winnerConversions: number;
  loserName: string;
  loserVisits: number;
  loserConversions: number;
}) {
  if (!resend) {
    console.warn("RESEND_API_KEY not set — skipping A/B winner email");
    return;
  }

  const winnerRate = winnerVisits > 0 ? (winnerConversions / winnerVisits) * 100 : 0;
  const loserRate = loserVisits > 0 ? (loserConversions / loserVisits) * 100 : 0;
  const lift = loserRate > 0 ? ((winnerRate - loserRate) / loserRate) * 100 : 0;
  const testUrl = `https://tappr.me/${testSlug}`;

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; background: #000; color: #fff; border-radius: 16px; overflow: hidden; border: 1px solid rgba(255,255,255,0.1);">
      <div style="padding: 24px 24px 16px; border-bottom: 1px solid rgba(255,255,255,0.05);">
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="font-size: 20px; font-weight: 900; color: #fff;">Ta<span style="color: #00D26A;">ppr</span></span>
          <span style="font-size: 10px; font-weight: 800; color: #00D26A; background: rgba(0,210,106,0.1); padding: 2px 8px; border-radius: 20px; text-transform: uppercase; letter-spacing: 0.1em;">A/B WINNER</span>
        </div>
        <p style="font-size: 11px; color: #666; margin: 4px 0 0; text-transform: uppercase; letter-spacing: 0.15em; font-weight: 700;">Team: ${teamName}</p>
      </div>
      <div style="padding: 20px 24px;">
        <h2 style="font-size: 18px; font-weight: 900; color: #fff; margin: 0 0 4px;">${testName}</h2>
        <p style="font-size: 13px; color: #999; margin: 0 0 20px;">Auto-optimization picked a winner. Your A/B test URL now routes 100% of traffic to it.</p>

        <div style="background: rgba(0,210,106,0.08); border: 1px solid rgba(0,210,106,0.25); border-radius: 12px; padding: 16px; margin-bottom: 16px;">
          <p style="font-size: 10px; color: #00D26A; text-transform: uppercase; letter-spacing: 0.15em; font-weight: 800; margin: 0 0 8px;">Winner — ${winnerName}</p>
          <p style="font-size: 14px; color: #fff; margin: 0 0 12px; word-break: break-all; font-family: ui-monospace, monospace;">${winnerUrl}</p>
          <div style="display: flex; gap: 16px;">
            <div><p style="font-size: 9px; color: #666; text-transform: uppercase; letter-spacing: 0.1em; margin: 0;">Visits</p><p style="font-size: 14px; color: #fff; font-weight: 800; margin: 2px 0 0;">${winnerVisits.toLocaleString()}</p></div>
            <div><p style="font-size: 9px; color: #666; text-transform: uppercase; letter-spacing: 0.1em; margin: 0;">Conversions</p><p style="font-size: 14px; color: #fff; font-weight: 800; margin: 2px 0 0;">${winnerConversions.toLocaleString()}</p></div>
            <div><p style="font-size: 9px; color: #666; text-transform: uppercase; letter-spacing: 0.1em; margin: 0;">Conv. Rate</p><p style="font-size: 14px; color: #00D26A; font-weight: 800; margin: 2px 0 0;">${winnerRate.toFixed(2)}%</p></div>
          </div>
        </div>

        <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); border-radius: 12px; padding: 16px; margin-bottom: 16px;">
          <p style="font-size: 10px; color: #666; text-transform: uppercase; letter-spacing: 0.15em; font-weight: 800; margin: 0 0 8px;">Loser — ${loserName}</p>
          <div style="display: flex; gap: 16px;">
            <div><p style="font-size: 9px; color: #666; text-transform: uppercase; letter-spacing: 0.1em; margin: 0;">Visits</p><p style="font-size: 14px; color: #999; font-weight: 800; margin: 2px 0 0;">${loserVisits.toLocaleString()}</p></div>
            <div><p style="font-size: 9px; color: #666; text-transform: uppercase; letter-spacing: 0.1em; margin: 0;">Conversions</p><p style="font-size: 14px; color: #999; font-weight: 800; margin: 2px 0 0;">${loserConversions.toLocaleString()}</p></div>
            <div><p style="font-size: 9px; color: #666; text-transform: uppercase; letter-spacing: 0.1em; margin: 0;">Conv. Rate</p><p style="font-size: 14px; color: #999; font-weight: 800; margin: 2px 0 0;">${loserRate.toFixed(2)}%</p></div>
          </div>
        </div>

        ${lift > 0 ? `
        <div style="background: rgba(0,210,106,0.05); border: 1px solid rgba(0,210,106,0.15); border-radius: 8px; padding: 12px; margin-bottom: 16px;">
          <p style="font-size: 13px; color: #00D26A; margin: 0; font-weight: 700;">+${lift.toFixed(0)}% lift over the losing variant</p>
        </div>` : ""}

        <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; padding: 12px;">
          <p style="font-size: 10px; color: #666; text-transform: uppercase; letter-spacing: 0.1em; font-weight: 800; margin: 0 0 4px;">Put this on your CTA button</p>
          <p style="font-size: 13px; color: #fff; margin: 0; font-family: ui-monospace, monospace;">${testUrl}</p>
        </div>
      </div>
      <div style="padding: 16px 24px; border-top: 1px solid rgba(255,255,255,0.05); text-align: center;">
        <a href="https://tappr.me/dashboard/ab-testing" style="display: inline-block; background: #00D26A; color: #000; font-size: 12px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.1em; padding: 10px 24px; border-radius: 8px; text-decoration: none;">View in Dashboard</a>
      </div>
      <div style="padding: 12px 24px; text-align: center;">
        <p style="font-size: 10px; color: #444; margin: 0;">Tappr A/B Testing — Auto-optimized routing for your links</p>
      </div>
    </div>
  `;

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject: `Winner picked: ${winnerName} — ${testName}`,
      html,
    });
  } catch (err) {
    console.error("Failed to send A/B winner email:", err);
  }
}

export async function sendContactMessage({
  name,
  email,
  subject,
  message,
  userId,
  teamName,
}: {
  name: string;
  email: string;
  subject: string;
  message: string;
  userId?: string | null;
  teamName?: string | null;
}): Promise<{ ok: boolean; reason?: string }> {
  if (!resend) {
    console.warn("RESEND_API_KEY not set — can't send contact message");
    return { ok: false, reason: "email_not_configured" };
  }

  const safeName = escapeHtml(name);
  const safeEmail = escapeHtml(email);
  const safeSubject = escapeHtml(subject || "(no subject)");
  const safeMessage = escapeHtml(message).replace(/\n/g, "<br/>");
  const meta = [
    userId ? `User ID: ${escapeHtml(userId)}` : null,
    teamName ? `Team: ${escapeHtml(teamName)}` : null,
  ].filter(Boolean).join(" · ");

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; background: #000; color: #fff; border-radius: 16px; overflow: hidden; border: 1px solid rgba(255,255,255,0.1);">
      <div style="padding: 24px 24px 16px; border-bottom: 1px solid rgba(255,255,255,0.05);">
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="font-size: 20px; font-weight: 900; color: #fff;">Ta<span style="color: #00D26A;">ppr</span></span>
          <span style="font-size: 10px; font-weight: 800; color: #00D26A; background: rgba(0,210,106,0.1); padding: 2px 8px; border-radius: 20px; text-transform: uppercase; letter-spacing: 0.1em;">CONTACT</span>
        </div>
        ${meta ? `<p style="font-size: 11px; color: #666; margin: 6px 0 0; font-weight: 600;">${meta}</p>` : ""}
      </div>
      <div style="padding: 20px 24px;">
        <p style="font-size: 11px; color: #666; text-transform: uppercase; letter-spacing: 0.15em; font-weight: 800; margin: 0 0 4px;">From</p>
        <p style="font-size: 14px; color: #fff; margin: 0 0 12px;">${safeName} &lt;${safeEmail}&gt;</p>

        <p style="font-size: 11px; color: #666; text-transform: uppercase; letter-spacing: 0.15em; font-weight: 800; margin: 0 0 4px;">Subject</p>
        <p style="font-size: 14px; color: #fff; margin: 0 0 16px;">${safeSubject}</p>

        <p style="font-size: 11px; color: #666; text-transform: uppercase; letter-spacing: 0.15em; font-weight: 800; margin: 0 0 4px;">Message</p>
        <div style="font-size: 14px; color: #ccc; line-height: 1.6; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); border-radius: 8px; padding: 12px; white-space: pre-wrap;">${safeMessage}</div>
      </div>
    </div>
  `;

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: SUPPORT_EMAIL,
      // Use Reply-To so the support inbox can reply to the user directly,
      // but keep the sender as our verified domain (deliverability).
      replyTo: email,
      subject: `[Contact] ${subject || "(no subject)"} — ${name}`,
      html,
    });
    return { ok: true };
  } catch (err) {
    console.error("Failed to send contact message:", err);
    return { ok: false, reason: "send_failed" };
  }
}

// ─── Partner system emails ────────────────────────────────

const partnerEmailShell = (innerHtml: string, badge: string) => `
  <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; background: #000; color: #fff; border-radius: 16px; overflow: hidden; border: 1px solid rgba(255,255,255,0.1);">
    <div style="padding: 24px 24px 16px; border-bottom: 1px solid rgba(255,255,255,0.05);">
      <div style="display: flex; align-items: center; gap: 8px;">
        <span style="font-size: 20px; font-weight: 900; color: #fff;">Ta<span style="color: #00D26A;">ppr</span></span>
        <span style="font-size: 10px; font-weight: 800; color: #00D26A; background: rgba(0,210,106,0.1); padding: 2px 8px; border-radius: 20px; text-transform: uppercase; letter-spacing: 0.1em;">${badge}</span>
      </div>
    </div>
    <div style="padding: 20px 24px;">${innerHtml}</div>
    <div style="padding: 16px 24px; text-align: center;">
      <a href="https://tappr.me/partner" style="display: inline-block; background: #00D26A; color: #000; font-size: 12px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.1em; padding: 10px 24px; border-radius: 8px; text-decoration: none;">Open Partner Dashboard</a>
    </div>
  </div>`;

export async function sendPartnerWelcomeEmail({
  to,
  name,
  referralUrl,
}: {
  to: string;
  name: string;
  referralUrl: string;
}) {
  if (!resend) return;
  const safeName = escapeHtml(name);
  const safeUrl = escapeHtml(referralUrl);
  const partnerPct = Math.round(PARTNER_COMMISSION_RATE * 100);
  const html = partnerEmailShell(`
    <h2 style="font-size: 18px; font-weight: 900; color: #fff; margin: 0 0 8px;">Welcome to the Tappr Partner Program, ${safeName}</h2>
    <p style="font-size: 14px; color: #999; line-height: 1.6; margin: 0 0 20px;">Your account is now activated. You earn <strong style="color:#00D26A">${partnerPct}% recurring</strong> on every paying customer you refer — for as long as they stay subscribed.</p>
    <div style="background: rgba(0,210,106,0.05); border: 1px solid rgba(0,210,106,0.15); border-radius: 8px; padding: 14px; margin-bottom: 16px;">
      <p style="font-size: 10px; color: #00D26A; text-transform: uppercase; letter-spacing: 0.15em; font-weight: 800; margin: 0 0 6px;">Your referral link</p>
      <p style="font-size: 13px; color: #fff; margin: 0; font-family: ui-monospace, monospace; word-break: break-all;">${safeUrl}</p>
    </div>
    <p style="font-size: 13px; color: #ccc; line-height: 1.7; margin: 0;">Share this link anywhere — social, email, DMs. Anyone who signs up through it is permanently linked to your partner account. Once they upgrade to a paid plan, you start earning every month.</p>
  `, "PARTNER ACTIVATED");
  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject: `You're now a Tappr Partner — start earning ${partnerPct}%`,
      html,
    });
  } catch (err) {
    console.error("Failed to send partner welcome email:", err);
  }
}

export async function sendPartnerReferralConvertedEmail({
  to,
  name,
  referredEmail,
  plan,
  monthlyValue,
  commission,
}: {
  to: string;
  name: string;
  referredEmail: string;
  plan: string;
  monthlyValue: number;
  commission: number;
}) {
  if (!resend) return;
  const html = partnerEmailShell(`
    <h2 style="font-size: 18px; font-weight: 900; color: #fff; margin: 0 0 8px;">A referral just converted 🎉</h2>
    <p style="font-size: 14px; color: #999; line-height: 1.6; margin: 0 0 16px;">Hey ${escapeHtml(name)} — <strong style="color:#fff">${escapeHtml(referredEmail)}</strong> just upgraded to the <strong style="color:#00D26A">${escapeHtml(plan)}</strong> plan.</p>
    <div style="background: rgba(0,210,106,0.05); border: 1px solid rgba(0,210,106,0.15); border-radius: 8px; padding: 16px; margin-bottom: 12px;">
      <div style="display: flex; gap: 24px;">
        <div><p style="font-size: 9px; color: #666; text-transform: uppercase; letter-spacing: 0.1em; margin: 0;">Their plan</p><p style="font-size: 16px; color: #fff; font-weight: 800; margin: 2px 0 0;">€${monthlyValue}/mo</p></div>
        <div><p style="font-size: 9px; color: #666; text-transform: uppercase; letter-spacing: 0.1em; margin: 0;">Your commission</p><p style="font-size: 16px; color: #00D26A; font-weight: 800; margin: 2px 0 0;">€${commission.toFixed(2)}/mo</p></div>
      </div>
    </div>
    <p style="font-size: 13px; color: #ccc; margin: 0;">Recurring — credited every month they stay subscribed.</p>
  `, "REFERRAL CONVERTED");
  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject: `+€${commission.toFixed(2)}/mo — your referral upgraded`,
      html,
    });
  } catch (err) {
    console.error("Failed to send referral-converted email:", err);
  }
}

export async function sendPartnerPayoutConfirmedEmail({
  to,
  name,
  amount,
  method,
  reference,
}: {
  to: string;
  name: string;
  amount: number;
  method: string;
  reference: string | null;
}) {
  if (!resend) return;
  const html = partnerEmailShell(`
    <h2 style="font-size: 18px; font-weight: 900; color: #fff; margin: 0 0 8px;">Payout sent</h2>
    <p style="font-size: 14px; color: #999; line-height: 1.6; margin: 0 0 16px;">Hey ${escapeHtml(name)} — your payout has been processed.</p>
    <div style="background: rgba(0,210,106,0.05); border: 1px solid rgba(0,210,106,0.15); border-radius: 8px; padding: 16px; margin-bottom: 12px;">
      <p style="font-size: 26px; color: #00D26A; font-weight: 900; margin: 0 0 4px;">€${amount.toFixed(2)}</p>
      <p style="font-size: 11px; color: #999; margin: 0;">via ${escapeHtml(method)}</p>
      ${reference ? `<p style="font-size: 11px; color: #666; margin: 6px 0 0;">Ref: ${escapeHtml(reference)}</p>` : ""}
    </div>
    <p style="font-size: 13px; color: #ccc; margin: 0;">Thanks for being part of the Tappr Partner Program. Keep sharing your link to earn more.</p>
  `, "PAYOUT PROCESSED");
  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject: `Payout processed: €${amount.toFixed(2)}`,
      html,
    });
  } catch (err) {
    console.error("Failed to send payout-confirmed email:", err);
  }
}

export async function sendPartnerMonthlyReportEmail({
  to,
  name,
  totalEarned,
  newReferrals,
  activeReferrals,
  pendingPayout,
  monthName,
}: {
  to: string;
  name: string;
  totalEarned: number;
  newReferrals: number;
  activeReferrals: number;
  pendingPayout: number;
  monthName: string;
}) {
  if (!resend) return;
  const html = partnerEmailShell(`
    <h2 style="font-size: 18px; font-weight: 900; color: #fff; margin: 0 0 8px;">${escapeHtml(monthName)} — partner recap</h2>
    <p style="font-size: 14px; color: #999; line-height: 1.6; margin: 0 0 16px;">Hey ${escapeHtml(name)} — here's how last month went.</p>
    <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-bottom: 16px;">
      <div style="background: rgba(0,210,106,0.05); border: 1px solid rgba(0,210,106,0.15); border-radius: 8px; padding: 12px;"><p style="font-size: 9px; color: #666; text-transform: uppercase; letter-spacing: 0.1em; margin: 0;">Earned</p><p style="font-size: 20px; color: #00D26A; font-weight: 900; margin: 4px 0 0;">€${totalEarned.toFixed(2)}</p></div>
      <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); border-radius: 8px; padding: 12px;"><p style="font-size: 9px; color: #666; text-transform: uppercase; letter-spacing: 0.1em; margin: 0;">New referrals</p><p style="font-size: 20px; color: #fff; font-weight: 900; margin: 4px 0 0;">${newReferrals}</p></div>
      <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); border-radius: 8px; padding: 12px;"><p style="font-size: 9px; color: #666; text-transform: uppercase; letter-spacing: 0.1em; margin: 0;">Active</p><p style="font-size: 20px; color: #fff; font-weight: 900; margin: 4px 0 0;">${activeReferrals}</p></div>
      <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); border-radius: 8px; padding: 12px;"><p style="font-size: 9px; color: #666; text-transform: uppercase; letter-spacing: 0.1em; margin: 0;">Pending payout</p><p style="font-size: 20px; color: #fff; font-weight: 900; margin: 4px 0 0;">€${pendingPayout.toFixed(2)}</p></div>
    </div>
    <p style="font-size: 13px; color: #ccc; margin: 0;">${pendingPayout >= PARTNER_MIN_PAYOUT ? `You can request a payout anytime — minimum €${PARTNER_MIN_PAYOUT} is met.` : `Once your pending payout reaches €${PARTNER_MIN_PAYOUT} you can request a withdrawal.`}</p>
  `, `${monthName.toUpperCase()} REPORT`);
  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject: `Your Tappr Partner recap — ${monthName}`,
      html,
    });
  } catch (err) {
    console.error("Failed to send partner monthly email:", err);
  }
}
