# Step 6: QR Code Generation

## What was implemented
- New `/dashboard/qr-codes` page showing QR codes for all links in a grid
- Each QR code card has download PNG and copy link buttons
- QR codes use the app's green (#00D26A) on transparent background
- "Generate QR" option added to each link card's dropdown menu
- QR dialog shows large QR code with download button
- QR Codes nav item added to sidebar

## Dependencies installed
- `qrcode.react` — React QR code component

## Files created
- `src/app/(dashboard)/dashboard/qr-codes/page.tsx` — QR codes page with grid of QR code cards
- `src/components/qr/qr-code-card.tsx` — Individual QR code card with download/copy
- `src/components/qr/qr-dialog.tsx` — Dialog for viewing/downloading a single QR code

## Files modified
- `src/components/sidebar.tsx` — Added "QR Codes" nav item after Links
- `src/components/links/link-card.tsx` — Added "Generate QR" dropdown menu item and QrDialog

## How to test
1. New "QR Codes" page appears in sidebar navigation
2. Navigate to `/dashboard/qr-codes` — shows QR codes for all links
3. Click "Download" on any QR card — downloads a 512x512 PNG
4. Click "Copy" to copy the short URL
5. On `/dashboard/links`, click the 3-dot menu on any link → "Generate QR"
6. QR dialog appears with large QR code and download button
