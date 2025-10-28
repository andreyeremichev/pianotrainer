"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
// ⬇️ dynamic client-only import fixes missing stave in production
import dynamic from "next/dynamic";
const GrandStaveVF = dynamic(() => import("../../../components/GrandStaveVF"), { ssr: false });

import ResponsiveKeyboardC2toC6 from "../../../components/ResponsiveKeyboardC2toC6";
import PosterHeader from "@/components/PosterHeader";

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

/* ========= training pools (with sharps + flats) ========= */
type Mode = "guide" | "treble" | "bass" | "full";

/** Build chromatic names with sharp spelling + add flat enharmonic where applicable. */
function buildPool(minMidi: number, maxMidi: number): string[] {
  const pool: string[] = [];
  const sharpToFlat: Record<string,string> = { "C#":"Db","D#":"Eb","F#":"Gb","G#":"Ab","A#":"Bb" };
  for (let m = minMidi; m <= maxMidi; m++) {
    const sharp = midiToNameSharp(m);   // e.g. "C#4" or "E4"
    pool.push(sharp);
    const base = sharp.slice(0, -1);    // "C#" or "E"
    const oct  = sharp.slice(-1);       // "4"
    if (sharpToFlat[base]) pool.push(`${sharpToFlat[base]}${oct}`); // add flat twin
  }
  return pool;
}

const POOL_TREBLE = buildPool(noteNameToMidi("C4")!, noteNameToMidi("C6")!);
const POOL_BASS   = buildPool(noteNameToMidi("C2")!, noteNameToMidi("C4")!);
/* Guide: includes C4 twice (once per clef) */
const POOL_GUIDE  = ["C2","G2","C3","F3","C4@bass","C4@treble","G4","C5","F5","C6"];
/** FULL: C2..C6 with sharps+flats + explicit C4 on both clefs via tags */
const POOL_FULL   = [
  ...buildPool(noteNameToMidi("C2")!, noteNameToMidi("C6")!),
  "C4@treble",
  "C4@bass",
];

function getPool(mode: Mode): string[] {
  switch (mode) {
    case "guide":  return POOL_GUIDE;
    case "treble": return POOL_TREBLE;
    case "bass":   return POOL_BASS;
    default:       return POOL_FULL;
  }
}

/** Avoid immediate repeats (enharmonic-aware, but *ignore* @clef tag for equality). */
function pickRandom(exclude: string | null, pool: string[]): string {
  if (!pool.length) return "C4";
  const stripTag = (s: string) => s.replace(/@(?:treble|bass)$/,'');
  let n = pool[Math.floor(Math.random() * pool.length)];
  if (exclude && eqNote(stripTag(n), stripTag(exclude))) {
    for (let i = 0; i < 6; i++) {
      const t = pool[Math.floor(Math.random() * pool.length)];
      if (!eqNote(stripTag(t), stripTag(exclude))) { n = t; break; }
    }
  }
  return n;
}

/* ========= Audio helpers ========= */
const audioCache = new Map<string, HTMLAudioElement>();

function normalizeToSharp(name: string): string {
  const m = name.match(/^([A-G])([#b]?)(\d)$/i);
  if (!m) return name;
  const letter = m[1].toUpperCase();
  const acc = m[2] as "" | "#" | "b";
  const oct = m[3];
  if (acc === "b") {
    const map: Record<string,string> = { "D":"C#", "E":"D#", "G":"F#", "A":"G#", "B":"A#" };
    const twin = map[letter];
    if (twin) return `${twin}${oct}`;
  }
  return `${letter}${acc}${oct}`;
}
function urlForNote(name: string): string {
  const sharp = normalizeToSharp(name);
  const safe = sharp.replace("#", "%23");
  return `/audio/notes/${safe}.wav`;
}
function getAudio(name: string): HTMLAudioElement {
  const key = normalizeToSharp(name);
  let a = audioCache.get(key);
  if (!a) {
    a = new Audio(urlForNote(key));
    a.preload = "auto";
    audioCache.set(key, a);
  }
  return a;
}
function playOnce(name: string) {
  const a = getAudio(name);
  try { a.currentTime = 0; } catch {}
  a.play().catch(() => { /* autoplay will unlock on first user gesture */ });
}

/* ========= Styles ========= */
const styles = `
:root {
  --page-max-width: 1200px;
  --radius: 8px;

  --stats-w: 120px;
  --mode-w:  220px;

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
.header p { margin: 0; color: var(--site-muted); }
.title-line { display: inline-flex; gap: 10px; align-items: baseline; }
.title-home { font-size: 12px; text-decoration: underline; }

.grid { display: grid; grid-template-columns: 1fr; grid-template-rows: auto auto; gap: 10px; }

.child { border: 1px solid #ccc; border-radius: var(--radius); background: #fff; padding: 8px; }
.child--stave {}
.child--keys  {}

.stats-bar {
  display: grid; grid-template-columns: auto 1fr auto; align-items: center; column-gap: 10px;
}

.stats-left { display: flex; flex-direction: column; gap: 8px; width: var(--stats-w); }
.stats-box { border: 1px solid #000; border-radius: 6px; padding: 8px 10px; display: grid; place-items: center; }
.stats-value { font-weight: 700; }
.restart-btn { margin-top: 6px; padding: 6px 10px; font-size: 12px; border: 1px solid #444; background: #eee; cursor: pointer; }

.stave-center { min-width: 0; display: flex; justify-content: center; align-items: center; }
.stave-narrow { width: 260px; }

.mode-box {
  width: var(--mode-w);
  border: 1px solid #000; border-radius: 6px; padding: 8px 10px;
  display: flex; flex-direction: column; gap: 6px; align-items: stretch; background: #f3f3f3;
}
.mode-box .mode-title { text-align: center; font-weight: 600; }
.mode-hint { font-size: 12px; color: var(--site-muted); text-align: center; min-height: 1.2em; }

.media { display: flex; align-items: center; justify-content: center; min-height: var(--keyboard-min-h); }
.media > svg { width: 100%; height: 100%; display: block; }

.blocker { position: absolute; inset: 0; display: none; align-items: center; justify-content: center;
  background: rgba(255,255,255,0.95); z-index: 5; text-align: center; padding: 24px; border-radius: var(--radius); }
.blocker p { margin: 0; font-size: 16px; line-height: 1.4; }
@media (max-width: 450px) and (orientation: portrait) { .blocker { display: flex; } }

/* === Nudge pulse (no layout impact) === */
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
/* === Session wrap-up (mode + score) === */
function wrapUpMessage(mode: Mode, correct: number, bestStreak: number): string {
  // tiers
  const isPerfect = correct === 25;
  const isStrong  = correct >= 20 && correct <= 24;
  const isLow     = correct < 20;

  switch (mode) {
    case "guide": {
      if (isPerfect) return "You nailed every guide! Time to practice Treble, Bass, or Full mode.";
      if (isStrong)  return "Very steady reading. Push for 25/25 to master your anchors before moving on.";
      // low tier → include streak
      return `Almost there! Guide notes are your anchors — run again and hit 25/25. ${
        bestStreak > 1 ? `Your best streak was ${bestStreak}, aim to extend it next time.` : ""
      }`.trim();
    }

    case "treble":
    case "bass": {
      if (isPerfect) return "Flawless clef work! Your eye is perfectly trained for this stave.";
      if (isStrong)  return "Solid reading in this clef. Replay and aim for 25/25 — you’re very close.";
      return `Keep training this clef. Focus your eyes and repeat until you hit a perfect run. ${
        bestStreak > 1 ? `Your best streak was ${bestStreak}, now try to push it higher.` : ""
      }`.trim();
    }

    case "full":
    default: {
      if (isPerfect) return "Epic! You conquered the full grand staff — you’re sight-reading like a pro.";
      if (isStrong)  return "Strong session in Full mode. One more push to go flawless!";
      return `This is the toughest mode — don’t stop! Each run sharpens your eyes. Keep at it. ${
        bestStreak > 1 ? `Your longest streak was ${bestStreak}. Build on it next round.` : ""
      }`.trim();
    }
  }
}

export default function NotationRandomStable() {
  /* session state */
  const [mode, setMode] = useState<Mode>("full");
  const pool = useMemo(() => getPool(mode), [mode]);
  const [target, setTarget] = useState(() => pickRandom(null, getPool("full")));
  const [progress, setProgress] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [firstTry, setFirstTry] = useState(true);
  const [hint, setHint] = useState<string>("Tap a key to begin");

  const echoRef = useRef<{ id: string; t: number } | null>(null);
  const awaitingNextRef = useRef(false);

  function shouldAcceptOnce(id: string, windowMsDesktop = 220, windowMsTouch = 520): boolean {
    const now = performance.now();
    const last = echoRef.current;
    const isCoarse = typeof window !== "undefined" && matchMedia?.("(pointer: coarse)")?.matches;
    const win = isCoarse ? windowMsTouch : windowMsDesktop;
    if (last && last.id === id && (now - last.t) < win) return false;
    echoRef.current = { id, t: now };
    return true;
  }

  // --- Nudge Pack (Eyes): state & phrases ---
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [toast, setToast] = useState(null as string | null);
  const [pulse, setPulse] = useState<null | "good" | "bad">(null);

  const PRAISE = [
    "Sharp eyes! 👀✨",
    "You nailed that note 🎯",
    "Perfect spot!",
    "Bang on — that’s the one 🎶",
    "Nice catch! 🪝",
    "Solid reading 💪",
  ];
  const ENCOURAGE = [
    "Close — try again 👀",
    "Almost — watch the space 👀",
    "Not quite — check the line…",
    "Missed it, next one’s yours 🚀",
    "You’ll spot it next time 👀",
    "Eyes up — keep going 💡",
  ];
  const [lastPhrase, setLastPhrase] = useState("");
  const isPraise = PRAISE.includes(lastPhrase);

  useEffect(() => {
    setTarget(pickRandom(null, pool));
    setProgress(0);
    setCorrect(0);
    setFirstTry(true);
    awaitingNextRef.current = false;
    setHint(
      mode === "guide"
        ? "Guide Notes: landmarks across both clefs"
        : mode === "treble"
        ? "Treble: C4–C6, with sharps & flats"
        : mode === "bass"
        ? "Bass: C2–C4, with sharps & flats"
        : "All notes C2–C6"
    );
  }, [pool, mode]);

  const tagMatch = target.match(/^([A-G][#b]?\d)(?:@(treble|bass))?$/i);
  const targetNameNoTag = (tagMatch ? tagMatch[1] : target) as string;
  const clefTag = (tagMatch && tagMatch[2]) ? (tagMatch[2] as "treble" | "bass") : null;

  const forceClef: "treble" | "bass" | null =
    mode === "treble" ? "treble" :
    mode === "bass"   ? "bass"   :
    clefTag;

  useEffect(() => {
    playOnce(targetNameNoTag);
  }, [targetNameNoTag]);

  const judge = (pressedName: string) =>
    (eqNote(pressedName, targetNameNoTag) ? "correct" : "wrong") as "correct" | "wrong";

  const onKeyPressMidi = (m: number) => {
    const targetMidi = noteNameToMidi(targetNameNoTag);
    if (targetMidi == null) return;
    if (awaitingNextRef.current) return;

    const guardId = `press-${m}`;
    if (!shouldAcceptOnce(guardId)) return;

    const pressedName = midiToNameSharp(m);
    playOnce(pressedName);

    if (m === targetMidi) {
      if (firstTry) setCorrect(c => Math.min(25, c + 1));

      // success nudge
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
      setPulse("good"); setTimeout(() => setPulse(null), 240);

      setHint("✅ Correct! Next note coming…");
      awaitingNextRef.current = true;

      window.setTimeout(() => {
        setProgress(p => {
          const next = Math.min(25, p + 1);
          if (next < 25) {
            setTarget(prev => pickRandom(prev, pool));
            setFirstTry(true);
            setHint("");
            awaitingNextRef.current = false;
          } else {
            setHint("Session complete — tap Restart to try again");
          }
          return next;
        });
      }, 1000);
    } else {
      // wrong nudge
      setFirstTry(false);
      setLastPhrase(ENCOURAGE[Math.floor(Math.random() * ENCOURAGE.length)]);
      setStreak(0);
      setPulse("bad"); setTimeout(() => setPulse(null), 240);
      setHint("❌ Try again");
    }
  };

  const onKeyDownName = (_name: string) => {};

  const targetMidi = noteNameToMidi(targetNameNoTag) ?? 60;

  const sessionDone = progress >= 25;
  const handleRestart = () => {
    setTarget(pickRandom(null, pool));
    setProgress(0);
    setCorrect(0);
    setFirstTry(true);
    awaitingNextRef.current = false;
    setHint("Tap a key to begin");
    setLastPhrase("");
    setStreak(0);
    // bestStreak is preserved across sessions
  };

  return (
    <>
      <style>{styles}</style>

      <div className="page">
        <div className={`root ${pulse === "good" ? "pulse-good" : pulse === "bad" ? "pulse-bad" : ""}`} style={{ position: "relative" }}>
          <div className="blocker">
            <p>
              <strong>Please rotate your device to landscape</strong>
              <br />
              (or use a device with a larger screen)
            </p>
          </div>

          <PosterHeader
            options={[
              {
                title: "Read & Play Random Notes",
                subtitle: "Guide notes, sharps, flats, bass and treble — each session trains your ear and eyes together, one note at a time.",
              },
              {
                title: "One Note at a Time",
                subtitle: "Random notes across the grand stave. Quick drills that build instant recognition.",
              },
              {
                title: "Daily Reading Workout",
                subtitle: "Treble and bass clefs together. Short reps keep your sight-reading sharp.",
              },
            ]}
          />

          <div className="grid">
            <div className="child child--stave">
              <div className="stats-bar">
                {/* LEFT: Progress / Correct + Nudges + Best + Restart */}
                <div className="stats-left">
                  <div className="stats-box">
                    <div>Progress</div>
                    <div className="stats-value">{progress}/25</div>
                  </div>
                  <div className="stats-box">
                    <div>Correct</div>
                    <div className="stats-value">{correct}/25</div>
                  </div>

                  {/* Motivational phrase (Eyes) */}
                  <div className="interval-label" style={{ marginTop: 6, textAlign: "center" }}>
                    {lastPhrase && (
                      <span
                        style={{
                          color: isPraise ? "#20C997" : "#8B94A7",
                          fontWeight: 700,
                          display: "inline-block",
                          lineHeight: 1.25,
                        }}
                      >
                        {lastPhrase}
                      </span>
                    )}
                    {toast && (
                      <span style={{ marginLeft: 8, color: "#FFD166", fontWeight: 800 }}>
                        {toast}
                      </span>
                    )}
                  </div>

                  {/* Best streak */}
                  <div style={{ fontSize: 12, color: "#666", textAlign: "center", marginTop: 6 }}>
                    Best Streak: <strong>{bestStreak}</strong>
                  </div>
                  {/* End-of-session wrap-up (mode-aware) */}
{sessionDone && (
  <div className="interval-label" style={{ marginTop: 6, textAlign: "center" }}>
    {wrapUpMessage(mode, correct, bestStreak)}
  </div>
)}

                  {/* Restart (only when done) */}
                  {sessionDone && (
                   <button
    onClick={handleRestart}
    style={{
      marginTop: 6,
      padding: "6px 10px",
      fontSize: 13,
      fontWeight: 700,
      borderRadius: 6,
      border: "none",
      cursor: "pointer",
      background: "#20C997", // same bright green
      color: "#081019",
    }}
  >
    ↻ Restart
  </button>
)}
                </div>

                <div className="stave-center">
                  <div className="stave-narrow">
                    <GrandStaveVF
                      key={targetNameNoTag + (forceClef ?? "")}
                      noteName={targetNameNoTag}
                      forceClef={forceClef}
                      noteMidi={targetMidi}
                    />
                  </div>
                </div>

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
                  <div className="mode-hint">{hint}</div>
                </div>
              </div>
            </div>

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