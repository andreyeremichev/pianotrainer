"use client";

import React, { useMemo, useRef, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";

// Grand staff (client-only)
const GrandStaveVF = dynamic(() => import("../../../components/GrandStaveVF"), { ssr: false });
// On-screen keyboard (display-only here; we flash keys on correct)
import ResponsiveKeyboardC2toC6, { type KeyboardRef } from "../../../components/ResponsiveKeyboardC2toC6";

// Chord engine (relative import from repo root /utils)
import type {
  BuiltChord,
  MajorKey,
  RomanDegree,
  Inversion,
} from "../../../../utils/chords";
import {
  rollRandomFromSelections,
  chordLabel,
  midiToSharpName,
  audioUrlFromDisplay,
  pickRandom,
} from "../../../../utils/chords";

/* ======================= styles (lean, reusing trainer look) ======================= */
const styles = `
:root {
  --page-max-width: 1200px;
  --radius: 8px;
  --stats-w: 120px;
  --picker-w: 240px;
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

.child { border: 1px solid #ccc; border-radius: var(--radius); background: #fff; padding: 8px; }
.grid { display: grid; grid-template-columns: 1fr; gap: 10px; }
.stats-bar { display: grid; grid-template-columns: auto 1fr auto; align-items: center; column-gap: 10px; }

.stats-left { display: flex; flex-direction: column; gap: 8px; width: var(--stats-w); }
.stats-box { border: 1px solid #000; border-radius: 6px; padding: 8px 10px; display: grid; place-items: center; }
.stats-value { font-weight: 700; }
.start-btn { margin-top: 6px; padding: 6px 10px; font-size: 12px; border: 1px solid #444; background: #dff; cursor: pointer; }
.restart-btn { margin-top: 6px; padding: 6px 10px; font-size: 12px; border: 1px solid #444; background: #eee; cursor: pointer; }

.stave-center { min-width: 0; display: flex; justify-content: center; align-items: center; }
.stave-narrow { width: 260px; } /* 🔒 frozen */

.picker-box { width: var(--picker-w); border: 1px solid #000; border-radius: 6px; padding: 8px 10px;
  display: flex; flex-direction: column; gap: 8px; align-items: stretch; background: #f3f3f3; }
.picker-title { text-align: center; font-weight: 600; }
.picker-group { display: grid; gap: 6px; }
.picker-row { display: flex; flex-wrap: wrap; gap: 6px; }
.picker-row label { display: inline-flex; gap: 6px; align-items: center; }

.mcq { margin-top: 8px; display: grid; gap: 8px; }
.mcq button { padding: 8px 10px; border-radius: 8px; border: 1px solid #ddd; background: #fff; cursor: pointer; text-align: left; }
.mcq button:hover { background: #fafafa; }
.explain { text-align: center; font-size: 13px; margin-top: 6px; min-height: 1.2em; color:#222; }

.media { display: flex; align-items: center; justify-content: center; min-height: var(--keyboard-min-h); }
.media > svg { width: 100%; height: 100%; display: block; }

.blocker { position: absolute; inset: 0; display: none; align-items: center; justify-content: center;
  background: rgba(255,255,255,0.95); z-index: 5; text-align: center; padding: 24px; border-radius: var(--radius); }
.blocker p { margin: 0; font-size: 16px; line-height: 1.4; }
@media (max-width: 450px) and (orientation: portrait) { .blocker { display: flex; } }
`;

/* ======================= audio helpers ======================= */
const audioCache = new Map<string, HTMLAudioElement>();
function getAudio(url: string) {
  let a = audioCache.get(url);
  if (!a) {
    a = new Audio(url);
    a.preload = "auto";
    audioCache.set(url, a);
  }
  return a;
}
function playBlock(urls: string[]) {
  // Start together-ish
  urls.forEach((u, i) => {
    const a = getAudio(u);
    try { a.currentTime = 0; } catch {}
    // tiny stagger to avoid clipping
    setTimeout(() => { a.play().catch(() => {}); }, i * 30);
  });
}
function playArpeggio(urls: string[]) {
  urls.forEach((u, i) => {
    const a = getAudio(u);
    try { a.currentTime = 0; } catch {}
    setTimeout(() => { a.play().catch(() => {}); }, i * 260);
  });
}

/* ======================= page ======================= */
const ALL_KEYS: MajorKey[] = ["C","G","D","A","E","B","F#","C#","F","Bb","Eb","Ab","Db","Gb","Cb"];
const ALL_DEGREES: RomanDegree[] = ["I","ii","iii","IV","V","vi","vii°"];
const ALL_INVERSIONS: Inversion[] = ["root","1st","2nd"];

type PlayMode = "block" | "arpeggio";

export default function ChordsRecognitionPage() {
  // Picker
  const [selectedKeys, setSelectedKeys] = useState<MajorKey[]>(["C","G","F"]);
  const [selectedDegrees, setSelectedDegrees] = useState<RomanDegree[]>(["I","IV","V"]);
  const [selectedInversions, setSelectedInversions] = useState<Inversion[]>(["root","1st","2nd"]);
  const [playMode, setPlayMode] = useState<PlayMode>("block");
  const [started, setStarted] = useState(false);

  // Session
  const [progress, setProgress] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [currentChord, setCurrentChord] = useState<BuiltChord | null>(null);
  const [options, setOptions] = useState<string[]>([]);
  const [explain, setExplain] = useState("");

  // Keyboard ref to flash keys green after correct
  const kbRef = useRef<KeyboardRef>(null);

  // Build 2 distractors (same key preferred, different degree/inversion)
  function buildOptions(target: BuiltChord): string[] {
    const labels = new Set<string>();
    labels.add(target.label);

    // try to create two plausible distractors
    for (let i = 0; i < 20 && labels.size < 3; i++) {
      const k = target.key; // same key more plausible
      const d = pickRandom(selectedDegrees);
      const v = pickRandom(selectedInversions);
      const altLabel = chordLabel(k, d, v);
      labels.add(altLabel);
    }

    // if still not enough, broaden key space
    while (labels.size < 3) {
      const k = pickRandom(selectedKeys);
      const d = pickRandom(selectedDegrees);
      const v = pickRandom(selectedInversions);
      labels.add(chordLabel(k, d, v));
    }

    // shuffle
    return Array.from(labels).sort(() => Math.random() - 0.5);
  }

  function rollNext() {
    const next = rollRandomFromSelections(selectedKeys, selectedDegrees, selectedInversions, /* preferFlats */ false);
    if (!next) return;
    setCurrentChord(next);
    setOptions(buildOptions(next));
    setExplain("");
  }

  const canStart = useMemo(
    () => selectedKeys.length && selectedDegrees.length && selectedInversions.length,
    [selectedKeys, selectedDegrees, selectedInversions]
  );

  const handleStart = () => {
    if (!canStart) return;
    setStarted(true);
    setProgress(0);
    setCorrect(0);
    rollNext();
  };

  // User picks an MCQ option
  const handleAnswer = (label: string) => {
    if (!currentChord) return;
    const isCorrect = label === currentChord.label;

    if (isCorrect) {
      // 1) Explain
      setExplain(`${currentChord.label} — ${currentChord.display.join(" – ")}`);

      // 2) Audio (reveal only)
      const urls = currentChord.display.map(audioUrlFromDisplay);
      if (playMode === "block") playBlock(urls);
      else playArpeggio(urls);

      // 3) Flash keys on keyboard (green, 1s)
      try {
        currentChord.display.forEach((name) => kbRef.current?.highlight(name as any, "correct"));
      } catch {}

      // 4) Progress → next
      setCorrect(c => Math.min(25, c + 1));
      setProgress(p => {
        const nextP = Math.min(25, p + 1);
        if (nextP < 25) {
          setTimeout(() => rollNext(), 900);
        }
        return nextP;
      });
    } else {
      // Gentle nudge
      setExplain("Try again…");
    }
  };

  const sessionDone = progress >= 25;

  const handleRestart = () => {
    setProgress(0);
    setCorrect(0);
    setExplain("");
    // keep selections; just start anew
    rollNext();
  };

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
            <p>Choose key(s), degrees, and inversions, press <strong>Start</strong>, then pick the correct answer. We’ll reveal the chord on the keyboard and play it.</p>
          </div>

          {/* Main card: stats • stave • picker (or MCQ) */}
          <div className="child">
            <div className="stats-bar">
              {/* LEFT: progress */}
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
                    title={canStart ? "Start session" : "Select key(s), degrees and inversions"}
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

              {/* CENTER: Stave with the current triad */}
              <div className="stave-center">
                <div className="stave-narrow">
                  <GrandStaveVF
                    // triad: array of note names (e.g., ["F#3","A3","C#4"])
                    triadNotes={currentChord ? currentChord.display : null}
                  />
                  <div className="explain">{explain}</div>
                </div>
              </div>

              {/* RIGHT: Picker (collapses after Start) OR MCQ choices */}
              {!started ? (
                <div className="picker-box" role="region" aria-label="Chord Setup">
                  <div className="picker-title">Setup</div>

                  <div className="picker-group">
                    <strong>Key (major)</strong>
                    <div className="picker-row" role="group" aria-label="Keys">
                      {ALL_KEYS.map(k => (
                        <label key={k}>
                          <input
                            type="checkbox"
                            checked={selectedKeys.includes(k)}
                            onChange={(e) =>
                              setSelectedKeys(prev =>
                                e.target.checked ? [...prev, k] : prev.filter(x => x !== k)
                              )
                            }
                          />
                          <span>{k}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="picker-group">
                    <strong>Degrees</strong>
                    <div className="picker-row" role="group" aria-label="Degrees">
                      {ALL_DEGREES.map(d => (
                        <label key={d}>
                          <input
                            type="checkbox"
                            checked={selectedDegrees.includes(d)}
                            onChange={(e) =>
                              setSelectedDegrees(prev =>
                                e.target.checked ? [...prev, d] : prev.filter(x => x !== d)
                              )
                            }
                          />
                          <span>{d}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="picker-group">
                    <strong>Inversions</strong>
                    <div className="picker-row" role="group" aria-label="Inversions">
                      {ALL_INVERSIONS.map(v => (
                        <label key={v}>
                          <input
                            type="checkbox"
                            checked={selectedInversions.includes(v)}
                            onChange={(e) =>
                              setSelectedInversions(prev =>
                                e.target.checked ? [...prev, v] : prev.filter(x => x !== v)
                              )
                            }
                          />
                          <span>{v}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="picker-group">
                    <strong>Playback</strong>
                    <div className="picker-row" role="group" aria-label="Playback mode">
                      <label>
                        <input
                          type="radio"
                          name="playmode"
                          checked={playMode === "block"}
                          onChange={() => setPlayMode("block")}
                        />
                        <span>Block</span>
                      </label>
                      <label>
                        <input
                          type="radio"
                          name="playmode"
                          checked={playMode === "arpeggio"}
                          onChange={() => setPlayMode("arpeggio")}
                        />
                        <span>Arpeggio</span>
                      </label>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="picker-box" role="group" aria-label="Choices">
                  <div className="picker-title">Choose the correct chord</div>
                  <div className="mcq">
                    {options.map(opt => (
                      <button key={opt} onClick={() => handleAnswer(opt)} aria-label={`Answer ${opt}`}>
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Keyboard (display-only; we flash keys green on correct reveal) */}
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
