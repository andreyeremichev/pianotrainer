
"use client";

import React, { forwardRef, useImperativeHandle, useMemo, useRef, useState } from "react";

type Oct = 2 | 3 | 4 | 5 | 6;
type Letter =
  | "C" | "C#" | "Db" | "D" | "D#" | "Eb" | "E"
  | "F" | "F#" | "Gb" | "G" | "G#" | "Ab"
  | "A" | "A#" | "Bb" | "B";

export type NoteName =
  `${Exclude<Letter, "Db"|"Eb"|"Gb"|"Ab"|"Bb">}${Oct}` |
  `${"Db"|"Eb"|"Gb"|"Ab"|"Bb"}${Oct}`;

export type Verdict = "correct" | "wrong";

export interface KeyboardRef {
  highlight(note: NoteName, verdict: Verdict): void; // 1s flash
  clear(note?: NoteName): void;
}

type Props = {
  judge?: (note: NoteName) => Verdict | undefined;
  onKeyDown?: (note: NoteName) => void;
  onKeyDone?: (note: NoteName) => void;
  /** NEW: fired with MIDI number for pressed key (C2=36 .. C6=84) */
  onKeyPress?: (midi: number) => void;
};

const WHITE_W = 30;
const WHITE_H = 110;
const BLACK_W = 18;   // ~60% of white width
const BLACK_H = 70;

/** MIDI mapping helpers */
const PC: Record<Exclude<Letter, "Db"|"Eb"|"Gb"|"Ab"|"Bb">, number> = {
  C:0, "C#":1, D:2, "D#":3, E:4, F:5, "F#":6, G:7, "G#":8, A:9, "A#":10, B:11,
};
const FLAT_TO_SHARP: Record<"Db"|"Eb"|"Gb"|"Ab"|"Bb", keyof typeof PC> = {
  Db:"C#", Eb:"D#", Gb:"F#", Ab:"G#", Bb:"A#",
};
function noteToMidi(note: NoteName): number {
  const oct = Number(note.slice(-1)) as Oct;
  const base = note.slice(0, -1) as Letter;
  const sharpBase = (base.includes("b") ? FLAT_TO_SHARP[base as keyof typeof FLAT_TO_SHARP] : base) as keyof typeof PC;
  const pc = PC[sharpBase];
  return (oct + 1) * 12 + pc;
}

/** Build exact C2..C6: 29 whites (C2..B5 + C6) and 20 blacks. */
function buildKeyboard() {
  const whiteCycle: Array<"C"|"D"|"E"|"F"|"G"|"A"|"B"> = ["C","D","E","F","G","A","B"];
  const hasBlackAfter = (wIdxInOct: number) => ![2,6].includes(wIdxInOct); // no black after E or B

  type WhiteKey = { note: NoteName; x: number; octave: Oct; letter: typeof whiteCycle[number] };
  type BlackKey = { noteSharp: NoteName; noteFlat: NoteName; x: number; octave: Oct; between: string };

  const whites: WhiteKey[] = [];
  const blacks: BlackKey[] = [];

  let x = 0;
  for (let oct = 2 as Oct; oct <= 6; oct = (oct + 1) as Oct) {
    for (let wi = 0; wi < whiteCycle.length; wi++) {
      const letter = whiteCycle[wi];
      const isTopC6 = (oct === 6 && letter !== "C");
      if (isTopC6) break; // in octave 6 we only draw C6

      const note = `${letter}${oct}` as NoteName;
      whites.push({ note, x, octave: oct, letter });

      // Place the black between this white and the next (except after E/B)
      if (hasBlackAfter(wi) && !(oct === 6 && letter === "C")) {
        const centerBetween = x + WHITE_W;
        const bx = centerBetween - BLACK_W / 2;

        const sharpMap: Record<string, string> = {
          C: "C#", D: "D#", F: "F#", G: "G#", A: "A#",
        };
        const flatPair: Record<string, string> = {
          "C#": "Db", "D#": "Eb", "F#": "Gb", "G#": "Ab", "A#": "Bb",
        };
        const sharp = `${sharpMap[letter]}${oct}` as NoteName;
        const flat  = `${flatPair[sharpMap[letter]]}${oct}` as NoteName;

        blacks.push({
          noteSharp: sharp,
          noteFlat: flat,
          x: bx,
          octave: oct,
          between: `${letter}-${whiteCycle[(wi + 1) % 7]}`,
        });
      }

      x += WHITE_W;
    }
  }

  const width = whites.length * WHITE_W; // 29 * 30 = 870
  return { whites, blacks, width };
}

const { whites: WHITE_KEYS, blacks: BLACK_KEYS, width: KEYBOARD_W } = buildKeyboard();

/* --- helpers for labels --- */
function isBlackKey(note: NoteName) {
  return note.includes("#") || note.includes("b");
}
function stripOct(note: NoteName) {
  return note.slice(0, -1); // remove last char (octave digit)
}
function prettyBase(nameNoOct: string) {
  return nameNoOct.replaceAll("#", "♯").replaceAll("b", "♭");
}
function enharmonicLabelNoOct(sharpOrFlat: NoteName) {
  // Return "C♯/D♭" without octave
  const base = stripOct(sharpOrFlat);
  const sharpToFlat: Record<string,string> = { "C#":"D♭", "D#":"E♭", "F#":"G♭", "G#":"A♭", "A#":"B♭" };
  const flatToSharp: Record<string,string> = { "Db":"C♯", "Eb":"D♯", "Gb":"F♯", "Ab":"G♯", "Bb":"A♯" };
  if (base.includes("#")) return `${prettyBase(base)}/${sharpToFlat[base]}`;
  if (base.includes("b")) return `${flatToSharp[base]}/${prettyBase(base)}`;
  return prettyBase(base);
}
function centerOfWhite(note: NoteName) {
  const idx = WHITE_KEYS.findIndex(k => k.note === note);
  return idx >= 0 ? WHITE_KEYS[idx].x + WHITE_W / 2 : 0;
}

/* ---------- TS-friendly state types (only change) ---------- */
type NoteVerdicts = Partial<Record<NoteName, Verdict>>;
type NoteFlags   = Partial<Record<NoteName, boolean>>;
type NoteTimers  = Partial<Record<NoteName, number>>;

export const ResponsiveKeyboardC2toC6 = forwardRef<KeyboardRef, Props>(function Keyboard({ judge, onKeyDown, onKeyDone, onKeyPress }, ref) {
  const [highlight, setHighlight] = useState<NoteVerdicts>({});
  const [pressedLabels, setPressedLabels] = useState<NoteFlags>({});
  const timersRef = useRef<NoteTimers>({});

  useImperativeHandle(ref, () => ({
    highlight(note: NoteName, verdict: Verdict) { flash(note, verdict); },
    clear(note?: NoteName) {
      if (note) clearOne(note);
      else Object.keys(timersRef.current).forEach(n => clearOne(n as NoteName));
    }
  }));

  function clearOne(note: NoteName) {
    if (timersRef.current[note]) {
      window.clearTimeout(timersRef.current[note] as number);
      delete timersRef.current[note];
    }
    setHighlight(h => ({ ...h, [note]: undefined }));
    setPressedLabels(l => ({ ...l, [note]: false }));
    onKeyDone?.(note);
  }

  function flash(note: NoteName, verdict: Verdict) {
    if (timersRef.current[note]) window.clearTimeout(timersRef.current[note] as number);
    setHighlight(h => ({ ...h, [note]: verdict }));
    setPressedLabels(l => ({ ...l, [note]: true }));
    timersRef.current[note] = window.setTimeout(() => clearOne(note), 1000);
  }

  function handlePress(note: NoteName) {
    onKeyDown?.(note);
    onKeyPress?.(noteToMidi(note)); // ← NEW: emit MIDI number
    const v = judge?.(note);
    flash(note, v ?? "correct");
  }

  const C4X = useMemo(() => centerOfWhite("C4"), []);

  return (
    <svg
      viewBox={`0 0 ${KEYBOARD_W} ${WHITE_H}`}
      preserveAspectRatio="xMidYMid meet"
      aria-label="Responsive Keyboard C2–C6"
      style={{ width: "100%", height: "100%", display: "block" }}
    >
      {/* Whites */}
      {WHITE_KEYS.map(k => {
        const id = `W_${k.note}`;
        const verdict = highlight[k.note];
        const fill = verdict === "correct" ? "#6BCB77" : verdict === "wrong" ? "#FF6B6B" : "#fff";
        const labelText = prettyBase(stripOct(k.note)); // e.g., "C" (no octave)
        return (
          <g key={id}>
            <rect
              id={id}
              x={k.x}
              y={0}
              width={WHITE_W}
              height={WHITE_H}
              fill={fill}
              stroke="#000"
              strokeWidth={1}
              onMouseDown={() => handlePress(k.note)}
              onTouchStart={(e) => { e.preventDefault(); handlePress(k.note); }}
            />
            {/* Always-visible C4 guidance */}
            {k.note === "C4" && (
              <text x={k.x + WHITE_W / 2} y={WHITE_H - 4} textAnchor="middle" fontSize={10}>C4</text>
            )}
            {/* Press label for whites — aligned with black labels */}
            {pressedLabels[k.note] && !isBlackKey(k.note) && (
              <text x={k.x + WHITE_W / 2} y={BLACK_H + 10} textAnchor="middle" fontSize={9}>
                {labelText}
              </text>
            )}
          </g>
        );
      })}

      {/* Blacks (over whites) */}
      {BLACK_KEYS.map(k => {
        const sharpId = `B_${k.noteSharp}`;
        const noteToReport = k.noteSharp; // choose sharp as canonical
        const verdict = highlight[noteToReport];
        const fill = verdict === "correct" ? "#6BCB77" : verdict === "wrong" ? "#FF6B6B" : "#000";
        const labelText = enharmonicLabelNoOct(k.noteSharp); // e.g., "C♯/D♭" (no octave)

        return (
          <g key={sharpId}>
            <rect
              id={sharpId}
              x={k.x}
              y={0}
              width={BLACK_W}
              height={BLACK_H}
              rx={2}
              ry={2}
              fill={fill}
              stroke="#000"
              strokeWidth={1}
              onMouseDown={(e) => { e.stopPropagation(); handlePress(noteToReport); }}
              onTouchStart={(e) => { e.preventDefault(); e.stopPropagation(); handlePress(noteToReport); }}
            />
            {/* Press label (same Y as whites) */}
            {pressedLabels[noteToReport] && (
              <text x={k.x + BLACK_W / 2} y={BLACK_H + 10} textAnchor="middle" fontSize={9}>
                {labelText}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
});

export default ResponsiveKeyboardC2toC6;