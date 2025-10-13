// === /app/viral/text-to-tone/page.tsx ===
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
type CaptionToken = { text: string; t: number; d: number };

// Letters use next real letter from phrase (A minor, A3–A4 mapping handled in buildEvents)
// Chords use ev.label; rest shows "·" (change to " " if you want blank)
function deriveCaptionTokens(events: TextToneEvent[], src: string): CaptionToken[] {
  const lettersSeq = (src || "").replace(/[^A-Za-z]/g, "").toUpperCase();
  let letterCursor = 0;
  const tokens: CaptionToken[] = [];
  for (const ev of events) {
    if (ev.kind === "MELODY") {
      const letter = lettersSeq[letterCursor++] || "A";
      tokens.push({ text: letter, t: ev.t ?? 0, d: ev.d ?? 0.5 });
      continue;
    }
    if (ev.kind === "REST") {
      tokens.push({ text: "·", t: ev.t ?? 0, d: ev.d ?? 0.25 });
      continue;
    }
    let text = ev.label || "♩";
    if (text.startsWith("%")) text = "%";
    tokens.push({ text, t: ev.t ?? 0, d: ev.d ?? 0.6 });
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
    try { await navigator.clipboard.writeText(url.toString()); alert("Link copied!"); }
    catch { alert(url.toString()); }
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
  function buildTweetIntent(text: string, url: string, hashtags = ["TextToTone","TextToMusic","PianoTrainer"]) {
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
    if (samplerRef.current) { try { samplerRef.current.dispose(); } catch {} samplerRef.current = null; }
    const urls: Record<string,string> = {};
    for (const e of evts) if (e.kind !== "REST") for (const n of e.notes) urls[n] = `${n.replace("#","%23")}.wav`;
    samplerRef.current = new Tone.Sampler({ urls, baseUrl: "/audio/notes/" }).toDestination();
    await Tone.loaded();
  }
  function triggerNow(notes: string[], seconds: number) {
    const s = samplerRef.current; if (!s || !notes.length) return;
    try { (s as any).triggerAttackRelease(notes, Math.max(0.12, seconds*0.9)); } catch {}
  }

  /* Play (live) — caption + stave + audio in unison */
  const start = useCallback(async () => {
    if (isPlaying || overLimit) return;

    const input = sanitizePhraseInput(phrase);
    const { events: localEvts } = buildEvents(input);  // local snapshot

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
    const lastEnd = localEvts.reduce((mx, e) => Math.max(mx, (e.t ?? 0) + (e.d ?? 0)), 0);

    for (let i = 0; i < localEvts.length; i++) {
      const ev = localEvts[i];
      const startMs = Math.max(0, Math.round((ev.t ?? 0) * 1000));

      timers.push(window.setTimeout(() => { if (!isPlayingRef.current) return; setCaptionIdx(i+1); }, startMs));
      timers.push(window.setTimeout(() => { if (!isPlayingRef.current) return; setVisibleIdx(i+1); }, startMs));

      if (ev.kind !== "REST" && ev.notes.length) {
        timers.push(window.setTimeout(() => {
          if (!isPlayingRef.current) return;
          triggerNow(ev.notes, ev.d ?? 0.55);
        }, startMs));
      }
    }

    timers.push(window.setTimeout(() => {
      if (!isPlayingRef.current) return;
      clearAllTimers();
      setVisibleIdx(localEvts.length);
      setCaptionIdx(localEvts.length); // no lingering gold
      setIsPlaying(false);
      isPlayingRef.current = false;
    }, Math.round((lastEnd + 0.2) * 1000)));

    timeoutsRef.current.push(...timers);
  }, [phrase, isPlaying, overLimit]);

  const stop = useCallback(() => {
    clearAllTimers();
    setIsPlaying(false);
    isPlayingRef.current = false;
    setCaptionIdx(captionTokens.length); // ensure nothing stays highlighted
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

  /* Floating caption (live) */
  const captionRender = useMemo(() => {
    if (!captionTokens.length) return null;
    const currentIndex = isPlaying ? Math.max(0, captionIdx - 1) : -1;

    const parts: { text: string; role: "past" | "current" | "future"; key: string }[] = [];
    for (let i = 0; i < captionTokens.length; i++) {
      const t = captionTokens[i];
      let role: "past" | "current" | "future";
      if (!isPlaying) role = "past";
      else role = i < currentIndex ? "past" : i === currentIndex ? "current" : "future";
      parts.push({ text: t.text, role, key: `cap-${i}-${t.text}` });
      const needsSpacer = !(t.text.length === 1 && ".,;:-!?".includes(t.text));
      if (i < captionTokens.length - 1 && needsSpacer) parts.push({ text: " ", role, key: `sp-${i}` });
    }

    return (
      <div aria-live="off" style={{ width:"100%", textAlign:"center", margin:"6px 0 8px", fontSize:18, lineHeight:1.5, letterSpacing:0.2 }}>
        {parts.map((p) => {
          const base: React.CSSProperties = { transition:"opacity 120ms ease, text-shadow 120ms ease, color 120ms ease", opacity: p.role === "past" ? 0.6 : 1.0 };
          const style: React.CSSProperties =
            p.role === "current"
              ? { ...base, color: theme.gold, fontWeight: 800, textShadow: "0 0 12px rgba(235,207,122,0.55)" }
              : p.role === "past"
              ? { ...base, color: theme.text, fontWeight: 600 }
              : { ...base, color: theme.text };
          if (p.text === "·" && p.role !== "current") (style as any).opacity = 0.4;
          return <span key={p.key} style={style}>{p.text}</span>;
        })}
      </div>
    );
  }, [captionTokens, captionIdx, isPlaying]);

  /* VexFlow stave render */
  useEffect(() => {
    const host = staveHostRef.current;
    if (!host) return;
    host.innerHTML = "";
    const rect = host.getBoundingClientRect();
    const width = Math.floor(rect.width), height = 260;

    const renderer = new Renderer(host, Renderer.Backends.SVG);
    renderer.resize(width, height);
    const ctx = renderer.getContext();

    const keySpec = "Am";

    let LEFT = 20, RIGHT = 28;
    if (width <= 390) { LEFT = 16; RIGHT = 18; }
    if (width <= 360) { LEFT = 14; RIGHT = 16; }
    if (width <= 344) { LEFT = 12; RIGHT = 14; }

    const innerWidth = width - LEFT - RIGHT, trebleY = 16, bassY = 120;

    const treble = new Stave(LEFT, trebleY, innerWidth);
    treble.addClef("treble").addKeySignature(keySpec).setContext(ctx).draw();

    const bass = new Stave(LEFT, bassY, innerWidth);
    bass.addClef("bass").addKeySignature(keySpec).setContext(ctx).draw();

    const Type = (StaveConnector as any).Type ?? (StaveConnector as any).type ?? {};
    new (StaveConnector as any)(treble, bass).setType(Type.BRACE).setContext(ctx).draw();
    new (StaveConnector as any)(treble, bass).setType(Type.SINGLE_LEFT).setContext(ctx).draw();
    new (StaveConnector as any)(treble, bass).setType(Type.SINGLE_RIGHT).setContext(ctx).draw();

    if (!events.length || visibleIdx === 0) return;
    const vis = events.slice(0, visibleIdx);

    const MIDI_B4 = noteNameToMidi("B4"), MIDI_D3 = noteNameToMidi("D3");
    const vf = (n: string) => noteToVFKey(n);
    const stemTreble = (keys: string[]) => Math.max(...keys.map(k => noteNameToMidi(k))) > MIDI_B4 ? -1 : 1;
    const stemBass   = (keys: string[]) => Math.max(...keys.map(k => noteNameToMidi(k))) > MIDI_D3 ? -1 : 1;

    const trebleNotes:any[] = [], bassNotes:any[] = [];
    for (const e of vis) {
      const dur = "q";
      if (e.kind === "REST") {
        bassNotes.push(new StaveNote({ keys:["d/3"], duration:`${dur}r`, clef:"bass" }));
        continue;
      }
      const keys = e.notes.map(vf);
      const tre = keys.filter(k => parseInt(k.split("/")[1],10) >= 4);
      const bas = keys.filter(k => parseInt(k.split("/")[1],10) <  4);
      if (tre.length) trebleNotes.push(new StaveNote({ keys: tre, duration: dur, clef:"treble", stemDirection: stemTreble(tre) }));
      if (bas.length) bassNotes.push(new StaveNote({ keys: bas, duration: dur, clef:"bass", stemDirection: stemBass(bas) }));
    }

    if (trebleNotes.length) {
      const v = new Voice({ numBeats: Math.max(1, trebleNotes.length), beatValue: 4 }).setStrict(false);
      v.addTickables(trebleNotes);
      new Formatter().joinVoices([v]).formatToStave([v], treble);
      v.draw(ctx, treble);
    }
    if (bassNotes.length) {
      const v = new Voice({ numBeats: Math.max(1, bassNotes.length), beatValue: 4 }).setStrict(false);
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

    // fresh export snapshot from current input
    const exportInput = sanitizePhraseInput(phrase || "");
    const evtsExport = buildEvents(exportInput).events;
    if (!evtsExport.length) return;
    console.log("[export] snapshot", { input: exportInput, count: evtsExport.length });

    // push snapshot into state so SVG reflects it while recording
    setEvents(evtsExport);
    setVisibleIdx(0);
    // let VexFlow re-render the SVG before we start the loop
    await new Promise<void>(res => requestAnimationFrame(() => requestAnimationFrame(() => res())));

    try {
      // live SVG
      const liveSvgEl = host.querySelector("svg") as SVGSVGElement | null;
      if (!liveSvgEl) return;

      // sizes
      const rect = liveSvgEl.getBoundingClientRect();
      const liveW = Math.max(2, Math.floor(rect.width));
      const liveH = Math.max(2, Math.floor(rect.height));

      // canvas
      const FRAME_W = 1080, FRAME_H = 1920, SCALE = 2;
      const canvas = document.createElement("canvas");
      canvas.width = FRAME_W * SCALE;
      canvas.height = FRAME_H * SCALE;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const c = ctx as CanvasRenderingContext2D;

      // layout
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
        let lo = PHRASE_MIN_PX, hi = PHRASE_MAX_PX, best = PHRASE_MIN_PX;
        const maxWidth = FRAME_W * SCALE * PHRASE_TARGET;
        while (lo <= hi) {
          const mid = Math.floor((lo + hi) / 2);
          const w = measurePhraseWidth(mid);
          if (w <= maxWidth) { best = mid; lo = mid + 1; } else { hi = mid - 1; }
        }
        return best;
      }
      const phrasePx = pickPhrasePx();
      function measurePhraseBlockHeight(px: number): number {
        c.font = `${px * SCALE}px Inter, system-ui, sans-serif`;
        const m = c.measureText(phrase);
        const ascent  = (m as any).actualBoundingBoxAscent ?? px * 0.8;
        const descent = (m as any).actualBoundingBoxDescent ?? px * 0.25;
        return Math.ceil((ascent + descent) * 1.05);
      }
      const PHRASE_BLOCK_H = measurePhraseBlockHeight(phrasePx);
      const phraseBaselineY = (SAFE_TOP + PHRASE_TOP_OFFSET + Math.round(PHRASE_BLOCK_H * 0.6)) * SCALE;

      const availW = FRAME_W - GOLD_SIDE_PAD * 2;
      const goldTopPx = SAFE_TOP + PHRASE_TOP_OFFSET + PHRASE_BLOCK_H + GAP_PHRASE_TO_GOLD;
      const availH = Math.max(2, FRAME_H - goldTopPx - SAFE_BOTTOM);
      const scale = Math.min(availW / liveW, availH / liveH);
      const drawW = Math.round(liveW * scale);
      const drawH = Math.round(liveH * scale);
      const goldX = Math.round((FRAME_W - drawW) / 2);
      const goldY = goldTopPx;

      // audio capture
      await Tone.start();
      const rawCtx = (Tone.getContext() as any).rawContext as AudioContext;
      const audioDst = rawCtx.createMediaStreamDestination();
      
        // --- add a silent bed so the audio track has continuous samples ---
const silentOsc = rawCtx.createOscillator();
const silentGain = rawCtx.createGain();
silentGain.gain.value = 0.00001; // nearly silent but non-zero
silentOsc.connect(silentGain).connect(audioDst);
silentOsc.start();

// We'll stop it in hardStop just after rec.stop()

     // sampler from snapshot (no .toDestination() — we'll wire the record bus manually)
const allNoteNames = Array.from(new Set(evtsExport.flatMap(ev => (ev as any).notes || [])));
if (samplerRef.current) { try { samplerRef.current.dispose(); } catch {} samplerRef.current = null; }
{
  const urls: Record<string, string> = {};
  for (const n of allNoteNames) urls[n] = `${n.replace("#", "%23")}.wav`;
  samplerRef.current = new Tone.Sampler({ urls, baseUrl: "/audio/notes/" });
  await Tone.loaded();
}
 // --- route sampler into the recorder's audio destination ---
const recordBus = rawCtx.createGain();
recordBus.gain.value = 1;

// connect sampler to the record bus
try { (samplerRef.current as any).connect(recordBus); } catch {}
// Also feed Tone's master output into the record bus (belt & suspenders)
try { (Tone as any).Destination.connect(recordBus); } catch {}

// connect the record bus into the MediaStream destination (recorder)
recordBus.connect(audioDst);

// optional: also monitor to speakers during export (comment out if you want silence locally)
// try { (samplerRef.current as any).toDestination?.(); } catch {}

      // Route sampler directly into the recorder's destination
try { (samplerRef.current as any).connect(audioDst); } catch {}

      // video stream
      const stream = (canvas as any).captureStream(30) as MediaStream;
      const mixed = new MediaStream([...stream.getVideoTracks(), ...audioDst.stream.getAudioTracks()]);

      // recorder
      function pickRecorderMime(): string {
        const candidates = [
          'video/mp4;codecs="avc1.42E01E,mp4a.40.2"',
          "video/mp4",
          "video/webm;codecs=vp9,opus",
          "video/webm",
        ];
        for (const t of candidates) { try { if ((window as any).MediaRecorder?.isTypeSupported?.(t)) return t; } catch {} }
        return "video/webm";
      }
      const mimeType = pickRecorderMime();
      const chunks: BlobPart[] = [];
      const rec = new MediaRecorder(mixed, { mimeType });
      rec.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
            // embed music fonts into SVG (so stave text renders correctly)
      const fontCss = await buildEmbeddedFontStyle();
      function serializeFullSvg(svgEl: SVGSVGElement, w: number, h: number): string {
        let raw = new XMLSerializer().serializeToString(svgEl);
        if (!/\swidth=/.test(raw))  raw = raw.replace(/<svg([^>]*?)>/, '<svg$1 width="' + w + '">');
        else                        raw = raw.replace(/\swidth="[^"]*"/,  ' width="' + w + '"');
        if (!/\sheight=/.test(raw)) raw = raw.replace(/<svg([^>]*?)>/, '<svg$1 height="' + h + '">');
        else                        raw = raw.replace(/\sheight="[^"]*"/, ' height="' + h + '"');
        if (/<style[^>]*>/.test(raw)) raw = raw.replace(/<style[^>]*>/, (m) => `${m}\n${fontCss}\n`);
        else                           raw = raw.replace(/<svg[^>]*?>/, (m) => `${m}\n<style>${fontCss}</style>\n`);
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
      let currentImg = await svgToImage(serializeFullSvg(liveSvgEl, liveW, liveH));
        // keep the latest stave snapshot here; update it only when visibleIdx changes
      let lastSnapshot: HTMLImageElement = currentImg;

      // ---- Caption (export) font sizing ----
      const captionTokensExport = deriveCaptionTokens(evtsExport as any, exportInput);
      // Build captionFull (with spaces like DOM caption) to measure fitted size
      const captionFull = (() => {
        if (!captionTokensExport.length) return phrase;
        const parts: string[] = [];
        for (let i = 0; i < captionTokensExport.length; i++) {
          const t = captionTokensExport[i].text;
          parts.push(t);
          const needsSpacer = !(t.length === 1 && ".,;:-!?".includes(t));
          if (i < captionTokensExport.length - 1 && needsSpacer) parts.push(" ");
        }
        return parts.join("");
      })();
      function pickCaptionPx(text: string, maxPx: number): number {
        let lo = 14, hi = Math.max(14, maxPx), best = Math.min(maxPx, 18);
        const CAPTION_TARGET = 0.86;
        const maxWidth = FRAME_W * SCALE * CAPTION_TARGET;
        while (lo <= hi) {
          const mid = Math.floor((lo + hi) / 2);
          c.font = `${mid * SCALE}px Inter, system-ui, sans-serif`;
          const w = c.measureText(text).width;
          if (w <= maxWidth) { best = mid; lo = mid + 1; } else { hi = mid - 1; }
        }
        return best;
      }
      const captionPx = pickCaptionPx(captionFull || phrase, phrasePx);

      // caption painter (on canvas)
      function drawCaptionLine(nowSec: number) {
        if (!captionTokensExport.length) return;

        const lastEnd =
          captionTokensExport.length
            ? Math.max(...captionTokensExport.map(t => (t.t ?? 0) + (t.d ?? 0)))
            : 0;

        // find current token by time
        let idx = -1;
        for (let i = 0; i < captionTokensExport.length; i++) {
          const t0 = captionTokensExport[i].t ?? 0;
          const t1 = t0 + (captionTokensExport[i].d ?? 0.5);
          if (nowSec >= t0 && nowSec < t1) { idx = i; break; }
          if (nowSec >= t1) idx = i;
        }

        // build text parts
        const parts: { text: string; role: "past"|"current"|"future" }[] = [];
        for (let i = 0; i < captionTokensExport.length; i++) {
          const t = captionTokensExport[i];
          let role: "past"|"current"|"future";
          if (nowSec >= lastEnd) role = "past";
          else role = (i < idx) ? "past" : (i === idx ? "current" : "future");
          parts.push({ text: t.text, role });
          const needsSpacer = !(t.text.length === 1 && ".,;:-!?".includes(t.text));
          if (i < captionTokensExport.length - 1 && needsSpacer) parts.push({ text: " ", role });
        }

        // draw centered
        c.textAlign = "center";
        c.textBaseline = "middle";
        c.font = `${captionPx * SCALE}px Inter, system-ui, sans-serif`;
        const full = parts.map(p => p.text).join("");
if (!full) return; // nothing to draw
const metrics = c.measureText(full);
const totalWidth = Number.isFinite(metrics.width) ? metrics.width : 0;
if (totalWidth <= 0) return;

        let acc = -totalWidth / 2;
        for (const p of parts) {
          const seg = p.text;
          const segWidth = c.measureText(seg).width;
          if (p.role === "current") {
            c.fillStyle = theme.gold;
            c.shadowColor = "rgba(235,207,122,0.55)";
            c.shadowBlur = 12 * SCALE;
            c.fillText(seg, (FRAME_W * SCALE) / 2 + acc + segWidth / 2, phraseBaselineY);
            c.shadowBlur = 0;
          } else {
            c.fillStyle = theme.text;
            c.globalAlpha = p.role === "past" ? 0.6 : 1.0;
            c.fillText(seg, (FRAME_W * SCALE) / 2 + acc + segWidth / 2, phraseBaselineY);
            c.globalAlpha = 1.0;
          }
          acc += segWidth;
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
        c.drawImage(img, 0, 0, liveW, liveH, goldX * SCALE, goldY * SCALE, drawW * SCALE, drawH * SCALE);

        // watermark
        c.save();
        c.textAlign = "right"; c.textBaseline = "middle";
        c.font = `${22 * SCALE}px Inter, system-ui, sans-serif`;
        c.fillStyle = "rgba(8,16,25,0.96)";
        c.fillText("pianotrainer.app", (goldX + drawW - 18) * SCALE, (goldY + drawH - 14) * SCALE);
        c.restore();
      }

      // start recording
      rec.start();
      console.log("[export] rec.start at", performance.now());

      // duration & loop
const toyLastEnd = evtsExport.reduce((mx, ev) => Math.max(mx, (ev.t ?? 0) + (ev.d ?? 0)), 0);
const sumDur     = evtsExport.reduce((s,  e) => s + (e.d ?? 0), 0);
console.log("[export] toyLastEnd(s)=", toyLastEnd.toFixed(3), "sumDur(s)=", sumDur.toFixed(3));

// create a timers bucket for this export
const timers: number[] = [];

// animation clock and per-second debug logs
const t0 = performance.now();
let lastLoggedSec = -1;

(function loop() {
  const elapsed = (performance.now() - t0) / 1000;
  drawFrame(lastSnapshot, elapsed);
  // log each second to confirm frames are being drawn
  const whole = Math.floor(elapsed);
  if (whole !== (window as any).__lastLoggedSec) {
    console.log("[export] drawing frame at", elapsed.toFixed(2));
    (window as any).__lastLoggedSec = whole;
  }
  if (elapsed < sumDur + 0.2) requestAnimationFrame(loop);
})();

      console.log("[export] first 3 events", evtsExport.slice(0,3).map(e => ({
  t: (e.t ?? 0).toFixed(3),
  d: (e.d ?? 0).toFixed(3),
  kind: (e as any).kind,
  notes: (e as any).notes || []
})));

      // schedule stave advance + audio
for (let i = 0; i < evtsExport.length; i++) {
  const ev = evtsExport[i];
  const startMs = Math.round(1000 * (ev.t ?? (i * 0.6)));

  // advance stave SVG during export (so the snapshot changes)
  const visId = window.setTimeout(async () => {
  setVisibleIdx(i + 1);

  // take a fresh SVG snapshot now that VexFlow re-rendered (next tick)
  try {
    await new Promise<void>(res => requestAnimationFrame(() => res()));
    const liveNow = host.querySelector("svg") as SVGSVGElement | null;
    if (liveNow) {
      lastSnapshot = await svgToImage(serializeFullSvg(liveNow, liveW, liveH));
    }
  } catch {}
}, startMs);
  timers.push(visId);

  // audio from export snapshot (uses ev.notes)
  if ((ev as any).notes && (ev as any).notes.length) {
    const trigId = window.setTimeout(() => {
      try { triggerNow((ev as any).notes, ev.d ?? 0.55); } catch {}
    }, startMs);
    timers.push(trigId);
  }
}

      // stop & collect
      const hardStop = window.setTimeout(() => {
        rec.stop();
        console.log("[export] hardStop at", performance.now());
        try { silentOsc.stop(); } catch {}
  try { (Tone as any).Destination.disconnect(audioDst); } catch {}
        timers.forEach(id => clearTimeout(id));
      }, Math.round(sumDur * 1000 + 200));

      const recorded: Blob = await new Promise((res) => {
        rec.onstop = () => res(new Blob(chunks, { type: mimeType || "video/webm" }));
      });
      window.clearTimeout(hardStop);

      // normalize to mp4 if needed
      async function convertToMp4Server(inputBlob: Blob): Promise<Blob> {
        if (inputBlob.type && inputBlob.type.includes("mp4")) return inputBlob;
        try {
          const resp = await fetch("/api/convert-webm-to-mp4", {
            method: "POST",
            headers: { "Content-Type": inputBlob.type || "application/octet-stream" },
            body: inputBlob,
          });
          if (!resp.ok) throw new Error("server convert failed");
          const out = await resp.blob();
          if (out.size === 0) throw new Error("empty blob");
          return out;
        } catch {
          return inputBlob;
        }
      }
      function buildDownloadName(phrase: string): string {
        const base = (phrase || "clip")
          .normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
          .replace(/[<>:"/\\|?*\x00-\x1F]/g, "")
          .trim().toLowerCase()
          .replace(/[^\p{L}\p{N}]+/gu, "_")
          .replace(/^_+|_+$/g, "")
          .slice(0, 32) || "clip";
        return `${base}.mp4`;
      }

      const mp4Blob = await convertToMp4Server(recorded);
      const a = document.createElement("a");
      a.download = buildDownloadName(phrase);
      a.href = URL.createObjectURL(mp4Blob);
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      console.error("[download] export error:", err);
      try { alert("Could not prepare video. Please try again."); } catch {}
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
    <main style={{ minHeight:"100vh", background:theme.bg, color:theme.text, overflowX:"hidden" }}>
      <div style={{ width:"100%", margin:"0 auto", padding:12, boxSizing:"border-box", maxWidth:520 }}>
        {/* Title */}
        <h1 style={{ margin:"4px 0 8px", fontSize:24, lineHeight:1.25, textAlign:"center", letterSpacing:0.2, fontWeight:800, color:theme.text }}>
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
            {/* input (clipped wrapper to avoid focus bleed) */}
            <div style={{ padding: 2, borderRadius: 10, overflow: "hidden", boxSizing: "border-box" }}>
              <input
                value={phrase}
                onChange={(e)=>setPhrase(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { if (!isPlaying && !overLimit) start(); } }}
                onBlur={() => { if (!isPlaying && !overLimit) start(); }}
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

            <div style={{ fontSize:12, color: overLimit ? theme.warn : theme.muted, marginTop:4 }}>
              Elements: {elementCount} / 20 {overLimit ? " — Limit exceeded. Trim your text." : ""}
            </div>

            {/* Floating caption (live) */}
            {captionTokens.length > 0 && (
              <div style={{ marginTop:6 }}>
                {captionRender}
              </div>
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
              <div ref={staveHostRef} style={{ width:"100%", minHeight:260, display:"block" }} />
              <div style={{ position:"absolute", right:22, bottom:6, color:"#081019", fontSize:12, fontWeight:700, opacity:0.9, userSelect:"none", pointerEvents:"none" }}>
                pianotrainer.app
              </div>
            </div>
          </div>

          {/* Actions */}
          <div style={{ display:"flex", gap:10, justifyContent:"center", flexWrap:"wrap" }}>
            <button
              onClick={() => !isPlaying && !overLimit && start()}
              disabled={overLimit}
              title={overLimit ? "Reduce to 20 elements to play" : "Play"}
              style={{
                background: overLimit ? "#2A3442" : theme.gold,
                color: overLimit ? "#6B7280" : "#081019",
                border:"none",
                borderRadius:999,
                padding:"10px 16px",
                fontWeight:700,
                cursor: overLimit ? "not-allowed" : "pointer",
                fontSize:16,
                minHeight:40
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
                border:"none",
                borderRadius:999,
                padding:"10px 16px",
                fontWeight:700,
                cursor: overLimit ? "not-allowed" : "pointer",
                fontSize:16,
                minHeight:40
              }}
            >
              💾 Save
            </button>

            <button
              onClick={() => setShareOpen(true)}
              title="Share"
              style={{
                background:"transparent",
                color:theme.gold,
                border:"none",
                borderRadius:999,
                padding:"10px 16px",
                fontWeight:700,
                cursor:"pointer",
                fontSize:16,
                minHeight:40
              }}
            >
              📤 Share
            </button>
          </div>

          {/* Share modal (same UX as other toys) */}
          {shareOpen && (
            <div
              role="dialog"
              aria-modal="true"
              style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.6)", display:"flex", alignItems:"flex-end", justifyContent:"center", zIndex:9999 }}
              onClick={() => setShareOpen(false)}
            >
              <div
                style={{ width:"100%", maxWidth:520, background:"#0F1821", borderTop:`1px solid ${theme.border}`, borderLeft:`1px solid ${theme.border}`, borderRight:`1px solid ${theme.border}`, borderRadius:"12px 12px 0 0", padding:12, boxSizing:"border-box" }}
                onClick={(e) => e.stopPropagation()}
              >
                <div style={{ textAlign:"center", color:theme.text, fontWeight:800, marginBottom:8 }}>
                  Share your melody
                </div>

                {/* Copy Link */}
                <button
                  onClick={async () => {
                    const url = buildShareUrl();
                    try {
                      await navigator.clipboard.writeText(url);
                      setShareOpen(false);
                      setLinkCopied(true);
                      setTimeout(() => setLinkCopied(false), 1600);
                    } catch {
                      alert(url);
                    }
                  }}
                  style={{ width:"100%", padding:"10px 12px", marginBottom:6, background:theme.gold, color:"#081019", borderRadius:8, border:"none", fontWeight:800 }}
                >
                  🔗 Copy Link
                </button>

                {/* X / Twitter */}
                <a
                  href={buildTweetIntent(
                    `My text → melody: ${phrase.trim() || "my text"}`,
                    buildShareUrl()
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setShareOpen(false)}
                  style={{ display:"block", textAlign:"center", width:"100%", padding:"10px 12px", marginBottom:6, background:"transparent", color:theme.gold, borderRadius:8, border:`1px solid ${theme.border}`, textDecoration:"none", fontWeight:800 }}
                >
                  𝕏 Share on X
                </a>

                {/* TikTok */}
                <button
                  onClick={() => {
                    alert("Tap Save first, then post the clip in TikTok.");
                    const isMobile = /Android|iPhone|iPad/i.test(navigator.userAgent);
                    if (isMobile) { try { window.location.href = "tiktok://"; } catch {} }
                    else { window.open("https://studio.tiktok.com", "_blank", "noopener,noreferrer"); }
                    setShareOpen(false);
                  }}
                  style={{ width:"100%", padding:"10px 12px", marginBottom:6, background:"transparent", color:theme.gold, borderRadius:8, border:`1px solid ${theme.border}`, fontWeight:800 }}
                >
                  🎵 Post to TikTok (save then upload)
                </button>

                {/* Instagram Reels */}
                <button
                  onClick={() => {
                    alert("Tap Save first, then open Instagram → Reels → upload.");
                    const isMobile = /Android|iPhone|iPad/i.test(navigator.userAgent);
                    if (isMobile) { try { window.location.href = "instagram://camera"; } catch {} }
                    else { window.open("https://www.instagram.com/create/reel/", "_blank", "noopener,noreferrer"); }
                    setShareOpen(false);
                  }}
                  style={{ width:"100%", padding:"10px 12px", background:"transparent", color:theme.gold, borderRadius:8, border:`1px solid ${theme.border}`, fontWeight:800 }}
                >
                  📸 Post to Instagram Reels (save then upload)
                </button>

                <button
                  onClick={() => setShareOpen(false)}
                  style={{ width:"100%", padding:"8px 12px", marginTop:8, background:"#0B0F14", color:theme.muted, borderRadius:8, border:`1px solid ${theme.border}`, fontWeight:700 }}
                >
                  Close
                </button>
              </div>
            </div>
          )}

          {/* Copy toast */}
          {linkCopied && (
            <div style={{ color: "#69D58C", fontSize: 12, fontWeight: 600, textAlign: "right", width: "100%" }}>
              Link copied!
            </div>
          )}
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


