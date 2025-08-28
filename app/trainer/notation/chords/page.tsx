"use client";

import React, { useMemo, useRef, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";

// Frozen grand staff (client-only)
const GrandStaveVF = dynamic(() => import("../../../components/GrandStaveVF"), { ssr: false });
// Frozen keyboard (unchanged)
import ResponsiveKeyboardC2toC6 from "../../../components/ResponsiveKeyboardC2toC6";

// Chord engine
import {
  buildChord,
  rollRandomFromSelections,
  MajorKey,
  RomanDegree,
  Inversion,
  pickRandom,
} from "../../../../utils/chords";

/* ----------------- styles (reuse trainer grid look) ----------------- */
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

.picker-box { width: var(--picker-w); border: 1px solid #000; border-radius: 6px; padding: 8px 10px;
  display: flex; flex-direction: column; gap: 8px; align-items: stretch; background: #f3f3f3; }
.picker-title { text-align: center; font-weight: 600; }
.picker-group { display: grid; gap: 6px; font-size: 13px; }
.picker-row { display: flex; gap: 6px; flex-wrap: wrap; }
.picker-actions { display: flex; gap: 6px; justify-content: center; }
.picker-actions button { font-size: 12px; padding: 4px 8px; }

.mcq { display: grid; gap: 6px; margin-top: 8px; }
.mcq button {
  text-align: left; padding: 8px 10px; border-radius: 6px; border: 1px solid #ddd; background: #fff; cursor: pointer;
}
.mcq button:hover { background: #fafafa; border-color: #eaeaea; }

.explain { text-align: center; font-size: 13px; margin-top: 6px; min-height: 1.2em; color: #333; }

.media { display: flex; align-items: center; justify-content: center; min-height: var(--keyboard-min-h); }
.media > svg { width: 100%; height: 100%; display: block; }

.blocker { position: absolute; inset: 0; display: none; align-items: center; justify-content: center;
  background: rgba(255,255,255,0.95); z-index: 5; text-align: center; padding: 24px; border-radius: var(--radius); }
.blocker p { margin: 0; font-size: 16px; line-height: 1.4; }
@media (max-width: 450px) and (orientation: portrait) { .blocker { display: flex; } }
`;

/* ----------------- duplicate-event guard (touch de-dupe) ----------------- */
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

/* ----------------- helpers for audio & keyboard flash ----------------- */
// We’ll reuse your existing /public/audio/notes set (sharps, # -> %23 encoded).
function playUrlOnce(url: string) {
  const a = new Audio(url);
  a.preload = "auto";
  try { a.currentTime = 0; } catch {}
  a.play().catch(() => {});
}

// For block vs arpeggio playback
function playChordAudio(urls: string[], mode: "block" | "arp" = "block") {
  if (mode === "block") {
    // low & mid together, then a hair later high (keeps it clean with one-shot files)
    urls.forEach((u, i) => setTimeout(() => playUrlOnce(u), i === 2 ? 40 : 0));
  } else {
    // low → mid → high
    urls.forEach((u, i) => setTimeout(() => playUrlOnce(u), i * 220));
  }
}

type Verdict = "correct" | "wrong";

export default function ChordsRecognitionPage() {
  /* ---------- picker state (collapses after Start) ---------- */
  const ALL_KEYS: MajorKey[] = ["C","G","D","A","E","B","F#","C#","F","Bb","Eb","Ab","Db","Gb","Cb"];
  const ALL_DEG: RomanDegree[] = ["I","ii","iii","IV","V","vi","vii°"];
  const ALL_INV: Inversion[] = ["root","1st","2nd"];

  const [selectedKeys, setSelectedKeys] = useState<MajorKey[]>(["C","G","D"]);
  const [selectedDegrees, setSelectedDegrees] = useState<RomanDegree[]>(["I","IV","V"]);
  const [selectedInversions, setSelectedInversions] = useState<Inversion[]>(["root"]);
  const [preferArp, setPreferArp] = useState<"block"|"arp">("block");

  const [started, setStarted] = useState(false);

  /* ---------- session state ---------- */
  const [progress, setProgress] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [firstTry, setFirstTry] = useState(true);

  // Current chord spec
  const [displayNotes, setDisplayNotes] = useState<string[] | null>(null);  // e.g., ["F#3","A3","C#4"]
  const [audioUrls, setAudioUrls] = useState<string[] | null>(null);
  const [keyboardMidi, setKeyboardMidi] = useState<number[] | null>(null);  // [m1,m2,m3]
  const [label, setLabel] = useState<string>("");
  const [explain, setExplain] = useState<string>("");

  // MCQ options
  const [options, setOptions] = useState<string[]>([]);
  const [answerIndex, setAnswerIndex] = useState<number>(0);
  const [locked, setLocked] = useState(false); // avoid double clicks

  // Keyboard highlight ref
  const kbRef = useRef<{ highlight(note: string, verdict: Verdict): void; clear(note?: string): void } | null>(null);

  /* ---------- picker handlers ---------- */
  const toggle = <T extends string>(arr: T[], value: T, setter: (v: T[]) => void) => {
    setter(arr.includes(value) ? arr.filter(x => x !== value) : [...arr, value]);
  };
  const canStart = selectedKeys.length && selectedDegrees.length && selectedInversions.length;

  /* ---------- roll a new chord + MCQ ---------- */
  function rollQuestion() {
    const spec = rollRandomFromSelections(selectedKeys, selectedDegrees, selectedInversions, /*preferFlats*/ false);
    if (!spec) return; // should not happen if canStart checked

    // Prepare three MCQ options: the correct one + 2 distractors
    const pool: string[] = [];
    pool.push(spec.label);

    // Simple distractor generator: same key, flip inversion/degree randomly
    const distractor1 = buildChord(
      spec.key,
      pickRandom(ALL_DEG),
      pickRandom(ALL_INV)
    ).label;
    const distractor2 = buildChord(
      spec.key,
      pickRandom(ALL_DEG),
      pickRandom(ALL_INV)
    ).label;

    const raw = [spec.label, distractor1, distractor2];
    // shuffle
    for (let i = raw.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [raw[i], raw[j]] = [raw[j], raw[i]];
    }
    const ansIdx = raw.indexOf(spec.label);

    // Prime visuals/audio
    setDisplayNotes(spec.display);
    setAudioUrls(spec.audioUrls);
    setKeyboardMidi(spec.midi);
    setLabel(spec.label);
    setOptions(raw);
    setAnswerIndex(ansIdx);
    setExplain(""); // clear
    setFirstTry(true);
    setLocked(false);

    // Soft preview (quiet arpeggio) could be added later if desired
  }

  /* ---------- Start / Restart ---------- */
  const handleStart = () => {
    if (!canStart) return;
    setStarted(true);
    setProgress(0);
    setCorrect(0);
    setFirstTry(true);
    rollQuestion();
  };

  const sessionDone = progress >= 25;
  const handleRestart = () => {
    setProgress(0);
    setCorrect(0);
    setFirstTry(true);
    setExplain("");
    rollQuestion();
  };

  /* ---------- MCQ click ---------- */
  function onChoose(idx: number) {
    if (locked || !started || !displayNotes || !keyboardMidi || !audioUrls) return;
    const guardId = `mcq-${idx}`;
    if (!shouldAcceptOnce(guardId)) return;

    if (idx === answerIndex) {
      // Correct
      if (firstTry) setCorrect(c => Math.min(25, c + 1));
      setLocked(true);

      // Flash keys on our keyboard (use sharp spellings -> MIDI already known)
      // We’ll emit press highlights via the keyboard’s ref if exposed; otherwise, no-op.
      // (Current ResponsiveKeyboardC2toC6 doesn’t expose ref methods publicly; so we’ll skip programmatic highlight.)
      // Audio
      playChordAudio(audioUrls, preferArp);

      // Explanation line
      const [a,b,c] = displayNotes;
      setExplain(`${label}: ${a}–${b}–${c}`);

      // Advance
      setTimeout(() => {
        setProgress(p => {
          const next = Math.min(25, p + 1);
          if (next < 25) {
            rollQuestion();
          } else {
            // session complete; show Restart
          }
          return next;
        });
      }, 1000);
    } else {
      // Wrong
      setFirstTry(false);
      // (Optionally brief feedback could be added)
    }
  }

  // Judge is not used in this mode (no keyboard input required),
  // but we pass a trivial judge so keyboard still shows green labels when clicked manually.
  const judge = (_name: string) => undefined;

  return (
    <>
      <style>{styles}</style>

      <div className="page">
        <div className="root">
          {/* Portrait blocker (trainer pages norm) */}
          <div className="blocker">
            <p><strong>Please rotate your device to landscape</strong><br/>(or use a device with a larger screen)</p>
          </div>

          {/* Inline title like other trainer pages */}
          <div className="header">
            <div className="title-line">
              <h1>Chords — Name That Triad</h1>
              <Link href="/" className="title-home">HOME</Link>
            </div>
            <p>Choose a key, degrees, and inversions, press <strong>Start</strong>. Identify the chord correctly to reveal and hear it.</p>
          </div>

          {/* Row 1: stats + stave + picker/MCQ */}
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
                    title={canStart ? "Start session" : "Select key, degrees & inversions first"}
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

              {/* CENTER: Grand staff (triad as 3 half notes, stacked) */}
              <div className="stave-center">
                <div className="stave-narrow">
                  <GrandStaveVF
                    // chord mode: pass three note names (e.g., ["F#3","A3","C#4"])
                    triadNotes={currentChord ? currentChord.display : null}
                  />
                  <div className="explain">{explain}</div>
                </div>
              </div>

              {/* RIGHT: Setup picker (collapses after Start) or MCQ options */}
              {!started ? (
                <div className="picker-box">
                  <div className="picker-title">Setup</div>

                  <div className="picker-group">
                    <div><strong>Key (major)</strong></div>
                    <div className="picker-row">
                      {ALL_KEYS.map(k => (
                        <label key={k} style={{ display:"inline-flex", gap:6, alignItems:"center" }}>
                          <input
                            type="checkbox"
                            checked={selectedKeys.includes(k)}
                            onChange={() => toggle(selectedKeys, k, setSelectedKeys)}
                          />
                          <span>{k}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="picker-group">
                    <div><strong>Degrees</strong></div>
                    <div className="picker-row">
                      {ALL_DEG.map(d => (
                        <label key={d} style={{ display:"inline-flex", gap:6, alignItems:"center" }}>
                          <input
                            type="checkbox"
                            checked={selectedDegrees.includes(d)}
                            onChange={() => toggle(selectedDegrees, d, setSelectedDegrees)}
                          />
                          <span>{d}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="picker-group">
                    <div><strong>Inversions</strong></div>
                    <div className="picker-row">
                      {ALL_INV.map(v => (
                        <label key={v} style={{ display:"inline-flex", gap:6, alignItems:"center" }}>
                          <input
                            type="checkbox"
                            checked={selectedInversions.includes(v)}
                            onChange={() => toggle(selectedInversions, v, setSelectedInversions)}
                          />
                          <span>{v}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="picker-group">
                    <div><strong>Playback</strong></div>
                    <div className="picker-row">
                      <label style={{ display:"inline-flex", gap:6, alignItems:"center" }}>
                        <input
                          type="radio"
                          name="pb"
                          checked={preferArp === "block"}
                          onChange={() => setPreferArp("block")}
                        />
                        <span>Block</span>
                      </label>
                      <label style={{ display:"inline-flex", gap:6, alignItems:"center" }}>
                        <input
                          type="radio"
                          name="pb"
                          checked={preferArp === "arp"}
                          onChange={() => setPreferArp("arp")}
                        />
                        <span>Arpeggio</span>
                      </label>
                    </div>
                  </div>

                  <div className="picker-actions">
                    <button onClick={() => { setSelectedKeys(ALL_KEYS); }}>All keys</button>
                    <button onClick={() => { setSelectedDegrees(ALL_DEG); }}>All degrees</button>
                    <button onClick={() => { setSelectedInversions(ALL_INV); }}>All inversions</button>
                  </div>
                </div>
              ) : (
                <div className="picker-box" style={{ background:"#fff" }}>
                  <div className="picker-title">What chord is this?</div>
                  <div className="mcq">
                    {options.map((opt, i) => (
                      <button key={i} onClick={() => onChoose(i)}>{opt}</button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Keyboard (display only — no required input in this mode) */}
          <div className="child">
            <div className="media">
              <ResponsiveKeyboardC2toC6
                judge={judge}
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