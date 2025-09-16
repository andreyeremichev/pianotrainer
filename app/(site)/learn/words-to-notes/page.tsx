"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import * as Tone from "tone";
import {
  Renderer,
  Stave,
  StaveNote,
  Formatter,
  Voice,
  StaveConnector,
} from "vexflow";

import { useSearchParams } from "next/navigation";

/* =========================================
   Theme (gold UI)
   ========================================= */
const theme = {
  bg: "#0B0F14",
  card: "#111820",
  border: "#1E2935",
  text: "#E6EBF2",
  muted: "#8B94A7",
  blue: "#6FA8FF",
  gold: "#EBCF7A", // soft gold
  green: "#69D58C",
};

/* =========================================
   Helpers: sanitize and count
   ========================================= */
function sanitizePhraseInput(raw: string): string {
  return raw.replace(/[^A-Za-z ]+/g, "");
}
function countLetters(raw: string): number {
  return (raw.match(/[A-Za-z]/g) || []).length;
}
function trimToMaxLetters(raw: string, maxLetters: number): string {
  let letters = 0;
  let out = "";
  for (const ch of raw) {
    if (/[A-Za-z]/.test(ch)) {
      if (letters >= maxLetters) break;
      letters++;
      out += ch;
    } else if (ch === " ") {
      out += ch;
    }
  }
  return out;
}

/* =========================================
   Mapping helpers (A..Z → A2..A6+)
   ========================================= */
type KeyName = "Aminor" | "Amajor";

function noteNameToMidi(n: string): number {
  const m = /^([A-Ga-g])([#b]?)(-?\d+)$/.exec(n);
  if (!m) throw new Error(`Bad note name: ${n}`);
  const letter = m[1].toUpperCase();
  const acc = m[2];
  const oct = parseInt(m[3], 10);
  const BASE_PC: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  let pc = BASE_PC[letter];
  if (acc === "#") pc = (pc + 1) % 12;
  else if (acc === "b") pc = (pc + 11) % 12;
  return (oct + 1) * 12 + pc;
}
function noteNameToVF(note: string): { vfKey: string } {
  const m = /^([A-Ga-g])([#b]?)(-?\d+)$/.exec(note);
  if (!m) throw new Error(`Bad note: ${note}`);
  const letter = m[1].toLowerCase();
  const acc = m[2] as "#" | "b" | "";
  const oct = parseInt(m[3], 10);
  const base = acc === "#" ? `${letter}#` : acc === "b" ? `${letter}b` : letter;
  return { vfKey: `${base}/${oct}` };
}
function alphaIndex(ch: string): number {
  return ch.toUpperCase().charCodeAt(0) - 65; // A→0, Z→25
}
function letterToDegree(ch: string): 1 | 2 | 3 | 4 | 5 | 6 | 7 {
  const idx = alphaIndex(ch);
  return ((idx % 7) + 1) as 1 | 2 | 3 | 4 | 5 | 6 | 7;
}
const A_MINOR_SCALE: Array<"A" | "B" | "C" | "D" | "E" | "F" | "G"> = [
  "A","B","C","D","E","F","G",
];
const A_MAJOR_SCALE: Array<"A" | "B" | "C#" | "D" | "E" | "F#" | "G#"> = [
  "A","B","C#","D","E","F#","G#",
];
function degreeToPitchClass(deg: 1|2|3|4|5|6|7, key: KeyName): string {
  return key === "Aminor" ? A_MINOR_SCALE[deg - 1] : (A_MAJOR_SCALE[deg - 1] as string);
}
function pitchClassToOct(pc: string, baseOct: number): number {
  const ltr = pc[0];
  return ltr === "C" || ltr === "D" || ltr === "E" || ltr === "F" || ltr === "G"
    ? baseOct + 1
    : baseOct;
}
function letterToNoteName(ch: string, key: KeyName): string {
  const idx = alphaIndex(ch);
  const deg = letterToDegree(ch);
  const baseOct = 2 + Math.floor(idx / 7);
  const pc = degreeToPitchClass(deg, key);
  const oct = pitchClassToOct(pc, baseOct);
  return `${pc}${oct}`;
}
function mapPhraseToNotes(phrase: string, key: KeyName) {
  const letters = (phrase.match(/[A-Za-z]/g) || []).slice(0, LANDSCAPE_MAX);
  return letters.map((ch) => {
    const note = letterToNoteName(ch, key);
    const midi = noteNameToMidi(note);
    return { letter: ch.toUpperCase(), degree: letterToDegree(ch), note, midi };
  });
}

/* =========================================
   Limits
   ========================================= */
const PORTRAIT_MAX = 20;
const LANDSCAPE_MAX = 40;

/* =========================================
   Component
   ========================================= */
type Mapped = { note: string; clef: "treble" | "bass"; vfKey: string; midi: number };

export default function WordsToNotesPage() {
  /* Poster header */
  const TITLE_OPTIONS = [
    {
      title: "When Words Sing",
      subtitle:
        "Type any word or phrase, and watch letters climb onto the stave — each one turning into a note you can hear and see.",
    },
    {
      title: "Spell Your Song",
      subtitle:
        "Every letter becomes a musical step. Short phrases make quick tunes, long ones sketch whole lines of melody.",
    },
    {
      title: "Alphabet Orchestra",
      subtitle:
        "From A to Z, every letter joins the band. See your words draw across the grand stave and play back as music.",
    },
  ] as const;
  const [titleIdx, setTitleIdx] = useState(0);
  useEffect(() => {
    setTitleIdx(Math.floor(Math.random() * TITLE_OPTIONS.length));
  }, []);

  // --- Restore from shared link ---
  const searchParams = useSearchParams();
  const [keyName, setKeyName] = useState<KeyName>("Aminor");
  const [phrase, setPhrase] = useState("");
  const [isFrozen, setIsFrozen] = useState(false);
  const [labelsLine, setLabelsLine] = useState<string>("");

  useEffect(() => {
    if (!searchParams) return;
    const k = searchParams.get("key");
    const p = searchParams.get("phrase") || "";
    if (!p && !k) return;

    if (k === "Aminor" || k === "Amajor") setKeyName(k);

    const sanitized = sanitizePhraseInput(p);
    const trimmed = trimToMaxLetters(sanitized, LANDSCAPE_MAX);
    setPhrase(trimmed);

    const effectiveKey = k === "Aminor" || k === "Amajor" ? k : keyName;
    const mapping = mapPhraseToNotes(trimmed, effectiveKey as KeyName);
    const labels = mapping.map((x) => x.note.replace("b", "♭").replace("#", "♯"));
    setLabelsLine(labels.join(" – "));

    const mapped: Mapped[] = mapping.map((x) => {
      const { vfKey } = noteNameToVF(x.note);
      const oct = parseInt(vfKey.split("/")[1], 10);
      const clef: "treble" | "bass" = oct >= 4 ? "treble" : "bass";
      return { note: x.note, vfKey, clef, midi: x.midi };
    });
    setMappedNotes(mapped);
    setIsFrozen(true); // show full stave immediately (no audio)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  /* Orientation & counts */
  const [isLandscape, setIsLandscape] = useState(false);
  useEffect(() => {
    const update = () => setIsLandscape(window.innerWidth > window.innerHeight);
    update();
    window.addEventListener("resize", update);
    window.addEventListener("orientationchange", update);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("orientationchange", update);
    };
  }, []);
  const lettersCount = useMemo(() => countLetters(phrase), [phrase]);
  const startDisabled =
    lettersCount === 0 ||
    lettersCount > LANDSCAPE_MAX ||
    (lettersCount > PORTRAIT_MAX && !isLandscape);

  /* Share URL */
  const buildShareUrl = useCallback(() => {
    const params = new URLSearchParams();
    params.set("key", keyName);
    params.set("phrase", phrase);
    params.set("letters", String(lettersCount));
    if (lettersCount > PORTRAIT_MAX) params.set("requireLandscape", "true");
    const url = new URL(window.location.href);
    url.search = params.toString();
    return url.toString();
  }, [keyName, phrase, lettersCount]);
  const [linkCopied, setLinkCopied] = useState(false);
  const onCopyLink = useCallback(async () => {
    try {
      const url = buildShareUrl();
      await navigator.clipboard.writeText(url);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch (e) {
      console.error("Copy link failed", e);
    }
  }, [buildShareUrl]);

  /* ====== Tone.js audio (no Transport) ====== */
  const [isPlaying, setIsPlaying] = useState(false);
  const samplerRef = useRef<Tone.Sampler | null>(null);
  const timeoutsRef = useRef<number[]>([]);
  const isPlayingRef = useRef(false);
  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);
  const noteDurSec = 0.6;

  function clearAllTimers() {
    for (const id of timeoutsRef.current) clearTimeout(id);
    timeoutsRef.current = [];
  }
  async function createSamplerForNotes(noteNames: string[]) {
    if (samplerRef.current) {
      try { samplerRef.current.dispose(); } catch {}
      samplerRef.current = null;
    }
    const urls: Record<string, string> = {};
    for (const name of new Set(noteNames)) {
      urls[name] = `${name.replace("#", "%23")}.wav`;
    }
    samplerRef.current = new Tone.Sampler({
      urls,
      baseUrl: "/audio/notes/",
    }).toDestination();
    await Tone.loaded();
  }
  function triggerNow(noteName: string) {
    const s = samplerRef.current;
    if (!s) return;
    try { s.triggerAttackRelease(noteName, noteDurSec * 0.8); } catch {}
  }

  /* ====== Mapping & reveal ====== */
  const staveHostRef = useRef<HTMLDivElement | null>(null);
  const [mappedNotes, setMappedNotes] = useState<Mapped[]>([]);
  const [resizeTick, setResizeTick] = useState(0);
  const [revealCount, setRevealCount] = useState<number>(0); // how many notes to show

  useEffect(() => {
    const onResize = () => setResizeTick((t) => t + 1);
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
    };
  }, []);

  // When mappedNotes change and we are NOT playing: show all
  useEffect(() => {
    if (!isPlaying) setRevealCount(mappedNotes.length);
  }, [mappedNotes, isPlaying]);

  /* ====== Start / Stop (no Transport) ====== */
  const start = useCallback(async () => {
    if (isPlaying) return;

    try { (document.activeElement as HTMLElement | null)?.blur(); } catch {}
    setTimeout(() => {
      const vv = (window as any).visualViewport;
      const keyboardLikelyOpen = vv && (window.innerHeight - vv.height) > 120;
      const isPortrait = window.innerHeight >= window.innerWidth;
      if (keyboardLikelyOpen && isPortrait) {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    }, 50);

    setTitleIdx((i) => (i + 1) % TITLE_OPTIONS.length);

    const mapping = mapPhraseToNotes(phrase, keyName);
    const labels = mapping.map((x) => x.note.replace("b", "♭").replace("#", "♯"));
    setLabelsLine(labels.join(" – "));

    const mapped: Mapped[] = mapping.map((x) => {
      const { vfKey } = noteNameToVF(x.note);
      const oct = parseInt(vfKey.split("/")[1], 10);
      const clef: "treble" | "bass" = oct >= 4 ? "treble" : "bass";
      return { note: x.note, vfKey, clef, midi: x.midi };
    });
    setMappedNotes(mapped);
    setIsFrozen(true);

    // Prepare audio
    await Tone.start();
    await createSamplerForNotes(mapped.map((n) => n.note));

    // Start playing + revealing
    setIsPlaying(true);
    isPlayingRef.current = true;
    clearAllTimers();
    setRevealCount(0);

    mapped.forEach((n, idx) => {
      const at = Math.round(idx * noteDurSec * 1000);
      const idA = window.setTimeout(() => {
        if (!isPlayingRef.current) return;
        triggerNow(n.note);
      }, at);
      const idV = window.setTimeout(() => {
        if (!isPlayingRef.current) return;
        setRevealCount((c) => Math.max(c, idx + 1));
      }, at - 10); // reveal a hair earlier for perceived sync
      timeoutsRef.current.push(idA, idV);
    });

    const endId = window.setTimeout(() => {
      if (!isPlayingRef.current) return;
      setRevealCount(mapped.length); // ensure all visible
      stop();
    }, Math.round(mapped.length * noteDurSec * 1000) + 60);
    timeoutsRef.current.push(endId);
  }, [isPlaying, phrase, keyName, TITLE_OPTIONS.length]);

  const stop = useCallback(() => {
    clearAllTimers();
    setIsPlaying(false);
    isPlayingRef.current = false;
    // keep sampler for reuse
  }, []);

  /* ====== VexFlow render (No-Clip sizing & margins) ====== */
  useEffect(() => {
    const host = staveHostRef.current;
    if (!host) return;

    host.innerHTML = "";

    const renderer = new Renderer(host, Renderer.Backends.SVG);

    // ⬇️ Use true host rect width (no clamping)
    const rect = host.getBoundingClientRect();
    const width = Math.floor(rect.width || host.clientWidth || 320);
    const height = 260; // fixed panel height
    renderer.resize(width, height);
    const ctx = renderer.getContext();

    // Responsive inner insets to avoid kissing rounded corners
    let LEFT = 20, RIGHT = 28;
    if (width <= 390) { LEFT = 16; RIGHT = 18; }
    if (width <= 360) { LEFT = 14; RIGHT = 16; }
    if (width <= 344) { LEFT = 12; RIGHT = 14; }
    const innerWidth = width - LEFT - RIGHT;

    const trebleY = 16;
    const bassY = 120;

    const keySpec = keyName === "Amajor" ? "A" : "Am";

    const treble = new Stave(LEFT, trebleY, innerWidth);
    treble.addClef("treble").addKeySignature(keySpec);
    treble.setContext(ctx).draw();

    const bass = new Stave(LEFT, bassY, innerWidth);
    bass.addClef("bass").addKeySignature(keySpec);
    bass.setContext(ctx).draw();

    // brace + connectors
    const Type =
      (StaveConnector as any).Type ?? (StaveConnector as any).type ?? {};
    new (StaveConnector as any)(treble, bass).setType(Type.BRACE).setContext(ctx).draw();
    new (StaveConnector as any)(treble, bass).setType(Type.SINGLE_LEFT).setContext(ctx).draw();
    new (StaveConnector as any)(treble, bass).setType(Type.SINGLE_RIGHT).setContext(ctx).draw();

    if (!mappedNotes.length) return;

    // Split + take only the currently revealed notes
    const visible = mappedNotes.slice(0, Math.max(0, revealCount));

    // stem direction rule
    const TREBLE_MIDDLE = noteNameToMidi("B4");
    const BASS_MIDDLE = noteNameToMidi("D3");

    const trebleData = visible.filter((n) => n.clef === "treble");
    const bassData = visible.filter((n) => n.clef === "bass");

    const trebleNotes = trebleData.map((n) => {
      const stemDirection = n.midi < TREBLE_MIDDLE ? 1 : -1;
      return new StaveNote({
        keys: [n.vfKey],
        duration: "q",
        clef: "treble",
        stemDirection,
      });
    });

    const bassNotes = bassData.map((n) => {
      const stemDirection = n.midi < BASS_MIDDLE ? 1 : -1;
      return new StaveNote({
        keys: [n.vfKey],
        duration: "q",
        clef: "bass",
        stemDirection,
      });
    });

    if (trebleNotes.length) {
      const vT = new Voice({
        numBeats: Math.max(1, trebleNotes.length),
        beatValue: 4,
      }).setStrict(false);
      vT.addTickables(trebleNotes);
      const fT = new Formatter();
      fT.joinVoices([vT]).formatToStave([vT], treble);
      vT.draw(ctx, treble);
    }
    if (bassNotes.length) {
      const vB = new Voice({
        numBeats: Math.max(1, bassNotes.length),
        beatValue: 4,
      }).setStrict(false);
      vB.addTickables(bassNotes);
      const fB = new Formatter();
      fB.joinVoices([vB]).formatToStave([vB], bass);
      vB.draw(ctx, bass);
    }
  }, [mappedNotes, revealCount, resizeTick, keyName]);

  /* ====== Render ====== */
  return (
    <div style={{ minHeight: "100vh", background: theme.bg, color: theme.text, overflowX: "hidden" }}>
      <main
        className="vt-card"
        style={{
          width: "100%",
          margin: "0 auto",
          padding: 12,
          boxSizing: "border-box",
          maxWidth: 520,
        }}
      >
        <style>{`
          /* Width ramps for larger screens */
          @media (min-width: 768px) { main.vt-card { max-width: 680px !important; } }
          @media (min-width: 1024px){ main.vt-card { max-width: 760px !important; } }

          /* === No-Clip: Single width contract === */
          .vt-card, .vt-panel, .vt-gold, .vt-actions { box-sizing: border-box; }
          .vt-panel { width: 100% !important; max-width: 100% !important; }
          .vt-card  { padding-inline: 16px; }
          .vt-panel { padding-inline: 14px; }
          .vt-gold  { padding-inline: 14px; }
          .vt-actions { padding-inline: 14px; }

          /* Safe-area on tiny widths */
          @media (max-width: 390px) {
            .vt-card  { padding-inline: calc(16px + env(safe-area-inset-left)) calc(16px + env(safe-area-inset-right)); }
            .vt-panel { padding-inline: calc(14px + env(safe-area-inset-left)) calc(14px + env(safe-area-inset-right)); }
            .vt-gold  { padding-inline: calc(14px + env(safe-area-inset-left)) calc(14px + env(safe-area-inset-right)); }
            .vt-actions { padding-inline: calc(14px + env(safe-area-inset-left)) calc(14px + env(safe-area-inset-right)); }
          }
          @media (max-width: 360px) {
            .vt-card  { padding-inline: calc(20px + env(safe-area-inset-left)) calc(20px + env(safe-area-inset-right)); }
            .vt-panel { padding-inline: calc(18px + env(safe-area-inset-left)) calc(18px + env(safe-area-inset-right)); }
            .vt-gold  { padding-inline: calc(18px + env(safe-area-inset-left)) calc(18px + env(safe-area-inset-right)); }
            .vt-actions { padding-inline: calc(18px + env(safe-area-inset-left)) calc(18px + env(safe-area-inset-right)); }
          }

          /* Icon-only labels on small widths */
          @media (max-width: 390px) { .action-text { display: none !important; } }

          /* Flexible actions row: wrap + center */
          .vt-actions {
            display: flex; flex-wrap: wrap; justify-content: center; align-items: center;
            column-gap: 10px; row-gap: 8px;
          }

          /* Prevent min-content overflow from grid/flex children */
          .minw0 { min-width: 0 !important; }

          /* Watermark placement inside gold panel */
          .watermark {
            position: absolute;
            right: 22px;
            bottom: 6px;
            font-size: 12px;
            font-weight: 700;
            color: rgba(8,16,25,0.7);
            pointer-events: none;
            user-select: none;
          }
        `}</style>

        {/* Poster header */}
        <header style={{ textAlign: "center", margin: "6px 0 16px" }}>
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

        {/* === Unified contract: vt-card → vt-panel → vt-gold → vt-actions === */}
        <section
          className="vt-panel minw0"
          style={{
            background: theme.card,
            border: `1px solid ${theme.border}`,
            borderRadius: 16,
            paddingTop: 12,
            paddingBottom: 12,
            display: "grid",
            gap: 8,
          }}
        >
          {/* 1) Phrase input */}
          <div className="minw0" style={{ marginBottom: 2 }}>
            <style>{`.phrase-input::placeholder { color: ${theme.gold}; opacity: 1; }`}</style>
            <input
              className="phrase-input minw0"
              value={phrase}
              onChange={(e) => {
                const sanitized = sanitizePhraseInput(e.target.value);
                const trimmed = trimToMaxLetters(sanitized, LANDSCAPE_MAX);
                setPhrase(trimmed);
              }}
              placeholder="Type a short phrase (letters & spaces)"
              inputMode="text"
              style={{
                width: "100%",
                background: "#0F1821",
                color: theme.gold,
                border: `1px solid ${theme.border}`,
                borderRadius: 8,
                padding: "12px 14px",
                fontSize: 18,
                lineHeight: 1.35,
              }}
            />

            {/* counters */}
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 4 }}>
              <span style={{ fontSize: 12, color: theme.muted }}>
                Portrait: {Math.min(lettersCount, PORTRAIT_MAX)} / {PORTRAIT_MAX}
                {lettersCount > PORTRAIT_MAX
                  ? " (over)"
                  : ` — ${Math.max(0, PORTRAIT_MAX - lettersCount)} left`}
              </span>
              <span style={{ fontSize: 12, color: theme.muted }}>
                Landscape: {Math.min(lettersCount, LANDSCAPE_MAX)} / {LANDSCAPE_MAX}
                {lettersCount > LANDSCAPE_MAX
                  ? " (over)"
                  : ` — ${Math.max(0, LANDSCAPE_MAX - lettersCount)} left`}
              </span>
            </div>

            {lettersCount > PORTRAIT_MAX && !isLandscape && (
              <div
                style={{
                  background: "#fff7d1",
                  border: "1px solid #ffe066",
                  color: "#111",
                  fontSize: 13,
                  padding: "6px 10px",
                  borderRadius: 8,
                  marginTop: 6,
                }}
              >
                ⚠️ Too many letters for portrait. Rotate your device to landscape
                to continue.
              </div>
            )}
          </div>

          {/* 2) Grand stave (soft gold panel) */}
          <div
            className="vt-gold minw0"
            style={{
              position: "relative",
              background: theme.gold,
              borderRadius: 10,
              paddingTop: 10,
              paddingBottom: 8,
            }}
          >
            <div
              ref={staveHostRef}
              className="stave-host minw0"
              style={{
                width: "100%",
                minHeight: 280,
                display: "block",
              }}
            />
            {/* subtle watermark (non-interactive) */}
            <div className="watermark">PianoTrainer</div>
          </div>

          {/* 3) Labels line (gold) */}
          {labelsLine && (
            <div
              className="minw0"
              style={{
                marginTop: -2,
                color: theme.gold,
                fontSize: 13.5,
                textAlign: "center",
                wordWrap: "break-word",
              }}
            >
              {labelsLine}
            </div>
          )}

          {/* 4) Actions row (flexible, wraps & centers) */}
          <div className="vt-actions minw0" aria-label="Actions">
            {/* Play / Stop */}
            <button
              onClick={() => (isPlaying ? stop() : start())}
              disabled={startDisabled}
              style={{
                background: startDisabled ? "#1a2430" : theme.gold,
                color: startDisabled ? theme.muted : "#081019",
                border: "none",
                borderRadius: 999,
                padding: "10px 16px",
                fontWeight: 700,
                cursor: startDisabled ? "not-allowed" : "pointer",
                fontSize: 16,
                minHeight: 40,
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
              }}
              aria-label={isPlaying ? "Stop" : "Play"}
              title={isPlaying ? "Stop" : "Play"}
            >
              <span aria-hidden="true">{isPlaying ? "⏹" : "▶"}</span>
              <span className="action-text">{isPlaying ? "Stop" : "Play"}</span>
            </button>

            {/* Copy Link */}
            <button
              onClick={onCopyLink}
              style={{
                background: "transparent",
                color: theme.gold,
                border: "none",
                borderRadius: 999,
                padding: "8px 12px",
                fontWeight: 700,
                cursor: "pointer",
                minHeight: 36,
                fontSize: 14,
              }}
              title="Copy Link"
            >
              🔗 <span className="action-text">Copy Link</span>
            </button>

            {linkCopied && (
              <span
                role="status"
                aria-live="polite"
                style={{ color: theme.green, fontSize: 12, fontWeight: 600 }}
              >
                Link copied!
              </span>
            )}
          </div>

          {/* 5) Key (subtle) */}
          <div className="minw0" style={{ marginTop: 2 }}>
            <div
              style={{
                color: theme.muted,
                fontSize: 12.5,
                marginBottom: 4,
                textAlign: "center",
              }}
            >
              Key
            </div>
            <div
              style={{
                display: "flex",
                gap: 6,
                flexWrap: "wrap",
                justifyContent: "center",
                maxWidth: 360,
                margin: "0 auto",
              }}
            >
              {(["Aminor", "Amajor"] as KeyName[]).map((k) => (
                <button
                  key={k}
                  onClick={() => setKeyName(k)}
                  style={{
                    background: "#0F1821",
                    color: keyName === k ? theme.gold : theme.muted,
                    border: `1px solid ${keyName === k ? theme.gold : theme.border}`,
                    borderRadius: 999,
                    padding: "6px 10px",
                    fontWeight: 700,
                    fontSize: 13,
                  }}
                  aria-pressed={keyName === k}
                >
                  {k === "Aminor" ? "A minor" : "A major"}
                </button>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}