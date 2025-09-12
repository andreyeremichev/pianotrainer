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

/* =========================================
   Theme (gold UI)
   ========================================= */
const theme = {
  bg: "#0B0F14",
  card: "#111820",
  border: "#1E2935",
  text: "#E6EBF2",
  muted: "#8B94A7",
  gold: "#EBCF7A",
  green: "#69D58C",
};

/* =========================================
   Helpers: sanitize and count (20 letters)
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
/** CTA text — quotes + fallback */
function ctaTextFor(phrase: string): string {
  const cleaned = sanitizePhraseInput(phrase);
  const trimmed = trimToMaxLetters(cleaned, MAX_LETTERS);
  const inside = trimmed.length > 0 ? trimmed : "your words";
  return `Turn “${inside}” into sound`;
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
const A_MINOR_SCALE: Array<"A" | "B" | "C" | "D" | "E" | "F" | "G"> = ["A","B","C","D","E","F","G"];
const A_MAJOR_SCALE: Array<"A" | "B" | "C#" | "D" | "E" | "F#" | "G#"> = ["A","B","C#","D","E","F#","G#"];
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
  const baseOct = 2 + Math.floor(idx / 7); // A..G→2, H..N→3, O..U→4, V..Z→5
  const pc = degreeToPitchClass(deg, key);
  const oct = pitchClassToOct(pc, baseOct);
  return `${pc}${oct}`;
}
function mapPhraseToNotes(phrase: string, key: KeyName) {
  const letters = (phrase.match(/[A-Za-z]/g) || []).slice(0, 20);
  return letters.map((ch) => {
    const note = letterToNoteName(ch, key);
    const midi = noteNameToMidi(note);
    return { letter: ch.toUpperCase(), degree: letterToDegree(ch), note, midi };
  });
}

/* =========================================
   Limits (viral: 20 letters only)
   ========================================= */
const MAX_LETTERS = 20;

type Mapped = { note: string; clef: "treble" | "bass"; vfKey: string; midi: number };

export default function WordsToNotesViralPage() {
  /* Phrase / key */
  const [keyName, setKeyName] = useState<KeyName>("Aminor");
  const [phrase, setPhrase] = useState("");
  const lettersCount = useMemo(() => countLetters(phrase), [phrase]);
  const canPlay = lettersCount > 0 && lettersCount <= MAX_LETTERS;
  const [lastEnterAt, setLastEnterAt] = useState(0);

  /* Playback state */
  const [isPlaying, setIsPlaying] = useState(false);
  const isPlayingRef = useRef(false);
  useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);

  /* Rendered notes state */
  const [mappedNotes, setMappedNotes] = useState<Mapped[]>([]);
  const [visibleCount, setVisibleCount] = useState(0); // reveal count
  const staveHostRef = useRef<HTMLDivElement | null>(null);
  const noteDomRefsRef = useRef<SVGGElement[]>([]); // not used now for pulse, kept for extensions

  /* Resize tick */
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

  /* Audio */
  const samplerRef = useRef<Tone.Sampler | null>(null);
  const timeoutsRef = useRef<number[]>([]);
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
    samplerRef.current = new Tone.Sampler({ urls, baseUrl: "/audio/notes/" }).toDestination();
    await Tone.loaded();
  }

  function triggerNow(noteName: string) {
    const s = samplerRef.current;
    if (!s) return;
    try { s.triggerAttackRelease(noteName, noteDurSec * 0.8); } catch {}
  }

  /* ====== Build & play (reveal as you go, then freeze) ====== */
  const start = useCallback(async () => {
    if (!canPlay || isPlaying) return;

    try { (document.activeElement as HTMLElement | null)?.blur(); } catch {}

    // map phrase -> notes
    const mapping = mapPhraseToNotes(phrase, keyName);

    const mapped: Mapped[] = mapping.map((x) => {
      const { vfKey } = noteNameToVF(x.note);
      const oct = parseInt(vfKey.split("/")[1], 10);
      const clef: "treble" | "bass" = oct >= 4 ? "treble" : "bass";
      return { note: x.note, vfKey, clef, midi: x.midi };
    });
    setMappedNotes(mapped);
    setVisibleCount(0); // start empty

    // let VexFlow render before reveal timing starts
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

    await Tone.start();
    await createSamplerForNotes(mapped.map(n => n.note));

    setIsPlaying(true);
    isPlayingRef.current = true;
    clearAllTimers();

    // reveal notes one by one, in sync with audio
    mapped.forEach((n, idx) => {
      const id = window.setTimeout(() => {
        if (!isPlayingRef.current) return;
        setVisibleCount(idx + 1); // draw up to current note
        triggerNow(n.note);
      }, Math.round(idx * noteDurSec * 1000));
      timeoutsRef.current.push(id);
    });

    // when done: show all notes and freeze (no loop)
    const endId = window.setTimeout(() => {
      if (!isPlayingRef.current) return;
      clearAllTimers();
      setVisibleCount(mapped.length); // ensure all notes are visible
      setIsPlaying(false);
      isPlayingRef.current = false;
    }, Math.round(mapped.length * noteDurSec * 1000) + 60);
    timeoutsRef.current.push(endId);
  }, [canPlay, isPlaying, phrase, keyName]);

  const stop = useCallback(() => {
    clearAllTimers();
    setIsPlaying(false);
    isPlayingRef.current = false;
    // keep visibleCount as-is (freeze at current state)
  }, []);

  /* ====== Share helpers ====== */
  const [linkCopied, setLinkCopied] = useState(false);
  function buildShareUrl() {
    const params = new URLSearchParams();
    params.set("key", keyName);
    params.set("phrase", phrase);
    params.set("letters", String(lettersCount));
    params.set("freeze", "1");
    const url = new URL(window.location.href);
    url.search = params.toString();
    return url.toString();
  }
  const onShare = useCallback(async () => {
    const url = buildShareUrl();
    const title = "Words → Notes (PianoTrainer)";
    const text = "I turned a phrase into melody on pianotrainer.app 🎹";
    if ((navigator as any).share) {
      try { await (navigator as any).share({ title, text, url }); return; } catch {}
    }
    try {
      await navigator.clipboard.writeText(url);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 1600);
    } catch {
      alert(url);
    }
  }, [keyName, phrase, lettersCount]);

  /* ====== Input handlers (20 letters, Enter/blur autoplay) ====== */
  const onInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = sanitizePhraseInput(e.target.value);
    const trimmed = trimToMaxLetters(raw, MAX_LETTERS);
    setPhrase(trimmed);
  }, []);
  const onInputKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      setLastEnterAt(Date.now());
      start();
    }
  }, [start]);
  const onInputBlur = useCallback(() => {
    if (Date.now() - lastEnterAt > 150) {
      start();
    }
  }, [lastEnterAt, start]);
  /* =========================================
   Fonts for export (embed SMuFL in SVG)
   ========================================= */
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
  let bravura = "", bravuraText = "";
  try {
    bravura = await fetchFontDataUrlOTF("/fonts/Bravura.otf");
    bravuraText = await fetchFontDataUrlOTF("/fonts/BravuraText.otf");
  } catch (e) {
    console.warn("Font embedding failed; video may show boxes:", e);
  }
  return `
    @font-face { font-family: 'Bravura';     src: ${bravura || "local('Bravura')"};     font-weight: normal; font-style: normal; font-display: swap; }
    @font-face { font-family: 'BravuraText'; src: ${bravuraText || "local('BravuraText')"}; font-weight: normal; font-style: normal; font-display: swap; }
    svg, svg * { font-family: Bravura, BravuraText, serif !important; }
  `.trim();
}

/** Wait two frames so React + VexFlow redraw the live SVG before snapshotting */
function raf2(): Promise<void> {
  return new Promise((r) =>
    requestAnimationFrame(() => requestAnimationFrame(r))
  );
}

/* ====== VexFlow render (fixed height, key sigs, stems, visibleCount) ====== */
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

  const trebleY = 16;
  const bassY = 120;

  const keySpec = keyName === "Amajor" ? "A" : "Am";

  const treble = new Stave(LEFT, trebleY, innerWidth);
  treble.addClef("treble").addKeySignature(keySpec);
  treble.setContext(ctx).draw();

  const bass = new Stave(LEFT, bassY, innerWidth);
  bass.addClef("bass").addKeySignature(keySpec);
  bass.setContext(ctx).draw();

  const Type = (StaveConnector as any).Type ?? (StaveConnector as any).type ?? {};
  new (StaveConnector as any)(treble, bass).setType(Type.BRACE).setContext(ctx).draw();
  new (StaveConnector as any)(treble, bass).setType(Type.SINGLE_LEFT).setContext(ctx).draw();
  new (StaveConnector as any)(treble, bass).setType(Type.SINGLE_RIGHT).setContext(ctx).draw();

  // no notes or none visible
  if (!mappedNotes.length || visibleCount === 0) {
    noteDomRefsRef.current = [];
    return;
  }

  const TREBLE_MIDDLE = noteNameToMidi("B4"); // 71
  const BASS_MIDDLE   = noteNameToMidi("D3"); // 50

  // only the first `visibleCount` notes
  const visible = mappedNotes.slice(0, visibleCount);

  const trebleData = visible.filter((n) => n.clef === "treble");
  const bassData   = visible.filter((n) => n.clef === "bass");

  const trebleNotes = trebleData.map((n) => {
    const stemDirection = n.midi < TREBLE_MIDDLE ? 1 : -1;
    return new StaveNote({ keys: [n.vfKey], duration: "q", clef: "treble", stemDirection });
  });

  const bassNotes = bassData.map((n) => {
    const stemDirection = n.midi < BASS_MIDDLE ? 1 : -1;
    return new StaveNote({ keys: [n.vfKey], duration: "q", clef: "bass", stemDirection });
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

  try {
    // map stavenote groups (kept for future pulse/overlays if needed)
    const svg = (staveHostRef.current?.querySelector("svg") ?? null) as SVGSVGElement | null;
    noteDomRefsRef.current = svg ? (Array.from(svg.querySelectorAll("g.vf-stavenote")) as SVGGElement[]) : [];
  } catch {
    noteDomRefsRef.current = [];
  }
}, [mappedNotes, visibleCount, resizeTick, keyName]);

/* ====== Video export (live SVG per-step snapshots; CTA; safe bottom; audio) ====== */
const onDownloadVideo = useCallback(async () => {
  try {
    const host = staveHostRef.current;
    if (!host || !mappedNotes.length) return;

    // Reset to 0 visible; we'll reveal during capture (matches live behavior)
    const total = mappedNotes.length;
    const noteMs = noteDurSec * 1000;
    clearAllTimers();
    isPlayingRef.current = false;
    setIsPlaying(false);
    setVisibleCount(0);
    await raf2(); // allow re-render

    // Canvas target (with bottom safe padding to avoid timestamp overlap)
    const svgLive = host.querySelector("svg") as SVGSVGElement | null;
    if (!svgLive) return;
    const panelW = Math.max(320, parseFloat(svgLive.getAttribute("width") || "520"));
    const panelH = Math.max(180, parseFloat(svgLive.getAttribute("height") || "260"));
    const SCALE = 2;
    const SAFE_BOTTOM = 60; // px (unscaled) extra room under labels for player controls

    const canvas = document.createElement("canvas");
    canvas.width  = Math.floor(panelW * SCALE);
    canvas.height = Math.floor((panelH + 52 + SAFE_BOTTOM) * SCALE);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const fontStyleCss = await buildEmbeddedFontStyle();

    // Current snapshot image (updated per step)
    let currentUrl = "";
    let currentImg: HTMLImageElement | null = null;

    async function snapshotLiveSvgIntoImage() {
      const svgNow = host.querySelector("svg") as SVGSVGElement | null;
      if (!svgNow) return;

      const inner = new XMLSerializer()
        .serializeToString(svgNow)
        .replace("<svg", `<svg x="0" y="26"`); // space for CTA band
      const svgFramed = `
<svg xmlns="http://www.w3.org/2000/svg"
     xmlns:xlink="http://www.w3.org/1999/xlink"
     width="${panelW}" height="${panelH + 52}" viewBox="0 0 ${panelW} ${panelH + 52}">
  <style>${fontStyleCss}</style>
  ${inner}
</svg>`.trim();

      if (currentUrl) URL.revokeObjectURL(currentUrl);
      const blob = new Blob([svgFramed], { type: "image/svg+xml;charset=utf-8" });
      currentUrl = URL.createObjectURL(blob);

      const img = new Image();
      await new Promise<void>((res, rej) => {
        img.onload = () => res();
        img.onerror = rej;
        img.src = currentUrl;
      });
      currentImg = img;
    }

    // Audio: merge canvas video + WebAudio master
    const rawCtx = (Tone.getContext() as any).rawContext as AudioContext;
    const audioDest = rawCtx.createMediaStreamDestination();
    try { (Tone as any).Destination.connect(audioDest); } catch {}

    const videoStream = (canvas as any).captureStream(30) as MediaStream;
    const mixedStream = new MediaStream([
      ...videoStream.getVideoTracks(),
      ...audioDest.stream.getAudioTracks(),
    ]);

    const rec = new MediaRecorder(mixedStream, { mimeType: "video/webm;codecs=vp9" });
    const chunks: BlobPart[] = [];
    rec.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };

    // Ensure sampler ready
    await Tone.start();
    if (!samplerRef.current) {
      await createSamplerForNotes(mappedNotes.map(n => n.note));
    }

    // Prepare CTA text once (same as page)
    const cta = ctaTextFor(phrase);

    // Reveal steps with audio + snapshot
    async function revealStep(i: number): Promise<void> {
      setVisibleCount(i + 1);
      await raf2();
      await snapshotLiveSvgIntoImage();
    }
    await revealStep(0); // first frame ready

    const timers: number[] = [];
    mappedNotes.forEach((n, idx) => {
      const id = window.setTimeout(() => {
        try { triggerNow(n.note); } catch {}
      }, Math.round(idx * noteMs));
      timers.push(id);
    });

    // Duration: one pass + small tail
    const MAIN_MS = Math.round(total * noteMs) + 200;
    const TAIL_MS = 800; // short hold
    const DURATION_MS = Math.min(16000, MAIN_MS + TAIL_MS);

    rec.start();
    const t0 = performance.now();
    let lastIdx = 0;

    (async function drawLoop() {
      const now = performance.now();
      const elapsed = now - t0;
      const idx = Math.min(total - 1, Math.floor(elapsed / noteMs));

      if (idx > lastIdx) {
        lastIdx = idx;
        await revealStep(idx).catch(() => {});
      }

      // Background + gold panel + safe bottom
      ctx.fillStyle = theme.bg;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = theme.gold;
      ctx.fillRect(0, 26 * SCALE, panelW * SCALE, panelH * SCALE);

      // Current snapshot (live SVG at this step)
      if (currentImg) {
        ctx.drawImage(currentImg, 0, 0, panelW * SCALE, (panelH + 52) * SCALE);
      }

      // CTA (top)
      ctx.fillStyle = theme.text;
      ctx.font = `${18 * SCALE}px Inter, system-ui, sans-serif`;
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(cta, (panelW * SCALE) / 2, 14 * SCALE);

      // Watermark inside panel (bottom-right)
      ctx.save();
      ctx.textAlign = "right"; ctx.textBaseline = "middle";
      ctx.font = `${13 * SCALE}px Inter, system-ui, sans-serif`;
      ctx.fillStyle = "rgba(8,16,25,0.96)";
      ctx.shadowColor = "rgba(255,255,255,0.4)";
      ctx.shadowBlur = 0;
      ctx.fillText(
        "pianotrainer.app",
        (panelW * SCALE) - (8 * SCALE),
        (26 + panelH - 10) * SCALE
      );
      ctx.restore();

      if (elapsed < DURATION_MS) {
        requestAnimationFrame(drawLoop);
      } else {
        rec.stop();
        try { (Tone as any).Destination.disconnect(audioDest); } catch {}
        timers.forEach(id => clearTimeout(id));
        if (currentUrl) URL.revokeObjectURL(currentUrl);
      }
    })();

    const blobOut: Blob = await new Promise((res) => {
      rec.onstop = () => res(new Blob(chunks, { type: "video/webm" }));
    });

    // Freeze fully visible; keep stopped
    setVisibleCount(total);
    setIsPlaying(false);
    isPlayingRef.current = false;

    // Download
    const a = document.createElement("a");
    const shortPhrase = (phrase || "phrase").trim().replace(/\s+/g, "_").slice(0, 24);
    a.download = `words-to-notes_snippet_${shortPhrase}.webm`;
    a.href = URL.createObjectURL(blobOut);
    document.body.appendChild(a);
    a.click();
    a.remove();
  } catch (e) {
    console.error("Video export failed", e);
  }
}, [phrase, mappedNotes, noteDurSec, keyName]);
/* ====== Render (viral-minimal) ====== */
return (
  <div style={{ minHeight: "100vh", background: theme.bg, color: theme.text, overflowX: "hidden" }}>
    <main style={{ width: "100%", margin: "0 auto", padding: 12, boxSizing: "border-box", maxWidth: 520 }}>
      <style>{`
        @media (min-width: 768px) { main { max-width: 680px !important; } }
        @media (min-width: 1024px){ main { max-width: 760px !important; } }
        @media (max-width: 420px) { .action-text { display: none; } }
      `}</style>

      {/* Top CTA (matches video) */}
      <h1
        style={{
          margin: "4px 0 8px 0",
          fontSize: 24,
          lineHeight: 1.25,
          textAlign: "center",
          letterSpacing: 0.2,
          color: theme.text,
        }}
        aria-label="Call to Action"
      >
        {ctaTextFor(phrase)}
      </h1>

      {/* Input → Stave → Actions */}
      <section
        style={{
          background: theme.card,
          border: `1px solid ${theme.border}`,
          borderRadius: 16,
          padding: 12,
          display: "grid",
          gap: 8,
          marginBottom: 10
        }}
      >
        {/* Input (headline-sized) */}
        <div>
          <style>{`.phrase-input::placeholder { color: ${theme.gold}; opacity: 1; }`}</style>
          <input
            className="phrase-input"
            value={phrase}
            onChange={onInputChange}
            onKeyDown={onInputKeyDown}
            onBlur={onInputBlur}
            placeholder="Type your phrase… (≤20 letters)"
            inputMode="text"
            enterKeyHint="done"
            autoCapitalize="characters"
            autoCorrect="off"
            style={{
              width: "100%",
              background: "#0F1821",
              color: theme.gold,
              border: `1px solid ${theme.border}`,
              borderRadius: 8,
              padding: "14px 16px",
              fontSize: 30,              // headline size
              lineHeight: 1.25
            }}
          />
          <div style={{ fontSize: 12, color: theme.muted, marginTop: 4 }}>
            Letters: {lettersCount} / 20 (spaces don’t count)
          </div>
        </div>

        {/* Stave (gold panel) with watermark */}
        <div style={{ position: "relative", background: theme.gold, borderRadius: 10, padding: "10px 10px 0 10px" }}>
          <div
            ref={staveHostRef}
            className="stave-host"
            style={{ width: "100%", minHeight: 280, display: "block" }}
          />
          {/* Watermark inside panel (visible on page) */}
          <div
            style={{
              position: "absolute",
              right: 10,
              bottom: 6,
              color: "#081019",
              fontSize: 12,
              fontWeight: 700,
              opacity: 0.9,
              userSelect: "none",
              pointerEvents: "none"
            }}
          >
            pianotrainer.app
          </div>
        </div>

        {/* (Labels line retired for viral) */}

        {/* Action bar */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, alignItems: "center" }}>
          {/* Left: Replay / Stop */}
          <div style={{ display: "flex", justifyContent: "flex-start" }}>
            <button
              onClick={() => (isPlaying ? stop() : start())}
              disabled={!canPlay}
              style={{
                background: !canPlay ? "#1a2430" : theme.gold,
                color: !canPlay ? theme.muted : "#081019",
                border: "none",
                borderRadius: 999,
                padding: "10px 16px",
                fontWeight: 700,
                cursor: !canPlay ? "not-allowed" : "pointer",
                fontSize: 16,
                minHeight: 40,
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
              }}
              aria-label={isPlaying ? "Stop" : "Replay"}
              title={isPlaying ? "Stop" : "Replay"}
            >
              <span aria-hidden="true">{isPlaying ? "⏹" : "▶"}</span>
              <span className="action-text">{isPlaying ? "Stop" : "Replay"}</span>
            </button>
          </div>

          {/* Right: Download + Share */}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, alignItems: "center" }}>
            <button
              onClick={onDownloadVideo}
              disabled={!canPlay || mappedNotes.length === 0}
              style={{
                background: "transparent",
                color: theme.gold,
                border: "none",
                borderRadius: 999,
                padding: "6px 10px",
                fontWeight: 700,
                cursor: !canPlay || mappedNotes.length === 0 ? "not-allowed" : "pointer",
                minHeight: 32,
                fontSize: 14,
              }}
              title="Download"
            >
              💾 <span className="action-text">Download</span>
            </button>

            <button
              onClick={onShare}
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
              title="Share"
            >
              📤 <span className="action-text">Share</span>
            </button>
          </div>
        </div>

        {/* Copy toast */}
        {linkCopied && (
          <div style={{ color: theme.green, fontSize: 12, fontWeight: 600, textAlign: "right" }}>
            Link copied!
          </div>
        )}
      </section>

      {/* Footer CTA (page-only) */}
      <div style={{ marginTop: 10, display: "flex", justifyContent: "center" }}>
        <a
          href="/learn/words-to-notes-explained"
          style={{
            color: theme.gold,
            fontWeight: 800,
            letterSpacing: 0.3,
            textDecoration: "none",
            padding: "10px 14px",
            border: `1px solid ${theme.border}`,
            borderRadius: 10,
            background: "#0F1821"
          }}
          aria-label="Why these notes?"
        >
          Why these notes? →
        </a>
      </div>
    </main>
  </div>
);
}