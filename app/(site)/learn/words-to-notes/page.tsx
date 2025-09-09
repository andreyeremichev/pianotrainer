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
   Mapping helpers (A..Z → A2..A6+)
   ========================================= */
type KeyName = "Aminor" | "Amajor";

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

// Convert "C#6" → { vfKey: "c#/6" }
function noteNameToVF(note: string): { vfKey: string } {
  const m = /^([A-Ga-g])([#b]?)(-?\d+)$/.exec(note);
  if (!m) throw new Error(`Bad note: ${note}`);
  const letter = m[1].toLowerCase();
  const acc = m[2] as "#" | "b" | "";
  const oct = parseInt(m[3], 10);
  const base = acc === "#" ? `${letter}#` : acc === "b" ? `${letter}b` : letter;
  return { vfKey: `${base}/${oct}` };
}

// A..Z → 0..25
function alphaIndex(ch: string): number {
  return ch.toUpperCase().charCodeAt(0) - 65; // A→0, Z→25
}

// Letter → degree 1..7 (mod 7)
function letterToDegree(ch: string): 1 | 2 | 3 | 4 | 5 | 6 | 7 {
  const idx = alphaIndex(ch);
  return ((idx % 7) + 1) as 1 | 2 | 3 | 4 | 5 | 6 | 7;
}

// A minor / A major scale (pitch classes)
const A_MINOR_SCALE: Array<"A" | "B" | "C" | "D" | "E" | "F" | "G"> = [
  "A",
  "B",
  "C",
  "D",
  "E",
  "F",
  "G",
];
const A_MAJOR_SCALE: Array<"A" | "B" | "C#" | "D" | "E" | "F#" | "G#"> = [
  "A",
  "B",
  "C#",
  "D",
  "E",
  "F#",
  "G#",
];

function degreeToPitchClass(deg: 1 | 2 | 3 | 4 | 5 | 6 | 7, key: KeyName): string {
  return key === "Aminor" ? A_MINOR_SCALE[deg - 1] : (A_MAJOR_SCALE[deg - 1] as string);
}

// C-boundary: C–G live in the *next* octave number
function pitchClassToOct(pc: string, baseOct: number): number {
  const ltr = pc[0]; // 'A'..'G'
  return ltr === "C" || ltr === "D" || ltr === "E" || ltr === "F" || ltr === "G"
    ? baseOct + 1
    : baseOct;
}

// Letter → scientific note name (e.g., "C#6") using A2..A6+ ladder
function letterToNoteName(ch: string, key: KeyName): string {
  const idx = alphaIndex(ch); // 0..25
  const deg = letterToDegree(ch);
  const baseOct = 2 + Math.floor(idx / 7); // A..G→2, H..N→3, O..U→4, V..Z→5
  const pc = degreeToPitchClass(deg, key);
  const oct = pitchClassToOct(pc, baseOct);
  return `${pc}${oct}`;
}

// Map phrase to note/midi list (letters-only, up to LANDSCAPE_MAX)
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

  // --- Restore from shared link (key + phrase) ---
const searchParams = useSearchParams();

useEffect(() => {
  if (!searchParams) return;

  // read params
  const k = searchParams.get("key");         // "Aminor" | "Amajor"
  const p = searchParams.get("phrase") || ""; // full phrase with spaces

  // if nothing provided, do nothing
  if (!p && !k) return;

  // set key if valid
  if (k === "Aminor" || k === "Amajor") {
    setKeyName(k);
  }

  // sanitize & trim phrase to landscape cap (we still enforce portrait cap at runtime)
  const sanitized = sanitizePhraseInput(p);
  const trimmed   = trimToMaxLetters(sanitized, LANDSCAPE_MAX);
  setPhrase(trimmed);

  // Rebuild mapping FROZEN (no audio), using the *param key* if present, else current keyName
  const effectiveKey = (k === "Aminor" || k === "Amajor") ? k : keyName;
  const mapping = mapPhraseToNotes(trimmed, effectiveKey);
  const labels = mapping.map(x => x.note.replace("b","♭").replace("#","♯"));
  setLabelsLine(labels.join(" – "));

  // Build mapped notes for VexFlow
  const mapped: Mapped[] = mapping.map((x) => {
    const { vfKey } = noteNameToVF(x.note);
    const oct = parseInt(vfKey.split("/")[1], 10);
    const clef: "treble" | "bass" = oct >= 4 ? "treble" : "bass";
    return { note: x.note, vfKey, clef, midi: x.midi };
  });
  setMappedNotes(mapped);
  setIsFrozen(true); // show stave+labels immediately (no audio)
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [searchParams]);

  /* State */
  const [keyName, setKeyName] = useState<KeyName>("Aminor");
  const [phrase, setPhrase] = useState("");
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

  const [linkCopied, setLinkCopied] = useState(false);
  const [isFrozen, setIsFrozen] = useState(false);
  const [labelsLine, setLabelsLine] = useState<string>("");

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
      try {
        samplerRef.current.dispose();
      } catch {}
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
    try {
      s.triggerAttackRelease(noteName, noteDurSec * 0.8);
    } catch {}
  }

  /* ====== Download PNG (embed fonts, nest live svg) ====== */
  function arrayBufferToBase64(buf: ArrayBuffer) {
    let binary = "";
    const bytes = new Uint8Array(buf);
    for (let i = 0; i < bytes.byteLength; i++)
      binary += String.fromCharCode(bytes[i]);
    return btoa(binary);
  }
  async function fetchFontDataUrlOTF(path: string) {
    const res = await fetch(path, { cache: "no-cache" });
    if (!res.ok) throw new Error(`Failed to load ${path}: ${res.status}`);
    const buf = await res.arrayBuffer();
    const b64 = arrayBufferToBase64(buf);
    return `url('data:font/opentype;base64,${b64}') format('opentype')`;
  }
  async function buildEmbeddedFontStyle() {
    let bravura = "",
      bravuraText = "";
    try {
      bravura = await fetchFontDataUrlOTF("/fonts/Bravura.otf");
      bravuraText = await fetchFontDataUrlOTF("/fonts/BravuraText.otf");
    } catch (e) {
      console.warn("Font embedding failed; PNG may show boxes:", e);
    }
    return `
      @font-face { font-family: 'Bravura';     src: ${bravura || "local('Bravura')"};     font-weight: normal; font-style: normal; font-display: swap; }
      @font-face { font-family: 'BravuraText'; src: ${bravuraText || "local('BravuraText')"}; font-weight: normal; font-style: normal; font-display: swap; }
      svg, svg * { font-family: Bravura, BravuraText, serif !important; }
    `.trim();
  }

  const onDownloadPng = useCallback(async () => {
    try {
      const host = staveHostRef.current;
      if (!host) return;

      const liveSvg = host.querySelector("svg") as SVGSVGElement | null;
      if (!liveSvg) return;

      const clone = liveSvg.cloneNode(true) as SVGSVGElement;
      clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");

      const panelW = Math.max(
        320,
        parseFloat(clone.getAttribute("width") || "520")
      );
      const panelH = Math.max(
        180,
        parseFloat(clone.getAttribute("height") || "260")
      );
      clone.setAttribute("width", String(panelW));
      clone.setAttribute("height", String(panelH));

      const cloneStr = new XMLSerializer()
        .serializeToString(clone)
        .replace("<svg", `<svg x="0" y="26"`);

      const fontStyleCss = await buildEmbeddedFontStyle();

      const MARGIN_TOP = 26;
      const MARGIN_BOTTOM = 26;
      const totalH = MARGIN_TOP + panelH + MARGIN_BOTTOM;

      const esc = (s: string) =>
        (s || "")
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;");
      const phraseText = esc(phrase);
      const labelsText = esc(labelsLine);

      const svgExport = `
<svg xmlns="http://www.w3.org/2000/svg"
     xmlns:xlink="http://www.w3.org/1999/xlink"
     width="${panelW}" height="${totalH}" viewBox="0 0 ${panelW} ${totalH}">
  <style>${fontStyleCss}</style>

  <rect x="0" y="0" width="${panelW}" height="${totalH}" fill="${theme.bg}"/>
  <rect x="0" y="${MARGIN_TOP}" width="${panelW}" height="${panelH}" fill="${theme.gold}" rx="10" ry="10"/>

  <text x="${panelW / 2}" y="18" text-anchor="middle"
        fill="${theme.gold}" font-size="14" font-weight="700"
        font-family="Inter, -apple-system, system-ui, Segoe UI, Arial, sans-serif">
    ${phraseText}
  </text>

  ${cloneStr}

  <text x="${panelW / 2}" y="${MARGIN_TOP + panelH + 18}" text-anchor="middle"
        fill="${theme.gold}" font-size="13.5"
        font-family="Inter, -apple-system, system-ui, Segoe UI, Arial, sans-serif">
    ${labelsText}
  </text>
</svg>`.trim();

      const blob = new Blob([svgExport], {
        type: "image/svg+xml;charset=utf-8",
      });
      const url = URL.createObjectURL(blob);

      const img = new Image();
      img.crossOrigin = "anonymous";
      await new Promise<void>((res, rej) => {
        img.onload = () => res();
        img.onerror = rej;
        img.src = url;
      });

      const SCALE = 2;
      const canvas = document.createElement("canvas");
      canvas.width = Math.floor(panelW * SCALE);
      canvas.height = Math.floor(totalH * SCALE);
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas 2D not available");

      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);

      canvas.toBlob((png) => {
        if (!png) return;
        const a = document.createElement("a");
        const shortPhrase = (phrase || "phrase")
          .trim()
          .replace(/\s+/g, "_")
          .slice(0, 24);
        a.download = `words-to-notes_${keyName}_${shortPhrase}.png`;
        a.href = URL.createObjectURL(png);
        document.body.appendChild(a);
        a.click();
        a.remove();
      }, "image/png");
    } catch (e) {
      console.error("PNG export failed", e);
    }
  }, [phrase, labelsLine, keyName]);

  /* ====== Start / Stop (no Transport) ====== */
  const start = useCallback(async () => {
    if (isPlaying) return;

    // collapse keyboard only if needed (portrait + keyboard)
    try {
      (document.activeElement as HTMLElement | null)?.blur();
    } catch {}
    setTimeout(() => {
      const vv = (window as any).visualViewport;
      const keyboardLikelyOpen = vv && (window.innerHeight - vv.height) > 120;
      const isPortrait = window.innerHeight >= window.innerWidth;
      if (keyboardLikelyOpen && isPortrait) {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    }, 50);

    // rotate poster title
    setTitleIdx((i) => (i + 1) % TITLE_OPTIONS.length);

    // map phrase -> notes
    const mapping = mapPhraseToNotes(phrase, keyName);
    console.table(mapping);

    const labels = mapping.map((x) =>
      x.note.replace("b", "♭").replace("#", "♯")
    );
    setLabelsLine(labels.join(" – "));

    // clef-split + keep midi
    const mapped: Mapped[] = mapping.map((x) => {
      const { vfKey } = noteNameToVF(x.note);
      const oct = parseInt(vfKey.split("/")[1], 10);
      const clef: "treble" | "bass" = oct >= 4 ? "treble" : "bass";
      return { note: x.note, vfKey, clef, midi: x.midi };
    });
    setMappedNotes(mapped);
    setIsFrozen(true);

    // audio
    await Tone.start();
    await createSamplerForNotes(mapped.map((n) => n.note));

    setIsPlaying(true);
    isPlayingRef.current = true;
    clearAllTimers();

    mapped.forEach((n, idx) => {
      const id = window.setTimeout(() => {
        if (!isPlayingRef.current) return;
        triggerNow(n.note);
      }, Math.round(idx * noteDurSec * 1000));
      timeoutsRef.current.push(id);
    });

    const endId = window.setTimeout(() => {
      if (isPlayingRef.current) stop();
    }, Math.round(mapped.length * noteDurSec * 1000) + 50);
    timeoutsRef.current.push(endId);
  }, [isPlaying, phrase, keyName, TITLE_OPTIONS.length]);

  const stop = useCallback(() => {
    clearAllTimers();
    setIsPlaying(false);
    isPlayingRef.current = false;
    // Keep sampler for reuse; uncomment to free memory:
    // try { samplerRef.current?.dispose(); } catch {}
    // samplerRef.current = null;
  }, []);

  /* ====== VexFlow render (fixed height, key sigs, stems) ====== */
  useEffect(() => {
    const host = staveHostRef.current;
    if (!host) return;

    host.innerHTML = "";

    const renderer = new Renderer(host, Renderer.Backends.SVG);
    const width = Math.max(320, host.clientWidth || 320);
    const height = 260; // fixed panel height
    renderer.resize(width, height);
    const ctx = renderer.getContext();

    const LEFT = 20;
    const RIGHT_PAD = 28;
    const innerWidth = width - LEFT - RIGHT_PAD;

    // tighter inter-stave gap
    const trebleY = 16;
    const bassY = 120;

    // key signature
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

    if (!mappedNotes.length) return;

    // stem direction rule: below middle line → up; middle/above → down
    const TREBLE_MIDDLE = noteNameToMidi("B4"); // 71
    const BASS_MIDDLE = noteNameToMidi("D3"); // 50

    const trebleData = mappedNotes.filter((n) => n.clef === "treble");
    const bassData = mappedNotes.filter((n) => n.clef === "bass");

    const trebleNotes = trebleData.map((n) => {
      const stemDirection = n.midi < TREBLE_MIDDLE ? 1 : -1; // VexFlow 5: camelCase
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
  }, [mappedNotes, resizeTick, keyName]);

  /* ====== Share URL ====== */
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

  /* ====== Render ====== */
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
          @media (max-width: 420px) { .action-text { display: none; } }
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

        {/* Unified section: Input → Stave → Labels → Actions → Key */}
        <section
          style={{
            background: theme.card,
            border: `1px solid ${theme.border}`,
            borderRadius: 16,
            padding: 12,
            display: "grid",
            gap: 6,
          }}
        >
          {/* 1) Phrase input */}
          <div style={{ marginBottom: 4 }}>
            <style>{`
              .phrase-input::placeholder { color: ${theme.gold}; opacity: 1; }
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
                color: theme.gold, // gold typed text
                border: `1px solid ${theme.border}`,
                borderRadius: 8,
                padding: "12px 14px",
                fontSize: 18,
                lineHeight: 1.35,
              }}
            />

            {/* counters */}
            <div
              style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 4 }}
            >
              <span style={{ fontSize: 12, color: theme.muted }}>
                Portrait: {Math.min(lettersCount, PORTRAIT_MAX)} / {PORTRAIT_MAX}
                {lettersCount > PORTRAIT_MAX
                  ? " (over)"
                  : ` — ${Math.max(0, PORTRAIT_MAX - lettersCount)} left`}
              </span>
              <span style={{ fontSize: 12, color: theme.muted }}>
                Landscape: {Math.min(lettersCount, LANDSCAPE_MAX)} /{" "}
                {LANDSCAPE_MAX}
                {lettersCount > LANDSCAPE_MAX
                  ? " (over)"
                  : ` — ${Math.max(0, LANDSCAPE_MAX - lettersCount)} left`}
              </span>
            </div>

            {/* rotate warning */}
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
            style={{
              background: theme.gold,
              borderRadius: 10,
              paddingTop: 10,
              paddingBottom: 0, // tight for landscape as you liked
              paddingLeft: 10,
              paddingRight: 10,
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
                fontSize: 13.5,
                textAlign: "center",
                wordWrap: "break-word",
              }}
            >
              {labelsLine}
            </div>
          )}

          {/* 4) Actions: two columns */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 8,
              alignItems: "center",
            }}
          >
            {/* Left: Play / Stop toggle */}
            <div style={{ display: "flex", justifyContent: "flex-start" }}>
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
            </div>

            {/* Right: Copy / Download (gold text, no border) */}
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
                onClick={onDownloadPng}
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

          {/* 5) Key (subtle) */}
          <div style={{ marginTop: 2 }}>
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
                    border: `1px solid ${
                      keyName === k ? theme.gold : theme.border
                    }`,
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