"use client";

import React, { useEffect, useMemo, useState } from "react";
import GrandStaveVF from "../components/GrandStaveVF";
import ResponsiveKeyboardC2toC6 from "../components/ResponsiveKeyboardC2toC6";

/* ========= utils: note name <-> midi (C4 = 60) ========= */
const PITCH_CLASS: Record<string, number> = {
  C: 0, "C#": 1, D: 2, "D#": 3, E: 4, F: 5, "F#": 6, G: 7, "G#": 8, A: 9, "A#": 10, B: 11,
};
const FLAT_TO_SHARP: Record<string, string> = {
  Db: "C#", Eb: "D#", Gb: "F#", Ab: "G#", Bb: "A#",
};
function noteNameToMidi(n: string): number | null {
  const m = n.match(/^([A-Ga-g])([#b]?)(\d)$/);
  if (!m) return null;
  const letter = m[1].toUpperCase();
  const acc = m[2] as "" | "#" | "b";
  const oct = parseInt(m[3], 10);
  let name = letter + acc;
  if (acc === "b") name = FLAT_TO_SHARP[letter + "b"] ?? name;
  const pc = PITCH_CLASS[name];
  if (pc == null) return null;
  return (oct + 1) * 12 + pc;
}
function midiToNameSharp(midi: number): string {
  const names = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];
  const pc = midi % 12;
  const oct = Math.floor(midi / 12) - 1;
  return `${names[pc]}${oct}`;
}
function eqNote(a: string, b: string): boolean {
  const ma = noteNameToMidi(a);
  const mb = noteNameToMidi(b);
  return ma != null && mb != null && ma === mb;
}

/* ========= training pools ========= */
type Mode = "guide" | "treble" | "bass" | "full";

/* Build chromatic names with sharps + flats for a MIDI range (inclusive). */
function buildPool(minMidi: number, maxMidi: number): string[] {
  const pool: string[] = [];
  const sharpToFlat: Record<string,string> = { "C#":"Db","D#":"Eb","F#":"Gb","G#":"Ab","A#":"Bb" };
  for (let m = minMidi; m <= maxMidi; m++) {
    const sharp = midiToNameSharp(m);            // e.g. "C#4"
    pool.push(sharp);
    const base = sharp.slice(0, -1);             // "C#"
    const oct  = sharp.slice(-1);                // "4"
    if (sharpToFlat[base]) pool.push(`${sharpToFlat[base]}${oct}`); // add flat twin
  }
  return pool;
}
const POOL_TREBLE = buildPool(noteNameToMidi("C4")!, noteNameToMidi("C6")!);
const POOL_BASS   = buildPool(noteNameToMidi("C2")!, noteNameToMidi("C4")!);
const POOL_GUIDE  = ["C2","G2","C3","F3","C4","G4","C5","F5","C6"]; // simple version
const POOL_FULL   = buildPool(noteNameToMidi("C2")!, noteNameToMidi("C6")!);

function getPool(mode: Mode): string[] {
  switch (mode) {
    case "guide":  return POOL_GUIDE;
    case "treble": return POOL_TREBLE;
    case "bass":   return POOL_BASS;
    default:       return POOL_FULL;
  }
}
function pickRandom(exclude: string | null, pool: string[]): string {
  if (!pool.length) return "C4";
  let n = pool[Math.floor(Math.random() * pool.length)];
  if (exclude && eqNote(n, exclude)) {
    for (let i = 0; i < 6; i++) {
      const t = pool[Math.floor(Math.random() * pool.length)];
      if (!eqNote(t, exclude)) { n = t; break; }
    }
  }
  return n;
}

/* ========= Styles: stable, no JS sizing ========= */
const styles = `
:root {
  --page-max-width: 1200px;
  --radius: 8px;

  /* box sizes (secondary; do not try to match stave) */
  --stats-w: 120px;
  --mode-w:  180px;

  /* keyboard min height */
  --keyboard-min-h: 120px;
}

.page { box-sizing: border-box; max-width: var(--page-max-width); margin: 0 auto; padding: 8px; }
.root {
  box-sizing: border-box;
  border: 2px solid red; border-radius: var(--radius); background: #fff;
  display: flex; flex-direction: column;
  padding: 12px;
  min-height: 100%;
}
.header { text-align: center; margin-bottom: 8px; }
.header h1 { margin: 0 0 6px 0; }
.header p { margin: 0; color: #444; }

/* Grid: two rows; let each row fill width */
.grid {
  display: grid;
  grid-template-columns: 1fr;
  grid-template-rows: auto auto;
  gap: 10px;
}

/* Row cards */
.child { border: 2px solid red; border-radius: var(--radius); background: #fff; padding: 8px; }
.child--stave { }
.child--keys  { }

/* The row with boxes + stave + mode selector */
.stats-bar {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;       /* vertical centering inside the row */
  column-gap: 10px;
}

/* left boxes column (independent height) */
.stats-left { display: flex; flex-direction: column; gap: 8px; width: var(--stats-w); }
.stats-box {
  border: 1px solid #000; border-radius: 6px; padding: 8px 10px;
  display: grid; place-items: center;
}

/* center: make stave area the hero (stretches) */
.stave-center { min-width: 0; display: flex; justify-content: center; align-items: center; }
.stave-narrow { width: 260px; } /* your fixed, high-quality grand stave */

/* right mode box */
.mode-box {
  width: var(--mode-w);
  border: 1px solid #000; border-radius: 6px; padding: 8px 10px;
  display: flex; flex-direction: column; gap: 6px; align-items: stretch;
  background: #f3f3f3;
}
.mode-box .mode-title { text-align: center; font-weight: 600; }

/* Keyboard row: let the SVG fill naturally */
.media { display: flex; align-items: center; justify-content: center; min-height: var(--keyboard-min-h); }
.media > svg { width: 100%; height: 100%; display: block; }

/* Small-screen portrait overlay — covers content without changing layout */
.blocker {
  position: absolute; inset: 0;
  display: none; align-items: center; justify-content: center;
  background: rgba(255,255,255,0.95);
  z-index: 5; text-align: center; padding: 24px;
  border-radius: var(--radius);
}
.blocker p { margin: 0; font-size: 16px; line-height: 1.4; }

/* show overlay only on very small portrait devices */
@media (max-width: 450px) and (orientation: portrait) {
  .blocker { display: flex; }
}
`;

export default function NotationRandomStable() {
  /* session state */
  const [mode, setMode] = useState<Mode>("full");
  const pool = useMemo(() => getPool(mode), [mode]);
  const [target, setTarget] = useState(() => pickRandom(null, getPool("full")));
  const [progress, setProgress] = useState(0); // 0..25
  const [correct, setCorrect] = useState(0);
  const [firstTry, setFirstTry] = useState(true);

  /* reset when mode changes */
  useEffect(() => {
    setTarget(pickRandom(null, pool));
    setProgress(0);
    setCorrect(0);
    setFirstTry(true);
  }, [pool]);

  /* keyboard verdict (for highlight) */
  const judge = (pressedName: string) =>
    (eqNote(pressedName, target) ? "correct" : "wrong") as "correct" | "wrong";

  /* keyboard MIDI press → advance logic */
  const onKeyPressMidi = (m: number) => {
    const targetMidi = noteNameToMidi(target);
    if (targetMidi == null) return;

    if (m === targetMidi) {
      if (firstTry) setCorrect(c => Math.min(25, c + 1));
      setProgress(p => {
        const next = Math.min(25, p + 1);
        if (next < 25) {
          setTarget(prev => pickRandom(prev, pool));
          setFirstTry(true);
        }
        return next;
      });
    } else {
      setFirstTry(false);
    }
  };

  /* optional name handler (kept for compatibility) */
  const onKeyDownName = (_name: string) => {};

  /* note to draw */
  const targetMidi = noteNameToMidi(target) ?? 60;

  return (
    <>
      <style>{styles}</style>

      <div className="page">
        <div className="root" style={{ position: "relative" }}>
          {/* Small-screen portrait overlay */}
          <div className="blocker">
            <p>
              <strong>Please rotate your device to landscape</strong>
              <br />
              (or use a device with a larger screen)
            </p>
          </div>

          <div className="header">
            <h1>containers</h1>
            <p>change them as you like</p>
          </div>

          <div className="grid">
            {/* Row 1: boxes + stave + mode */}
            <div className="child child--stave">
              <div className="stats-bar">
                {/* LEFT boxes (independent sizes) */}
                <div className="stats-left">
                  <div className="stats-box">
                    <div>Progress</div>
                    <div className="stats-value">{progress}/25</div>
                  </div>
                  <div className="stats-box">
                    <div>Correct</div>
                    <div className="stats-value">{correct}/25</div>
                  </div>
                </div>

                {/* CENTER: Grand Stave (hero) */}
                <div className="stave-center">
                  <div className="stave-narrow">
                    <GrandStaveVF key={targetMidi} noteMidi={targetMidi} />
                  </div>
                </div>

                {/* RIGHT: Mode select (simple & robust) */}
                <div className="mode-box">
                  <div className="mode-title">CHOOSE TRAINING MODE</div>
                  <select
                    className="mode-select"
                    value={mode}
                    onChange={(e) => setMode(e.target.value as Mode)}
                  >
                    <option value="guide">Guide Notes</option>
                    <option value="treble">Treble Clef Notes</option>
                    <option value="bass">Bass Clef Notes</option>
                    <option value="full">All C2–C6 Notes</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Row 2: Keyboard (fills width, no clipping) */}
            <div className="child child--keys">
              <div className="media">
                <ResponsiveKeyboardC2toC6
                  judge={judge}
                  onKeyPress={onKeyPressMidi}
                  onKeyDown={onKeyDownName}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}