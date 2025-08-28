// utils/chords.ts
// Chord engine for Option 1 (Recognition-first).
// Builds triads by key & degree with inversion, normalizes voicing into C2..C6,
// returns both MIDI and display names (sharp by default), plus audio-safe names.

// ===== Types =====
export type MajorKey =
  | "C" | "G" | "D" | "A" | "E" | "B" | "F#" | "C#"
  | "F" | "Bb" | "Eb" | "Ab" | "Db" | "Gb" | "Cb";

export type RomanDegree = "I" | "ii" | "iii" | "IV" | "V" | "vi" | "vii°";
export type Inversion = "root" | "1st" | "2nd";

export type TriadQuality = "maj" | "min" | "dim";

export type BuiltChord = {
  key: MajorKey;
  degree: RomanDegree;
  inversion: Inversion;
  quality: TriadQuality;
  // MIDI notes low→high after inversion & range normalization
  midi: [number, number, number];
  // Display spellings (e.g., "F#3", "A3", "C#4"), sharp by default
  display: [string, string, string];
  // Audio file names (sharps only, # -> %23)
  audioUrls: [string, string, string];
  // Human label for quiz (e.g., "V in G major (1st inv)")
  label: string;
};

// ===== Constants =====
const C2 = 36;
const C6 = 84;

// 12-TET map for “sharp” pitch classes
const SHARP_PC = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"] as const;
type SharpPC = (typeof SHARP_PC)[number];

const FLAT_TO_SHARP: Record<string, SharpPC> = {
  Db: "C#", Eb: "D#", Gb: "F#", Ab: "G#", Bb: "A#", Cb: "B", Fb: "E",
};

const KEY_TO_TONIC_PC: Record<MajorKey, SharpPC> = {
  C:"C", G:"G", D:"D", A:"A", E:"E", B:"B", "F#":"F#", "C#":"C#",
  F:"F", Bb:"A#", Eb:"D#", Ab:"G#", Db:"C#", Gb:"F#", Cb:"B",
};

// Major scale degrees as semitone offsets from tonic
//  1,2,3,4,5,6,7 → 0,2,4,5,7,9,11
const MAJOR_SCALE_ST: number[] = [0, 2, 4, 5, 7, 9, 11];

// Degree → diatonic index (1..7)
const DEGREE_INDEX: Record<RomanDegree, 1|2|3|4|5|6|7> = {
  I:1, ii:2, iii:3, IV:4, V:5, vi:6, "vii°":7,
};

// Degree → triad quality in a major key
const DEGREE_QUALITY: Record<RomanDegree, TriadQuality> = {
  I: "maj", ii: "min", iii: "min", IV: "maj", V: "maj", vi: "min", "vii°": "dim",
};

// Triad intervals (semitones) from root for each quality (stacked as closed triad)
const QUALITY_INTERVALS: Record<TriadQuality, [number, number]> = {
  maj: [4, 7],   // root +4 +7
  min: [3, 7],   // root +3 +7
  dim: [3, 6],   // root +3 +6
};

// ===== Helpers: note name <-> MIDI =====
export function sharpNameToMidi(sharpNote: string): number | null {
  // Expects sharp spelling like "F#3" or natural "E4". No flats here.
  const m = sharpNote.match(/^([A-G])(#?)(-?\d+)$/);
  if (!m) return null;
  const [, L, acc, octStr] = m;
  const pcName = (L + (acc || "")) as SharpPC;
  const pc = SHARP_PC.indexOf(pcName);
  if (pc < 0) return null;
  const oct = parseInt(octStr, 10);
  return (oct + 1) * 12 + pc;
}

export function midiToSharpName(midi: number): string {
  const pc = midi % 12;
  const oct = Math.floor(midi / 12) - 1;
  return `${SHARP_PC[pc]}${oct}`;
}

export function preferFlatForDisplay(sharpName: string): string {
  // Convert # to b only when it’s a black key; otherwise return as-is.
  const m = sharpName.match(/^([A-G])(#?)(-?\d+)$/);
  if (!m) return sharpName;
  const [, L, acc, oct] = m;
  if (!acc) return sharpName;
  // Map enharmonic: C# -> Db (same octave)
  const flatLetter = Object.keys(FLAT_TO_SHARP).find(k => FLAT_TO_SHARP[k] === (L + acc));
  return flatLetter ? `${flatLetter}${oct}` : sharpName;
}

// Normalize flats → sharps for audio + URL encode '#'
export function audioUrlFromDisplay(name: string): string {
  const m = name.match(/^([A-Ga-g])([#b]?)(-?\d+)$/);
  if (!m) return `/audio/notes/${name}.wav`;
  const letter = m[1].toUpperCase();
  const acc = (m[2] || "") as "" | "#" | "b";
  const oct = m[3];
  const sharp = acc === "b" ? FLAT_TO_SHARP[letter + "b"] || letter : (letter + acc);
  return `/audio/notes/${sharp.replace("#", "%23")}${oct}.wav`;
}

// ===== Core: degree root, triad, inversion, range =====

// Get tonic MIDI near C4 (60) by selecting the octave that keeps later voicings in C2..C6.
// We start tonic around C4 then shift whole chord in normalizeRange.
function tonicMidiNearC4(key: MajorKey): number {
  const pcName = KEY_TO_TONIC_PC[key];
  // Place the tonic initially at octave 4 unless it’s too high; shift down for sharps like C# etc to avoid overshoot.
  const baseOct = 4;
  return sharpNameToMidi(`${pcName}${baseOct}`)!;
}

// Degree root (MIDI) from tonic in a major key
export function degreeRootMidi(key: MajorKey, degree: RomanDegree): number {
  const tonic = tonicMidiNearC4(key);
  const idx = DEGREE_INDEX[degree] - 1; // 0..6
  const semis = MAJOR_SCALE_ST[idx];
  return tonic + semis;
}

// Build quality triad (closed) from root MIDI
export function buildTriadClosed(rootMidi: number, quality: TriadQuality): [number, number, number] {
  const [i3, i5] = QUALITY_INTERVALS[quality];
  return [rootMidi, rootMidi + i3, rootMidi + i5];
}

// Apply inversion in-place (rotate bottom note up an octave per inversion count)
export function applyInversion(
  midi3: [number, number, number],
  inversion: Inversion
): [number, number, number] {
  const res = [...midi3] as [number, number, number];
  const times = inversion === "root" ? 0 : inversion === "1st" ? 1 : 2;
  for (let k = 0; k < times; k++) {
    res.push(res.shift()! + 12); // move lowest up one octave
  }
  // resort just in case (ascending)
  res.sort((a, b) => a - b);
  return res as [number, number, number];
}

// Shift chord by ±12 until entirely within [C2, C6]
export function normalizeRange(
  midi3: [number, number, number],
  low = C2,
  high = C6
): [number, number, number] {
  let [a, b, c] = midi3;
  // If any above high, shift all down by 12 until within range
  while (c > high) { a -= 12; b -= 12; c -= 12; }
  // If any below low, shift all up by 12 until within range
  while (a < low) { a += 12; b += 12; c += 12; }
  return [a, b, c];
}

// Choose display spellings. Default: sharps.
// Optionally prefer flats for certain PCs (e.g., when you later add “prefer flats” toggle).
export function displaySpellings(
  midi3: [number, number, number],
  preferFlats = false
): [string, string, string] {
  const sharpNames = midi3.map(midiToSharpName) as [string, string, string];
  if (!preferFlats) return sharpNames;
  return sharpNames.map(preferFlatForDisplay) as [string, string, string];
}

// ===== Label helpers =====
export function inversionLabel(inv: Inversion): string {
  switch (inv) {
    case "root": return "root";
    case "1st": return "1st inv";
    case "2nd": return "2nd inv";
  }
}

export function chordLabel(key: MajorKey, degree: RomanDegree, inv: Inversion): string {
  return `${degree} in ${key} major (${inversionLabel(inv)})`;
}

// ===== Main: build chord spec =====
export function buildChord(
  key: MajorKey,
  degree: RomanDegree,
  inversion: Inversion,
  opts?: { preferFlats?: boolean }
): BuiltChord {
  const quality = DEGREE_QUALITY[degree];
  const root = degreeRootMidi(key, degree);
  const closed = buildTriadClosed(root, quality);
  const voiced = applyInversion(closed, inversion);
  const normalized = normalizeRange(voiced, C2, C6);
  const display = displaySpellings(normalized, !!opts?.preferFlats);
  const audioUrls = display.map(audioUrlFromDisplay) as [string, string, string];
  return {
    key, degree, inversion, quality,
    midi: normalized,
    display,
    audioUrls,
    label: chordLabel(key, degree, inversion),
  };
}

// ===== Random picker for your quiz pool =====
export type ChordPoolItem = { key: MajorKey; degree: RomanDegree; inversion: Inversion };

export function pickRandom<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Given UI selections, build a pool then roll one
export function rollRandomFromSelections(
  selectedKeys: MajorKey[],
  selectedDegrees: RomanDegree[],
  selectedInversions: Inversion[],
  preferFlats = false
): BuiltChord | null {
  if (!selectedKeys.length || !selectedDegrees.length || !selectedInversions.length) return null;
  const k = pickRandom(selectedKeys);
  const d = pickRandom(selectedDegrees);
  const v = pickRandom(selectedInversions);
  return buildChord(k, d, v, { preferFlats });
}