"use client";

import React, { useRef, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";

/** Mini preview uses existing building blocks in a compact frame */
const GrandStaveVF = dynamic(() => import("@/components/GrandStaveVF"), { ssr: false });
import ResponsiveKeyboardC2toC6, { type KeyboardRef } from "@/components/ResponsiveKeyboardC2toC6";

/* ---------- Minimal audio helpers (reuse /audio/notes) ---------- */
function normalizeToSharp(name: string) {
  const m = name.match(/^([A-G])([#b]?)(\d)$/i); if (!m) return name;
  const letter = m[1].toUpperCase(), acc = (m[2] || "") as ""|"#"|"b", oct = m[3];
  if (acc === "b") {
    const MAP: Record<string,string> = { Db:"C#", Eb:"D#", Gb:"F#", Ab:"G#", Bb:"A#" };
    const twin = MAP[(letter + "b") as keyof typeof MAP];
    if (twin) return `${twin}${oct}`;
  }
  return `${letter}${acc}${oct}`;
}
function audioUrl(display: string) {
  const s = normalizeToSharp(display);
  return `/audio/notes/${s.replace("#","%23")}.wav`;
}
function playBlock(urls: string[]) {
  urls.forEach(u => { const a = new Audio(u); a.play().catch(() => {}); });
}
function playArpeggio(urls: string[], gapMs = 140) {
  urls.forEach((u, i) => {
    setTimeout(() => {
      const a = new Audio(u);
      a.play().catch(() => {});
    }, i * gapMs);
  });
}

/* ---------- Page ---------- */
export default function HomePage() {
  return (
    <main style={pageStyles.root}>
      {/* HERO */}
      <section style={pageStyles.hero}>
        <h1 style={pageStyles.h1}>Make Notes Come Alive 🎵</h1>
        <p style={pageStyles.sub}>
          Tap, hear, and see chords right away — no signup, no theory needed.
        </p>

        {/* Mini Chords Helper Preview (compact, interactive) */}
        <div style={pageStyles.previewWrap}>
          <MiniChordsPreview />
        </div>

        <Link href="/trainer/notation/chords-helper" style={pageStyles.primaryCta} aria-label="Start Playing Chords Helper">
          Start Playing →
        </Link>
      </section>

      {/* QUICK TILES */}
      <section style={pageStyles.tilesWrap}>
        <div style={pageStyles.tile}>
  <div style={pageStyles.tileIcon}>👀</div>
  <h3 style={pageStyles.tileTitle}>Learn Notes</h3>
  <p style={pageStyles.tileText}>
    Every key press paints a note on the stave — connect what you play to what you see.
  </p>
  <Link
    href="/trainer/notation/keys-to-notes"
    style={pageStyles.tileButton}
    aria-label="Open Keys to Notes"
  >
    Keys to Notes →
  </Link>
</div>

        <div style={pageStyles.tile}>
          <div style={pageStyles.tileIcon}>👂</div>
          <h3 style={pageStyles.tileTitle}>Train Your Ear</h3>
          <p style={pageStyles.tileText}>Guess sounds before they vanish.</p>
          <Link href="/trainer/ear/degrees" style={pageStyles.tileButton} aria-label="Open Ear Trainers">
            Degrees & Intervals →
          </Link>
        </div>

        <div style={pageStyles.tile}>
          <div style={pageStyles.tileIcon}>🎲</div>
          <h3 style={pageStyles.tileTitle}>Play with Toys</h3>
          <p style={pageStyles.tileText}>Make birthdays, names, or numbers sing.</p>
          <Link href="/viral" style={pageStyles.tileButton} aria-label="Open Musical Toys">
            Musical Toys →
          </Link>
        </div>
      </section>

      {/* FOOTER CTA */}
      <footer style={pageStyles.footer}>
        <p style={pageStyles.footerText}>
          A few minutes a day is enough to train your music brain.
        </p>
        <Link href="/learn" style={pageStyles.secondaryCta} aria-label="Explore learning pages">
          Explore →
        </Link>
      </footer>
    </main>
  );
}

/* ---------- Mini preview component ---------- */
function MiniChordsPreview() {
  // Compact demo: always show C major triad in treble + C in bass
  const [display, setDisplay] = useState<string[] | null>(["C3", "C4", "E4", "G4"]); // bass root + triad in treble
  const [mode, setMode] = useState<"block"|"arp">("block");
  const kbRef = useRef<KeyboardRef>(null);

  const make = (inv: "root"|"1st"|"2nd") => {
    // C-major triad tones
    const r = "C4", t3 = "E4", t5 = "G4";
    // map inversion by re-voicing within treble; always C3 in bass
    const invTriad =
      inv === "root" ? [r,t3,t5] :
      inv === "1st" ? [t3,t5,"C5"] :
                      [t5,"C5","E5"];
    const four = ["C3", ...invTriad];
    setDisplay(four);

    const urls = four.map(audioUrl);
    if (mode === "block") playBlock(urls);
    else playArpeggio(urls, 140);

    // highlight briefly
  // highlight briefly
kbRef.current?.clear();
four.forEach(n => kbRef.current?.highlight(n as any, "correct"));
window.setTimeout(() => { kbRef.current?.clear(); }, 1200);  
  };

  return (
    <div style={previewStyles.card}>
      <div style={previewStyles.staveRow}>
        <div style={previewStyles.staveBox}>
          <GrandStaveVF triadNotes={display} triadArpeggio={mode==="arp"} />
        </div>
        <div style={previewStyles.controls}>
          <div style={previewStyles.invRow}>
            <button onClick={() => make("root")}  style={previewStyles.invBtn}>Root</button>
            <button onClick={() => make("1st")}   style={previewStyles.invBtn}>1st inv</button>
            <button onClick={() => make("2nd")}   style={previewStyles.invBtn}>2nd inv</button>
          </div>
          <div style={previewStyles.modeRow}>
            <label style={previewStyles.modeLabel}>
              <input type="radio" name="mini_mode" checked={mode==="block"} onChange={()=>setMode("block")} /> Block
            </label>
            <label style={previewStyles.modeLabel}>
              <input type="radio" name="mini_mode" checked={mode==="arp"} onChange={()=>setMode("arp")} /> Arpeggio
            </label>
          </div>
        </div>
      </div>

      <div style={previewStyles.kbRow}>
        <ResponsiveKeyboardC2toC6
          ref={kbRef}
          onKeyDown={() => {}}
          onKeyPress={() => {}}
          judge={() => undefined}
        />
      </div>
    </div>
  );
}

/* ---------- Inline styles ---------- */
const pageStyles: Record<string, React.CSSProperties> = {
  root: {
    minHeight: "100vh",
    background: "#ffffff",           // white background
    color: "#0B0F14",                // dark text
    padding: 12,
    boxSizing: "border-box",
  },
  hero: {
    maxWidth: 980,
    margin: "0 auto",
    textAlign: "center",
    padding: "12px 8px 8px",
  },
  h1: {
    margin: 0,
    fontSize: 42,
    lineHeight: 1.15,
    letterSpacing: 0.3,
  },
  sub: {
    margin: "10px 0 16px",
    fontSize: 18,
    color: "#444",                   // muted dark on white
  },
  previewWrap: {
    margin: "0 auto 16px",
    maxWidth: 720,
  },
  primaryCta: {
    display: "inline-block",
    marginTop: 6,
    background: "#EBCF7A",           // gold
    color: "#081019",
    textDecoration: "none",
    fontWeight: 800,
    padding: "10px 16px",
    borderRadius: 10,
  },
  tilesWrap: {
    maxWidth: 980,
    margin: "22px auto 12px",
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: 14,
  },
  tile: {
    background: "#ffffff",           // white tile
    border: "1px solid #dddddd",     // subtle gray border
    borderRadius: 12,
    padding: 16,
    display: "grid",
    gap: 8,
  },
  tileIcon: {
    fontSize: 22,
  },
  tileTitle: {
    margin: 0,
    fontSize: 20,
    fontWeight: 800,
  },
  tileText: {
    margin: 0,
    fontSize: 14,
    color: "#555",
  },
  tileButton: {
    marginTop: 8,
    display: "inline-block",
    background: "#EBCF7A",           // gold button inside tile
    color: "#081019",
    textDecoration: "none",
    fontWeight: 800,
    padding: "8px 12px",
    borderRadius: 10,
    alignSelf: "start",
  },
  footer: {
    maxWidth: 980,
    margin: "28px auto 16px",
    textAlign: "center",
  },
  footerText: {
    color: "#444",
    margin: "0 0 10px",
    fontSize: 16,
  },
  secondaryCta: {
    display: "inline-block",
    background: "#EBCF7A",
    color: "#081019",
    textDecoration: "none",
    fontWeight: 800,
    padding: "10px 16px",
    borderRadius: 10,
  },
};

const previewStyles: Record<string, React.CSSProperties> = {
  card: {
    background: "#ffffff",
    border: "1px solid #dddddd",     // subtle gray border
    borderRadius: 12,
    padding: 12,
    display: "grid",
    gap: 10,
  },
  staveRow: {
    display: "grid",
    gridTemplateColumns: "1fr",
    gap: 10,
  },
  staveBox: {
    width: "100%",
    maxWidth: 420,
    margin: "0 auto",
  },
  controls: {
    display: "grid",
    gap: 8,
    justifyItems: "center",
  },
  invRow: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: 8,
    width: "100%",
    maxWidth: 420,
  },
  invBtn: {
    background: "#ffffff",
    color: "#0B0F14",
    border: "1px solid #dddddd",
    borderRadius: 8,
    padding: "8px 10px",
    fontWeight: 700,
    cursor: "pointer",
  },
  modeRow: {
    display: "flex",
    gap: 12,
    alignItems: "center",
    justifyContent: "center",
    color: "#444",
    fontSize: 13,
  },
  modeLabel: {
    display: "inline-flex",
    gap: 6,
    alignItems: "center",
  },
  kbRow: {
    minHeight: 120,
  },
};

/* Responsive tweak for tiles (stack on small screens) */
if (typeof window !== "undefined") {
  // This is optional; the grid already compresses nicely, but you can add a CSS file if preferred.
}