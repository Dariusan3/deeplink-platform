import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "Tappr Alerts <alerts@tappr.me>";

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
