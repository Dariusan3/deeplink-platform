import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendContactMessage } from "@/lib/email";

// In-memory rate limit: 5 messages per IP per 10 minutes. Tiny but catches
// the obvious copy-paste spam bursts without needing Redis.
const rateLimit = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 5;

function tooManyRequests(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimit.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimit.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  entry.count++;
  return entry.count > MAX_PER_WINDOW;
}

setInterval(() => {
  const now = Date.now();
  for (const [k, v] of rateLimit) {
    if (now > v.resetAt) rateLimit.delete(k);
  }
}, WINDOW_MS);

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (tooManyRequests(ip)) {
    return NextResponse.json(
      { error: "Too many messages. Please try again in a few minutes." },
      { status: 429 }
    );
  }

  let body: { name?: string; email?: string; subject?: string; message?: string; honeypot?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  // Honeypot — hidden field that real users never fill. Bots do. Silent 200.
  if (body.honeypot) {
    return NextResponse.json({ ok: true });
  }

  const name = (body.name || "").trim();
  const email = (body.email || "").trim();
  const subject = (body.subject || "").trim();
  const message = (body.message || "").trim();

  if (!name || name.length > 100) {
    return NextResponse.json({ error: "Name is required (max 100 chars)." }, { status: 400 });
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 200) {
    return NextResponse.json({ error: "Valid email is required." }, { status: 400 });
  }
  if (subject.length > 200) {
    return NextResponse.json({ error: "Subject is too long (max 200 chars)." }, { status: 400 });
  }
  if (!message || message.length < 10 || message.length > 5000) {
    return NextResponse.json(
      { error: "Message must be between 10 and 5000 characters." },
      { status: 400 }
    );
  }

  // Attach user + team context when the sender is authenticated. Support
  // still gets messages from logged-out users, just without the extras.
  let userId: string | null = null;
  let teamName: string | null = null;
  try {
    const supabase = await createClient();
    const { data: authData } = await supabase.auth.getUser();
    if (authData?.user) {
      userId = authData.user.id;
      const { data: teamMember } = await supabase
        .from("team_members")
        .select("teams(name)")
        .eq("user_id", authData.user.id)
        .limit(1)
        .maybeSingle();
      const teamsField = (teamMember as { teams?: { name?: string } | { name?: string }[] } | null)?.teams;
      teamName = Array.isArray(teamsField)
        ? teamsField[0]?.name ?? null
        : teamsField?.name ?? null;
    }
  } catch {
    // Auth/context is best-effort; keep sending the message.
  }

  const result = await sendContactMessage({
    name,
    email,
    subject,
    message,
    userId,
    teamName,
  });

  if (!result.ok) {
    return NextResponse.json(
      { error: "Failed to send message. Please try again later." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
