"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
const GrandStaveVF = dynamic(() => import("../../../components/GrandStaveVF"), { ssr: false });
import ResponsiveKeyboardC2toC6, { type KeyboardRef } from "../../../components/ResponsiveKeyboardC2toC6";
import PosterHeader from "@/components/PosterHeader";

import {
  type MajorKey,
  type RomanDegree,
  type Inversion,
  type BuiltChord,
  rollRandomFromSelections,
  audioUrlFromDisplay,
} from "../../../../utils/chords";

/* ============ styles (frozen layout) ============ */
const styles = `
:root {
  --page-max-width: 1200px;
  --radius: 8px;
  --stats-w: 120px;   /* left column: Start/Stop + hint */
  --side-w:  260px;   /* right column width (picker / carousel) */
  --keyboard-min-h: 160px;
}

.page { box-sizing: border-box; max-width: var(--page-max-width); margin: 0 auto; padding: 8px; }
.root {
  box-sizing: border-box; border: 1px solid #ccc; border-radius: var(--radius); background: #fff;
  display: flex; flex-direction: column; padding: 12px; min-height: 100%; position: relative;
}

/* Row 1 grid: left (Start/Stop), center (stave), right (picker / carousel) */
.child { border: 1px solid #ccc; border-radius: var(--radius); background: #fff; padding: 8px; }
.stats-bar {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: start;
  column-gap: 10px;
}

/* LEFT: Start/Stop + hint */
.left-col { display: flex; flex-direction: column; gap: 8px; width: var(--stats-w); }
.start-btn, .stop-btn {
  margin-top: 6px; padding: 8px 12px; font-size: 13px; font-weight: 800; border-radius: 6px; border: none; cursor: pointer;
}
.start-btn { background: #20C997; color: #081019; }
.stop-btn  { background: #efefef; color: #222; border: 1px solid #bbb; }

/* CENTER: stave (frozen width) */
.stave-center { min-width: 0; display: flex; justify-content: center; align-items: flex-start; }
.stave-narrow { width: 380px; } /* ← frozen; do not change */
.explain { text-align:center; font-size: 13px; margin-top: 6px; min-height: 1.2em; }

/* RIGHT: before start → picker; after start → carousel+inversions */
.side-box {
  width: var(--side-w);
  border: 1px solid #000; border-radius: 6px; padding: 8px 10px;
  display: flex; flex-direction: column; gap: 8px; align-items: stretch; background: #f3f3f3;
}
.side-title { text-align: center; font-weight: 700; }

/* picker */
.picker-section { display: grid; gap: 8px; }
.picker-actions { display: flex; gap: 6px; justify-content: center; }
.select { font-size: 14px; padding: 6px 8px; border-radius: 6px; }

/* carousel */
.carousel {
  display: grid; grid-template-columns: auto 1fr auto; align-items: center; gap: 8px;
}
.carousel-arrow {
  border: 1px solid #ccc; border-radius: 6px; background: #fff; padding: 6px 8px; cursor: pointer; min-width: 36px;
}
.carousel-body {
  border: 1px solid #ccc; border-radius: 6px; background: #fff; padding: 8px 10px; display: grid; gap: 6px;
}
.carousel-title { text-align: center; font-weight: 800; }

/* inversion buttons */
.inv-group { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 6px; }
.inv-btn {
  font-size: 14px; padding: 8px 10px; border-radius: 6px; border: 1px solid #ccc; background: #fff; cursor: pointer;
}
.inv-btn:hover { background: #fafafa; }

/* keyboard row */
.media { display: flex; align-items: center; justify-content: center; min-height: var(--keyboard-min-h); }
.media > svg { width: 100%; height: auto; display: block; }

/* portrait blocker */
.blocker { position: absolute; inset: 0; display: none; align-items: center; justify-content: center;
  background: rgba(255,255,255,0.95); z-index: 5; text-align: center; padding: 24px; border-radius: var(--radius); }
.blocker p { margin: 0; font-size: 16px; line-height: 1.4; }
@media (max-width: 450px) and (orientation: portrait) { .blocker { display: flex; } }

/* pulse (no layout impact) */
.pulse-good { box-shadow: 0 0 0 2px rgba(32,201,151,0.00) inset; animation: pg 220ms ease; }
.pulse-bad  { box-shadow: 0 0 0 2px rgba(255,107,107,0.00) inset; animation: pb 220ms ease; }
@keyframes pg {
  0% { box-shadow: 0 0 0 0 rgba(32,201,151,0.00) inset; }
  30% { box-shadow: 0 0 0 6px rgba(32,201,151,0.35) inset; }
  100% { box-shadow: 0 0 0 0 rgba(32,201,151,0.00) inset; }
}
@keyframes pb {
  0% { box-shadow: 0 0 0 0 rgba(255,107,107,0.00) inset; }
  30% { box-shadow: 0 0 0 6px rgba(255,107,107,0.35) inset; }
  100% { box-shadow: 0 0 0 0 rgba(255,107,107,0.00) inset; }
}
`;

/* === Carousel degrees order === */
const DEGREES: RomanDegree[] = ["I","ii","iii","IV","V","vi","vii°"];

/* === Audio helpers === */
function playBlock(urls: string[]) {
  urls.forEach(u => { const a = new Audio(u); a.play().catch(()=>{}); });
}
function playArpeggio(urls: string[], gapMs = 140) {
  urls.forEach((u, i) => {
    setTimeout(() => { const a = new Audio(u); a.play().catch(()=>{}); }, i * gapMs);
  });
}

/* === Page === */
export default function ChordsHelperPage() {
  /* Picker state */
  const [keySel, setKeySel] = useState<MajorKey>("C");
  const [playMode, setPlayMode] = useState<"block"|"arp">("block");
  const canStart = true; // one key + mode always chosen

  /* Session state */
  const [started, setStarted] = useState(false);
  const [degreeIndex, setDegreeIndex] = useState(0); // 0..6 (I..vii°)
  const [currentChord, setCurrentChord] = useState<BuiltChord | null>(null);
  const [explain, setExplain] = useState("");

  /* Keyboard ref + hold shim */
  const kbRef = useRef<KeyboardRef>(null);
  const holdTimerRef = useRef<number | null>(null);

  // pulse only for visual delight when a chord/inversion is pressed
  const [pulse, setPulse] = useState<null | "good" | "bad">(null);

  const otherModeLabel = playMode === "block" ? "Arpeggios" : "Block";

  /* Build chord deterministically using utils, then map to 4 display notes:
     - Bass: low root (bass staff)
     - Treble: triad notes (3) in chosen inversion
     rollRandomFromSelections([key],[deg],[inv], false) returns a BuiltChord
  */
  function buildChord(key: MajorKey, deg: RomanDegree, inv: Inversion): BuiltChord | null {
    // We rely on utils to return exact chord for singleton arrays.
    const chord = rollRandomFromSelections([key], [deg], [inv], false);
    return chord || null;
  }

  function clearHold() {
    if (holdTimerRef.current) { window.clearInterval(holdTimerRef.current); holdTimerRef.current = null; }
    kbRef.current?.clear();
  }

  function holdKeyboard(displayNames: string[]) {
    // highlight all notes and keep them lit
    displayNames.forEach(n => kbRef.current?.highlight(n as any, "correct"));
    if (holdTimerRef.current) window.clearInterval(holdTimerRef.current);
    holdTimerRef.current = window.setInterval(() => {
      // re-assert highlights
      displayNames.forEach(n => kbRef.current?.highlight(n as any, "correct"));
    }, 500);
  }

  function toBassRootName(rootDisplay: string): string {
    // Force a comfortable bass octave for the root, e.g., root letter + "3"
    const m = rootDisplay.match(/^([A-G][#b]?)/i);
    const letter = m ? m[1] : rootDisplay.replace(/\d+$/,"");
    return `${letter.toUpperCase()}3`;
  }

  function triadToTreble(names: string[]): string[] {
    // Map triad to treble-friendly octaves (C4..C6-ish): ensure all >= C4
    const clampUp = (s: string) => s.replace(/\d$/, (d) => {
      const n = parseInt(d,10);
      return String(n < 4 ? 4 : n);
    });
    return names.map(clampUp);
  }

  function doPlayAndShow(deg: RomanDegree, inv: Inversion) {
    const chord = buildChord(keySel, deg, inv);
    if (!chord) return;

    setPulse("good"); setTimeout(() => setPulse(null), 220);

    // Build 4-note display:
    // chord.display is triad e.g. ["F#3","A3","C#4"]. We'll:
    //  - Bass root at a fixed bass octave (X3),
    //  - Triad mapped to >= C4 for treble.
    // Always get the true root from a ROOT-POSITION chord (same key+degree)
const rootChord = buildChord(keySel, deg, "root");
const rootDisplay = rootChord ? rootChord.display[0] : chord.display[0]; // fallback: current chord's first
const bassRoot = toBassRootName(rootDisplay);

// Use the current inversion's triad for treble (three notes)
const [n1, n2, n3] = chord.display; // these are the triad tones of the chosen inversion
const trebleTriad = triadToTreble([n1, n2, n3]);

    // Show on stave: pass 4-note "triadNotes" (GrandStaveVF will place by octave).
    setCurrentChord({
      ...chord,
      display: [bassRoot, ...trebleTriad], // 4 notes: bass root + treble triad
    });

    setExplain(() => {
      const invTxt = chord.inversion === "root" ? "root" : chord.inversion === "1st" ? "1st inversion" : "2nd inversion";
      return `${chord.label} • ${invTxt}`;
    });

    // Audio: play all 4
    const urls = [bassRoot, ...trebleTriad].map(audioUrlFromDisplay);
    if (playMode === "block") playBlock(urls);
    else playArpeggio(urls, 140);

    // Keyboard: hold all 4 highlighted
    holdKeyboard([bassRoot, ...trebleTriad]);
  }

  function onPressInversion(inv: Inversion) {
    const deg = DEGREES[degreeIndex];
    doPlayAndShow(deg, inv);
  }

  function onPrevDegree() {
    const idx = (degreeIndex + DEGREES.length - 1) % DEGREES.length;
    setDegreeIndex(idx);
    setCurrentChord(null);
    clearHold();
  }
  function onNextDegree() {
    const idx = (degreeIndex + 1) % DEGREES.length;
    setDegreeIndex(idx);
    setCurrentChord(null);
    clearHold();
  }

  function onStart() {
    if (!canStart) return;
    setStarted(true);
    setDegreeIndex(0);
    setCurrentChord(null);
    setExplain("");
    clearHold();
  }

  function onStop() {
    setStarted(false);
    setCurrentChord(null);
    setExplain("");
    clearHold();
  }

  return (
    <main className="page">
      <style>{styles}</style>

      <div className={`root ${pulse === "good" ? "pulse-good" : pulse === "bad" ? "pulse-bad" : ""}`}>
        {/* portrait blocker */}
        <div className="blocker">
          <p><strong>Please rotate your device to landscape</strong><br/>(or use a device with a larger screen)</p>
        </div>

        <PosterHeader
          options={[
            { title: "Chords Helper", subtitle: "See the chord stack in treble + its root in bass. Train your eyes before testing." },
            { title: "Stack + Root", subtitle: "Triad in treble, root in bass — the cleanest way to see harmony." },
            { title: "Block or Arpeggio", subtitle: "Hear it all at once or as a broken chord — your choice." },
          ]}
        />

        {/* Row 1: left start/stop | center stave | right picker / carousel */}
        <div className="child">
          <div className="stats-bar">

            {/* LEFT: Start/Stop + hint (8px) */}
            <div className="left-col">
              {!started ? (
                <button className="start-btn" onClick={onStart} title="Start session">▶ Start</button>
              ) : (
                <>
                  <button className="stop-btn" onClick={onStop} title="Stop session">⏹ Stop</button>
                  <div style={{ fontSize: 8, color: "#666" }}>
                    If you want to change the Key and/or {otherModeLabel} mode, press stop and choose different options
                  </div>
                </>
              )}
            </div>

            {/* CENTER: Stave (4 notes: bass root + treble triad) */}
            <div className="stave-center">
              <div className="stave-narrow">
                <GrandStaveVF
                  triadNotes={started && currentChord ? currentChord.display : null}
                  triadArpeggio={playMode === "arp"}
                />
                <div className="explain">{explain}</div>
              </div>
            </div>

            {/* RIGHT: before start → picker; after start → carousel */}
            <div className="side-box">
              {!started ? (
                <>
                  <div className="side-title">Choose Key & Mode</div>
                  <div className="picker-section">
                    <strong>Key</strong>
                    <select className="select" value={keySel} onChange={(e) => setKeySel(e.target.value as MajorKey)}>
                      {(["C","G","D","A","E","B","F#","C#","F","Bb","Eb","Ab","Db","Gb","Cb"] as MajorKey[]).map(k => (
                        <option key={k} value={k}>{k} major</option>
                      ))}
                    </select>
                  </div>
                  <div className="picker-section">
                    <strong>Play mode</strong>
                    <div className="picker-actions">
                      <label style={{ display:"inline-flex", gap:6, alignItems:"center" }}>
                        <input type="radio" checked={playMode==="block"} onChange={()=>setPlayMode("block")} />
                        <span>Block</span>
                      </label>
                      <label style={{ display:"inline-flex", gap:6, alignItems:"center" }}>
                        <input type="radio" checked={playMode==="arp"} onChange={()=>setPlayMode("arp")} />
                        <span>Arpeggio</span>
                      </label>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {/* Carousel: one chord degree at a time with inversion buttons */}
                  <div className="side-title">Explore Chords in {keySel} major</div>
                  <div className="carousel">
                    <button className="carousel-arrow" onClick={onPrevDegree} title="Previous chord">←</button>
                    <div className="carousel-body">
                      <div className="carousel-title">{DEGREES[degreeIndex]}</div>

                      <div className="inv-group">
                        <button className="inv-btn" onClick={() => onPressInversion("root")}>Root</button>
                        <button className="inv-btn" onClick={() => onPressInversion("1st")}>1st inv</button>
                        <button className="inv-btn" onClick={() => onPressInversion("2nd")}>2nd inv</button>
                      </div>
                    </div>
                    <button className="carousel-arrow" onClick={onNextDegree} title="Next chord">→</button>
                  </div>
                </>
              )}
            </div>

          </div>
        </div>

        {/* Row 2: keyboard (highlights all 4 selected notes; held until next choice) */}
        <div className="child">
          <div className="media">
            <ResponsiveKeyboardC2toC6
              ref={kbRef}
              onKeyDown={() => {}}
              onKeyPress={() => {}}
              judge={() => undefined}
            />
          </div>
        </div>

      </div>
    </main>
  );
}