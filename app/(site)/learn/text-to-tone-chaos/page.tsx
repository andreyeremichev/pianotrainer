// app/learn/text-to-tone-chaos/page.tsx
"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Renderer, Stave, StaveNote, Formatter, Voice, StaveConnector } from "vexflow";
import * as Tone from "tone";
import Link from "next/link";
import { buildEvents, type TextToneEvent } from "@/lib/text-to-tone/buildEvents";



const theme = { bg:"#0B0F14", text:"#E6EBF2", gold:"#EBCF7A", border:"#1E2935", card:"#111820" };

function noteNameToMidi(n: string) {
  const m = /^([A-Ga-g])([#b]?)(-?\d+)$/.exec(n) || /^([a-g])([#b]?)\/(-?\d+)$/.exec(n);
  if (!m) throw new Error("bad note: "+n);
  const L = m[1].toUpperCase(); const acc = m[2] || ""; const oct = parseInt(m[3],10);
  const BASE: Record<string, number> = { C:0,D:2,E:4,F:5,G:7,A:9,B:11 };
  let pc = BASE[L]; if (acc==="#") pc=(pc+1)%12; else if (acc==="b") pc=(pc+11)%12;
  return (oct+1)*12 + pc;
}
function noteToVFKey(n: string) { const m = /^([A-Ga-g])([#b]?)(-?\d+)$/.exec(n)!; return `${(m[1]+(m[2]||"")).toLowerCase()}/${m[3]}`; }

// chaos helpers
function seededRand(seed: number) { return () => { seed = (seed*1664525 + 1013904223) >>> 0; return seed / 0xFFFFFFFF; }; }
function phraseSeed(s: string){ let h=2166136261|0; for(let i=0;i<s.length;i++){ h^=s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h>>>0); }

// Letters-only major transform: C F G -> C# F# G#
function toAMajor(note: string){
  const m = /^([A-G])([#b]?)(\d)$/.exec(note);
  if (!m) return note;
  const pc = m[1], acc = m[2], oct = m[3];
  if (acc) return note; // already sharp (we only sharpen naturals)
  if (pc==="C" || pc==="F" || pc==="G") return `${pc}#${oct}`;
  return note;
}

// Spread letters across A2–A4 with stable randomness
function chaosizeLetter(note: string, rng: () => number){
  const pcs = /^([A-G])([#b]?)(\d)$/.exec(note);
  if (!pcs) return note;
  const basePc = pcs[1] + (pcs[2]||"");
  const baseOct = parseInt(pcs[3],10);
  const targetOct = 2 + Math.floor(rng()*3); // 2,3,4
  return `${basePc}${targetOct}`;
}

export default function ChaosTextToTonePage(){
  const [phrase, setPhrase] = useState("");
  // letters scale: "minor" or "major" (numbers/symbols stay in A minor)
  const [lettersScale, setLettersScale] = useState<"minor"|"major">("minor");

  const [events, setEvents] = useState<TextToneEvent[]>([]);
  const [visibleIdx, setVisibleIdx] = useState(0);
  const hostRef = useRef<HTMLDivElement|null>(null);

  // audio
  const samplerRef = useRef<Tone.Sampler|null>(null);
  const timeoutsRef = useRef<number[]>([]);
  const isPlayingRef = useRef(false);
  const [isPlaying,setIsPlaying] = useState(false);

  const clearTimers = () => { timeoutsRef.current.forEach(id=>clearTimeout(id)); timeoutsRef.current=[]; };
  const sanitize = (s:string)=> s.replace(/\u2014|\u2013/g,"-").replace(/\.{3,}/g,"...").replace(/[^A-Za-z0-9 .,;?\-!'/%+=:@#$()&]+/g,"");

  // build + apply chaos/scale to letters only
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
      return ev; // numbers/symbols unchanged (A minor chords etc.)
    });
    setEvents(transformed);
    setVisibleIdx(0);
  }, [lettersScale]);

  // audio helpers
  async function ensureSampler(evts: TextToneEvent[]){
    if (samplerRef.current){ try{ samplerRef.current.dispose(); }catch{} samplerRef.current=null; }
    const urls: Record<string,string> = {};
    for (const e of evts) for (const n of (e.notes||[])) urls[n] = `${n.replace("#","%23")}.wav`;
    samplerRef.current = new Tone.Sampler({ urls, baseUrl: "/audio/notes/" }).toDestination();
    await Tone.loaded();
  }
  function triggerNow(notes:string[], seconds:number){
    const s = samplerRef.current; if(!s || !notes.length) return;
    try { (s as any).triggerAttackRelease(notes, Math.max(0.12, seconds*0.9)); } catch {}
  }

  const start = useCallback(async ()=>{
    if (isPlaying) return;
    const input = sanitize(phrase);
    rebuild(input);
    await Tone.start();
    await ensureSampler(events);
    setIsPlaying(true); isPlayingRef.current = true; clearTimers();

    const timers:number[] = [];
    const lastEnd = events.reduce((mx,e)=>Math.max(mx,(e.t??0)+(e.d??0)),0);

    for (let i=0;i<events.length;i++){
      const ev = events[i];
      const startMs = Math.max(0, Math.round((ev.t ?? 0)*1000));
      timers.push(window.setTimeout(()=>{ if(!isPlayingRef.current) return; setVisibleIdx(i+1); }, startMs));
      if (ev.kind!=="REST" && ev.notes.length){
        timers.push(window.setTimeout(()=>{ if(!isPlayingRef.current) return; triggerNow(ev.notes, ev.d ?? 0.55); }, startMs));
      }
    }
    timers.push(window.setTimeout(()=>{ if(!isPlayingRef.current) return; clearTimers(); setVisibleIdx(events.length); setIsPlaying(false); isPlayingRef.current=false; }, Math.round((lastEnd+0.2)*1000)));
    timeoutsRef.current.push(...timers);
  }, [phrase, events, isPlaying, rebuild]);

  const stop = useCallback(()=>{ clearTimers(); setIsPlaying(false); isPlayingRef.current=false; },[]);

  // initial rebuild when toggling scale
  useEffect(()=>{ rebuild(sanitize(phrase)); }, [lettersScale]); // eslint-disable-line

  // copy link
  const copyLink = useCallback(async ()=>{
    const url = new URL(window.location.href);
    url.searchParams.set("phrase", phrase);
    url.searchParams.set("lettersScale", lettersScale);
    try{ await navigator.clipboard.writeText(url.toString()); alert("Link copied!"); }catch{ alert(url.toString()); }
  }, [phrase, lettersScale]);

  // restore from URL
  useEffect(()=>{ const sp = new URLSearchParams(window.location.search);
    const p = sp.get("phrase") || ""; const ls = (sp.get("lettersScale") as any) || "minor";
    setPhrase(p); if (ls==="major"||ls==="minor") setLettersScale(ls);
    rebuild(sanitize(p));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[]);

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
      if (bas.length) bassNotes.push(new StaveNote({ keys:bas, duration:dur, clef:"bass",   stemDirection:stemBass(bas)   }));
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
            <input
              value={phrase}
              onChange={e=>setPhrase(e.target.value)}
              placeholder="Type words, numbers, symbols..."
              style={{ flex:1, padding:"10px 12px", borderRadius:8, border:`1px solid ${theme.border}`, background:"#0F1821", color:theme.gold, fontSize:16 }}
            />
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

          <div style={{ display:"flex", gap:8, marginBottom:8 }}>
            <button onClick={()=>isPlaying?stop():start()} style={{ padding:"10px 14px", borderRadius:8, border:"none", background:theme.gold, color:"#081019", fontWeight:800 }}>
              {isPlaying ? "Stop" : "Play"}
            </button>
            <button onClick={copyLink} style={{ padding:"10px 14px", borderRadius:8, border:`1px solid ${theme.border}`, background:"transparent", color:theme.text, fontWeight:800 }}>
              Copy Link
            </button>
            <Link href="/viral/text-to-tone" style={{ marginLeft:"auto", color:theme.gold, textDecoration:"none", fontWeight:800 }}>
              Compare to Viral →
            </Link>
          </div>

          <div style={{ background:theme.gold, borderRadius:10, padding:10 }}>
            <div ref={hostRef} style={{ width:"100%", minHeight:260 }} />
          </div>
        </div>
      </div>
    </main>
  );
}