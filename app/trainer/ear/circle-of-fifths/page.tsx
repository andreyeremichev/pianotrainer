// app/trainer/ear/circle-of-fifths/page.tsx
"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

/* =========================
   Minimal Dark Theme Tokens
   ========================= */
const theme = {
  bgPrimary: "#0B0F14",
  bgSecondary: "#111820",
  textPrimary: "#E6EBF2",
  textSecondary: "#8B94A7",
  textDisabled: "#556070",
  accentBlue: "#6FA8FF",
  accentGreen: "#69D58C",
  accentRed: "#FF6F6F",
  border: "#1E2935",
};

/* ==============================================
   Utils: playNoteAudio (encodes '#' in filenames)
   ============================================== */
function playNoteAudio(noteName: string, volume = 1.0) {
  const safeName = noteName.replace("#", "%23");
  const audio = new Audio(`/audio/notes/${safeName}.wav`);
  audio.currentTime = 0;
  audio.volume = volume;
  audio.play().catch(() => {});
  return audio;
}

/* =====================================================
   Pitch helpers (C major, one octave C4..B4 for the MVP)
   ===================================================== */
const NOTE_ORDER = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"] as const;
type NoteName = `${(typeof NOTE_ORDER)[number]}${number}`;

const DEGREE_TO_SEMITONES: Record<string, number> = {
  "1": 0,
  "2": 2,
  "3": 4,
  "4": 5,
  "5": 7,
  "6": 9,
  "7": 11,
  // Accidentals (not used in MVP probe but kept for future)
  "b2": 1,
  "b3": 3,
  "#4": 6,
  "b6": 8,
  "b7": 10,
};

function noteNameToMidi(n: NoteName) {
  const pc = n.slice(0, -1);
  const oct = parseInt(n.slice(-1), 10);
  const idx = NOTE_ORDER.indexOf(pc as any);
  return (oct + 1) * 12 + idx; // MIDI formula (C-1 = 0)
}

function midiToNoteName(midi: number): NoteName {
  const pc = NOTE_ORDER[midi % 12];
  const oct = Math.floor(midi / 12) - 1;
  return `${pc}${oct}` as NoteName;
}

/* C major in one octave around C4 */
const TONIC: NoteName = "C4";
const TONIC_MIDI = noteNameToMidi(TONIC);

/* ==========================
   Tonicizing pattern (MVP)
   ========================== */
// 1–3–5–3–1–7–1, always inside C4..B4
const TONICIZE_DEGREES = ["1", "3", "5", "3", "1", "7", "1"] as const;

/* ==========================
   Degree labels / UI mapping
   ========================== */
const DEGREE_LABELS = ["1", "2", "3", "4", "5", "6", "7", "b2", "b3", "b6", "b7", "#4"] as const;
type DegreeLabel = (typeof DEGREE_LABELS)[number];

const MVP_ACTIVE_DEGREES: DegreeLabel[] = ["1", "2", "3", "4", "5", "6", "7"]; // restrict probe for MVP

/* ==========================
   Simple scheduler helpers
   ========================== */
function sleep(ms: number) {
  return new Promise((res) => setTimeout(res, ms));
}

async function playDegreeSequence(
  degrees: string[],
  gapMs = 220,
  velocity = 1.0
) {
  for (const d of degrees) {
    const semis = DEGREE_TO_SEMITONES[d];
    const midi = TONIC_MIDI + semis;
    const name = midiToNoteName(midi);
    playNoteAudio(name, velocity);
    await sleep(gapMs);
  }
}

/* ==========================
   Page Component (MVP)
   ========================== */
export default function DegreesPianoOnlyMVP() {
  const [isRunning, setIsRunning] = useState(false);
  const [currentProbe, setCurrentProbe] = useState<DegreeLabel | null>(null);
  const [lastAnswerCorrect, setLastAnswerCorrect] = useState<boolean | null>(null);
  const [stats, setStats] = useState({ total: 0, correct: 0, streak: 0 });

  const isBusyRef = useRef(false);

  const startRound = useCallback(async () => {
    if (isBusyRef.current) return;
    isBusyRef.current = true;
    setLastAnswerCorrect(null);

    // 1) Tonicize
    await playDegreeSequence(TONICIZE_DEGREES as unknown as string[], 220, 0.95);
    await sleep(250);

    // 2) Pick probe degree from MVP set
    const d = MVP_ACTIVE_DEGREES[Math.floor(Math.random() * MVP_ACTIVE_DEGREES.length)];
    setCurrentProbe(d);

    // 3) Play probe
    const semis = DEGREE_TO_SEMITONES[d];
    const midi = TONIC_MIDI + semis;
    const name = midiToNoteName(midi);
    playNoteAudio(name, 1.0);

    // Now wait for answer…
    isBusyRef.current = false;
  }, []);

  const handleStart = useCallback(async () => {
    setIsRunning(true);
    await startRound();
  }, [startRound]);

  const handleAnswer = useCallback(
    async (answer: DegreeLabel) => {
      if (!currentProbe || isBusyRef.current) return;

      const correct = answer === currentProbe;
      setLastAnswerCorrect(correct);
      setStats((s) => ({
        total: s.total + 1,
        correct: s.correct + (correct ? 1 : 0),
        streak: correct ? s.streak + 1 : 0,
      }));

      // Quick feedback sound (optional): replay correct note softly
      const semis = DEGREE_TO_SEMITONES[currentProbe];
      const midi = TONIC_MIDI + semis;
      const name = midiToNoteName(midi);
      playNoteAudio(name, correct ? 0.7 : 0.4);

      // Visual pause then next round
      isBusyRef.current = true;
      await sleep(700);
      setCurrentProbe(null);
      await sleep(200);
      isBusyRef.current = false;
      await startRound();
    },
    [currentProbe, startRound]
  );

  // Keyboard shortcuts: digits 1..7
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!isRunning) return;
      const map: Record<string, DegreeLabel> = {
        "1": "1",
        "2": "2",
        "3": "3",
        "4": "4",
        "5": "5",
        "6": "6",
        "7": "7",
      };
      const d = map[e.key];
      if (d) handleAnswer(d);
      if (e.key === " ") {
        e.preventDefault();
        if (!isBusyRef.current) startRound();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handleAnswer, isRunning, startRound]);

  return (
    <div style={{ minHeight: "100vh", background: theme.bgPrimary, color: theme.textPrimary }}>
      <div style={{ maxWidth: 960, margin: "0 auto", padding: "24px" }}>
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 16,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <a href="/" style={{ color: theme.textSecondary, textDecoration: "none" }}>← Home</a>
            <h1 style={{ margin: 0, fontSize: 20 }}>Degrees (Piano Only)</h1>
          </div>
          <div style={{ color: theme.textSecondary, fontSize: 13 }}>
            MVP • C major • Octave C4–B4
          </div>
        </div>

        {/* Wheel card */}
        <div
          style={{
            background: theme.bgSecondary,
            border: `1px solid ${theme.border}`,
            borderRadius: 12,
            padding: 20,
          }}
        >
          {/* Wheel-ish layout using responsive grid of chips (clickable) */}
          <div style={{ textAlign: "center", marginBottom: 12 }}>
            {!isRunning ? (
              <button
                onClick={handleStart}
                style={{
                  background: theme.accentBlue,
                  color: "#081019",
                  border: "none",
                  borderRadius: 999,
                  padding: "12px 18px",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Start
              </button>
            ) : (
              <button
                onClick={() => !isBusyRef.current && startRound()}
                style={{
                  background: "transparent",
                  color: theme.textSecondary,
                  border: `1px solid ${theme.border}`,
                  borderRadius: 999,
                  padding: "10px 16px",
                  cursor: "pointer",
                }}
                title="Replay context & next probe (Space)"
              >
                Next (Space)
              </button>
            )}
          </div>

          {/* Probe state */}
          <div style={{ textAlign: "center", marginBottom: 8, minHeight: 22 }}>
            {isRunning && currentProbe ? (
              <span style={{ color: theme.textSecondary }}>Listening… guess the degree</span>
            ) : isRunning ? (
              <span style={{ color: theme.textSecondary }}>Preparing next…</span>
            ) : (
              <span style={{ color: theme.textSecondary }}>Tonicize → Probe → Answer</span>
            )}
          </div>

          {/* Degree buttons */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(6, minmax(0,1fr))",
              gap: 10,
            }}
          >
            {DEGREE_LABELS.map((d) => {
              const isEnabled = MVP_ACTIVE_DEGREES.includes(d);
              const isCorrectShown = lastAnswerCorrect === true && currentProbe === d;
              const baseBg = !isEnabled ? "#0D131A" : "#0F1821";
              const color =
                isEnabled
                  ? theme.textPrimary
                  : theme.textDisabled;

              const ring =
                isCorrectShown
                  ? `0 0 0 2px ${theme.accentGreen} inset`
                  : "none";

              return (
                <button
                  key={d}
                  disabled={!isEnabled || !isRunning}
                  onClick={() => handleAnswer(d)}
                  style={{
                    background: baseBg,
                    color,
                    border: `1px solid ${theme.border}`,
                    borderRadius: 10,
                    padding: "12px 10px",
                    fontWeight: 600,
                    cursor: isEnabled && isRunning ? "pointer" : "not-allowed",
                    boxShadow: ring as any,
                  }}
                >
                  {d}
                </button>
              );
            })}
          </div>

          {/* Feedback line */}
          <div style={{ textAlign: "center", marginTop: 14, minHeight: 22 }}>
            {lastAnswerCorrect === true && (
              <span style={{ color: theme.accentGreen }}>Correct!</span>
            )}
            {lastAnswerCorrect === false && (
              <span style={{ color: theme.accentRed }}>
                Incorrect — listen again and try the next one.
              </span>
            )}
          </div>
        </div>

        {/* Stats */}
        <div
          style={{
            marginTop: 14,
            display: "flex",
            alignItems: "center",
            gap: 14,
            color: theme.textSecondary,
            fontSize: 14,
          }}
        >
          <div>
            <strong style={{ color: theme.textPrimary }}>{stats.correct}</strong> / {stats.total} correct
          </div>
          <div>Streak: <strong style={{ color: theme.textPrimary }}>{stats.streak}</strong></div>
        </div>

        {/* Helpers */}
        <div
          style={{
            marginTop: 10,
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
          }}
        >
          <button
            onClick={() => playDegreeSequence(["1"], 1, 0.9)}
            style={ghostBtnStyle()}
            title="Play tonic (1)"
          >
            Play 1
          </button>
          <button
            onClick={() => playDegreeSequence(["1", "3", "5"], 220, 0.95)}
            style={ghostBtnStyle()}
            title="Play 1-3-5"
          >
            1–3–5
          </button>
          <button
            onClick={() => playDegreeSequence(["5", "1"], 220, 0.95)}
            style={ghostBtnStyle()}
            title="Play 5-1"
          >
            5–1
          </button>
        </div>
      </div>
    </div>
  );
}

function ghostBtnStyle(): React.CSSProperties {
  return {
    background: "transparent",
    color: theme.textSecondary,
    border: `1px solid ${theme.border}`,
    borderRadius: 999,
    padding: "8px 12px",
    cursor: "pointer",
    fontSize: 14,
  };
}