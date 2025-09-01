"use client";

import React, { useCallback, useMemo, useState, useEffect } from "react";
import Link from "next/link";

/* ===========================
   Theme (frozen)
   =========================== */
const theme = {
  bg: "#0B0F14",
  card: "#111820",
  border: "#1E2935",
  text: "#E6EBF2",
  muted: "#8B94A7",
  green: "#69D58C",
  red: "#FF6B6B",
  blue: "#6FA8FF",
  gold: "#F4C95D",
};
const INACTIVE_COLOR = "#8B94A7";
const withAlpha = (hex: string, a: number) => {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
};

/* ===========================
   Music helpers (notes & keys)
   =========================== */
const NOTE_ORDER = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"] as const;
type NoteName = `${(typeof NOTE_ORDER)[number]}${number}`;

function noteNameToMidi(n: NoteName) {
  const pc = n.slice(0, -1);
  const oct = parseInt(n.slice(-1), 10);
  const idx = NOTE_ORDER.indexOf(pc as any);
  return (oct + 1) * 12 + idx; // C-1 = 0
}
function midiToNoteName(midi: number): NoteName {
  const pc = NOTE_ORDER[midi % 12];
  const oct = Math.floor(midi / 12) - 1;
  return `${pc}${oct}` as NoteName;
}

const MAJOR_KEYS = ["C","G","D","A","E","B","F#","C#","F","Bb","Eb","Ab","Db"] as const;
type MajorKey = typeof MAJOR_KEYS[number];

const TONIC4_MIDI: Record<MajorKey, number> = {
  C:  noteNameToMidi("C4"),  G:  noteNameToMidi("G4"),
  D:  noteNameToMidi("D4"),  A:  noteNameToMidi("A4"),
  E:  noteNameToMidi("E4"),  B:  noteNameToMidi("B4"),
  "F#": noteNameToMidi("F#4"), "C#": noteNameToMidi("C#4"),
  F:  noteNameToMidi("F4"),  Bb: noteNameToMidi("A#3"),
  Eb: noteNameToMidi("D#4"), Ab: noteNameToMidi("G#4"),
  Db: noteNameToMidi("C#4"),
};

/* ===========================
   Intervals
   =========================== */
const INTERVALS = ["m2","M2","m3","M3","P4","TT","P5","m6","M6","m7","M7","P8"] as const;
type IntervalName = typeof INTERVALS[number];
const INTERVAL_SEMITONES: Record<IntervalName, number> = {
  m2: 1, M2: 2, m3: 3, M3: 4, P4: 5, TT: 6, P5: 7, m6: 8, M6: 9, m7: 10, M7: 11, P8: 12,
};
const BUCKETS = {
  Steps: ["m2","M2","m3","M3"] as readonly IntervalName[],
  Mid:   ["P4","TT","P5","m6"] as readonly IntervalName[],
  Wide:  ["M6","m7","M7","P8"] as readonly IntervalName[],
  All:   INTERVALS as readonly IntervalName[],
} as const;
type BucketKey = keyof typeof BUCKETS;

/* ===========================
   Web Audio (sample-accurate)
   =========================== */
let _ctx: AudioContext | null = null;
const _buffers = new Map<string, AudioBuffer>();

function getCtx(): AudioContext {
  if (!_ctx) {
    // @ts-ignore
    const AC = window.AudioContext || (window as any).webkitAudioContext;
    _ctx = new AC({ latencyHint: "interactive" });
  }
  return _ctx!;
}
async function unlockAudioCtx() {
  const ctx = getCtx();
  if (ctx.state === "suspended") { try { await ctx.resume(); } catch {} }
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
function playBufferAt(buf: AudioBuffer, when: number, durationSec = 0.9, gainDb = 0) {
  const ctx = getCtx();
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const g = ctx.createGain();
  const lin = Math.pow(10, gainDb / 20);
  g.gain.setValueAtTime(0, when);
  g.gain.linearRampToValueAtTime(lin, when + 0.01);
  g.gain.setTargetAtTime(0, when + durationSec, 0.06);
  src.connect(g).connect(ctx.destination);
  src.start(when);
  src.stop(when + durationSec + 0.25);
}

type TimedEvt = { at: number; midi: number };
function planMelodic(rootMidi: number, semitones: number, ascending: boolean): TimedEvt[] {
  const ctx = getCtx();
  const start = ctx.currentTime + 0.25;
  const gap = 1.0; // 1.0 s melodic gap (locked per spec)
  const first = rootMidi;
  const second = ascending ? rootMidi + semitones : rootMidi - semitones;
  return [{ at: start, midi: first }, { at: start + gap, midi: second }];
}
function planHarmonic(rootMidi: number, semitones: number): TimedEvt[] {
  const ctx = getCtx();
  const start = ctx.currentTime + 0.25;
  return [
    { at: start,      midi: rootMidi },
    { at: start+0.01, midi: rootMidi + semitones } // ~10 ms to avoid click
  ];
}

async function scheduleWithPulses(
  events: TimedEvt[],
  soundOn: boolean,
  pulseSemitones: { at: number; semi: number }[] | null,
  setHighlightedSemis: (s: Set<number>) => void
) {
  // Preload
  const bufs = await Promise.all(events.map(e => loadBuffer(midiToNoteName(e.midi))));
  const ctx = getCtx();

  // Audio
  events.forEach((e, i) => { if (soundOn) playBufferAt(bufs[i], e.at, 0.9, 0); });

  // Pulses (used only for teaching replay & cadence)
  if (pulseSemitones && pulseSemitones.length) {
    let i = 0;
    let clearAt = 0;
    let raf = 0;
    const tick = () => {
      const now = ctx.currentTime;
      while (i < pulseSemitones.length && now + 0.005 >= pulseSemitones[i].at) {
        const s = pulseSemitones[i].semi; // 0..12 (0 = PU)
        setHighlightedSemis(new Set([0, s])); // always PU + target
        clearAt = pulseSemitones[i].at + 0.70;
        i++;
      }
      if (clearAt && now >= clearAt) { setHighlightedSemis(new Set()); clearAt = 0; }
      if (i < pulseSemitones.length || clearAt) raf = requestAnimationFrame(tick);
      else cancelAnimationFrame(raf);
    };
    raf = requestAnimationFrame(tick);
  }

  // Wait end
  const lastAt = events[events.length - 1]?.at ?? ctx.currentTime;
  await new Promise<void>(res => {
    const wait = () => (ctx.currentTime >= lastAt + 0.05 ? res() : requestAnimationFrame(wait));
    wait();
  });
}

/* ===========================
   Semitone Bar (0..12) + ▶/↻ + persistent Cadence
   =========================== */
function SemitoneBar({
  highlightedSemis,
  onPressCenter,
  centerMode,
  secondaryCadence,
}: {
  highlightedSemis: Set<number>;
  onPressCenter: () => void;
  centerMode: "play" | "replay" | "disabled";
  secondaryCadence: React.ReactNode; // persistent cadence button
}) {
  const side = "min(100%, 82vw, 56dvh, 620px)";
  const topRow = Array.from({ length: 13 }, (_, i) => i); // 0..12
  const names = ["PU","m2","M2","m3","M3","P4","TT","P5","m6","M6","m7","M7","P8"];

  return (
    <div
      style={{
        background: theme.card,
        border: `1px solid ${theme.border}`,
        borderRadius: 16,
        padding: 12,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        overflow: "visible",
      }}
    >
      <div style={{ width: side, maxWidth: "100%" }}>
        <div style={{ textAlign: "center", color: theme.muted, fontSize: 12, marginBottom: 6 }}>
          Number of semitones
        </div>

        {/* Rail + ticks */}
        <div style={{ position: "relative", height: 52, margin: "0 4px" }}>
          <div
            style={{
              position: "absolute",
              left: 0, right: 0, top: 24,
              height: 4,
              background: withAlpha(theme.text, 0.12),
              borderRadius: 2,
            }}
          />
          {topRow.map((i) => {
            const left = `${(i / 12) * 100}%`;
            const active = highlightedSemis.has(i);
            const color = active ? theme.gold : INACTIVE_COLOR;
            return (
              <div key={i} style={{ position: "absolute", left, transform: "translateX(-50%)" }}>
                <div style={{ color: theme.text, fontSize: 12, textAlign: "center" }}>
                  {String(i).padStart(2, "0")}
                </div>
                <div
                  style={{
                    width: 3, height: 10, marginTop: 2, background: color, borderRadius: 2,
                    boxShadow: active ? `0 0 0 6px ${withAlpha(theme.gold, 0.25)}` : "none",
                    transition: "background 120ms ease, box-shadow 120ms ease",
                  }}
                />
              </div>
            );
          })}
        </div>

        {/* Bottom names */}
        <div style={{ position: "relative", height: 26, marginTop: 2 }}>
          {names.map((label, idx) => {
            const left = `${(idx / 12) * 100}%`;
            const active = highlightedSemis.has(idx);
            const color = active ? theme.gold : theme.text;
            return (
              <div
                key={label}
                style={{
                  position: "absolute",
                  left,
                  transform: "translateX(-50%)",
                  fontSize: 12,
                  color,
                  fontWeight: active ? 800 : 700,
                  transition: "color 120ms ease",
                }}
              >
                {label}
              </div>
            );
          })}
        </div>
      </div>

      {/* Controls row under the bar: ▶/↻ + Cadence (always visible) */}
      <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 10 }}>
        <button
          onClick={onPressCenter}
          disabled={centerMode === "disabled"}
          style={{
            width: 56, height: 56, borderRadius: "50%",
            border: "1px solid " + theme.border,
            display: "grid", placeItems: "center",
            background: centerMode === "play" ? theme.blue : "#0F1620",
            color: centerMode === "play" ? "#081019" : theme.text,
            cursor: centerMode === "disabled" ? "not-allowed" : "pointer",
          }}
          title={centerMode === "play" ? "Play" : "Replay"}
          aria-label={centerMode === "play" ? "Play" : "Replay"}
        >
          {centerMode === "play" ? (
            <svg width={28} height={28} viewBox="0 0 24 24"><path d="M8 5v14l11-7z" fill="currentColor" /></svg>
          ) : (
            <svg width={28} height={28} viewBox="0 0 24 24"><path fill="currentColor" d="M12 6V3L8 7l4 4V8c2.76 0 5 2.24 5 5a5 5 0 1 1-8.66-3.54l-1.42-1.42A7 7 0 1 0 12 6z"/></svg>
          )}
        </button>

        {/* Cadence helper stays visible during session */}
        {secondaryCadence}
      </div>
    </div>
  );
}

/* ===========================
   Interval Grid (answers)
   =========================== */
function IntervalGrid({
  value,
  onChange,
}: {
  value: IntervalName | null;
  onChange: (v: IntervalName) => void;
}) {
  const buttons: IntervalName[] = ["m2","M2","m3","M3","P4","TT","P5","m6","M6","m7","M7","P8"];
  return (
    <div
      role="group"
      aria-label="Choose the interval you heard"
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
        gap: 8,
      }}
    >
      {buttons.map((label) => {
        const active = value === label;
        return (
          <button
            key={label}
            onClick={() => onChange(label)}
            style={{
              padding: "10px 8px",
              borderRadius: 8,
              border: `1px solid ${active ? theme.blue : theme.border}`,
              background: active ? theme.blue : "#0F1821",
              color: active ? "#081019" : theme.text,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

/* ===========================
   Page Component (Intervals)
   =========================== */
export default function IntervalsPage() {
  /* Options */
  const [selectedKey, setSelectedKey] = useState<MajorKey>("C");
  const [bucket, setBucket] = useState<BucketKey>("Steps");
  const [direction, setDirection] = useState<"Asc" | "Desc" | "Mixed">("Mixed");
  const [playback, setPlayback] = useState<"Melodic" | "Harmonic">("Melodic");
  const [octaves, setOctaves] = useState<1 | 2 | 3>(1);
  const [soundOn] = useState(true);

  /* Session state */
  const [queue, setQueue] = useState<IntervalName[]>([]);
  const [idx, setIdx] = useState(0); // 0..7
  const [selectedAnswer, setSelectedAnswer] = useState<IntervalName | null>(null);
  const [feedback, setFeedback] = useState<null | { ok: boolean; correct: IntervalName; missed?: IntervalName; dir: "Asc"|"Desc" }>(null);
  const [score, setScore] = useState({ total: 0, correct: 0 });

  const [drillPlayed, setDrillPlayed] = useState(false);
  const [awaitingCheck, setAwaitingCheck] = useState(false);
  const [checkedThisDrill, setCheckedThisDrill] = useState(false);

  // Semitone bar highlights (PU=0 + target)
  const [highlightedSemis, setHighlightedSemis] = useState<Set<number>>(new Set());

  const inSession = idx < 8 && queue.length === 8;
  const sessionDone = queue.length === 8 && idx >= 8;

  /* iOS sticky safeguard (grid doesn't open keyboard but keep parity) */
  const [kbdOpen, setKbdOpen] = useState(false);
  useEffect(() => {
    const vv = (window as any).visualViewport;
    if (!vv) return;
    const onResize = () => {
      const t = 120;
      setKbdOpen(vv.height < window.innerHeight - t);
    };
    onResize();
    vv.addEventListener("resize", onResize);
    vv.addEventListener("scroll", onResize);
    return () => {
      vv.removeEventListener("resize", onResize);
      vv.removeEventListener("scroll", onResize);
    };
  }, []);

  /* Build a balanced 8-drill queue */
  const buildQueue = useCallback(() => {
    const pool = BUCKETS[bucket];
    const q: IntervalName[] = [];
    let last: IntervalName | null = null;
    // cover each at least once where possible
    for (const p of pool) {
      if (q.length < 8) {
        const choice: IntervalName =
  p === last && pool.length > 1
    ? (pool[(pool.indexOf(p) + 1) % pool.length] as IntervalName)
    : p;
q.push(choice);
last = choice;
      }
    }
    // fill remaining avoiding immediate repeats
    while (q.length < 8) {
      const opts = pool.filter(p => p !== last);
      const choice: IntervalName = opts[Math.floor(Math.random() * opts.length)] as IntervalName;
q.push(choice);
last = choice;
    }
    return q;
  }, [bucket]);

  /* Root selection: pick within C2–C6 window spanning 'octaves' around C4; ensure second fits */
  function pickRootForInterval(tonicMidi: number, semis: number, wantAsc: boolean): number {
    const C2 = noteNameToMidi("C2"), C6 = noteNameToMidi("C6");
    const center = noteNameToMidi("C4");
    const span = octaves * 12;              // 12..36
    let min = center - Math.floor(span/2);
    let max = center + Math.ceil(span/2) - 1;
    min = Math.max(min, C2); max = Math.min(max, C6);
    for (let tries=0; tries<48; tries++) {
      const root = Math.floor(min + Math.random()*(max-min+1));
      const second = wantAsc ? root + semis : root - semis;
      if (second >= min && second <= max) return root;
    }
    return wantAsc ? Math.min(max - semis, center) : Math.max(min + semis, center);
  }

  /* ===== Replay cache (store exact params for each drill; events rebuilt every play) ===== */
  type DrillPlan = {
    itv: IntervalName;
    semisAbs: number;
    wantAsc: boolean;
    rootMidi: number;
  };
  const plansRef = React.useRef<Record<number, DrillPlan | null>>({});

  /* Start / Next / Replay */
  const onPressCenter = useCallback(async () => {
    const drills = buildQueue();

    // Start or restart
    if (!inSession || sessionDone) {
      await unlockAudioCtx();
      setQueue(drills);
      setIdx(0);
      setSelectedAnswer(null);
      setFeedback(null);
      setScore({ total: 0, correct: 0 });
      setCheckedThisDrill(false);
      setAwaitingCheck(false);
      setDrillPlayed(false);
      setHighlightedSemis(new Set());
      plansRef.current = {}; // clear cache for new session
      await playCurrent(0, false, false);
      return;
    }

    // advance after CHECK
    if (checkedThisDrill) {
      const next = idx + 1;
      if (next >= 8) { setIdx(next); return; }
      setIdx(next);
      setSelectedAnswer(null);
      setFeedback(null);
      setCheckedThisDrill(false);
      setHighlightedSemis(new Set());
      await playCurrent(next, false, false);
      return;
    }

    // replay while awaiting CHECK (reuse cached plan)
    if (awaitingCheck) {
      await playCurrent(idx, false, true);
    }
  }, [buildQueue, inSession, sessionDone, idx, checkedThisDrill, awaitingCheck]);

  /* Play current (animateDots only after CHECK; reusePlan keeps identical notes) */
  async function playCurrent(index: number, animateDots: boolean, reusePlan = false) {
    setDrillPlayed(false);
    setAwaitingCheck(true);

    const itv = queue[index] ?? BUCKETS[bucket][0];
    const tonicMidi = TONIC4_MIDI[selectedKey];
    const semisAbs = INTERVAL_SEMITONES[itv];

    let plan: DrillPlan | null = null;

    if (reusePlan && plansRef.current[index]) {
      plan = plansRef.current[index]!;
    } else {
      const wantAsc =
        direction === "Asc" ? true :
        direction === "Desc" ? false :
        Math.random() < 0.5;

      const rootMidi = pickRootForInterval(tonicMidi, semisAbs, wantAsc);
      plan = { itv, semisAbs, wantAsc, rootMidi };
      plansRef.current[index] = plan; // cache params for exact Replay
    }

    // Build fresh events with new absolute times each play
    const events: TimedEvt[] =
      playback === "Harmonic"
        ? planHarmonic(plan.rootMidi, plan.wantAsc ? plan.semisAbs : -plan.semisAbs)
        : planMelodic(plan.rootMidi, plan.semisAbs, plan.wantAsc);

    // Pulses only for teaching replay (after CHECK): PU (0) + target semitone
    const ctx = getCtx();
    const start = events[0]?.at ?? ctx.currentTime + 0.25;
    const gap = playback === "Harmonic" ? 0.0 : 1.0;
    const pulses = animateDots
      ? [
          { at: start,       semi: 0 },
          { at: start + gap, semi: plan.semisAbs },
        ]
      : null;

    await scheduleWithPulses(events, soundOn, pulses, setHighlightedSemis);

    setDrillPlayed(true);
  }

  /* CHECK -> feedback + teaching replay with pulses */
  const onCheck = useCallback(async () => {
    if (!inSession || !awaitingCheck || selectedAnswer == null) return;
    const correct = queue[idx];
    const ok = selectedAnswer === correct;

    const dir: "Asc"|"Desc" =
      direction === "Asc" ? "Asc" :
      direction === "Desc" ? "Desc" :
      (plansRef.current[idx]?.wantAsc ? "Asc" : "Desc");

    setFeedback({ ok, correct, missed: ok ? undefined : selectedAnswer, dir });
    setScore((s) => ({ total: s.total + 1, correct: s.correct + (ok ? 1 : 0) }));
    setCheckedThisDrill(true);
    setAwaitingCheck(false);

    await new Promise((r) => setTimeout(r, 500));
    await playCurrent(idx, true, true); // teaching replay using the exact same params
  }, [inSession, awaitingCheck, selectedAnswer, queue, idx, direction]);

  /* Cadence Helper (always visible under the bar): PU, M3, P5, P8 → 0,4,7,12 */
  const onCadence = useCallback(async () => {
    await unlockAudioCtx();
    const tonicMidi = TONIC4_MIDI[selectedKey];

    const ctx = getCtx();
    const start = ctx.currentTime + 0.25;
    const gap = 0.9;

    const events: TimedEvt[] = [
      { at: start,        midi: tonicMidi        },
      { at: start+gap,    midi: tonicMidi + 4    },
      { at: start+gap*2,  midi: tonicMidi + 7    },
      { at: start+gap*3,  midi: tonicMidi + 12   },
    ];
    const pulses = [
      { at: start,        semi: 0  },
      { at: start+gap,    semi: 4  },
      { at: start+gap*2,  semi: 7  },
      { at: start+gap*3,  semi: 12 },
    ];

    const bufs = await Promise.all(events.map(e => loadBuffer(midiToNoteName(e.midi))));
    events.forEach((e,i) => playBufferAt(bufs[i], e.at, 0.9, 0));
    await scheduleWithPulses([], false, pulses, setHighlightedSemis);
  }, [selectedKey]);

  /* Center button mode (single source of truth) */
  const centerMode: "play" | "replay" | "disabled" = useMemo(() => {
    if (sessionDone) return "play";
    if (!inSession) return "play";
    if (checkedThisDrill) return "play";
    if (awaitingCheck && drillPlayed) return "replay";
    if (awaitingCheck && !drillPlayed) return "disabled";
    return "play";
  }, [sessionDone, inSession, checkedThisDrill, awaitingCheck, drillPlayed]);

  /* Dynamic summary */
  const summary = useMemo(() => {
    const bucketLabel =
      bucket === "Steps" ? "Steps (m2, M2, m3, M3)" :
      bucket === "Mid"   ? "Mid (P4, TT, P5, m6)"  :
      bucket === "Wide"  ? "Wide (M6, m7, M7, P8)" :
      "All (m2–P8)";
    const range = `${octaves} octave${octaves>1?"s":""}`;
    return {
      line1: `Root: ${selectedKey} (PU)`,
      line2: `Intervals: ${bucketLabel}`,
      line3: `Range: ${range}`,
      line4: `Direction: ${direction} • Playback: ${playback}`,
      helper: `Press ▶ to start. Need help? Press 🎶 Play Cadence (PU-M3–P5–P8).`,
    };
  }, [selectedKey, bucket, octaves, direction, playback]);

  return (
    <div style={{ minHeight:"100vh", background:theme.bg, color:theme.text, overflowX:"hidden" }}>
      <main style={{ width:"100%", margin:"0 auto", padding:12, boxSizing:"border-box", maxWidth:480 }}>
        <style>{`
          @media (min-width:768px){ main{ max-width:620px !important; } }
          @media (min-width:1024px){ main{ max-width:720px !important; } }
        `}</style>

        {/* Header */}
        <header style={{ display:"flex", alignItems:"baseline", gap:12, margin:"6px 0 14px" }}>
          <h1 style={{ margin:0, fontSize:26 }}>Intervals Trainer</h1>
          <Link href="/" style={{ color: theme.blue, fontSize: 15 }}>Home</Link>
        </header>

        {/* Options (show before start or after finish) */}
        {!inSession || sessionDone ? (
          <section
            style={{
              background: theme.card,
              border:`1px solid ${theme.border}`,
              borderRadius:16,
              padding:12,
              marginBottom:12,
            }}
          >
            {/* Root PU */}
            <div style={{ marginBottom: 12 }}>
              <div style={{ color: theme.muted, fontSize: 13, marginBottom: 6 }}>Root (PU): choose one</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {MAJOR_KEYS.map((k) => (
                  <button
                    key={k}
                    onClick={() => setSelectedKey(k)}
                    style={{
                      background: selectedKey === k ? theme.blue : "#0F1821",
                      color: selectedKey === k ? "#081019" : theme.text,
                      border: `1px solid ${theme.border}`,
                      borderRadius: 999,
                      padding: "6px 10px",
                      fontWeight: 700,
                    }}
                  >
                    {k}
                  </button>
                ))}
              </div>
            </div>

            {/* Buckets */}
            <div style={{ marginBottom: 12 }}>
              <div style={{ color: theme.muted, fontSize: 13, marginBottom: 6 }}>Intervals set</div>
              <div style={{ display: "grid", gap: 6, gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
                {(["Steps","Mid","Wide","All"] as BucketKey[]).map((name) => (
                  <button
                    key={name}
                    onClick={() => setBucket(name)}
                    style={{
                      textAlign:"left",
                      background: bucket===name?"#0F1720":"#0E1620",
                      color: theme.text,
                      border: `1px solid ${bucket===name?theme.blue:theme.border}`,
                      borderRadius:10,
                      padding:10,
                      cursor:"pointer",
                    }}
                  >
                    <div style={{ fontWeight:700, marginBottom:4 }}>{name}</div>
                    <div style={{ fontSize:12, color:theme.muted }}>
                      {name==="Steps" && "m2–M3"}
                      {name==="Mid"   && "P4–m6"}
                      {name==="Wide"  && "M6–P8"}
                      {name==="All"   && "m2–P8"}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Direction / Playback / Octaves + Summary */}
            <div style={{ display:"grid", gap:10, gridTemplateColumns:"1fr" }}>
              <div>
                <div style={{ color: theme.muted, fontSize: 13, marginBottom: 6 }}>Direction</div>
                <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                  {(["Asc","Desc","Mixed"] as const).map((d) => (
                    <button
                      key={d}
                      onClick={() => setDirection(d)}
                      style={{
                        background: direction===d? theme.blue:"#0F1821",
                        color: direction===d?"#081019":theme.text,
                        border: `1px solid ${theme.border}`,
                        borderRadius:999,
                        padding:"6px 10px",
                        fontWeight:700,
                      }}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div style={{ color: theme.muted, fontSize: 13, marginBottom: 6 }}>Playback</div>
                <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                  {(["Melodic","Harmonic"] as const).map((p) => (
                    <button
                      key={p}
                      onClick={() => setPlayback(p)}
                      style={{
                        background: playback===p? theme.blue:"#0F1821",
                        color: playback===p?"#081019":theme.text,
                        border: `1px solid ${theme.border}`,
                        borderRadius:999,
                        padding:"6px 10px",
                        fontWeight:700,
                      }}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div style={{ color: theme.muted, fontSize: 13, marginBottom: 6 }}>Octaves (C2–C6)</div>
                <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                  {([1,2,3] as const).map((n) => (
                    <button
                      key={n}
                      onClick={() => setOctaves(n)}
                      style={{
                        background: octaves===n? theme.blue:"#0F1821",
                        color: octaves===n?"#081019":theme.text,
                        border: `1px solid ${theme.border}`,
                        borderRadius:999,
                        padding:"6px 10px",
                        fontWeight:700,
                      }}
                    >
                      {n} octave{n>1?"s":""}
                    </button>
                  ))}
                </div>
              </div>

              {/* Dynamic summary */}
              <div style={{ background:"#0F1821", border:`1px solid ${theme.border}`, borderRadius:8, padding:10 }}>
                <div style={{ fontSize:13, color:theme.text }}>{summary.line1}</div>
                <div style={{ fontSize:13, color:theme.text }}>{summary.line2}</div>
                <div style={{ fontSize:13, color:theme.text }}>{summary.line3}</div>
                <div style={{ fontSize:13, color:theme.text }}>{summary.line4}</div>
                <div style={{ fontSize:12, color:theme.muted, marginTop:6 }}>
                  {summary.helper}
                </div>
              </div>
            </div>
          </section>
        ) : null}

        {/* Semitone Bar (+ persistent cadence helper on the right) */}
        <SemitoneBar
          highlightedSemis={highlightedSemis}
          onPressCenter={onPressCenter}
          centerMode={centerMode}
          secondaryCadence={
            <button
              onClick={() => onCadence()}
              style={{
                background:"transparent", color:theme.text,
                border:`1px solid ${theme.border}`, borderRadius:999,
                padding:"8px 12px", cursor:"pointer", fontSize:14,
              }}
              title="Play 1–3–5–1 (PU, M3, P5, P8)"
            >
              🎶 Play Cadence
            </button>
          }
        />

        {/* Answer + CHECK */}
        <section
          style={{
            marginTop: 12,
            background: theme.card,
            border: `1px solid ${theme.border}`,
            borderRadius: 16,
            padding: 12,
            position: kbdOpen ? ("sticky" as const) : ("static" as const),
            bottom: kbdOpen ? "calc(env(safe-area-inset-bottom, 0px))" : "auto",
            zIndex: kbdOpen ? 20 : "auto",
          }}
        >
          {!sessionDone ? (
            <>
              <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap", marginBottom:8 }}>
                <div style={{ fontSize:13, color:theme.muted }}>
                  {inSession ? <>Drill {idx+1} of 8 • Key (PU): <strong>{selectedKey}</strong></> : "Press ▶ to start"}
                </div>
                <div style={{ marginLeft:"auto", fontSize:13, color:theme.muted }}>
                  Score:&nbsp;<strong style={{ color: theme.text }}>{score.correct}</strong> / {score.total}
                </div>
              </div>

              <IntervalGrid value={selectedAnswer} onChange={setSelectedAnswer} />

              <div style={{ display:"flex", justifyContent:"flex-end", marginTop:10 }}>
                <button
                  onClick={onCheck}
                  disabled={!inSession || !drillPlayed || checkedThisDrill || selectedAnswer == null}
                  style={{
                    background: theme.blue,
                    color:"#081019",
                    border:"none",
                    borderRadius: 8,
                    padding:"10px 16px",
                    fontWeight: 700,
                    whiteSpace:"nowrap",
                    cursor: (!inSession || !drillPlayed || checkedThisDrill || selectedAnswer == null) ? "not-allowed" : "pointer",
                  }}
                >
                  CHECK
                </button>
              </div>

              {/* Feedback with direction badge */}
              <div style={{ minHeight: 22, marginTop: 8 }}>
                {feedback?.ok === true && (
                  <span style={{ color: theme.green }}>
                    Correct: <code>{feedback.correct}</code> {feedback.dir === "Asc" ? "↑" : "↓"}
                  </span>
                )}
                {feedback?.ok === false && (
                  <>
                    <span style={{ color: theme.muted, marginRight: 8 }}>
                      Missed (<code>{feedback.missed}</code> {feedback.dir === "Asc" ? "↑" : "↓"})
                    </span>
                    <span style={{ color: theme.green }}>
                      Correct: <code>{feedback.correct}</code> {feedback.dir === "Asc" ? "↑" : "↓"}
                    </span>
                  </>
                )}
              </div>
            </>
          ) : (
            <>
              <div style={{ fontSize:16, fontWeight:700, marginBottom:6 }}>Session complete</div>
              <div style={{ color: theme.muted, fontSize:14, marginBottom:10 }}>
                Total drills: 8 • Correct: {score.correct} / {score.total}
              </div>
              <div style={{ color: theme.muted, fontSize:14, marginBottom:10 }}>
                Choose a new Intervals set above and press <strong>▶</strong> to start again.
              </div>
            </>
          )}
        </section>
      </main>
    </div>
  );
}

