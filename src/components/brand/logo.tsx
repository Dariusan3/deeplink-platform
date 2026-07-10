/**
 * Tappr brand mark: a "T" monogram built from two chain-link capsules.
 *
 * Redrawn as vector — not traced from the reference raster.
 *
 * The crossbar is an OPEN path whose bottom edge stops short on either side of
 * the stem; the stem is a closed capsule drawn over that gap. An earlier
 * version masked the crossbar with a widened copy of the stem instead, but the
 * stem's top cap arcs up to y=9 and the widened mask stroke reached y≈5.8 —
 * biting a notch out of the crossbar's *top* edge at y=5. Explicit gap, no mask.
 *
 * Because there is no mask there are no SVG ids, so this stays a server
 * component and can render many times per document safely.
 *
 * The mark inherits `currentColor`. The accent dot stays lime everywhere; it is
 * the one fixed hue.
 */

const ACCENT = "#BEF264";

/**
 * Crossbar, drawn counter-clockwise from the right stub: bottom-right segment →
 * right cap → top edge → left cap → bottom-left segment. The bottom edge is
 * absent between x=11.4 and x=20.6. The stem's stroke spans x 10.7..21.3, so
 * both stubs terminate underneath it and read as joined.
 */
const CROSSBAR = "M20.6 13 L24 13 A4 4 0 0 0 24 5 L8 5 A4 4 0 0 0 8 13 L11.4 13";

/** Stem: capsule spanning y 9..28, x 12..20. Its top cap loops up inside the
 *  crossbar — that overlap is what gives the pair their chain-link reading. */
const STEM = "M12 13 L12 24 A4 4 0 0 0 20 24 L20 13 A4 4 0 0 0 12 13 Z";

export function TapprMark({
  className,
  title,
}: {
  className?: string;
  /** Omit for decorative use — the wrapping link should carry the label. */
  title?: string;
}) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      className={className}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      xmlns="http://www.w3.org/2000/svg"
    >
      {title ? <title>{title}</title> : null}
      <path d={CROSSBAR} stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
      <path d={STEM} stroke="currentColor" strokeWidth="2.6" strokeLinejoin="round" />
      <circle cx="23.4" cy="20.6" r="1.9" fill={ACCENT} />
    </svg>
  );
}

/** Mark + wordmark. Used in the nav and the footer. */
export function TapprLogo({ className }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className ?? ""}`}>
      <TapprMark className="w-6 h-6 text-[var(--tappr-green)] shrink-0" />
      <span className="font-semibold">Tappr</span>
    </span>
  );
}
