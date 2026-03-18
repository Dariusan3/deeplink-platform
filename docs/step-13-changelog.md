# Step 13: Pricing Page

## What was implemented
- Full pricing page at `/pricing` matching linktw.in's design in dark glass-morphism theme
- **Monthly/Yearly billing toggle** with -25% badge on yearly
- **3 plan cards**: Small ($14-19/mo), Medium ($36-49/mo, "Most Popular"), Large ($74-99/mo)
- Feature comparison per plan (Links & Clicks, Analytics, Branded Domains, Team Members, Custom Aliases)
- **Free Plan + Enterprise row** with Start Free / Contact Sales CTAs
- **"All Features Included" grid** with 12 feature cards (Deep Linking, Custom Previews, Tracking Pixels, A/B Testing, QR Codes, Geo/Device/Language Targeting, Link Expiration, Click Limitation, UTM Parameters, Amazon Affiliate Tag)
- **FAQ accordion** with 7 questions and collapsible answers
- **Full footer** with Solutions, Features, Resources, Info columns
- Upgrade Now button in usage banner now links to `/pricing`
- Pricing link added to landing page header

## Files created
- `src/app/pricing/page.tsx` — Full pricing page

## Files modified
- `src/components/dashboard/usage-banner.tsx` — "Upgrade Now" button now links to `/pricing`
- `src/app/page.tsx` — Added "Pricing" link in landing page header

## How to test
1. Navigate to `/pricing`
2. Toggle between Monthly and Yearly — prices update with -25% discount
3. "Most Popular" badge highlights Medium plan
4. Free Plan and Enterprise rows show at bottom of pricing cards
5. Feature grid shows 12 features included on all plans
6. FAQ accordion expands/collapses on click
7. From dashboard, click "Upgrade Now" in the usage banner → goes to `/pricing`
8. From landing page, click "Pricing" in header → goes to `/pricing`
