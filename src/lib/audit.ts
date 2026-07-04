// Append-only audit logger. Every call writes a row to `audit_log` via
// service-role (RLS is admin-read-only) so it's safe to use from any
// route — webhooks, billing endpoints, auth callback, crons.
//
// Failures are swallowed and logged to stderr — auditing must never
// block the underlying business operation.

import type { SupabaseClient } from "@supabase/supabase-js";

export type AuditSeverity = "info" | "success" | "warning" | "error";

// Use dot-separated namespaces so filters can match prefixes ("payment.*"
// "subscription.*" etc.). Add new entries here as features grow.
export type AuditEventType =
  | "user.signed_up"
  | "user.signed_in"
  | "billing.checkout_started"
  | "payment.succeeded"
  | "payment.failed"
  | "payment.canceled"
  | "payment.expired"
  | "subscription.created"
  | "subscription.renewed"
  | "subscription.canceled"
  | "subscription.completed"
  | "partner.referral_created"
  | "partner.commission_paid"
  | "partner.payout_requested"
  | "partner.payout_processed"
  | "admin.user_toggled_admin"
  | "admin.partner_activated"
  | "admin.granted_plan"
  | "admin.canceled_plan"
  | "admin.reset_password"
  | "team.created"
  | "team.member_added"
  | "team.member_removed";

export interface LogAuditEventInput {
  eventType: AuditEventType;
  description: string;
  actorUserId?: string | null;
  actorEmail?: string | null;
  teamId?: string | null;
  targetUserId?: string | null;
  targetEmail?: string | null;
  metadata?: Record<string, unknown> | null;
  source?: string;
  severity?: AuditSeverity;
}

export async function logAuditEvent(
  supabase: SupabaseClient,
  input: LogAuditEventInput
): Promise<void> {
  try {
    const { error } = await supabase.from("audit_log").insert({
      event_type: input.eventType,
      description: input.description,
      actor_user_id: input.actorUserId ?? null,
      actor_email: input.actorEmail ?? null,
      team_id: input.teamId ?? null,
      target_user_id: input.targetUserId ?? null,
      target_email: input.targetEmail ?? null,
      metadata: input.metadata ?? null,
      source: input.source ?? null,
      severity: input.severity ?? "info",
    });
    if (error) {
      console.error("[audit] failed to log event", input.eventType, error.message);
    }
  } catch (err) {
    // Auditing must never break the caller. Worst case we lose visibility.
    console.error("[audit] threw while logging", input.eventType, err);
  }
}
