"use client";

import React, { useRef, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
const GrandStaveVF = dynamic(() => import("../../../components/GrandStaveVF"), { ssr: false });
import ResponsiveKeyboardC2toC6, { NoteName } from "../../../components/ResponsiveKeyboardC2toC6";

/* ========= helpers: MIDI ↔ note name ========= */
const PITCH_CLASS = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];
function midiToNameSharp(midi: number): string {
  const pc = midi % 12;
  const oct = Math.floor(midi / 12) - 1;
  return `${PITCH_CLASS[pc]}${oct}`;
}
function midiToNameFlat(midi: number): string {
  const sharp = midiToNameSharp(midi);
  const map: Record<string,string> = { "C#":"Db","D#":"Eb","F#":"Gb","G#":"Ab","A#":"Bb" };
  const base = sharp.slice(0,-1);
  const oct  = sharp.slice(-1);
  return map[base] ? `${map[base]}${oct}` : sharp;
}

/* ========= Audio ========= */
const audioCache = new Map<string, HTMLAudioElement>();
function urlForNote(name: string): string {
  const safe = name.replace("#", "%23");
  return `/audio/notes/${safe}.wav`;
}
function getAudio(name: string): HTMLAudioElement {
  let a = audioCache.get(name);
  if (!a) {
    a = new Audio(urlForNote(name));
    a.preload = "auto";
    audioCache.set(name, a);
  }
  return a;
}
function playOnce(name: string) {
  const a = getAudio(name);
  try { a.currentTime = 0; } catch {}
  a.play().catch(() => {});
}

/* ========= Styles ========= */
const styles = `
.page { max-width: 1200px; margin: 0 auto; padding: 8px; }
.root { border: 1px solid #ccc; border-radius: 8px; background:#fff;
  display:flex; flex-direction:column; padding:12px; min-height:100%; }
.header { text-align:center; margin-bottom:8px; }
.header h1 { margin:0 0 4px 0; }
.header p { margin:0; color:#444; }
.title-line { display:inline-flex; gap:10px; align-items:baseline; }
.title-home { font-size:12px; text-decoration:underline; }
.grid { display:grid; grid-template-columns:1fr; grid-template-rows:auto auto; gap:10px; }
.child { border:1px solid #ccc; border-radius:8px; background:#fff; padding:8px; }
.stave-center { min-width:0; display:flex; justify-content:center; align-items:center; }
.stave-narrow { width:260px; }
.media { display:flex; align-items:center; justify-content:center; min-height:120px; }
.media > svg { width:100%; height:100%; display:block; }
.blocker { position:absolute; inset:0; display:none; align-items:center; justify-content:center;
  background:rgba(255,255,255,0.95); z-index:5; text-align:center; padding:24px; border-radius:8px; }
.blocker p { margin:0; font-size:16px; line-height:1.4; }
@media (max-width:450px) and (orientation:portrait){ .blocker{display:flex;} }
`;

export default function KeysToNotesPage() {
  const [noteName, setNoteName] = useState<string | null>(null);
  const lastWhiteMidiRef = useRef<number | null>(null);

  // --- duplicate-event guard (prevents "ta-ta" double audio on touch devices)
  const echoRef = useRef<{ id: string; t: number } | null>(null);
  function shouldAcceptOnce(id: string, windowMsDesktop = 220, windowMsTouch = 520): boolean {
    const now = performance.now();
    const last = echoRef.current;
    const isCoarse = typeof window !== "undefined" && matchMedia?.("(pointer: coarse)")?.matches;
    const win = isCoarse ? windowMsTouch : windowMsDesktop;
    if (last && last.id === id && (now - last.t) < win) return false;
    echoRef.current = { id, t: now };
    return true;
  }

  const handleKeyPressMidi = (midi: number) => {
    // de-dupe: ignore synthetic double events
    const guardId = `press-${midi}`;
    if (!shouldAcceptOnce(guardId)) return;

    const pc = midi % 12;
    const isBlack = [1,3,6,8,10].includes(pc);

    let display: string;
    if (isBlack) {
      const lastWhite = lastWhiteMidiRef.current;
      if (lastWhite == null || lastWhite < midi) display = midiToNameSharp(midi);
      else display = midiToNameFlat(midi);
    } else {
      display = midiToNameSharp(midi);
      lastWhiteMidiRef.current = midi;
    }

    setNoteName(display);
    playOnce(display);
  };

  return (
    <>
      <style>{styles}</style>
      <div className="page">
        <div className="root" style={{ position:"relative" }}>
          <div className="blocker">
            <p><strong>Please rotate your device to landscape</strong><br/>(or use a larger screen)</p>
          </div>

          <div className="header">
            <div className="title-line">
              <h1>Keys to Notes</h1>
              <Link href="/" className="title-home">HOME</Link>
            </div>
            <p>Press any piano key and see the note instantly on the grand staff.</p>
          </div>

          <div className="grid">
            {/* Stave always visible with both clefs */}
            <div className="child child--stave">
              <div className="stave-center">
                <div className="stave-narrow">
                  <GrandStaveVF
                    key={noteName ?? "empty"}
                    noteName={noteName ?? "C4"}
                    noteMidi={noteName ? null : 60}
                  />
                </div>
              </div>
            </div>

            {/* Keyboard */}
            <div className="child child--keys">
              <div className="media">
                <ResponsiveKeyboardC2toC6 onKeyPress={handleKeyPressMidi} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}