import { NextRequest, NextResponse } from "next/server";

// POST /api/verify-captcha — server-side validation of an hCaptcha token. The
// client widget alone can be bypassed; this confirms the token with hCaptcha
// before we let the referral funnel advance.
//
// Falls back to hCaptcha's official TEST secret (always passes) when
// HCAPTCHA_SECRET_KEY is unset, so dev works before real keys are configured.
const TEST_SECRET = "0x0000000000000000000000000000000000000000"; // hCaptcha test secret

export async function POST(request: NextRequest) {
  let token: string | undefined;
  try {
    ({ token } = await request.json());
  } catch {
    return NextResponse.json({ success: false, error: "bad request" }, { status: 400 });
  }
  if (!token) {
    return NextResponse.json({ success: false, error: "missing token" }, { status: 400 });
  }

  const secret = process.env.HCAPTCHA_SECRET_KEY || TEST_SECRET;
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();

  const form = new URLSearchParams();
  form.append("secret", secret);
  form.append("response", token);
  if (ip) form.append("remoteip", ip);

  try {
    const res = await fetch("https://api.hcaptcha.com/siteverify", {
      method: "POST",
      body: form,
    });
    const data = (await res.json()) as { success?: boolean };
    return NextResponse.json({ success: !!data.success });
  } catch {
    return NextResponse.json({ success: false, error: "verify failed" }, { status: 502 });
  }
}
