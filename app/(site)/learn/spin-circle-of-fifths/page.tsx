
import Link from "next/link";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Spin the Circle of Fifths • PianoTrainer",
  description:
    "Spin the Circle of Fifths and explore how keys connect. See, hear, and play with interactive demos for numbers and chords.",
  alternates: { canonical: "/learn/spin-circle-of-fifths" },
  openGraph: {
    type: "website",
    url: "https://pianotrainer.app/learn/spin-circle-of-fifths",
    title: "Spin the Circle of Fifths • PianoTrainer",
    description:
      "The Circle of Fifths made fun. Explore neighbors, sharps & flats growth, and interactive Numbers/Chords demos.",
  },
  keywords: [
    "circle of fifths",
    "spin the circle",
    "key relationships",
    "modulation",
    "interactive music theory",
  ],
  robots: { index: true, follow: true },
};

export default function CircleOfFifthsExplainedPage() {
  return (
    <main className="cof-page">
      <style>{`
        .cof-page {
          max-width: 900px;
          margin: 0 auto;
          padding: 16px;
          color: #111;                 /* light article text */
        }
        .lead {
          font-size: 16px;
          line-height: 1.6;
        }
        .h1 {
          margin: 0 0 8px;
          font-size: 32px;
          line-height: 1.2;
          letter-spacing: .2px;
        }
        .h2 {
          margin: 24px 0 8px;
          font-size: 22px;
          line-height: 1.25;
        }
        .bullets {
          margin: 8px 0 0;
          padding-left: 18px;
        }
        .bullets li {
          margin: 4px 0;
          line-height: 1.5;
        }

        /* Highlight cards */
        .deck {
          display: grid;
          gap: 16px;
          grid-template-columns: 1fr;
          margin-top: 12px;
        }
        @media (min-width: 720px) {
          .deck { grid-template-columns: 1fr 1fr; }
        }
        .card {
          border: 1px solid #ddd;
          background: #fff;
          border-radius: 12px;
          padding: 16px;
          display: grid;
          gap: 8px;
          transition: box-shadow .15s ease, transform .15s ease;
        }
        .card:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(0,0,0,.12);
        }
        .chip {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-weight: 700;
          font-size: 14px;
          color: #111;
          background: #EBCF7A; /* gold */
          border-radius: 999px;
          padding: 4px 10px;
          width: max-content;
        }
        .blurb {
          line-height: 1.55;
          min-height: 3em;
        }
        .cta {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          text-decoration: none;
          color: #111;
          background: #EBCF7A;         /* gold */
          border-radius: 8px;
          padding: 10px 14px;
          margin-top: auto;
          transition: filter .15s ease;
        }
        .cta:hover { filter: brightness(1.05); }
        .meta {
          font-size: 13px;
          color: #555;
        }
        .callout {
          margin-top: 18px;
          border: 1px dashed #ccc;
          background: #fafafa;
          border-radius: 12px;
          padding: 14px;
          line-height: 1.55;
        }
      `}</style>

      {/* Title (Option B) */}
      <h1 className="h1">Spin the Circle of Fifths</h1>

      {/* Opening paragraph (playful) */}
      <p className="lead">
        The Circle of Fifths is music’s favorite wheel — spin it clockwise and you climb
        through fifths (<em>C → G → D → A …</em>), spin it counterclockwise and you glide
        through fourths. It’s a simple loop that hides a lot of magic: how sharps and flats
        build up, why some keys feel like close neighbors, and why chord progressions flow
        so naturally. Think of it as both a <strong>map</strong> and a <strong>game board</strong> for harmony.
      </p>

      <h2 className="h2">Why musicians love the circle</h2>
      <ul className="bullets">
        <li>All 12 keys at a glance — see the whole landscape.</li>
        <li>Key relationships: neighbors share most notes (easy modulations).</li>
        <li>Sharps & flats “grow” as you orbit the wheel (1, 2, 3 …).</li>
        <li>Common progressions (like V → I) are just short hops on the wheel.</li>
      </ul>

      {/* CTA section (punched up) */}
      <h2 className="h2">Spin it yourself</h2>
      <p className="lead">
        Reading about the Circle of Fifths is fine — but the real fun starts when you spin it,
        watch it, and hear it come alive. Try these two interactive demos:
      </p>

      <div className="deck">
        {/* Numbers Circle */}
        <article className="card">
          <span className="chip">🎲 Numbers Circle</span>
          <p className="blurb">
            Feed the circle with <strong>π, e, √2, √3</strong> and watch digits spill into
            musical steps. Each number traces its own endless journey around the wheel —
            hypnotic patterns that are equal parts math and melody.
          </p>
          <div className="meta">Pro tip: hit “Random start” and let π surprise you.</div>
          <Link href="/learn/numbers-circle" className="cta" aria-label="Open Numbers Circle">
            Spin the Numbers →
          </Link>
        </article>

        {/* Chords Circle */}
        <article className="card">
          <span className="chip">🎶 Chords Circle</span>
          <p className="blurb">
            See <strong>triads and sevenths</strong> mapped as triangles and squares
            drawn on the circle. Each chord sketch spins into a new shape, showing how
            harmony connects at a glance.
          </p>
          <div className="meta">Tip: change traversal order and watch the geometry shift.</div>
          <Link href="/learn/chords-circle" className="cta" aria-label="Open Chords Circle">
            Spin the Chords →
          </Link>
        </article>
      </div>

      {/* Takeaway */}
      <div className="callout">
        <strong>Takeaway:</strong> the Circle of Fifths isn’t just theory — it’s a <strong>tool</strong>.
        The more you orbit it, the more scales, chords, and modulations start to feel inevitable.
        Open the demos above, give the wheel a spin, and let the circle get under your fingers and
        in your ears.
      </div>

      {/* Degrees Ear Trainer teaser */}
      <h2 className="h2">Go further: Train your ear with Degrees</h2>
      <p className="lead">
        The circle is not just for your eyes — it’s the perfect playground for your <strong>ear</strong>.
        Our <em>Degrees Trainer</em> lets you hear scale steps (1 through 7) inside any key.
        First the app tonicizes the scale so your ear feels the “home” note, then it challenges you
        with short patterns: <em>1–3–5</em>, <em>1–7–1</em>, full scales and more.
      </p>
      <p className="lead">
        You listen, sing it back, then type the degrees. The trainer keeps score and gives instant
        feedback, so you know exactly where you’re solid and where you need another pass. It’s
        bite-sized, addictive, and works on phone or desktop — perfect for daily practice.
      </p>
      <div style={{ marginTop: 12 }}>
        <Link href="/train/ear/degrees" className="cta" aria-label="Open Degrees Ear Trainer">
          🎧 Try the Degrees Ear Trainer →
        </Link>
      </div>
    </main>
  );
}