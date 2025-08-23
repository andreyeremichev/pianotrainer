// 🔒 FROZEN SIZE 260x170. Do not change baseW/baseH, padX, GAP, STAFF_SPACE.
"use client";

import React, { useEffect, useRef } from "react";
import { Renderer, Stave, StaveNote, Voice, Formatter, Barline, Accidental } from "vexflow";
import useMusicFontReady from "./_guards/useMusicFontReady";

type Props = {
  /** e.g. "C4", "C#4", "Db4" (accidentals respected) */
  noteName: string;
  /** force which clef to draw; if null/undefined, clef is inferred from noteName */
  forceClef?: "treble" | "bass" | null;
  /** not required for drawing, kept for API compatibility */
  noteMidi?: number;
};

/** ---- FROZEN geometry (do not change) ---- */
const baseW = 260;       // matches .stave-narrow width on the page
const baseH = 170;       // frozen box height for stable layout
const padX  = 10;        // inner padding left/right
const padY  = 20;        // inner padding top
const GAP   = 0;         // reserved for future spacing tweaks
const STAFF_SPACE = baseW - padX * 2 - GAP;

/** Convert "C#4"/"Db4" → { key: "c/4", acc: "#"/"b", oct: 4 } for VexFlow. */
function parseKey(name: string): { key: string; acc: "#" | "b" | null; oct: number } {
  const m = name.match(/^([A-Ga-g])([#b]?)(\d)$/);
  if (!m) {
    // fallback: middle C
    return { key: "c/4", acc: null, oct: 4 };
    }
  const letter = m[1].toLowerCase();
  const accidental = (m[2] as "" | "#" | "b") || null;
  const oct = parseInt(m[3], 10);
  return { key: `${letter}/${oct}`, acc: accidental, oct };
}

/** Infer clef if not forced: C4 and above → treble, below → bass. */
function inferClef(noteName: string): "treble" | "bass" {
  const m = noteName.match(/^([A-Ga-g])([#b]?)(\d)$/);
  if (!m) return "treble";
  const oct = parseInt(m[3], 10);
  return oct >= 4 ? "treble" : "bass";
}

export default function GrandStaveVF({ noteName, forceClef }: Props) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const fontReady = useMusicFontReady(); // resilient hook; flips true quickly in prod

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    // clear any previous SVG
    host.innerHTML = "";

    // client-only VexFlow renderer
    const renderer = new Renderer(host, Renderer.Backends.SVG);
    renderer.resize(baseW, baseH);
    const ctx = renderer.getContext();

    // choose clef
    const clef: "treble" | "bass" = forceClef ?? inferClef(noteName);

    // set up a single stave centered in our frozen box
    const stave = new Stave(padX, padY, STAFF_SPACE);
    stave.setClef(clef);
    stave.setEndBarType(Barline.type.NONE);
    stave.setContext(ctx).draw();

    // build the note (accidental handled explicitly)
    const { key, acc } = parseKey(noteName);
    const note = new StaveNote({
      clef,
      keys: [key],         // e.g., "c/4"
      duration: "q",
    });

    if (acc) {
      // VexFlow expects "#" or "b"
      note.addAccidental(0, new Accidental(acc));
    }

    // voice + format (⚠️ camelCase keys are required)
    const voice = new Voice({ numBeats: 1, beatValue: 1 });
    voice.addTickable(note);
    new Formatter().joinVoices([voice]).format([voice], Math.max(60, STAFF_SPACE - 40));
    voice.draw(ctx, stave);

    // cleanup on unmount/prop change
    return () => {
      try { host.innerHTML = ""; } catch {}
    };
    // re-draw when noteName/clef changes, or once fontReady flips true
  }, [noteName, forceClef, fontReady]);

  return (
    <div
      ref={hostRef}
      aria-label="Grand Stave"
      style={{
        width: baseW,
        height: baseH,
        display: "block",
        overflow: "hidden",
      }}
    />
  );
}