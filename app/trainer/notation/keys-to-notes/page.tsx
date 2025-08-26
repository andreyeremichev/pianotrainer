"use client";

import React, { useMemo, useRef, useState } from "react";
import Link from "next/link";

// ⬇️ client-only import to ensure the grand staff renders online (Vercel)
import dynamic from "next/dynamic";
const GrandStaveVF = dynamic(() => import("../../../components/GrandStaveVF"), { ssr: false });

import ResponsiveKeyboardC2toC6 from "../../../components/ResponsiveKeyboardC2toC6";

/* ========= midi/name helpers (C4 = 60) ========= */
const SHARP_NAMES = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];
const FLAT_MAP: Record<number, string> = { 1: "Db", 3: "Eb", 6: "Gb", 8: "Ab", 10: "Bb" };

function midiToNameSharp(midi: number): string {
  const pc = midi % 12;
  const oct = Math.floor(midi / 12) - 1;
  return `${SHARP_NAMES[pc]}${oct}`;
}
function midiToNameFlat(midi: number): string {
  const pc = midi % 12;
  const oct = Math.floor(midi / 12) - 1;
  const base = FLAT_MAP[pc];
  return base ? `${base}${oct}` : `${SHARP_NAMES[pc]}${oct}`;
}
function noteNameToMidi(n: string): number | null {
  const m = n.match(/^([A-Ga-g])([#b]?)(\d)$/);
  if (!m) return null;
  const letter = m[1].toUpperCase();
  const acc = m[2] as "" | "#" | "b";
  const oct = parseInt(m[3], 10);
  const pcMap: Record<string, number> = {
    C: 0, "C#": 1, Db: 1, D: 2, "D#": 3, Eb: 3, E: 4, F: 5,
    "F#": 6, Gb: 6, G: 7, "G#": 8, Ab: 8, A: 9, "A#": 10, Bb: 10, B: 11,
  };
  const key = (acc === "" ? letter : `${letter}${acc}`);
  const pc = pcMap[key];
  if (pc == null) return null;
  return (oct + 1) * 12 + pc;
}

/* ========= audio helpers (reuse your /public/audio/notes set) ========= */
const audioCache = new Map<string, HTMLAudioElement>();
function normalizeToSharp(name: string): string {
  // Convert flats → sharps for file lookup only; octave preserved
  const m = name.match(/^([A-G])([#b]?)(\d)$/i);
  if (!m) return name;
  const letter = m[1].toUpperCase();
  const acc = m[2] as "" | "#" | "b";
  const oct = m[3];
  if (acc === "b") {
    const map: Record<string, string> = { D: "C#", E: "D#", G: "F#", A: "G#", B: "A#" };
    const twin = map[letter];
    if (twin) return `${twin}${oct}`;
  }
  return `${letter}${acc}${oct}`;
}
function audioUrl(name: string): string {
  const sharp = normalizeToSharp(name);
  return `/audio/notes/${sharp.replace("#", "%23")}.wav`;
}
function getAudio(name: string): HTMLAudioElement {
  const key = normalizeToSharp(name);
  let a = audioCache.get(key);
  if (!a) {
    a = new Audio(audioUrl(key));
    a.preload = "auto";
    audioCache.set(key, a);
  }
  return a;
}
function playOnce(name: string) {
  const a = getAudio(name);
  try { a.currentTime = 0; } catch {}
  a.play().catch(() => { /* unlocks on first user interaction */ });
}

/* ========= styles (frozen containers; keep stave 260×170) ========= */
const styles = `
:root {
  --page-max-width: 1200px;
  --radius: 8px;
  --keyboard-min-h: 120px;
}
.page { box-sizing: border-box; max-width: var(--page-max-width); margin: 0 auto; padding: 8px; }
.root {
  box-sizing: border-box;
  border: 1px solid #ccc; border-radius: var(--radius); background: #fff;
  display: flex; flex-direction: column;
  padding: 12px; min-height: 100%;
}
.header { text-align: center; margin-bottom: 8px; }
.header h1 { margin: 0 0 4px 0; }
.header p { margin: 0; color: #444; }
.title-line { display: inline-flex; gap: 10px; align-items: baseline; }
.title-home { font-size: 12px; text-decoration: underline; }

/* grid: just stave row + keyboard row */
.grid { display: grid; grid-template-columns: 1fr; grid-template-rows: auto auto; gap: 10px; }

.child { border: 1px solid #ccc; border-radius: var(--radius); background: #fff; padding: 8px; }
.child--stave {}
.child--keys  {}

.stave-center { min-width: 0; display: flex; justify-content: center; align-items: center; }
.stave-narrow { width: 260px; } /* 🔒 FROZEN */

.media { display: flex; align-items: center; justify-content: center; min-height: var(--keyboard-min-h); }
.media > svg { width: 100%; height: 100%; display: block; }

/* Portrait blocker for trainer pages */
.blocker { position: absolute; inset: 0; display: none; align-items: center; justify-content: center;
  background: rgba(255,255,255,0.95); z-index: 5; text-align: center; padding: 24px; border-radius: var(--radius); }
.blocker p { margin: 0; font-size: 16px; line-height: 1.4; }
@media (max-width: 450px) and (orientation: portrait) { .blocker { display: flex; } }
`;

export default function KeysToNotesPage() {
  // Current note shown on the grand staff
  const [noteName, setNoteName] = useState<string>("C4"); // default visible note
  const noteMidi = useMemo(() => noteNameToMidi(noteName) ?? 60, [noteName]);

  // Track the last *white* key the user pressed to choose enharmonic for next black
  const lastWhiteMidiRef = useRef<number | null>(null);

  // Called by keyboard with MIDI number whenever a key is pressed
  const handleKeyPressMidi = (midi: number) => {
    const pc = midi % 12;
    const isBlack = pc === 1 || pc === 3 || pc === 6 || pc === 8 || pc === 10;

    let display: string;
    if (isBlack) {
      const lastWhite = lastWhiteMidiRef.current;
      if (lastWhite == null) {
        // No white reference yet → default to sharp
        display = midiToNameSharp(midi);
      } else if (lastWhite < midi) {
        // White key to the left → spell as sharp
        display = midiToNameSharp(midi);
      } else if (lastWhite > midi) {
        // White key to the right → spell as flat
        display = midiToNameFlat(midi);
      } else {
        // Same pitch (shouldn't happen with black vs white) → sharp fallback
        display = midiToNameSharp(midi);
      }
    } else {
      // Natural note
      display = midiToNameSharp(midi);
      lastWhiteMidiRef.current = midi; // update white-key anchor
    }

    // Update stave + play audio
    setNoteName(display);
    playOnce(display);
  };

  // (optional) legacy name callback (kept for keyboard API compatibility)
  const handleKeyDownName = (_name: string) => {};

  return (
    <>
      <style>{styles}</style>

      <div className="page">
        <div className="root" style={{ position: "relative" }}>
          {/* small-screen portrait overlay */}
          <div className="blocker">
            <p>
              <strong>Please rotate your device to landscape</strong>
              <br />
              (or use a device with a larger screen)
            </p>
          </div>

          {/* Header (inline variant: title container + HOME link) */}
          <div className="header">
            <div className="title-line">
              <h1>Keys → Notes (Grand Staff)</h1>
              <Link href="/" className="title-home">HOME</Link>
            </div>
            <p>Press any key (C2–C6). The note plays and appears instantly on the grand staff.</p>
          </div>

          <div className="grid">
            {/* Row 1: Stave (centered, fixed 260×170) */}
            <div className="child child--stave">
              <div className="stave-center">
                <div className="stave-narrow">
                  <GrandStaveVF
                    key={noteName}             // re-layout safely per note
                    noteName={noteName}        // exact spelling (C# vs Db)
                    noteMidi={noteMidi}        // octave/clef placement
                    forceClef={null}           // always render both staves; component chooses line
                  />
                </div>
              </div>
            </div>

            {/* Row 2: Keyboard (unchanged) */}
            <div className="child child--keys">
              <div className="media">
                <ResponsiveKeyboardC2toC6
                  onKeyPress={handleKeyPressMidi}
                  onKeyDown={handleKeyDownName}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}