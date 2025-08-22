"use client";

import React, { useEffect, useRef } from "react";

/**
 * What this does:
 * - Keeps your previous layout and the width-first fix for wide/short viewports (no side gaps).
 * - Adds a tiny ResizeObserver that:
 *   - Detects wide/short (min-aspect-ratio: 7/4).
 *   - Measures available height under the header inside the red root.
 *   - Measures the grid's "natural" content height (with width-first SVGs).
 *   - Applies scale = min(1, availableHeight / naturalHeight) to a wrapper around the grid.
 *   - Result: whole root fits the screen (no vertical scrolling) while preserving proportions.
 */

const styles = `
:root {
  /* Page frame */
  --page-max-width: 1200px;
  --root-padding-block: 12px;
  --root-padding-inline: 12px;
  --root-margin-inline: auto;

  /* Header text */
  --title-font-size: 24px;
  --desc-font-size: 12px;
  --text-align: center; /* left | center | right */

  /* Gaps */
  --gap-y-portrait: 8px;
  --gap-y-landscape: 10px;

  /* Row paddings */
  --child1-pad: 8px 8px 8px 8px; /* stave */
  --child2-pad: 8px 8px 8px 8px; /* keyboard */

  /* Row minimums for PORTRAIT (ensure they don't get too tiny) */
  --row1-min: 140px;
  --row2-min: 120px;

  /* LANDSCAPE row weights (proportions) */
  --row1-weight: 2fr; /* stave */
  --row2-weight: 1fr; /* keyboard */

  /* Cosmetic */
  --radius: 8px;

  /* Auto-fit scaling vars (set by JS) */
  --fit-scale: 1;
  --fit-height: auto;
}

/* Page wrapper */
.page {
  box-sizing: border-box;
  max-width: var(--page-max-width);
  margin-inline: var(--root-margin-inline);
  padding: 8px; /* keeps red border off screen edge */
}

/* Root container — portrait default = content height */
.root {
  box-sizing: border-box;
  border: 2px solid red;
  border-radius: var(--radius);
  background: #fff;

  display: flex;
  flex-direction: column;
  padding: var(--root-padding-block) var(--root-padding-inline);

  /* PORTRAIT default: content-based height, prevents big vertical gaps */
  height: auto;
  max-height: none;

  overflow: hidden;
}

/* LANDSCAPE override: fill screen and use weighted rows */
@media (orientation: landscape) {
  .root {
    height: 100svh;  /* small viewport height = better on iOS */
    max-height: 100svh;
  }
}

/* Header */
.header {
  flex: 0 0 auto;
  text-align: var(--text-align);
  margin: 0 0 8px 0;
}
.header h1 {
  margin: 0 0 6px 0;
  font-size: var(--title-font-size);
  line-height: 1.15;
}
.header p {
  margin: 0;
  font-size: var(--desc-font-size);
  line-height: 1.4;
  color: #333;
}

/* === Fit wrapper around the grid (so we can scale just the content group) === */
.fit-wrap {
  /* This becomes the visible height after scaling in wide/short mode */
  height: var(--fit-height);
  overflow: hidden;   /* hide any overflow when scaled slightly > available */
  display: flex;
  justify-content: center; /* keep scaled content centered */
}
.fit-scale {
  transform: scale(var(--fit-scale));
  transform-origin: top center;
  width: 100%;
}

/* Grid (two rows) — portrait: content-sized rows */
.grid {
  flex: 1 1 auto;
  min-height: 0;
  display: grid;
  grid-template-columns: 1fr;

  /* PORTRAIT: auto rows with safe minimums to keep visuals healthy */
  grid-template-rows: minmax(var(--row1-min), auto) minmax(var(--row2-min), auto);
  gap: var(--gap-y-portrait);

  overflow: visible; /* allow root height to expand to content */
}

/* LANDSCAPE: weighted rows filling the available height */
@media (orientation: landscape) {
  .grid {
    grid-template-rows: minmax(0, var(--row1-weight)) minmax(0, var(--row2-weight));
    gap: var(--gap-y-landscape);
    overflow: hidden; /* rows fill root; inner media scales */
  }
}

/* Each row (child container) */
.child {
  min-height: 0;
  border: 2px solid red;
  border-radius: var(--radius);
  background: #fff;
  overflow: hidden;
  display: flex; /* to pad around media */
}

/* Row-specific padding */
.child--stave { padding: var(--child1-pad); }
.child--keys  { padding: var(--child2-pad); }

/* Media wrapper fills row box */
.media {
  flex: 1 1 auto;
  min-height: 0;
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Default SVG scaling (good for most cases) */
.media > svg {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: contain;
  object-position: center;
}

/* ========================= WIDE/SHORT FIX =========================
   Catches your problematic sizes (e.g., 740x360, 915x412, 896x414, etc.)
   Threshold 7/4 ≈ 1.75 ensures "very wide, short" windows/phones/desktop.
   - Switch to width-first scaling and content-height rows.
   - JS then scales the whole grid down to fit the viewport (no vertical scroll).
*/
@media (min-aspect-ratio: 7/4) {
  .root {
    height: 100svh;    /* we want to fit inside the screen */
    max-height: 100svh;
  }
  .grid {
    /* Content-height rows; natural (width-first) heights */
    grid-template-rows: auto auto;
    gap: var(--gap-y-portrait);
    overflow: visible;
  }
  .media > svg {
    width: 100% !important;
    height: auto !important;  /* width-first */
    max-height: 100%;
  }
}
/* ================================================================= */
`;

export default function ResponsiveStaveKeyboard() {
  const rootRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const fitWrapRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const rootEl = rootRef.current;
    const headerEl = headerRef.current;
    const fitWrapEl = fitWrapRef.current;
    const gridEl = gridRef.current;
    if (!rootEl || !headerEl || !fitWrapEl || !gridEl) return;

    const mq = window.matchMedia("(min-aspect-ratio: 7/4)");

    const recompute = () => {
      // Default: no scaling
      let scale = 1;
      let targetHeight: string | number = "auto";

      const isWideShort = mq.matches;

      if (isWideShort) {
        // Total height available inside root for the grid area
        const rootStyles = getComputedStyle(rootEl);
        const padV =
          parseFloat(rootStyles.paddingTop) + parseFloat(rootStyles.paddingBottom);

        // Available vertical space (root is 100svh in this mode)
        const available =
          rootEl.clientHeight - headerEl.offsetHeight - padV;

        // Natural content height of the grid (with width-first SVGs)
        // Using scrollHeight to get the full intrinsic height
        const natural = gridEl.scrollHeight;

        if (natural > 0 && available > 0) {
          scale = Math.min(1, available / natural);
          targetHeight = Math.min(available, natural * scale);
        }
      }

      // Apply CSS vars on the root so CSS can handle the transform neatly
      rootEl.style.setProperty("--fit-scale", `${scale}`);
      rootEl.style.setProperty(
        "--fit-height",
        typeof targetHeight === "number" ? `${targetHeight}px` : `${targetHeight}`
      );
    };

    const ro = new ResizeObserver(recompute);
    ro.observe(rootEl);
    ro.observe(headerEl);
    ro.observe(gridEl);
    window.addEventListener("resize", recompute);
    window.addEventListener("orientationchange", recompute);
    mq.addEventListener?.("change", recompute);

    recompute();

    return () => {
      ro.disconnect();
      window.removeEventListener("resize", recompute);
      window.removeEventListener("orientationchange", recompute);
      mq.removeEventListener?.("change", recompute);
    };
  }, []);

  return (
    <>
      <style>{styles}</style>

      <div className="page">
        <div className="root" ref={rootRef}>
          <div className="header" ref={headerRef}>
            <h1>containers</h1>
            <p>change them as you like</p>
          </div>

          {/* Fit wrapper: we scale only the group below on wide/short screens */}
          <div className="fit-wrap" ref={fitWrapRef}>
            <div className="fit-scale">
              <div className="grid" ref={gridRef}>
                {/* Row 1: Grand Stave (placeholder SVG) */}
                <div className="child child--stave">
                  <div className="media">
                    <svg
                      viewBox="0 0 1600 420"
                      preserveAspectRatio="xMidYMid meet"
                      aria-label="Grand Stave"
                    >
                      <rect x="0" y="0" width="1600" height="420" fill="#fafafa" stroke="#000" />
                      {[0,1,2,3,4].map(i => (
                        <line key={i} x1="40" x2="1560" y1={80 + i*24} y2={80 + i*24} stroke="#000" strokeWidth="2"/>
                      ))}
                      {[0,1,2,3,4].map(i => (
                        <line key={`b${i}`} x1="40" x2="1560" y1={240 + i*24} y2={240 + i*24} stroke="#000" strokeWidth="2"/>
                      ))}
                      <text x="800" y="30" textAnchor="middle" fontSize="28">Grand Stave Placeholder</text>
                    </svg>
                  </div>
                </div>

                {/* Row 2: Keyboard (placeholder SVG) */}
                <div className="child child--keys">
                  <div className="media">
                    <svg
                      viewBox="0 0 1600 240"
                      preserveAspectRatio="xMidYMid meet"
                      aria-label="Keyboard"
                    >
                      <rect x="0" y="0" width="1600" height="240" fill="#fafafa" stroke="#000" />
                      {Array.from({ length: 28 }).map((_, i) => (
                        <rect key={i} x={20 + i * 56} y="20" width="52" height="200" fill="#fff" stroke="#000" />
                      ))}
                      {Array.from({ length: 24 }).map((_, i) => {
                        const skip = [2, 6, 9, 13, 16, 20, 23];
                        if (skip.includes(i)) return null;
                        return <rect key={`b${i}`} x={48 + i * 56} y="20" width="32" height="120" fill="#000" />;
                      })}
                      <text x="800" y="230" textAnchor="middle" fontSize="18">Keyboard Placeholder</text>
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </div>
          {/* /fit-wrap */}
        </div>
      </div>
    </>
  );
}