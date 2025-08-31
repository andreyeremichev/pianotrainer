"use client";

import React, { useCallback, useMemo, useState } from "react";
import Link from "next/link";

/* ===========================
   Theme tokens
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
};
const INACTIVE_COLOR = "#8B94A7";

/* ===========================
   Degree colors & order
   =========================== */
const DEGREE_COLORS: Record<string, string> = {
  "1": "#4DA3FF",
  "2": "#A6E22E",
  "3": "#FF4DA6",
  "4": "#FFD166",
  "5": "#9B59B6",
  "6": "#FF6B6B",
  "7": "#FF9F1C",
  "♭2": "#2ECC71",
  "♭3": "#E67E22",
  "♭6": "#E84393",
  "♭7": "#1ABC9C",
  "♯4": "#F1C40F",
};

const DEGREE_ORDER = ["1","5","2","6","3","7","♯4","♭2","♭6","♭3","♭7","4"] as const;

const withAlpha = (hex: string, a: number) => {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
};

/* ===========================
   Music helpers
   =========================== */
const NOTE_ORDER = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"] as const;
type NoteName = `${(typeof NOTE_ORDER)[number]}${number}`;

function noteNameToMidi(n: NoteName) {
  const pc = n.slice(0, -1);
  const oct = parseInt(n.slice(-1), 10);
  const idx = NOTE_ORDER.indexOf(pc as any);
  return (oct + 1) * 12 + idx;
}
function midiToNoteName(midi: number): NoteName {
  const pc = NOTE_ORDER[midi % 12];
  const oct = Math.floor(midi / 12) - 1;
  return `${pc}${oct}` as NoteName;
}

const DEG_TO_SEMITONES: Record<string, number> = {
  "1": 0, "2": 2, "3": 4, "4": 5, "5": 7, "6": 9, "7": 11,
};

const MAJOR_KEYS = ["C","G","D","A","E","B","F#","C#","F","Bb","Eb","Ab","Db"] as const;
type MajorKey = typeof MAJOR_KEYS[number];

const TONIC4_MIDI: Record<MajorKey, number> = {
  C:  noteNameToMidi("C4"),
  G:  noteNameToMidi("G4"),
  D:  noteNameToMidi("D4"),
  A:  noteNameToMidi("A4"),
  E:  noteNameToMidi("E4"),
  B:  noteNameToMidi("B4"),
  "F#": noteNameToMidi("F#4"),
  "C#": noteNameToMidi("C#4"),
  F:  noteNameToMidi("F4"),
  Bb: noteNameToMidi("A#3"),
  Eb: noteNameToMidi("D#4"),
  Ab: noteNameToMidi("G#4"),
  Db: noteNameToMidi("C#4"),
};

/* ===========================
   Drill sets (8 drills each)
   =========================== */
type Drill = { compact: string; pretty: string };

const DRILL_SETS: Record<string, Drill[]> = {
  "1 Through 3": [
    { compact:"12121", pretty:"1 2 1 2 1" },
    { compact:"12123", pretty:"1 2 1 2 3" },
    { compact:"12321", pretty:"1 2 3 2 1" },
    { compact:"21232", pretty:"2 1 2 3 2" },
    { compact:"23212", pretty:"2 3 2 1 2" },
    { compact:"32121", pretty:"3 2 1 2 1" },
    { compact:"32123", pretty:"3 2 1 2 3" },
    { compact:"32321", pretty:"3 2 3 2 1" },
  ],
  "1 Through 5": [
    { compact:"12345", pretty:"1 2 3 4 5" },
    { compact:"54323", pretty:"5 4 3 2 3" },
    { compact:"12343", pretty:"1 2 3 4 3" },
    { compact:"34321", pretty:"3 4 3 2 1" },
    { compact:"34543", pretty:"3 4 5 4 3" },
    { compact:"54345", pretty:"5 4 3 4 5" },
    { compact:"54543", pretty:"5 4 5 4 3" },
    { compact:"54321", pretty:"5 4 3 2 1" },
  ],
  "Outlining the 1 Chord": [
    { compact:"12313", pretty:"1 2 3 1 3" },
    { compact:"32131", pretty:"3 2 1 3 1" },
    { compact:"34535", pretty:"3 4 5 3 5" },
    { compact:"54353", pretty:"5 4 3 5 3" },
    { compact:"13131", pretty:"1 3 1 3 1" },
    { compact:"35353", pretty:"3 5 3 5 3" },
    { compact:"13531", pretty:"1 3 5 3 1" },
    { compact:"53135", pretty:"5 3 1 3 5" },
  ],
  "SCALE DEGREE 7 AND TONICIZING A KEY": [
    { compact:"17171",  pretty:"1 7 1 7 1" },
    { compact:"12171",  pretty:"1 2 1 7 1" },
    { compact:"32171",  pretty:"3 2 1 7 1" },
    { compact:"13171",  pretty:"1 3 1 7 1" },
    { compact:"31271",  pretty:"3 1 2 7 1" },
    { compact:"53171",  pretty:"5 3 1 7 1" },
    { compact:"31171",  pretty:"3 1 1 7 1" },
    { compact:"1353171",pretty:"1 3 5 3 1 7 1" },
  ],
  "1 to 5 going down": [
    { compact:"12313", pretty:"1 2 3 1 3" },
    { compact:"32131", pretty:"3 2 1 3 1" },
    { compact:"34535", pretty:"3 4 5 3 5" },
    { compact:"54353", pretty:"5 4 3 5 3" },
    { compact:"13131", pretty:"1 3 1 3 1" },
    { compact:"35353", pretty:"3 5 3 5 3" },
    { compact:"13531", pretty:"1 3 5 3 1" },
    { compact:"53135", pretty:"5 3 1 3 5" },
  ],
  "Full Major Scale": [
    { compact:"1353171",  pretty:"1 3 5 3 1 7 1" },
    { compact:"12345671", pretty:"1 2 3 4 5 6 7 1" },
    { compact:"17654321", pretty:"1 7 6 5 4 3 2 1" },
    { compact:"1356531",  pretty:"1 3 5 6 5 3 1" },
    { compact:"1356765",  pretty:"1 3 5 6 7 6 5" },
    { compact:"56567671", pretty:"5 6 5 6 7 6 7 1" },
    { compact:"5671765",  pretty:"5 6 7 1 7 6 5" },
    { compact:"1567171",  pretty:"1 5 6 7 1 7 1" },
  ],
};

const DRILL_HELPERS: Record<string, string> = {
  "1 Through 3": "8 drills with only three degrees. Listen, sing back, then type and check.",
  "1 Through 5": "8 drills up to five degrees. Mixture of steps and small skips.",
  "Outlining the 1 Chord": "8 drills arpeggiating the I chord shapes. Hear the chord tones.",
  "SCALE DEGREE 7 AND TONICIZING A KEY": "8 drills anchoring the key with the leading tone (7) and tonic.",
  "1 to 5 going down": "8 drills descending shapes built from 1–5.",
  "Full Major Scale": "8 varied drills across the major scale. Ascents, descents, and tonic frames.",
};

/* ===========================
   Web Audio engine (sample-accurate)
   =========================== */
let _ctx: AudioContext | null = null;
const _buffers = new Map<string, AudioBuffer>();

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
  if (ctx.state === "suspended") {
    try { await ctx.resume(); } catch {}
  }
}

async function loadBuffer(noteName: string): Promise<AudioBuffer> {
  const key = noteName;
  if (_buffers.has(key)) return _buffers.get(key)!;
  const safe = noteName.replace("#", "%23");
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

  const gain = ctx.createGain();
  const g = Math.pow(10, gainDb / 20);
  gain.gain.setValueAtTime(0, when);
  gain.gain.linearRampToValueAtTime(g, when + 0.01);
  gain.gain.setTargetAtTime(0, when + durationSec, 0.06);

  src.connect(gain).connect(ctx.destination);
  src.start(when);
  src.stop(when + durationSec + 0.25);
}

type DrillEvent = { at: number; deg: string; noteName: string };

function buildDrillPlan(compact: string, tonicMidi: number, setName: string) {
  const ctx = getCtx();
  const start = ctx.currentTime + 0.25; // 250 ms lead-in
  const gap = 1.0; // 1000 ms
  const events: DrillEvent[] = [];
  let i = 0;
  for (const ch of compact) {
    const deg = String(ch);
    let semis = DEG_TO_SEMITONES[deg];
    if (semis === undefined) continue;
    if (setName === "SCALE DEGREE 7 AND TONICIZING A KEY" && deg === "7") semis -= 12;
    const midi = tonicMidi + semis;
    events.push({ at: start + i * gap, deg, noteName: midiToNoteName(midi) });
    i++;
  }
  return { events, lastAt: start + (i > 0 ? (i - 1) * gap : 0) };
}

async function scheduleDrill(
  compact: string,
  tonicMidi: number,
  setName: string,
  soundOn: boolean,
  setHighlighted: (s: Set<string>) => void
): Promise<void> {
  const plan = buildDrillPlan(compact, tonicMidi, setName);
  const bufs = await Promise.all(plan.events.map(e => loadBuffer(e.noteName)));

  const ctx = getCtx();
  plan.events.forEach((e, idx) => {
    if (soundOn) playBufferAt(bufs[idx], e.at, 0.9, 0);
  });

  let i = 0;
  let hideAt = 0;
  let raf = 0;
  const tick = () => {
    const now = ctx.currentTime;
    while (i < plan.events.length && now + 0.005 >= plan.events[i].at) {
      setHighlighted(new Set([plan.events[i].deg]));
      hideAt = plan.events[i].at + 0.70;
      i++;
    }
    if (hideAt && now >= hideAt) {
      setHighlighted(new Set());
      hideAt = 0;
    }
    if (now <= plan.lastAt + 0.05 || i < plan.events.length || hideAt) {
      raf = requestAnimationFrame(tick);
    } else {
      cancelAnimationFrame(raf);
    }
  };
  raf = requestAnimationFrame(tick);

  await new Promise<void>(res => {
    const wait = () => {
      if (ctx.currentTime >= plan.lastAt + 0.05) res();
      else requestAnimationFrame(wait);
    };
    wait();
  });
}

/* ===========================
   Icons
   =========================== */
function PlayIcon({ size = 64 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M8 5v14l11-7z" fill="currentColor" />
    </svg>
  );
}
function ReplayIcon({ size = 64 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path fill="currentColor" d="M12 6V3L8 7l4 4V8c2.76 0 5 2.24 5 5a5 5 0 1 1-8.66-3.54l-1.42-1.42A7 7 0 1 0 12 6z"/>
    </svg>
  );
}

/* ===========================
   Degree Circle (robust square)
   =========================== */
function DegreeCircle({
  activeSetDegrees,
  highlighted,
  centerMode,
  onPressCenter,
}: {
  activeSetDegrees: Set<string>;
  highlighted: Set<string>;
  centerMode: "play" | "replay" | "disabled";
  onPressCenter: () => void;
}) {
  const side = "min(100%, 78vw, 52dvh, 560px)";

  return (
    <div
      style={{
        background: theme.card,
        border: `1px solid ${theme.border}`,
        borderRadius: 16,
        padding: 12,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        overflow: "visible",
      }}
    >
      <div style={{ width: side, maxWidth: "100%" }}>
        <div style={{ position: "relative", width: "100%", paddingTop: "100%" }}>
          <div style={{ position: "absolute", inset: 0 }}>
            <div
              style={{
                position: "absolute",
                inset: 0,
                borderRadius: "50%",
                border: `2px solid ${theme.border}`,
              }}
            />
            {DEGREE_ORDER.map((deg, i) => {
              const angle = (i / DEGREE_ORDER.length) * Math.PI * 2 - Math.PI / 2;

              const xDot = 50 + Math.cos(angle) * 50;
              const yDot = 50 + Math.sin(angle) * 50;

              const labelRadius = 50 * 0.86;
              const xLabel = 50 + Math.cos(angle) * labelRadius;
              const yLabel = 50 + Math.sin(angle) * labelRadius;

              const isCore = ["1","2","3","4","5","6","7"].includes(deg);
              const isActive = isCore && activeSetDegrees.has(deg);
              const baseColor = isActive ? (DEGREE_COLORS[deg] ?? INACTIVE_COLOR) : INACTIVE_COLOR;

              const isHighlight = highlighted.has(deg);
              const dotColor = baseColor;
              const glow = isHighlight ? `0 0 0 6px ${withAlpha(dotColor, 0.3)}` : "none";
              const scale = isHighlight ? 1.35 : 1.0;

              return (
                <React.Fragment key={deg}>
                  <span
                    style={{
                      position: "absolute",
                      left: `${xDot}%`,
                      top: `${yDot}%`,
                      transform: `translate(-50%, -50%) scale(${scale})`,
                      width: "clamp(12px, 3vw, 18px)",
                      height: "clamp(12px, 3vw, 18px)",
                      borderRadius: "50%",
                      background: dotColor,
                      boxShadow: glow,
                      transition:
                        "transform 120ms ease, box-shadow 120ms ease, background 120ms ease",
                    }}
                  />
                  <span
                    style={{
                      position: "absolute",
                      left: `${xLabel}%`,
                      top: `${yLabel}%`,
                      transform: "translate(-50%, -50%)",
                      color: theme.text,
                      fontSize: "clamp(11px, 3vw, 15px)",
                      fontWeight: 700,
                      lineHeight: 1,
                      userSelect: "none",
                    }}
                  >
                    {deg}
                  </span>
                </React.Fragment>
              );
            })}

            <button
              onClick={onPressCenter}
              disabled={centerMode === "disabled"}
              style={{
                position: "absolute",
                left: "50%",
                top: "50%",
                transform: "translate(-50%, -50%)",
                width: "clamp(96px, 28vw, 144px)",
                height: "clamp(96px, 28vw, 144px)",
                borderRadius: "50%",
                display: "grid",
                placeItems: "center",
                border: "none",
                background: "transparent",
                color: centerMode === "play" ? theme.blue : theme.text,
                cursor: centerMode === "disabled" ? "not-allowed" : "pointer",
              }}
              title={centerMode === "play" ? "Play" : "Replay"}
              aria-label={centerMode === "play" ? "Play" : "Replay"}
            >
              {centerMode === "play" ? <PlayIcon /> : <ReplayIcon />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ===========================
   Page Component
   =========================== */
export default function DegreesPage() {
  const [selectedKey, setSelectedKey] = useState<MajorKey>("C");
  const [setName, setSetName] = useState<string>("1 Through 3");
  const [collapsed, setCollapsed] = useState(false);

  const [queue, setQueue] = useState<Drill[]>([]);
  const [idx, setIdx] = useState(0);

  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState<null | { ok: boolean; correct: string }>(null);
  const [score, setScore] = useState({ total: 0, correct: 0 });

  const [drillPlayed, setDrillPlayed] = useState(false);
  const [awaitingCheck, setAwaitingCheck] = useState(false);
  const [checkedThisDrill, setCheckedThisDrill] = useState(false);

  const [highlighted, setHighlighted] = useState<Set<string>>(new Set());
  const [ariaReplay, setAriaReplay] = useState<string>("");

  const inSession = collapsed && idx < 8;
  const sessionDone = collapsed && idx >= 8;

  const activeSetDegrees = useMemo(() => {
    const s = new Set<string>();
    (DRILL_SETS[setName] ?? []).forEach(d => {
      for (const ch of d.compact) if ("1234567".includes(ch)) s.add(ch);
    });
    return s;
  }, [setName]);

  async function playCurrent(index: number, animate = false) {
    const d = queue[index] ?? (DRILL_SETS[setName] ?? [])[index];
    if (!d) return;
    const tonicMidi = TONIC4_MIDI[selectedKey];

    setDrillPlayed(false);
    setAwaitingCheck(true);

    if (animate) setAriaReplay(`Replaying: ${d.pretty}`);

    // sample-accurate schedule (audio + dot pulses)
    await scheduleDrill(d.compact, tonicMidi, setName, true, setHighlighted);

    setDrillPlayed(true);
  }

  const onPressCenter = useCallback(async () => {
    const drills = DRILL_SETS[setName] ?? DRILL_SETS["1 Through 3"];

    // Start new run (idle or finished)
    if (!inSession || sessionDone) {
      await unlockAudioCtx();
      setQueue(drills.slice()); // keep order; change to shuffle if desired
      setIdx(0);
      setAnswer("");
      setFeedback(null);
      setScore({ total: 0, correct: 0 });
      setCheckedThisDrill(false);
      setAwaitingCheck(false);
      setDrillPlayed(false);
      setHighlighted(new Set());
      setCollapsed(true);
      await playCurrent(0);
      return;
    }

    // Next drill after CHECK
    if (checkedThisDrill) {
      const next = idx + 1;
      if (next >= 8) { setIdx(next); return; }
      setIdx(next);
      setAnswer("");
      setFeedback(null);
      setCheckedThisDrill(false);
      setHighlighted(new Set());
      await playCurrent(next);
      return;
    }

    // Replay during await-check
    if (awaitingCheck) {
      await playCurrent(idx);
    }
  }, [inSession, sessionDone, setName, idx, checkedThisDrill, awaitingCheck, selectedKey]);

  const onCheck = useCallback(async () => {
    if (!inSession || !awaitingCheck) return;
    const d = queue[idx];
    if (!d) return;

    const clean = (answer || "").replace(/[^1-7]/g, "");
    const ok = clean === d.compact;

    setFeedback({ ok, correct: d.compact });
    setScore((s) => ({ total: s.total + 1, correct: s.correct + (ok ? 1 : 0) }));
    setCheckedThisDrill(true);
    setAwaitingCheck(false);
    setAnswer("");

    // brief pause then replay with highlights
    await new Promise(r => setTimeout(r, 500));
    await playCurrent(idx, true);
  }, [inSession, awaitingCheck, queue, idx, answer, setName, selectedKey]);

  const centerMode: "play" | "replay" | "disabled" = useMemo(() => {
    if (sessionDone) return "play";
    if (!inSession) return "play";
    if (checkedThisDrill) return "play";
    if (awaitingCheck && drillPlayed) return "replay";
    if (awaitingCheck && !drillPlayed) return "disabled";
    return "play";
  }, [sessionDone, inSession, checkedThisDrill, awaitingCheck, drillPlayed]);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: theme.bg,
        color: theme.text,
        overflowX: "hidden",
      }}
    >
      <main
        style={{
          width: "100%",
          margin: "0 auto",
          padding: 12,
          boxSizing: "border-box",
          maxWidth: 480, // phones
        }}
      >
        <style>{`
          @media (min-width: 768px) { main { max-width: 620px !important; } }
          @media (min-width: 1024px){ main { max-width: 720px !important; } }
        `}</style>

        {/* Header */}
        <header style={{ display: "flex", alignItems: "baseline", gap: 12, margin: "6px 0 14px" }}>
          <h1 style={{ margin: 0, fontSize: 26 }}>Degrees Trainer</h1>
          <Link href="/" style={{ color: theme.blue, fontSize: 15 }}>Home</Link>
        </header>

        {/* Options (collapsed on start; reopen when finished) */}
        {!collapsed || sessionDone ? (
          <section
            style={{
              background: theme.card,
              border: `1px solid ${theme.border}`,
              borderRadius: 16,
              padding: 12,
              marginBottom: 12,
            }}
          >
            {/* Key picker */}
            <div style={{ marginBottom: 12 }}>
              <div style={{ color: theme.muted, fontSize: 13, marginBottom: 6 }}>Key (Major):</div>
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

            {/* Drill sets */}
            <div>
              <div style={{ color: theme.muted, fontSize: 13, marginBottom: 6 }}>Degrees to test</div>
              <div style={{ display: "grid", gap: 6, gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
                {Object.keys(DRILL_SETS).map((name) => (
                  <button
                    key={name}
                    onClick={() => setSetName(name)}
                    style={{
                      textAlign: "left",
                      background: setName === name ? "#0F1720" : "#0E1620",
                      color: theme.text,
                      border: `1px solid ${setName === name ? theme.blue : theme.border}`,
                      borderRadius: 10,
                      padding: 10,
                      cursor: "pointer",
                    }}
                  >
                    <div style={{ fontWeight: 700, marginBottom: 4 }}>{name}</div>
                    <div style={{ fontSize: 12, color: theme.muted }}>
                      {DRILL_SETS[name][0].pretty} • … ({DRILL_SETS[name].length} drills)
                    </div>
                  </button>
                ))}
              </div>
              <div style={{ marginTop: 8, color: theme.muted, fontSize: 13 }}>
                {DRILL_HELPERS[setName]}
              </div>
            </div>
          </section>
        ) : null}

        {/* Circle */}
        <DegreeCircle
          activeSetDegrees={activeSetDegrees}
          highlighted={highlighted}
          centerMode={centerMode}
          onPressCenter={onPressCenter}
        />

        {/* Answer + CHECK */}
        <section
          style={{
            marginTop: 12,
            background: theme.card,
            border: `1px solid ${theme.border}`,
            borderRadius: 16,
            padding: 12,
          }}
        >
          {!sessionDone ? (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
                <div style={{ fontSize: 13, color: theme.muted }}>
                  {inSession ? (
                    <>Drill {idx + 1} of 8 • Key: <strong>{selectedKey}</strong></>
                  ) : (
                    "Press ▶ to start"
                  )}
                </div>
                <div style={{ marginLeft: "auto", fontSize: 13, color: theme.muted }}>
                  Score:&nbsp;<strong style={{ color: theme.text }}>{score.correct}</strong> / {score.total}
                </div>
              </div>

              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value.replace(/[^1-7]/g, ""))}
                  placeholder="Type degrees…"
                  inputMode="numeric"
                  pattern="[1-7]*"
                  disabled={!inSession || !drillPlayed || checkedThisDrill}
                  style={{
                    flex: 1,
                    minWidth: 0,
                    padding: "10px 12px",
                    borderRadius: 8,
                    background: "#0E1620",
                    color: theme.text,
                    border: `1px solid ${theme.border}`,
                    outline: "none",
                  }}
                />
                <button
                  onClick={onCheck}
                  disabled={!inSession || !drillPlayed || checkedThisDrill || answer.length === 0}
                  style={{
                    background: theme.blue,
                    color: "#081019",
                    border: "none",
                    borderRadius: 8,
                    padding: "10px 16px",
                    fontWeight: 700,
                    whiteSpace: "nowrap",
                    cursor:
                      !inSession || !drillPlayed || checkedThisDrill || answer.length === 0
                        ? "not-allowed"
                        : "pointer",
                  }}
                >
                  CHECK
                </button>
              </div>

              <div style={{ minHeight: 22, marginTop: 8 }}>
                {feedback?.ok === true && <span style={{ color: theme.green }}>Correct</span>}
                {feedback?.ok === false && (
                  <span style={{ color: theme.red }}>
                    Missed — correct: <code>{feedback.correct}</code>
                  </span>
                )}
              </div>

              {/* Screen-reader helper for replay */}
              <div aria-live="polite" style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}>
                {/* set in playCurrent when animate=true */}
              </div>
            </>
          ) : (
            <>
              <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>Session complete</div>
              <div style={{ color: theme.muted, fontSize: 14, marginBottom: 10 }}>
                Total drills: 8 • Correct: {score.correct} / {score.total}
              </div>
              <div style={{ color: theme.muted, fontSize: 14, marginBottom: 10 }}>
                Choose a new Degrees Set above and press <strong>▶</strong> to start again.
              </div>
            </>
          )}
        </section>
      </main>
    </div>
  );
}
