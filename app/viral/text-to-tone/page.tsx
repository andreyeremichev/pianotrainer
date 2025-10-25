"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as Tone from "tone";
import { Renderer, Stave, StaveNote, Formatter, Voice, StaveConnector } from "vexflow";
import Link from "next/link";
import { buildEvents, type TextToneEvent } from "@/lib/text-to-tone/buildEvents";

/* =========================
   Theme / constants
   ========================= */
const theme = {
  bg: "#0B0F14",
  card: "#111820",
  border: "#1E2935",
  text: "#E6EBF2",
  muted: "#8B94A7",
  gold: "#EBCF7A",
  warn: "#F87171",
};
const MAX_ELEMENTS = 20;

// Time tolerances
const EPS_TIME  = 1e-4;  // compare token/event times (t) within one slice
const EPS_NUDGE = 1e-4;  // tiny nudge for first-frame rendering at t=0

/* =========================
   Export font helpers (embed Bravura into SVG)
   ========================= */
function arrayBufferToBase64(buf: ArrayBuffer) {
  let b = "";
  const by = new Uint8Array(buf);
  for (let i = 0; i < by.byteLength; i++) b += String.fromCharCode(by[i]);
  return btoa(b);
}
async function fetchFontDataUrlOTF(path: string) {
  const r = await fetch(path, { cache: "no-cache" });
  if (!r.ok) throw new Error(path);
  return `url('data:font/opentype;base64,${arrayBufferToBase64(await r.arrayBuffer())}') format('opentype')`;
}
async function buildEmbeddedFontStyle() {
  let brav = "", bravT = "";
  try {
    brav = await fetchFontDataUrlOTF("/fonts/Bravura.otf");
    bravT = await fetchFontDataUrlOTF("/fonts/BravuraText.otf");
  } catch (e) {
    console.warn("font embed failed", e);
  }
  return `
  @font-face{font-family:'Bravura';src:${brav || "local('Bravura')"};font-weight:normal;font-style:normal;font-display:swap;}
  @font-face{font-family:'BravuraText';src:${bravT || "local('BravuraText')"};font-weight:normal;font-style:normal;font-display:swap;}
  svg,svg *{font-family:Bravura,BravuraText,serif!important;}
  `.trim();
}

/* =========================
   General helpers
   ========================= */
function sanitizePhraseInput(s: string) {
  return s
    .replace(/\u2014|\u2013/g, "-")
    .replace(/\.{3,}/g, "...")
    .replace(/[^A-Za-z0-9 .,;?\-!'/%+=:@#$()&]+/g, "");
}
function noteNameToMidi(n: string) {
  const m =
    /^([A-Ga-g])([#b]?)(-?\d+)$/.exec(n) ||
    /^([a-g])([#b]?)\/(-?\d+)$/.exec(n);
  if (!m) throw new Error("bad note: " + n);
  const L = m[1].toUpperCase();
  const acc = m[2] || "";
  const oct = parseInt(m[3], 10);
  const BASE: Record<string, number> = { C:0,D:2,E:4,F:5,G:7,A:9,B:11 };
  let pc = BASE[L];
  if (acc === "#") pc = (pc + 1) % 12;
  else if (acc === "b") pc = (pc + 11) % 12;
  return (oct + 1) * 12 + pc;
}
function noteToVFKey(n: string) {
  const m = /^([A-Ga-g])([#b]?)(-?\d+)$/.exec(n)!;
  return `${(m[1] + (m[2] || "")).toLowerCase()}/${m[3]}`;
}

/* =========================
   Caption model (tokens in sync with events)
   ========================= */
type CaptionToken = { text: string; t: number; d: number; displaySpan?: [number, number] };

/**
 * deriveCaptionTokens
 * - Produces one caption token per event (same time order).
 * - Assigns an authoritative displaySpan ([from,to) in src) for *one* token per time slice.
 *   Default: 1 char per slice (digit/letter/space/-/:/).
 *   Special: if engine labels "100" and text matches at cursor → consume "100" (3 chars).
 *   Micro-rests (pre-symbol breaths etc.) → empty span (do not advance cursor).
 */
function deriveCaptionTokens(events: TextToneEvent[], src: string): CaptionToken[] {
  const playText = src || "";

  // Precompute letter positions for MELODY display
  const lettersSeq = playText.replace(/[^A-Za-z]/g, "").toUpperCase();
  let letterCur = 0;

  // Monotonic cursor into playText; one pass over time-slices
  let p = 0;
  let lastT: number | null = null;

  const tokens: CaptionToken[] = [];

  // Helper: push token
  const pushToken = (text: string, t: number, d: number): CaptionToken => {
    const tok: CaptionToken = { text, t, d, displaySpan: [p, p] }; // span will be set later for owner
    tokens.push(tok);
    return tok;
  };

  // 1) Create tokens mirroring events (text for reference only; painters use src)
  for (const ev of events) {
    const t = ev.t ?? 0;
    const d = ev.d ?? 0.5;

    if (ev.kind === "MELODY") {
      const letter = lettersSeq[letterCur++] || "A";
      pushToken(letter, t, d);
      continue;
    }
    if (ev.kind === "REST") {
      // use middle dot for visible rest marker; span assignment happens per-slice later
      pushToken("·", t, d);
      continue;
    }

    // CHORD or other
    let label = ev.label || "♩";
    if (/[𝅝𝅗𝅥𝅘𝅥𝅘𝅥𝅮𝅘𝅥𝅯♪♩]/.test(label)) label = "0"; // normalize zero-like glyphs to "0" for text
    pushToken(label, t, d);
  }

  // 2) Assign spans per time-slice (authoritative)
  //    One owner per slice; others in the same slice keep empty [p,p].
  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i];
    const t = tok.t ?? 0;

    // New time slice?
    const isNewSlice = lastT === null || Math.abs(t - lastT) > EPS_TIME;
    if (!isNewSlice) {
      // Same slice as previous → non-owner; keep empty span
      continue;
    }

    // Identify slice range [i .. j) with same t
    let j = i + 1;
    while (j < tokens.length && Math.abs((tokens[j].t ?? 0) - t) <= EPS_TIME) j++;

    // Decide display owner within the slice:
    // Priority: direct char match at p (":", "/", "-", " " or exact typed char),
    // otherwise first non-rest token, else first token.
    let ownerIdx = i;

    const nextCh = playText[p] || "";
    const isSep = /[:\/\- ]/.test(nextCh);

    // Try to find a token whose text equals the next typed char (direct match)
    if (nextCh) {
      for (let k = i; k < j; k++) {
        if (tokens[k].text === nextCh) { ownerIdx = k; break; }
      }
    }

    // If not found and next is a separator, still prefer a non-rest for ownership
    if (ownerIdx === i && isSep) {
      let k = i;
      for (; k < j; k++) if (tokens[k].text !== "·") { ownerIdx = k; break; }
    }

    // 2a) Special-case: "100" if labeled and matches at cursor
    if (tokens[ownerIdx].text === "100" && playText.slice(p, p + 3) === "100") {
      const a = p, b = Math.min(p + 3, playText.length);
      tokens[ownerIdx].displaySpan = [a, b];
      p = b;
      lastT = t;
      continue;
    }

    // 2b) Default per-slice consumption
    // - If next typed char is highlightable (digit/letter/space/-/:/), consume 1 char.
    // - Otherwise (micro breath before symbol etc.), leave empty span here and do not advance p.
    const HILIGHTABLE = /[0-9A-Za-z:\-\/ ]/;
    if (p < playText.length && HILIGHTABLE.test(nextCh)) {
      const a = p, b = p + 1;
      tokens[ownerIdx].displaySpan = [a, b];
      p = b;
    } else {
      // micro-rest slice: leave empty span so the next slice can claim the real char
      tokens[ownerIdx].displaySpan = [p, p];
    }

    lastT = t;
  }

  return tokens;
}

/* =========================
   Component
   ========================= */
export default function TextToTonePage() {
  // input & state
  const [phrase, setPhrase] = useState("");
  const [events, setEvents] = useState<TextToneEvent[]>([]);
  const [visibleIdx, setVisibleIdx] = useState(0);

  // caption (live)
  const [captionTokens, setCaptionTokens] = useState<CaptionToken[]>([]);
  const [captionIdx, setCaptionIdx] = useState(0);

  // play state
  const [isPlaying, setIsPlaying] = useState(false);
  const isPlayingRef = useRef(false);

  // stave container
  const staveHostRef = useRef<HTMLDivElement | null>(null);

  // audio
  const samplerRef = useRef<Tone.Sampler | null>(null);
  const timeoutsRef = useRef<number[]>([]);
  const clearAllTimers = () => { timeoutsRef.current.forEach(id => clearTimeout(id)); timeoutsRef.current = []; };
    /* Element cap (20) */
  const elementCount = useMemo(
    () => buildEvents(sanitizePhraseInput(phrase)).events.length,
    [phrase]
  );
  const overLimit = elementCount > MAX_ELEMENTS;

  /* Copy link (for share sheet) */
  const copyLink = useCallback(async () => {
    const url = new URL(window.location.href);
    url.searchParams.set("phrase", phrase);
    try {
      await navigator.clipboard.writeText(url.toString());
      alert("Link copied!");
    } catch {
      alert(url.toString());
    }
  }, [phrase]);

  /* Share URL helpers */
  function buildShareUrl() {
    const url = new URL(window.location.href);
    url.searchParams.set("phrase", phrase);
    url.searchParams.set("utm_source", "share");
    url.searchParams.set("utm_medium", "viral");
    url.searchParams.set("utm_campaign", "text_to_tone");
    return url.toString();
  }
  function buildTweetIntent(
    text: string,
    url: string,
    hashtags = ["TextToTone", "TextToMusic", "PianoTrainer"]
  ) {
    const u = new URL("https://twitter.com/intent/tweet");
    u.searchParams.set("text", text);
    u.searchParams.set("url", url);
    u.searchParams.set("hashtags", hashtags.join(","));
    return u.toString();
  }

  /* Build events & caption for display (not used for scheduling) */
  const rebuild = useCallback((src: string) => {
    const { events: base } = buildEvents(src);
    setEvents(base);
    setVisibleIdx(0);
    setCaptionIdx(0);
    setCaptionTokens(deriveCaptionTokens(base, src));
  }, []);

  /* Audio helpers */
  async function ensureSampler(evts: TextToneEvent[]) {
    if (samplerRef.current) {
      try {
        samplerRef.current.dispose();
      } catch {}
      samplerRef.current = null;
    }
    const urls: Record<string, string> = {};
    for (const e of evts)
      if (e.kind !== "REST")
        for (const n of e.notes) urls[n] = `${n.replace("#", "%23")}.wav`;
    samplerRef.current = new Tone.Sampler({
      urls,
      baseUrl: "/audio/notes/",
    }).toDestination();
    await Tone.loaded();
  }
  function triggerNow(notes: string[], seconds: number) {
    const s = samplerRef.current;
    if (!s || !notes.length) return;
    try {
      (s as any).triggerAttackRelease(notes, Math.max(0.12, seconds * 0.9));
    } catch {}
  }

  /* Play (live) — caption + stave + audio in unison */
  const start = useCallback(async () => {
    if (isPlaying || overLimit) return;

    const input = sanitizePhraseInput(phrase);
    const { events: localEvts } = buildEvents(input); // local snapshot

    setEvents(localEvts);
    setVisibleIdx(0);
    setCaptionIdx(0);
    setCaptionTokens(deriveCaptionTokens(localEvts, input));

    await Tone.start();
    await ensureSampler(localEvts);

    setIsPlaying(true);
    isPlayingRef.current = true;
    clearAllTimers();

    const timers: number[] = [];
    const lastEnd = localEvts.reduce(
      (mx, e) => Math.max(mx, (e.t ?? 0) + (e.d ?? 0)),
      0
    );

    for (let i = 0; i < localEvts.length; i++) {
      const ev = localEvts[i];
      const startMs = Math.max(0, Math.round((ev.t ?? 0) * 1000));

      timers.push(
        window.setTimeout(() => {
          if (!isPlayingRef.current) return;
          setCaptionIdx(i + 1);
        }, startMs)
      );
      timers.push(
        window.setTimeout(() => {
          if (!isPlayingRef.current) return;
          setVisibleIdx(i + 1);
        }, startMs)
      );

      if (ev.kind !== "REST" && ev.notes.length) {
        timers.push(
          window.setTimeout(() => {
            if (!isPlayingRef.current) return;
            triggerNow(ev.notes, ev.d ?? 0.55);
          }, startMs)
        );
      }
    }

    timers.push(
      window.setTimeout(() => {
        if (!isPlayingRef.current) return;
        clearAllTimers();
        setVisibleIdx(localEvts.length);
        setCaptionIdx(localEvts.length);
        setIsPlaying(false);
        isPlayingRef.current = false;
      }, Math.round((lastEnd + 0.2) * 1000))
    );

    timeoutsRef.current.push(...timers);
  }, [phrase, isPlaying, overLimit]);

  const stop = useCallback(() => {
    clearAllTimers();
    setIsPlaying(false);
    isPlayingRef.current = false;
    setCaptionIdx(captionTokens.length);
  }, [captionTokens.length]);

  /* Restore from URL once */
  useEffect(() => {
    if (typeof window === "undefined") return;
    const sp = new URLSearchParams(window.location.search);
    const p = sp.get("phrase") || "";
    if (!p) return;
    const trimmed = sanitizePhraseInput(p);
    setPhrase(trimmed);
    const { events: built } = buildEvents(trimmed);
    setEvents(built);
    setCaptionTokens(deriveCaptionTokens(built, trimmed));
    setVisibleIdx(built.length);
    setCaptionIdx(built.length);
    setIsPlaying(false);
    isPlayingRef.current = false;
    clearAllTimers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* =========================
     Floating caption (live)
     ========================= */
  const captionRender = useMemo(() => {
    const text = typeof phrase === "string" ? phrase : "";
    if (!text) return null;

    // Build char→token map from displaySpan (authoritative)
    const charToTok: number[] = new Array(text.length).fill(-1);
    for (let i = 0; i < captionTokens.length; i++) {
      const span = captionTokens[i].displaySpan;
      if (!span) continue;
      const [a, b] = span;
      for (let k = Math.max(0, a); k < Math.min(text.length, b); k++)
        charToTok[k] = i;
    }

    const currentIndex = isPlaying ? Math.max(0, captionIdx - 1) : -1;

    // Pick visible (non-empty span) token for current time
    const pickVisibleIdx = (idx: number) => {
      if (idx < 0) return -1;
      const t0 = captionTokens[idx]?.t ?? -1;
      for (let j = 0; j < captionTokens.length; j++) {
        const tj = captionTokens[j]?.t ?? -1;
        const sp = captionTokens[j]?.displaySpan;
        if (Math.abs(tj - t0) <= EPS_TIME && sp && sp[1] > sp[0]) return j;
      }
      return idx;
    };
    const visCurrentIndex = pickVisibleIdx(currentIndex);

    const curSpanLive =
      visCurrentIndex >= 0
        ? captionTokens[visCurrentIndex]?.displaySpan
        : undefined;
    const curALive = curSpanLive ? Math.max(0, curSpanLive[0]) : -1;
    const curBLive = curSpanLive ? curSpanLive[1] : -1;

    const spans: React.ReactNode[] = [];
    let i = 0;
    while (i < text.length) {
      const tokIdx = charToTok[i];
      const inCurrent =
        curALive >= 0 && i >= curALive && i < curBLive;

      // role by time
      const roleAt = (pos: number): "past" | "current" | "future" => {
        const inCurrentSpan =
          curALive >= 0 && pos >= curALive && pos < curBLive;
        if (!isPlaying) return "past";
        if (inCurrentSpan) return "current";
        const owner = charToTok[pos];
        if (owner === -1) return "future";
        const curT = captionTokens[visCurrentIndex]?.t ?? Infinity;
        const ownT = captionTokens[owner]?.t ?? Infinity;
        if (Math.abs(ownT - curT) <= EPS_TIME) return "current";
        return ownT < curT ? "past" : "future";
      };

      const thisRole = roleAt(i);
      let j = i + 1;
      while (
        j < text.length &&
        charToTok[j] === tokIdx &&
        roleAt(j) === thisRole
      )
        j++;

      const segmentRaw = text.slice(i, j);
      const segment = segmentRaw.replace(/[𝅝𝅗𝅥𝅘𝅥𝅘𝅥𝅮𝅘𝅥𝅯♪♩]/g, "0");

      const base: React.CSSProperties = {
        transition:
          "opacity 120ms ease, text-shadow 120ms ease, color 120ms ease",
        opacity: thisRole === "past" ? 0.6 : 1.0,
      };
      const style: React.CSSProperties =
        thisRole === "current"
          ? {
              ...base,
              color: theme.gold,
              fontWeight: 800,
              textShadow: "0 0 12px rgba(235,207,122,0.55)",
            }
          : thisRole === "past"
          ? { ...base, color: theme.text, fontWeight: 600 }
          : { ...base, color: theme.text };

      if (segment === "·" && thisRole !== "current")
        (style as any).opacity = 0.4;

      spans.push(
        <span key={`cap-${i}-${j}`} style={style}>
          {segment}
        </span>
      );
      i = j;
    }

    return (
      <div
        aria-live="off"
        style={{
          width: "100%",
          textAlign: "center",
          margin: "6px 0 8px",
          fontSize: 18,
          lineHeight: 1.5,
          letterSpacing: 0.2,
        }}
      >
        {spans}
      </div>
    );
  }, [captionTokens, captionIdx, isPlaying, phrase, theme]);
    // --- DEBUG: mirror state to window + pretty logs ---
  useEffect(() => {
    const liveStr = typeof phrase === "string" ? phrase : "";
    const expStr =
      typeof (window as any).__exportInput === "string"
        ? (window as any).__exportInput
        : "";

    (window as any).ttt = {
      phrase: liveStr,
      exportInput: expStr,
      captionTokens,
      captionTokensExport: (window as any).__exportTokens || [],
      evtsExport: (window as any).__exportEvents || [],
    };
  }, [phrase, captionTokens]);

  /* VexFlow stave render */
  useEffect(() => {
    const host = staveHostRef.current;
    if (!host) return;
    host.innerHTML = "";
    const rect = host.getBoundingClientRect();
    const width = Math.floor(rect.width),
      height = 260;

    const renderer = new Renderer(host, Renderer.Backends.SVG);
    renderer.resize(width, height);
    const ctx = renderer.getContext();

    const keySpec = "Am";

    let LEFT = 20,
      RIGHT = 28;
    if (width <= 390) {
      LEFT = 16;
      RIGHT = 18;
    }
    if (width <= 360) {
      LEFT = 14;
      RIGHT = 16;
    }
    if (width <= 344) {
      LEFT = 12;
      RIGHT = 14;
    }

    const innerWidth = width - LEFT - RIGHT,
      trebleY = 16,
      bassY = 120;

    const treble = new Stave(LEFT, trebleY, innerWidth);
    treble.addClef("treble").addKeySignature(keySpec).setContext(ctx).draw();

    const bass = new Stave(LEFT, bassY, innerWidth);
    bass.addClef("bass").addKeySignature(keySpec).setContext(ctx).draw();

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

    if (!events.length || visibleIdx === 0) return;
    const vis = events.slice(0, visibleIdx);

    const MIDI_B4 = noteNameToMidi("B4"),
      MIDI_D3 = noteNameToMidi("D3");
    const vf = (n: string) => noteToVFKey(n);
    const stemTreble = (keys: string[]) =>
      Math.max(...keys.map((k) => noteNameToMidi(k))) > MIDI_B4 ? -1 : 1;
    const stemBass = (keys: string[]) =>
      Math.max(...keys.map((k) => noteNameToMidi(k))) > MIDI_D3 ? -1 : 1;

    const trebleNotes: any[] = [],
      bassNotes: any[] = [];
    for (const e of vis) {
      const dur = "q";
      if (e.kind === "REST") {
        bassNotes.push(
          new StaveNote({ keys: ["d/3"], duration: `${dur}r`, clef: "bass" })
        );
        continue;
      }
      const keys = e.notes.map(vf);
      const tre = keys.filter((k) => parseInt(k.split("/")[1], 10) >= 4);
      const bas = keys.filter((k) => parseInt(k.split("/")[1], 10) < 4);
      if (tre.length)
        trebleNotes.push(
          new StaveNote({
            keys: tre,
            duration: dur,
            clef: "treble",
            stemDirection: stemTreble(tre),
          })
        );
      if (bas.length)
        bassNotes.push(
          new StaveNote({
            keys: bas,
            duration: dur,
            clef: "bass",
            stemDirection: stemBass(bas),
          })
        );
    }

    if (trebleNotes.length) {
      const v = new Voice({
        numBeats: Math.max(1, trebleNotes.length),
        beatValue: 4,
      }).setStrict(false);
      v.addTickables(trebleNotes);
      new Formatter().joinVoices([v]).formatToStave([v], treble);
      v.draw(ctx, treble);
    }
    if (bassNotes.length) {
      const v = new Voice({
        numBeats: Math.max(1, bassNotes.length),
        beatValue: 4,
      }).setStrict(false);
      v.addTickables(bassNotes);
      new Formatter().joinVoices([v]).formatToStave([v], bass);
      v.draw(ctx, bass);
    }
  }, [events, visibleIdx]);

  /* =========================
     Export (Save): caption + stave + audio in sync
     ========================= */
  const onDownloadVideo = useCallback(async () => {
    const host = staveHostRef.current;
    if (!host) return;

    // kill any interactive timers
    clearAllTimers();
    isPlayingRef.current = false;
    setVisibleIdx(0);

    const exportInput = sanitizePhraseInput(phrase || "");
    const { events: evtsExport } = buildEvents(exportInput);
    if (!evtsExport.length) return;

    const captionTokensExport = deriveCaptionTokens(evtsExport as any, exportInput);

    // DEBUG mirrors for console inspection (safe globals)
    (window as any).__exportInput = exportInput;
    (window as any).__exportEvents = evtsExport;
    (window as any).__exportTokens = captionTokensExport;

    // push snapshot into state so SVG reflects it while recording
    setEvents(evtsExport);
    setVisibleIdx(0);
    await new Promise<void>((res) =>
      requestAnimationFrame(() => requestAnimationFrame(() => res()))
    );

    try {
      const liveSvgEl = host.querySelector("svg") as SVGSVGElement | null;
      if (!liveSvgEl) return;

      const rect = liveSvgEl.getBoundingClientRect();
      const liveW = Math.max(2, Math.floor(rect.width));
      const liveH = Math.max(2, Math.floor(rect.height));

      const FRAME_W = 1080,
        FRAME_H = 1920,
        SCALE = 2;
      const canvas = document.createElement("canvas");
      canvas.width = FRAME_W * SCALE;
      canvas.height = FRAME_H * SCALE;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const c = ctx as CanvasRenderingContext2D;

      const SAFE_TOP = 180;
      const SAFE_BOTTOM = 120;
      const PHRASE_TOP_OFFSET = 5;
      const PHRASE_MIN_PX = 28;
      const PHRASE_MAX_PX = 80;
      const PHRASE_TARGET = 0.86;
      const GOLD_SIDE_PAD = 36;
      const GAP_PHRASE_TO_GOLD = 8;

      function measurePhraseWidth(px: number): number {
        c.font = `${px * SCALE}px Inter, system-ui, sans-serif`;
        return c.measureText(phrase).width;
      }
      function pickPhrasePx(): number {
        let lo = PHRASE_MIN_PX,
          hi = PHRASE_MAX_PX,
          best = PHRASE_MIN_PX;
        const maxWidth = FRAME_W * SCALE * PHRASE_TARGET;
        while (lo <= hi) {
          const mid = Math.floor((lo + hi) / 2);
          const w = measurePhraseWidth(mid);
          if (w <= maxWidth) {
            best = mid;
            lo = mid + 1;
          } else {
            hi = mid - 1;
          }
        }
        return best;
      }
      const phrasePx = pickPhrasePx();
      function measurePhraseBlockHeight(px: number): number {
        c.font = `${px * SCALE}px Inter, system-ui, sans-serif`;
        const m = c.measureText(phrase);
        const ascent = (m as any).actualBoundingBoxAscent ?? px * 0.8;
        const descent = (m as any).actualBoundingBoxDescent ?? px * 0.25;
        return Math.ceil((ascent + descent) * 1.05);
      }
      const PHRASE_BLOCK_H = measurePhraseBlockHeight(phrasePx);
      const phraseBaselineY =
        (SAFE_TOP + PHRASE_TOP_OFFSET + Math.round(PHRASE_BLOCK_H * 0.6)) *
        SCALE;

      const availW = FRAME_W - GOLD_SIDE_PAD * 2;
      const goldTopPx =
        SAFE_TOP + PHRASE_TOP_OFFSET + PHRASE_BLOCK_H + GAP_PHRASE_TO_GOLD;
      const availH = Math.max(2, FRAME_H - goldTopPx - SAFE_BOTTOM);
      const scale = Math.min(availW / liveW, availH / liveH);
      const drawW = Math.round(liveW * scale);
      const drawH = Math.round(liveH * scale);
      const goldX = Math.round((FRAME_W - drawW) / 2);
      const goldY = goldTopPx;

      await Tone.start();
      const rawCtx = (Tone.getContext() as any).rawContext as AudioContext;
      const audioDst = rawCtx.createMediaStreamDestination();

      // keep stream continuous
      const silentOsc = rawCtx.createOscillator();
      const silentGain = rawCtx.createGain();
      silentGain.gain.value = 0.00001;
      silentOsc.connect(silentGain).connect(audioDst);
      silentOsc.start();

      const allNoteNames = Array.from(
        new Set(evtsExport.flatMap((ev) => (ev as any).notes || []))
      );
      if (samplerRef.current) {
        try {
          samplerRef.current.dispose();
        } catch {}
        samplerRef.current = null;
      }
      {
        const urls: Record<string, string> = {};
        for (const n of allNoteNames) urls[n] = `${n.replace("#", "%23")}.wav`;
        samplerRef.current = new Tone.Sampler({
          urls,
          baseUrl: "/audio/notes/",
        });
        await Tone.loaded();
      }

      const recordBus = rawCtx.createGain();
      recordBus.gain.value = 1;
      try {
        (samplerRef.current as any).connect(recordBus);
      } catch {}
      try {
        (Tone as any).Destination.connect(recordBus);
      } catch {}
      recordBus.connect(audioDst);

      const stream = (canvas as any).captureStream(30) as MediaStream;
      const mixed = new MediaStream([
        ...stream.getVideoTracks(),
        ...audioDst.stream.getAudioTracks(),
      ]);

      function pickRecorderMime(): string {
        const candidates = [
          'video/mp4;codecs="avc1.42E01E,mp4a.40.2"',
          "video/mp4",
          "video/webm;codecs=vp9,opus",
          "video/webm",
        ];
        for (const t of candidates) {
          try {
            if ((window as any).MediaRecorder?.isTypeSupported?.(t)) return t;
          } catch {}
        }
        return "video/webm";
      }
      const mimeType = pickRecorderMime();
      
      const chunks: BlobPart[] = [];
const rec = new MediaRecorder(mixed, { mimeType });
rec.ondataavailable = (e) => {
  if (e.data.size > 0) chunks.push(e.data);
};

      // embed music fonts into SVG
      const fontCss = await buildEmbeddedFontStyle();
      function serializeFullSvg(svgEl: SVGSVGElement, w: number, h: number): string {
        let raw = new XMLSerializer().serializeToString(svgEl);
        if (!/\swidth=/.test(raw))
          raw = raw.replace(/<svg([^>]*?)>/, '<svg$1 width="' + w + '">');
        else raw = raw.replace(/\swidth="[^"]*"/, ' width="' + w + '"');
        if (!/\sheight=/.test(raw))
          raw = raw.replace(/<svg([^>]*?)>/, '<svg$1 height="' + h + '">');
        else raw = raw.replace(/\sheight="[^"]*"/, ' height="' + h + '"');
        if (/<style[^>]*>/.test(raw))
          raw = raw.replace(/<style[^>]*>/, (m) => `${m}\n${fontCss}\n`);
        else
          raw = raw.replace(/<svg[^>]*?>/, (m) => `${m}\n<style>${fontCss}</style>\n`);
        return raw;
      }
      async function svgToImage(rawSvg: string): Promise<HTMLImageElement> {
        const blob = new Blob([rawSvg], { type: "image/svg+xml;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const img = new Image();
        await new Promise<void>((res, rej) => {
          img.onload = () => res();
          img.onerror = rej;
          img.src = url;
        });
        URL.revokeObjectURL(url);
        return img;
      }

      let currentImg = await svgToImage(serializeFullSvg(liveSvgEl, liveW, liveH));
      let lastSnapshot: HTMLImageElement = currentImg;

      // caption painter (export)
      function drawCaptionLine(nowSec: number) {
        const RAW_CAPTION: string = exportInput || phrase || "";
        if (!RAW_CAPTION) return;

        const SAFE_CAPTION = RAW_CAPTION.replace(/[𝅝𝅗𝅥𝅘𝅥𝅘𝅥𝅮𝅘𝅥𝅯♪♩]/g, "0");

        const TOKS = captionTokensExport;

        // Build char→token map from displaySpan (authoritative)
        const charToTok = new Array(SAFE_CAPTION.length).fill(-1);
        for (let i = 0; i < TOKS.length; i++) {
          const span = TOKS[i]?.displaySpan;
          if (!span) continue;
          const [a, b] = span;
          for (let k = Math.max(0, a); k < Math.min(SAFE_CAPTION.length, b); k++)
            charToTok[k] = i;
        }

        // current token by time (then pick visible)
        let currentTokIdx = -1;
        for (let i = 0; i < TOKS.length; i++) {
          const t0 = TOKS[i].t ?? 0;
          const t1 = t0 + (TOKS[i].d ?? 0.5);
          if (nowSec >= t0 && nowSec < t1) { currentTokIdx = i; break; }
          if (nowSec >= t1) currentTokIdx = i;
        }

        const pickVisibleTok = (idx: number) => {
          if (idx < 0) return -1;
          const t0 = TOKS[idx]?.t ?? -1;
          for (let j = 0; j < TOKS.length; j++) {
            const tj = TOKS[j]?.t ?? -1;
            const sp = TOKS[j]?.displaySpan;
            if (Math.abs(tj - t0) <= EPS_TIME && sp && sp[1] > sp[0]) return j;
          }
          return idx;
        };
        const visCurrentTokIdx = pickVisibleTok(currentTokIdx);

        const curSpan =
          visCurrentTokIdx >= 0 ? TOKS[visCurrentTokIdx]?.displaySpan : undefined;
        const curA = curSpan ? Math.max(0, curSpan[0]) : -1;
        const curB = curSpan ? curSpan[1] : -1;

        // style
        c.textAlign = "center";
        c.textBaseline = "middle";
        const px = (() => {
          let lo = 14,
            hi = Math.max(14, 80),
            best = 18;
          const maxWidth = FRAME_W * SCALE * 0.86;
          while (lo <= hi) {
            const mid = Math.floor((lo + hi) / 2);
            c.font = `${mid * SCALE}px Inter, system-ui, sans-serif`;
            const w = c.measureText(SAFE_CAPTION).width;
            if (w <= maxWidth) {
              best = mid;
              lo = mid + 1;
            } else hi = mid - 1;
          }
          return best;
        })();
        c.font = `${px * SCALE}px Inter, system-ui, sans-serif`;

        const full = SAFE_CAPTION;
        const metrics = c.measureText(full);
        const totalWidth = Number.isFinite(metrics.width) ? metrics.width : 0;
        if (totalWidth <= 0) return;
        const centerX = (FRAME_W * SCALE) / 2;

        // role helper (time-based) + split-by-role
        const lastEnd =
          TOKS.length
            ? Math.max(...TOKS.map((t) => (t.t ?? 0) + (t.d ?? 0)))
            : 0;

        const roleAt = (pos: number): "past" | "current" | "future" => {
          const inSpan = curA >= 0 && pos >= curA && pos < curB;
          if (inSpan) return "current";
          const owner = charToTok[pos];
          if (owner === -1) return "future";
          const curT = TOKS[visCurrentTokIdx]?.t ?? Infinity;
          const ownT = TOKS[owner]?.t ?? Infinity;
          if (Math.abs(ownT - curT) <= EPS_TIME) return "current";
          return ownT < curT ? "past" : "future";
        };

        let acc = -totalWidth / 2;
        let i = 0;
        while (i < full.length) {
          const ownerAtI = charToTok[i];
          const thisRole = roleAt(i);

          let j = i + 1;
          while (
            j < full.length &&
            charToTok[j] === ownerAtI &&
            roleAt(j) === thisRole
          )
            j++;

          const segment = full.slice(i, j);
          const segWidth = c.measureText(segment).width;

          if (thisRole === "current") {
            c.fillStyle = theme.gold;
            c.shadowColor = "rgba(235,207,122,0.55)";
            c.shadowBlur = 12 * SCALE;
            c.fillText(
              segment,
              centerX + acc + segWidth / 2,
              phraseBaselineY
            );
            c.shadowBlur = 0;
          } else {
            c.fillStyle = theme.text;
            c.globalAlpha = thisRole === "past" ? 0.6 : 1.0;
            c.fillText(
              segment,
              centerX + acc + segWidth / 2,
              phraseBaselineY
            );
            c.globalAlpha = 1.0;
          }

          acc += segWidth;
          i = j;
        }
      }

      // draw frame (caption + stave snapshot)
      function drawFrame(img: HTMLImageElement, nowSec: number) {
        // bg
        c.fillStyle = theme.bg;
        c.fillRect(0, 0, canvas.width, canvas.height);

        // caption
        drawCaptionLine(nowSec);

        // golden panel
        c.fillStyle = theme.gold;
        c.fillRect(goldX * SCALE, goldY * SCALE, drawW * SCALE, drawH * SCALE);

        // live stave snapshot
        c.drawImage(
          img,
          0,
          0,
          liveW,
          liveH,
          goldX * SCALE,
          goldY * SCALE,
          drawW * SCALE,
          drawH * SCALE
        );
      }

      // start recording

      rec.start();
      const toyLastEnd = evtsExport.reduce(
        (mx, ev) => Math.max(mx, (ev.t ?? 0) + (ev.d ?? 0)),
        0
      );
      const sumDur = evtsExport.reduce((s, e) => s + (e.d ?? 0), 0);

      // animation loop
      const t0 = performance.now();
      (function loop() {
        const elapsed = (performance.now() - t0) / 1000;
        drawFrame(lastSnapshot, elapsed === 0 ? EPS_NUDGE : elapsed);
        if (elapsed < sumDur + 0.2) requestAnimationFrame(loop);
      })();

      // schedule stave advance + audio + snapshots
      const timers: number[] = [];
      for (let i = 0; i < evtsExport.length; i++) {
        const ev = evtsExport[i];
        const startMs = Math.round(1000 * (ev.t ?? i * 0.6));

        // first frame priming
        if (startMs === 0) {
          setVisibleIdx(i + 1);
          try {
            await new Promise<void>((res) =>
              requestAnimationFrame(() => res())
            );
            const liveNowInit = host.querySelector(
              "svg"
            ) as SVGSVGElement | null;
            if (liveNowInit) {
              lastSnapshot = await svgToImage(
                serializeFullSvg(liveNowInit, liveW, liveH)
              );
            }
          } catch {}
        }

        const visId = window.setTimeout(async () => {
          setVisibleIdx(i + 1);
          try {
            await new Promise<void>((res) =>
              requestAnimationFrame(() => res())
            );
            const liveNow = host.querySelector("svg") as SVGSVGElement | null;
            if (liveNow) {
              lastSnapshot = await svgToImage(
                serializeFullSvg(liveNow, liveW, liveH)
              );
            }
          } catch {}
        }, startMs);
        timers.push(visId);

        if ((ev as any).notes && (ev as any).notes.length) {
          const trigId = window.setTimeout(() => {
            try {
              triggerNow((ev as any).notes, ev.d ?? 0.55);
            } catch {}
          }, startMs);
          timers.push(trigId);
        }
      }

      const hardStop = window.setTimeout(() => {
        rec.stop();
        try {
          silentOsc.stop();
        } catch {}
        timers.forEach((id) => clearTimeout(id));
      }, Math.round(sumDur * 1000 + 200));

      const recorded: Blob = await new Promise((res) => {
        rec.onstop = () => res(new Blob(chunks, { type: pickRecorderMime() }));
      });
      window.clearTimeout(hardStop);

      // Download
      const a = document.createElement("a");
      a.download = (() => {
        const base =
          (phrase || "clip")
            .normalize("NFKD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[<>:"/\\|?*\x00-\x1F]/g, "")
            .trim()
            .toLowerCase()
            .replace(/[^\p{L}\p{N}]+/gu, "_")
            .replace(/^_+|_+$/g, "")
            .slice(0, 32) || "clip";
        return `${base}.mp4`;
      })();
      a.href = URL.createObjectURL(recorded);
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      console.error("[download] export error:", err);
      try {
        alert("Could not prepare video. Please try again.");
      } catch {}
    }
  }, [phrase]);

  /* =========================
     Share modal state
     ========================= */
  const [shareOpen, setShareOpen] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  /* =========================
     Render
     ========================= */
  return (
    <main
      style={{
        minHeight: "100vh",
        background: theme.bg,
        color: theme.text,
        overflowX: "hidden",
      }}
    >
      {/* SEO: JSON-LD */}
<script
  type="application/ld+json"
  dangerouslySetInnerHTML={{
    __html: JSON.stringify({
      "@context": "https://schema.org",
      "@type": ["SoftwareApplication", "WebApplication"],
      name: "TextToTone",
      applicationCategory: "MusicApplication",
      operatingSystem: "Web",
      url: "https://pianotrainer.app/viral/text-to-tone",
      image: "https://pianotrainer.app/og/texttotone.png",
      description:
        "Paste text and hear it as melody, instantly. Free and fast.",
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      publisher: { "@type": "Organization", name: "PianoTrainer" },
    }),
  }}
/>
      <div
        style={{
          width: "100%",
          margin: "0 auto",
          padding: 12,
          boxSizing: "border-box",
          maxWidth: 520,
        }}
      >
        {/* Title */}
        <h1
          style={{
            margin: "4px 0 8px",
            fontSize: 24,
            lineHeight: 1.25,
            textAlign: "center",
            letterSpacing: 0.2,
            fontWeight: 800,
            color: theme.text,
          }}
        >
          TextToTone — Type Anything, Hear the Music
        </h1>

        <section
          style={{
            background: theme.card,
            border: `1px solid ${theme.border}`,
            borderRadius: 16,
            padding: 12,
            display: "grid",
            gap: 8,
            marginBottom: 10,
            overflow: "hidden",
            boxSizing: "border-box",
          }}
        >
          {/* Panel: input + caption + stave */}
          <div
            style={{
              width: "100%",
              maxWidth: "100%",
              background: "#0F1821",
              borderRadius: 12,
              padding: 10,
              boxSizing: "border-box",
              overflow: "hidden",
            }}
          >
            {/* input */}
            <div
              style={{
                padding: 2,
                borderRadius: 10,
                overflow: "hidden",
                boxSizing: "border-box",
              }}
            >
              <input
                value={phrase}
                onChange={(e) => setPhrase(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    if (!isPlaying && !overLimit) start();
                  }
                }}
                onBlur={() => {
                  if (!isPlaying && !overLimit) start();
                }}
                placeholder="Type words, numbers, and symbols…"
                inputMode="text"
                enterKeyHint="done"
                autoCapitalize="characters"
                autoCorrect="off"
                style={{
                  width: "100%",
                  display: "block",
                  boxSizing: "border-box",
                  background: "#0F1821",
                  color: theme.gold,
                  border: `1px solid ${theme.border}`,
                  borderRadius: 8,
                  padding: "14px 16px",
                  fontSize: 24,
                  lineHeight: 1.25,
                  outline: "none",
                  WebkitAppearance: "none",
                  appearance: "none",
                }}
              />
            </div>

            <div
              style={{
                fontSize: 12,
                color: overLimit ? theme.warn : theme.muted,
                marginTop: 4,
              }}
            >
              Elements: {elementCount} / 20{" "}
              {overLimit ? " — Limit exceeded. Trim your text." : ""}
            </div>

            {/* Floating caption (live) */}
            {captionTokens.length > 0 && (
              <div style={{ marginTop: 6 }}>{captionRender}</div>
            )}

            {/* Golden panel with stave */}
            <div
              style={{
                position: "relative",
                background: theme.gold,
                borderRadius: 10,
                padding: 10,
                marginTop: 8,
                width: "100%",
                boxSizing: "border-box",
              }}
            >
              <div
                ref={staveHostRef}
                style={{ width: "100%", minHeight: 260, display: "block" }}
              />
            </div>
          </div>

          {/* Actions */}
          <div
            style={{
              display: "flex",
              gap: 10,
              justifyContent: "center",
              flexWrap: "wrap",
            }}
          >
            <button
              onClick={() => !isPlaying && !overLimit && start()}
              disabled={overLimit}
              title={overLimit ? "Reduce to 20 elements to play" : "Play"}
              style={{
                background: overLimit ? "#2A3442" : theme.gold,
                color: overLimit ? "#6B7280" : "#081019",
                border: "none",
                borderRadius: 999,
                padding: "10px 16px",
                fontWeight: 700,
                cursor: overLimit ? "not-allowed" : "pointer",
                fontSize: 16,
                minHeight: 40,
              }}
            >
              ▶ Play
            </button>

            <button
              onClick={onDownloadVideo}
              disabled={overLimit || !events.length}
              title="Save"
              style={{
                background: overLimit ? "#2A3442" : theme.gold,
                color: overLimit ? "#6B7280" : "#081019",
                border: "none",
                borderRadius: 999,
                padding: "10px 16px",
                fontWeight: 700,
                cursor: overLimit ? "not-allowed" : "pointer",
                fontSize: 16,
                minHeight: 40,
              }}
            >
              💾 Save
            </button>

            <button
              onClick={copyLink}
              title="Share"
              style={{
                background: "transparent",
                color: theme.gold,
                border: "none",
                borderRadius: 999,
                padding: "10px 16px",
                fontWeight: 700,
                cursor: "pointer",
                fontSize: 16,
                minHeight: 40,
              }}
            >
              📤 Share
            </button>
          </div>
        </section>

        {/* Footer link to Learn page (optional) */}
        <div style={{ marginTop: 10, display: "flex", justifyContent: "center" }}>
          <Link
            href="/learn/why-these-notes"
            style={{
              color: theme.gold,
              fontWeight: 800,
              letterSpacing: 0.3,
              textDecoration: "none",
              padding: "10px 14px",
              border: `1px solid ${theme.border}`,
              borderRadius: 10,
              background: "#0F1821",
            }}
            aria-label="Why these notes?"
          >
            Why these notes? →
          </Link>
        </div>
      </div>
    </main>
  );
}