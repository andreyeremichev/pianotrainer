"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";

const GrandStaveVF = dynamic(() => import("../../../components/GrandStaveVF"), { ssr: false });
import ResponsiveKeyboardC2toC6, { type KeyboardRef } from "../../../components/ResponsiveKeyboardC2toC6";

import {
  type MajorKey,
  type RomanDegree,
  type Inversion,
  type BuiltChord,
  rollRandomFromSelections,
  audioUrlFromDisplay,
} from "../../../../utils/chords";
import PosterHeader from "@/components/PosterHeader";

/* ======================= styles ======================= */
const styles = `
:root {
  --page-max-width: 1200px;
  --radius: 8px;
  --stats-w: 120px;
  --side-w:  260px;   /* right column width (picker / MCQ) */
  --keyboard-min-h: 120px;
}

.page { box-sizing: border-box; max-width: var(--page-max-width); margin: 0 auto; padding: 8px; }
.root {
  box-sizing: border-box; border: 1px solid #ccc; border-radius: var(--radius); background: #fff;
  display: flex; flex-direction: column; padding: 12px; min-height: 100%; position: relative;
}

.header { text-align: center; margin-bottom: 8px; }
.header h1 { margin: 0 0 4px 0; }
.header p { margin: 0; color: var(--site-muted); }
.title-line { display: inline-flex; gap: 10px; align-items: baseline; }
.title-home { font-size: 12px; text-decoration: underline; }

/* Row 1: grid with left stats, center stave, right side (picker/MCQ) */
.child { border: 1px solid #ccc; border-radius: var(--radius); background: #fff; padding: 8px; }
.stats-bar {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: start;
  column-gap: 10px;
}

/* Left (stats) */
.stats-left { display: flex; flex-direction: column; gap: 8px; width: var(--stats-w); }
.stats-box { border: 1px solid #000; border-radius: 6px; padding: 8px 10px; display: grid; place-items: center; }
.stats-value { font-weight: 700; }
.start-btn { margin-top: 6px; padding: 6px 10px; font-size: 12px; border: 1px solid #444; background: #dff; cursor: pointer; }
.restart-btn { margin-top: 6px; padding: 6px 10px; font-size: 12px; border: 1px solid #444; background: #eee; cursor: pointer; }

/* Center (stave) */
.stave-center { min-width: 0; display: flex; justify-content: center; align-items: flex-start; }
.stave-narrow { width: 380px; } /* 🔒 FROZEN size */
.explain { text-align:center; font-size: 13px; margin-top: 6px; min-height: 1.2em; }

/* Right (picker before start; MCQ after start) */
.side-box {
  width: var(--side-w);
  border: 1px solid #000; border-radius: 6px; padding: 8px 10px;
  display: flex; flex-direction: column; gap: 8px; align-items: stretch; background: #f3f3f3;
}
.side-title { text-align: center; font-weight: 600; }

.picker-section { display: grid; gap: 8px; }
.picker-list { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 10px; font-size: 13px; }
.picker-actions { display: flex; gap: 6px; justify-content: center; }
.picker-actions button { font-size: 12px; padding: 4px 8px; }

/* MCQ buttons */
.mcq { display: grid; gap: 8px; }
.mcq button {
  font-size: 14px; padding: 8px 10px; border-radius: 6px; border: 1px solid #ccc; background: #fff; cursor: pointer;
}
.mcq button:hover { background: #fafafa; }
.mcq button[disabled] { opacity: 0.6; cursor: default; }

/* Row 2: keyboard full-width */
.media {
  display: flex;
  align-items: center;
  justify-content: center;
  /* bump min-height so keys aren’t clipped */
  min-height: 160px;   /* was var(--keyboard-min-h) or ~120px */
}

.media > svg {
  width: 100%;
  height: auto;        /* auto keeps proportions */
  display: block;
}

/* Portrait blocker */
.blocker { position: absolute; inset: 0; display: none; align-items: center; justify-content: center;
  background: rgba(255,255,255,0.95); z-index: 5; text-align: center; padding: 24px; border-radius: var(--radius); }
.blocker p { margin: 0; font-size: 16px; line-height: 1.4; }
@media (max-width: 450px) and (orientation: portrait) { .blocker { display: flex; } }

/* --- iOS Safari: prevent 1px clipping of keyboard SVG in landscape --- */
@supports (-webkit-touch-callout: none) {
  .child--keys .media {
    padding-bottom: 8px;     /* give the SVG a little breathing room */
    overflow: visible;       /* don't clip the last pixel row */
  }
  .child--keys .media > svg,
  .child--keys .media svg {
    height: calc(100% - 2px); /* counter rounding at high DPR */
  }
}

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
/* How long to show the chord before rolling the next one (ms) */
const NEXT_DELAY_MS = 3500; // tweak 2000–3000 as you like

/* ======================= Audio helpers (reveal on correct) ======================= */
function playBlock(urls: string[]) {
  urls.forEach(u => {
    const a = new Audio(u);
    a.play().catch(() => {});
  });
}
function playArpeggio(urls: string[], gapMs = 140) {
  urls.forEach((u, i) => {
    setTimeout(() => {
      const a = new Audio(u);
      a.play().catch(() => {});
    }, i * gapMs);
  });
}

/* ======================= Wrap-up copy (randomized pool) ======================= */
function wrapUpChordSession(correct: number, bestStreak: number, setup: {
  keysCount: number;
  inversionsActive: boolean;
  mode: "block" | "arp";
}) {
  const isPerfect = correct === 25;
  const isStrong  = correct >= 20 && correct <= 24;
  const isLow     = correct < 20;

  // pools
  const PERFECT = [
    "Flawless — you owned every chord! 👑",
    "Perfect stack spotting — next stop: more keys, more colors.",
    "25 out of 25 — harmony mastery unlocked! 🎶✨",
    "Spotless session! Try tougher pools to stretch yourself.",
    "Champion’s run — you didn’t miss a beat. 🔥",
  ];
  const STRONG = [
    "Solid harmony reading — just shy of perfect.",
    "Great session — one more push for a 25/25 streak.",
    "Close to flawless — refine those last details.",
    "Very steady! One more round to lock it in.",
    "Strong recognition — aim for the clean sweep next.",
  ];
  const LOW_GENERAL = [
    "Harmony’s heavy lifting — every attempt builds strength. 💪",
    "Tough pool, but progress is progress — don’t stop here.",
    "Keep stacking — it’s clicking chord by chord.",
    "Even pros drill harmony daily — you’re in good company. 🎹",
    "Today’s slips are tomorrow’s fluency. Keep at it!",
  ];

  // small flavor add-ons (optional, used only for low tier)
  const FLAVORS: string[] = [];
  if (setup.inversionsActive) FLAVORS.push("Inversions tricky? Focus on the bass clue.");
  if (setup.keysCount > 3)    FLAVORS.push("Cross-key shifts add challenge — keep going.");
  if (setup.mode === "arp")   FLAVORS.push("Arpeggio disguises the stack — visualize the whole shape.");

  function pick<T>(arr: T[]) { return arr[Math.floor(Math.random() * arr.length)]; }

  if (isPerfect) return pick(PERFECT);
  if (isStrong)  return pick(STRONG);

  // low tier → generic line + (optional) streak + one flavor
  const parts = [pick(LOW_GENERAL)];
  if (bestStreak > 1) parts.push(`Best streak: ${bestStreak}.`);
  if (FLAVORS.length) parts.push(pick(FLAVORS));
  return parts.join(" ");
}

/* ======================= Page ======================= */
const ALL_KEYS: MajorKey[] = ["C","G","D","A","E","B","F#","C#","F","Bb","Eb","Ab","Db","Gb","Cb"];
const ALL_DEGREES: RomanDegree[] = ["I","ii","iii","IV","V","vi","vii°"];
const ALL_INVERSIONS: Inversion[] = ["root","1st","2nd"];
type PlayMode = "block" | "arp";

export default function ChordsRecognitionPage() {
  /* Picker state (defaults) */
  const [selectedKeys, setSelectedKeys] = useState<MajorKey[]>(["C","G","F"]);
  const [selectedDegrees, setSelectedDegrees] = useState<RomanDegree[]>(["I","IV","V"]);
  const [selectedInversions, setSelectedInversions] = useState<Inversion[]>(["root","1st","2nd"]);
  const [playMode, setPlayMode] = useState<PlayMode>("block");
  const canStart = selectedKeys.length && selectedDegrees.length && selectedInversions.length;

  /* Session state */
  const [started, setStarted] = useState(false);
  const [progress, setProgress] = useState(0); // 0..25
  const [correct, setCorrect] = useState(0);
  const [explain, setExplain] = useState("");
  const [currentChord, setCurrentChord] = useState<BuiltChord | null>(null);
  const [options, setOptions] = useState<string[]>([]);
  const [firstTry, setFirstTry] = useState(true);
  const awaitingNextRef = useRef(false);

  const kbRef = useRef<KeyboardRef>(null);
  const holdTimerRef = useRef<number | null>(null);

  /* --- Nudges: streaks, phrases, toasts, pulse --- */
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [lastPhrase, setLastPhrase] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const [pulse, setPulse] = useState<null | "good" | "bad">(null);

  // General correct/incorrect pools
  const PRAISE_GENERAL = [
    "Sharp eyes for harmony! 👀🎶",
    "Bang on — clean chord ID 🎯",
    "Solid chord reading 💪",
    "Stack spotted — root, third, fifth!",
    "Flawless recognition!",
  ];
  const ENCOURAGE_GENERAL = [
    "Close — check chord quality (maj/min/°)",
    "Almost — root vs. third slipped",
    "Not quite — spacing mismatch",
    "Re-think the chord label",
    "Try again — the shape is off",
  ];
  // Optional correct flavor pools (shown only when relevant)
  const PRAISE_INV = ["Inversion nailed! 🔁", "Bass clue read perfectly"];
  const PRAISE_KEYS = ["Multi-key harmony? No problem.", "Key shifts handled like a pro 🔑"];
  const PRAISE_ARP  = ["Arpeggio shape visualized 🎵", "Broken chord, solid answer"];
  const PRAISE_BLOCK= ["Chord cluster recognized instantly", "Block stack clear as day"];

  useEffect(() => {
    setStarted(false);
    setProgress(0);
    setCorrect(0);
    setExplain("");
    setFirstTry(true);
    awaitingNextRef.current = false;
    setCurrentChord(null);
    setOptions([]);
    setLastPhrase("");
    setStreak(0);
  }, [selectedKeys, selectedDegrees, selectedInversions, playMode]);

  /* Build 2 distractors from current settings (same key/inversion, wrong degree) */
  const buildOptions = (answer: BuiltChord): string[] => {
    const pool: string[] = [answer.label];
    const candidates = ALL_DEGREES.filter(d => d !== answer.degree && selectedDegrees.includes(d));
    while (pool.length < 3 && candidates.length) {
      const d = candidates.splice(Math.floor(Math.random()*candidates.length), 1)[0];
      pool.push(`${d} in ${answer.key} major (${answer.inversion === "root" ? "root" : answer.inversion === "1st" ? "1st inv" : "2nd inv"})`);
    }
    const fallback = ALL_DEGREES.filter(d => d !== answer.degree);
    while (pool.length < 3 && fallback.length) {
      const d = fallback.splice(Math.floor(Math.random()*fallback.length), 1)[0];
      pool.push(`${d} in ${answer.key} major (${answer.inversion === "root" ? "root" : answer.inversion === "1st" ? "1st inv" : "2nd inv"})`);
    }
    // shuffle
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random()* (i+1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    return pool.slice(0,3);
  };

  function rollNext() {
  // stop the re-highlight timer (if running) and clear keyboard highlights
  if (holdTimerRef.current) {
    window.clearInterval(holdTimerRef.current);
    holdTimerRef.current = null;
  }
  kbRef.current?.clear();

  const next = rollRandomFromSelections(selectedKeys, selectedDegrees, selectedInversions, false);
  if (!next) return;
  setCurrentChord(next);
  setOptions(buildOptions(next));
  setExplain("");
  setFirstTry(true);
  awaitingNextRef.current = false;
}

  const handleStart = () => {
    if (holdTimerRef.current) { window.clearInterval(holdTimerRef.current); holdTimerRef.current = null; }
kbRef.current?.clear();
    kbRef.current?.clear();
    if (!canStart) return;
    setStarted(true);
    setProgress(0);
    setCorrect(0);
    setExplain("");
    setFirstTry(true);
    awaitingNextRef.current = false;
    setLastPhrase("");
    setStreak(0);
    rollNext();
  };

  function holdKeyboard(displayNames: string[]) {
  // highlight now
  displayNames.forEach((n) => kbRef.current?.highlight(n as any, "correct"));

  // re-highlight every 500ms while we're waiting for the next chord
  if (holdTimerRef.current) window.clearInterval(holdTimerRef.current);
  holdTimerRef.current = window.setInterval(() => {
    if (!awaitingNextRef.current) return; // only hold during the waiting window
    displayNames.forEach((n) => kbRef.current?.highlight(n as any, "correct"));
  }, 500);
}

  const handleMCQ = (choice: string) => {
  // ❌ ignore if already finished (prevents streak bumps after 25/25)
  if (progress >= 25) return;
    if (!currentChord || awaitingNextRef.current) return;
    kbRef.current?.clear();
    const isCorrect = choice === currentChord.label;

    if (!isCorrect) {
      // wrong nudge (no advance)
      setFirstTry(false);
      setStreak(0);
      setPulse("bad"); setTimeout(() => setPulse(null), 240);

      // context-aware encouragement
      const encourages = [...ENCOURAGE_GENERAL];
      // add context flavor only when relevant
      if (selectedInversions.length > 1 && currentChord.inversion !== "root") {
        encourages.push("Inversion tricky? Check bass clue again");
      }
      if (selectedKeys.length > 3) encourages.push("Key change might have caught you");
      if (playMode === "arp") encourages.push("Broken chord, same stack — re-evaluate the label");
      setLastPhrase(encourages[Math.floor(Math.random() * encourages.length)]);
      setExplain("Try again…");
      return;
    }

    // Correct
    setExplain(() => {
      const [a,b,c] = currentChord.display;
      const inv = currentChord.inversion === "root" ? "root" : currentChord.inversion === "1st" ? "1st inversion" : "2nd inversion";
      return `${currentChord.label}: ${a}–${b}–${c}; ${inv}`;
    });

    // counters
    setProgress(p => Math.min(25, p + 1));
    if (firstTry) setCorrect(c => Math.min(25, c + 1));

    // success nudge with flavors
    setStreak(s => {
      const ns = s + 1;
      setBestStreak(b => Math.max(b, ns));
      if (ns === 3 || ns === 5 || ns === 10) {
        setToast(`Streak x${ns}! 🔥`); setTimeout(() => setToast(null), 1400);
      }
      return ns;
    });
    setPulse("good"); setTimeout(() => setPulse(null), 240);

    const praises = [...PRAISE_GENERAL];
    if (selectedInversions.length > 1 && currentChord.inversion !== "root") praises.push(...PRAISE_INV);
    if (selectedKeys.length > 3) praises.push(...PRAISE_KEYS);
    if (playMode === "arp") praises.push(...PRAISE_ARP); else praises.push(...PRAISE_BLOCK);
    setLastPhrase(praises[Math.floor(Math.random() * praises.length)]);

    // Play & highlight
    const urls = currentChord.display.map(audioUrlFromDisplay);
    if (playMode === "block") playBlock(urls);
    else playArpeggio(urls, 140);
    holdKeyboard(currentChord.display);

  // Next
awaitingNextRef.current = true;
window.setTimeout(() => {
  setProgress((p) => {
    if (p >= 25) {
      // ✅ lock the session: no new MCQ, no phantom increments
      awaitingNextRef.current = false;

      // clear highlights at end of session
      kbRef.current?.clear();

      setStarted(false);          // return to picker / locked state
      setCurrentChord(null);      // hide last chord label choice
      setOptions([]);             // disable MCQ visually
      return p;                   // keep 25/25 on screen
    }

    // Normal: roll next chord (rollNext will clear highlights before new)
    rollNext();
    return p;
  });
}, 3500); // tweak this delay as you like (e.g., 2500 or 3000)  
  };

  const sessionDone = progress >= 25;

  const handleRestart = () => {
    setProgress(0);
    setCorrect(0);
    setExplain("");
    setFirstTry(true);
    setStarted(false);      // return to picker (right column)
    setCurrentChord(null);
    setOptions([]);
    awaitingNextRef.current = false;
    setLastPhrase("");
    setStreak(0);
    // bestStreak preserved
  };

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
            {
              title: "Chords on the Stave",
              subtitle: "Triads and sevenths drawn as clean stacks on the grand stave—see the shapes, learn the sound.",
            },
            {
              title: "Stack It. See It.",
              subtitle: "Simple chord stacks that make root, third, and fifth crystal clear in treble and bass.",
            },
            {
              title: "Harmony, Visible",
              subtitle: "From triads to sevenths: tidy chord shapes that train your eye to recognize harmony at a glance.",
            },
          ]}
        />

        {/* Row 1: left stats | center stave | right picker/MCQ */}
        <div className="child">
          <div className="stats-bar">
            {/* LEFT: stats + start/restart + nudges + wrap-up */}
            <div className="stats-left">
              <div className="stats-box">
                <div>Progress</div>
                <div className="stats-value">{progress}/25</div>
              </div>
              <div className="stats-box">
                <div>Correct</div>
                <div className="stats-value">{correct}/25</div>
              </div>

              {!started && (
                <button
                  className="start-btn"
                  onClick={handleStart}
                  disabled={!canStart}
                  title={canStart ? "Start session" : "Select at least one key, degree, and inversion"}
                >
                  Start
                </button>
              )}

              {sessionDone && started && (
                <button className="restart-btn" onClick={handleRestart}>
                  Restart Session
                </button>
              )}

              {/* Motivational phrase (Eyes) */}
              <div className="explain" style={{ textAlign: "center" }}>
                {lastPhrase && (
                  <span
                    style={{
                      color: PRAISE_GENERAL.includes(lastPhrase) || lastPhrase.includes("nailed") || lastPhrase.includes("pro")
                        ? "#20C997"
                        : "#666",
                      fontWeight: 700,
                    }}
                  >
                    {lastPhrase}
                  </span>
                )}
                {toast && (
                  <span style={{ marginLeft: 8, color: "#FFB703", fontWeight: 800 }}>
                    {toast}
                  </span>
                )}
              </div>

              {/* Best streak (plain line) */}
              <div className="explain" style={{ fontSize: 12, color: "#666", textAlign: "center" }}>
                Best: <strong>{bestStreak}</strong>
              </div>

              {/* End-of-session wrap-up (randomized, tiered) */}
              {sessionDone && (
                <div className="explain" style={{ textAlign: "center" }}>
                  {wrapUpChordSession(correct, bestStreak, {
                    keysCount: selectedKeys.length,
                    inversionsActive: selectedInversions.length > 1,
                    mode: playMode,
                  })}
                </div>
              )}
            </div>

            {/* CENTER: stave + tiny explanation */}
            <div className="stave-center">
              <div className="stave-narrow">
                <GrandStaveVF
                  triadNotes={started && currentChord ? currentChord.display : null}
                  triadArpeggio={playMode === "arp"}
                />
                <div className="explain">{explain}</div>
              </div>
            </div>

            {/* RIGHT: before start → picker; after start → MCQ */}
            <div className="side-box">
              {!started ? (
                <>
                  <div className="side-title">Choose Your Pool</div>

                  {/* Keys */}
                  <div className="picker-section">
                    <strong>Keys</strong>
                    <div className="picker-list">
                      {ALL_KEYS.map(k => {
                        const checked = selectedKeys.includes(k);
                        return (
                          <label key={k} style={{ display:"flex", gap:6, alignItems:"center" }}>
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(e) => {
                                setSelectedKeys(prev => e.target.checked ? [...prev, k] : prev.filter(x => x !== k));
                              }}
                            />
                            <span>{k} major</span>
                          </label>
                        );
                      })}
                    </div>
                    <div className="picker-actions">
                      <button onClick={() => setSelectedKeys(ALL_KEYS)}>All keys</button>
                      <button onClick={() => setSelectedKeys(["C","G","F"])}>C/G/F</button>
                      <button onClick={() => setSelectedKeys([])}>Clear</button>
                    </div>
                  </div>

                  {/* Degrees */}
                  <div className="picker-section">
                    <strong>Degrees</strong>
                    <div className="picker-list">
                      {ALL_DEGREES.map(d => {
                        const checked = selectedDegrees.includes(d);
                        return (
                          <label key={d} style={{ display:"flex", gap:6, alignItems:"center" }}>
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(e) => {
                                setSelectedDegrees(prev => e.target.checked ? [...prev, d] : prev.filter(x => x !== d));
                              }}
                            />
                            <span>{d}</span>
                          </label>
                        );
                      })}
                    </div>
                    <div className="picker-actions">
                      <button onClick={() => setSelectedDegrees(ALL_DEGREES)}>All</button>
                      <button onClick={() => setSelectedDegrees(["I","IV","V"])}>I/IV/V</button>
                      <button onClick={() => setSelectedDegrees([])}>Clear</button>
                    </div>
                  </div>

                  {/* Inversions */}
                  <div className="picker-section">
                    <strong>Inversions</strong>
                    <div className="picker-list">
                      {ALL_INVERSIONS.map(v => {
                        const checked = selectedInversions.includes(v);
                        return (
                          <label key={v} style={{ display:"flex", gap:6, alignItems:"center" }}>
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(e) => {
                                setSelectedInversions(prev => e.target.checked ? [...prev, v] : prev.filter(x => x !== v));
                              }}
                            />
                            <span>{v === "root" ? "Root" : v === "1st" ? "1st inv" : "2nd inv"}</span>
                          </label>
                        );
                      })}
                    </div>
                    <div className="picker-actions">
                      <button onClick={() => setSelectedInversions(ALL_INVERSIONS)}>All</button>
                      <button onClick={() => setSelectedInversions(["root"])}>Root only</button>
                      <button onClick={() => setSelectedInversions([])}>Clear</button>
                    </div>
                  </div>

                  {/* Play mode */}
                  <div className="picker-section">
                    <strong>Play mode</strong>
                    <div className="picker-list" style={{ gridTemplateColumns: "1fr 1fr" }}>
                      <label style={{ display:"flex", gap:6, alignItems:"center" }}>
                        <input
                          type="radio"
                          name="playmode"
                          checked={playMode === "block"}
                          onChange={() => setPlayMode("block")}
                        />
                        <span>Block (together)</span>
                      </label>
                      <label style={{ display:"flex", gap:6, alignItems:"center" }}>
                        <input
                          type="radio"
                          name="playmode"
                          checked={playMode === "arp"}
                          onChange={() => setPlayMode("arp")}
                        />
                        <span>Arpeggio</span>
                      </label>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="side-title">Pick the Correct Name</div>
                  <div className="mcq">
                    {options.map(opt => (
                      <button
  key={opt}
  onClick={() => handleMCQ(opt)}
  disabled={awaitingNextRef.current || sessionDone}
>
  {opt}
</button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Row 2: keyboard */}
        <div className="child child--keys">
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