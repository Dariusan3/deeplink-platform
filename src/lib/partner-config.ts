// Single source of truth for partner program tunables. Imported by the
// API route, the earnings page, the overview banner, and the monthly
// report email so changing the threshold here updates every surface.

export const PARTNER_MIN_PAYOUT = 500;
export const PARTNER_COMMISSION_RATE = 0.25;
