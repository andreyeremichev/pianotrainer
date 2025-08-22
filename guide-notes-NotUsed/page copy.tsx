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

// Helper: play audio for note (white or black)
function playNoteAudio(noteName: string) {
  // Encode '#' for browser-safe URL
  const safeName = noteName.replace("#", "%23");
  const audio = new Audio(`/audio/notes/${safeName}.wav`);
  audio.currentTime = 0;
  audio.play().catch((err) => console.error("Audio play failed:", err));
}

// Note patterns
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

// Build keys C2 → C6 (inclusive)
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
const GUIDE_NOTES = ["C2", "G2", "C3", "F3", "C4", "G4", "C5", "F5", "C6"];

const toVexFlow = (note: string) => {
  const letter = note.slice(0, -1).toLowerCase();
  const octave = note.slice(-1);
  return `${letter}/${octave}`;
};

const clefForNote = (note: string) => {
  const octave = parseInt(note[note.length - 1]);
  if (note === "C4") return Math.random() < 0.5 ? "treble" : "bass";
  return octave >= 4 ? "treble" : "bass";
};

const getWhiteKeyIndex = (noteName: string) =>
  KEYS.filter((k) => !k.black).findIndex((k) => k.name === noteName);

const getRandomGuideNote = (exclude: string | null): string => {
  let note: string;
  do {
    note = GUIDE_NOTES[Math.floor(Math.random() * GUIDE_NOTES.length)];
  } while (note === exclude);
  return note;
};

export default function GuideNotesPage() {
  const [currentNote, setCurrentNote] = useState<string>(
    getRandomGuideNote(null)
  );
  const [wrongNote, setWrongNote] = useState<string | null>(null);
  const [flashNote, setFlashNote] = useState<string | null>(null);
  const [tempLabel, setTempLabel] = useState<string | null>(null);
  const [scaleFactor, setScaleFactor] = useState(1);

  const canvasRef = useRef<HTMLDivElement>(null);

  const BASE_WHITE_WIDTH = 30;
  const BASE_LEFT_MARGIN = 60;
  const BASE_WHITE_HEIGHT = 140;
  const BASE_BLACK_HEIGHT = 90;

  // Scaling variables
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

  // Draw stave aligned to scaled keyboard
  useEffect(() => {
    if (!canvasRef.current) return;
    canvasRef.current.innerHTML = "";

    const whiteKeysCount = KEYS.filter((k) => !k.black).length;
    const staveWidth = whiteKeysCount * WHITE_WIDTH;

    const renderer = new Renderer(canvasRef.current, Renderer.Backends.SVG);
    renderer.resize(staveWidth + LEFT_MARGIN, 300 * scaleFactor);
    const context = renderer.getContext();

    const trebleY = 20 * scaleFactor;
    const bassY = 140 * scaleFactor;

    const staveTreble = new Stave(LEFT_MARGIN, trebleY, staveWidth);
    staveTreble.addClef("treble").setContext(context).draw();

    const staveBass = new Stave(LEFT_MARGIN, bassY, staveWidth);
    staveBass.addClef("bass").setContext(context).draw();

    const brace = new StaveConnector(staveTreble, staveBass);
    brace.setType(StaveConnector.type.BRACE);
    brace.setContext(context).draw();

    const lineLeft = new StaveConnector(staveTreble, staveBass);
    lineLeft.setType(StaveConnector.type.SINGLE_LEFT);
    lineLeft.setContext(context).draw();

    // Manual right-side vertical line
    const rightX = staveTreble.getX() + staveTreble.getWidth();
    const topY = staveTreble.getYForLine(0);
    const bottomY = staveBass.getYForLine(4);

    context.beginPath();
    context.moveTo(rightX, topY);
    context.lineTo(rightX, bottomY);
    context.stroke();

    if (currentNote) {
      const vfKey = toVexFlow(currentNote);
      const clef = clefForNote(currentNote);

      const note = new StaveNote({
        keys: [vfKey],
        duration: "w",
        clef: clef,
      });

      const index = getWhiteKeyIndex(currentNote);
      const xPos = LEFT_MARGIN + index * WHITE_WIDTH + WHITE_WIDTH / 2 - 15;

      const voice = new Voice({ num_beats: 4, beat_value: 4 });
      voice.addTickable(note);
      new Formatter().joinVoices([voice]).format([voice], 0);

      note.setStave(clef === "treble" ? staveTreble : staveBass);
      note.setContext(context);
      note.setXShift(xPos - note.getAbsoluteX());
      note.draw();
    }
  }, [currentNote, scaleFactor]);

  // Initial note sound
  useEffect(() => {
    playNoteAudio(currentNote);
  }, []);

  const handleKeyClick = (note: string) => {
    // Play sound for clicked note (white or black)
    playNoteAudio(note);

    if (note === currentNote) {
      setWrongNote(null);
      setFlashNote(note);
      setTempLabel(note);

      // Remove highlight
      setTimeout(() => {
        setFlashNote(null);
        setTempLabel(null);
      }, 900);

      // Show next note and play its sound
      setTimeout(() => {
        const nextNote = getRandomGuideNote(currentNote);
        setCurrentNote(nextNote);
        playNoteAudio(nextNote);
      }, 900);
    } else {
      setWrongNote(note);
    }
  };

  const whiteKeys = KEYS.filter((k) => !k.black);

  return (
    <div style={{ textAlign: "center", padding: `${20 * scaleFactor}px` }}>
      <div
        style={{
          width: LEFT_MARGIN + whiteKeys.length * WHITE_WIDTH,
          margin: "0 auto",
          position: "relative",
        }}
      >
        {/* Title + Home Link */}
        <h2
          style={{
            fontSize: `${24 * scaleFactor}px`,
            marginBottom: `${5 * scaleFactor}px`,
          }}
        >
          The Guide Notes{" "}
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
            fontSize: `${14 * scaleFactor}px`,
            marginBottom: `${10 * scaleFactor}px`,
          }}
        >
          Notes align with keys. Tap the correct guide note.
        </p>

        {/* Stave */}
        <div ref={canvasRef} style={{ marginBottom: `${20 * scaleFactor}px` }}></div>

        {/* Keyboard */}
        <div
          style={{
            position: "relative",
            display: "flex",
            paddingLeft: LEFT_MARGIN,
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
                backgroundColor:
                  flashNote === key.name
                    ? "green"
                    : wrongNote === key.name
                    ? "red"
                    : "white",
                transition: "background-color 0.3s ease",
                position: "relative",
                zIndex: 1,
              }}
            >
              {/* Temporary label */}
              {tempLabel === key.name && (
                <div
                  style={{
                    position: "absolute",
                    bottom: `${-20 * scaleFactor}px`,
                    width: "100%",
                    textAlign: "center",
                    fontSize: `${11 * scaleFactor}px`,
                    opacity: flashNote === key.name ? 1 : 0,
                    transition: "opacity 0.5s ease-out",
                  }}
                >
                  {key.name}
                </div>
              )}

              {/* CONSTANT C4 LABEL */}
              {key.name === "C4" && (
                <div
                  style={{
                    position: "absolute",
                    bottom: `${-20 * scaleFactor}px`,
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
            const posX = LEFT_MARGIN + (whiteIndex + 1) * WHITE_WIDTH - BLACK_WIDTH / 2;

            return (
              <div
                key={`${key.name}-black`}
                onClick={() => handleKeyClick(key.name)}
                style={{
                  width: `${BLACK_WIDTH}px`,
                  height: `${BLACK_HEIGHT}px`,
                  backgroundColor:
                    flashNote === key.name
                      ? "green"
                      : wrongNote === key.name
                      ? "red"
                      : "black",
                  transition: "background-color 0.3s ease",
                  position: "absolute",
                  left: `${posX}px`,
                  zIndex: 3, // ensure always above white keys
                  pointerEvents: "auto",
                }}
              ></div>
            );
          })}
        </div>
      </div>
    </div>
  );
}