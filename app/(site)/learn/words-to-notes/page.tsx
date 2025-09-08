"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Renderer,
  Stave,
  StaveNote,
  Formatter,
  Voice,
  Accidental,
  StaveConnector,
} from "vexflow";

/* =========================================
   Theme (inline, matches your existing style)
   ========================================= */
const theme = {
  bg: "#0B0F14",
  card: "#111820",
  border: "#1E2935",
  text: "#E6EBF2",
  muted: "#8B94A7",
  blue: "#6FA8FF",
  gold: "#EBCF7A",
  green: "#69D58C",
};

/* =========================================
   Helpers: sanitize and count
   ========================================= */
// Keep letters & spaces; ignore other characters
function sanitizePhraseInput(raw: string): string {
  return raw.replace(/[^A-Za-z ]+/g, "");
}
// Count letters only (A–Z), ignoring spaces
function countLetters(raw: string): number {
  return (raw.match(/[A-Za-z]/g) || []).length;
}
// Trim phrase to at most maxLetters letters (keep spaces)
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
   Mapping helpers (letters → degrees → note names → MIDI)
   ========================================= */
type KeyName = "Aminor" | "BbMajor";

// Letter (A–Z) -> degree 1..7 (mod 7). Spaces are ignored upstream.
function letterToDegree(ch: string): 1 | 2 | 3 | 4 | 5 | 6 | 7 {
  const code = ch.toUpperCase().charCodeAt(0); // 'A'..'Z'
  const idx = ((code - 65) % 7 + 7) % 7; // 0..6
  return (idx + 1) as 1 | 2 | 3 | 4 | 5 | 6 | 7;
}

// Option A octave plan (one pitch per degree) for A minor and B♭ major
// A minor natural: A–B–C–D–E–F–G
const AMINOR_DEG_TO_NOTE: Record<1 | 2 | 3 | 4 | 5 | 6 | 7, string> = {
  1: "A3",
  2: "B3",
  3: "C4",
  4: "D4",
  5: "E4",
  6: "F4",
  7: "G4",
};
// B♭ major: B♭–C–D–E♭–F–G–A
const BBMAJ_DEG_TO_NOTE: Record<1 | 2 | 3 | 4 | 5 | 6 | 7, string> = {
  1: "Bb3",
  2: "C4",
  3: "D4",
  4: "Eb4",
  5: "F4",
  6: "G4",
  7: "A4",
};

function degreeToNoteName(deg: 1 | 2 | 3 | 4 | 5 | 6 | 7, key: KeyName): string {
  return key === "Aminor" ? AMINOR_DEG_TO_NOTE[deg] : BBMAJ_DEG_TO_NOTE[deg];
}

// Note name (C, C#, Db...) + octave → MIDI (C-1 = 0)
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

// Convert "Bb3" / "C#4" / "A3" → { vfKey: "bb/3", acc: "b" } (or "c#/4","#" ; "a/3", undefined)
function noteNameToVF(note: string): { vfKey: string; acc?: "#" | "b" } {
  const m = /^([A-Ga-g])([#b]?)(-?\d+)$/.exec(note);
  if (!m) throw new Error(`Bad note: ${note}`);
  const letter = m[1].toLowerCase(); // a..g
  const acc = m[2] as "#" | "b" | "";
  const oct = parseInt(m[3], 10);
  const base = acc === "#" ? `${letter}#` : acc === "b" ? `${letter}b` : letter;
  return { vfKey: `${base}/${oct}`, acc: acc || undefined };
}

// Map the phrase (letters only) to a sequence: { letter, degree, note, midi }
function mapPhraseToNotes(phrase: string, key: KeyName) {
  const letters = (phrase.match(/[A-Za-z]/g) || []).slice(0, LANDSCAPE_MAX); // letters only
  return letters.map((ch) => {
    const deg = letterToDegree(ch);
    const note = degreeToNoteName(deg, key);
    const midi = noteNameToMidi(note);
    return { letter: ch.toUpperCase(), degree: deg, note, midi };
  });
}

/* =========================================
   Limits
   ========================================= */
const PORTRAIT_MAX = 20;
const LANDSCAPE_MAX = 40;

/* =========================================
   Page Component
   ========================================= */
type Mapped = { note: string; clef: "treble" | "bass"; vfKey: string; acc?: "#" | "b" };

export default function WordsToNotesPage() {
  /* ---------- Rotating poster title/subtitle ---------- */
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

  /* ---------- Key & phrase ---------- */
  const [keyName, setKeyName] = useState<KeyName>("Aminor");
  const [phrase, setPhrase] = useState("");

  /* ---------- Orientation (portrait/landscape) ---------- */
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

  /* ---------- Derived counts & validation ---------- */
  const lettersCount = useMemo(() => countLetters(phrase), [phrase]);

  const startDisabled =
    lettersCount === 0 ||
    lettersCount > LANDSCAPE_MAX ||
    (lettersCount > PORTRAIT_MAX && !isLandscape);

  /* ---------- Share: Copy Link confirmation ---------- */
  const [linkCopied, setLinkCopied] = useState(false);

  /* ---------- Frozen state & labels ---------- */
  const [isFrozen, setIsFrozen] = useState(false);
  const [labelsLine, setLabelsLine] = useState<string>("");

  /* ---------- VexFlow host & mapped notes ---------- */
  const staveHostRef = useRef<HTMLDivElement | null>(null);
  const [mappedNotes, setMappedNotes] = useState<Mapped[]>([]);
  const [resizeTick, setResizeTick] = useState(0);
  useEffect(() => {
    const onResize = () => setResizeTick((t) => t + 1);
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
    };
  }, []);

  /* ---------- Build share URL ---------- */
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

  /* ---------- Start/Stop ---------- */
  const start = useCallback(async () => {
   // collapse the keyboard if present
try { (document.activeElement as HTMLElement | null)?.blur(); } catch {}

// Only fix viewport when the keyboard has actually shrunk it (portrait)
// This prevents the jump in landscape.
setTimeout(() => {
  const vv = (window as any).visualViewport;
  const keyboardLikelyOpen = vv && (window.innerHeight - vv.height) > 120; // ~keyboard height
  const isPortrait = window.innerHeight >= window.innerWidth;
  if (keyboardLikelyOpen && isPortrait) {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
}, 50);

    // rotate poster title each run
    setTitleIdx((i) => (i + 1) % TITLE_OPTIONS.length);

    // 1) Compute mapping (letters only, up to allowed cap)
    const mapping = mapPhraseToNotes(phrase, keyName);

    // 2) Console output for verification
    console.table(mapping); // columns: letter, degree, note, midi

    // 3) Labels line (note names joined with en dashes)
    const labels = mapping.map((x) =>
      x.note.replace("b", "♭").replace("#", "♯")
    );
    setLabelsLine(labels.join(" – "));

    // 3.5) Build mapped notes for VexFlow: split treble/bass by octave
    const mapped: Mapped[] = mapping.map((x) => {
      const { vfKey, acc } = noteNameToVF(x.note);
      // <= B3 → bass, >= C4 → treble
      const oct = parseInt(vfKey.split("/")[1], 10);
      const clef: "treble" | "bass" = oct >= 4 ? "treble" : "bass";
      return { note: x.note, vfKey, acc, clef };
    });
    setMappedNotes(mapped);

    // 4) Freeze for scaffold
    setIsFrozen(true);
  }, [phrase, keyName, TITLE_OPTIONS.length]);

  const stop = useCallback(() => {
    // (no audio yet)
  }, []);

  /* ---------- VexFlow render ---------- */
  useEffect(() => {
  const host = staveHostRef.current;
  if (!host) return;

  // Clear previous render
  host.innerHTML = "";

  // Create renderer (fit to container width; safe minimum)
  const renderer = new Renderer(host, Renderer.Backends.SVG);
  const width = Math.max(320, host.clientWidth || 320);
  const height = 260;
  renderer.resize(width, height);
  const ctx = renderer.getContext();

  // Layout
  const LEFT = 20;
  const RIGHT_PAD = 28;                 // extra breathing room at the right
  const innerWidth = width - LEFT - RIGHT_PAD;
  const trebleY = 20;
  const bassY = 130;

  // Staves (always draw them so the grand stave is visible before Start)
  const treble = new Stave(LEFT, trebleY, innerWidth);
  treble.addClef("treble");
  treble.setContext(ctx).draw();

  const bass = new Stave(LEFT, bassY, innerWidth);
  bass.addClef("bass");
  bass.setContext(ctx).draw();

  // Brace + connectors (works for v3/v4 enum names)
  const Type = (StaveConnector as any).Type ?? (StaveConnector as any).type ?? {};
  new (StaveConnector as any)(treble, bass)
    .setType(Type.BRACE)
    .setContext(ctx)
    .draw();
  new (StaveConnector as any)(treble, bass)
    .setType(Type.SINGLE_LEFT)
    .setContext(ctx)
    .draw();
  new (StaveConnector as any)(treble, bass)
    .setType(Type.SINGLE_RIGHT)
    .setContext(ctx)
    .draw();

  // If there are no notes yet, stop here (empty grand stave is visible)
  if (!mappedNotes.length) return;

  // Prepare notes per clef
  const trebleData = mappedNotes.filter((n) => n.clef === "treble");
  const bassData   = mappedNotes.filter((n) => n.clef === "bass");

  const trebleNotes = trebleData.map((n) => {
    const sn = new StaveNote({ keys: [n.vfKey], duration: "q", clef: "treble" });
    if (n.acc) sn.addModifier(new Accidental(n.acc), 0);
    return sn;
  });
  const bassNotes = bassData.map((n) => {
    const sn = new StaveNote({ keys: [n.vfKey], duration: "q", clef: "bass" });
    if (n.acc) sn.addModifier(new Accidental(n.acc), 0);
    return sn;
  });

  if (trebleNotes.length) {
    const vT = new Voice({ numBeats: Math.max(1, trebleNotes.length), beatValue: 4 }).setStrict(false);
    vT.addTickables(trebleNotes);
    const fT = new Formatter();
    fT.joinVoices([vT]).formatToStave([vT], treble);
    vT.draw(ctx, treble);
  }

  if (bassNotes.length) {
    const vB = new Voice({ numBeats: Math.max(1, bassNotes.length), beatValue: 4 }).setStrict(false);
    vB.addTickables(bassNotes);
    const fB = new Formatter();
    fB.joinVoices([vB]).formatToStave([vB], bass);
    vB.draw(ctx, bass);
  }
}, [mappedNotes, resizeTick]);      // ← include resizeTick

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
          maxWidth: 520,
        }}
      >
        <style>{`
          @media (min-width: 768px) { main { max-width: 680px !important; } }
          @media (min-width: 1024px){ main { max-width: 760px !important; } }
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
{/* --- Words → Notes: content-first unified section (tight) --- */}
<section
  style={{
    background: theme.card,
    border: `1px solid ${theme.border}`,
    borderRadius: 16,
    padding: 12,
    display: "grid",
    gap: 2, // tighter global rhythm
  }}
>
  {/* 1) Phrase input (gold) */}
  <div style={{ marginBottom: 4 }}>
    <style>{`
      .phrase-input::placeholder { color: ${theme.gold}; opacity: 1; }
      @media (max-width: 420px) { .action-text { display: none; } }
    `}</style>

    <input
      className="phrase-input"
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
        color: theme.gold,         // gold typed text
        border: `1px solid ${theme.border}`,
        borderRadius: 8,
        padding: "12px 14px",      // slightly tighter than before
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

    {/* rotate warning (blocks Play in portrait) */}
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
        ⚠️ Too many letters for portrait. Rotate your device to landscape to continue.
      </div>
    )}
  </div>

  {/* 2) Grand Stave (soft gold panel) */}
  <div
    style={{
      background: theme.gold,    // high-contrast panel for black notation
      borderRadius: 10,
      padding: 10,
    }}
  >
    <div
      ref={staveHostRef}
      className="stave-host"
      style={{
        width: "100%",
        minHeight: 280,
        display: "block",
      }}
    />
  </div>

  {/* 3) Labels line (gold) */}
  {labelsLine && (
    <div
      style={{
        marginTop: -2,
        color: theme.gold,
        fontSize: 13.5,          // slightly smaller so long lines wrap better
        textAlign: "center",
        wordWrap: "break-word",
      }}
    >
      {labelsLine}
    </div>
  )}

  {/* 4) Actions row: two columns */}
  <div
    style={{
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 8,
      alignItems: "center",
    }}
  >
    {/* Left: Play / Stop (gold, strong) */}
    <div style={{ display: "flex", justifyContent: "flex-start" }}>
      <button
        onClick={start}
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
        aria-label="Play"
        title="Play"
      >
        <span aria-hidden="true">▶</span>
        <span className="action-text">Play</span>
      </button>
    </div>

    {/* Right: Copy · Download (gold text, no border) */}
    <div
      style={{
        display: "flex",
        justifyContent: "flex-end",
        gap: 12,
        alignItems: "center",
      }}
    >
      <button
        onClick={onCopyLink}
        style={{
          background: "transparent",
          color: theme.gold,
          border: "none",
          borderRadius: 999,
          padding: "6px 10px",
          fontWeight: 700,
          cursor: "pointer",
          minHeight: 32,
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

      <button
        onClick={() => { /* TODO: PNG export */ }}
        style={{
          background: "transparent",
          color: theme.gold,
          border: "none",
          borderRadius: 999,
          padding: "6px 10px",
          fontWeight: 700,
          cursor: "pointer",
          minHeight: 32,
          fontSize: 14,
        }}
        title="Download PNG"
      >
        🖼️ <span className="action-text">Download PNG</span>
      </button>
    </div>
  </div>

  {/* 5) Key selection (subtle) */}
  <div style={{ marginTop: 2 }}>
    <div
      style={{ color: theme.muted, fontSize: 12.5, marginBottom: 4, textAlign: "center" }}
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
      {(["Aminor", "BbMajor"] as KeyName[]).map((k) => (
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
          {k === "Aminor" ? "A minor" : "B♭ major"}
        </button>
      ))}
    </div>
  </div>
</section>
              </main>
    </div>
  );
}