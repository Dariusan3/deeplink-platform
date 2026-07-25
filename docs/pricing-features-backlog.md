# Pricing features backlog — sold but not built (removed 2026-07-25)

These three were advertised on the pricing page but **do not exist** as working
features on any plan. On 2026-07-25 they were **removed from all pricing UI** so
pricing reflects reality. Re-add each row/bullet **only when the feature ships**.

The plan entitlement flags for them still live in `src/lib/entitlements.ts`
(`qrCodes`, `customDomain`, `instagram`) as ready placeholders — wiring them back
into pricing is the last step of each build, not the first.

## 1. Dynamic QR codes  (intended: free 3 · starter 25 · growth 250 · agency ∞)

- **State:** no `qr_codes` table. QR is rendered on-the-fly from each `links`
  row in `src/components/qr/*` (`QRCodeSVG`) — download only, nothing persisted,
  nothing countable.
- **To ship:** create a `qr_codes` table (team_id, link_id, design/config),
  persist on generate, add a `plan_resource_limit(..., 'qr_codes')` branch + a
  DB trigger like the ones in migration 026, plus a client cap guard.
- **Re-add to pricing:** row in `pricing-comparison.tsx` "Team & Organization"
  group; the Agency card bullet in `Pricing.tsx` used to read
  "Unlimited QR codes + collections".

## 2. Custom domain  (intended: growth · agency)

- **State:** not implemented. `settings/page.tsx` hardcodes
  `default_domain = "tappr.me"` and the UI says "Custom domains aren't available
  yet." No `custom_domain` column/logic anywhere.
- **To ship:** domain table + DNS/verification flow, redirect host resolution in
  `src/app/[slug]/route.ts`, gate on `entitlements.customDomain`.
- **Re-add to pricing:** row in `pricing-comparison.tsx` "Branding, Developer &
  Support"; the Growth card bullet used to read "Remove branding + custom domain".

## 3. Instagram integration / connect  (intended: starter+)

- **State:** backend exists (`api/ig/callback`, `api/ig/insights`,
  `use-instagram.ts`, `ig_integrations` table) and the OAuth callback is already
  plan-gated (`entitlements.instagram`). BUT there is **no "Connect Instagram"
  button** anywhere that builds the authorize URL — no user can start the flow.
- **To ship:** add the connect/authorize button (settings IG section) that sends
  the user to Instagram OAuth; the rest is wired.
- **Re-add to pricing:** row in `pricing-comparison.tsx` "Branding, Developer &
  Support" (was `starter: true, growth: true, agency: true`).

## Related

See `docs/plan-entitlements-enforcement.md` for the full entitlements +
enforcement design (migrations 026/027/028 applied).
