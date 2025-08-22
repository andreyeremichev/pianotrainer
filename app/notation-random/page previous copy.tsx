"use client";

import { useEffect, useRef, useState } from "react";
import {
  Renderer,
  Stave,
  StaveNote,
  Voice,
  Formatter,
  Accidental,
  StaveConnector,
} from "vexflow";

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

const ENHARMONIC_NAMES: Record<string, string> = {
  "C#": "C#/Db",
  "D#": "D#/Eb",
  "F#": "F#/Gb",
  "G#": "G#/Ab",
  "A#": "A#/Bb",
};

const displayNoteName = (note: string) => {
  const base = note.replace(/\d/, "");
  return ENHARMONIC_NAMES[base] || base;
};

const clefForNote = (note: string, mode: string) => {
  const octave = parseInt(note[note.length - 1]);
  if (mode === "treble") return "treble";
  if (mode === "bass") return "bass";
  if (note === "C4") return Math.random() < 0.5 ? "treble" : "bass";
  return octave >= 4 ? "treble" : "bass";
};

const getNotePool = (mode: string) => {
  switch (mode) {
    case "guide":
      return GUIDE_NOTES;
    case "treble":
      return KEYS.map((k) => k.name).filter((n) => parseInt(n.slice(-1)) >= 4);
    case "bass":
      return KEYS.map((k) => k.name).filter((n) => parseInt(n.slice(-1)) <= 4);
    default:
      return KEYS.map((k) => k.name);
  }
};

const getRandomNote = (exclude: string | null, pool: string[]): string => {
  let note: string;
  do {
    note = pool[Math.floor(Math.random() * pool.length)];
  } while (note === exclude);
  return note;
};

export default function NotationRandomPage() {
  const [mode, setMode] = useState("full");
  const [notePool, setNotePool] = useState<string[]>(getNotePool("full"));
  const [currentNote, setCurrentNote] = useState<string>(
    getRandomNote(null, getNotePool("full"))
  );
  const [currentIndex, setCurrentIndex] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [wrongNote, setWrongNote] = useState<string | null>(null);
  const [flashNote, setFlashNote] = useState<string | null>(null);
  const [firstAttempt, setFirstAttempt] = useState(true);
  const [scaleFactor, setScaleFactor] = useState(1);
  const [sessionEnded, setSessionEnded] = useState(false);

  const canvasRef = useRef<HTMLDivElement>(null);

  // Handle mode changes
  useEffect(() => {
    const pool = getNotePool(mode);
    setNotePool(pool);
    setCurrentNote(getRandomNote(null, pool));
    setCurrentIndex(0);
    setCorrectCount(0);
    setSessionEnded(false);
  }, [mode]);

  // Scaling logic from Keys-to-Notes
  const BASE_WHITE_WIDTH = 30;
  const BASE_LEFT_MARGIN = 60;

  const WHITE_WIDTH = BASE_WHITE_WIDTH * scaleFactor;
  const LEFT_MARGIN = BASE_LEFT_MARGIN * scaleFactor;

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

  // Draw stave and note
  useEffect(() => {
    if (!canvasRef.current) return;
    canvasRef.current.innerHTML = "";

    const whiteKeysCount = KEYS.filter((k) => !k.black).length;
    const staveWidth = (whiteKeysCount * WHITE_WIDTH) / 2; // halve width

    const renderer = new Renderer(canvasRef.current, Renderer.Backends.SVG);
    renderer.resize(staveWidth + LEFT_MARGIN, 300 * scaleFactor);
    const context = renderer.getContext();

    const trebleY = 20 * scaleFactor;
    const bassY = 140 * scaleFactor;

    const staveTreble = new Stave(LEFT_MARGIN, trebleY, staveWidth);
    staveTreble.addClef("treble").setContext(context).draw();

    const staveBass = new Stave(LEFT_MARGIN, bassY, staveWidth);
    staveBass.addClef("bass").setContext(context).draw();

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

    if (currentNote) {
      const vfKey = toVexFlow(currentNote);
      const clef = clefForNote(currentNote, mode);

      const note = new StaveNote({
        keys: [vfKey],
        duration: "w",
        clef: clef,
      });

      if (currentNote.includes("#")) {
        note.addModifier(new Accidental("#"), 0);
      }

      const stave = clef === "treble" ? staveTreble : staveBass;
      const voice = new Voice({ num_beats: 4, beat_value: 4 });
      voice.addTickable(note);

      new Formatter().joinVoices([voice]).format([voice], 0);
      note.setStave(stave);
      note.setContext(context);
      note.draw();
    }
  }, [currentNote, mode, scaleFactor]);

  // Handle key press
  const handleKeyClick = (note: string) => {
    if (sessionEnded) return;

    setFlashNote(null);
    setWrongNote(null);

    if (note === currentNote) {
      if (firstAttempt) setCorrectCount((c) => c + 1);

      // Green highlight flashes for 1 second
      setFlashNote(note);
      setTimeout(() => setFlashNote(null), 1000);

      setFirstAttempt(true);

      if (currentIndex < 24) {
        setCurrentIndex((i) => i + 1);
        setCurrentNote(getRandomNote(currentNote, notePool));
      } else {
        setSessionEnded(true);
      }
    } else {
      // Wrong notes stay persistent
      setWrongNote(note);
      setFirstAttempt(false);
    }
  };

  const handleRestart = () => {
    setCurrentIndex(0);
    setCorrectCount(0);
    setCurrentNote(getRandomNote(null, notePool));
    setSessionEnded(false);
    setFirstAttempt(true);
    setFlashNote(null);
    setWrongNote(null);
  };

  const BLACK_WIDTH = WHITE_WIDTH * 0.66;
  const BLACK_HEIGHT = 90 * scaleFactor;
  const whiteKeys = KEYS.filter((k) => !k.black);

  return (
    <div style={{ textAlign: "center", padding: 20 }}>
      <h2>
        Notation Trainer{" "}
        <a href="/" style={{ marginLeft: "20px", fontSize: "14px", color: "blue" }}>
          HOME PAGE
        </a>
      </h2>

      <div
        style={{
          transform: `scale(${scaleFactor})`,
          transformOrigin: "top center",
          display: "flex",
          justifyContent: "center",
          alignItems: "flex-start",
          gap: "20px",
          width: "100%",
        }}
      >
        {/* Progress / Correct boxes (left, stacked) */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "10px",
            minWidth: "80px",
            alignItems: "center",
          }}
        >
          <div style={{ border: "2px solid #123", padding: "10px", width: "80px" }}>
            <div>Progress</div>
            <div>{Math.min(currentIndex + 1, 25)}/25</div>
          </div>
          <div style={{ border: "2px solid #123", padding: "10px", width: "80px" }}>
            <div>Correct</div>
            <div>{correctCount}</div>
          </div>

          {sessionEnded && (
            <button
              onClick={handleRestart}
              style={{
                marginTop: "10px",
                padding: "6px 12px",
                backgroundColor: "#eee",
                border: "1px solid #444",
                cursor: "pointer",
              }}
            >
              RESTART
            </button>
          )}
        </div>

        {/* Stave */}
        <div ref={canvasRef}></div>

        {/* Mode toggle (right, with margin) */}
        <div
          style={{
            border: "2px solid #123",
            padding: "10px",
            width: "130px",
            marginLeft: "5px",
          }}
        >
          <label style={{ fontWeight: "bold" }}>Mode:</label>
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value)}
            style={{ marginTop: "5px", width: "100%" }}
          >
            <option value="guide">Guide Notes</option>
            <option value="treble">Treble Clef</option>
            <option value="bass">Bass Clef</option>
            <option value="full">C2–C6 Full</option>
          </select>
        </div>
      </div>

      {/* Keyboard */}
      <div
        style={{
          position: "relative",
          display: "flex",
          paddingLeft: LEFT_MARGIN + 5, // 5px extra left space
          marginTop: 50,
          width: LEFT_MARGIN + whiteKeys.length * WHITE_WIDTH + WHITE_WIDTH / 2,
          margin: "0 auto",
        }}
      >
        {/* White keys */}
        {whiteKeys.map((key) => (
          <div
            key={`${key.name}-white`}
            onClick={() => handleKeyClick(key.name)}
            style={{
              width: `${WHITE_WIDTH}px`,
              height: "180px",
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
            {/* CONSTANT C4 LABEL (bottom) */}
            {key.name === "C4" && (
              <div
                style={{
                  position: "absolute",
                  bottom: "-20px",
                  width: "100%",
                  textAlign: "center",
                  fontSize: "11px",
                  fontWeight: "bold",
                  color: "red",
                }}
              >
                C4
              </div>
            )}

            {/* SHOW NOTE NAME ON PRESS */}
            {(flashNote === key.name || wrongNote === key.name) && (
              <div
                style={{
                  position: "absolute",
                  bottom: "-20px",
                  width: "100%",
                  textAlign: "center",
                  fontSize: "11px",
                }}
              >
                {displayNoteName(key.name)}
              </div>
            )}
          </div>
        ))}

        {/* Black keys */}
        {KEYS.map((key, index) => {
          if (!key.black) return null;

          const whiteIndex =
            KEYS.slice(0, index).filter((k) => !k.black).length - 1;
          const posX =
            LEFT_MARGIN + (whiteIndex + 1) * WHITE_WIDTH - BLACK_WIDTH / 2;

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
                zIndex: 2,
              }}
            >
              {(flashNote === key.name || wrongNote === key.name) && (
                <div
                  style={{
                    position: "absolute",
                    bottom: "-20px",
                    width: "100%",
                    textAlign: "center",
                    fontSize: "11px",
                    color: "black",
                    background: "white",
                  }}
                >
                  {displayNoteName(key.name)}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}