
"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";

// Client-only grand staff (frozen geometry)
const GrandStaveVF = dynamic(() => import("../../../components/GrandStaveVF"), { ssr: false });
// Frozen keyboard (unchanged)
import ResponsiveKeyboardC2toC6 from "../../../components/ResponsiveKeyboardC2toC6";

/* ======================= constants & helpers ======================= */

type IntervalCode = "m2"|"M2"|"m3"|"M3"|"P4"|"TT"|"P5"|"m6"|"M6"|"m7"|"M7"|"P8";
type Clef = "bass" | "treble";

const INTERVALS: { code: IntervalCode; semitones: number; label: string }[] = [
  { code: "m2", semitones: 1,  label: "minor 2nd" },
  { code: "M2", semitones: 2,  label: "major 2nd" },
  { code: "m3", semitones: 3,  label: "minor 3rd" },
  { code: "M3", semitones: 4,  label: "major 3rd" },
  { code: "P4", semitones: 5,  label: "perfect 4th" },
  { code: "TT", semitones: 6,  label: "tritone (A4/d5)" },
  { code: "P5", semitones: 7,  label: "perfect 5th" },
  { code: "m6", semitones: 8,  label: "minor 6th" },
  { code: "M6", semitones: 9,  label: "major 6th" },
  { code: "m7", semitones: 10, label: "minor 7th" },
  { code: "M7", semitones: 11, label: "major 7th" },
  { code: "P8", semitones: 12, label: "octave" },
];

const SHARP_NAMES = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];
const PC_IS_BLACK = new Set([1,3,6,8,10]); // C#, D#, F#, G#, A#

function midiToNameSharp(midi: number): string {
  const pc = midi % 12;
  const oct = Math.floor(midi / 12) - 1;
  return `${SHARP_NAMES[pc]}${oct}`;
}

function midiToNameFlatIfDescending(midi: number, descending: boolean): string {
  const sharp = midiToNameSharp(midi);
  if (!descending) return sharp; // ascending → prefer sharps on black
  const base = sharp.slice(0, -1);
  const oct  = sharp.slice(-1);
  const map: Record<string,string> = { "C#":"Db", "D#":"Eb", "F#":"Gb", "G#":"Ab", "A#":"Bb" };
  return map[base] ? `${map[base]}${oct}` : sharp;
}

function noteNameToMidi(n: string): number | null {
  const m = n.match(/^([A-Ga-g])([#b]?)(\d)$/);
  if (!m) return null;
  const letter = m[1].toUpperCase();
  const acc = (m[2] || "") as "" | "#" | "b";
  const oct = parseInt(m[3], 10);
  const flatToSharp: Record<string,string> = { Db:"C#", Eb:"D#", Gb:"F#", Ab:"G#", Bb:"A#" };
  const name = acc === "b" ? (flatToSharp[`${letter}b`] ?? `${letter}`) : (letter + acc);
  const pc = SHARP_NAMES.indexOf(name);
  if (pc < 0) return null;
  return (oct + 1) * 12 + pc;
}

/* ======= Audio normalization (flats → sharps) [VERBATIM as requested] ======= */
const audioCache = new Map<string, HTMLAudioElement>();
function normalizeToSharp(name: string) {
  const m = name.match(/^([A-G])([#b]?)(\d)$/i); if (!m) return name;
  const letter = m[1].toUpperCase(), acc = (m[2] || "") as ""|"#"|"b", oct = m[3];
  if (acc === "b") {
    const MAP: Record<string,string> = { Db:"C#", Eb:"D#", Gb:"F#", Ab:"G#", Bb:"A#" };
    const twin = MAP[(letter + "b") as keyof typeof MAP]; if (twin) return `${twin}${oct}`;
  }
  return `${letter}${acc}${oct}`;
}
function audioUrl(display: string) {
  const s = normalizeToSharp(display); return `/audio/notes/${s.replace("#", "%23")}.wav`;
}
function getAudio(display: string) {
  const key = normalizeToSharp(display); let a = audioCache.get(key);
  if (!a) { a = new Audio(audioUrl(display)); a.preload = "auto"; audioCache.set(key, a); }
  return a;
}
function playOnce(display: string) { const a = getAudio(display); try { a.currentTime = 0; } catch {} a.play().catch(() => {}); }

/* ======================= styles (frozen scaffold) ======================= */
const styles = `
:root {
  --page-max-width: 1200px;
  --radius: 8px;
  --stats-w: 120px;
  --picker-w: 220px;
  --keyboard-min-h: 120px;
}
.page { box-sizing: border-box; max-width: var(--page-max-width); margin: 0 auto; padding: 8px; }
.root { box-sizing: border-box; border: 1px solid #ccc; border-radius: var(--radius); background: #fff;
  display: flex; flex-direction: column; padding: 12px; min-height: 100%; position: relative; }
.header { text-align: center; margin-bottom: 8px; }
.header h1 { margin: 0 0 4px 0; }
.header p { margin: 0; color: #444; }
.title-line { display: inline-flex; gap: 10px; align-items: baseline; }
.title-home { font-size: 12px; text-decoration: underline; }

.grid { display: grid; grid-template-columns: 1fr; grid-template-rows: auto auto; gap: 10px; }
.child { border: 1px solid #ccc; border-radius: var(--radius); background: #fff; padding: 8px; }

.stats-bar {
  display: grid; grid-template-columns: auto 1fr auto; align-items: center; column-gap: 10px;
}
.stats-left { display: flex; flex-direction: column; gap: 8px; width: var(--stats-w); }
.stats-box { border: 1px solid #000; border-radius: 6px; padding: 8px 10px; display: grid; place-items: center; }
.stats-value { font-weight: 700; }
.restart-btn { margin-top: 6px; padding: 6px 10px; font-size: 12px; border: 1px solid #444; background: #eee; cursor: pointer; }

.stave-center { min-width: 0; display: flex; justify-content: center; align-items: center; }
.stave-narrow { width: 260px; } /* 🔒 FROZEN size */

.picker-box { width: var(--picker-w); border: 1px solid #000; border-radius: 6px; padding: 8px 10px;
  display: flex; flex-direction: column; gap: 6px; align-items: stretch; background: #f3f3f3; }
.picker-title { text-align: center; font-weight: 600; }
.picker-list { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 10px; font-size: 13px; }
.picker-actions { display: flex; gap: 6px; justify-content: center; }
.picker-actions button { font-size: 12px; padding: 4px 8px; }

.media { display: flex; align-items: center; justify-content: center; min-height: var(--keyboard-min-h); }
.media > svg { width: 100%; height: 100%; display: block; }

.blocker { position: absolute; inset: 0; display: none; align-items: center; justify-content: center;
  background: rgba(255,255,255,0.95); z-index: 5; text-align: center; padding: 24px; border-radius: var(--radius); }
.blocker p { margin: 0; font-size: 16px; line-height: 1.4; }
@media (max-width: 450px) and (orientation: portrait) { .blocker { display: flex; } }

/* Overlay trick to show two notes using two stacked staves without doubling lines/connectors */
.stave-stack { position: relative; width: 260px; }
.stave-stack .overlay { position: absolute; inset: 0; }
.stave-stack .overlay svg .vf-stave,
.stave-stack .overlay svg .vf-staveconnector,
.stave-stack .overlay svg .vf-clef { display: none; }
.interval-label { text-align: center; font-size: 13px; margin-top: 6px; min-height: 1.2em; }
`;

/* ======================= duplicate-event guard (verbatim) ======================= */
const echoRefGlobal = { current: null as { id: string; t: number } | null };
function shouldAcceptOnce(id: string, desktopMs = 220, touchMs = 520) {
  const now = performance.now();
  const last = echoRefGlobal.current;
  const isCoarse = typeof window !== "undefined" && matchMedia?.("(pointer: coarse)")?.matches;
  const win = isCoarse ? touchMs : desktopMs;
  if (last && last.id === id && (now - last.t) < win) return false;
  echoRefGlobal.current = { id, t: now };
  return true;
}

/* ======================= page ======================= */
export default function IntervalsSequentialPage() {
  /* selections: which intervals are in the pool */
  const [selected, setSelected] = useState<Record<IntervalCode, boolean>>(() => {
    const init: Record<IntervalCode, boolean> = {
      m2:true, M2:true, m3:true, M3:true, P4:true, TT:true,
      P5:true, m6:true, M6:true, m7:true, M7:true, P8:true,
    };
    return init;
  });

  /* session state */
  const [progress, setProgress] = useState(0); // 0..25
  const [correct, setCorrect] = useState(0); // first-try successes
  const [firstTry, setFirstTry] = useState(true);

  // current target pair
  const [lowerMidi, setLowerMidi] = useState<number | null>(null);
  const [upperMidi, setUpperMidi] = useState<number | null>(null);
  const [intervalLabel, setIntervalLabel] = useState<string>("");

  // step: 1=await lower; 2=await upper; 3=done (show label, then advance)
  const [step, setStep] = useState<1|2|3>(1);

  const awaitingNextRef = useRef(false);

  // build active list of intervals
  const activeIntervals = useMemo(() => {
    return INTERVALS.filter(i => selected[i.code]);
  }, [selected]);

  // helper: pick next interval & positions (fully inside a single clef)
  function rollNew() {
    const pool = activeIntervals.length ? activeIntervals : INTERVALS;
    const pick = pool[Math.floor(Math.random() * pool.length)];
    const semis = pick.semitones;

    // pick clef first (half probability each)
    const clef: Clef = Math.random() < 0.5 ? "bass" : "treble";
    // ranges (inclusive)
    const MIN_BASS = 36; // C2
    const MAX_BASS = 60; // C4
    const MIN_TREB = 60; // C4
    const MAX_TREB = 84; // C6

    let baseMin: number, baseMax: number;
    if (clef === "bass") {
      baseMin = MIN_BASS;
      baseMax = MAX_BASS - semis; // ensure upper fits
    } else {
      baseMin = MIN_TREB;
      baseMax = MAX_TREB - semis;
    }

    // sanity clamp
    if (baseMax < baseMin) {
      // if interval doesn't fit in chosen clef, retry on the other clef
      const otherClef = clef === "bass" ? "treble" : "bass";
      return rollNew(); // simple retry; rare edge when semis=12 at edge
    }

    const base = baseMin + Math.floor(Math.random() * (baseMax - baseMin + 1));
    const lower = base;
    const upper = base + semis;

    setLowerMidi(lower);
    setUpperMidi(upper);
    setIntervalLabel(pick.label);
    setFirstTry(true);
    setStep(1);
    awaitingNextRef.current = false;

    // auto-play both notes when displayed (sequential, quick)
    const lowerName = midiToNameSharp(lower);
    const upperName = midiToNameSharp(upper); // ascending → prefer sharps
    playOnce(lowerName);
    setTimeout(() => playOnce(upperName), 280);
  }

  // start a session or proceed after completion
  useEffect(() => {
    if (progress === 0 && lowerMidi == null && upperMidi == null) rollNew();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // judge callback for keyboard (decides green/red flash)
  const judge = (noteName: string) => {
    if (awaitingNextRef.current || lowerMidi == null || upperMidi == null) return undefined;
    const expected = step === 1 ? lowerMidi : upperMidi;
    const pressedMidi = noteNameToMidi(noteName);
    if (pressedMidi == null) return undefined;
    return (pressedMidi === expected ? "correct" : "wrong") as "correct" | "wrong";
  };

  // keyboard press handler (MIDI)
  const onKeyPressMidi = (midi: number) => {
    if (awaitingNextRef.current || lowerMidi == null || upperMidi == null) return;

    // de-dupe
    const guardId = `press-${midi}`;
    if (!shouldAcceptOnce(guardId)) return;

    // guide audio on every press
    const pressedName = midiToNameSharp(midi);
    playOnce(pressedName);

    const expected = step === 1 ? lowerMidi : upperMidi;
    if (midi === expected) {
      if (step === 1) {
        setStep(2);
      } else if (step === 2) {
        // finished pair
        setStep(3);
        awaitingNextRef.current = true;

        // increment "correct" if firstTry
        if (firstTry) setCorrect(c => Math.min(25, c + 1));

        // show label briefly, then advance
        setTimeout(() => {
          setProgress(p => {
            const next = Math.min(25, p + 1);
            if (next < 25) {
              rollNew();
            } else {
              // session complete — wait for Restart
              awaitingNextRef.current = false;
            }
            return next;
          });
        }, 1000);
      }
    } else {
      // wrong
      setFirstTry(false);
    }
  };

  const sessionDone = progress >= 25;
  const handleRestart = () => {
    setProgress(0);
    setCorrect(0);
    setFirstTry(true);
    setIntervalLabel("");
    setLowerMidi(null);
    setUpperMidi(null);
    setStep(1);
    awaitingNextRef.current = false;
    rollNew();
  };

  // derived display names for staff (ascending → prefer sharps on upper)
  const lowerNameDisplay = lowerMidi != null
    ? midiToNameFlatIfDescending(lowerMidi, false) // not descending → default sharp
    : "C4";
  const upperNameDisplay = upperMidi != null
    ? midiToNameFlatIfDescending(upperMidi, false) // ascending → sharp if black
    : "E4";

  // UI: intervals picker handlers
  const toggleAll = (v: boolean) => {
    const next: Record<IntervalCode, boolean> = { ...selected };
    INTERVALS.forEach(i => { next[i.code] = v; });
    setSelected(next);
  };
  const ensureAtLeastOne = (code: IntervalCode, v: boolean) => {
    const next = { ...selected, [code]: v };
    if (!Object.values(next).some(Boolean)) {
      // prevent empty pool → keep the toggled one on
      next[code] = true;
    }
    setSelected(next);
  };

  return (
    <>
      <style>{styles}</style>

      <div className="page">
        <div className="root">
          {/* Portrait blocker */}
          <div className="blocker">
            <p><strong>Please rotate your device to landscape</strong><br/>(or use a device with a larger screen)</p>
          </div>

          {/* Title */}
          <div className="header">
            <div className="title-line">
              <h1>Intervals (Sequential)</h1>
              <Link href="/" className="title-home">HOME</Link>
            </div>
            <p>See an interval on the grand staff. Play the <strong>lower</strong> note first, then the <strong>upper</strong>. Interval name appears on success.</p>
          </div>

          {/* Stave row */}
          <div className="child">
            <div className="stats-bar">
              {/* LEFT: Progress / Correct + Restart (on done) */}
              <div className="stats-left">
                <div className="stats-box">
                  <div>Progress</div>
                  <div className="stats-value">{progress}/25</div>
                </div>
                <div className="stats-box">
                  <div>Correct</div>
                  <div className="stats-value">{correct}/25</div>
                </div>
                {sessionDone && (
                  <button className="restart-btn" onClick={handleRestart}>Restart Session</button>
                )}
              </div>

              {/* CENTER: Frozen grand staff (two notes via overlay trick) */}
              <div className="stave-center">
                <div className="stave-narrow">
                  <div className="stave-stack">
                    {/* Base layer: lower note, staff visible */}
                    <GrandStaveVF
                      key={`L-${lowerNameDisplay}`}
                      noteName={lowerNameDisplay}
                      // noteMidi unused for drawing here; staff decides by octave
                    />
                    {/* Overlay: upper note only (hide staves/connectors/clefs via CSS) */}
                    <div className="overlay">
                      <GrandStaveVF
                        key={`U-${upperNameDisplay}`}
                        noteName={upperNameDisplay}
                      />
                    </div>
                  </div>
                  {/* Interval label shown after success (step 3) */}
                  <div className="interval-label">
                    {step === 3 ? intervalLabel : "\u00A0"}
                  </div>
                </div>
              </div>

              {/* RIGHT: Interval picker */}
              <div className="picker-box">
                <div className="picker-title">Choose Intervals</div>
                <div className="picker-actions">
                  <button onClick={() => toggleAll(true)}>Select all</button>
                  <button onClick={() => toggleAll(false)}>Clear all</button>
                </div>
                <div className="picker-list">
                  {INTERVALS.map(i => (
                    <label key={i.code} style={{ display:"flex", gap:6, alignItems:"center" }}>
                      <input
                        type="checkbox"
                        checked={!!selected[i.code]}
                        onChange={e => ensureAtLeastOne(i.code, e.target.checked)}
                      />
                      <span>{i.code} — {i.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Keyboard */}
          <div className="child">
            <div className="media">
              <ResponsiveKeyboardC2toC6
                judge={judge}
                onKeyPress={onKeyPressMidi}
                onKeyDown={() => {}}
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}