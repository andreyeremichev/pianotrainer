import type { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Notation Trainers • PianoTrainer",
  description: "Practice reading notes, chords, and intervals with simple visual drills.",
  alternates: { canonical: "/train/notation" },
  openGraph: {
    type: "website",
    url: "https://pianotrainer.app/train/notation",
    title: "Notation Trainers • PianoTrainer",
    description: "Learn to read music faster with interactive notation tools.",
  },
  robots: { index: true, follow: true },
};

export default function NotationHub() {
  return (
    <main style={{ maxWidth: 980, margin: "0 auto", padding: 16 }}>
      {/* SEO: JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context":"https://schema.org","@type":"WebPage",
            name:"Notation Trainers","url":"https://pianotrainer.app/train/notation",
            description:"Practice reading notes, chords, and intervals.",
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
      `}</style>

      <h1 style={{margin:"0 0 8px"}}>Notation Trainers</h1>
      <p style={{margin:"0 0 16px", color:"#444"}}>
        Build confident reading with compact drills. Start small, keep it musical, and move fast.
      </p>

      <div className="grid">
        {/* Keys to Notes */}
        <article className="card">
          <div className="row">
            <h3 className="title">👀 Keys to Notes</h3>
            <span className="badge live">LIVE</span>
          </div>
          <p className="desc">Press a key, see it on the staff. Link finger → eye instantly.</p>
          <div><a className="btn" href="/train/notation/keys-to-notes">Open →</a></div>
        </article>

        {/* Chords Helper */}
        <article className="card">
          <div className="row">
            <h3 className="title">🎹 Chords Helper</h3>
            <span className="badge live">LIVE</span>
          </div>
          <p className="desc">Root / 1st / 2nd inversion — hear and see shapes immediately.</p>
          <div><a className="btn" href="/trainer/notation/chords-helper">Open →</a></div>
        </article>

        {/* Intervals */}
        <article className="card">
          <div className="row">
            <h3 className="title">↕️ Intervals (Reading)</h3>
            <span className="badge live">LIVE</span>
          </div>
          <p className="desc">Quick visual drills for seconds to octaves on the staff.</p>
          <div><a className="btn" href="/train/notation/intervals">Open →</a></div>
        </article>

        {/* Random Notes */}
        <article className="card">
          <div className="row">
            <h3 className="title">🎲 Random Notes</h3>
            <span className="badge live">LIVE</span>
          </div>
          <p className="desc">Rapid-fire note flashes — build recognition speed.</p>
          <div><a className="btn" href="/train/notation/random-notes">Open →</a></div>
        </article>
      </div>
    </main>
  );
}