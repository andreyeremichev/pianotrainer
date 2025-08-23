// 🔒 FROZEN SIZE 260x170. Do not change baseW/baseH, padX, GAP, STAFF_SPACE.
"use client";

import React, { useEffect, useRef } from "react";
import {
  Renderer,
  Stave,
  StaveNote,
  Voice,
  Formatter,
  Barline,
  Accidental,
} from "vexflow";
import useMusicFontReady from "./_guards/useMusicFontReady";

type Props = {
  /** e.g. "C4", "C#4", "Db4" */
  noteName: string;
  /** force which clef to place the note on; otherwise inferred by octave */
  forceClef?: "treble" | "bass" | null;
  /** kept for API compatibility; not required for drawing */
  noteMidi?: number;
};

/** ---- FROZEN geometry (do not change) ---- */
const baseW = 260;       // matches .stave-narrow width on the page
const baseH = 170;       // frozen box height for stable layout
const padX  = 10;        // inner padding left/right
const padY  = 16;        // top padding
const GAP   = 14;        // vertical gap between staves
const STAFF_SPACE = baseW - padX * 2; // drawing width for each stave

/** Convert "C#4"/"Db4" → { key: "c/4", acc: "#"/"b", oct: 4 } for VexFlow. */
function parseKey(name: string): { key: string; acc: "#" | "b" | null; oct: number } {
  const m = name.match(/^([A-Ga-g])([#b]?)(\d)$/);
  if (!m) return { key: "c/4", acc: null, oct: 4 }; // fallback
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
  const fontReady = useMusicFontReady(); // resilient; flips quickly in prod

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    // clear previous SVG
    host.innerHTML = "";

    try {
      // client-only VexFlow renderer
      const renderer = new Renderer(host, Renderer.Backends.SVG);
      renderer.resize(baseW, baseH);
      const ctx = renderer.getContext();

      // --- Always draw a grand staff (both staves) ---
      const trebleY = padY;
      const bassY   = padY + 40 + GAP; // fixed vertical gap

      const treble = new Stave(padX, trebleY, STAFF_SPACE);
      treble.setClef("treble");
      treble.setEndBarType(Barline.type.NONE);
      treble.setContext(ctx).draw();

      const bass = new Stave(padX, bassY, STAFF_SPACE);
      bass.setClef("bass");
      bass.setEndBarType(Barline.type.NONE);
      bass.setContext(ctx).draw();

      // --- Build the note as a WHOLE note and place it on the chosen staff ---
      const clefForNote: "treble" | "bass" = forceClef ?? inferClef(noteName);
      const { key, acc } = parseKey(noteName);

      const note = new StaveNote({
        clef: clefForNote,
        keys: [key],          // e.g. "c/4"
        duration: "w",        // WHOLE note
      });

      if (acc) {
        // VexFlow v4: add accidental via addModifier
        note.addModifier(new Accidental(acc), 0);
      }

      // Attach the note to its staff explicitly
      note.setStave(clefForNote === "treble" ? treble : bass);

      // Voice time must match whole-note duration → 1/1
      const voice = new Voice({ numBeats: 1, beatValue: 1 });
      voice.addTickable(note);

      // Format only for the active stave's width
      const layoutWidth = Math.max(60, STAFF_SPACE - 40);
      new Formatter().joinVoices([voice]).format([voice], layoutWidth);
      voice.draw(ctx, clefForNote === "treble" ? treble : bass);
    } catch (err) {
      console.error("[GrandStaveVF] draw error:", err);
    }

    return () => {
      try { host.innerHTML = ""; } catch {}
    };
    // redraw when inputs change, or when font becomes ready
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