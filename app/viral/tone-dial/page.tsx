"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

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
  gold: "#EBCF7A",   // Major
  minor: "#69D58C",  // Minor
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
function pickTheme(mode: BgMode) { return mode === "dark" ? themeDark : themeLight; }

/* =========================
   Circle geometry
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
   Musical mapping (Bb Major / C minor)
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
   Web Audio (shared)
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
function snapPcToComfortableMidi(pc: number, preferC4 = true): number {
  const base = (preferC4 ? 4 : 3) * 12;
  for (let m = base - 12; m <= base + 12; m++) { if (m >= 36 && m <= 84 && (m % 12) === pc) return m; }
  return (preferC4 ? 60 : 48) + pc;
}

/* =========================
   Phone input: sanitize + T9 + tokenizer
========================= */
// Allowed: 0–9, A–Z, + # * and '-' as rest. Everything else stripped.
function sanitizePhoneInput(s: string): string {
  return s.replace(/[^0-9A-Za-z\+\#\*\- ]/g, "").toUpperCase();
}
const T9: Record<string, string> = {
  A:"2",B:"2",C:"2", D:"3",E:"3",F:"3", G:"4",H:"4",I:"4",
  J:"5",K:"5",L:"5", M:"6",N:"6",O:"6", P:"7",Q:"7",R:"7",S:"7",
  T:"8",U:"8",V:"8", W:"9",X:"9",Y:"9",Z:"9",
};

type ZeroPolicy = "chromatic" | "rest";
type Token =
  | { kind:"rest"; char:"-"}
  | { kind:"deg"; d:Diatonic; up?: boolean; src:string }
  | { kind:"chroma"; c:Chromatic; src:"0" }
  | { kind:"intro" }            // '+' at start
  | { kind:"resolve" }          // '#'
  | { kind:"toggle" }           // '*'
;

const zeroFlipRef = { current: true };

function pushDigit(tokens: Token[], digit: string, zeroPolicy: ZeroPolicy) {
  if (digit === "0") {
    if (zeroPolicy === "rest") { tokens.push({ kind:"rest", char:"-" }); return; }
    const next: Chromatic = zeroFlipRef.current ? "♭2" : "♯4";
    zeroFlipRef.current = !zeroFlipRef.current;
    tokens.push({ kind:"chroma", c: next, src:"0" });
    return;
  }
  if ("1234567".includes(digit)) { tokens.push({ kind:"deg", d: digit as Diatonic, src: digit }); return; }
  if (digit === "8") { tokens.push({ kind:"deg", d:"1", up:true, src:"8" }); return; }
  if (digit === "9") { tokens.push({ kind:"deg", d:"2", up:true, src:"9" }); return; }
}

function tokenizePhone(raw: string, zeroPolicy: ZeroPolicy): Token[] {
  const s = sanitizePhoneInput(raw);
  const out: Token[] = [];
  zeroFlipRef.current = true;
  let i = 0;
  // '+' only meaningful at the very beginning
  if (s.startsWith("+")) { out.push({ kind:"intro" }); i = 1; }

  for (; i < s.length; i++) {
    const ch = s[i];
    if (ch === "-") { out.push({ kind:"rest", char:"-" }); continue; }
    if (ch === "#") { out.push({ kind:"resolve" }); continue; }
    if (ch === "*") { out.push({ kind:"toggle" }); continue; }
    if (/[A-Z]/.test(ch)) { pushDigit(out, T9[ch], zeroPolicy); continue; }
    if (/[0-9]/.test(ch)) { pushDigit(out, ch, zeroPolicy); continue; }
    // spaces ignored
  }
  return out;
}

/* =========================
   Export helpers: server convert + SVG serializer (reuse)
========================= */
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
  } catch (err) {
    console.warn("[convert] fallback to raw container", err);
    return inputBlob;
  }
}
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
   Component
========================= */
type TrailMode = "pulse" | "glow" | "lines" | "glow+confetti" | "lines+confetti";

export default function ToneDialPage() {
  /* CSS */
  useEffect(() => {
    const css = `
      .vt-card, .vt-panel, .vt-actions { box-sizing: border-box; }
      .vt-panel { width: 100%; max-width: 100%; min-width: 0; position: relative; }
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
      .caption span.hl { color: var(--gold); font-weight: 800; }
    `;
    const el = document.createElement("style"); el.textContent = css; document.head.appendChild(el);
    return () => { try { document.head.removeChild(el); } catch {} };
  }, []);

  /* State */
  const [bg, setBg] = useState<BgMode>("dark");
  const T = pickTheme(bg);
  const [trailMode, setTrailMode] = useState<TrailMode>("pulse");
  const [zeroPolicy, setZeroPolicy] = useState<ZeroPolicy>("chromatic");
  const [raw, setRaw] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [hasPlayed, setHasPlayed] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [showHelper, setShowHelper] = useState(true);

  const svgRef = useRef<SVGSVGElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

  // live trails
  type Overlay = { id: "maj"|"min"; color: string; path: string };
  const [overlays, setOverlays] = useState<Overlay[]>([]);
  const nodesMajRef = useRef<number[]>([]);
  const nodesMinRef = useRef<number[]>([]);
  const TRAIL_N = 9999; // keep full string within each pass

  // confetti (live, lightweight SVG particles)
  type Ember = { x: number; y: number; vx: number; vy: number; life: number; el: SVGCircleElement };
  const emberPool = useRef<Ember[]>([]).current;
  const maxEmbers = 80;

  // loop control
  const rafRef = useRef<number>(0);
  const t0Ref = useRef<number>(0);

  // Build tokens from input
  const tokens = useMemo(() => tokenizePhone(raw, zeroPolicy), [raw, zeroPolicy]);
  // Build caption (final degrees) + per-char transform chains
const { caption: captionDegrees, currentChain } = useMemo(() => {
  return buildCaptionAndCurrentChain(raw, tokens, zeroPolicy);
}, [raw, tokens, zeroPolicy]);
// Build the one-line degrees strip that mimics the input
const degreesStrip = useMemo(() => {
  return buildDegreesLineTokens(raw, tokens, zeroPolicy);
}, [raw, tokens, zeroPolicy]);

  /* Helpers */
  function appendTrail(spoke: number, key: KeyName) {
    const dq = key === "BbMajor" ? nodesMajRef.current : nodesMinRef.current;
    dq.push(spoke);
    if (dq.length > TRAIL_N + 1) dq.splice(0, dq.length - (TRAIL_N + 1));
    const pathMaj = pathFromNodes(nodesMajRef.current);
    const pathMin = pathFromNodes(nodesMinRef.current);
    setOverlays([
      { id: "maj", color: T.gold,  path: pathMaj },
      { id: "min", color: T.minor, path: pathMin },
    ]);
  }

  // basic particles for live sparkles (node-local; gated by +confetti mode)
  function spawnParticles(pool: Ember[], max: number, svg: SVGSVGElement, x: number, y: number, palette: string[], count = 5) {
    if (!(trailMode === "pulse" || trailMode.includes("+confetti"))) return;
    const g = svg.querySelector("#embers") as SVGGElement | null;
    if (!g) return;
    for (let k = 0; k < count; k++) {
      const el = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      const col = palette[(Math.random() * palette.length) | 0] || "#FFD36B";
      el.setAttribute("cx", String(x));
      el.setAttribute("cy", String(y));
      el.setAttribute("r", String(0.9 + Math.random() * 0.5));
      el.setAttribute("fill", col);
      el.setAttribute("opacity", "0.9");
      g.appendChild(el);
      const ang = Math.random() * Math.PI * 2;
      const spd = 1.0 + Math.random() * 1.2;
      pool.push({ x, y, vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd - 0.12, life: 1.0, el });
      if (pool.length > max) { const old = pool.shift()!; old.el.remove(); }
    }
  }
  function updateParticles(pool: Ember[]) {
    if (!(trailMode === "pulse" || trailMode.includes("+confetti"))) return;
    for (let i = pool.length - 1; i >= 0; i--) {
      const e = pool[i];
      e.x += e.vx; e.y += e.vy; e.vy += 0.03; e.life -= 0.06;
      if (e.life <= 0) { e.el.remove(); pool.splice(i, 1); continue; }
      e.el.setAttribute("cx", e.x.toFixed(2));
      e.el.setAttribute("cy", e.y.toFixed(2));
      e.el.setAttribute("opacity", Math.max(0.28, e.life).toFixed(2));
    }
  }
    /* =========================
     Intro / Resolve helpers
  ========================= */
  // quick I-chord arpeggio for intro '+'
  function scheduleIntroChord(ac: AudioContext, at: number, key: KeyName) {
    const degrees: Diatonic[] = ["1","3","5"];
    const step = 0.06; // arpeggiate up
    degrees.forEach((d, idx) => {
      const midi = degreeToMidi(d, key);
      loadBuffer(midiToNoteName(midi)).then(buf => {
        const src = ac.createBufferSource(); src.buffer = buf;
        const g = ac.createGain();
        const t = at + idx * step;
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(1, t + 0.01);
        g.gain.setTargetAtTime(0, t + 0.20, 0.05);
        src.connect(g).connect(ac.destination);
        try { src.start(t); src.stop(t + 0.25); } catch {}
      }).catch(()=>{});
    });
  }
  // quick V→I resolve for '#'
  function scheduleResolveCadence(ac: AudioContext, at: number, key: KeyName) {
    // V then I (short)
    const seq: Array<{d:Diatonic, at:number}> = [
      { d:"5", at },
      { d:"1", at: at + 0.12 },
    ];
    seq.forEach(({d, at}) => {
      const midi = degreeToMidi(d, key);
      loadBuffer(midiToNoteName(midi)).then(buf => {
        const src = ac.createBufferSource(); src.buffer = buf;
        const g = ac.createGain();
        g.gain.setValueAtTime(0, at);
        g.gain.linearRampToValueAtTime(1, at + 0.01);
        g.gain.setTargetAtTime(0, at + 0.20, 0.05);
        src.connect(g).connect(ac.destination);
        try { src.start(at); src.stop(at + 0.25); } catch {}
      }).catch(()=>{});
    });
  }
  // --- ToneDial caption + transform helpers ---
// ordinal suffix for degree labels
function ordinalLabel(n: number) {
  if (n === 1) return "1st";
  if (n === 2) return "2nd";
  if (n === 3) return "3rd";
  return `${n}th`;
}

// T9 group label for a letter
function t9GroupLabel(ch: string): string | null {
  const u = ch.toUpperCase();
  if ("ABC".includes(u)) return "(ABC)";
  if ("DEF".includes(u)) return "(DEF)";
  if ("GHI".includes(u)) return "(GHI)";
  if ("JKL".includes(u)) return "(JKL)";
  if ("MNO".includes(u)) return "(MNO)";
  if ("PQRS".includes(u)) return "(PQRS)";
  if ("TUV".includes(u)) return "(TUV)";
  if ("WXYZ".includes(u)) return "(WXYZ)";
  return null;
}

// Build caption degrees (from tokens) and a per-char transform chain (from raw input + tokens)
// - Caption shows only final playable targets (degrees or chromatic), no rests or control marks.
// - Transform chain shows the mapping for *each typed character*.
function buildCaptionAndCurrentChain(
  raw: string,
  tokens: Token[],
  zeroPolicy: ZeroPolicy
): { caption: string[]; currentChain: string[] } {
  const caption: string[] = [];
  let currentChain: string[] = [];

  // helpers
  const ordinalLabel = (n: number) => (n===1?"1st":n===2?"2nd":n===3?"3rd":`${n}th`);
  const t9GroupLabel = (u: string): string | null => {
    if ("ABC".includes(u)) return "(ABC)";
    if ("DEF".includes(u)) return "(DEF)";
    if ("GHI".includes(u)) return "(GHI)";
    if ("JKL".includes(u)) return "(JKL)";
    if ("MNO".includes(u)) return "(MNO)";
    if ("PQRS".includes(u)) return "(PQRS)";
    if ("TUV".includes(u)) return "(TUV)";
    if ("WXYZ".includes(u)) return "(WXYZ)";
    return null;
  };

  // walk tokens to build caption (final playable targets)
  for (const t of tokens) {
    if (t.kind === "deg") caption.push(ordinalLabel(Number(t.d)));
    else if (t.kind === "chroma") caption.push(t.c);
  }

  // Build chain for the *latest* typed character only
  const src = (raw || "").toUpperCase();
  if (!src.length) return { caption, currentChain };

  // pointer over tokens to align to the newest playable token
  let playableTokens: Token[] = tokens.filter(t => t.kind === "deg" || t.kind === "chroma");
  const lastChar = src[src.length - 1];

  // Controls
  if (lastChar === "+") return { caption, currentChain: ["+", "intro"] };
  if (lastChar === "#") return { caption, currentChain: ["#", "resolve"] };
  if (lastChar === "*") return { caption, currentChain: ["*", "mode"] };
  if (lastChar === "-") return { caption, currentChain: ["-", "rest"] };

  // Letters → T9 → playable (match to last playable token)
  if (/[A-Z]/.test(lastChar)) {
    const group = t9GroupLabel(lastChar) ?? "";
    const d = T9[lastChar]; // "2".."9"
    const t = playableTokens[playableTokens.length - 1];
    if (!t) return { caption, currentChain: [lastChar, group, d] };

    if (t.kind === "deg") {
      const lab = ordinalLabel(Number(t.d));
      if (t.up) {
        const loopLab = t.d === "1" ? "loop → 1st" : (t.d === "2" ? "loop → 2nd" : `loop → ${lab}`);
        currentChain = [lastChar, group, d, loopLab];
      } else {
        currentChain = [lastChar, group, d, lab];
      }
    } else {
      // chromatic for 0
      currentChain = [lastChar, group, d, t.c];
    }
    return { caption, currentChain };
  }

  // Digits → playable (match to last playable token)
  if (/[0-9]/.test(lastChar)) {
    const t = playableTokens[playableTokens.length - 1];
    if (!t) {
      if (lastChar === "8") return { caption, currentChain: ["8", "loop → 1st"] };
      if (lastChar === "9") return { caption, currentChain: ["9", "loop → 2nd"] };
      if (lastChar === "0") return { caption, currentChain: ["0", zeroPolicy === "rest" ? "rest" : "chromatic"] };
      return { caption, currentChain: [lastChar] };
    }
    if (t.kind === "deg") {
      const lab = ordinalLabel(Number(t.d));
      if (t.up) {
        const loopLab = t.d === "1" ? "loop → 1st" : (t.d === "2" ? "loop → 2nd" : `loop → ${lab}`);
        currentChain = [lastChar, loopLab];
      } else {
        currentChain = [lastChar, lab];
      }
    } else {
      currentChain = [lastChar, t.c];
    }
    return { caption, currentChain };
  }

  return { caption, currentChain };
}
// One-line degrees strip that mimics the input exactly (per character)
function buildDegreesLineTokens(raw: string, tokens: Token[], zeroPolicy: ZeroPolicy): string[] {
  const out: string[] = [];
  // playable token queue for letters/digits alignment
  const playable = tokens.filter(t => t.kind === "deg" || t.kind === "chroma");
  let pi = 0;

  const ordinal = (n: number) => (n===1?"1st":n===2?"2nd":n===3?"3rd":`${n}th`);
  const s = (raw || "").toUpperCase();

  for (let i = 0; i < s.length; i++) {
    const ch = s[i];

    // controls/rests mirror as-is to preserve alignment
    if (ch === "+" || ch === "#" || ch === "*" || ch === " ") { out.push(ch); continue; }
    if (ch === "-") { out.push("-"); continue; }

    // letters and digits both consume from playable queue (so 0 alternation & 8/9 loop are true to audio)
    if (/[A-Z0-9]/.test(ch)) {
      const t = playable[pi++];
      if (!t) { // no playable left (e.g., trailing controls); show a best-effort token
        if (ch === "8") { out.push("1st"); continue; }
        if (ch === "9") { out.push("2nd"); continue; }
        if (ch === "0") { out.push(zeroPolicy === "rest" ? "·" : "♭2/#4"); continue; }
        if (/[1-7]/.test(ch)) { out.push(ordinal(Number(ch))); continue; }
        // letter fallback (rare): show as thin dot to keep spacing
        out.push("·"); continue;
      }

      if (t.kind === "deg") {
        out.push(ordinal(Number(t.d))); // up flag already folded into final degree by your playback
      } else {
        // chromatic from zero alternation
        out.push(t.c); // "♭2" or "♯4"
      }
      continue;
    }

    // anything else → thin spacer dot (keeps positions honest without visual noise)
    out.push("·");
  }
  return out;
}

  /* =========================
     Live playback (2 passes per mode)
  ========================= */
  const NOTE_MS = 250; // base step
  const TOK_COUNT = Math.max(1, tokens.length);
  const SEGMENTS: KeyName[] = ["BbMajor","Cminor"]; // one pass: Major → Minor
const STEPS = TOK_COUNT * SEGMENTS.length;
  const startCore = useCallback(async () => {
    if (isRunning) return;
    try { (document.activeElement as HTMLElement | null)?.blur(); } catch {}
    await unlockCtx();
    // reset visuals
    nodesMajRef.current = []; nodesMinRef.current = [];
    setOverlays([]);
    setIsRunning(true);
    setShowHelper(false);             // hide helper during/after playback
    if (!hasPlayed) setHasPlayed(true);

    const ac = getCtx();
    const t0 = ac.currentTime + 0.12;
    t0Ref.current = t0;

    // schedule: walk through 4 segments, each plays full token list once
    let curMode: KeyName = SEGMENTS[0];
    let modeToggled = false; // reacts to '*' in-stream
    let writeIdx = 0;

    // if '+' at start, schedule intro once in current mode
    if (tokens[0]?.kind === "intro") {
      scheduleIntroChord(ac, t0, curMode);
    }

    for (let i = 0; i < STEPS; i++) {
      const segIdx = Math.floor(i / TOK_COUNT) % SEGMENTS.length;
      curMode = SEGMENTS[segIdx];
      const tok = tokens[i % TOK_COUNT];
      const at = t0 + i * (NOTE_MS / 1000);

      // mode toggles and resolve are instantaneous musical marks
      if (tok?.kind === "toggle") {
        modeToggled = !modeToggled;
        continue;
      }
      if (tok?.kind === "resolve") {
        const keyForResolve: KeyName = modeToggled
          ? (curMode === "BbMajor" ? "Cminor" : "BbMajor")
          : curMode;
        scheduleResolveCadence(ac, at, keyForResolve);
        continue;
      }
      if (tok?.kind === "intro") {
        // '+' after start is just ignored musically (intro is at the beginning)
        continue;
      }
      if (tok?.kind === "rest") continue;

      // pick key considering '*' toggled mode
      const keyNow: KeyName = modeToggled
        ? (curMode === "BbMajor" ? "Cminor" : "BbMajor")
        : curMode;

      // schedule tone
      let midi: number | null = null;
      if (tok.kind === "deg") midi = degreeToMidi(tok.d, keyNow, tok.up);
      else if (tok.kind === "chroma") {
        const pc = degreeToPcOffset(tok.c as DegLabel, keyNow);
        midi = snapPcToComfortableMidi(pc);
      }
      if (midi != null) {
        const name = midiToNoteName(midi);
        loadBuffer(name).then(buf => {
          const src = ac.createBufferSource(); src.buffer = buf;
          const g = ac.createGain();
          g.gain.setValueAtTime(0, at);
          g.gain.linearRampToValueAtTime(1, at + 0.01);
          g.gain.setTargetAtTime(0, at + 0.20, 0.05);
          src.connect(g).connect(ac.destination);
          try { src.start(at); src.stop(at + 0.25); } catch {}
        }).catch(()=>{});
      }
    }

    // RAF loop to draw a SINGLE clean string per pass
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    const stepDurSec = NOTE_MS / 1000;
    let lastDrawnStep = -1;

    function loopLive() {
      const now = getCtx().currentTime;
      const step = Math.floor((now - t0Ref.current) / stepDurSec);

      if (step > lastDrawnStep) {
        for (let s = lastDrawnStep + 1; s <= step; s++) {
          if (s < 0 || s >= STEPS) continue;

          const segIdx = Math.floor(s / TOK_COUNT) % SEGMENTS.length;
          const nowKey: KeyName = SEGMENTS[segIdx];
          const tok = tokens[s % TOK_COUNT];

          if (!tok || tok.kind === "rest" || tok.kind === "intro" || tok.kind === "resolve" || tok.kind === "toggle") {
            // no node for these; still update particles fade
            updateParticles(emberPool);
            continue;
          }

          // reset the correct deque at start of each segment so we draw a fresh string per pass
          const segStart = Math.floor(s / TOK_COUNT) * TOK_COUNT;
          if (s === segStart) {
            if (nowKey === "BbMajor") nodesMajRef.current = [];
            else nodesMinRef.current = [];
          }

          let spoke = -1;
          if (tok.kind === "deg") spoke = degToIndexForKey(tok.d, nowKey);
          else if (tok.kind === "chroma") spoke = DEGREE_ORDER.indexOf(tok.c as any);
          if (spoke >= 0) {
            appendTrail(spoke, nowKey);
            // sparkle at the node (confetti mode only)
            const svgEl = svgRef.current;
            if (svgEl) {
              const p = nodePosition(spoke, 36);
              const palette = [T.gold, T.minor, "#FFD36B"];
              spawnParticles(emberPool, maxEmbers, svgEl, p.x, p.y, palette, 8);
            }
          }
          updateParticles(emberPool);
        }
        lastDrawnStep = step;
      }

      if (step < STEPS) rafRef.current = requestAnimationFrame(loopLive);
      else setIsRunning(false);
    }
    rafRef.current = requestAnimationFrame(loopLive);
  }, [isRunning, hasPlayed, tokens, NOTE_MS, SEGMENTS, TOK_COUNT, T.gold, T.minor]);

  /* =========================
     Start wrappers + keyboard
  ========================= */
  const start = useCallback(() => {
    if (isRunning) {
      setIsRunning(false);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      setTimeout(() => startCore(), 30);
    } else {
      startCore();
    }
  }, [isRunning, startCore]);

  const onKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    if (!raw.trim()) return;
    start();
  }, [raw, start]);

  /* =========================
     Share URL (rebuildable)
  ========================= */
  const buildShareUrl = useCallback(() => {
  if (typeof window === "undefined") return ""; // SSR guard
  const params = new URLSearchParams();
  params.set("bg", bg);
  params.set("trail", trailMode);
  params.set("zero", zeroPolicy);
  params.set("q", encodeURIComponent(raw || ""));
  const url = new URL(window.location.href);
  url.search = params.toString();
  return url.toString();
}, [bg, trailMode, zeroPolicy, raw]);

  // ===== Export (Download): SVG-exact trails/glow + dynamic confetti =====
const onDownloadVideo = useCallback(async () => {
  setIsExporting(true);
  try {
    const svgEl = svgRef.current;
    if (!svgEl) { setIsExporting(false); return; }

    await unlockCtx();

    // 1) Snapshot background (circle + labels only)
    const rect = svgEl.getBoundingClientRect();
    const liveW = Math.max(2, Math.floor(rect.width));
    const liveH = Math.max(2, Math.floor(rect.height));
    const clone = svgEl.cloneNode(true) as SVGSVGElement;
    // remove live paths and particles
    clone.querySelectorAll("path").forEach(p => p.remove());
    const embersClone = clone.querySelector("#embers"); if (embersClone) embersClone.remove();
    const css = await buildEmbeddedFontStyle();
    const rawBg = serializeFullSvg(clone, liveW, liveH, css);
    const bgImg = await svgToImage(rawBg);

    // 2) Canvas + recorder
    const FRAME_W = 1080, FRAME_H = 1920, FPS = 30, SCALE = 2;
    const canvas = document.createElement("canvas");
    canvas.width = FRAME_W * SCALE; canvas.height = FRAME_H * SCALE;
    const c = canvas.getContext("2d") as CanvasRenderingContext2D;

    const ac = getCtx();
    const exportDst = ac.createMediaStreamDestination();
    const stream   = (canvas as any).captureStream(FPS) as MediaStream;
    const mixed    = new MediaStream([...stream.getVideoTracks(), ...exportDst.stream.getAudioTracks()]);
    const mimeType = pickRecorderMime();
    const chunks: BlobPart[] = [];
    const rec = new MediaRecorder(mixed, { mimeType });
    rec.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };

    // 3) Layout
    const SAFE_TOP = 160, SAFE_BOTTOM = 120, TOP_GAP = 10, SIDE_PAD = 48;
    const dateText = raw || "Type a phone number";

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

    // 4) Build schedule (same as live): Maj → Min → Maj → Min
    const NOTE_MS_E = 250;
    const TOK_COUNT_E = Math.max(1, tokens.length);
    const SEGMENTS_E: KeyName[] = ["BbMajor","Cminor"]; // one pass: Major → Minor
const STEPS_E = TOK_COUNT_E * SEGMENTS_E.length;

    // Audio schedule + exportPoints (spokes)
    const t0 = ac.currentTime + 0.25;
    let latestStopAt = t0;
    type ExpPoint = { k: "maj" | "min"; step: number; spoke: number };
    const exportPoints: ExpPoint[] = [];

    // helpers (intro/resolve)
    const scheduleIntroChordE = (at: number, key: KeyName) => scheduleIntroChord(ac, at, key);
    const scheduleResolveCadenceE = (at: number, key: KeyName) => scheduleResolveCadence(ac, at, key);

    // '+' at start → intro chord in the first segment’s mode
    if (tokens[0]?.kind === "intro") { scheduleIntroChordE(t0, SEGMENTS_E[0]); }

    function scheduleNote(name: string, at: number, dur = 0.25) {
      loadBuffer(name).then(buf => {
        const src = ac.createBufferSource(); src.buffer = buf;
        const g = ac.createGain();
        g.gain.setValueAtTime(0, at);
        g.gain.linearRampToValueAtTime(1, at + 0.01);
        g.gain.setTargetAtTime(0, at + 0.20, 0.05);
        src.connect(g); g.connect(exportDst); g.connect(ac.destination);
        try { src.start(at); src.stop(at + dur); } catch {}
      }).catch(()=>{});
      latestStopAt = Math.max(latestStopAt, at + dur);
    }

    let modeToggled = false;
    for (let i = 0; i < STEPS_E; i++) {
      const segIdx = Math.floor(i / TOK_COUNT_E) % SEGMENTS_E.length;
      const keyNowBase: KeyName = SEGMENTS_E[segIdx];
      const keyNow: KeyName = modeToggled
        ? (keyNowBase === "BbMajor" ? "Cminor" : "BbMajor")
        : keyNowBase;
      const kTag: "maj" | "min" = keyNow === "BbMajor" ? "maj" : "min";
      const tok = tokens[i % TOK_COUNT_E];
      const at = t0 + i * (NOTE_MS_E / 1000);

      if (tok?.kind === "toggle") { modeToggled = !modeToggled; continue; }
      if (tok?.kind === "resolve") { scheduleResolveCadenceE(at, keyNow); continue; }
      if (tok?.kind === "intro" || tok?.kind === "rest") continue;

      let midi: number | null = null;
      if (tok.kind === "deg") midi = degreeToMidi(tok.d, keyNow, tok.up);
      else if (tok.kind === "chroma") {
        const pc = degreeToPcOffset(tok.c as any, keyNow);
        midi = snapPcToComfortableMidi(pc);
      }
      if (midi != null) {
        scheduleNote(midiToNoteName(midi), at);
        // export point (spoke)
        const spoke = tok.kind === "deg"
          ? degToIndexForKey(tok.d, keyNow)
          : DEGREE_ORDER.indexOf(tok.c as any);
        if (spoke >= 0) exportPoints.push({ k: kTag, step: i, spoke });
      }
    }

    // 5) Pre-render per-step SVG overlays (glow exact)
    const TRAIL_WINDOW = 9999; // full string within pass
    const useGlow = true; // export always matches live glow when selected
    function overlaySvgForStep(stepIdx: number): string {
  const segIdx = Math.floor(stepIdx / TOK_COUNT_E) % SEGMENTS_E.length;

  let majVis: number[] = [];
  let minVis: number[] = [];

  if (segIdx === 0) {
    // MAJOR pass: draw Major up to current step; no Minor yet
    majVis = exportPoints
      .filter(p => p.k === "maj" && p.step <= stepIdx)
      .map(p => p.spoke);
    minVis = [];
  } else {
    // MINOR pass: keep Major FROZEN from its full pass (0..TOK_COUNT_E-1)
    majVis = exportPoints
      .filter(p => p.k === "maj" && p.step < TOK_COUNT_E)
      .map(p => p.spoke);
    // Draw Minor from start of its pass (TOK_COUNT_E) up to current step
    minVis = exportPoints
      .filter(p => p.k === "min" && p.step >= TOK_COUNT_E && p.step <= stepIdx)
      .map(p => p.spoke);
  }

  const pathMaj = majVis.length ? pathFromNodes(majVis) : "";
  const pathMin = minVis.length ? pathFromNodes(minVis) : "";

  const strokeWidth = trailMode.startsWith("glow") ? 1.15 : 1.4;
  const filterBlock = `
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
  `;

  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="${liveW}" height="${liveH}" shape-rendering="geometricPrecision">
      ${trailMode.startsWith("glow") ? filterBlock : ""}
      ${pathMaj ? `<path d="${pathMaj}" fill="none" stroke="${T.gold}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round" ${trailMode.startsWith("glow") ? `filter="url(#vt-glow)"` : ""} />` : ""}
      ${pathMin ? `<path d="${pathMin}" fill="none" stroke="${T.minor}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round" ${trailMode.startsWith("glow") ? `filter="url(#vt-glow)"` : ""} />` : ""}
    </svg>
  `;
}

    const overlays: HTMLImageElement[] = [];
    for (let i = 0; i < STEPS_E; i++) {
      const svgMarkup = overlaySvgForStep(i);
      const img = await svgToImage(svgMarkup);
      overlays.push(img);
    }

    // Per-frame confetti (dynamic)
    type CParticle = {
  // origin (node position) in 0..100 normalized SVG space
  ox: number; oy: number;
  // polar around origin
  r: number;    // radial distance
  vr: number;   // radial velocity
  ang: number;  // angle (radians)
  vang: number; // angular velocity (radians per frame @ ~60fps)
  // visuals
  life: number; size: number; color: string;
};
    const confetti: CParticle[] = [];
    const confColors = [T.gold, T.minor, "#FFD36B"];
    let lastSpawn = -1;

   function spawnConfettiForStep(stepIdx: number) {
  // allow pulses in Pulse-only mode and in +Confetti modes
  if (!(trailMode === "pulse" || trailMode.includes("+confetti"))) return;

  const pts = exportPoints.filter(p => p.step === stepIdx);
  if (!pts.length) return;

  for (const p of pts) {
    const node = nodePosition(p.spoke, 36); // 0..100 space
    const base = Math.random() * Math.PI * 2;

    // Main burst (visible outward puff, decent spread)
    const burst = 7;
    for (let i = 0; i < burst; i++) {
      const ang  = base + (Math.random() * 1.8 - 0.9);   // wider fan
      const vang = (Math.random() * 0.10 - 0.05);        // moderate spin
      const r0   = 0.25 + Math.random() * 0.35;          // close to node
      const vr0  = 0.80 + Math.random() * 0.60;          // strong outward puff

      confetti.push({
        ox: node.x, oy: node.y,
        r: r0, vr: vr0,
        ang, vang,
        life: 1.0,
        size: 0.9 + Math.random() * 0.5,
        color: confColors[(Math.random() * confColors.length) | 0],
      });
    }

    // Short sparks (extra kick; fade quicker)
    for (let s = 0; s < 2; s++) {
      confetti.push({
        ox: node.x, oy: node.y,
        r: 0.15 + Math.random() * 0.25,
        vr: 1.40 + Math.random() * 0.55,               // very visible impulse
        ang: Math.random() * Math.PI * 2,
        vang: (Math.random() * 0.12 - 0.06),
        life: 0.80,                                     // shorter-lived spark
        size: 1.0 + Math.random() * 0.5,
        color: confColors[(Math.random() * confColors.length) | 0],
      });
    }

    // Linger seeds (keep node alive after burst)
    for (let j = 0; j < 2; j++) {
      confetti.push({
        ox: node.x, oy: node.y,
        r: 1.1 + (Math.random() * 0.2 - 0.1),          // near preferred ring
        vr: -(0.06 + Math.random() * 0.08),            // slight inward pull
        ang: Math.random() * Math.PI * 2,
        vang: (Math.random() * 0.04 - 0.02),           // gentle spin
        life: 1.0,
        size: 0.9 + Math.random() * 0.4,
        color: confColors[(Math.random() * confColors.length) | 0],
      });
    }
  }
}
function updateAndDrawConfetti(ctx: CanvasRenderingContext2D, dtSec: number) {
  if (!(trailMode === "pulse" || trailMode.includes("+confetti"))) return; 

  // ---------- Phase tuning & constants (export-only) ----------
  const DT = dtSec * 60;        // normalize to ~frames
  // Launch phase gives a visible outward puff, then particles settle & pulse.
  const LAUNCH_WINDOW = 0.18;   // first ~18% of life (~180ms @60fps)

  const R0            = 1.15;   // preferred ring radius around node (normalized units)
  const R_MAX_LAUNCH  = 5.0;    // allow farther flight during launch
  const R_MAX_SETTLE  = 3.2;    // tighter radius once settled

  const RADIAL_DAMP_L = 0.985;  // lighter damping in launch → more flight
  const RADIAL_DAMP_S = 0.965;  // normal damping in settle
  const SPRING_L      = 0.020;  // very soft spring in launch
  const SPRING_S      = 0.060;  // stronger spring in settle → pull to ring

  const LIFE_DECAY    = 0.018;  // slower fade → linger
  const ANG_DAMP      = 0.995;  // keep spin longer

  // ---------- Update (polar around origin) ----------
  for (let i = confetti.length - 1; i >= 0; i--) {
    const p = confetti[i]; // {ox,oy,r,vr,ang,vang,life,size,color}

    // phase by age
    const age = 1 - p.life;
    const isLaunch = age < LAUNCH_WINDOW;

    // small noise so nothing gets “stuck”
    const radialJitter = (Math.random() - 0.5) * 0.02 * DT;
    const angJitter    = (Math.random() - 0.5) * 0.003 * DT;

    // phase-specific params
    const RADIAL_DAMP = isLaunch ? RADIAL_DAMP_L : RADIAL_DAMP_S;
    const SPRING      = isLaunch ? SPRING_L      : SPRING_S;
    const R_MAX       = isLaunch ? R_MAX_LAUNCH  : R_MAX_SETTLE;

    // extra outward kick early to guarantee a visible burst
    const flightBoost = isLaunch ? (0.30 * DT) : 0;

    // radial motion: damping + spring toward R0 + jitter + initial kick
    p.vr = p.vr * Math.pow(RADIAL_DAMP, DT)
         - SPRING * (p.r - R0) * DT
         + radialJitter
         + flightBoost;

    p.r  += p.vr * DT;

    // bounds with soft bounce
    if (p.r < 0)       { p.r = 0;        p.vr *= -0.6; }
    if (p.r > R_MAX)   { p.r = R_MAX;    p.vr *= -0.6; }

    // angular drift (slight damping + jitter)
    p.ang  += (p.vang + angJitter) * DT;
    p.vang *= Math.pow(ANG_DAMP, DT);

    // lifetime (linger)
    p.life -= LIFE_DECAY * DT;
    if (p.life <= 0) { confetti.splice(i, 1); }
  }

  // ---------- Draw (convert polar → cartesian in normalized 0..100 space) ----------
  ctx.save();
  ctx.translate(drawX * SCALE, drawY * SCALE);
  ctx.scale((drawW * SCALE) / 100, (drawH * SCALE) / 100);

  const prevComp = ctx.globalCompositeOperation;
  ctx.globalCompositeOperation = "source-over";

  for (const p of confetti) {
    const px = p.ox + p.r * Math.cos(p.ang);
    const py = p.oy + p.r * Math.sin(p.ang);

    const alpha = Math.max(0.35, Math.min(1, p.life));           // visibility floor
    const rPix  = p.size * (0.85 + 0.25 * (1 - p.life));         // subtle pulse

    ctx.globalAlpha = alpha;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(px, py, rPix, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = prevComp;
  ctx.restore();
}

  
    // 6) Recording loop
    // Fixed total time = discrete schedule + small tail
    const TOTAL_MS_FIXED = (STEPS_E * NOTE_MS_E) + 300;

    function drawFrameBase() {
      // bg
      c.fillStyle = (bg === "dark" ? themeDark.bg : themeLight.bg);
      c.fillRect(0, 0, canvas.width, canvas.height);
      // title line (number)
      c.save();
      c.font = `${datePx * SCALE}px Inter, system-ui, sans-serif`;
      c.textAlign = "center"; c.textBaseline = "middle";
      c.lineWidth = Math.max(2, Math.floor(datePx * 0.12)) * SCALE;
      c.strokeStyle = bg === "dark" ? "rgba(0,0,0,0.25)" : "rgba(0,0,0,0.12)";
      c.strokeText(dateText, (FRAME_W * SCALE)/2, dateBaselineY);
      c.fillStyle = (bg === "dark" ? themeDark.gold : themeLight.gold);
      c.fillText(dateText, (FRAME_W * SCALE)/2, dateBaselineY);
      c.restore();
      // panel border
      c.save();
      c.strokeStyle = (bg === "dark" ? themeDark.gold : themeLight.gold);
      c.lineWidth = 2 * SCALE;
      c.strokeRect((SIDE_PAD / 2) * SCALE, SAFE_TOP * SCALE, (FRAME_W - SIDE_PAD) * SCALE, (drawH + dateBlockH + TOP_GAP) * SCALE);
      c.restore();
      // base snapshot
      c.drawImage(bgImg, 0, 0, liveW, liveH, drawX * SCALE, drawY * SCALE, drawW * SCALE, drawH * SCALE);
    }

    const recStart = performance.now();
    rec.start();
    let lastTs = 0;
    let prevStep = -1;

    (function loop() {
      const nowTs = performance.now();
      const elapsed = nowTs - recStart;
      const i = Math.min(STEPS_E - 1, Math.floor(elapsed / NOTE_MS_E));
      const dtSec = lastTs ? (nowTs - lastTs) / 1000 : (1 / FPS);
      lastTs = nowTs;

      // base
      drawFrameBase();
      // overlay trails (glow/lines) pre-rendered for this step
      const ov = overlays[i];
if (trailMode !== "pulse" && ov) {
  c.drawImage(ov, 0, 0, liveW, liveH, drawX * SCALE, drawY * SCALE, drawW * SCALE, drawH * SCALE);
}
      // confetti per frame (spawn for new steps, then update/draw)
      if (trailMode === "pulse" || trailMode.includes("+confetti")) {

        if (i > prevStep) {
          for (let s = prevStep + 1; s <= i; s++) spawnConfettiForStep(s);
          prevStep = i;
        }
        updateAndDrawConfetti(c, dtSec);
      }

      if (elapsed < TOTAL_MS_FIXED) requestAnimationFrame(loop);
      else rec.stop();
    })();

    const recorded: Blob = await new Promise((res) => {
      rec.onstop = () => res(new Blob(chunks, { type: mimeType || "video/webm" }));
    });
    const outBlob = await convertToMp4Server(recorded);

    const safe = (raw || "number").replace(/[^A-Za-z0-9\-_.]+/g, "-");
    const a = document.createElement("a");
    a.download = `${safe}.mp4`;
    a.href = URL.createObjectURL(outBlob);
    document.body.appendChild(a); a.click(); a.remove();
  } catch (err) {
    console.error("[download] export error:", err);
    try { alert("Could not prepare video. Please try again."); } catch {}
  } finally {
    setIsExporting(false);
  }
}, [raw, bg, trailMode, zeroPolicy, tokens, T.gold, T.minor]);

  /* =========================
     Render (header + input + circle + actions)
  ========================= */
  return (
    <div style={{ minHeight:"100vh", background: T.bg, color: T.text, overflowX:"hidden" }}>
      <main className="vt-card" style={{ width:"100%", margin:"0 auto", padding:12, boxSizing:"border-box", maxWidth:520 }} ref={panelRef}>
        <section
          className="vt-panel minw0"
          style={{
            border: `1px solid ${T.gold}`,
            borderRadius:14,
            paddingTop:12,
            paddingBottom:12,
            background: T.card,
            display: "grid",
            gap: 10,
          }}
        >
          {/* Helper hint */}
          <div style={{ textAlign:"center", fontSize:13, color:T.muted, paddingInline:6 }}>
            Type a phone number. Allowed: A–Z, 0–9, <code style={{background:"#0F1821", padding:"1px 4px", borderRadius:6}}>+</code>, <code style={{background:"#0F1821", padding:"1px 4px", borderRadius:6}}>#</code>, <code style={{background:"#0F1821", padding:"1px 4px", borderRadius:6}}>*</code>, and <code style={{background:"#0F1821", padding:"1px 4px", borderRadius:6}}>-</code> (rest). Letters use T9 (e.g., 1-800-HELLO).
          </div>

          {/* Input */}
          <form
            className="minw0"
            onSubmit={(e)=>{ e.preventDefault(); if (raw.trim()) start(); }}
            style={{ display:"flex", gap:8, alignItems:"center", justifyContent:"center", flexWrap:"wrap", paddingInline: 2 }}
          >
            <input
              value={raw}
              onChange={e => {
  setRaw(sanitizePhoneInput(e.target.value));
  setShowHelper(true);            // re-show helper while typing
}}
              placeholder="+49 171-HELLO#*"
              inputMode="text"
              enterKeyHint="done"
              onKeyDown={onKeyDown}
              style={{
                boxSizing: "border-box",
                width: "min(92%, 34ch)",
                background: bg === "dark" ? "#0F1821" : "#F3F5F8",
                color: T.gold,
                border:`1px solid ${T.border}`,
                borderRadius:8,
                padding:"10px 12px",
                fontSize:16,
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Courier New", monospace',
                fontVariantNumeric: "tabular-nums",
              }}
              aria-label="Type a phone number"
            />
            
          </form>
          
{/* Transform helper (hide during playback) */}
{showHelper && (
  <div className="transform-helper" style={{
    marginTop:6, display:"flex", gap:8, justifyContent:"center", alignItems:"center", flexWrap:"wrap"
  }}>
    {currentChain && currentChain.length ? (
      currentChain.map((step, idx) => (
        <React.Fragment key={idx}>
          <span className="chain-node" style={{
            padding:"1px 6px", borderRadius:6,
            background: bg==="dark" ? "#0F1821" : "#F3F5F8",
            border:`1px solid ${T.border}`, color: T.text, whiteSpace:"nowrap", fontSize:13
          }}>
            {step}
          </span>
          {idx < currentChain.length - 1 ? (
            <span aria-hidden="true" style={{ opacity:0.6, fontSize:12 }}>→</span>
          ) : null}
        </React.Fragment>
      ))
    ) : null}
  </div>
)}

{/* Degrees strip (one line, mimics input; plain text, no glow) */}
        <div
  className="degrees-strip"
  aria-label="Degrees"
  style={{
    marginTop: 6,
    whiteSpace: "nowrap",        // single line
    overflowX: "auto",           // scroll if too long
    textAlign: "center",         // keeps it visually centered under input
    padding: "2px 4px",
  }}
>
  <span
    style={{
      fontSize: 16,              // smaller than input
      fontWeight: 400,
      letterSpacing: "-0.1px",   // a touch condensed
      color: T.text,             // plain text
      fontVariantNumeric: "tabular-nums",
    }}
  >
    {degreesStrip.length
      ? degreesStrip.join("\u2009")   /* narrow space (non-breaking-like) between tokens */
      : "Degrees will appear here…"}
  </span>
</div> 

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
              <circle cx="50" cy="50" r="36" stroke={bg==="dark" ? "rgba(230,235,242,0.15)" : "rgba(0,0,0,0.12)"} strokeWidth="2" fill="none" />
              {/* Nodes + labels */}
              {DEGREE_ORDER.map((lab, i) => {
                const p = nodePosition(i, 36);
                const lp = labelPlacement(i, p);
                return (
                  <g key={lab}>
                    <circle cx={p.x} cy={p.y} r="1.6" fill={bg==="dark" ? "rgba(230,235,242,0.5)" : "rgba(0,0,0,0.45)"} />
                    <text x={lp.x} y={lp.y} textAnchor={lp.anchor} dominantBaseline={lp.baseline} fontSize="4" fill={T.text} style={{ userSelect:"none", pointerEvents:"none" }}>
                      {lab}
                    </text>
                  </g>
                );
              })}
              {/* Live trails */}
              {trailMode !== "pulse" && overlays.map(ov => (
                <path
                  key={ov.id}
                  d={ov.path}
                  fill="none"
                  stroke={ov.color}
                  strokeWidth={trailMode.startsWith("lines") ? 1.4 : 1.15}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  filter={trailMode.startsWith("glow") ? "url(#vt-glow)" : undefined}
                />
              ))}
              <g id="embers" />
            </svg>
          </div>
                    {/* Actions (Play/Replay + Download + Share) */}
          <div className="vt-actions minw0" aria-label="Actions">
            {isExporting && (
              <div style={{ color: T.muted, fontSize: 12, textAlign: "center", width: "100%", marginTop: 6 }}>
                ⏺️ Recording…
              </div>
            )}
            <button
              onClick={() => start()}
              disabled={isRunning || !raw.trim()}
              style={{
                background: isRunning || !raw.trim() ? (bg === "dark" ? "#1a2430" : "#E8ECF2") : T.gold,
                color:      isRunning || !raw.trim() ? T.muted : (bg === "dark" ? "#081019" : "#FFFFFF"),
                border: "none",
                borderRadius: 999,
                padding: "10px 16px",
                fontWeight: 700,
                cursor: isRunning || !raw.trim() ? "not-allowed" : "pointer",
                fontSize: 16,
                minHeight: 40,
              }}
              title={hasPlayed ? "⟲ Replay" : "▶ Play"}
            >
              {hasPlayed ? "⟲ Replay" : "▶ Play"}
            </button>

            <div style={{ display:"flex", gap:10, alignItems:"center" }}>
              <button onClick={() => onDownloadVideo()} disabled={!raw.trim()} title="Download"
                style={{ background:"transparent", color: T.gold, border:"none", borderRadius:999, padding:"6px 10px", fontWeight:700, cursor:!raw.trim()?"not-allowed":"pointer", minHeight:32, fontSize:14 }}>
                💾 <span className="action-text">Download</span>
              </button>
              <button onClick={() => setShareOpen(true)} title="Share"
                style={{ background:"transparent", color: T.gold, border:"none", borderRadius:999, padding:"6px 10px", fontWeight:700, cursor:"pointer", minHeight:32, fontSize:14 }}>
                📤 <span className="action-text">Share</span>
              </button>
            </div>
          </div>

          {/* Controls */}
          <div style={{ display:"grid", gap:10, paddingInline:6 }}>
            <div style={{ display:"flex", gap:8, justifyContent:"center", flexWrap:"wrap" }}>
              {/* Trails */}
              <select value={trailMode} onChange={e=>setTrailMode(e.target.value as TrailMode)}
                style={{ background: bg==="dark" ? "#0F1821" : "#F3F5F8", color:T.text, border:`1px solid ${T.border}`, borderRadius:8, padding:"8px 10px", fontSize:14 }}>
                <option value="pulse">Trails: Pulse only</option>
                <option value="glow">Trails: Glow</option>
                <option value="lines">Trails: Lines</option>
                <option value="glow+confetti">Trails: Glow & Confetti</option>
                <option value="lines+confetti">Trails: Lines & Confetti</option>
              </select>

              {/* Background */}
              <select value={bg} onChange={e=>setBg(e.target.value as BgMode)}
                style={{ background: bg==="dark" ? "#0F1821" : "#F3F5F8", color:T.text, border:`1px solid ${T.border}`, borderRadius:8, padding:"8px 10px", fontSize:14 }}>
                <option value="dark">Background: Dark</option>
                <option value="light">Background: Light</option>
              </select>

              {/* Zero Policy */}
              <select value={zeroPolicy} onChange={e=>setZeroPolicy(e.target.value as ZeroPolicy)}
                style={{ background: bg==="dark" ? "#0F1821" : "#F3F5F8", color:T.text, border:`1px solid ${T.border}`, borderRadius:8, padding:"8px 10px", fontSize:14 }}>
                <option value="chromatic">Zero (0): Chromatic color</option>
                <option value="rest">Zero (0): Rest</option>
              </select>
            </div>
          </div>
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
              color: T.gold,
              textDecoration: "none",
              border: `1px solid ${T.border}`,
              borderRadius: 12,
              padding: "8px 14px",
              boxShadow: bg==="dark" ? "0 1px 3px rgba(0,0,0,0.2)" : "0 1px 3px rgba(0,0,0,0.06)",
            }}
            aria-label="Why these numbers explanation"
          >
            Why these numbers →
          </a>
        </div>
        {/* Share Sheet (modal) */}
<ShareSheet
  open={shareOpen}
  onClose={() => setShareOpen(false)}
  url={typeof window === "undefined" ? "" : buildShareUrl()}
  themeColors={{
    gold: T.gold,
    border: T.border,
    text: T.text,
    bg: bg === "dark" ? themeDark.card : themeLight.card,
  }}
/>
      </main>
    </div>
  );
}

/* =========================
   Share modal & Download logic
========================= */

function buildTweetIntent(text: string, url: string) {
  const u = new URL("https://twitter.com/intent/tweet");
  u.searchParams.set("text", text);
  u.searchParams.set("url", url);
  return u.toString();
}
// You can move this inside the component; kept separate for clarity
function ShareSheet({
  open, onClose, url, themeColors,
}: { open: boolean; onClose: () => void; url: string; themeColors: { gold: string; border: string; text: string; bg: string } }) {
  if (!open) return null;
  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.6)",
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
        zIndex: 9999,
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 520,
          background: themeColors.bg,
          borderTop: `1px solid ${themeColors.border}`,
          borderLeft: `1px solid ${themeColors.border}`,
          borderRight: `1px solid ${themeColors.border}`,
          borderRadius: "12px 12px 0 0",
          padding: 12,
          boxSizing: "border-box",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ textAlign: "center", color: themeColors.text, fontWeight: 800, marginBottom: 8 }}>
          Share your melody
        </div>

        {/* Copy Link */}
        <button
          onClick={async () => {
            try { await navigator.clipboard.writeText(url); } catch {}
            onClose();
          }}
          style={{
            width: "100%",
            padding: "10px 12px",
            marginBottom: 6,
            background: themeColors.gold,
            color: "#081019",
            borderRadius: 8,
            border: "none",
            fontWeight: 800,
          }}
        >
          🔗 Copy Link
        </button>

        {/* X / Twitter */}
        <a
          href={buildTweetIntent(`My number sings: ${url}`, url)}
          target="_blank"
          rel="noopener noreferrer"
          onClick={onClose}
          style={{
            display: "block",
            textAlign: "center",
            width: "100%",
            padding: "10px 12px",
            marginBottom: 6,
            background: "transparent",
            color: themeColors.gold,
            borderRadius: 8,
            border: `1px solid ${themeColors.border}`,
            textDecoration: "none",
            fontWeight: 800,
          }}
        >
          𝕏 Share on X
        </a>

        <button
          onClick={onClose}
          style={{
            width: "100%",
            padding: "8px 12px",
            marginTop: 8,
            background: themeColors.bg,
            color: themeColors.text,
            opacity: 0.7,
            borderRadius: 8,
            border: `1px solid ${themeColors.border}`,
            fontWeight: 700,
          }}
        >
          Close
        </button>
      </div>
    </div>
  );
}