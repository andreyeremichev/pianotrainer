"use client";
import GrandStaveVF_Fit from "../components/GrandStaveVF_Fit";

import React, { useEffect, useRef } from "react";

const styles = `
:root {
  --page-max-width: 1200px;
  --root-padding-block: 12px;
  --root-padding-inline: 12px;
  --root-margin-inline: auto;

  /* Header */
  --title-font-size: 24px;
  --desc-font-size: 12px;
  --text-align: center;

  /* Gaps */
  --gap-y-portrait: 8px;
  --gap-y-landscape: 10px;

  /* Row paddings */
  --child1-pad: 8px;
  --child2-pad: 8px;

  /* Row minimums & proportions */
  --row1-min: 140px;
  --row2-min: 120px;
  --row1-weight: 2fr;
  --row2-weight: 1fr;

  --radius: 8px;

  /* Fit scaling */
  --fit-scale: 1;
  --fit-height: auto;

  /* Keyboard min height clamp */
  --keyboard-min-height: 100px;

  /* SVG strokes */
  --staff-line-width: 2;
  --keyboard-line-width: 1;
}

.page { box-sizing: border-box; max-width: var(--page-max-width); margin-inline: var(--root-margin-inline); padding: 8px; }

.root {
  box-sizing: border-box;
  border: 2px solid red; border-radius: var(--radius); background: #fff;
  display: flex; flex-direction: column;
  padding: var(--root-padding-block) var(--root-padding-inline);
  height: auto; max-height: none; overflow: hidden;
}
@media (orientation: landscape) { .root { height: 100svh; max-height: 100svh; } }

/* Header */
.header { flex: 0 0 auto; text-align: var(--text-align); margin: 0 0 8px 0; }
.header h1 { margin: 0 0 6px 0; font-size: calc(var(--title-font-size) * var(--fit-scale)); line-height: 1.15; }
.header p  { margin: 0; font-size: calc(var(--desc-font-size) * var(--fit-scale)); line-height: 1.4; color: #333; }

/* Fit wrapper */
.fit-wrap { height: var(--fit-height); overflow: hidden; display: flex; justify-content: center; }
.fit-scale { transform: scale(var(--fit-scale)); transform-origin: top center; width: 100%; }

/* Grid */
.grid {
  flex: 1 1 auto; min-height: 0;
  display: grid; grid-template-columns: 1fr;
  grid-template-rows: minmax(var(--row1-min), auto) minmax(var(--row2-min), auto);
  gap: calc(var(--gap-y-portrait) * var(--fit-scale));
  overflow: visible;
}
@media (orientation: landscape) {
  .grid {
    grid-template-rows: minmax(0, var(--row1-weight)) minmax(0, var(--row2-weight));
    gap: calc(var(--gap-y-landscape) * var(--fit-scale));
    overflow: hidden;
  }
}

/* Rows */
.child { min-height: 0; border: 2px solid red; border-radius: var(--radius); background: #fff; overflow: hidden; display: flex; }
.child--stave { padding: var(--child1-pad); }
.child--keys  { padding: var(--child2-pad); }

.media { flex: 1 1 auto; min-height: 0; min-width: 0; display: flex; align-items: center; justify-content: center; }
.media > svg { width: 100%; height: 100%; display: block; object-fit: contain; object-position: center; }

/* Wide/short: width-first handling */
@media (min-aspect-ratio: 7/4) {
  .root { height: 100svh; max-height: 100svh; }
  .grid { grid-template-rows: auto auto; gap: calc(var(--gap-y-portrait) * var(--fit-scale)); overflow: visible; }
  .media > svg { width: 100% !important; height: auto !important; max-height: 100%; }
}
`;

export default function StaveOnlyResponsive() {
  const rootRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const laneRef = React.useRef<HTMLDivElement>(null);
const [lane, setLane] = React.useState({ w: 0, h: 0 });

useEffect(() => {
  const el = laneRef.current;
  if (!el) return;
  const ro = new ResizeObserver(() => {
    const r = el.getBoundingClientRect();
    setLane({ w: r.width, h: r.height });
  });
  ro.observe(el);
  return () => ro.disconnect();
}, []);

  useEffect(() => {
    const rootEl = rootRef.current;
    const headerEl = headerRef.current;
    const gridEl = gridRef.current;
    if (!rootEl || !headerEl || !gridEl) return;

    const mq = window.matchMedia("(min-aspect-ratio: 7/4)");

    const recompute = () => {
      let scale = 1;
      let targetHeight: string | number = "auto";

      if (mq.matches) {
        const rs = getComputedStyle(rootEl);
        const padV = parseFloat(rs.paddingTop) + parseFloat(rs.paddingBottom);
        const available = rootEl.clientHeight - headerEl.offsetHeight - padV;
        const natural = gridEl.scrollHeight;

        if (natural > 0 && available > 0) {
          scale = Math.min(1, available / natural);
          targetHeight = Math.min(available, natural * scale);
        }
      }

      rootEl.style.setProperty("--fit-scale", `${scale}`);
      rootEl.style.setProperty(
        "--fit-height",
        typeof targetHeight === "number" ? `${targetHeight}px` : `${targetHeight}`
      );

      const row2El = gridEl.children[1] as HTMLElement | undefined;
      if (row2El) {
        row2El.style.minHeight = getComputedStyle(rootEl).getPropertyValue("--keyboard-min-height");
      }
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

          <div className="fit-wrap">
            <div className="fit-scale">
              <div className="grid" ref={gridRef}>
                {/* Row 1: Stave only */}
                <div className="stave-center media" ref={laneRef}>
  {lane.w > 0 && lane.h > 0 ? (
    <GrandStaveVF_Fit laneWidth={lane.w} laneHeight={lane.h} padX={20} />
  ) : (
    // fallback while measuring (optional)
    <GrandStaveVF />
  )}
</div>

                {/* Row 2: Keyboard */}
                <div className="child child--keys">
                  <div className="media">
                    <svg viewBox="0 0 1600 240" preserveAspectRatio="xMidYMid meet">
                      <rect x="0" y="0" width="1600" height="240" fill="#fafafa" stroke="#000" strokeWidth={`calc(var(--keyboard-line-width) * var(--fit-scale))`} />
                      {Array.from({ length: 28 }).map((_, i) => (
                        <rect key={i} x={20 + i * 56} y="20" width="52" height="200" fill="#fff" stroke="#000" strokeWidth={`calc(var(--keyboard-line-width) * var(--fit-scale))`} />
                      ))}
                      {Array.from({ length: 24 }).map((_, i) => {
                        const skip = [2, 6, 9, 13, 16, 20, 23];
                        if (skip.includes(i)) return null;
                        return <rect key={`b${i}`} x={48 + i * 56} y="20" width="32" height="120" fill="#000" />;
                      })}
                      <text x="800" y="230" textAnchor="middle" fontSize={18}>Keyboard Placeholder</text>
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}