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
   Musical mapping (B♭ Major / C minor)
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
  const base = (up ? 5 : 4) * 12; // favor around C4/C5
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
function sanitizePhoneInput(s: string): string {
  return s.replace(/[^0-9A-Za-z\+\#\*\- ]/g, "").toUpperCase();
}
const T9: Record<string, string> = {
  A:"2",B:"2",C:"2", D:"3",E:"3",F:"3", G:"4",H:"4",I:"4",
  J:"5",K:"5",L:"5", M:"6",N:"6",O:"6", P:"7",Q:"7",R:"7",S:"7",
  T:"8",U:"8",V:"8", W:"9",X:"9",Y:"9",Z:"9",
};

type ZeroPolicy = "chromatic" | "rest" | "ticks";
type Token =
  | { kind:"rest"; char:"-"}
  | { kind:"deg";    d:Diatonic; up?: boolean; src:string; srcChar?: string }
  | { kind:"chroma"; c:Chromatic;           src:"0";   srcChar?: string }
  | { kind:"intro" }            // '+'
  | { kind:"resolve" }          // '#'
  | { kind:"toggle" }           // '*'
;

const zeroFlipRef = { current: true };

function pushDigit(tokens: Token[], digit: string, zeroPolicy: ZeroPolicy, originChar?: string) {
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
  if (s.startsWith("+")) { out.push({ kind:"intro" }); i = 1; }

  for (; i < s.length; i++) {
    const ch = s[i];
    if (ch === "-") { out.push({ kind:"rest", char:"-" }); continue; }
    if (ch === "#") { out.push({ kind:"resolve" }); continue; }
    if (ch === "*") { out.push({ kind:"toggle" }); continue; } // short rest (handled later)
    if (/[A-Z]/.test(ch)) { pushDigit(out, T9[ch], zeroPolicy, ch); continue; }
    if (/[0-9]/.test(ch)) { pushDigit(out, ch, zeroPolicy); continue; }
  }
  return out;
}

/* =========================
   Export helpers
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
  } catch {
    return inputBlob;
  }
}
async function buildEmbeddedFontStyle(): Promise<string> {
  return `text{font-family:ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Courier New", monospace; font-variant-numeric: tabular-nums;}`;
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
    try { if ((window as any).MediaRecorder?.isTypeSupported?.(t)) return t; } catch {}
  }
  return "video/webm";
}

/* =========================
   Component
========================= */
type TrailMode = "pulse" | "glow" | "lines" | "glow+confetti" | "lines+confetti";

export default function ToneDialPage() {
  /* CSS + Prefill */
  useEffect(() => {
    const css = `
      .vt-card, .vt-panel, .vt-actions { box-sizing: border-box; }
      .vt-panel { width: 100%; max-width: 100%; min-width: 0; position: relative; }
      .vt-card  { padding-inline: 16px; }
      .vt-panel, .vt-actions { padding-inline: 14px; }
      @media (max-width: 390px) { .vt-card  { padding-inline: calc(16px + env(safe-area-inset-left)) calc(16px + env(safe-area-inset-right)); }
        .vt-panel { padding-inline: calc(14px + env(safe-area-inset-left)) calc(14px + env(safe-area-inset-right)); }
        .vt-actions { padding-inline: calc(14px + env(safe-area-inset-left)) calc(14px + env(safe-area-inset-right)); }
        .action-text{ display: none !important; } }
      @media (max-width: 360px) { .vt-card  { padding-inline: calc(20px + env(safe-area-inset-left)) calc(20px + env(safe-area-inset-right)); }
        .vt-panel { padding-inline: calc(18px + env(safe-area-inset-left)) calc(18px + env(safe-area-inset-right)); }
        .vt-actions { padding-inline: calc(18px + env(safe-area-inset-left)) calc(18px + env(safe-area-inset-right)); } }
      .vt-actions { display:flex; flex-wrap:wrap; justify-content:center; align-items:center; column-gap:10px; row-gap:8px; }
      .minw0 { min-width:0 !important; }
    `;
    const el = document.createElement("style"); el.textContent = css; document.head.appendChild(el);
    return () => { try { document.head.removeChild(el); } catch {} };
  }, []);
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const sp = new URLSearchParams(window.location.search);
      const q = sp.get("q"); if (q) setRaw(sanitizePhoneInput(q));
      const t = sp.get("trail"); if (t === "pulse" || t === "glow" || t === "lines" || t === "glow+confetti" || t === "lines+confetti") setTrailMode(t as TrailMode);
      const b = sp.get("bg"); if (b === "dark" || b === "light") setBg(b as BgMode);
      const z = sp.get("zero");
if (z === "chromatic" || z === "rest" || z === "ticks") setZeroPolicy(z as ZeroPolicy);
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

  // Playback-time UI (degrees strip vs aligned labels)
  const [showDegreesStrip, setShowDegreesStrip] = useState(true);

  // Pulse overlay
  const [hotPulse, setHotPulse] = useState<{ x:number; y:number; color:string } | null>(null);
  const hotPulseClearRef = useRef<number | null>(null);

  // Refs
  const svgRef = useRef<SVGSVGElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const rafRef = useRef<number>(0);
  const t0Ref = useRef<number>(0);
  // Caption canvas (live): top input line + bottom labels; highlighted in sync
const captionCanvasRef = useRef<HTMLCanvasElement | null>(null);
const captionSizeRef = useRef<{ w:number; h:number }>({ w: 0, h: 0 });
// Live caption highlight: playable index within the current segment
const playedIdxRef = useRef(0);

// Map playable token index → source char index (for highlighting)
// and char index → playable index (for bottom labels); built at start
const playableToCharRef = useRef<number[]>([]);
const charToPlayableRef = useRef<number[]>([]);

  // Trails
  type Overlay = { id: "maj"|"min"; color: string; path: string };
  const [overlays, setOverlays] = useState<Overlay[]>([]);
  const nodesMajRef = useRef<number[]>([]);
  const nodesMinRef = useRef<number[]>([]);
  const TRAIL_N = 9999;

  // confetti (live)
  type Ember = { x: number; y: number; vx: number; vy: number; life: number; el: SVGCircleElement };
  const emberPool = useRef<Ember[]>([]).current;
  const maxEmbers = 80;

  // Tokens
  const tokens = useMemo(() => tokenizePhone(raw, zeroPolicy), [raw, zeroPolicy]);

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


// Render ordinals + accidental numbers as superscript in a single token.
// Handles:
//  - "1st", "2nd", "3rd", "4th"      → superscript suffix
//  - "1st inv", "2nd inv"            → superscript suffix, keep " inv"
//  - "♭2", "♯4", "♭2/♯4"            → superscript the numerals after accidentals (both sides)
function renderWithSupers(token: string): React.ReactNode {
  // 1) Inversions: "1st inv" / "2nd inv" / "3rd inv" / "4th inv"
  const invMatch = token.match(/^(\d+)(st|nd|rd|th)\s+(inv)$/i);
  if (invMatch) {
    const [, num, suf, tail] = invMatch;
    return (
      <>
        {num}
        <sup style={{ fontSize: "0.65em", verticalAlign: "super" }}>{suf}</sup> {tail}
      </>
    );
  }

  // 2) Pure ordinals: "1st" / "2nd" / "3rd" / "4th"
  const ordMatch = token.match(/^(\d+)(st|nd|rd|th)$/i);
  if (ordMatch) {
    const [, num, suf] = ordMatch;
    return (
      <>
        {num}
        <sup style={{ fontSize: "0.65em", verticalAlign: "super" }}>{suf}</sup>
      </>
    );
  }

  // 3) Accidentals: "♭2", "♯4", and the combined "♭2/♯4"
  //    We superscript the digits after each accidental sign.
  if (/^[♭♯]\d+(\/[♭♯]\d+)?$/.test(token)) {
    const parts = token.split("/");
    const renderPart = (p: string) => {
      const m = p.match(/^([♭♯])(\d+)$/);
      if (!m) return <>{p}</>;
      const [, acc, num] = m;
      return (
        <>
          {acc}
          <sup style={{ fontSize: "0.65em", verticalAlign: "super" }}>{num}</sup>
        </>
      );
    };
    return (
      <>
        {renderPart(parts[0])}
        {parts[1] ? (
          <>
            <span>/</span>
            {renderPart(parts[1])}
          </>
        ) : null}
      </>
    );
  }

  // Default: return as-is
  return <>{token}</>;
}

// Build caption degrees (from tokens) and a per-char transform chain (from raw input + tokens)
// - Caption shows only final playable targets (degrees or chromatic), no rests or control marks.
// - Transform chain shows the mapping for *each typed character* (Major preview).
function buildCaptionAndCurrentChain(
  raw: string,
  tokens: Token[],
  zeroPolicy: ZeroPolicy
): { caption: string[]; currentChain: string[] } {
  const caption: string[] = [];
  let currentChain: string[] = [];
  const ordinal = (n: number) => (n===1?"1st":n===2?"2nd":n===3?"3rd":`${n}th`);

  // caption = final playable tokens only
  for (const t of tokens) {
    if (t.kind === "deg") caption.push(ordinal(Number(t.d)));
    else if (t.kind === "chroma") caption.push(t.c);
  }

  const src = (raw || "").toUpperCase();
  if (!src.length) return { caption, currentChain };

  const lastChar = src[src.length - 1];
  const playableTokens = tokens.filter((t) => t.kind === "deg" || t.kind === "chroma");
  const lastPlayable = playableTokens[playableTokens.length - 1];

  // Controls (preview)
  if (lastChar === "+") return { caption, currentChain: ["+", "intro"] };
  if (lastChar === "#") return { caption, currentChain: ["#", "resolve"] };
  if (lastChar === "*") return { caption, currentChain: ["*", "rest"] };
  if (lastChar === "-") return { caption, currentChain: ["-", "rest"] };

  // Letters
  if (/[A-Z]/.test(lastChar)) {
    const group = t9GroupLabel(lastChar) ?? "";
    const d = T9[lastChar]; // "2".."9"
    if (!lastPlayable) return { caption, currentChain: [lastChar, group, d] };

    if (lastPlayable.kind === "deg") {
      const lab = ordinal(Number(lastPlayable.d));
      if ((lastPlayable as any).up) {
        const loopLab =
          lastPlayable.d === "1" ? "loop → 1st" :
          lastPlayable.d === "2" ? "loop → 2nd" : `loop → ${lab}`;
        currentChain = [lastChar, group, d, loopLab];
      } else {
        currentChain = [lastChar, group, d, lab];
      }
      return { caption, currentChain };
    } else {
      // letter→chroma (0)
      currentChain = [lastChar, group, d, lastPlayable.c];
      return { caption, currentChain };
    }
  }

  // Digits
  if (/[0-9]/.test(lastChar)) {
    if (!lastPlayable) {
      if (lastChar === "8") return { caption, currentChain: ["8", "1st inv"] };
      if (lastChar === "9") return { caption, currentChain: ["9", "2nd inv"] };
      if (lastChar === "0") return { caption, currentChain: ["0", zeroPolicy === "rest" ? "rest" : "chromatic"] };
      if (/[1-7]/.test(lastChar)) return { caption, currentChain: [lastChar, ordinal(Number(lastChar))] };
      return { caption, currentChain: [lastChar] };
    }

    if (lastPlayable.kind === "deg") {
      const lab = ordinal(Number(lastPlayable.d));
      if ((lastPlayable as any).up) {
        const invLab = (lastPlayable.src === "8") ? "1st inv" : (lastPlayable.src === "9") ? "2nd inv" : lab;
        currentChain = [lastChar, invLab];
      } else {
        currentChain = [lastChar, lab];
      }
      return { caption, currentChain };
    } else {
      currentChain = [lastChar, lastPlayable.c];
      return { caption, currentChain };
    }
  }

  return { caption, currentChain };
}

// One-line degrees strip that mimics the input exactly (per character)
function buildDegreesLineTokens(raw: string, tokens: Token[], zeroPolicy: ZeroPolicy): string[] {
  const out: string[] = [];
  const playable = tokens.filter(t => t.kind === "deg" || t.kind === "chroma");
  let pi = 0;
  const ordinal = (n: number) => (n===1?"1st":n===2?"2nd":n===3?"3rd":`${n}th`);
  const s = (raw || "").toUpperCase();

  for (let i = 0; i < s.length; i++) {
    const ch = s[i];

    // mirror controls to keep alignment
    if (ch === "+" || ch === "#" || ch === "*" || ch === " ") { out.push(ch); continue; }
    if (ch === "-") { out.push("-"); continue; }

    if (/[A-Z0-9]/.test(ch)) {
      // NEW: Zero as Rest → render '-' and DO NOT consume a playable token
  if (ch === "0" && zeroPolicy === "rest") { out.push("-"); continue; }

      const t = playable[pi++];
      if (!t) {
        if (ch === "8") { out.push("1st inv"); continue; }
        if (ch === "9") { out.push("2nd inv"); continue; }
        if (ch === "0") { out.push(zeroPolicy === "rest" ? "·" : "♭2/#4"); continue; }
        if (/[1-7]/.test(ch)) { out.push(ordinal(Number(ch))); continue; }
        out.push("·"); continue;
      }

      if (t.kind === "deg") {
        if (t.src === "8") out.push("1st inv");
        else if (t.src === "9") out.push("2nd inv");
        else out.push(ordinal(Number(t.d)));
      } else {
        out.push(t.c); // "♭2" or "♯4"
      }
      continue;
    }

    out.push("·");
  }
  return out;
}
  // Helper + simple pre-play degrees strip (keep existing behavior)
  const { caption: captionDegrees, currentChain } = useMemo(() => {
    return buildCaptionAndCurrentChain(raw, tokens, zeroPolicy);
  }, [raw, tokens, zeroPolicy]);
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
     Live playback (Major×2 → Minor×2)
  ========================= */
  const NOTE_MS = 250; // base step
  const TOK_COUNT = Math.max(1, tokens.length);
  const SEGMENTS: KeyName[] = ["BbMajor","BbMajor","Cminor","Cminor"];
  const STEPS = TOK_COUNT * SEGMENTS.length;

  // ------- Chord helpers (live) --------
  // Diatonic wrap helper: 1..7 degrees
  const wrapDeg = (n: number): Diatonic => (["1","2","3","4","5","6","7"][(n - 1 + 7) % 7] as Diatonic);

  // Triad degrees for a given root degree (diatonic stacks)
  function triadDegrees(root: Diatonic): [Diatonic, Diatonic, Diatonic] {
    const r = Number(root);
    return [wrapDeg(r), wrapDeg(r + 2), wrapDeg(r + 4)];
  }

  // Schedule a single note (utility for live)
  function scheduleNoteLive(ac: AudioContext, at: number, d: Diatonic, key: KeyName, up?: boolean, dur = 0.25) {
    const midi = degreeToMidi(d, key, up);
    const name = midiToNoteName(midi);
    loadBuffer(name).then(buf => {
      const src = ac.createBufferSource(); src.buffer = buf;
      const g = ac.createGain();
      g.gain.setValueAtTime(0, at);
      g.gain.linearRampToValueAtTime(1, at + 0.01);
      g.gain.setTargetAtTime(0, at + 0.20, 0.05);
      src.connect(g).connect(ac.destination);
      try { src.start(at); src.stop(at + dur); } catch {}
    }).catch(()=>{});
  }
  

  // Schedule a triad chord (close voicing around C4/C5)
  function scheduleTriadLive(ac: AudioContext, at: number, rootDeg: Diatonic, key: KeyName, dur = 0.25) {
    const [r, t3, t5] = triadDegrees(rootDeg);
    // Play simultaneously for clarity
    scheduleNoteLive(ac, at, r,  key, false, dur);
    scheduleNoteLive(ac, at, t3, key, false, dur);
    scheduleNoteLive(ac, at, t5, key, false, dur);
  }

  // Schedule inversions:
  //  - 1st inv of I/i → [3,5,1↑]
  //  - 2nd inv of II/ii° → [6,2↑,4↑] (we keep compact voicing by lifting wrapped tones)
  function scheduleFirstInvTonic(ac: AudioContext, at: number, key: KeyName, isMinor: boolean, dur = 0.25) {
    // I/i degrees
    const d3: Diatonic = "3";
    const d5: Diatonic = "5";
    const d1: Diatonic = "1";
    scheduleNoteLive(ac, at, d3, key, false, dur);
    scheduleNoteLive(ac, at, d5, key, false, dur);
    scheduleNoteLive(ac, at, d1, key, true,  dur); // raise the root for inversion feel
  }
  function scheduleSecondInvSupertonic(ac: AudioContext, at: number, key: KeyName, isMinor: boolean, dur = 0.25) {
    // II in major: [2,4,6]; II° in minor: same diatonic degrees but quality differs in pitch map
    const d6: Diatonic = "6";
    const d2: Diatonic = "2";
    const d4: Diatonic = "4";
    scheduleNoteLive(ac, at, d6, key, false, dur);
    scheduleNoteLive(ac, at, d2, key, true,  dur);  // lift to keep compact
    scheduleNoteLive(ac, at, d4, key, true,  dur);
  }
  /* =========================
   Intro / Resolve helpers (LIVE)
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

// ---- Label helpers for canvas caption ----

// Roman for 1..7 (Major)
function romanMajor(d: Diatonic): string {
  switch (d) {
    case "1": return "I";
    case "2": return "ii";
    case "3": return "iii";
    case "4": return "IV";
    case "5": return "V";
    case "6": return "vi";
    case "7": return "vii°";
  }
}
// Roman for 1..7 (Minor natural)
function romanMinor(d: Diatonic): string {
  switch (d) {
    case "1": return "i";
    case "2": return "ii°";
    case "3": return "♭III";
    case "4": return "iv";
    case "5": return "v";
    case "6": return "♭VI";
    case "7": return "♭VII";
  }
}

// Superscript painter on canvas for ordinals and accidentals (♭2, ♯4, "1st inv")
function drawTokenWithSup(ctx: CanvasRenderingContext2D, text: string, x: number, y: number): number {
  // "1st inv"
  let m = text.match(/^(\d+)(st|nd|rd|th)\s+(inv)$/i);
  if (m) {
    const [ , num, suf, tail ] = m;
    ctx.fillText(num, x, y);
    const wNum = ctx.measureText(num).width;
    const supSize = Math.round(parseFloat(ctx.font) * 0.65);
    const baseSize = ctx.font;
    // Reduce & raise for superscript
    const prev = ctx.font;
    ctx.font = `${supSize}px Inter, system-ui, sans-serif`;
    ctx.fillText(suf, x + wNum, y - supSize * 0.35);
    const wSup = ctx.measureText(suf).width;
    ctx.font = prev;
    ctx.fillText(" " + tail, x + wNum + wSup, y);
    return wNum + wSup + ctx.measureText(" " + tail).width;
  }


  // "1st", "2nd" ...
  m = text.match(/^(\d+)(st|nd|rd|th)$/i);
  if (m) {
    const [ , num, suf ] = m;
    ctx.fillText(num, x, y);
    const wNum = ctx.measureText(num).width;
    const supSize = Math.round(parseFloat(ctx.font) * 0.65);
    const prev = ctx.font;
    ctx.font = `${supSize}px Inter, system-ui, sans-serif`;
    ctx.fillText(suf, x + wNum, y - supSize * 0.35);
    const wSup = ctx.measureText(suf).width;
    ctx.font = prev;
    return wNum + wSup;
  }

  // "♭2", "♯4", or "♭2/♯4"
  if (/^[♭♯]\d+(\/[♭♯]\d+)?$/.test(text)) {
    const parts = text.split("/");
    const drawAcc = (part: string, x0: number) => {
      const mm = part.match(/^([♭♯])(\d+)$/);
      if (!mm) { ctx.fillText(part, x0, y); return ctx.measureText(part).width; }
      const [, acc, num] = mm;
      ctx.fillText(acc, x0, y);
      const wAcc = ctx.measureText(acc).width;
      const supSize = Math.round(parseFloat(ctx.font) * 0.65);
      const prev = ctx.font;
      ctx.font = `${supSize}px Inter, system-ui, sans-serif`;
      ctx.fillText(num, x0 + wAcc, y - supSize * 0.35);
      const wNum = ctx.measureText(num).width;
      ctx.font = prev;
      return wAcc + wNum;
    };
    let dx = 0;
    dx += drawAcc(parts[0], x);
    if (parts[1]) {
      ctx.fillText("/", x + dx, y);
      dx += ctx.measureText("/").width;
      dx += drawAcc(parts[1], x + dx);
    }
    return dx;
  }

  // default
  ctx.fillText(text, x, y);
  return ctx.measureText(text).width;
}
// Measure width of a token rendered like drawTokenWithSup, without drawing.
function measureTokenWithSup(ctx: CanvasRenderingContext2D, text: string): number {
  // Inversions: "1st inv" / "2nd inv"
  let m = text.match(/^(\d+)(st|nd|rd|th)\s+(inv)$/i);
  if (m) {
    const [, num, suf, tail] = m;
    const prev = ctx.font;
    const wNum = ctx.measureText(num).width;
    const supSize = Math.round(parseFloat(prev) * 0.65);
    ctx.font = `${supSize}px Inter, system-ui, sans-serif`;
    const wSup = ctx.measureText(suf).width;
    ctx.font = prev;
    const wTail = ctx.measureText(" " + tail).width;
    return wNum + wSup + wTail;
  }

  // Pure ordinals
  m = text.match(/^(\d+)(st|nd|rd|th)$/i);
  if (m) {
    const [, num, suf] = m;
    const prev = ctx.font;
    const wNum = ctx.measureText(num).width;
    const supSize = Math.round(parseFloat(prev) * 0.65);
    ctx.font = `${supSize}px Inter, system-ui, sans-serif`;
    const wSup = ctx.measureText(suf).width;
    ctx.font = prev;
    return wNum + wSup;
  }

  // Accidentals and combined
  if (/^[♭♯]\d+(\/[♭♯]\d+)?$/.test(text)) {
    const parts = text.split("/");
    const prev = ctx.font;
    const supSize = Math.round(parseFloat(prev) * 0.65);
    const measureAcc = (part: string) => {
      const mm = part.match(/^([♭♯])(\d+)$/);
      if (!mm) return ctx.measureText(part).width;
      const [, acc, num] = mm;
      const wAcc = ctx.measureText(acc).width;
      ctx.font = `${supSize}px Inter, system-ui, sans-serif`;
      const wNum = ctx.measureText(num).width;
      ctx.font = prev;
      return wAcc + wNum;
    };
    let w = measureAcc(parts[0]);
    if (parts[1]) w += ctx.measureText("/").width + measureAcc(parts[1]);
    return w;
  }

  return ctx.measureText(text).width;
}
// Label for a playable token for a given pass key
function labelForTokenCanvas(tok: Token, key: KeyName): string {
  // Symbols
  if (tok.kind === "rest") return "·";
  if (tok.kind === "intro") return "+";
  if (tok.kind === "resolve") return "#";
  if (tok.kind === "toggle") return "*";

  const isMinor = (key === "Cminor");
  const isLetter = !!(tok as any).srcChar;

  if (tok.kind === "chroma") return "♭2/♯4";

  if (tok.kind === "deg") {
    // Letters: ordinals or loop markers
    if (isLetter) {
      if (tok.up && tok.src === "8") return "⟳1";          // loop 1
      if (tok.up && tok.src === "9") return "⟳2";          // loop 2
      // Normal letter ordinal
      const n = Number(tok.d);
      return n === 1 ? "1st" : n === 2 ? "2nd" : n === 3 ? "3rd" : `${n}th`;
    }

    // Digits:
    if ("1234567".includes(tok.src)) {
      return isMinor ? romanMinor(tok.d) : romanMajor(tok.d);
    }
    if (tok.src === "8") return "1st inv";
    if (tok.src === "9") return "2nd inv";
  }

  return "·";
}
function drawCaptionCanvas(activePlayableIdx: number, keyNow: KeyName) {
  const cvs = captionCanvasRef.current;
  if (!cvs) return;
  const ctx = cvs.getContext("2d");
  if (!ctx) return;

  // Fit to device pixel ratio
  const cssW = Math.round(cvs.getBoundingClientRect().width || 360);
  const cssH = Math.round(cvs.getBoundingClientRect().height || 68);
  const ratio = (window.devicePixelRatio || 1);
  if (cvs.width !== cssW * ratio || cvs.height !== cssH * ratio) {
    cvs.width = cssW * ratio;
    cvs.height = cssH * ratio;
  }
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);

  // Clear
  ctx.clearRect(0, 0, cssW, cssH);

  // Source and playable
  const src = (raw || "").toUpperCase().split("");
  const playable = tokens.filter(t => t.kind === "deg" || t.kind === "chroma");

  // Build labels array per current pass, aligned to chars (non-playables = "")
  const labels: string[] = new Array(src.length).fill("");
  {
    let p = 0;
    for (let ci = 0; ci < src.length && p < playable.length; ci++) {
     if (/[A-Z0-9]/.test(src[ci])) {
  // NEW: Zero as Rest → label '-' and DO NOT consume a playable
  if (src[ci] === "0" && zeroPolicy === "rest") {
    labels[ci] = "-";
    continue;
  }
  labels[ci] = labelForTokenCanvas(playable[p], keyNow);
  p++;
} 
    }
  }

  // Build display elements for the top line: token or separator " · "
  // We must keep a map from display element -> original char index (for highlight & bottom labels)
  type Disp = { txt: string; isSep: boolean; charIndex: number }; // charIndex=-1 for seps
  const disp: Disp[] = [];
  for (let ci = 0; ci < src.length; ci++) {
    // push token
    disp.push({ txt: src[ci], isSep: false, charIndex: ci });
    // push separator after every token (matches your reference look)
    disp.push({ txt: " · ", isSep: true, charIndex: -1 });
  }

  // Active char index (from playable index)
  const p2c = playableToCharRef.current;
  const activeChar = (activePlayableIdx >= 0 && activePlayableIdx < p2c.length) ? p2c[activePlayableIdx] : -1;

  // Typography
  const topPx = 16;
  const botPx = 13; // slightly smaller than before
  const gap = 4;
  const padX = 8;
  const topFont = `${topPx}px Inter, system-ui, sans-serif`;
  const botFont = `${botPx}px Inter, system-ui, sans-serif`;

  // Measure per-display-element widths using top-line font
  ctx.font = topFont;
  ctx.textBaseline = "alphabetic";
  const widths = disp.map(d => ctx.measureText(d.txt).width);
  const totalW = widths.reduce((a, b) => a + b, 0);
  let x = Math.max(padX, (cssW - totalW) / 2);
  const topY = Math.round(topPx + 2);
  const botY = Math.round(topY + gap + botPx + 2);

  // Colors
  const activeColor = (keyNow === "BbMajor") ? T.gold : T.minor;

  // ---- Draw top line (tokens + separators) ----
  for (let i = 0; i < disp.length; i++) {
    const el = disp[i];
    if (el.isSep) {
      ctx.fillStyle = T.muted; // separators in muted color
      ctx.fillText(el.txt, x, topY);
      x += widths[i];
      continue;
    }
    // token
    const isActive = (el.charIndex === activeChar);
    ctx.fillStyle = isActive ? activeColor : T.text;
    ctx.fillText(el.txt, x, topY);
    x += widths[i];
  }

  // ---- Draw bottom line (labels under tokens only; skip separators) ----
  x = Math.max(padX, (cssW - totalW) / 2);
  ctx.font = botFont;
  for (let i = 0; i < disp.length; i++) {
    const el = disp[i];
    if (el.isSep) {
      // advance over separator width; no label under it
      x += widths[i];
      continue;
    }
    const lab = labels[el.charIndex] || "";
    if (lab) {
  const isActive = (el.charIndex === activeChar);
  ctx.fillStyle = isActive ? activeColor : T.text;

  // Chroma '♭2/♯4': ♭2 on baseline, ♯4 one line below (like "inv")
if (lab === "♭2/♯4") {
  const topLab = "♭2";
  const botLab = "♯4";
  const wTop = measureTokenWithSup(ctx, topLab);
  const wBot = measureTokenWithSup(ctx, botLab);
  const xTop = x + (widths[i] - wTop) / 2;
  const xBot = x + (widths[i] - wBot) / 2;

  // ♭2 on baseline
  drawTokenWithSup(ctx, topLab, xTop, botY);
  // ♯4 one line below, using the same offset as "inv"
  const offset = (botPx * 1) + 2; // small gap; tweak +/−2px if needed
  drawTokenWithSup(ctx, botLab, xBot, botY + offset);
}
  // Stack inversions '1st inv' / '2nd inv'
  else if (/^\d+(st|nd|rd|th)\s+inv$/i.test(lab)) {
    
    const topLab = lab.replace(/\s+inv$/i, "");
    const botLab = "inv";
    // Scale factor to match ♭2/♯4 compactness
  const INV_SCALE = 0.6; // try 0.5–0.65 to taste
  const prevFont = ctx.font;

  // Use smaller font for both pieces, so widths & draw match
  const smallPx = Math.round(botPx * INV_SCALE);
  ctx.font = `${smallPx}px Inter, system-ui, sans-serif`;

    const wTop = measureTokenWithSup(ctx, topLab);
    const wBot = ctx.measureText(botLab).width;
    const xTop = x + (widths[i] - wTop) / 2;
    const xBot = x + (widths[i] - wBot) / 2;
    // Align the ordinal to the same baseline as other helpers,
  // and place "inv" on a second line below it.
  const yTop2 = botY;                  // same baseline as single-line labels
  const yBot2 = botY + (botPx + 2);    // next line down (+ small gap)

    
    drawTokenWithSup(ctx, topLab, xTop, yTop2);
    ctx.fillText(botLab, xBot, yBot2);
  }
  // Single-line labels: Romans, ordinals, plain ♭2 or ♯4
  else {
    const wLab = measureTokenWithSup(ctx, lab);
    const xLab = x + (widths[i] - wLab) / 2;
    drawTokenWithSup(ctx, lab, xLab, botY);
  }
}
    x += widths[i];
  }
}
  

  const startCore = useCallback(async () => {
    if (isRunning) return;
    try { (document.activeElement as HTMLElement | null)?.blur(); } catch {}
    await unlockCtx();

    // reset visuals
    nodesMajRef.current = []; nodesMinRef.current = [];
    setOverlays([]);
    setIsRunning(true);
    drawCaptionCanvas(-1, "BbMajor"); // initial paint, no highlight
    setShowHelper(false);
    setShowDegreesStrip(false);
    if (!hasPlayed) setHasPlayed(true);

    const ac = getCtx();
    const t0 = ac.currentTime + 0.12;
    t0Ref.current = t0;

    // If input contains '+', play intro at the start of every segment
    const hasIntro = tokens.some(t => (t as any).kind === "intro");

    // Build mapping playableIndex → charIndex and charIndex → playableIndex for highlighting
const srcStr = (raw || "").toUpperCase();
const playable = tokens.filter(t => t.kind === "deg" || t.kind === "chroma");

const p2c: number[] = [];                         // playable index -> char index
const c2p: number[] = Array(srcStr.length).fill(-1); // char index -> playable index (optional)
let ci = 0;                                       // scan source chars left-to-right

for (let p = 0; p < playable.length; p++) {
  // advance to the next source char that can host a playable
  while (ci < srcStr.length) {
    const ch = srcStr[ci];

    if (/[A-Z0-9]/.test(ch)) {
      // NEW: if the source char is '0' and zeroPolicy is 'rest', skip it (no playable)
      if (ch === "0" && zeroPolicy === "rest") { ci++; continue; }

      // map this playable 'p' to source char index 'ci'
      p2c.push(ci);
      c2p[ci] = p2c.length - 1;
      ci++;                                      // move past this char for the next playable
      break;                                     // go to next playable
    }
    ci++;                                        // non-alnum chars are skipped
  }
}


playableToCharRef.current = p2c;
charToPlayableRef.current = c2p;
// Initialize caption highlight playable index for the new run
playedIdxRef.current = 0;

    // --------- LIVE scheduling loop (letters = melody, digits = chords) ----------
    for (let i = 0; i < STEPS; i++) {
      const segIdx = Math.floor(i / TOK_COUNT) % SEGMENTS.length;
      const curKey: KeyName = SEGMENTS[segIdx];
      const isMinorPass = (curKey === "Cminor");
      const tok = tokens[i % TOK_COUNT];

      const at = t0 + i * (NOTE_MS / 1000);

      // '+' at segment start
      if (hasIntro && (i % TOK_COUNT) === 0) {
        scheduleIntroChord(ac, at, curKey);
      }

      // Controls
      if (!tok) continue;
      if (tok.kind === "toggle") { /* '*' = REST (no toggle) */ continue; }
      if (tok.kind === "intro") { /* handled at segment start */ continue; }
      if (tok.kind === "resolve") {
        scheduleResolveCadence(ac, at, curKey);
        continue;
      }
      if (tok.kind === "rest") continue;

      // Letters (melody) vs Digits (chords) detection via srcChar
      if (tok.kind === "deg" || tok.kind === "chroma") {
        const isLetter = !!tok.srcChar;

        // ----- LETTERS: single note, with loop-1/loop-2 behaviors -----
        if (isLetter) {
          if (tok.kind === "deg") {
            // Loop-1 letters (TUV): src==="8" → play 1 + 1↑oct
            if (tok.up && tok.src === "8") {
              scheduleNoteLive(ac, at, "1", curKey, false);
              scheduleNoteLive(ac, at, "1", curKey, true );
            }
            // Loop-2 letters (WXYZ): src==="9" → play 1 + 2↑oct
            else if (tok.up && tok.src === "9") {
              scheduleNoteLive(ac, at, "1", curKey, false);
              scheduleNoteLive(ac, at, "2", curKey, true );
            }
            // Normal letter: play mapped degree
            else {
              scheduleNoteLive(ac, at, tok.d, curKey, tok.up);
            }
          } else {
            // Letter that mapped to chroma (rare, but keep consistent)
          const pc = degreeToPcOffset(tok.c as DegLabel, curKey);
const midi = snapPcToComfortableMidi(pc);
const name = midiToNoteName(midi);
const isZeroChroma = (tok as any).src === "0";
const useTickEnv = isZeroChroma && (zeroPolicy === "ticks");

loadBuffer(name).then(buf => {
  const src = ac.createBufferSource(); src.buffer = buf;
  const g = ac.createGain();
  if (useTickEnv) {
    g.gain.setValueAtTime(0, at);
    g.gain.linearRampToValueAtTime(0.45, at + 0.006);
    g.gain.setTargetAtTime(0, at + 0.05, 0.05);
    src.connect(g).connect(ac.destination);
    try { src.start(at); src.stop(at + 0.10); } catch {}
  } else {
    g.gain.setValueAtTime(0, at);
    g.gain.linearRampToValueAtTime(1, at + 0.01);
    g.gain.setTargetAtTime(0, at + 0.20, 0.05);
    src.connect(g).connect(ac.destination);
    try { src.start(at); src.stop(at + 0.25); } catch {}
  }
}).catch(()=>{});  
          }
        }
        // ----- DIGITS: chords (triads) / inversions / chroma -----
        else {
          if (tok.kind === "deg") {
            // 1–7 → diatonic triads
            if ("1234567".includes(tok.src)) {
              scheduleTriadLive(ac, at, tok.d, curKey);
            }
            // 8 / 9 → inversions (per pass)
            else if (tok.src === "8") {
              scheduleFirstInvTonic(ac, at, curKey, isMinorPass);
            } else if (tok.src === "9") {
              scheduleSecondInvSupertonic(ac, at, curKey, isMinorPass);
            }
          } else if (tok.kind === "chroma") {
            // 0 → chromatic color
           const pc = degreeToPcOffset(tok.c as DegLabel, curKey);
const midi = snapPcToComfortableMidi(pc);
const name = midiToNoteName(midi);
const isZeroChroma = (tok as any).src === "0";
const useTickEnv = isZeroChroma && (zeroPolicy === "ticks");

loadBuffer(name).then(buf => {
  const src = ac.createBufferSource(); src.buffer = buf;
  const g = ac.createGain();
  if (useTickEnv) {
    g.gain.setValueAtTime(0, at);
    g.gain.linearRampToValueAtTime(0.45, at + 0.006);
    g.gain.setTargetAtTime(0, at + 0.05, 0.05);
    src.connect(g).connect(ac.destination);
    try { src.start(at); src.stop(at + 0.10); } catch {}
  } else {
    g.gain.setValueAtTime(0, at);
    g.gain.linearRampToValueAtTime(1, at + 0.01);
    g.gain.setTargetAtTime(0, at + 0.20, 0.05);
    src.connect(g).connect(ac.destination);
    try { src.start(at); src.stop(at + 0.25); } catch {}
  }
}).catch(()=>{}); 
          }
        }
      }
    }

  // ---------- RAF loop: trails node→node (letters & digits equal) + pulse ----------
  if (rafRef.current) cancelAnimationFrame(rafRef.current);
  const stepDurSec = NOTE_MS / 1000;
  let lastDrawnStep = -1;

  function loopLive() {
    const now = getCtx().currentTime;
    const step = Math.floor((now - t0Ref.current) / stepDurSec);

    if (step > lastDrawnStep) {
  for (let s = lastDrawnStep + 1; s <= step; s++) {
    if (s < 0 || s >= STEPS) continue;

    // Which segment are we in now (Maj, Maj, Min, Min)?
    const segIdx = Math.floor(s / TOK_COUNT) % SEGMENTS.length;
    const nowKey: KeyName = SEGMENTS[segIdx];

    // Reset trails AND the playable highlight index at the *start* of each segment
    const segStart = Math.floor(s / TOK_COUNT) * TOK_COUNT;
    if (s === segStart) {
      if (nowKey === "BbMajor") nodesMajRef.current = [];
      else nodesMinRef.current = [];
      playedIdxRef.current = 0; // << reset playable index at segment boundary
    }

    const tok = tokens[s % TOK_COUNT];

    // Skip non-playables; still let confetti fade in +confetti modes
    if (!tok || tok.kind === "rest" || tok.kind === "intro" || tok.kind === "resolve" || tok.kind === "toggle") {
      if (trailMode.includes("+confetti")) updateParticles(emberPool);
      continue;
    }

    // Compute spoke for trail: treat letters & digits equally as degrees
    let spoke = -1;
    if (tok.kind === "deg") {
      spoke = degToIndexForKey(tok.d, nowKey);
    } else if (tok.kind === "chroma") {
      spoke = DEGREE_ORDER.indexOf(tok.c as any);
    }

    if (spoke >= 0) {
      // Trails always update
      appendTrail(spoke, nowKey);

      // ✅ Highlight using persistent playable index (skips '+', '-', '*', etc.)
      drawCaptionCanvas(playedIdxRef.current, nowKey);
      playedIdxRef.current++; // advance only for playables

      // Pulse-only or +confetti visuals (unchanged)
      if (trailMode === "pulse") {
        const p = nodePosition(spoke, 36);
        const color = nowKey === "BbMajor" ? T.gold : T.minor;
        setHotPulse({ x: p.x, y: p.y, color });
        if (hotPulseClearRef.current) clearTimeout(hotPulseClearRef.current);
        hotPulseClearRef.current = window.setTimeout(() => {
          setHotPulse(null);
          hotPulseClearRef.current = null;
        }, 220);
      } else if (trailMode.includes("+confetti")) {
        const svgEl = svgRef.current;
        if (svgEl) {
          const p = nodePosition(spoke, 36);
          const palette = [T.gold, T.minor, "#FFD36B"];
          spawnParticles(emberPool, maxEmbers, svgEl, p.x, p.y, palette, 8);
        }
      }
    }

    // Fade confetti between steps in +confetti modes
    if (trailMode.includes("+confetti")) updateParticles(emberPool);
  }

  lastDrawnStep = step;
}

    if (step < STEPS) {
      rafRef.current = requestAnimationFrame(loopLive);
    } else {
      // clean up + restore degrees strip
      setIsRunning(false);
      if (hotPulseClearRef.current) { clearTimeout(hotPulseClearRef.current); hotPulseClearRef.current = null; }
      setShowDegreesStrip(true);
    }
  }
  rafRef.current = requestAnimationFrame(loopLive);
}, [isRunning, hasPlayed, tokens, NOTE_MS, SEGMENTS, TOK_COUNT, T.gold, T.minor, trailMode]);

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
    if (typeof window === "undefined") return "";
    const params = new URLSearchParams();
    params.set("bg", bg);
    params.set("trail", trailMode);
    params.set("zero", zeroPolicy);
    params.set("q", raw || "");
    const url = new URL(window.location.href);
    url.search = params.toString();
    return url.toString();
  }, [bg, trailMode, zeroPolicy, raw]);

/* =========================
   Export (Download): parity with live
========================= */
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
    // Short tick envelope for zeros in "ticks" mode (EXPORT)
function scheduleShortNote(name: string, at: number) {
  loadBuffer(name).then(buf => {
    const src = ac.createBufferSource(); src.buffer = buf;
    const g = ac.createGain();
    g.gain.setValueAtTime(0, at);
    g.gain.linearRampToValueAtTime(0.45, at + 0.006); // quick pop
    g.gain.setTargetAtTime(0, at + 0.05, 0.05);       // fast decay
    src.connect(g); g.connect(exportDst); g.connect(ac.destination);
    try { src.start(at); src.stop(at + 0.10); } catch {}
  }).catch(()=>{});
}

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
    const CAPTION_TO_CIRCLE_GAP = 12; // try 12–20px
    const drawY = goldTop + CAPTION_TO_CIRCLE_GAP;

    // 4) Schedule: Major×2 → Minor×2
    const NOTE_MS_E = 250;
    const TOK_COUNT_E = Math.max(1, tokens.length);
    const SEGMENTS_E: KeyName[] = ["BbMajor","BbMajor","Cminor","Cminor"];
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

    // Export chord helpers
    const wrapDeg = (n: number): Diatonic => (["1","2","3","4","5","6","7"][(n - 1 + 7) % 7] as Diatonic);
    function triadDegrees(root: Diatonic): [Diatonic, Diatonic, Diatonic] {
      const r = Number(root);
      return [wrapDeg(r), wrapDeg(r + 2), wrapDeg(r + 4)];
    }
    function scheduleTriad(at: number, rootDeg: Diatonic, key: KeyName, dur = 0.25) {
      const [r, t3, t5] = triadDegrees(rootDeg);
      ["","", ""].forEach((_, idx) => {
        const d = idx === 0 ? r : (idx === 1 ? t3 : t5);
        const midi = degreeToMidi(d, key, false);
        scheduleNote(midiToNoteName(midi), at, dur);
      });
    }
    function scheduleFirstInvTonic(at: number, key: KeyName, dur = 0.25) {
      // I/i: [3,5,1↑]
      scheduleNote(midiToNoteName(degreeToMidi("3", key, false)), at, dur);
      scheduleNote(midiToNoteName(degreeToMidi("5", key, false)), at, dur);
      scheduleNote(midiToNoteName(degreeToMidi("1", key, true )), at, dur);
    }
    function scheduleSecondInvSupertonic(at: number, key: KeyName, dur = 0.25) {
      // II/ii°: [6,2↑,4↑]
      scheduleNote(midiToNoteName(degreeToMidi("6", key, false)), at, dur);
      scheduleNote(midiToNoteName(degreeToMidi("2", key, true )), at, dur);
      scheduleNote(midiToNoteName(degreeToMidi("4", key, true )), at, dur);
    }

    // Export '+' and '#' helpers routed via scheduleNote
    function scheduleIntroChordE(at: number, key: KeyName) {
      (["1","3","5"] as Diatonic[]).forEach((d, idx) => {
        const midi = degreeToMidi(d, key);
        scheduleNote(midiToNoteName(midi), at + idx * 0.06);
      });
    }
    function scheduleResolveCadenceE(at: number, key: KeyName) {
      [{d:"5" as Diatonic, t:at},{d:"1" as Diatonic, t:at+0.12}].forEach(({d,t})=>{
        const midi = degreeToMidi(d, key);
        scheduleNote(midiToNoteName(midi), t);
      });
    }

    // Audio schedule + points (root-only spokes)
    type ExpPoint = { k: "maj" | "min"; step: number; spoke: number };
    const exportPoints: ExpPoint[] = [];

    // If you want a single-shot '+', remove this; we want intro each segment:
    // if (tokens[0]?.kind === "intro") scheduleIntroChordE(t0, SEGMENTS_E[0]);

    let modeToggled = false; // '*' is rest; still keep local toggle var unused to avoid carry-over
    for (let i = 0; i < STEPS_E; i++) {
      const segIdx = Math.floor(i / TOK_COUNT_E) % SEGMENTS_E.length;
      if ((i % TOK_COUNT_E) === 0) modeToggled = false; // reset per segment
      const keyNowBase: KeyName = SEGMENTS_E[segIdx];
      const keyNow: KeyName = keyNowBase; // '*' is rest; no toggle
      const kTag: "maj" | "min" = SEGMENTS_E[segIdx] === "BbMajor" ? "maj" : "min";
      const tok = tokens[i % TOK_COUNT_E];
      const at = t0 + i * (NOTE_MS_E / 1000);

      // intro at segment start
      if (hasIntro && (i % TOK_COUNT_E) === 0) scheduleIntroChordE(at, keyNow);

      // controls
      if (!tok) continue;
      if (tok.kind === "toggle") { /* rest */ continue; }
      if (tok.kind === "intro") { continue; }
      if (tok.kind === "resolve") { scheduleResolveCadenceE(at, keyNow); continue; }
      if (tok.kind === "rest") continue;

      // Letters vs Digits via srcChar
      if (tok.kind === "deg" || tok.kind === "chroma") {
        const isLetter = !!tok.srcChar;

        if (isLetter) {
          if (tok.kind === "deg") {
            if (tok.up && tok.src === "8") {
              // Loop-1: 1 + 1↑
              scheduleNote(midiToNoteName(degreeToMidi("1", keyNow, false)), at);
              scheduleNote(midiToNoteName(degreeToMidi("1", keyNow, true )), at);
              const spoke = degToIndexForKey("1", keyNow);
              if (spoke >= 0) exportPoints.push({ k: kTag, step: i, spoke });
            } else if (tok.up && tok.src === "9") {
              // Loop-2: 1 + 2↑
              scheduleNote(midiToNoteName(degreeToMidi("1", keyNow, false)), at);
              scheduleNote(midiToNoteName(degreeToMidi("2", keyNow, true )), at);
              const spoke = degToIndexForKey("1", keyNow);
              if (spoke >= 0) exportPoints.push({ k: kTag, step: i, spoke });
            } else {
              // normal letter
              scheduleNote(midiToNoteName(degreeToMidi(tok.d, keyNow, tok.up)), at);
              const spoke = degToIndexForKey(tok.d, keyNow);
              if (spoke >= 0) exportPoints.push({ k: kTag, step: i, spoke });
            }
          } else {
            // letter→chroma (rare)
            const pc = degreeToPcOffset(tok.c as DegLabel, keyNow);
            const midi = snapPcToComfortableMidi(pc);
            scheduleNote(midiToNoteName(midi), at);
            const spoke = DEGREE_ORDER.indexOf(tok.c as any);
            if (spoke >= 0) exportPoints.push({ k: kTag, step: i, spoke });
          }
        } else {
          // Digits (chords)
          if (tok.kind === "deg") {
            if ("1234567".includes(tok.src)) {
              scheduleTriad(at, tok.d, keyNow);
              const spoke = degToIndexForKey(tok.d, keyNow);
              if (spoke >= 0) exportPoints.push({ k: kTag, step: i, spoke });
            } else if (tok.src === "8") {
              scheduleFirstInvTonic(at, keyNow);
              const spoke = degToIndexForKey("1", keyNow);
              if (spoke >= 0) exportPoints.push({ k: kTag, step: i, spoke });
            } else if (tok.src === "9") {
              scheduleSecondInvSupertonic(at, keyNow);
              const spoke = degToIndexForKey("2", keyNow);
              if (spoke >= 0) exportPoints.push({ k: kTag, step: i, spoke });
            }
          } else if (tok.kind === "chroma") {
  const pc = degreeToPcOffset(tok.c as DegLabel, keyNow);
  const midi = snapPcToComfortableMidi(pc);
  const name = midiToNoteName(midi);

  const isZeroChroma = (tok as any).src === "0";
  const useTickEnv = isZeroChroma && (zeroPolicy === "ticks");

  if (useTickEnv) {
    scheduleShortNote(name, at);      // short tick envelope (EXPORT)
  } else {
    scheduleNote(name, at);           // normal chroma
  }

  const spoke = DEGREE_ORDER.indexOf(tok.c as any);
  if (spoke >= 0) exportPoints.push({ k: kTag, step: i, spoke });
}
        }
      }
    }

    // 5) Overlays (continuous)
    function overlaySvgForStep(stepIdx: number): string {
      const majVis = exportPoints.filter(p => p.k === "maj" && p.step <= stepIdx).map(p => p.spoke);
      const minVis = exportPoints.filter(p => p.k === "min" && p.step <= stepIdx).map(p => p.spoke);
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

    // 6) Pulses (export) — reused bubbles engine
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
    // ===== Export caption (double-line) helpers =====

// Measure width like drawTokenWithSupE, without drawing
function measureTokenWithSupE(ctx: CanvasRenderingContext2D, text: string): number {
  // inversions: "1st inv" / "2nd inv"
  let m = text.match(/^(\d+)(st|nd|rd|th)\s+(inv)$/i);
  if (m) {
    const [, num, suf, tail] = m;
    const prev = ctx.font;
    const wNum = ctx.measureText(num).width;
    const supSize = Math.round(parseFloat(prev) * 0.65);
    ctx.font = `${supSize}px Inter, system-ui, sans-serif`;
    const wSup = ctx.measureText(suf).width;
    ctx.font = prev;
    const wTail = ctx.measureText(" " + tail).width;
    return wNum + wSup + wTail;
  }
  // ordinals
  m = text.match(/^(\d+)(st|nd|rd|th)$/i);
  if (m) {
    const [, num, suf] = m;
    const prev = ctx.font;
    const wNum = ctx.measureText(num).width;
    const supSize = Math.round(parseFloat(prev) * 0.65);
    ctx.font = `${supSize}px Inter, system-ui, sans-serif`;
    const wSup = ctx.measureText(suf).width;
    ctx.font = prev;
    return wNum + wSup;
  }
  // accidentals + combined "♭2/♯4"
  if (/^[♭♯]\d+(\/[♭♯]\d+)?$/.test(text)) {
    const parts = text.split("/");
    const prev = ctx.font;
    const supSize = Math.round(parseFloat(prev) * 0.65);
    const measureAcc = (part: string) => {
      const mm = part.match(/^([♭♯])(\d+)$/);
      if (!mm) return ctx.measureText(part).width;
      const [, acc, num] = mm;
      const wAcc = ctx.measureText(acc).width;
      ctx.font = `${supSize}px Inter, system-ui, sans-serif`;
      const wNum = ctx.measureText(num).width;
      ctx.font = prev;
      return wAcc + wNum;
    };
    let w = measureAcc(parts[0]);
    if (parts[1]) w += ctx.measureText("/").width + measureAcc(parts[1]);
    return w;
  }
  return ctx.measureText(text).width;
}

// Draw token with superscripts (export)
function drawTokenWithSupE(ctx: CanvasRenderingContext2D, text: string, x: number, y: number): number {
  // inversions
  let m = text.match(/^(\d+)(st|nd|rd|th)\s+(inv)$/i);
  if (m) {
    const [, num, suf, tail] = m;
    ctx.fillText(num, x, y);
    const wNum = ctx.measureText(num).width;
    const supSize = Math.round(parseFloat(ctx.font) * 0.65);
    const prev = ctx.font;
    ctx.font = `${supSize}px Inter, system-ui, sans-serif`;
    ctx.fillText(suf, x + wNum, y - supSize * 0.35);
    const wSup = ctx.measureText(suf).width;
    ctx.font = prev;
    ctx.fillText(" " + tail, x + wNum + wSup, y);
    return wNum + wSup + ctx.measureText(" " + tail).width;
  }
  // ordinals
  m = text.match(/^(\d+)(st|nd|rd|th)$/i);
  if (m) {
    const [, num, suf] = m;
    ctx.fillText(num, x, y);
    const wNum = ctx.measureText(num).width;
    const supSize = Math.round(parseFloat(ctx.font) * 0.65);
    const prev = ctx.font;
    ctx.font = `${supSize}px Inter, system-ui, sans-serif`;
    ctx.fillText(suf, x + wNum, y - supSize * 0.35);
    const wSup = ctx.measureText(suf).width;
    ctx.font = prev;
    return wNum + wSup;
  }
  // accidentals and combined
  if (/^[♭♯]\d+(\/[♭♯]\d+)?$/.test(text)) {
    const parts = text.split("/");
    const prev = ctx.font;
    const supSize = Math.round(parseFloat(prev) * 0.65);
    const drawAcc = (part: string, x0: number) => {
      const mm = part.match(/^([♭♯])(\d+)$/);
      if (!mm) { ctx.fillText(part, x0, y); return ctx.measureText(part).width; }
      const [, acc, num] = mm;
      ctx.fillText(acc, x0, y);
      const wAcc = ctx.measureText(acc).width;
      ctx.font = `${supSize}px Inter, system-ui, sans-serif`;
      ctx.fillText(num, x0 + wAcc, y - supSize * 0.35);
      const wNum = ctx.measureText(num).width;
      ctx.font = prev;
      return wAcc + wNum;
    };
    let dx = 0;
    dx += drawAcc(parts[0], x);
    if (parts[1]) { ctx.fillText("/", x + dx, y); dx += ctx.measureText("/").width; dx += drawAcc(parts[1], x + dx); }
    return dx;
  }
  // default
  ctx.fillText(text, x, y);
  return ctx.measureText(text).width;
}

// Build mapping (playableIndex -> charIndex)
const srcStrE = (raw || "").toUpperCase();
const playableE = tokens.filter(t => t.kind === "deg" || t.kind === "chroma");
const p2cE: number[] = [];
{
  let ci = 0;
  for (let p = 0; p < playableE.length; p++) {
    while (ci < srcStrE.length) {
      const ch = srcStrE[ci];

      if (/[A-Z0-9]/.test(ch)) {
        // NEW: '0' as rest → skip (no playable mapped to this char)
        if (ch === "0" && zeroPolicy === "rest") { ci++; continue; }

        p2cE.push(ci);
        ci++;
        break;
      }
      ci++;
    }
  }
}

// Draw the export caption (two lines) with highlight
function drawExportCaption(
  ctx: CanvasRenderingContext2D,
  activePlayable: number,
  keyNow: KeyName,
  showBottom: boolean
) {
  const src = (raw || "").toUpperCase().split("");
  const playable = tokens.filter(t => t.kind === "deg" || t.kind === "chroma");

  // labels per char
  const labels: string[] = new Array(src.length).fill("");
  {
    let p = 0;
    for (let ci = 0; ci < src.length && p < playable.length; ci++) {
     if (/[A-Z0-9]/.test(src[ci])) {
  // NEW: Zero as Rest → label '-' and DO NOT consume a playable
  if (src[ci] === "0" && zeroPolicy === "rest") {
    labels[ci] = "-";
    continue;
  }
  labels[ci] = labelForTokenCanvas(playable[p], keyNow);
  p++;
} 
    }
  }

  // display array with separators " · "
  type Disp = { txt: string; isSep: boolean; charIndex: number };
  const disp: Disp[] = [];
  for (let ci = 0; ci < src.length; ci++) {
    disp.push({ txt: src[ci], isSep: false, charIndex: ci });
    disp.push({ txt: " · ", isSep: true, charIndex: -1 });
  }

  
  // geometry (in the gold panel above the circle)
const topPx = 48, botPx = 39, gap = 10, padX = 48; // enlarged x3 for video readability
  const topFont = `${topPx * SCALE}px Inter, system-ui, sans-serif`;
  const botFont = `${botPx * SCALE}px Inter, system-ui, sans-serif`;
  const capX = (FRAME_W * SCALE - (drawW * SCALE)) / 2 + (padX * SCALE);
  const capW = (drawW * SCALE) - (padX * 2 * SCALE);
  // Move caption up a bit to add space from the circle
const capLift = 70 * SCALE; // tweak 12–24 if you want more/less space

const topY = (goldTop * SCALE) + (topPx * SCALE) + 4 - capLift;
const botY = topY + (gap * SCALE) + (botPx * SCALE);

  // measure top widths
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.font = topFont;
  const widths = disp.map(d => ctx.measureText(d.txt).width);
  const totalW = widths.reduce((a,b)=>a+b, 0);
  let x = capX + Math.max(0, (capW - totalW) / 2);

  const activeChar = (activePlayable >= 0 && activePlayable < p2cE.length) ? p2cE[activePlayable] : -1;
  const activeColor = (keyNow === "BbMajor")
    ? (bg === "dark" ? themeDark.gold : themeLight.gold)
    : (bg === "dark" ? themeDark.minor : themeLight.minor);

  // top (input tokens)
  for (let i = 0; i < disp.length; i++) {
    const el = disp[i];
    if (el.isSep) {
      ctx.fillStyle = (bg === "dark" ? themeDark.muted : themeLight.muted);
      ctx.fillText(el.txt, x, topY);
      x += widths[i];
      continue;
    }
    const isActive = (el.charIndex === activeChar);
    ctx.fillStyle = isActive ? activeColor : (bg === "dark" ? themeDark.text : themeLight.text);
    ctx.fillText(el.txt, x, topY);
    x += widths[i];
  }

  // bottom (labels)
  if (showBottom) {
  x = capX + Math.max(0, (capW - totalW) / 2);
  ctx.font = botFont;
  const lineGapPx = 2 * SCALE;

  for (let i = 0; i < disp.length; i++) {
    const el = disp[i];
    const cellW = widths[i];
    if (el.isSep) { x += cellW; continue; }
    const lab = labels[el.charIndex] || "";
    if (!lab) { x += cellW; continue; }

    const isActive = (el.charIndex === activeChar);
    ctx.fillStyle = isActive ? activeColor : (bg === "dark" ? themeDark.text : themeLight.text);

    if (lab === "♭2/♯4") {
  // ♭2 on baseline, ♯4 on a line below (like "inv")
  const topLab = "♭2";
  const botLab = "♯4";
  const wTop = measureTokenWithSupE(ctx, topLab);
  const wBot = measureTokenWithSupE(ctx, botLab);
  const xTop = x + (cellW - wTop) / 2;
  const xBot = x + (cellW - wBot) / 2;

  // top on baseline, bottom one line below
  drawTokenWithSupE(ctx, topLab, xTop, botY);
  ctx.fillStyle = ctx.fillStyle; // unchanged color
  drawTokenWithSupE(ctx, botLab, xBot, botY + (botPx * SCALE) + lineGapPx);
} else if (/^\d+(st|nd|rd|th)\s+inv$/i.test(lab)) {
      // inv stacked below baseline
      const topLab = lab.replace(/\s+inv$/i, "");
      const botLab = "inv";

      c// Scale factor for inversions (smaller than normal bottom labels)
  const INV_SCALE = 0.7; // try 0.5 ~ 0.65 to taste
  const prevFont = ctx.font;

  // Use smaller font to measure/draw both top (1st/2nd) and bottom ("inv")
  const smallBotPx = botPx * INV_SCALE;
  ctx.font = `${Math.round(smallBotPx * SCALE)}px Inter, system-ui, sans-serif`;

  const wTop = measureTokenWithSupE(ctx, topLab);
  const wBot = ctx.measureText(botLab).width;
  const xTop = x + (cellW - wTop) / 2;
  const xBot = x + (cellW - wBot) / 2;

  // Top (1st/2nd) on baseline (same as other helpers)
  drawTokenWithSupE(ctx, topLab, xTop, botY);

  // Bottom ("inv") one line below, using the *smaller* line height
  const offset = (smallBotPx * SCALE) + lineGapPx;
  ctx.fillText(botLab, xBot, botY + offset);

  // Restore original label font
  ctx.font = prevFont;
} else {
      // single line
      const wLab = measureTokenWithSupE(ctx, lab);
      const xLab = x + (cellW - wLab) / 2;
      drawTokenWithSupE(ctx, lab, xLab, botY);
    }
    x += cellW;
  }
}
}

    // 7) Recording loop
    const TOTAL_MS_FIXED = (STEPS_E * NOTE_MS_E) + 300;
    const recStart = performance.now();
    rec.start();
    const hardStopTimer = window.setTimeout(() => { try { rec.stop(); } catch {} }, TOTAL_MS_FIXED + 500);

    let lastTs = 0;
    let prevStep = -1;
    let playedIdxE = 0; // export caption highlight: counts only playable tokens within the segment

    (function loop() {
      const nowTs = performance.now();
      const elapsed = nowTs - recStart;
      const i = Math.min(STEPS_E - 1, Math.floor(elapsed / NOTE_MS_E));
      const dtSec = lastTs ? (nowTs - lastTs) / 1000 : (1 / FPS);
      lastTs = nowTs;

      // base frame (NO static input title)
c.fillStyle = (bg === "dark" ? themeDark.bg : themeLight.bg);
c.fillRect(0, 0, canvas.width, canvas.height);

// gold panel border
c.save();
c.strokeStyle = (bg === "dark" ? themeDark.gold : themeLight.gold);
c.lineWidth = 2 * SCALE;
c.strokeRect(
  (SIDE_PAD / 2) * SCALE,
  SAFE_TOP * SCALE,
  (FRAME_W - SIDE_PAD) * SCALE,
  (drawH + dateBlockH + TOP_GAP) * SCALE
);
c.restore();

// base circle/labels snapshot (no overlays)
c.drawImage(
  bgImg,
  0, 0, liveW, liveH,
  drawX * SCALE, drawY * SCALE,
  drawW * SCALE, drawH * SCALE
);

      // overlays (non-Pulse)
      if (trailMode !== "pulse") {
        const ovImg = overlayImgs[i];
        if (ovImg) {
          c.drawImage(ovImg, 0, 0, liveW, liveH, drawX * SCALE, drawY * SCALE, drawW * SCALE, drawH * SCALE);
        }
      }
      // ---- Draw export caption (double-line) with playable-only highlight ----
const segIdx = Math.floor(i / TOK_COUNT_E) % SEGMENTS_E.length;
const keyNowE: KeyName = SEGMENTS_E[segIdx];

// Advance the playable counter only for new playable steps since prevStep,
// and reset it at the start of each segment
if (i > prevStep) {
  for (let s = prevStep + 1; s <= i; s++) {
    if ((s % TOK_COUNT_E) === 0) playedIdxE = 0; // start of a new segment
    const t = tokens[s % TOK_COUNT_E];
    if (t && (t.kind === "deg" || t.kind === "chroma")) {
      playedIdxE++; // count only playable tokens
    }
  }
}

// Highlight the current playable (last one we advanced to)
const activePlayableIdx = Math.max(0, playedIdxE - 1);
const showBottomThisFrame = (segIdx === 1 && keyNowE === "BbMajor"); // 2nd Major pass only
drawExportCaption(c, activePlayableIdx, keyNowE, showBottomThisFrame);

      // pulse engine
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
      rec.onstop = () => {
        try {
          try { stream.getTracks().forEach(t => t.stop()); } catch {}
          try { exportDst.stream.getTracks().forEach(t => t.stop()); } catch {}
          try { window.clearTimeout(hardStopTimer); } catch {}
        } finally {
          res(new Blob(chunks, { type: mimeType || "video/webm" }));
        }
      };
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
     {/* SEO: JSON-LD */}
<script
  type="application/ld+json"
  dangerouslySetInnerHTML={{
    __html: JSON.stringify({
      "@context": "https://schema.org",
      "@type": ["SoftwareApplication", "WebApplication"],
      name: "ToneDial",
      applicationCategory: "MusicApplication",
      operatingSystem: "Web",
      url: "https://pianotrainer.app/viral/tone-dial",
      image: "https://pianotrainer.app/og/tonedial.png",
      description:
        "Map phone text or words (T9) to melody. Three zero modes: Chromatic, Ticks, Rest.",
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      publisher: { "@type": "Organization", name: "PianoTrainer" },
    }),
  }}
/>
<script
  type="application/ld+json"
  dangerouslySetInnerHTML={{
    __html: JSON.stringify({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: "What does ToneDial do?",
          acceptedAnswer: {
            "@type": "Answer",
            text:
              "ToneDial converts phone text and words (T9) into melody with B♭ Major and C minor passes.",
          },
        },
        {
          "@type": "Question",
          name: "How do zeros behave?",
          acceptedAnswer: {
            "@type": "Answer",
            text:
              "Chromatic (♭2/♯4) and Ticks (short ♭2/♯4) are playable and highlighted; Rest is silent and unhighlighted.",
          },
        },
      ],
    }),
  }}
/> 
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
            onChange={e => { setRaw(sanitizePhoneInput(e.target.value)); setShowHelper(true); }}
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
          <div className="transform-helper" style={{ marginTop:6, display:"flex", gap:8, justifyContent:"center", alignItems:"center", flexWrap:"wrap" }}>
            {currentChain && currentChain.length ? currentChain.map((step, idx) => (
              <React.Fragment key={idx}>
                <span className="chain-node" style={{
                  padding:"1px 6px", borderRadius:6,
                  background: bg==="dark" ? "#0F1821" : "#F3F5F8",
                  border:`1px solid ${T.border}`, color: T.text, whiteSpace:"nowrap", fontSize:13
                }}>
                  {renderWithSupers(step)}
                </span>
                {idx < currentChain.length - 1 ? (<span aria-hidden="true" style={{ opacity:0.6, fontSize:12 }}>→</span>) : null}
              </React.Fragment>
            )) : null}
          </div>
        )}

        {/* Caption canvas: input tokens with " · " separators + labels under each */}
        <div className="minw0" style={{ display:"grid", justifyContent:"center", paddingInline: 2 }}>
          <canvas
            ref={captionCanvasRef}
            width={360}
            height={84}
            style={{ width: 360, height: 84, display:"block" }}
            aria-label="Caption"
          />
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

            {/* dot pulse on the active node (brief pop) */}
            {hotPulse && (
              <>
                <circle cx={hotPulse.x} cy={hotPulse.y} r="2.2" fill={hotPulse.color} opacity="0.95" />
                <circle cx={hotPulse.x} cy={hotPulse.y} r="4.4" fill="none" stroke={hotPulse.color} strokeWidth="0.6" opacity="0.45" />
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
                <option value="ticks">Zero (0): Ticks (short ♭2/♯4)</option>
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
function ShareSheet({
  open, onClose, url, themeColors,
}: { open: boolean; onClose: () => void; url: string; themeColors: { gold: string; border: string; text: string; bg: string } }) {
  if (!open) return null;
  return (
    <div role="dialog" aria-modal="true" style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.6)", display:"flex", alignItems:"flex-end", justifyContent:"center", zIndex:9999 }} onClick={onClose}>
      <div style={{ width:"100%", maxWidth:520, background: themeColors.bg, borderTop:`1px solid ${themeColors.border}`, borderLeft:`1px solid ${themeColors.border}`, borderRight:`1px solid ${themeColors.border}`, borderRadius:"12px 12px 0 0", padding:12, boxSizing:"border-box" }} onClick={(e)=>e.stopPropagation()}>
        <div style={{ textAlign:"center", color:themeColors.text, fontWeight:800, marginBottom:8 }}>Share your melody</div>
        <button onClick={async()=>{ try{ await navigator.clipboard.writeText(url);}catch{}; onClose(); }} style={{ width:"100%", padding:"10px 12px", marginBottom:6, background: themeColors.gold, color:"#081019", borderRadius:8, border:"none", fontWeight:800 }}>🔗 Copy Link</button>
        <a href={buildTweetIntent(`My number sings: ${url}`, url)} target="_blank" rel="noopener noreferrer" onClick={onClose} style={{ display:"block", textAlign:"center", width:"100%", padding:"10px 12px", marginBottom:6, background:"transparent", color: themeColors.gold, borderRadius:8, border:`1px solid ${themeColors.border}`, textDecoration:"none", fontWeight:800 }}>𝕏 Share on X</a>
        <button onClick={onClose} style={{ width:"100%", padding:"8px 12px", marginTop:8, background: themeColors.bg, color: themeColors.text, opacity:0.7, borderRadius:8, border:`1px solid ${themeColors.border}`, fontWeight:700 }}>Close</button>
      </div>
    </div>
  );
}  