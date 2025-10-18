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
  | { kind:"deg";    d:Diatonic; up?: boolean; src:string; srcChar?: string }
  | { kind:"chroma"; c:Chromatic;           src:"0";   srcChar?: string }
  | { kind:"intro" }            // '+' at start
  | { kind:"resolve" }          // '#'
  | { kind:"toggle" }           // '*'
;

const zeroFlipRef = { current: true };

function pushDigit(
  tokens: Token[],
  digit: string,
  zeroPolicy: ZeroPolicy,
  originChar?: string // ← original letter (e.g., 'C', 'W'), undefined for pure digits
) {
  if (digit === "0") {
    if (zeroPolicy === "rest") { tokens.push({ kind:"rest", char:"-" }); return; }
    const next: Chromatic = zeroFlipRef.current ? "♭2" : "♯4";
    zeroFlipRef.current = !zeroFlipRef.current;
    tokens.push({ kind:"chroma", c: next, src:"0", srcChar: originChar });
    return;
  }
  if ("1234567".includes(digit)) {
    tokens.push({ kind:"deg", d: digit as Diatonic, src: digit, srcChar: originChar });
    return;
  }
  if (digit === "8") {
    tokens.push({ kind:"deg", d:"1", up:true, src:"8", srcChar: originChar });
    return;
  }
  if (digit === "9") {
    tokens.push({ kind:"deg", d:"2", up:true, src:"9", srcChar: originChar });
    return;
  }
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
    if (/[A-Z]/.test(ch)) { pushDigit(out, T9[ch], zeroPolicy, ch); continue; }
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
  // Prefill from shared links: ?q=..., &trail=..., &bg=..., &zero=...
useEffect(() => {
  if (typeof window === "undefined") return;
  try {
    const sp = new URLSearchParams(window.location.search);

    // phrase
    const q = sp.get("q");
    if (q) setRaw(sanitizePhoneInput(q)); // rely on URLSearchParams decoding

    // optional: restore UI state
    const t = sp.get("trail");
    if (t === "pulse" || t === "glow" || t === "lines" || t === "glow+confetti" || t === "lines+confetti") {
      setTrailMode(t as TrailMode);
    }
    const b = sp.get("bg");
    if (b === "dark" || b === "light") setBg(b as BgMode);

    const z = sp.get("zero");
    if (z === "chromatic" || z === "rest") setZeroPolicy(z as ZeroPolicy);
  } catch {}
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
  // Playback-time UI toggles
const [showDegreesStrip, setShowDegreesStrip] = useState(true);     // hide during play, show otherwise
const [activeTick, setActiveTick] = useState<string[] | null>(null); // current shortened tick line

// Precomputed queue of shortened ticks aligned to playable notes
const tickQueueRef = useRef<string[][]>([]);
const tickIndexRef = useRef(0);
const tickClearRef = useRef<number | null>(null); // for clearing short tick timeouts
// One shortened tick per token (live; repeats every pass)
const tickStepsRef = useRef<string[][]>([]);
// Live Pulse-only: transient node pulse (centered dot “pop” on active node)
const [hotPulse, setHotPulse] = useState<{ x:number; y:number; color:string } | null>(null);
const hotPulseClearRef = useRef<number | null>(null);

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
    if (!trailMode.includes("+confetti")) return;
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
    if (!trailMode.includes("+confetti")) return;
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

  const ordinal = (n: number) => (n === 1 ? "1st" : n === 2 ? "2nd" : n === 3 ? "3rd" : `${n}th`);
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

  // Build caption from playable tokens (final degrees/chromatics)
  for (const t of tokens) {
    if (t.kind === "deg") caption.push(ordinal(Number(t.d)));
    else if (t.kind === "chroma") caption.push(t.c);
  }

  const src = (raw || "").toUpperCase();
  if (!src.length) return { caption, currentChain };

  const lastChar = src[src.length - 1];
  const playableTokens = tokens.filter((t) => t.kind === "deg" || t.kind === "chroma");
  const lastPlayable = playableTokens[playableTokens.length - 1];

  // Controls
  if (lastChar === "+") return { caption, currentChain: ["+", "intro"] };
  if (lastChar === "#") return { caption, currentChain: ["#", "resolve"] };
  if (lastChar === "*") return { caption, currentChain: ["*", "rest"] };
  if (lastChar === "-") return { caption, currentChain: ["-", "rest"] };

  // Letters
  if (/[A-Z]/.test(lastChar)) {
    const group = t9GroupLabel(lastChar);
    const g = group ?? "";
    const d = T9[lastChar]; // "2".."9"

    if (!lastPlayable) return { caption, currentChain: [lastChar, g, d] };

    if (lastPlayable.kind === "deg") {
      const lab = ordinal(Number(lastPlayable.d));
      if ((lastPlayable as any).up) {
        const loopLab =
          lastPlayable.d === "1" ? "loop → 1st" :
          lastPlayable.d === "2" ? "loop → 2nd" : `loop → ${lab}`;
        currentChain = [lastChar, g, d, loopLab];
      } else {
        currentChain = [lastChar, g, d, lab];
      }
      return { caption, currentChain };
    } else if (lastPlayable.kind === "chroma") {
      const chroma = lastPlayable.c; // "♭2" or "♯4"
      currentChain = [lastChar, g, d, chroma];
      return { caption, currentChain };
    } else {
      // Fallback guard
      return { caption, currentChain: [lastChar, g, d] };
    }
  }

  // Digits
  if (/[0-9]/.test(lastChar)) {
    if (!lastPlayable) {
      if (lastChar === "8") return { caption, currentChain: ["8", "loop → 1st"] };
      if (lastChar === "9") return { caption, currentChain: ["9", "loop → 2nd"] };
      if (lastChar === "0") return { caption, currentChain: ["0", zeroPolicy === "rest" ? "rest" : "chromatic"] };
      if (/[1-7]/.test(lastChar)) return { caption, currentChain: [lastChar, ordinal(Number(lastChar))] };
      return { caption, currentChain: [lastChar] };
    }

    if (lastPlayable.kind === "deg") {
      const lab = ordinal(Number(lastPlayable.d));
      if ((lastPlayable as any).up) {
        const loopLab =
          lastPlayable.d === "1" ? "loop → 1st" :
          lastPlayable.d === "2" ? "loop → 2nd" : `loop → ${lab}`;
        currentChain = [lastChar, loopLab];
      } else {
        currentChain = [lastChar, lab];
      }
      return { caption, currentChain };
    } else if (lastPlayable.kind === "chroma") {
      const chroma = lastPlayable.c;
      currentChain = [lastChar, chroma];
      return { caption, currentChain };
    } else {
      return { caption, currentChain: [lastChar] };
    }
  }

  // Anything else
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
// Build a shortened tick queue aligned to playable tokens (deg/chroma), skipping rests/controls
function buildShortTickQueue(raw: string, tokens: Token[], zeroPolicy: ZeroPolicy): string[][] {
  const s = (raw || "").toUpperCase();
  const playable = tokens.filter(t => t.kind === "deg" || t.kind === "chroma");
  const queue: string[][] = [];

  // Walk raw & playable in parallel: each letter/digit consumes next playable
  let pi = 0;
  const ordinal = (n: number) => (n===1?"1st":n===2?"2nd":n===3?"3rd":`${n}th`);

  for (let i = 0; i < s.length; i++) {
    const ch = s[i];

    // skip rests/controls for ticks (hyphen and '*' treated as rest per your spec)
    if (ch === "-" || ch === "*" || ch === "+" || ch === "#" || ch === " ") continue;

    if (/[A-Z0-9]/.test(ch)) {
      const t = playable[pi++];
      if (!t) continue;

      if (t.kind === "deg") {
        const dnum = Number(t.d);
        const lab = ordinal(dnum);
        if (/[A-Z]/.test(ch)) {
          // Letter: LETTER → T9-digit → (loop?) → DEG
          const d = T9[ch]; // "2".."9"
          if ((t as any).up) {
            const loopLab = t.d === "1" ? "loop → 1st" : (t.d === "2" ? "loop → 2nd" : `loop → ${lab}`);
            queue.push([ch, d, loopLab]);
          } else {
            queue.push([ch, d, lab]);
          }
        } else {
          // Digit input
          if (ch === "8") queue.push(["8", "loop → 1st"]);
          else if (ch === "9") queue.push(["9", "loop → 2nd"]);
          else if (/[1-7]/.test(ch)) queue.push([`→ ${lab}`]); // shortened: show only final degree
          else queue.push([lab]); // fallback
        }
      } else if (t.kind === "chroma") {
        const chroma = t.c; // "♭2" or "♯4"
        if (/[A-Z]/.test(ch)) {
          const d = T9[ch];
          queue.push([ch, d, chroma]);
        } else {
          queue.push([ch, chroma]);
        }
      }
    }
  }
  return queue;
}

  /* =========================
     Live playback (2 passes per mode)
  ========================= */
  const NOTE_MS = 250; // base step
  const TOK_COUNT = Math.max(1, tokens.length);
  const SEGMENTS: KeyName[] = ["BbMajor","Cminor","BbMajor","Cminor"]; // (Major→Minor) × 2
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
setShowDegreesStrip(false);       // hide degrees strip during playback

// Build the shortened tick queue for this run
tickQueueRef.current = buildShortTickQueue(raw, tokens, zeroPolicy);
tickIndexRef.current = 0;
setActiveTick(null);
if (tickClearRef.current) { clearTimeout(tickClearRef.current); tickClearRef.current = null; }
// Build one shortened tick per TOKEN (index-aligned); auto-repeats every pass
const ord = (n:number)=> (n===1?"1st":n===2?"2nd":n===3?"3rd":`${n}th`);
tickStepsRef.current = tokens.map(tok => {
  if (tok.kind === "rest")   return [];
  if (tok.kind === "chroma") {
    // 0: letter → digit → chroma OR digit → chroma
    return tok.srcChar ? [tok.srcChar, tok.src, tok.c] : [tok.src, tok.c];
  }
  // ToneDial won't emit 'dual', keep fallback
  if ((tok as any).kind === "dual") {
    const t:any = tok; return [`${ord(Number(t.a))} + ${ord(Number(t.b))}`];
  }
  if (tok.kind === "deg") {
    // From a letter? Show letter and digit always (even for 1..7)
    if (tok.srcChar) {
      if (tok.up && tok.src === "8") return [tok.srcChar, "8", "loop → 1st"];
      if (tok.up && tok.src === "9") return [tok.srcChar, "9", "loop → 2nd"];
      return [tok.srcChar, tok.src, ord(Number(tok.d))];
    }
    // From a digit:
    if (tok.up && tok.src === "8") return ["8", "loop → 1st"];
    if (tok.up && tok.src === "9") return ["9", "loop → 2nd"];
    return [`→ ${ord(Number(tok.d))}`];  // 1..7 input digit: arrow + degree only
  }
  return [];
});

if (!hasPlayed) setHasPlayed(true);

    const ac = getCtx();
    const t0 = ac.currentTime + 0.12;
    // If input contains '+', we play the intro at the start of every segment (Maj/Min/Maj/Min)
    const hasIntro = tokens.some(t => (t as any).kind === "intro");
    t0Ref.current = t0;

    // schedule: walk through 4 segments, each plays full token list once
    let curMode: KeyName = SEGMENTS[0];
    let modeToggled = false; // reacts to '*' in-stream
    let writeIdx = 0;

    

    for (let i = 0; i < STEPS; i++) {
      const segIdx = Math.floor(i / TOK_COUNT) % SEGMENTS.length;
      curMode = SEGMENTS[segIdx];
      const tok = tokens[i % TOK_COUNT];
      // New segment → restart ticks so they repeat each pass

      const at = t0 + i * (NOTE_MS / 1000);
      // 🔸 intro at segment start (if '+' present)
  if (hasIntro && (i % TOK_COUNT) === 0) {
    const keyForIntro: KeyName = modeToggled
      ? (curMode === "BbMajor" ? "Cminor" : "BbMajor")
      : curMode;
    scheduleIntroChord(ac, at, keyForIntro);
  }

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
      // At the start of each segment, treat as a fresh pass: play intro if '+' present


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

      // Skip non-playables; still let confetti fade if that mode is active
      if (!tok || tok.kind === "rest" || tok.kind === "intro" || tok.kind === "resolve" || tok.kind === "toggle") {
        if (trailMode.includes("+confetti")) updateParticles(emberPool);
        continue;
      }

      // Start of a new segment → fresh string per pass
      const segStart = Math.floor(s / TOK_COUNT) * TOK_COUNT;
      if (s === segStart) {
        if (nowKey === "BbMajor") nodesMajRef.current = [];
        else nodesMinRef.current = [];
      }

      // Compute spoke for playable token
      let spoke = -1;
      if (tok.kind === "deg") {
        spoke = degToIndexForKey(tok.d, nowKey);
      } else if (tok.kind === "chroma") {
        spoke = DEGREE_ORDER.indexOf(tok.c as any);
      }

      if (spoke >= 0) {
        // trails still update; Pulse mode simply doesn't render the path strokes
        appendTrail(spoke, nowKey);

        if (trailMode === "pulse") {
          // ── dot pulse on active node ──
          const p = nodePosition(spoke, 36);
          const color = nowKey === "BbMajor" ? T.gold : T.minor;
          setHotPulse({ x: p.x, y: p.y, color });
          if (hotPulseClearRef.current) clearTimeout(hotPulseClearRef.current);
          hotPulseClearRef.current = window.setTimeout(() => {
            setHotPulse(null);
            hotPulseClearRef.current = null;
          }, 220);

          // ── centered tick (shortened) — repeat per pass by index ──
          const tick = tickStepsRef.current[s % TOK_COUNT] || [];
          if (tick.length) {
            setActiveTick(tick);
            if (tickClearRef.current) clearTimeout(tickClearRef.current);
            const TICK_MS = Math.max(180, Math.min(NOTE_MS - 40, 220));
            tickClearRef.current = window.setTimeout(() => {
              setActiveTick(null);
              tickClearRef.current = null;
            }, TICK_MS);
          }
        } else if (trailMode.includes("+confetti")) {
          // non-Pulse modes: confetti only if +confetti
          const svgEl = svgRef.current;
          if (svgEl) {
            const p = nodePosition(spoke, 36);
            const palette = [T.gold, T.minor, "#FFD36B"];
            spawnParticles(emberPool, maxEmbers, svgEl, p.x, p.y, palette, 8);
          }
        }
      }

      // Advance/live-fade confetti particles only for +confetti modes
      if (trailMode.includes("+confetti")) updateParticles(emberPool);
    }

    lastDrawnStep = step;
  }

  // Continue or finish
  if (step < STEPS) {
    rafRef.current = requestAnimationFrame(loopLive);
  } else {
    // playback finished — clean up tick + pulse + restore degrees strip
    setIsRunning(false);
    setActiveTick(null);
    if (tickClearRef.current) {
      clearTimeout(tickClearRef.current);
      tickClearRef.current = null;
    }
    if (hotPulseClearRef.current) {
      clearTimeout(hotPulseClearRef.current);
      hotPulseClearRef.current = null;
    }
    setShowDegreesStrip(true);
  }
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
  params.set("q", raw || "");
  const url = new URL(window.location.href);
  url.search = params.toString();
  return url.toString();
}, [bg, trailMode, zeroPolicy, raw]);

// ===== Export (Download): Pulse bubbles + centered ticks (Pulse), or overlays (others) =====
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

    // 4) Schedule: (Major → Minor) × 2
    const NOTE_MS_E = 250;
    const TOK_COUNT_E = Math.max(1, tokens.length);
    const SEGMENTS_E: KeyName[] = ["BbMajor","Cminor","BbMajor","Cminor"];
    const STEPS_E = TOK_COUNT_E * SEGMENTS_E.length;
    const hasIntro = tokens.some(t => (t as any).kind === "intro");

    const t0 = ac.currentTime + 0.25;

    // schedule a note routed to exportDst
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
    }

    // Export-wrapped '+' and '#' (use scheduleNote → exportDst)
    function scheduleIntroChordE(at: number, key: KeyName) {
      (["1","3","5"] as Diatonic[]).forEach((d, idx) => {
        const midi = degreeToMidi(d, key);
        scheduleNote(midiToNoteName(midi), at + idx * 0.06);
      });
    }
    function scheduleResolveCadenceE(at: number, key: KeyName) {
      ([
        { d: "5" as Diatonic, t: at },
        { d: "1" as Diatonic, t: at + 0.12 },
      ]).forEach(({ d, t }) => {
        const midi = degreeToMidi(d, key);
        scheduleNote(midiToNoteName(midi), t);
      });
    }

    // Audio schedule + points
    type ExpPoint = { k: "maj" | "min"; step: number; spoke: number };
    const exportPoints: ExpPoint[] = [];

    // Optional: if you want '+' only at start (parity with live):
    if (tokens[0]?.kind === "intro") {
      scheduleIntroChordE(t0, SEGMENTS_E[0]);
    }

    let modeToggled = false;
    for (let i = 0; i < STEPS_E; i++) {
      const segIdx = Math.floor(i / TOK_COUNT_E) % SEGMENTS_E.length;
        // Reset '*' toggle at the start of each segment (each Maj/Min pass)
  if ((i % TOK_COUNT_E) === 0) modeToggled = false;
      const keyNowBase: KeyName = SEGMENTS_E[segIdx];
      const keyNow: KeyName = modeToggled
        ? (keyNowBase === "BbMajor" ? "Cminor" : "BbMajor")
        : keyNowBase;
      const kTag: "maj" | "min" = SEGMENTS_E[segIdx] === "BbMajor" ? "maj" : "min";
      const tok = tokens[i % TOK_COUNT_E];
      const at = t0 + i * (NOTE_MS_E / 1000);
        // Treat each segment as a separate pass: if input has '+', play intro at segment start
  if (hasIntro && (i % TOK_COUNT_E) === 0) {
    scheduleIntroChordE(at, keyNow);
  }

      if (tok?.kind === "toggle") { modeToggled = !modeToggled; continue; }
      if (tok?.kind === "intro") { continue; } // already handled at start (optional parity)
      if (tok?.kind === "resolve") { scheduleResolveCadenceE(at, keyNow); continue; }
      if (tok?.kind === "rest") continue;

      

      let midi: number | null = null;
      if (tok.kind === "deg") {
        midi = degreeToMidi(tok.d, keyNow, tok.up);
      } else if (tok.kind === "chroma") {
        const pc = degreeToPcOffset(tok.c as any, keyNow);
        midi = snapPcToComfortableMidi(pc);
      }
      if (midi != null) {
        scheduleNote(midiToNoteName(midi), at);
        let spoke = -1;
        if (tok.kind === "deg") {
          spoke = degToIndexForKey(tok.d, keyNow);
        } else if (tok.kind === "chroma") {
          spoke = DEGREE_ORDER.indexOf(tok.c as any);
        }
        if (spoke >= 0) exportPoints.push({ k: kTag, step: i, spoke });
      }
    }

    // 4a) Ticks (export) — build per-token and repeat each pass
    const playableStepFlags = new Array(STEPS_E).fill(false);
    for (const p of exportPoints) playableStepFlags[p.step] = true;

    const ord = (n:number)=> (n===1?"1st":n===2?"2nd":n===3?"3rd":`${n}th`);
const tickStepsExport: string[][] = tokens.map(tok => {
  if (tok.kind === "rest")   return [];
  if (tok.kind === "chroma") {
    return tok.srcChar ? [tok.srcChar, tok.src, tok.c] : [tok.src, tok.c];
  }
  if ((tok as any).kind === "dual") {
    const t:any = tok; return [`${ord(Number(t.a))} + ${ord(Number(t.b))}`];
  }
  if (tok.kind === "deg") {
    if (tok.srcChar) {
      if (tok.up && tok.src === "8") return [tok.srcChar, "8", "loop → 1st"];
      if (tok.up && tok.src === "9") return [tok.srcChar, "9", "loop → 2nd"];
      return [tok.srcChar, tok.src, ord(Number(tok.d))];
    }
    if (tok.up && tok.src === "8") return ["8", "loop → 1st"];
    if (tok.up && tok.src === "9") return ["9", "loop → 2nd"];
    return [`→ ${ord(Number(tok.d))}`];
  }
  return [];
});
    let currentTick: string[] | null = null;
    let tickUntil = 0;
    const TICK_MS = Math.max(NOTE_MS_E - 16, 180);

    // 5) Overlays (non-Pulse modes) — continuous trails across all segments
function overlaySvgForStep(stepIdx: number): string {
  // Use ALL spokes up to stepIdx for each color → continuous paths
  const majVis = exportPoints
    .filter(p => p.k === "maj" && p.step <= stepIdx)
    .map(p => p.spoke);
  const minVis = exportPoints
    .filter(p => p.k === "min" && p.step <= stepIdx)
    .map(p => p.spoke);

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

    const overlayImgs: HTMLImageElement[] = [];
    if (trailMode !== "pulse") {
      for (let k = 0; k < STEPS_E; k++) {
        const svgMarkup = overlaySvgForStep(k);
        const img = await svgToImage(svgMarkup);
        overlayImgs.push(img);
      }
    }

    // 6) Pulses (export) — polar model (Pulse & +confetti)
    type CParticle = { ox:number; oy:number; r:number; vr:number; ang:number; vang:number; life:number; size:number; color:string };
    const confetti: CParticle[] = [];
    const confColors = [T.gold, T.minor, "#FFD36B"];

    function spawnConfettiForStep(stepIdx: number) {
      if (!(trailMode === "pulse" || trailMode.includes("+confetti"))) return;
      const pts = exportPoints.filter(p => p.step === stepIdx);
      if (!pts.length) return;
      for (const p of pts) {
        const node = nodePosition(p.spoke, 36);
        const base = Math.random() * Math.PI * 2;
        const burst = 7;
        for (let i = 0; i < burst; i++) {
          const ang  = base + (Math.random() * 1.8 - 0.9);
          const vang = (Math.random() * 0.10 - 0.05);
          const r0   = 0.25 + Math.random() * 0.35;
          const vr0  = 0.80 + Math.random() * 0.60;
          confetti.push({ ox: node.x, oy: node.y, r: r0, vr: vr0, ang, vang, life: 1.0,
            size: 0.9 + Math.random() * 0.5, color: confColors[(Math.random() * confColors.length) | 0] });
        }
      }
    }

    function updateAndDrawConfetti(ctx: CanvasRenderingContext2D, dtSec: number) {
      if (!(trailMode === "pulse" || trailMode.includes("+confetti"))) return;

      const DT = dtSec * 60;
      const LAUNCH_WINDOW = 0.18;
      const R0 = 1.15, R_MAX_LAUNCH = 5.0, R_MAX_SETTLE = 3.2;
      const RADIAL_DAMP_L = 0.985, RADIAL_DAMP_S = 0.965;
      const SPRING_L = 0.020, SPRING_S = 0.060;
      const LIFE_DECAY = 0.018, ANG_DAMP = 0.995;

      for (let i = confetti.length - 1; i >= 0; i--) {
        const p = confetti[i];
        const age = 1 - p.life;
        const isLaunch = age < LAUNCH_WINDOW;

        const radialJitter = (Math.random() - 0.5) * 0.02 * DT;
        const angJitter    = (Math.random() - 0.5) * 0.003 * DT;

        const RADIAL_DAMP = isLaunch ? RADIAL_DAMP_L : RADIAL_DAMP_S;
        const SPRING      = isLaunch ? SPRING_L      : SPRING_S;
        const R_MAX       = isLaunch ? R_MAX_LAUNCH  : R_MAX_SETTLE;

        const flightBoost = isLaunch ? (0.30 * DT) : 0;

        p.vr = p.vr * Math.pow(RADIAL_DAMP, DT) - SPRING * (p.r - R0) * DT + radialJitter + flightBoost;
        p.r  += p.vr * DT;

        if (p.r < 0)     { p.r = 0;     p.vr *= -0.6; }
        if (p.r > R_MAX) { p.r = R_MAX; p.vr *= -0.6; }

        p.ang  += (p.vang + angJitter) * DT;
        p.vang *= Math.pow(ANG_DAMP, DT);

        p.life -= LIFE_DECAY * DT;
        if (p.life <= 0) { confetti.splice(i, 1); }
      }

      ctx.save();
      ctx.translate(drawX * SCALE, drawY * SCALE);
      ctx.scale((drawW * SCALE) / 100, (drawH * SCALE) / 100);
      const prevComp = ctx.globalCompositeOperation;
      ctx.globalCompositeOperation = "source-over";
      for (const p of confetti) {
        const px = p.ox + p.r * Math.cos(p.ang);
        const py = p.oy + p.r * Math.sin(p.ang);
        const alpha = Math.max(0.35, Math.min(1, p.life));
        const rPix  = p.size * (0.85 + 0.25 * (1 - p.life));
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

    // 6a) Draw helpers
    function drawFrameBase() {
      c.fillStyle = (bg === "dark" ? themeDark.bg : themeLight.bg);
      c.fillRect(0, 0, canvas.width, canvas.height);
      c.save();
      const inputFontScale = 0.75;
      c.font = `${datePx * inputFontScale * SCALE}px Inter, system-ui, sans-serif`;
      c.textAlign = "center"; c.textBaseline = "middle";
      c.lineWidth = Math.max(2, Math.floor(datePx * 0.12)) * SCALE;
      c.strokeStyle = bg === "dark" ? "rgba(0,0,0,0.25)" : "rgba(0,0,0,0.12)";
      const inputY = dateBaselineY - (20 * SCALE);
      c.strokeText(dateText, (FRAME_W * SCALE)/2, inputY);
      c.fillStyle = (bg === "dark" ? themeDark.gold : themeLight.gold);
      c.fillText(dateText, (FRAME_W * SCALE)/2, inputY);
      c.restore();
      c.save();
      c.strokeStyle = (bg === "dark" ? themeDark.gold : themeLight.gold);
      c.lineWidth = 2 * SCALE;
      c.strokeRect((SIDE_PAD / 2) * SCALE, SAFE_TOP * SCALE, (FRAME_W - SIDE_PAD) * SCALE, (drawH + dateBlockH + TOP_GAP) * SCALE);
      c.restore();
      c.drawImage(bgImg, 0, 0, liveW, liveH, drawX * SCALE, drawY * SCALE, drawW * SCALE, drawH * SCALE);
    }

    function drawTickOverlay(tick: string[]) {
      const text = tick.join(" \u2192 ");
      const centerX = (drawX + drawW / 2) * SCALE;
      const centerY = (drawY + drawH / 2) * SCALE;
      const MAX_W = drawW * 0.90 * SCALE;
      let fontPx = 68;
      c.save();
      c.textAlign = "center"; c.textBaseline = "middle";
      c.font = `${fontPx * SCALE}px Inter, system-ui, sans-serif`;
      let w = c.measureText(text).width;
      if (w > MAX_W) {
        const ratio = MAX_W / Math.max(w, 1);
        fontPx = Math.max(18, Math.floor(fontPx * ratio));
        c.font = `${fontPx * SCALE}px Inter, system-ui, sans-serif`;
      }
      const strokeW = Math.max(2, Math.round(fontPx * 0.18)) * SCALE;
      c.lineWidth = strokeW;
      c.strokeStyle = "rgba(0,0,0,0.35)";
      c.strokeText(text, centerX, centerY);
      c.fillStyle = T.text;
      c.fillText(text, centerX, centerY);
      c.restore();
    }

    

    // 7) Recording loop
    const TOTAL_MS_FIXED = (STEPS_E * NOTE_MS_E) + 300;
    const recStart = performance.now();
    rec.start();
    // Fallback: ensure recorder stops even if loop aborts (prevents crazy durations)
const hardStopTimer = window.setTimeout(() => {
  try { rec.stop(); } catch {}
}, TOTAL_MS_FIXED + 500);

    let lastTs = 0;
    let prevStep = -1;

    (function loop() {
      const nowTs = performance.now();
      const elapsed = nowTs - recStart;
      const i = Math.min(STEPS_E - 1, Math.floor(elapsed / NOTE_MS_E));
      const dtSec = lastTs ? (nowTs - lastTs) / 1000 : (1 / FPS);
      lastTs = nowTs;

      drawFrameBase();

      // overlays only for non-Pulse modes
      if (trailMode !== "pulse") {
        const ovImg = overlayImgs[i];
        if (ovImg) {
          c.drawImage(ovImg, 0, 0, liveW, liveH, drawX * SCALE, drawY * SCALE, drawW * SCALE, drawH * SCALE);
        }
      }

      // Pulse-only: trigger a tick on each new playable step (repeat per pass)
      if (trailMode === "pulse" && i > prevStep && playableStepFlags[i]) {
        currentTick = tickStepsExport[i % TOK_COUNT_E] || null;
        tickUntil = nowTs + TICK_MS;
      }

      // Pulses engine (Pulse and +confetti)
      if (trailMode === "pulse" || trailMode.includes("+confetti")) {
        if (i > prevStep) {
          for (let s = prevStep + 1; s <= i; s++) spawnConfettiForStep(s);
          prevStep = i;
        }
        updateAndDrawConfetti(c, dtSec);
      }

      // draw tick last (on top)
      if (trailMode === "pulse") {
        if (currentTick && nowTs < tickUntil) drawTickOverlay(currentTick);
        else currentTick = null;
      }

      if (elapsed < TOTAL_MS_FIXED) requestAnimationFrame(loop);
      else rec.stop();
    })();

    const recorded: Blob = await new Promise((res) => {
  rec.onstop = () => {
    try {
      // stop canvas capture tracks and audio tracks to finalize duration cleanly
      try { stream.getTracks().forEach(t => t.stop()); } catch {}
      try { exportDst.stream.getTracks().forEach(t => t.stop()); } catch {}
      try { window.clearTimeout(hardStopTimer); } catch {}
    } finally {
      res(new Blob(chunks, { type: mimeType || "video/webm" }));
    }
  };
});

    // Convert to MP4
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
{/* Shortened transform tick (hide in Pulse-only mode) */}
{trailMode !== "pulse" && (
  <div
    className="tick-line"
    style={{
      height: 18,
      marginTop: 6,
      overflow: "hidden",
      textAlign: "center",
      opacity: isRunning && activeTick && activeTick.length ? 0.95 : 0,
      transition: "opacity 120ms ease",
      pointerEvents: "none",
      whiteSpace: "nowrap",
    }}
  >
    {activeTick && activeTick.length ? (
      <span style={{ fontSize: 12, color: T.text }}>
        {activeTick.map((step, i) => (
          <React.Fragment key={i}>
            <span>{step}</span>
            {i < activeTick.length - 1 ? (
              <span style={{ opacity: 0.6 }}> → </span>
            ) : null}
          </React.Fragment>
        ))}
      </span>
    ) : null}
  </div>
)}

{/* Degrees strip (one line, mimics input; plain text, no glow) */}
        {showDegreesStrip && (
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
)}

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
              {/* Live Pulse-only overlay: centered ticks + node pulse */}
{trailMode === "pulse" && (
  <>
    {/* centered ticks (live) */}
    {isRunning && activeTick && activeTick.length > 0 && (
      <text
        x="50"
        y="50"
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize="6.8"          // tweak 6.5–8 as needed
        fill={T.text}
        style={{ userSelect: "none", pointerEvents: "none" }}
      >
        {activeTick.join(" \u2192 ")}
      </text>
    )}

    {/* dot pulse on the active node (brief pop) */}
    {hotPulse && (
      <>
        {/* bright dot */}
        <circle
          cx={hotPulse.x}
          cy={hotPulse.y}
          r="2.2"
          fill={hotPulse.color}
          opacity="0.95"
        />
        {/* soft ring */}
        <circle
          cx={hotPulse.x}
          cy={hotPulse.y}
          r="4.4"
          fill="none"
          stroke={hotPulse.color}
          strokeWidth="0.6"
          opacity="0.45"
        />
      </>
    )}
  </>
)}
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