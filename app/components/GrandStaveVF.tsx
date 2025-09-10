// 🔒 FROZEN SIZE 260x170. Do not change geometry values unless explicitly requested.
"use client";

import React, { useEffect, useLayoutEffect, useRef } from "react";
import {
  Renderer,
  Stave,
  StaveConnector,
  StaveNote,
  Voice,
  Formatter,
  Barline,
} from "vexflow";
import useMusicFontReady from "./_guards/useMusicFontReady";

type Clef = "treble" | "bass";

type Props = {
  qa?: boolean;

  /** Back-compat: optional MIDI number (primary) */
  noteMidi?: number | null;

  /** Primary note spelling, e.g. "Db4", "C#5", "C4". */
  noteName?: string | null;

  /** OPTIONAL: second note to draw in the SAME staff draw (intervals). */
  secondaryNoteName?: string | null;

  /** Pixel nudge applied to the SECOND note (positive = right). Default 10. */
  secondaryXShift?: number;

  /** Force clef for the PRIMARY note (intervals, single-note modes) */
  forceClef?: Clef | null;

  /** NEW: Triad render — three note spellings, e.g. ["F#3","A3","C#4"] */
  triadNotes?: string[] | null;
};

const NAMES_SHARP = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];
const midiToName = (m: number) => `${NAMES_SHARP[m % 12]}${Math.floor(m/12)-1}`;

/** "C#4" -> { key: "c#/4", accidental: "#", octave: 4 } / "Db4" -> { "db/4","b",4 } */
function parseNoteName(n: string) {
  const m = n.match(/^([A-Ga-g])([#b]?)(-?\d)$/);
  if (!m) return null;
  const letter = m[1].toLowerCase();
  const acc = (m[2] || "") as "" | "#" | "b";
  const oct = parseInt(m[3], 10);
  const key = `${letter}${acc ? acc : ""}/${oct}`; // e.g., "db/4"
  return { key, accidental: acc, octave: oct as number };
}

/** Default clef if none is forced & no MIDI is given */
const clefByOctave = (oct: number): Clef => (oct >= 4 ? "treble" : "bass");

/** Fixed-size grand staff: 260 × 170 px (frozen) */
export default function GrandStaveVF({
  qa = false,
  noteMidi = null,
  noteName = null,
  secondaryNoteName = null,
  secondaryXShift = 10,
  forceClef = null,
  triadNotes = null,
}: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const fontReady = useMusicFontReady(hostRef); // pass the container <div> ref

  // Tiny CSS once
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
    if (!host) return;

    host.innerHTML = "";

    // ---- FROZEN geometry ----
    const baseW = 260;
    const baseH = 170;

    const STAFF_SPACE = 10;
    const STAFF_HEIGHT = 4 * STAFF_SPACE;
    const GAP = 40;           // vertical gap between staves (prevents glyph collisions)
    const PAD_TOP = 0;
    const PAD_BOTTOM = 20;

    const padX = 80;          // left margin to make room for brace/connectors
    const drawW = baseW - padX;

    const trebleTopY = PAD_TOP - 15;
    const bassTopY   = trebleTopY + STAFF_HEIGHT + GAP;

    const canvasHost = document.createElement("div");
    canvasHost.className = "grandstave-canvas";
    canvasHost.style.width = `${baseW}px`;
    canvasHost.style.height = `${baseH}px`;
    host.appendChild(canvasHost);

    try {
      // client-only renderer
      const renderer = new Renderer(canvasHost, Renderer.Backends.SVG);
      renderer.resize(baseW, baseH);
      const ctx = renderer.getContext();

      // Always draw a grand staff
      const treble = new Stave(padX, trebleTopY, drawW);
      treble.addClef("treble").setEndBarType(Barline.type.SINGLE).setContext(ctx).draw();

      const bass = new Stave(padX, bassTopY, drawW);
      bass.addClef("bass").setEndBarType(Barline.type.SINGLE).setContext(ctx).draw();

      // Brace + connectors (left/right)
      new StaveConnector(treble, bass).setType(StaveConnector.type.BRACE).setContext(ctx).draw();
      new StaveConnector(treble, bass).setType(StaveConnector.type.SINGLE_LEFT).setContext(ctx).draw();
      new StaveConnector(treble, bass).setType(StaveConnector.type.SINGLE_RIGHT).setContext(ctx).draw();

      // ----------------- NOTE DRAWING MODES -----------------
      // Helper: create a VexFlow note with our conventions
      const makeVF = (p: NonNullable<ReturnType<typeof parseNoteName>>, forcedClef?: Clef, xShift?: number) => {
        const clef: Clef = forcedClef ?? clefByOctave(p.octave);
        const sn = new StaveNote({ clef, keys: [p.key], duration: "h" }); // half notes for intervals/triads
        if (typeof xShift === "number" && (sn as any).setXShift) {
          try { (sn as any).setXShift(xShift); } catch {}
        }
        return { sn, clef, acc: p.accidental };
      };

      // We support three modes, in this order of precedence:
      // 1) triadNotes[] (chords page) → draw all three as half notes at same time position
      // 2) interval (noteName + secondaryNoteName) → two half notes, second can be x-shifted
      // 3) single (noteName or noteMidi) → one WHOLE note
      let stavenoteGroupsToOverlay: { groupIndex: number; acc: ""|"#"|"b" }[] = [];

      if (triadNotes && triadNotes.length) {
        // --- Triad mode ---
        const parsed = triadNotes.map(n => parseNoteName(n)).filter(Boolean) as NonNullable<ReturnType<typeof parseNoteName>>[];
        if (parsed.length) {
          const items = parsed.map(p => makeVF(p));
          // voices: one per note, at the same time
          const voices: Voice[] = [];
          items.forEach(it => {
            const v = new Voice({ numBeats: 1, beatValue: 2 }); // half-note time for visual consistency
            v.addTickable(it.sn);
            voices.push(v);
          });

          const fmt = new Formatter();
          try { fmt.joinVoices(voices as any); } catch {}
          fmt.format(voices as any, Math.max(60, drawW - 40));

          // draw each where it belongs
          items.forEach((it, i) => {
            const staveFor = it.clef === "bass" ? bass : treble;
            voices[i].draw(ctx, staveFor);
          });

          // overlay order = the order VexFlow creates <g.vf-stavenote> groups
          stavenoteGroupsToOverlay = items.map((it, i) => ({ groupIndex: i, acc: it.acc }));
        }
      } else {
        // interval or single
        let primParsed: ReturnType<typeof parseNoteName> | null = null;
        if (noteName) {
          primParsed = parseNoteName(noteName);
        } else if (typeof noteMidi === "number") {
          const nm = midiToName(noteMidi);
          primParsed = parseNoteName(nm);
        }
        const secParsed = secondaryNoteName ? parseNoteName(secondaryNoteName) : null;

        if (primParsed || secParsed) {
          if (primParsed && secParsed) {
            // --- Interval mode (two half notes; second can be x-shifted) ---
            const prim = makeVF(primParsed, forceClef ?? undefined, undefined);
            const sec  = makeVF(secParsed, undefined, secondaryXShift ?? 10);

            const v1 = new Voice({ numBeats: 1, beatValue: 2 });
            v1.addTickable(prim.sn);
            const v2 = new Voice({ numBeats: 1, beatValue: 2 });
            v2.addTickable(sec.sn);

            const fmt = new Formatter();
            try { fmt.joinVoices([v1, v2] as any); } catch {}
            fmt.format([v1, v2] as any, Math.max(60, drawW - 40));

            v1.draw(ctx, prim.clef === "bass" ? bass : treble);
            v2.draw(ctx, sec.clef === "bass" ? bass : treble);

            stavenoteGroupsToOverlay = [
              { groupIndex: 0, acc: prim.acc },
              { groupIndex: 1, acc: sec.acc  },
            ];
          } else {
            // --- Single note mode (whole note) ---
            const src = primParsed ?? (secParsed as NonNullable<typeof secParsed>);
            const clef: Clef = forceClef ?? clefByOctave(src.octave);
            const note = new StaveNote({ clef, keys: [src.key], duration: "w" });
            const voice = new Voice({ numBeats: 1, beatValue: 1 });
            voice.addTickable(note);
            new Formatter().joinVoices([voice] as any).format([voice] as any, Math.max(60, drawW - 40));
            voice.draw(ctx, clef === "bass" ? bass : treble);
            stavenoteGroupsToOverlay = [{ groupIndex: 0, acc: src.accidental }];
          }
        }
      }

      /* ===== Manual accidental overlay for each drawn note (Unicode ♯/♭) ===== */
      try {
        const svg = canvasHost.querySelector("svg") as SVGSVGElement | null;
        if (svg && stavenoteGroupsToOverlay.length) {
          const groups = Array.from(svg.querySelectorAll("g.vf-stavenote"));
          // clean any previous overlays (if re-render)
          groups.forEach(g => g.querySelectorAll(".pt-acc-overlay").forEach(n => n.remove()));

          const ACC_PT = 20;
          const ACC_X_PAD = 4;
          const ACC_Y_ADJ = 0;

          stavenoteGroupsToOverlay.forEach(({ groupIndex, acc }) => {
            if (!acc) return;
            const g = groups[groupIndex] as SVGGElement | undefined;
            if (!g) return;
            const head = g.querySelector("text");
            if (!head) return;
            const bb = (head as SVGGraphicsElement).getBBox();

            const t = document.createElementNS(svg.namespaceURI, "text");
            t.classList.add("pt-acc-overlay");
            t.setAttribute("x", String(bb.x - ACC_X_PAD));
            t.setAttribute("y", String(bb.y + bb.height / 2 + ACC_Y_ADJ));
            t.setAttribute("text-anchor", "end");
            t.setAttribute("dominant-baseline", "middle");
            t.setAttribute("font-family", "Bravura Text, Bravura, serif");
            t.setAttribute("font-size", String(ACC_PT));
            t.setAttribute("fill", "currentColor");
            t.setAttribute("pointer-events", "none");
            t.setAttribute("letter-spacing", "-0.5px");
            t.textContent = acc === "#" ? "\u266F" : acc === "b" ? "\u266D" : "";
            g.appendChild(t);
          });
        }
      } catch {
        // non-fatal
      }

      // Responsive SVG + manual right edge (safety line)
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

      if (qa) {
        const svg2 = canvasHost.querySelector("svg");
        if (svg2) {
          const mk = (y: number) => {
            const l = document.createElementNS(svg2.namespaceURI, "line");
            l.setAttribute("x1","0"); l.setAttribute("x2", String(baseW));
            l.setAttribute("y1", String(y)); l.setAttribute("y2", String(y));
            l.setAttribute("stroke","#00AAFF"); l.setAttribute("stroke-dasharray","4 3");
            l.setAttribute("vector-effect","non-scaling-stroke");
            return l;
          };
          const g = document.createElementNS(svg2.namespaceURI, "g");
          g.appendChild(mk(0)); g.appendChild(mk(baseH));
          svg2.appendChild(g);
        }
      }
    } catch (err) {
      console.error("[GrandStaveVF] draw error:", err);
    }

    return () => { host.innerHTML = ""; };
  }, [
    fontReady,
    // single/interval props
    noteMidi, noteName, secondaryNoteName, secondaryXShift, forceClef,
    // triad mode
    triadNotes,
  ]);

  return <div ref={hostRef} className="grandstave-host" />;
}