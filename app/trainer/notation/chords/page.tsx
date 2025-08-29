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
.header p { margin: 0; color: #444; }
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
.stave-narrow { width: 260px; } /* 🔒 FROZEN size */
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
`;

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
    const next = rollRandomFromSelections(selectedKeys, selectedDegrees, selectedInversions, false);
    if (!next) return;
    setCurrentChord(next);
    setOptions(buildOptions(next));
    setExplain("");
    setFirstTry(true);
    awaitingNextRef.current = false;
  }

  const handleStart = () => {
    if (!canStart) return;
    setStarted(true);
    setProgress(0);
    setCorrect(0);
    setExplain("");
    setFirstTry(true);
    awaitingNextRef.current = false;
    rollNext();
  };

  // Highlight keys (green) for 1s on correct reveal
  function flashKeyboard(displayNames: string[]) {
    // displayNames like ["F#3","A3","C#4"]
    // Convert to NoteName for our keyboard: it accepts sharps/flats with octaves 2..6
    displayNames.forEach((n) => kbRef.current?.highlight(n as any, "correct"));
    setTimeout(() => kbRef.current?.clear(), 1000);
  }

  const handleMCQ = (choice: string) => {
    if (!currentChord || awaitingNextRef.current) return;
    const isCorrect = choice === currentChord.label;

    if (!isCorrect) {
      // do NOT advance progress; just mark not-first-try
      setFirstTry(false);
      setExplain("Try again…");
      return;
    }

    // Correct
    setExplain(() => {
      const [a,b,c] = currentChord.display;
      const inv = currentChord.inversion === "root" ? "root" : currentChord.inversion === "1st" ? "1st inversion" : "2nd inversion";
      return `${currentChord.label}: ${a}–${b}–${c}; ${inv}`;
    });

    // Counters
    setProgress(p => Math.min(25, p + 1));
    if (firstTry) setCorrect(c => Math.min(25, c + 1));

    // Play & highlight
    const urls = currentChord.display.map(audioUrlFromDisplay);
    if (playMode === "block") playBlock(urls);
    else playArpeggio(urls, 140);
    flashKeyboard(currentChord.display);

    // Next
    awaitingNextRef.current = true;
    setTimeout(() => {
      setProgress(p => {
        if (p >= 25) {
          awaitingNextRef.current = false;
          return p;
        }
        rollNext();
        return p;
      });
    }, 2500);
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
  };

  return (
    <main className="page">
      <style>{styles}</style>

      <div className="root">
        {/* portrait blocker */}
        <div className="blocker">
          <p><strong>Please rotate your device to landscape</strong><br/>(or use a device with a larger screen)</p>
        </div>

        {/* header */}
        <div className="header">
          <div className="title-line">
            <h1>Chords — Name That Chord</h1>
            <Link href="/" className="title-home">HOME</Link>
          </div>
          <p>Choose key/degree/inversions, press <strong>Start</strong>, then pick the correct name. We’ll show keys and play the chord.</p>
        </div>

        {/* Row 1: left stats | center stave | right picker/MCQ */}
        <div className="child">
          <div className="stats-bar">
            {/* LEFT: stats + start/restart */}
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
            </div>

            {/* CENTER: stave + tiny explanation */}
            <div className="stave-center">
              <div className="stave-narrow">
                <GrandStaveVF
                  // draw the triad (center column stays clean)
                  triadNotes={started && currentChord ? currentChord.display : null}
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
                      <button key={opt} onClick={() => handleMCQ(opt)} disabled={awaitingNextRef.current}>
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