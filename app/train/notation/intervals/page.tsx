"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";

const GrandStaveVF = dynamic(() => import("../../../components/GrandStaveVF"), { ssr: false });
import ResponsiveKeyboardC2toC6 from "../../../components/ResponsiveKeyboardC2toC6";
import PosterHeader from "@/components/PosterHeader";

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

function midiToNameSharp(midi: number): string {
  const pc = midi % 12;
  const oct = Math.floor(midi / 12) - 1;
  return `${SHARP_NAMES[pc]}${oct}`;
}
function midiToNameFlatIfDescending(midi: number, descending: boolean): string {
  const sharp = midiToNameSharp(midi);
  if (!descending) return sharp;
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

/* ======= Audio normalization (flats → sharps) ======= */
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
/* ======= WebAudio (sample-accurate, for scheduled notes) ======= */
let _ac: AudioContext | null = null;
const _bufs = new Map<string, AudioBuffer>();

function getAC(): AudioContext {
  if (!_ac) {
    // @ts-ignore
    const AC = window.AudioContext || (window as any).webkitAudioContext;
    _ac = new AC({ latencyHint: "interactive" });
  }
  return _ac!;
}

async function fetchBuffer(display: string): Promise<AudioBuffer> {
  const key = normalizeToSharp(display);
  if (_bufs.has(key)) return _bufs.get(key)!;
  const res = await fetch(audioUrl(display), { cache: "force-cache" });
  const arr = await res.arrayBuffer();
  const buf = await getAC().decodeAudioData(arr);
  _bufs.set(key, buf);
  return buf;
}

/** Schedule a single note at absolute AudioContext time (seconds). */
async function scheduleNote(display: string, when: number, gainDb = 0) {
  const ac = getAC();
  const buf = await fetchBuffer(display);
  const src = ac.createBufferSource();
  src.buffer = buf;
  if (gainDb !== 0) {
    const g = ac.createGain();
    const lin = Math.pow(10, gainDb / 20);
    g.gain.setValueAtTime(lin, when);
    src.connect(g).connect(ac.destination);
  } else {
    src.connect(ac.destination);
  }
  try { src.start(when); } catch {}
}

/* ======================= styles ======================= */
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
.header p { margin: 0; color: var(--site-muted); }
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
.start-btn {
  margin-top: 6px;
  padding: 6px 10px;
  font-size: 12px;
  border: 1px solid #1c7c31;  /* darker green border */
  background: #28a745;        /* bright green */
  color: #fff;                /* white text */
  cursor: pointer;
}

.stave-center { min-width: 0; display: flex; justify-content: center; align-items: center; }
.stave-narrow { width: 260px; } /* 🔒 FROZEN size */

.picker-box { width: var(--picker-w); border: 1px solid #000; border-radius: 6px; padding: 8px 10px;
  display: flex; flex-direction: column; gap: 6px; align-items: stretch; background: #f3f3f3; }
.picker-title { text-align: center; font-weight: 600; }
.picker-list { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 10px; font-size: 13px; }
.picker-actions { display: flex; gap: 6px; justify-content: center; }
.picker-actions button { font-size: 12px; padding: 4px 8px; }

.interval-label { text-align: center; font-size: 13px; margin-top: 6px; min-height: 1.2em; }

.media { display: flex; align-items: center; justify-content: center; min-height: var(--keyboard-min-h); }
.media > svg { width: 100%; height: 100%; display: block; }

.blocker { position: absolute; inset: 0; display: none; align-items: center; justify-content: center;
  background: rgba(255,255,255,0.95); z-index: 5; text-align: center; padding: 24px; border-radius: var(--radius); }
.blocker p { margin: 0; font-size: 16px; line-height: 1.4; }
@media (max-width: 450px) and (orientation: portrait) { .blocker { display: flex; } }

/* === Nudge Pack pulse glow (no layout impact) === */
.pulse-good { box-shadow: 0 0 0 2px rgba(32,201,151,0.00) inset; animation: pg 220ms ease; }
.pulse-bad  { box-shadow: 0 0 0 2px rgba(255,107,107,0.00) inset; animation: pb 220ms ease; }
@keyframes pg {
  0%   { box-shadow: 0 0 0 0 rgba(32,201,151,0.00) inset; }
  30%  { box-shadow: 0 0 0 6px rgba(32,201,151,0.35) inset; }
  100% { box-shadow: 0 0 0 0 rgba(32,201,151,0.00) inset; }
}
@keyframes pb {
  0%   { box-shadow: 0 0 0 0 rgba(255,107,107,0.00) inset; }
  30%  { box-shadow: 0 0 0 6px rgba(255,107,107,0.35) inset; }
  100% { box-shadow: 0 0 0 0 rgba(255,107,107,0.00) inset; }
}
`;

/* ======================= duplicate-event guard ======================= */
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

/* Helper to get an empty picker selection (same as page refresh) */
function initialSelected(): Record<IntervalCode, boolean> {
  return {
    m2:false, M2:false, m3:false, M3:false, P4:false, TT:false,
    P5:false, m6:false, M6:false, m7:false, M7:false, P8:false,
  };
}

export default function IntervalsSequentialPage() {
  const [playCount, setPlayCount] = useState(0);
  /* Picker starts EMPTY; user must choose & press Start */
  const [selected, setSelected] = useState<Record<IntervalCode, boolean>>(initialSelected);
  const [started, setStarted] = useState(false);

  /* session state */
  const [progress, setProgress] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [firstTry, setFirstTry] = useState(true);

  const [lowerMidi, setLowerMidi] = useState<number | null>(null);
  const [upperMidi, setUpperMidi] = useState<number | null>(null);
  const [intervalLabel, setIntervalLabel] = useState<string>("");
  const [step, setStep] = useState<1|2|3>(1);
  const awaitingNextRef = useRef(false);

  // --- Nudge Pack (Eyes) ---
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [toast, setToast] = useState(null as string | null);
  const [pulse, setPulse] = useState<null | "good" | "bad">(null);

  const PRAISE = [
    "Sharp eyes! 👀✨",
    "You nailed that leap 🎯",
    "Perfect distance!",
    "Bang on — that’s the one 🎶",
    "Nice catch! 🪝",
    "Solid interval spotting 💪",
  ];
  const ENCOURAGE = [
    "Close — try again 👀",
    "Almost — watch the gap 👀",
    "Not quite — check the distance…",
    "Missed the leap, next one’s yours 🚀",
    "You’ll spot it next time 👀",
    "Eyes up — keep going 💡",
  ];
  const [lastPhrase, setLastPhrase] = useState("");
  const isPraise = PRAISE.includes(lastPhrase);

  // mute toggle (persisted)
  const [muted, setMuted] = useState(false);
  useEffect(() => {
    try {
      const v = typeof window !== "undefined" ? localStorage.getItem("trainer-muted") : null;
      if (v != null) setMuted(v === "1");
    } catch (e) {}
  }, []);
  useEffect(() => {
    try { localStorage.setItem("trainer-muted", muted ? "1" : "0"); } catch (e) {}
  }, [muted]);

  // tiny SFX (pling/thud)
  const acRef = useRef<AudioContext | null>(null);
  function getAC() {
    if (!acRef.current) {
      // @ts-ignore
      const AC = window.AudioContext || (window as any).webkitAudioContext;
      acRef.current = new AC({ latencyHint: "interactive" });
    }
    return acRef.current!;
  }
  function playPling() {
    if (muted) return;
    const ac = getAC();
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = "sine"; o.frequency.value = 880;
    g.gain.setValueAtTime(0, ac.currentTime);
    g.gain.linearRampToValueAtTime(0.15, ac.currentTime + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + 0.2);
    o.connect(g).connect(ac.destination); o.start(); o.stop(ac.currentTime + 0.22);
  }
  function playThud() {
    if (muted) return;
    const ac = getAC();
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = "triangle"; o.frequency.value = 180;
    g.gain.setValueAtTime(0, ac.currentTime);
    g.gain.linearRampToValueAtTime(0.2, ac.currentTime + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + 0.18);
    o.connect(g).connect(ac.destination); o.start(); o.stop(ac.currentTime + 0.2);
  }

  // friendlier summary
  function summaryLine(total: number, got: number) {
    if (total === 0) return "";
    const missed = total - got;
    const pct = Math.round((got / total) * 100);
    if (got === total) return "Flawless sight — every interval spotted. 💎";
    if (pct >= 90)     return "Eyes on target — crisp interval reads. 👀";
    if (pct >= 75)     return "Strong interval spotting — keep it up!";
    if (pct >= 50)     return "You’re seeing the shapes — one more round!";
    return missed > 0 ? "Eyes warming up — run it again 👀" : "Run it again!";
  }

  const activeIntervals = useMemo(() => {
    const arr = INTERVALS.filter(i => selected[i.code]);
    return arr.length ? arr : [];
  }, [selected]);

  async function rollNew() {
  const pick = activeIntervals[Math.floor(Math.random() * activeIntervals.length)];
  const semis = pick.semitones;

  const clef: Clef = Math.random() < 0.5 ? "bass" : "treble";
  const MIN_BASS = 36; // C2
  const MAX_BASS = 60; // C4
  const MIN_TREB = 60; // C4
  const MAX_TREB = 84; // C6

  let baseMin: number, baseMax: number;
  if (clef === "bass") { baseMin = MIN_BASS; baseMax = MAX_BASS - semis; }
  else { baseMin = MIN_TREB; baseMax = MAX_TREB - semis; }

  if (baseMax < baseMin) { return rollNew(); }

  const base = baseMin + Math.floor(Math.random() * (baseMax - baseMin + 1));
  const lower = base;
  const upper = base + semis;

  setLowerMidi(lower);
  setUpperMidi(upper);
  setIntervalLabel(pick.label);
  setFirstTry(true);
  setStep(1);
  awaitingNextRef.current = false;

  // Auto-play both notes — sample-accurate with predecode
  try { getAC().resume(); } catch {}
  const ac = getAC();

  const lowerName = midiToNameSharp(lower);
  const upperName = midiToNameSharp(upper);

  // Pre-decode both buffers BEFORE scheduling (avoids Safari fetch/decode race)
  await Promise.all([
    fetchBuffer(lowerName),
    fetchBuffer(upperName),
  ]);

  const LEAD_IN = 0.25;  // more headroom than 0.12 for mobile/Safari
  const GAP     = 0.38;  // your chosen musical gap

  const t0 = ac.currentTime + LEAD_IN;
  scheduleNote(lowerName, t0);
  scheduleNote(upperName, t0 + GAP);
}

  // Start button handler
  const [hasStartedOnce, setHasStartedOnce] = useState(false);
  const handleStart = () => {
    if (!activeIntervals.length) return;

    setPlayCount(c => c + 1);   // rotate poster title
    setHasStartedOnce(true);
    // 🔊 warm up WebAudio immediately on user gesture (fixes Safari)
    try { getAC().resume(); } catch {}
    setStarted(true);
    setProgress(0);
    setCorrect(0);
    setFirstTry(true);
    setIntervalLabel("");
    setLowerMidi(null);
    setUpperMidi(null);
    setStep(1);
    awaitingNextRef.current = false;
    void rollNew();
  };

  // judge for keyboard (don't re-judge the first note during step 2)
  const judge = (noteName: string) => {
    if (!started || awaitingNextRef.current || lowerMidi == null || upperMidi == null) {
      return undefined;
    }
    const pressed = noteNameToMidi(noteName);
    if (pressed == null) return undefined;

    if (step === 1) {
      return pressed === lowerMidi ? "correct" : "wrong";
    }
    if (step === 2) {
      if (pressed === lowerMidi) return undefined;
      return pressed === upperMidi ? "correct" : "wrong";
    }
    return undefined;
  };

  const onKeyPressMidi = (midi: number) => {
    if (!started || awaitingNextRef.current || lowerMidi == null || upperMidi == null) return;

    const guardId = `press-${midi}`;
    if (!shouldAcceptOnce(guardId)) return;

    try { getAC().resume(); } catch {}
scheduleNote(midiToNameSharp(midi), getAC().currentTime + 0.02);

    const expected = step === 1 ? lowerMidi : upperMidi;
    if (midi === expected) {
      if (step === 1) {
        setStep(2);
      } else {
        setStep(3);
        awaitingNextRef.current = true;

        // success nudge (completed interval)
        setLastPhrase(PRAISE[Math.floor(Math.random() * PRAISE.length)]);
        setStreak(s => {
          const ns = s + 1;
          setBestStreak(b => Math.max(b, ns));
          if (ns === 3 || ns === 5 || ns === 10) {
            setToast(`Streak x${ns}! 🔥`);
            setTimeout(() => setToast(null), 1400);
          }
          return ns;
        });
        setPulse("good"); playPling();
        setTimeout(() => setPulse(null), 240);

        if (firstTry) setCorrect(c => Math.min(25, c + 1));

        setTimeout(() => {
          setProgress(p => {
            const next = Math.min(25, p + 1);
            if (next < 25) {
              void rollNew();
            } else {
              // ==== SESSION COMPLETE → return to picker but KEEP selections & STATS ====
              setStarted(false);
              // DO NOT reset progress/correct here; keep 25/25 visible until next Start
              setFirstTry(true);
              setIntervalLabel("");
              setLowerMidi(null);
              setUpperMidi(null);
              setStep(1);
              awaitingNextRef.current = false;
            }
            return next;
          });
        }, 1000);
      }
    } else {
      // wrong nudge
      setFirstTry(false);
      setLastPhrase(ENCOURAGE[Math.floor(Math.random() * ENCOURAGE.length)]);
      setStreak(0);
      setPulse("bad"); playThud();
      setTimeout(() => setPulse(null), 240);
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
    if (activeIntervals.length) void rollNew();
  };

  // display names (ascending → prefer sharps)
  const lowerNameDisplay = lowerMidi != null ? midiToNameFlatIfDescending(lowerMidi, false) : "C4";
  const upperNameDisplay = upperMidi != null ? midiToNameFlatIfDescending(upperMidi, false) : "E4";

  // picker helpers
  const toggleAll = (v: boolean) => {
    const next: Record<IntervalCode, boolean> = {} as any;
    INTERVALS.forEach(i => { next[i.code] = v; });
    setSelected(next);
  };
  const ensureAtLeastOne = (code: IntervalCode, v: boolean) => {
    const next = { ...selected, [code]: v };
    if (!Object.values(next).some(Boolean)) {
      next[code] = true;
    }
    setSelected(next);
  };
  // --- horizontal spacing for the second note (tighter for seconds) ---
  const currentSemitones =
    lowerMidi != null && upperMidi != null ? (upperMidi - lowerMidi) : null;

  const secondXShift =
    started && currentSemitones != null
      ? (currentSemitones <= 2 ? 50 : 30)
      : 30;

  return (
    <>
      <style>{styles}</style>

      <div className="page">
        <div className={`root ${pulse === "good" ? "pulse-good" : pulse === "bad" ? "pulse-bad" : ""}`}>
          <div className="blocker">
            <p><strong>Please rotate your device to landscape</strong><br/>(or use a device with a larger screen)</p>
          </div>

          <PosterHeader
  options={[
    {
      title: "Intervals on the Stave",
      subtitle:
        "See two notes at a time—seconds to octaves, ascending and descending—right on the grand stave.",
    },
    {
      title: "Mind the Space & Line",
      subtitle:
        "Learn interval spacing at a glance: steps, skips, perfects and octaves in treble and bass.",
    },
    {
      title: "See the Distance, Hear the Shape",
      subtitle:
        "Two-note patterns that train your eyes to recognize intervals instantly.",
    },
  ]}
  rotateSignal={playCount}
/>

<div className="child">
  <div className="stats-bar">
    {/* LEFT: Progress / Correct / Streak + Best + Controls + Nudges + Mute */}
    <div className="stats-left">
      <div className="stats-box">
        <div>Progress</div>
        <div className="stats-value">{progress}/25</div>
      </div>

      <div className="stats-box">
        <div>Correct</div>
        <div className="stats-value">{correct}/25</div>
      </div>

      

      {/* Start / Restart */}
      {!started && (
        <button
          className="start-btn"
          onClick={handleStart}
          disabled={!activeIntervals.length}
          title={
            activeIntervals.length
              ? "Start session"
              : "Select at least one interval"
          }
        >
          Start
        </button>
      )}

      {sessionDone && started && (
        <button className="restart-btn" onClick={handleRestart}>
          Restart Session
        </button>
      )}

      {/* Nudge status line */}
      <div className="interval-label" style={{ marginTop: 6 }}>
        {lastPhrase && (
          <span
            style={{
              color: isPraise ? "#20C997" : "#8B94A7",
              fontWeight: 700,
            }}
          >
            {lastPhrase}
          </span>
        )}
        {toast && (
          <span
            style={{ marginLeft: 8, color: "#FFD166", fontWeight: 800 }}
          >
            {toast}
          </span>
        )}
      </div>
{/* Best streak */}
  <div style={{ fontSize: 12, color: "#666", textAlign: "center", marginTop: 6 }}>
    Best Streak: <strong>{bestStreak}</strong>
  </div>

  
      {/* End-of-session summary (only after the user has started at least once) */}
      {!started && hasStartedOnce && (
        <div className="interval-label" style={{ marginTop: 6 }}>
          {summaryLine(25, correct)}&nbsp;•&nbsp;Best streak:{" "}
          <strong>{bestStreak}</strong>
        </div>
      )}
    </div>

    {/* CENTER: Grand staff (two notes; upper shifted for seconds) */}
    <div className="stave-center">
      <div className="stave-narrow">
        <GrandStaveVF
          noteName={started ? lowerNameDisplay : null}
          secondaryNoteName={started ? upperNameDisplay : null}
          secondaryXShift={secondXShift}
        />
        <div className="interval-label">
          {started && step === 3 ? intervalLabel : "\u00A0"}
        </div>
      </div>
    </div>

    {/* RIGHT: Interval picker — collapses after Start */}
    {!started && (
      <div className="picker-box">
        <div className="picker-title">Choose Intervals</div>
        <div className="picker-actions">
          <button onClick={() => toggleAll(true)}>Select all</button>
          <button onClick={() => toggleAll(false)}>Clear all</button>
        </div>
        <div className="picker-list">
          {INTERVALS.map((i) => (
            <label
              key={i.code}
              style={{ display: "flex", gap: 6, alignItems: "center" }}
            >
              <input
                type="checkbox"
                checked={!!selected[i.code]}
                onChange={(e) => ensureAtLeastOne(i.code, e.target.checked)}
              />
              <span>
                {i.code} — {i.label}
              </span>
            </label>
          ))}
        </div>
      </div>
    )}
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
</div> {/* .root */}
</div> {/* .page */}
</>
  );
}