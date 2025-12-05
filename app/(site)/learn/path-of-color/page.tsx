"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { parseProgression, type ParsedChord } from "@/lib/harmony/chords";
import { playProgression } from "@/lib/harmony/audio";
import Link from "next/link";

/* =========================
   Theme (Dark + Light)
========================= */
type BgMode = "dark" | "light";
const themeDark = {
  bg: "#0B0F14",
  card: "#111820",
  border: "#1E2935",
  text: "#E6EBF2",
  muted: "#8B94A7",
  gold: "#EBCF7A",
  minor: "#69D58C",
};
const themeLight = {
  bg: "#F5F6F8",
  card: "#FFFFFF",
  border: "#D9DEE7",
  text: "#1B2430",
  muted: "#667083",
  gold: "#B08900",
  minor: "#1E7B45",
};
function pickTheme(mode: BgMode) {
  return mode === "dark" ? themeDark : themeLight;
}

/* =========================
   Circle geometry
========================= */
type Pt = { x: number; y: number };
function fmt(v: number, p = 3) {
  return Number(v.toFixed(p));
}
function nodePosition(i: number, r = 36): Pt {
  const a = (i / 12) * Math.PI * 2 - Math.PI / 2; // C at top
  return { x: fmt(50 + Math.cos(a) * r), y: fmt(50 + Math.sin(a) * r) };
}
function labelPlacement(i: number, p: Pt) {
  const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
  const ux = Math.cos(a),
    uy = Math.sin(a);
  const x = p.x + 3.0 * ux,
    y = p.y + 3.0 * uy;
  const ax = Math.abs(ux),
    ay = Math.abs(uy);
  let anchor: "start" | "middle" | "end" = "middle";
  let baseline: "baseline" | "middle" | "hanging" = "middle";
  if (ax >= ay) {
    anchor = ux > 0 ? "start" : "end";
    baseline = "middle";
  } else {
    anchor = "middle";
    baseline = uy > 0 ? "hanging" : "baseline";
  }
  return { x: fmt(x), y: fmt(y), anchor, baseline };
}

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

function pathFromPcs(pcs: number[]): string {
  const uniq = Array.from(new Set(pcs.map((x) => ((x % 12) + 12) % 12))).sort(
    (a, b) => a - b
  );
  if (!uniq.length) return "";
  const pts = uniq.map((i) => nodePosition(i, 36));
  const move = `M ${pts[0].x} ${pts[0].y}`;
  const rest = pts
    .slice(1)
    .map((p) => `L ${p.x} ${p.y}`)
    .join(" ");
  return `${move} ${rest} Z`;
}

/* =========================
   Custom chord color mapping (same as SoH)
========================= */
function getChordColor(
  chord: { label?: string } | undefined,
  bg: "dark" | "light"
): { stroke: string; fill: string } {
  const label = (chord?.label || "").toLowerCase();

  const isMaj7 = /maj7/.test(label);
  const isMin7 =
    /(^|[^a-z])m7([^a-z]|$)/.test(label) && !isMaj7;
  const isDom7 =
    /(^|\s|\|)[a-g](#|b)?7($|\s|\/)/.test(label) && !isMaj7 && !isMin7;
  const isMinor =
    /(^|\s|\|)[a-g](#|b)?m([^a-z0-9]|$)/.test(label);
  const isDim = /(dim|°)/.test(label);
  const isAug = /(\+|aug)/.test(label);
  const isSus = /(sus2|sus4)/.test(label);
  const isAdd = /add/.test(label);

  const isMin6 = /m6/.test(label) && !/maj6/.test(label);
  const isMaj6 =
    /maj6/.test(label) ||
    (/(^|\s|\|)[a-g](#|b)?6($|\s|\/)/.test(label) && !isMin6);

  const dark = {
    major: "#EBCF7A",
    minor: "#69D58C",
    dom7: "#FF8C42",
    maj7: "#7FD1FF",
    min7: "#8FD1B0",
    maj6: "#FFB86B",
    min6: "#32B49A",
    dim: "#FF5A5A",
    aug: "#3BE7E1",
    sus: "#C6B7FF",
    add: "#B9E6FF",
    other: "#EDEDED",
  };

  const light = {
    major: "#B08900",
    minor: "#1E7B45",
    dom7: "#C05621",
    maj7: "#1B84B8",
    min7: "#1E6B4C",
    maj6: "#CC7A29",
    min6: "#1C8C73",
    dim: "#9E1B1B",
    aug: "#0B8C86",
    sus: "#5848B5",
    add: "#2F89B9",
    other: "#333333",
  };

  const P = bg === "dark" ? dark : light;

  let stroke = P.other;

  if (isMaj7) stroke = P.maj7;
  else if (isMin7) stroke = P.min7;
  else if (isDom7) stroke = P.dom7;
  else if (isMaj6) stroke = P.maj6;
  else if (isMin6) stroke = P.min6;
  else if (isMinor) stroke = P.minor;
  else if (isDim) stroke = P.dim;
  else if (isAug) stroke = P.aug;
  else if (isSus) stroke = P.sus;
  else if (isAdd) stroke = P.add;
  else stroke = P.major;

  const fill = stroke + "20";
  return { stroke, fill };
}

/* =========================
   Emotion presets (chromatic)
========================= */

const BASE_DURATION_PER_CHORD = 0.9;

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
  id: Exclude<EmotionId, "custom">;
  label: string; // UI label
  chords: string[];
  formula: string;
  trail: string;
  glow: string;
  gradient: [string, string];
  pulse: number; // 0–100
  tempo: number; // tempo multiplier
};

const EMOTION_PRESETS: EmotionPreset[] = [
  {
    id: "sadness",
    label: "Sadness",
    chords: ["Cm", "Ab", "Fm", "Em"],
    formula: "m → M(–4) → m(–3) → m(–1)",
    trail: "#4A6FA5",
    glow: "#A8C1E8",
    gradient: ["#0E1524", "#1C2947"],
    pulse: 45,
    tempo: 0.9,
  },
  {
    id: "anger",
    label: "Anger",
    chords: ["Cm", "C#m", "E°", "F#"],
    formula: "m → m(+1) → dim(+3) → M(+2)",
    trail: "#D64541",
    glow: "#FF8E7A",
    gradient: ["#240A0A", "#3E0F0F"],
    pulse: 90,
    tempo: 1.15,
  },
  {
    id: "fear",
    label: "Fear / Horror",
    chords: ["Cm", "F#°", "G", "A#°"],
    formula: "m → dim(+6) → M(+1) → dim(+3)",
    trail: "#7F00FF",
    glow: "#DA8CFF",
    gradient: ["#130020", "#310047"],
    pulse: 80,
    tempo: 1.15,
  },
  {
    id: "mystery",
    label: "Mystery",
    chords: ["Cm", "D", "F°", "F#"],
    formula: "m → M(+2) → dim(+3) → M(+1)",
    trail: "#5C4EE5",
    glow: "#B7B3FF",
    gradient: ["#100E28", "#1F1A50"],
    pulse: 60,
    tempo: 1.05,
  },
  {
    id: "melancholy",
    label: "Melancholy",
    chords: ["Cm", "A", "C#m", "A#"],
    formula: "m → M(–3) → m(+4) → M(–3)",
    trail: "#8E6DA7",
    glow: "#D4C0EA",
    gradient: ["#1A1024", "#332047"],
    pulse: 55,
    tempo: 0.9,
  },
  {
    id: "calm",
    label: "Calm",
    chords: ["C", "D", "F", "Eb"],
    formula: "M → M(+2) → M(+3) → M(–2)",
    trail: "#76C7C0",
    glow: "#B8EFEA",
    gradient: ["#0B1C1C", "#123231"],
    pulse: 35,
    tempo: 0.8,
  },
  {
    id: "playful",
    label: "Playful",
    chords: ["C", "Eb", "F#", "G#"],
    formula: "M → M(+3) → M(+3) → M(+2)",
    trail: "#FFB84D",
    glow: "#FFE0A8",
    gradient: ["#2A1B00", "#4B3000"],
    pulse: 70,
    tempo: 1.05,
  },
  {
    id: "magic",
    label: "Magic",
    chords: ["C", "Ab", "E", "G"],
    formula: "M → M(+8) → M(–4) → M(+3)",
    trail: "#EFA7FF",
    glow: "#FAD7FF",
    gradient: ["#220022", "#410041"],
    pulse: 55,
    tempo: 1.05,
  },
  {
    id: "wonder",
    label: "Wonder",
    chords: ["Cm", "F", "G", "B"],
    formula: "m → M(+5) → M(+2) → M(+4)",
    trail: "#FFD86E",
    glow: "#FFE9B5",
    gradient: ["#241A00", "#4B3600"],
    pulse: 65,
    tempo: 1.05,
  },
  {
    id: "tension",
    label: "Tension",
    chords: ["C", "C#m", "E°", "F#"],
    formula: "M → m(+1) → dim(+3) → M(+2)",
    trail: "#FF6E40",
    glow: "#FFAD98",
    gradient: ["#2A0E04", "#4E1C09"],
    pulse: 85,
    tempo: 1.15,
  },
];

// Emotion-specific explanations for Path of Color (Color Circle).
// Based on the blog table's "⭐ Pure Chromatic Chords" column.
const COLOR_EMOTION_TEXT = {
  // Fully diatonic Flow – but Color introduces a key chromatic color

  calm:
    "Eb is the soft pastel color at the end — a gentle “exhale” away from C.",
  playful:
    "F# is the “jump up” between Eb and F# — like a playful hop.",
  magic:
    "E is the brightest chromatic moment — a sudden flash of light in the harmony.",
  sadness:
    "Em sits fully outside C minor — a sudden bright color before falling back into the minor mood.",
  mystery:
    "F° is the chromatic “fog chord” — it blurs the key before sliding onward.",

  // One strong chromatic trigger

  melancholy:
    "A is the main melancholy trigger — bright, off-key, and slightly nostalgic.",
  wonder:
    "B is a “halo chord” — very bright, almost glowing above the home key.",
  tension:
    "E° is the point where everything “collapses inward” before pushing up again.",

  // Heavier chromatic usage

  anger:
    "C#m, E°, and F# are all chromatic — turning anger into a grinding, rising line.",
  fear:
    "F#° and A#° push away from C: C → F#° (tritone), G → A#° (chromatic +3) — classic horror “unstable” colors.",
} as const;

/* =========================
   Export helpers (audio + MP4)
========================= */

// Recorder mime
function pickRecorderMime(): string {
  const M = [
    "video/webm;codecs=vp9",
    "video/webm;codecs=vp8",
    "video/webm",
  ];
  for (const m of M) {
    // @ts-ignore
    if (
      typeof MediaRecorder !== "undefined" &&
      (MediaRecorder as any).isTypeSupported?.(m)
    )
      return m;
  }
  return "video/webm";
}

let exportAC: AudioContext | null = null;
const exportBufCache = new Map<string, AudioBuffer>();

// sharps-only name for pc
function sharpName(pc: number) {
  const N = [
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
  return N[((pc % 12) + 12) % 12];
}
function safeHash(name: string) {
  return name.replace(/#/g, "%23");
}
async function getAC() {
  if (!exportAC)
    exportAC = new (window.AudioContext ||
      (window as any).webkitAudioContext)();
  if (exportAC.state === "suspended") await exportAC.resume();
  return exportAC;
}
async function loadNoteBuffer(note: string) {
  if (exportBufCache.has(note)) return exportBufCache.get(note)!;
  const res = await fetch(`/audio/notes/${safeHash(note)}.wav`);
  if (!res.ok) throw new Error(`Missing sample: ${note}`);
  const arr = await res.arrayBuffer();
  const ac = await getAC();
  const buf = await ac.decodeAudioData(arr);
  exportBufCache.set(note, buf);
  return buf;
}

async function convertToMp4Server(inputBlob: Blob): Promise<Blob> {
  if (inputBlob.type.includes("mp4")) return inputBlob;

  const resp = await fetch("/api/convert-webm-to-mp4", {
    method: "POST",
    headers: { "Content-Type": inputBlob.type || "application/octet-stream" },
    body: inputBlob,
  });

  if (!resp.ok) {
    const msg = await resp.text().catch(() => "");
    console.error(
      "[ChromaticEmotionWheel convert-webm-to-mp4] server error:",
      resp.status,
      msg
    );
    throw new Error(`server convert failed: ${resp.status}`);
  }

  const out = await resp.blob();
  if (out.size === 0) {
    console.error(
      "[ChromaticEmotionWheel convert-webm-to-mp4] server returned empty blob"
    );
    throw new Error("server returned empty blob");
  }

  return out;
}

function drawExportCaptionLine(
  ctx: CanvasRenderingContext2D,
  labels: string[],
  activeIdx: number,
  xCenter: number,
  y: number,
  T: { gold: string; muted: string; text: string }
) {
  const CAPTION_FONT = 74;
  const gap = 100;
  ctx.save();
  ctx.font = `${CAPTION_FONT}px Inter, system-ui, sans-serif`;
  ctx.textBaseline = "middle";
  ctx.textAlign = "center";

  const widths = labels.map((t) => ctx.measureText(t).width);
  const totalW =
    widths.reduce((a, b) => a + b, 0) + gap * (labels.length - 1);
  let x = xCenter - totalW / 2;

  for (let i = 0; i < labels.length; i++) {
    const w = widths[i];
    ctx.fillStyle = i === activeIdx ? T.gold : T.muted;
    ctx.fillText(labels[i], x + w / 2, y);
    x += w + gap;
  }

  ctx.restore();
}

/* =========================
   Page
========================= */

export default function ChromaticEmotionsLabPage() {
  const [bg] = useState<BgMode>("dark");
  const T = pickTheme(bg);
  

  // Emotion selection
  const [emotionId, setEmotionId] = useState<EmotionId>("playful");
  const [customInput, setCustomInput] =
    useState<string>("C Am | F G7");

  const activePreset =
    emotionId === "custom"
      ? null
      : EMOTION_PRESETS.find((p) => p.id === emotionId) || null;

      // Theme alias for cleaner use
const baseTheme = T;

// Background gradient for main <main>
// Must come AFTER activePreset is defined
const backgroundTop =
  activePreset?.gradient?.[0] ??
  (bg === "dark" ? "#0B0F14" : "#F5F6F8");

const backgroundBottom =
  activePreset?.gradient?.[1] ??
  (bg === "dark" ? "#05070C" : "#D9DEE7");

  const sourceString = activePreset
    ? activePreset.chords.join(" ")
    : customInput;

  const chords = useMemo<ParsedChord[]>(
    () => parseProgression(sourceString),
    [sourceString]
  );

  const [playing, setPlaying] = useState(false);
  const [stepIdx, setStepIdx] = useState(0);
  const [phase, setPhase] = useState(0);
  const [highlightRoot, setHighlightRoot] = useState<number | null>(
    null
  );
  const [isExporting, setIsExporting] = useState(false);

  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number>(0);
  const totalMsRef = useRef<number>(0);

  // Derived timing
  const chordDurSec =
    activePreset != null
      ? BASE_DURATION_PER_CHORD / activePreset.tempo
      : BASE_DURATION_PER_CHORD;

  const pulseIntensity = activePreset ? activePreset.pulse : 40;

  const bgGradient =
    activePreset != null
      ? `linear-gradient(145deg, ${activePreset.gradient[0]}, ${activePreset.gradient[1]})`
      : `radial-gradient(circle at top, #182132, #05070C)`;

  const captionText = activePreset
    ? `${activePreset.chords.join("  ·  ")}  —  ${
        activePreset.formula
      }`
    : sourceString || "Enter chords…";

  // Keep root aligned with first chord
  useEffect(() => {
    setStepIdx(0);
    setPhase(0);
    setHighlightRoot(chords[0]?.root ?? null);
  }, [sourceString, chords.length]);

  const stopPlayback = () => {
    setPlaying(false);
    setPhase(0);
    setStepIdx(0);
    setHighlightRoot(chords[0]?.root ?? null);
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  };

  function getChordVisual(
    chord: ParsedChord | undefined
  ): { stroke: string; fill: string; glow: string } {
    if (activePreset && chord) {
      const s = activePreset.trail;
      const gl = activePreset.glow;
      return { stroke: s, fill: s + "33", glow: gl };
    }
    if (!chord) {
      const base = T.gold;
      return { stroke: base, fill: base + "33", glow: base };
    }
    const { stroke, fill } = getChordColor(chord, bg);
    return { stroke, fill, glow: stroke };
  }

  const currentChord = chords[stepIdx];
  const currentPath = currentChord ? pathFromPcs(currentChord.pcs) : "";

  const pulseFactor = Math.max(0, Math.min(1, pulseIntensity / 100));

  async function onPlay() {
    if (!chords.length || playing || isExporting) return;
    setPlaying(true);
    setStepIdx(0);
    setPhase(0);
    setHighlightRoot(chords[0]?.root ?? null);

    const chordMs = chordDurSec * 1000;
    const totalMs = chordMs * chords.length;
    startRef.current = performance.now();
    totalMsRef.current = totalMs;

    // Audio: SoH engine, chords only, one pass
    playProgression(chords, {
      playMode: "chords",
      chordDur: chordDurSec,
    }).catch(() => {});

    const loop = () => {
      const now = performance.now();
      const elapsed = now - startRef.current;

      if (elapsed >= totalMsRef.current) {
        setPlaying(false);
        setPhase(0);
        setStepIdx(chords.length - 1);
        setHighlightRoot(chords[chords.length - 1]?.root ?? null);
        if (rafRef.current) {
          cancelAnimationFrame(rafRef.current);
          rafRef.current = null;
        }
        return;
      }

      const chordMsLocal = chordDurSec * 1000;
      const idx = Math.min(
        chords.length - 1,
        Math.floor(elapsed / chordMsLocal)
      );
      const inChord = elapsed - idx * chordMsLocal;
      const localPhase = Math.max(
        0,
        Math.min(1, inChord / chordMsLocal)
      );

      setStepIdx(idx);
      setPhase(localPhase);
      setHighlightRoot(chords[idx]?.root ?? null);

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
  }

  function onStop() {
    if (isExporting) return;
    stopPlayback();
  }

  // Export / Download (CoF-Piano-style layout)
  async function onDownload() {
    if (isExporting || !chords.length) return;
    setIsExporting(true);
    stopPlayback();

    try {
      const FRAME_W = 1080;
      const FRAME_H = 1920;
      const FPS = 30;
      const SCALE = 2;

      // Label & helper texts for export (Color)
const exportTitleLabel = activePreset?.label ?? "Custom Color";
const exportColorFormula = activePreset?.formula ?? "";

// Explanation from blog table (Color Circle) – only for presets
const exportEmotionText =
  activePreset && emotionId !== "custom"
    ? COLOR_EMOTION_TEXT[
        activePreset.id as keyof typeof COLOR_EMOTION_TEXT
      ]
    : "";

      const canvas = document.createElement("canvas");
      canvas.width = FRAME_W * SCALE;
      canvas.height = FRAME_H * SCALE;
      const ctx = canvas.getContext(
        "2d"
      ) as CanvasRenderingContext2D;

      const ac = await getAC();
      const exportDst = ac.createMediaStreamDestination();
      const stream = (canvas as any).captureStream(
        FPS
      ) as MediaStream;
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

      // Layout params
      const circleCenterX = (FRAME_W * SCALE) / 2;
      const circleCenterY = FRAME_H * SCALE * 0.6;
      const targetRadiusPx =
        FRAME_W * SCALE * 0.25 * 1.2;
      const SCALE_LIVE = targetRadiusPx / 36; // radius in 0..100 space

      const captionY =
        circleCenterY + targetRadiusPx + 90 * SCALE;

      const chordDur = chordDurSec;
      const totalChords = chords.length;
const NOTE_MS = chordDur * 1000;
const chordsMs = totalChords * NOTE_MS;


// Add a short visual hold on the last chord (equal to one chord slot)
const holdMs = NOTE_MS;
const totalMs = chordsMs + holdMs;

      const captionLabels = chords.map((c) => c.label || "");

      

      // AUDIO schedule (export graph → dst + speakers)
      const baseOct = 4;
      const startAt = ac.currentTime + 0.25;
      let tAudio = startAt;

      for (const c of chords) {
        const isBarPause =
          c.label === "|" &&
          (!c.pcs || c.pcs.length === 0);

        if (isBarPause) {
          tAudio += chordDur * 1.5;
          continue;
        }
        const pcs = c.pcs || [];
        if (!pcs.length) {
          tAudio += chordDur;
          continue;
        }

        const names = pcs.map(
          (pc) => `${sharpName(pc)}${baseOct}`
        );
        const bufs = await Promise.all(
          names.map(loadNoteBuffer)
        );
        bufs.forEach((buf) => {
          const src = ac.createBufferSource();
          src.buffer = buf;
          const g = ac.createGain();
          g.gain.value = 0.95;
          src.connect(g);
          g.connect(ac.destination);
          g.connect(exportDst);
          try {
            src.start(tAudio);
            src.stop(tAudio + chordDur);
          } catch {}
        });

        tAudio += chordDur;
      }
            // Draw a single export frame of the circle for a given chord + phase
      function drawExportCircle(
        activeChord: ParsedChord | null,
        phase0: number
      ) {
        const theme = bg === "dark" ? themeDark : themeLight;

        // Transform to 0..100 coordinate space with ring at (50,50), r=36
        ctx.save();
        ctx.setTransform(
          SCALE_LIVE,
          0,
          0,
          SCALE_LIVE,
          circleCenterX - SCALE_LIVE * 50,
          circleCenterY - SCALE_LIVE * 50
        );

        // Ring
        ctx.beginPath();
        ctx.arc(50, 50, 36, 0, Math.PI * 2);
        ctx.strokeStyle =
          bg === "dark"
            ? "rgba(230,235,242,0.18)"
            : "rgba(0,0,0,0.12)";
        ctx.lineWidth = 2 / SCALE_LIVE;
        ctx.stroke();

        const { stroke, fill, glow } = activeChord
          ? getChordVisual(activeChord)
          : {
              stroke: theme.gold,
              fill: theme.gold + "33",
              glow: theme.gold,
            };

        const pcs = activeChord?.pcs || [];
        const uniq = Array.from(
          new Set(pcs.map((x) => ((x % 12) + 12) % 12))
        ).sort((a, b) => a - b);

        const pulse =
          1 + pulseFactor * 0.2 * Math.sin(phase0 * Math.PI);

        // ---------- Polygon (glow + fill + core stroke) ----------
        if (uniq.length) {
          const pts = uniq.map((i) => nodePosition(i, 36));

          // Glow stroke (thick trail — 3x thicker than live)
          ctx.save();
          ctx.translate(50, 50);
          ctx.scale(pulse, pulse);
          ctx.translate(-50, -50);

          ctx.beginPath();
          ctx.moveTo(pts[0].x, pts[0].y);
          for (let k = 1; k < pts.length; k++) {
            ctx.lineTo(pts[k].x, pts[k].y);
          }
          ctx.closePath();

          ctx.strokeStyle = glow;
          ctx.lineWidth = 42 / SCALE_LIVE; // <-- thicker outer line
          ctx.lineJoin = "round";
          ctx.lineCap = "round";
          ctx.shadowBlur = 30 / SCALE_LIVE;
          ctx.shadowColor = glow;
          ctx.stroke();
          ctx.restore();

          // Fill
          ctx.save();
          ctx.beginPath();
          ctx.moveTo(pts[0].x, pts[0].y);
          for (let k = 1; k < pts.length; k++) {
            ctx.lineTo(pts[k].x, pts[k].y);
          }
          ctx.closePath();
          ctx.fillStyle = fill;
          ctx.globalAlpha = 0.9;
          ctx.fill();
          ctx.restore();

          // Core stroke
          ctx.save();
          ctx.beginPath();
          ctx.moveTo(pts[0].x, pts[0].y);
          for (let k = 1; k < pts.length; k++) {
            ctx.lineTo(pts[k].x, pts[k].y);
          }
          ctx.closePath();
          ctx.strokeStyle = stroke;
          ctx.lineWidth = 3 / SCALE_LIVE;
          ctx.lineJoin = "round";
          ctx.lineCap = "round";
          ctx.shadowBlur = 0;
          ctx.globalAlpha = 1;
          ctx.stroke();
          ctx.restore();
        }

        // ---------- Nodes + root pulse ----------
        const activeRoot = activeChord?.root ?? null;
        const rootStroke = stroke;

        for (let i = 0; i < 12; i++) {
          const p = nodePosition(i, 36);
          const isRoot =
            activeRoot != null && i === activeRoot;

          const baseR = 1.4;
          const r =
            isRoot && !Number.isNaN(phase0)
              ? baseR +
                (0.8 + 1.4 * pulseFactor) *
                  Math.pow(Math.sin(phase0 * Math.PI), 2)
              : baseR;

          ctx.save();
          if (isRoot) {
            ctx.shadowBlur = 18 / SCALE_LIVE;
            ctx.shadowColor = rootStroke;
          }
          ctx.beginPath();
          ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
          ctx.fillStyle = isRoot
            ? rootStroke
            : theme.text;
          ctx.globalAlpha = isRoot ? 1 : 0.25;
          ctx.fill();
          ctx.restore();
        }

        // ---------- Labels: ROOT ONLY during playback ----------
        ctx.save();
        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;
        ctx.fillStyle = theme.text;

        if (activeRoot != null) {
          const i = activeRoot;
          const p = nodePosition(i, 36);
          const lp = labelPlacement(i, p);

          let align: CanvasTextAlign = "center";
          if (lp.anchor === "start") align = "left";
          else if (lp.anchor === "end") align = "right";

          let baseline: CanvasTextBaseline = "alphabetic";
          if (lp.baseline === "middle") baseline = "middle";
          else if (lp.baseline === "hanging") baseline = "hanging";

          ctx.textAlign = align;
          ctx.textBaseline = baseline;
          ctx.font = `${4}px Inter, system-ui, sans-serif`;
          ctx.fillText(CHROMA_LABELS[i], lp.x, lp.y);
        }

        ctx.restore(); // labels
        ctx.restore(); // transform
      }

      // Draw ALL 12 labels (used only on final frame)
      function drawExportAllLabels() {
        const theme = bg === "dark" ? themeDark : themeLight;

        ctx.save();
        ctx.setTransform(
          SCALE_LIVE,
          0,
          0,
          SCALE_LIVE,
          circleCenterX - SCALE_LIVE * 50,
          circleCenterY - SCALE_LIVE * 50
        );

        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;
        ctx.fillStyle = theme.text;

        for (let i = 0; i < 12; i++) {
          const p = nodePosition(i, 36);
          const lp = labelPlacement(i, p);

          let align: CanvasTextAlign = "center";
          if (lp.anchor === "start") align = "left";
          else if (lp.anchor === "end") align = "right";

          let baseline: CanvasTextBaseline = "alphabetic";
          if (lp.baseline === "middle") baseline = "middle";
          else if (lp.baseline === "hanging") baseline = "hanging";

          ctx.textAlign = align;
          ctx.textBaseline = baseline;
          ctx.font = `${4}px Inter, system-ui, sans-serif`;
          ctx.fillText(CHROMA_LABELS[i], lp.x, lp.y);
        }

        ctx.restore();
      }

      rec.start();

const t0 = performance.now();
let lastTs = 0;

const hardStopTimer = window.setTimeout(() => {
  try {
    rec.stop();
  } catch {}
}, totalMs + 2000);

function loop() {
  const nowTs = performance.now();
  const elapsed = nowTs - t0;
  const _dtSec = lastTs ? (nowTs - lastTs) / 1000 : 1 / FPS;
  lastTs = nowTs;

  // Background
  const theme = bg === "dark" ? themeDark : themeLight;
  ctx.fillStyle = theme.bg;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Gradient overlay
  const g = ctx.createLinearGradient(
    0,
    0,
    canvas.width,
    canvas.height
  );
  const grad =
    activePreset?.gradient ??
    (bg === "dark"
      ? ["#182132", "#05070C"]
      : ["#FFFFFF", "#E4E7F0"]);
  g.addColorStop(0, grad[0]);
  g.addColorStop(1, grad[1]);
  ctx.fillStyle = g;
  ctx.globalAlpha = 0.95;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.globalAlpha = 1;

    // === Export Title (Path of Color) ===
  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#E6EBF2";  // same milky color as labels / text
  ctx.font = `${56 * SCALE}px Inter, system-ui, sans-serif`;

  const titleY = circleCenterY - targetRadiusPx - 100 * SCALE;

  ctx.fillText(
    `${exportTitleLabel} – Path of Color`,
    (FRAME_W * SCALE) / 2,
    titleY
  );

  ctx.restore();

  // If we've passed totalMs, just stop recording
  if (elapsed >= totalMs) {
    try {
      rec.stop();
    } catch {}
    return;
  }

  // Time within the chord progression (before the hold)
  const progTime = Math.min(elapsed, chordsMs - 1);
  const idx = Math.min(
    totalChords - 1,
    Math.floor(progTime / NOTE_MS)
  );
  const inChordMs = progTime - idx * NOTE_MS;
  const phaseLocal = Math.max(
    0,
    Math.min(1, inChordMs / NOTE_MS)
  );
  const chordIdx = idx;
  const A = chords[chordIdx] || null;

  if (elapsed >= chordsMs) {
    // HOLD SECTION: last chord, no pulse, full 12-label circle
    drawExportCircle(A, 0);        // static chord, root pulse off
    drawExportAllLabels();         // overlay full chromatic labels
    drawExportCaptionLine(
      ctx,
      captionLabels,
      -1,                          // no active highlight in caption
      circleCenterX,
      captionY,
      {
        gold: theme.gold,
        muted: theme.muted,
        text: theme.text,
      }
    );
  } else {
    // PROGRESSION SECTION: animate chord + root-only label
    drawExportCircle(A, phaseLocal);
    drawExportCaptionLine(
      ctx,
      captionLabels,
      chordIdx,
      circleCenterX,
      captionY,
      {
        gold: theme.gold,
        muted: theme.muted,
        text: theme.text,
      }
    );
  }
    // === Formula line under the chord caption ===
  const CAPTION_FONT = 74; // same as in drawExportCaptionLine
  const formulaY = captionY + CAPTION_FONT * SCALE * 1.3;

  if (exportColorFormula) {
    ctx.font = `${CAPTION_FONT * 0.85 * SCALE}px Inter, system-ui, sans-serif`;
    ctx.fillStyle = "#E6EBF2";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText(
      exportColorFormula,   // e.g. "m → M(+3) → M(+3) → M(+2)"
      (FRAME_W * SCALE) / 2,
      formulaY
    );
  }

  // === Emotion helper text under the formula (from blog) ===
  if (exportEmotionText) {
    const lines = exportEmotionText.split("\n");
    let textY = formulaY + CAPTION_FONT * 0.85 * SCALE * 1.4;

    ctx.font = `${26 * SCALE}px Inter, system-ui, sans-serif`;
    ctx.fillStyle = "#E6EBF2";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";

    for (const line of lines) {
      ctx.fillText(line, (FRAME_W * SCALE) / 2, textY);
      textY += 28 * SCALE;
    }
  }

  requestAnimationFrame(loop);
}

loop();

  

      const recorded: Blob = await new Promise((res) => {
        rec.onstop = () => {
          try {
            try {
              stream.getTracks().forEach((t) => t.stop());
            } catch {}
            try {
              exportDst.stream
                .getTracks()
                .forEach((t) => t.stop());
            } catch {}
            try {
              window.clearTimeout(hardStopTimer);
            } catch {}
          } finally {
            res(new Blob(chunks, { type: mimeType || "video/webm" }));
          }
        };
      });

      let outBlob: Blob = recorded;
      let ext = "webm";

      try {
        const converted = await convertToMp4Server(recorded);
        if ((converted.type || "").includes("mp4")) {
          outBlob = converted;
          ext = "mp4";
        } else {
          console.warn(
            "[ChromaticEmotionWheel export] Conversion not mp4; keeping webm:",
            converted.type
          );
        }
      } catch (err) {
        console.error(
          "[ChromaticEmotionWheel export] MP4 conversion failed, using WebM:",
          err
        );
      }

      const safe =
        (sourceString || "chromatic-emotion-wheel")
          .replace(/[^A-Za-z0-9\-_.]+/g, "-")
          .slice(0, 60) || "chromatic-emotion-wheel";

      const a = document.createElement("a");
      a.download = `${safe}.${ext}`;
      a.href = URL.createObjectURL(outBlob);
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (e) {
      console.error("[ChromaticEmotionWheel export] error", e);
      try {
        alert("Could not export video. Please try again.");
      } catch {}
    } finally {
      setIsExporting(false);
    }
  }

  // ========= RENDER =========

  // Live caption chord labels
  const liveCaptionLabels = chords.map((c) => c.label || "");

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
      {/* Header (CoF-piano style) */}
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
  Path of Color
</h1>
<div
  style={{
    textAlign: "center",
    fontSize: 15,
    lineHeight: 1.45,
    color: baseTheme.muted,
    marginTop: -10,
    marginBottom: 10,
    paddingInline: 10,
  }}
>
  Discover harmony’s expressive, color-driven movement.
</div>

{/* CARD WRAPPER (missing before — this adds the border) */}
<section
  style={{
    background: baseTheme.card,
    border:
      bg === "dark"
        ? "1px solid rgba(255,255,255,0.08)"
        : "1px solid rgba(0,0,0,0.08)",
    borderRadius: 16,
    padding: 12,
    display: "grid",
    gap: 10,
  }}
>

        {/* Controls */}
        <section
          style={{
            display: "flex",
            flexDirection: "column",
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
                color: T.muted,
              }}
            >
              Pick Emotion&nbsp;
            </label>
            <select
              value={emotionId}
              onChange={(e) => {
                const val = e.target.value as EmotionId;
                setEmotionId(val);
                stopPlayback();
              }}
              style={{
                background:
                  bg === "dark" ? "#0F1821" : "#F2F4F9",
                color: T.text,
                border: `1px solid ${T.border}`,
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

          {/* Input / preset info */}
<div
  style={{
    display: "flex",
    flexDirection: "column",
    gap: 6,
    paddingInline: 12, // was 110 — this was squeezing everything
    width: "100%",
  }}
>
  {emotionId === "custom" ? (
    <>
      <label
        style={{
          fontSize: 12,
          fontWeight: 600,
          color: T.muted,
        }}
      >
        Type Your progression
      </label>
      <input
        type="text"
        value={customInput}
        onChange={(e) => setCustomInput(e.target.value)}
        placeholder="Example: Am(maj7) Dm9 G7(#5#9) Cmaj7"
        style={{
          width: "100%",
          borderRadius: 999,
          border: `1px solid ${T.border}`,
          padding: "8px 12px",
          background: "transparent",
          color: T.text,
          fontSize: 14,
          outline: "none",
        }}
      />
    </>
  ) : (
    activePreset && (
      <div
        style={{
          fontSize: 12,
          color: T.muted,
          lineHeight: 1.4,
          width: "100%",
        }}
      >
        <div
          style={{
            opacity: 0.8,
            width: "100%",
            whiteSpace: "normal",
            overflowWrap: "break-word",
            textAlign: "center", // or "left" if you prefer
            paddingInline: 4,
          }}
        >
          {activePreset.formula}
        </div>
      </div>
    )
  )}
</div>

          {/* Play / Stop / Download */}
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: 10,
              marginTop: -6,
              flexWrap: "wrap",
            }}
          >
            <button
              onClick={onPlay}
              disabled={!chords.length || playing || isExporting}
              style={{
                border: "none",
                borderRadius: 999,
                padding: "8px 18px",
                background:
                  !chords.length || playing || isExporting
                    ? "#1a2430"
                    : T.gold,
                color:
                  !chords.length || playing || isExporting
                    ? T.muted
                    : "#000",
                fontSize: 14,
                fontWeight: 700,
                cursor:
                  !chords.length || playing || isExporting
                    ? "default"
                    : "pointer",
              }}
            >
              ▶ Play
            </button>
            
            <button
              onClick={onDownload}
              disabled={!chords.length || isExporting}
              style={{
                border: `1px solid ${T.border}`,
                borderRadius: 999,
                padding: "8px 16px",
                background: "transparent",
                color: T.text,
                fontSize: 13,
                fontWeight: 500,
                cursor:
                  !chords.length || isExporting
                    ? "default"
                    : "pointer",
                opacity: !chords.length ? 0.6 : 1,
              }}
            >
              💾 {isExporting ? "Recording…" : "Download"}
            </button>
          </div>
        </section>

        {/* Chromatic circle (mobile-safe) */}
        <section
          style={{
            display: "flex",
            justifyContent: "center",
            marginTop: 4,
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 360,
            }}
          >
            {/* Aspect ratio box 1:1 */}
            <div
              style={{
                position: "relative",
                width: "100%",
                paddingTop: "100%",
              }}
            >
              <svg
                viewBox="0 0 100 100"
                style={{
                  position: "absolute",
                  inset: 0,
                  width: "100%",
                  height: "100%",
                  overflow: "visible",
                }}
                shapeRendering="geometricPrecision"
              >
                {/* Glow filter */}
                <defs>
                  <filter
                    id="vt-glow"
                    x="-50%"
                    y="-50%"
                    width="200%"
                    height="200%"
                  >
                    <feGaussianBlur
                      in="SourceGraphic"
                      stdDeviation="1.6"
                      result="b1"
                    />
                    <feGaussianBlur
                      in="SourceGraphic"
                      stdDeviation="3.2"
                      result="b2"
                    />
                    <feMerge>
                      <feMergeNode in="b2" />
                      <feMergeNode in="b1" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>

                {/* Ring */}
                <circle
                  cx="50"
                  cy="50"
                  r="36"
                  stroke={
                    bg === "dark"
                      ? "rgba(230,235,242,0.18)"
                      : "rgba(0,0,0,0.12)"
                  }
                  strokeWidth="2"
                  fill="none"
                />

                {/* Current chord polygon */}
                {currentChord && currentPath && (() => {
                  const { stroke, fill, glow } = getChordVisual(
                    currentChord
                  );
                  const pulse =
                    1 +
                    pulseFactor *
                      0.2 *
                      Math.sin(phase * Math.PI);
                  return (
                    <g filter="url(#vt-glow)">
                      {/* Glow outline */}
                      <path
                        d={currentPath}
                        fill="none"
                        stroke={glow}
                        strokeWidth={2.6}
                        strokeOpacity={0.85}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        transform={`translate(50,50) scale(${pulse}) translate(-50,-50)`}
                      />
                      {/* Main stroke + fill */}
                      <path
                        d={currentPath}
                        fill={fill}
                        stroke={stroke}
                        strokeWidth={1.6}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </g>
                  );
                })()}

                {/* Nodes + labels */}
                <>
                  {/* Nodes (with pulsing root in chord/emotion color) */}
                  {Array.from({ length: 12 }, (_, i) => {
                    const p = nodePosition(i, 36);
                    const isRoot =
                      playing && highlightRoot === i;
                    const { stroke } = getChordVisual(
                      currentChord
                    );
                    const baseR = 1.4;
                    const r =
                      isRoot && !Number.isNaN(phase)
                        ? baseR +
                          (0.8 + 1.4 * pulseFactor) *
                            Math.pow(
                              Math.sin(phase * Math.PI),
                              2
                            )
                        : baseR;

                    return (
                      <circle
                        key={`node-${i}`}
                        cx={p.x}
                        cy={p.y}
                        r={r}
                        fill={isRoot ? stroke : T.text}
                        fillOpacity={isRoot ? 1 : 0.25}
                        filter={
                          isRoot ? "url(#vt-glow)" : undefined
                        }
                      />
                    );
                  })}

                  {/* Labels (always visible) */}
                  {Array.from({ length: 12 }, (_, i) => {
                    const p = nodePosition(i, 36);
                    const lp = labelPlacement(i, p);
                    return (
                      <text
                        key={`label-${i}`}
                        x={lp.x}
                        y={lp.y}
                        textAnchor={lp.anchor}
                        dominantBaseline={lp.baseline}
                        fontSize="4"
                        fill={T.text}
                        style={{
                          userSelect: "none",
                          pointerEvents: "none",
                        }}
                      >
                        {CHROMA_LABELS[i]}
                      </text>
                    );
                  })}
                </>
              </svg>
            </div>
          </div>
        </section>

        {/* Live caption under ring */}
        <section
          style={{
            display: "flex",
            justifyContent: "center",
            marginTop: -10,
            paddingInline: 2,
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 360,
              borderRadius: 999,
              border: `1px dashed ${T.border}`,
              padding: "4px 10px",
              fontSize: 11,
              color: T.muted,
              whiteSpace: "nowrap",
              overflowX: "auto",
              WebkitOverflowScrolling: "touch",
            }}
          >
            <div
              style={{
                display: "inline-flex",
                justifyContent: "center",
                alignItems: "center",
                gap: 12,
                width: "100%",
              }}
            >
              {liveCaptionLabels.length === 0 ? (
                <span style={{ opacity: 0.7 }}>
                  Progression caption will appear here as you
                  play…
                </span>
              ) : (
                liveCaptionLabels.map((label, idx) => {
                  if (!label) return null;
                  const isActive =
                    playing && idx === stepIdx;
                  const accentColor = activePreset
                    ? activePreset.trail
                    : T.gold;

                  return (
                    <span
                      key={idx}
                      style={{
                        color: isActive
                          ? accentColor
                          : T.muted,
                        fontWeight: isActive ? 700 : 400,
                      }}
                    >
                      {label}
                    </span>
                  );
                })
              )}
            </div>
          </div>
        </section>
        {/* Emotion helper text – Color Circle (presets only) */}
{emotionId !== "custom" && (
  <div
    style={{
      marginTop: -4,
      textAlign: "center",
      fontSize: 13,
      lineHeight: 1.5,
      color: "#E6EBF2",
      opacity: 0.9,
      paddingInline: 10,
    }}
  >
    {COLOR_EMOTION_TEXT[emotionId as keyof typeof COLOR_EMOTION_TEXT]}
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
      href="/learn/path-of-flow"
      style={{
        fontWeight: 700,
        color: "#e7c86e",
        textDecoration: "none",
      }}
    >
      ← Go to Path of Flow
    </Link>
  </div>
</div>
  </main>
);
}