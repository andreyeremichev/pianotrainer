"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  parseProgression,
  type ParsedChord,
  noteNameForPc,
} from "@/lib/harmony/chords";
import {
  buildMinimalMotionMapping,
  tweenBetween,
} from "@/lib/harmony/matchVoiceLeading";
import { playProgression } from "@/lib/harmony/audio";

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
  const ux = Math.cos(a), uy = Math.sin(a);
  const x = p.x + 3.0 * ux, y = p.y + 3.0 * uy;
  const ax = Math.abs(ux), ay = Math.abs(uy);
  let anchor: "start"|"middle"|"end" = "middle";
  let baseline: "baseline"|"middle"|"hanging" = "middle";
  if (ax >= ay) { anchor = ux > 0 ? "start" : "end"; baseline = "middle"; }
  else { anchor = "middle"; baseline = uy > 0 ? "hanging" : "baseline"; }
  return { x: fmt(x), y: fmt(y), anchor, baseline };
}
function pathFromIndices(indices: number[]): string {
  if (!indices.length) return "";
  const pts = indices.map(i => nodePosition(i, 36));
  const move = `M ${pts[0].x} ${pts[0].y}`;
  const rest = pts.slice(1).map(p => `L ${p.x} ${p.y}`).join(" ");
  return `${move} ${rest} Z`;
}
/* =========================
   Enharmonic labels for chromatic circle
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

/* =========================
   Chord color mapping
========================= */
function getChordColor(
  chord: { label?: string } | undefined,
  bg: "dark" | "light"
): { stroke: string; fill: string } {
  const label = (chord?.label || "").toLowerCase();

  // Quality detection
  const isMaj7  = /maj7/.test(label);
  const isMin7  = /(^|[^a-z])m7([^a-z]|$)/.test(label) && !isMaj7;

  // More precise dom7: root + "7", but not maj7 / m7
  const isDom7  =
    /(^|\s|\|)[a-g](#|b)?7($|\s|\/)/.test(label) && !isMaj7 && !isMin7;

  const isMinor = /(^|\s|\|)[a-g](#|b)?m([^a-z0-9]|$)/.test(label);
  const isDim   = /(dim|°)/.test(label);
  const isAug   = /(\+|aug)/.test(label);
  const isSus   = /(sus2|sus4)/.test(label);
  const isAdd   = /add/.test(label);

  // 6th chords
  const isMin6 = /m6/.test(label) && !/maj6/.test(label);
  const isMaj6 =
    /maj6/.test(label) ||
    ( /(^|\s|\|)[a-g](#|b)?6($|\s|\/)/.test(label) && !isMin6 ); // "C6", "F#6" etc.

  const dark = {
    major: "#EBCF7A",
    minor: "#69D58C",
    dom7:  "#FF8C42", // new, a bit punchier orange
    maj7:  "#7FD1FF",
    min7:  "#8FD1B0",
    maj6:  "#FFB86B", // new – warm peach
    min6:  "#32B49A", // new – teal / greenish
    dim:   "#FF5A5A",
    aug:   "#3BE7E1",
    sus:   "#C6B7FF",
    add:   "#B9E6FF",
    other: "#EDEDED",
  };

  const light = {
    major: "#B08900",
    minor: "#1E7B45",
    dom7:  "#C05621", // deeper orange-brown
    maj7:  "#1B84B8",
    min7:  "#1E6B4C",
    maj6:  "#CC7A29", // warm amber
    min6:  "#1C8C73", // teal-ish
    dim:   "#9E1B1B",
    aug:   "#0B8C86",
    sus:   "#5848B5",
    add:   "#2F89B9",
    other: "#333333",
  };

  const P = bg === "dark" ? dark : light;

  let stroke = P.other;

  if (isMaj7)      stroke = P.maj7;
  else if (isMin7) stroke = P.min7;
  else if (isDom7) stroke = P.dom7;
  else if (isMaj6) stroke = P.maj6;
  else if (isMin6) stroke = P.min6;
  else if (isMinor) stroke = P.minor;
  else if (isDim)   stroke = P.dim;
  else if (isAug)   stroke = P.aug;
  else if (isSus)   stroke = P.sus;
  else if (isAdd)   stroke = P.add;
  else              stroke = P.major; // default major triad

  const fill = stroke + "20"; // ~12% alpha
  return { stroke, fill };
}

/* =========================
   Caption canvas painter
========================= */
function drawCaptionCanvas(
  ctx: CanvasRenderingContext2D,
  chords: ParsedChord[],
  activeIdx: number,
  T: ReturnType<typeof pickTheme>,
) {
  const cvs = ctx.canvas;
  const cssW = Math.round(cvs.getBoundingClientRect().width || 360);
  const cssH = Math.round(cvs.getBoundingClientRect().height || 48);
  const ratio = window.devicePixelRatio || 1;
  if (cvs.width !== cssW * ratio || cvs.height !== cssH * ratio) {
    cvs.width = cssW * ratio; cvs.height = cssH * ratio;
  }
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  ctx.clearRect(0,0,cssW,cssH);

  const names = chords.map(c => c.label || "");
  ctx.font = "18px Inter, system-ui, sans-serif";
  ctx.textBaseline = "middle";
  ctx.textAlign = "center";

  const widths = names.map(n => ctx.measureText(n).width);
  const sep = 28;
  const totalW = widths.reduce((a,b)=>a+b,0) + sep*(names.length-1);
  const startX = cssW/2 - totalW/2;
  const midY = cssH/2;

  let x = startX;
  for (let i=0;i<names.length;i++){
    const w = widths[i];
    ctx.fillStyle = i===activeIdx ? T.gold : T.muted;
    ctx.fillText(names[i], x + w/2, midY);
    x += w + sep;
  }
}

/* =========================
   Page
========================= */
type VizMode = "circle" | "constellation";
type PlayMode = "chords" | "arpeggio";

const DEFAULT_PROG = "C Am | F G7";
const BASE_DURATION_PER_CHORD = 0.9;
/* =========================
   EXPORT HELPERS (SVG → image, MediaRecorder, Audio, etc.)
========================= */

// Pick a working recorder mime
function pickRecorderMime(): string {
  const M = [
    "video/webm;codecs=vp9",
    "video/webm;codecs=vp8",
    "video/webm",
  ];
  for (const m of M) {
    // @ts-ignore
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported?.(m)) return m;
  }
  return "video/webm";
}

// Minimal embedded CSS for serialized SVG (safe no-op if fonts are system)
async function buildEmbeddedFontStyle(): Promise<string> {
  return `/* Using system fonts: Inter, system-ui, -apple-system */`;
}

// Clone the live SVG, strip dynamic paths, set size, and return data URL
function serializeFullSvg(svg: SVGSVGElement, w: number, h: number, extraCss = ""): string {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  // remove any dynamic polygons/paths so background is static (ring + labels only)
  clone.querySelectorAll("path").forEach((p) => p.remove());
  const style = document.createElementNS("http://www.w3.org/2000/svg", "style");
  style.textContent = extraCss;
  clone.insertBefore(style, clone.firstChild);
  clone.setAttribute("width", String(w));
  clone.setAttribute("height", String(h));
  const xml = new XMLSerializer().serializeToString(clone);
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(xml)}`;
}

// Turn serialized SVG data URL into an HTMLImageElement
function svgToImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = rej;
    img.src = dataUrl;
  });
}

/* =========
   Export Audio (sharps-only sample set)
========= */

// Single shared AudioContext for export
let exportAC: AudioContext | null = null;

// Simple cache for decoded note buffers
const exportBufCache = new Map<string, AudioBuffer>();

// Map pitch class to sharps-only name
function sharpName(pc: number) {
  const N = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];
  return N[((pc % 12) + 12) % 12];
}

// Encode # for URLs
function safeHash(name: string) { return name.replace(/#/g, "%23"); }

// Get/resume export AudioContext
async function getAC() {
  if (!exportAC) exportAC = new (window.AudioContext || (window as any).webkitAudioContext)();
  if (exportAC.state === "suspended") await exportAC.resume();
  return exportAC;
}

// Load and cache a sample like "F#4"
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
/* =========================
   Export helpers (MP4 converter)
========================= */
async function convertToMp4Server(inputBlob: Blob): Promise<Blob> {
  if (inputBlob.type.includes("mp4")) return inputBlob;

  const resp = await fetch("/api/convert-webm-to-mp4-qt", {
    method: "POST",
    headers: { "Content-Type": inputBlob.type || "application/octet-stream" },
    body: inputBlob,
  });

  if (!resp.ok) {
    const msg = await resp.text().catch(() => "");
    console.error("[SoH convert-webm-to-mp4-qt] server error:", resp.status, msg);
    throw new Error(`server convert failed: ${resp.status}`);
  }

  const out = await resp.blob();
  if (out.size === 0) {
    console.error("[SoH convert-webm-to-mp4-qt] server returned empty blob");
    throw new Error("server returned empty blob");
  }

  return out;
}
/* =========================
   EXPORT: caption line painter (centered, with highlight)
========================= */
function drawExportCaptionLine(
  ctx: CanvasRenderingContext2D,
  labels: string[],
  activeIdx: number,
  xCenter: number,        // FRAME_W * SCALE / 2
  y: number,              // pixel Y
  scale: number,          // SCALE (e.g. 2)
  T: { gold: string; muted: string; text: string }
) {
  const px = 44 * scale;                 // caption font size (export)
  const gap = 28 * scale;                // spacing between items
  ctx.save();
  ctx.font = `${px}px Inter, system-ui, sans-serif`;
  ctx.textBaseline = "middle";
  ctx.textAlign = "center";

  // measure total width
  const widths = labels.map(t => ctx.measureText(t).width);
  const totalW = widths.reduce((a,b)=>a+b,0) + gap * (labels.length - 1);
  let x = xCenter - totalW / 2;

  for (let i = 0; i < labels.length; i++) {
    const w = widths[i];
    ctx.fillStyle = (i === activeIdx ? T.gold : T.muted);
    ctx.fillText(labels[i], x + w / 2, y);
    x += w + gap;
  }
  ctx.restore();
}

export default function ShapeOfHarmonyPage() {
  const [bg, setBg] = useState<BgMode>("dark");
  const T = pickTheme(bg);

  const [input, setInput] = useState(DEFAULT_PROG);
  const chords = useMemo<ParsedChord[]>(() => parseProgression(input), [input]);

  const [vizMode, setVizMode] = useState<VizMode>("circle");
  const [playMode, setPlayMode] = useState<PlayMode>("chords");
  const [playing, setPlaying] = useState(false);
  const [tempoMode, setTempoMode] = useState<"epic" | "dynamic">("epic");
  const [finalPaths, setFinalPaths] = useState<string[]>([]);

  const [stepIdx, setStepIdx] = useState(0);
  const [phase, setPhase] = useState(0);
  const [highlightRoot, setHighlightRoot] = useState<number | null>(null);

  const rafRef = useRef<number | null>(null);
  const runEndRef = useRef<number>(0);
  const startRef = useRef<number>(0);
  const totalStepsRef = useRef<number>(0);
  // export UI state
const [isExporting, setIsExporting] = useState(false);

// ref the live SVG so we can snapshot circle + labels
const svgRef = useRef<SVGSVGElement | null>(null);

  const captionCanvasRef = useRef<HTMLCanvasElement | null>(null);

  async function onPlay() {
    if (!chords.length || playing) return;

    setFinalPaths([]);
    setPlaying(true);
    setStepIdx(0);
    setPhase(0);

   // Single pass, tempo-aware
const chordDur =
  tempoMode === "epic"
    ? BASE_DURATION_PER_CHORD
    : BASE_DURATION_PER_CHORD / 1.4; // "Dynamic" ≈ 1.4x faster

const PASSES = 1;
totalStepsRef.current = chords.length * PASSES;
startRef.current = performance.now();
runEndRef.current =
  startRef.current + totalStepsRef.current * chordDur * 1000;

// Audio: single pass (live + export share timing)
playProgression(chords, { playMode, chordDur }).catch(() => {});

// Visuals: RAF loop
const loopFn = () => {
  const now = performance.now();
  const tSec = (now - startRef.current) / 1000;
  const per = chordDur;

  const globalStep = Math.floor(tSec / per);
  if (globalStep >= totalStepsRef.current || now >= runEndRef.current) {
    // Final constellation after pass
    const finals = chords.map((c) => {
      const idxs = c.pcs.slice().sort((a, b) => a - b);
      return pathFromIndices(idxs);
    });
    setFinalPaths(finals);
    setPlaying(false);
    // Clear caption highlight
    if (captionCanvasRef.current) {
      const ctx = captionCanvasRef.current.getContext("2d");
      if (ctx) drawCaptionCanvas(ctx, chords, -1, T);
    }
    return;
  }

  const idxInPass = Math.min(globalStep, chords.length - 1);
  const localPhase = Math.min(1, (tSec - globalStep * per) / per);
  setStepIdx(idxInPass);
  setPhase(localPhase);
  const activeRoot = chords[idxInPass]?.root ?? null;
setHighlightRoot(activeRoot);

  // Draw caption
  if (captionCanvasRef.current) {
    const ctx = captionCanvasRef.current.getContext("2d");
    if (ctx) drawCaptionCanvas(ctx, chords, idxInPass, T);
  }

  rafRef.current = requestAnimationFrame(loopFn);
};
rafRef.current = requestAnimationFrame(loopFn); 
  }

  function onStop() {
  // Build final constellation paths (same logic as RAF ending)
  const finals = chords.map((c) => {
    const idxs = c.pcs.slice().sort((a, b) => a - b);
    return pathFromIndices(idxs);
  });

  setFinalPaths(finals);
  setPlaying(false);
  setHighlightRoot(null);

  if (rafRef.current) cancelAnimationFrame(rafRef.current);

  if (captionCanvasRef.current) {
    const ctx = captionCanvasRef.current.getContext("2d");
    if (ctx) drawCaptionCanvas(ctx, chords, -1, T);
  }
}
  const onDownloadVideo = async () => {
  if (isExporting) return;
  setIsExporting(true);
  try {
    const svgEl = svgRef.current;
    if (!svgEl || !chords.length) {
      setIsExporting(false);
      return;
    }

    // 1) Snapshot background (outer ring only)
const rect = svgEl.getBoundingClientRect();
const liveW = Math.max(2, Math.floor(rect.width));
const liveH = Math.max(2, Math.floor(rect.height));

// Clone + strip polygons, nodes and labels so we keep only the outer ring
const clone = svgEl.cloneNode(true) as SVGSVGElement;
clone.querySelectorAll("path").forEach((p) => p.remove());
// Remove all small node circles and labels; keep only main ring circle
clone.querySelectorAll("circle").forEach((c) => {
  const cx = c.getAttribute("cx");
  const cy = c.getAttribute("cy");
  const r = c.getAttribute("r");
  if (!(cx === "50" && cy === "50" && r === "36")) {
    c.remove();
  }
});
clone.querySelectorAll("text").forEach((t) => t.remove());

    const css = await buildEmbeddedFontStyle();
    const rawBg = serializeFullSvg(clone, liveW, liveH, css);
    const bgImg = await svgToImage(rawBg);

    // 2) Canvas + recorder (ToneDial-style)
    const FRAME_W = 1080;
    const FRAME_H = 1920;
    const FPS = 30;
    const SCALE = 2;

    const canvas = document.createElement("canvas");
    canvas.width = FRAME_W * SCALE;
    canvas.height = FRAME_H * SCALE;
    const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;

    const ac = await getAC();
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

    // 3) Layout (center the circle)
    const SIDE = 48;
    const SAFE_TOP = 140;
    const SAFE_BOTTOM = 120;
    const titleH = 34 * SCALE;

    const goldTop = SAFE_TOP + titleH + 12 * SCALE;
    const availW = FRAME_W - SIDE * 2;
    const availH = FRAME_H - SAFE_TOP - SAFE_BOTTOM - titleH - 12 * SCALE;
    const scaleContent = Math.min(availW / liveW, availH / liveH);
    const drawW = Math.round(liveW * scaleContent);
    const drawH = Math.round(liveH * scaleContent);
    const drawX = Math.round((FRAME_W - drawW) / 2);
    const drawY = Math.round(goldTop);

    // 4) Timeline: 2 passes + constellation hold (deterministic)
    const chordDur =
  tempoMode === "epic"
    ? BASE_DURATION_PER_CHORD
    : BASE_DURATION_PER_CHORD / 1.4;
    const passes = 1;
    const totalChords = chords.length * passes;
    const NOTE_MS = chordDur * 1000;
    const chordsMs = totalChords * NOTE_MS;
    const holdMs = 900;
    const totalMs = chordsMs + holdMs;

    const captionLabels = chords.map((c) => c.label || "");

    // 5) AUDIO schedule (export graph → dst + speakers)
const baseOct = 4;
const startAt = ac.currentTime + 0.25;
let tAudio = startAt;

for (const c of chords) {
  const isBarPause = c.label === "|" && (!c.pcs || c.pcs.length === 0);

  if (isBarPause) {
    // Bar '|' → silent pause, 1.5x longer than a normal chord
    tAudio += chordDur * 1.5;
    continue;
  }

  const names = c.pcs.map((pc) => `${sharpName(pc)}${baseOct}`);
  if (!names.length) {
    // Just in case: empty chord but not tagged as bar
    tAudio += chordDur;
    continue;
  }

  const bufs = await Promise.all(names.map(loadNoteBuffer));
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

    // 6) Drawing helpers
    function drawBaseCircle() {
      ctx.drawImage(
        bgImg,
        0,
        0,
        liveW,
        liveH,
        drawX * SCALE,
        drawY * SCALE,
        drawW * SCALE,
        drawH * SCALE
      );
    }
        function drawCircleOverlayForChord(
      activeChord: ParsedChord | null,
      phase: number,
      isPlaying: boolean
    ) {
      ctx.save();
      ctx.translate(drawX * SCALE, drawY * SCALE);
      ctx.scale((drawW * SCALE) / 100, (drawH * SCALE) / 100);

      const theme = bg === "dark" ? themeDark : themeLight;
      const activeRoot = activeChord?.root ?? null;
      const activeColor = activeChord
        ? getChordColor(activeChord, bg).stroke
        : theme.text;

      // Nodes (with strong pulsing root in chord color)
      for (let i = 0; i < 12; i++) {
        const p = nodePosition(i, 36);
        const isRoot = isPlaying && activeRoot != null && i === activeRoot;

        const baseR = 1.6;
        const pulse =
          isRoot && !Number.isNaN(phase)
            ? baseR + 2.4 * Math.pow(Math.sin(phase * Math.PI), 2)
            : baseR;

        ctx.save();
        if (isRoot) {
          ctx.shadowBlur = 12;
          ctx.shadowColor = activeColor;
        }
        ctx.beginPath();
        ctx.arc(p.x, p.y, pulse, 0, Math.PI * 2);
        ctx.fillStyle = isRoot ? activeColor : theme.text;
        ctx.globalAlpha = isRoot ? 1 : 0.25;
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.restore();
      }

      // Labels: all when idle, root-only when chord is playing
      for (let i = 0; i < 12; i++) {
        const p = nodePosition(i, 36);
        const lp = labelPlacement(i, p);

        const isRoot = activeRoot != null && i === activeRoot;
        const showThisLabel =
          !isPlaying || activeRoot == null || isRoot;

        if (!showThisLabel) continue;

        // Map anchor/baseline to canvas textAlign/textBaseline
        const align =
          lp.anchor === "start"
            ? "left"
            : lp.anchor === "end"
            ? "right"
            : "center";
        const baseline =
          lp.baseline === "hanging"
            ? "hanging"
            : lp.baseline === "middle"
            ? "middle"
            : "alphabetic";

        ctx.font = "4px system-ui";
        ctx.textAlign = align as CanvasTextAlign;
        ctx.textBaseline = baseline as CanvasTextBaseline;
        ctx.fillStyle = theme.text;
        ctx.fillText(CHROMA_LABELS[i], lp.x, lp.y);
      }

      ctx.restore();
    }

   function drawPolygonForChord(chord: ParsedChord) {
  ctx.save();
  ctx.translate(drawX * SCALE, drawY * SCALE);
  ctx.scale((drawW * SCALE) / 100, (drawH * SCALE) / 100);

  const { stroke, fill } = getChordColor(chord, bg);
  const pcs = chord.pcs.slice().sort((a, b) => a - b);
  const pts = pcs.map((i) => nodePosition(i, 36));

  if (pts.length === 0) {
    ctx.restore();
    return;
  }

  const buildPath = () => {
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let k = 1; k < pts.length; k++) ctx.lineTo(pts[k].x, pts[k].y);
    ctx.closePath();
  };

  // -------- 1) Subtle fill glow (circle mode only) --------
  if (vizMode !== "constellation") {
    ctx.save();
    buildPath();
    ctx.fillStyle = fill;
    ctx.globalAlpha = 0.55;
    ctx.shadowBlur = 18;
    ctx.shadowColor = fill;
    ctx.globalCompositeOperation = "lighter";
    ctx.fill();
    ctx.restore();
  }

  // -------- 2) Strong halo stroke (thin line, big blur) --------
  ctx.save();
  buildPath();
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 1.8;        // same as live-ish
  ctx.shadowBlur = 45;        // BIG blur => visible glow
  ctx.shadowColor = stroke;
  ctx.globalAlpha = 0.95;
  ctx.globalCompositeOperation = "lighter";
  ctx.stroke();
  ctx.restore();

  // -------- 3) Crisp core stroke on top --------
  ctx.save();
  buildPath();
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 1.8;
  ctx.shadowBlur = 0;
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.stroke();
  ctx.restore();

  ctx.restore();
}

  function drawConstellationFrame() {
  ctx.save();
  ctx.translate(drawX * SCALE, drawY * SCALE);
  ctx.scale((drawW * SCALE) / 100, (drawH * SCALE) / 100);

  chords.forEach((c) => {
    const { stroke } = getChordColor(c, bg);
    const pcs = c.pcs.slice().sort((a, b) => a - b);
    const pts = pcs.map((i) => nodePosition(i, 36));
    if (!pts.length) return;

    const buildPath = () => {
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let k = 1; k < pts.length; k++) ctx.lineTo(pts[k].x, pts[k].y);
      ctx.closePath();
    };

    // Soft halo
    ctx.save();
    buildPath();
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 1.4;
    ctx.shadowBlur = 16;
    ctx.shadowColor = stroke;
    ctx.globalAlpha = 0.8;
    ctx.globalCompositeOperation = "lighter";
    ctx.stroke();
    ctx.restore();

    // Crisp line
    ctx.save();
    buildPath();
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 1.2;
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke();
    ctx.restore();
  });

  ctx.restore();
}

    // 7) Start recorder + deterministic frame loop
    const t0 = performance.now();
    let lastTs = 0;

    rec.start();
    const hardStopTimer = window.setTimeout(() => {
      try {
        rec.stop();
      } catch {}
    }, totalMs + 1000);

    function loop() {
      const nowTs = performance.now();
      const elapsed = nowTs - t0;
      const _dtSec = lastTs ? (nowTs - lastTs) / 1000 : 1 / FPS;
      lastTs = nowTs;

      // Base background
      ctx.fillStyle = bg === "dark" ? themeDark.bg : themeLight.bg;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // FINAL WINDOW: constellation-only + no highlight
      if (elapsed >= chordsMs) {
        drawExportCaptionLine(
          ctx,
          captionLabels,
          -1,
          (FRAME_W * SCALE) / 2,
          (SAFE_TOP + 100) * SCALE,
          SCALE,
          {
            gold: bg === "dark" ? themeDark.gold : themeLight.gold,
            muted: bg === "dark" ? themeDark.muted : themeLight.muted,
            text: bg === "dark" ? themeDark.text : themeLight.text,
          }
        );

                  drawBaseCircle();
  if (vizMode === "circle") {
    drawCircleOverlayForChord(null, 0, false);
  }
  drawConstellationFrame();
        
        if (elapsed >= totalMs) {
          rec.stop();
          return;
        }
        requestAnimationFrame(loop);
        return;
      }

      // NORMAL WINDOW: animated chords (2 passes)
      const idx = Math.min(
        totalChords - 1,
        Math.floor(elapsed / NOTE_MS)
      );
      const inChordMs = elapsed - idx * NOTE_MS;
      const phase = Math.max(0, Math.min(1, inChordMs / NOTE_MS));
      const chordIdx = idx % chords.length;

      drawExportCaptionLine(
        ctx,
        captionLabels,
        chordIdx,
        (FRAME_W * SCALE) / 2,
        (SAFE_TOP + 100) * SCALE,
        SCALE,
        {
          gold: bg === "dark" ? themeDark.gold : themeLight.gold,
          muted: bg === "dark" ? themeDark.muted : themeLight.muted,
          text: bg === "dark" ? themeDark.text : themeLight.text,
        }
      );

      drawBaseCircle();
            drawBaseCircle();
if (vizMode === "circle") {
  drawCircleOverlayForChord(chords[chordIdx], phase, true);
}


      const A = chords[chordIdx];
      if (playMode === "chords") {
        drawPolygonForChord(A);
      } else {
        const B = chords[(chordIdx + 1) % chords.length];
        const mapping = buildMinimalMotionMapping(A.pcs, B.pcs);
        const pcsTween = tweenBetween(A.pcs, B.pcs, mapping, phase);
        const fakeChord: ParsedChord = { label: A.label, pcs: pcsTween };
        drawPolygonForChord(fakeChord);
      }

      if (elapsed < totalMs) {
        requestAnimationFrame(loop);
      } else {
        rec.stop();
      }
    }

    loop();

    // 8) Finalize recording & save as MP4
    const recorded: Blob = await new Promise((res) => {
  rec.onstop = () => {
    try {
      try { stream.getTracks().forEach((t) => t.stop()); } catch {}
      try { exportDst.stream.getTracks().forEach((t) => t.stop()); } catch {}
      try { window.clearTimeout(hardStopTimer); } catch {}
    } finally {
      res(new Blob(chunks, { type: mimeType || "video/webm" }));
    }
  };
});

// Decide whether we really have MP4 or fall back to WebM
let outBlob: Blob = recorded;
let ext = "webm";

try {
  const converted = await convertToMp4Server(recorded);

  if ((converted.type || "").includes("mp4")) {
    outBlob = converted;
    ext = "mp4";
  } else {
    console.warn(
      "[SoH export] Conversion succeeded but output is not MP4 type:",
      converted.type
    );
    // keep WebM, but keep ext="webm"
  }
} catch (err) {
  console.error("[SoH export] MP4 conversion failed, using WebM:", err);
  // outBlob stays as original recorded WebM, ext stays "webm"
}

// Safe filename
const safe =
  (input || "shape-of-harmony").replace(/[^A-Za-z0-9\-_.]+/g, "-") ||
  "shape-of-harmony";

const a = document.createElement("a");
a.download = `${safe}.${ext}`;
a.href = URL.createObjectURL(outBlob);
document.body.appendChild(a);
a.click();
a.remove();
  } catch (e) {
    console.error("[SoH export] error", e);
    try {
      alert("Could not export video. Please try again.");
    } catch {}
  } finally {
    setIsExporting(false);
  }
};

  useEffect(() => () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
  }, []);

  // Current polygon path (live mode only)
  const currentPolygon = useMemo(() => {
    if (!chords.length) return "";
    const iA = stepIdx % chords.length;
    const iB = (stepIdx + 1) % chords.length;
    const A = chords[iA];
    const B = chords[iB];

    let pcs: number[] = [];
    if (playMode === "chords") pcs = A.pcs; // discrete
    else {
      const mapping = buildMinimalMotionMapping(A.pcs, B.pcs);
      pcs = tweenBetween(A.pcs, B.pcs, mapping, phase);
    }
    const indices = pcs.slice().sort((a, b) => a - b);
    return pathFromIndices(indices);
  }, [chords, stepIdx, phase, playMode]);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: T.bg,
        color: T.text,
        overflowX: "hidden",
      }}
    >
      <main
        className="vt-card"
        style={{
          width: "100%",
          margin: "0 auto",
          padding: 12,
          boxSizing: "border-box",
          maxWidth: 520,
        }}
      >
        <section
          className="vt-panel minw0"
          style={{
            border: `1px solid ${T.gold}`,
            borderRadius: 14,
            paddingTop: 12,
            paddingBottom: 12,
            background: T.card,
            display: "grid",
            gap: 10,
          }}
        >
          {/* Title */}
          <div
            style={{
              textAlign: "center",
              fontSize: 24,
              fontWeight: 700,
              lineHeight: 1.15,
            }}
          >
            Shape of Harmony
          </div>

          {/* Input + Play/Stop */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (input.trim()) onPlay();
            }}
            style={{
              display: "flex",
              gap: 8,
              alignItems: "center",
              justifyContent: "center",
              flexWrap: "wrap",
              paddingInline: 2,
            }}
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="C | Am | F | G7"
              style={{
                boxSizing: "border-box",
                width: "min(92%, 34ch)",
                background: bg === "dark" ? "#0F1821" : "#F3F5F8",
                color: T.gold,
                border: `1px solid ${T.border}`,
                borderRadius: 8,
                padding: "10px 12px",
                fontSize: 16,
                fontFamily:
                  'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Courier New", monospace',
                fontVariantNumeric: "tabular-nums",
              }}
              aria-label="Enter chords"
            />
            <button
              type="submit"
              onClick={(e) => {
                e.preventDefault();
                if (!playing && input.trim()) onPlay();
              }}
              style={{
                background: input.trim()
                  ? T.gold
                  : bg === "dark"
                  ? "#1a2430"
                  : "#E8ECF2",
                color: input.trim()
                  ? bg === "dark"
                    ? "#081019"
                    : "#111"
                  : bg === "dark"
                  ? T.muted
                  : T.muted,
                border: "none",
                borderRadius: 999,
                padding: "10px 16px",
                fontWeight: 700,
                cursor: input.trim() ? "pointer" : "not-allowed",
                fontSize: 16,
                minHeight: 40,
              }}
              title="▶ Play"
            >
              ▶ Play
            </button>
            <button
              type="button"
              onClick={onStop}
              disabled={!playing}
              style={{
                background: "transparent",
                color: T.gold,
                border: `1px solid ${T.border}`,
                borderRadius: 999,
                padding: "8px 12px",
                fontWeight: 700,
                cursor: playing ? "pointer" : "not-allowed",
                minHeight: 40,
                fontSize: 14,
              }}
              title="⏸ Stop"
            >
              ⏸ Stop
            </button>
          </form>

          {/* Caption canvas */}
          <div
            style={{
              display: "grid",
              justifyContent: "center",
              paddingTop: 6,
            }}
          >
            <canvas
              ref={captionCanvasRef}
              width={360}
              height={48}
              style={{ width: 360, height: 48, display: "block" }}
              aria-label="Chord progression caption"
            />
          </div>

          {/* Circle */}
<div
  className="minw0"
  style={{
    display: "grid",
    justifyContent: "center",
    paddingInline: 2,
  }}
>
  <svg
    ref={svgRef}
    viewBox="0 0 100 100"
    width={360}
    height={360}
    style={{ overflow: "visible" }}
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
    {vizMode === "circle" && (
      <circle
        cx="50"
        cy="50"
        r="36"
        stroke={
          bg === "dark"
            ? "rgba(230,235,242,0.15)"
            : "rgba(0,0,0,0.12)"
        }
        strokeWidth="2"
        fill="none"
      />
    )}

    {/* Final constellation — only when stopped (LIVE) */}
    {!playing &&
      finalPaths.length > 0 &&
      finalPaths.map((d, i) => {
        const { stroke } = getChordColor(
          chords[i % chords.length],
          bg
        );
        return (
          <path
            key={`final-${i}`}
            d={d}
            fill="none"
            stroke={stroke}
            strokeOpacity={0.5}
            strokeWidth={1.3}
            strokeLinecap="round"
            strokeLinejoin="round"
            filter="url(#vt-glow)"
          />
        );
      })}

    {/* Current chord polygon (LIVE) */}
    {currentPolygon &&
      playing &&
      (() => {
        const { stroke, fill } = getChordColor(chords[stepIdx], bg);
        return (
          <path
            d={currentPolygon}
            fill={vizMode === "constellation" ? "none" : fill}
            stroke={stroke}
            strokeWidth={1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
            filter="url(#vt-glow)"
          />
        );
      })()}

    {/* Nodes + labels */}
    {vizMode === "circle" && (
      <>
        {(() => {
          const activeChord = playing ? chords[stepIdx] : undefined;
          const activeChordColor = activeChord
            ? getChordColor(activeChord, bg).stroke
            : T.gold;

          return (
            <>
              {/* Nodes (with strong pulsing root, in chord color) */}
              {Array.from({ length: 12 }, (_, i) => {
                const p = nodePosition(i, 36);
                const isRoot = playing && highlightRoot === i;

                const baseR = 1.6;
                const pulse =
                  isRoot && phase != null
                    ? baseR +
                      2.4 * Math.pow(Math.sin(phase * Math.PI), 2)
                    : baseR;

                const fillColor = isRoot ? activeChordColor : T.text;

                return (
                  <circle
                    key={`node-${i}`}
                    cx={p.x}
                    cy={p.y}
                    r={pulse}
                    fill={fillColor}
                    fillOpacity={isRoot ? 1 : 0.25}
                    filter={isRoot ? "url(#vt-glow)" : undefined}
                  />
                );
              })}

              {/* Labels (all when idle, root-only when playing) */}
              {Array.from({ length: 12 }, (_, i) => {
                const p = nodePosition(i, 36);
                const lp = labelPlacement(i, p);

                const showThisLabel =
                  !playing ||
                  highlightRoot == null ||
                  highlightRoot === i;

                if (!showThisLabel) return null;

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
          );
        })()}
      </>
    )}
  </svg>
</div>

          {/* Bottom controls */}
          <div
            style={{ display: "grid", gap: 10, paddingInline: 6 }}
          >
            <div
              style={{
                display: "flex",
                gap: 8,
                justifyContent: "center",
                flexWrap: "wrap",
              }}
            >
              <button
                onClick={() => setInput(DEFAULT_PROG)}
                style={{
                  background: "transparent",
                  color: T.text,
                  border: `1px solid ${T.border}`,
                  borderRadius: 999,
                  padding: "8px 12px",
                  fontWeight: 600,
                  fontSize: 14,
                }}
              >
                Preset
              </button>

              <button
                onClick={() => setBg((m) => (m === "dark"
                  ? "light"
                  : "dark"))}
                style={{
                  background: "transparent",
                  color: T.text,
                  border: `1px solid ${T.border}`,
                  borderRadius: 999,
                  padding: "8px 12px",
                  fontWeight: 600,
                  fontSize: 14,
                }}
                title="Toggle theme"
              >
                {bg === "dark" ? "Light" : "Dark"}
              </button>

              <button
                onClick={onDownloadVideo}
                disabled={isExporting}
                style={{
                  background: "transparent",
                  color: isExporting ? T.muted : T.text,
                  border: `1px solid ${T.border}`,
                  borderRadius: 999,
                  padding: "8px 12px",
                  fontWeight: 600,
                  fontSize: 14,
                  cursor: isExporting ? "not-allowed" : "pointer",
                }}
                title="Download video"
              >
                {isExporting ? "⏺ Exporting…" : "💾 Download"}
              </button>

              {/* Visualization segmented */}
              <div
                role="tablist"
                aria-label="Visualization mode"
                style={{
                  display: "inline-flex",
                  border: `1px solid ${T.border}`,
                  borderRadius: 999,
                  padding: 4,
                  gap: 4,
                }}
              >
                {(["circle", "constellation"] as VizMode[]).map((v) => {
                  const active = vizMode === v;
                  return (
                    <button
                      key={v}
                      role="tab"
                      aria-selected={active}
                      onClick={() => setVizMode(v)}
                      style={{
                        border: "none",
                        borderRadius: 999,
                        padding: "8px 12px",
                        background: active
                          ? "rgba(255,255,255,0.12)"
                          : "transparent",
                        color: T.text,
                        fontSize: 14,
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      {v === "circle" ? "Circle" : "Constellation"}
                    </button>
                  );
                })}
              </div>

              {/* Playback + Tempo segmented */}
<div
  style={{
    display: "flex",
    flexDirection: "column",
    gap: 8,
    alignItems: "center",
  }}
>
  {/* Playback segmented */}
  <div
    role="tablist"
    aria-label="Playback mode"
    style={{
      display: "inline-flex",
      border: `1px solid ${T.border}`,
      borderRadius: 999,
      padding: 4,
      gap: 4,
    }}
  >
    {(["chords", "arpeggio"] as PlayMode[]).map((v) => {
      const active = playMode === v;
      return (
        <button
          key={v}
          role="tab"
          aria-selected={active}
          onClick={() => setPlayMode(v)}
          style={{
            border: "none",
            borderRadius: 999,
            padding: "8px 12px",
            background: active
              ? "rgba(255,255,255,0.12)"
              : "transparent",
            color: T.text,
            fontSize: 14,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          {v === "chords" ? "Chords" : "Arpeggio"}
        </button>
      );
    })}
  </div>

  {/* Tempo segmented */}
  <div
    role="tablist"
    aria-label="Tempo"
    style={{
      display: "inline-flex",
      border: `1px solid ${T.border}`,
      borderRadius: 999,
      padding: 4,
      gap: 4,
    }}
  >
    {(["epic", "dynamic"] as const).map((mode) => {
      const active = tempoMode === mode;
      return (
        <button
          key={mode}
          role="tab"
          aria-selected={active}
          onClick={() => setTempoMode(mode)}
          style={{
            border: "none",
            borderRadius: 999,
            padding: "6px 10px",
            background: active
              ? "rgba(255,255,255,0.12)"
              : "transparent",
            color: T.text,
            fontSize: 12,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          {mode === "epic" ? "Epic" : "Dynamic"}
        </button>
      );
    })}
  </div>
</div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}    