"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as Tone from "tone";
import { Renderer, Stave, StaveNote, Formatter, Voice, StaveConnector } from "vexflow";
import Link from "next/link";

/* Theme */
const theme = {
  bg: "#0B0F14",
  card: "#111820",
  border: "#1E2935",
  text: "#E6EBF2",
  muted: "#8B94A7",
  gold: "#EBCF7A",
  green: "#69D58C",
};

const MAX_LETTERS = 20;
type KeyName = "Aminor" | "Amajor";

/* ===== Helpers ===== */
function sanitizePhraseInput(s: string) {
  // allow letters, digits and spaces (we'll tokenize numbers separately)
  return s.replace(/[^A-Za-z0-9 ]+/g, "");
}
function countLetters(s: string) {
  return (s.match(/[A-Za-z]/g) || []).length;
}
function trimToMaxLetters(raw: string, max: number) {
  // keep spaces but cap total letters to MAX_LETTERS
  let letters = 0,
    out = "";
  for (const ch of raw) {
    if (/[A-Za-z]/.test(ch)) {
      if (letters >= max) break;
      letters++;
      out += ch;
    } else if (ch === " " || /[0-9]/.test(ch)) {
      out += ch;
    }
  }
  return out;
}
function ctaPieces(phrase: string) {
  const inside = trimToMaxLetters(sanitizePhraseInput(phrase), MAX_LETTERS) || "your words";
  return { t1: "Turn “", t2: inside, t3: "” into sound" };
}
function arrayBufferToBase64(buf: ArrayBuffer) {
  let b = "";
  const by = new Uint8Array(buf);
  for (let i = 0; i < by.byteLength; i++) b += String.fromCharCode(by[i]);
  return btoa(b);
}
async function fetchFontDataUrlOTF(path: string) {
  const r = await fetch(path, { cache: "no-cache" });
  if (!r.ok) throw new Error(path);
  return `url('data:font/opentype;base64,${arrayBufferToBase64(await r.arrayBuffer())}') format('opentype')`;
}
async function buildEmbeddedFontStyle() {
  let brav = "",
    bravT = "";
  try {
    brav = await fetchFontDataUrlOTF("/fonts/Bravura.otf");
    bravT = await fetchFontDataUrlOTF("/fonts/BravuraText.otf");
  } catch (e) {
    console.warn("font embed failed", e);
  }
  return `
  @font-face{font-family:'Bravura';src:${brav || "local('Bravura')"};font-weight:normal;font-style:normal;font-display:swap;}
  @font-face{font-family:'BravuraText';src:${bravT || "local('BravuraText')"};font-weight:normal;font-style:normal;font-display:swap;}
  svg,svg *{font-family:Bravura,BravuraText,serif!important;}
  `.trim();
}
function raf2() {
  return new Promise<void>((res) => requestAnimationFrame(() => requestAnimationFrame(() => res())));
}
// --- VexFlow display helpers (attach VF keys to events) ---
type EventLike = {
  t: number;             // start time (s)
  d: number;             // duration (s)
  noteNames?: string[];  // e.g., ["A3","C4","E4"]
  isRest?: boolean;
  vfKeys?: string[];     // e.g., ["a/3","c/4","e/4"]
  vfDuration?: string;   // "q" by default
};

function noteNameToVfKey(n: string): string {
  // "C#4" -> "c#/4"
  const m = /^([A-Ga-g])([#b]?)(-?\d+)$/.exec(n);
  if (!m) return "b/4"; // safe fallback
  const l = m[1].toLowerCase();
  const acc = m[2] || "";
  const oct = m[3];
  return `${l}${acc}/${oct}`;
}

function withDisplayKeys<T extends EventLike>(list: T[]): T[] {
  return list.map((ev) => {
    const names = ev.noteNames || [];
    const vf = names.map(noteNameToVfKey);
    return {
      ...ev,
      vfKeys: vf,
      isRest: names.length === 0 ? true : !!ev.isRest,
      vfDuration: ev.vfDuration || "q",
    };
  });
}

/* ===== Pitch helpers (A minor only) ===== */
const A_MINOR_PC = ["A", "B", "C", "D", "E", "F", "G"] as const;
type PC = (typeof A_MINOR_PC)[number];

function noteNameToMidi(n: string) {
  if (!n) throw new Error("bad note: " + n);

  // Trim and normalize
  const raw = String(n).trim();

  // Case 1: Standard "C#4" / "Bb3"
  let m = /^([A-Ga-g])([#b]?)(-?\d+)$/.exec(raw);
  if (m) {
    const L = m[1].toUpperCase();
    const acc = m[2] || "";
    const oct = parseInt(m[3], 10);
    const BASE: Record<string, number> = { C:0, D:2, E:4, F:5, G:7, A:9, B:11 };
    let pc = BASE[L];
    if (acc === "#") pc = (pc + 1) % 12;
    else if (acc === "b") pc = (pc + 11) % 12;
    return (oct + 1) * 12 + pc;
  }

  // Case 2: VexFlow "c#/4" / "b/3"
  m = /^([a-g])([#b]?)\/(-?\d+)$/.exec(raw);
  if (m) {
    const L = m[1].toUpperCase();
    const acc = m[2] || "";
    const oct = parseInt(m[3], 10);
    const BASE: Record<string, number> = { C:0, D:2, E:4, F:5, G:7, A:9, B:11 };
    let pc = BASE[L];
    if (acc === "#") pc = (pc + 1) % 12;
    else if (acc === "b") pc = (pc + 11) % 12;
    return (oct + 1) * 12 + pc;
  }

  throw new Error("bad note: " + raw);
}

function noteNameToVF(note: string) {
  const m = /^([A-Ga-g])([#b]?)(-?\d+)$/.exec(note)!;
  const l = m[1].toLowerCase(),
    a = (m[2] || "") as "" | "#" | "b",
    o = parseInt(m[3], 10);
  return { vfKey: `${a ? l + a : l}/${o}` };
}

function alphaIndex(ch: string) {
  return ch.toUpperCase().charCodeAt(0) - 65;
}
function letterToDegree(ch: string) {
  return ((alphaIndex(ch) % 7) + 1) as 1 | 2 | 3 | 4 | 5 | 6 | 7;
}
function degreeToPC(deg: 1 | 2 | 3 | 4 | 5 | 6 | 7): PC {
  return A_MINOR_PC[deg - 1];
}


/* ===== Number tokenizer (priority rules) ===== */
type NumToken =
  | { kind: "SINGLE"; value: number }
  | { kind: "TEEN"; value: number } // 10–19
  | { kind: "TENS"; value: number } // 20–90
  | { kind: "HUNDRED" } // 100 punctuation
  | { kind: "ZERO" }; // 0 (pedal/rest)

function tokenizeNumberString(digits: string): NumToken[] {
  const out: NumToken[] = [];
  let i = 0;
  while (i < digits.length) {
    // (1) "100"
    if (digits.slice(i, i + 3) === "100") {
      out.push({ kind: "HUNDRED" });
      i += 3;
      continue;
    }
    // (2) digit-0-digit → split as digit,100,digit
    if (i + 2 < digits.length && digits[i + 1] === "0" && digits[i] !== "0" && digits[i + 2] !== "0") {
      out.push({ kind: "SINGLE", value: parseInt(digits[i]) });
      out.push({ kind: "HUNDRED" });
      out.push({ kind: "SINGLE", value: parseInt(digits[i + 2]) });
      i += 3;
      continue;
    }
    // (3) Tens families 20,30,...,90
    const two = digits.slice(i, i + 2);
    if (/^[2-9]0$/.test(two)) {
      out.push({ kind: "TENS", value: parseInt(two) });
      i += 2;
      continue;
    }
    // (4) Teens 10–19
    if (/^1[0-9]$/.test(two)) {
      out.push({ kind: "TEEN", value: parseInt(two) });
      i += 2;
      continue;
    }
    // (5) Singles 1–9
    if (/[1-9]/.test(digits[i])) {
      out.push({ kind: "SINGLE", value: parseInt(digits[i]) });
      i += 1;
      continue;
    }
    // (6) Zero alone
    if (digits[i] === "0") {
      out.push({ kind: "ZERO" });
      i += 1;
      continue;
    }
    i++;
  }
  return out;
}

/* ===== Mixed tokenizer: letters/spaces/digits → stream ===== */
type StreamToken =
  | { t: "LETTER"; ch: string }
  | { t: "SPACE" }
  | { t: "NUM"; token: NumToken };

function tokenizeMixed(input: string): StreamToken[] {
  const out: StreamToken[] = [];
  let i = 0;
  while (i < input.length) {
    const ch = input[i];
    if (/[A-Za-z]/.test(ch)) {
      out.push({ t: "LETTER", ch });
      i++;
      continue;
    }
    if (ch === " ") {
      out.push({ t: "SPACE" });
      i++;
      continue;
    }
    if (/[0-9]/.test(ch)) {
      // consume a run of digits
      let j = i;
      while (j < input.length && /[0-9]/.test(input[j])) j++;
      const run = input.slice(i, j);
      tokenizeNumberString(run).forEach((nt) => out.push({ t: "NUM", token: nt }));
      i = j;
      continue;
    }
    i++;
  }
  return out;
}

/* ===== Chord palette (A natural minor) ===== */
type ChordDef = { pcs: PC[]; label?: string }; // define tones as pitch classes; we'll place them in A3–A4
const SINGLE_MAP: Record<number, ChordDef> = {
  1: { pcs: ["A", "C", "E"] },
  2: { pcs: ["B", "D", "F"] },
  3: { pcs: ["C", "E", "G"] },
  4: { pcs: ["D", "F", "A"] },
  5: { pcs: ["E", "G", "B"] },
  6: { pcs: ["F", "A", "C"] },
  7: { pcs: ["G", "B", "D"] },
  8: { pcs: ["A", "C", "E", "G"] },
  9: { pcs: ["C", "E", "G", "B"] },
};

const TEEN_MAP: Record<number, ChordDef> = {
  10: { pcs: ["A", "C", "E", "B"] }, // Am9
  11: { pcs: ["B", "D", "F", "A"] }, // Bdim7
  12: { pcs: ["C", "E", "G", "A"] }, // C6
  13: { pcs: ["D", "F", "A", "E"] }, // Dm9
  14: { pcs: ["E", "G", "B", "D"] }, // Em7
  15: { pcs: ["F", "A", "C", "E"] }, // Fmaj7
  16: { pcs: ["G", "B", "D", "E"] }, // G6
  17: { pcs: ["A", "C", "E", "B"] }, // Am(add9)
  18: { pcs: ["C", "E", "G", "F"] }, // Cadd11
  19: { pcs: ["E", "G", "B", "F"] }, // Em9
};

const TENS_MAP: Record<number, ChordDef> = {
  20: { pcs: ["C", "E", "A"] }, // Am 1sInv 
  30: { pcs: ["E", "A", "C"] }, // Am 2nsInv
  40: { pcs: ["F", "A", "D"] }, // Dm/F
  50: { pcs: ["G", "B", "E"] }, // Em/G
  60: { pcs: ["C", "F", "A"] }, // F/C
  70: { pcs: ["D", "G", "B"] }, // G/D
  80: { pcs: ["G", "C", "E"] }, // C/G
  90: { pcs: ["B", "E", "G"] }, // Em/B
};

// Cadence variants — we’ll render as compact A-minor color chords; rotate A→B→C
const CADENCE_VARIANTS: ChordDef[] = [
  { pcs: ["C", "E", "A", "F"], label: "100-A" }, // Perfect-like cluster
  { pcs: ["D", "F", "A"], label: "100-C" }, // Soft return
];

// place chord tones into A3–A4 compactly
function placeChordInA3A4(pcs: PC[]): string[] {
  // Start near C4/A3 region and clamp notes to [A3..A4]
  const MIN = noteNameToMidi("A3");
  const MAX = noteNameToMidi("A4");
  const guessOct = (pc: PC) => {
    // prefer lower for A,B,C; higher for D,E,F,G to distribute nicely
    if (pc === "A" || pc === "B" || pc === "C") return `${pc}3`;
    return `${pc}4`;
  };
  let notes = pcs.map(guessOct);
  // If any note outside range (due to guess rules), clamp
  notes = notes.map((n) => {
    let m = noteNameToMidi(n);
    if (m < MIN) {
      const up = n.replace(/(\d+)$/, (d) => String(parseInt(d) + 1));
      return up;
    }
    if (m > MAX) {
      const down = n.replace(/(\d+)$/, (d) => String(parseInt(d) - 1));
      return down;
    }
    return n;
  });

  // If still duplicates on same pitch, nudge one up/down within bounds
  const seen = new Map<number, number>();
  notes = notes.map((n) => {
    let m = noteNameToMidi(n);
    if (!seen.has(m)) {
      seen.set(m, 1);
      return n;
    }
    // try nudging up
    const up = n.replace(/(\d+)$/, (d) => String(parseInt(d) + 1));
    const mu = noteNameToMidi(up);
    if (mu <= MAX && !seen.has(mu)) {
      seen.set(mu, 1);
      return up;
    }
    // try down
    const dn = n.replace(/(\d+)$/, (d) => String(parseInt(d) - 1));
    const md = noteNameToMidi(dn);
    if (md >= MIN && !seen.has(md)) {
      seen.set(md, 1);
      return dn;
    }
    return n;
  });

  // Limit to 4 notes (drop color tones: 7th→9th→11th)
  if (notes.length > 4) {
    // heuristic: sort by importance root/3rd/5th favored
    const imp = (pc: PC) => (pc === "A" || pc === "C" || pc === "E" ? 0 : 1);
    notes = notes
      .map((n) => ({ n, pc: n[0] as PC }))
      .sort((a, b) => imp(a.pc) - imp(b.pc))
      .slice(0, 4)
      .map((x) => x.n);
  }
  return notes;
}

/* ===== Scheduling & event building ===== */
type Event =
  | { kind: "MELODY"; notes: string[]; label?: string; dur: number; clef: "treble" | "bass" }
  | { kind: "CHORD"; notes: string[]; label?: string; dur: number; clef: "treble" | "bass" }
  | { kind: "REST"; dur: number; label?: string };

const WEIGHTS = {
  SINGLE: 1.0,
  TEEN: 1.25,
  TENS: 1.25,
  HUNDRED: 1.0, // plus 0.125 rest handled separately
  HUNDRED_REST: 0.125,
  ZERO: 0.5, // pedal/rest
  SPACE: 0.5, // space between words
};
const TARGET_SECONDS = 8.0;
const MIN_EVENT = 0.18;
const MIN_REST = 0.08;
// build events from mixed tokens, then normalize durations to 8s, apply cadence spacing merge
function buildEvents(input: string): {
  events: Event[];
  cadenceLabels: string[];
} {
  // Build draft events directly (letters, spaces, digit-runs)
const eventsDraft: { type: "melody" | "chord" | "rest" | "zero"; data?: any; weight: number; label?: string }[] = [];

const s = input || "";
let i = 0;
while (i < s.length) {
  const ch = s[i];

  // spaces → rest (word gap)
  if (ch === " ") {
    eventsDraft.push({ type: "rest", weight: 0.5, data: { kind: "SPACE" } });
    i++;
    continue;
  }

  // letters → melody
  if (/[A-Za-z]/.test(ch)) {
    eventsDraft.push({ type: "melody", weight: 1.0, data: { char: ch } });
    i++;
    continue;
  }

  // digits → handle runs
  if (/\d/.test(ch)) {
    let j = i;
    while (j < s.length && /\d/.test(s[j])) j++;
    const run = s.slice(i, j); // e.g., "123", "90", "0", "1109"
      // Policy for length > 3: digit-by-digit; 0 → tick, others → single chord
  if (run.length > 3) {
    for (let k = 0; k < run.length; k++) {
      const d = parseInt(run[k], 10);
      if (d === 0) {
        eventsDraft.push({ type: "zero",  weight: WEIGHTS.ZERO, data: { kind: "ZERO", from: run } });
      } else {
        eventsDraft.push({ type: "chord", weight: WEIGHTS.SINGLE, data: { digit: d, from: run } });
      }
    }
    i = j;
    continue;
  }
      // EXACT 100 → cadence token + short rest
  if (run === "100") {
    eventsDraft.push({ type: "chord", weight: WEIGHTS.HUNDRED, data: { digit: 100, from: run } });
    eventsDraft.push({ type: "rest",  weight: WEIGHTS.HUNDRED_REST, data: { kind: "CAD_REST", from: run } });
    i = j;
    continue;
  }

   // 3-digit run starting with '1' (handles all 1xx as 100 + remainder)
// Note: exact "100" is handled earlier by the dedicated branch.
if (run.length === 3 && run[0] === "1") {
  if (run === "100") { /* exact handled earlier */ i = j; continue; }

  const bc = parseInt(run.slice(1), 10); // last two digits (00..99)

  // Always emit 100 first
  eventsDraft.push({
    type: "chord",
    weight: WEIGHTS.HUNDRED,
    data: { digit: 100, from: run }
  });

  // Then handle the remainder (bc)
  if (bc === 0) {
    // e.g., 100 → nothing more here (the exact case above already caught it)
  } else if (bc >= 10 && bc <= 19) {
    // teens
    eventsDraft.push({
      type: "chord",
      weight: WEIGHTS.TEEN,
      data: { digit: bc, from: run }
    });
  } else if (bc >= 20 && bc % 10 === 0) {
    // exact tens (20,30,...90)
    eventsDraft.push({
      type: "chord",
      weight: WEIGHTS.TENS,
      data: { digit: bc, from: run }
    });
  } else if (bc >= 20) {
    // tens + unit (e.g., 26 → 20 + 6)
    const tens  = Math.floor(bc / 10) * 10;
    const units = bc % 10;
    eventsDraft.push({
      type: "chord",
      weight: WEIGHTS.TENS,
      data: { digit: tens, from: run }
    });
    eventsDraft.push({
      type: "chord",
      weight: WEIGHTS.SINGLE,
      data: { digit: units, from: run }
    });
  } else { // 1..9
    eventsDraft.push({
      type: "chord",
      weight: WEIGHTS.SINGLE,
      data: { digit: bc, from: run }
    });
  }

  i = j;
  continue;
} 
// 3-digit run NOT starting with '1' → a + 100 + (bc)
if (run.length === 3 && run[0] !== "1") {
  const a  = parseInt(run[0], 10);       // hundreds digit
  const bc = parseInt(run.slice(1), 10); // last two digits (00..99)

  // a (single) — skip if 0
  if (a !== 0) {
    eventsDraft.push({
      type: "chord",
      weight: WEIGHTS.SINGLE,
      data: { digit: a, from: run }
    });
  }

  // + 100 (cadence chord)
  eventsDraft.push({
    type: "chord",
    weight: WEIGHTS.HUNDRED,
    data: { digit: 100, from: run }
  });

  // bc
  if (bc === 0) {
    // nothing more (e.g., 300 → 3 + 100)
  } else if (bc >= 10 && bc <= 19) {
    eventsDraft.push({
      type: "chord",
      weight: WEIGHTS.TEEN,
      data: { digit: bc, from: run }
    });
  } else if (bc >= 20 && bc % 10 === 0) {
    eventsDraft.push({
      type: "chord",
      weight: WEIGHTS.TENS,
      data: { digit: bc, from: run }
    });
  } else if (bc >= 20) {
    const tens  = Math.floor(bc / 10) * 10;
    const units = bc % 10;
    eventsDraft.push({
      type: "chord",
      weight: WEIGHTS.TENS,
      data: { digit: tens, from: run }
    });
    eventsDraft.push({
      type: "chord",
      weight: WEIGHTS.SINGLE,
      data: { digit: units, from: run }
    });
  } else { // 1..9
    eventsDraft.push({
      type: "chord",
      weight: WEIGHTS.SINGLE,
      data: { digit: bc, from: run }
    });
  }

  i = j;
  continue;
}


    // Teens (10–19) as a single token
    const n = parseInt(run, 10);
    if (run.length === 2 && n >= 10 && n <= 19) {
      eventsDraft.push({ type: "chord", weight: 1.25, data: { digit: n, from: run } });
      i = j;
      continue;
    }

    // Two-digit non-zero (like 21, 32, 47, …)
if (run.length === 2 && n > 20 && n < 100 && n % 10 !== 0) {
  const tens = Math.floor(n / 10) * 10;
  const units = n % 10;
  eventsDraft.push({ type: "chord", weight: 1.25, data: { digit: tens, from: run } });
  eventsDraft.push({ type: "chord", weight: 1.0, data: { digit: units, from: run } });
  i = j;
  continue;
}

    // Tens families (20,30,…,90)
    if (run.length === 2 && n % 10 === 0 && n >= 20 && n <= 90) {
      eventsDraft.push({ type: "chord", weight: 1.25, data: { digit: n, from: run } });
      i = j;
      continue;
    }

    // Singles within the run (e.g., “909” → 9, 0(rest), 9)
    for (let k = 0; k < run.length; k++) {
      const d = parseInt(run[k], 10);
      if (d === 0) {
        eventsDraft.push({ type: "rest", weight: 0.5, data: { kind: "ZERO", from: run } });
      } else {
        eventsDraft.push({ type: "chord", weight: 1.0, data: { digit: d, from: run } });
      }
    }
    i = j;
    continue;
  }

  // anything else → skip
  i++;
}

  
  // cadence rotation
  let cadenceRot = 0;

  
// normalize to 8s (no legacy {kind,notes,clef}; just assign t & d to draft)
const totalWeight = eventsDraft.reduce((s, e) => s + e.weight, 0) || 1;
const unit = TARGET_SECONDS / totalWeight;

let cursorTime = 0;
const timedDraft = eventsDraft.map((e) => {
  const d = Math.max(e.type === "rest" ? MIN_REST : MIN_EVENT, e.weight * unit);
  const out = { ...e, t: cursorTime, d };
  cursorTime += d;
  return out;
});

  // cadence spacing: merge cadence (CHORD with label 100-*) if < 2.0s since last cadence
  let time = 0;
  let lastCadenceAt = -999;
  
  
  // Derive the exact letter sequence from input for melody events
const lettersSeq = (input || "").replace(/[^A-Za-z]/g, "").toUpperCase();
let letterCursor = 0;

  
  const A_MINOR_SCALE = ["A","B","C","D","E","F","G"];

const final: any[] = timedDraft.map((e, i) => {
  let noteNames: string[] = [];
  let isRest = false;

  if (e.type === "rest") {
    isRest = true;

  } else if (e.type === "melody") {
    // Pick the NEXT real letter from the original input ("abc 123" → A, then B, then C)
    const letter = lettersSeq[letterCursor++] || "A";
    const idx = (letter.charCodeAt(0) - 65) % 7; // 0..6 → A..G
    const pc = A_MINOR_SCALE[idx];
    const oct = pc === "A" ? 3 : 4; // A on bass (A3); others on treble (…4)
    noteNames = [`${pc}${oct}`];

      } else if (e.type === "zero") {
    // 0 → short A3 “tick” on bass
    noteNames = ["A3"];

  } else if (e.type === "chord") {
    const d = Number(e.data?.digit ?? 1);

    // Pick chord definition by digit from your maps:
    let def: ChordDef | undefined =
      (SINGLE_MAP as any)[d] ||
      (TEEN_MAP as any)[d]   ||
      (TENS_MAP as any)[d];

    // Cadence rotation for 100
    if (d === 100) {
      const cadIdx = i % CADENCE_VARIANTS.length; // simple A→B→A→…
      def = CADENCE_VARIANTS[cadIdx];
    }

    // Fallback safety
    if (!def) def = SINGLE_MAP[1];

    // Place PCs into A3–A4 compactly
    noteNames = placeChordInA3A4(def.pcs);
  }

  return {
    ...e,
    noteNames,
    vfKeys: noteNames.map(noteNameToVfKey),
    isRest,
    vfDuration: "q",
    t: (e as any).t,
    d: (e as any).d,
  };
});

const finalEvents = withDisplayKeys(final);

  return { events: finalEvents};
}
/* ===== VexFlow mapping from events (visual quarters; rests visible) ===== */
function eventsToVexflowNotes(events: Event[]) {
  // For simplicity and VexFlow stability, render each event as a quarter (or quarter rest).
  // Audio uses precise normalized durations.
  const treble: (StaveNote | null)[] = [];
  const bass: (StaveNote | null)[] = [];

  for (const ev of events) {
    if (ev.kind === "REST") {
      // render as rest in both staves only once: place in treble to keep layout simple
      const r = new StaveNote({ keys: ["b/4"], duration: "qr", clef: "treble" }).setStyle({ fillStyle: "#111820", strokeStyle: "#111820" });
      treble.push(r);
      continue;
    }
    const keys = ev.notes.map((n) => noteNameToVF(n).vfKey);
    const duration = "q";
    const note = new StaveNote({ keys, duration, clef: ev.clef });
    // tiny text label for numeric tokens/cadences
    if (ev.label) {
      (note as any).addModifier?.(
        new (window as any).Vex.Flow.Annotation(ev.label)
          .setFont("BravuraText, serif", 11, "normal")
          .setVerticalJustification((window as any).Vex.Flow.Annotation.VerticalJustify.TOP),
        0
      );
    }
    if (ev.clef === "treble") treble.push(note);
    else bass.push(note);
  }
  return { treble: treble.filter(Boolean) as StaveNote[], bass: bass.filter(Boolean) as StaveNote[] };
}
/* ===== Component state ===== */
export default function WordsToNotesViralPage() {
  const [keyName] = useState<KeyName>("Aminor"); // locked to Aminor for palette; keep prop for signature glyphs
  const [phrase, setPhrase] = useState("");
  const lettersCount = useMemo(() => countLetters(phrase), [phrase]);
  const charCount = (phrase.match(/[A-Za-z0-9]/g) || []).length;
const canPlay = charCount > 0 && charCount <= MAX_LETTERS;

  const [lastEnterAt, setLastEnterAt] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const isPlayingRef = useRef(false);
  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  const staveHostRef = useRef<HTMLDivElement | null>(null);
  const [resizeTick, setResizeTick] = useState(0);
  useEffect(() => {
    const onR = () => setResizeTick((t) => t + 1);
    window.addEventListener("resize", onR);
    window.addEventListener("orientationchange", onR);
    return () => {
      window.removeEventListener("resize", onR);
      window.removeEventListener("orientationchange", onR);
    };
  }, []);
// events + visible index (animation)
type VFEvent = {
  t: number;              // start time (s)
  d: number;              // duration (s)
  noteNames?: string[];   // audio notes, e.g. ["A3","C4","E4"]
  vfKeys?: string[];      // display keys for VexFlow, e.g. ["a/3","c/4","e/4"]
  isRest?: boolean;       // true only when no notes to play
  vfDuration?: string;    // "q" by default
};

const [events, setEvents] = useState<VFEvent[]>([]);
const [visibleCount, setVisibleCount] = useState(0);

  // audio
  const samplerRef = useRef<Tone.Sampler | null>(null);
  const timeoutsRef = useRef<number[]>([]);
  function clearAllTimers() {
    for (const id of timeoutsRef.current) clearTimeout(id);
    timeoutsRef.current = [];
  }
  async function createSamplerForNotes(names: string[]) {
  // dispose old sampler if any
  if (samplerRef.current) {
    try { samplerRef.current.dispose(); } catch {}
    samplerRef.current = null;
  }

  // build unique URL map for Tone.Sampler
  const urls: Record<string, string> = {};
  for (const n of Array.from(new Set(names))) {
    urls[n] = `${n.replace("#", "%23")}.wav`;
  }

  samplerRef.current = new Tone.Sampler({
    urls,
    baseUrl: "/audio/notes/",
  }).toDestination();

  await Tone.loaded();
}

  function triggerNow(notes: string[], seconds: number, isMelody = false) {
    const s = samplerRef.current;
    if (!s || notes.length === 0) return;
    try {
      if (isMelody) {
        // slightly softer + tiny legato on vowels: emulate with small overlap
        s.triggerAttackRelease(notes[0], Math.max(0.12, seconds * 0.9));
      } else {
        // chord: hit together
        (s as any).triggerAttackRelease(notes, Math.max(0.12, seconds * 0.9));
      }
    } catch {}
  }
const start = useCallback(async () => {
  if (!canPlay || isPlaying) return;

  try { (document.activeElement as HTMLElement | null)?.blur(); } catch {}

  // 1) Build events from current phrase
  const input = trimToMaxLetters(sanitizePhraseInput(phrase), MAX_LETTERS);
  const { events: built, cadenceLabels } = buildEvents(input);
  const playable = withDisplayKeys(built);
  setEvents(playable);
  setVisibleCount(0);
  await raf2();

  // (Optional) log cadence variants used
  if (cadenceLabels?.length) console.log("[cadences]", cadenceLabels.join(" · "));

  // 2) Prepare audio (collect all note names)
  const allNoteNames = Array.from(new Set(playable.flatMap(ev => ev.noteNames || [])));

  await Tone.start();
  await createSamplerForNotes(allNoteNames);

  // 3) Schedule audio + animation
  setIsPlaying(true);
  isPlayingRef.current = true;
  clearAllTimers();

  const timers: number[] = [];
  const lastEnd = playable.reduce((mx, ev) => Math.max(mx, (ev.t ?? 0) + (ev.d ?? 0)), 0);

  // Per-event scheduling
  for (let i = 0; i < playable.length; i++) {
    const ev = playable[i];
    const startMs = Math.max(0, Math.round((ev.t ?? 0) * 1000));

    // advance visible notes at event start
    const visId = window.setTimeout(() => {
      if (!isPlayingRef.current) return;
      setVisibleCount(i + 1);
    }, startMs);
    timers.push(visId);

    // trigger audio (only if there are notes)
    if (ev.noteNames && ev.noteNames.length) {
      const trigId = window.setTimeout(() => {
        if (!isPlayingRef.current) return;
        try { ev.noteNames!.forEach(n => triggerNow(n)); } catch {}
      }, startMs);
      timers.push(trigId);
    }
  }

  // Stop after clip end (+ small guard)
  const endId = window.setTimeout(() => {
    if (!isPlayingRef.current) return;
    clearAllTimers();
    setVisibleCount(playable.length);
    setIsPlaying(false);
    isPlayingRef.current = false;
  }, Math.round((lastEnd + 0.2) * 1000));
  timers.push(endId);

  // track timers for global clear
  timeoutsRef.current.push(...timers);
}, [canPlay, isPlaying, phrase]);

  const stop = useCallback(() => {
    clearAllTimers();
    setIsPlaying(false);
    isPlayingRef.current = false;
  }, []);

  // restore frozen
  useEffect(() => {
    if (typeof window === "undefined") return;
    const sp = new URLSearchParams(window.location.search);
    const k = sp.get("key");
    const p = sp.get("phrase") || sp.get("q") || "";
    if (!k && !p) return;
    const trimmed = trimToMaxLetters(sanitizePhraseInput(p), MAX_LETTERS);
    if (!trimmed) return;
    setPhrase(trimmed);
    const { events: built } = buildEvents(trimmed);
    setEvents(built);
    setVisibleCount(built.length);
    setIsPlaying(false);
    isPlayingRef.current = false;
    clearAllTimers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
    // ===== Share and Link states (restore) =====
  const [linkCopied, setLinkCopied] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

  function buildShareUrl() {
    const url = new URL(window.location.href);
    url.searchParams.set("key", "Aminor");
    url.searchParams.set("phrase", phrase);
    url.searchParams.set("utm_source", "share");
    url.searchParams.set("utm_medium", "social");
    url.searchParams.set("utm_campaign", "words_to_notes");
    return url.toString();
  }

  function buildTweetIntent(text: string, url: string, hashtags = ["piano","music","pianotrainer"]) {
    const u = new URL("https://twitter.com/intent/tweet");
    u.searchParams.set("text", text);
    u.searchParams.set("url", url);
    u.searchParams.set("hashtags", hashtags.join(","));
    return u.toString();
  }

  /* =========================
   * VexFlow: render staff
   * ========================= */
  useEffect(() => {
    const host = staveHostRef.current;
    if (!host) return;

    host.innerHTML = "";
    const rect = host.getBoundingClientRect();
    const width = Math.floor(rect.width);
    const height = 260;

    const renderer = new Renderer(host, Renderer.Backends.SVG);
    renderer.resize(width, height);
    const ctx = renderer.getContext();

    // Responsive left/right paddings (unchanged)
    let LEFT = 20, RIGHT = 28;
    if (width <= 390) { LEFT = 16; RIGHT = 18; }
    if (width <= 360) { LEFT = 14; RIGHT = 16; }
    if (width <= 344) { LEFT = 12; RIGHT = 14; }

    const innerWidth = width - LEFT - RIGHT;
    const trebleY = 16, bassY = 120;
    const keySpec = "Am"; // hard-locked to A natural minor for this tool

    const treble = new Stave(LEFT, trebleY, innerWidth);
    treble.addClef("treble").addKeySignature(keySpec).setContext(ctx).draw();

    const bass = new Stave(LEFT, bassY, innerWidth);
    bass.addClef("bass").addKeySignature(keySpec).setContext(ctx).draw();

    // Brace + barlines
    const Type = (StaveConnector as any).Type ?? (StaveConnector as any).type ?? {};
    new (StaveConnector as any)(treble, bass).setType(Type.BRACE).setContext(ctx).draw(); 
    new (StaveConnector as any)(treble, bass).setType(Type.SINGLE_LEFT).setContext(ctx).draw();
    new (StaveConnector as any)(treble, bass).setType(Type.SINGLE_RIGHT).setContext(ctx).draw();

    if (!events.length || visibleCount === 0) return;

    // Take only visible events
    const vis = events.slice(0, Math.min(visibleCount, events.length));

    // Split keys by clef per event
    function parseOct(key: string) {
      // key format like "c/4", "e/5"
      const parts = key.split("/");
      const oct = parseInt(parts[1], 10);
      return isNaN(oct) ? 4 : oct;
    }

    const trebleTickables = [];
    const bassTickables = [];

    const MIDI_B4 = noteNameToMidi("B4"); // treble middle line
const MIDI_D3 = noteNameToMidi("D3"); // bass middle line

function vfKeyToMidi(k: string) { return noteNameToMidi(k); }

// decide stem by average pitch vs middle line (ties → down)
function stemForTreble(keys: string[]) {
  if (!keys.length) return 1;
  const avg = keys.reduce((s,k)=>s+vfKeyToMidi(k),0)/keys.length;
  return avg <= MIDI_B4 ? 1 : -1; // ≤ middle → up, > middle → down
}
function stemForBass(keys: string[]) {
  if (!keys.length) return 1;
  const avg = keys.reduce((s,k)=>s+vfKeyToMidi(k),0)/keys.length;
  return avg <= MIDI_D3 ? 1 : -1; // ≤ middle → up, > middle → down
}

   for (const ev of vis) {
  const dur = ev.vfDuration || "q";
  const MIDI_B4 = noteNameToMidi("B4"); // Treble middle line
const MIDI_D3 = noteNameToMidi("D3"); // Bass middle line

function vfKeyToMidi(k: string) { return noteNameToMidi(k); }

// For treble, if the HIGHEST note is above B4 ⇒ stem down (-1), else up (+1)
function stemForTreble(keys: string[]) {
  if (!keys.length) return 1;
  const max = Math.max(...keys.map(vfKeyToMidi));
  return max > MIDI_B4 ? -1 : 1;
}

// For bass, if the HIGHEST note is above D3 ⇒ stem down (-1), else up (+1)
function stemForBass(keys: string[]) {
  if (!keys.length) return 1;
  const max = Math.max(...keys.map(vfKeyToMidi));
  return max > MIDI_D3 ? -1 : 1;
}

  // 1️⃣ True rest event → draw rest on bass stave
  if (ev.isRest === true) {
  bassTickables.push(new StaveNote({ keys: ["d/3"], duration: `${dur}r`, clef: "bass" }));
  continue;
}

  // 2️⃣ Prefer precomputed VF keys, derive from noteNames if missing
  const vfKeysRaw: string[] =
    ev.vfKeys?.length
      ? ev.vfKeys
      : (ev.noteNames || []).map(n => noteNameToVfKey(n));

  if (!vfKeysRaw.length) {
    trebleTickables.push(new StaveNote({ keys: ["b/4"], duration: `${dur}r`, clef: "treble" }));
    bassTickables.push(new StaveNote({ keys: ["d/3"], duration: `${dur}r`, clef: "bass" }));
    continue;
  }

  // 3️⃣ Split chords between clefs
  const oct = (k: string) => parseInt(k.split("/")[1], 10);
  const trebleKeys = vfKeysRaw.filter(k => oct(k) >= 4);
  const bassKeys   = vfKeysRaw.filter(k => oct(k) <  4);

  if (trebleKeys.length) {
  trebleTickables.push(
    new StaveNote({
      keys: trebleKeys,
      duration: dur,
      clef: "treble",
      stemDirection: stemForTreble(trebleKeys), // ↑ or ↓
    })
  );
}

if (bassKeys.length) {
  bassTickables.push(
    new StaveNote({
      keys: bassKeys,
      duration: dur,
      clef: "bass",
      stemDirection: stemForBass(bassKeys), // ↑ or ↓
    })
  );
}
// else: no bass note for this event → do NOT add a rest
} 



    // Voices (SOFT mode)
    if (trebleTickables.length) {
      const v = new Voice({ numBeats: Math.max(1, trebleTickables.length), beatValue: 4 })
        .setStrict(false);
      v.addTickables(trebleTickables);
      new Formatter().joinVoices([v]).formatToStave([v], treble);
      v.draw(ctx, treble);
    }

    if (bassTickables.length) {
      const v = new Voice({ numBeats: Math.max(1, bassTickables.length), beatValue: 4 })
        .setStrict(false);
      v.addTickables(bassTickables);
      new Formatter().joinVoices([v]).formatToStave([v], bass);
      v.draw(ctx, bass);
    }
  }, [events, visibleCount, resizeTick]); 
  
  /* =========================
   * Video export (Reels-ready)
   * ========================= */
  const onDownloadVideo = useCallback(async () => {
    const host = staveHostRef.current;
    if (!host || !events.length) return;

    try {
      // Live SVG read
      const liveSvgEl = host.querySelector("svg") as SVGSVGElement | null;
      if (!liveSvgEl) return;

      const rect = liveSvgEl.getBoundingClientRect();
      const liveW = Math.max(2, Math.floor(rect.width));
      const liveH = Math.max(2, Math.floor(rect.height));

      // Canvas 1080×1920
      const FRAME_W = 1080, FRAME_H = 1920, SCALE = 2;
      const canvas = document.createElement("canvas");
      canvas.width = FRAME_W * SCALE;
      canvas.height = FRAME_H * SCALE;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const c = ctx as CanvasRenderingContext2D;

      // Layout (kept from working setup)
      const SAFE_TOP = 180;
      const SAFE_BOTTOM = 120;
      const PHRASE_TOP_OFFSET = 5;
      const PHRASE_MIN_PX = 28;
      const PHRASE_MAX_PX = 80;
      const PHRASE_TARGET = 0.86;
      const GOLD_SIDE_PAD = 36;
      const GAP_PHRASE_TO_GOLD = 8;
 // Measure phrase
      function measurePhraseWidth(px: number): number {
        c.font = `${px * SCALE}px Inter, system-ui, sans-serif`;
        return c.measureText(phrase).width;
      }
      function pickPhrasePx(): number {
        let lo = PHRASE_MIN_PX, hi = PHRASE_MAX_PX, best = PHRASE_MIN_PX;
        const maxWidth = FRAME_W * SCALE * PHRASE_TARGET;
        while (lo <= hi) {
          const mid = Math.floor((lo + hi) / 2);
          const w = measurePhraseWidth(mid);
          if (w <= maxWidth) { best = mid; lo = mid + 1; } else { hi = mid - 1; }
        }
        return best;
      }
      const phrasePx = pickPhrasePx();
      function measurePhraseBlockHeight(px: number): number {
        c.font = `${px * SCALE}px Inter, system-ui, sans-serif`;
        const m = c.measureText(phrase);
        const ascent = (m as any).actualBoundingBoxAscent ?? px * 0.8;
        const descent = (m as any).actualBoundingBoxDescent ?? px * 0.25;
        return Math.ceil((ascent + descent) * 1.05);
      }
const PHRASE_BLOCK_H = measurePhraseBlockHeight(phrasePx);
      const phraseBaselineY = (SAFE_TOP + PHRASE_TOP_OFFSET + Math.round(PHRASE_BLOCK_H * 0.6)) * SCALE;

      // Golden panel geometry
      const availW = FRAME_W - GOLD_SIDE_PAD * 2;
      const goldTopPx = SAFE_TOP + PHRASE_TOP_OFFSET + PHRASE_BLOCK_H + GAP_PHRASE_TO_GOLD;
      const availH = Math.max(2, FRAME_H - goldTopPx - SAFE_BOTTOM);
      const scale = Math.min(availW / liveW, availH / liveH);
      const drawW = Math.round(liveW * scale);
      const drawH = Math.round(liveH * scale);
      const goldX = Math.round((FRAME_W - drawW) / 2);
      const goldY = goldTopPx;

      // Audio capture
      await Tone.start();
      const rawCtx = (Tone.getContext() as any).rawContext as AudioContext;
      const audioDst = rawCtx.createMediaStreamDestination();
      try { (Tone as any).Destination.connect(audioDst); } catch {}

      // Prepare sampler with all notes used
      const allNoteNames = Array.from(
        new Set(
          events.flatMap(ev => ev.noteNames || [])
        )
      );
      if (!samplerRef.current) await createSamplerForNotes(allNoteNames);

      // Canvas stream + audio mix
      const stream = (canvas as any).captureStream(30) as MediaStream;
      const mixed = new MediaStream([
        ...stream.getVideoTracks(),
        ...audioDst.stream.getAudioTracks(),
      ]);

      const mimeType = pickRecorderMime();
      const chunks: BlobPart[] = [];
      const rec = new MediaRecorder(mixed, { mimeType });
      rec.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
      /** Server-side WebM → MP4 normalize (silent fallback to original if server fails). */
async function convertToMp4Server(inputBlob: Blob): Promise<Blob> {
  // If already MP4, skip conversion (iOS Safari / Chrome iOS case)
  if (inputBlob.type && inputBlob.type.includes("mp4")) {
    console.log("[convert] already MP4, skipping server");
    return inputBlob;
  }

  try {
    const resp = await fetch("/api/convert-webm-to-mp4", {
      method: "POST",
      headers: { "Content-Type": inputBlob.type || "application/octet-stream" },
      body: inputBlob,
    });
    if (!resp.ok) throw new Error(`server convert failed: ${resp.status}`);
    const out = await resp.blob();
    if (out.size === 0) throw new Error("server returned empty blob");
    console.log("[convert] server MP4 size", out.size);
    return out;
  } catch (err) {
    console.warn("[convert] falling back to raw clip", err);
    return inputBlob; // silent fallback
  }
}

      // Embed music fonts into SVG clones
      const fontCss = await buildEmbeddedFontStyle();
      function serializeFullSvg(svgEl: SVGSVGElement, w: number, h: number): string {
        let raw = new XMLSerializer().serializeToString(svgEl);
        if (!/\swidth=/.test(raw)) raw = raw.replace(/<svg([^>]*?)>/, '<svg$1 width="' + w + '">');
        else raw = raw.replace(/\swidth="[^"]*"/, ' width="' + w + '"');
        if (!/\sheight=/.test(raw)) raw = raw.replace(/<svg([^>]*?)>/, '<svg$1 height="' + h + '">');
        else raw = raw.replace(/\sheight="[^"]*"/, ' height="' + h + '"');
        if (/<style[^>]*>/.test(raw)) raw = raw.replace(/<style[^>]*>/, (m) => `${m}\n${fontCss}\n`);
        else raw = raw.replace(/<svg[^>]*?>/, (m) => `${m}\n<style>${fontCss}</style>\n`);
        return raw;
      }
async function svgToImage(rawSvg: string): Promise<HTMLImageElement> {
        const blob = new Blob([rawSvg], { type: "image/svg+xml;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const img = new Image();
        await new Promise<void>((res, rej) => { img.onload = () => res(); img.onerror = rej; img.src = url; });
        URL.revokeObjectURL(url);
        return img;
      }

      // Snapshot current stave
      try { await (document as any).fonts?.ready; } catch {}
      let currentImg = await svgToImage(serializeFullSvg(liveSvgEl, liveW, liveH));

      // Draw helpers
      function drawPhraseTop() {
        c.font = `${phrasePx * SCALE}px Inter, system-ui, sans-serif`;
        c.textAlign = "center";
        c.textBaseline = "middle";
        c.lineWidth = Math.max(2, Math.floor(phrasePx * 0.12)) * SCALE;
        c.strokeStyle = "rgba(0,0,0,0.25)";
        c.save();
        c.fillStyle = theme.gold;
        c.strokeText(phrase, (FRAME_W * SCALE) / 2, phraseBaselineY);
        c.fillText(phrase, (FRAME_W * SCALE) / 2, phraseBaselineY);
        c.restore();
      }
      function drawFrame(img: HTMLImageElement) {
        // bg
        c.fillStyle = theme.bg;
        c.fillRect(0, 0, canvas.width, canvas.height);

        // top phrase
        drawPhraseTop();
// golden panel
        c.fillStyle = theme.gold;
        c.fillRect(goldX * SCALE, goldY * SCALE, drawW * SCALE, drawH * SCALE);

        // live stave snapshot
        c.drawImage(img, 0, 0, liveW, liveH, goldX * SCALE, goldY * SCALE, drawW * SCALE, drawH * SCALE);

        // watermark
        c.save();
        c.textAlign = "right"; c.textBaseline = "middle";
        c.font = `${22 * SCALE}px Inter, system-ui, sans-serif`;
        c.fillStyle = "rgba(8,16,25,0.96)";
        c.fillText("pianotrainer.app", (goldX + drawW - 18) * SCALE, (goldY + drawH - 14) * SCALE);
        c.restore();
      }

      // Pre-roll stabilization
      drawFrame(currentImg);
      await new Promise(r => setTimeout(r, 120));
      drawFrame(currentImg);
      await new Promise(r => setTimeout(r, 120));
      drawFrame(currentImg);

      // Schedule audio according to event timings
      // Expect ev.t (sec) start, ev.d (sec) duration, ev.noteNames[]
      const timers: number[] = [];
      const t0 = performance.now();

      rec.start();

      // Start animation loop
      (async function loop() {
        const liveNow = host.querySelector("svg") as SVGSVGElement | null;
        if (liveNow) {
          currentImg = await svgToImage(serializeFullSvg(liveNow, liveW, liveH));
        }
        drawFrame(currentImg);

        const elapsed = (performance.now() - t0) / 1000;

        // Advance visibleCount to the last event that started
        let idx = 0;
        while (idx < events.length && (events[idx].t ?? (idx * 0.6)) <= elapsed) idx++;
        const nextVisible = Math.min(idx, events.length);
        if (nextVisible !== visibleCount) setVisibleCount(nextVisible);

        if (elapsed < 8.2) requestAnimationFrame(loop);
      })();

      // Trigger audio
      for (let i = 0; i < events.length; i++) {
        const ev = events[i];
        if (!ev.noteNames || ev.noteNames.length === 0) continue;
        const startMs = Math.round(1000 * (ev.t ?? (i * 0.6)));
        const durSec = Math.max(0.12, ev.d ?? 0.55);
        const id = window.setTimeout(() => {
          try {
            // Chords: trigger all notes together
            ev.noteNames!.forEach((nn: string) => triggerNow(nn));
          } catch {}
        }, startMs);
        timers.push(id);
        // Optional tails handled by sampler envelope; no explicit stop needed
      }
// Stop/collect
      const hardStop = window.setTimeout(() => {
        rec.stop();
        try { (Tone as any).Destination.disconnect(audioDst); } catch {}
        timers.forEach(id => clearTimeout(id));
      }, 8400); // loop-safe

      const recorded: Blob = await new Promise((res) => {
        rec.onstop = () => res(new Blob(chunks, { type: mimeType || "video/webm" }));
      });
      window.clearTimeout(hardStop);
      /** Prefer MP4 when supported; Chrome will fall back to WebM. */
function pickRecorderMime(): string {
  const candidates = [
    // H.264 + AAC (works on many desktop browsers)
    'video/mp4;codecs="avc1.42E01E,mp4a.40.2"',
    "video/mp4",
    // WebM fallbacks
    "video/webm;codecs=vp9,opus",
    "video/webm",
  ];
  for (const t of candidates) {
    try {
      if ((window as any).MediaRecorder?.isTypeSupported?.(t)) return t;
    } catch {}
  }
  return "video/webm"; // final safe fallback
}
/** Safe filename from phrase: "{phrase}.mp4" */
function buildDownloadName(phrase: string): string {
  const base = (phrase || "clip")
    .normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, "")
    .trim().toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 32) || "clip";
  return `${base}.mp4`;
}

      const mp4Blob = await convertToMp4Server(recorded);
      const a = document.createElement("a");
      a.download = buildDownloadName(phrase);
      a.href = URL.createObjectURL(mp4Blob);
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      console.error("[download] export error:", err);
      try { alert("Could not prepare video. Please try again."); } catch {}
    }
  }, [events, phrase]);
/* =========================
   * Input handlers (unchanged)
   * ========================= */
  const onInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const v = trimToMaxLetters(sanitizePhraseInput(e.target.value), MAX_LETTERS);
    setPhrase(v);
    const { events: built } = buildEvents(v);
setEvents(withDisplayKeys(built));
console.log(
  "debug events →",
  built.slice(0, 5).map(e => ({
    noteNames: e.noteNames,
    vfKeys: e.vfKeys,
    isRest: e.isRest
  }))
);
console.log(
  "✅ sample events →",
  events.slice(0, 5).map(e => ({
    noteNames: e.noteNames,
    vfKeys: e.vfKeys,
    isRest: e.isRest
  }))
);
    setVisibleCount(0);
  }, []);

  const onInputKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      setLastEnterAt(Date.now());
      start();
    }
  }, [start]);

  const onInputBlur = useCallback(() => {
    if (Date.now() - lastEnterAt > 150) start();
  }, [lastEnterAt, start]);

  /* =========================
   * Render
   * ========================= */
  return (
    <div style={{ minHeight: "100vh", background: theme.bg, color: theme.text, overflowX: "hidden" }}>
      <main style={{ width: "100%", margin: "0 auto", padding: 12, boxSizing: "border-box", maxWidth: 520 }}>
        <style>{`
          @media (min-width:768px){ main{max-width:680px!important;} }
          @media (min-width:1024px){ main{max-width:760px!important;} }
          .phrase-input::placeholder{color:${theme.gold};opacity:1;}
          .phrase-input:focus{outline:none;box-shadow:none;}

          /* Contract box everywhere */
          .vt-card,.vt-panel,.vt-gold,.vt-actions{box-sizing:border-box;}

          /* 🔒 vt-panel obeys vt-card width always */
          .vt-panel{
            width: 100% !important;
            max-width: 100% !important;
            min-width: 0 !important;
          }

          .vt-card{padding-left:12px;padding-right:12px;}
          .vt-gold{padding-left:10px;padding-right:10px;}

          /* Actions centered + wrap */
          .vt-actions{padding-left:10px;padding-right:10px;display:flex;flex-wrap:wrap;align-items:center;justify-content:center;column-gap:10px;row-gap:8px;}

          /* ≤390px */
          @media (max-width:390px){
            .vt-card{padding-left:calc(16px + env(safe-area-inset-left));padding-right:calc(16px + env(safe-area-inset-right));}
            .vt-panel{padding-left:calc(14px + env(safe-area-inset-left));padding-right:calc(14px + env(safe-area-inset-right));}
            .vt-gold {padding-left:calc(14px + env(safe-area-inset-left));padding-right:calc(14px + env(safe-area-inset-right));}
            .vt-actions{padding-left:calc(14px + env(safe-area-inset-left));padding-right:calc(14px + env(safe-area-inset-right));}
            .action-text{display:none!important;}
          }
/* ≤360px */
          @media (max-width:360px){
            .vt-card{padding-left:calc(20px + env(safe-area-inset-left));padding-right:calc(20px + env(safe-area-inset-right));}
            .vt-panel{padding-left:calc(18px + env(safe-area-inset-left));padding-right:calc(18px + env(safe-area-inset-right));}
            .vt-gold {padding-left:calc(18px + env(safe-area-inset-left));padding-right:calc(18px + env(safe-area-inset-right));}
            .vt-actions{padding-left:calc(18px + env(safe-area-inset-left));padding-right:calc(18px + env(safe-area-inset-right));}
          }
        `}</style>

        {/* Title */}
        {(() => { const { t1, t2, t3 } = ctaPieces(phrase);
          return <h1 style={{ margin: "4px 0 8px", fontSize: 24, lineHeight: 1.25, textAlign: "center", letterSpacing: 0.2, fontWeight: 800, color: theme.text }}>
            <span>{t1}</span><span style={{ color: theme.gold }}>{t2}</span><span>{t3}</span>
          </h1>;
        })()}
<section className="vt-card" style={{ background: theme.card, border: `1px solid ${theme.border}`, borderRadius: 16, padding: 12, display: "grid", gap: 8, marginBottom: 10 }}>
          {/* Panel: input + stave */}
          <div className="vt-panel" style={{ width: "100%", maxWidth: "100%", background: "#0F1821", borderRadius: 12, padding: 10 }}>
            <input
              className="phrase-input"
              value={phrase}
              onChange={onInputChange}
              onKeyDown={onInputKeyDown}
              onBlur={onInputBlur}
              placeholder="Type words and numbers…"
              inputMode="text"
              enterKeyHint="done"
              autoCapitalize="characters"
              autoCorrect="off"
              style={{ width: "100%", background: "#0F1821", color: theme.gold, border: "none", borderRadius: 8, padding: "14px 16px", fontSize: 24, lineHeight: 1.25 }}
            />
            <div style={{ fontSize: 12, color: theme.muted, marginTop: 4 }}>
              Letters: {lettersCount} / 20 (spaces don’t count)
            </div>

            <div className="vt-gold" style={{ position: "relative", background: theme.gold, borderRadius: 10, padding: 10, marginTop: 8 }}>
              <div ref={staveHostRef} style={{ width: "100%", minHeight: 280, display: "block" }} />
              <div style={{ position: "absolute", right: 22, bottom: 6, color: "#081019", fontSize: 12, fontWeight: 700, opacity: 0.9, userSelect: "none", pointerEvents: "none" }}>
                pianotrainer.app
              </div>
            </div>
          </div>
{/* Actions */}
          <div className="vt-actions">
            <div style={{ flex: "1 1 auto", minWidth: 0, display: "flex", justifyContent: "center" }}>
              <button
                onClick={() => isPlaying ? stop() : start()}
                disabled={!canPlay}
                style={{ background: !canPlay ? "#1a2430" : theme.gold, color: !canPlay ? theme.muted : "#081019", border: "none", borderRadius: 999, padding: "10px 16px", fontWeight: 700, cursor: !canPlay ? "not-allowed" : "pointer", fontSize: 16, minHeight: 40, display: "inline-flex", alignItems: "center", gap: 8 }}
              >
                <span aria-hidden="true">{isPlaying ? "⏹" : "▶"}</span><span className="action-text">{isPlaying ? "Stop" : "Replay"}</span>
              </button>
            </div>
            <div style={{ display: "flex", flex: "0 0 auto", gap: 10 }}>
              <button
                onClick={onDownloadVideo}
                disabled={!canPlay || events.length === 0}
                title="Download"
                style={{ background: "transparent", color: theme.gold, border: "none", borderRadius: 999, padding: "6px 10px", fontWeight: 700, cursor: !canPlay || events.length === 0 ? "not-allowed" : "pointer", minHeight: 32, fontSize: 14 }}
              >
                💾 <span className="action-text">Download</span>
              </button>
<button
                onClick={() => setShareOpen(true)}
                title="Share"
                style={{ background: "transparent", color: theme.gold, border: "none", borderRadius: 999, padding: "6px 10px", fontWeight: 700, cursor: "pointer", minHeight: 32, fontSize: 14 }}
              >
                📤 <span className="action-text">Share</span>
              </button>
            </div>
          </div>
{/* Copy toast */}
          {linkCopied && (
            <div style={{ color: theme.green, fontSize: 12, fontWeight: 600, textAlign: "right", width: "100%" }}>
              Link copied!
            </div>
          )}

          {/* Share Sheet */}
          {shareOpen && (
            <div
              role="dialog"
              aria-modal="true"
              style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 9999 }}
              onClick={() => setShareOpen(false)}
            >
<div
                style={{ width: "100%", maxWidth: 520, background: "#0F1821", borderTop: `1px solid ${theme.border}`, borderLeft: `1px solid ${theme.border}`, borderRight: `1px solid ${theme.border}`, borderRadius: "12px 12px 0 0", padding: 12, boxSizing: "border-box" }}
                onClick={(e) => e.stopPropagation()}
              >
                <div style={{ textAlign: "center", color: theme.text, fontWeight: 800, marginBottom: 8 }}>
                  Share your melody
                </div>

                {/* Copy Link */}
                <button
                  onClick={async () => {
                    const url = buildShareUrl();
                    try {
                      await navigator.clipboard.writeText(url);
                      setShareOpen(false);
                      setLinkCopied(true);
                      setTimeout(() => setLinkCopied(false), 1600);
                    } catch {
                      alert(url);
                    }
                  }}
                  style={{ width: "100%", padding: "10px 12px", marginBottom: 6, background: theme.gold, color: "#081019", borderRadius: 8, border: "none", fontWeight: 800 }}
                >
                  🔗 Copy Link
                </button>
{/* X / Twitter */}
                <a
                  href={buildTweetIntent(
                    `My word → melody: ${sanitizePhraseInput(phrase).trim() || "my word"}`,
                    buildShareUrl()
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setShareOpen(false)}
                  style={{ display: "block", textAlign: "center", width: "100%", padding: "10px 12px", marginBottom: 6, background: "transparent", color: theme.gold, borderRadius: 8, border: `1px solid ${theme.border}`, textDecoration: "none", fontWeight: 800 }}
                >
                  𝕏 Share on X
                </a>

                {/* TikTok */}
                <button
                  onClick={() => {
                    alert("Tap Download first, then post the clip in TikTok.");
                    const isMobile = /Android|iPhone|iPad/i.test(navigator.userAgent);
                    if (isMobile) { try { window.location.href = "tiktok://"; } catch {} }
                    else { window.open("https://studio.tiktok.com", "_blank", "noopener,noreferrer"); }
                    setShareOpen(false);
                  }}
                  style={{ width: "100%", padding: "10px 12px", marginBottom: 6, background: "transparent", color: theme.gold, borderRadius: 8, border: `1px solid ${theme.border}`, fontWeight: 800 }}
                >
                  🎵 Post to TikTok (download then upload)
                </button>
{/* Instagram Reels */}
                <button
                  onClick={() => {
                    alert("Tap Download first, then open Instagram → Reels → upload.");
                    const isMobile = /Android|iPhone|iPad/i.test(navigator.userAgent);
                    if (isMobile) { try { window.location.href = "instagram://camera"; } catch {} }
                    else { window.open("https://www.instagram.com/create/reel/", "_blank", "noopener,noreferrer"); }
                    setShareOpen(false);
                  }}
                  style={{ width: "100%", padding: "10px 12px", background: "transparent", color: theme.gold, borderRadius: 8, border: `1px solid ${theme.border}`, fontWeight: 800 }}
                >
                  📸 Post to Instagram Reels (download then upload)
                </button>
<button
                  onClick={() => setShareOpen(false)}
                  style={{ width: "100%", padding: "8px 12px", marginTop: 8, background: "#0B0F14", color: theme.muted, borderRadius: 8, border: `1px solid ${theme.border}`, fontWeight: 700 }}
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </section>

{/* Footer CTA */}
        <div style={{ marginTop: 10, display: "flex", justifyContent: "center" }}>
          <Link
            href="/learn/why-these-notes"
            style={{ color: theme.gold, fontWeight: 800, letterSpacing: 0.3, textDecoration: "none", padding: "10px 14px", border: `1px solid ${theme.border}`, borderRadius: 10, background: "#0F1821" }}
            aria-label="Why these notes?"
          >
            Why these notes? →
          </Link>
        </div>
      </main>
    </div>
  );
}