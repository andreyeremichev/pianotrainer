"use client";

import React, { useMemo } from "react";

/** Minimal palette we need from the emotion */
export type EmotionPalette = {
  gradientTop: string;
  gradientBottom: string;
  trailColor: string; // key highlight color
};

export type KeyboardEmotionsProps = {
  activeChordSymbol: string | null;
  emotion: EmotionPalette;
  emotionLabel: string; // e.g. "Sadness", "Magic"
  highlightColorOverride?: string; // optional: use for borrowed chords etc.

};

/* =========================
   Chord symbol → triad notes
   ========================= */

const PITCHES = [
  "C",
  "C#",
  "D",
  "D#",
  "E",
  "F",
  "F#",
  "G",
  "G#",
  "A",
  "A#",
  "B",
];

function midiToNoteName(midi: number): string {
  const pc = PITCHES[midi % 12];
  const oct = Math.floor(midi / 12) - 1;
  return `${pc}${oct}`;
}

function triadFromChordName(name: string): string[] {
  const m = /^([A-G])(b|#)?(m|°|dim)?$/i.exec(name);
  if (!m) return [];
  const letter = m[1].toUpperCase();
  const acc = m[2] || "";
  const qual = (m[3] || "").toLowerCase();

  const basePCMap: Record<string, number> = {
    C: 0,
    D: 2,
    E: 4,
    F: 5,
    G: 7,
    A: 9,
    B: 11,
  };
  let pc = basePCMap[letter] ?? 0;
  if (acc === "#") pc = (pc + 1 + 12) % 12;
  if (acc === "b") pc = (pc - 1 + 12) % 12;

  let quality: "M" | "m" | "dim" = "M";
  if (qual === "m") quality = "m";
  if (qual === "°" || qual === "dim") quality = "dim";

  const steps =
    quality === "M" ? [0, 4, 7] : quality === "m" ? [0, 3, 7] : [0, 3, 6];

  const baseOct = 4;
  const rootMidi = (baseOct + 1) * 12 + pc;
  return steps.map((semi) => midiToNoteName(rootMidi + semi));
}

/* =========================
   Static keyboard C3–C6 (visual only)
   ========================= */

type Oct = 3 | 4 | 5 | 6;
type WhiteLetter = "C" | "D" | "E" | "F" | "G" | "A" | "B";

type NoteName =
  | `${"C" | "C#" | "D" | "D#" | "E" | "F" | "F#" | "G" | "G#" | "A" | "A#" | "B"}${Oct}`
  | `${"Db" | "Eb" | "Gb" | "Ab" | "Bb"}${Oct}`;

const WHITE_W = 30;
const WHITE_H = 145; // ~20% taller
const BLACK_W = 18;
const BLACK_H = 92;

type WhiteKey = { note: NoteName; x: number };
type BlackKey = { noteSharp: NoteName; noteFlat: NoteName; x: number };

function buildKeyboard() {
  const whiteCycle: WhiteLetter[] = ["C", "D", "E", "F", "G", "A", "B"];
  const hasBlackAfter = (wIdx: number) => ![2, 6].includes(wIdx); // no black after E or B

  const whites: WhiteKey[] = [];
  const blacks: BlackKey[] = [];

  let x = 0;
  for (let oct = 3 as Oct; oct <= 6; oct = (oct + 1) as Oct) {
    for (let wi = 0; wi < whiteCycle.length; wi++) {
      const letter = whiteCycle[wi];
      if (oct === 6 && letter !== "C") break; // only C6 in top octave

      const note = `${letter}${oct}` as NoteName;
      whites.push({ note, x });

      if (hasBlackAfter(wi) && !(oct === 6 && letter === "C")) {
        const center = x + WHITE_W;
        const bx = center - BLACK_W / 2;

        const sharpMap: Record<WhiteLetter, string> = {
          C: "C#",
          D: "D#",
          E: "", // unused
          F: "F#",
          G: "G#",
          A: "A#",
          B: "", // unused
        };

        const flatPair: Record<string, string> = {
          "C#": "Db",
          "D#": "Eb",
          "F#": "Gb",
          "G#": "Ab",
          "A#": "Bb",
        };

        const sharpBase = sharpMap[letter];
        if (sharpBase && flatPair[sharpBase]) {
          const sharp = `${sharpBase}${oct}` as NoteName;
          const flat = `${flatPair[sharpBase]}${oct}` as NoteName;
          blacks.push({ noteSharp: sharp, noteFlat: flat, x: bx });
        }
      }

      x += WHITE_W;
    }
  }

  const width = whites.length * WHITE_W;
  return { whites, blacks, width };
}

const { whites: WHITE_KEYS, blacks: BLACK_KEYS, width: KEYBOARD_W } =
  buildKeyboard();

/* =========================
   Helpers
   ========================= */

function stripOct(note: string) {
  return note.slice(0, -1);
}

function prettyBase(name: string) {
  return name.replaceAll("#", "♯").replaceAll("b", "♭");
}

/* =========================
   Component
   ========================= */

export default function KeyboardEmotions({
  activeChordSymbol,
  emotion,
  emotionLabel,
  highlightColorOverride,

}: KeyboardEmotionsProps) {
  const notes = useMemo(
    () => (activeChordSymbol ? triadFromChordName(activeChordSymbol) : []),
    [activeChordSymbol]
  );
  const highlighted = useMemo(() => new Set(notes), [notes]);
    const keyColor = highlightColorOverride ?? emotion.trailColor;

  return (
    <div style={{ marginTop: 16, marginBottom: 8 }}>
      {/* Dynamic label: emotion name */}
      <div
        style={{
          fontSize: 12,
          textAlign: "center",
          opacity: 0.9,
          marginBottom: 6,
          fontWeight: 600,
        }}
      >
        {emotionLabel}
      </div>

      <div
        style={{
          borderRadius: 12,
          padding: 8,
          background: `linear-gradient(135deg, ${emotion.gradientTop}, ${emotion.gradientBottom})`,
          boxShadow:
            "0 0 0 1px rgba(0,0,0,0.08), 0 12px 30px rgba(0,0,0,0.10)",
        }}
      >
        <div
          style={{
            borderRadius: 10,
            padding: 6,
            background: "rgba(255,255,255,0.96)",
          }}
        >
          <svg
            viewBox={`0 0 ${KEYBOARD_W} ${WHITE_H}`}
            preserveAspectRatio="xMidYMid meet"
            aria-label="Emotion Keyboard C3–C6"
            style={{ width: "100%", height: "100%", display: "block" }}
          >
            {/* White keys */}
            {WHITE_KEYS.map((k) => {
              const isHighlighted = highlighted.has(k.note);
              const fill = isHighlighted ? keyColor : "#ffffff";   // for whites
              const labelText = prettyBase(stripOct(k.note));

              return (
                <g key={k.note}>
                  <rect
                    x={k.x}
                    y={0}
                    width={WHITE_W}
                    height={WHITE_H}
                    fill={fill}
                    stroke="#000"
                    strokeWidth={1}
                  />
                  {k.note === "C4" && (
                    <text
                      x={k.x + WHITE_W / 2}
                      y={WHITE_H - 4}
                      textAnchor="middle"
                      fontSize={10}
                    >
                      C4
                    </text>
                  )}
                  {isHighlighted && (
                    <text
                      x={k.x + WHITE_W / 2}
                      y={WHITE_H - 20}
                      textAnchor="middle"
                      fontSize={9}
                      fill="#111827"
                    >
                      {labelText}
                    </text>
                  )}
                </g>
              );
            })}

            {/* Black keys */}
            {BLACK_KEYS.map((k) => {
              const isHighlighted =
                highlighted.has(k.noteSharp) || highlighted.has(k.noteFlat);
              const fill = isHighlighted ? keyColor : "#000000";   // for blacks
              const labelText = prettyBase(stripOct(k.noteSharp));

              return (
                <g key={k.noteSharp}>
                  <rect
                    x={k.x}
                    y={0}
                    width={BLACK_W}
                    height={BLACK_H}
                    rx={2}
                    ry={2}
                    fill={fill}
                    stroke="#000"
                    strokeWidth={1}
                  />
                  {isHighlighted && (
                    <text
                      x={k.x + BLACK_W / 2}
                      y={BLACK_H + 10}
                      textAnchor="middle"
                      fontSize={9}
                      fill="#111827"
                    >
                      {labelText}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
        </div>
      </div>
    </div>
  );
}