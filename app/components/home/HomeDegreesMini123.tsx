"use client";

import React, { useMemo, useRef, useState } from "react";

function audioUrl(noteName: string): string {
  const safe = noteName.replace("#", "%23");
  return `/audio/notes/${safe}.wav`;
}

function playOnce(noteName: string, cache: Map<string, HTMLAudioElement>) {
  let a = cache.get(noteName);
  if (!a) {
    a = new Audio(audioUrl(noteName));
    a.preload = "auto";
    cache.set(noteName, a);
  }
  try { a.currentTime = 0; } catch {}
  a.play().catch(() => {});
}

type Deg = 1 | 2 | 3;

export default function HomeDegreesMini123() {
  const audioCacheRef = useRef(new Map<string, HTMLAudioElement>());

  // C major, fixed for gentle intro
  const DEG_TO_NOTE: Record<Deg, string> = useMemo(() => ({ 1: "C4", 2: "D4", 3: "E4" }), []);

  const [current, setCurrent] = useState<Deg | null>(null);
  const [feedback, setFeedback] = useState<null | "ok" | "no">(null);
  const [lastGuess, setLastGuess] = useState<Deg | null>(null);

  const pickNew = () => {
    const n = (Math.floor(Math.random() * 3) + 1) as Deg;
    setCurrent(n);
    setFeedback(null);
    setLastGuess(null);
  };

  const onListen = () => {
    const n = current ?? ((Math.floor(Math.random() * 3) + 1) as Deg);
    setCurrent(n);
    setFeedback(null);
    setLastGuess(null);
    playOnce(DEG_TO_NOTE[n], audioCacheRef.current);
  };

  const onGuess = (g: Deg) => {
    setLastGuess(g);
    if (current == null) {
      setFeedback("no");
      return;
    }
    setFeedback(g === current ? "ok" : "no");
  };

  return (
    <div
      style={{
        border: "1px solid #dddddd",
        borderRadius: 12,
        background: "#ffffff",
        padding: 12,
        display: "grid",
        gap: 10,
      }}
    >
      <div style={{ textAlign: "center" }}>
        <h3 style={{ margin: "0 0 6px", fontSize: 18, fontWeight: 800 }}>
          Ear Training (1–3)
        </h3>
        <p style={{ margin: 0, fontSize: 14, color: "#555" }}>
          Start gently: listen and guess 1, 2, or 3.
        </p>
      </div>

      <button
        type="button"
        onClick={onListen}
        style={{
          width: "100%",
          border: "1px solid #ddd",
          background: "#EBCF7A",
          color: "#081019",
          fontWeight: 900,
          borderRadius: 10,
          padding: "10px 12px",
          cursor: "pointer",
        }}
      >
        ▶ Listen
      </button>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
        {([1, 2, 3] as Deg[]).map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => onGuess(d)}
            style={{
              border: "1px solid #ddd",
              background: lastGuess === d ? "#f5f5f5" : "#ffffff",
              borderRadius: 10,
              padding: "10px 0",
              fontWeight: 900,
              cursor: "pointer",
            }}
          >
            {d}
          </button>
        ))}
      </div>

      <div style={{ minHeight: 22, textAlign: "center", fontSize: 14 }}>
        {feedback === "ok" && <span style={{ color: "#1a7f37", fontWeight: 800 }}>✅ Correct</span>}
        {feedback === "no" && current != null && (
          <span style={{ color: "#b42318", fontWeight: 700 }}>
            Try again{lastGuess != null ? ` (you chose ${lastGuess})` : ""}.
          </span>
        )}
      </div>

      <button
        type="button"
        onClick={pickNew}
        style={{
          width: "100%",
          border: "1px solid #ddd",
          background: "#ffffff",
          color: "#0B0F14",
          fontWeight: 800,
          borderRadius: 10,
          padding: "8px 12px",
          cursor: "pointer",
        }}
      >
        Next →
      </button>
    </div>
  );
}