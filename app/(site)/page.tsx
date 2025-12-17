"use client";

import React, { useRef, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";

import HomeKeysToNotesDemo from "@/components/home/HomeKeysToNotesDemo";
import HomeDegreesMini123 from "@/components/home/HomeDegreesMini123";

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
      {/* SEO: JSON-LD for homepage (trainers only) */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebSite",
            name: "PianoTrainer",
            url: "https://pianotrainer.app/"
          }),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Organization",
            name: "PianoTrainer",
            url: "https://pianotrainer.app/",
            logo: {
              "@type": "ImageObject",
              url: "https://pianotrainer.app/og/pianotrainer.jpg"
            }
          }),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "ItemList",
            name: "Featured Trainers",
            itemListElement: [
              {
                "@type": "ListItem",
                position: 1,
                url: "https://pianotrainer.app/train/notation/chords-helper",
                name: "Chords Helper – Root / 1st / 2nd Inversion"
              },
              {
                "@type": "ListItem",
                position: 2,
                url: "https://pianotrainer.app/train/notation/keys-to-notes",
                name: "Keys to Notes – See What You Play"
              },
              {
                "@type": "ListItem",
                position: 3,
                url: "https://pianotrainer.app/train/ear/degrees",
                name: "Degrees Trainer – Gentle Ear Training"
              },
              {
                "@type": "ListItem",
                position: 4,
                url: "https://pianotrainer.app/learn",
                name: "Learn – Simple Guides and Practice Paths"
              }
            ]
          }),
        }}
      />

      {/* HERO */}
      <section style={pageStyles.hero}>
        <h1 style={pageStyles.h1}>Make Chords Come Alive 🎵</h1>
        <p style={pageStyles.sub}>
          Tap &quot;Root&quot; or &quot;1st Inv&quot; &quot;2nd Inv&quot; — hear and see chords right away.
        </p>

        {/* Mini Chords Helper Preview (compact, interactive) */}
        <div style={pageStyles.previewWrap}>
          <MiniChordsPreview />
        </div>

        <p style={pageStyles.sub}>Chords are the heart of harmony.</p>

        <Link
          href="/train/notation/chords-helper"
          style={pageStyles.primaryCta}
          aria-label="Open Chords Helper"
        >
          Open Chords Helper →
        </Link>
      </section>

      {/* READ: Keys → Notes */}
      <section style={pageStyles.sectionWrap}>
        <div style={pageStyles.sectionHead}>
          <h2 style={pageStyles.h2}>Learn to Read Notes (by playing them)</h2>
          <p style={pageStyles.p}>
            Press a key and see exactly where it lands on the staff.
          </p>
        </div>

        <HomeKeysToNotesDemo />

        <div style={pageStyles.sectionCtaRow}>
          <Link href="/train/notation/keys-to-notes" style={pageStyles.secondaryCta} aria-label="Open Keys to Notes trainer">
            Open Keys to Notes →
          </Link>
        </div>
      </section>

      {/* HEAR: Degrees 1–3 */}
      <section style={pageStyles.sectionWrap}>
        <div style={pageStyles.sectionHead}>
          <h2 style={pageStyles.h2}>Train Your Ear (gently)</h2>
          <p style={pageStyles.p}>
            Start with just three steps: 1, 2, 3. Listen and guess — instant feedback.
          </p>
        </div>

        <HomeDegreesMini123 />

        <div style={pageStyles.sectionCtaRow}>
          <Link href="/train/ear/degrees" style={pageStyles.secondaryCta} aria-label="Open Degrees trainer">
            Open Degrees Trainer →
          </Link>
        </div>
      </section>
{/* MORE PRACTICE LINKS */}
<section
  style={{
    maxWidth: 980,
    margin: "24px auto 8px",
    padding: "12px",
    display: "grid",
    gap: 12,
    textAlign: "center",
  }}
>
  <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>
    More Practice
  </h2>

  <p style={{ margin: 0, fontSize: 14, color: "#555" }}>
    Continue training with full notation and ear practice paths.
  </p>

  <div
    style={{
      display: "flex",
      flexWrap: "wrap",
      gap: 12,
      justifyContent: "center",
      marginTop: 6,
    }}
  >
    <Link
      href="/train/notation"
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: 800,
        color: "#081019",
        background: "#EBCF7A",
        borderRadius: 10,
        padding: "10px 14px",
        textDecoration: "none",
        minWidth: 180,
      }}
      aria-label="Open Notation Training Hub"
    >
      Train Notation →
    </Link>

    <Link
      href="/train/ear"
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: 800,
        color: "#081019",
        background: "#EBCF7A",
        borderRadius: 10,
        padding: "10px 14px",
        textDecoration: "none",
        minWidth: 180,
      }}
      aria-label="Open Ear Training Hub"
    >
      Train Ear →
    </Link>
  </div>
</section>
      
    </main>
  );
}

/* ---------- Mini preview component ---------- */
function MiniChordsPreview() {
  // Compact demo: always show C major triad in treble + C in bass
  const [display, setDisplay] = useState<string[] | null>(["C3", "C4", "E4", "G4"]);
  const [mode, setMode] = useState<"block"|"arp">("block");
  const kbRef = useRef<KeyboardRef>(null);

  const make = (inv: "root"|"1st"|"2nd") => {
    const r = "C4", t3 = "E4", t5 = "G4";
    const invTriad =
      inv === "root" ? [r,t3,t5] :
      inv === "1st" ? [t3,t5,"C5"] :
                      [t5,"C5","E5"];
    const four = ["C3", ...invTriad];
    setDisplay(four);

    const urls = four.map((n) => audioUrl(n));
    if (mode === "block") playBlock(urls);
    else playArpeggio(urls, 140);

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
  background: "#ffffff",
  color: "#0B0F14",
  padding: 12,
  paddingBottom: 140, // scroll buffer so footer is reachable on mobile
  boxSizing: "border-box",
  overflowY: "auto",
  WebkitOverflowScrolling: "touch",
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
    color: "#444",
  },
  previewWrap: {
    margin: "0 auto 16px",
    maxWidth: 720,
  },
  primaryCta: {
    display: "inline-block",
    marginTop: 6,
    background: "#EBCF7A",
    color: "#081019",
    textDecoration: "none",
    fontWeight: 800,
    padding: "10px 16px",
    borderRadius: 10,
  },
  sectionWrap: {
    maxWidth: 980,
    margin: "18px auto 0",
    display: "grid",
    gap: 12,
  },
  sectionHead: {
    textAlign: "center",
    padding: "0 8px",
  },
  h2: {
    margin: 0,
    fontSize: 22,
    lineHeight: 1.25,
    fontWeight: 900,
  },
  p: {
    margin: "6px 0 0",
    fontSize: 14,
    color: "#555",
    lineHeight: 1.55,
  },
  sectionCtaRow: {
    display: "flex",
    justifyContent: "center",
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
    border: "1px solid #dddddd",
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