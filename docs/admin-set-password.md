# Admin — Set User Password

Added 2026-07-04. Lets an admin set a new password for any user from the admin panel.

## How to use
Admin → **Users & Teams** → find the user → **Set Password** (key icon, next to
Make Admin / Activate Partner) → type a password or hit the ↻ generate button →
**Set Password**. Copy it (📋) and share it with the user securely — they are **not**
emailed automatically.

## How it works
- **API:** `POST /api/admin/users/set-password` — [route](../src/app/api/admin/users/set-password/route.ts).
  Verifies the caller is an admin server-side (`is_admin`), then calls
  `supabase.auth.admin.updateUserById(userId, { password })` with the service-role key.
- **Validation:** password must be ≥ 8 characters.
- **Audit:** every change writes an `admin.reset_password` row to `audit_log`
  (actor, target, timestamp) — **the password itself is never logged**. Visible under
  Admin → Activity Log.
- **UI:** [admin/users/page.tsx](../src/app/admin/users/page.tsx) — `Set Password`
  button + dialog with generate (crypto-random) and copy-to-clipboard.

## Notes
- Sensitive action — it's admin-gated and audited, but there's no email notification to
  the user by design (admin shares the new password out-of-band).
- If you'd rather the user set their own, the normal "forgot password" email flow still
  exists at `/forgot-password`.
