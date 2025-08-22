"use client";

import { useEffect, useRef, useState } from "react";
import {
  Renderer,
  Stave,
  StaveNote,
  Voice,
  Formatter,
  StaveConnector,
} from "vexflow";

// === Adjustable layout paddings (easy tweak) ===
const TOP_PADDING = 50;        // space above treble stave (fixes C6 cut)
const TREBLE_TO_BASS_GAP = 90; // distance between treble and bass staves
const STAVE_TO_KEYBOARD_GAP = -150; // negative reduces space (pulls keyboard closer)
const TOTAL_HEIGHT = 420;      // total SVG height

// === Constants for accidental offsets ===
const SHARP_X_OFFSET = -12;
const SHARP_Y_OFFSET = 3;
const FLAT_X_OFFSET = -12;
const FLAT_Y_OFFSET = 3;

// === Audio playback helper (encode #) ===
function playNoteAudio(noteName: string) {
  const safeName = noteName.replace("#", "%23");
  const audio = new Audio(`/audio/notes/${safeName}.wav`);
  audio.currentTime = 0;
  audio.play().catch((err) => console.error("Audio play failed:", err));
}

// === Enharmonic flat map for vertical pitch ===
const ENHARMONIC_FLAT_MAP: Record<string, string> = {
  "C#": "D",
  "D#": "E",
  "F#": "G",
  "G#": "A",
  "A#": "B",
};

// === Keyboard pattern ===
const OCTAVE_PATTERN = [
  { note: "C", black: false },
  { note: "C#", black: true },
  { note: "D", black: false },
  { note: "D#", black: true },
  { note: "E", black: false },
  { note: "F", black: false },
  { note: "F#", black: true },
  { note: "G", black: false },
  { note: "G#", black: true },
  { note: "A", black: false },
  { note: "A#", black: true },
  { note: "B", black: false },
];

// Build keys C2 → C6
const buildKeys = () => {
  const keys: { name: string; black: boolean }[] = [];
  for (let octave = 2; octave <= 5; octave++) {
    OCTAVE_PATTERN.forEach((p) =>
      keys.push({ name: `${p.note}${octave}`, black: p.black })
    );
  }
  keys.push({ name: "C6", black: false });
  return keys;
};

const KEYS = buildKeys();

// Convert note string to VexFlow format
const toVexFlow = (note: string) => {
  const match = note.match(/([A-G]#?)(\d)/);
  if (!match) return "c/4";
  const [, letter, octave] = match;
  return `${letter.toLowerCase()}/${octave}`;
};

// Decide clef
const clefForNote = (note: string) => {
  const octave = parseInt(note[note.length - 1]);
  if (note === "C4") return "bass";
  return octave >= 4 ? "treble" : "bass";
};

// === Unified index (white or black) ===
const getKeyIndex = (noteName: string) => {
  const keyIndex = KEYS.findIndex((k) => k.name === noteName);
  const whitesBefore = KEYS.slice(0, keyIndex).filter((k) => !k.black).length;
  return KEYS[keyIndex].black ? whitesBefore - 0.5 : whitesBefore;
};

export default function KeysToNotesPlayingPage() {
  const [selectedNote, setSelectedNote] = useState<string | null>(null);
  const [scaleFactor, setScaleFactor] = useState(1);
  const [lastWhiteIndex, setLastWhiteIndex] = useState<number | null>(null);

  const canvasRef = useRef<HTMLDivElement>(null);

  // Base constants
  const BASE_WHITE_WIDTH = 30;
  const BASE_LEFT_MARGIN = 60;
  const BASE_WHITE_HEIGHT = 110;
  const BASE_BLACK_HEIGHT = 70;

  // Scaled constants
  const WHITE_WIDTH = BASE_WHITE_WIDTH * scaleFactor;
  const LEFT_MARGIN = BASE_LEFT_MARGIN * scaleFactor;
  const WHITE_HEIGHT = BASE_WHITE_HEIGHT * scaleFactor;
  const BLACK_WIDTH = WHITE_WIDTH * 0.66;
  const BLACK_HEIGHT = BASE_BLACK_HEIGHT * scaleFactor;

  // Responsive scaling
  useEffect(() => {
    const updateScale = () => {
      const viewportWidth = window.innerWidth;
      const totalWidth =
        BASE_LEFT_MARGIN + (KEYS.filter((k) => !k.black).length + 0.5) * BASE_WHITE_WIDTH;
      setScaleFactor(viewportWidth < totalWidth ? viewportWidth / totalWidth : 1);
    };
    updateScale();
    window.addEventListener("resize", updateScale);
    return () => window.removeEventListener("resize", updateScale);
  }, []);

  // Draw stave and selected note
  useEffect(() => {
    if (!canvasRef.current) return;
    canvasRef.current.innerHTML = "";

    const whiteKeysCount = KEYS.filter((k) => !k.black).length;
    const staveWidth = whiteKeysCount * WHITE_WIDTH;

    const renderer = new Renderer(canvasRef.current, Renderer.Backends.SVG);
    renderer.resize(staveWidth + LEFT_MARGIN, TOTAL_HEIGHT * scaleFactor);
    const context = renderer.getContext();

    // Vertical positions
    const trebleY = TOP_PADDING * scaleFactor;
    const bassY = (TOP_PADDING + TREBLE_TO_BASS_GAP) * scaleFactor;

    const staveTreble = new Stave(LEFT_MARGIN, trebleY, staveWidth);
    staveTreble.addClef("treble").setContext(context).draw();

    const staveBass = new Stave(LEFT_MARGIN, bassY, staveWidth);
    staveBass.addClef("bass").setContext(context).draw();

    // Connectors
    new StaveConnector(staveTreble, staveBass)
      .setType(StaveConnector.type.BRACE)
      .setContext(context)
      .draw();

    new StaveConnector(staveTreble, staveBass)
      .setType(StaveConnector.type.SINGLE_LEFT)
      .setContext(context)
      .draw();

    new StaveConnector(staveTreble, staveBass)
      .setType(StaveConnector.type.SINGLE_RIGHT)
      .setContext(context)
      .draw();

    if (selectedNote) {
      // Determine accidental symbol (♯ or ♭)
      let symbol = "\u266F"; // sharp default
      if (
        lastWhiteIndex !== null &&
        getKeyIndex(selectedNote) < lastWhiteIndex
      ) {
        symbol = "\u266D"; // flat
      }

      // Build VexFlow key (sharp for ♯, flat-mapped for ♭)
      let vfNoteName = selectedNote;
      if (symbol === "\u266D") {
        const match = selectedNote.match(/([A-G]#)(\d)/);
        if (match) {
          const [, letterSharp, octave] = match;
          const flatLetter = ENHARMONIC_FLAT_MAP[letterSharp] || letterSharp;
          vfNoteName = `${flatLetter}${octave}`;
        }
      }

      const vfKey = toVexFlow(vfNoteName);
      const clef = clefForNote(vfNoteName);

      const note = new StaveNote({
        keys: [vfKey],
        duration: "w",
        clef,
      });

      // Horizontal alignment (always by physical key)
      const index = getKeyIndex(selectedNote);
      const xPos = LEFT_MARGIN + index * WHITE_WIDTH + WHITE_WIDTH / 2;

      const voice = new Voice({ num_beats: 4, beat_value: 4 });
      voice.addTickable(note);
      new Formatter().joinVoices([voice]).format([voice], 0);

      note.setStave(clef === "treble" ? staveTreble : staveBass);
      note.setContext(context);

      const shift = xPos - note.getAbsoluteX();
      note.setXShift(shift);
      note.draw();

      // Draw accidental symbol manually
      if (selectedNote.includes("#")) {
        const svg = canvasRef.current.querySelector("svg");
        if (svg) {
          const yPositions = note.getYs();
          const noteY = yPositions[0];

          const xOffset = symbol === "\u266F" ? SHARP_X_OFFSET : FLAT_X_OFFSET;
          const yOffset = symbol === "\u266F" ? SHARP_Y_OFFSET : FLAT_Y_OFFSET;

          const accidental = document.createElementNS(
            "http://www.w3.org/2000/svg",
            "text"
          );
          accidental.setAttribute("x", `${xPos + xOffset}`);
          accidental.setAttribute("y", `${noteY + yOffset}`);
          accidental.setAttribute("font-size", "10");
          accidental.setAttribute("font-family", "sans-serif");
          accidental.setAttribute("fill", "black");
          accidental.textContent = symbol;

          svg.appendChild(accidental);
        }
      }
    }
  }, [selectedNote, scaleFactor, lastWhiteIndex]);

  const handleKeyClick = (note: string) => {
    if (!note.includes("#")) {
      setLastWhiteIndex(getKeyIndex(note));
    }
    setSelectedNote(note);
    playNoteAudio(note); // always plays sharp audio
  };

  const whiteKeys = KEYS.filter((k) => !k.black);

  return (
    <div style={{ textAlign: "center", padding: `${10 * scaleFactor}px` }}>
      <div
        style={{
          width: LEFT_MARGIN + whiteKeys.length * WHITE_WIDTH,
          margin: "0 auto",
          position: "relative",
        }}
      >
        {/* Title and Home Link */}
        <h2
          style={{
            fontSize: `${18 * scaleFactor}px`,
            marginBottom: `${0 * scaleFactor}px`,
          }}
        >
          Keys to Notes Playing{" "}
          <a
            href="/"
            style={{
              marginLeft: `${20 * scaleFactor}px`,
              fontSize: `${14 * scaleFactor}px`,
              color: "blue",
            }}
          >
            HOME PAGE
          </a>
        </h2>

        {/* Description */}
        <p
          style={{
            fontSize: `${12 * scaleFactor}px`,
            marginBottom: `${0 * scaleFactor}px`,
          }}
        >
          Click any key (C2–C6) to see its note on the stave and hear the sound
        </p>

        {/* Stave */}
        <div
          ref={canvasRef}
          style={{ marginBottom: `${STAVE_TO_KEYBOARD_GAP * scaleFactor}px` }}
        ></div>

        {/* Keyboard */}
        <div
          style={{
            position: "relative",
            display: "flex",
            paddingLeft: LEFT_MARGIN,
            paddingRight: "8px",
            marginTop: 0,
          }}
        >
          {/* White keys */}
          {whiteKeys.map((key) => (
            <div
              key={`${key.name}-white`}
              onClick={() => handleKeyClick(key.name)}
              style={{
                width: `${WHITE_WIDTH}px`,
                height: `${WHITE_HEIGHT}px`,
                border: "1px solid black",
                backgroundColor: "white",
                position: "relative",
                zIndex: 1,
                cursor: "pointer",
              }}
            >
              {/* Constant C4 label */}
              {key.name === "C4" && (
                <div
                  style={{
                    position: "absolute",
                    bottom: `${-6 * scaleFactor}px`,
                    width: "100%",
                    textAlign: "center",
                    fontSize: `${11 * scaleFactor}px`,
                    fontWeight: "bold",
                    color: "red",
                  }}
                >
                  C4
                </div>
              )}
            </div>
          ))}

          {/* Black keys */}
          {KEYS.map((key, index) => {
            if (!key.black) return null;
            const whiteIndex = KEYS.slice(0, index).filter((k) => !k.black).length - 1;
            const posX =
              LEFT_MARGIN + (whiteIndex + 1) * WHITE_WIDTH - BLACK_WIDTH / 2;

            return (
              <div
                key={`${key.name}-black`}
                onClick={() => handleKeyClick(key.name)}
                style={{
                  width: `${BLACK_WIDTH}px`,
                  height: `${BLACK_HEIGHT}px`,
                  backgroundColor: "black",
                  position: "absolute",
                  left: `${posX}px`,
                  zIndex: 2,
                  cursor: "pointer",
                }}
              ></div>
            );
          })}
        </div>
      </div>
    </div>
  );
}