"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

/* =========================================
   Theme
   ========================================= */
const theme = {
  bg: "#0B0F14",
  card: "#111820",
  border: "#1E2935",
  text: "#E6EBF2",
  muted: "#8B94A7",
  blue: "#EBCF7A",
  gold: "#EBCF7A",
  green: "#69D58C",
  red: "#FF6B6B",
  purple: "#A78BFA",
  orange: "#FFA94D",
  teal: "#3BC9DB",
  rose: "#F06595",
  lime: "#94D82D",
};

const withAlpha = (hex: string, a: number) => {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
};

/* =========================================
   Circle of Fifths model (labels & PCs)
   Order: C, G, D, A, E, B, F#/Gb, Db/C#, Ab, Eb, Bb, F
   ========================================= */
type Co5Label =
  | "C" | "G" | "D" | "A" | "E" | "B"
  | "F#/Gb" | "Db/C#" | "Ab" | "Eb" | "Bb" | "F";

const CIRCLE: Co5Label[] = [
  "C","G","D","A","E","B","F#/Gb","Db/C#","Ab","Eb","Bb","F"
];

const LABEL_TO_PC: Record<Co5Label, number> = {
  C: 0, G: 7, D: 2, A: 9, E: 4, B: 11,
  "F#/Gb": 6, "Db/C#": 1, Ab: 8, Eb: 3, Bb: 10, F: 5,
};

// Musical accidentals via Unicode escapes (belt & suspenders)
const DISPLAY_NAME: Record<Co5Label, string> = {
  C: "C",
  G: "G",
  D: "D",
  A: "A",
  E: "E",
  B: "B",
  "F#/Gb": "F\u266F/G\u266D", // F♯/G♭
  "Db/C#": "D\u266D/C\u266F", // D♭/C♯
  Ab: "A\u266D",              // A♭
  Eb: "E\u266D",              // E♭
  Bb: "B\u266D",              // B♭
  F: "F",
};

const labelIndex = (lab: Co5Label) => CIRCLE.indexOf(lab);

/* =========================================
   Chord dictionary (root position, arpeggio orders)
   Root plays twice (closing root included)
   ========================================= */
type ChordType =
  | "Maj" | "min" | "dim"
  | "Maj7" | "Maj6" | "min7" | "min6" | "Dom7";

const CHORD_OFFSETS: Record<ChordType, number[]> = {
  Maj:  [0, 4, 7, 12],             // 1–3–5–1
  min:  [0, 3, 7, 12],             // 1–♭3–5–1
  dim:  [0, 3, 6, 12],             // 1–♭3–♭5–1 (triad for MVP)
  Maj7: [0, 11, 4, 7, 12],         // 1–7–3–5–1
  Maj6: [0, 4, 9, 7, 12],          // 1–3–6–5–1
  min7: [0, 10, 3, 7, 12],         // 1–♭7–♭3–5–1
  min6: [0, 3, 9, 7, 12],          // 1–♭3–6–5–1
  Dom7: [0, 4, 7, 10, 12],         // 1–3–5–♭7–1 (order adjusted by you if needed)
};

const CHORD_COLOR: Record<ChordType, string> = {
  Maj: theme.gold,
  min: theme.teal,
  dim: theme.red,
  Maj7: theme.purple,
  Maj6: theme.rose,
  min7: theme.teal,
  min6: theme.lime,
  Dom7: theme.orange,
};

const ALL_CHORD_TYPES = Object.keys(CHORD_OFFSETS) as ChordType[];
const EMPTY_TYPES: Record<ChordType, boolean> = ALL_CHORD_TYPES
  .reduce((acc, t) => ((acc[t] = false), acc), {} as Record<ChordType, boolean>);

/* =========================================
   Web Audio (sample-accurate)
   ========================================= */
let _ctx: AudioContext | null = null;
const _buffers = new Map<string, AudioBuffer>();

const NOTE_ORDER = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"] as const;
type NoteName = `${(typeof NOTE_ORDER)[number]}${number}`;

function getCtx(): AudioContext {
  if (!_ctx) {
    // @ts-ignore
    const AC = window.AudioContext || window.webkitAudioContext;
    _ctx = new AC({ latencyHint: "interactive" });
  }
  return _ctx!;
}
async function unlockAudioCtx() {
  const ctx = getCtx();
  if (ctx.state === "suspended") { try { await ctx.resume(); } catch {} }
}
function midiToNoteName(midi: number): NoteName {
  const pc = NOTE_ORDER[midi % 12];
  const oct = Math.floor(midi / 12) - 1;
  return `${pc}${oct}` as NoteName;
}
async function loadBuffer(noteName: string): Promise<AudioBuffer> {
  const key = noteName;
  if (_buffers.has(key)) return _buffers.get(key)!;
  const safe = noteName.replace("#","%23");
  const res = await fetch(`/audio/notes/${safe}.wav`);
  if (!res.ok) throw new Error(`fetch failed: ${safe}.wav`);
  const arr = await res.arrayBuffer();
  const buf = await getCtx().decodeAudioData(arr);
  _buffers.set(key, buf);
  return buf;
}
function playBufferAt(buf: AudioBuffer, when: number, dur = 0.28, gainDb = 0) {
  const ctx = getCtx();
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const g = ctx.createGain();
  const lin = Math.pow(10, gainDb / 20);
  g.gain.setValueAtTime(0, when);
  g.gain.linearRampToValueAtTime(lin, when + 0.01);
  g.gain.setTargetAtTime(0, when + dur, 0.06);
  src.connect(g).connect(ctx.destination);
  src.start(when);
  src.stop(when + dur + 0.25);
}

/* =========================================
   Geometry helpers for the Circle (SVG positions)
   ========================================= */
type Pt = { x: number; y: number };

function fmtCoord(v: number, places: number = 3): number {
  return Number(v.toFixed(places));
}

function nodePosition(index: number, radiusPct = 44): Pt {
  const angle = (index / 12) * Math.PI * 2 - Math.PI / 2;
  const r = radiusPct;
  const x = 50 + Math.cos(angle) * r;
  const y = 50 + Math.sin(angle) * r;
  return { x: fmtCoord(x), y: fmtCoord(y) };
}

// draw a simple polyline path from node indices
function pathFromNodes(indices: number[]): string {
  if (!indices.length) return "";
  const pts = indices.map(i => nodePosition(i));
  const move = `M ${pts[0].x} ${pts[0].y}`;
  const lines = pts.slice(1).map(p => `L ${p.x} ${p.y}`).join(" ");
  return `${move} ${lines}`;
}

/* =========================================
   Label placement (nudges + auto + clamping)
   ========================================= */
const LABEL_SAFE = 3.0; // clamp margin (viewBox units)

const NUDGES: Partial<Record<Co5Label, {
  dx?: number; dy?: number;
  anchor?: "start" | "middle" | "end";
  baseline?: "baseline" | "middle" | "hanging";
}>> = {
  C:       { dx: 0,    dy: -4.6, anchor: "middle", baseline: "baseline" },
  "F#/Gb": { dx: 0.5,  dy: +4.6, anchor: "middle", baseline: "hanging"  },
  Eb:      { dx: -2.6, dy: 0,    anchor: "end",    baseline: "middle"   },
  A:       { dx: +2.6, dy: 0,    anchor: "start",  baseline: "middle"   },
  B:       { dx: +2.0, dy: +4.6, anchor: "start",  baseline: "hanging"  },
  "Db/C#": { dx: -0.5, dy: +4.6, anchor: "end",    baseline: "hanging"  },
};

function clampLabelXY(x: number, y: number) {
  const min = LABEL_SAFE, max = 100 - LABEL_SAFE;
  return { x: Math.max(min, Math.min(max, x)), y: Math.max(min, Math.min(max, y)) };
}

function labelPlacement(label: Co5Label, p: Pt) {
  // manual first
  const manual = NUDGES[label];
  if (manual) {
    const xx = p.x + (manual.dx ?? 0);
    const yy = p.y + (manual.dy ?? 0);
    const c = clampLabelXY(xx, yy);
    return { x: fmtCoord(c.x), y: fmtCoord(c.y), anchor: manual.anchor ?? "middle", baseline: manual.baseline ?? "middle" };
  }

  // auto by angle (outside & quadrant anchor)
  const idx = CIRCLE.indexOf(label);
  const angle = (idx / 12) * Math.PI * 2 - Math.PI / 2;
  const RADIAL = 4.6, TANG = 0.0;
  const ux = Math.cos(angle), uy = Math.sin(angle);
  const tx = -Math.sin(angle), ty = Math.cos(angle);
  const x = p.x + RADIAL * ux + TANG * tx;
  const y = p.y + RADIAL * uy + TANG * ty;

  const ax = Math.abs(ux), ay = Math.abs(uy);
  let anchor: "start"|"middle"|"end" = "middle";
  let baseline: "baseline"|"middle"|"hanging" = "middle";
  if (ax >= ay) { anchor = ux > 0 ? "start" : "end"; baseline = "middle"; }
  else { anchor = "middle"; baseline = uy > 0 ? "hanging" : "baseline"; }

  const c = clampLabelXY(x, y);
  return { x: fmtCoord(c.x), y: fmtCoord(c.y), anchor, baseline };
}

/* =========================================
   Arpeggio plan
   ========================================= */
type ScheduledTone = { at: number; midi: number; nodeIndex: number };
const STEP_MS = 280;

function nearestMidiForPc(pc: number, low?: number, high?: number): number {
  const lowMidi = low ?? noteNameToMidi("C3");
  const highMidi = high ?? noteNameToMidi("C5");
  for (let m = lowMidi; m <= highMidi; m++) {
    if ((m % 12) === pc) return m;
  }
  return ((Math.floor(lowMidi / 12)) * 12) + pc;
}

// Convert "C#4" / "Db3" / "A3" → MIDI number (C-1 = 0)
function noteNameToMidi(n: string): number {
  const m = /^([A-Ga-g])([#b]?)(-?\d+)$/.exec(n);
  if (!m) throw new Error(`Bad note name: ${n}`);
  const letter = m[1].toUpperCase();
  const acc = m[2];
  const oct = parseInt(m[3], 10);
  const BASE_PC: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  let pc = BASE_PC[letter];
  if (acc === "#") pc = (pc + 1) % 12;
  else if (acc === "b") pc = (pc + 11) % 12;
  return (oct + 1) * 12 + pc;
}

function planChordArpeggio(
  rootLabel: Co5Label,
  type: ChordType
): { tones: ScheduledTone[]; lastAt: number } {
  const ctx = getCtx();
  const start = ctx.currentTime + 0.25;
  const offsets = CHORD_OFFSETS[type];
  const pcRoot = LABEL_TO_PC[rootLabel];
  const tones: ScheduledTone[] = [];

  offsets.forEach((semi, k) => {
    const pc = (pcRoot + (semi % 12) + 12) % 12;
    const nodeIndex = CIRCLE.findIndex(lab => LABEL_TO_PC[lab] === pc);
    const midi = nearestMidiForPc(pc);
    const at = start + (k * (STEP_MS / 1000));
    tones.push({ at, midi, nodeIndex });
  });

  const lastAt = tones.length ? tones[tones.length - 1].at : start;
  return { tones, lastAt };
}

/* =========================================
   Overlay model
   ========================================= */
type OverlayShape = {
  id: string;
  color: string;
  path: string;
  expiresAt: number;
  fill: string;
};
/* =========================================
   Page Component
   ========================================= */
export default function ChordsCirclePage() {
  /* ---------- Options ---------- */
  const [startRoot, setStartRoot] = useState<Co5Label>("C");
  const [traversal, setTraversal] = useState<"RootAllShapes" | "ShapeAcrossCircle">("RootAllShapes");
  const [enabledTypes, setEnabledTypes] = useState<Record<ChordType, boolean>>({
    Maj: true, min: true, dim: false, Maj7: false, Maj6: false, min7: false, min6: false, Dom7: false,
  });

  /* ---------- Session state ---------- */
  type PlayItem = { root: Co5Label; type: ChordType };
  const [queue, setQueue] = useState<PlayItem[]>([]);
  const [qIndex, setQIndex] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [nowPlaying, setNowPlaying] = useState("");
  const [linkCopied, setLinkCopied] = useState(false);


  const [overlays, setOverlays] = useState<OverlayShape[]>([]);
  const rafRef = useRef<number | null>(null);

  // --- Rotating title + subtitle (3 options) ---
const TITLE_OPTIONS = [
  {
    title: "Shapes of Harmony",
    subtitle: "Watch major, minor, and seventh chords sketch bright triangles and squares on the circle of fifths.",
  },
  {
    title: "Chord Constellations",
    subtitle: "Every chord becomes a shape — like stars connected in the night sky, glowing for a moment before the next appears.",
  },
  {
    title: "When Chords Draw",
    subtitle: "Arpeggiated notes leave trails on the circle. Triads make triangles, sevenths make squares — each chord paints its own geometry.",
  },
] as const;

const [titleIdx, setTitleIdx] = useState(0);

// Pick a random title AFTER mount (avoid SSR hydration mismatches)
useEffect(() => {
  setTitleIdx(Math.floor(Math.random() * TITLE_OPTIONS.length));
}, []);

  /* ---------- Live refs for timers ---------- */
  const isRunningRef = useRef(false);
  useEffect(() => { isRunningRef.current = isRunning; }, [isRunning]);

  const qIndexRef = useRef(0);
  useEffect(() => { qIndexRef.current = qIndex; }, [qIndex]);

  const queueRef = useRef<PlayItem[]>([]);
  useEffect(() => { queueRef.current = queue; }, [queue]);

  // Keep the last chord for sharing
  const lastRootRef = useRef<Co5Label | null>(null);
  const lastTypeRef = useRef<ChordType | null>(null);

  // SVG ref for PNG export
  const svgRef = useRef<SVGSVGElement | null>(null);

  // Timeout registry
  const timeoutsRef = useRef<number[]>([]);
  function addTimeout(cb: () => void, ms: number) {
    const id = window.setTimeout(cb, ms);
    timeoutsRef.current.push(id);
    return id;
  }
  function clearAllTimeouts() {
    for (const id of timeoutsRef.current) clearTimeout(id);
    timeoutsRef.current = [];
  }

  // Overlay manager (RAF sweep) — keep expired overlays out; allow at most 2
  useEffect(() => {
    if (!isRunning && overlays.length === 0) return;
    let raf = 0;
    const tick = () => {
      const now = getCtx().currentTime;
      setOverlays(prev => prev.filter(o => now < o.expiresAt).slice(-2));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => { if (raf) cancelAnimationFrame(raf); };
  }, [isRunning, overlays.length]);

  /* ---------- Build traversal queue (CW only) ---------- */
  const enabledTypesList = useMemo(
    () => (Object.keys(enabledTypes) as ChordType[]).filter(t => enabledTypes[t]),
    [enabledTypes]
  );

  const buildQueue = useCallback(() => {
    const items: PlayItem[] = [];
    if (enabledTypesList.length === 0) return items;

    const startIdx = labelIndex(startRoot);
    const nextCW = (i: number) => (i + 1) % 12;

    if (traversal === "RootAllShapes") {
      let idx = startIdx;
      for (let r = 0; r < 12; r++) {
        const root = CIRCLE[idx];
        enabledTypesList.forEach(type => items.push({ root, type }));
        idx = nextCW(idx);
      }
    } else { // ShapeAcrossCircle
      enabledTypesList.forEach(type => {
        let idx = startIdx;
        for (let r = 0; r < 12; r++) {
          const root = CIRCLE[idx];
          items.push({ root, type });
          idx = nextCW(idx);
        }
      });
    }
    return items;
  }, [startRoot, traversal, enabledTypesList]);

  /* ---------- Init from URL (shared link) ---------- */
  const searchParams = useSearchParams();
  useEffect(() => {
    if (!searchParams) return;
    const sr = searchParams.get("startRoot");
    const tr = searchParams.get("traversal");
    const types = searchParams.get("types");
    const lr = searchParams.get("lastRoot");
    const lt = searchParams.get("lastType");

    if (sr && (CIRCLE as Co5Label[]).includes(sr as Co5Label)) setStartRoot(sr as Co5Label);
    if (tr === "RootAllShapes" || tr === "ShapeAcrossCircle") setTraversal(tr);

    if (types) {
      const set: Record<ChordType, boolean> = (Object.keys(CHORD_OFFSETS) as ChordType[])
        .reduce((acc, t) => ((acc[t] = false), acc), {} as Record<ChordType, boolean>);
      types.split(",").forEach(v => {
        const t = v.trim() as ChordType;
        if (t in CHORD_OFFSETS) set[t] = true;
      });
      setEnabledTypes(set);
    }

    if (lr && lt && (CIRCLE as Co5Label[]).includes(lr as Co5Label) && lt in CHORD_OFFSETS) {
      lastRootRef.current = lr as Co5Label;
      lastTypeRef.current = lt as ChordType;
      // pre-freeze shape (no audio)
      const pcRoot = LABEL_TO_PC[lr as Co5Label];
      const offsets = CHORD_OFFSETS[lt as ChordType];
      const nodeIndices = offsets.map(semi => {
        const pc = (pcRoot + (semi % 12) + 12) % 12;
        return CIRCLE.findIndex(lab => LABEL_TO_PC[lab] === pc);
      });
      const ov: OverlayShape = {
        id: `prefrozen-${lr}-${lt}`,
        color: CHORD_COLOR[lt as ChordType],
        path: pathFromNodes(nodeIndices),
        expiresAt: Number.POSITIVE_INFINITY,
        fill: withAlpha(CHORD_COLOR[lt as ChordType], 0.18),
      };
      setOverlays([ov]);
      setNowPlaying(`${DISPLAY_NAME[lr as Co5Label]} ${lt as ChordType}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------- Share helpers & handlers ---------- */
  function buildShareUrl(): string {
    const params = new URLSearchParams();
    params.set("startRoot", startRoot);
    params.set("traversal", traversal);

    const enabled = (Object.keys(enabledTypes) as ChordType[]).filter(t => enabledTypes[t]);
    if (enabled.length) params.set("types", enabled.join(","));

    if (lastRootRef.current && lastTypeRef.current) {
      params.set("lastRoot", lastRootRef.current);
      params.set("lastType", lastTypeRef.current);
    }
    const url = new URL(window.location.href);
    url.search = params.toString();
    return url.toString();
  }

  const onCopyLink = useCallback(async () => {
  try {
    await navigator.clipboard.writeText(buildShareUrl());
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000); // hide after 2s
  } catch (e) {
    console.error("Copy link failed", e);
  }
}, [buildShareUrl]);

  const onDownloadPng = useCallback(async () => {
    try {
      const svgEl = svgRef.current;
      if (!svgEl) return;

      const svgText = new XMLSerializer().serializeToString(svgEl);
      const blob = new Blob([svgText], { type: "image/svg+xml;charset=utf-8" });
      const url = URL.createObjectURL(blob);

      const img = new Image();
      const rect = svgEl.getBoundingClientRect();
      const W = Math.max(1, Math.floor(rect.width || 360));
      const H = Math.max(1, Math.floor(rect.height || 360));
      const SCALE = 2;
      const canvas = document.createElement("canvas");
      canvas.width = W * SCALE;
      canvas.height = H * SCALE;
      const ctx2d = canvas.getContext("2d");
      if (!ctx2d) throw new Error("Canvas 2D not available");

      await new Promise<void>((res, rej) => {
        img.onload = () => {
          ctx2d.clearRect(0, 0, canvas.width, canvas.height);
          ctx2d.drawImage(img, 0, 0, canvas.width, canvas.height);
          URL.revokeObjectURL(url);
          res();
        };
        img.onerror = (e) => rej(e);
        img.src = url;
      });

      canvas.toBlob((png) => {
        if (!png) return;
        const a = document.createElement("a");
        a.href = URL.createObjectURL(png);
        const lr = lastRootRef.current ?? startRoot;
        const lt = lastTypeRef.current ?? "Maj";
        a.download = `pianotrainer-chord-${DISPLAY_NAME[lr]}-${lt}.png`;
        document.body.appendChild(a);
        a.click();
        a.remove();
      }, "image/png");
    } catch (e) {
      console.error("PNG export failed", e);
    }
  }, [startRoot]);

  /* ---------- Start / Stop ---------- */
  const start = useCallback(async () => {
    clearAllTimeouts();
    // Rotate poster title/subtitle on every Start
setTitleIdx((i) => (i + 1) % TITLE_OPTIONS.length);
    await unlockAudioCtx();
    const q = buildQueue();
    setQueue(q);
    queueRef.current = q;
    setQIndex(0);
    setIsRunning(true);
    setOverlays([]);     // clear any frozen shape
    setNowPlaying("");
    if (q.length) await playOne(q[0]);
  }, [buildQueue]);

  const stop = useCallback(() => {
    clearAllTimeouts();
    setIsRunning(false);
    setQueue([]);
    setQIndex(0);
    setNowPlaying("");
    // let any in-flight arpeggio die out naturally
  }, []);

  /* ---------- Core: play one (progressive segments + block chord + keep last) ---------- */
  const playOne = useCallback(async (item: PlayItem) => {
    const { root, type } = item;

    // plan & audio
    const plan = planChordArpeggio(root, type);
    const tones = plan.tones;
    const nodeSeq = tones.map(t => t.nodeIndex);
    const lastAt = plan.lastAt;
    const ctx = getCtx();

    const bufs = await Promise.all(tones.map(t => loadBuffer(midiToNoteName(t.midi))));
    tones.forEach((t, i) => { playBufferAt(bufs[i], t.at, 0.28, 0); });

    setNowPlaying(`${DISPLAY_NAME[root]} ${type}`);

    // progressive overlay
    const overlayId = `${DISPLAY_NAME[root]}-${type}-${Date.now()}`;
    for (let k = 1; k < tones.length; k++) {
      const when = tones[k].at;
      const delayMs = Math.max(0, (when - getCtx().currentTime) * 1000);
      const partialNodes = nodeSeq.slice(0, k + 1);

      addTimeout(() => {
        if (!isRunningRef.current) return;
        setOverlays(prev => {
          const existing = prev.find(o => o.id === overlayId);
          const path = pathFromNodes(partialNodes);
          if (existing) return prev.map(o => o.id === overlayId ? { ...o, path } : o);
          const ov: OverlayShape = {
            id: overlayId,
            color: CHORD_COLOR[type],
            path,
            expiresAt: lastAt + 2.0,
            fill: withAlpha(CHORD_COLOR[type], 0.18),
          };
          return [...prev, ov].slice(-2);
        });
      }, delayMs);
    }

    // block chord (1.2s)
    const CHORD_HOLD_MS = 1200;
    const chordAt = lastAt + 0.05;
    const chordMidis = Array.from(new Set(tones.slice(0, Math.max(0, tones.length - 1)).map(t => t.midi)));
    const chordBufs = await Promise.all(chordMidis.map(m => loadBuffer(midiToNoteName(m))));
    chordBufs.forEach(buf => {
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0, chordAt);
      gain.gain.linearRampToValueAtTime(1.0, chordAt + 0.01);
      gain.gain.setTargetAtTime(0, chordAt + CHORD_HOLD_MS / 1000, 0.08);
      src.connect(gain).connect(ctx.destination);
      src.start(chordAt);
      src.stop(chordAt + CHORD_HOLD_MS / 1000 + 0.25);
    });

  
// 4) Next or finish (freeze last shape robustly)
const totalDelayMs = Math.max(0, (lastAt - getCtx().currentTime) * 1000) + 2000 + 40;
addTimeout(async () => {
  if (!isRunningRef.current) return;

  // remember last chord for sharing (for URL & PNG name)
  lastRootRef.current = root;
  lastTypeRef.current = type;

  const next = qIndexRef.current + 1;
  const currentQueue = queueRef.current;

  if (next < currentQueue.length) {
    // crisp transition: remove current overlay then continue
    setOverlays(prev => prev.filter(o => o.id !== overlayId));
    setQIndex(next);
    await playOne(currentQueue[next]);
  } else {
    // END OF SESSION:
    // If overlay still exists → freeze it (expiresAt = Infinity).
    // If it was already swept → recreate it from the full nodeSeq and freeze.
    setOverlays(prev => {
      const existing = prev.find(o => o.id === overlayId);
      if (existing) {
        return prev.map(o => o.id === overlayId ? { ...o, expiresAt: Number.POSITIVE_INFINITY } : o);
      }
      // Recreate path from the full node sequence (triangle/polygon)
      const path = pathFromNodes(nodeSeq);
      const ov: OverlayShape = {
        id: overlayId,
        color: CHORD_COLOR[type],
        path,
        expiresAt: Number.POSITIVE_INFINITY,
        fill: withAlpha(CHORD_COLOR[type], 0.18),
      };
      return [...prev, ov].slice(-2);
    });

    setIsRunning(false);
    setNowPlaying(`${DISPLAY_NAME[root]} ${type}`);
  }
}, totalDelayMs);
   
  }, [isRunning, qIndex]);

  /* ---------- Clear All chord types ---------- */
  const clearAllChordTypes = useCallback(() => {
    setEnabledTypes(() => ({ ...EMPTY_TYPES }));
  }, []);

  /* ---------- Render ---------- */
  const svgSize = 360;
  return (
    <div style={{ minHeight: "100vh", background: theme.bg, color: theme.text, overflowX: "hidden" }}>
      <main style={{ width: "100%", margin: "0 auto", padding: 12, boxSizing: "border-box", maxWidth: 520 }}>
        <style>{`
          @media (min-width: 768px) { main { max-width: 680px !important; } }
          @media (min-width: 1024px){ main { max-width: 760px !important; } }
        `}</style>

        {/* Header */}
        <header
  style={{
    textAlign: "center",
    margin: "6px 0 16px",
  }}
>
  <h1
    style={{
      margin: 0,
      fontSize: 28,
      lineHeight: 1.2,
      letterSpacing: 0.2,
      color: theme.text,
    }}
  >
    {TITLE_OPTIONS[titleIdx].title}
  </h1>
  <p
    style={{
      margin: "6px auto 0",
      maxWidth: 720,
      color: theme.muted,
      fontSize: 15,
      lineHeight: 1.35,
    }}
  >
    {TITLE_OPTIONS[titleIdx].subtitle}
  </p>
</header>

        {/* Options card */}
        <section
          style={{
            background: theme.card,
            border: `1px solid ${theme.border}`,
            borderRadius: 16,
            padding: 12,
            marginBottom: 12,
          }}
        >
          {/* Chord types */}
<div style={{ marginBottom: 12 }}>
  {/* make native checkbox ticks gold */}
  <style>{`
    .gold-ticks input[type="checkbox"] {
      accent-color: ${theme.gold};
    }
  `}</style>

  <div className="gold-ticks" style={{ display: "grid", gap: 8, gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
    {(Object.keys(CHORD_OFFSETS) as ChordType[]).map((t) => (
      <label key={t} style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <input
          type="checkbox"
          checked={enabledTypes[t]}
          onChange={(e) => setEnabledTypes((prev) => ({ ...prev, [t]: e.target.checked }))}
        />
        <span style={{ color: theme.text, fontWeight: 700 }}>{t}</span>
      </label>
    ))}
  </div>
            <div style={{ marginTop: 8 }}>
              <button
                onClick={clearAllChordTypes}
                style={{
                  background: "transparent",
                  color: theme.text,
                  border: `1px solid ${theme.border}`,
                  borderRadius: 999,
                  padding: "6px 10px",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
                title="Clear all chord type selections"
              >
                Clear all
              </button>
            </div>
          </div>

          {/* Traversal */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ color: theme.muted, fontSize: 13, marginBottom: 6 }}>Traversal</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {[
                { key: "RootAllShapes", label: "All shapes of each root" },
                { key: "ShapeAcrossCircle", label: "Same shape through circle" },
              ].map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => setTraversal(opt.key as "RootAllShapes" | "ShapeAcrossCircle")}
                  style={{
                    background: traversal === opt.key ? theme.blue : "#0F1821",
                    color: traversal === opt.key ? "#081019" : theme.text,
                    border: `1px solid ${theme.border}`,
                    borderRadius: 999,
                    padding: "6px 10px",
                    fontWeight: 700,
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Start root */}
          <div>
            <div style={{ color: theme.muted, fontSize: 13, marginBottom: 6 }}>Start root</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {CIRCLE.map((lab) => (
                <button
                  key={lab}
                  onClick={() => setStartRoot(lab)}
                  style={{
                    background: startRoot === lab ? theme.blue : "#0F1821",
                    color: startRoot === lab ? "#081019" : theme.text,
                    border: `1px solid ${theme.border}`,
                    borderRadius: 999,
                    padding: "6px 10px",
                    fontWeight: 700,
                  }}
                >
                  {DISPLAY_NAME[lab]}
                </button>
              ))}
            </div>
          </div>

          {/* Start / Stop + status */}
          <div style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 14 }}>
            {!isRunning ? (
              <button
                onClick={start}
                style={{
                  background: theme.gold,
                  color: "#081019",
                  border: "none",
                  borderRadius: 999,
                  padding: "10px 16px",
                  fontWeight: 700,
                  cursor: "pointer",
                  fontSize: 16,
                }}
              >
                ▶ Start
              </button>
            ) : (
              <button
                onClick={stop}
                style={{
                  background: "transparent",
                  color: theme.text,
                  border: `1px solid ${theme.border}`,
                  borderRadius: 999,
                  padding: "10px 16px",
                  fontWeight: 700,
                  cursor: "pointer",
                  fontSize: 16,
                }}
              >
                ⏹ Stop
              </button>
            )}

            <div
              style={{
                fontSize: 18,
                fontWeight: 700,
                color: isRunning ? theme.gold : theme.muted,
                minHeight: 24,
              }}
            >
              {nowPlaying || "Ready"}
            </div>
          </div>
        </section>

        {/* Circle of Fifths SVG with overlays */}
        <section
          style={{
            background: theme.card,
            border: `1px solid ${theme.border}`,
            borderRadius: 16,
            padding: 12,
            marginBottom: 12,
          }}
        >
          <div style={{ display: "grid", justifyContent: "center" }}>
            {/* SVG */}
            <svg
              ref={svgRef}
              viewBox="0 0 100 100"
              width={svgSize}
              height={svgSize}
              style={{ overflow: "visible" }}
            >
              {/* circle ring */}
              <circle cx="50" cy="50" r="44" stroke={withAlpha(theme.text, 0.15)} strokeWidth="2" fill="none" />

              {/* nodes + labels */}
              {CIRCLE.map((lab, i) => {
                const p = nodePosition(i);
                const lp = labelPlacement(lab, p);
                return (
                  <g key={lab}>
                    <circle cx={p.x} cy={p.y} r="1.6" fill={withAlpha(theme.text, 0.5)} />
                    <text
                      x={lp.x}
                      y={lp.y}
                      textAnchor={lp.anchor}
                      dominantBaseline={lp.baseline}
                      fontSize="4"
                      fill={theme.text}
                      style={{
                        userSelect: "none",
                        pointerEvents: "none",
                        fontFamily:
                          'Inter, "Noto Sans Symbols 2", "Segoe UI Symbol", "Apple Symbols", "Noto Sans", Arial, sans-serif',
                      }}
                    >
                      {DISPLAY_NAME[lab]}
                    </text>
                  </g>
                );
              })}

              {/* overlays */}
              {overlays.map((ov) => (
                <g key={ov.id}>
                  <path d={ov.path} fill={ov.fill} stroke={ov.color} strokeWidth="0.9" />
                </g>
              ))}
            </svg>

            {/* Share controls (outside the SVG) */}
            <div
  suppressHydrationWarning
  style={{
    marginTop: 10,
    display: "flex",
    gap: 10,
    justifyContent: "center",
    flexWrap: "wrap",
    alignItems: "center",
  }}
>
  {/* Copy Link highlighted as primary */}
  <button
    onClick={onCopyLink}
    style={{
      background: "transparent",
  color: theme.gold,
  border: "none",
      borderRadius: 999,
      padding: "8px 14px",
      fontWeight: 700,
      cursor: "pointer",
    }}
  >
    🔗 Share Link
  </button>

  {/* Confirmation text (2s) */}
  {linkCopied && (
    <span
      role="status"
      aria-live="polite"
      style={{ color: theme.green, fontSize: 13, fontWeight: 600 }}
    >
      Link copied!
    </span>
  )}


</div>
          </div>
        </section>
      </main>
    </div>
  );
}