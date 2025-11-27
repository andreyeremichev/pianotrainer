"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { parseProgression as parseChordProgression, type ParsedChord } from "@/lib/harmony/chords";
import { playProgression } from "@/lib/harmony/audio";
import * as Tone from "tone";

/* =========================
   Shared constants
========================= */

type PathKind = "flow" | "color";

const SADNESS_FLOW_DEGREES = "1 6b 3b 7b";        // C minor degrees
const SADNESS_FLOW_KEY: "C minor" = "C minor";    // matches Flow tool
const SADNESS_COLOR_CHORDS = "Cm Ab Fm Em";       // Path of Color sadness chords

// Same palette as sadness in both tools
const SADNESS_TRAIL = "#4A6FA5";
const SADNESS_GLOW = "#A8C1E8";
const SADNESS_GRADIENT_TOP = "#2D3E68";     // lighter, still “sadness blue”
const SADNESS_GRADIENT_BOTTOM = "#6076AF"; // lighter bottom
const SADNESS_TEMPO = 0.9;

// Tiny timing base — same as chromatic toy base
const BASE_DURATION_PER_CHORD = 0.9;

/* =========================
   Circle geometry (shared)
========================= */

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

// Degree-style labels from Flow
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

// Chromatic labels from Color
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

/* =========================
   Flow side — degree model
   (copied from Flow tool)
========================= */

type Mode = "major" | "minor";

type DegreeNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7;
type Acc = -1 | 0 | 1; // -1 = flat, 0 = natural, +1 = sharp

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

const TONIC_PC_BB = 10; // A#
const TONIC_PC_CM = 0;  // C

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

// Node indices for “major scale degrees” in B♭ major
const NODE_INDEX_MAJOR_BASE: Record<DegreeNumber, number> = {
  1: 0,
  2: 2,
  3: 4,
  4: 11,
  5: 1,
  6: 3,
  7: 5,
};

// Node indices for “minor scale degrees” in C minor
const NODE_INDEX_MINOR_BASE: Record<DegreeNumber, number> = {
  1: 0,
  2: 2,
  3: 9,
  4: 11,
  5: 1,
  6: 8,
  7: 10,
};

// Chromatic nodes on the Circle of Fifths
const NODE_INDEX_CHROMA: Record<string, number> = {
  "2,-1": 7,
  "3,-1": 9,
  "4,1": 6,
  "6,-1": 8,
  "7,-1": 10,
};

function parseDegreeProgression(input: string): { tokens: DegToken[] } {
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

  return { tokens };
}

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

// Sampler (copied from Flow, but scoped to this mini)
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

/* =========================
   FLOW sadness circle
========================= */

function FlowSadnessCircle({ onStarted }: { onStarted: () => void }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeNodeIndex, setActiveNodeIndex] = useState<number | null>(null);
  const [stepIdx, setStepIdx] = useState(0);

  const samplerRef = useRef<Tone.Sampler | null>(null);
  const timeoutsRef = useRef<number[]>([]);

  // Parse degrees exactly as in Flow tool
  const { tokens: degTokens } = useMemo(
    () => parseDegreeProgression(SADNESS_FLOW_DEGREES),
    []
  );

  // Build triads in C minor exactly as main Flow page does for sadness
  const chords: string[][] = useMemo(
    () => degTokens.map((tok) => triadMidiForToken(tok, "minor")),
    [degTokens]
  );

  const clearTimers = () => {
    timeoutsRef.current.forEach((id) => clearTimeout(id));
    timeoutsRef.current = [];
  };

  const stopPlayback = useCallback(() => {
    clearTimers();
    setIsPlaying(false);
    setActiveNodeIndex(null);
  }, []);

  const start = useCallback(async () => {
    if (!chords.length) return;

    // If already playing, restart from the beginning
    if (isPlaying) {
      stopPlayback();
    }

    setIsPlaying(true);
    setActiveNodeIndex(null);
    setStepIdx(0);
    clearTimers();

    await Tone.start();
    await ensurePianoSampler(samplerRef);
    const s = samplerRef.current;
    if (!s) return;

    const baseStepSec = 0.9;
    const tempoMult = SADNESS_TEMPO;
    const baseStep = baseStepSec / tempoMult;

    let accSec = 0;
    const now = Tone.now();

    chords.forEach((notes, idx) => {
      const stepSec = baseStep; // all long for sadness

      const startTime = now + accSec;
      (s as any).triggerAttackRelease(notes, 0.8, startTime);

      const tok = degTokens[idx];
      const nodeIndex = nodeIndexForToken(tok, "minor");

      const tid = window.setTimeout(() => {
        setStepIdx(idx);
        setActiveNodeIndex(nodeIndex);
      }, accSec * 1000);
      timeoutsRef.current.push(tid);

      accSec += stepSec;
    });

    const totalSec = accSec;
    const endId = window.setTimeout(() => {
      setIsPlaying(false);
      setActiveNodeIndex(null);
    }, (totalSec + 0.5) * 1000);
    timeoutsRef.current.push(endId);
  }, [chords, degTokens, isPlaying, stopPlayback]);

  useEffect(() => {
    return () => {
      clearTimers();
    };
  }, []);

  const handleClick = () => {
    onStarted();
    start().catch(() => {});
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className="two-paths-mini-circle"
      aria-label="Play sadness on Path of Flow"
      style={{
        background: `radial-gradient(circle at 30% 20%, ${SADNESS_GRADIENT_TOP}, ${SADNESS_GRADIENT_BOTTOM})`,
      }}
    >
      <svg viewBox="0 0 100 100" style={{ width: "100%", height: "100%" }}>
        {/* outer ring */}
        <circle
          cx={50}
          cy={50}
          r={38}
          fill="none"
          stroke="rgba(0,0,0,0.35)"
          strokeWidth={1}
        />

        {/* degree labels around Circle of Fifths */}
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
                {/* Center prompt — only when not playing */}
        {!isPlaying && (
          <text
            x={50}
            y={50}
            textAnchor="middle"
            fontSize={8.5}
            fill="rgba(255,255,255,0.95)"
            style={{ fontWeight: 700 }}
          >
            Tap to play
          </text>
        )}

        {/* nodes */}
        {FLOW_CIRCLE_LABELS.map((_, i) => {
          const p = nodePosition(i, 33);
          const isActive = activeNodeIndex === i;
          return (
            <circle
              key={i}
              cx={p.x}
              cy={p.y}
              r={isActive ? 3.2 : 2.4}
              fill={isActive ? SADNESS_TRAIL : "rgba(0,0,0,0.7)"}
              stroke={isActive ? SADNESS_GLOW : "rgba(255,255,255,0.25)"}
              strokeWidth={isActive ? 1 : 0.5}
            />
          );
        })}

        
      </svg>
    </button>
  );
}

/* =========================
   COLOR sadness circle
========================= */

function ColorSadnessCircle({ onStarted }: { onStarted: () => void }) {
  const [playing, setPlaying] = useState(false);
  const [activeRoot, setActiveRoot] = useState<number | null>(null);
  const [stepIdx, setStepIdx] = useState(0);

  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number>(0);
  const totalMsRef = useRef<number>(0);

  const chords = useMemo<ParsedChord[]>(
    () => parseChordProgression(SADNESS_COLOR_CHORDS),
    []
  );

  const chordDurSec = useMemo(
    () => BASE_DURATION_PER_CHORD / SADNESS_TEMPO,
    []
  );

  const stopPlayback = useCallback(() => {
    setPlaying(false);
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  const handleClick = useCallback(() => {
    if (!chords.length) return;

    // restart if already playing
    if (playing) {
      stopPlayback();
    }

    setPlaying(true);
    setStepIdx(0);
    setActiveRoot(chords[0]?.root ?? null);
    onStarted();

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
        setPlaying(false);
        setStepIdx(chords.length - 1);
        setActiveRoot(chords[chords.length - 1]?.root ?? null);
        if (rafRef.current) {
          cancelAnimationFrame(rafRef.current);
          rafRef.current = null;
        }
        return;
      }

      const idx = Math.min(
        chords.length - 1,
        Math.floor(elapsed / chordMs)
      );
      setStepIdx(idx);
      setActiveRoot(chords[idx]?.root ?? null);

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
  }, [chords, chordDurSec, playing, stopPlayback, onStarted]);

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <button
      type="button"
      onClick={handleClick}
      className="two-paths-mini-circle"
      aria-label="Play sadness on Path of Color"
      style={{
        background: `radial-gradient(circle at 30% 20%, ${SADNESS_GRADIENT_TOP}, ${SADNESS_GRADIENT_BOTTOM})`,
      }}
    >
      <svg viewBox="0 0 100 100" style={{ width: "100%", height: "100%" }}>
        {/* outer ring */}
        <circle
          cx={50}
          cy={50}
          r={38}
          fill="none"
          stroke="rgba(0,0,0,0.35)"
          strokeWidth={1}
        />

        {/* chromatic labels */}
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
                        {/* Center prompt — only when not playing */}
        {!playing && (
          <text
            x={50}
            y={50}
            textAnchor="middle"
            fontSize={8.5}
            fill="rgba(255,255,255,0.95)"
            style={{ fontWeight: 700 }}
          >
            Tap to play
          </text>
        )}

        {/* nodes */}
        {CHROMA_LABELS.map((_, i) => {
          const p = nodePosition(i, 33);
          const isActive = activeRoot === i;
          return (
            <circle
              key={i}
              cx={p.x}
              cy={p.y}
              r={isActive ? 3.2 : 2.4}
              fill={isActive ? SADNESS_TRAIL : "rgba(0,0,0,0.7)"}
              stroke={isActive ? SADNESS_GLOW : "rgba(255,255,255,0.25)"}
              strokeWidth={isActive ? 1 : 0.5}
            />
          );
        })}

        
      </svg>
    </button>
  );
}

/* =========================
   Wrapper shown on page
========================= */

export default function TwoPathsSadnessMini() {
  const [active, setActive] = useState<PathKind | null>(null);

  return (
    <div className="two-paths-mini" aria-label="Sadness preview in Flow and Color">
      <div className="two-paths-mini-grid">
        {/* FLOW SIDE */}
        <div className="two-paths-mini-card">
          <div className="two-paths-mini-label">
            <span>Path of Flow</span>
            <span className="badge">Sadness</span>
          </div>

          <FlowSadnessCircle onStarted={() => setActive("flow")} />

          <div className="two-paths-mini-caption">
            Degrees in C minor: <strong>1 · ♭6 · ♭3 · ♭7</strong>
            <br />
            Example: <strong>Cm → Ab → Eb → Bb</strong>
          </div>
        </div>

        {/* COLOR SIDE */}
        <div className="two-paths-mini-card">
          <div className="two-paths-mini-label">
            <span>Path of Color</span>
            <span className="badge">Sadness</span>
          </div>

          <ColorSadnessCircle onStarted={() => setActive("color")} />

          <div className="two-paths-mini-caption">
            Local chromatic path:{" "}
            <strong>m → M(–4) → m(–3) → m(–1)</strong>
            <br />
            Example: <strong>Cm → Ab → Fm → Em</strong>
          </div>
        </div>
      </div>

      {active && (
        <div className="two-paths-mini-status">
          {active === "flow"
            ? "Playing sadness on Path of Flow…"
            : "Playing sadness on Path of Color…"}
        </div>
      )}
    </div>
  );
}