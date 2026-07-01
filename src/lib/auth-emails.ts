import { Resend } from "resend";

// Branded HTML for the Supabase Auth emails (confirm signup, reset password,
// invite, magic link, email change, reauthentication). These are sent from
// our own /api/auth/send-email hook via Resend — Supabase hands us the
// verification token, we render + deliver the email ourselves. Styling
// mirrors src/lib/email.ts (dark card, #00D26A accent, "Ta·ppr" wordmark).

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

// Auth emails go from a dedicated sender so they don't blend with product
// alerts. Falls back to the shared alerts sender / domain if not set.
const AUTH_FROM_EMAIL =
  process.env.RESEND_AUTH_FROM_EMAIL || "Tappr <accounts@tappr.me>";

// Supabase auth email action types (the `email_action_type` field).
export type EmailActionType =
  | "signup"
  | "recovery"
  | "invite"
  | "magiclink"
  | "email_change"
  | "email_change_current"
  | "email_change_new"
  | "reauthentication";

interface AuthEmailCopy {
  subject: string;
  heading: string;
  preview: string;
  body: string;
  cta: string;
  // reauthentication uses a 6-digit code instead of a button link
  isCode?: boolean;
}

function copyFor(type: EmailActionType): AuthEmailCopy {
  switch (type) {
    case "signup":
      return {
        subject: "Confirm your email · Tappr",
        heading: "Confirm your email",
        preview: "One tap to activate your Tappr account.",
        body: "Welcome to Tappr. Confirm this address to activate your account and start shortening, routing and tracking your links.",
        cta: "Confirm email",
      };
    case "recovery":
      return {
        subject: "Reset your password · Tappr",
        heading: "Reset your password",
        preview: "Set a new password for your Tappr account.",
        body: "We received a request to reset your Tappr password. Click below to choose a new one. If you didn't ask for this, you can safely ignore this email — your password won't change.",
        cta: "Reset password",
      };
    case "invite":
      return {
        subject: "You've been invited to Tappr",
        heading: "You've been invited",
        preview: "Join your team on Tappr.",
        body: "You've been invited to collaborate on Tappr. Accept the invite below to set up your account and join your team.",
        cta: "Accept invite",
      };
    case "magiclink":
      return {
        subject: "Your sign-in link · Tappr",
        heading: "Sign in to Tappr",
        preview: "Your one-tap sign-in link.",
        body: "Click below to sign in to Tappr. This link works once and expires shortly. If you didn't request it, just ignore this email.",
        cta: "Sign in",
      };
    case "email_change":
    case "email_change_current":
    case "email_change_new":
      return {
        subject: "Confirm your new email · Tappr",
        heading: "Confirm your new email",
        preview: "Verify your new email address.",
        body: "Confirm this address to finish updating the email on your Tappr account. If you didn't request this change, please contact support.",
        cta: "Confirm email",
      };
    case "reauthentication":
      return {
        subject: "Your verification code · Tappr",
        heading: "Verification code",
        preview: "Enter this code to continue.",
        body: "Enter the code below to confirm it's really you. It expires in a few minutes.",
        cta: "",
        isCode: true,
      };
  }
}

// Shared dark-card shell — matches the product emails in src/lib/email.ts.
function shell({
  heading,
  preview,
  body,
  cta,
  actionUrl,
  code,
}: {
  heading: string;
  preview: string;
  body: string;
  cta: string;
  actionUrl?: string;
  code?: string;
}): string {
  return `
  <div style="background:#0a0a0a;padding:32px 16px;">
    <span style="display:none;max-height:0;overflow:hidden;opacity:0;color:#0a0a0a;">${preview}</span>
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:520px;margin:0 auto;background:#000;color:#fff;border-radius:16px;overflow:hidden;border:1px solid rgba(255,255,255,0.1);">
      <div style="padding:28px 28px 0;">
        <span style="font-size:22px;font-weight:900;color:#fff;letter-spacing:-0.02em;">Ta<span style="color:#00D26A;">ppr</span></span>
      </div>
      <div style="padding:20px 28px 8px;">
        <h1 style="font-size:22px;font-weight:900;color:#fff;margin:0 0 12px;letter-spacing:-0.02em;">${heading}</h1>
        <p style="font-size:14px;color:#9a9a9a;line-height:1.65;margin:0 0 24px;">${body}</p>
        ${
          code
            ? `<div style="text-align:center;margin:8px 0 24px;">
                 <div style="display:inline-block;background:rgba(0,210,106,0.06);border:1px solid rgba(0,210,106,0.25);border-radius:12px;padding:16px 28px;font-size:30px;font-weight:900;letter-spacing:0.35em;color:#00D26A;font-family:'SF Mono',ui-monospace,Menlo,monospace;">${code}</div>
               </div>`
            : `<div style="margin:0 0 24px;">
                 <a href="${actionUrl}" style="display:inline-block;background:#00D26A;color:#000;font-size:14px;font-weight:900;text-transform:uppercase;letter-spacing:0.08em;padding:13px 30px;border-radius:10px;text-decoration:none;">${cta}</a>
               </div>
               <p style="font-size:12px;color:#666;line-height:1.6;margin:0 0 4px;">Or paste this link into your browser:</p>
               <p style="font-size:12px;margin:0;word-break:break-all;"><a href="${actionUrl}" style="color:#00D26A;text-decoration:none;">${actionUrl}</a></p>`
        }
      </div>
      <div style="padding:20px 28px 28px;border-top:1px solid rgba(255,255,255,0.06);margin-top:20px;">
        <p style="font-size:11px;color:#555;margin:0;line-height:1.6;">You're receiving this because someone used this address on <a href="https://tappr.me" style="color:#777;text-decoration:none;">tappr.me</a>. If it wasn't you, you can ignore this email.</p>
      </div>
    </div>
    <p style="text-align:center;font-size:11px;color:#444;margin:16px 0 0;">© Tappr — smart deep links &amp; link routing</p>
  </div>`;
}

export function renderAuthEmail(
  type: EmailActionType,
  opts: { actionUrl?: string; code?: string }
): { subject: string; html: string } {
  const c = copyFor(type);
  return {
    subject: c.subject,
    html: shell({
      heading: c.heading,
      preview: c.preview,
      body: c.body,
      cta: c.cta,
      actionUrl: opts.actionUrl,
      code: c.isCode ? opts.code : undefined,
    }),
  };
}

export async function sendAuthEmail({
  to,
  type,
  actionUrl,
  code,
}: {
  to: string;
  type: EmailActionType;
  actionUrl?: string;
  code?: string;
}): Promise<void> {
  if (!resend) {
    console.warn("RESEND_API_KEY not set — skipping auth email");
    return;
  }
  const { subject, html } = renderAuthEmail(type, { actionUrl, code });
  // The Resend SDK does NOT throw on API errors — it returns { data, error }.
  // Surface the error so the hook route returns 500 (and Supabase retries)
  // instead of silently reporting success while nothing was delivered.
  const { error } = await resend.emails.send({ from: AUTH_FROM_EMAIL, to, subject, html });
  if (error) {
    throw new Error(`Resend send failed: ${error.message ?? JSON.stringify(error)}`);
  }
}
