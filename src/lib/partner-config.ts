// Single source of truth for partner program tunables. Imported by the
// API route, the earnings page, the overview banner, and the monthly
// report email so changing the threshold here updates every surface.

// TEMP for testing the payout flow end-to-end at $1 plan prices —
// lowered so a single $0.25 commission can be withdrawn. REVERT to 500
// before launch.
export const PARTNER_MIN_PAYOUT = 0.25;
export const PARTNER_COMMISSION_RATE = 0.25;
