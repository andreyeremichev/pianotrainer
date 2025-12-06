"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import * as Tone from "tone";
import {
  FLOW_PRESETS,
  buildFlowChordsForKey,
  pitchNameToPc,
  PITCHES,
  type EmotionId,
} from "@/lib/harmony/flow";


import KeyboardEmotions from "@/components/KeyboardEmotions";


/* =========================
   Emotion meta (Flow side)
   ========================= */

type FlowEmotionMeta = {
  id: EmotionId;
  label: string;
  emoji: string;
  gradientTop: string;
  gradientBottom: string;
  trailColor: string;
  glowColor: string;
  tempo: number;
};

// Copied from EMOTIONS in two-paths file (only needed fields)
const FLOW_EMOTIONS: FlowEmotionMeta[] = [
  {
    id: "magic",
    label: "Magic",
    emoji: "✨",
    gradientTop: "#6d28d9",
    gradientBottom: "#a855f7",
    trailColor: "#c4a1ff",
    glowColor: "#ead9ff",
    tempo: 1.0,
  },
  {
    id: "mystery",
    label: "Mystery",
    emoji: "🕵️‍♀️",
    gradientTop: "#272343",
    gradientBottom: "#4b4e91",
    trailColor: "#8fb3ff",
    glowColor: "#d0e1ff",
    tempo: 1.0,
  },
  {
    id: "wonder",
    label: "Wonder",
    emoji: "🌌",
    gradientTop: "#1d3557",
    gradientBottom: "#457b9d",
    trailColor: "#8ecae6",
    glowColor: "#e0fbff",
    tempo: 1.0,
  },
  {
    id: "playful",
    label: "Playful",
    emoji: "🎈",
    gradientTop: "#f59e0b",
    gradientBottom: "#f97316",
    trailColor: "#ffb74d",
    glowColor: "#ffe0b2",
    tempo: 1.0,
  },
  {
    id: "calm",
    label: "Calm",
    emoji: "🌿",
    gradientTop: "#2f5d4f",
    gradientBottom: "#6bbf8f",
    trailColor: "#6dd2a3",
    glowColor: "#c7f2da",
    tempo: 1.0,
  },
  {
    id: "tension",
    label: "Tension",
    emoji: "😬",
    gradientTop: "#4b5563",
    gradientBottom: "#9ca3af",
    trailColor: "#fbbf24",
    glowColor: "#fef3c7",
    tempo: 1.0,
  },
  {
    id: "fear",
    label: "Fear",
    emoji: "😱",
    gradientTop: "#222933",
    gradientBottom: "#4a5568",
    trailColor: "#6bc1ff",
    glowColor: "#c0e6ff",
    tempo: 1.0,
  },
  {
    id: "sadness",
    label: "Sadness",
    emoji: "😢",
    gradientTop: "#2D3E68",
    gradientBottom: "#6076AF",
    trailColor: "#4A6FA5",
    glowColor: "#A8C1E8",
    tempo: 0.9,
  },
  {
    id: "anger",
    label: "Anger",
    emoji: "😡",
    gradientTop: "#6b1b25",
    gradientBottom: "#c0392b",
    trailColor: "#ff7373",
    glowColor: "#ffc4c4",
    tempo: 1.0,
  },
  {
    id: "melancholy",
    label: "Melancholy",
    emoji: "🌧️",
    gradientTop: "#314159",
    gradientBottom: "#60738d",
    trailColor: "#5a7bbc",
    glowColor: "#c4d4f6",
    tempo: 1.0,
  },
];

const FLOW_EMOTIONS_BY_ID: Record<EmotionId, FlowEmotionMeta> =
  FLOW_EMOTIONS.reduce((acc, e) => {
    acc[e.id] = e;
    return acc;
  }, {} as Record<EmotionId, FlowEmotionMeta>);

  // 0-based indices of "borrowed" Flow chords (outside plain diatonic scale)
const FLOW_BORROWED_INDICES: Record<EmotionId, readonly number[]> = {
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
};

/* =========================
   Flow circle geometry
   ========================= */

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

// Spiral used in the lab
function buildSpiralToNode(nodeIndex: number, turns: number): string {
  const samples = 80;
  const maxR = 25;
  const aNode = (nodeIndex / 12) * Math.PI * 2 - Math.PI / 2;

  let path = "";
  for (let k = 0; k <= samples; k++) {
    const p = k / samples;
    const r = p * maxR;
    const a = aNode - turns * 2 * Math.PI * (1 - p);

    const x = 50 + Math.cos(a) * r;
    const y = 50 + Math.sin(a) * r;

    if (k === 0) {
      path = `M ${x.toFixed(2)} ${y.toFixed(2)}`;
    } else {
      path += ` L ${x.toFixed(2)} ${y.toFixed(2)}`;
    }
  }
  return path;
}

/* =========================
   Degree → node index
   ========================= */

type Mode = "major" | "minor";
type DegreeNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7;
type Acc = -1 | 0 | 1;

type DegToken = {
  base: DegreeNumber;
  acc: Acc;
  display: string;
};

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

/* =========================
   Audio helpers (Flow)
   ========================= */

// Triad from chord symbol ("Cm", "Eb", "G", etc.)
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

  const noteName = (midi: number) => {
    const pcIdx = midi % 12;
    const pitch = PITCHES[pcIdx];
    const oct = Math.floor(midi / 12) - 1;
    return `${pitch}${oct}`;
  };

  return steps.map((semi) => noteName(rootMidi + semi));
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

async function ensurePianoSampler(
  ref: React.MutableRefObject<Tone.Sampler | null>
) {
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
   Hook: useEmotionPlayback
   ========================= */

type UseEmotionPlaybackOptions = {
  onPlayChord?: (symbol: string) => void;
};

function useEmotionPlayback({ onPlayChord }: UseEmotionPlaybackOptions) {
  const [activeChordIndex, setActiveChordIndex] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const timersRef = useRef<number[]>([]);
  const runIdRef = useRef(0);

  const stop = useCallback(() => {
    timersRef.current.forEach((id) => window.clearTimeout(id));
    timersRef.current = [];
    setIsPlaying(false);
    setActiveChordIndex(null);
    runIdRef.current += 1;
  }, []);

  const playSequence = useCallback(
    (chords: string[], stepMs: number) => {
      if (!chords.length) return;
      stop();
      setIsPlaying(true);
      const currentRun = ++runIdRef.current;
      const safeStepMs = Math.max(120, stepMs || 900);

      chords.forEach((chord, index) => {
        const t = window.setTimeout(() => {
          if (runIdRef.current !== currentRun) return;

          setActiveChordIndex(index);
          if (onPlayChord) onPlayChord(chord);

          if (index === chords.length - 1) {
            const endId = window.setTimeout(() => {
              if (runIdRef.current !== currentRun) return;
              setIsPlaying(false);
              setActiveChordIndex(null);
            }, safeStepMs);
            timersRef.current.push(endId);
          }
        }, index * safeStepMs);
        timersRef.current.push(t);
      });
    },
    [onPlayChord, stop]
  );

  useEffect(() => {
    return () => stop();
  }, [stop]);

  return { activeChordIndex, isPlaying, playSequence };
}

/* =========================
   UI: pill bar + caption
   ========================= */

type EmotionPillBarProps = {
  selectedId: EmotionId;
  isPlaying: boolean;
  onSelect: (id: EmotionId) => void;
};

function EmotionPillBar({
  selectedId,
  isPlaying,
  onSelect,
}: EmotionPillBarProps) {
  return (
    <div
      style={{
        marginTop: 16,
        padding: "6px 0 4px",
        overflowX: "auto",
        WebkitOverflowScrolling: "touch",
      }}
    >
      <div
        style={{
          display: "flex",
          gap: 8,
          padding: "0 4px 4px",
          minWidth: 0,
        }}
      >
        {FLOW_EMOTIONS.map((e) => {
          const isActive = e.id === selectedId;
          return (
            <button
              key={e.id}
              type="button"
              onClick={() => onSelect(e.id)}
              style={{
                border: "none",
                borderRadius: 999,
                padding: "4px 10px",
                fontSize: 13,
                lineHeight: 1.2,
                display: "flex",
                alignItems: "center",
                gap: 6,
                whiteSpace: "nowrap",
                cursor: "pointer",
                opacity: isPlaying && !isActive ? 0.6 : 1,
                background: isActive
                  ? "rgba(255,255,255,0.16)"
                  : "rgba(255,255,255,0.06)",
                boxShadow: isActive
                  ? "0 0 0 1px rgba(255,255,255,0.65)"
                  : "0 0 0 1px rgba(255,255,255,0.22)",
              }}
            >
              <span style={{ fontSize: 14 }}>{e.emoji}</span>
              <span>{e.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

type ChordCaptionLineProps = {
  chords: string[];
  activeIndex: number | null;
  borrowedIndices?: readonly number[];
};

function ChordCaptionLine({
  chords,
  activeIndex,
  borrowedIndices,
}: ChordCaptionLineProps) {
  const borrowedSet = useMemo(
    () => new Set(borrowedIndices ?? []),
    [borrowedIndices]
  );

  return (
    <div
      style={{
        marginTop: 12,
        fontSize: 14,
        textAlign: "center",
        minHeight: 22,
        padding: "0 8px",
      }}
    >
      {chords.map((chord, idx) => {
        const isActive = idx === activeIndex;
        const isBorrowed = borrowedSet.has(idx);

        return (
          <span key={idx} style={{ marginInline: 2 }}>
            {idx > 0 && (
              <span style={{ opacity: 0.4, marginInline: 2 }}>·</span>
            )}
            <span
              style={{
                fontWeight: isActive ? 700 : 400,
                opacity: isActive ? 1 : 0.65,
                textDecoration: isActive ? "underline" : "none",
                textUnderlineOffset: 3,
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              <span>{chord}</span>
              {isBorrowed && (
                <span
                  role="img"
                  aria-label="borrowed chord"
                  style={{ fontSize: 11 }}
                >
                  ⭐
                </span>
              )}
            </span>
          </span>
        );
      })}
    </div>
  );
}

/* =========================
   Flow circle (visual only)
   ========================= */

type FlowCircleViewProps = {
  emotion: FlowEmotionMeta;
  activeChordIndex: number | null;
  nodeIndices: number[];
};

function FlowCircleView({
  emotion,
  activeChordIndex,
  nodeIndices,
}: FlowCircleViewProps) {
  const activeNodeIndex =
    activeChordIndex != null && nodeIndices[activeChordIndex] != null
      ? nodeIndices[activeChordIndex]
      : null;

  const spiralPath =
    activeNodeIndex != null && activeChordIndex != null
      ? buildSpiralToNode(activeNodeIndex, activeChordIndex + 1)
      : "";

  return (
    <div
      style={{
        width: "100%",
        maxWidth: 180,
        margin: "0 auto",
        aspectRatio: "1 / 1",
      }}
    >
      <button
        type="button"
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
          {/* ring */}
          <circle
            cx={50}
            cy={50}
            r={38}
            fill="none"
            stroke="rgba(0,0,0,0.35)"
            strokeWidth={1}
          />

          {/* spiral */}
          {spiralPath && (
            <>
              <path
                d={spiralPath}
                fill="none"
                stroke={emotion.trailColor}
                strokeWidth={1.4}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeOpacity={0.9}
              />
              <path
                d={spiralPath}
                fill="none"
                stroke={emotion.trailColor}
                strokeWidth={3.4}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeOpacity={0.16}
              />
            </>
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
                fill={isActive ? emotion.trailColor : "rgba(0,0,0,0.7)"}
                stroke={
                  isActive ? emotion.glowColor : "rgba(255,255,255,0.25)"
                }
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
   Main Flow Emotion Player
   ========================= */
   export default function FlowKeyboard() {
  return <FlowEmotionPlayerInner />;
}

function FlowEmotionPlayerInner() {
  const [selectedId, setSelectedId] = useState<EmotionId>("sadness");
  const [currentChords, setCurrentChords] = useState<string[]>([]);
  
  const samplerRef = useRef<Tone.Sampler | null>(null);

  useEffect(() => {
    ensurePianoSampler(samplerRef).catch(() => {});
  }, []);

  const handlePlayChord = useCallback((symbol: string) => {
    const sampler = samplerRef.current;
    if (!sampler) return;
    const notes = triadFromChordName(symbol);
    if (!notes.length) return;
    try {
      (sampler as any).triggerAttackRelease(notes, 0.8);
    } catch {
      // ignore
    }
  }, []);

  const { activeChordIndex, isPlaying, playSequence } = useEmotionPlayback({
    onPlayChord: handlePlayChord,
  });

  const selectedMeta = FLOW_EMOTIONS_BY_ID[selectedId];
  const flowPreset = FLOW_PRESETS[selectedId];

    const borrowedIndices = FLOW_BORROWED_INDICES[selectedId] ?? [];
  const isBorrowedChord =
    activeChordIndex != null && borrowedIndices.includes(activeChordIndex);

  const nodeIndices = useMemo(() => {
    const degTokens = parseDegreeProgression(flowPreset.degrees.join(" "));
    return degTokens.map((t) => nodeIndexForToken(t, flowPreset.mode as Mode));
  }, [flowPreset]);

  const activeChordSymbol =
    activeChordIndex != null && currentChords[activeChordIndex]
      ? currentChords[activeChordIndex]
      : null;

  const triggerEmotion = useCallback(
    async (id: EmotionId) => {
      await Tone.start().catch(() => {});
      const meta = FLOW_EMOTIONS_BY_ID[id];
      const preset = FLOW_PRESETS[id];
      const tonicName = preset.mode === "minor" ? "C" : "Bb";
      const tonicPc = pitchNameToPc(tonicName);
      const chords = buildFlowChordsForKey(tonicPc, preset);

      setCurrentChords(chords);

      const baseStepSec = 0.9;
      const tempoMult = meta.tempo || 1.0;
      const stepMs = (baseStepSec / tempoMult) * 1000;

      playSequence(chords, stepMs);

      console.log(
        `[FlowEmotionPlayer] ${id} (${tonicName} ${preset.mode}):`,
        chords.join(" → ")
      );
    },
    [playSequence]
  );

  const handleSelectEmotion = (id: EmotionId) => {
    setSelectedId(id);
    triggerEmotion(id);
  };

  // initial load for default emotion
  useEffect(() => {
    const meta = FLOW_EMOTIONS_BY_ID[selectedId];
    const preset = FLOW_PRESETS[selectedId];
    const tonicName = preset.mode === "minor" ? "C" : "Bb";
    const tonicPc = pitchNameToPc(tonicName);
    const chords = buildFlowChordsForKey(tonicPc, preset);
    setCurrentChords(chords);

    console.log(
      `[FlowEmotionPlayer INIT] ${selectedId} (${tonicName} ${preset.mode}):`,
      chords.join(" → ")
    );
  }, [selectedId]);

  return (
    <main
  style={{
    minHeight: "100vh",
    background:
      "radial-gradient(circle at top, #fdfcf8 0, #f5f1e8 55%, #ece5d8 100%)",
    color: "#111827",
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
        <h3
  style={{
    margin: "18px 0 6px",
    fontSize: 18,
    lineHeight: 1.4,
    fontWeight: 700,
  }}
>
          Flow Emotion Player
        </h3>
        <p
          style={{
            margin: "0 0 12px",
            fontSize: 13,
            textAlign: "center",
            opacity: 0.8,
          }}
        >
          Tap an emotion to hear its Flow progression. The circle, chord line,
          and keyboard move together.
        </p>

        {/* Flow Circle */}
<FlowCircleView
  emotion={selectedMeta}
  activeChordIndex={activeChordIndex}
  nodeIndices={nodeIndices}
/>

{/* Chord caption */}
<ChordCaptionLine
  chords={currentChords}
  activeIndex={activeChordIndex}
  borrowedIndices={FLOW_BORROWED_INDICES[selectedId]}
/>
{/* 🔥 KeyboardEmotions goes here */}
<KeyboardEmotions
  activeChordSymbol={activeChordSymbol}
  emotion={{
    gradientTop: selectedMeta.gradientTop,
    gradientBottom: selectedMeta.gradientBottom,
    trailColor: selectedMeta.trailColor,
  }}
  emotionLabel={selectedMeta.label}
  highlightColorOverride={isBorrowedChord ? "#FACC15" : undefined}

/>

{/* Emotion picker */}
<EmotionPillBar
  selectedId={selectedId}
  isPlaying={isPlaying}
  onSelect={handleSelectEmotion}
/>
      </div>
    </main>
  );
}
