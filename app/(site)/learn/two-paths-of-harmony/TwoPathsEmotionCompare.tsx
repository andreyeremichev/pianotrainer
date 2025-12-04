"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import * as Tone from "tone";
import { parseProgression, type ParsedChord } from "@/lib/harmony/chords";
import { playProgression } from "@/lib/harmony/audio";
import {
  FLOW_PRESETS,
  buildFlowChordsForKey,
  pitchNameToPc,
} from "@/lib/harmony/flow";

/* =========================
   Shared emotion model
========================= */

type EmotionId =
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

type EmotionConfig = {
  id: EmotionId;
  label: string;
  emoji: string;
  // Flow side
  flowKey: "C minor" | "B♭ Major";
  flowDegrees: string;
  flowFormula: string;
  flowExample: string;
  // Color side
  colorFormula: string;
  colorChords: string;
  colorExampleKey: string;
  // Visual / timing
  gradientTop: string;
  gradientBottom: string;
  trailColor: string;
  glowColor: string;
  tempo: number;
};

const EMOTIONS: EmotionConfig[] = [
  {
    id: "calm",
    label: "Calm / Peace",
    emoji: "🌿",
    flowKey: "B♭ Major",
    flowDegrees: "1 5 6 4",
    flowFormula: "1, 5, 6, 4",
    flowExample: "Bb → F → Gm → Eb",
    colorFormula: "M → M(+2) → M(+3) → M(–2)",
    colorChords: "C D F Eb",
    colorExampleKey: "C",
    gradientTop: "#2f5d4f",
    gradientBottom: "#6bbf8f",
    trailColor: "#6dd2a3",
    glowColor: "#c7f2da",
    tempo: 1.0,
  },
  {
    id: "playful",
    label: "Playful",
    emoji: "🎈",
    flowKey: "B♭ Major",
    flowDegrees: "1 2 5 1",
    flowFormula: "1, 2, 5, 1",
    flowExample: "Bb → Cm → F → Bb",
    colorFormula: "M → M(+3) → M(+3) → M(+2)",
    colorChords: "C Eb F# G#",
    colorExampleKey: "C",
    gradientTop: "#f59e0b",
    gradientBottom: "#f97316",
    trailColor: "#ffb74d",
    glowColor: "#ffe0b2",
    tempo: 1.0,
  },
  {
    id: "magic",
    label: "Magic / Fantasy",
    emoji: "✨",
    flowKey: "B♭ Major",
    flowDegrees: "4 1 5 6",
    flowFormula: "4, 1, 5, 6",
    flowExample: "Eb → Bb → F → Gm",
    colorFormula: "M → M(+8) → M(–4) → M(+3)",
    colorChords: "C Ab E G",
    colorExampleKey: "C",
    gradientTop: "#6d28d9",
    gradientBottom: "#a855f7",
    trailColor: "#c4a1ff",
    glowColor: "#ead9ff",
    tempo: 1.0,
  },
  {
    id: "sadness",
    label: "Sadness",
    emoji: "😢",
    flowKey: "C minor",
    flowDegrees: "1 6b 3b 7b",
    flowFormula: "1, 6b, 3b, 7b",
    flowExample: "Cm → Ab → Eb → Bb",
    colorFormula: "m → M(–4) → m(–3) → m(–1)",
    colorChords: "Cm Ab Fm Em",
    colorExampleKey: "C",
    gradientTop: "#2D3E68",
    gradientBottom: "#6076AF",
    trailColor: "#4A6FA5",
    glowColor: "#A8C1E8",
    tempo: 0.9,
  },

  {
    id: "mystery",
    label: "Mystery",
    emoji: "🕵️‍♀️",
    flowKey: "C minor",
    flowDegrees: "1 4 7b 1",
    flowFormula: "1, 4, 7b, 1",
    flowExample: "Cm → Fm → Bb → Cm",
    colorFormula: "m → M(+2) → dim(+3) → M(+1)",
    colorChords: "Cm D F° F#",
    colorExampleKey: "C",
    gradientTop: "#272343",
    gradientBottom: "#4b4e91",
    trailColor: "#8fb3ff",
    glowColor: "#d0e1ff",
    tempo: 1.0,
  },
  {
    id: "melancholy",
    label: "Melancholy",
    emoji: "🌧️",
    flowKey: "C minor",
    flowDegrees: "6b 4 1 5",
    flowFormula: "6b, 4, 1, 5",
    flowExample: "Ab → Fm → Cm → G",
    colorFormula: "m → M(–3) → m(+4) → M(–3)",
    colorChords: "Cm A C#m A#",
    colorExampleKey: "C",
    gradientTop: "#314159",
    gradientBottom: "#60738d",
    trailColor: "#5a7bbc",
    glowColor: "#c4d4f6",
    tempo: 1.0,
  },
  
  {
    id: "wonder",
    label: "Wonder / Transcendence",
    emoji: "🌌",
    flowKey: "C minor",
    flowDegrees: "1 6b 3b 4",
    flowFormula: "1, 6b, 3b, 4",
    flowExample: "Cm → Ab → Eb → F",
    colorFormula: "m → M(+5) → M(+2) → M(+4)",
    colorChords: "Cm F G B",
    colorExampleKey: "C",
    gradientTop: "#1d3557",
    gradientBottom: "#457b9d",
    trailColor: "#8ecae6",
    glowColor: "#e0fbff",
    tempo: 1.0,
  },
  {
    id: "tension",
    label: "Tension / Suspense",
    emoji: "😬",
    flowKey: "C minor",
    flowDegrees: "1 2 5 1",
    flowFormula: "1, 2, 5, 1",
    flowExample: "Cm → D° → G → Cm",
    colorFormula: "M → m(+1) → dim(+3) → M(+2)",
    colorChords: "C C#m E° F#",
    colorExampleKey: "C",
    gradientTop: "#4b5563",
    gradientBottom: "#9ca3af",
    trailColor: "#fbbf24",
    glowColor: "#fef3c7",
    tempo: 1.0,
  },
    {
    id: "anger",
    label: "Anger",
    emoji: "😡",
    flowKey: "C minor",
    flowDegrees: "1 4 2b 5",
    flowFormula: "1, 4, 2b, 5",
    flowExample: "Cm → Fm → Db → G",
    colorFormula: "m → m(+1) → dim(+3) → M(+2)",
    colorChords: "Cm C#m E° F#",
    colorExampleKey: "C",
    gradientTop: "#6b1b25",
    gradientBottom: "#c0392b",
    trailColor: "#ff7373",
    glowColor: "#ffc4c4",
    tempo: 1.0,
  },
  {
    id: "fear",
    label: "Fear / Horror",
    emoji: "😱",
    flowKey: "C minor",
    flowDegrees: "1 2b 5 1",
    flowFormula: "1, 2b, 5, 1",
    flowExample: "Cm → Db → G → Cm",
    colorFormula: "m → dim(+6) → M(+1) → dim(+3)",
    colorChords: "Cm F#° G A#°",
    colorExampleKey: "C",
    gradientTop: "#222933",
    gradientBottom: "#4a5568",
    trailColor: "#6bc1ff",
    glowColor: "#c0e6ff",
    tempo: 1.0,
  },
];

type EmotionCopy = {
  introLine1: string;
  introLine2: string;
  flowLabel: string;
  colorLabel: string;
  outroLine1: string;
  outroLine2: string;
};

const EMOTION_COPY: Record<EmotionId, EmotionCopy> = {
  playful: {
    introLine1: "🎈 Playful",
    introLine2: "Two parts, one mood",
    flowLabel: "Flow = light bounce",
    colorLabel: "Color = playful spark",
    outroLine1: "Blend them 🎨",
    outroLine2: "to keep the fun moving",
  },
  anger: {
    introLine1: "⚡ Anger",
    introLine2: "Two parts, one mood",
    flowLabel: "Flow = rising pressure",
    colorLabel: "Color = sharp release",
    outroLine1: "Combine both ⚡️",
    outroLine2: "to control the energy",
  },
  mystery: {
    introLine1: "🕵️‍♀️ Mystery",
    introLine2: "Two parts, one mood",
    flowLabel: "Flow = quiet search",
    colorLabel: "Color = sudden shift",
    outroLine1: "Mix them 🌀",
    outroLine2: "to shape your story",
  },
  sadness: {
    introLine1: "😢 Sadness",
    introLine2: "Two parts, one mood",
    flowLabel: "Flow = gentle fall",
    colorLabel: "Color = soft ache",
    outroLine1: "Use both 💙",
    outroLine2: "to color the emotion deeply",
  },
  fear: {
    introLine1: "😨 Fear",
    introLine2: "Two parts, one mood",
    flowLabel: "Flow = creeping tension",
    colorLabel: "Color = sharp jolt",
    outroLine1: "Pair them 🧩",
    outroLine2: "to build and release tension",
  },
  melancholy: {
    introLine1: "🌫️ Melancholy",
    introLine2: "Two parts, one mood",
    flowLabel: "Flow = drifting thought",
    colorLabel: "Color = distant pull",
    outroLine1: "Let both paths 🌧️",
    outroLine2: "shape the mood gently",
  },
  calm: {
    introLine1: "🌙 Calm",
    introLine2: "Two parts, one mood",
    flowLabel: "Flow = smooth breath",
    colorLabel: "Color = soft glow",
    outroLine1: "Balance the two ☯️",
    outroLine2: "to keep the peace",
  },
  tension: {
    introLine1: "🎭 Tension",
    introLine2: "Two parts, one mood",
    flowLabel: "Flow = slow build",
    colorLabel: "Color = unstable edge",
    outroLine1: "Use both 🪢",
    outroLine2: "to craft the pull-and-release",
  },
  magic: {
    introLine1: "✨ Magic",
    introLine2: "Two parts, one mood",
    flowLabel: "Flow = floating motion",
    colorLabel: "Color = shimmering turn",
    outroLine1: "Blend them ✨",
    outroLine2: "to make the moment glow",
  },
  wonder: {
    introLine1: "🌌 Wonder",
    introLine2: "Two parts, one mood",
    flowLabel: "Flow = open horizon",
    colorLabel: "Color = bright lift",
    outroLine1: "Combine both 🌠",
    outroLine2: "to open the space wider",
  },
};

/* =========================
   Flow side – degree model
========================= */

type Mode = "major" | "minor";
type DegreeNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7;
type Acc = -1 | 0 | 1;

type DegToken = {
  base: DegreeNumber;
  acc: Acc;
  display: string;
};

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
  1: 0,
  2: 2,
  3: 3,
  4: 5,
  5: 7,
  6: 8,
  7: 10,
};

const TRIAD_MAJOR = [0, 4, 7];
const TRIAD_MINOR = [0, 3, 7];
const TRIAD_DIM = [0, 3, 6];

const TONIC_PC_BB = 10;
const TONIC_PC_CM = 0;

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
] as const;

function midiToNoteName(midi: number): string {
  const pc = PITCHES[midi % 12];
  const oct = Math.floor(midi / 12) - 1;
  return `${pc}${oct}`;
}

const FLOW_CIRCLE_LABELS = [
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

type Pt = { x: number; y: number };

function nodePosition(i: number, r = 36): Pt {
  const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
  const xRaw = 50 + Math.cos(a) * r;
  const yRaw = 50 + Math.sin(a) * r;
  const x = Number(xRaw.toFixed(3));
  const y = Number(yRaw.toFixed(3));
  return { x, y };
}

function labelPlacement(i: number, p: Pt) {
  const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
  const ux = Math.cos(a);
  const uy = Math.sin(a);
  const xRaw = p.x + 3.0 * ux;
  const yRaw = p.y + 3.0 * uy;
  const x = Number(xRaw.toFixed(3));
  const y = Number(yRaw.toFixed(3));

  const ax = Math.abs(ux);
  const ay = Math.abs(uy);
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

const NODE_INDEX_MAJOR_BASE: Record<DegreeNumber, number> = {
  1: 0,
  2: 2,
  3: 4,
  4: 11,
  5: 1,
  6: 3,
  7: 5,
};

const NODE_INDEX_MINOR_BASE: Record<DegreeNumber, number> = {
  1: 0,
  2: 2,
  3: 9,
  4: 11,
  5: 1,
  6: 8,
  7: 10,
};

const NODE_INDEX_CHROMA: Record<string, number> = {
  "2,-1": 7,
  "3,-1": 9,
  "4,1": 6,
  "6,-1": 8,
  "7,-1": 10,
};

function parseDegreeProgression(input: string): DegToken[] {
  const tokens: DegToken[] = [];
  const re = /([b#]?[1-7][b#]?)/gi;
  let m: RegExpExecArray | null;

  while ((m = re.exec(input)) !== null) {
    const raw = m[1];
    const s = raw.trim();
    const m2 = /^([b#]?)([1-7])([b#]?)$/i.exec(s);
    if (!m2) continue;

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
  }

  return tokens;
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

function buildFullPianoUrls(): Record<string, string> {
  const urls: Record<string, string> = {};

  for (const p of ["A", "A#", "B"] as const) {
    const name = `${p}0`;
    const safe = name.replace("#", "%23");
    urls[name] = `${safe}.wav`;
  }

  for (let oct = 1; oct <= 7; oct++) {
    for (const p of PITCHES) {
      const name = `${p}${oct}`;
      const safe = name.replace("#", "%23");
      urls[name] = `${safe}.wav`;
    }
  }

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

/* =========================
   FLOW circle component
========================= */

type FlowCircleProps = {
  emotion: EmotionConfig;
  playToken: number;       // increment triggers one pass
  onFinished?: () => void; // called when done
};

function FlowCircle({ emotion, playToken, onFinished }: FlowCircleProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeNodeIndex, setActiveNodeIndex] = useState<number | null>(null);

  const samplerRef = useRef<Tone.Sampler | null>(null);
  const timeoutsRef = useRef<number[]>([]);

  // 1. Shared Flow preset for this emotion
  const preset = FLOW_PRESETS[emotion.id];

  // 2. Canonical tonic: minor → C, major → Bb
  const tonicPc =
    preset.mode === "minor" ? pitchNameToPc("C") : pitchNameToPc("Bb");

  // 3. Build the actual Flow chords via FlowPreset
  const flowChordNames = useMemo(
    () => buildFlowChordsForKey(tonicPc, preset),
    [tonicPc, preset]
  );

  // 4. Degrees for node positions (from preset, not local string)
  const degreeTokens = useMemo(
    () => parseDegreeProgression(preset.degrees.join(" ")),
    [preset.degrees]
  );

  const mode: Mode = preset.mode;

  const flowNodeIndices = useMemo(
    () => degreeTokens.map((tok) => nodeIndexForToken(tok, mode)),
    [degreeTokens, mode]
  );

  const clearTimers = useCallback(() => {
    timeoutsRef.current.forEach((id) => clearTimeout(id));
    timeoutsRef.current = [];
  }, []);

  const stopPlayback = useCallback(() => {
    clearTimers();
    setIsPlaying(false);
    setActiveNodeIndex(null);
  }, [clearTimers]);

  const startPlayback = useCallback(async () => {
  if (!flowChordNames.length) return;

  stopPlayback();
  setIsPlaying(true);
  setActiveNodeIndex(null);

  await Tone.start();
  await ensurePianoSampler(samplerRef);
  const s = samplerRef.current;
  if (!s) return;

  const baseStepSec = 0.9;
  const tempoMult = emotion.tempo || 1.0;
  const stepSec = baseStepSec / tempoMult;

  let accSec = 0;
  const now = Tone.now();

  flowChordNames.forEach((chName, idx) => {
    const notes = triadFromChordName(chName);
    const startTime = now + accSec;

    // Play Flow chord
    if (notes.length) {
      (s as any).triggerAttackRelease(notes, 0.8, startTime);
    }

    const tok = degreeTokens[idx];
    const nodeIndex = nodeIndexForToken(tok, mode);

    const tid = window.setTimeout(() => {
      setActiveNodeIndex(nodeIndex);
    }, accSec * 1000);
    timeoutsRef.current.push(tid);

    accSec += stepSec;
  });

  const totalSec = accSec;
  const endId = window.setTimeout(() => {
    setIsPlaying(false);
    setActiveNodeIndex(null);
    onFinished?.();
  }, (totalSec + 0.5) * 1000);
  timeoutsRef.current.push(endId);
}, [flowChordNames, degreeTokens, mode, emotion.tempo, stopPlayback, onFinished]);

  useEffect(() => {
    if (!playToken) return;
    startPlayback().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playToken]);

  useEffect(() => {
    return () => {
      clearTimers();
    };
  }, [clearTimers]);

    return (
     <div
      style={{
        width: "180px",
        height: "180px",
        maxWidth: "100%",
      }}
    >
      <button
        type="button"
        className="two-paths-circle-btn"
        aria-label={`Flow circle for ${emotion.label}`}
        style={{
          background: `radial-gradient(circle at 30% 20%, ${emotion.gradientTop}, ${emotion.gradientBottom})`,
          width: "100%",
          height: "100%",
          borderRadius: "999px",
          border: "1px solid rgba(0,0,0,0.12)",
          padding: 0,
          overflow: "hidden",
          display: "block",
          cursor: "default",
        }}
      >
        <svg
          viewBox="0 0 100 100"
          style={{ width: "100%", height: "100%", display: "block" }}
        >
          <circle
            cx={50}
            cy={50}
            r={38}
            fill="none"
            stroke="rgba(0,0,0,0.35)"
            strokeWidth={1}
          />

          {FLOW_CIRCLE_LABELS.map((label, i) => {
            const p = nodePosition(i, 36);
            const { x, y, anchor, baseline } = labelPlacement(i, p);
            return (
              <text
                key={i}
                x={x}
                y={y}
                textAnchor={anchor}
                dominantBaseline={baseline}
                fontSize={5.0}
                fill="rgba(255,255,255,0.8)"
                style={{ fontWeight: 600 }}
              >
                {label}
              </text>
            );
          })}

          {FLOW_CIRCLE_LABELS.map((_, i) => {
            const p = nodePosition(i, 33);
            const isActive = activeNodeIndex === i;
            return (
              <circle
                key={i}
                cx={p.x}
                cy={p.y}
                r={isActive ? 3.2 : 2.4}
                fill={isActive ? emotion.trailColor : "rgba(0,0,0,0.7)"}
                stroke={isActive ? emotion.glowColor : "rgba(255,255,255,0.25)"}
                strokeWidth={isActive ? 1 : 0.5}
              />
            );
          })}

                 </svg>
      </button>
    </div>
  );
}

/* =========================
   COLOR circle component
========================= */

const CHROMA_LABELS: string[] = [
  "C",
  "C♯/D♭",
  "D",
  "E♭/D♯",
  "E",
  "F",
  "F♯/G♭",
  "G",
  "A♭/G♯",
  "A",
  "B♭/A♯",
  "B",
];

function getChordHighlightColor(emotionId: EmotionId, chordName: string): string | null {
  switch (emotionId) {
    case "sadness":
      if (chordName === "Em") return "#3A7BBF";
      return null;

    case "anger":
      if (chordName === "C#m") return "#D84C3D";
      if (chordName === "E°") return "#FF6B3D";
      return null;

    case "fear":
      if (chordName === "F#°") return "#9A00FF";
      if (chordName === "A#°") return "#B600FF";
      return null;

    case "mystery":
      if (chordName === "F°") return "#634DFF";
      return null;

    case "melancholy":
      if (chordName === "A") return "#E6A857";
      return null;

    case "calm":
      if (chordName === "Eb") return "#C9B4FF"; // improved calm color
      return null;

    case "playful":
      if (chordName === "F#") return "#FFE56E";
      return null;

    case "magic":
      if (chordName === "E") return "#FF8CF7";
      return null;

    case "wonder":
      if (chordName === "B") return "#FFD76A";
      return null;

    case "tension":
      if (chordName === "E°") return "#FF2E63";
      return null;

    default:
      return null;
  }
}

type ColorCircleProps = {
  emotion: EmotionConfig;
  playToken: number;
  onFinished?: () => void;
};

function ColorCircle({ emotion, playToken, onFinished }: ColorCircleProps) {
  const [playing, setPlaying] = useState(false);
  const [activeRoot, setActiveRoot] = useState<number | null>(null);
  const [activeChordIdx, setActiveChordIdx] = useState<number | null>(null);

  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number>(0);
  const totalMsRef = useRef<number>(0);


    const chords = useMemo<ParsedChord[]>(
    () => parseProgression(emotion.colorChords),
    [emotion.colorChords]
  );

  const chordNames = useMemo(
    () => emotion.colorChords.trim().split(/\s+/).filter(Boolean),
    [emotion.colorChords]
  );

  const chordDurSec = useMemo(
    () => 0.9 / (emotion.tempo || 1.0),
    [emotion.tempo]
  );

  const stopPlayback = useCallback(() => {
  setPlaying(false);
  if (rafRef.current) {
    cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
  }
  setActiveRoot(null);
  setActiveChordIdx(null);
}, []);

  const startPlayback = useCallback(() => {
    if (!chords.length) return;

    stopPlayback();

    setPlaying(true);
    setActiveRoot(chords[0]?.root ?? null);

    const chordMs = chordDurSec * 1000;
    const totalMs = chordMs * chords.length;
    startRef.current = performance.now();
    totalMsRef.current = totalMs;

    playProgression(chords, {
      playMode: "chords",
      chordDur: chordDurSec,
    }).catch(() => {});

       const loop = () => {
  const now = performance.now();
  const elapsed = now - startRef.current;

  if (elapsed >= totalMsRef.current) {
    stopPlayback();
    onFinished?.();
    return;
  }

  const idx = Math.min(
    chords.length - 1,
    Math.floor(elapsed / chordMs)
  );
  setActiveRoot(chords[idx]?.root ?? null);
  setActiveChordIdx(idx);

  rafRef.current = requestAnimationFrame(loop);
};

    rafRef.current = requestAnimationFrame(loop);
  }, [chords, chordDurSec, stopPlayback]);

  useEffect(() => {
    if (!playToken) return;
    startPlayback();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playToken]);

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

    return (
     <div
      style={{
        width: "180px",
        height: "180px",
        maxWidth: "100%",
      }}
    >
      <button
        type="button"
        className="two-paths-circle-btn"
        aria-label={`Color circle for ${emotion.label}`}
        style={{
          background: `radial-gradient(circle at 30% 20%, ${emotion.gradientTop}, ${emotion.gradientBottom})`,
          width: "100%",
          height: "100%",
          borderRadius: "999px",
          border: "1px solid rgba(0,0,0,0.12)",
          padding: 0,
          overflow: "hidden",
          display: "block",
          cursor: "default",
        }}
      >
        <svg
          viewBox="0 0 100 100"
          style={{ width: "100%", height: "100%", display: "block" }}
        >
          <circle
            cx={50}
            cy={50}
            r={38}
            fill="none"
            stroke="rgba(0,0,0,0.35)"
            strokeWidth={1}
          />

          {CHROMA_LABELS.map((label, i) => {
            const p = nodePosition(i, 36);
            const { x, y, anchor, baseline } = labelPlacement(i, p);
            return (
              <text
                key={i}
                x={x}
                y={y}
                textAnchor={anchor}
                dominantBaseline={baseline}
                fontSize={5.0}
                fill="rgba(255,255,255,0.85)"
                style={{ fontWeight: 500 }}
              >
                {label}
              </text>
            );
          })}

          {CHROMA_LABELS.map((_, i) => {
  const p = nodePosition(i, 33);
  const isActive = activeRoot === i;

  let nodeColor = emotion.trailColor;
  if (isActive && activeChordIdx != null) {
    const chordName = chordNames[activeChordIdx] ?? "";
    const highlight = getChordHighlightColor(emotion.id, chordName);
    if (highlight) nodeColor = highlight;
  }

  return (
    <circle
      key={i}
      cx={p.x}
      cy={p.y}
      r={isActive ? 3.2 : 2.4}
      fill={isActive ? nodeColor : "rgba(0,0,0,0.7)"}
      stroke={isActive ? nodeColor : "rgba(255,255,255,0.25)"}
      strokeWidth={isActive ? 1 : 0.5}
    />
  );
})}

          
        </svg>
      </button>
    </div>
  );
}

/* =========================
   Main comparison component
========================= */

export default function TwoPathsEmotionCompare() {
  const [emotionId, setEmotionId] = useState<EmotionId>("playful");
  const [flowPlayToken, setFlowPlayToken] = useState(0);
  const [colorPlayToken, setColorPlayToken] = useState(0);

  // ⬇️ Add these two lines:
  const [showIntro, setShowIntro] = useState(false);
  const [showOutro, setShowOutro] = useState(false);

  const active = EMOTIONS.find((e) => e.id === emotionId) ?? EMOTIONS[0];
  const copy = EMOTION_COPY[active.id];
  // DEBUG — verify FlowPreset-based chords (not degree-based)
// This runs once when the blog component mounts.
useEffect(() => {
  const preset = FLOW_PRESETS[active.id];               // FlowPreset for current emotion
  const tonicName = preset.mode === "minor" ? "C" : "Bb";
  const tonicPc = pitchNameToPc(tonicName);
  const flowChords = buildFlowChordsForKey(tonicPc, preset);

  console.log(
    `[Flow BLOG DEBUG] ${active.id} (${tonicName} ${preset.mode}):`,
    flowChords.join(" → ")
  );
}, [active.id]);

  const handleEmotionClick = (id: EmotionId) => {
  setShowIntro(true);
  setShowOutro(false);

  setEmotionId(id);
  setColorPlayToken(0);            // reset Color
  setFlowPlayToken((t) => t + 1);  // trigger Flow playback
};

  return (
    <div className="two-paths-compare">
      <style jsx>{`
        .two-paths-compare {
          margin-top: 10px;
        }
        
        .two-paths-compare-card {
          border-radius: 14px;
          padding: 12px 10px;
          background: #fffdf5;
          border: 1px solid rgba(0, 0, 0, 0.06);
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
        }
        .two-paths-compare-header {
  margin-bottom: 8px;
  text-align: center;
}

.two-paths-compare-title {
  font-size: 14px;
  font-weight: 700;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}
        .two-paths-compare-title span.emoji {
          font-size: 18px;
        }
        .two-paths-compare-sub {
          font-size: 12px;
          color: #555;
        }

        .two-paths-circle-wrapper {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 14px;
          margin-bottom: 12px;
        }

        .two-paths-circle-block {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
        }

        .two-paths-circle-label {
          font-size: 13px;
          font-weight: 700;
        }
        .two-paths-circle-meta {
          font-size: 10px;
          color: #444;
          line-height: 1.5;
          text-align: center;
          max-width: 260px;
        }

        .two-paths-compare-divider {
          border: none;
          border-top: 1px dashed rgba(0, 0, 0, 0.08);
          margin: 4px 0 0;
          width: 80%;
        }

        .two-paths-emotion-bar {
          margin-top: 10px;
        }
        .two-paths-emotion-label {
          font-size: 12px;
          margin-bottom: 4px;
          color: #444;
        }
        .two-paths-emotion-scroll {
          display: flex;
          gap: 6px;
          overflow-x: auto;
          padding-bottom: 4px;
          scrollbar-width: none;
        }
        .two-paths-emotion-scroll::-webkit-scrollbar {
          display: none;
        }
        .two-paths-emotion-pill {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 5px 10px;
          border-radius: 999px;
          border: 1px solid rgba(0, 0, 0, 0.08);
          background: #f7f7f7;
          font-size: 12px;
          cursor: pointer;
          white-space: nowrap;
        }
        .two-paths-emotion-pill span.emoji {
          font-size: 14px;
        }
        .two-paths-emotion-pill.active {
          background: #111;
          color: #fff;
          border-color: #111;
        }
      `}</style>

      <div className="two-paths-compare-card">
       <div className="two-paths-compare-header">
  <div className="two-paths-compare-title" style={{ flexDirection: "column" }}>
    {showIntro ? (
      <>
        <div>{copy.introLine1}</div>
        <div>{copy.introLine2}</div>
      </>
    ) : showOutro ? (
      <>
        <div>{copy.outroLine1}</div>
        {copy.outroLine2 ? <div>{copy.outroLine2}</div> : null}
      </>
    ) : (
      <>
        <div>
          <span className="emoji">{active.emoji}</span>{" "}
          <span>{active.label}</span>
        </div>
        <div style={{ fontSize: 12, color: "#555" }}>
          Flow &amp; Color versions of the same feeling.
        </div>
      </>
    )}
  </div>
</div>

        <div className="two-paths-circle-wrapper">
          {/* Flow circle (top) */}
          <div className="two-paths-circle-block">
            <div className="two-paths-circle-label">{copy.flowLabel}</div>
            <FlowCircle
              emotion={active}
              playToken={flowPlayToken}
              onFinished={() => {
                setColorPlayToken((t) => t + 1);
                setShowIntro(false);
                setShowOutro(true);
              }}
            />
            <div className="two-paths-circle-meta">
              <div>
                Degrees: <code>{active.flowFormula}</code>
              </div>
              <div>
                {active.flowKey} example: <code>{active.flowExample}</code>
              </div>
            </div>
          </div>

          <hr className="two-paths-compare-divider" />

          {/* Color circle (bottom) */}
<div className="two-paths-circle-block">
  <div className="two-paths-circle-label">{copy.colorLabel}</div>
  <ColorCircle
    emotion={active}
    playToken={colorPlayToken}
    onFinished={() => {
      setShowOutro(false);
    }}
  />
  <div className="two-paths-circle-meta">
    <div>
      Local steps: <code>{active.colorFormula}</code>
    </div>
    <div>
      {active.colorExampleKey} example:{" "}
      <code>{active.colorChords.replace(/ /g, " → ")}</code>
    </div>
  </div>
</div>
        </div>
      </div>

      {/* Emotion bar (bottom) */}
      <div className="two-paths-emotion-bar">
        <div className="two-paths-emotion-label">
          <strong>Tap an emotion to hear Flow, then Color</strong>
        </div>
        <div className="two-paths-emotion-scroll">
          {EMOTIONS.map((e) => {
            const activeClass =
              e.id === active.id
                ? "two-paths-emotion-pill active"
                : "two-paths-emotion-pill";
            return (
              <button
                key={e.id}
                type="button"
                className={activeClass}
                onClick={() => handleEmotionClick(e.id)}
              >
                <span className="emoji">{e.emoji}</span>
                <span>{e.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}