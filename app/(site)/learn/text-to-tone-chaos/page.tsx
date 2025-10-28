// app/learn/text-to-tone-chaos/page.tsx
"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Renderer, Stave, StaveNote, Formatter, Voice, StaveConnector } from "vexflow";
import * as Tone from "tone";
import Link from "next/link";
import { buildEvents, type TextToneEvent } from "@/lib/text-to-tone/buildEvents";

const theme = {
  bg: "#0B0F14",
  text: "#E6EBF2",
  gold: "#EBCF7A",
  border: "#1E2935",
  card: "#111820",
  muted: "#8B94A7",
  warn: "#F87171",   // add this
};
const MAX_ELEMENTS = 40;

// ---------- helpers ----------
function noteNameToMidi(n: string) {
  const m = /^([A-Ga-g])([#b]?)(-?\d+)$/.exec(n) || /^([a-g])([#b]?)\/(-?\d+)$/.exec(n);
  if (!m) throw new Error("bad note: "+n);
  const L = m[1].toUpperCase(); const acc = m[2] || ""; const oct = parseInt(m[3],10);
  const BASE: Record<string, number> = { C:0,D:2,E:4,F:5,G:7,A:9,B:11 };
  let pc = BASE[L]; if (acc==="#") pc=(pc+1)%12; else if (acc==="b") pc=(pc+11)%12;
  return (oct+1)*12 + pc;
}
function noteToVFKey(n: string) { const m = /^([A-Ga-g])([#b]?)(-?\d+)$/.exec(n)!; return `${(m[1]+(m[2]||"")).toLowerCase()}/${m[3]}`; }

function seededRand(seed: number) { return () => { seed = (seed*1664525 + 1013904223) >>> 0; return seed / 0xFFFFFFFF; }; }
function phraseSeed(s: string){ let h=2166136261|0; for(let i=0;i<s.length;i++){ h^=s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h>>>0); }

// Letters-only major transform: C F G -> C# F# G#
function toAMajor(note: string){
  const m = /^([A-G])([#b]?)(\d)$/.exec(note);
  if (!m) return note;
  const pc = m[1], acc = m[2], oct = m[3];
  if (acc) return note; // already sharp
  if (pc==="C" || pc==="F" || pc==="G") return `${pc}#${oct}`;
  return note;
}

// Spread letters across A2–A4 with stable randomness
function chaosizeLetter(note: string, rng: () => number){
  const pcs = /^([A-G])([#b]?)(\d)$/.exec(note);
  if (!pcs) return note;
  const basePc = pcs[1] + (pcs[2]||"");
  const targetOct = 2 + Math.floor(rng()*3); // 2,3,4
  return `${basePc}${targetOct}`;
}

// sanitation
function sanitize(s: string){
  return s
    .replace(/\u2014|\u2013/g,"-")
    .replace(/\.{3,}/g,"...")
    .replace(/[^A-Za-z0-9 .,;?\-!'/%+=:@#$()&]+/g,"");
}

// ---------- caption model ----------
type CaptionToken = { text: string; t: number; d: number };

// Map events -> caption tokens.
// - Melody: next real letter from phrase letters stream
// - Chords/rests: use ev.label (%/digits/punct) or a subtle tick "·" for rests
function deriveCaptionTokens(events: TextToneEvent[], srcPhrase: string): CaptionToken[] {
  const lettersSeq = (srcPhrase || "").replace(/[^A-Za-z]/g, "").toUpperCase();
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
    // chord
    let text = ev.label || "♩";
    if (text.startsWith("%")) text = "%";
    tokens.push({ text, t: ev.t ?? 0, d: ev.d ?? 0.6 });
  }
  return tokens;
}

export default function ChaosTextToTonePage(){
  const [phrase, setPhrase] = useState("");
  const [lettersScale, setLettersScale] = useState<"minor"|"major">("minor");

  // stave + audio events for display (not used for scheduling)
  const [events, setEvents] = useState<TextToneEvent[]>([]);
  const [visibleIdx, setVisibleIdx] = useState(0);
  const hostRef = useRef<HTMLDivElement|null>(null);

  // caption tokens + live index
  const [captionTokens, setCaptionTokens] = useState<CaptionToken[]>([]);
  const [captionIdx, setCaptionIdx] = useState(0);

  // UI state
  const [isPlaying,setIsPlaying] = useState(false);
  const [showInput, setShowInput] = useState(true);

  // audio
  const samplerRef = useRef<Tone.Sampler|null>(null);
  const timeoutsRef = useRef<number[]>([]);
  const isPlayingRef = useRef(false);

  const clearTimers = () => { timeoutsRef.current.forEach(id=>clearTimeout(id)); timeoutsRef.current=[]; };

  // derive element count for guard (from eventization)
  const elementCount = useMemo(() => {
    const ev = buildEvents(sanitize(phrase)).events;
    return ev.length;
  }, [phrase]);

  const overLimit = elementCount > MAX_ELEMENTS;

  // copy link (phrase + lettersScale)
  const copyLink = useCallback(async () => {
    const url = new URL(window.location.href);
    url.searchParams.set("phrase", phrase);
    url.searchParams.set("lettersScale", lettersScale);
    try {
      await navigator.clipboard.writeText(url.toString());
      alert("Link copied!");
    } catch {
      alert(url.toString());
    }
  }, [phrase, lettersScale]);

  // build + apply chaos/scale to letters only, AND derive caption tokens (for display)
  const rebuild = useCallback((src: string)=>{
    const { events: base } = buildEvents(src);
    const rng = seededRand(phraseSeed(src));

    const transformed = base.map(ev=>{
      if (ev.kind==="MELODY"){
        let n = ev.notes[0];
        if (lettersScale==="major") n = toAMajor(n); // letters-only major
        n = chaosizeLetter(n, rng);
        return { ...ev, notes: [n] };
      }
      return ev;
    });

    setEvents(transformed);
    setVisibleIdx(0);
    setCaptionIdx(0);
    setCaptionTokens(deriveCaptionTokens(transformed, src));
  }, [lettersScale]);

  // audio helpers
  async function ensureSampler(evts: TextToneEvent[]){
    if (samplerRef.current){ try{ samplerRef.current.dispose(); }catch{} samplerRef.current=null; }
    const urls: Record<string,string> = {};
    for (const e of evts){
      if (e.kind !== "REST") for (const n of e.notes) urls[n] = `${n.replace("#","%23")}.wav`;
    }
    samplerRef.current = new Tone.Sampler({ urls, baseUrl: "/audio/notes/" }).toDestination();
    await Tone.loaded();
  }
  function triggerNow(notes:string[], seconds:number){
    const s = samplerRef.current; if(!s || !notes.length) return;
    try { (s as any).triggerAttackRelease(notes, Math.max(0.12, seconds*0.9)); } catch {}
  }

  const start = useCallback(async ()=>{
    if (isPlaying || overLimit) return;

    const input = sanitize(phrase);

    // Build fresh local snapshot for THIS run (avoid "memory")
    const { events: base } = buildEvents(input);
    const rng = seededRand(phraseSeed(input));
    const localEvts: TextToneEvent[] = base.map(ev=>{
      if (ev.kind==="MELODY"){
        let n = ev.notes[0];
        if (lettersScale==="major") n = toAMajor(n);
        n = chaosizeLetter(n, rng);
        return { ...ev, notes:[n] };
      }
      return ev;
    });

    // Prepare UI state (display) from this snapshot
    setEvents(localEvts);
    setVisibleIdx(0);
    setCaptionIdx(0);
    setCaptionTokens(deriveCaptionTokens(localEvts, input));

    // Audio
    await Tone.start();
    await ensureSampler(localEvts);

    // Lock UI during play
    setShowInput(false);
    setIsPlaying(true);
    isPlayingRef.current = true;
    clearTimers();

    const timers:number[] = [];
    const lastEnd = localEvts.reduce((mx,e)=>Math.max(mx,(e.t??0)+(e.d??0)),0);

    for (let i=0;i<localEvts.length;i++){
      const ev = localEvts[i];
      const startMs = Math.max(0, Math.round((ev.t ?? 0)*1000));

      // caption advance (token i becomes current)
      timers.push(window.setTimeout(()=>{
        if(!isPlayingRef.current) return;
        setCaptionIdx(i+1); // 1..N (current index is i)
      }, startMs));

      // stave reveal
      timers.push(window.setTimeout(()=>{
        if(!isPlayingRef.current) return;
        setVisibleIdx(i+1);
      }, startMs));

      // audio
      if (ev.kind!=="REST" && ev.notes.length){
        timers.push(window.setTimeout(()=>{
          if(!isPlayingRef.current) return;
          triggerNow(ev.notes, ev.d ?? 0.55);
        }, startMs));
      }
    }

    // stop slightly after the last event (and ensure caption doesn't linger gold)
    timers.push(window.setTimeout(()=>{
      if (!isPlayingRef.current) return;
      clearTimers();
      setVisibleIdx(localEvts.length);
      setCaptionIdx(localEvts.length); // no "current" at end
      setIsPlaying(false);
      isPlayingRef.current = false;
      setShowInput(true); // show input again
    }, Math.round((lastEnd+0.2)*1000)));

    timeoutsRef.current.push(...timers);
  }, [phrase, lettersScale, isPlaying, overLimit]);

  const stop = useCallback(()=>{
    clearTimers();
    setIsPlaying(false);
    isPlayingRef.current=false;
    setShowInput(true);
    // ensure caption doesn't linger highlighted
    setCaptionIdx(captionTokens.length);
  },[captionTokens.length]);

  // rebuild when toggling scale
  useEffect(()=>{ rebuild(sanitize(phrase)); }, [lettersScale]); // eslint-disable-line

  // restore from URL
  useEffect(()=>{ const sp = new URLSearchParams(window.location.search);
    const p = sp.get("phrase") || ""; const ls = (sp.get("lettersScale") as any) || "minor";
    setPhrase(p); if (ls==="major"||ls==="minor") setLettersScale(ls);
    rebuild(sanitize(p));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[]);

  // caption text rendering (DOM) --------------------------------
  const captionRender = useMemo(()=>{
    if (!captionTokens.length) return null;

    // Determine current token index for highlight (0..N-1). If not playing, no "current".
    const currentIndex = isPlaying ? Math.max(0, captionIdx - 1) : -1;

    const parts: { text: string; role: "past" | "current" | "future"; key: string }[] = [];
    for (let i = 0; i < captionTokens.length; i++) {
      const t = captionTokens[i];
      let role: "past" | "current" | "future";
      if (!isPlaying) {
        // not playing: all past (no golden linger)
        role = "past";
      } else {
        role = i < currentIndex ? "past" : i === currentIndex ? "current" : "future";
      }
      parts.push({ text: t.text, role, key: `cap-${i}-${t.text}` });
      // optional thin spacer for readability (skip between punctuation)
      const needsSpacer = !(t.text.length === 1 && ".,;:-!?".includes(t.text));
      if (i < captionTokens.length - 1 && needsSpacer) {
        parts.push({ text: " ", role, key: `sp-${i}` });
      }
    }

    return (
      <div
        aria-live="off"
        style={{
          width:"100%", textAlign:"center", margin:"6px 0 8px",
          fontSize:18, lineHeight:1.5, letterSpacing:0.2
        }}
      >
        {parts.map((p) => {
          const base: React.CSSProperties = {
            transition: "opacity 120ms ease, text-shadow 120ms ease, color 120ms ease",
            opacity: p.role === "past" ? 0.6 : 1.0,
          };
          const style: React.CSSProperties =
            p.role === "current"
              ? { ...base, color: theme.gold, fontWeight: 800, textShadow: "0 0 12px rgba(235,207,122,0.55)" }
              : p.role === "past"
              ? { ...base, color: theme.text, fontWeight: 600 }
              : { ...base, color: theme.text };
          if (p.text === "·" && p.role !== "current") style.opacity = 0.4;
          return <span key={p.key} style={style}>{p.text}</span>;
        })}
      </div>
    );
  }, [captionTokens, captionIdx, isPlaying]);

  // render stave
  useEffect(()=>{
    const host = hostRef.current; if(!host) return;
    host.innerHTML="";
    const rect = host.getBoundingClientRect();
    const width = Math.floor(rect.width), height = 260;

    const renderer = new Renderer(host, Renderer.Backends.SVG);
    renderer.resize(width, height);
    const ctx = renderer.getContext();

    const keySpec = lettersScale === "major" ? "A" : "Am";

    let LEFT=20, RIGHT=28; if (width<=390){ LEFT=16; RIGHT=18;} if (width<=360){ LEFT=14; RIGHT=16;} if (width<=344){ LEFT=12; RIGHT=14;}
    const innerWidth = width-LEFT-RIGHT, trebleY=16, bassY=120;

    const treble = new Stave(LEFT, trebleY, innerWidth);
    treble.addClef("treble").addKeySignature(keySpec).setContext(ctx).draw();

    const bass = new Stave(LEFT, bassY, innerWidth);
    bass.addClef("bass").addKeySignature(keySpec).setContext(ctx).draw();

    const Type = (StaveConnector as any).Type ?? (StaveConnector as any).type ?? {};
    new (StaveConnector as any)(treble,bass).setType(Type.BRACE).setContext(ctx).draw();
    new (StaveConnector as any)(treble,bass).setType(Type.SINGLE_LEFT).setContext(ctx).draw();
    new (StaveConnector as any)(treble,bass).setType(Type.SINGLE_RIGHT).setContext(ctx).draw();

    if(!events.length || visibleIdx===0) return;
    const vis = events.slice(0, visibleIdx);

    const MIDI_B4 = noteNameToMidi("B4"), MIDI_D3 = noteNameToMidi("D3");
    const vf = (n:string)=>noteToVFKey(n);
    const stemTreble = (keys:string[]) => Math.max(...keys.map(k=>noteNameToMidi(k)))>MIDI_B4 ? -1 : 1;
    const stemBass   = (keys:string[]) => Math.max(...keys.map(k=>noteNameToMidi(k)))>MIDI_D3 ? -1 : 1;

    const trebleNotes:any[] = [], bassNotes:any[] = [];
    for (const e of vis){
      const dur = "q";
      if (e.kind==="REST"){
        bassNotes.push(new StaveNote({ keys:["d/3"], duration:`${dur}r`, clef:"bass" }));
        continue;
      }
      const keys = e.notes.map(vf);
      const tre = keys.filter(k=>parseInt(k.split("/")[1],10)>=4);
      const bas = keys.filter(k=>parseInt(k.split("/")[1],10)<4);
      if (tre.length) trebleNotes.push(new StaveNote({ keys:tre, duration:dur, clef:"treble", stemDirection:stemTreble(tre) }));
      if (bas.length) bassNotes.push(new StaveNote({ keys:bas, duration:dur, clef:"bass", stemDirection:stemBass(bas) }));
    }

    if (trebleNotes.length){
      const v = new Voice({ numBeats: Math.max(1, trebleNotes.length), beatValue:4 }).setStrict(false);
      v.addTickables(trebleNotes); new Formatter().joinVoices([v]).formatToStave([v], treble); v.draw(ctx, treble);
    }
    if (bassNotes.length){
      const v = new Voice({ numBeats: Math.max(1, bassNotes.length), beatValue:4 }).setStrict(false);
      v.addTickables(bassNotes); new Formatter().joinVoices([v]).formatToStave([v], bass); v.draw(ctx, bass);
    }
  }, [events, visibleIdx, lettersScale]);

  return (
    <main style={{ minHeight:"100vh", background:theme.bg, color:theme.text }}>
      <div style={{ maxWidth:760, margin:"0 auto", padding:12 }}>
        <h1 style={{ margin:"6px 0 8px" }}>TextToTone: Chaos Mode</h1>
        <p style={{ margin:"6px 0 14px", opacity:.9 }}>
          Letters toggle between A minor / A major while numbers and symbols stay in A minor. Melody is spread across A2–A4 for a controlled-chaos texture.
        </p>

        <div style={{ background:theme.card, border:`1px solid ${theme.border}`, borderRadius:12, padding:12 }}>
          <div style={{ display:"flex", gap:8, alignItems:"center", marginBottom:8 }}>
            {showInput ? (
              <>
                <input
                  value={phrase}
                  onChange={e=>setPhrase(e.target.value)}
                  placeholder="Type words, numbers, symbols..."
                  style={{ flex:1, padding:"10px 12px", borderRadius:8, border:`1px solid ${theme.border}`, background:"#0F1821", color:theme.gold, fontSize:16 }}
                />
              
              </>
            ) : (
              <div style={{ flex:1, padding:"10px 12px", borderRadius:8, border:`1px solid ${theme.border}`, background:"#0F1821", color:theme.muted, fontStyle:"italic" }}>
                performing…
              </div>
            )}
          </div>

          {/* Element limit warning */}
          <div style={{ minHeight:18, marginTop:-6, marginBottom:6, fontSize:12 }}>
            {overLimit ? (
              <span style={{ color: theme.warn, fontWeight: 700 }}>
                Limit is {MAX_ELEMENTS} elements. Trim your text to play.
              </span>
            ) : null}
          </div>

          {/* Floating caption (live, synced with events) */}
          {captionRender}

          <div style={{ background:theme.gold, borderRadius:10, padding:10 }}>
            <div ref={hostRef} style={{ width:"100%", minHeight:260 }} />
          </div>

          <div style={{ display:"flex", gap:8, marginTop:8 }}>
            <button
              onClick={()=>isPlaying?stop():start()}
              disabled={overLimit}
              style={{
                padding:"10px 14px", borderRadius:8, border:"none",
                background: overLimit ? "#2A3442" : theme.gold,
                color: overLimit ? "#6B7280" : "#081019",
                fontWeight:800, cursor: overLimit ? "not-allowed" : "pointer"
              }}
              title={overLimit ? "Reduce to 20 elements to play" : "Play"}
            >
              {isPlaying ? "Stop" : "Play"}
            </button>
            <button onClick={copyLink} style={{ padding:"10px 14px", borderRadius:8, border:`1px solid ${theme.border}`, background:"transparent", color:theme.text, fontWeight:800 }}>
              Copy Link
            </button>
            <Link href="/toys/text-to-tone" style={{ marginLeft:"auto", color:theme.gold, textDecoration:"none", fontWeight:800 }}>
              Compare to Viral →
            </Link>
          </div>
          <select
                  value={lettersScale}
                  onChange={e=>setLettersScale(e.target.value as any)}
                  style={{ padding:"10px 12px", borderRadius:8, border:`1px solid ${theme.border}`, background:"#0F1821", color:theme.text }}
                  title="Letters scale (chords stay A minor)"
                >
                  <option value="minor">Letters: A minor</option>
                  <option value="major">Letters: A major</option>
                </select>
        </div>
      </div>
    </main>
  );
}