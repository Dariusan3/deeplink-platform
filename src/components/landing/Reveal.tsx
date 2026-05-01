"use client";

import { useEffect, useRef } from "react";

/**
 * Wraps children with the .reveal class and an IntersectionObserver that
 * adds .in once when the element enters the viewport. One-shot — no flicker
 * when scrolling back up. Honors prefers-reduced-motion via globals.css.
 *
 * Stagger child elements by passing a number (ms delay).
 */
export function Reveal({
  children,
  delay = 0,
  className = "",
  id,
  as: Tag = "div",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
  id?: string;
  as?: keyof React.JSX.IntrinsicElements;
}) {
  const ref = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            (e.target as HTMLElement).classList.add("in");
            obs.unobserve(e.target);
          }
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.05 }
    );
    obs.observe(node);
    return () => obs.disconnect();
  }, []);

  const style: React.CSSProperties = delay
    ? ({ ["--reveal-delay" as string]: `${delay}ms` } as React.CSSProperties)
    : {};

  // The `as` prop is rendered without TS narrowing because all intrinsics
  // accept ref + className + style for our purposes.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Element = Tag as any;
  return (
    <Element ref={ref} id={id} className={`reveal ${className}`} style={style}>
      {children}
    </Element>
  );
}
