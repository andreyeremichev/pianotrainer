"use client";

import React, {useCallback, useEffect, useMemo, useRef, useState} from "react";
import * as Tone from "tone";
import {Renderer, Stave, StaveNote, Formatter, Voice, StaveConnector} from "vexflow";
import Link from "next/link";

/* Theme */
const theme = {
  bg:"#0B0F14", card:"#111820", border:"#1E2935", text:"#E6EBF2", muted:"#8B94A7", gold:"#EBCF7A", green:"#69D58C",
};

const MAX_LETTERS = 20;
type KeyName = "Aminor" | "Amajor";

/* Helpers */
function sanitizePhraseInput(s:string){ return s.replace(/[^A-Za-z ]+/g,""); }
function countLetters(s:string){ return (s.match(/[A-Za-z]/g)||[]).length; }
function trimToMaxLetters(raw:string, max:number){
  let letters=0, out=""; for (const ch of raw){ if (/[A-Za-z]/.test(ch)){ if (letters>=max) break; letters++; out+=ch; } else if (ch===" ") out+=ch; }
  return out;
}
function ctaPieces(phrase:string){ const inside=trimToMaxLetters(sanitizePhraseInput(phrase),MAX_LETTERS)||"your words"; return {t1:"Turn “",t2:inside,t3:"” into sound"}; }
function arrayBufferToBase64(buf:ArrayBuffer){ let b=""; const by=new Uint8Array(buf); for(let i=0;i<by.byteLength;i++) b+=String.fromCharCode(by[i]); return btoa(b); }
async function fetchFontDataUrlOTF(path:string){ const r=await fetch(path,{cache:"no-cache"}); if(!r.ok) throw new Error(path); return `url('data:font/opentype;base64,${arrayBufferToBase64(await r.arrayBuffer())}') format('opentype')`; }
async function buildEmbeddedFontStyle(){
  let brav="", bravT=""; try{ brav=await fetchFontDataUrlOTF("/fonts/Bravura.otf"); bravT=await fetchFontDataUrlOTF("/fonts/BravuraText.otf"); }catch(e){ console.warn("font embed failed",e); }
  return `
  @font-face{font-family:'Bravura';src:${brav||"local('Bravura')"};font-weight:normal;font-style:normal;font-display:swap;}
  @font-face{font-family:'BravuraText';src:${bravT||"local('BravuraText')"};font-weight:normal;font-style:normal;font-display:swap;}
  svg,svg *{font-family:Bravura,BravuraText,serif!important;}
  `.trim();
}
function raf2(){ return new Promise<void>(res=>requestAnimationFrame(()=>requestAnimationFrame(()=>res()))); }

/* Mapping */
function alphaIndex(ch:string){ return ch.toUpperCase().charCodeAt(0)-65; }
function letterToDegree(ch:string){ return ((alphaIndex(ch)%7)+1) as 1|2|3|4|5|6|7; }
const A_MINOR = ["A","B","C","D","E","F","G"] as const;
const A_MAJOR = ["A","B","C#","D","E","F#","G#"] as const;
function degreeToPC(deg:1|2|3|4|5|6|7, key:KeyName){ return key==="Aminor" ? A_MINOR[deg-1] : A_MAJOR[deg-1]; }
function noteNameToMidi(n:string){
  const m=/^([A-Ga-g])([#b]?)(-?\d+)$/.exec(n); if(!m) throw new Error("bad note");
  const L=m[1].toUpperCase(), acc=m[2], oct=parseInt(m[3],10);
  const BASE:{[k:string]:number}={C:0,D:2,E:4,F:5,G:7,A:9,B:11};
  let pc=BASE[L]; if(acc==="#") pc=(pc+1)%12; else if(acc==="b") pc=(pc+11)%12;
  return (oct+1)*12+pc;
}
function noteNameToVF(note:string){ const m=/^([A-Ga-g])([#b]?)(-?\d+)$/.exec(note)!; const l=m[1].toLowerCase(), a=(m[2]||"") as ""|"#"|"b", o=parseInt(m[3],10); return {vfKey:`${a?l+a:l}/${o}`}; }
function pitchClassToOct(pc:string, baseOct:number){ const l=pc[0]; return (l==="C"||l==="D"||l==="E"||l==="F"||l==="G")? baseOct+1 : baseOct; }
type Mapped = { note:string; vfKey:string; clef:"treble"|"bass"; midi:number };
function letterToNoteName(ch:string, key:KeyName){ const deg=letterToDegree(ch), base=2+Math.floor(alphaIndex(ch)/7); const pc=degreeToPC(deg,key), oct=pitchClassToOct(pc,base); return `${pc}${oct}`; }
function mapPhraseToNotes(phrase:string, key:KeyName):Mapped[]{
  const letters=(phrase.match(/[A-Za-z]/g)||[]).slice(0,MAX_LETTERS);
  return letters.map(ch=>{
    const note=letterToNoteName(ch,key); const {vfKey}=noteNameToVF(note); const midi=noteNameToMidi(note);
    const oct=parseInt(vfKey.split("/")[1],10); const clef=oct>=4?"treble":"bass";
    return {note,vfKey,clef,midi};
  });
}

/* Component */
export default function WordsToNotesViralPage(){
  const [keyName] = useState<KeyName>("Aminor");
  const [phrase,setPhrase]=useState(""); const lettersCount=useMemo(()=>countLetters(phrase),[phrase]); const canPlay=lettersCount>0&&lettersCount<=MAX_LETTERS;
  const [lastEnterAt,setLastEnterAt]=useState(0);
  const [isPlaying,setIsPlaying]=useState(false); const isPlayingRef=useRef(false); useEffect(()=>{isPlayingRef.current=isPlaying;},[isPlaying]);
  const [mappedNotes,setMappedNotes]=useState<Mapped[]>([]); const [visibleCount,setVisibleCount]=useState(0);
  const staveHostRef=useRef<HTMLDivElement|null>(null);
  const [resizeTick,setResizeTick]=useState(0);
  useEffect(()=>{ const onR=()=>setResizeTick(t=>t+1); window.addEventListener("resize",onR); window.addEventListener("orientationchange",onR); return ()=>{window.removeEventListener("resize",onR); window.removeEventListener("orientationchange",onR);};},[]);

  // audio
  const samplerRef=useRef<Tone.Sampler|null>(null); const timeoutsRef=useRef<number[]>([]); const noteDurSec=0.6;
  function clearAllTimers(){ for(const id of timeoutsRef.current) clearTimeout(id); timeoutsRef.current=[]; }
  async function createSamplerForNotes(names:string[]){ if(samplerRef.current){ try{samplerRef.current.dispose();}catch{} samplerRef.current=null; }
    const urls:Record<string,string>={}; for(const n of new Set(names)) urls[n]=`${n.replace("#","%23")}.wav`;
    samplerRef.current=new Tone.Sampler({urls,baseUrl:"/audio/notes/"}).toDestination(); await Tone.loaded();
  }
  function triggerNow(n:string){ const s=samplerRef.current; if(!s) return; try{s.triggerAttackRelease(n,noteDurSec*0.8);}catch{} }

  const start=useCallback(async ()=>{
    if(!canPlay||isPlaying) return;
    try{ (document.activeElement as HTMLElement|null)?.blur(); }catch{}
    const mapped=mapPhraseToNotes(phrase,keyName); setMappedNotes(mapped); setVisibleCount(0); await raf2();
    await Tone.start(); await createSamplerForNotes(mapped.map(n=>n.note));
    setIsPlaying(true); isPlayingRef.current=true; clearAllTimers();
    mapped.forEach((n,idx)=>{ const id=window.setTimeout(()=>{ if(!isPlayingRef.current) return; setVisibleCount(idx+1); triggerNow(n.note); }, Math.round(idx*noteDurSec*1000)); timeoutsRef.current.push(id); });
    const endId=window.setTimeout(()=>{ if(!isPlayingRef.current) return; clearAllTimers(); setVisibleCount(mapped.length); setIsPlaying(false); isPlayingRef.current=false; }, Math.round(mapped.length*noteDurSec*1000)+60); timeoutsRef.current.push(endId);
  },[canPlay,isPlaying,phrase,keyName]);

  const stop=useCallback(()=>{ clearAllTimers(); setIsPlaying(false); isPlayingRef.current=false; },[]);

  // restore frozen
  useEffect(()=>{ if(typeof window==="undefined") return; const sp=new URLSearchParams(window.location.search);
    const k=sp.get("key"); const p=sp.get("phrase")||sp.get("q")||""; if(!k&&!p) return;
    const trimmed=trimToMaxLetters(sanitizePhraseInput(p),MAX_LETTERS); if(!trimmed) return;
    setPhrase(trimmed); const mapping=mapPhraseToNotes(trimmed,(k==="Aminor"||k==="Amajor")?(k as KeyName):keyName);
    setMappedNotes(mapping); setVisibleCount(mapping.length); setIsPlaying(false); isPlayingRef.current=false; clearAllTimers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[]);

  // share
  const [linkCopied,setLinkCopied]=useState(false); const [shareOpen,setShareOpen]=useState(false);
  function buildShareUrl(){ const url=new URL(window.location.href); url.searchParams.set("key",keyName); url.searchParams.set("phrase",phrase); url.searchParams.set("letters",String(lettersCount)); url.searchParams.set("freeze","1"); const q=sanitizePhraseInput(phrase).trim(); if(q) url.searchParams.set("q",q); url.searchParams.set("utm_source","share"); url.searchParams.set("utm_medium","social"); url.searchParams.set("utm_campaign","words_to_notes"); return url.toString(); }
  function buildTweetIntent(text:string, url:string, hashtags=["piano","music","pianotrainer"]){ const u=new URL("https://twitter.com/intent/tweet"); u.searchParams.set("text",text); u.searchParams.set("url",url); u.searchParams.set("hashtags",hashtags.join(",")); return u.toString(); }
  const onShare=useCallback(()=>setShareOpen(true),[]);
/** Try to normalize on server; if the API fails or returns empty, pass through the original blob. */
async function convertToMp4Server(inputBlob: Blob): Promise<Blob> {
  try {
    const resp = await fetch("/api/convert-webm-to-mp4", {
      method: "POST",
      headers: { "Content-Type": inputBlob.type || "application/octet-stream" },
      body: inputBlob,
    });
    if (!resp.ok) {
      try { alert("Preparing MP4 failed; downloading the raw clip instead."); } catch {}
      return inputBlob;
    }
    const out = await resp.blob();
    if (!out || out.size === 0) {
      try { alert("Preparing MP4 failed; downloading the raw clip instead."); } catch {}
      return inputBlob;
    }
    return out;
  } catch {
    try { alert("Preparing MP4 failed; downloading the raw clip instead."); } catch {}
    return inputBlob;
  }
}

/** Prefer MP4 when supported; Chrome will fall back to WebM. */
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

/** Safe filename from phrase: "{phrase}.mp4" (phrase only, sanitized) */
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

  /* VexFlow render */
  useEffect(()=>{ const host=staveHostRef.current; if(!host) return;
    host.innerHTML="";
    const rect=host.getBoundingClientRect(); const width = Math.floor(rect.width); const height=260;
    const renderer=new Renderer(host,Renderer.Backends.SVG); renderer.resize(width,height); const ctx=renderer.getContext();
    let LEFT=20, RIGHT=28; if(width<=390){LEFT=16;RIGHT=18;} if(width<=360){LEFT=14;RIGHT=16;} if(width<=344){LEFT=12;RIGHT=14;}
    const innerWidth=width-LEFT-RIGHT; const trebleY=16, bassY=120; const keySpec= keyName==="Amajor"?"A":"Am";
    const treble=new Stave(LEFT,trebleY,innerWidth); treble.addClef("treble").addKeySignature(keySpec).setContext(ctx).draw();
    const bass=new Stave(LEFT,bassY,innerWidth);   bass.addClef("bass").addKeySignature(keySpec).setContext(ctx).draw();
    const Type=(StaveConnector as any).Type ?? (StaveConnector as any).type ?? {};
    new (StaveConnector as any)(treble,bass).setType(Type.BRACE).setContext(ctx).draw();
    new (StaveConnector as any)(treble,bass).setType(Type.SINGLE_LEFT).setContext(ctx).draw();
    new (StaveConnector as any)(treble,bass).setType(Type.SINGLE_RIGHT).setContext(ctx).draw();
    if(!mappedNotes.length||visibleCount===0) return;
    const TREBLE_MID=noteNameToMidi("B4"), BASS_MID=noteNameToMidi("D3");
    const vis=mappedNotes.slice(0,visibleCount);
    const trebleNotes=vis.filter(n=>n.clef==="treble").map(n=>new StaveNote({keys:[n.vfKey],duration:"q",clef:"treble",stemDirection:n.midi<TREBLE_MID?1:-1}));
    const bassNotes=vis.filter(n=>n.clef==="bass").map(n=>new StaveNote({keys:[n.vfKey],duration:"q",clef:"bass",stemDirection:n.midi<BASS_MID?1:-1}));
    if(trebleNotes.length){ const v=new Voice({numBeats:Math.max(1,trebleNotes.length),beatValue:4}).setStrict(false); v.addTickables(trebleNotes); new Formatter().joinVoices([v]).formatToStave([v],treble); v.draw(ctx,treble); }
    if(bassNotes.length){ const v=new Voice({numBeats:Math.max(1,bassNotes.length),beatValue:4}).setStrict(false); v.addTickables(bassNotes); new Formatter().joinVoices([v]).formatToStave([v],bass); v.draw(ctx,bass); }
  },[mappedNotes,visibleCount,resizeTick,keyName]);

/* Export video (Reels-ready: live SVG snapshot + proportional letterbox + animation) */
const onDownloadVideo = useCallback(async () => {
  const host = staveHostRef.current;
  if (!host || !mappedNotes.length) return;

  try {
    // ===== 1) Measure live SVG exactly as rendered =====
    const liveSvgEl = host.querySelector("svg") as SVGSVGElement | null;
    if (!liveSvgEl) return;

    const rect = liveSvgEl.getBoundingClientRect();
    const liveW = Math.max(2, Math.floor(rect.width));
    const liveH = Math.max(2, Math.floor(rect.height));

    // ===== 2) Export canvas 1080×1920 =====
    const FRAME_W = 1080, FRAME_H = 1920, SCALE = 2;
    const canvas  = document.createElement("canvas");
    canvas.width  = FRAME_W * SCALE;
    canvas.height = FRAME_H * SCALE;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // ===== 3) Layout constants (tweak if desired) =====
    const CTA_TOP       = 60;
    const CTA_MIN_PX    = 28;
    const CTA_MAX_PX    = 72;
    const CTA_TARGET    = 0.82; // CTA total width should fit ~82% of frame width
    const GOLD_SIDE_PAD = 36;   // left/right inset
    const BOTTOM_PAD    = 140;  // breathing room at bottom

    // Dynamic CTA sizing
    function measureCtaTotalWidth(px: number): number {
      const { t1, t2, t3 } = ctaPieces(phrase);
      ctx.font = `${px * SCALE}px Inter, system-ui, sans-serif`;
      return ctx.measureText(t1).width + ctx.measureText(t2).width + ctx.measureText(t3).width;
    }
    function pickCtaPx(): number {
      let lo = CTA_MIN_PX, hi = CTA_MAX_PX, best = CTA_MIN_PX;
      const maxWidth = FRAME_W * SCALE * CTA_TARGET;
      while (lo <= hi) {
        const mid = Math.floor((lo + hi) / 2);
        const w = measureCtaTotalWidth(mid);
        if (w <= maxWidth) { best = mid; lo = mid + 1; } else { hi = mid - 1; }
      }
      return best;
    }
    const CTA_PX       = pickCtaPx();
    const CTA_BASELINE = CTA_TOP * SCALE;

    // Golden box destination (proportional to live)
    const availW = FRAME_W - GOLD_SIDE_PAD * 2;
    const goldTopPx = Math.round(CTA_TOP + CTA_PX * 1.45);               // push below CTA
    const availH = FRAME_H - goldTopPx - BOTTOM_PAD;
    const scale  = Math.min(availW / liveW, availH / liveH);
    const drawW  = Math.round(liveW * scale);
    const drawH  = Math.round(liveH * scale);
    const goldX  = Math.round((FRAME_W - drawW) / 2);
    const goldY  = goldTopPx;

    // ===== 4) Audio mix & recorder (30 fps) =====
    const rawCtx   = (Tone.getContext() as any).rawContext as AudioContext;
    const audioDst = rawCtx.createMediaStreamDestination();
    try { (Tone as any).Destination.connect(audioDst); } catch {}
    const stream   = (canvas as any).captureStream(30) as MediaStream; // 30 fps
    const mixed    = new MediaStream([
      ...stream.getVideoTracks(),
      ...audioDst.stream.getAudioTracks(),
    ]);

    const mimeType = pickRecorderMime();
    const chunks: BlobPart[] = [];
    const rec = new MediaRecorder(mixed, { mimeType });
    rec.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };

    // ===== 5) Build snapshot from FULL live SVG (preserve VexFlow inline styles) =====
    const fontCss = await buildEmbeddedFontStyle();

    function serializeFullSvg(svgEl: SVGSVGElement, w: number, h: number): string {
      let raw = new XMLSerializer().serializeToString(svgEl);
      // ensure width/height (do NOT touch id/viewBox)
      if (!/\swidth=/.test(raw))  raw = raw.replace(/<svg([^>]*?)>/, '<svg$1 width="' + w + '">');
      else                        raw = raw.replace(/\swidth="[^"]*"/,  ' width="' + w + '"');
      if (!/\sheight=/.test(raw)) raw = raw.replace(/<svg([^>]*?)>/, '<svg$1 height="' + h + '">');
      else                        raw = raw.replace(/\sheight="[^"]*"/, ' height="' + h + '"');
      // append our font CSS into first style, or add a new one
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

    // Pre-roll snapshot (no □)
    await Tone.start();
    if (!samplerRef.current) await createSamplerForNotes(mappedNotes.map(n => n.note));
    try { await (document as any).fonts?.ready; } catch {}

    let currentImg = await svgToImage(serializeFullSvg(liveSvgEl, liveW, liveH));

    // Drawing helpers
    function drawCTA() {
      const { t1, t2, t3 } = ctaPieces(phrase);
      ctx.font = `${CTA_PX * SCALE}px Inter, system-ui, sans-serif`;
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      const y = CTA_BASELINE;
      const w1 = ctx.measureText(t1).width;
      const w2 = ctx.measureText(t2).width;
      const w3 = ctx.measureText(t3).width;
      const total = w1 + w2 + w3;
      const x0 = (FRAME_W * SCALE - total) / 2;
      let x = x0;
      ctx.fillStyle = theme.text;  ctx.fillText(t1, x + w1 / 2, y); x += w1;
      ctx.fillStyle = theme.gold;  ctx.fillText(t2, x + w2 / 2, y); x += w2;
      ctx.fillStyle = theme.text;  ctx.fillText(t3, x + w3 / 2, y);
    }
    function drawFrame(img: HTMLImageElement) {
      // bg
      ctx.fillStyle = theme.bg;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      // CTA
      drawCTA();
      // golden panel
      ctx.fillStyle = theme.gold;
      ctx.fillRect(goldX * SCALE, goldY * SCALE, drawW * SCALE, drawH * SCALE);
      // live snapshot scaled into gold (proportional)
      ctx.drawImage(img, 0, 0, liveW, liveH, goldX * SCALE, goldY * SCALE, drawW * SCALE, drawH * SCALE);
      // watermark inside gold
      ctx.save();
      ctx.textAlign = "right"; ctx.textBaseline = "middle";
      ctx.font = `${22 * SCALE}px Inter, system-ui, sans-serif`;
      ctx.fillStyle = "rgba(8,16,25,0.96)";
      ctx.fillText("pianotrainer.app", (goldX + drawW - 18) * SCALE, (goldY + drawH - 14) * SCALE);
      ctx.restore();
    }

    // Draw pre-roll
    drawFrame(currentImg);

    // ===== 6) Schedule audio + animate frames =====
    const noteMs = noteDurSec * 1000;
    const timers: number[] = [];
    mappedNotes.forEach((n, idx) => {
      const id = window.setTimeout(() => { try { triggerNow(n.note); } catch {} }, Math.round(idx * noteMs));
      timers.push(id);
    });

    const recStart = performance.now();
    rec.start();
    let lastIdx = 0;
    const DURATION_MS = Math.min(16000, Math.round(mappedNotes.length * noteMs) + 200 + 800);

    (async function loop() {
      const now = performance.now();
      const elapsed = now - recStart;
      const idx = Math.min(mappedNotes.length - 1, Math.floor(elapsed / noteMs));

      if (idx > lastIdx) {
        lastIdx = idx;
        // advance live stave to show the next note, then snapshot FULL svg
        setVisibleCount(idx + 1);
        await raf2();
        const liveSvg2 = host.querySelector("svg") as SVGSVGElement | null;
        if (liveSvg2) {
          currentImg = await svgToImage(serializeFullSvg(liveSvg2, liveW, liveH));
        }
        drawFrame(currentImg);
      } else {
        drawFrame(currentImg);
      }

      if (elapsed < DURATION_MS) requestAnimationFrame(loop);
      else {
        rec.stop();
        try { (Tone as any).Destination.disconnect(audioDest); } catch {}
        timers.forEach(id => clearTimeout(id));
      }
    })();

    // ===== 7) Gather → normalize on server → download =====
    const recorded: Blob = await new Promise((res) => {
      rec.onstop = () => res(new Blob(chunks, { type: mimeType || "video/webm" }));
    });
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
}, [phrase, mappedNotes, noteDurSec, keyName]);

  /* Input handlers */
  const onInputChange=useCallback((e:React.ChangeEvent<HTMLInputElement>)=>{ setPhrase(trimToMaxLetters(sanitizePhraseInput(e.target.value),MAX_LETTERS)); },[]);
  const onInputKeyDown=useCallback((e:React.KeyboardEvent<HTMLInputElement>)=>{ if(e.key==="Enter"){ setLastEnterAt(Date.now()); start(); } },[start]);
  const onInputBlur=useCallback(()=>{ if(Date.now()-lastEnterAt>150) start(); },[lastEnterAt,start]);

  /* ===== Render ===== */
  return (
    <div style={{minHeight:"100vh",background:theme.bg,color:theme.text,overflowX:"hidden"}}>
      <main style={{width:"100%",margin:"0 auto",padding:12,boxSizing:"border-box",maxWidth:520}}>
        <style>{`
          @media (min-width:768px){ main{max-width:680px!important;} }
          @media (min-width:1024px){ main{max-width:760px!important;} }
          .phrase-input::placeholder{color:${theme.gold};opacity:1;}
          .phrase-input:focus{outline:none;box-shadow:none;}

          /* Contract box everywhere */
          .vt-card,.vt-panel,.vt-gold,.vt-actions{box-sizing:border-box;}

          /* 🔒 vt-panel obeys vt-card width always */
          .vt-panel{
  width: 100% !important;
  max-width: 100% !important;
  min-width: 0 !important;           /* ← add this line */
  
}

          .vt-card{padding-left:12px;padding-right:12px;}
          .vt-gold{padding-left:10px;padding-right:10px;}

          /* Actions centered + wrap */
          .vt-actions{padding-left:10px;padding-right:10px;display:flex;flex-wrap:wrap;align-items:center;justify-content:center;column-gap:10px;row-gap:8px;}

          /* ≤390px */
          @media (max-width:390px){
            .vt-card{padding-left:calc(16px + env(safe-area-inset-left));padding-right:calc(16px + env(safe-area-inset-right));}
            .vt-panel{padding-left:calc(14px + env(safe-area-inset-left));padding-right:calc(14px + env(safe-area-inset-right));}
            .vt-gold {padding-left:calc(14px + env(safe-area-inset-left));padding-right:calc(14px + env(safe-area-inset-right));}
            .vt-actions{padding-left:calc(14px + env(safe-area-inset-left));padding-right:calc(14px + env(safe-area-inset-right));}
            .action-text{display:none!important;}
          }
          /* ≤360px */
          @media (max-width:360px){
            .vt-card{padding-left:calc(20px + env(safe-area-inset-left));padding-right:calc(20px + env(safe-area-inset-right));}
            .vt-panel{padding-left:calc(18px + env(safe-area-inset-left));padding-right:calc(18px + env(safe-area-inset-right));}
            .vt-gold {padding-left:calc(18px + env(safe-area-inset-left));padding-right:calc(18px + env(safe-area-inset-right));}
            .vt-actions{padding-left:calc(18px + env(safe-area-inset-left));padding-right:calc(18px + env(safe-area-inset-right));}
          }
        `}</style>

        {/* Title CTA */}
        {(() => { const {t1,t2,t3}=ctaPieces(phrase);
          return <h1 style={{margin:"4px 0 8px",fontSize:24,lineHeight:1.25,textAlign:"center",letterSpacing:0.2,fontWeight:800,color:theme.text}}>
            <span>{t1}</span><span style={{color:theme.gold}}>{t2}</span><span>{t3}</span>
          </h1>;
        })()}

        <section className="vt-card" style={{background:theme.card,border:`1px solid ${theme.border}`,borderRadius:16,padding:12,display:"grid",gap:8,marginBottom:10}}>
          {/* Shared panel: input + stave */}
          <div className="vt-panel" style={{width:"100%",maxWidth:"100%",background:"#0F1821",borderRadius:12,padding:10}}>
            <input className="phrase-input" value={phrase} onChange={onInputChange} onKeyDown={onInputKeyDown} onBlur={onInputBlur}
              placeholder="Type your phrase…" inputMode="text" enterKeyHint="done" autoCapitalize="characters" autoCorrect="off"
              style={{width:"100%",background:"#0F1821",color:theme.gold,border:"none",borderRadius:8,padding:"14px 16px",fontSize:24,lineHeight:1.25}}/>
            <div style={{fontSize:12,color:theme.muted,marginTop:4}}>Letters: {lettersCount} / 20 (spaces don’t count)</div>

            <div className="vt-gold" style={{position:"relative",background:theme.gold,borderRadius:10,padding:10,marginTop:8}}>
              <div ref={staveHostRef} style={{width:"100%",minHeight:280,display:"block"}}/>
              <div style={{position:"absolute",right:22,bottom:6,color:"#081019",fontSize:12,fontWeight:700,opacity:0.9,userSelect:"none",pointerEvents:"none"}}>
                pianotrainer.app
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="vt-actions">
            <div style={{flex:"1 1 auto",minWidth:0,display:"flex",justifyContent:"center"}}>
              <button onClick={()=>isPlaying?stop():start()} disabled={!canPlay}
                style={{background:!canPlay?"#1a2430":theme.gold,color:!canPlay?theme.muted:"#081019",border:"none",borderRadius:999,padding:"10px 16px",fontWeight:700,cursor:!canPlay?"not-allowed":"pointer",fontSize:16,minHeight:40,display:"inline-flex",alignItems:"center",gap:8}}>
                <span aria-hidden="true">{isPlaying?"⏹":"▶"}</span><span className="action-text">{isPlaying?"Stop":"Replay"}</span>
              </button>
            </div>
            <div style={{display:"flex",flex:"0 0 auto",gap:10}}>
              <button onClick={onDownloadVideo} disabled={!canPlay||mappedNotes.length===0} title="Download"
                style={{background:"transparent",color:theme.gold,border:"none",borderRadius:999,padding:"6px 10px",fontWeight:700,cursor:!canPlay||mappedNotes.length===0?"not-allowed":"pointer",minHeight:32,fontSize:14}}>
                💾 <span className="action-text">Download</span>
              </button>
              <button
                onClick={() => setShareOpen(true)}
                title="Share"
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
              >
                📤 <span className="action-text">Share</span>
              </button>
            </div>
          </div>

          {/* Copy toast */}
          {linkCopied && (
            <div
              style={{
                color: theme.green,
                fontSize: 12,
                fontWeight: 600,
                textAlign: "right",
                width: "100%",
              }}
            >
              Link copied!
            </div>
          )}

          {/* Share Sheet (custom) */}
          {shareOpen && (
            <div
              role="dialog"
              aria-modal="true"
              style={{
                position: "fixed",
                inset: 0,
                background: "rgba(0,0,0,0.6)",
                display: "flex",
                alignItems: "flex-end",
                justifyContent: "center",
                zIndex: 9999,
              }}
              onClick={() => setShareOpen(false)}
            >
              <div
                style={{
                  width: "100%",
                  maxWidth: 520,
                  background: "#0F1821",
                  borderTop: `1px solid ${theme.border}`,
                  borderLeft: `1px solid ${theme.border}`,
                  borderRight: `1px solid ${theme.border}`,
                  borderRadius: "12px 12px 0 0",
                  padding: 12,
                  boxSizing: "border-box",
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <div
                  style={{
                    textAlign: "center",
                    color: theme.text,
                    fontWeight: 800,
                    marginBottom: 8,
                  }}
                >
                  Share your melody
                </div>

                {/* Copy Link (fastest) */}
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
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    marginBottom: 6,
                    background: theme.gold,
                    color: "#081019",
                    borderRadius: 8,
                    border: "none",
                    fontWeight: 800,
                  }}
                >
                  🔗 Copy Link
                </button>

                {/* X / Twitter */}
                <a
                  href={buildTweetIntent(
                    `My word → melody: ${sanitizePhraseInput(phrase).trim() || "my word"}`,
                    buildShareUrl()
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setShareOpen(false)}
                  style={{
                    display: "block",
                    textAlign: "center",
                    width: "100%",
                    padding: "10px 12px",
                    marginBottom: 6,
                    background: "transparent",
                    color: theme.gold,
                    borderRadius: 8,
                    border: `1px solid ${theme.border}`,
                    textDecoration: "none",
                    fontWeight: 800,
                  }}
                >
                  𝕏 Share on X
                </a>

                {/* TikTok */}
                <button
                  onClick={() => {
                    alert("Tap Download first, then post the clip in TikTok.");
                    const isMobile = /Android|iPhone|iPad/i.test(navigator.userAgent);
                    if (isMobile) {
                      try {
                        window.location.href = "tiktok://";
                      } catch {}
                    } else {
                      window.open("https://studio.tiktok.com", "_blank", "noopener,noreferrer");
                    }
                    setShareOpen(false);
                  }}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    marginBottom: 6,
                    background: "transparent",
                    color: theme.gold,
                    borderRadius: 8,
                    border: `1px solid ${theme.border}`,
                    fontWeight: 800,
                  }}
                >
                  🎵 Post to TikTok (download then upload)
                </button>

                {/* Instagram Reels */}
                <button
                  onClick={() => {
                    alert("Tap Download first, then open Instagram → Reels → upload.");
                    const isMobile = /Android|iPhone|iPad/i.test(navigator.userAgent);
                    if (isMobile) {
                      try {
                        window.location.href = "instagram://camera";
                      } catch {}
                    } else {
                      window.open("https://www.instagram.com/create/reel/", "_blank", "noopener,noreferrer");
                    }
                    setShareOpen(false);
                  }}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    background: "transparent",
                    color: theme.gold,
                    borderRadius: 8,
                    border: `1px solid ${theme.border}`,
                    fontWeight: 800,
                  }}
                >
                  📸 Post to Instagram Reels (download then upload)
                </button>

                <button
                  onClick={() => setShareOpen(false)}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    marginTop: 8,
                    background: "#0B0F14",
                    color: theme.muted,
                    borderRadius: 8,
                    border: `1px solid ${theme.border}`,
                    fontWeight: 700,
                  }}
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </section>

        {/* Footer CTA */}
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
      </main>
    </div>
  );
}
