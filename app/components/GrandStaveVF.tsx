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
  Accidental,
} from "vexflow";
import useMusicFontReady from "./_guards/useMusicFontReady";

// Convert a VexFlow key like "c#/4" or "db/3" → MIDI number
function midiFromVfKey(vfKey: string): number {
  const m = /^([a-g])([#b]?)[/](\-?\d+)$/.exec(vfKey);
  if (!m) throw new Error(`Bad VexFlow key: ${vfKey}`);
  const letter = m[1].toUpperCase();
  const acc = (m[2] || "") as "" | "#" | "b";
  const oct = parseInt(m[3], 10);
  const BASE_PC: Record<string, number> = { C:0, D:2, E:4, F:5, G:7, A:9, B:11 };
  let pc = BASE_PC[letter];
  if (acc === "#") pc = (pc + 1) % 12;
  else if (acc === "b") pc = (pc + 11) % 12;
  return (oct + 1) * 12 + pc;
}

// Convert "C#4" / "Db4" / "A3" → MIDI
function noteNameToMidi(n: string): number {
  const m = /^([A-Ga-g])([#b]?)(-?\d+)$/.exec(n);
  if (!m) throw new Error(`Bad note name: ${n}`);
  const letter = m[1].toUpperCase();
  const acc = m[2] as "" | "#" | "b";
  const oct = parseInt(m[3], 10);
  const BASE_PC: Record<string, number> = { C:0, D:2, E:4, F:5, G:7, A:9, B:11 };
  let pc = BASE_PC[letter];
  if (acc === "#") pc = (pc + 1) % 12;
  else if (acc === "b") pc = (pc + 11) % 12;
  return (oct + 1) * 12 + pc;
}

// Middle line references (scientific pitch)
const TREBLE_MIDDLE = 71; // B4
const BASS_MIDDLE   = 50; // D3

// Decide stem direction per clef: below middle → up (1); on/above → down (-1)
function stemDirFor(midi: number, clef: "treble" | "bass"): 1 | -1 {
  return clef === "treble"
    ? (midi < TREBLE_MIDDLE ? 1 : -1)
    : (midi < BASS_MIDDLE   ? 1 : -1);
}

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

  /** Triad render — three note spellings, e.g. ["F#3","A3","C#4"] */
  triadNotes?: string[] | null;

  /** When true, triads render as 3 sequential notes (arpeggio) instead of a single chord */
  triadArpeggio?: boolean;
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
  const key = `${letter}${acc ? acc : ""}/${oct}`;
  return { key, accidental: acc, octave: oct as number };
}

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
  triadArpeggio = false,
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
      const makeVF = (
        p: NonNullable<ReturnType<typeof parseNoteName>>,
        forcedClef?: Clef,
        xShift?: number,
        duration: "h" | "q" = "h",
        addAccidental = false
      ) => {
        const clef: Clef = forcedClef ?? clefByOctave(p.octave);
        const vfKey = p.key;
        const midi  = midiFromVfKey(vfKey);
        const dir   = stemDirFor(midi, clef);

        const sn = new StaveNote({
          clef,
          keys: [vfKey],
          duration,
          stemDirection: dir,
        });
        (sn as any).setAutoStem?.(false);

        if (addAccidental && p.accidental) {
          sn.addModifier(new Accidental(p.accidental), 0);
        }

        if (typeof xShift === "number" && (sn as any).setXShift) {
          try { (sn as any).setXShift(xShift); } catch {}
        }
        return { sn, clef, acc: p.accidental || "" as ""|"#"|"b" };
      };

      // 1) triadNotes[] (chords page)
      // 2) interval (noteName + secondaryNoteName)
      // 3) single (noteName or noteMidi)
      let stavenoteGroupsToOverlay: { groupIndex: number; acc: ""|"#"|"b" }[] = [];

      if (triadNotes && triadNotes.length) {
        // ===== TRIAD MODE =====
        const parsed = triadNotes
          .map(n => parseNoteName(n))
          .filter(Boolean) as NonNullable<ReturnType<typeof parseNoteName>>[];

        if (parsed.length) {
          if (triadArpeggio) {
            // --- draw as sequential notes (arpeggio) ---
            const trebleNotes: StaveNote[] = [];
            const bassNotesArr: StaveNote[] = [];

            parsed.forEach(p => {
              const clefFor = clefByOctave(p.octave);
              const { sn } = makeVF(p, clefFor, undefined, "q", true); // quarter notes, add accidental glyphs
              if (clefFor === "treble") trebleNotes.push(sn);
              else bassNotesArr.push(sn);
            });

            // modest margin from clef/key
            treble.setNoteStartX(treble.getNoteStartX() + 12);
            bass.setNoteStartX(bass.getNoteStartX() + 12);

            // format and draw each staff sequence independently
            if (trebleNotes.length) {
              const vT = new Voice({ numBeats: Math.max(1, trebleNotes.length), beatValue: 4 }).setStrict(false);
              vT.addTickables(trebleNotes);
              const fT = new Formatter();
              try { fT.joinVoices([vT] as any); } catch {}
              fT.format([vT] as any, Math.max(80, drawW - 80));
              vT.draw(ctx, treble);
            }

            if (bassNotesArr.length) {
              const vB = new Voice({ numBeats: Math.max(1, bassNotesArr.length), beatValue: 4 }).setStrict(false);
              vB.addTickables(bassNotesArr);
              const fB = new Formatter();
              try { fB.joinVoices([vB] as any); } catch {}
              fB.format([vB] as any, Math.max(80, drawW - 80));
              vB.draw(ctx, bass);
            }

            // No manual overlay needed (we added Accidental modifiers)
            stavenoteGroupsToOverlay = [];
          } else {
            // --- draw as a single chord per staff (block) ---
            const trebleKeys: string[] = [];
            const trebleAccs: ("" | "#" | "b")[] = [];
            const bassKeys: string[] = [];
            const bassAccs: ("" | "#" | "b")[] = [];

            parsed.forEach(p => {
              const clefFor = clefByOctave(p.octave);
              if (clefFor === "treble") {
                trebleKeys.push(p.key);
                trebleAccs.push(p.accidental || "");
              } else {
                bassKeys.push(p.key);
                bassAccs.push(p.accidental || "");
              }
            });

            const voices: Voice[] = [];
            const drawPlan: Array<{ voice: Voice; staff: "treble" | "bass" }> = [];

            const chordStemDir = (keys: string[], clef: "treble" | "bass") => {
              const avg = keys.reduce((s, k) => s + midiFromVfKey(k), 0) / keys.length;
              return stemDirFor(avg, clef);
            };

            if (trebleKeys.length) {
              const chord = new StaveNote({
                clef: "treble", keys: trebleKeys, duration: "h",
                stemDirection: chordStemDir(trebleKeys, "treble"),
              });
              trebleAccs.forEach((acc, idx) => { if (acc) chord.addModifier(new Accidental(acc), idx); });
              const vT = new Voice({ numBeats: 1, beatValue: 2 }).setStrict(false);
              vT.addTickable(chord); voices.push(vT); drawPlan.push({ voice: vT, staff: "treble" });
            }

            if (bassKeys.length) {
              const chord = new StaveNote({
                clef: "bass", keys: bassKeys, duration: "h",
                stemDirection: chordStemDir(bassKeys, "bass"),
              });
              bassAccs.forEach((acc, idx) => { if (acc) chord.addModifier(new Accidental(acc), idx); });
              const vB = new Voice({ numBeats: 1, beatValue: 2 }).setStrict(false);
              vB.addTickable(chord); voices.push(vB); drawPlan.push({ voice: vB, staff: "bass" });
            }

            const fmt = new Formatter();
            try { fmt.joinVoices(voices as any); } catch {}

            treble.setNoteStartX(treble.getNoteStartX() + 12);
            bass.setNoteStartX(bass.getNoteStartX() + 12);

            fmt.format(voices as any, Math.max(80, drawW - 80));

            drawPlan.forEach(({ voice, staff }) => {
              voice.draw(ctx, staff === "treble" ? treble : bass);
            });

            // no manual overlay here either (accidentals added on the chord)
            stavenoteGroupsToOverlay = [];
          }
        }
      } else {
        // ===== INTERVAL or SINGLE =====

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
            const prim = makeVF(primParsed, forceClef ?? undefined, undefined, "h", false);
            const sec  = makeVF(secParsed, undefined, secondaryXShift ?? 10, "h", false);

            // set stem direction explicitly (already set inside makeVF; kept here for clarity)
            {
              const k1 = prim.sn.getKeys()[0], m1 = midiFromVfKey(k1);
              (prim.sn as any).setStemDirection?.(stemDirFor(m1, prim.clef));
              (prim.sn as any).setAutoStem?.(false);

              const k2 = sec.sn.getKeys()[0],  m2 = midiFromVfKey(k2);
              (sec.sn  as any).setStemDirection?.(stemDirFor(m2,  sec.clef ));
              (sec.sn  as any).setAutoStem?.(false);
            }

            const v1 = new Voice({ numBeats: 1, beatValue: 2 });
            v1.addTickable(prim.sn);
            const v2 = new Voice({ numBeats: 1, beatValue: 2 });
            v2.addTickable(sec.sn);

            const fmt = new Formatter();
            try { fmt.joinVoices([v1, v2] as any); } catch {}
            fmt.format([v1, v2] as any, Math.max(60, drawW - 40));

            v1.draw(ctx, prim.clef === "bass" ? bass : treble);
            v2.draw(ctx, sec.clef === "bass" ? bass : treble);

            // use manual overlay only for interval mode (your existing UI)
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
            stavenoteGroupsToOverlay = [{ groupIndex: 0, acc: src.accidental || "" }];
          }
        }
      }

      /* ===== Manual accidental overlay for intervals only (Unicode ♯/♭) ===== */
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
    triadNotes, triadArpeggio,
  ]);

  return <div ref={hostRef} className="grandstave-host" />;
}