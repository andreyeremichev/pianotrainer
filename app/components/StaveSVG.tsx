// app/components/StaveSVG.tsx
"use client";

import React, { useEffect, useRef, useImperativeHandle } from "react";
import {
  Accidental,
  Formatter,
  Renderer,
  Stave,
  StaveConnector,
  StaveNote,
  Voice,
} from "vexflow";

export type StaveSVGProps = {
  width?: number | string;          // default 1100
  height?: number | string;         // default 380
  leftPadding?: number | string;    // default 70
  rightPadding?: number | string;   // default 40
  staffGap?: number | string;       // default 90
  trebleNotes?: string[];           // default ["C4"]
  bassNotes?: string[];             // default ["C3"]
  duration?: "w" | "h" | "q" | "8" | "16"; // default "w"
  showBrace?: boolean;              // default true
  showLeftConnector?: boolean;      // default true
  showRightConnector?: boolean;     // default true

  /** Optional horizontal shifts (px) applied to the FIRST note in each staff */
  xShiftTrebleFirst?: number;       // default 0
  xShiftBassFirst?: number;         // default 0

  "aria-label"?: string;
};

export type StaveSVGHandle = {
  getSVGElement(): SVGSVGElement | null;
};

function parseNote(name: string) {
  const m = name.trim().match(/^([A-Ga-g])([#b]?)(\d)$/);
  if (!m) return null;
  const letter = m[1].toLowerCase();
  const acc = m[2] || "";
  const oct = m[3];
  return { key: `${letter}${acc}/${oct}`, acc: acc || null };
}

const StaveSVG = React.forwardRef<StaveSVGHandle, StaveSVGProps>(
  (
    {
      width = 1100,
      height = 380,
      leftPadding = 70,
      rightPadding = 40,
      staffGap = 90,
      trebleNotes = ["C4"],
      bassNotes = ["C3"],
      duration = "w",
      showBrace = true,
      showLeftConnector = true,
      showRightConnector = true,
      xShiftTrebleFirst = 0,
      xShiftBassFirst = 0,
      "aria-label": ariaLabel = "Grand staff (SVG)",
    },
    ref
  ) => {
    const containerRef = useRef<HTMLDivElement | null>(null);

    useImperativeHandle(ref, () => ({
      getSVGElement: () =>
        containerRef.current?.querySelector("svg") || null,
    }));

    useEffect(() => {
      const el = containerRef.current;
      if (!el) return;
      el.innerHTML = "";

      // Coerce numeric props (no NaN to VF)
      const W  = Number(width)       || 1100;
      const H  = Number(height)      || 380;
      const LP = Number(leftPadding) || 70;
      const RP = Number(rightPadding)|| 40;
      const GAP= Number(staffGap)    || 90;

      const renderer = new Renderer(el, Renderer.Backends.SVG);
      renderer.resize(W, H);
      const context = renderer.getContext();

      const contentWidth = Math.max(10, W - LP - RP);
      const staveHeight  = 80;
      const trebleY      = Math.round(H / 2 - (staveHeight + GAP / 2));
      const bassY        = trebleY + staveHeight + GAP;

      const treble = new Stave(LP, trebleY, contentWidth);
      treble.addClef("treble").setContext(context).draw();

      const bass = new Stave(LP, bassY, contentWidth);
      bass.addClef("bass").setContext(context).draw();

      if (showLeftConnector) {
        new StaveConnector(treble, bass)
          .setType(StaveConnector.type.SINGLE_LEFT)
          .setContext(context).draw();
      }
      if (showBrace) {
        new StaveConnector(treble, bass)
          .setType(StaveConnector.type.BRACE)
          .setContext(context).draw();
      }
      if (showRightConnector) {
        new StaveConnector(treble, bass)
          .setType(StaveConnector.type.SINGLE_RIGHT)
          .setContext(context).draw();
      }

      // Build notes and ATTACH staves early for safe geometry if needed
      const make = (n: string, clef: "treble" | "bass") => {
        const info = parseNote(n) ?? { key: clef === "treble" ? "c/4" : "c/3", acc: null as string | null };
        const s = new StaveNote({ clef, keys: [info.key], duration });
        if (info.acc) s.addAccidental(0, new Accidental(info.acc));
        s.setStave(clef === "treble" ? treble : bass);
        return s;
      };

      const trebleNotesArr = (trebleNotes?.length ? trebleNotes : ["C4"]).map(n => make(n, "treble"));
      const bassNotesArr   = (bassNotes?.length ? bassNotes   : ["C3"]).map(n => make(n, "bass"));

      // Voices (SOFT mode) → Format → apply optional X shifts → Draw
      const tVoice = new Voice({ num_beats: 4, beat_value: 4 });
      tVoice.setMode(Voice.Mode.SOFT).addTickables(trebleNotesArr);

      const bVoice = new Voice({ num_beats: 4, beat_value: 4 });
      bVoice.setMode(Voice.Mode.SOFT).addTickables(bassNotesArr);

      const formatWidth = Math.max(10, contentWidth - 10);
      new Formatter().format([tVoice], formatWidth);
      new Formatter().format([bVoice], formatWidth);

      // Apply horizontal shift to FIRST note if requested
      if (Number.isFinite(xShiftTrebleFirst) && trebleNotesArr[0]) {
        trebleNotesArr[0].setXShift((trebleNotesArr[0].getXShift?.() ?? 0) + Number(xShiftTrebleFirst));
      }
      if (Number.isFinite(xShiftBassFirst) && bassNotesArr[0]) {
        bassNotesArr[0].setXShift((bassNotesArr[0].getXShift?.() ?? 0) + Number(xShiftBassFirst));
      }

      tVoice.draw(context, treble);
      bVoice.draw(context, bass);
    }, [
      width, height, leftPadding, rightPadding, staffGap,
      trebleNotes, bassNotes, duration,
      showBrace, showLeftConnector, showRightConnector,
      xShiftTrebleFirst, xShiftBassFirst,
      ariaLabel,
    ]);

    return <div ref={containerRef} role="img" aria-label={ariaLabel} />;
  }
);

StaveSVG.displayName = "StaveSVG";
export default StaveSVG;