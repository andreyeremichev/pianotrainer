"use client";

import React, { useRef, useState } from "react";
import dynamic from "next/dynamic";

const GrandStaveVF = dynamic(() => import("@/components/GrandStaveVF"), { ssr: false });
import ResponsiveKeyboardC2toC6 from "@/components/ResponsiveKeyboardC2toC6";

/* ========= note ↔ midi helpers ========= */
const PITCH_CLASS: Record<string, number> = {
  C: 0, "C#": 1, D: 2, "D#": 3, E: 4,
  F: 5, "F#": 6, G: 7, "G#": 8, A: 9, "A#": 10, B: 11,
};
const FLAT_TO_SHARP: Record<string, string> = { Db: "C#", Eb: "D#", Gb: "F#", Ab: "G#", Bb: "A#" };

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
  const map: Record<string,string> = { "C#":"Db","D#":"Eb","F#":"Gb","G#":"Ab","A#":"Bb" };
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
    const twin = FLAT_TO_SHARP[(letter + "b") as keyof typeof FLAT_TO_SHARP];
    if (twin) return `${twin}${oct}`;
  }
  return `${letter}${acc}${oct}`;
}

function audioUrl(displayName: string): string {
  const sharpName = normalizeToSharp(displayName);
  const safe = sharpName.replace("#", "%23");
  return `/audio/notes/${safe}.wav`;
}

function playOnce(displayName: string) {
  const sharpName = normalizeToSharp(displayName);
  let a = audioCache.get(sharpName);
  if (!a) {
    a = new Audio(audioUrl(displayName));
    a.preload = "auto";
    audioCache.set(sharpName, a);
  }
  try { a.currentTime = 0; } catch {}
  a.play().catch(() => {});
}

export default function HomeKeysToNotesDemo() {
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
    <div
      style={{
        border: "1px solid #dddddd",
        borderRadius: 12,
        background: "#ffffff",
        padding: 12,
        display: "grid",
        gap: 10,
      }}
    >
      <div style={{ textAlign: "center" }}>
        <h3 style={{ margin: "0 0 6px", fontSize: 18, fontWeight: 800 }}>
          Keys → Notes (instant mapping)
        </h3>
        <p style={{ margin: 0, fontSize: 14, color: "#555" }}>
          Press any key to see where it lands on the staff.
        </p>
      </div>

      <div style={{ display: "flex", justifyContent: "center" }}>
        <div style={{ width: "100%", maxWidth: 260 }}>
          <GrandStaveVF
            key={noteName ?? "empty"}
            noteName={noteName ?? undefined}
            forceClef={null}
            noteMidi={noteName ? noteNameToMidi(noteName) ?? undefined : undefined}
          />
        </div>
      </div>

      <div style={{ minHeight: 120 }}>
        <ResponsiveKeyboardC2toC6 onKeyPress={handleKeyPressMidi} onKeyDown={() => {}} />
      </div>
    </div>
  );
}