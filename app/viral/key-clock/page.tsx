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
   Input: sanitize + T9 + tokenizer (KeyClock)
========================= */
// Allow dates/words/separators: A–Z, 0–9, comma, space, + # * -
function sanitizeKeyClockInput(s: string): string {
  return s.replace(/[^0-9A-Za-z\+\#\*\- ,]/g, "").toUpperCase();
}

const T9: Record<string, string> = {
  A:"2",B:"2",C:"2", D:"3",E:"3",F:"3", G:"4",H:"4",I:"4",
  J:"5",K:"5",L:"5", M:"6",N:"6",O:"6", P:"7",Q:"7",R:"7",S:"7",
  T:"8",U:"8",V:"8", W:"9",X:"9",Y:"9",Z:"9",
};

type ZeroPolicy = "chromatic" | "rest" | "ticks";
type Token =
  | { kind:"rest"; char:"-"}            // explicit dash or comma/space rest-tick
  | { kind:"deg";    d:Diatonic; up?: boolean; src:string; srcChar?: string }
  | { kind:"chroma"; c:Chromatic; src:"0";   srcChar?: string }
  | { kind:"intro" }            // '+'
  | { kind:"resolve" }          // '#'
  | { kind:"toggle" }           // '*'
;

// Flip for 0 chromatic alternation
const zeroFlipRef = { current: true };

function pushDigit(tokens: Token[], digit: string, zeroPolicy: ZeroPolicy, originChar?: string) {
if (digit === "0") {
  if (zeroPolicy === "rest") { tokens.push({ kind:"rest", char:"-" }); return; }
  // chromatic OR ticks → both produce playable chroma (♭2/♯4); ticks will get short audio later
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

function tokenizeKeyClock(raw: string, zeroPolicy: ZeroPolicy): Token[] {
  const s = sanitizeKeyClockInput(raw);
  const out: Token[] = [];
  zeroFlipRef.current = true;
  let i = 0;
  if (s.startsWith("+")) { out.push({ kind:"intro" }); i = 1; }

  for (; i < s.length; i++) {
    const ch = s[i];
    if (ch === ",") { out.push({ kind:"rest", char:"-" }); continue; } // rest tick
    if (ch === " ") { out.push({ kind:"rest", char:"-" }); continue; } // rest tick
    if (ch === "-") { out.push({ kind:"rest", char:"-" }); continue; }
    if (ch === ":") { out.push({ kind:"rest", char:"-" }); continue; }
    if (ch === "#") { out.push({ kind:"resolve" }); continue; }
    if (ch === "*") { out.push({ kind:"toggle" }); continue; } // treat as short rest
    if (/[A-Z]/.test(ch)) { pushDigit(out, T9[ch], zeroPolicy, ch); continue; }
    if (/[0-9]/.test(ch)) { pushDigit(out, ch, zeroPolicy); continue; }
  }
  return out;
}

/* =========================
   Export helpers (unchanged)
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

// === Digit-run timing ===
const STEP_MS = 250;
function totalForDigitRun(n: number): number {
  if (n <= 1) return 1.00 * STEP_MS;
  if (n === 2) return 1.00 * STEP_MS;
  if (n === 3) return 1.25 * STEP_MS;
  if (n === 4) return 1.50 * STEP_MS;
  const scaled = (1 + 0.15 * (n - 2)) * STEP_MS;
  return Math.min(1.75 * STEP_MS, scaled);
}

// Build schedule items with variable durations for **digits runs only**
type SItem = {
  tok: Token | null;
  // Is this a playable that should advance the caption highlight?
  isPlayable: boolean;
  // Duration for this item in milliseconds
  dur: number;
};

function buildSchedule(tokens: Token[], zeroPolicy: ZeroPolicy): SItem[] {
  // Identify contiguous digit spans **in the original input** by re-walking a letter/digit view:
  // We treat tokens that originated from letters as letters (non-digit runs),
  // digits '0'..'9' are digit runs; controls/separators break runs.
  // Approach: reconstruct a light "char stream" from tokens: for each token,
  //   - if tok has srcChar (letter) => 'L'
  //   - else if tok is deg/chroma with src in "0..9" or rest from '-' or comma => 'D'/'R'
  //   - control marks => 'C'
  // But we also need the original chars to count zeros-as-rest inside runs.
  // Simpler: we compute runs directly over a synthetic char stream derived from tokens:
  const kinds: ("digit"|"letter"|"rest"|"control"|"other")[] = tokens.map(t => {
    if (!t) return "other";
    if (t.kind === "deg" || t.kind === "chroma") {
      if ((t as any).srcChar) return "letter";
      const src = (t as any).src;
      if (src >= "0" && src <= "9") return "digit";
      return "other";
    }
    if (t.kind === "rest") return "rest";
    if (t.kind === "intro" || t.kind === "resolve" || t.kind === "toggle") return "control";
    return "other";
  });

  // Build per-item durations
  const out: SItem[] = new Array(tokens.length);
  let i = 0;
  while (i < tokens.length) {
    const k = kinds[i];
    // letters, rest, control => 1×STEP
    if (k === "letter" || k === "rest" || k === "control" || k === "other") {
      const tok = tokens[i];
      const isPlayable =
        tok != null &&
        ((tok.kind === "deg" || tok.kind === "chroma") && !(tok.kind === "chroma" && tok.src === "0" && zeroPolicy === "rest")) &&
        !(tok.kind === "deg" && tok.src === "0" && zeroPolicy === "rest"); // defensive
      const playable2 =
        tok != null &&
        (tok.kind === "deg" || tok.kind === "chroma") &&
        !(tok.kind === "chroma" && tok.src === "0" && zeroPolicy === "rest");
      out[i] = { tok, isPlayable: playable2, dur: STEP_MS };
      i++;
      continue;
    }

    // digit run => split the run's total across items
    if (k === "digit") {
      let j = i;
      while (j < tokens.length && kinds[j] === "digit") j++;
      const n = j - i; // length of digit run
      const total = totalForDigitRun(n);
      const per = total / n;
      for (let p = 0; p < n; p++) {
        const tok = tokens[i + p];
        const isPlayable =
          tok != null &&
          (tok.kind === "deg" || tok.kind === "chroma") &&
          !(tok.kind === "chroma" && tok.src === "0" && zeroPolicy === "rest");
        out[i + p] = { tok, isPlayable, dur: per };
      }
      i = j;
      continue;
    }
  }
  return out;
}

// ===== Caption helpers (same look as ToneDial) =====
function ordinalLabel(n: number) {
  if (n === 1) return "1st";
  if (n === 2) return "2nd";
  if (n === 3) return "3rd";
  return `${n}th`;
}
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
function renderWithSupers(token: string): React.ReactNode {
  const invMatch = token.match(/^(\d+)(st|nd|rd|th)\s+(inv)$/i);
  if (invMatch) {
    const [, num, suf, tail] = invMatch;
    return (<>{num}<sup style={{fontSize:"0.65em",verticalAlign:"super"}}>{suf}</sup> {tail}</>);
  }
  const ordMatch = token.match(/^(\d+)(st|nd|rd|th)$/i);
  if (ordMatch) {
    const [, num, suf] = ordMatch;
    return (<>{num}<sup style={{fontSize:"0.65em",verticalAlign:"super"}}>{suf}</sup></>);
  }
  if (/^[♭♯]\d+(\/[♭♯]\d+)?$/.test(token)) {
    const parts = token.split("/");
    const renderPart = (p: string) => {
      const m = p.match(/^([♭♯])(\d+)$/);
      if (!m) return <>{p}</>;
      const [, acc, num] = m;
      return (<>{acc}<sup style={{fontSize:"0.65em",verticalAlign:"super"}}>{num}</sup></>);
    };
    return (<>{renderPart(parts[0])}{parts[1]?<><span>/</span>{renderPart(parts[1])}</>:null}</>);
  }
  return <>{token}</>;
}

// Canvas helpers (measure/draw with superscripts)
function drawTokenWithSup(ctx: CanvasRenderingContext2D, text: string, x: number, y: number): number {
  let m = text.match(/^(\d+)(st|nd|rd|th)\s+(inv)$/i);
  if (m) {
    const [ , num, suf, tail ] = m;
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
  ctx.fillText(text, x, y);
  return ctx.measureText(text).width;
}
function measureTokenWithSup(ctx: CanvasRenderingContext2D, text: string): number {
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

// Romans for bottom line
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

export default function KeyClockPage() {
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
      const q = sp.get("q"); if (q) setRaw(sanitizeKeyClockInput(q));
      const t = sp.get("trail"); if (t === "pulse" || t === "glow" || t === "lines" || t === "glow+confetti" || t === "lines+confetti") setTrailMode(t as TrailMode);
      const b = sp.get("bg"); if (b === "dark" || b === "light") setBg(b as BgMode);
      const z = sp.get("zero");
if (z === "chromatic" || z === "rest" || z === "ticks") setZeroPolicy(z as ZeroPolicy);
    } catch {}
  }, []);
  
// Remove unsupported characters; keep letters, digits, and basic symbols
function sanitizePhoneInput(s: string): string {
  // Allow digits, letters, dash/space, comma, period, apostrophe, slash, parentheses, and colon
  return s.replace(/[^0-9A-Za-z:\-\s,.'\/()]/g, "").toUpperCase();
} useEffect(() => {
  drawCaptionCanvas(-1, "BbMajor"); // no highlight, Maj palette
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
  const [showDegreesStrip, setShowDegreesStrip] = useState(true);

  // Pulse overlay
  const [hotPulse, setHotPulse] = useState<{ x:number; y:number; color:string } | null>(null);
  const hotPulseClearRef = useRef<number | null>(null);

  // Refs
  const svgRef = useRef<SVGSVGElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef<number>(0);
  const t0Ref = useRef<number>(0);
  // Caption canvas (live)
  const captionCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const playedIdxRef = useRef(0);
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

  // Tokens + schedule (variable durations)
  const tokens = useMemo(() => tokenizeKeyClock(raw, zeroPolicy), [raw, zeroPolicy]);
  const schedule = useMemo(() => buildSchedule(tokens, zeroPolicy), [tokens, zeroPolicy]);
  // --- Keep live caption visible when not running ---
useEffect(() => {
  if (!isRunning) {
    drawCaptionCanvas(-1, "BbMajor"); // idle preview, Major palette
  }
}, [raw, tokens, zeroPolicy, bg, isRunning]);

  // ==== Caption building (same behavior as ToneDial) ====
  // Build caption (playables only) + helper chain for last typed char
  function buildCaptionAndCurrentChain(
    raw: string,
    tokens: Token[],
    zeroPolicy: ZeroPolicy
  ): { caption: string[]; currentChain: string[] } {
    const caption: string[] = [];
    let currentChain: string[] = [];

    // caption = final playable tokens only
    for (const t of tokens) {
      if (t.kind === "deg") caption.push(ordinalLabel(Number(t.d)));
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
    if (lastChar === "-" || lastChar === "," || lastChar === " ") return { caption, currentChain: [lastChar, "rest"] };

    // Letters
    if (/[A-Z]/.test(lastChar)) {
      const group = t9GroupLabel(lastChar) ?? "";
      const d = T9[lastChar]; // "2".."9"
      if (!lastPlayable) return { caption, currentChain: [lastChar, group, d] };

      if (lastPlayable.kind === "deg") {
        const lab = ordinalLabel(Number(lastPlayable.d));
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
        if (/[1-7]/.test(lastChar)) return { caption, currentChain: [lastChar, ordinalLabel(Number(lastChar))] };
        return { caption, currentChain: [lastChar] };
      }

      if (lastPlayable.kind === "deg") {
        const lab = ordinalLabel(Number(lastPlayable.d));
        if ((lastPlayable as any).up) {
          const invLab = (lastPlayable.src === "8") ? "1st inv" : (lastPlayable.src === "9") ? "2nd inv" : lab;
          return { caption, currentChain: [lastChar, invLab] };
        } else {
          return { caption, currentChain: [lastChar, lab] };
        }
      } else {
        return { caption, currentChain: [lastChar, lastPlayable.c] };
      }
    }

    return { caption, currentChain };
  }

  function buildDegreesLineTokens(raw: string, tokens: Token[], zeroPolicy: ZeroPolicy): string[] {
    const out: string[] = [];
    const playable = tokens.filter(t => t.kind === "deg" || t.kind === "chroma");
    let pi = 0;
    const s = (raw || "").toUpperCase();
    for (let i = 0; i < s.length; i++) {
      const ch = s[i];

      if (ch === "+" || ch === "#" || ch === "*" || ch === " " || ch === ",") { out.push(ch); continue; }
      if (ch === "-") { out.push("-"); continue; }

      if (/[A-Z0-9]/.test(ch)) {
        if (ch === "0" && zeroPolicy === "rest") { out.push("-"); continue; }
        const t = playable[pi++];
        if (!t) {
          if (ch === "8") { out.push("1st inv"); continue; }
          if (ch === "9") { out.push("2nd inv"); continue; }
          if (ch === "0") { out.push(zeroPolicy === "rest" ? "·" : "♭2/#4"); continue; }
          if (/[1-7]/.test(ch)) { out.push(ordinalLabel(Number(ch))); continue; }
          out.push("·"); continue;
        }
        if (t.kind === "deg") {
          if (t.src === "8") out.push("1st inv");
          else if (t.src === "9") out.push("2nd inv");
          else out.push(ordinalLabel(Number(t.d)));
        } else {
          out.push(t.c);
        }
        continue;
      }
      out.push("·");
    }
    return out;
  }

  const { caption: captionDegrees, currentChain } = useMemo(() => {
    return buildCaptionAndCurrentChain(raw, tokens, zeroPolicy);
  }, [raw, tokens, zeroPolicy]);
  const degreesStrip = useMemo(() => {
    return buildDegreesLineTokens(raw, tokens, zeroPolicy);
  }, [raw, tokens, zeroPolicy]);

/* Helpers */
function appendTrail(
  spoke: number,
  key: KeyName,
  colorMaj: string = T.gold,
  colorMin: string = T.minor
) {
  const dq = key === "BbMajor" ? nodesMajRef.current : nodesMinRef.current;
  dq.push(spoke);
  if (dq.length > TRAIL_N + 1) dq.splice(0, dq.length - (TRAIL_N + 1));
  const pathMaj = pathFromNodes(nodesMajRef.current);
  const pathMin = pathFromNodes(nodesMinRef.current);
  setOverlays([
    { id: "maj", color: colorMaj, path: pathMaj },
    { id: "min", color: colorMin, path: pathMin },
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
   Live playback with variable timing (Major×2 → Minor×2)
========================= */
const SEGMENTS: KeyName[] = ["BbMajor","BbMajor","Cminor","Cminor"];

// Major/minor label helpers for canvas bottom line
function labelForTokenCanvas(tok: Token, key: KeyName): string {
  if (tok.kind === "rest") return "·";
  if (tok.kind === "intro") return "+";
  if (tok.kind === "resolve") return "#";
  if (tok.kind === "toggle") return "*";
  const isMinor = (key === "Cminor");
  const isLetter = !!(tok as any).srcChar;
  if (tok.kind === "chroma") return "♭2/♯4";
  if (tok.kind === "deg") {
    if (isLetter) {
      const n = Number(tok.d);
      return n === 1 ? "1st" : n === 2 ? "2nd" : n === 3 ? "3rd" : `${n}th`;
    }
    if ("1234567".includes(tok.src)) return isMinor ? romanMinor(tok.d)! : romanMajor(tok.d)!;
    if (tok.src === "8") return "1st inv";
    if (tok.src === "9") return "2nd inv";
  }
  return "·";
}

/* ===== Live caption (two lines, with playable-only highlight) ===== */
function drawCaptionCanvas(activePlayableIdx: number, keyNow: KeyName) {
  const cvs = captionCanvasRef.current;
  if (!cvs) return;
  const ctx = cvs.getContext("2d");
  if (!ctx) return;

  // Fit DPR
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

  const src = (raw || "").toUpperCase().split("");
  const playable = tokens.filter(t => t.kind === "deg" || t.kind === "chroma");

  // Build labels array per current pass, aligned to source chars.
  const labels: string[] = new Array(src.length).fill("");
  {
    let p = 0;
    for (let ci = 0; ci < src.length && p < playable.length; ci++) {
      const ch = src[ci];
      if (/[A-Z0-9]/.test(ch)) {
        // Zero as Rest → label '-' and DO NOT consume a playable
        if (ch === "0" && zeroPolicy === "rest") { labels[ci] = "-"; continue; }
        labels[ci] = labelForTokenCanvas(playable[p], keyNow);
        p++;
      }
    }
  }

  // Display array for the top line with " · " seps; keep char index mapping
  type Disp = { txt: string; isSep: boolean; charIndex: number };
  const disp: Disp[] = [];
  for (let ci = 0; ci < src.length; ci++) {
    disp.push({ txt: src[ci], isSep: false, charIndex: ci });
    disp.push({ txt: " · ", isSep: true, charIndex: -1 });
  }

  // Active char index from the playables-only map
const p2c = playableToCharRef.current;
const activeChar = (activePlayableIdx >= 0 && activePlayableIdx < p2c.length) ? p2c[activePlayableIdx] : -1;

  // Typography & positions
  const topPx = 16;
  const botPx = 13;
  const gap = 4;
  const padX = 8;
  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "left";

  ctx.font = `${topPx}px Inter, system-ui, sans-serif`;
  const widths = disp.map(d => ctx.measureText(d.txt).width);
  const totalW = widths.reduce((a,b)=>a+b, 0);
  let x = Math.max(padX, (cssW - totalW) / 2);
  const topY = Math.round(topPx + 2);
  const botY = Math.round(topY + gap + botPx + 2);

  const activeColor = (keyNow === "BbMajor") ? T.gold : T.minor;

  // ---- top line ----
  for (let i = 0; i < disp.length; i++) {
    const el = disp[i];
    if (el.isSep) {
      ctx.fillStyle = T.muted;
      ctx.fillText(el.txt, x, topY);
      x += widths[i];
      continue;
    }
    const isActive = (el.charIndex === activeChar);
    ctx.fillStyle = isActive ? activeColor : T.text;
    ctx.fillText(el.txt, x, topY);
    x += widths[i];
  }

  // ---- bottom line ----
  x = Math.max(padX, (cssW - totalW) / 2);
  ctx.font = `${botPx}px Inter, system-ui, sans-serif`;
  for (let i = 0; i < disp.length; i++) {
    const el = disp[i];
    if (el.isSep) { x += widths[i]; continue; }
    const lab = labels[el.charIndex] || "";
    if (!lab) { x += widths[i]; continue; }

    const isActive = (el.charIndex === activeChar);
    ctx.fillStyle = isActive ? activeColor : T.text;

    if (lab === "♭2/♯4") {
      // stack ♭2 / ♯4
      const topLab = "♭2";
      const botLab = "♯4";
      const wTop = measureTokenWithSup(ctx, topLab);
      const wBot = measureTokenWithSup(ctx, botLab);
      const xTop = x + (widths[i] - wTop) / 2;
      const xBot = x + (widths[i] - wBot) / 2;
      drawTokenWithSup(ctx, topLab, xTop, botY);
      drawTokenWithSup(ctx, botLab, xBot, botY + (botPx + 2));
    } else if (/^\d+(st|nd|rd|th)\s+inv$/i.test(lab)) {
      // stack 'inv' below ordinal
      const topLab = lab.replace(/\s+inv$/i, "");
      const botLab = "inv";
      const prevFont = ctx.font;
      const smallPx = Math.round(botPx * 0.6);
      ctx.font = `${smallPx}px Inter, system-ui, sans-serif`;
      const wTop = measureTokenWithSup(ctx, topLab);
      const wBot = ctx.measureText(botLab).width;
      const xTop = x + (widths[i] - wTop) / 2;
      const xBot = x + (widths[i] - wBot) / 2;
      drawTokenWithSup(ctx, topLab, xTop, botY);
      ctx.fillText(botLab, xBot, botY + smallPx + 2);
      ctx.font = prevFont;
    } else {
      // single line token
      const wLab = measureTokenWithSup(ctx, lab);
      const xLab = x + (widths[i] - wLab) / 2;
      drawTokenWithSup(ctx, lab, xLab, botY);
    }
    x += widths[i];
  }
}
/* =========================
   Export (Download): parity with live
========================= */
const onDownloadVideo = useCallback(async () => {
  setIsExporting(true);
  try {
    const svgEl = svgRef.current;
    if (!svgEl) { setIsExporting(false); return; }

    await unlockCtx();

    // 1) Background snapshot (circle + static labels)
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
    const titleText = raw || "Type a date or text";

    function measurePx(px: number) {
      c.font = `${px * SCALE}px Inter, system-ui, sans-serif`;
      const m = c.measureText(titleText);
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
    const titlePx = best;
    const { h: titleBlockH } = measurePx(titlePx);

    const availW = FRAME_W - SIDE_PAD * 2;
    const goldTop = SAFE_TOP + titleBlockH + TOP_GAP;
    const availH = Math.max(2, FRAME_H - goldTop - SAFE_BOTTOM);
    const scaleContent = Math.min(availW / liveW, availH / liveH);
    const drawW = Math.round(liveW * scaleContent);
    const drawH = Math.round(liveH * scaleContent);
    const drawX = Math.round((FRAME_W - drawW) / 2);

    // 4) Schedule (Major×2 → Minor×2)
    const NOTE_MS_E = 250;
    const TOK_COUNT_E = Math.max(1, tokens.length);
    const SEGMENTS_E: KeyName[] = ["BbMajor","BbMajor","Cminor","Cminor"];
    // Show caption only during the 2nd Major pass (index 1) in export
    const SHOW_CAPTION_SEG_IDX = 1;
    const STEPS_E = TOK_COUNT_E * SEGMENTS_E.length;
    const hasIntro = tokens.some(t => (t as any).kind === "intro");
    const t0 = ac.currentTime + 0.25;

    // Schedule utilities (export-only, routed to exportDst)
    function scheduleNoteByDeg(at: number, d: Diatonic, key: KeyName, up?: boolean, dur = 0.25) {
      const midi = degreeToMidi(d, key, up);
      const name = midiToNoteName(midi);
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
    const wrapDeg = (n: number): Diatonic => (["1","2","3","4","5","6","7"][(n - 1 + 7) % 7] as Diatonic);
    function triadDegrees(root: Diatonic): [Diatonic, Diatonic, Diatonic] {
      const r = Number(root);
      return [wrapDeg(r), wrapDeg(r + 2), wrapDeg(r + 4)];
    }
    function scheduleTriad(at: number, root: Diatonic, key: KeyName, dur = 0.25) {
      const [r, t3, t5] = triadDegrees(root);
      scheduleNoteByDeg(at, r,  key, false, dur);
      scheduleNoteByDeg(at, t3, key, false, dur);
      scheduleNoteByDeg(at, t5, key, false, dur);
    }
    function scheduleFirstInvTonic(at: number, key: KeyName, dur = 0.25) {
      scheduleNoteByDeg(at, "3", key, false, dur);
      scheduleNoteByDeg(at, "5", key, false, dur);
      scheduleNoteByDeg(at, "1", key, true,  dur);
    }
    function scheduleSecondInvSupertonic(at: number, key: KeyName, dur = 0.25) {
      scheduleNoteByDeg(at, "6", key, false, dur);
      scheduleNoteByDeg(at, "2", key, true,  dur);
      scheduleNoteByDeg(at, "4", key, true,  dur);
    }
    function scheduleIntroChordE(at: number, key: KeyName) {
      (["1","3","5"] as Diatonic[]).forEach((d, idx) => scheduleNoteByDeg(at + idx * 0.06, d, key));
    }
    function scheduleResolveCadenceE(at: number, key: KeyName) {
      scheduleNoteByDeg(at,        "5", key);
      scheduleNoteByDeg(at + 0.12, "1", key);
    }
    // --- Tiny tick for Zero (rest) policy (EXPORT) ---
function scheduleTickE(at: number) {
  const midi = 60; // C4
  const name = midiToNoteName(midi);
  loadBuffer(name).then(buf => {
    const src = ac.createBufferSource(); src.buffer = buf;
    const g = ac.createGain();
    g.gain.setValueAtTime(0, at);
    g.gain.linearRampToValueAtTime(0.45, at + 0.006);
    g.gain.setTargetAtTime(0, at + 0.05, 0.05);
    src.connect(g); g.connect(exportDst); g.connect(ac.destination);
    try { src.start(at); src.stop(at + 0.10); } catch {}
  }).catch(()=>{});
}

    // Points for overlays
    type ExpPoint = { k:"maj"|"min"; step:number; spoke:number };
    const exportPoints: ExpPoint[] = [];

    for (let i = 0; i < STEPS_E; i++) {
      let segIdx = Math.floor(i / TOK_COUNT_E) % SEGMENTS_E.length;
let keyNowE: KeyName = SEGMENTS_E[segIdx];
      // --- Pulse rendering for export (works when Trails = "pulse" or "+confetti") ---

      const kTag: "maj" | "min" = keyNowE === "BbMajor" ? "maj" : "min";
      const tok = tokens[i % TOK_COUNT_E];
      const at = t0 + i * (NOTE_MS_E / 1000);

      if (hasIntro && (i % TOK_COUNT_E) === 0) scheduleIntroChordE(at, keyNowE);
      if (!tok) continue;
      if (tok.kind === "toggle" || tok.kind === "intro") continue;
      if (tok.kind === "resolve") { scheduleResolveCadenceE(at, keyNowE); continue; }
      if (tok.kind === "rest") {
  if ((tok as any).char === "0") scheduleTickE(at);
  continue;
}

      if (tok.kind === "deg" || tok.kind === "chroma") {
        const isLetter = !!(tok as any).srcChar;

        if (isLetter) {
          if (tok.kind === "deg") {
            if (tok.up && tok.src === "8") {
              scheduleNoteByDeg(at, "1", keyNowE, false);
              scheduleNoteByDeg(at, "1", keyNowE, true );
              const spoke = degToIndexForKey("1", keyNowE); if (spoke >= 0) exportPoints.push({ k:kTag, step:i, spoke });
            } else if (tok.up && tok.src === "9") {
              scheduleNoteByDeg(at, "1", keyNowE, false);
              scheduleNoteByDeg(at, "2", keyNowE, true );
              const spoke = degToIndexForKey("1", keyNowE); if (spoke >= 0) exportPoints.push({ k:kTag, step:i, spoke });
            } else {
              scheduleNoteByDeg(at, tok.d, keyNowE, tok.up);
              const spoke = degToIndexForKey(tok.d, keyNowE); if (spoke >= 0) exportPoints.push({ k:kTag, step:i, spoke });
            }
          } else {
            const pc = degreeToPcOffset(tok.c as DegLabel, keyNowE);
            const midi = snapPcToComfortableMidi(pc);
            const name = midiToNoteName(midi);
            loadBuffer(name).then(buf => {
              const src = ac.createBufferSource(); src.buffer = buf;
              const g = ac.createGain();
              g.gain.setValueAtTime(0, at);
              g.gain.linearRampToValueAtTime(1, at + 0.01);
              g.gain.setTargetAtTime(0, at + 0.20, 0.05);
              src.connect(g); g.connect(exportDst); g.connect(ac.destination);
              try { src.start(at); src.stop(at + 0.25); } catch {}
            }).catch(()=>{});
            const spoke = DEGREE_ORDER.indexOf(tok.c as any);
            if (spoke >= 0) exportPoints.push({ k:kTag, step:i, spoke });
          }
        } else {
          if (tok.kind === "deg") {
            if ("1234567".includes(tok.src)) {
              scheduleTriad(at, tok.d, keyNowE);
              const spoke = degToIndexForKey(tok.d, keyNowE); if (spoke >= 0) exportPoints.push({ k:kTag, step:i, spoke });
            } else if (tok.src === "8") {
              scheduleFirstInvTonic(at, keyNowE);
              const spoke = degToIndexForKey("1", keyNowE); if (spoke >= 0) exportPoints.push({ k:kTag, step:i, spoke });
            } else if (tok.src === "9") {
              scheduleSecondInvSupertonic(at, keyNowE);
              const spoke = degToIndexForKey("2", keyNowE); if (spoke >= 0) exportPoints.push({ k:kTag, step:i, spoke });
            }
          } else if (tok.kind === "chroma") {
  const pc = degreeToPcOffset(tok.c as DegLabel, keyNowE);
  const midi = snapPcToComfortableMidi(pc);
  const name = midiToNoteName(midi);

  const isZeroChroma = (tok as any).src === "0";
  const useTickEnv = isZeroChroma && (zeroPolicy === "ticks");

  loadBuffer(name).then(buf => {
    const src = ac.createBufferSource(); src.buffer = buf;
    const g = ac.createGain();

    if (useTickEnv) {
      // Short tick envelope routed to export + speakers
      g.gain.setValueAtTime(0, at);
      g.gain.linearRampToValueAtTime(0.45, at + 0.006);
      g.gain.setTargetAtTime(0, at + 0.05, 0.05);
      src.connect(g); g.connect(exportDst); g.connect(ac.destination);
      try { src.start(at); src.stop(at + 0.10); } catch {}
    } else {
      // Normal chroma envelope (unchanged behavior)
      g.gain.setValueAtTime(0, at);
      g.gain.linearRampToValueAtTime(1, at + 0.01);
      g.gain.setTargetAtTime(0, at + 0.20, 0.05);
      src.connect(g); g.connect(exportDst); g.connect(ac.destination);
      try { src.start(at); src.stop(at + 0.25); } catch {}
    }
  }).catch(()=>{});

  const spoke = DEGREE_ORDER.indexOf(tok.c as any);
  if (spoke >= 0) exportPoints.push({ k:kTag, step:i, spoke });
}
        }
      }
    }

    // 5) Pre-render overlay frames (non-pulse)
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
      for (let k = 0; k < STEPS_E; k++) overlayImgs.push(await svgToImage(overlaySvgForStep(k)));
    }

    // 6) Export caption helpers (scoped)
    function measureTokenWithSupE(ctx: CanvasRenderingContext2D, text: string): number {
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
    function drawTokenWithSupE(ctx: CanvasRenderingContext2D, text: string, x: number, y: number): number {
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
      ctx.fillText(text, x, y);
      return ctx.measureText(text).width;
    }

    // Build playableIndex -> charIndex (export caption highlight)
    const srcStrE = (raw || "").toUpperCase();
    const playableE = tokens.filter(t => t.kind === "deg" || t.kind === "chroma");
    const p2cE: number[] = [];
    {
      let ci = 0;
      for (let p = 0; p < playableE.length; p++) {
        while (ci < srcStrE.length) {
          const ch = srcStrE[ci];
          if (/[A-Z0-9]/.test(ch)) {
            if (ch === "0" && zeroPolicy === "rest") { ci++; continue; }
            p2cE.push(ci);
            ci++;
            break;
          }
          ci++;
        }
      }
    }

    // Canvas caption (export) — two lines + active highlight
    function labelForTokenCanvasExport(tok: Token, key: KeyName): string {
      // identical to the live version above
      if (tok.kind === "rest") return "·";
      if (tok.kind === "intro") return "+";
      if (tok.kind === "resolve") return "#";
      if (tok.kind === "toggle") return "*";
      const isMinor = (key === "Cminor");
      const isLetter = !!(tok as any).srcChar;
      if (tok.kind === "chroma") return "♭2/♯4";
      if (tok.kind === "deg") {
        if (isLetter) {
          const n = Number(tok.d);
          return n === 1 ? "1st" : n === 2 ? "2nd" : n === 3 ? "3rd" : `${n}th`;
        }
        if ("1234567".includes(tok.src)) return isMinor ? romanMinor(tok.d)! : romanMajor(tok.d)!;
        if (tok.src === "8") return "1st inv";
        if (tok.src === "9") return "2nd inv";
      }
      return "·";
    }
   // ==== Export caption (top line always, bottom degrees optional) ====
function drawExportCaption(
  ctx: CanvasRenderingContext2D,
  activePlayable: number,
  keyNow: KeyName,
  showBottom: boolean
) {
  const src = (raw || "").toUpperCase().split("");
  const playable = tokens.filter(t => t.kind === "deg" || t.kind === "chroma");

  // Build labels per char (for current key pass)
  const labels: string[] = new Array(src.length).fill("");
  {
    let p = 0;
    for (let ci = 0; ci < src.length && p < playable.length; ci++) {
      if (/[A-Z0-9]/.test(src[ci])) {
        if (src[ci] === "0" && zeroPolicy === "rest") { labels[ci] = "-"; continue; }
        labels[ci] = labelForTokenCanvas(playable[p], keyNow);
        p++;
      }
    }
  }

  // Display array with separators " · "
  type Disp = { txt: string; isSep: boolean; charIndex: number };
  const disp: Disp[] = [];
  for (let ci = 0; ci < src.length; ci++) {
    disp.push({ txt: src[ci], isSep: false, charIndex: ci });
    disp.push({ txt: " · ", isSep: true, charIndex: -1 });
  }

  // Geometry (gold panel above circle)
  const topPx = 48, botPx = 39, gap = 10, padX = 48;
  const topFont = `${topPx * SCALE}px Inter, system-ui, sans-serif`;
  const botFont = `${botPx * SCALE}px Inter, system-ui, sans-serif`;
  const capX = (FRAME_W * SCALE - (drawW * SCALE)) / 2 + (padX * SCALE);
  const capW = (drawW * SCALE) - (padX * 2 * SCALE);
  const capLift = 70 * SCALE;
  const topY = (goldTop * SCALE) + (topPx * SCALE) + 4 - capLift;
  const botY = topY + (gap * SCALE) + (botPx * SCALE);

  // Active char highlight
  const activeChar = (activePlayable >= 0 && activePlayable < p2cE.length) ? p2cE[activePlayable] : -1;
  const activeColor = (keyNow === "BbMajor")
    ? (bg === "dark" ? themeDark.gold : themeLight.gold)
    : (bg === "dark" ? themeDark.minor : themeLight.minor);

  // Measure with top font
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.font = topFont;
  const widths = disp.map(d => ctx.measureText(d.txt).width);
  const totalW = widths.reduce((a,b)=>a+b, 0);
  let x = capX + Math.max(0, (capW - totalW) / 2);

  // ---- top line (input) — ALWAYS shown ----
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

  // ---- bottom line (degrees) — ONLY when showBottom === true ----
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
        const topLab = "♭2";
        const botLab = "♯4";
        const wTop = measureTokenWithSupE(ctx, topLab);
        const wBot = measureTokenWithSupE(ctx, botLab);
        const xTop = x + (cellW - wTop) / 2;
        const xBot = x + (cellW - wBot) / 2;
        drawTokenWithSupE(ctx, topLab, xTop, botY);
        drawTokenWithSupE(ctx, botLab, xBot, botY + (botPx * SCALE) + lineGapPx);
      } else if (/^\d+(st|nd|rd|th)\s+inv$/i.test(lab)) {
        const topLab = lab.replace(/\s+inv$/i, "");
        const botLab = "inv";
        const prevFont = ctx.font;
        const smallBotPx = botPx * 0.7;
        ctx.font = `${Math.round(smallBotPx * SCALE)}px Inter, system-ui, sans-serif`;
        const wTop = measureTokenWithSupE(ctx, topLab);
        const wBot = ctx.measureText(botLab).width;
        const xTop = x + (cellW - wTop) / 2;
        const xBot = x + (cellW - wBot) / 2;
        drawTokenWithSupE(ctx, topLab, xTop, botY);
        ctx.fillText(botLab, xBot, botY + (smallBotPx * SCALE) + lineGapPx);
        ctx.font = prevFont;
      } else {
        const wLab = measureTokenWithSupE(ctx, lab);
        const xLab = x + (cellW - wLab) / 2;
        drawTokenWithSupE(ctx, lab, xLab, botY);
      }
      x += cellW;
    }
  }
}
// --- Recording setup (EXPORT) ---
const TOTAL_MS_FIXED = (STEPS_E * NOTE_MS_E) + 300; // total fixed duration for recording
const recStart = performance.now();                  // ⬅️ needed for 'elapsed'
rec.start();                                         // start MediaRecorder

let lastTs = 0;
let prevStep = -1;
let playedIdxE = 0; // counts only playable tokens within the current segment

// Draw a pulse (dot + expanding ring) for all points at a given step (EXPORT)
function drawPulseForStep(
  ctx: CanvasRenderingContext2D,
  stepIdx: number,
  keyNow: KeyName,
  frac: number // 0..1 progress within the current step
) {
  const pts = exportPoints.filter(p => p.step === stepIdx);
  if (!pts.length) return;

  // ease + sizes
  const t = Math.max(0, Math.min(1, frac));
  const ringR = 1.8 + 3.4 * t;     // in circle (0..100) space
  const ringAlpha = 0.85 * (1 - t);
  const dotR = 1.6;

  const color =
    keyNow === "BbMajor"
      ? (bg === "dark" ? themeDark.gold : themeLight.gold)
      : (bg === "dark" ? themeDark.minor : themeLight.minor);

  // draw in the same transformed space as overlays/confetti
  ctx.save();
  ctx.translate(drawX * SCALE, (goldTop + 12) * SCALE);
  ctx.scale((drawW * SCALE) / 100, (drawH * SCALE) / 100);

  for (const p of pts) {
    const node = nodePosition(p.spoke, 36);

    // inner dot
    ctx.beginPath();
    ctx.globalAlpha = 1;
    ctx.fillStyle = color;
    ctx.arc(node.x, node.y, dotR, 0, Math.PI * 2);
    ctx.fill();

    // ring
    ctx.beginPath();
    ctx.globalAlpha = ringAlpha;
    ctx.strokeStyle = color;
    ctx.lineWidth = 0.6;
    ctx.arc(node.x, node.y, ringR, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.restore();
  ctx.globalAlpha = 1;
}

// ===== Recording loop (export) – make bottom line visible only on 2nd Major pass =====
(function loop() {
  const nowTs = performance.now();
  const elapsed = nowTs - recStart;
  const i = Math.min(STEPS_E - 1, Math.floor(elapsed / NOTE_MS_E));
  const dtSec = lastTs ? (nowTs - lastTs) / 1000 : (1 / FPS);
  lastTs = nowTs;

  // background
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
    (drawH + titleBlockH + TOP_GAP) * SCALE
  );
  c.restore();

  // base circle
  c.drawImage(
    bgImg,
    0, 0, liveW, liveH,
    drawX * SCALE, (goldTop + 12) * SCALE,
    drawW * SCALE, drawH * SCALE
  );

  // overlays (non-Pulse)
  if (trailMode !== "pulse") {
    const ov = overlayImgs[i];
    if (ov) c.drawImage(ov, 0, 0, liveW, liveH, drawX * SCALE, (goldTop + 12) * SCALE, drawW * SCALE, drawH * SCALE);
  }

  // compute segment & key for this frame
  const segIdx = Math.floor(i / TOK_COUNT_E) % SEGMENTS_E.length;
  let keyNowE: KeyName = SEGMENTS_E[segIdx];

  // Pulse rendering (optional)
  if (trailMode === "pulse" || trailMode.includes("+confetti")) {
    const stepStartMs = i * NOTE_MS_E;
    const frac = Math.max(0, Math.min(1, (elapsed - stepStartMs) / NOTE_MS_E));
    drawPulseForStep(c, i, keyNowE, frac);
  }

  // playable counter (for highlight)
  if (i > prevStep) {
    for (let s = prevStep + 1; s <= i; s++) {
      if ((s % TOK_COUNT_E) === 0) playedIdxE = 0;
      const t = tokens[s % TOK_COUNT_E];
      if (t && (t.kind === "deg" || t.kind === "chroma")) playedIdxE++;
    }
    prevStep = i;
  }

  // caption: top always; bottom only on 2nd Major pass (segIdx===1)
  const activePlayableIdx = Math.max(0, playedIdxE - 1);
  const showBottomThisFrame = (segIdx === 1 && keyNowE === "BbMajor");
  drawExportCaption(c, activePlayableIdx, keyNowE, showBottomThisFrame);

  

  if (elapsed < TOTAL_MS_FIXED) requestAnimationFrame(loop);
  else rec.stop();
})();

// ---- finalize recording & save file ----
const recorded: Blob = await new Promise((res) => {
  rec.onstop = () => {
    try {
      try { stream.getTracks().forEach(t => t.stop()); } catch {}
      try { exportDst.stream.getTracks().forEach(t => t.stop()); } catch {}
      
    } finally {
      res(new Blob(chunks, { type: mimeType || "video/webm" }));
    }
  };
});

const outBlob = await convertToMp4Server(recorded);
const safe = (raw || "keyclock").replace(/[^A-Za-z0-9\-_.]+/g, "-");
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
   LIVE engine (audio + trails + caption highlight)
========================= */

// Main live entry (schedules audio, trails, and caption highlight)
const startCore = useCallback(async () => {
  // --- tiny local helpers (scoped, no duplicates) ---
  const NOTE_STEP = 0.25; // 250ms per step
  const TOK_COUNT = Math.max(1, tokens.length);
  const STEPS = TOK_COUNT * SEGMENTS.length;

  function triadDegrees(root: Diatonic): [Diatonic, Diatonic, Diatonic] {
    const wrap = (n: number) => (["1","2","3","4","5","6","7"][(n - 1 + 7) % 7] as Diatonic);
    const r = Number(root);
    return [wrap(r), wrap(r + 2), wrap(r + 4)];
  }
  function scheduleNoteLive(ac: AudioContext, at: number, d: Diatonic, key: KeyName, up?: boolean, dur = 0.25) {
    const midi = degreeToMidi(d, key, up);
    const name = midiToNoteName(midi);
    loadBuffer(name).then(buf => {
      const src = ac.createBufferSource(); src.buffer = buf;
      const g = ac.createGain();
      g.gain.setValueAtTime(0, at);
      g.gain.linearRampToValueAtTime(1, at + 0.01);
      g.gain.setTargetAtTime(0, at + 0.20, 0.05);
      src.connect(g).connect(getCtx().destination);
      try { src.start(at); src.stop(at + dur); } catch {}
    }).catch(()=>{});
  }
  function scheduleTriadLive(ac: AudioContext, at: number, root: Diatonic, key: KeyName, dur = 0.25) {
    const [r, t3, t5] = triadDegrees(root);
    scheduleNoteLive(ac, at, r,  key, false, dur);
    scheduleNoteLive(ac, at, t3, key, false, dur);
    scheduleNoteLive(ac, at, t5, key, false, dur);
  }
  function scheduleFirstInvTonic(ac: AudioContext, at: number, key: KeyName, dur = 0.25) {
    scheduleNoteLive(ac, at, "3", key, false, dur);
    scheduleNoteLive(ac, at, "5", key, false, dur);
    scheduleNoteLive(ac, at, "1", key, true,  dur);
  }
  function scheduleSecondInvSupertonic(ac: AudioContext, at: number, key: KeyName, dur = 0.25) {
    scheduleNoteLive(ac, at, "6", key, false, dur);
    scheduleNoteLive(ac, at, "2", key, true,  dur);
    scheduleNoteLive(ac, at, "4", key, true,  dur);
  }
  function scheduleIntroChord(ac: AudioContext, at: number, key: KeyName) {
    (["1","3","5"] as Diatonic[]).forEach((d, i) => scheduleNoteLive(ac, at + i * 0.06, d, key));
  }
  function scheduleResolveCadence(ac: AudioContext, at: number, key: KeyName) {
    scheduleNoteLive(ac, at,        "5", key);
    scheduleNoteLive(ac, at + 0.12, "1", key);
  }
  // --- Tiny tick for Zero (rest) policy ---
  function scheduleTick(ac: AudioContext, at: number) {
    // very short neutral piano note (C4)
    const midi = 60; // Middle C
    const name = midiToNoteName(midi);
    loadBuffer(name).then(buf => {
      const src = ac.createBufferSource();
      src.buffer = buf;
      const g = ac.createGain();
      g.gain.setValueAtTime(0, at);
      g.gain.linearRampToValueAtTime(0.35, at + 0.005);
      g.gain.setTargetAtTime(0, at + 0.04, 0.05);
      src.connect(g).connect(ac.destination);
      try { src.start(at); src.stop(at + 0.08); } catch {}
    }).catch(()=>{});
  }

  function buildPlayableCharMaps(src: string, playableTokens: Token[]) {
    const p2c: number[] = [];
    const c2p: number[] = Array(src.length).fill(-1);
    let ci = 0;
    for (let p = 0; p < playableTokens.length; p++) {
      while (ci < src.length) {
        const ch = src[ci];
        if (/[A-Z0-9]/.test(ch)) {
          if (ch === "0" && zeroPolicy === "rest") { ci++; continue; }
          p2c.push(ci);
          c2p[ci] = p2c.length - 1;
          ci++;
          break;
        }
        ci++;
      }
    }
    return { p2c, c2p };
  }

  // --- audio ctx, visual reset, and time base ---
  await unlockCtx();
  const ac = getCtx();

  nodesMajRef.current = [];
  nodesMinRef.current = [];
  setOverlays([]);
  if (hotPulseClearRef.current) { clearTimeout(hotPulseClearRef.current); hotPulseClearRef.current = null; }
  setHotPulse(null);

  const t0 = ac.currentTime + 0.12;
  t0Ref.current = t0;

  // caption highlight maps
  const srcStr = (raw || "").toUpperCase();
  const playable = tokens.filter(t => t.kind === "deg" || t.kind === "chroma");
  const { p2c, c2p } = buildPlayableCharMaps(srcStr, playable);
  // Map highlight step -> source char index (deg/chroma + zero-as-rest)
// Fallback remains playableToCharRef for older paths

  playableToCharRef.current = p2c;   // playable idx -> char idx
  charToPlayableRef.current = c2p;   // char idx -> playable idx (optional)
  playedIdxRef.current = 0;


  const hasIntro = tokens.some(t => (t as any).kind === "intro");

  // --- schedule audio for all segments (Major×2 → Minor×2) ---
  for (let i = 0; i < STEPS; i++) {
    const segIdx = Math.floor(i / TOK_COUNT) % SEGMENTS.length;
    const curKey: KeyName = SEGMENTS[segIdx];
    const tok = tokens[i % TOK_COUNT];
    const at = t0 + i * NOTE_STEP;

    if (hasIntro && (i % TOK_COUNT) === 0) scheduleIntroChord(ac, at, curKey);
    if (!tok) continue;

    if (tok.kind === "toggle") continue;              // '*': short rest
    if (tok.kind === "intro")  continue;              // '+' handled at segment start
    if (tok.kind === "resolve"){ scheduleResolveCadence(ac, at, curKey); continue; }
    if (tok.kind === "rest") {
  // Only zeros-as-rest get a tick; typed separators stay silent
  if ((tok as any).char === "0") scheduleTick(ac, at);
  continue;
}

    const isLetter = !!(tok as any).srcChar;

    if (tok.kind === "deg") {
      if (isLetter) {
        if (tok.up && tok.src === "8") {
          scheduleNoteLive(ac, at, "1", curKey, false);
          scheduleNoteLive(ac, at, "1", curKey, true );
        } else if (tok.up && tok.src === "9") {
          scheduleNoteLive(ac, at, "1", curKey, false);
          scheduleNoteLive(ac, at, "2", curKey, true );
        } else {
          scheduleNoteLive(ac, at, tok.d, curKey, tok.up);
        }
      } else {
        if ("1234567".includes(tok.src))      scheduleTriadLive(ac, at, tok.d, curKey);
        else if (tok.src === "8")             scheduleFirstInvTonic(ac, at, curKey);
        else if (tok.src === "9")             scheduleSecondInvSupertonic(ac, at, curKey);
      }
    } else if (tok.kind === "chroma") {
  const pc = degreeToPcOffset(tok.c as DegLabel, curKey);
  const midi = snapPcToComfortableMidi(pc);
  const name = midiToNoteName(midi);

  const isZeroChroma = (tok as any).src === "0";
  const useTickEnv   = isZeroChroma && (zeroPolicy === "ticks");

  loadBuffer(name).then(buf => {
    const src = ac.createBufferSource(); src.buffer = buf;
    const g = ac.createGain();

    if (useTickEnv) {
      // short “tick” envelope
      g.gain.setValueAtTime(0, at);
      g.gain.linearRampToValueAtTime(0.45, at + 0.006);
      g.gain.setTargetAtTime(0, at + 0.05, 0.05);
      src.connect(g).connect(ac.destination);
      try { src.start(at); src.stop(at + 0.10); } catch {}
    } else {
      // normal chroma envelope
      g.gain.setValueAtTime(0, at);
      g.gain.linearRampToValueAtTime(1, at + 0.01);
      g.gain.setTargetAtTime(0, at + 0.20, 0.05);
      src.connect(g).connect(ac.destination);
      try { src.start(at); src.stop(at + 0.25); } catch {}
    }
  }).catch(()=>{});
}
  }

  // --- RAF loop: trails + caption highlight + pulse ---
  if (rafRef.current) cancelAnimationFrame(rafRef.current);
  const stepDurSec = NOTE_STEP;
  let lastDrawnStep = -1;

  const loop = () => {
    const now = getCtx().currentTime;
    const step = Math.floor((now - t0Ref.current) / stepDurSec);

    if (step > lastDrawnStep) {
      for (let s = lastDrawnStep + 1; s <= step; s++) {
        if (s < 0 || s >= STEPS) continue;

        const segIdx = Math.floor(s / TOK_COUNT) % SEGMENTS.length;
        const nowKey: KeyName = SEGMENTS[segIdx];
        const segStart = Math.floor(s / TOK_COUNT) * TOK_COUNT;

        if (s === segStart) playedIdxRef.current = 0;

        const tok = tokens[s % TOK_COUNT];
        // Skip non-playables
        if (!tok || tok.kind === "rest" || tok.kind === "intro" || tok.kind === "resolve" || tok.kind === "toggle") continue;

        // spoke for trail
        let spoke = -1;
        if (tok.kind === "deg")        spoke = degToIndexForKey(tok.d, nowKey);
        else if (tok.kind === "chroma") spoke = DEGREE_ORDER.indexOf(tok.c as any);

        if (spoke >= 0) {
          appendTrail(spoke, nowKey);                 // lines/glow/pulse source
         // Advance highlight only for playables (deg/chroma)
// - Chromatic zeros and Ticks zeros are chroma → increment
// - Rest zeros are true rests → no increment
const isPlayable = !!tok && (tok.kind === "deg" || tok.kind === "chroma");

drawCaptionCanvas(playedIdxRef.current, nowKey);
if (isPlayable) {
  playedIdxRef.current++;
}

          // pulse dot
          const p = nodePosition(spoke, 36);
          const color = nowKey === "BbMajor" ? T.gold : T.minor;
          setHotPulse({ x: p.x, y: p.y, color });
          if (hotPulseClearRef.current) clearTimeout(hotPulseClearRef.current);
          hotPulseClearRef.current = window.setTimeout(() => {
            setHotPulse(null);
            hotPulseClearRef.current = null;
          }, 220);
        }
      }
      lastDrawnStep = step;
    }

    if (step < STEPS) {
      rafRef.current = requestAnimationFrame(loop);
    } else {
      if (hotPulseClearRef.current) { clearTimeout(hotPulseClearRef.current); hotPulseClearRef.current = null; }
    }
  };
  rafRef.current = requestAnimationFrame(loop);
}, [raw, tokens, zeroPolicy, T.gold, T.minor, SEGMENTS]);

// Start wrapper → calls the live engine
const start = useCallback(() => {
  try { (document.activeElement as HTMLElement | null)?.blur(); } catch {}
  startCore?.();
}, [startCore]);

// Handle Enter key → start playback
const onKeyDown = useCallback(
  (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    if (!raw.trim()) return;
    start();
  },
  [raw, start]
);
// Build a shareable URL with current UI state
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
   Render (header + input + circle + actions)
========================= */
return (
  <div style={{ minHeight: "100vh", background: T.bg, color: T.text, overflowX: "hidden" }}>
    <main
      className="vt-card"
      style={{ width: "100%", margin: "0 auto", padding: 12, boxSizing: "border-box", maxWidth: 520 }}
      ref={panelRef}
    >
      {/* SEO: JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": ["SoftwareApplication", "WebApplication"],
            name: "KeyClock",
            applicationCategory: "MusicApplication",
            operatingSystem: "Web",
            url: "https://pianotrainer.app/viral/key-clock",
            image: "https://pianotrainer.app/og/keyclock.png",
            description:
              "Turn dates and times into musical cadences. Three zero modes: Chromatic, Ticks, Rest.",
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
                name: "What does KeyClock do?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text:
                    "KeyClock maps dates and times to musical cadences in B♭ Major and C minor across four passes.",
                },
              },
              {
                "@type": "Question",
                name: "How do zeros behave?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text:
                    "Choose Chromatic (♭2/♯4), Ticks (short ♭2/♯4), or Rest (silent). Chromatic/Ticks are playable and highlighted; Rest is silent and unhighlighted.",
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
          borderRadius: 14,
          paddingTop: 12,
          paddingBottom: 12,
          background: T.card,
          display: "grid",
          gap: 10,
        }}
      >
        {/* Helper hint */}
        <div style={{ textAlign: "center", fontSize: 13, color: T.muted, paddingInline: 6 }}>
          Type a <b>date or text</b>. Allowed: A–Z, 0–9,{" "}
          
          <code style={{ background: "#0F1821", padding: "1px 4px", borderRadius: 6 }}>-</code> (rest). Letters use T9.
        </div>

        {/* Input */}
        <form
          className="minw0"
          onSubmit={(e) => {
            e.preventDefault();
            if (raw.trim()) start();
          }}
          style={{ display: "flex", gap: 8, alignItems: "center", justifyContent: "center", flexWrap: "wrap", paddingInline: 2 }}
        >
          <input
            value={raw}
            onChange={(e) => {
              // sanitize & show helper captions again
              try {
                // if you keep a showHelper flag, set it here; otherwise ignore
                // setShowHelper(true);
              } catch {}
              // reuse your sanitize function
              // @ts-ignore
              setRaw(sanitizePhoneInput(e.target.value));
            }}
            placeholder="October 21, 2025"
            inputMode="text"
            enterKeyHint="done"
            onKeyDown={onKeyDown}
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
            aria-label="Type a date or text"
          />
        </form>

        {/* Caption canvas: input tokens with " · " separators + labels under each */}
        <div className="minw0" style={{ display: "grid", justifyContent: "center", paddingInline: 2 }}>
          <canvas
            ref={captionCanvasRef}
            width={360}
            height={84}
            style={{ width: 360, height: 84, display: "block" }}
            aria-label="Caption"
          />
        </div>

        {/* Circle */}
        <div className="minw0" style={{ display: "grid", justifyContent: "center", paddingInline: 2 }}>
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
            <circle
              cx="50"
              cy="50"
              r="36"
              stroke={bg === "dark" ? "rgba(230,235,242,0.15)" : "rgba(0,0,0,0.12)"}
              strokeWidth="2"
              fill="none"
            />

            {/* Nodes + labels */}
            {DEGREE_ORDER.map((lab, i) => {
              const p = nodePosition(i, 36);
              const lp = labelPlacement(i, p);
              return (
                <g key={lab}>
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r="1.6"
                    fill={bg === "dark" ? "rgba(230,235,242,0.5)" : "rgba(0,0,0,0.45)"}
                  />
                  <text
                    x={lp.x}
                    y={lp.y}
                    textAnchor={lp.anchor}
                    dominantBaseline={lp.baseline}
                    fontSize="4"
                    fill={T.text}
                    style={{ userSelect: "none", pointerEvents: "none" }}
                  >
                    {lab}
                  </text>
                </g>
              );
            })}

            {/* Live trails */}
            {trailMode !== "pulse" &&
              overlays.map((ov) => (
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
          </svg>
        </div>

        {/* Actions (Play/Replay + Download + Share) */}
        <div className="vt-actions minw0" aria-label="Actions" style={{ display: "flex", justifyContent: "center", gap: 10, flexWrap: "wrap" }}>
          {isExporting && (
            <div style={{ color: T.muted, fontSize: 12, textAlign: "center", width: "100%", marginTop: 6 }}>
              ⏺️ Recording…
            </div>
          )}
          <button
            onClick={() => start()}
            disabled={!raw.trim()}
            style={{
              background: !raw.trim() ? (bg === "dark" ? "#1a2430" : "#E8ECF2") : T.gold,
              color: !raw.trim() ? (bg === "dark" ? T.muted : T.muted) : (bg === "dark" ? "#081019" : "#FFFFFF"),
              border: "none",
              borderRadius: 999,
              padding: "10px 16px",
              fontWeight: 700,
              cursor: !raw.trim() ? "not-allowed" : "pointer",
              fontSize: 16,
              minHeight: 40,
            }}
            title={hasPlayed ? "⟲ Replay" : "▶ Play"}
          >
            {hasPlayed ? "⟲ Replay" : "▶ Play"}
          </button>

          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <button
              onClick={() => onDownloadVideo()}
              disabled={!raw.trim()}
              title="Download"
              style={{
                background: "transparent",
                color: T.gold,
                border: "none",
                borderRadius: 999,
                padding: "6px 10px",
                fontWeight: 700,
                cursor: !raw.trim() ? "not-allowed" : "pointer",
                minHeight: 32,
                fontSize: 14,
              }}
            >
              💾 <span className="action-text">Download</span>
            </button>
            <button
              onClick={() => setShareOpen(true)}
              title="Share"
              style={{
                background: "transparent",
                color: T.gold,
                border: "none",
                borderRadius: 999,
                padding: "6px 10px",
                fontWeight: 700,
                cursor: "pointer",
                minHeight: 32,
                fontSize: 14,
              }}
            >
              📤 <span className="action-text">Share</span>
            </button>
          </div>
        </div>

        {/* Controls */}
        <div style={{ display: "grid", gap: 10, paddingInline: 6 }}>
          <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
            {/* Trails */}
            <select
              value={trailMode}
              onChange={(e) => setTrailMode(e.target.value as any)}
              style={{
                background: bg === "dark" ? "#0F1821" : "#F3F5F8",
                color: T.text,
                border: `1px solid ${T.border}`,
                borderRadius: 8,
                padding: "8px 10px",
                fontSize: 14,
              }}
            >
              <option value="pulse">Trails: Pulse only</option>
              <option value="glow">Trails: Glow</option>
              <option value="lines">Trails: Lines</option>
              <option value="glow+confetti">Trails: Glow & Pulse</option>
              <option value="lines+confetti">Trails: Lines & Pulse</option>
            </select>

            {/* Background */}
            <select
              value={bg}
              onChange={(e) => setBg(e.target.value as any)}
              style={{
                background: bg === "dark" ? "#0F1821" : "#F3F5F8",
                color: T.text,
                border: `1px solid ${T.border}`,
                borderRadius: 8,
                padding: "8px 10px",
                fontSize: 14,
              }}
            >
              <option value="dark">Background: Dark</option>
              <option value="light">Background: Light</option>
            </select>

            {/* Zero Policy */}
            <select value={zeroPolicy} onChange={e=>setZeroPolicy(e.target.value as ZeroPolicy)}
  style={{ background: bg==="dark" ? "#0F1821" : "#F3F5F8", color:T.text, border:`1px solid ${T.border}`, borderRadius:8, padding:"8px 10px", fontSize:14 }}>
  <option value="chromatic">Zero (0): Chromatic color</option>
  <option value="ticks">Zero (0): Ticks (short ♭2/♯4)</option>
  <option value="rest">Zero (0): Rest (silent)</option>
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
            boxShadow: bg === "dark" ? "0 1px 3px rgba(0,0,0,0.2)" : "0 1px 3px rgba(0,0,0,0.06)",
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
          bg: bg === "dark" ? "#111820" : "#FFFFFF",
        }}
      />
    </main>
  </div>
);
} // ← CLOSES the KeyClock component. Keep this line.

/* =========================
   Share modal & helpers
========================= */

// Plain JS params here keep top-level parsing simple.
function buildTweetIntent(text: string, url: string) {
  const u = new URL("https://twitter.com/intent/tweet");
  u.searchParams.set("text", text);
  u.searchParams.set("url", url);
  return u.toString();
}

function ShareSheet({
  open,
  onClose,
  url,
  themeColors,
}: {
  open: boolean;
  onClose: () => void;
  url: string;
  themeColors: { gold: string; border: string; text: string; bg: string };
}) {
  if (!open) return null;
  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.6)",
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
        zIndex: 9999,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
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
      >
        <div style={{ textAlign: "center", color: themeColors.text, fontWeight: 800, marginBottom: 8 }}>
          Share your melody
        </div>

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

        <a
          href={buildTweetIntent(`My KeyClock sings: ${url}`, url)}
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