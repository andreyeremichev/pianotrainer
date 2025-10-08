"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

/* =========================
   Theme
   ========================= */
const theme = {
  bg: "#0B0F14",
  card: "#111820",
  border: "#1E2935",
  text: "#E6EBF2",
  muted: "#8B94A7",
  gold: "#EBCF7A",     // Major
  minor: "#69D58C",    // Minor
};

/* =========================
   Circle geometry (r=36, label offset=3.0)
   Degree order (numbers-circle)
   ========================= */
type DegLabel = "1"|"5"|"2"|"6"|"3"|"7"|"♯4"|"♭2"|"♭6"|"♭3"|"♭7"|"4";
const DEGREE_ORDER: DegLabel[] = ["1","5","2","6","3","7","♯4","♭2","♭6","♭3","♭7","4"];

type Pt = { x: number; y: number };
function fmt(v: number, p = 3) { return Number(v.toFixed(p)); }
function nodePosition(i: number, r = 36): Pt {
  const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
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
  else          { anchor = "middle"; baseline = uy > 0 ? "hanging" : "baseline"; }
  return { x: fmt(x), y: fmt(y), anchor, baseline };
}
function pathFromNodes(indices: number[]): string {
  if (!indices.length) return "";
  const pts = indices.map(i => nodePosition(i, 36));
  const move = `M ${pts[0].x} ${pts[0].y}`;
  const rest = pts.slice(1).map(p => `L ${p.x} ${p.y}`).join(" ");
  return `${move} ${rest}`;
}

/* =========================
   Music mapping (B♭ Major / C minor)
   ========================= */
type KeyName = "BbMajor" | "Cminor";
const KEY_TONIC_PC: Record<KeyName, number> = { BbMajor: 10, Cminor: 0 };
const MAJOR_DEG = { "1":0,"2":2,"3":4,"4":5,"5":7,"6":9,"7":11 } as const;
const MINOR_DEG = { "1":0,"2":2,"3":3,"4":5,"5":7,"6":8,"7":10 } as const;
type Diatonic = "1"|"2"|"3"|"4"|"5"|"6"|"7";
type Chromatic = "♭2" | "♯4";

function degreeToPcOffset(deg: DegLabel, key: KeyName): number {
  const base = key === "BbMajor" ? MAJOR_DEG : MINOR_DEG;
  switch (deg) {
    case "1": return base["1"]; case "2": return base["2"]; case "3": return base["3"];
    case "4": return base["4"]; case "5": return base["5"]; case "6": return base["6"]; case "7": return base["7"];
    case "♯4": return (base["4"] + 1) % 12;
    case "♭2": return (base["2"] + 11) % 12;
    case "♭6": return (base["6"] + 11) % 12;
    case "♭3": return (base["3"] + 11) % 12;
    case "♭7": return (base["7"] + 11) % 12;
  }
}
function minorDisplayLabel(d: Diatonic): DegLabel {
  return d === "3" ? "♭3" : d === "6" ? "♭6" : d === "7" ? "♭7" : d;
}
function degToIndexForKey(d: Diatonic, key: KeyName) {
  const lab: DegLabel = key === "Cminor" ? minorDisplayLabel(d) : d;
  return DEGREE_ORDER.indexOf(lab);
}

/* =========================
   ZERO policy (alternate 0 → ♭2 / ♯4)
   ========================= */
// flip between ♭2 and ♯4 for zeros
const zeroFlipRef = { current: true };

/* digit -> degree rules (with chromatic zeros) */
function mapChar(c: string): { pause: boolean; deg?: Diatonic; chroma?: Chromatic; up?: boolean } {
  if (c === "-") return { pause: true };
  if (c === "0") {
    const next: Chromatic = zeroFlipRef.current ? "♭2" : "♯4";
    zeroFlipRef.current = !zeroFlipRef.current;
    return { pause: false, chroma: next };
  }
  if ("1234567".includes(c))   return { pause: false, deg: c as Diatonic };
  if (c === "8")              return { pause: false, deg: "1", up: true };
  if (c === "9")              return { pause: false, deg: "2", up: true };
  return { pause: true };
}

/* =========================
   Web Audio (buffer player)
   ========================= */
let _ctx: AudioContext | null = null;
const _buffers = new Map<string, AudioBuffer>();
const NOTE_ORDER = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"] as const;
type NoteName = `${(typeof NOTE_ORDER)[number]}${number}`;

function getCtx() {
  if (!_ctx) {
    const AC: any = (window as any).AudioContext || (window as any).webkitAudioContext;
    _ctx = new AC({ latencyHint: "interactive" });
  }
  return _ctx!;
}
async function unlockCtx() { const c = getCtx(); if (c.state === "suspended") try{ await c.resume(); }catch{} }
function midiToNoteName(midi: number): NoteName { const pc = NOTE_ORDER[midi % 12]; const oct = Math.floor(midi / 12) - 1; return `${pc}${oct}` as NoteName; }
async function loadBuffer(noteName: string): Promise<AudioBuffer> {
  if (_buffers.has(noteName)) return _buffers.get(noteName)!;
  const safe = noteName.replace("#","%23");
  const res = await fetch(`/audio/notes/${safe}.wav`);
  if (!res.ok) throw new Error(`fetch failed: ${safe}.wav`);
  const buf = await getCtx().decodeAudioData(await res.arrayBuffer());
  _buffers.set(noteName, buf); return buf;
}
function degreeToMidi(d: Diatonic, key: KeyName, up?: boolean): number {
  const tonic = KEY_TONIC_PC[key];
  const off = degreeToPcOffset(d as DegLabel, key);
  const pc = (tonic + off) % 12;
  const base = (up ? 5 : 4) * 12; // around C4/C5
  for (let m = base - 12; m <= base + 12; m++) if (m >= 36 && m <= 84 && (m % 12) === pc) return m;
  return base + pc;
}
/** snap a pitch-class to a comfortable MIDI near C4 */
function snapPcToComfortableMidi(pc: number, preferC4 = true): number {
  const base = (preferC4 ? 4 : 3) * 12; // near C4 / C3
  for (let m = base - 12; m <= base + 12; m++) {
    if (m >= 36 && m <= 84 && (m % 12) === pc) return m;
  }
  return (preferC4 ? 60 : 48) + pc; // fallback
}

/* =========================
   Date helpers
   ========================= */
type DateFmt = "DD-MM-YYYY" | "YYYY-MM-DD" | "MM-DD-YYYY";
function formatDateInput(raw: string, fmt: DateFmt): string {
  const d = raw.replace(/\D+/g, "").slice(0, 8);
  if (fmt === "DD-MM-YYYY") { const D=d.slice(0,2), M=d.slice(2,4), Y=d.slice(4,8); return [D,M,Y].filter(Boolean).join("-"); }
  if (fmt === "YYYY-MM-DD") { const Y=d.slice(0,4), M=d.slice(4,6), D=d.slice(6,8); return [Y,M,D].filter(Boolean).join("-"); }
  const M=d.slice(0,2), D=d.slice(2,4), Y=d.slice(4,8); return [M,D,Y].filter(Boolean).join("-");
}
function sanitizeDateForSeq(s: string): string[] { return s.split("").filter(ch => /[0-9\-]/.test(ch)); }
// Ready gate: DDMMYYYY present (8 digits; hyphens don't count)
const hasEightDigits = (s: string) => s.replace(/\D+/g, "").length === 8;

/* =========================
   Exporter helpers (reused from words page, adapted)
   ========================= */

/** Server-side conversion WebM → MP4 (skip if already MP4) */
async function convertToMp4Server(inputBlob: Blob): Promise<Blob> {
  if (inputBlob.type.includes("mp4")) {
    return inputBlob;
  }
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
  } catch (err) {
    console.warn("[convert] fallback to raw container", err);
    return inputBlob;
  }
}

/** Prefer MP4 when supported; Chrome will fall back to WebM. */
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

/** Embed fonts (not strictly needed for circle, harmless to include) */
async function buildEmbeddedFontStyle(): Promise<string> {
  return `text{font-family:ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono","Courier New", monospace; font-variant-numeric: tabular-nums;}`;
}
function serializeFullSvg(svgEl: SVGSVGElement, w: number, h: number, extraCss = ""): string {
  let raw = new XMLSerializer().serializeToString(svgEl);
  if (!/\swidth=/.test(raw))  raw = raw.replace(/<svg([^>]*?)>/, '<svg$1 width="' + w + '">');
  else                        raw = raw.replace(/\swidth="[^"]*"/,  ' width="' + w + '"');
  if (!/\sheight=/.test(raw)) raw = raw.replace(/<svg([^>]*?)>/, '<svg$1 height="' + h + '">');
  else                        raw = raw.replace(/\sheight="[^"]*"/, ' height="' + h + '"');
  if (/<style[^>]*>/.test(raw)) raw = raw.replace(/<style[^>]*>/, (m) => `${m}\n${extraCss}\n`);
  else                           raw = raw.replace(/<svg[^>]*?>/, (m) => `${m}\n<style>${extraCss}</style>\n`);
  return raw;
}
async function svgToImage(rawSvg: string): Promise<HTMLImageElement> {
  const blob = new Blob([rawSvg], { type: "image/svg+xml;charset=utf-8" });
  const url  = URL.createObjectURL(blob);
  const img  = new Image();
  await new Promise<void>((res, rej) => { img.onload = () => res(); img.onerror = rej; img.src = url; });
  URL.revokeObjectURL(url);
  return img;
}

/* =========================
   Confetti (dependency-free)
   ========================= */
function burstConfetti(parent: HTMLElement, count = 100, ms = 1400) {
  const box = document.createElement("div");
  box.style.position = "absolute";
  box.style.inset = "0";
  box.style.pointerEvents = "none";
  parent.appendChild(box);

  const colors = ["#EBCF7A","#69D58C","#6FA8FF","#FF8BD1","#FFD166","#8B94A7"];
  const W = box.clientWidth || (parent as any).offsetWidth || 320;
  const H = box.clientHeight || (parent as any).offsetHeight || 240;

  for (let i = 0; i < count; i++) {
    const p = document.createElement("div");
    const size = 6 + Math.random()*6;
    p.style.position = "absolute";
    p.style.left = (W/2) + (Math.random()*40 - 20) + "px";
    p.style.top  = (H/2) + (Math.random()*16 - 8) + "px";
    p.style.width = p.style.height = size + "px";
    p.style.background = colors[i % colors.length];
    p.style.borderRadius = Math.random() < 0.3 ? "50%" : "2px";
    p.style.transform = `translate(-50%,-50%) rotate(${Math.random()*360}deg)`;
    p.style.opacity = "0.95";
    p.style.transition = `transform ${ms}ms cubic-bezier(.22,.61,.36,1), opacity ${ms}ms linear`;
    box.appendChild(p);
    const dx = (Math.random()*2 - 1) * (W*0.45);
    const dy = (Math.random()*0.8 + 0.2) * (H*0.6);
    requestAnimationFrame(() => {
      p.style.transform = `translate(${dx}px,${dy}px) rotate(${Math.random()*360}deg)`;
      p.style.opacity = "0";
    });
  }
  setTimeout(() => { box.remove(); }, ms + 80);
}

/* =========================
   Component
   ========================= */
export default function ViralDateToNotesSN() {
  /* =========================
   Tiny SVG particle helpers
   ========================= */
type Ember = { x: number; y: number; vx: number; vy: number; life: number; el: SVGCircleElement };

function spawnParticles(
  pool: Ember[],
  max: number,
  svg: SVGSVGElement,
  x: number,
  y: number,
  palette: string[],
  count = 5
) {
  const g = svg.querySelector("#embers") as SVGGElement | null;
  if (!g) return;
  for (let k = 0; k < count; k++) {
    const el = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    const col = palette[(Math.random() * palette.length) | 0] || "#FFD36B";
    el.setAttribute("cx", String(x));
    el.setAttribute("cy", String(y));
    el.setAttribute("r", String(0.8 + Math.random() * 0.5));
    el.setAttribute("fill", col);
    el.setAttribute("opacity", "0.9");
    g.appendChild(el);

    const ang = Math.random() * Math.PI * 2;
    const spd = 0.5 + Math.random() * 1.1;
    pool.push({
      x,
      y,
      vx: Math.cos(ang) * spd,
      vy: Math.sin(ang) * spd - 0.2, // a little upward
      life: 1.0,
      el,
    });
    if (pool.length > max) {
      const old = pool.shift()!;
      old.el.remove();
    }
  }
}

function updateParticles(pool: Ember[]) {
  for (let i = pool.length - 1; i >= 0; i--) {
    const e = pool[i];
    e.x += e.vx;
    e.y += e.vy;
    e.vy += 0.015;      // light gravity
    e.life -= 0.02;
    if (e.life <= 0) {
      e.el.remove();
      pool.splice(i, 1);
      continue;
    }
    e.el.setAttribute("cx", e.x.toFixed(2));
    e.el.setAttribute("cy", e.y.toFixed(2));
    e.el.setAttribute("opacity", e.life.toFixed(2));
  }
}
  /* No-Clip CSS contract (tiny) */
  useEffect(() => {
    const css = `
      .vt-card, .vt-panel, .vt-actions { box-sizing: border-box; }
      .vt-panel { width: 100% !important; max-width: 100% !important; min-width: 0 !important; position: relative; }
      .vt-card  { padding-inline: 16px; }
      .vt-panel, .vt-actions { padding-inline: 14px; }
      @media (max-width: 390px) {
        .vt-card  { padding-inline: calc(16px + env(safe-area-inset-left)) calc(16px + env(safe-area-inset-right)); }
        .vt-panel { padding-inline: calc(14px + env(safe-area-inset-left)) calc(14px + env(safe-area-inset-right)); }
        .vt-actions { padding-inline: calc(14px + env(safe-area-inset-left)) calc(14px + env(safe-area-inset-right)); }
        .action-text{ display: none !important; }
      }
      @media (max-width: 360px) {
        .vt-card  { padding-inline: calc(20px + env(safe-area-inset-left)) calc(20px + env(safe-area-inset-right)); }
        .vt-panel { padding-inline: calc(18px + env(safe-area-inset-left)) calc(18px + env(safe-area-inset-right)); }
        .vt-actions { padding-inline: calc(18px + env(safe-area-inset-left)) calc(18px + env(safe-area-inset-right)); }
      }
      .vt-actions { display:flex; flex-wrap:wrap; justify-content:center; align-items:center; column-gap:10px; row-gap:8px; }
      .minw0 { min-width:0 !important; }
    `;
    const el = document.createElement("style"); el.textContent = css; document.head.appendChild(el);
    return () => { try { document.head.removeChild(el); } catch {} };
  }, []);

  /* State */
  const [fmt, setFmt] = useState<DateFmt>("DD-MM-YYYY");
  const [dateVal, setDateVal] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [hasPlayed, setHasPlayed] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  /* Refs */
  const isRunningRef = useRef(false);
  useEffect(()=>{ isRunningRef.current = isRunning; }, [isRunning]);
  const hasPlayedRef = useRef(false);
  useEffect(()=>{ hasPlayedRef.current = hasPlayed; }, [hasPlayed]);

  const svgRef = useRef<SVGSVGElement | null>(null);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

  // Live overlays (two colors)
  type Overlay = { id: "maj"|"min"; color: string; path: string };
  const [overlays, setOverlays] = useState<Overlay[]>([]);
  const nodesMajRef = useRef<number[]>([]);
  const nodesMinRef = useRef<number[]>([]);
  const TRAIL_N = 64; // full 8s window

  // RAF driver
  const rafRef = useRef<number>(0);
  const lastStepRef = useRef<number>(-1);
  const t0Ref = useRef<number>(0);

  // Alternation by non-pause notes (every 8)
  const nonPauseCountRef = useRef(0);
  const emberPool = useRef<Ember[]>([]).current;
const maxEmbers = 80;
  // Share state
  const [shareOpen, setShareOpen] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);

  function appendTrail(spoke: number, key: KeyName) {
    const dq = key === "BbMajor" ? nodesMajRef.current : nodesMinRef.current;
    dq.push(spoke);
    if (dq.length > TRAIL_N + 1) dq.splice(0, dq.length - (TRAIL_N + 1));
    const pathMaj = pathFromNodes(nodesMajRef.current);
    const pathMin = pathFromNodes(nodesMinRef.current);
    setOverlays([
      { id: "maj", color: theme.gold,  path: pathMaj },
      { id: "min", color: theme.minor, path: pathMin },
    ]);
  }

  // Sequence & plan
  const seq = useMemo(() => sanitizeDateForSeq(dateVal), [dateVal]);
  const seqLen = useMemo(() => Math.max(1, seq.length), [seq.length]);

  const NOTE_MS = 250;
  const SESSION_MS = 8000;
  const STEPS = Math.ceil(SESSION_MS / NOTE_MS);

  const hardStop = useCallback(() => {
    try {
      for (const s of sourcesRef.current) { try { s.stop(0); } catch {} }
      sourcesRef.current.clear();
    } catch {}
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = 0;
    setIsRunning(false);
    isRunningRef.current = false;
  }, []);

  const startCore = useCallback(async () => {
    if (isRunningRef.current) return;
    zeroFlipRef.current = true;
    try { (document.activeElement as HTMLElement | null)?.blur(); } catch {}
    setTimeout(() => {
      if ("visualViewport" in window) window.scrollTo({ top: 0, behavior: "smooth" });
    }, 40);
    if (seqLen === 0) return;
    await unlockCtx();

    nodesMajRef.current = [];
    nodesMinRef.current = [];
    setOverlays([]);
    nonPauseCountRef.current = 0;
    setIsRunning(true);
    isRunningRef.current = true;
    if (!hasPlayedRef.current) setHasPlayed(true);

    const ac = getCtx();
    const t0 = ac.currentTime + 0.12;
    t0Ref.current = t0;
    lastStepRef.current = -1;

    for (let i = 0; i < STEPS; i++) {
      const at = t0 + i * (NOTE_MS / 1000);
      const ch = seq[i % seqLen] ?? "-";
      const m = mapChar(ch);
      if (m.pause) continue;
      const idx = Math.floor(nonPauseCountRef.current / 8) % 2;
      const key: KeyName = idx === 0 ? "BbMajor" : "Cminor";
      nonPauseCountRef.current++;

      let midi: number | null = null;
      if (m.deg) midi = degreeToMidi(m.deg, key, m.up);
      else if (m.chroma) {
        const pc = degreeToPcOffset(m.chroma as DegLabel, key);
        midi = snapPcToComfortableMidi(pc);
      }
      if (midi == null) continue;

      loadBuffer(midiToNoteName(midi)).then(buf => {
        const src = ac.createBufferSource();
        src.buffer = buf;
        const g = ac.createGain();
        g.gain.setValueAtTime(0, at);
        g.gain.linearRampToValueAtTime(1, at + 0.01);
        g.gain.setTargetAtTime(0, at + 0.20, 0.05);
        src.connect(g).connect(ac.destination);
        sourcesRef.current.add(src);
        src.onended = () => sourcesRef.current.delete(src);
        try { src.start(at); src.stop(at + 0.25); } catch {}
      }).catch(()=>{});
    }

    // RAF loop with glow + confetti
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    const stepDurSec = NOTE_MS / 1000;
    const rafCount = { n: 0 };

    function loopLive() {
      if (!isRunningRef.current) return;
      const nowSec = getCtx().currentTime;
      const step = Math.floor((nowSec - t0Ref.current) / stepDurSec);
      if (step > lastStepRef.current) {
        for (let s = lastStepRef.current + 1; s <= step; s++) {
          if (s < 0 || s >= STEPS) continue;
          const ch = seq[s % seqLen] ?? "-";
          const m = mapChar(ch);
          if (m.pause) continue;
          const idx = Math.floor(rafCount.n / 8) % 2;
          const key: KeyName = idx === 0 ? "BbMajor" : "Cminor";
          rafCount.n++;

          let spoke: number;
          if (m.deg) spoke = degToIndexForKey(m.deg, key);
          else if (m.chroma) spoke = DEGREE_ORDER.indexOf(m.chroma);
          else continue;
          appendTrail(spoke, key);

          /// spawn confetti from the current note position on the circle
const svgEl = svgRef.current;
if (svgEl) {
  const p = nodePosition(spoke, 36);
  const palette = [theme.gold, theme.minor, "#FFD36B"];
  spawnParticles(emberPool, maxEmbers, svgEl, p.x, p.y, palette, 6);
}
// animate particles
updateParticles(emberPool);
        }
        lastStepRef.current = step;
      }
      if (step < STEPS) rafRef.current = requestAnimationFrame(loopLive);
      else hardStop();
    }
    rafRef.current = requestAnimationFrame(loopLive);
  }, [seq, seqLen, hardStop]);

  // --- Start wrapper (replay-friendly) ---
  const start = useCallback(() => {
    if (isRunningRef.current) {
      hardStop();
      setTimeout(() => startCore(), 30);
    } else {
      startCore();
    }
  }, [startCore, hardStop]);

  // --- Keyboard triggers (Enter / Blur) ---
  const onDateKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    if (!hasEightDigits(dateVal)) return;
    if (isRunningRef.current) {
      hardStop();
      setTimeout(() => start(), 30);
    } else {
      start();
    }
  }, [dateVal, start, hardStop]);

  const onDateBlur = useCallback(() => {
    if (!hasEightDigits(dateVal)) return;
    if (isRunningRef.current) {
      hardStop();
      setTimeout(() => start(), 30);
    } else {
      start();
    }
  }, [dateVal, start, hardStop]);

  /* =========================
     Download (reused pattern from words page, adapted to circle)
     ========================= */
    const onDownloadVideo = useCallback(async () => {
  setIsExporting(true);

  const svgEl = svgRef.current;
  if (!svgEl) { setIsExporting(false); return; }

  // local rgba helper (export-only glow)
  const withAlphaLocal = (color: string, a: number) => {
    if (!color.startsWith("#")) return color;
    const n = parseInt(color.slice(1), 16);
    const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    return `rgba(${r},${g},${b},${a})`;
  };

  try {
    // 1) Measure live SVG
    const rect = svgEl.getBoundingClientRect();
    const liveW = Math.max(2, Math.floor(rect.width));
    const liveH = Math.max(2, Math.floor(rect.height));

    // 1a) Prepare a snapshot of the background ONLY via a **clone** (doesn't touch live)
    const clone = svgEl.cloneNode(true) as SVGSVGElement;
    // Remove all <path> (your overlays) and <g id="embers"> confetti in the clone
    clone.querySelectorAll("path").forEach(p => p.remove());
    const embersClone = clone.querySelector("#embers");
    if (embersClone) embersClone.remove();
    const css = await buildEmbeddedFontStyle();
    const rawBg = serializeFullSvg(clone, liveW, liveH, css);
    let bgImg = await svgToImage(rawBg);
    if (!bgImg) { setIsExporting(false); return; }

    // 2) Canvas (1080×1920 @ 30fps, HiDPI scale)
    const FRAME_W = 1080, FRAME_H = 1920, FPS = 30, SCALE = 2;
    const canvas = document.createElement("canvas");
    canvas.width = FRAME_W * SCALE;
    canvas.height = FRAME_H * SCALE;
    const ctx = canvas.getContext("2d");
    if (!ctx) { setIsExporting(false); return; }
    const c = ctx as CanvasRenderingContext2D;

    // 3) Layout (date text on top, circle panel below)
    const SAFE_TOP = 160, SAFE_BOTTOM = 120, TOP_GAP = 10, SIDE_PAD = 48;
    const dateText = (dateVal || fmt);
    function measurePx(px: number) {
      c.font = `${px * SCALE}px Inter, system-ui, sans-serif`;
      const m = c.measureText(dateText);
      const asc = (m as any).actualBoundingBoxAscent ?? px * 0.8;
      const desc= (m as any).actualBoundingBoxDescent ?? px * 0.25;
      return { w: m.width, h: asc + desc };
    }
    const TARGET = 0.80 * FRAME_W * SCALE;
    let lo = 24, hi = 80, best = 28;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      const { w } = measurePx(mid);
      if (w <= TARGET) { best = mid; lo = mid + 1; } else { hi = mid - 1; }
    }
    const datePx = best;
    const { h: dateBlockH } = measurePx(datePx);
    const dateBaselineY = (SAFE_TOP + Math.round(dateBlockH * 0.6)) * SCALE;

    const availW = FRAME_W - SIDE_PAD * 2;
    const goldTop = SAFE_TOP + dateBlockH + TOP_GAP;
    const availH = Math.max(2, FRAME_H - goldTop - SAFE_BOTTOM);
    const scaleContent = Math.min(availW / liveW, availH / liveH);
    const drawW = Math.round(liveW * scaleContent);
    const drawH = Math.round(liveH * scaleContent);
    const drawX = Math.round((FRAME_W - drawW) / 2);
    const drawY = goldTop;

    // 4) Recorder: canvas + WebAudio (export stream)
    const ac = getCtx();
    const exportDst = ac.createMediaStreamDestination();
    const stream   = (canvas as any).captureStream(FPS) as MediaStream;
    const mixed    = new MediaStream([...stream.getVideoTracks(), ...exportDst.stream.getAudioTracks()]);
    const mimeType = pickRecorderMime();
    const chunks: BlobPart[] = [];
    const rec = new MediaRecorder(mixed, { mimeType });
    rec.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };

    // 5) Draw frame helper (background + date + golden box + bg snapshot)
    function drawFrame(img: HTMLImageElement) {
      // background
      c.fillStyle = theme.bg;
      c.fillRect(0, 0, canvas.width, canvas.height);

      // date top (gold text with subtle stroke)
      c.save();
      c.font = `${datePx * SCALE}px Inter, system-ui, sans-serif`;
      c.textAlign = "center"; c.textBaseline = "middle";
      c.lineWidth = Math.max(2, Math.floor(datePx * 0.12)) * SCALE;
      c.strokeStyle = "rgba(0,0,0,0.25)";
      c.strokeText(dateText, (FRAME_W * SCALE)/2, dateBaselineY);
      c.fillStyle = theme.gold;
      c.fillText(dateText, (FRAME_W * SCALE)/2, dateBaselineY);
      c.restore();

      // golden border wrapping input+circle (subtle)
      c.save();
      c.strokeStyle = theme.gold;
      c.lineWidth = 2 * SCALE;
      const panelTop = SAFE_TOP; // from top margin
      const panelHeight = drawH + dateBlockH + TOP_GAP; // include input + circle
      c.strokeRect((SIDE_PAD / 2) * SCALE, panelTop * SCALE, (FRAME_W - SIDE_PAD) * SCALE, panelHeight * SCALE);
      c.restore();

      // proportional background snapshot (no overlays/confetti baked)
      c.drawImage(img, 0, 0, liveW, liveH, drawX * SCALE, drawY * SCALE, drawW * SCALE, drawH * SCALE);
    }

    // initial paints
    drawFrame(bgImg);
    await new Promise(r => setTimeout(r, 80));
    drawFrame(bgImg);

    // 6) Export-time geometry & helpers
    const nodePx = Array.from({ length: 12 }, (_, i) => {
      const ang = (i / 12) * Math.PI * 2 - Math.PI / 2;
      const r = 36, cx = 50, cy = 50;
      const x = (cx + Math.cos(ang) * r) * (liveW / 100);
      const y = (cy + Math.sin(ang) * r) * (liveH / 100);
      return { x, y };
    });

    type P = { k: "maj" | "min"; step: number; spoke: number };
    const exportPoints: P[] = [];

    // export confetti (canvas) — SAME size as live (slightly larger)
    type CParticle = { x:number; y:number; vx:number; vy:number; life:number; size:number; color:string };
    const confetti: CParticle[] = [];
    let lastSpawn = -1;
    const confColors = [theme.gold, theme.minor, "#FFD36B"];
    function spawnConfettiForStep(stepIdx: number) {
      const pts = exportPoints.filter(p => p.step === stepIdx);
      if (!pts.length) return;
      for (const p of pts) {
        const node = nodePx[p.spoke];
        const burst = 8; // density like live
        for (let i = 0; i < burst; i++) {
          const ang = Math.random() * Math.PI * 2;
          const spd = 0.5 + Math.random() * 1.1;
          confetti.push({
            x: node.x, y: node.y,
            vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd - 0.2,
            life: 1.0,
            size: 2.8 + Math.random() * 0.8, // same larger look as live
            color: confColors[(Math.random() * confColors.length) | 0],
          });
        }
      }
    }
    function updateAndDrawConfetti(ctx: CanvasRenderingContext2D) {
      for (let i = confetti.length - 1; i >= 0; i--) {
        const p = confetti[i];
        p.x += p.vx; p.y += p.vy; p.vy += 0.015; p.life -= 0.02;
        if (p.life <= 0) { confetti.splice(i, 1); continue; }
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.fillStyle = p.color;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    // 7) Build plan + schedule audio (use your zero policy + Maj/Min flip)
    const NOTE_MS_E = 250;
    const STEPS_E = 32; // keep your 8s session
    const seqLocal = sanitizeDateForSeq(dateVal);
    const t0 = ac.currentTime + 0.25;
    let count2 = 0;

    for (let i = 0; i < STEPS_E; i++) {
      const atSec = t0 + i * (NOTE_MS_E/1000);
      const ch = seqLocal[i % Math.max(1, seqLocal.length)] ?? "-";
      const m  = (ch === "-") ? { pause:true } : mapChar(ch);
      if (m.pause) continue;

      const key: KeyName = (Math.floor(count2 / 8) % 2 === 0) ? "BbMajor" : "Cminor";
      count2++;

      // audio
      let midi: number | null = null;
      if ("deg" in m && m.deg)       midi = degreeToMidi(m.deg as any, key);
      else if ("chroma" in m && m.chroma) midi = (():number => {
        const pc = degreeToPcOffset(m.chroma as any, key);
        for (let mm = 48; mm <= 72; mm++) if (mm % 12 === pc) return mm;
        return 60;
      })();
      if (midi != null) {
        const name = midiToNoteName(midi);
        loadBuffer(name).then(buf => {
          const src = ac.createBufferSource();
          src.buffer = buf;
          const g = ac.createGain();
          g.gain.setValueAtTime(0, atSec);
          g.gain.linearRampToValueAtTime(1, atSec + 0.01);
          g.gain.setTargetAtTime(0, atSec + 0.20, 0.05);
          src.connect(g); g.connect(exportDst); g.connect(ac.destination);
          try { src.start(atSec); src.stop(atSec + 0.25); } catch {}
        }).catch(()=>{});
      }

      // trail spoke
      let spoke = -1;
      if ("deg" in m && m.deg) {
        const lab = key === "Cminor" ? (m.deg === "3" ? "♭3" : m.deg === "6" ? "♭6" : m.deg === "7" ? "♭7" : m.deg) : m.deg;
        spoke = DEGREE_ORDER.indexOf(lab as any);
      } else if ("chroma" in m && m.chroma) {
        spoke = DEGREE_ORDER.indexOf(m.chroma as any);
      }
      if (spoke >= 0) exportPoints.push({ k: key === "BbMajor" ? "maj" : "min", step: i, spoke });
    }

    // 8) Animate frames (moving glow + confetti)
    const recStart = performance.now();
    rec.start();

    (function loop() {
      const i = Math.min(STEPS_E - 1, Math.floor((performance.now() - recStart) / NOTE_MS_E));

      // background
      drawFrame(bgImg);

    
      // === Moving glowing trails + confetti (export) ===
const TRAIL_WINDOW = 64; // adjust 48..96 to taste
const majVis = exportPoints.filter(p => p.k === "maj" && p.step <= i).map(p => p.spoke).slice(-TRAIL_WINDOW);
const minVis = exportPoints.filter(p => p.k === "min" && p.step <= i).map(p => p.spoke).slice(-TRAIL_WINDOW);

c.save();
c.translate(drawX * SCALE, drawY * SCALE);
c.scale(SCALE * (drawW / liveW), SCALE * (drawH / liveH));
c.lineCap = "round";
c.lineJoin = "round";

// export-friendly “SVG-like” glow using stacked strokes and additive blend
function drawTail(spokes: number[], color: string) {
  const len = spokes.length;
  if (len < 2) return;

  const prev = c.globalCompositeOperation;
  c.globalCompositeOperation = "lighter"; // additive, closer to SVG filter look

  for (let k = 1; k < len; k++) {
    const a = nodePx[spokes[k - 1]];
    const b = nodePx[spokes[k]];
    const t = k / len;                // tail(0) → head(1)
    const coreW = 1.0 + t * 1.35;     // thickness similar to live view

    // outer halo
    c.strokeStyle = withAlphaLocal(color, 0.16 + t * 0.14); // stronger halo (0.16..0.30)
    c.lineWidth   = coreW + 3.2;
    c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); c.stroke();

    // mid halo
    c.strokeStyle = withAlphaLocal(color, 0.20 + t * 0.18); // 0.20..0.38
    c.lineWidth   = coreW + 2.2;
    c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); c.stroke();

    // inner halo
    c.strokeStyle = withAlphaLocal(color, 0.26 + t * 0.22); // 0.26..0.48
    c.lineWidth   = coreW + 1.4;
    c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); c.stroke();

    // bright core
    c.strokeStyle = withAlphaLocal(color, 0.72 + t * 0.26); // 0.72..0.98
    c.lineWidth   = coreW;
    c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); c.stroke();
  }

  c.globalCompositeOperation = prev;
}

// use the same live colors
drawTail(majVis, theme.gold);
drawTail(minVis, theme.minor);

// confetti (canvas) — same behavior as live, on each new step
if (i > lastSpawn) {
  for (let s = lastSpawn + 1; s <= i; s++) spawnConfettiForStep(s);
  lastSpawn = i;
}
updateAndDrawConfetti(c);

c.restore();

      if (i < STEPS_E - 1) requestAnimationFrame(loop);
      else rec.stop();
    })();

    // 9) Finalize → MP4 (server) → download
    const recorded: Blob = await new Promise((res) => {
      rec.onstop = () => res(new Blob(chunks, { type: mimeType || "video/webm" }));
    });
    const outBlob = await convertToMp4Server(recorded);

    const safe = (dateVal || fmt || "date").replace(/[^A-Za-z0-9\-_.]+/g, "-");
    const a = document.createElement("a");
    a.download = `${safe}.mp4`;
    a.href = URL.createObjectURL(outBlob);
    document.body.appendChild(a);
    a.click();
    a.remove();
  } catch (err) {
    console.error("[download] export error:", err);
    try { alert("Could not prepare video. Please try again."); } catch {}
  } finally {
    setIsExporting(false);
  }
}, [dateVal, fmt]);

  /* =========================
     Render
     ========================= */
  return (
    <div style={{ minHeight:"100vh", background: theme.bg, color: theme.text, overflowX:"hidden" }}>
      <main className="vt-card" style={{ width:"100%", margin:"0 auto", padding:12, boxSizing:"border-box", maxWidth:520 }} ref={panelRef}>
        <section
          className="vt-panel minw0"
          style={{
            border: `1px solid ${theme.gold}`,
            borderRadius:14,
            paddingTop:12,
            paddingBottom:12,
            background: theme.card,
            display: "grid",
            gap: 10,
          }}
        >
          {/* Date format */}
          <div className="minw0" style={{ display:"flex", justifyContent:"center" }}>
            <select
              value={fmt}
              onChange={e=>setFmt(e.target.value as DateFmt)}
              style={{
                background:"#0F1821",
                color:theme.text,
                border:`1px solid ${theme.border}`,
                borderRadius:8,
                padding:"8px 10px",
                fontSize:14,
              }}
              aria-label="Date format"
            >
              <option value="DD-MM-YYYY">DD-MM-YYYY</option>
              <option value="YYYY-MM-DD">YYYY-MM-DD</option>
              <option value="MM-DD-YYYY">MM-DD-YYYY</option>
            </select>
          </div>

          {/* CTA */}
          <form
            className="minw0"
            onSubmit={(e)=>{ e.preventDefault(); if (hasEightDigits(dateVal)) start(); }}
            style={{ display:"flex", gap:8, alignItems:"center", justifyContent:"center", flexWrap:"wrap", paddingInline: 2 }}
          >
            <span style={{ color: theme.text, fontWeight: 700, fontSize: 15 }}>Turn</span>
            <input
              value={dateVal}
              onChange={e => setDateVal(formatDateInput(e.target.value, fmt))}
              placeholder={fmt}
              inputMode="numeric"
              enterKeyHint="done"
              onKeyDown={onDateKeyDown}
              onBlur={onDateBlur}
              style={{
                boxSizing: "border-box",
                width: "calc(10ch + 20px + 2px)",
                background:"#0F1821",
                color:theme.gold,
                border:`1px solid ${theme.border}`,
                borderRadius:8,
                padding:"8px 10px",
                fontSize:16,
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Courier New", monospace',
                fontVariantNumeric: "tabular-nums",
              }}
            />
            <span style={{ color: theme.text, fontWeight: 700, fontSize: 15 }}>into sound</span>
          </form>

          {/* Circle */}
          <div className="minw0" style={{ display:"grid", justifyContent:"center", paddingInline: 2 }}>
            <svg
              ref={svgRef}
              viewBox="0 0 100 100"
              width={360}
              height={360}
              style={{ overflow:"visible" }}
              shapeRendering="geometricPrecision"
            >
              {/* Glow filter */}
              <defs>
                <filter id="vt-glow" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur in="SourceGraphic" stdDeviation="1.6" result="b1" />
                  <feGaussianBlur in="SourceGraphic" stdDeviation="3.2" result="b2" />
                  <feMerge>
                    <feMergeNode in="b2" />
                    <feMergeNode in="b1" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              {/* Ring */}
              <circle cx="50" cy="50" r="36" stroke="rgba(230,235,242,0.15)" strokeWidth="2" fill="none" />
              {/* Nodes + labels */}
              {DEGREE_ORDER.map((lab, i) => {
                const p = nodePosition(i, 36);
                const lp = labelPlacement(i, p);
                return (
                  <g key={lab}>
                    <circle cx={p.x} cy={p.y} r="1.6" fill="rgba(230,235,242,0.5)" />
                    <text x={lp.x} y={lp.y} textAnchor={lp.anchor} dominantBaseline={lp.baseline} fontSize="4" fill={theme.text} style={{ userSelect:"none", pointerEvents:"none" }}>
                      {lab}
                    </text>
                  </g>
                );
              })}
              {/* Live trails (gold=Major, green=Minor) with glow */}
              {overlays.map(ov => (
                <path
                  key={ov.id}
                  d={ov.path}
                  fill="none"
                  stroke={ov.color}
                  strokeWidth="1.15"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  filter="url(#vt-glow)"
                />
              ))}
              <g id="embers" />
            </svg>
          </div>

          {/* Actions (Play/Replay + Download + Share) */}
          <div className="vt-actions minw0" aria-label="Actions">
            {isExporting && (
              <div style={{ color: theme.muted, fontSize: 12, textAlign: "center", width: "100%", marginTop: 6 }}>
                ⏺️ Recording… (8s)
              </div>
            )}
            <button
              onClick={start}
              disabled={isRunning || !hasEightDigits(dateVal)}
              style={{
                background: isRunning || !hasEightDigits(dateVal) ? "#1a2430" : theme.gold,
                color:      isRunning || !hasEightDigits(dateVal) ? theme.muted : "#081019",
                border: "none",
                borderRadius: 999,
                padding: "10px 16px",
                fontWeight: 700,
                cursor: isRunning || !hasEightDigits(dateVal) ? "not-allowed" : "pointer",
                fontSize: 16,
                minHeight: 40,
              }}
              title={hasPlayed ? "Replay" : "Play"}
            >
              {hasPlayed ? "⟲ Replay" : "▶ Play"}
            </button>

            {/* Right side: Download + Share */}
            <div style={{ display:"flex", gap:10, alignItems:"center" }}>
              <button onClick={onDownloadVideo} disabled={!hasEightDigits(dateVal)} title="Download"
                style={{ background:"transparent", color: theme.gold, border:"none", borderRadius:999, padding:"6px 10px", fontWeight:700, cursor:!hasEightDigits(dateVal)?"not-allowed":"pointer", minHeight:32, fontSize:14 }}>
                💾 <span className="action-text">Download</span>
              </button>
              <button onClick={() => setShareOpen(true)} title="Share"
                style={{ background:"transparent", color: theme.gold, border:"none", borderRadius:999, padding:"6px 10px", fontWeight:700, cursor:"pointer", minHeight:32, fontSize:14 }}>
                📤 <span className="action-text">Share</span>
              </button>
            </div>
          </div>

          {/* Copy toast */}
          {linkCopied && (
            <div style={{ color: theme.minor, fontSize: 12, fontWeight: 600, textAlign: "right", width: "100%" }}>
              Link copied!
            </div>
          )}
        </section>

        {/* Outside the card: Why these numbers CTA */}
        <div style={{ marginTop: 20, display: "flex", justifyContent: "center" }}>
          <a
            href="/learn/why-these-numbers"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              fontWeight: 700,
              fontSize: 15,
              color: theme.gold,
              textDecoration: "none",
              border: `1px solid ${theme.border}`,
              borderRadius: 12,
              padding: "8px 14px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
            }}
            aria-label="Why these numbers explanation"
          >
            Why these numbers →
          </a>
        </div>
      </main>
    </div>
  );
}   