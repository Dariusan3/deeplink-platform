import { ImageResponse } from "next/og";

/**
 * Dynamically rendered Open Graph card, so there is no binary asset to keep in
 * sync with the brand. Served at /opengraph-image and referenced by
 * `ogImage` in src/lib/seo.ts.
 */
export const alt = "Tappr — Smart link management with AI traffic analytics";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#000000",
          padding: "72px",
          fontFamily: "sans-serif",
        }}
      >
        {/* Satori renders a limited SVG subset and does not support <mask>, so
            the mark is drawn here with an explicit gap in the crossbar's bottom
            edge instead of masking it. Geometry otherwise matches
            src/components/brand/logo.tsx. */}
        <div style={{ display: "flex", alignItems: "center", gap: "18px" }}>
          <svg width="44" height="44" viewBox="0 0 32 32" fill="none">
            <path
              d="M20.6 13 L24 13 A4 4 0 0 0 24 5 L8 5 A4 4 0 0 0 8 13 L11.4 13"
              stroke="#00D26A"
              strokeWidth="2.6"
              strokeLinecap="round"
            />
            <path
              d="M12 13 L12 24 A4 4 0 0 0 20 24 L20 13 A4 4 0 0 0 12 13 Z"
              stroke="#00D26A"
              strokeWidth="2.6"
              strokeLinejoin="round"
            />
            <circle cx="23.4" cy="20.6" r="1.9" fill="#BEF264" />
          </svg>
          <div style={{ fontSize: 40, fontWeight: 700, color: "#ffffff" }}>Tappr</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              fontSize: 76,
              fontWeight: 700,
              color: "#ffffff",
              lineHeight: 1.05,
              letterSpacing: "-0.03em",
              maxWidth: "1000px",
            }}
          >
            You got 2,400 clicks. Tappr tells you how many were real.
          </div>
          <div style={{ display: "flex", fontSize: 32, color: "#00D26A", fontWeight: 600 }}>
            Smart routing · Bot detection · AI traffic analytics
          </div>
        </div>

        <div style={{ display: "flex", fontSize: 28, color: "#8a8a8a" }}>tappr.me</div>
      </div>
    ),
    size
  );
}
