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
  const x = p.x + 3.0 * ux, y = p.y + 3.0 * uy; // small inward inset
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
  return 0;
}
function degreeToMidi(d: Diatonic, key: KeyName, up?: boolean): number {
  const tonic = KEY_TONIC_PC[key];
  const off = degreeToPcOffset(d as DegLabel, key);
  const pc = (tonic + off) % 12;
  const base = (up ? 5 : 4) * 12; // bias around C4/C5
  for (let m = base - 12; m <= base + 12; m++) if (m >= 36 && m <= 84 && (m % 12) === pc) return m;
  return base + pc;
}
// Map degree to circle spoke index, depending on key (C minor uses flat 3/6/7)
function minorDisplayLabel(d: Diatonic): DegLabel {
  return d === "3" ? "♭3" : d === "6" ? "♭6" : d === "7" ? "♭7" : d;
}
function degToIndexForKey(d: Diatonic, key: KeyName) {
  const lab: DegLabel = key === "Cminor" ? minorDisplayLabel(d) : d;
  return DEGREE_ORDER.indexOf(lab);
}

// Trail colors for phone page (distinct from date page)
const MAJOR_TRAIL = "#5CE1E6"; // electric cyan
const MINOR_TRAIL = "#FF8BD1"; // orchid pink


/* =========================
   Phone formatting (numbers-circle style, region map)
   ========================= */

// helper to format by groups with dashes, digits-only
function formatByGroups(raw: string, total: number, groups: number[]): string {
  const d = raw.replace(/\D+/g, "").slice(0, total);
  let out = "", i = 0;
  for (let gi = 0; gi < groups.length; gi++) {
    const n = groups[gi];
    if (i >= d.length) break;
    const part = d.slice(i, i + n);
    out += (out ? "-" : "") + part;
    i += n;
  }
  // if underflow (typing), return what we have so far without forcing group boundaries
  if (out.indexOf("-") === -1 && d.length < total) return d;
  return out;
}

// supported regions
type Region =
  | "US" | "CA"              // North America
  | "UK" | "IE" | "MT"       // Europe (EN)
  | "AU" | "NZ" | "FJ" | "PG"// Oceania
  | "ZA" | "NG" | "GH" | "KE" | "UG" // Africa
  | "IN" | "SG" | "PK" | "PH"        // Asia
  | "EU";                    // Generic EU

// region info: digits required, formatter, placeholder
const REGION_INFO: Record<Region, {
  required: number;
  fmt: (raw: string) => string;
  placeholder: string;
}> = {
  // North America
  US: { required: 10, fmt: r => formatByGroups(r, 10, [3,3,4]), placeholder: "555-123-4567" },
  CA: { required: 10, fmt: r => formatByGroups(r, 10, [3,3,4]), placeholder: "555-123-4567" },

  // Europe (EN)
  UK: { required: 11, fmt: r => formatByGroups(r, 11, [5,3,3]), placeholder: "07xxx-xxx-xxx" },
  IE: { required: 9,  fmt: r => formatByGroups(r, 9,  [2,4,3]), placeholder: "08-xxxx-xxx" },
  MT: { required: 8,  fmt: r => formatByGroups(r, 8,  [4,4]),   placeholder: "9999-9999" },

  // Oceania
  AU: { required: 9,  fmt: r => formatByGroups(r, 9,  [1,4,4]), placeholder: "4-xxxx-xxxx" },
  NZ: { required: 9,  fmt: r => formatByGroups(r, 9,  [2,3,4]), placeholder: "02-xxx-xxxx" },
  FJ: { required: 8,  fmt: r => formatByGroups(r, 8,  [4,4]),   placeholder: "9999-9999" },
  PG: { required: 7,  fmt: r => formatByGroups(r, 7,  [3,4]),   placeholder: "xxx-xxxx" },

  // Africa
  ZA: { required: 9,  fmt: r => formatByGroups(r, 9,  [2,3,4]), placeholder: "xx-xxx-xxxx" },
  NG: { required: 10, fmt: r => formatByGroups(r, 10, [2,4,4]), placeholder: "xx-xxxx-xxxx" },
  GH: { required: 9,  fmt: r => formatByGroups(r, 9,  [2,3,4]), placeholder: "xx-xxx-xxxx" },
  KE: { required: 9,  fmt: r => formatByGroups(r, 9,  [2,3,4]), placeholder: "xx-xxx-xxxx" },
  UG: { required: 9,  fmt: r => formatByGroups(r, 9,  [2,3,4]), placeholder: "xx-xxx-xxxx" },

  // Asia
  IN: { required: 10, fmt: r => formatByGroups(r, 10, [4,3,3]), placeholder: "9999-999-999" },
  SG: { required: 8,  fmt: r => formatByGroups(r, 8,  [4,4]),   placeholder: "9999-9999" },
  PK: { required: 10, fmt: r => formatByGroups(r, 10, [3,4,3]), placeholder: "xxx-xxxx-xxx" },
  PH: { required: 10, fmt: r => formatByGroups(r, 10, [2,4,4]), placeholder: "xx-xxxx-xxxx" },

  // Generic EU (free 10 local digits; dash grouping is user-friendly)
  EU: { required: 10, fmt: r => formatByGroups(r, 10, [3,3,4]), placeholder: "xxx-xxx-xxxx" },
};

// unified formatter
function formatPhoneInput(raw: string, region: Region): string {
  const info = REGION_INFO[region];
  return info.fmt(raw);
}

/* =========================
   Char → note mapping for phone playback
   - digits 1..7 map to 1..7
   - 0 maps to 1 (audible)
   - '-' and ' ' are pauses
   ========================= */
function mapCharPhone(ch: string): { pause: boolean; deg?: Diatonic; up?: boolean } {
  if (ch === "-" || ch === " ") return { pause: true };
  if ("1234567".includes(ch)) return { pause: false, deg: ch as Diatonic };
  if (ch === "0") return { pause: false, deg: "1" };
  if (ch === "8") return { pause: false, deg: "1", up: true };
  if (ch === "9") return { pause: false, deg: "2", up: true };
  return { pause: true };
}

/* =========================
   Web Audio
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
async function unlockCtx() { const c = getCtx(); if (c.state === "suspended") try { await c.resume(); } catch {} }
function midiToNoteName(midi: number): NoteName {
  const pc = NOTE_ORDER[midi % 12]; const oct = Math.floor(midi / 12) - 1;
  return `${pc}${oct}` as NoteName;
}
async function loadBuffer(noteName: string): Promise<AudioBuffer> {
  if (_buffers.has(noteName)) return _buffers.get(noteName)!;
  const safe = noteName.replace("#","%23");
  const res = await fetch(`/audio/notes/${safe}.wav`);
  if (!res.ok) throw new Error(`fetch failed: ${safe}.wav`);
  const buf = await getCtx().decodeAudioData(await res.arrayBuffer());
  _buffers.set(noteName, buf); return buf;
}

/* =========================
   Exporter helpers (shared)
   ========================= */

/** Server-side conversion WebM → MP4 */
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

/** Prefer MP4 when supported; Chrome will fall back to WebM */
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

/** Embed fonts (safe for SVG snapshot) */
async function buildEmbeddedFontStyle(): Promise<string> {
  return `text{font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,"Liberation Mono","Courier New",monospace;font-variant-numeric:tabular-nums;}`;
}

/** Serialize SVG with width/height and embedded CSS */
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

/** Convert raw SVG string → HTMLImageElement */
async function svgToImage(rawSvg: string): Promise<HTMLImageElement> {
  const blob = new Blob([rawSvg], { type: "image/svg+xml;charset=utf-8" });
  const url  = URL.createObjectURL(blob);
  const img  = new Image();
  await new Promise<void>((res, rej) => { img.onload = () => res(); img.onerror = rej; img.src = url; });
  URL.revokeObjectURL(url);
  return img;
}

/* =========================
   Component
   ========================= */
export default function PhoneNumbersToNotesSN() {
  // CSS contract (No-Clip)
  useEffect(() => {
    const css = `
      .vt-card, .vt-panel, .vt-actions { box-sizing: border-box; }
      .vt-panel { width: 100% !important; max-width: 100% !important; min-width: 0 !important; }
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

  /* ===== State ===== */
  const [phoneRegion, setPhoneRegion] = useState<Region>("UK");
  const [phoneVal, setPhoneVal] = useState<string>("");            // visible, formatted
  const [isRunning, setIsRunning] = useState(false);
  const isRunningRef = useRef(false); useEffect(()=>{ isRunningRef.current = isRunning; }, [isRunning]);
  const [hasPlayed, setHasPlayed] = useState(false);

  const [isExporting, setIsExporting] = useState(false);
  // Share state
  const [shareOpen, setShareOpen] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false); 

  // refs
  const svgRef = useRef<SVGSVGElement | null>(null);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

  // overlays
  type Overlay = { id: "maj"|"min"; color: string; path: string };
  const [overlays, setOverlays] = useState<Overlay[]>([]);
  const nodesMajRef = useRef<number[]>([]);
  const nodesMinRef = useRef<number[]>([]);
  const TRAIL_N = 64;

  // Timing
  const NOTE_MS = 250;
  const STEPS = 40; // 10s

  // Gate: US=10 digits, UK=11 digits
  const requiredDigits = REGION_INFO[phoneRegion].required;
const digitCount = useMemo(() => (phoneVal.match(/\d/g) || []).length, [phoneVal]);
const canPlay = digitCount === requiredDigits;

  // Playback sequence = what’s visible (digits + '-')
  // Include CC digits as a short preface (e.g., "44-…") – the dash makes a small pause
const ccDigits = phoneRegion === "US" ? "1" :
                 phoneRegion === "UK" ? "44" :
                 phoneRegion === "CA" ? "1" :
                 phoneRegion === "IE" ? "353" :
                 phoneRegion === "MT" ? "356" :
                 phoneRegion === "AU" ? "61" :
                 phoneRegion === "NZ" ? "64" :
                 phoneRegion === "FJ" ? "679" :
                 phoneRegion === "PG" ? "675" :
                 phoneRegion === "ZA" ? "27" :
                 phoneRegion === "NG" ? "234" :
                 phoneRegion === "GH" ? "233" :
                 phoneRegion === "KE" ? "254" :
                 phoneRegion === "UG" ? "256" :
                 phoneRegion === "IN" ? "91" :
                 phoneRegion === "SG" ? "65" :
                 phoneRegion === "PK" ? "92" :
                 phoneRegion === "PH" ? "63" :
                 phoneRegion === "EU" ? "" : "";
const playSequence = (ccDigits ? ccDigits + "-" : "") + phoneVal;

  // Helpers
  function appendTrail(spoke: number, key: KeyName) {
    const dq = key === "BbMajor" ? nodesMajRef.current : nodesMinRef.current;
    dq.push(spoke);
    if (dq.length > TRAIL_N + 1) dq.splice(0, dq.length - (TRAIL_N + 1));
    setOverlays([
      { id: "maj", color: MAJOR_TRAIL, path: pathFromNodes(nodesMajRef.current) },
  { id: "min", color: MINOR_TRAIL, path: pathFromNodes(nodesMinRef.current) },
    ]);
  }

  // Stop
  const hardStop = useCallback(() => {
    try { for (const s of sourcesRef.current) { try { s.stop(0); } catch {} } sourcesRef.current.clear(); } catch {}
    setIsRunning(false);
    isRunningRef.current = false;
  }, []);

  // Start core
  const startCore = useCallback(async () => {
    if (isRunningRef.current || !canPlay) return;

    try { (document.activeElement as HTMLElement | null)?.blur(); } catch {}
    setTimeout(()=>{ if ("visualViewport" in window) window.scrollTo({top:0,behavior:"smooth"}); }, 40);

    await unlockCtx();

    nodesMajRef.current = [];
    nodesMinRef.current = [];
    setOverlays([]);
    setIsRunning(true);
    isRunningRef.current = true;
    if (!hasPlayed) setHasPlayed(true);

    const ac = getCtx();
    const t0 = ac.currentTime + 0.12;

    const seq = playSequence.split(""); // digits + '-'
    const seqLen = Math.max(1, seq.length);

    // schedule audio; flip per full iteration
    for (let i = 0; i < STEPS; i++) {
      const at = t0 + i * (NOTE_MS / 1000);
      const idx = i % seqLen;
      const iter = Math.floor(i / seqLen);
      const key: KeyName = (iter % 2 === 0) ? "BbMajor" : "Cminor";

      const ch = seq[idx];
      const m  = mapCharPhone(ch);
      if (!m.pause && m.deg) {
        const midi = degreeToMidi(m.deg, key, m.up);
        loadBuffer(midiToNoteName(midi)).then(buf => {
          const src = ac.createBufferSource();
          src.buffer = buf;
          const g = ac.createGain();
          g.gain.setValueAtTime(0, at);
          g.gain.linearRampToValueAtTime(1, at + 0.01);
          g.gain.setTargetAtTime(0, at + 0.20, 0.05);
          src.connect(g).connect(ac.destination);
          sourcesRef.current.add(src);
          src.onended = () => { try { sourcesRef.current.delete(src); } catch {} };
          try { src.start(at); src.stop(at + 0.25); } catch {}
        }).catch(()=>{});
      }
    }

    // RAF live trails
    let raf = 0;
    const stepDurSec = NOTE_MS / 1000;
    const loop = () => {
      if (!isRunningRef.current) return;
      const now = getCtx().currentTime;
      const step = Math.floor((now - t0) / stepDurSec);

      const upto = Math.min(step, STEPS - 1);
      const seq = playSequence.split("");
      const seqLen = Math.max(1, seq.length);

      for (let s = nodesMajRef.current.length + nodesMinRef.current.length; s <= upto; s++) {
        const idx = s % seqLen;
        const iter = Math.floor(s / seqLen);
        const key: KeyName = (iter % 2 === 0) ? "BbMajor" : "Cminor";
        const ch = seq[idx];
        const m  = mapCharPhone(ch);
        if (!m.pause && m.deg) {
          const spoke = degToIndexForKey(m.deg, key);
          appendTrail(spoke, key);
        }
      }

      if (step < STEPS) { raf = requestAnimationFrame(loop); }
      else { hardStop(); }
    };
    raf = requestAnimationFrame(loop);
  }, [canPlay, playSequence, hasPlayed, hardStop]);

  const start = useCallback(() => {
    if (isRunningRef.current) { hardStop(); setTimeout(()=>startCore(), 30); }
    else startCore();
  }, [startCore, hardStop]);

  /* =========================
   Download (MP4: animated trails + audible export + dancing page trails)
   ========================= */
const onDownloadVideo = useCallback(async () => {
  setIsExporting(true);

  try {
  const svgEl = svgRef.current;
  if (!svgEl) { setIsExporting(false); return; }

  // Measure live SVG
  const rect = svgEl.getBoundingClientRect();
  const liveW = Math.max(2, Math.floor(rect.width));
  const liveH = Math.max(2, Math.floor(rect.height));

  // Canvas 1080×1920@30
  const FRAME_W = 1080, FRAME_H = 1920, FPS = 30, SCALE = 2;
  const canvas  = document.createElement("canvas");
  canvas.width  = FRAME_W * SCALE;
  canvas.height = FRAME_H * SCALE;
  const ctx = canvas.getContext("2d"); if (!ctx) { setIsExporting(false); return; }
  const c = ctx as CanvasRenderingContext2D;

  // Layout
  const SAFE_TOP = 160, SAFE_BOTTOM = 120, TOP_GAP = 10, SIDE_PAD = 48;
  const numberText = playSequence.replace(/-/g,"-"); // whatever is visible; you can strip dashes if you prefer

  function measurePx(px: number) {
    c.font = `${px * SCALE}px Inter, system-ui, sans-serif`;
    const m = c.measureText(numberText);
    const asc = (m as any).actualBoundingBoxAscent ?? px * 0.8;
    const desc= (m as any).actualBoundingBoxDescent ?? px * 0.25;
    return { w: m.width, h: asc + desc };
  }
  const TARGET = 0.80 * FRAME_W * SCALE;
  let lo=24, hi=80, best=28;
  while (lo<=hi) { const mid=(lo+hi)>>1; const {w}=measurePx(mid); if (w<=TARGET) {best=mid; lo=mid+1;} else {hi=mid-1;} }
  const titlePx = best;
  const { h: titleH } = measurePx(titlePx);
  const titleBaselineY = (SAFE_TOP + Math.round(titleH * 0.6)) * SCALE;

  const availW = FRAME_W - SIDE_PAD * 2;
  const panelTop = SAFE_TOP + titleH + TOP_GAP;
  const availH = Math.max(2, FRAME_H - panelTop - SAFE_BOTTOM);
  const scaleContent  = Math.min(availW / liveW, availH / liveH);
  const drawW  = Math.round(liveW * scaleContent);
  const drawH  = Math.round(liveH * scaleContent);
  const drawX  = Math.round((FRAME_W - drawW) / 2);
  const drawY  = panelTop;

  // Recorder (canvas + export audio)
  const ac = getCtx();
  const exportDst = ac.createMediaStreamDestination();
  const stream = (canvas as any).captureStream(FPS) as MediaStream;
  const mixed  = new MediaStream([...stream.getVideoTracks(), ...exportDst.stream.getAudioTracks()]);
  const mimeType = pickRecorderMime();
  const chunks: BlobPart[] = [];
  const rec = new MediaRecorder(mixed, { mimeType });
  rec.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };

  // Snapshot helper
  const css = await buildEmbeddedFontStyle();
  async function snapshotSvg(): Promise<HTMLImageElement | null> {
    const live = svgRef.current; if (!live) return null;
    const raw = serializeFullSvg(live, liveW, liveH, css);
    return await svgToImage(raw);
  }

  // Take a clean snapshot: clear current overlays for one frame, then we will re-dance them
  const savedOverlays = overlays;
  try {
    setOverlays([]);
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))); // flush twice
  } catch {}
  let currentImg = await snapshotSvg();
  if (!currentImg) { try { setOverlays(savedOverlays); } catch {} setIsExporting(false); return; }

  function drawFrame(img: HTMLImageElement) {
    // bg
    c.fillStyle = theme.bg;
    c.fillRect(0, 0, canvas.width, canvas.height);

    // title top
    c.save();
    c.font = `${titlePx * SCALE}px Inter, system-ui, sans-serif`;
    c.textAlign = "center"; c.textBaseline = "middle";
    c.lineWidth = Math.max(2, Math.floor(titlePx * 0.12)) * SCALE;
    c.strokeStyle = "rgba(0,0,0,0.25)";
    c.strokeText(numberText, (FRAME_W * SCALE)/2, titleBaselineY);
    c.fillStyle = theme.gold;
    c.fillText(numberText, (FRAME_W * SCALE)/2, titleBaselineY);
    c.restore();

    // subtle golden border around input+circle
    c.save();
    c.strokeStyle = theme.gold;
    c.lineWidth = 2 * SCALE;
    const panelHeight = drawH + titleH + TOP_GAP;
    c.strokeRect((SIDE_PAD / 2) * SCALE, SAFE_TOP * SCALE, (FRAME_W - SIDE_PAD) * SCALE, panelHeight * SCALE);
    c.restore();

    // circle snapshot
    c.drawImage(img, 0, 0, liveW, liveH, drawX * SCALE, drawY * SCALE, drawW * SCALE, drawH * SCALE);
  }

  // Pre-paint stabilization
  drawFrame(currentImg);
  await new Promise(r=>setTimeout(r,80));
  drawFrame(currentImg);

  // Export geometry for canvas trails
  const nodePx = Array.from({ length: 12 }, (_, i) => {
    const ang = (i / 12) * Math.PI * 2 - Math.PI / 2;
    const r = 36, cx = 50, cy = 50;
    const x = (cx + Math.cos(ang) * r) * (liveW / 100);
    const y = (cy + Math.sin(ang) * r) * (liveH / 100);
    return { x, y };
  });
  function pathFromIndicesCanvas(arr: number[]): Path2D {
    const p = new Path2D();
    if (!arr.length) return p;
    p.moveTo(nodePx[arr[0]].x, nodePx[arr[0]].y);
    for (let k = 1; k < arr.length; k++) p.lineTo(nodePx[arr[k]].x, nodePx[arr[k]].y);
    return p;
  }

  // Timeline for video trails
  type P = { k: "maj"|"min"; step: number; spoke: number };
  const exportPoints: P[] = [];

  // Build 10s plan (flip per full number iteration)
  const NOTE_MS_E = 250, SESSION_MS_E = 10000, STEPS_E = Math.ceil(SESSION_MS_E / NOTE_MS_E);
  const seqLocal = playSequence.split("");  // ← phone sequence (includes CC + dashes)

  // Preload (optional but helps)
  const need = new Set<string>();
  for (let i=0;i<STEPS_E;i++){
    const ch = seqLocal[i % Math.max(1, seqLocal.length)] ?? "-";
    const m  = mapCharPhone(ch);
    if (!m.pause && m.deg) {
      const key: KeyName = (Math.floor(i / Math.max(1, seqLocal.length)) % 2 === 0) ? "BbMajor" : "Cminor";
      need.add(midiToNoteName(degreeToMidi(m.deg, key, m.up)));
    }
  }
  await Promise.all(Array.from(need).map(n => loadBuffer(n)));

  // Fixed schedule (audible) + record points
  const t0 = getCtx().currentTime + 0.25;
  for (let i=0;i<STEPS_E;i++){
    const atSec = t0 + i*(NOTE_MS_E/1000);
    const iter  = Math.floor(i / Math.max(1, seqLocal.length));
    const key: KeyName = (iter % 2 === 0) ? "BbMajor" : "Cminor";
    const ch = seqLocal[i % Math.max(1, seqLocal.length)] ?? "-";
    const m  = mapCharPhone(ch);
    if (m.pause || !m.deg) continue;

    const midi = degreeToMidi(m.deg, key, m.up);
    loadBuffer(midiToNoteName(midi)).then(buf=>{
      const src = getCtx().createBufferSource();
      src.buffer = buf;
      const g = getCtx().createGain();
      g.gain.setValueAtTime(0, atSec);
      g.gain.linearRampToValueAtTime(1, atSec + 0.01);
      g.gain.setTargetAtTime(0, atSec + 0.20, 0.05);
      src.connect(g);
      g.connect(exportDst);            // to recorder
      g.connect(getCtx().destination); // to speakers
      try { src.start(atSec); src.stop(atSec + 0.25); } catch {}
    }).catch(()=>{});

    const spoke = degToIndexForKey(m.deg, key);
    exportPoints.push({ k: key === "BbMajor" ? "maj" : "min", step: i, spoke });
  }

  // Record & animate
  rec.start();
  const recStart = performance.now();

  // Prepare page dancing: reset live deques
  nodesMajRef.current = [];
  nodesMinRef.current = [];
  setOverlays([]); // start clean for visible dance

  (async function loop(){
    const elapsed = performance.now() - recStart;
    const i = Math.min(STEPS_E - 1, Math.floor(elapsed / NOTE_MS_E));

    // periodic re-snapshot for crisp labels
    if (i % 4 === 0) {
      const img = await snapshotSvg();
      if (img) currentImg = img;
    }
    if (currentImg) drawFrame(currentImg);

    // draw video trails up to current step (correct transform)
    const majVisible = exportPoints.filter(p => p.k === "maj" && p.step <= i).map(p => p.spoke);
    const minVisible = exportPoints.filter(p => p.k === "min" && p.step <= i).map(p => p.spoke);

    c.save();
    c.translate(drawX * SCALE, drawY * SCALE);
    c.scale(SCALE * (drawW / liveW), SCALE * (drawH / liveH));
    c.lineWidth = 1.1; c.lineCap = "round"; c.lineJoin = "round";
    c.strokeStyle = MAJOR_TRAIL;  c.stroke(pathFromIndicesCanvas(majVisible));
    c.strokeStyle = MINOR_TRAIL;  c.stroke(pathFromIndicesCanvas(minVisible));
    c.restore();

    // ALSO update on-page overlays (dance) to match
    try {
      const majPath = pathFromNodes(majVisible);
      const minPath = pathFromNodes(minVisible);
      setOverlays([
        { id: "maj", color: MAJOR_TRAIL, path: majPath },
        { id: "min", color: MINOR_TRAIL, path: minPath },
      ]);
    } catch {}

    if (elapsed < SESSION_MS_E + 40) requestAnimationFrame(loop);
    else rec.stop();
  })();

  // Finalize → MP4 → download
  const recorded: Blob = await new Promise((res) => {
    rec.onstop = () => res(new Blob(chunks, { type: mimeType || "video/webm" }));
  });
  const outBlob = await convertToMp4Server(recorded);

  const safe = (numberText || "phone").replace(/[^A-Za-z0-9\-_.]+/g, "-").slice(0, 40) || "phone";
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
  try { setOverlays(savedOverlays); } catch {}
  setIsExporting(false);
}
}, [playSequence, svgRef]);

// Share helpers (phone page)
const buildShareUrl = useCallback(() => {
  const params = new URLSearchParams();
  params.set("region", phoneRegion);
  params.set("number", phoneVal);
  params.set("mode", "per-iteration"); // Major ↔ Minor per full run
  const url = new URL(window.location.href);
  url.search = params.toString();
  return url.toString();
}, [phoneRegion, phoneVal]);

function buildTweetIntent(text: string, url: string) {
  const u = new URL("https://twitter.com/intent/tweet");
  u.searchParams.set("text", text);
  u.searchParams.set("url", url);
  return u.toString();
}

  // Keyboard: Enter/Blur start (only when filled)
  const onPhoneKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    if (canPlay) start();
  }, [canPlay, start]);
  const onPhoneBlur = useCallback(() => {
    if (!isRunningRef.current && canPlay) start();
  }, [canPlay, start]);

  /* =========================
     Render
     ========================= */
  return (
    <div style={{ minHeight:"100vh", background: theme.bg, color: theme.text, overflowX:"hidden" }}>
      <main className="vt-card" style={{ width:"100%", margin:"0 auto", padding:12, boxSizing:"border-box", maxWidth:520 }}>
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
          {/* Region + Input (numbers-circle style) */}
          <div style={{ display:"flex", gap:6, flexWrap:"wrap", alignItems:"center", justifyContent:"center" }}>
          <select
  value={phoneRegion}
  onChange={(e)=> {
    const region = e.target.value as Region;
    setPhoneRegion(region);
    setPhoneVal(formatPhoneInput(phoneVal, region)); // reformat existing digits
  }}
  style={{ background:"#0F1821", color:theme.text, border:`1px solid ${theme.border}`, borderRadius:8, padding:"6px 8px", fontSize:14 }}
  aria-label="Region"
>
  {/* North America */}
  <optgroup label="North America">
    <option value="US">United States (+1)</option>
    <option value="CA">Canada (+1)</option>
  </optgroup>

  {/* Europe (EN) */}
  <optgroup label="Europe (EN)">
    <option value="UK">United Kingdom (+44)</option>
    <option value="IE">Ireland (+353)</option>
    <option value="MT">Malta (+356)</option>
  </optgroup>

  {/* Oceania */}
  <optgroup label="Oceania">
    <option value="AU">Australia (+61)</option>
    <option value="NZ">New Zealand (+64)</option>
    <option value="FJ">Fiji (+679)</option>
    <option value="PG">Papua New Guinea (+675)</option>
  </optgroup>

  {/* Africa */}
  <optgroup label="Africa">
    <option value="ZA">South Africa (+27)</option>
    <option value="NG">Nigeria (+234)</option>
    <option value="GH">Ghana (+233)</option>
    <option value="KE">Kenya (+254)</option>
    <option value="UG">Uganda (+256)</option>
  </optgroup>

  {/* Asia */}
  <optgroup label="Asia">
    <option value="IN">India (+91)</option>
    <option value="SG">Singapore (+65)</option>
    <option value="PK">Pakistan (+92)</option>
    <option value="PH">Philippines (+63)</option>
  </optgroup>

  {/* Europe (Other EU) */}
  <optgroup label="Europe (Other EU)">
    <option value="EU">Europe (Other EU)</option>
  </optgroup>
</select>  

            <input
              value={phoneVal}
              onChange={(e) => setPhoneVal(formatPhoneInput(e.target.value, phoneRegion))}
              placeholder={REGION_INFO[phoneRegion].placeholder}
              inputMode="numeric"
              enterKeyHint="done"
              onKeyDown={onPhoneKeyDown}
              onBlur={onPhoneBlur}
              style={{ flex:1, minWidth:0, background:"#0F1821", color:theme.gold, border:`1px solid ${theme.border}`, borderRadius:8, padding:"8px 10px", fontSize:16 }}
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
              <circle cx="50" cy="50" r="36" stroke="rgba(230,235,242,0.15)" strokeWidth="2" fill="none" />
              {DEGREE_ORDER.map((lab, i) => {
                const p = nodePosition(i, 36);
                const lp = labelPlacement(i, p);
                return (
                  <g key={lab}>
                    <circle cx={p.x} cy={p.y} r="1.6" fill="rgba(230,235,242,0.5)" />
                    <text x={lp.x} y={lp.y} textAnchor={lp.anchor} dominantBaseline={lp.baseline} fontSize="4" fill={theme.text}
                      style={{ userSelect:"none", pointerEvents:"none" }}>
                      {lab}
                    </text>
                  </g>
                );
              })}
              {overlays.map(ov => (
                <path key={ov.id} d={ov.path} fill="none" stroke={ov.color} strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" />
              ))}
            </svg>
          </div>

          {/* Actions (single Replay/Play button) */}
          <div className="vt-actions minw0" aria-label="Actions">
            <button
              onClick={start}
              disabled={isRunning || !canPlay}
              style={{
                background: isRunning || !canPlay ? "#1a2430" : theme.gold,
                color:      isRunning || !canPlay ? theme.muted : "#081019",
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
            <button
  onClick={onDownloadVideo}
  disabled={!canPlay || isExporting}
  title="Download"
  style={{
    background:"transparent", color:theme.gold, border:"none",
    borderRadius:999, padding:"6px 10px", fontWeight:700,
    cursor:!canPlay||isExporting?"not-allowed":"pointer",
    minHeight:32, fontSize:14, marginLeft:10
  }}
>
  💾 <span className="action-text">Download</span>
</button>
<button
  onClick={() => setShareOpen(true)}
  title="Share"
  style={{
    background:"transparent", color:theme.gold, border:"none",
    borderRadius:999, padding:"6px 10px", fontWeight:700,
    cursor:"pointer", minHeight:32, fontSize:14
  }}
>
  📤 <span className="action-text">Share</span>
</button>

</div>

{isExporting && (
  <div style={{ color: theme.muted, fontSize: 12, textAlign: "center", width: "100%", marginTop: 6 }}>
    ⏺️ Recording… (10s)
  </div>
)}
{/* Share Sheet */}
{shareOpen && (
  <div
    role="dialog"
    aria-modal="true"
    style={{
      position:"fixed", inset:0, background:"rgba(0,0,0,0.6)",
      display:"flex", alignItems:"flex-end", justifyContent:"center", zIndex:9999
    }}
    onClick={()=>setShareOpen(false)}
  >
    <div
      style={{
        width:"100%", maxWidth:520, background:"#0F1821",
        borderTop:`1px solid ${theme.border}`,
        borderLeft:`1px solid ${theme.border}`,
        borderRight:`1px solid ${theme.border}`,
        borderRadius:"12px 12px 0 0",
        padding:12, boxSizing:"border-box"
      }}
      onClick={(e)=>e.stopPropagation()}
    >
      <div style={{ textAlign:"center", color:theme.text, fontWeight:800, marginBottom:8 }}>
        Share your melody
      </div>

      {/* Copy Link */}
      <button
        onClick={async ()=>{
          const url = buildShareUrl();
          try {
            await navigator.clipboard.writeText(url);
            setShareOpen(false);
            setLinkCopied(true);
            setTimeout(()=>setLinkCopied(false), 1600);
          } catch {
            alert(url);
          }
        }}
        style={{
          width:"100%", padding:"10px 12px", marginBottom:6,
          background:theme.gold, color:"#081019", borderRadius:8, border:"none", fontWeight:800
        }}
      >
        🔗 Copy Link
      </button>

      {/* X / Twitter */}
      <a
        href={buildTweetIntent(
          `My phone sings: ${phoneVal || (phoneRegion==="US"?"US":"UK")}`,
          buildShareUrl()
        )}
        target="_blank"
        rel="noopener noreferrer"
        onClick={()=>setShareOpen(false)}
        style={{
          display:"block", textAlign:"center", width:"100%", padding:"10px 12px", marginBottom:6,
          background:"transparent", color:theme.gold, borderRadius:8, border:`1px solid ${theme.border}`,
          textDecoration:"none", fontWeight:800
        }}
      >
        𝕏 Share on X
      </a>

      {/* TikTok hint */}
      <button
        onClick={()=>{
          alert("Tap Download first, then post the clip in TikTok.");
          const isMobile=/Android|iPhone|iPad/i.test(navigator.userAgent);
          if (isMobile) { try { window.location.href="tiktok://"; } catch {} }
          else { window.open("https://studio.tiktok.com","_blank","noopener,noreferrer"); }
          setShareOpen(false);
        }}
        style={{
          width:"100%", padding:"10px 12px", marginBottom:6,
          background:"transparent", color:theme.gold, borderRadius:8, border:`1px solid ${theme.border}`, fontWeight:800
        }}
      >
        🎵 Post to TikTok (download then upload)
      </button>

      {/* Instagram Reels hint */}
      <button
        onClick={()=>{
          alert("Tap Download first, then open Instagram → Reels → upload.");
          const isMobile=/Android|iPhone|iPad/i.test(navigator.userAgent);
          if (isMobile) { try { window.location.href="instagram://camera"; } catch {} }
          else { window.open("https://www.instagram.com/create/reel/","_blank","noopener,noreferrer"); }
          setShareOpen(false);
        }}
        style={{
          width:"100%", padding:"10px 12px",
          background:"transparent", color:theme.gold, borderRadius:8, border:`1px solid ${theme.border}`,
          fontWeight:800
        }}
      >
        📸 Post to Instagram Reels (download then upload)
      </button>

      <button
        onClick={()=>setShareOpen(false)}
        style={{
          width:"100%", padding:"8px 12px", marginTop:8,
          background:"#0B0F14", color:theme.muted, borderRadius:8, border:`1px solid ${theme.border}`, fontWeight:700
        }}
      >
        Close
      </button>

      {linkCopied && (
        <div style={{ color: theme.green, fontSize: 12, fontWeight: 600, textAlign: "right", width: "100%", marginTop: 6 }}>
          Link copied!
        </div>
      )}
    </div>
  </div>
)}
</section>
{/* Outside the card: Why these numbers CTA */}
<div
  style={{
    marginTop: 20,
    display: "flex",
    justifyContent: "center",
  }}
>
  <a
    href="/learn/why-these-numbers"
    style={{
      display: "inline-flex",
      alignItems: "center",
      gap: "6px",
      fontWeight: 700,
      fontSize: 15,
      color: theme.gold,           // golden text
      textDecoration: "none",
      border: `1px solid ${theme.border}`, // subtle border
      borderRadius: 12,
      padding: "8px 14px",
      boxShadow: "0 1px 3px rgba(0,0,0,0.2)", // soft shadow
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