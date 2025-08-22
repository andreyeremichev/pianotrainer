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
import useMusicFontReady from "./_guards/useMusicFontReady";

type Clef = "treble" | "bass";

type Props = {
  qa?: boolean;

  /** Old path (kept for backwards-compat/QA) */
  noteMidi?: number | null;

  /** NEW: exact spelling to draw, e.g. "Db4", "C#5", "C4". */
  noteName?: string | null;

  /** NEW: force the clef to render on (useful for C4 on both clefs). */
  forceClef?: Clef | null;
};

const NAMES_SHARP = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];
const midiToName = (m: number) => `${NAMES_SHARP[m % 12]}${Math.floor(m/12)-1}`;

/** "C#4" -> { key: "c#/4", accidental: "#", octave: 4 }  /  "Db4" -> { "db/4","b",4 } */
function parseNoteName(n: string) {
  const m = n.match(/^([A-Ga-g])([#b]?)(\d)$/);
  if (!m) return null;
  const letter = m[1].toLowerCase();
  const acc = (m[2] || "") as "" | "#" | "b";
  const oct = parseInt(m[3], 10);
  const key = `${letter}${acc ? acc : ""}/${oct}`; // e.g., "db/4"
  return { key, accidental: acc, octave: oct as number };
}

/** Default clef if none is forced & no MIDI is given */
const clefByOctave = (oct: number): Clef => (oct >= 4 ? "treble" : "bass");

/** Fixed-size grand stave: 260 × 170 px */
export default function GrandStaveVF({
  qa = false,
  noteMidi = null,
  noteName = null,
  forceClef = null,
}: Props) {
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

    host.innerHTML = "";

    const baseW = 260;
    const baseH = 170;

    const STAFF_SPACE = 10;
    const STAFF_HEIGHT = 4 * STAFF_SPACE;
    const GAP = 40;
    const PAD_TOP = 0;
    const PAD_BOTTOM = 20;

    const padX = 80;
    const drawW = baseW - padX;

    const trebleTopY = PAD_TOP - 15;
    const bassTopY   = trebleTopY + STAFF_HEIGHT + GAP;

    const canvasHost = document.createElement("div");
    canvasHost.className = "grandstave-canvas";
    canvasHost.style.width = `${baseW}px`;
    canvasHost.style.height = `${baseH}px`;
    host.appendChild(canvasHost);

    const renderer = new Renderer(canvasHost, Renderer.Backends.SVG);
    renderer.resize(baseW, baseH);
    const ctx = renderer.getContext();

    const treble = new Stave(padX, trebleTopY, drawW);
    treble.addClef("treble").setEndBarType(Barline.type.SINGLE).setContext(ctx).draw();

    const bass = new Stave(padX, bassTopY, drawW);
    bass.addClef("bass").setEndBarType(Barline.type.SINGLE).setContext(ctx).draw();

    new StaveConnector(treble, bass).setType(StaveConnector.type.BRACE).setContext(ctx).draw();
    new StaveConnector(treble, bass).setType(StaveConnector.type.SINGLE_LEFT).setContext(ctx).draw();
    new StaveConnector(treble, bass).setType(StaveConnector.type.SINGLE_RIGHT).setContext(ctx).draw();

    // --- NOTE DRAWING (Name wins, MIDI is fallback) ---
    if (noteName || typeof noteMidi === "number") {
      let vfKey = "c/4";
      let acc: "" | "#" | "b" = "";
      let clef: Clef = "treble";

      if (noteName) {
        const p = parseNoteName(noteName);
        if (p) {
          vfKey = p.key;
          acc = p.accidental;
          clef = forceClef ?? clefByOctave(p.octave);
        }
      } else if (typeof noteMidi === "number") {
        const nm = midiToName(noteMidi);
        const p = parseNoteName(nm)!;
        vfKey = p.key;
        acc = p.accidental;
        clef = forceClef ?? (noteMidi < 60 ? "bass" : "treble");
      }

      const staveForNote = clef === "bass" ? bass : treble;
      const note = new StaveNote({ clef, keys: [vfKey], duration: "w" });

      // ❌ draw accidental via VexFlow (disabled to take full control)
      // if (acc) note.addModifier(new Accidental(acc), 0);

      (note as any).setStave?.(staveForNote);
      (note as any).setContext?.(ctx);

      const layoutWidth = Math.max(60, drawW - 40);
      const voice = new Voice({ numBeats: 1, beatValue: 1 });
      voice.addTickable(note);
      new Formatter().joinVoices([voice]).format([voice], layoutWidth);
      voice.draw(ctx, staveForNote);

      /* ===== CUSTOM accidental overlay (small, aligned to the notehead) ===== */
      try {
        if (acc) {
          const svg = canvasHost.querySelector("svg") as SVGSVGElement | null;
          if (svg) {
            // Tunables
            const ACC_PT = 20;     // font size of accidental (pt) — change to taste
            const ACC_X_PAD = 4;   // horizontal gap between accidental and notehead (px)
            const ACC_Y_ADJ = 0;   // vertical fine-tune (px; +down, -up)

            // Scope to the (only) note we just drew
            const noteGroup = svg.querySelector("g.vf-stavenote");
            if (noteGroup) {
              // Remove a previous overlay if present (when re-rendering)
              noteGroup.querySelectorAll(".pt-acc-overlay").forEach(n => n.remove());

              // The notehead in VF5 is the first <text> inside the stavenote group.
              const texts = noteGroup.querySelectorAll("text");
              if (texts.length >= 1) {
                const headText = texts[0] as SVGTextElement;
                const bb = headText.getBBox();

                // Place accidental to the LEFT of the head, aligned to its vertical center.
                const x = bb.x - ACC_X_PAD;
                const y = bb.y + bb.height / 2 + ACC_Y_ADJ;

                const t = document.createElementNS(svg.namespaceURI, "text");
                t.classList.add("pt-acc-overlay");
                t.setAttribute("x", String(x));
                t.setAttribute("y", String(y));
                t.setAttribute("text-anchor", "end");           // measure from the right edge
                t.setAttribute("dominant-baseline", "middle");  // vertical center alignment
                t.setAttribute("font-family", "Bravura, Academico, serif");
                t.setAttribute("font-size", String(ACC_PT));
                t.setAttribute("fill", "currentColor");
                t.setAttribute("pointer-events", "none");
                // Use proper musical symbols (SMuFL/Unicode)
const symbol =
  acc === "#"
    ? "\u266F" // ♯
    : acc === "b"
    ? "\u266D" // ♭
    : "";
t.setAttribute("font-family", "Bravura Text, Bravura, Academico, serif");
// optional: tighten spacing a hair, tweak as needed
t.setAttribute("letter-spacing", "-0.5px");

t.textContent = symbol;

                // Append inside the same stavenote group so it moves with the note
                noteGroup.appendChild(t);
              }
            }
          }
        }
      } catch {
        // non-fatal if DOM probing fails
      }
      /* ===================================================================== */
    }

    // Responsive SVG sizing + manual right-edge safety line
    const svg = canvasHost.querySelector("svg") as SVGSVGElement | null;
    if (svg) {
      svg.removeAttribute("width");
      svg.removeAttribute("height");
      svg.setAttribute("viewBox", `0 0 ${baseW} ${baseH}`);
      (svg.style as any).width = "100%";
      (svg.style as any).height = "100%";
      svg.setAttribute("preserveAspectRatio", "xMidYMid meet");

      const RIGHT_INSET = 1;
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

    // Optional QA guides
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
        g.appendChild(mk(0)); g.appendChild(mk(baseH));
        svg.appendChild(g);
      }
    }

    return () => { host.innerHTML = ""; };
  }, [fontReady, noteMidi, noteName, forceClef]);

  return <div ref={hostRef} className="grandstave-host" />;
}