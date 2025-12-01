import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Learn – Two Paths of Harmony & Musical Demos • PianoTrainer",
  description:
    "Start with Two Paths of Harmony, then dive into simple guides and demos for intervals, the Circle of Fifths, notation, and musical toys.",
  alternates: { canonical: "/learn" },
  openGraph: {
    type: "website",
    url: "https://pianotrainer.app/learn",
    title: "Learn – Two Paths of Harmony & Musical Demos • PianoTrainer",
    description:
      "Two Paths of Harmony as your starting point: emotional harmony plus guides on intervals, the Circle of Fifths, and musical toys.",
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
      `}</style>

      {/* Header – Two Paths is the hero */}
      <h1 className="title">Two Paths of Harmony & More</h1>
      <p className="subtitle">
        Start with emotions. Two Paths of Harmony lets you hear how the same feeling can move along
        different paths of harmony. From there, zoom in on intervals, explore the Circle of Fifths
        as a map, learn to read notes, and play with toys that turn numbers and words into sound.
      </p>

      {/* Cards */}
      <section className="deck" aria-label="Learn topics">
        {/* Two Paths of Harmony */}
        <article className="card">
          <span className="chip">✨ Emotions</span>
          <h3 className="heading">Two Paths of Harmony</h3>
          <p className="blurb">
            Hear how one emotion can travel in two ways: a smooth, song-like Path of Flow and a more vivid,
            color-driven Path of Color. Ten emotional presets plus custom playback – no theory names needed.
          </p>
          <div className="meta">Start here to feel harmony before you name it.</div>
          <Link
            href="/learn/two-paths-of-harmony"
            className="cta"
            aria-label="Open Two Paths of Harmony"
          >
            Explore Two Paths →
          </Link>
        </article>

        {/* Intervals Guide – microscope for Path of Color */}
        <article className="card">
          <span className="chip">🎶 Steps</span>
          <h3 className="heading">Intervals Guide</h3>
          <p className="blurb">
            Zoom in on the small gaps and jumps that shape harmony. See intervals as distances on the stave,
            hear them as colors in your ear, and learn how they fuel the Path of Color&apos;s local steps.
          </p>
          <div className="meta">Building blocks behind chromatic color and chord motion.</div>
          <Link href="/learn/intervals-guide" className="cta" aria-label="Open Intervals Guide">
            Explore Intervals →
          </Link>
        </article>

        {/* Spin the Circle of Fifths – map behind Flow */}
        <article className="card">
          <span className="chip">🎡 Map</span>
          <h3 className="heading">Spin the Circle of Fifths</h3>
          <p className="blurb">
            The classic wheel underneath Flow-like harmony. Spin keys around the Circle of Fifths, see how
            neighbors share notes, and watch numbers and chords wrap smoothly around the map.
          </p>
          <div className="meta">Includes playful Numbers &amp; Chords circles based on the wheel.</div>
          <Link href="/learn/spin-circle-of-fifths" className="cta" aria-label="Open Spin the Circle of Fifths">
            Spin the Map →
          </Link>
        </article>

        {/* How to Read Music */}
        <article className="card">
          <span className="chip">📖 Read</span>
          <h3 className="heading">Turn The Stave Into Sound</h3>
          <p className="blurb">
            From “where is middle C?” to reading both staves with confidence. Simple visuals, tiny steps,
            and a few tips that actually stick.
          </p>
          <div className="meta">
            Bonus: turn phrases into melody with{" "}
            <Link href="/learn/text-to-tone-chaos" className="cta--ghost" aria-label="Open Words to Notes">
              Text → Notes
            </Link>
            .
          </div>
          <Link href="/learn/turn-the-stave-into-sound" className="cta" aria-label="Open How to Read Music">
            Read Music →
          </Link>
        </article>

        {/* Musical Toys & Translators */}
        <article className="card">
          <div style={{ fontSize: 22 }}>🎲</div>
          <h3 className="heading">Musical Toys &amp; Translators</h3>
          <p className="blurb">
            See how dates, numbers, letters, and even phonemes can turn into harmony and melody.
            A playful way to learn how structure and sound connect.
          </p>

          <ul style={{ margin: "8px 0 0", paddingLeft: 18, fontSize: 14, color: "#444" }}>
            <li>
              <Link href="/learn/why-these-numbers">
                <strong>Why these numbers?</strong> – dates &amp; digits → harmony
              </Link>
            </li>
            <li>
              <Link href="/learn/why-these-notes">
                <strong>Why these notes?</strong> – TextToTone: text &amp; phonemes → melody
              </Link>
            </li>
          </ul>

          <div>
            <Link
              href="/toys"
              aria-label="Open Musical Toys hub"
              className="cta"
            >
              Open Musical Toys →
            </Link>
          </div>
        </article>
      </section>
    </main>
  );
}