"use client";

import React, { useEffect, useLayoutEffect, useRef } from "react";
import {
  Renderer,
  Stave,
  StaveConnector,
  StaveNote,
  Voice,
  Formatter,
  Accidental,
  Barline,
} from "vexflow";
import { useMusicFontReady } from "./_guards/useMusicFontReady";

type Props = {
  qa?: boolean;
  /** Optional: draw this MIDI as a whole note (C2=36 … C6=84). */
  noteMidi?: number | null;
};

const NAMES_SHARP = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];
const midiToName = (m: number) => `${NAMES_SHARP[m % 12]}${Math.floor(m/12)-1}`;

/** Fixed-size grand stave: 260 × 170 px, self-contained. */
export default function GrandStaveVF({ qa = false, noteMidi = null }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const fontReady = useMusicFontReady();

  // Local CSS once
  useLayoutEffect(() => {
    const id = "grandstave-fixed-css";
    if (document.getElementById(id)) return;
    const style = document.createElement("style");
    style.id = id;
    style.textContent = `
.grandstave-host{ position:relative; display:block; width:260px; height:170px; overflow:hidden; }
.grandstave-canvas{ position:absolute; inset:0; }
`;
    document.head.appendChild(style);
  }, []);

  useEffect(() => {
    const host = hostRef.current;
    if (!host || !fontReady) return;

    // Clear previous render
    host.innerHTML = "";

    // Fixed frame
    const baseW = 260;
    const baseH = 170;

    // Derived layout (as requested)
    const STAFF_SPACE = 10;             // distance between staff lines
    const STAFF_HEIGHT = 4 * STAFF_SPACE; // 40px staff height
    const GAP = 40;                     // treble–bass gap
    const PAD_TOP = 0;                 // C6 ledger room
    const PAD_BOTTOM = 20;              // C2 ledger room

    // Horizontal lane
    const padX = 80;
    const drawW = baseW - padX;     // 220

    // Vertical positions
    const trebleTopY = PAD_TOP -15;                             // 25
    const bassTopY   = trebleTopY + STAFF_HEIGHT + GAP;     // 25 + 40 + 40 = 105

    // Mount a real DIV for VexFlow
    const canvasHost = document.createElement("div");
    canvasHost.className = "grandstave-canvas";
    canvasHost.style.width = `${baseW}px`;
    canvasHost.style.height = `${baseH}px`;
    host.appendChild(canvasHost);

    const renderer = new Renderer(canvasHost, Renderer.Backends.SVG);
    renderer.resize(baseW, baseH);
    const ctx = renderer.getContext();

    // Staves & clefs, with right barlines
    const treble = new Stave(padX, trebleTopY, drawW);
    treble.addClef("treble").setEndBarType(Barline.type.SINGLE).setContext(ctx).draw();

    const bass = new Stave(padX, bassTopY, drawW);
    bass.addClef("bass").setEndBarType(Barline.type.SINGLE).setContext(ctx).draw();

    // Connectors (brace + left/right)
    new StaveConnector(treble, bass).setType(StaveConnector.type.BRACE).setContext(ctx).draw();
    new StaveConnector(treble, bass).setType(StaveConnector.type.SINGLE_LEFT).setContext(ctx).draw();
    new StaveConnector(treble, bass).setType(StaveConnector.type.SINGLE_RIGHT).setContext(ctx).draw();

    // Optional note (whole) at left
    if (typeof noteMidi === "number") {
      const name = midiToName(noteMidi); // e.g., "C#4"
      const hasSharp = /#/.test(name);
      const letter = name.replace(/\d+$/,"").replace("#","");
      const octave = parseInt(name.match(/\d+$/)?.[0] ?? "4", 10);

      const clef = noteMidi < 60 ? "bass" : "treble"; // C4 boundary
      const staveForNote = clef === "bass" ? bass : treble;

      const vfKey = `${letter.toLowerCase()}${hasSharp ? "#" : ""}/${octave}`;
      const note = new StaveNote({ clef, keys: [vfKey], duration: "w" });
      if (hasSharp) note.addModifier(new Accidental("#"), 0);

      (note as any).setStave?.(staveForNote);
      (note as any).setContext?.(ctx);

      const layoutWidth = Math.max(60, drawW - 40);
      const voice = new Voice({ num_beats: 1, beat_value: 1 });
      voice.addTickable(note);
      new Formatter().joinVoices([voice]).format([voice], layoutWidth);
      voice.draw(ctx, staveForNote);
    }

    // Make SVG align to fixed box
    const svg = canvasHost.querySelector("svg") as SVGSVGElement | null;
    if (svg) {
      svg.removeAttribute("width");
      svg.removeAttribute("height");
      svg.setAttribute("viewBox", `0 0 ${baseW} ${baseH}`);
      (svg.style as any).width = "100%";
      (svg.style as any).height = "100%";
      svg.setAttribute("preserveAspectRatio", "xMidYMid meet");

      // Manual right-edge line as a last-resort visibility guard
      const RIGHT_INSET = 1; // keep inside viewBox
      const xRight = padX + drawW - RIGHT_INSET;
      const yTop = treble.getYForLine(0);
      const yBot = bass.getYForLine(4);
      const manual = document.createElementNS(svg.namespaceURI, "line");
      manual.setAttribute("x1", String(xRight));
      manual.setAttribute("x2", String(xRight));
      manual.setAttribute("y1", String(yTop));
      manual.setAttribute("y2", String(yBot));
      manual.setAttribute("stroke", "#000");
      manual.setAttribute("stroke-width", "1");
      manual.setAttribute("vector-effect", "non-scaling-stroke");
      svg.appendChild(manual);
    }

    // QA guides (optional)
    if (qa) {
      const svg = canvasHost.querySelector("svg");
      if (svg) {
        const mk = (y: number) => {
          const l = document.createElementNS(svg.namespaceURI, "line");
          l.setAttribute("x1","0"); l.setAttribute("x2", String(baseW));
          l.setAttribute("y1", String(y)); l.setAttribute("y2", String(y));
          l.setAttribute("stroke","#00AAFF"); l.setAttribute("stroke-dasharray","4 3");
          l.setAttribute("vector-effect","non-scaling-stroke");
          return l;
        };
        const g = document.createElementNS(svg.namespaceURI, "g");
        g.appendChild(mk(0));
        g.appendChild(mk(baseH));
        svg.appendChild(g);
      }
    }

    return () => { host.innerHTML = ""; };
  }, [fontReady, noteMidi]);

  return <div ref={hostRef} className="grandstave-host" />;
}