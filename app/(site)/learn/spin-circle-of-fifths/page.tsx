import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Spin the Circle of Fifths – A Visual Map of Keys • PianoTrainer",
  description:
    "Explore the Circle of Fifths as a simple visual map of key relationships. See neighbors, sharps/flats growth, and chord shapes on the wheel.",
  alternates: { canonical: "/learn/spin-circle-of-fifths" },
  openGraph: {
    type: "website",
    url: "https://pianotrainer.app/learn/spin-circle-of-fifths",
    title: "Spin the Circle of Fifths – A Visual Map of Keys",
    description:
      "A clean, interactive way to understand key relationships: neighbors, sharps/flats growth, and chord shapes drawn on the wheel.",
  },
  keywords: [
    "circle of fifths",
    "circle of 5ths",
    "key relationships",
    "key signatures",
    "sharps and flats",
    "interactive music theory",
    "piano training",
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
          color: #111;
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
          background: #EBCF7A;
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
          background: #EBCF7A;
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

      <h1 className="h1">Spin the Circle of Fifths</h1>

      <p className="lead">
        The Circle of Fifths is a simple visual map of how keys relate to each other.
        Neighboring keys share most notes, and moving around the wheel shows how sharps and flats
        accumulate. This page is here as a friendly reference — not something you must memorize.
      </p>

      <div className="callout">
        <strong>Practical use:</strong> the Circle helps you recognize “close” keys, understand why key signatures
        change gradually, and spot common patterns in chord movement.
      </div>

      <h2 className="h2">What the circle helps you see</h2>
      <ul className="bullets">
        <li><strong>Key neighbors:</strong> keys next to each other share most notes.</li>
        <li><strong>Sharps/flats growth:</strong> as you move around the wheel, accidentals accumulate.</li>
        <li><strong>Common patterns:</strong> many chord progressions move through nearby keys.</li>
        <li><strong>Chord shapes:</strong> chords can be drawn as simple polygons on the wheel.</li>
      </ul>

      <h2 className="h2">Two visual demos (optional)</h2>
      <p className="lead">
        If you like learning visually, these demos show the wheel in motion. They’re optional —
        use them as a way to build intuition, not as homework.
      </p>

      <div className="deck">
        {/* Numbers Circle */}
        <article className="card">
          <span className="chip">🎲 Numbers Circle</span>
          <p className="blurb">
            A playful exploration using irrational numbers (π, e, √2, √3). Digits become degrees on the wheel,
            tracing repeating patterns that are part math and part music.
          </p>
          <div className="meta">
            Best for curiosity and pattern recognition.
          </div>
          <Link href="/learn/numbers-circle" className="cta" aria-label="Open Numbers Circle">
            Open Numbers Circle →
          </Link>
        </article>

        {/* Chords Circle */}
        <article className="card">
          <span className="chip">🎶 Chords Circle</span>
          <p className="blurb">
            See triads and sevenths as geometric shapes on the wheel. It’s a visual way to notice how
            chords relate without needing heavy theory language.
          </p>
          <div className="meta">
            Helpful if you like “shapes over labels.”
          </div>
          <Link href="/learn/chords-circle" className="cta" aria-label="Open Chords Circle">
            Open Chords Circle →
          </Link>
        </article>
      </div>

      <h2 className="h2">Where next?</h2>
      <p className="lead">
        If you want to apply this in practice, here are the most direct training pages:
      </p>

      <div style={{ marginTop: 12, display: "flex", flexWrap: "wrap", gap: 10 }}>
        <Link href="/train/notation/keys-to-notes" className="cta" aria-label="Open Keys to Notes">
          Keys → Notes →
        </Link>
        <Link href="/train/ear/degrees" className="cta" aria-label="Open Degrees Trainer">
          Degrees Trainer →
        </Link>
        <Link href="/learn/intervals-guide" className="cta" aria-label="Open Intervals Guide">
          Intervals Guide →
        </Link>
      </div>
    </main>
  );
}