

import React from "react";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Ear Trainer Hub • PianoTrainer",
  description:
    "Train your ears with playful drills: degrees, intervals, and more coming soon. Free, browser-based, beginner-friendly.",
  alternates: { canonical: "/trainer/ear" },
  openGraph: {
    type: "website",
    url: "https://pianotrainer.app/trainer/ear",
    title: "Ear Trainer Hub • PianoTrainer",
    description:
      "Develop strong listening skills with beginner-friendly tools: degrees, intervals, circle of fifths, and more.",
  },
  robots: { index: true, follow: true },
};


export default function EarHubPage() {
  return (
    <main style={styles.page}>
      <style>{`
  /* Stack cards in portrait / narrow screens */
  @media (max-width: 820px), (orientation: portrait) {
    .ear-grid {
      grid-template-columns: 1fr !important; /* one column */
      gap: 14px; /* comfortable spacing when stacked */
    }
  }
`}</style>
      {/* Hero */}
      <section style={styles.grid} className="ear-grid">
        <h1 style={styles.h1}>Train Your Musical Ear</h1>
        <p style={styles.sub}>
          Catch sounds before they disappear — quick drills to sharpen your inner radar.
        </p>
      </section>

      {/* Cards */}
      <section style={styles.grid} className="ear-grid">
        {/* Degrees – live */}
        <article style={styles.card}>
          <div style={styles.pill}>👂 Live</div>
          <h2 style={styles.cardTitle}>Degrees Drill</h2>
          <p style={styles.cardText}>
            Tiny numbers, huge payoff — hear scale degrees and match them fast.
            Build your inner compass, one note at a time.
          </p>
          <Link href="/train/ear/degrees" style={styles.cta}>
            Start Degrees →
          </Link>
        </article>

        {/* Intervals – live */}
        <article style={styles.card}>
          <div style={styles.pill}>🎶 Live</div>
          <h2 style={styles.cardTitle}>Intervals Drill</h2>
          <p style={styles.cardText}>
            Mind the space — from seconds to octaves. Hear the jump, spot the shape,
            and name the distance with confidence.
          </p>
          <Link href="/train/ear/intervals" style={styles.cta}>
            Explore Intervals →
          </Link>
        </article>

        {/* Circle Drone – coming soon */}
        <article style={styles.card}>
          <div style={styles.pill}>🔄 Coming soon</div>
          <h2 style={styles.cardTitle}>Circle Drone</h2>
          <p style={styles.cardText}>
            Lock into a key center with a constant drone. Feel the pull of every interval
            and chord against the circle of fifths.
          </p>
          <button style={{ ...styles.cta, ...styles.ctaDisabled }} disabled>
            Coming Soon
          </button>
        </article>

        {/* Progressions – coming soon */}
        <article style={styles.card}>
          <div style={styles.pill}>🎹 Coming soon</div>
          <h2 style={styles.cardTitle}>Chord Progressions</h2>
          <p style={styles.cardText}>
            Not just single chords — hear full progressions, feel the tension and release,
            and train your ear to follow the story.
          </p>
          <button style={{ ...styles.cta, ...styles.ctaDisabled }} disabled>
            Coming Soon
          </button>
        </article>
      </section>

      {/* Footer CTA */}
      <footer style={styles.footer}>
        <p style={styles.footerText}>Just a few minutes a day can rewire your ears.</p>
        <Link href="/train/ear/degrees" style={styles.footerCta}>
          Start Training →
        </Link>
      </footer>
    </main>
  );
}

/* ---------- styles (inline) ---------- */
const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "#fff",
    color: "#0B0F14",
    padding: "20px 12px",
    boxSizing: "border-box",
  },
  hero: {
    maxWidth: 1100,
    margin: "0 auto 18px",
  },
  h1: {
    margin: 0,
    fontSize: 44,
    lineHeight: 1.15,
    letterSpacing: 0.3,
  },
  sub: {
    margin: "10px 0 0",
    fontSize: 18,
    color: "#444",
  },
  grid: {
    maxWidth: 1100,
    margin: "16px auto 10px",
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: 16,
  },
  card: {
    background: "#fff",
    border: "1px solid #ddd",
    borderRadius: 12,
    padding: 16,
    display: "grid",
    gap: 10,
  },
  pill: {
  background: "#f4c95d",
    color: "#081019",
    fontWeight: 700,
    fontSize: 12,
    padding: "2px 8px",
    borderRadius: 6,
    display: "inline-block", // 👈 makes it shrink-wrap
    width: "auto",           // 👈 prevents stretching
    minWidth: "unset",       // 👈 override defaults
    maxWidth: "max-content",  
  },
  cardTitle: {
    margin: 0,
    fontSize: 22,
    fontWeight: 800,
  },
  cardText: {
    margin: 0,
    fontSize: 15,
    color: "#444",
    lineHeight: 1.5,
  },
  cta: {
    display: "inline-block",
    marginTop: 4,
    background: "#EBCF7A",
    color: "#081019",
    textDecoration: "none",
    fontWeight: 800,
    padding: "10px 14px",
    borderRadius: 10,
    alignSelf: "start",
  },
  ctaDisabled: {
    cursor: "default",
    opacity: 0.75,
    border: "none",
  },
  footer: {
    maxWidth: 1100,
    margin: "26px auto 18px",
    textAlign: "center",
  },
  footerText: {
    color: "#444",
    margin: "0 0 10px",
    fontSize: 16,
  },
  footerCta: {
    display: "inline-block",
    background: "#EBCF7A",
    color: "#081019",
    textDecoration: "none",
    fontWeight: 800,
    padding: "10px 16px",
    borderRadius: 10,
  },
};