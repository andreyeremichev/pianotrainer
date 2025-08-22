"use client";

import React, { useEffect, useRef, useState } from "react";
import GrandStaveVF from "../components/GrandStaveVF";
import ResponsiveKeyboardC2toC6 from "../components/ResponsiveKeyboardC2toC6";

/* --- note name -> MIDI fallback (handles sharps & flats), C4 = 60 --- */
const PITCH_CLASS: Record<string, number> = {
  "C":0, "C#":1, "D":2, "D#":3, "E":4, "F":5, "F#":6, "G":7, "G#":8, "A":9, "A#":10, "B":11
};
const FLAT_TO_SHARP: Record<string, string> = { Db:"C#", Eb:"D#", Gb:"F#", Ab:"G#", Bb:"A#" };
function noteNameToMidi(note: string): number | null {
  const m = note.match(/^([A-Ga-g])([#b]?)(\d)$/);
  if (!m) return null;
  const letter = m[1].toUpperCase();
  const acc    = m[2] as "" | "#" | "b";
  const oct    = parseInt(m[3], 10);
  let name = letter + acc;
  if (acc === "b") name = FLAT_TO_SHARP[letter + "b"] ?? name;
  const pc = PITCH_CLASS[name];
  if (pc == null) return null;
  return (oct + 1) * 12 + pc;
}

const styles = `
:root {
  --page-max-width: 1200px;
  --root-padding-block: 12px;
  --root-padding-inline: 12px;
  --root-margin-inline: auto;

  /* Header (scales) */
  --title-font-size: 24px;
  --desc-font-size: 12px;
  --text-align: center;

  /* Gaps (scale) */
  --gap-y-portrait: 8px;
  --gap-y-landscape: 10px;

  /* Row paddings */
  --child1-pad: 8px;
  --child2-pad: 8px;

  /* Row mins & proportions */
  --row1-min: 140px;
  --row2-min: 120px;
  --row1-weight: 2fr;
  --row2-weight: 1fr;

  --radius: 8px;

  /* Fit scaling */
  --fit-scale: 1;
  --fit-height: auto;

  /* ===== COMPACT BOXES ===== */
  --stats-inner-pad: 2px 4px;
  --mode-inner-pad: 2px 4px;
  --stats-gap-right: 6px;
  --mode-gap-left: 6px;

  --stats-font-size: 8px;
  --stats-value-font: 8px;
  --mode-font-size: 8px;

  /* SVG strokes (scale) */
  --staff-line-width: 2;
  --keyboard-line-width: 1;

  /* Keyboard min height clamp (CSS-owned; no JS writes) */
  --keyboard-min-height: 120px;

  /* Measured height of center stave (set via JS) */
  --stave-equal-height: auto;

  /* ultra-compact side widths */
  --stats-width-min: 36px;
  --stats-width-fluid: 6vw;
  --stats-width-max: 44px;

  --mode-width-min: 56px;
  --mode-width-fluid: 10vw;
  --mode-width-max: 72px;

  --portrait-side-scale: 0.5;
}

.page { box-sizing: border-box; max-width: var(--page-max-width); margin-inline: var(--root-margin-inline); padding: 8px; }

.root {
  box-sizing: border-box;
  border: 2px solid red; border-radius: var(--radius); background: #fff;
  display: flex; flex-direction: column;
  padding: var(--root-padding-block) var(--root-padding-inline);
  height: auto; max-height: none; overflow: hidden;
}

@media (orientation: landscape) {
  .root { height: 100svh; max-height: 100svh; }
}

/* Header (scales with fit) */
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

/* Media areas */
.media { flex: 1 1 auto; min-height: 0; min-width: 0; display: flex; align-items: center; justify-content: center; }
.media > svg { width: 100%; height: 100%; display: block; object-fit: contain; object-position: center; }

/* Keyboard min height is CSS-only (prevents JS feedback) */
.child--keys .media { min-height: var(--keyboard-min-height); }

/* ===== Stave row (left | center | right) ===== */
.stats-bar {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  width: 100%;
}

.stats-left {
  align-self: center;
  height: var(--stave-equal-height);
  display: flex; flex-direction: column; justify-content: space-between;
  gap: 4px;
  margin-right: clamp(2px, 1vw, var(--stats-gap-right));
}
.stats-box {
  border: 1px solid black; border-radius: 4px; box-sizing: border-box;
  width: clamp(var(--stats-width-min), calc(var(--stats-width-fluid) * var(--fit-scale)), var(--stats-width-max));
  flex: 1;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  padding: var(--stats-inner-pad);
  font-size: calc(var(--stats-font-size) * var(--fit-scale));
  background: #f0f0f0;
}
.stats-value { font-weight: 700; font-size: calc(var(--stats-value-font) * var(--fit-scale)); }

.stave-center { flex: 1 1 auto; display: flex; justify-content: center; align-items: center; min-width: 0; }

/* RIGHT box */
.mode-box {
  align-self: center;
  border: 1px solid black; border-radius: 4px; box-sizing: border-box;
  width: clamp(var(--mode-width-min), calc(var(--mode-width-fluid) * var(--fit-scale)), var(--mode-width-max));
  height: var(--stave-equal-height);
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  padding: var(--mode-inner-pad);
  margin-left: clamp(2px, 1vw, var(--mode-gap-left));
  background: #f0f0f0;
  line-height: 1.1;
}
.mode-box .mode-title  { font-size: calc(var(--mode-font-size) * var(--fit-scale)); }
.mode-box .mode-select { font-size: calc((var(--mode-font-size) + 1px) * var(--fit-scale)); font-weight: 700; margin-top: 2px; }

/* Portrait: push them even smaller visually (text only) */
@media (orientation: portrait) {
  .stats-box { font-size: calc(var(--stats-font-size) * var(--portrait-side-scale)); }
  .stats-value { font-size: calc(var(--stats-value-font) * var(--portrait-side-scale)); }
  .mode-box .mode-title  { font-size: calc(var(--mode-font-size) * var(--portrait-side-scale)); }
  .mode-box .mode-select { font-size: calc((var(--mode-font-size) + 1px) * var(--portrait-side-scale)); }
}

/* === Narrower grand stave wrapper (unchanged) === */
.stave-narrow {
  inline-size: 100%;
  max-inline-size: 66.667%;
  margin-inline: auto;
}

/* === Portrait ≤450px blocker text === */
.blocker {
  width: 100%;
  min-height: 160px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  text-align: center;
  font-size: 16px;
  line-height: 1.4;
}
`;

export default function ResponsiveStaveKeyboard() {
  const [midi, setMidi] = useState<number | null>(null);
  const [showPortraitWarning, setShowPortraitWarning] = useState(false);

  const rootRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const staveCenterRef = useRef<HTMLDivElement>(null);

  // Detect only portrait AND width <= 450px
  useEffect(() => {
    const check = () => {
      const isPortrait = window.matchMedia("(orientation: portrait)").matches;
      const w = window.innerWidth;
      setShowPortraitWarning(isPortrait && w <= 450);
    };
    check();
    const onResize = () => check();
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
    };
  }, []);

  // Keep your existing fit/measure logic (unchanged)
  useEffect(() => {
    const rootEl = rootRef.current;
    const headerEl = headerRef.current;
    const gridEl = gridRef.current;
    const staveCenterEl = staveCenterRef.current;
    if (!rootEl || !headerEl || !gridEl || !staveCenterEl) return;

    let raf = 0;
    let debounce: number | null = null;

    const measureStave = () => {
      const rect = staveCenterEl.getBoundingClientRect();
      rootEl.style.setProperty("--stave-equal-height", `${rect.height}px`);
    };

    const recompute = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const rs = getComputedStyle(rootEl);
        const padV = parseFloat(rs.paddingTop) + parseFloat(rs.paddingBottom);
        const available = rootEl.clientHeight - headerEl.offsetHeight - padV;
        const natural = gridEl.scrollHeight;

        let scale = 1;
        let targetHeight: string | number = "auto";

        if (available > 0 && natural > 0 && natural > available) {
          scale = Math.max(0.5, available / natural);
          targetHeight = available;
        }

        rootEl.style.setProperty("--fit-scale", `${scale}`);
        rootEl.style.setProperty("--fit-height", typeof targetHeight === "number" ? `${targetHeight}px` : `${targetHeight}`);
        requestAnimationFrame(measureStave);
      });
    };

    const ro = new ResizeObserver(() => {
      if (debounce) return;
      debounce = window.setTimeout(() => { debounce = null; recompute(); }, 80);
    });

    ro.observe(rootEl);
    ro.observe(headerEl);
    ro.observe(gridEl);
    ro.observe(staveCenterEl);

    window.addEventListener("resize", recompute);
    window.addEventListener("orientationchange", recompute);

    recompute();

    return () => {
      if (debounce) clearTimeout(debounce);
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("resize", recompute);
      window.removeEventListener("orientationchange", recompute);
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
                {showPortraitWarning ? (
                  /* === Blocker for small portrait screens (≤450px) === */
                  <div className="child child--stave">
                    <div className="blocker">
                      Please, use horizontal layout to use pianotrainer
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Row 1: Stats + Stave + Mode */}
                    <div className="child child--stave">
                      <div className="stats-bar">
                        <div className="stats-left">
                          <div className="stats-box">
                            <div>Progress</div>
                            <div className="stats-value">25/25</div>
                          </div>
                          <div className="stats-box">
                            <div>Correct</div>
                            <div className="stats-value">25/25</div>
                          </div>
                        </div>

                        {/* CENTER: VexFlow grand stave draws current note */}
                        <div className="stave-center media" ref={staveCenterRef}>
                          <div className="stave-narrow">
                            <GrandStaveVF key={midi ?? "none"} padX={20} gap={90} noteMidi={midi} />
                          </div>
                        </div>

                        {/* RIGHT box */}
                        <div className="mode-box">
                          <div className="mode-title">Mode</div>
                          <div className="mode-select">Select</div>
                        </div>
                      </div>
                    </div>

                    {/* Row 2: Responsive keyboard */}
                    <div className="child child--keys">
                      <div className="media">
                        <ResponsiveKeyboardC2toC6
                          onKeyPress={(m) => setMidi(m)}                // MIDI path
                          onKeyDown={(noteName) => {                     // NoteName path (fallback)
                            const m = noteNameToMidi(noteName);
                            if (m != null) setMidi(m);
                          }}
                        />
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}