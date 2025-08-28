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
  --picker-w: 260px;
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
.start-btn { margin-top: 6px; padding: 6px 10px; font-size: 12px; border: 1px solid #444; background: #dff; cursor: pointer; }

.stave-center { min-width: 0; display: flex; justify-content: center; align-items: center; }
.stave-narrow { width: 260px; } /* 🔒 FROZEN size */
.explain { text-align:center; font-size: 13px; margin-top: 6px; min-height: 1.2em; }

.picker-box { width: var(--picker-w); border: 1px solid #000; border-radius: 6px; padding: 8px 10px;
  display: flex; flex-direction: column; gap: 6px; align-items: stretch; background: #f3f3f3; }
.picker-title { text-align: center; font-weight: 600; }
.picker-list { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 10px; font-size: 13px; }
.picker-actions { display: flex; gap: 6px; justify-content: center; }
.picker-actions button { font-size: 12px; padding: 4px 8px; }

.mcq { margin-top: 10px; display: grid; gap: 8px; }
.mcq button {
  font-size: 14px; padding: 8px 10px; border-radius: 6px; border: 1px solid #ccc; background: #fff; cursor: pointer;
}
.mcq button:hover { background: #fafafa; }
.mcq button[disabled] { opacity: 0.6; cursor: default; }

.media { display: flex; align-items: center; justify-content: center; min-height: var(--keyboard-min-h); }
.media > svg { width: 100%; height: 100%; display: block; }

.blocker { position: absolute; inset: 0; display: none; align-items: center; justify-content: center;
  background: rgba(255,255,255,0.95); z-index: 5; text-align: center; padding: 24px; border-radius: var(--radius); }
.blocker p { margin: 0; font-size: 16px; line-height: 1.4; }
@media (max-width: 450px) and (orientation: portrait) { .blocker { display: flex; } }
`;

/* ======================= Audio helpers (reuse singles) ======================= */
function playBlock(urls: string[]) {
  // Fire near-simultaneously
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
    // If not enough same-key candidates, fill from any selection
    const fallback = ALL_DEGREES.filter(d => d !== answer.degree);
    while (pool.length < 3 && fallback.length) {
      const d = fallback.splice(Math.floor(Math.random()*fallback.length), 1)[0];
      pool.push(`${d} in ${answer.key} major (${answer.inversion === "root" ? "root" : answer.inversion === "1st" ? "1st inv" : "2nd inv"})`);
    }
    // Shuffle
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
    setFirstTry(true);                 // reset for next question
    awaitingNextRef.current = false;  // unlock UI
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

  const handleRestart = () => {
    setProgress(0);
    setCorrect(0);
    setExplain("");
    setFirstTry(true);
    awaitingNextRef.current = false;
    rollNext();
  };

  const sessionDone = progress >= 25;

  /* Answer handler — FIRST-TRY scoring rule */
  const handleAnswer = (label: string) => {
    if (!currentChord || awaitingNextRef.current || sessionDone) return;

    const isCorrect = label === currentChord.label;

    if (isCorrect) {
      // Explain + reveal audio
      setExplain(`${currentChord.label} — ${currentChord.display.join(" – ")}`);
      const urls = currentChord.display.map(audioUrlFromDisplay);
      if (playMode === "block") playBlock(urls);
      else playArpeggio(urls);

      // Highlight keys for 1s
      try {
        currentChord.display.forEach(n => kbRef.current?.highlight(n as any, "correct"));
      } catch {}

      // Score: progress always +1; correct only if firstTry
      if (firstTry) setCorrect(c => Math.min(25, c + 1));
      awaitingNextRef.current = true;

      setProgress(p => {
        const nextP = Math.min(25, p + 1);
        if (nextP < 25) {
          setTimeout(() => rollNext(), 900);
        } else {
          awaitingNextRef.current = false;
        }
        return nextP;
      });
    } else {
      // Wrong → no counter changes; allow retry
      setFirstTry(false);
      setExplain("Try again…");
    }
  };

  /* ------- Picker helpers ------- */
  const toggleArr = <T,>(all: T[], selected: T[], v: boolean) =>
    v ? Array.from(new Set([...selected, ...all])) : [];

  const toggleOne = <T,>(selected: T[], value: T, v: boolean) =>
    v ? Array.from(new Set([...selected, value])) : selected.filter(x => x !== value);

  const keyChecked = (k: MajorKey) => selectedKeys.includes(k);
  const degChecked = (d: RomanDegree) => selectedDegrees.includes(d);
  const invChecked = (i: Inversion) => selectedInversions.includes(i);

  return (
    <>
      <style>{styles}</style>

      <div className="page">
        <div className="root">
          <div className="blocker">
            <p><strong>Please rotate your device to landscape</strong><br/>(or use a device with a larger screen)</p>
          </div>

          <div className="header">
            <div className="title-line">
              <h1>Chords — Name That Triad</h1>
              <Link href="/" className="title-home">HOME</Link>
            </div>
            <p>Pick a key, degrees, inversions — press <b>Start</b>. Identify the chord from 3 choices, then see & hear it highlighted.</p>
          </div>

          <div className="child">
            <div className="stats-bar">
              {/* LEFT: Progress/Correct + Start/Restart */}
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
                    title={canStart ? "Start session" : "Choose at least one in each group"}
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

              {/* CENTER: Grand staff + MCQ */}
              <div className="stave-center">
                <div>
                  <div className="stave-narrow">
                    <GrandStaveVF
                      triadNotes={currentChord ? currentChord.display : null}
                    />
                  </div>

                  <div className="mcq" aria-label="Multiple choice answers">
                    {options.map((opt) => (
                      <button
                        key={opt}
                        onClick={() => handleAnswer(opt)}
                        disabled={!started || sessionDone || awaitingNextRef.current}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>

                  <div className="explain">{explain}</div>
                </div>
              </div>

              {/* RIGHT: Picker — collapses after Start */}
              {!started && (
                <div className="picker-box">
                  <div className="picker-title">Setup</div>

                  <div className="picker-actions" aria-label="Play mode">
                    <button
                      onClick={() => setPlayMode("block")}
                      disabled={playMode === "block"}
                      title="Play together"
                    >Block</button>
                    <button
                      onClick={() => setPlayMode("arp")}
                      disabled={playMode === "arp"}
                      title="Play as arpeggio"
                    >Arpeggio</button>
                  </div>

                  <div className="picker-title">Keys</div>
                  <div className="picker-actions">
                    <button onClick={() => setSelectedKeys(toggleArr(ALL_KEYS, selectedKeys, true))}>All</button>
                    <button onClick={() => setSelectedKeys(toggleArr(ALL_KEYS, selectedKeys, false))}>Clear</button>
                  </div>
                  <div className="picker-list">
                    {ALL_KEYS.map(k => (
                      <label key={k} style={{ display:"flex", gap:6, alignItems:"center" }}>
                        <input
                          type="checkbox"
                          checked={keyChecked(k)}
                          onChange={e => setSelectedKeys(toggleOne(selectedKeys, k, e.target.checked))}
                        />
                        <span>{k} major</span>
                      </label>
                    ))}
                  </div>

                  <div className="picker-title">Degrees</div>
                  <div className="picker-actions">
                    <button onClick={() => setSelectedDegrees(toggleArr(ALL_DEGREES, selectedDegrees, true))}>All</button>
                    <button onClick={() => setSelectedDegrees(toggleArr(ALL_DEGREES, selectedDegrees, false))}>Clear</button>
                  </div>
                  <div className="picker-list">
                    {ALL_DEGREES.map(d => (
                      <label key={d} style={{ display:"flex", gap:6, alignItems:"center" }}>
                        <input
                          type="checkbox"
                          checked={degChecked(d)}
                          onChange={e => setSelectedDegrees(toggleOne(selectedDegrees, d, e.target.checked))}
                        />
                        <span>{d}</span>
                      </label>
                    ))}
                  </div>

                  <div className="picker-title">Inversions</div>
                  <div className="picker-actions">
                    <button onClick={() => setSelectedInversions(toggleArr(ALL_INVERSIONS, selectedInversions, true))}>All</button>
                    <button onClick={() => setSelectedInversions(toggleArr(ALL_INVERSIONS, selectedInversions, false))}>Clear</button>
                  </div>
                  <div className="picker-list">
                    {ALL_INVERSIONS.map(i => (
                      <label key={i} style={{ display:"flex", gap:6, alignItems:"center" }}>
                        <input
                          type="checkbox"
                          checked={invChecked(i)}
                          onChange={e => setSelectedInversions(toggleOne(selectedInversions, i, e.target.checked))}
                        />
                        <span>{i === "root" ? "Root" : i === "1st" ? "1st inversion" : "2nd inversion"}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Keyboard (for reveal highlight only) */}
          <div className="child">
            <div className="media">
              <ResponsiveKeyboardC2toC6
                ref={kbRef}
                judge={() => undefined}
                onKeyPress={() => {}}
                onKeyDown={() => {}}
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
