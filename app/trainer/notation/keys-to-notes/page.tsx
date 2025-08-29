"use client";

import React, { useState, useRef } from "react";
import Link from "next/link";
// ⬇️ dynamic client-only import (prevents SSR errors in production)
import dynamic from "next/dynamic";
const GrandStaveVF = dynamic(() => import("../../../components/GrandStaveVF"), { ssr: false });

import ResponsiveKeyboardC2toC6, { NoteName } from "../../../components/ResponsiveKeyboardC2toC6";

/* ========= note ↔ midi helpers ========= */
const PITCH_CLASS: Record<string, number> = {
  C: 0, "C#": 1, D: 2, "D#": 3, E: 4,
  F: 5, "F#": 6, G: 7, "G#": 8, A: 9, "A#": 10, B: 11,
};
const FLAT_TO_SHARP: Record<string, string> = {
  Db: "C#", Eb: "D#", Gb: "F#", Ab: "G#", Bb: "A#",
};
function noteNameToMidi(n: string): number | null {
  const m = n.match(/^([A-Ga-g])([#b]?)(\d)$/);
  if (!m) return null;
  const letter = m[1].toUpperCase();
  const acc = m[2] as "" | "#" | "b";
  const oct = parseInt(m[3], 10);
  let name = letter + acc;
  if (acc === "b") name = FLAT_TO_SHARP[letter + "b"] ?? name;
  const pc = PITCH_CLASS[name];
  if (pc == null) return null;
  return (oct + 1) * 12 + pc;
}
function midiToNameSharp(midi: number): string {
  const names = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];
  const pc = midi % 12;
  const oct = Math.floor(midi / 12) - 1;
  return `${names[pc]}${oct}`;
}
function midiToNameFlat(midi: number): string {
  const sharp = midiToNameSharp(midi);
  const map: Record<string,string> = {
    "C#":"Db","D#":"Eb","F#":"Gb","G#":"Ab","A#":"Bb",
  };
  const base = sharp.slice(0, -1);
  const oct = sharp.slice(-1);
  return map[base] ? `${map[base]}${oct}` : sharp;
}

/* ========= Audio (normalize flats → sharps for file lookup) ========= */
const audioCache = new Map<string, HTMLAudioElement>();

function normalizeToSharp(name: string): string {
  const m = name.match(/^([A-G])([#b]?)(\d)$/i);
  if (!m) return name;
  const letter = m[1].toUpperCase();
  const acc = (m[2] || "") as "" | "#" | "b";
  const oct = m[3];
  if (acc === "b") {
    const FLAT_TO_SHARP: Record<string, string> = {
      Db: "C#", Eb: "D#", Gb: "F#", Ab: "G#", Bb: "A#",
    };
    const flatKey = (letter + "b") as keyof typeof FLAT_TO_SHARP;
    const twin = FLAT_TO_SHARP[flatKey];
    if (twin) return `${twin}${oct}`;
  }
  return `${letter}${acc}${oct}`;
}

function audioUrl(displayName: string): string {
  const sharpName = normalizeToSharp(displayName);      // e.g., Db4 → C#4
  const safe = sharpName.replace("#", "%23");           // URL-encode '#'
  return `/audio/notes/${safe}.wav`;
}

function getAudio(displayName: string): HTMLAudioElement {
  const sharpName = normalizeToSharp(displayName);
  let a = audioCache.get(sharpName);
  if (!a) {
    a = new Audio(audioUrl(displayName));
    a.preload = "auto";
    audioCache.set(sharpName, a);
  }
  return a;
}

function playOnce(displayName: string) {
  const a = getAudio(displayName);
  try { a.currentTime = 0; } catch {}
  a.play().catch(() => { /* ignore autoplay block; unlocked on first user gesture */ });
}

/* ========= Styles ========= */
const styles = `
.page { max-width: 1200px; margin: 0 auto; padding: 8px; }
.root {
  border: 1px solid #ccc; border-radius: 8px; background: #fff;
  display: flex; flex-direction: column;
  padding: 12px; min-height: 100%;
}
.header { text-align: center; margin-bottom: 8px; }
.header h1 { margin: 0 0 4px 0; }
.header p { margin: 0; color: var(--site-muted); }
.title-line { display: inline-flex; gap: 10px; align-items: baseline; }
.title-home { font-size: 12px; text-decoration: underline; }
.stave-center { min-width: 0; display: flex; justify-content: center; align-items: center; margin-bottom: 12px; }
.stave-narrow { width: 260px; }
.media { display: flex; align-items: center; justify-content: center; min-height: 120px; }
.media > svg { width: 100%; height: 100%; display: block; }
.blocker { position: absolute; inset: 0; display: none; align-items: center; justify-content: center;
  background: rgba(255,255,255,0.95); z-index: 5; text-align: center; padding: 24px; border-radius: 8px; }
.blocker p { margin: 0; font-size: 16px; line-height: 1.4; }
@media (max-width: 450px) and (orientation: portrait) { .blocker { display: flex; } }
`;

export default function KeysToNotesPage() {
  const [noteName, setNoteName] = useState<string | null>(null);
  const lastWhiteMidiRef = useRef<number | null>(null);

  // duplicate-event guard (prevents double sound "ta-ta")
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
    const guardId = `press-${midi}`;
    if (!shouldAcceptOnce(guardId)) return;

    const pc = midi % 12;
    const isBlack = [1, 3, 6, 8, 10].includes(pc);

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
        <div className="root" style={{ position: "relative" }}>
          <div className="blocker">
            <p>
              <strong>Please rotate your device to landscape</strong><br/>
              (or use a device with a larger screen)
            </p>
          </div>

          <div className="header">
            <div className="title-line">
              <h1>Keys to Notes</h1>
              <Link href="/" className="title-home">HOME</Link>
            </div>
            <p>Play any piano key — the note instantly appears on the stave with sound.</p>
          </div>

          <div className="stave-center">
            <div className="stave-narrow">
              <GrandStaveVF
                key={noteName ?? "empty"}
                noteName={noteName ?? undefined}
                forceClef={null}
                noteMidi={noteName ? noteNameToMidi(noteName) ?? undefined : undefined}
              />
            </div>
          </div>

          <div className="media">
            <ResponsiveKeyboardC2toC6
              onKeyPress={handleKeyPressMidi}
              onKeyDown={() => {}}
            />
          </div>
        </div>
    
      </div>
    </>
  );
}