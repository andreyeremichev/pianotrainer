// app/(site)/learn/page.tsx
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Learn – Piano Notation & Ear Training • PianoTrainer",
  description:
    "Beginner-friendly guides and practice paths for reading music and training the ear. Learn notes, intervals, degrees, and core piano fundamentals.",
  alternates: { canonical: "/learn" },
  openGraph: {
    type: "website",
    url: "https://pianotrainer.app/learn",
    title: "Learn – Piano Notation & Ear Training • PianoTrainer",
    description:
      "Guides and practice paths for piano note reading and ear training—clear, visual, and beginner-friendly.",
  },
  robots: { index: true, follow: true },
};

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
          background: #EBCF7A;
          border-radius: 8px;
          padding: 10px 14px;
          transition: filter .15s ease, transform .15s ease;
        }
        .cta:hover { filter: brightness(1.05); transform: translateY(-1px); }
      `}</style>

      <h1 className="title">Learn</h1>
      <p className="subtitle">
        Short, beginner-friendly guides that support the two core skills on PianoTrainer:
        <strong> reading music</strong> and <strong>training the ear</strong>.
      </p>

      <section className="deck" aria-label="Learn topics">
        {/* Keys → Notes */}
        <article className="card">
          <span className="chip">👀 Notation</span>
          <h3 className="heading">Keys → Notes</h3>
          <p className="blurb">
            The most direct way to start reading: press a key and see exactly where it lands on the staff.
            Sharps, flats, treble and bass — no guessing.
          </p>
          <div className="meta">Best starting point for note-reading.</div>
          <Link href="/train/notation/keys-to-notes" className="cta" aria-label="Open Keys to Notes trainer">
            Open Keys → Notes →
          </Link>
        </article>

        {/* Degrees */}
        <article className="card">
          <span className="chip">👂 Ear</span>
          <h3 className="heading">Degrees Trainer</h3>
          <p className="blurb">
            Train your ear to hear steps inside a key. Start gently and build intuition for “home”
            (1) and nearby degrees.
          </p>
          <div className="meta">Ear training with short drills and instant feedback.</div>
          <Link href="/train/ear/degrees" className="cta" aria-label="Open Degrees trainer">
            Open Degrees →
          </Link>
        </article>

        {/* Intervals Guide */}
        <article className="card">
          <span className="chip">🎶 Intervals</span>
          <h3 className="heading">Intervals Guide</h3>
          <p className="blurb">
            Learn what intervals are and how to recognize them. See them on the staff and start hearing
            their character — from close steps to wider jumps.
          </p>
          <div className="meta">A simple reference before (or while) you practice.</div>
          <Link href="/learn/intervals-guide" className="cta" aria-label="Open Intervals Guide">
            Read the Guide →
          </Link>
        </article>

        {/* Turn the Stave Into Sound */}
        <article className="card">
          <span className="chip">📖 Reading</span>
          <h3 className="heading">Turn the Stave Into Sound</h3>
          <p className="blurb">
            A calm walkthrough for beginners: middle C, treble/bass basics, and how to build confidence
            reading the grand staff step by step.
          </p>
          <div className="meta">Optional, helpful context for the notation trainers.</div>
          <Link href="/learn/turn-the-stave-into-sound" className="cta" aria-label="Open reading guide">
            Open the Guide →
          </Link>
        </article>

        {/* Spin the Circle of Fifths (advanced / optional) */}
        <article className="card">
          <span className="chip">🧭 Map</span>
          <h3 className="heading">Spin the Circle of Fifths</h3>
          <p className="blurb">
            A visual map of key relationships. Useful once you have basic note reading — explore neighbors,
            sharps/flats growth, and common patterns.
          </p>
          <div className="meta">Optional: a curiosity-driven exploration.</div>
          <Link href="/learn/spin-circle-of-fifths" className="cta" aria-label="Open Circle of Fifths page">
            Open the Map →
          </Link>
        </article>

        {/* Text to Music Lab (kept on Pianotrainer) */}
        <article className="card">
          <span className="chip">🧪 Lab</span>
          <h3 className="heading">Text to Music Lab</h3>
          <p className="blurb">
            Use your own words to explore melody, harmony, and notation in both major and minor — designed for learning.
          </p>
          <div className="meta">An experimental page for curious learners.</div>
          <Link href="/learn/text-to-tone-chaos" className="cta" aria-label="Open Text to Music Lab">
            Open the Lab →
          </Link>
        </article>
      </section>
    </main>
  );
}