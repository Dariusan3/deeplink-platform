// Thin server-side wrapper around the FanBasis public-api.
//
// Auth: every request must carry `x-api-key`. We only call this from server
// routes — never expose FANBASIS_API_KEY to the browser.
//
// Endpoint shape (discovered live, not in the JSON-rendered docs):
//   POST   /checkout-sessions
//   GET    /checkout-sessions/:id
//   DELETE /checkout-sessions/:id
//   GET    /products
//   POST   /webhook-subscriptions
//   GET    /webhook-subscriptions
//   DELETE /webhook-subscriptions/:id
//
// Currently the only `type` accepted by /checkout-sessions is "subscription"
// — one-time payments are rejected ("The selected type is invalid.").

const API_BASE = process.env.FANBASIS_API_BASE || "https://www.fanbasis.com/public-api";
const API_KEY = process.env.FANBASIS_API_KEY || "";

export class FanBasisError extends Error {
  status: number;
  errors?: Record<string, string[]>;
  constructor(message: string, status: number, errors?: Record<string, string[]>) {
    super(message);
    this.status = status;
    this.errors = errors;
  }
}

type FBResponse<T> = {
  status: "success" | "error";
  message: string;
  data: T;
  errors?: Record<string, string[]>;
  request_id?: string;
};

async function call<T>(method: string, path: string, body?: unknown): Promise<T> {
  if (!API_KEY) throw new FanBasisError("FANBASIS_API_KEY missing", 500);

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      "x-api-key": API_KEY,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });

  let json: FBResponse<T> | null = null;
  try { json = (await res.json()) as FBResponse<T>; } catch { /* non-JSON */ }

  if (!res.ok || (json && json.status === "error")) {
    throw new FanBasisError(
      json?.message || `FanBasis ${method} ${path} failed (${res.status})`,
      res.status,
      json?.errors
    );
  }
  return (json?.data as T);
}

// ─── Checkout sessions ─────────────────────────────────────────

export type CreateCheckoutSessionInput = {
  productTitle: string;
  amountCents: number;
  // Currently only "subscription" is accepted by FanBasis.
  type: "subscription";
  // Required when type=subscription; the recurring period.
  frequencyDays: number;
  // Optional URLs FanBasis can bounce the buyer back to. Both are surfaced
  // in the hosted checkout — keep them absolute.
  successUrl?: string;
  cancelUrl?: string;
  // Pre-fill the buyer's email so they don't retype it on the checkout.
  customerEmail?: string;
  // Arbitrary key/value bag echoed back on every webhook event for this
  // session — we use it to match incoming payments to a Tappr team.
  metadata?: Record<string, string | number | boolean | null>;
};

export type CheckoutSession = {
  id: string;                  // 5-char public product id (used in payment_link)
  checkout_session_id: number; // numeric internal id (used for /:id ops)
  payment_link: string;        // hosted checkout URL — redirect the user here
};

export async function createCheckoutSession(input: CreateCheckoutSessionInput): Promise<CheckoutSession> {
  const body: Record<string, unknown> = {
    product: { title: input.productTitle },
    amount_cents: input.amountCents,
    type: input.type,
    subscription: { frequency_days: input.frequencyDays },
  };
  if (input.successUrl) body.success_url = input.successUrl;
  if (input.cancelUrl) body.cancel_url = input.cancelUrl;
  if (input.customerEmail) body.customer = { email: input.customerEmail };
  if (input.metadata) body.api_metadata = { data: input.metadata };
  return call<CheckoutSession>("POST", "/checkout-sessions", body);
}

export async function deleteCheckoutSession(checkoutSessionId: number | string) {
  return call<unknown>("DELETE", `/checkout-sessions/${checkoutSessionId}`);
}

// ─── Webhooks ──────────────────────────────────────────────────

export type WebhookEvent =
  | "payment.succeeded"
  | "payment.failed"
  | "payment.expired"
  | "payment.canceled"
  | "product.purchased"
  | "subscription.created"
  | "subscription.renewed"
  | "subscription.canceled"
  | "subscription.completed";

export type WebhookSubscription = {
  id: number;
  user_id: number;
  webhook_url: string;
  event_types: WebhookEvent[];
  secret_key: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export async function createWebhookSubscription(input: {
  webhookUrl: string;
  eventTypes: WebhookEvent[];
}): Promise<WebhookSubscription> {
  return call<WebhookSubscription>("POST", "/webhook-subscriptions", {
    webhook_url: input.webhookUrl,
    event_types: input.eventTypes,
  });
}

export async function listWebhookSubscriptions(): Promise<WebhookSubscription[]> {
  return call<WebhookSubscription[]>("GET", "/webhook-subscriptions");
}

export async function deleteWebhookSubscription(id: number) {
  return call<unknown>("DELETE", `/webhook-subscriptions/${id}`);
}

// ─── Plan catalog ──────────────────────────────────────────────
// Single source of truth for what a Tappr plan costs and how often it
// renews. Keep aligned with the public /pricing page and the billing UI.

export type TapprPlan = "starter" | "growth" | "agency";

export const TAPPR_PLANS: Record<TapprPlan, { title: string; amountCents: number; frequencyDays: number }> = {
  starter: { title: "Tappr Starter", amountCents: 8900,  frequencyDays: 30 },
  growth:  { title: "Tappr Growth",  amountCents: 18900, frequencyDays: 30 },
  agency:  { title: "Tappr Agency",  amountCents: 38900, frequencyDays: 30 },
};
