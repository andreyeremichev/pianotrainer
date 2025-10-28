import type { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Ear Trainers • PianoTrainer",
  description: "Train your ear with degrees and intervals. For playful experiments, try the Music Toys.",
  alternates: { canonical: "/train/ear" },
  openGraph: {
    type: "website",
    url: "https://pianotrainer.app/train/ear",
    title: "Ear Trainers • PianoTrainer",
    description: "Degrees and intervals practice. For playful experiments, try Music Toys.",
  },
  robots: { index: true, follow: true },
};

export default function EarHub() {
  return (
    <main style={{ maxWidth: 980, margin: "0 auto", padding: 16 }}>
      {/* SEO: JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context":"https://schema.org","@type":"WebPage",
            name:"Ear Trainers","url":"https://pianotrainer.app/train/ear",
            description:"Train your ear with degrees and intervals. For playful experiments, try the Music Toys.",
          }),
        }}
      />

      <style>{`
        .grid { display:grid; gap:14px; grid-template-columns:repeat(auto-fit,minmax(260px,1fr)); }
        .card { background:#fff; border:1px solid #ddd; border-radius:12px; padding:14px; display:grid; gap:8px; }
        .title { margin:0; font-size:18px; font-weight:800; display:flex; gap:8px; align-items:center; }
        .desc { margin:0; color:#555; font-size:14px; line-height:1.5; }
        .row { display:flex; gap:8px; align-items:center; justify-content:space-between; }
        .btn { display:inline-block; text-decoration:none; background:#EBCF7A; color:#081019; font-weight:800; padding:8px 12px; border-radius:10px; }
        .badge { font-size:12px; font-weight:800; padding:4px 8px; border-radius:999px; }
        .live { background:#E6F6E6; color:#116611; border:1px solid #B9E4B9; }
        .soon { background:#FFF5E6; color:#7A4D00; border:1px solid #F2D6A6; }
        .muted { color:#777; font-size:12px; }
      `}</style>

      <h1 style={{margin:"0 0 8px"}}>Ear Trainers</h1>
      <p style={{margin:"0 0 16px", color:"#444"}}>
        Fast listening quizzes to internalize sound: start with <strong>Degrees</strong> and <strong>Intervals</strong>.
        For playful experiments, try the <a href="/toys">Music Toys</a>.
      </p>

      <div className="grid">
        {/* Degrees — LIVE */}
        <article className="card">
          <div className="row">
            <h3 className="title">🎯 Degrees</h3>
            <span className="badge live">LIVE</span>
          </div>
          <p className="desc">Guess scale degrees before they vanish. Simple and addictive.</p>
          <div><a className="btn" href="/train/ear/degrees">Open →</a></div>
        </article>

        {/* Intervals — LIVE */}
        <article className="card">
          <div className="row">
            <h3 className="title">↕️ Intervals (Ear)</h3>
            <span className="badge live">LIVE</span>
          </div>
          <p className="desc">Hear the distance — from minor 2nd to octave — and name it fast.</p>
          <div><a className="btn" href="/train/ear/intervals">Open →</a></div>
        </article>

        {/* Progressions — COMING SOON */}
        <article className="card">
          <div className="row">
            <h3 className="title">⛓ Progressions</h3>
            <span className="badge soon">COMING SOON</span>
          </div>
          <p className="desc">Short chord chains to feel pull and resolution.</p>
          <div><span className="muted">Beta stub</span></div>
        </article>

        {/* Drone Playback — COMING SOON */}
        <article className="card">
          <div className="row">
            <h3 className="title">🕯 Drone Playback</h3>
            <span className="badge soon">COMING SOON</span>
          </div>
          <p className="desc">Practice intonation and modal colors over a steady drone.</p>
          <div><span className="muted">Beta stub</span></div>
        </article>

        {/* Quick Tests — COMING SOON */}
        <article className="card">
          <div className="row">
            <h3 className="title">⚡️ Quick Tests</h3>
            <span className="badge soon">COMING SOON</span>
          </div>
          <p className="desc">Ultra-short ear checks to keep your reflexes sharp.</p>
          <div><span className="muted">Beta stub</span></div>
        </article>

        {/* Pointer to Toys (Play) */}
        <article className="card">
          <div className="row">
            <h3 className="title">🎲 Playful Music Toys</h3>
            <span className="badge live">LIVE</span>
          </div>
          <p className="desc">Turn text, dates, and phone text into music. Fun ear-food.</p>
          <div><a className="btn" href="/toys">Open →</a></div>
        </article>
      </div>
    </main>
  );
}