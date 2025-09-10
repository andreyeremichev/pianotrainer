
// app/learn/page.tsx
"use client";

import Link from "next/link";

export default function LearnHubPage() {
  return (
    <main className="learn-hub">
      <style>{`
        .learn-hub {
          max-width: 1000px;
          margin: 0 auto;
          padding: 16px;
          color: #111;
        }
        .title {
          margin: 0 0 6px;
          font-size: 34px;
          line-height: 1.2;
          letter-spacing: .2px;
        }
        .subtitle {
          margin: 0 0 12px;
          font-size: 16px;
          line-height: 1.6;
          color: #333;
        }

        /* Cards grid */
        .deck {
          display: grid;
          gap: 16px;
          grid-template-columns: 1fr;
          margin-top: 12px;
        }
        @media (min-width: 720px) { .deck { grid-template-columns: 1fr 1fr; } }
        @media (min-width: 980px) { .deck { grid-template-columns: 1fr 1fr 1fr; } }

        .card {
          border: 1px solid #ddd;
          background: #fff;
          border-radius: 12px;
          padding: 16px;
          display: grid;
          gap: 10px;
          min-height: 220px;
          transition: transform .15s ease, box-shadow .15s ease;
        }
        .card:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(0,0,0,.12);
        }
        .card.disabled {
          opacity: .6;
          filter: grayscale(0.1);
        }

        .chip {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-weight: 800;
          letter-spacing: .2px;
          font-size: 14px;
          color: #111;
          background: #EBCF7A; /* gold */
          border-radius: 999px;
          padding: 4px 10px;
          width: max-content;
        }
        .heading {
          margin: 0;
          font-size: 18px;
          line-height: 1.35;
          letter-spacing: .2px;
        }
        .blurb {
          margin: -2px 0 0 0;
          line-height: 1.55;
          color: #222;
        }
        .meta {
          font-size: 13px;
          color: #555;
          margin-top: -4px;
        }
        .cta {
          margin-top: auto;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          font-weight: 800;
          text-decoration: none;
          color: #111;
          background: #EBCF7A; /* gold */
          border-radius: 8px;
          padding: 10px 14px;
          transition: filter .15s ease, transform .15s ease;
        }
        .cta:hover { filter: brightness(1.05); transform: translateY(-1px); }
        .cta--ghost {
          background: transparent;
          color: #111;
          text-decoration: underline;
          padding: 0;
          border-radius: 0;
        }

        .soon {
          margin-top: auto;
          display: inline-block;
          padding: 8px 12px;
          border: 1px dashed #bbb;
          border-radius: 8px;
          color: #444;
          background: #fafafa;
          font-weight: 700;
        }
      `}</style>

      {/* Header */}
      <h1 className="title">Spin. Read. Explore.</h1>
      <p className="subtitle">
        Music theory doesn’t have to be dry — here you’ll spin wheels, press keys, type words,
        and see harmony turn into shapes. Pick a card and dive in.
      </p>

      {/* Cards */}
      <section className="deck" aria-label="Learn topics">
        {/* Spin the Circle of Fifths */}
        <article className="card">
          <span className="chip">🎡 Spin</span>
          <h3 className="heading">Spin the Circle of Fifths</h3>
          <p className="blurb">
            The Circle of Fifths made fun — spin it, watch numbers & chords come alive, and
            feel how keys connect. See it, hear it, and play with it right in your browser.
          </p>
          <div className="meta">Includes interactive Numbers & Chords demos.</div>
          <Link href="/learn/spin-circle-of-fifths" className="cta" aria-label="Open Spin the Circle of Fifths">
            Explore the Circle →
          </Link>
        </article>

        {/* How to Read Music (rebranded) */}
        <article className="card">
          <span className="chip">📖 Read</span>
          <h3 className="heading">How to Read Music (Made Friendly)</h3>
          <p className="blurb">
            From “where is middle C?” to reading both staves with confidence. Simple visuals,
            tiny steps, and a few tips that actually stick.
          </p>
          <div className="meta">
            Bonus: turn phrases into melody with{" "}
            <Link href="/learn/words-to-notes" className="cta--ghost" aria-label="Open Words to Notes">
              Words → Notes
            </Link>
            .
          </div>
          <Link href="/learn/turn-the-stave-into-sound" className="cta" aria-label="Open How to Read Music">
            Start Reading →
          </Link>
        </article>

        {/* Intervals Guide (Coming Soon) */}
        <article className="card disabled" aria-disabled="true">
          <span className="chip">🎶 Intervals</span>
          <h3 className="heading">Intervals Guide</h3>
          <p className="blurb">
            See steps and skips on the staff, then link what you see to what you hear:
            seconds to octaves, ascending & descending.
          </p>
          <span className="soon" aria-hidden="true">Coming Soon</span>
        </article>
      </section>
    </main>
  );
}