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
  gold: "#B08900",   // tuned for contrast on light
  minor: "#1E7B45",
};
function pickTheme(mode: BgMode) { return mode === "dark" ? themeDark : themeLight; }

/* =========================
   Circle geometry (unchanged)
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
   Zero policy
   ========================= */
type ZeroPolicy = "chromatic" | "rest";
const zeroFlipRef = { current: true };

/* =========================
   Input sanitization + month handling + T9
   ========================= */
type MonthMode = "word" | "number";
const MONTHS: Record<string, string> = {
  january:"1", february:"2", march:"3", april:"4", may:"5", june:"6",
  july:"7", august:"8", september:"9", october:"10", november:"11", december:"12",
  jan:"1", feb:"2", mar:"3", apr:"4", jun:"6", jul:"7", aug:"8", sep:"9", sept:"9", oct:"10", nov:"11", dec:"12",
};

const T9: Record<string, string> = {
  A:"2",B:"2",C:"2", D:"3",E:"3",F:"3", G:"4",H:"4",I:"4",
  J:"5",K:"5",L:"5", M:"6",N:"6",O:"6", P:"7",Q:"7",R:"7",S:"7",
  T:"8",U:"8",V:"8", W:"9",X:"9",Y:"9",Z:"9",
};

function sanitizeInputForDates(s: string): string {
  // Allow only A–Z, a–z, 0–9 and separators / - , .
  const filtered = s.replace(/[^A-Za-z0-9\/,\.\-\s]/g, "");
  return filtered;
}

// Replace month words with numbers (when monthMode === "number")
function replaceMonthsIfNeeded(s: string, monthMode: MonthMode): string {
  if (monthMode !== "number") return s;
  return s.replace(/[A-Za-z]+/g, (w) => {
    const key = w.toLowerCase();
    return MONTHS[key] ?? w; // replace only known month names/abbr
  });
}

/* =========================
   Tokenizer (builds musical tokens)
   ========================= */
type Token =
  | { kind:"rest"; char:string }                       // separators
  | { kind:"deg"; d:Diatonic; up?: boolean; src:string } // 1..7 (8→1↑, 9→2↑)
  | { kind:"chroma"; c:Chromatic; src:string }         // 0 policy chromatics
  | { kind:"dual"; a:Diatonic; b:Diatonic; src:string };// 17..31 → pair

function pushDigitAsToken(tokens: Token[], digit: string, zeroPolicy: ZeroPolicy) {
  if (digit === "0") {
    if (zeroPolicy === "rest") tokens.push({ kind:"rest", char:"0" });
    else {
      const next: Chromatic = zeroFlipRef.current ? "♭2" : "♯4";
      zeroFlipRef.current = !zeroFlipRef.current;
      tokens.push({ kind:"chroma", c: next, src:"0" });
    }
    return;
  }
  if ("1234567".includes(digit)) {
    tokens.push({ kind:"deg", d: digit as Diatonic, src: digit });
  } else if (digit === "8") {
    tokens.push({ kind:"deg", d:"1", up:true, src:"8" });
  } else if (digit === "9") {
    tokens.push({ kind:"deg", d:"2", up:true, src:"9" });
  }
}

function tokenize(s: string, zeroPolicy: ZeroPolicy): Token[] {
  const out: Token[] = [];
  const arr = s.split("");
  for (let i = 0; i < arr.length; i++) {
    const ch = arr[i];

    // separators → rests
    if (/[\/,\.\-]/.test(ch)) { out.push({ kind:"rest", char: ch }); continue; }

    // letters → T9
    if (/[A-Za-z]/.test(ch)) {
      const d = T9[ch.toUpperCase()];
      pushDigitAsToken(out, d, zeroPolicy);
      continue;
    }

    // digits
    if (/\d/.test(ch)) {
      // try dual-degree day 17..31 (two-digit lookahead)
      if (i + 1 < arr.length && /\d/.test(arr[i+1])) {
        const n = Number(ch + arr[i+1]);
        if (n >= 17 && n <= 31) {
          // map “17 → 1 & 7”, “31 → 3 & 1”, etc.
          const a = (ch as "1"|"2"|"3"|"4"|"5"|"6"|"7"); // first digit is 1..3
          const b = (arr[i+1] as "1"|"2"|"3"|"4"|"5"|"6"|"7"|"8"|"9"|"0");
          // Reduce b to diatonic 1..7 (9=2↑ visually still “2” here, 8=1↑ → “1”)
          const bDeg: Diatonic = b === "9" ? "2" : b === "8" ? "1" : (["1","2","3","4","5","6","7"].includes(b) ? (b as Diatonic) : "1");
          out.push({ kind:"dual", a, b: bDeg, src: ch + arr[i+1] });
          i++; // consumed two digits
          continue;
        }
      }
      // single digit
      pushDigitAsToken(out, ch, zeroPolicy);
      continue;
    }

    // spaces: ignore
  }
  return out;
}

/* =========================
   Web Audio (unchanged APIs)
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
   Exporter helpers (kept)
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
function pickRecorderMime(): string {
  const candidates = [
    'video/mp4;codecs="avc1.42E01E,mp4a.40.2"',
    "video/mp4",
    "video/webm;codecs=vp9,opus",
    "video/webm",
  ];
  for (const t of candidates) { try { if ((window as any).MediaRecorder?.isTypeSupported?.(t)) return t; } catch {} }
  return "video/webm";
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

/* =========================
   Confetti (kept)
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
   Trails & particles helpers (kept + tiny additions)
   ========================= */
type Ember = { x: number; y: number; vx: number; vy: number; life: number; el: SVGCircleElement };
function spawnParticles(pool: Ember[], max: number, svg: SVGSVGElement, x: number, y: number, palette: string[], count = 5) {
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
    pool.push({ x, y, vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd - 0.2, life: 1.0, el });
    if (pool.length > max) { const old = pool.shift()!; old.el.remove(); }
  }
}
function updateParticles(pool: Ember[]) {
  for (let i = pool.length - 1; i >= 0; i--) {
    const e = pool[i];
    e.x += e.vx; e.y += e.vy; e.vy += 0.015; e.life -= 0.02;
    if (e.life <= 0) { e.el.remove(); pool.splice(i, 1); continue; }
    e.el.setAttribute("cx", e.x.toFixed(2));
    e.el.setAttribute("cy", e.y.toFixed(2));
    e.el.setAttribute("opacity", e.life.toFixed(2));
  }
}

/* =========================
   Component
   ========================= */
type TrailMode = "glow" | "lines" | "glow+confetti" | "lines+confetti";

export default function KeyClock() {
  /* CSS */
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
      .caption span.hl { color: var(--gold); font-weight: 800; }
    `;
    const el = document.createElement("style"); el.textContent = css; document.head.appendChild(el);
    return () => { try { document.head.removeChild(el); } catch {} };
  }, []);

  /* State */
  const [bg, setBg] = useState<BgMode>("dark");
  const T = pickTheme(bg);

  const [monthMode, setMonthMode] = useState<MonthMode>("word");
  const [trailMode, setTrailMode] = useState<TrailMode>("glow");
  const [zeroPolicy, setZeroPolicy] = useState<ZeroPolicy>("chromatic");

  const [raw, setRaw] = useState("");
  const [inputDisplay, setInputDisplay] = useState(""); // caption with normalization
  const [isRunning, setIsRunning] = useState(false);
  const [hasPlayed, setHasPlayed] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  /* Refs */
  const isRunningRef = useRef(false);
  useEffect(()=>{ isRunningRef.current = isRunning; }, [isRunning]);

  const hasPlayedRef = useRef(false);
  useEffect(()=>{ hasPlayedRef.current = hasPlayed; }, [hasPlayed]);

  const svgRef = useRef<SVGSVGElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const emberPool = useRef<Ember[]>([]).current;
  const maxEmbers = 80;

  // caption highlight
  const [capIdx, setCapIdx] = useState<number>(-1);

  // Trails state
  type Overlay = { id: "maj"|"min"; color: string; path: string };
  const [overlays, setOverlays] = useState<Overlay[]>([]);
  const nodesMajRef = useRef<number[]>([]);
  const nodesMinRef = useRef<number[]>([]);
  const TRAIL_N = 9999; // keep the whole string for each pass

  // Share
  const [shareOpen, setShareOpen] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  /* Derived input → tokens */
  const normalized = useMemo(() => {
    const s1 = sanitizeInputForDates(raw);
    const s2 = replaceMonthsIfNeeded(s1, monthMode);
    return s2;
  }, [raw, monthMode]);

  useEffect(() => {
    setInputDisplay(normalized);
  }, [normalized]);

  const tokens = useMemo(() => {
    zeroFlipRef.current = true;  // reset alternation for visual consistency
    return tokenize(normalized, zeroPolicy);
  }, [normalized, zeroPolicy]);

  /* Build share URL */
  const buildShareUrl = useCallback(() => {
    const params = new URLSearchParams();
    params.set("bg", bg);
    params.set("mmode", monthMode);
    params.set("trail", trailMode);
    params.set("zero", zeroPolicy);
    params.set("q", encodeURIComponent(normalized));
    const url = new URL(window.location.href);
    url.search = params.toString();
    return url.toString();
  }, [bg, monthMode, trailMode, zeroPolicy, normalized]);

  /* Hydrate from URL (optional) */
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const sp = new URLSearchParams(window.location.search);
      const q = sp.get("q"); if (q) setRaw(decodeURIComponent(q));
      const mm = sp.get("mmode"); if (mm === "word" || mm === "number") setMonthMode(mm);
      const bgq = sp.get("bg"); if (bgq === "dark" || bgq === "light") setBg(bgq);
      const tm = sp.get("trail"); if (tm === "glow" || tm === "lines" || tm === "glow+confetti" || tm === "lines+confetti") setTrailMode(tm);
      const zp = sp.get("zero"); if (zp === "chromatic" || zp === "rest") setZeroPolicy(zp);
    } catch {}
  }, []);

const NOTE_MS = 250; // base step
const TOK_COUNT = Math.max(1, tokens.length);


// 2x Major, then 2x Minor → total = tokens.length * 4 steps
const SEGMENTS: KeyName[] = ["BbMajor", "BbMajor", "Cminor", "Cminor"];
const STEPS = TOK_COUNT * SEGMENTS.length;

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

  const hardStop = useCallback(() => {
    try { for (const s of sourcesRef.current) { try { s.stop(0); } catch {} } sourcesRef.current.clear(); } catch {}
    setIsRunning(false); isRunningRef.current = false;
    setCapIdx(-1);
  }, []);

  /* Core playback (Major half then Minor half) with caption sync */
  const startCore = useCallback(async () => {
    if (isRunningRef.current) return;
    // Blur and scroll safe
    try { (document.activeElement as HTMLElement | null)?.blur(); } catch {}
    setTimeout(() => { if ("visualViewport" in window) window.scrollTo({ top: 0, behavior: "smooth" }); }, 40);
    if (tokens.length === 0) return;
    await unlockCtx();

    // reset visuals
    nodesMajRef.current = []; nodesMinRef.current = []; setOverlays([]);
    setIsRunning(true); isRunningRef.current = true;
    if (!hasPlayedRef.current) setHasPlayed(true);

    const ac = getCtx();
    const t0 = ac.currentTime + 0.12;
// Build fixed schedule: Major → Minor → Major → Minor (2 rounds)

const plan: { at:number; idx:number; key:KeyName; tok:Token }[] = [];
for (let i = 0; i < STEPS; i++) {
  const segIdx = Math.floor(i / TOK_COUNT) % SEGMENTS.length;
const key: KeyName = SEGMENTS[segIdx];
  const tok = tokens[i % TOK_COUNT];
  plan.push({ at: t0 + i * (NOTE_MS / 1000), idx: i, key, tok });
}

    // Audio schedule
    plan.forEach(p => {
      const { tok, key, at } = p;
      if (tok.kind === "rest") return;
      if (tok.kind === "deg") {
        const midi = degreeToMidi(tok.d, key, tok.up);
        const name = midiToNoteName(midi);
        loadBuffer(name).then(buf => {
          const src = ac.createBufferSource(); src.buffer = buf;
          const g = ac.createGain();
          g.gain.setValueAtTime(0, at);
          g.gain.linearRampToValueAtTime(1, at + 0.01);
          g.gain.setTargetAtTime(0, at + 0.20, 0.05);
          src.connect(g).connect(ac.destination);
          sourcesRef.current.add(src); src.onended = () => sourcesRef.current.delete(src);
          try { src.start(at); src.stop(at + 0.25); } catch {}
        }).catch(()=>{});
      } else if (tok.kind === "chroma") {
        const pc = degreeToPcOffset(tok.c as DegLabel, key);
        const midi = snapPcToComfortableMidi(pc);
        const name = midiToNoteName(midi);
        loadBuffer(name).then(buf => {
          const src = ac.createBufferSource(); src.buffer = buf;
          const g = ac.createGain();
          g.gain.setValueAtTime(0, at);
          g.gain.linearRampToValueAtTime(1, at + 0.01);
          g.gain.setTargetAtTime(0, at + 0.20, 0.05);
          src.connect(g).connect(ac.destination);
          sourcesRef.current.add(src); src.onended = () => sourcesRef.current.delete(src);
          try { src.start(at); src.stop(at + 0.25); } catch {}
        }).catch(()=>{});
      } else if (tok.kind === "dual") {
        const m1 = degreeToMidi(tok.a, key);
        const m2 = degreeToMidi(tok.b, key);
        [m1, m2].forEach(midi => {
          const name = midiToNoteName(midi);
          loadBuffer(name).then(buf => {
            const src = ac.createBufferSource(); src.buffer = buf;
            const g = ac.createGain();
            g.gain.setValueAtTime(0, at);
            g.gain.linearRampToValueAtTime(1, at + 0.01);
            g.gain.setTargetAtTime(0, at + 0.20, 0.05);
            src.connect(g).connect(ac.destination);
            sourcesRef.current.add(src); src.onended = () => sourcesRef.current.delete(src);
            try { src.start(at); src.stop(at + 0.25); } catch {}
          }).catch(()=>{});
        });
      }
    });

    // RAF visuals + caption syncing
    const svgEl = svgRef.current;
    const stepDurSec = NOTE_MS / 1000;
    const t0Perf = performance.now();

    function loop() {
      if (!isRunningRef.current) return;
      const elapsed = (performance.now() - t0Perf) / 1000;
      const step = Math.floor(elapsed / stepDurSec);

      if (step >= STEPS) { hardStop(); return; }

      // caption highlight (map to token index, not char index)
      setCapIdx(step % tokens.length);

      // visual pulses/trails/confetti
      const nowTok = plan[step]?.tok;
      const nowKey = plan[step]?.key;
      if (nowTok && nowKey && svgEl) {
        if (nowTok.kind === "deg") {
          const spoke = degToIndexForKey(nowTok.d, nowKey);
          // reset string at pass boundary so each pass draws a fresh clean path
const segStart = Math.floor(step / TOK_COUNT) * TOK_COUNT;
if (step === segStart) {
  if (nowKey === "BbMajor") { nodesMajRef.current = []; }
  else { nodesMinRef.current = []; }
}
          appendTrail(spoke, nowKey);

          // sparkle for octave notes
          if (nowTok.up) {
            const p = nodePosition(spoke, 36);
            const palette = [T.gold, T.minor, "#FFD36B"];
            if (trailMode.includes("+confetti")) {
  spawnParticles(emberPool, maxEmbers, svgEl, p.x, p.y, palette, 8);
}
          }
        } else if (nowTok.kind === "chroma") {
          const spoke = DEGREE_ORDER.indexOf(nowTok.c);
          // reset string at pass boundary so each pass draws a fresh clean path
const segStart = Math.floor(step / TOK_COUNT) * TOK_COUNT;
if (step === segStart) {
  if (nowKey === "BbMajor") { nodesMajRef.current = []; }
  else { nodesMinRef.current = []; }
}

          appendTrail(spoke, nowKey);
          const p = nodePosition(spoke, 36);
          const palette = [T.gold, T.minor, "#FFD36B"];
          if (trailMode.includes("+confetti")) {
  spawnParticles(emberPool, maxEmbers, svgEl, p.x, p.y, palette, 8);
}
        } else if (nowTok.kind === "dual") {
          // draw trail from first degree to second degree (as per your rule)
          const sA = degToIndexForKey(nowTok.a, nowKey);
          const sB = degToIndexForKey(nowTok.b, nowKey);
          appendTrail(sA, nowKey);
          appendTrail(sB, nowKey);
          // extra shimmer on both points
          [sA, sB].forEach(sp => {
            const p = nodePosition(sp, 36);
            const palette = [T.gold, T.minor, "#FFD36B"];
            if (trailMode.includes("+confetti")) {
  spawnParticles(emberPool, maxEmbers, svgEl, p.x, p.y, palette, 8);
}
          });
        }

        // (retired) center-screen confetti burst removed per new spec
      }
      if (trailMode.includes("+confetti")) {
  updateParticles(emberPool);
}
      requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);
  }, [tokens, STEPS, NOTE_MS, T.gold, T.minor, emberPool, hardStop, trailMode]);

  /* Start wrapper */
  const start = useCallback(() => {
    if (isRunningRef.current) { hardStop(); setTimeout(() => startCore(), 30); }
    else { startCore(); }
  }, [startCore, hardStop]);

  /* Keyboard triggers */
  const onKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    if (!normalized.trim()) return;
    if (isRunningRef.current) { hardStop(); setTimeout(() => start(), 30); }
    else { start(); }
  }, [normalized, start, hardStop]);

  const onBlur = useCallback(() => {
    if (!normalized.trim()) return;
    if (isRunningRef.current) { hardStop(); setTimeout(() => start(), 30); }
    else { start(); }
  }, [normalized, start, hardStop]);

  const onDownloadVideo = useCallback(async () => {
  setIsExporting(true);
  try {
    const svgEl = svgRef.current;
    if (!svgEl) { setIsExporting(false); return; }

    await unlockCtx();

    // ===== 1) Snapshot background (same as you already do) =====
    const rect = svgEl.getBoundingClientRect();
    const liveW = Math.max(2, Math.floor(rect.width));
    const liveH = Math.max(2, Math.floor(rect.height));
    const clone = svgEl.cloneNode(true) as SVGSVGElement;
    // Remove live overlays and particles for the background snapshot only
    clone.querySelectorAll("path").forEach(p => p.remove());
    const embersClone = clone.querySelector("#embers"); if (embersClone) embersClone.remove();
    const css = await buildEmbeddedFontStyle();
    const rawBg = serializeFullSvg(clone, liveW, liveH, css);
    const bgImg = await svgToImage(rawBg);

    // ===== 2) Canvas + recorder =====
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

    // ===== 3) Layout in the video (same as your current export) =====
    const SAFE_TOP = 160, SAFE_BOTTOM = 120, TOP_GAP = 10, SIDE_PAD = 48;
    const dateText = inputDisplay || "Type a date";

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

    // ===== 4) Build fixed plan: 2× Major + 2× Minor =====
    const NOTE_MS_E = 250; // same as live
    const TOK_COUNT_E = Math.max(1, tokens.length);
    const SEGMENTS_E: KeyName[] = ["BbMajor", "BbMajor", "Cminor", "Cminor"];
    const STEPS_E = TOK_COUNT_E * SEGMENTS_E.length;

    
    // Schedule audio (and capture spokes for each step)
    const t0 = ac.currentTime + 0.25;
    let latestStopAt = t0;

    type ExpPoint = { k: "maj" | "min"; step: number; spoke: number };
    const exportPoints: ExpPoint[] = [];

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

    for (let i = 0; i < STEPS_E; i++) {
      const segIdx = Math.floor(i / TOK_COUNT_E);
      const key: KeyName = SEGMENTS_E[segIdx] || "BbMajor";
      const kTag: "maj" | "min" = key === "BbMajor" ? "maj" : "min";
      const tok = tokens[i % TOK_COUNT_E];
      if (tok.kind === "rest") continue;
      const at = t0 + i * (NOTE_MS_E / 1000);

      if (tok.kind === "deg") {
        const midi = degreeToMidi(tok.d, key, tok.up);
        scheduleNote(midiToNoteName(midi), at);
        const s = degToIndexForKey(tok.d, key);
        exportPoints.push({ k: kTag, step: i, spoke: s });
      } else if (tok.kind === "chroma") {
        const pc = degreeToPcOffset(tok.c as any, key);
        let midi = 60; for (let mm = 48; mm <= 72; mm++) { if (mm % 12 === pc) { midi = mm; break; } }
        scheduleNote(midiToNoteName(midi), at);
        const s = DEGREE_ORDER.indexOf(tok.c as any);
        if (s >= 0) exportPoints.push({ k: kTag, step: i, spoke: s });
      } else if (tok.kind === "dual") {
        const m1 = degreeToMidi(tok.a, key);
        const m2 = degreeToMidi(tok.b, key);
        scheduleNote(midiToNoteName(m1), at);
        scheduleNote(midiToNoteName(m2), at);
        const sA = degToIndexForKey(tok.a, key);
        const sB = degToIndexForKey(tok.b, key);
        exportPoints.push({ k: kTag, step: i, spoke: sA });
        exportPoints.push({ k: kTag, step: i, spoke: sB });
      }
    }

    // ===== 5) Pre-render per-step SVG overlays (glow = identical to live) =====
    // Normalize geometry: build the same 0..100 viewBox (like live)
    const TRAIL_WINDOW = 64; // shows last segments of trail; increase if you want longer tails
    const useGlow = trailMode.startsWith("glow");
    const hasConfetti = trailMode.includes("+confetti");

    // Per-frame confetti simulation (export only, normalized 0..100 space)
type CParticle = { x:number; y:number; vx:number; vy:number; life:number; size:number; color:string };
const confettiFrame: CParticle[] = [];
let lastSpawnStep = -1;

// Spawn near nodes for each new step index
function spawnConfettiForStep(stepIdx: number) {
  if (!hasConfetti) return;
  const pts = exportPoints.filter(p => p.step === stepIdx);
  if (!pts.length) return;

  for (const p of pts) {
    const node = nodePosition(p.spoke, 36); // 0..100 coords
    const base = Math.random() * Math.PI * 2;
    const burst = 6;
    for (let i = 0; i < burst; i++) {
      const ang = base + (Math.random() * 0.9 - 0.45);
      const spd = 1.1 + Math.random() * 1.2;
      confettiFrame.push({
        x: node.x,
        y: node.y,
        vx: Math.cos(ang) * spd * 1.15,
        vy: Math.sin(ang) * spd * 1.15 - 0.12,
        life: 1.0,
        size: 0.9 + Math.random() * 0.5,
        color: confColors[(Math.random() * confColors.length) | 0],
      });
    }
  }
}

// Per-frame update & draw (dt in seconds)
function updateAndDrawExportConfetti(ctx: CanvasRenderingContext2D, dtSec: number) {
  if (!hasConfetti) return;

  // Update physics
  for (let i = confettiFrame.length - 1; i >= 0; i--) {
    const p = confettiFrame[i];
    p.x += p.vx * dtSec * 60;       // scale to ~60fps feel
    p.y += p.vy * dtSec * 60;
    p.vy += 0.03 * dtSec * 60;      // gravity
    p.life -= 0.06 * dtSec * 60;    // faster fade → pulse-like
    if (p.life <= 0) confettiFrame.splice(i, 1);
  }

  // Draw in normalized space → map to content rect
  ctx.save();
  ctx.translate(drawX * SCALE, drawY * SCALE);
  ctx.scale((drawW * SCALE) / 100, (drawH * SCALE) / 100);
  const prevComp = ctx.globalCompositeOperation;
  ctx.globalCompositeOperation = "source-over";

  for (const p of confettiFrame) {
    const a = Math.max(0.28, Math.min(1, p.life));
    const r = p.size * (0.85 + 0.30 * (1 - p.life)); // subtle pulse
    ctx.globalAlpha = a;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = prevComp;
  ctx.restore();
}

    type Particle = { x:number; y:number; vx:number; vy:number; life:number; size:number; color:string };
    const confColors = [T.gold, T.minor, "#FFD36B"];
    const particles: Particle[] = [];
    let lastSpawn = -1;

    // Helper: step → overlay SVG string
    function overlaySvgForStep(stepIdx: number): string {
      // Compute visible spokes up to this step
      const majVis = exportPoints.filter(p => p.k === "maj" && p.step <= stepIdx).map(p => p.spoke).slice(-TRAIL_WINDOW);
      const minVis = exportPoints.filter(p => p.k === "min" && p.step <= stepIdx).map(p => p.spoke).slice(-TRAIL_WINDOW);

        // Build paths in SVG path syntax from spokes
  const pathMaj = majVis.length ? pathFromNodes(majVis) : "";
  const pathMin = minVis.length ? pathFromNodes(minVis) : "";

  // Match live: thinner stroke under glow, thicker without glow
  const strokeWidth = useGlow ? 1.15 : 1.4;

  // SVG glow filter block (same as live)
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
          ${useGlow ? filterBlock : ""}
          ${pathMaj ? `<path d="${pathMaj}" fill="none" stroke="${T.gold}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round" ${useGlow ? `filter="url(#vt-glow)"` : ""} />` : ""}
          ${pathMin ? `<path d="${pathMin}" fill="none" stroke="${T.minor}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round" ${useGlow ? `filter="url(#vt-glow)"` : ""} />` : ""}
          
        </svg>
      `;
    }

    // Pre-render overlay images for each step (so drawing during record is cheap)
    const overlays: HTMLImageElement[] = [];
    for (let i = 0; i < STEPS_E; i++) {
      const svgMarkup = overlaySvgForStep(i);
      const img = await svgToImage(svgMarkup);
      overlays.push(img);
    }
    // — Canvas pulse head helpers (normalized 0..100 space) —
function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }
function nodePt(spoke: number) {
  const p = nodePosition(spoke, 36); // {x,y} in 0..100
  return p;
}

// draw a short glowing head between two nodes (color = T.gold/T.minor)
function drawPulseHead(ctx: CanvasRenderingContext2D, fromSpoke: number, toSpoke: number, frac: number, color: string) {
  const a = nodePt(fromSpoke);
  const b = nodePt(toSpoke);
  const hx = lerp(a.x, b.x, Math.max(0, Math.min(1, frac)));
  const hy = lerp(a.y, b.y, Math.max(0, Math.min(1, frac)));

  ctx.save();
  ctx.translate(drawX * SCALE, drawY * SCALE);
  ctx.scale((drawW * SCALE) / 100, (drawH * SCALE) / 100);

  const prevComp = ctx.globalCompositeOperation;
  const prevBlur = ctx.shadowBlur;
  const prevCol  = ctx.shadowColor;

  // additive glow for head
  ctx.globalCompositeOperation = "lighter";
  ctx.shadowBlur  = 8 * SCALE;
  ctx.shadowColor = color;

  // outer soft head
  ctx.strokeStyle = color;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.lineWidth = 2.0; // normalized; scaled by ctx.scale above
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(hx, hy);
  ctx.stroke();

  // bright core
  ctx.shadowBlur = 0;
  ctx.globalAlpha = 0.9;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(hx, hy);
  ctx.stroke();

  // restore
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = prevComp;
  ctx.shadowBlur  = prevBlur;
  ctx.shadowColor = prevCol;
  ctx.restore();
}
    // Fixed total recording time from the discrete schedule (4 passes):
const TOTAL_MS_FIXED = (STEPS_E * NOTE_MS_E) + 300; // + small tail

    // ===== 6) Start recording and draw frames =====
    function drawFrame() {
      // Background
      c.fillStyle = T.bg; c.fillRect(0, 0, canvas.width, canvas.height);
      // Date text
      c.save();
      c.font = `${datePx * SCALE}px Inter, system-ui, sans-serif`;
      c.textAlign = "center"; c.textBaseline = "middle";
      c.lineWidth = Math.max(2, Math.floor(datePx * 0.12)) * SCALE;
      c.strokeStyle = bg === "dark" ? "rgba(0,0,0,0.25)" : "rgba(0,0,0,0.12)";
      c.strokeText(dateText, (FRAME_W * SCALE)/2, dateBaselineY);
      c.fillStyle = T.gold;
      c.fillText(dateText, (FRAME_W * SCALE)/2, dateBaselineY);
      c.restore();
      // Gold panel border
      c.save();
      c.strokeStyle = T.gold; c.lineWidth = 2 * SCALE;
      c.strokeRect((SIDE_PAD / 2) * SCALE, SAFE_TOP * SCALE, (FRAME_W - SIDE_PAD) * SCALE, (drawH + dateBlockH + TOP_GAP) * SCALE);
      c.restore();
      // Base SVG snapshot
      c.drawImage(bgImg, 0, 0, liveW, liveH, drawX * SCALE, drawY * SCALE, drawW * SCALE, drawH * SCALE);
    }

    const recStart = performance.now();
    rec.start();
    // Track step progress and frame timing for dynamic confetti
let prevStep = -1;
let lastFrameTs = 0;

    (function loop() {
  const nowTs = performance.now();
  const elapsed = nowTs - recStart;
  const i = Math.min(STEPS_E - 1, Math.floor(elapsed / NOTE_MS_E));
  // Sub-step progress within the current step (0..1)
  const stepStartMs = Math.floor(elapsed / NOTE_MS_E) * NOTE_MS_E;
  const subFrac = Math.max(0, Math.min(1, (elapsed - stepStartMs) / NOTE_MS_E));

  // Δ-time between frames (seconds)
  const dtSec = lastFrameTs ? (nowTs - lastFrameTs) / 1000 : (1 / FPS);
  lastFrameTs = nowTs;

      // Draw base frame
      drawFrame();

      // Draw overlay image for this step (paths + glow + confetti) scaled to the content rect
      const ov = overlays[i];
      if (ov) {
        c.drawImage(ov, 0, 0, liveW, liveH, drawX * SCALE, drawY * SCALE, drawW * SCALE, drawH * SCALE);
      }
      // === Pulse head like live: draw a short glowing segment toward the next node ===
// Determine which key (maj/min) is active at this step and the last two spokes for that key
const segIdx = Math.floor(i / TOK_COUNT_E);                  // 0..3
const kNow: "maj"|"min" = (SEGMENTS_E[segIdx] === "BbMajor") ? "maj" : "min";

// Get all spokes for this key up to current step
const vis = exportPoints.filter(p => p.k === kNow && p.step <= i).map(p => p.spoke);

// Need at least two spokes to draw head from previous to current
if (vis.length >= 2) {
  const fromSpoke = vis[vis.length - 2];
  const toSpoke   = vis[vis.length - 1];
  const headColor = (kNow === "maj") ? T.gold : T.minor;
  drawPulseHead(c, fromSpoke, toSpoke, subFrac, headColor);
}

      // === Dynamic confetti (per frame) ===
if (hasConfetti) {
  // spawn new confetti for any new step index
  if (i > prevStep) {
    for (let s = prevStep + 1; s <= i; s++) spawnConfettiForStep(s);
    prevStep = i;
  }
  // update physics + draw on this frame
  updateAndDrawExportConfetti(c, dtSec);
}

     // Stop when the step schedule ends (+ small tail), independent of AudioContext drift
if (elapsed < TOTAL_MS_FIXED) {
  requestAnimationFrame(loop);
} else {
  rec.stop();
} 
    })();

    const recorded: Blob = await new Promise((res) => {
      rec.onstop = () => res(new Blob(chunks, { type: mimeType || "video/webm" }));
    });
    const outBlob = await convertToMp4Server(recorded);

    const safe = (inputDisplay || "date").replace(/[^A-Za-z0-9\-_.]+/g, "-");
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
}, [inputDisplay, bg, T, trailMode, tokens]);

  /* Render */
  const canPlay = normalized.trim().length > 0;

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
            Type any date. Examples: <strong>October 14, 2025</strong> • <strong>Oct. 14, 25</strong> • <strong>10/14/25</strong><br/>
            Allowed: A–Z, 0–9, <code>/ - , .</code>
          </div>

          {/* Input */}
          <form
            className="minw0"
            onSubmit={(e)=>{ e.preventDefault(); if (canPlay) start(); }}
            style={{ display:"flex", gap:8, alignItems:"center", justifyContent:"center", flexWrap:"wrap", paddingInline: 2 }}
          >
            <input
              value={raw}
              onChange={e => setRaw(sanitizeInputForDates(e.target.value))}
              placeholder="October 14, 2025"
              inputMode="text"
              enterKeyHint="done"
              onKeyDown={onKeyDown}
              onBlur={onBlur}
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
              aria-label="Type a date"
            />
            <button
              onClick={start}
              disabled={isRunning || !canPlay}
              style={{
                background: isRunning || !canPlay ? (bg === "dark" ? "#1a2430" : "#E8ECF2") : T.gold,
                color:      isRunning || !canPlay ? T.muted : (bg === "dark" ? "#081019" : "#FFFFFF"),
                border: "none",
                borderRadius: 999,
                padding: "10px 16px",
                fontWeight: 700,
                cursor: isRunning || !canPlay ? "not-allowed" : "pointer",
                fontSize: 16,
                minHeight: 40,
              }}
              title={hasPlayed ? "Replay" : "Play"}
            >
              {hasPlayed ? "⟲ Replay" : "▶ Play"}
            </button>
          </form>

          {/* Caption (sync highlight) */}
          <div className="caption" style={{ textAlign:"center", fontSize:18, color:T.text }}>
            {tokens.length
              ? tokens.map((t, i) => {
                  const label = t.kind === "rest" ? t.char : t.kind === "dual" ? t.src : t.kind === "chroma" ? "0" : t.src;
                  return <span key={i} className={i === capIdx ? "hl" : ""} style={{ marginInline:2, ["--gold" as any]: T.gold }}>{label}</span>;
                })
              : <span style={{ color:T.muted }}>Your input will be played here…</span>}
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
              {overlays.map(ov => (
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

          {/* Controls */}
          <div style={{ display:"grid", gap:10, paddingInline:6 }}>
            {/* Month interpretation */}
            <div style={{ display:"flex", gap:10, justifyContent:"center", flexWrap:"wrap" }}>
              <label style={{ display:"inline-flex", alignItems:"center", gap:6 }}>
                <input type="radio" name="mmode" value="word" checked={monthMode==="word"} onChange={()=>setMonthMode("word")} />
                <span>Month as <strong>Word</strong></span>
              </label>
              <label style={{ display:"inline-flex", alignItems:"center", gap:6 }}>
                <input type="radio" name="mmode" value="number" checked={monthMode==="number"} onChange={()=>setMonthMode("number")} />
                <span>Month as <strong>Number</strong></span>
              </label>
            </div>

            {/* Trails */}
            <div style={{ display:"flex", gap:8, justifyContent:"center", flexWrap:"wrap" }}>
              <select value={trailMode} onChange={e=>setTrailMode(e.target.value as TrailMode)}
                style={{ background: bg==="dark" ? "#0F1821" : "#F3F5F8", color:T.text, border:`1px solid ${T.border}`, borderRadius:8, padding:"8px 10px", fontSize:14 }}>
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

          {/* Actions */}
          <div className="vt-actions minw0" aria-label="Actions">
            {isExporting && (
              <div style={{ color: T.muted, fontSize: 12, textAlign: "center", width: "100%", marginTop: 6 }}>
                ⏺️ Recording…
              </div>
            )}
            <button
              onClick={start}
              disabled={isRunning || !canPlay}
              style={{
                background: isRunning || !canPlay ? (bg === "dark" ? "#1a2430" : "#E8ECF2") : T.gold,
                color:      isRunning || !canPlay ? T.muted : (bg === "dark" ? "#081019" : "#FFFFFF"),
                border: "none",
                borderRadius: 999,
                padding: "10px 16px",
                fontWeight: 700,
                cursor: isRunning || !canPlay ? "not-allowed" : "pointer",
                fontSize: 16,
                minHeight: 40,
              }}
              title={hasPlayed ? "Replay" : "Play"}
            >
              {hasPlayed ? "⟲ Replay" : "▶ Play"}
            </button>

            <div style={{ display:"flex", gap:10, alignItems:"center" }}>
              <button onClick={onDownloadVideo} disabled={!canPlay} title="Download"
                style={{ background:"transparent", color: T.gold, border:"none", borderRadius:999, padding:"6px 10px", fontWeight:700, cursor:!canPlay?"not-allowed":"pointer", minHeight:32, fontSize:14 }}>
                💾 <span className="action-text">Download</span>
              </button>
              <button onClick={() => setShareOpen(true)} title="Share"
                style={{ background:"transparent", color: T.gold, border:"none", borderRadius:999, padding:"6px 10px", fontWeight:700, cursor:"pointer", minHeight:32, fontSize:14 }}>
                📤 <span className="action-text">Share</span>
              </button>
            </div>
          </div>

          {/* Copy toast */}
          {linkCopied && (
            <div style={{ color: T.minor, fontSize: 12, fontWeight: 600, textAlign: "right", width: "100%" }}>
              Link copied!
            </div>
          )}
          {/* Share Sheet */}
          {shareOpen && (
            <div role="dialog" aria-modal="true"
              style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 9999 }}
              onClick={() => setShareOpen(false)}>
              <div
                style={{
                  width: "100%", maxWidth: 520, background: bg==="dark" ? "#0F1821" : "#FFFFFF",
                  borderTop: `1px solid ${T.border}`, borderLeft: `1px solid ${T.border}`, borderRight: `1px solid ${T.border}`,
                  borderRadius: "12px 12px 0 0", padding: 12, boxSizing: "border-box",
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <div style={{ textAlign: "center", color: T.text, fontWeight: 800, marginBottom: 8 }}>Share your melody</div>
                <button
                  onClick={async () => {
                    const url = buildShareUrl();
                    try { await navigator.clipboard.writeText(url); setShareOpen(false); setLinkCopied(true); setTimeout(() => setLinkCopied(false), 1600); }
                    catch { alert(url); }
                  }}
                  style={{ width: "100%", padding: "10px 12px", marginBottom: 6, background: T.gold, color: bg==="dark"?"#081019":"#FFFFFF", borderRadius: 8, border: "none", fontWeight: 800 }}
                >
                  🔗 Copy Link
                </button>
                <button onClick={() => setShareOpen(false)}
                  style={{ width: "100%", padding: "8px 12px", marginTop: 8, background: T.bg, color: T.muted, borderRadius: 8, border: `1px solid ${T.border}`, fontWeight: 700 }}>
                  Close
                </button>
              </div>
            </div>
          )}
        </section>

        {/* Why these numbers CTA */}
        <div style={{ marginTop: 20, display: "flex", justifyContent: "center" }}>
          <a
            href="/learn/why-these-numbers"
            style={{
              display: "inline-flex", alignItems: "center", gap: "6px", fontWeight: 700, fontSize: 15,
              color: T.gold, textDecoration: "none", border: `1px solid ${T.border}`,
              borderRadius: 12, padding: "8px 14px", boxShadow: bg==="dark" ? "0 1px 3px rgba(0,0,0,0.2)" : "0 1px 3px rgba(0,0,0,0.06)",
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