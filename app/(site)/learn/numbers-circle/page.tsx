"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

/* =========================================
   Theme + small utils
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
};
const withAlpha = (hex: string, a: number) => {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0,2),16), g = parseInt(h.slice(2,4),16), b = parseInt(h.slice(4,6),16);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
};
function fmtCoord(v: number, places = 3): number { return Number(v.toFixed(places)); }

/* =========================================
   Degree circle (12 spokes, same order you use)
   1 – 5 – 2 – 6 – 3 – 7 – ♯4 – ♭2 – ♭6 – ♭3 – ♭7 – 4
   ========================================= */
type DegLabel = "1"|"5"|"2"|"6"|"3"|"7"|"♯4"|"♭2"|"♭6"|"♭3"|"♭7"|"4";
const DEGREE_ORDER: DegLabel[] = ["1","5","2","6","3","7","♯4","♭2","♭6","♭3","♭7","4"];

type Pt = { x: number; y: number };
function nodePosition(index: number, radiusPct = 44): Pt {
  const angle = (index / 12) * Math.PI * 2 - Math.PI / 2;
  const x = 50 + Math.cos(angle) * radiusPct;
  const y = 50 + Math.sin(angle) * radiusPct;
  return { x: fmtCoord(x), y: fmtCoord(y) };
}
const LABEL_SAFE = 3.0;
function clampLabelXY(x: number, y: number) {
  const min = LABEL_SAFE, max = 100 - LABEL_SAFE;
  return { x: Math.max(min, Math.min(max, x)), y: Math.max(min, Math.min(max, y)) };
}
function labelPlacement(i: number, p: Pt) {
  const angle = (i / 12) * Math.PI * 2 - Math.PI / 2;
  const RADIAL = 4.6, TANG = 0.0;
  const ux = Math.cos(angle), uy = Math.sin(angle);
  const tx = -Math.sin(angle), ty = Math.cos(angle);
  const x = p.x + RADIAL*ux + TANG*tx;
  const y = p.y + RADIAL*uy + TANG*ty;

  const ax = Math.abs(ux), ay = Math.abs(uy);
  let anchor: "start"|"middle"|"end" = "middle";
  let baseline: "baseline"|"middle"|"hanging" = "middle";
  if (ax >= ay) { anchor = ux > 0 ? "start" : "end"; baseline = "middle"; }
  else          { anchor = "middle"; baseline = uy > 0 ? "hanging" : "baseline"; }

  const c = clampLabelXY(x, y);
  return { x: fmtCoord(c.x), y: fmtCoord(c.y), anchor, baseline };
}
function pathFromNodes(indices: number[]): string {
  if (!indices.length) return "";
  const pts = indices.map(i => nodePosition(i));
  const move = `M ${pts[0].x} ${pts[0].y}`;
  const lines = pts.slice(1).map(p => `L ${p.x} ${p.y}`).join(" ");
  return `${move} ${lines}`;
}

/* =========================================
   Keys & pitch-class math
   Only two keys: Bb Major (B♭) and C minor (natural minor)
   ========================================= */
type KeyName = "BbMajor" | "Cminor";

// tonic PCs: Bb=10, C=0
const KEY_TONIC_PC: Record<KeyName, number> = { BbMajor: 10, Cminor: 0 };

// scale degrees (semitone offsets) for natural minor and major (relative to tonic)
const MAJOR_DEG: Record<"1"|"2"|"3"|"4"|"5"|"6"|"7", number> = { "1":0,"2":2,"3":4,"4":5,"5":7,"6":9,"7":11 };
const NATMIN_DEG: Record<"1"|"2"|"3"|"4"|"5"|"6"|"7", number> = { "1":0,"2":2,"3":3,"4":5,"5":7,"6":8,"7":10 };

// degree label → pitch-class offset (choose diatonic lane)
function degreeToPcOffset(deg: DegLabel, key: KeyName): number {
  // Map degrees 1..7 using major or natural minor set
  const base = key === "BbMajor" ? MAJOR_DEG : NATMIN_DEG;
  switch (deg) {
    case "1": return base["1"];
    case "2": return base["2"];
    case "3": return base["3"];
    case "4": return base["4"];
    case "5": return base["5"];
    case "6": return base["6"];
    case "7": return base["7"];
    // chromatic nodes are kept for display; by default we won't target them in mapping
    case "♯4": return (base["4"] + 1) % 12;
    case "♭2": return (base["2"] + 11) % 12;
    case "♭6": return (base["6"] + 11) % 12;
    case "♭3": return (base["3"] + 11) % 12;
    case "♭7": return (base["7"] + 11) % 12;
    default: return base["1"];
  }
}

/* =========================================
   WebAudio (sample-accurate) for notes
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
function playBufferAt(buf: AudioBuffer, when: number, dur = 0.22, gainDb = 0) {
  const ctx = getCtx();
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const g = ctx.createGain();
  const lin = Math.pow(10, gainDb / 20);
  g.gain.setValueAtTime(0, when);
  g.gain.linearRampToValueAtTime(lin, when + 0.01);
  g.gain.setTargetAtTime(0, when + dur, 0.05);
  src.connect(g).connect(ctx.destination);
  src.start(when);
  src.stop(when + dur + 0.2);
}

// Trackable version so Stop can kill all currently-playing notes
function playBufferAtTracked(
  buf: AudioBuffer,
  when: number,
  dur = 0.22,
  gainDb = 0,
  register: (src: AudioBufferSourceNode) => void,
  unregister: (src: AudioBufferSourceNode) => void
) {
  const ctx = getCtx();
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const g = ctx.createGain();
  const lin = Math.pow(10, gainDb / 20);
  g.gain.setValueAtTime(0, when);
  g.gain.linearRampToValueAtTime(lin, when + 0.01);
  g.gain.setTargetAtTime(0, when + dur, 0.05);
  src.connect(g).connect(ctx.destination);

  try {
    register(src);
    src.onended = () => { try { unregister(src); } catch {} };
    src.start(when);
    src.stop(when + dur + 0.25);
  } catch {
    try { unregister(src); } catch {}
  }
}
/* =========================================
   Mapping digits → degrees & MIDI
   Rules:
   - digits 1..7 → degrees 1..7
   - 0 → pause
   - 8 → "upper 1" (display node "1", but octave up for audio)
   - 9 → "upper 2" (display node "2", octave up for audio)
   ========================================= */

type Step = {
  at: number;
  isPause: boolean;
  // precomputed values (used by date/phone/custom paths)
  nodeIndex?: number;
  midi?: number;
  // degree info (used by irrationals; we recompute midi/node per-step key)
  deg?: "1"|"2"|"3"|"4"|"5"|"6"|"7";
  octaveUp?: boolean;
};

const NOTE_MS = 250;
const IRR_SESSION_MS = 60000;   // 60s for irrationals
const MIX_CHUNK = 20;           // flip Major ↔ Minor every 20 digits in Mixed

// 30s session for Date / Phone / Custom
const DPC_SESSION_MS = 30000;   // 30s for date/phone/custom (loop always)

// Reverse thresholds (Mixed only)
const PHONE_REV_ITER  = 7;      // 7th iteration and beyond (>=7)
const DATE_REV_ITER   = 10;     // 10th iteration and beyond (>=10)
const CUSTOM_REV_ITER = 4;      // 4th iteration and beyond (>=4)



// Minor display mapping: when key is C minor, show degrees on the flat spokes
function minorDisplayLabel(deg: "1"|"2"|"3"|"4"|"5"|"6"|"7"): DegLabel {
  switch (deg) {
    case "3": return "♭3";
    case "6": return "♭6";
    case "7": return "♭7";
    default:  return deg; // 1, 2, 4, 5 stay the same
  }
}

// Degree → circle index (spoke) respecting the selected key for DISPLAY/TRAIL
function degToIndexForKey(deg: "1"|"2"|"3"|"4"|"5"|"6"|"7", key: KeyName): number {
  const display: DegLabel =
    key === "Cminor" ? minorDisplayLabel(deg) : (deg as DegLabel);
  return DEGREE_ORDER.indexOf(display);
}

// Compute MIDI for a given degree in a key; allow octaveUp flag for 8/9
function degreeToMidi(deg: "1"|"2"|"3"|"4"|"5"|"6"|"7", key: KeyName, octaveUp = false): number {
  const tonicPc = KEY_TONIC_PC[key];
  const offset = degreeToPcOffset(deg as DegLabel, key);
  const pc = (tonicPc + offset) % 12;
  // choose C3..C5 window; bias around C4
  const base = (4 + (octaveUp ? 1 : 0)) * 12; // C4 or C5
  // find nearest midi = base .. base+24 with same pc
  for (let m = base - 12; m <= base + 12; m++) {
    if (m >= 36 && m <= 84 && (m % 12) === pc) return m;
  }
  return ((Math.floor(base / 12)) * 12) + pc;
}
/* =========================================
   Page Component
   ========================================= */
export default function NumbersCirclePage() {
  // Key (default Bb Major)
const [keyName, setKeyName] = useState<KeyName>("BbMajor");
const [section, setSection] = useState<Section>("irrational");
// Mixed mode toggle (declare BEFORE JSX uses it)
const [mixed, setMixed] = useState(false);
const [linkCopied, setLinkCopied] = useState(false);
  {/* Mixed mode toggle */}
<div style={{ marginTop: 8 }}>
  <label style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
    <input
      type="checkbox"
      checked={mixed}
      onChange={(e) => setMixed(e.target.checked)}
    />
    <span style={{ color: theme.text, fontWeight: 700 }}>Mixed (Major ⇄ Minor)</span>
  </label>
  <div style={{ color: theme.muted, fontSize: 12, marginTop: 4 }}>
    In Mixed mode the key will alternate (color will flip). Flip boundaries arrive in the next iteration.
  </div>
</div>
// --- Rotating title + subtitle (3 options) ---
const TITLE_OPTIONS = [
  {
    title: "When Numbers Sing",
    subtitle:
      "Turn birthdays, phone numbers, or even π into music that loops, flips, and dances on the circle.",
  },
  {
    title: "Make Your Numbers Dance",
    subtitle:
      "Every digit is a step, every dash a pause — watch your numbers spin into sound for half a minute.",
  },
  {
    title: "Can You Hear π?",
    subtitle:
      "One minute of π’s digits becomes music — swap Major and Minor, play backwards, or try your own number.",
  },
] as const;

const [titleIdx, setTitleIdx] = useState(0);

// Pick a random title AFTER mount (avoid SSR hydration mismatch)
useEffect(() => {
  setTitleIdx(Math.floor(Math.random() * TITLE_OPTIONS.length));
}, []);

  // Dynamic helper text per section (Mixed-aware)
const helperText = useMemo(() => {
  if (section === "irrational") {
    return mixed
      ? "Two voices take turns: one bright, one dark. Every 20 steps, Major and Minor swap, like two colors painting the digits onto the circle. Plays for one minute."
      : "Hear the secret music hidden in endless numbers — like π and √2. They play for one whole minute, step by step."
  }
  if (section === "date") {
    return mixed
      ? "Turn birthdays into sound for 30 seconds. Each time your date repeats, Major and Minor swap. After enough loops, the date starts walking backwards — like rewinding a tape."
      : "Turn birthdays and anniversaries into sound. Your date loops for half a minute, every dash is a gentle pause."
  }
  if (section === "phone") {
    return mixed
      ? "Your phone number sings in two voices: cheerful Major, moody Minor. After several rounds it walks backwards. Plays for 30 seconds; the country code leads the way."
      : "Even phone numbers can sing! The country code goes first, then the digits dance around the circle for 30 seconds."
  }
  // custom
  return mixed
    ? "Your number plays like a mirror: first forward in Major, then Minor. From the 4th round on, it flips and plays backwards too — all in 30 seconds."
    : "Choose any number up to 20 digits and hear it become music. It plays forward again and again for 30 seconds."
}, [section, mixed]);


  // Inputs
  const [irr, setIrr] = useState<"pi"|"e"|"phi"|"sqrt2"|"sqrt3">("pi");
  const [irrRandom, setIrrRandom] = useState(false);
  const [dateFmt, setDateFmt] = useState<"DD-MM-YYYY"|"YYYY-MM-DD"|"MM-DD-YYYY">("DD-MM-YYYY");
  const [dateVal, setDateVal] = useState<string>("");
  const [phoneRegion, setPhoneRegion] = useState<"US"|"UK">("US");
  const [phoneVal, setPhoneVal] = useState<string>("");
  const [customVal, setCustomVal] = useState<string>("");

  // Session
  const [isRunning, setIsRunning] = useState(false);
  const [nowPlaying, setNowPlaying] = useState("");
  const svgRef = useRef<SVGSVGElement | null>(null);

  // Trail segments (store as polyline path built from last N nodes)
  type OverlayTrail = { id: string; color: string; path: string; expiresAt: number };
  const [overlays, setOverlays] = useState<OverlayTrail[]>([]);
  const isRunningRef = useRef(false); useEffect(()=>{isRunningRef.current=isRunning;},[isRunning]);
  const timeoutsRef = useRef<number[]>([]);
  const TRAIL_N = 10; // keep last N segments during session

  function addTimeout(cb: ()=>void, ms:number){const id=window.setTimeout(cb,ms);timeoutsRef.current.push(id);return id;}
  function clearAllTimeouts(){for(const id of timeoutsRef.current) clearTimeout(id);timeoutsRef.current=[];}

  // RAF cleanup (while running we prune only by count; at end we freeze)
  useEffect(()=>{
    if (!isRunning && overlays.length===0) return;
    let raf=0;
    const tick=()=>{ const now=getCtx().currentTime;
      setOverlays(prev=>prev.filter(o=> now < o.expiresAt || o.expiresAt===Number.POSITIVE_INFINITY));
      raf=requestAnimationFrame(tick);
    };
    raf=requestAnimationFrame(tick);
    return ()=>{ if(raf) cancelAnimationFrame(raf); };
  },[isRunning, overlays.length]);

  /* ---------- Irrational digit sources (first ~2048 digits as strings) ---------- */
  // Shortened samples; in real file, embed longer strings (at least 2048 chars)
  const DIGITS = useMemo(()=>({
    pi:    "314159265358979323846264338327950288419716939937510",       // extend…
    e:     "271828182845904523536028747135266249775724709369995",       // extend…
    phi:   "161803398874989484820458683436563811772030917980576",       // extend…
    sqrt2: "141421356237309504880168872420969807856967187537694",       // extend…
    sqrt3: "173205080756887729352744634150587236694280525122090",       // extend…
  }),[]);

  /* ---------- Digit → degree mapping ---------- */
  function mapDigitToDegree(d: string): { isPause: boolean; deg?: "1"|"2"|"3"|"4"|"5"|"6"|"7"; octaveUp?: boolean } {
    if (d === "0") return { isPause: true };
    if ("1234567".includes(d)) return { isPause: false, deg: d as any };
    if (d === "8") return { isPause: false, deg: "1", octaveUp: true };
    if (d === "9") return { isPause: false, deg: "2", octaveUp: true };
    // any other char (e.g., dash in date/phone) = pause
    return { isPause: true };
  }
// Keep only digits and '-' (dash = pause); drop everything else
function sanitizeDigitsWithPauses(s: string): string[] {
  return s.split("").filter(ch => /[0-9\-]/.test(ch));
}
  /* ---------- Build a sequence for the chosen section ---------- */
  type Plan = { tones: Step[]; lastAt: number };

  


function planForIrrational(): Plan {
  const src = DIGITS[irr];
  // 60s at 250ms → 240 steps
  const STEPS = Math.ceil(IRR_SESSION_MS / NOTE_MS);
  const ctx = getCtx();
  const start = ctx.currentTime + 0.25;

  // Random start index if enabled (only irrationals)
  const startIndex = irrRandom ? Math.floor(Math.random() * src.length) : 0;

  const tones: Plan["tones"] = [];
  for (let k = 0; k < STEPS; k++) {
    const d = src[(startIndex + k) % src.length];
    const at = start + k * (NOTE_MS / 1000);
    const m = mapDigitToDegree(d);
    if (m.isPause) {
      tones.push({ at, isPause: true });
    } else {
      // carry degree + octaveUp; key-specific MIDI and nodeIndex will be computed at schedule time
      tones.push({ at, isPause: false, deg: m.deg!, octaveUp: !!m.octaveUp });
    }
  }
  const lastAt = tones.length ? tones[tones.length - 1].at : start;
  return { tones, lastAt };
}
function planForDate(): Plan {
  // produce time-only steps; actual digit selection happens during scheduling
  const STEPS = Math.ceil(DPC_SESSION_MS / NOTE_MS); // 30s at 250ms
  const ctx = getCtx(); const start = ctx.currentTime + 0.25;
  const tones: Plan["tones"] = [];
  for (let k = 0; k < STEPS; k++) {
    const at = start + k * (NOTE_MS / 1000);
    tones.push({ at, isPause: false }); // content determined at schedule-time
  }
  const lastAt = tones.length ? tones[tones.length - 1].at : start;
  return { tones, lastAt };
}

  function planForPhone(): Plan {
  const STEPS = Math.ceil(DPC_SESSION_MS / NOTE_MS);
  const ctx = getCtx(); const start = ctx.currentTime + 0.25;
  const tones: Plan["tones"] = [];
  for (let k = 0; k < STEPS; k++) {
    const at = start + k * (NOTE_MS / 1000);
    tones.push({ at, isPause: false });
  }
  const lastAt = tones.length ? tones[tones.length - 1].at : start;
  return { tones, lastAt };
}

  function planForCustom(): Plan {
  const STEPS = Math.ceil(DPC_SESSION_MS / NOTE_MS);
  const ctx = getCtx(); const start = ctx.currentTime + 0.25;
  const tones: Plan["tones"] = [];
  for (let k = 0; k < STEPS; k++) {
    const at = start + k * (NOTE_MS / 1000);
    tones.push({ at, isPause: false });
  }
  const lastAt = tones.length ? tones[tones.length - 1].at : start;
  return { tones, lastAt };
}


  function buildPlan(): Plan {
    if (section === "irrational") return planForIrrational();
    if (section === "date") return planForDate();
    if (section === "phone") return planForPhone();
    return planForCustom();
  }
// Section tabs
  type Section = "irrational" | "date" | "phone" | "custom";

  /* ---------- Share helpers ---------- */
  const searchParams = useSearchParams();
  function buildShareUrl(): string {
  const params = new URLSearchParams();
  params.set("key", keyName);
  params.set("section", section);

  // mode
  params.set("mode", mixed ? "mixed" : "single");
// encode frozen trails (last N nodes per color)
if (nodesMajorRef.current.length > 1) {
  params.set("trailMajor", nodesMajorRef.current.join(","));
}
if (nodesMinorRef.current.length > 1) {
  params.set("trailMinor", nodesMinorRef.current.join(","));
}

  if (section === "irrational") {
    params.set("constant", irr);
    params.set("random", irrRandom ? "true" : "false");
  }
  if (section === "date") {
    params.set("dateFmt", dateFmt);
    params.set("date", dateVal);
  }
  if (section === "phone") {
    params.set("region", phoneRegion);
    params.set("phone", phoneVal);
  }
  if (section === "custom") {
    params.set("number", customVal);
  }

  params.set("trailN", String(TRAIL_N));
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

  const onDownloadPng = useCallback(async ()=>{
    const svgEl = svgRef.current; if (!svgEl) return;
    const svgText = new XMLSerializer().serializeToString(svgEl);
    const blob = new Blob([svgText],{type:"image/svg+xml;charset=utf-8"});
    const url = URL.createObjectURL(blob);
    const img = new Image();
    const rect = svgEl.getBoundingClientRect();
    const W = Math.max(1, Math.floor(rect.width || 360));
    const H = Math.max(1, Math.floor(rect.height || 360));
    const SCALE = 2;
    const canvas = document.createElement("canvas");
    canvas.width = W*SCALE; canvas.height = H*SCALE;
    const ctx2d = canvas.getContext("2d"); if (!ctx2d) return;
    await new Promise<void>((res, rej)=>{ img.onload=()=>{ctx2d.drawImage(img,0,0,canvas.width,canvas.height);URL.revokeObjectURL(url);res();}; img.onerror=rej; img.src=url; });
    canvas.toBlob((png)=>{ if(!png) return; const a=document.createElement("a"); a.href=URL.createObjectURL(png); a.download=`numbers-circle-${section}.png`; document.body.appendChild(a); a.click(); a.remove(); },"image/png");
  },[section]);


// --- Date formatting helpers ---
function formatDateInput(raw: string, fmt: "DD-MM-YYYY"|"YYYY-MM-DD"|"MM-DD-YYYY"): string {
  const digits = raw.replace(/\D+/g, "").slice(0, 8); // max 8 digits
  let parts: string[] = [];

  if (fmt === "DD-MM-YYYY") {
    const d  = digits.slice(0, 2);
    const m  = digits.slice(2, 4);
    const y  = digits.slice(4, 8);
    parts = [d, m, y].filter(Boolean);
  } else if (fmt === "YYYY-MM-DD") {
    const y  = digits.slice(0, 4);
    const m  = digits.slice(4, 6);
    const d  = digits.slice(6, 8);
    parts = [y, m, d].filter(Boolean);
  } else { // "MM-DD-YYYY"
    const m  = digits.slice(0, 2);
    const d  = digits.slice(2, 4);
    const y  = digits.slice(4, 8);
    parts = [m, d, y].filter(Boolean);
  }
  return parts.join("-");
}


// --- Phone formatting helpers ---
function formatUSPhone(raw: string): string {
  const d = raw.replace(/\D+/g, "").slice(0, 10); // US 10 digits
  const a = d.slice(0,3), b = d.slice(3,6), c = d.slice(6,10);
  if (d.length <= 3) return a;
  if (d.length <= 6) return `${a}-${b}`;
  return `${a}-${b}-${c}`;
}

function formatUKPhone(raw: string): string {
  // MVP: group as 5-3-3 for common 11-digit mobiles (07xxx-xxx-xxx)
  const d = raw.replace(/\D+/g, "").slice(0, 11);
  const a = d.slice(0,5), b = d.slice(5,8), c = d.slice(8,11);
  if (d.length <= 5) return a;
  if (d.length <= 8) return `${a}-${b}`;
  return `${a}-${b}-${c}`;
}

function formatPhoneInput(raw: string, region: "US"|"UK"): string {
  return region === "US" ? formatUSPhone(raw) : formatUKPhone(raw);
}

  /* ---------- Init from URL ---------- */
  useEffect(() => {
  if (!searchParams) return;

  const k = searchParams.get("key");
  const sec = searchParams.get("section") as Section | null;
  const mode = searchParams.get("mode");
  const rand = searchParams.get("random");

  if (k === "BbMajor" || k === "Cminor") setKeyName(k);
  if (sec) setSection(sec);

  // Mixed mode from URL
  if (mode === "mixed") setMixed(true);
  else if (mode === "single") setMixed(false);

  if (sec === "irrational") {
    const c = searchParams.get("constant");
    if (c === "pi" || c === "e" || c === "phi" || c === "sqrt2" || c === "sqrt3") setIrr(c);
    // Random start for irrationals
    if (rand === "true") setIrrRandom(true);
  }

  if (sec === "date") {
    const f = searchParams.get("dateFmt");
    const v = searchParams.get("date");
    if (f === "DD-MM-YYYY" || f === "YYYY-MM-DD" || f === "MM-DD-YYYY") setDateFmt(f);
    if (v) setDateVal(v);
  }

  if (sec === "phone") {
    const r = searchParams.get("region");
    const p = searchParams.get("phone");
    if (r === "US" || r === "UK") setPhoneRegion(r);
    if (p) setPhoneVal(p);
  }

  if (sec === "custom") {
    const n = searchParams.get("number");
    if (n) setCustomVal(n);
  }
  // Pre-freeze trails if present in the URL (no audio)
const tMaj = searchParams.get("trailMajor");
const tMin = searchParams.get("trailMinor");
if (tMaj || tMin) {
  const newOverlays: OverlayTrail[] = [];

  if (tMaj) {
    const arr = tMaj.split(",").map(n => parseInt(n, 10)).filter(Number.isFinite);
    nodesMajorRef.current = arr;
    if (arr.length > 1) {
      newOverlays.push({
        id: "trail-major",
        color: theme.gold,
        path: pathFromNodes(arr),
        expiresAt: Number.POSITIVE_INFINITY,
      });
    }
  }
  if (tMin) {
    const arr = tMin.split(",").map(n => parseInt(n, 10)).filter(Number.isFinite);
    nodesMinorRef.current = arr;
    if (arr.length > 1) {
      newOverlays.push({
        id: "trail-minor",
        color: theme.green, // or theme.teal if you preferred
        path: pathFromNodes(arr),
        expiresAt: Number.POSITIVE_INFINITY,
      });
    }
  }

  if (newOverlays.length) setOverlays(newOverlays);
}
// eslint-disable-next-line react-hooks/exhaustive-deps
}, []);


  /* ---------- Start / Stop ---------- */

  // Deque of nodes for trail path (last N nodes)
  const nodesRef = useRef<number[]>([]);
  useEffect(()=>{ nodesRef.current = []; },[]);

  // --- HARD STOP (track active audio sources) ---
const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
const registerSource = useCallback((src: AudioBufferSourceNode) => {
  sourcesRef.current.add(src);
}, []);
const unregisterSource = useCallback((src: AudioBufferSourceNode) => {
  sourcesRef.current.delete(src);
}, []);

// --- TWO-COLOR TRAILS (per color deques) ---
const nodesMajorRef = useRef<number[]>([]);
const nodesMinorRef = useRef<number[]>([]);
useEffect(() => { nodesMajorRef.current = []; nodesMinorRef.current = []; }, []);

// --- MIXED toggle + current key label (live) ---
const currentKeyRef = useRef<KeyName>("BbMajor");  // updated when we flip (B/C)
const keyLabel = useCallback((k: KeyName) => (k === "BbMajor" ? "B♭ Major" : "C minor"), []);

  // Patch the progressive trail (hook called by scheduled callbacks)
const appendTrail = useCallback((nodeIndex: number, keyForColor: KeyName) => {
  const isMajor = (keyForColor === "BbMajor");
  const deque = isMajor ? nodesMajorRef.current : nodesMinorRef.current;

  deque.push(nodeIndex);
  if (deque.length > TRAIL_N + 1) {
    deque.splice(0, deque.length - (TRAIL_N + 1));
  }
  const path = pathFromNodes(deque);

  setOverlays(prev => {
    const id = isMajor ? "trail-major" : "trail-minor";
    const color = isMajor ? theme.gold : theme.green; // gold = Major, teal/green = Minor
    const existing = prev.find(o => o.id === id);
    const ov: OverlayTrail = { id, color, path, expiresAt: Number.POSITIVE_INFINITY };
    if (existing) return prev.map(o => (o.id === id ? ov : o));
    return [...prev, ov].slice(-2); // keep at most 2 overlays (one per color)
  });
}, []);

  // Replace the placeholder `setOverlays(prev=>prev)` inside start's scheduling
  // with a stable callback that calls appendTrail:
  // (we can't edit earlier code block here; see Part 3 where we finalize start)

  const stop = useCallback(() => {
  // kill all future timers
  clearAllTimeouts();

  // hard-stop all currently playing sources
  try {
    for (const src of sourcesRef.current) {
      try { src.stop(0); } catch {}
    }
    sourcesRef.current.clear();
  } catch {}

  // pause session
  setIsRunning(false);
  setNowPlaying("Stopped");
}, []);
  // Re-define start here to include appendTrail (override previous placeholder)
const start = useCallback(async () => {
  clearAllTimeouts();
  // Collapse iOS keyboard & restore viewport
try { (document.activeElement as HTMLElement | null)?.blur(); } catch {}
setTimeout(() => {
  if ("visualViewport" in window) {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
}, 50);
  await unlockAudioCtx();
  // rotate the poster title each time Start is pressed
setTitleIdx((i) => (i + 1) % TITLE_OPTIONS.length);

  // session init
  setIsRunning(true);
  setOverlays([]);                 // clear any frozen trails
  nodesMajorRef.current = [];
  nodesMinorRef.current = [];

  // initialize live key label
  currentKeyRef.current = keyName;
  setNowPlaying(`Playing — ${keyLabel(currentKeyRef.current)}`);

  // Build the time plan (irrational=60s, others=30s)
  const plan = buildPlan();
  const tones = plan.tones;
  const ctx = getCtx();

  // --------- Build the reusable sequence for date/phone/custom (digits + '-'), once ----------
  let dpcSeq: string[] = [];
  if (section === "date") {
    dpcSeq = sanitizeDigitsWithPauses(dateVal); // already dashed in input
  } else if (section === "phone") {
    // include country code first (digits only), then the user's formatted number (digits and dashes)
    const code = (phoneRegion === "US") ? "1" : "44";
    dpcSeq = [...code.split(""), ...sanitizeDigitsWithPauses(phoneVal)];
  } else if (section === "custom") {
    dpcSeq = sanitizeDigitsWithPauses(customVal).slice(0, 20);
  }
  const dpcLen = (section === "irrational") ? 0 : Math.max(1, dpcSeq.length); // use 0 to skip branch

  // thresholds (Mixed only)
  const revAfterIter =
    section === "phone"  ? PHONE_REV_ITER  :
    section === "date"   ? DATE_REV_ITER   :
    section === "custom" ? CUSTOM_REV_ITER : Infinity;

  // ---------- Schedule all steps ----------
  tones.forEach((t, i) => {
    // Determine key for this step + update status at boundaries
    let keyForStep: KeyName = currentKeyRef.current;

    if (section === "irrational") {
      // Iteration B: flip every MIX_CHUNK steps when Mixed
      if (mixed) {
        const chunk = Math.floor(i / MIX_CHUNK);
        keyForStep = (chunk % 2 === 0) ? "BbMajor" : "Cminor";
        if (i % MIX_CHUNK === 0) {
          const atMs = Math.max(0, (t.at - ctx.currentTime) * 1000);
          addTimeout(() => {
            if (!isRunningRef.current) return;
            currentKeyRef.current = keyForStep;
            setNowPlaying(`Playing — ${keyLabel(currentKeyRef.current)}`);
          }, atMs);
        }
      } else {
        keyForStep = keyName;
        currentKeyRef.current = keyForStep;
      }
    } else {
      // Iteration C: DATE/PHONE/CUSTOM — Mixed flips per full iteration of the sequence
      keyForStep = keyName;
      if (mixed) {
        const iteration = Math.floor(i / dpcLen);
        keyForStep = (iteration % 2 === 0) ? "BbMajor" : "Cminor";
       
if (i % dpcLen === 0) {
  const atMs = Math.max(0, (t.at - ctx.currentTime) * 1000);
  const iteration = Math.floor(i / dpcLen);

  addTimeout(() => {
    if (!isRunningRef.current) return;
    currentKeyRef.current = keyForStep;

    // Check if we are in reverse territory
    let revAfter = 0;
    if (section === "phone")   revAfter = PHONE_REV_ITER;
    if (section === "date")    revAfter = DATE_REV_ITER;
    if (section === "custom")  revAfter = CUSTOM_REV_ITER;

    const reverseLabel =
      (mixed && iteration >= revAfter) ? " (reverse)" : "";

    setNowPlaying(`Playing — ${keyLabel(currentKeyRef.current)}${reverseLabel}`);
  }, atMs);
}
      }
      currentKeyRef.current = keyForStep;
    }

    // ------- AUDIO & TRAIL SCHEDULING -------
    if (section === "irrational") {
      // We carried deg/octaveUp in planForIrrational; compute midi/node per-step key
      if (!t.isPause && t.deg) {
        // AUDIO
        const midiToUse = degreeToMidi(t.deg, keyForStep, !!t.octaveUp);
        loadBuffer(midiToNoteName(midiToUse))
          .then(buf => playBufferAtTracked(buf, t.at, 0.20, 0, registerSource, unregisterSource))
          .catch(() => {});
        // TRAIL
        addTimeout(() => {
          if (!isRunningRef.current) return;
          const nodeIdx = degToIndexForKey(t.deg!, keyForStep);
          appendTrail(nodeIdx, keyForStep); // gold for Major, teal for Minor
        }, Math.max(0, (t.at - ctx.currentTime) * 1000));
      } else if (t.isPause) {
        // pause: nothing to draw or play
      }
    } else {
      // DATE/PHONE/CUSTOM: loop sequence for 30s; reverse after threshold in Mixed
      // pick index within the current iteration
      const seqLen = dpcLen;
      const iteration = Math.floor(i / seqLen);
      let idxWithinIter = i % seqLen;

      if (mixed && iteration >= revAfterIter) {
        idxWithinIter = (seqLen - 1) - (i % seqLen); // reversed order
      }

      // choose char; if user provided nothing, treat as pause
      const ch = (seqLen > 0) ? dpcSeq[idxWithinIter] : "-";
      const m = (ch === "-") ? { isPause: true } : mapDigitToDegree(ch);

      // AUDIO
      if (!m.isPause && m.deg) {
        const midiToUse = degreeToMidi(m.deg!, keyForStep, !!m.octaveUp);
        loadBuffer(midiToNoteName(midiToUse))
          .then(buf => playBufferAtTracked(buf, t.at, 0.20, 0, registerSource, unregisterSource))
          .catch(() => {});
      }

      // TRAIL
      addTimeout(() => {
        if (!isRunningRef.current) return;
        if (!m.isPause && m.deg) {
          const nodeIdx = degToIndexForKey(m.deg!, keyForStep);
          appendTrail(nodeIdx, keyForStep);
        }
      }, Math.max(0, (t.at - ctx.currentTime) * 1000));
    }
  });

  // -------- Freeze at session end (do not clear) --------
  const totalMs = Math.max(0, (plan.lastAt - ctx.currentTime) * 1000) + 40;
  addTimeout(() => {
    setIsRunning(false);
    setNowPlaying(`Done — ${keyLabel(currentKeyRef.current)}`);
    // overlays already have expiresAt = Infinity
  }, totalMs);
}, [
  buildPlan,
  keyName,
  mixed,
  section,
  irrRandom,         // included so Random change is captured on next start
  dateVal,
  phoneVal,
  phoneRegion,
  customVal,
  keyLabel,
  appendTrail,
  registerSource,
  unregisterSource
]);

  /* ---------- Render ---------- */
  const svgSize = 360;

  return (
    <div style={{ minHeight:"100vh", background: theme.bg, color: theme.text, overflowX: "hidden" }}>
      <main style={{ width:"100%", margin:"0 auto", padding:12, boxSizing:"border-box", maxWidth: 520 }}>
        <style>{`
          @media (min-width:768px){ main{ max-width:680px !important; } }
          @media (min-width:1024px){ main{ maxWidth:760px !important; } }
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
        {/* Options */}
        <section style={{ background: theme.card, border:`1px solid ${theme.border}`, borderRadius: 16, padding: 12, marginBottom:12 }}>
          {/* Key / Mixed pills */}
<div style={{ marginBottom: 12 }}>
  <div style={{ color: theme.muted, fontSize: 13, marginBottom: 6 }}>Key</div>

  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
    {/* B♭ Major */}
    <button
      onClick={() => { setMixed(false); setKeyName("BbMajor"); }}
      style={{
        background: (!mixed && keyName === "BbMajor") ? theme.blue : "#0F1821",
        color:      (!mixed && keyName === "BbMajor") ? "#081019" : theme.text,
        border: `1px solid ${theme.border}`,
        borderRadius: 999,
        padding: "6px 10px",
        fontWeight: 700,
      }}
      aria-pressed={!mixed && keyName === "BbMajor"}
    >
      B♭ Major
    </button>

    {/* C minor */}
    <button
      onClick={() => { setMixed(false); setKeyName("Cminor"); }}
      style={{
        background: (!mixed && keyName === "Cminor") ? theme.blue : "#0F1821",
        color:      (!mixed && keyName === "Cminor") ? "#081019" : theme.text,
        border: `1px solid ${theme.border}`,
        borderRadius: 999,
        padding: "6px 10px",
        fontWeight: 700,
      }}
      aria-pressed={!mixed && keyName === "Cminor"}
    >
      C minor
    </button>

    {/* Mixed */}
    <button
      onClick={() => { setMixed(true); }}
      style={{
        background: mixed ? theme.blue : "#0F1821",
        color:      mixed ? "#081019" : theme.text,
        border: `1px solid ${theme.border}`,
        borderRadius: 999,
        padding: "6px 10px",
        fontWeight: 700,
      }}
      aria-pressed={mixed}
      title="Alternate Major ↔ Minor (color will flip)"
    >
      Mixed (Major ⇄ Minor)
    </button>
  </div>

  <div style={{ color: theme.muted, fontSize: 12, marginTop: 6 }}>
    Mixed alternates Major ↔ Minor; color flips accordingly. (Flip timing arrives in the next iteration.)
  </div>
</div>


          {/* Section tabs */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ color: theme.muted, fontSize: 13, marginBottom: 6 }}>Section</div>
            <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
              {([
                {k:"irrational", label:"Irrationals (30s)"},
                {k:"date", label:"Date"},
                {k:"phone", label:"Phone"},
                {k:"custom", label:"Custom"},
              ] as {k:Section,label:string}[]).map(s=>(
                <button key={s.k} onClick={()=>setSection(s.k)}
                  style={{ background: section===s.k? theme.blue:"#0F1821", color: section===s.k? "#081019":theme.text, border:`1px solid ${theme.border}`, borderRadius:999, padding:"6px 10px", fontWeight:700 }}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Section inputs */}
          {section==="irrational" && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ color: theme.muted, fontSize: 13, marginBottom: 6 }}>Choose constant</div>
              <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                {(["pi","e","phi","sqrt2","sqrt3"] as const).map(c=>(
                  <button key={c} onClick={()=>setIrr(c as any)}
                    style={{ background: irr===c? theme.blue:"#0F1821", color: irr===c? "#081019":theme.text, border:`1px solid ${theme.border}`, borderRadius:999, padding:"6px 10px", fontWeight:700 }}>
                    {c==="pi"?"π":c==="e"?"e":c==="phi"?"ϕ":c==="sqrt2"?"√2":"√3"}
                  </button>
                ))}
              </div>
              <div style={{ color: theme.muted, fontSize: 12, marginTop: 6 }}>Digits are played as degrees, 0 is a pause.</div>
            <div style={{ marginTop: 8 }}>
  <label style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
    <input
      type="checkbox"
      checked={irrRandom}
      onChange={(e) => setIrrRandom(e.target.checked)}
    />
    <span style={{ color: theme.text, fontWeight: 700 }}>Random start</span>
  </label>
</div>
            </div>
          )}

          {section==="date" && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ display:"flex", gap:6, flexWrap:"wrap", alignItems:"center" }}>
                <select value={dateFmt} onChange={e=>setDateFmt(e.target.value as any)}
                  style={{ background:"#0F1821", color:theme.text, border:`1px solid ${theme.border}`, borderRadius:8, padding:"6px 8px" }}>
                  <option value="DD-MM-YYYY">DD-MM-YYYY</option>
                  <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                  <option value="MM-DD-YYYY">MM-DD-YYYY</option>
                </select>
                <input value={dateVal} onChange={e => setDateVal(formatDateInput(e.target.value, dateFmt))}
                  placeholder={dateFmt}
                  style={{ flex:1, minWidth:0, background:"#0F1821", color:theme.text, border:`1px solid ${theme.border}`, borderRadius:8, padding:"6px 8px", fontSize: 16 }} />
              </div>
              <div style={{ color: theme.muted, fontSize: 12, marginTop: 6 }}>Digits are played as degrees; “-” is a pause.</div>
            </div>
          )}

          {section==="phone" && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ display:"flex", gap:6, flexWrap:"wrap", alignItems:"center" }}>
                <select value={phoneRegion} onChange={e=>setPhoneRegion(e.target.value as any)}
                  style={{ background:"#0F1821", color:theme.text, border:`1px solid ${theme.border}`, borderRadius:8, padding:"6px 8px" }}>
                  <option value="US">USA (+1)</option>
                  <option value="UK">UK (+44)</option>
                </select>
                <input value={phoneVal} onChange={e => setPhoneVal(formatPhoneInput(e.target.value, phoneRegion))}
                  placeholder={phoneRegion==="US"?"(555)-123-4567":"+44-7700-900123"}
                  style={{ flex:1, minWidth:0, background:"#0F1821", color:theme.text, border:`1px solid ${theme.border}`, borderRadius:8, padding:"6px 8px", fontSize: 16 }} />
              </div>
              <div style={{ color: theme.muted, fontSize: 12, marginTop: 6 }}>Digits are played as degrees; separators “-” are pauses.</div>
            </div>
          )}

          {section==="custom" && (
  <div style={{ marginBottom: 12 }}>
    <input
      value={customVal}
      onChange={e => {
        // Strip to digits and dashes, then limit length to 20
        const sanitized = e.target.value.replace(/[^0-9\-]/g, "").slice(0, 20);
        setCustomVal(sanitized);
      }}
      maxLength={20}  // enforces at HTML level too
      placeholder="Up to 20 digits; use '-' for pauses"
      style={{
        width:"100%",
        background:"#0F1821",
        color:theme.text,
        border:`1px solid ${theme.border}`,
        borderRadius:8,
        padding:"6px 8px",
         fontSize: 16,
      }}
    />
  </div>
)}
{/* Dynamic description */}
<div style={{ color: theme.muted, fontSize: 13, lineHeight: 1.4, marginTop: 6 }}>
  {helperText}
</div>
          {/* Start/Stop + status */}
          <div style={{ marginTop: 14, display:"flex", alignItems:"center", gap:14 }}>
            {!isRunning ? (
              <button onClick={start}
                style={{ background: theme.blue, color:"#081019", border:"none", borderRadius:999, padding:"10px 16px", fontWeight:700, cursor:"pointer", fontSize:16 }}>
                ▶ Start
              </button>
            ) : (
              <button onClick={stop}
                style={{ background:"transparent", color:theme.text, border:`1px solid ${theme.border}`, borderRadius:999, padding:"10px 16px", fontWeight:700, cursor:"pointer", fontSize:16 }}>
                ⏹ Stop
              </button>
            )}

            <div style={{ fontSize: 18, fontWeight: 700, color: isRunning? theme.gold: theme.muted, minHeight: 24 }}>
              {nowPlaying || "Ready"}
            </div>
          </div>
        </section>

        {/* Circle + Share */}
        <section style={{ background: theme.card, border:`1px solid ${theme.border}`, borderRadius: 16, padding: 12 }}>
          <div style={{ display:"grid", justifyContent:"center" }}>
            <svg ref={svgRef} viewBox="0 0 100 100" width={svgSize} height={svgSize} style={{ overflow:"visible" }}>
              {/* ring */}
              <circle cx="50" cy="50" r="44" stroke={withAlpha(theme.text,0.15)} strokeWidth="2" fill="none" />
              {/* nodes + degree labels */}
              {DEGREE_ORDER.map((lab, i)=>{
                const p = nodePosition(i);
                const lp = labelPlacement(i, p);
                return (
                  <g key={lab}>
                    <circle cx={p.x} cy={p.y} r="1.6" fill={withAlpha(theme.text,0.5)} />
                    <text x={lp.x} y={lp.y} textAnchor={lp.anchor} dominantBaseline={lp.baseline}
                      fontSize="4" fill={theme.text}
                      style={{ userSelect:"none", pointerEvents:"none" }}>
                      {lab}
                    </text>
                  </g>
                );
              })}
              {/* trail overlay */}
              {overlays.map(ov=>(
                <g key={ov.id}>
                  <path d={ov.path} fill="none" stroke={ov.color} strokeWidth="0.9" />
                </g>
              ))}
            </svg>

            {/* Share row */}
            
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
  {/* Copy Link highlighted */}
  <button
    onClick={onCopyLink}
    style={{
      background: theme.blue,
      color: "#081019",
      border: "none",
      borderRadius: 999,
      padding: "8px 14px",
      fontWeight: 700,
      cursor: "pointer",
    }}
  >
    🔗 Share Link
  </button>

  {/* Confirmation text */}
  {linkCopied && (
    <span style={{ color: theme.green, fontSize: 13, fontWeight: 600 }}>
      Link copied!
    </span>
  )}

  {/* Download PNG as secondary */}
  <button
    onClick={onDownloadPng}
    style={{
      background: "transparent",
      color: theme.text,
      border: `1px solid ${theme.border}`,
      borderRadius: 999,
      padding: "8px 14px",
      fontWeight: 700,
      cursor: "pointer",
    }}
  >
    🖼️ Download PNG
  </button>
</div>
          </div>
        </section>
      </main>
    </div>
  );
}