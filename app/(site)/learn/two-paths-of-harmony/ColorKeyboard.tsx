"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import * as Tone from "tone";
import KeyboardEmotions from "@/components/KeyboardEmotions";

/* =========================
   Shared types & helpers
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
   Color emotion meta
   (taken from EMOTIONS in Two Paths)
   ========================= */

type ColorEmotionMeta = {
  id: EmotionId;
  label: string;
  emoji: string;
  gradientTop: string;
  gradientBottom: string;
  trailColor: string;
  tempo: number;
  colorChords: string; // e.g. "C Ab E G"
};

const COLOR_EMOTIONS: ColorEmotionMeta[] = [
  {
    id: "magic",
    label: "Magic",
    emoji: "✨",
    gradientTop: "#6d28d9",
    gradientBottom: "#a855f7",
    trailColor: "#c4a1ff",
    tempo: 1.0,
    colorChords: "C Ab E G",
  },
  {
    id: "mystery",
    label: "Mystery",
    emoji: "🕵️‍♀️",
    gradientTop: "#272343",
    gradientBottom: "#4b4e91",
    trailColor: "#8fb3ff",
    tempo: 1.0,
    colorChords: "Cm D F° F#",
  },
  {
    id: "wonder",
    label: "Wonder",
    emoji: "🌌",
    gradientTop: "#1d3557",
    gradientBottom: "#457b9d",
    trailColor: "#8ecae6",
    tempo: 1.0,
    colorChords: "Cm F G B",
  },
  {
    id: "playful",
    label: "Playful",
    emoji: "🎈",
    gradientTop: "#f59e0b",
    gradientBottom: "#f97316",
    trailColor: "#ffb74d",
    tempo: 1.0,
    colorChords: "C Eb F# G#",
  },
  {
    id: "calm",
    label: "Calm",
    emoji: "🌿",
    gradientTop: "#2f5d4f",
    gradientBottom: "#6bbf8f",
    trailColor: "#6dd2a3",
    tempo: 1.0,
    colorChords: "C D F Eb",
  },
  {
    id: "tension",
    label: "Tension",
    emoji: "😬",
    gradientTop: "#4b5563",
    gradientBottom: "#9ca3af",
    trailColor: "#fbbf24",
    tempo: 1.0,
    colorChords: "C C#m E° F#",
  },
  {
    id: "fear",
    label: "Fear",
    emoji: "😱",
    gradientTop: "#222933",
    gradientBottom: "#4a5568",
    trailColor: "#6bc1ff",
    tempo: 1.0,
    colorChords: "Cm F#° G A#°",
  },
  {
    id: "sadness",
    label: "Sadness",
    emoji: "😢",
    gradientTop: "#2D3E68",
    gradientBottom: "#6076AF",
    trailColor: "#4A6FA5",
    tempo: 0.9,
    colorChords: "Cm Ab Fm Em",
  },
  {
    id: "anger",
    label: "Anger",
    emoji: "😡",
    gradientTop: "#6b1b25",
    gradientBottom: "#c0392b",
    trailColor: "#ff7373",
    tempo: 1.0,
    colorChords: "Cm C#m E° F#",
  },
  {
    id: "melancholy",
    label: "Melancholy",
    emoji: "🌧️",
    gradientTop: "#314159",
    gradientBottom: "#60738d",
    trailColor: "#5a7bbc",
    tempo: 1.0,
    colorChords: "Cm A C#m A#",
  },
];

const COLOR_EMOTIONS_BY_ID: Record<EmotionId, ColorEmotionMeta> =
  COLOR_EMOTIONS.reduce((acc, e) => {
    acc[e.id] = e;
    return acc;
  }, {} as Record<EmotionId, ColorEmotionMeta>);

  // Special highlight colors for 100% chromatic "primary color" chords
function getChordHighlightColor(
  emotionId: EmotionId,
  chordName: string
): string | null {
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
      if (chordName === "Eb") return "#EEC3B0";
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

/* =========================
   Audio: Tone Sampler
   ========================= */

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
   useEmotionPlayback (same pattern as Flow)
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
   UI: Emotion pill bar + caption
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
        {COLOR_EMOTIONS.map((e) => {
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
};

function ChordCaptionLine({ chords, activeIndex }: ChordCaptionLineProps) {
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
              }}
            >
              {chord}
            </span>
          </span>
        );
      })}
    </div>
  );
}

/* =========================
   Color circle view (simplified)
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

type Pt = { x: number; y: number };

function nodePosition(i: number, r = 33): Pt {
  const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
  const xRaw = 50 + Math.cos(a) * r;
  const yRaw = 50 + Math.sin(a) * r;
  const x = Number(xRaw.toFixed(3));
  const y = Number(yRaw.toFixed(3));
  return { x, y };
}

function pathFromPcs(pcs: number[]): string | null {
  const uniq = Array.from(new Set(pcs.map((x) => ((x % 12) + 12) % 12))).sort(
    (a, b) => a - b
  );
  if (!uniq.length) return null;
  const pts = uniq.map((i) => nodePosition(i, 28));
  const move = `M ${pts[0].x} ${pts[0].y}`;
  const rest = pts
    .slice(1)
    .map((p) => `L ${p.x} ${p.y}`)
    .join(" ");
  return `${move} ${rest} Z`;
}

type ColorCircleViewProps = {
  emotion: ColorEmotionMeta;
  activeChordSymbol: string | null;
};

function ColorCircleView({
  emotion,
  activeChordSymbol,
}: ColorCircleViewProps) {
  let pcs: number[] = [];
  let rootPc: number | null = null;
  

  if (activeChordSymbol) {
    const notes = triadFromChordName(activeChordSymbol);
    const midis = notes.map((n) => {
      const m = /^([A-G])(b|#)?(\d+)$/.exec(n);
      if (!m) return 60;
      const letter = m[1] as string;
      const acc = m[2] || "";
      const oct = parseInt(m[3], 10);
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
      return (oct + 1) * 12 + pc;
    });
    pcs = midis.map((m) => m % 12);
    if (midis.length) rootPc = midis[0] % 12;
  }

  const shapePath = pcs.length ? pathFromPcs(pcs) : null;
  const chordHighlightColor =
    activeChordSymbol && activeChordSymbol.length
      ? getChordHighlightColor(emotion.id, activeChordSymbol)
      : null;

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
          {/* Base ring */}
          <circle
            cx={50}
            cy={50}
            r={38}
            fill="none"
            stroke="rgba(0,0,0,0.35)"
            strokeWidth={1}
          />

          {/* Chord polygon */}
          {shapePath && (
  <path
    d={shapePath}
    fill={(chordHighlightColor || emotion.trailColor) + "33"}
    stroke={chordHighlightColor || emotion.trailColor}
    strokeWidth={1.2}
    strokeLinecap="round"
    strokeLinejoin="round"
  />
)}

          {/* Chromatic nodes */}
          {CHROMA_LABELS.map((_, i) => {
            const p = nodePosition(i, 33);
            const isActive = rootPc === i;
const nodeColor =
  isActive && chordHighlightColor
    ? chordHighlightColor
    : emotion.trailColor;

return (
  <circle
    key={i}
    cx={p.x}
    cy={p.y}
    r={isActive ? 3.2 : 2.4}
    fill={isActive ? nodeColor : "rgba(0,0,0,0.7)"}
    stroke={
      isActive ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.25)"
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
   Main Color Emotion Player
   ========================= */
   export default function ColorKeyboard() {
  return <ColorEmotionPlayerInner />;
}

function ColorEmotionPlayerInner() {
  const [selectedId, setSelectedId] = useState<EmotionId>("sadness");
  const [currentChords, setCurrentChords] = useState<string[]>([]);
  const samplerRef = useRef<Tone.Sampler | null>(null);

  // Init sampler
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

  const selectedMeta = COLOR_EMOTIONS_BY_ID[selectedId];

  const activeChordSymbol =
    activeChordIndex != null && currentChords[activeChordIndex]
      ? currentChords[activeChordIndex]
      : null;

  const chromaHighlightColor =
    activeChordSymbol && activeChordSymbol.length
      ? getChordHighlightColor(selectedMeta.id, activeChordSymbol)
      : null;

  const triggerEmotion = useCallback(
    async (id: EmotionId) => {
      await Tone.start().catch(() => {});

      const meta = COLOR_EMOTIONS_BY_ID[id];
      const chords = meta.colorChords
        .trim()
        .split(/\s+/)
        .filter(Boolean);

      setCurrentChords(chords);

      const baseStepSec = 0.9;
      const tempoMult = meta.tempo || 1.0;
      const stepMs = (baseStepSec / tempoMult) * 1000;

      playSequence(chords, stepMs);

      console.log(`[ColorEmotionPlayer] ${id}:`, chords.join(" → "));
    },
    [playSequence]
  );

  const handleSelectEmotion = (id: EmotionId) => {
    setSelectedId(id);
    triggerEmotion(id);
  };

  // Initial chords for default emotion
  useEffect(() => {
    const meta = COLOR_EMOTIONS_BY_ID[selectedId];
    const chords = meta.colorChords
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    setCurrentChords(chords);

    console.log(
      `[ColorEmotionPlayer INIT] ${selectedId}:`,
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
        <h1
          style={{
            margin: "4px 0 2px",
            fontSize: 24,
            lineHeight: 1.25,
            textAlign: "center",
            letterSpacing: 0.2,
            fontWeight: 800,
          }}
        >
          Color Emotion Player
        </h1>
        <p
          style={{
            margin: "0 0 12px",
            fontSize: 13,
            textAlign: "center",
            opacity: 0.8,
          }}
        >
          Tap an emotion to hear its Color progression. The chromatic circle,
          chord line, and keyboard move together.
        </p>

        {/* Color Circle */}
        <ColorCircleView
          emotion={selectedMeta}
          activeChordSymbol={activeChordSymbol}
        />

        {/* Chord caption */}
        <ChordCaptionLine
          chords={currentChords}
          activeIndex={activeChordIndex}
        />

        {/* Keyboard with emotion highlight */}
        <KeyboardEmotions
          activeChordSymbol={activeChordSymbol}
          emotion={{
            gradientTop: selectedMeta.gradientTop,
            gradientBottom: selectedMeta.gradientBottom,
            trailColor: selectedMeta.trailColor,
          }}
          emotionLabel={selectedMeta.label}
          highlightColorOverride={chromaHighlightColor ?? undefined}

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
