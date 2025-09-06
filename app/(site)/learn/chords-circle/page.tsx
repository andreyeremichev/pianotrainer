"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";

/* =========================================
   Theme (reuse Degrees/Intervals palette)
   ========================================= */
const theme = {
  bg: "#0B0F14",
  card: "#111820",
  border: "#1E2935",
  text: "#E6EBF2",
  muted: "#8B94A7",
  blue: "#6FA8FF",
  gold: "#F4C95D",
  green: "#69D58C",
  red: "#FF6B6B",
  purple: "#A78BFA",
  orange: "#FFA94D",
  teal: "#3BC9DB",
  rose: "#F06595",
  lime: "#94D82D",
};

// --- DEBUG LOGGER ---
const DBG = true; // flip to false to silence
function dbg(tag: string, data?: any) {
  if (!DBG) return;
  const t = performance.now().toFixed(1);
  if (data !== undefined) {
    console.log(`[Co5 ${t}ms] ${tag}`, data);
  } else {
    console.log(`[Co5 ${t}ms] ${tag}`);
  }
}

const withAlpha = (hex: string, a: number) => {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
};

/* =========================================
   Circle of Fifths model (labels & PCs)
   Combined nodes: F#/Gb, Db/C#
   Enharmonics policy: sharp side uses sharps; flat side uses flats.
   Order: C, G, D, A, E, B, F#/Gb, Db/C#, Ab, Eb, Bb, F
   ========================================= */
type Co5Label =
  | "C" | "G" | "D" | "A" | "E" | "B"
  | "F#/Gb" | "Db/C#" | "Ab" | "Eb" | "Bb" | "F";

const CIRCLE: Co5Label[] = [
  "C","G","D","A","E","B","F#/Gb","Db/C#","Ab","Eb","Bb","F"
];

// Pitch class mapping (0..11)
const LABEL_TO_PC: Record<Co5Label, number> = {
  C: 0, G: 7, D: 2, A: 9, E: 4, B: 11,
  "F#/Gb": 6, "Db/C#": 1, Ab: 8, Eb: 3, Bb: 10, F: 5,
};

// Preferred rendering for labels (with musical accidentals via Unicode escapes)
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

// Utility: find index by label
const labelIndex = (lab: Co5Label) => CIRCLE.indexOf(lab);

/* =========================================
   Chord dictionary (root position, arpeggio orders)
   Root plays twice: start & end
   Types: Major, minor, diminished, Maj7, Maj6, min7, min6, Dom7
   Semitone offsets relative to root
   ========================================= */
type ChordType =
  | "Maj" | "min" | "dim"
  | "Maj7" | "Maj6" | "min7" | "min6" | "Dom7";

const CHORD_OFFSETS: Record<ChordType, number[]> = {
  Maj:  [0, 4, 7, 12],             // 1–3–5–1
  min:  [0, 3, 7, 12],             // 1–♭3–5–1
  dim:  [0, 3, 6, 12],             // 1–♭3–♭5–1 (MVP dim triad)
  Maj7: [0, 11, 4, 7, 12],         // 1–7–3–5–1
  Maj6: [0, 4, 9, 7, 12],          // 1–3–6–5–1
  min7: [0, 10, 3, 7, 12],         // 1–♭7–♭3–5–1
  min6: [0, 3, 9, 7, 12],          // 1–♭3–6–5–1 (confirmed)
  Dom7: [0, 10, 4, 7, 12],         // 1–♭7-3–5–1
};
// All chord type keys + an "all false" template for quick resets
const ALL_CHORD_TYPES = Object.keys(CHORD_OFFSETS) as ChordType[];
const EMPTY_TYPES: Record<ChordType, boolean> = ALL_CHORD_TYPES
  .reduce((acc, t) => ((acc[t] = false), acc), {} as Record<ChordType, boolean>);

// Color per chord type (for lines/fill)
const CHORD_COLOR: Record<ChordType, string> = {
  Maj: theme.blue,
  min: theme.green,
  dim: theme.red,
  Maj7: theme.gold,
  Maj6: theme.rose,
  min7: theme.teal,
  min6: theme.lime,
  Dom7: theme.orange,
};
// Fixed arpeggio step for chords learning mode
const STEP_MS = 280; // was user-controlled; now fixed

/* =========================================
   Web Audio (sample-accurate) — same pattern as Intervals
   ========================================= */
let _ctx: AudioContext | null = null;
const _buffers = new Map<string, AudioBuffer>();

// NoteName helpers (12-TET names for buffers)
const NOTE_ORDER = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"] as const;
type NoteName = `${(typeof NOTE_ORDER)[number]}${number}`;
// Convert "C#4" / "Db3" / "A3" → MIDI number (C-1 = 0)
function noteNameToMidi(n: string): number {
  const m = /^([A-Ga-g])([#b]?)(-?\d+)$/.exec(n);
  if (!m) throw new Error(`Bad note name: ${n}`);
  const letter = m[1].toUpperCase();
  const acc = m[2];
  const oct = parseInt(m[3], 10);

  // base pitch classes for natural letters
  const BASE_PC: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  let pc = BASE_PC[letter];
  if (acc === "#") pc = (pc + 1) % 12;
  else if (acc === "b") pc = (pc + 11) % 12; // -1 mod 12

  // MIDI formula: C-1 = 0 → midi = (oct + 1) * 12 + pc
  return (oct + 1) * 12 + pc;
}


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
  const arr = await res.arrayBuffer();
  const buf = await getCtx().decodeAudioData(arr);
  _buffers.set(key, buf);
  return buf;
}
function playBufferAt(buf: AudioBuffer, when: number, dur = 0.28, gainDb = 0) {
    dbg("schedule note", { when: when.toFixed(3), dur, gainDb });
  const ctx = getCtx();
  const src = ctx.createBufferSource(); src.buffer = buf;
  const g = ctx.createGain();
  const lin = Math.pow(10, gainDb/20);
  g.gain.setValueAtTime(0, when);
  g.gain.linearRampToValueAtTime(lin, when + 0.01);
  g.gain.setTargetAtTime(0, when + dur, 0.05);
  src.connect(g).connect(ctx.destination);
  src.start(when);
  src.stop(when + dur + 0.2);
}

/* =========================================
   Geometry helpers for the Circle (SVG positions)
   ========================================= */
   // Keep label coords inside the 0..100 viewBox (prevents clipping on narrow screens)
const LABEL_SAFE = 2.2; // margin in viewBox units; tweak 2.0–2.8 if needed
function clampLabelXY(x: number, y: number) {
  const min = LABEL_SAFE, max = 100 - LABEL_SAFE;
  const cx = Math.max(min, Math.min(max, x));
  const cy = Math.max(min, Math.min(max, y));
  return { x: cx, y: cy };
}
type Pt = { x: number; y: number };

function nodePosition(index: number, radiusPct = 44): Pt {
  const angle = (index / 12) * Math.PI * 2 - Math.PI / 2;
  const r = radiusPct; // percent of box
  const x = 50 + Math.cos(angle) * r;
  const y = 50 + Math.sin(angle) * r;
  return { x: fmtCoord(x), y: fmtCoord(y) };
}
// Round coordinates so SSR & client render identical values
function fmtCoord(v: number, places: number = 3): number {
  // return as Number to avoid "string" vs number diffs in React props,
  // but with identical rounding on both server and client
  return Number(v.toFixed(places));
}
// Label placement: put text just outside its node, with a few manual nudges
// Keep your "ideal five" frozen; add/edit others whenever you want.
const NUDGES: Partial<Record<Co5Label, {
  dx?: number; dy?: number;
  anchor?: "start" | "middle" | "end";
  baseline?: "baseline" | "middle" | "hanging";
}>> = {
  // ----- Your ideal five (as-is) -----
  C:       { dx: 0,    dy: -4.6, anchor: "middle", baseline: "baseline" }, // TOP
  "F#/Gb": { dx: 0,    dy: +4.6, anchor: "middle", baseline: "hanging"  }, // BOTTOM
  Eb:      { dx: -2.6, dy: 0,    anchor: "end",    baseline: "middle"   }, // LEFT
  A:       { dx: +2.6, dy: 0,    anchor: "start",  baseline: "middle"   }, // RIGHT
  B:       { dx: +2.0, dy: +4.6, anchor: "start",  baseline: "hanging"  }, // bottom + slight right

  // ----- (Optional) starter guesses for others; feel free to tweak/remove -----
  // G:    { dx: +3.5, dy: -2.0, anchor: "start", baseline: "middle" },
  // D:    { dx: +3.5, dy: 0.0,  anchor: "start", baseline: "middle" },
  // Ab:   { dx: -3.5, dy: 0.0,  anchor: "end",   baseline: "middle" },
  // Bb:   { dx: -3.5, dy: 0.0,  anchor: "end",   baseline: "middle" },
  // F:    { dx: -3.5, dy: -2.0, anchor: "end",   baseline: "middle" },
  // "Db/C#": { dx: -2.0, dy: +4.6, anchor: "end", baseline: "hanging" },
};

// Automatic outside placement for labels without a manual nudge.
// Uses node angle to choose side (right/left/top/bottom) + radial offset.
function autoPlacement(index: number, p: { x: number; y: number }) {
  // Angle (0 at top, clockwise), same convention as nodePosition
  const angle = (index / 12) * Math.PI * 2 - Math.PI / 2;

  // How far outside the dot to place the label
  const RADIAL = 4.6;     // outward (matches your C/F#/Gb top/bottom offset)
  const TANG   = 0.0;     // keep 0 for now; raise a bit if you want a tangential bias

  // Unit vectors
  const ux = Math.cos(angle), uy = Math.sin(angle);
  const tx = -Math.sin(angle), ty = Math.cos(angle); // tangential (ccw)

  const x = p.x + RADIAL * ux + TANG * tx;
  const y = p.y + RADIAL * uy + TANG * ty;
  

  // Anchor/baseline by quadrant so text sits outside the dot
const ax = Math.abs(ux), ay = Math.abs(uy);
let anchor: "start" | "middle" | "end" = "middle";
let baseline: "baseline" | "middle" | "hanging" = "middle";

if (ax >= ay) {
  // right/left dominates
  anchor   = ux > 0 ? "start" : "end";
  baseline = "middle";
} else {
  // top/bottom dominates
  anchor   = "middle";
  baseline = uy > 0 ? "hanging" : "baseline";
}

// Clamp label coords inside the 0..100 viewBox (avoid clipping on small screens)
const SAFE = 3.3; // margin in viewBox units; tweak 2.0–2.8 if needed
const min = SAFE, max = 100 - SAFE;
const cx = Math.max(min, Math.min(max, x));
const cy = Math.max(min, Math.min(max, y));

return {
  x: fmtCoord(cx),
  y: fmtCoord(cy),
  anchor,
  baseline,
};
}

// Label placement: use manual overrides first; otherwise auto-place outside the ring.
function labelPlacement(label: Co5Label, p: { x: number; y: number }) {
  const idx = CIRCLE.indexOf(label);
  const manual = NUDGES[label];  
  if (manual) {
    const xx = p.x + (manual.dx ?? 0);
    const yy = p.y + (manual.dy ?? 0);
    const clamped = clampLabelXY(xx, yy);              // <-- clamp here
    return {
      x: clamped.x,
      y: clamped.y,
      anchor: manual.anchor ?? "middle",
      baseline: manual.baseline ?? "middle",
    };
  }
  return autoPlacement(idx, p);
}


// Polyline builder for overlay stroke
function pathFromNodes(indices: number[]): string {
  if (!indices.length) return "";
  const pts = indices.map(i => nodePosition(i));
  const move = `M ${pts[0].x} ${pts[0].y}`;
  const lines = pts.slice(1).map(p => `L ${p.x} ${p.y}`).join(" ");
  return `${move} ${lines}`;
}

/* =========================================
   Arpeggio planner & visual overlay scheduler
   ========================================= */
type ScheduledTone = { at: number; midi: number; nodeIndex: number };

function nearestMidiForPc(pc: number, low?: number, high?: number): number {
  const lowMidi = low ?? noteNameToMidi("C3");
  const highMidi = high ?? noteNameToMidi("C5");
  for (let m = lowMidi; m <= highMidi; m++) {
    if ((m % 12) === pc) return m;
  }
  // fallback wrap near the low bound
  return ((Math.floor(lowMidi / 12)) * 12) + pc;
}


function planChordArpeggio(
  rootLabel: Co5Label,
  type: ChordType
): { tones: ScheduledTone[]; lastAt: number; nodeIndices: number[]; color: string } {
  const ctx = getCtx();
  const start = ctx.currentTime + 0.25;
  const pcRoot = LABEL_TO_PC[rootLabel];

  const offsets = CHORD_OFFSETS[type]; // includes closing +12 at end
  const nodeIndices: number[] = [];
  const tones: ScheduledTone[] = [];

  // Map each offset to node index on circle
  offsets.forEach((semi, k) => {
    const pc = (pcRoot + (semi % 12) + 12) % 12;
    // find circle index whose PC matches
    const idx = CIRCLE.findIndex(lab => LABEL_TO_PC[lab] === pc);
    nodeIndices.push(idx);
    const midi = nearestMidiForPc(pc); // keep within C3..C5
    const at = start + (k * (STEP_MS / 1000));
    tones.push({ at, midi, nodeIndex: idx });
  });

  const lastAt = tones.length ? tones[tones.length - 1].at : start;
  return { tones, lastAt, nodeIndices, color: CHORD_COLOR[type] };
}

/* =========================================
   Overlay manager (polylines that persist 2s)
   ========================================= */
type OverlayShape = {
  id: string;
  color: string;
  path: string;
  expiresAt: number;
  fill: string;
};

function makeOverlay(id: string, color: string, nodeIndices: number[], lastAt: number): OverlayShape {
  const path = pathFromNodes(nodeIndices);
  return {
    id,
    color,
    path,
    expiresAt: lastAt + 2.0, // 2 seconds after last arpeggio note
    fill: withAlpha(color, 0.18),
  };
}

/* =========================================
   Page Component
   ========================================= */
export default function ChordsCirclePage() {
  /* ---------- Options ---------- */
  const [startRoot, setStartRoot] = useState<Co5Label>("C");
  const [traversal, setTraversal] = useState<"RootAllShapes" | "ShapeAcrossCircle">("RootAllShapes");
const clearAllChordTypes = useCallback(() => {
  // create a new object so React sees a state change
  setEnabledTypes(() => ({ ...EMPTY_TYPES }));
}, []);
  
  const [enabledTypes, setEnabledTypes] = useState<Record<ChordType, boolean>>({
    Maj: true, min: true, dim: true, Maj7: true, Maj6: true, min7: true, min6: true, Dom7: true,
  });

  /* ---------- Session state ---------- */
  type PlayItem = { root: Co5Label; type: ChordType };
  const [queue, setQueue] = useState<PlayItem[]>([]);
  const [qIndex, setQIndex] = useState<number>(0);
  const [isRunning, setIsRunning] = useState(false);

  // overlays (at most 2 active)
  const [overlays, setOverlays] = useState<OverlayShape[]>([]);
  const rafRef = useRef<number | null>(null);

  // small status: which chord is sounding
  const [nowPlaying, setNowPlaying] = useState<string>("");

  // Keep the live queue available to timeouts/async code
const isRunningRef = useRef(false);
useEffect(() => { isRunningRef.current = isRunning; }, [isRunning]);

const qIndexRef = useRef(0);
useEffect(() => { qIndexRef.current = qIndex; }, [qIndex]);

const queueRef = useRef<PlayItem[]>([]);
useEffect(() => { queueRef.current = queue; }, [queue]);

// Track all timeout IDs so we can clear them on Stop/Start
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


  /* ---------- Build traversal queue ---------- */
  const enabledTypesList = useMemo(
    () => (Object.keys(enabledTypes) as ChordType[]).filter(t => enabledTypes[t]),
    [enabledTypes]
  );

  // Utility: next index CW/CCW with wrap
  const nextIndex = useCallback((i: number, dir: "CW" | "CCW") => {
    if (dir === "CW") return (i + 1) % 12;
    if (dir === "CCW") return (i + 11) % 12;
    return i;
  }, []);

  const buildQueue = useCallback(() => {
  const items: PlayItem[] = [];
  if (enabledTypesList.length === 0) return items;

  const startIdx = labelIndex(startRoot);
  const dir: "CW" = "CW"; // fixed traversal
  const nextIndex = (i: number) => (i + 1) % 12;

  if (traversal === "RootAllShapes") {
    // For each root around circle → all enabled shapes (in enabledTypesList order)
    let idx = startIdx;
    for (let r = 0; r < 12; r++) {
      const root = CIRCLE[idx];
      enabledTypesList.forEach(type => items.push({ root, type }));
      idx = nextIndex(idx);
    }
  } else {
    // ShapeAcrossCircle: for each enabled shape → traverse all roots
    enabledTypesList.forEach(type => {
      let idx = startIdx;
      for (let r = 0; r < 12; r++) {
        const root = CIRCLE[idx];
        items.push({ root, type });
        idx = nextIndex(idx);
      }
    });
  }

  return items;
}, [startRoot, traversal, enabledTypesList]);

  /* ---------- Overlay manager (cleanup loop) ---------- */
useEffect(() => {
  if (!isRunning && overlays.length === 0) return;

  let rafId = 0;
  const tick = () => {
    const now = getCtx().currentTime; // <-- no captured ctx
    setOverlays(prev => prev.filter(o => now < o.expiresAt).slice(-2));
    rafId = requestAnimationFrame(tick);
  };

  rafId = requestAnimationFrame(tick);
  return () => {
    if (rafId) cancelAnimationFrame(rafId);
  };
}, [isRunning, overlays.length]);

  /* ---------- Start / Stop ---------- */
  const start = useCallback(async () => {
    clearAllTimeouts(); // cancel leftover timers
    await unlockAudioCtx();
    const q = buildQueue();
    setQueue(q);
    queueRef.current = q; // <-- keep ref in sync immediately
    setQIndex(0);
    setIsRunning(true);
    setOverlays([]);
    setNowPlaying("");
     if (q.length) {
    dbg("playOne first", q[0]);
    await playOne(q[0]);
  } else {
    dbg("queue EMPTY");
  }
  }, [buildQueue]);

  const stop = useCallback(() => {
  clearAllTimeouts(); // cancel leftover timers
  dbg("STOP: pressed");
  setIsRunning(false);
  setQueue([]);
  setQIndex(0);
  setNowPlaying("");
  setOverlays([]);
}, []);


/* ---------- Core: play one chord item (progressive segments + block chord) ---------- */
const playOne = useCallback(async (item: PlayItem) => {
  const { root, type } = item;

  // 1) Plan arpeggio (absolute times & node indices)
  const plan  = planChordArpeggio(root, type);         // uses fixed STEP_MS internally
  const tones = plan.tones;                             // [{ at, midi, nodeIndex }, ...] (includes closing root)
  const nodeSeq = tones.map(t => t.nodeIndex);         // arpeggio order for drawing
  const lastAt  = plan.lastAt;
  const ctx     = getCtx();

  // 2) Schedule arpeggio audio
  const bufs = await Promise.all(tones.map(t => loadBuffer(midiToNoteName(t.midi))));
  tones.forEach((t, i) => { playBufferAt(bufs[i], t.at, 0.28, 0); });

  // Status
  setNowPlaying(`${DISPLAY_NAME[root]} ${type}`);

  // 3) Progressive overlay: update (or create) as each note lands
  //    - first segment appears at note #2 (k=1), then k=2, ... up to the closing root
  //    - overlay persists until next chord (expiresAt = lastAt + 2s)
  const overlayId = `${DISPLAY_NAME[root]}-${type}-${Date.now()}`;
  for (let k = 1; k < tones.length; k++) {
    const when = tones[k].at;
    const delayMs = Math.max(0, (when - getCtx().currentTime) * 1000);
    const partialNodes = nodeSeq.slice(0, k + 1); // up to current note (builds line-by-line)

    addTimeout(() => {
      if (!isRunningRef.current) return;

      setOverlays(prev => {
        const existing = prev.find(o => o.id === overlayId);
        const path = pathFromNodes(partialNodes);

        if (existing) {
          // update path (keep color/fill/expiresAt)
          return prev.map(o => o.id === overlayId ? { ...o, path } : o);
        } else {
          // first segment: create overlay that will live ~2s after last note
          const ov: OverlayShape = {
            id: overlayId,
            color: CHORD_COLOR[type],
            path,
            expiresAt: lastAt + 2.0,                 // hold until next chord begins
            fill: withAlpha(CHORD_COLOR[type], 0.18) // same fill as before
          };
          return [...prev, ov].slice(-2);            // keep at most 2 shapes (newest on top)
        }
      });
    }, delayMs);
  }

  // 4) Block chord (sustained): play all chord members together after arpeggio completes
  //    - schedule at a short offset after the last arpeggio note so it sits inside the 2s hold
  const CHORD_HOLD_MS = 1200;                         // ~1.2s sustain fits inside your ~2s hold
  const chordAt = lastAt + 0.05;                      // small offset after closing root
  // Gather unique chord member MIDIs (exclude the duplicated closing root)
  const chordMidis = Array.from(new Set(tones.slice(0, Math.max(0, tones.length - 1)).map(t => t.midi)));
  // Preload chord buffers (will hit cache if already loaded above)
  const chordBufs = await Promise.all(chordMidis.map(m => loadBuffer(midiToNoteName(m))));

  // Schedule block chord with a simple envelope (short attack + short release)
  chordBufs.forEach(buf => {
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const gain = ctx.createGain();
    const attack = 0.01;                              // 10ms attack
    const hold   = CHORD_HOLD_MS / 1000;              // sustain
    const releaseTau = 0.08;                          // ~80ms release time constant

    gain.gain.setValueAtTime(0, chordAt);
    gain.gain.linearRampToValueAtTime(1.0, chordAt + attack);
    gain.gain.setTargetAtTime(0, chordAt + hold, releaseTau);

    src.connect(gain).connect(ctx.destination);
    src.start(chordAt);
    src.stop(chordAt + hold + 0.25);                  // stop after release
  });

  // 5) Chain next chord after 2s hold (and clear this overlay for a crisp transition)
  const totalDelayMs = Math.max(0, (lastAt - getCtx().currentTime) * 1000) + 2000 + 40;
  addTimeout(async () => {
    if (!isRunningRef.current) return;

    // Remove this chord's overlay (RAF cleaner would also expire it)
    setOverlays(prev => prev.filter(o => o.id !== overlayId));

    const next = qIndexRef.current + 1;
    const currentQueue = queueRef.current;
    if (next < currentQueue.length) {
      setQIndex(next);
      await playOne(currentQueue[next]);
    } else {
      setIsRunning(false);
      setNowPlaying("");
    }
  }, totalDelayMs);
}, [isRunning, qIndex]);


    /* ---------- Render ---------- */
  const svgSize = 360; // mobile-first

  return (
    <div style={{ minHeight: "100vh", background: theme.bg, color: theme.text, overflowX: "hidden" }}>
      <main style={{ width: "100%", margin: "0 auto", padding: 12, boxSizing: "border-box", maxWidth: 520 }}>
        <style>{`
          @media (min-width: 768px) { main { max-width: 680px !important; } }
          @media (min-width: 1024px){ main { max-width: 760px !important; } }
        `}</style>

        {/* Header */}
        <header style={{ display: "flex", alignItems: "baseline", gap: 12, margin: "6px 0 14px" }}>
          <h1 style={{ margin: 0, fontSize: 26 }}>Circle of Fifths — Chords</h1>
          <Link href="/" style={{ color: theme.blue, fontSize: 15 }}>Home</Link>
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
            <div style={{ color: theme.muted, fontSize: 13, marginBottom: 6 }}>Chord types</div>
            <div style={{ display: "grid", gap: 8, gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
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
          {/* Traversal */}
<div style={{ marginBottom: 12 }}>
  <div style={{ color: theme.muted, fontSize: 13, marginBottom: 6 }}>Traversal</div>
  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
    {[
      { key: "RootAllShapes",    label: "All shapes of each root" },
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

          {/* Start root + direction */}
         
          <div style={{ display: "grid", gap: 10, gridTemplateColumns: "1fr" }}>
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

            
          </div>
        </section>

        {/* Start / Stop controls + status */}
<div style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 14 }}>
  {!isRunning ? (
    <button
      onClick={start}
      style={{
        background: theme.blue,
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
      fontSize: 18,         // larger text
      fontWeight: 700,      // bold
      color: isRunning ? theme.gold : theme.muted,
      minHeight: 24,
    }}
  >
    {nowPlaying || "Ready"}
  </div>
</div>

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
            <svg viewBox="0 0 100 100" width={svgSize} height={svgSize} style={{ overflow: "visible" }}>
              {/* circle ring */}
              <circle cx="50" cy="50" r="44" stroke={withAlpha(theme.text, 0.15)} strokeWidth="2" fill="none" />

{/* nodes + labels */}
{CIRCLE.map((lab, i) => {
  const p = nodePosition(i);
  const lp = labelPlacement(lab, p);
  return (
    <g key={lab}>
      {/* dot on the ring */}
      <circle cx={p.x} cy={p.y} r="1.6" fill={withAlpha(theme.text, 0.5)} />
      {/* label near the dot (outside, by side) */}
      
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
      'Inter, "Noto Sans Symbols 2", "Segoe UI Symbol", "Apple Symbols", "Apple Color Emoji", "Noto Sans", Arial, sans-serif',
  }}
>
  {DISPLAY_NAME[lab]}
</text>
    </g>
  );
})}

              {/* overlays (persist 2s; allow one older shape) */}
              {overlays.map((ov) => (
                <g key={ov.id}>
                  <path d={ov.path} fill={ov.fill} stroke={ov.color} strokeWidth="0.9" />
                </g>
              ))}
            </svg>

            
          </div>
        </section>
      </main>
    </div>
  );
}