"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as Tone from "tone";
import Link from "next/link";
import {
  FLOW_PRESETS,
  buildFlowChordsForKey,
  pitchNameToPc,
  PITCHES,
} from "@/lib/harmony/flow";

// === Export-only Web Audio helpers (separate from Tone.js live sampler) ===
let _ctx: AudioContext | null = null;
const _buffers = new Map<string, AudioBuffer>();

function getCtxExport(): AudioContext {
  if (_ctx) return _ctx;
  const AC: any = (window as any).AudioContext || (window as any).webkitAudioContext;
  _ctx = new AC({ latencyHint: "interactive" });
  return _ctx!;
}

async function loadBufferExport(noteName: string): Promise<AudioBuffer> {
  if (_buffers.has(noteName)) return _buffers.get(noteName)!;
  const safe = noteName.replace("#", "%23");
  const res = await fetch(`/audio/notes/${safe}.wav`);
  if (!res.ok) throw new Error(`fetch failed: ${safe}.wav`);
  const ctx = getCtxExport();
  const buf = await ctx.decodeAudioData(await res.arrayBuffer());
  _buffers.set(noteName, buf);
  return buf;
}

// Same as in KeyClock: post webm to /api/convert-webm-to-mp4
async function convertToMp4Server(inputBlob: Blob): Promise<Blob> {
  if (inputBlob.type.includes("mp4")) return inputBlob;
  try {
    const resp = await fetch("/api/convert-webm-to-mp4", {
      method: "POST",
      headers: { "Content-Type": inputBlob.type || "application/octet-stream" },
      body: inputBlob,
    });
    if (!resp.ok) throw new Error(`server convert failed: ${resp.status}`);
    const out = await resp.blob();
    if (out.size === 0) throw new Error("server returned empty blob");
    return out;
  } catch {
    return inputBlob;
  }
}

function pickRecorderMime(): string {
  const candidates = [
    'video/mp4;codecs="avc1.42E01E,mp4a.40.2"',
    "video/mp4",
    "video/webm;codecs=vp9,opus",
    "video/webm",
  ];
  for (const t of candidates) {
    try {
      if ((window as any).MediaRecorder?.isTypeSupported?.(t)) return t;
    } catch {}
  }
  return "video/webm";
}

/* =========================
   Basic theme
========================= */
const baseTheme = {
  bg: "#0B0F14",
  card: "#111820",
  border: "#1E2935",
  text: "#E6EBF2",
  muted: "#8B94A7",
  gold: "#EBCF7A",
  minor: "#69D58C",
};

type Mode = "major" | "minor";

/* =========================
   Emotion presets
========================= */

type EmotionId =
  | "custom"
  | "sadness"
  | "anger"
  | "fear"
  | "mystery"
  | "melancholy"
  | "calm"
  | "playful"
  | "magic"
  | "wonder"
  | "tension";

type EmotionPreset = {
  id: EmotionId;
  label: string;
  key: "C minor" | "B♭ Major";
  mode: Mode;
  degrees: string[];
  trailColor: string;
  glowColor: string;
  gradientTop: string;
  gradientBottom: string;
  pulse: number; // 0–100
  tempo: number; // 1.0 = base
};

const EMOTION_PRESETS: EmotionPreset[] = [
  {
    id: "sadness",
    label: "Sadness",
    key: "C minor",
    mode: "minor",
    degrees: ["1", "6b", "3b", "7b"],
    trailColor: "#4A6FA5",
    glowColor: "#A8C1E8",
    gradientTop: "#0E1524",
    gradientBottom: "#1C2947",
    pulse: 45,
    tempo: 0.9,
  },
  {
    id: "anger",
    label: "Anger",
    key: "C minor",
    mode: "minor",
    degrees: ["1", "4", "2b", "5"],
    trailColor: "#D64541",
    glowColor: "#FF8E7A",
    gradientTop: "#240A0A",
    gradientBottom: "#3E0F0F",
    pulse: 90,
    tempo: 1.15,
  },
  {
    id: "fear",
    label: "Fear",
    key: "C minor",
    mode: "minor",
    degrees: ["1", "2b", "5", "1"],
    trailColor: "#7F00FF",
    glowColor: "#DA8CFF",
    gradientTop: "#130020",
    gradientBottom: "#310047",
    pulse: 80,
    tempo: 1.15,
  },
  {
    id: "mystery",
    label: "Mystery",
    key: "C minor",
    mode: "minor",
    degrees: ["1", "4", "7b", "1"],
    trailColor: "#5C4EE5",
    glowColor: "#B7B3FF",
    gradientTop: "#100E28",
    gradientBottom: "#1F1A50",
    pulse: 60,
    tempo: 1.05,
  },
  {
    id: "melancholy",
    label: "Melancholy",
    key: "C minor",
    mode: "minor",
    degrees: ["6b", "4", "1", "5"],
    trailColor: "#8E6DA7",
    glowColor: "#D4C0EA",
    gradientTop: "#1A1024",
    gradientBottom: "#332047",
    pulse: 55,
    tempo: 0.9,
  },
  {
    id: "calm",
    label: "Calm",
    key: "B♭ Major",
    mode: "major",
    degrees: ["1", "5", "6", "4"],
    trailColor: "#76C7C0",
    glowColor: "#B8EFEA",
    gradientTop: "#0B1C1C",
    gradientBottom: "#123231",
    pulse: 35,
    tempo: 0.8,
  },
  {
    id: "playful",
    label: "Playful",
    key: "B♭ Major",
    mode: "major",
    degrees: ["1", "2", "5", "1"],
    trailColor: "#FFB84D",
    glowColor: "#FFE0A8",
    gradientTop: "#2A1B00",
    gradientBottom: "#4B3000",
    pulse: 70,
    tempo: 1.05,
  },
  {
    id: "magic",
    label: "Magic",
    key: "B♭ Major",
    mode: "major",
    degrees: ["4", "1", "5", "6"],
    trailColor: "#EFA7FF",
    glowColor: "#FAD7FF",
    gradientTop: "#220022",
    gradientBottom: "#410041",
    pulse: 55,
    tempo: 1.05,
  },
  {
    id: "wonder",
    label: "Wonder",
    key: "C minor",
    mode: "minor",
    degrees: ["1", "6b", "3b", "4"],
    trailColor: "#FFD86E",
    glowColor: "#FFE9B5",
    gradientTop: "#241A00",
    gradientBottom: "#4B3600",
    pulse: 65,
    tempo: 1.05,
  },
  {
    id: "tension",
    label: "Tension",
    key: "C minor",
    mode: "minor",
    degrees: ["1", "2", "5", "1"],
    trailColor: "#FF6E40",
    glowColor: "#FFAD98",
    gradientTop: "#2A0E04",
    gradientBottom: "#4E1C09",
    pulse: 85,
    tempo: 1.15,
  },
];

/* =========================
   Circle geometry helpers
========================= */

type Pt = { x: number; y: number };

function nodePosition(i: number, r = 36): Pt {
  const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
  const xRaw = 50 + Math.cos(a) * r;
  const yRaw = 50 + Math.sin(a) * r;
  // Round coordinates to 3 decimals to keep SSR and client in sync
  const x = Number(xRaw.toFixed(3));
  const y = Number(yRaw.toFixed(3));
  return { x, y };
}

function labelPlacement(i: number, p: Pt) {
  const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
  const ux = Math.cos(a), uy = Math.sin(a);
  const xRaw = p.x + 3.0 * ux;
  const yRaw = p.y + 3.0 * uy;
  const x = Number(xRaw.toFixed(3));
  const y = Number(yRaw.toFixed(3));

  const ax = Math.abs(ux), ay = Math.abs(uy);
  let anchor: "start" | "middle" | "end" = "middle";
  let baseline: "baseline" | "middle" | "hanging" = "middle";
  if (ax >= ay) {
    anchor = ux > 0 ? "start" : "end";
    baseline = "middle";
  } else {
    anchor = "middle";
    baseline = uy > 0 ? "hanging" : "baseline";
  }
  return { x, y, anchor, baseline };
}

/* =========================
   Harmony model
========================= */

type DegreeNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7;
type Acc = -1 | 0 | 1; // -1 = flat, 0 = natural, +1 = sharp

type DegToken = {
  base: DegreeNumber;
  acc: Acc;
  display: string;
};

// Offsets
const MAJOR_OFFSETS: Record<DegreeNumber, number> = {
  1: 0,
  2: 2,
  3: 4,
  4: 5,
  5: 7,
  6: 9,
  7: 11,
};

const MINOR_OFFSETS: Record<DegreeNumber, number> = {
  1: 0,  // i
  2: 2,  // ii°
  3: 3,  // ♭III
  4: 5,  // iv
  5: 7,  // v
  6: 8,  // ♭VI
  7: 10, // ♭VII
};

const TRIAD_MAJOR = [0, 4, 7];
const TRIAD_MINOR = [0, 3, 7];
const TRIAD_DIM = [0, 3, 6];

const TONIC_PC_BB = 10; // A#
const TONIC_PC_CM = 0;  // C



function midiToNoteName(midi: number): string {
  const pc = PITCHES[midi % 12];
  const oct = Math.floor(midi / 12) - 1;
  return `${pc}${oct}`;
}

/* =========================
   Degree → node mapping
========================= */

// Circle labels
const circleLabels = [
  "I",
  "V",
  "ii",
  "vi",
  "iii",
  "vii°",
  "♯IV",
  "♭II",
  "♭VI",
  "♭III",
  "♭VII",
  "IV",
];

// Node indices for “major scale degrees” in B♭ major
const NODE_INDEX_MAJOR_BASE: Record<DegreeNumber, number> = {
  1: 0,  // I
  2: 2,  // ii
  3: 4,  // iii
  4: 11, // IV
  5: 1,  // V
  6: 3,  // vi
  7: 5,  // vii°
};

// Node indices for “minor scale degrees” in C minor
const NODE_INDEX_MINOR_BASE: Record<DegreeNumber, number> = {
  1: 0,   // i ~ I
  2: 2,   // ii° ~ ii
  3: 9,   // ♭III
  4: 11,  // iv ~ IV
  5: 1,   // v ~ V
  6: 8,   // ♭VI
  7: 10,  // ♭VII
};

// Chromatic nodes
const NODE_INDEX_CHROMA: Record<string, number> = {
  "2,-1": 7,  // ♭2 → ♭II
  "3,-1": 9,  // ♭3 → ♭III
  "4,1": 6,   // ♯4 → ♯IV
  "6,-1": 8,  // ♭6 → ♭VI
  "7,-1": 10, // ♭7 → ♭VII
};

// Which Flow chords are "borrowed" (outside plain diatonic scale) per emotion.
// Indices are 0-based: 0..3 for the 4 Flow chords.
const FLOW_BORROWED_INDICES = {
  sadness: [],
  anger: [2, 3],
  fear: [1, 2],
  mystery: [],
  melancholy: [3],
  calm: [],
  playful: [],
  magic: [],
  wonder: [3],
  tension: [2],
} as const;

// 🔽 ADD THIS UNDER FLOW_BORROWED_INDICES
const FLOW_EMOTION_TEXT = {
  // Fully diatonic: Calm, Playful, Magic, Sadness, Mystery
  sadness:
    "All chords are built from the notes of the key, so the feeling stays pure and stable.",
  mystery:
    "All chords are built from the notes of the key, so the feeling stays pure and stable.",
  calm:
    "All chords are built from the notes of the key, so the feeling stays pure and stable.",
  playful:
    "All chords are built from the notes of the key, so the feeling stays pure and stable.",
  magic:
    "All chords are built from the notes of the key, so the feeling stays pure and stable.",

  // One borrowed Flow chord
  melancholy:
    "This progression uses exactly one ⭐ chord outside the plain scale.\nMelancholy uses G⭐ (V major in C minor) for a stronger, aching pull back to Cm.",
  wonder:
    "This progression uses exactly one ⭐ chord outside the plain scale.\nWonder ends on F⭐ (F major instead of Fm), borrowed from the relative major key — like a sudden ray of light.",
  tension:
    "This progression uses exactly one ⭐ chord outside the plain scale.\nTension leans on G⭐ as a bright V that wants to resolve.",

  // Two borrowed Flow chords
  anger:
    "This progression uses both Db⭐ (the heavy ♭II “Neapolitan” chord) and G⭐ (bright V).\nAnger feels like being crushed by Db⭐ and then pushed forward by G⭐.",
  fear:
    "This progression also leans on Db⭐ (the heavy ♭II “Neapolitan” chord) and G⭐ (bright V).\nFear / Horror uses that pair in a classic cinematic horror sequence.",
} as const;

/* =========================
   Tone.Sampler – pure piano
========================= */

function buildFullPianoUrls(): Record<string, string> {
  const urls: Record<string, string> = {};

  // Octave 0: A0, A#0, B0
  for (const p of ["A", "A#", "B"] as const) {
    const name = `${p}0`;
    const safe = name.replace("#", "%23");
    urls[name] = `${safe}.wav`;
  }

  // Octaves 1..7: full chromatic
  for (let oct = 1; oct <= 7; oct++) {
    for (const p of PITCHES) {
      const name = `${p}${oct}`;
      const safe = name.replace("#", "%23");
      urls[name] = `${safe}.wav`;
    }
  }

  // Octave 8: C8
  {
    const name = "C8";
    const safe = name.replace("#", "%23");
    urls[name] = `${safe}.wav`;
  }

  return urls;
}

async function ensurePianoSampler(ref: React.MutableRefObject<Tone.Sampler | null>) {
  if (ref.current) return;

  const urls = buildFullPianoUrls();
  const sampler = new Tone.Sampler({
    urls,
    baseUrl: "/audio/notes/",
  }).toDestination();

  await Tone.loaded();
  ref.current = sampler;
}

/* =========================
   Parsing degrees + separators
========================= */

function parseProgression(input: string): { tokens: DegToken[]; longFlags: boolean[] } {
  const tokens: DegToken[] = [];
  const longFlags: boolean[] = [];

  const re = /([b#]?[1-7][b#]?)/gi;
  let m: RegExpExecArray | null;
  let prevEnd = 0;
  let isFirst = true;

  while ((m = re.exec(input)) !== null) {
    const raw = m[1];
    const start = m.index;
    const sep = input.slice(prevEnd, start);

    const hasDash = sep.includes("-");
    const isLong = isFirst ? true : hasDash;

    const s = raw.trim();
    const m2 = /^([b#]?)([1-7])([b#]?)$/i.exec(s);
    if (!m2) {
      prevEnd = re.lastIndex;
      isFirst = false;
      continue;
    }

    const pre = m2[1];
    const num = parseInt(m2[2], 10) as DegreeNumber;
    const post = m2[3];

    let acc: Acc = 0;
    if (pre === "b" || post === "b") acc = -1;
    else if (pre === "#" || post === "#") acc = 1;

    let display: string;
    if (acc === -1) display = `♭${num}`;
    else if (acc === 1) display = `♯${num}`;
    else display = `${num}`;

    tokens.push({ base: num, acc, display });
    longFlags.push(isLong);

    prevEnd = re.lastIndex;
    isFirst = false;
  }

  return { tokens, longFlags };
}

/* =========================
   Token -> MIDI triads, node indices
========================= */

function triadMidiForToken(tok: DegToken, mode: Mode): string[] {
  const baseOffsets = mode === "major" ? MAJOR_OFFSETS : MINOR_OFFSETS;
  const tonicPC = mode === "major" ? TONIC_PC_BB : TONIC_PC_CM;

  const baseOff = baseOffsets[tok.base];
  const rootPC = (tonicPC + baseOff + tok.acc + 12) % 12;

  const baseOct = 4;
  let rootMidi = (baseOct + 1) * 12 + rootPC;
  if (rootMidi < 48) rootMidi += 12;
  if (rootMidi > 72) rootMidi -= 12;

  let quality: "M" | "m" | "dim";
  if (tok.acc !== 0) {
    quality = "M";
  } else {
    if (mode === "major") {
      if (tok.base === 1 || tok.base === 4 || tok.base === 5) quality = "M";
      else if (tok.base === 7) quality = "dim";
      else quality = "m";
    } else {
      if (tok.base === 1 || tok.base === 4 || tok.base === 5) quality = "m";
      else if (tok.base === 2) quality = "dim";
      else quality = "M";
    }
  }

  const triadSteps =
    quality === "M" ? TRIAD_MAJOR : quality === "dim" ? TRIAD_DIM : TRIAD_MINOR;

  return triadSteps.map((semi) => midiToNoteName(rootMidi + semi));
}


// 🔽 ADD THIS HELPER HERE
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
    quality === "M"
      ? TRIAD_MAJOR
      : quality === "m"
      ? TRIAD_MINOR
      : TRIAD_DIM;

  const baseOct = 4;
  const rootMidi = (baseOct + 1) * 12 + pc;

  return steps.map((semi) => midiToNoteName(rootMidi + semi));
}

function nodeIndexForToken(tok: DegToken, mode: Mode): number {
  if (tok.acc !== 0) {
    const key = `${tok.base},${tok.acc}`;
    if (key in NODE_INDEX_CHROMA) return NODE_INDEX_CHROMA[key];
  }

  if (mode === "major") {
    return NODE_INDEX_MAJOR_BASE[tok.base];
  } else {
    return NODE_INDEX_MINOR_BASE[tok.base];
  }
}

function triadToSymbol(notes: string[]): string {
  if (!notes || notes.length < 3) return "?";

  const n = notes.map((n) => n.replace(/[0-9]/g, "")); // strip octaves

  const root = n[0];
  const rootPc = PITCHES.indexOf(root as any);
  if (rootPc < 0) return root;

  const pc1 = PITCHES.indexOf(n[1] as any);
  const pc2 = PITCHES.indexOf(n[2] as any);

  const i1 = (pc1 - rootPc + 12) % 12;
  const i2 = (pc2 - rootPc + 12) % 12;

  let suffix = "";
  if (i1 === 4 && i2 === 7) suffix = "";      // major
  else if (i1 === 3 && i2 === 7) suffix = "m"; // minor
  else if (i1 === 3 && i2 === 6) suffix = "°"; // dim
  else suffix = "?";

  return root + suffix;
}

/* =========================
   Trails
========================= */

function pathFromNodes(indices: number[]): string {
  if (!indices.length) return "";
  const pts = indices.map((i) => nodePosition(i, 36));
  const move = `M ${pts[0].x} ${pts[0].y}`;
  const rest = pts
    .slice(1)
    .map((p) => `L ${p.x} ${p.y}`)
    .join(" ");
  return `${move} ${rest}`;
}

/* =========================
   Component
========================= */

export default function CofPianoPage() {
  // Emotion selection
  const [emotionId, setEmotionId] = useState<EmotionId>("playful");
  const lastEmotionIdRef = useRef<EmotionId | "custom">("custom");

  const [degInput, setDegInput] = useState("1 5 6 4");
  const [mode, setModeState] = useState<Mode>("major");
  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const [isExporting, setIsExporting] = useState(false);

  const samplerRef = useRef<Tone.Sampler | null>(null);
  const timeoutsRef = useRef<number[]>([]);
  const trailNodesRef = useRef<number[]>([]);
  const [trailPath, setTrailPath] = useState<string>("");

  const activePreset =
    emotionId === "playful"
      ? null
      : EMOTION_PRESETS.find((p) => p.id === emotionId) || null;

      const isCustom = emotionId === "custom";

const flowUiPreset =
  !isCustom && activePreset
    ? FLOW_PRESETS[activePreset.id as keyof typeof FLOW_PRESETS]
    : null;

const flowUiChordNames = useMemo(() => {
  if (!flowUiPreset) return [];
  const tonicPc =
    flowUiPreset.mode === "minor" ? pitchNameToPc("C") : pitchNameToPc("Bb");
  return buildFlowChordsForKey(tonicPc, flowUiPreset);
}, [flowUiPreset]);

// Explicit mutable number[] + spread to convert readonly tuple into a normal array
const flowUiBorrowedIndices: number[] = !isCustom
  ? [
      ...(
        FLOW_BORROWED_INDICES[
          emotionId as keyof typeof FLOW_BORROWED_INDICES
        ] ?? []
      ),
    ]
  : [];

  // When selecting a preset, override mode & input
  useEffect(() => {
    if (!activePreset) return;
    setModeState(activePreset.mode);
    setDegInput(activePreset.degrees.join(" "));
  }, [emotionId]); // eslint-disable-line react-hooks/exhaustive-deps

  const modeColor = activePreset
    ? activePreset.trailColor
    : mode === "major"
    ? baseTheme.gold
    : baseTheme.minor;

  const backgroundTop = activePreset?.gradientTop ?? baseTheme.bg;
  const backgroundBottom = activePreset?.gradientBottom ?? baseTheme.bg;

  // Parse degrees & separators
  const { tokens: degTokens, longFlags } = useMemo(
    () => parseProgression(degInput),
    [degInput]
  );

  // Build chords
  const chords: string[][] = useMemo(
    () => degTokens.map((tok) => triadMidiForToken(tok, mode)),
    [degTokens, mode]
  );

  const clearTimers = () => {
    timeoutsRef.current.forEach((id) => clearTimeout(id));
    timeoutsRef.current = [];
  };

  const resetTrails = () => {
    trailNodesRef.current = [];
    setTrailPath("");
  };

  function appendTrail(nodeIndex: number) {
    trailNodesRef.current.push(nodeIndex);
    if (trailNodesRef.current.length > 9999) trailNodesRef.current.shift();
    setTrailPath(pathFromNodes(trailNodesRef.current));
  }

  const start = useCallback(async () => {
  if (isPlaying) return;

  // Decide which chords to use:
  // - Preset emotions → FlowPreset engine (flow.ts)
  // - Custom mode → old degree-based chords
  let chordsToPlay: string[][] = [];

  if (emotionId !== "custom" && activePreset) {
    // Use shared FlowPreset for presets
    const flowPreset = FLOW_PRESETS[activePreset.id as Exclude<EmotionId, "custom">];
    const tonicPc =
      flowPreset.mode === "minor" ? pitchNameToPc("C") : pitchNameToPc("Bb");
    const flowChordNames = buildFlowChordsForKey(tonicPc, flowPreset);

    console.log(
  `[Flow PATH-OF-FLOW DEBUG] preset=${activePreset.id}:`,
  flowChordNames.join(" → ")
);
    chordsToPlay = flowChordNames.map((name) => triadFromChordName(name));

    // Optional debug:
    console.log(
      `[Flow PATH-OF-FLOW DEBUG] preset=${activePreset.id}:`,
      flowChordNames.join(" → ")
    );
} else {
  // Custom mode – old degree-based engine
  if (!chords.length) return;
  chordsToPlay = chords;

  // 🔍 DEBUG — print Custom mode chord ROOTS (simple)
  const customChordSymbols = chords.map((triad) => {
    const root = triad[0] ?? "";
    return root.replace(/[0-9]/g, ""); // "C4" -> "C", "G#4" -> "G#"
  });

  console.log(
    `%c[Custom Flow DEBUG] mode=${mode}, degrees="${degInput}":`,
    "color:#9AE6B4;font-weight:bold",
    customChordSymbols.join(" → ")
  );
}

  setIsPlaying(true);
  setActiveIdx(null);
  clearTimers();
  resetTrails();

  await Tone.start();
  await ensurePianoSampler(samplerRef);
  const s = samplerRef.current;
  if (!s) return;

  const baseStepSec = 0.9;
  const tempoMult = activePreset?.tempo ?? 1.0;
  const baseStep = baseStepSec / tempoMult;
  const shortFactor = 0.5;

  let accSec = 0;
  const now = Tone.now();

  chordsToPlay.forEach((notes, idx) => {
    const isLong = longFlags[idx] ?? true;
    const stepSec = isLong ? baseStep : baseStep * shortFactor;

    const startTime = now + accSec;
    (s as any).triggerAttackRelease(notes, 0.8, startTime);

    const tok = degTokens[idx];
    const nodeIndex = nodeIndexForToken(tok, mode);

    const tid = window.setTimeout(() => {
      setActiveIdx(idx);
      if (nodeIndex >= 0) appendTrail(nodeIndex);
    }, accSec * 1000);
    timeoutsRef.current.push(tid);

    accSec += stepSec;
  });

  const totalSec = accSec;
  const endId = window.setTimeout(() => {
    setActiveIdx(null);
    setIsPlaying(false);
  }, (totalSec + 0.5) * 1000);
  timeoutsRef.current.push(endId);
}, [
  isPlaying,
  emotionId,
  activePreset,
  chords,
  degTokens,
  longFlags,
  mode,
  appendTrail,
]);


  const stop = useCallback(() => {
    clearTimers();
    setActiveIdx(null);
    setIsPlaying(false);
    resetTrails();
  }, []);

  // Clear playback state whenever the emotion preset changes
useEffect(() => {
  stop();
}, [emotionId, stop]);

// Auto-play when a NEW preset emotion is selected
/*
useEffect(() => {
  if (emotionId === "custom") {
    lastEmotionIdRef.current = emotionId;
    return;
  }
  if (!activePreset) return;
  if (!chords.length) return;
  if (isPlaying || isExporting) return;

  // Only auto-play if this is a different preset than last time
  if (lastEmotionIdRef.current !== emotionId) {
    lastEmotionIdRef.current = emotionId;
    start();
  }
}, [emotionId, activePreset, chords, isPlaying, isExporting, start]);
*/

  const onDownloadVideo = useCallback(async () => {
  if (!degTokens.length) return;
  setIsExporting(true);

  try {
    const ac = getCtxExport();
        // Label for export title (use preset label when available)
    
    const FRAME_W = 1080;
    const FRAME_H = 1920;
    const SCALE = 2;
    const FPS = 30;
    
    const exportLabel = activePreset?.label ?? "Custom Flow";
    const exportScaleLabel = mode === "major" ? "B♭ Major" : "C minor";

// For presets: emotion text; for custom: empty
const exportEmotionText =
  activePreset && emotionId !== "custom"
    ? FLOW_EMOTION_TEXT[activePreset.id as keyof typeof FLOW_EMOTION_TEXT]
    : "";

      // Flow chords + borrowed indices for export caption
  let expectedFlowChordsExport: string[] = [];
  let borrowedFlowIdxExport: number[] = [];

    const canvas = document.createElement("canvas");
    canvas.width = FRAME_W * SCALE;
    canvas.height = FRAME_H * SCALE;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("no 2D context");
    const c = ctx as CanvasRenderingContext2D;

    const exportDst = ac.createMediaStreamDestination();
    const stream = (canvas as any).captureStream(FPS) as MediaStream;
    const mixed = new MediaStream([
      ...stream.getVideoTracks(),
      ...exportDst.stream.getAudioTracks(),
    ]);
    const mimeType = pickRecorderMime();
    const chunks: BlobPart[] = [];
    const rec = new MediaRecorder(mixed, { mimeType });
    rec.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };

    // Build schedule (same timing logic as live)
    const baseStepSec = 0.9;
    const tempoMult = activePreset?.tempo ?? 1.0;
    const baseStep = baseStepSec / tempoMult;
    const shortFactor = 0.5;

    const schedule: { startSec: number; idx: number }[] = [];
    let accSec = 0;
    for (let i = 0; i < degTokens.length; i++) {
      const isLong = longFlags[i] ?? true;
      const stepSec = isLong ? baseStep : baseStep * shortFactor;
      schedule.push({ startSec: accSec, idx: i });
      accSec += stepSec;
    }
    const totalSec = accSec;

// ===== Build chords for export audio =====
let chordsToExport: string[][] = [];

if (emotionId !== "custom" && activePreset) {
  // Use FlowPreset for presets (same engine as live)
  const flowPresetExport =
    FLOW_PRESETS[activePreset.id as keyof typeof FLOW_PRESETS];
  const tonicNameFlow =
    flowPresetExport.mode === "minor" ? "C" : "Bb";
  const tonicPcFlow = pitchNameToPc(tonicNameFlow);

  // ASSIGN into the outer variables
  expectedFlowChordsExport = buildFlowChordsForKey(
    tonicPcFlow,
    flowPresetExport
  );

  // Borrowed indices: convert readonly tuple to mutable number[]
  borrowedFlowIdxExport = [
    ...(
      FLOW_BORROWED_INDICES[
        activePreset.id as keyof typeof FLOW_BORROWED_INDICES
      ] ?? []
    ),
  ];

  // Degree-engine chords (reference only, for debug)
  const actualFlowChordsFromDegrees = degTokens.map((tok) =>
    triadToSymbol(triadMidiForToken(tok, mode))
  );

  console.log(
    `%c[Path-of-Flow EXPORT EXPECTED] ${activePreset.id} (${tonicNameFlow} ${flowPresetExport.mode}):`,
    "color:#FBBF24;font-weight:bold",
    expectedFlowChordsExport.join(" → ")
  );
  console.log(
    `%c[Path-of-Flow DEGREE-ENGINE]    ${activePreset.id} (${mode}):`,
    "color:#F97316;font-weight:bold",
    actualFlowChordsFromDegrees.join(" → ")
  );

  // Use FlowPreset chords for actual export audio
  chordsToExport = expectedFlowChordsExport.map((name) =>
    triadFromChordName(name)
  );
} else {
  // Custom mode or no preset: keep degree-based export
  chordsToExport = degTokens.map((tok) =>
    triadMidiForToken(tok, mode)
  );

  const customChordSymbols = chordsToExport.map(triadToSymbol);
  console.log(
    `%c[Path-of-Flow EXPORT CUSTOM] degrees="${degInput}" (mode=${mode}):`,
    "color:#9AE6B4;font-weight:bold",
    customChordSymbols.join(" → ")
  );
}


    // Schedule audio
const t0 = ac.currentTime + 0.2;
for (const { startSec, idx } of schedule) {
  const notes = chordsToExport[idx];
  const at = t0 + startSec;

   if (emotionId !== "custom") {
    console.log(
      `%c[Path-of-Flow EXPORT AUDIO] ${activePreset?.id}:`,
      "color:#22C55E;font-weight:bold",
      triadToSymbol(notes)
    );
  }

  for (const name of notes) {
    loadBufferExport(name)
      .then((buf) => {
        const src = ac.createBufferSource();
        src.buffer = buf;
        const g = ac.createGain();
        g.gain.setValueAtTime(1, at);
        g.gain.setTargetAtTime(0, at + 0.8, 0.2);
        src.connect(g);
        g.connect(exportDst);
        g.connect(ac.destination);
        try {
          src.start(at);
          src.stop(at + 1.5);
        } catch {}
      })
      .catch(() => {});
  }
}

    // Start recording
    rec.start();
    const recordStart = performance.now();

    function renderFrame() {
      const elapsed = (performance.now() - recordStart) / 1000;

      // background gradient
      c.setTransform(1, 0, 0, 1, 0, 0);
      const grad = c.createLinearGradient(0, 0, 0, FRAME_H * SCALE);
      const topClr = backgroundTop;
      const botClr = backgroundBottom;
      grad.addColorStop(0, topClr);
      grad.addColorStop(1, botClr);
      c.fillStyle = grad;
      c.fillRect(0, 0, FRAME_W * SCALE, FRAME_H * SCALE);

      // determine active chord index
      let activeExportIdx = -1;
      for (let i = 0; i < schedule.length; i++) {
        const { startSec } = schedule[i];
        const next = schedule[i + 1]?.startSec ?? totalSec + 999;
        if (elapsed >= startSec && elapsed < next) {
          activeExportIdx = schedule[i].idx;
          break;
        }
        if (elapsed >= totalSec) activeExportIdx = schedule[schedule.length - 1].idx;
      }

      // build trail up to current time
      const trailNodes: number[] = [];
      for (const { startSec, idx } of schedule) {
        if (startSec <= elapsed) {
          const nodeIdx = nodeIndexForToken(degTokens[idx], mode);
          if (nodeIdx >= 0) trailNodes.push(nodeIdx);
        }
      }
      const trailPathExport = pathFromNodes(trailNodes);
      const radiusBase = 1.8;
      const pulseIntensity = activePreset?.pulse ?? 50;
      const pulseFactor = 0.8 + (pulseIntensity / 100) * 0.8;
      const activeRadius = radiusBase * pulseFactor;

      // ------------------------------------
// CAPTION + CIRCLE (export)
// ------------------------------------

//
// 1) Circle placement + scaling
//
const RING_SCALE = 1.2;   // <-- make ring 1.2× larger
const targetRadiusPx = FRAME_W * SCALE * 0.25 * RING_SCALE; 
const SCALE_LIVE = targetRadiusPx / 36;   // 36 CoF units = radius

const circleCenterX = (FRAME_W * SCALE) / 2;
const circleCenterY = FRAME_H * SCALE * 0.60;   // good placement for export

// === Emotion Title (high contrast, moved up) ===
c.save();
c.textAlign = "center";
c.textBaseline = "middle";

// MUCH more visible than previous gray
c.fillStyle = "#E6EBF2";
// Larger and more readable
c.font = `${64 * SCALE}px system-ui, -apple-system, sans-serif`;

// NEW: move title UP by 20px from previous position
const titleY =
  circleCenterY - targetRadiusPx - (40 * SCALE) - (40 * SCALE);

// Render
c.fillText(
  `${exportLabel} – Path of Flow`,
  (FRAME_W * SCALE) / 2,
  titleY
);

c.restore();
//
// 2) Compute caption Y based on ring geometry
//    caption sits just UNDER the ring
//
const captionY = circleCenterY + targetRadiusPx + (70 * SCALE); 
// (40 * SCALE) gives a clean margin; can tweak later

//
// 3) Draw background (already done above, keep)
//
// 4) Draw caption UNDER the ring
//
const CAPTION_FONT = 48;
c.font = `${CAPTION_FONT * SCALE}px Inter, system-ui, sans-serif`;
c.textAlign = "center";
c.textBaseline = "top";

const captionTextPieces = degTokens.map(tok => tok.display);
const captionText = captionTextPieces.join("   ");
const captionActiveColor = modeColor;
const baseTextColor = "#E6EBF2";

// Build chord line with ⭐ for borrowed Flow chords
const chordPiecesExport = expectedFlowChordsExport.map((ch, idx) =>
  borrowedFlowIdxExport.includes(idx) ? `${ch} ⭐` : ch
);
const chordTextExport = chordPiecesExport.join("   ");

// Draw full caption
c.fillStyle = baseTextColor;
c.fillText(captionText, (FRAME_W * SCALE) / 2, captionY);

// Highlight active token
if (activeExportIdx >= 0 && activeExportIdx < degTokens.length) {
  const tokens = captionTextPieces;
  const gaps = "   ";
  const parts: { text: string; isGap: boolean }[] = [];

  tokens.forEach((t, i) => {
    parts.push({ text: t, isGap: false });
    if (i < tokens.length - 1) parts.push({ text: gaps, isGap: true });
  });

  c.font = `${CAPTION_FONT * SCALE}px Inter, system-ui, sans-serif`;
  const totalW = parts.reduce((s, p) => s + c.measureText(p.text).width, 0);
  let x = (FRAME_W * SCALE - totalW) / 2;

  let idx = 0;
  for (const part of parts) {
    const w = c.measureText(part.text).width;
    const isActive = !part.isGap && idx === activeExportIdx;

    if (isActive) {
      c.fillStyle = captionActiveColor;
      c.fillText(part.text, x + w / 2, captionY);
    }
    x += w;
    if (!part.isGap) idx++;
  }
}
// Draw chord names line under degrees
const chordLineY = captionY + CAPTION_FONT * SCALE * 1.4; // tweak spacing if needed

c.font = `${CAPTION_FONT * 0.85 * SCALE}px Inter, system-ui, sans-serif`;
c.fillStyle = baseTextColor;
c.textAlign = "center";
c.textBaseline = "top";
c.fillText(
  chordTextExport,
  (FRAME_W * SCALE) / 2,
  chordLineY
);
// === Scale helper line under the chords caption ===
const scaleHelperY = chordLineY + CAPTION_FONT * 0.85 * SCALE * 1.6;

c.font = `${32 * SCALE}px Inter, system-ui, sans-serif`;
c.fillStyle = "#E6EBF2"; 
c.textAlign = "center";
c.textBaseline = "top";

c.fillText(
  `Scale: ${exportScaleLabel}`,
  (FRAME_W * SCALE) / 2,
  scaleHelperY
);

// === Emotion explanation under the scale helper (presets only) ===
if (exportEmotionText) {
  const emotionLines = exportEmotionText.split("\n");
  c.font = `${26 * SCALE}px Inter, system-ui, sans-serif`;
  c.fillStyle = "#E6EBF2";

  let textY = scaleHelperY + 32 * SCALE;

  for (const line of emotionLines) {
    c.fillText(
      line,
      (FRAME_W * SCALE) / 2,
      textY
    );
    textY += 28 * SCALE;
  }
}

//
// 5) Draw circle + nodes + trails
//
c.save();

// map CoF [0..100] → pixel-space
c.setTransform(
  SCALE_LIVE, 0, 0, SCALE_LIVE,
  circleCenterX - SCALE_LIVE * 50,
  circleCenterY - SCALE_LIVE * 50
);

// ---- RING ----
c.strokeStyle = "rgba(230,235,242,0.2)";
c.lineWidth = 2 / SCALE_LIVE;
c.beginPath();
c.arc(50, 50, 36, 0, Math.PI * 2);
c.stroke();

// ---- TRAILS ----
if (trailPathExport) {
  const path = new Path2D(trailPathExport.replace(/,/g, " "));
  c.strokeStyle = modeColor;
  c.lineWidth = 24 / SCALE_LIVE;
  c.globalAlpha = 0.9;
  c.stroke(path);
  c.globalAlpha = 1;
}

// ---- NODES & LABELS ----
for (let i = 0; i < circleLabels.length; i++) {
  const p = nodePosition(i, 36);
  const lp = labelPlacement(i, p);
  const isActiveNode = i === activeNodeIndexForExport(activeExportIdx, degTokens, mode);

  // node
  c.beginPath();
  c.arc(p.x, p.y, isActiveNode ? activeRadius : radiusBase, 0, Math.PI * 2);
  c.fillStyle = isActiveNode ? modeColor : "rgba(230,235,242,0.55)";
  c.fill();

  // label
  c.font = "4px Inter, system-ui, sans-serif";
  c.fillStyle = baseTheme.text;

  // SVG → Canvas alignment fix
  c.textAlign = lp.anchor === "middle" ? "center" : lp.anchor;

  let canvasBaseline: CanvasTextBaseline;
  switch (lp.baseline) {
    case "baseline": canvasBaseline = "alphabetic"; break;
    case "middle":   canvasBaseline = "middle";     break;
    case "hanging":  canvasBaseline = "hanging";    break;
    default:         canvasBaseline = "alphabetic";
  }
  c.textBaseline = canvasBaseline;

  c.fillText(circleLabels[i], lp.x, lp.y);
}

c.restore();

      if (elapsed < totalSec + 0.5) {
        requestAnimationFrame(renderFrame);
      } else {
        rec.stop();
      }
    }

    // helper to compute active node index in export (same as live logic)
    function activeNodeIndexForExport(
      chordIdx: number,
      tokens: DegToken[],
      mode: Mode
    ): number {
      if (chordIdx < 0 || chordIdx >= tokens.length) return -1;
      try {
        return nodeIndexForToken(tokens[chordIdx], mode);
      } catch {
        return -1;
      }
    }

    renderFrame();

    const recorded: Blob = await new Promise((res) => {
      rec.onstop = () => {
        const blob = new Blob(chunks, { type: mimeType || "video/webm" });
        res(blob);
      };
    });

    const outBlob = await convertToMp4Server(recorded);
    const safeName = (degInput || "cof-piano")
      .replace(/[^A-Za-z0-9\-_.]+/g, "-")
      .toLowerCase();

    const a = document.createElement("a");
    a.download = `${safeName}.mp4`;
    a.href = URL.createObjectURL(outBlob);
    document.body.appendChild(a);
    a.click();
    a.remove();
  } catch (err) {
    console.error("[download] export error", err);
    try {
      alert("Could not prepare video. Please try again.");
    } catch {}
  } finally {
    setIsExporting(false);
  }
}, [degTokens, longFlags, mode, activePreset, backgroundTop, backgroundBottom, modeColor, degInput, emotionId]);

  useEffect(() => {
    return () => clearTimers();
  }, []);

  // Active node index
  const activeNodeIndex = useMemo(() => {
    if (activeIdx === null) return -1;
    if (activeIdx < 0 || activeIdx >= degTokens.length) return -1;
    try {
      return nodeIndexForToken(degTokens[activeIdx], mode);
    } catch {
      return -1;
    }
  }, [activeIdx, degTokens, mode]);

  // Pulse radius modulation from preset
  const pulseIntensity = activePreset?.pulse ?? 50; // 0–100
  const pulseFactor = 0.8 + (pulseIntensity / 100) * 0.8; // 0.8..1.6
  const baseNodeRadius = 1.8;
  const activeNodeRadius = baseNodeRadius * pulseFactor;

  return (
    <main
      style={{
        minHeight: "100vh",
        background: `linear-gradient(to bottom, ${backgroundTop}, ${backgroundBottom})`,
        color: baseTheme.text,
        overflowX: "hidden",
      }}
    >
      <div
        style={{
          maxWidth: 520,
          margin: "0 auto",
          padding: 12,
          boxSizing: "border-box",
        }}
      >
        <h1
  style={{
    margin: "4px 0 8px",
    fontSize: 24,
    lineHeight: 1.25,
    textAlign: "center",
    letterSpacing: 0.2,
    fontWeight: 800,
    background: "linear-gradient(90deg, #e7c86e, #a687ff 40%, #5fc3ff 80%)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    backgroundClip: "text",
  }}
>
  Path of Flow
</h1>
        <div
  style={{
    textAlign: "center",
    fontSize: 15,
    lineHeight: 1.45,
    color: baseTheme.muted,
    marginTop: -2,
    marginBottom: 10,
    paddingInline: 10,
  }}
>
  Explore the smooth, song-like movement of harmony.
</div>

        <section
          style={{
            background: baseTheme.card,
            border: `1px solid ${baseTheme.border}`,
            borderRadius: 16,
            padding: 12,
            display: "grid",
            gap: 10,
          }}
        >
          {/* Emotion preset selector */}
          <div
            style={{
              display: "flex",
              gap: 8,
              justifyContent: "center",
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <label
              style={{
                fontSize: 13,
                color: baseTheme.muted,
              }}
            >
              Emotion&nbsp;
            </label>
            <select
              value={emotionId}
              onChange={(e) => setEmotionId(e.target.value as EmotionId)}
              style={{
                background: "#0F1821",
                color: baseTheme.text,
                border: `1px solid ${baseTheme.border}`,
                borderRadius: 8,
                padding: "6px 8px",
                fontSize: 13,
              }}
            >
              <option value="custom">Custom (Free typing)</option>
              {EMOTION_PRESETS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>

          {/* Input row (only meaningful in Custom; still visible for presets so you can see the degrees) */}
          <div
            style={{
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <label style={{ fontSize: 13, color: baseTheme.muted }}>
              Degrees&nbsp;
              <span style={{ opacity: 0.8 }}>
                (e.g. 1 5 6 4, 1 2b 4#, 1-5-6-4)
              </span>
            </label>
            <input
              value={degInput}
              onChange={(e) => {
                setEmotionId("custom");
                setDegInput(e.target.value);
              }}
              onKeyDown={(e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (!isPlaying && !isExporting && chords.length) {
        start();
      }
    }
  }}
              placeholder="1 5 6 4"
              style={{
                minWidth: 160,
                maxWidth: 260,
                background: "#0F1821",
                color: baseTheme.gold,
                border: `1px solid ${baseTheme.border}`,
                borderRadius: 8,
                padding: "8px 10px",
                fontSize: 14,
                fontFamily:
                  'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Courier New", monospace',
              }}
            />
          </div>
          {/* Actions */}
          <div
  style={{
    display: "flex",
    gap: 10,
    justifyContent: "center",
    marginTop: 8,
    flexWrap: "wrap",
  }}
>
  <button
    onClick={start}
    disabled={!chords.length || isPlaying || isExporting}
    style={{
      background:
        !chords.length || isPlaying || isExporting ? "#2A3442" : baseTheme.gold,
      color:
        !chords.length || isPlaying || isExporting ? "#6B7280" : "#081019",
      border: "none",
      borderRadius: 999,
      padding: "10px 16px",
      fontWeight: 700,
      cursor:
        !chords.length || isPlaying || isExporting ? "not-allowed" : "pointer",
      fontSize: 16,
      minHeight: 40,
    }}
  >
    ▶ Play
  </button>
  
  <button
    onClick={onDownloadVideo}
    disabled={!degTokens.length || isExporting}
    style={{
      background: "transparent",
      color: baseTheme.gold,
      border: `1px solid ${baseTheme.border}`,
      borderRadius: 999,
      padding: "8px 14px",
      fontWeight: 700,
      cursor: !degTokens.length || isExporting ? "not-allowed" : "pointer",
      fontSize: 14,
      minHeight: 36,
    }}
  >
    💾 {isExporting ? "Recording…" : "Download"}
  </button>
</div>

          {/* Mode toggle (only active in Custom) */}
          <div
            style={{
              display: "flex",
              gap: 8,
              justifyContent: "center",
              marginTop: 4,
              opacity: emotionId === "custom" ? 1 : 0.4,
            }}
          >
            <button
              onClick={() => {
                setEmotionId("custom");
                setModeState("major");
              }}
              style={{
                padding: "6px 10px",
                borderRadius: 8,
                border:
                  mode === "major"
                    ? `2px solid ${baseTheme.gold}`
                    : `1px solid ${baseTheme.border}`,
                background:
                  mode === "major" ? "#0F1821" : "transparent",
                color: baseTheme.text,
                fontWeight: 700,
                cursor: "pointer",
                fontSize: 13,
              }}
            >
              B♭ Major (Circle)
            </button>
            <button
              onClick={() => {
                setEmotionId("custom");
                setModeState("minor");
              }}
              style={{
                padding: "6px 10px",
                borderRadius: 8,
                border:
                  mode === "minor"
                    ? `2px solid ${baseTheme.gold}`
                    : `1px solid ${baseTheme.border}`,
                background:
                  mode === "minor" ? "#0F1821" : "transparent",
                color: baseTheme.text,
                fontWeight: 700,
                cursor: "pointer",
                fontSize: 13,
              }}
            >
              C minor (Circle)
            </button>
          </div>

          {/* Caption block ABOVE the circle */}
<div
  style={{
    textAlign: "center",
    marginTop: 10,
    fontSize: 16,
    lineHeight: 1.4,
    letterSpacing: 0.2,
  }}
>
  {/* Line 1: Degrees */}
  {degTokens.length ? (
    degTokens.map((tok, idx) => {
      const isActive = activeIdx === idx;
      return (
        <span
          key={idx}
          style={{
            marginRight: 8,
            fontWeight: isActive ? 800 : 500,
            color: isActive ? modeColor : baseTheme.text,
          }}
        >
          {tok.display}
        </span>
      );
    })
  ) : (
    <span style={{ opacity: 0.7 }}>
      Enter a progression (e.g. 1 5 6 4 or 1 2b 4# or 1-5-6-4)
    </span>
  )}

  {/* Line 2: Chord names with ⭐ for borrowed chords (presets only) */}
  {!isCustom && flowUiChordNames.length > 0 && (
    <div
      style={{
        marginTop: 2,
        fontSize: 14,
        color: baseTheme.text,
        letterSpacing: 0.15,
      }}
    >
      {flowUiChordNames.map((ch, idx) => {
        const isBorrowed = flowUiBorrowedIndices.includes(idx);
        return (
          <span
            key={idx}
            style={{
              marginRight: 10,
              fontWeight: isBorrowed ? 800 : 500,
              color: isBorrowed ? baseTheme.gold : baseTheme.text,
            }}
          >
            {ch}
            {isBorrowed ? " ⭐" : ""}
          </span>
        );
      })}
    </div>
  )}
</div>

          {/* Circle */}
          <div
            className="minw0"
            style={{
              display: "grid",
              justifyContent: "center",
              paddingInline: 2,
              marginTop: 6,
            }}
          >
            <svg
              viewBox="0 0 100 100"
              width={360}
              height={360}
              style={{ overflow: "visible" }}
              shapeRendering="geometricPrecision"
            >
              {/* Ring */}
              <circle
                cx="50"
                cy="50"
                r="36"
                stroke="rgba(230,235,242,0.2)"
                strokeWidth="2"
                fill="none"
              />

              {/* Trails */}
              {trailPath && (
                <path
                  d={trailPath}
                  fill="none"
                  stroke={modeColor}
                  strokeWidth={1.6}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity={0.9}
                />
              )}

              {/* Nodes + labels */}
              {circleLabels.map((lab, i) => {
                const p = nodePosition(i, 36);
                const lp = labelPlacement(i, p);
                const isActive = i === activeNodeIndex;
                return (
                  <g key={lab + i}>
                    <circle
                      cx={p.x}
                      cy={p.y}
                      r={isActive ? activeNodeRadius : baseNodeRadius}
                      fill={isActive ? modeColor : "rgba(230,235,242,0.55)"}
                    />
                    <text
                      x={lp.x}
                      y={lp.y}
                      textAnchor={lp.anchor}
                      dominantBaseline={lp.baseline}
                      fontSize="4"
                      fill={baseTheme.text}
                      style={{
                        userSelect: "none",
                        pointerEvents: "none",
                      }}
                    >
                      {lab}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Mode label under the circle */}
          <div
            style={{
              marginTop: 4,
              textAlign: "center",
              fontSize: 13,
              color: baseTheme.muted,
            }}
          >
            Scale:&nbsp;
            <span
              style={{
                fontWeight: 700,
                color: modeColor,
              }}
            >
              {mode === "major" ? "B♭ Major" : "C minor"}
              {activePreset ? ` • ${activePreset.label}` : ""}
            </span>
          </div>
{/* Emotion explanation under the scale helper (presets only) */}
{emotionId !== "custom" && (
  <div
    style={{
      marginTop: 6,
      textAlign: "center",
      fontSize: 13,
      lineHeight: 1.5,
      color: baseTheme.muted,
      paddingInline: 12,
    }}
  >
    {FLOW_EMOTION_TEXT[emotionId as keyof typeof FLOW_EMOTION_TEXT]
      ?.split("\n")
      .map((line, i) => (
        <div key={i}>{line}</div>
      ))}
  </div>
)}
          
        </section>
      </div>
      {/* Navigation footer */}
<div style={{ marginTop: 32, textAlign: "center", fontSize: 14, lineHeight: 1.6 }}>
  <div style={{ marginBottom: 10 }}>
    <Link
      href="/learn/two-paths-of-harmony"
      style={{
        fontWeight: 700,
        color: "#a687ff",
        textDecoration: "none",
      }}
    >
      ↔ Compare both paths (Two Paths of Harmony)
    </Link>
  </div>

  <div>
    <Link
      href="/learn/path-of-color"
      style={{
        fontWeight: 700,
        color: "#5fc3ff",
        textDecoration: "none",
      }}
    >
      → Go to Path of Color
    </Link>
  </div>
</div>
    </main>
  );
}