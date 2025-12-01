import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Spin the Circle of Fifths – Map Behind Flow • PianoTrainer",
  description:
    "Use the Circle of Fifths as a playful map for Flow-like harmony. Spin keys, explore neighbors, and see how numbers and chord shapes move on the wheel.",
  alternates: { canonical: "/learn/spin-circle-of-fifths" },
  openGraph: {
    type: "website",
    url: "https://pianotrainer.app/learn/spin-circle-of-fifths",
    title: "Spin the Circle of Fifths – Map Behind Flow",
    description:
      "The Circle of Fifths as a clean, interactive map: neighbors, sharps/flats growth, and chord constellations. A structural companion to Two Paths of Harmony.",
  },
  keywords: [
    "circle of fifths",
    "circle of 5ths",
    "key relationships",
    "modulation",
    "interactive music theory",
    "flow harmony",
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
        In <Link href="/learn/two-paths-of-harmony">Two Paths of Harmony</Link>, you listen to emotions as harmony.
        Underneath the Path of Flow there&apos;s a simple wheel: the Circle of Fifths. This page is about that wheel –
        a clean map where keys and chords live, and where Flow-like progressions draw smooth curves.
      </p>

      <div className="callout">
        <strong>Big picture:</strong> Path of Flow is the story, the Circle of Fifths is the{" "}
        <strong>map</strong> behind it. You don&apos;t need the map to feel the story, but it&apos;s fun once you&apos;re curious.
      </div>

      <h2 className="h2">What the circle actually does</h2>
      <ul className="bullets">
        <li>Shows all 12 keys arranged so neighbors share most notes.</li>
        <li>Lets you see sharps and flats “grow” as you walk around the rim.</li>
        <li>Makes common Flow progressions tiny hops on the wheel.</li>
        <li>Helps you visualize chord shapes as constellations drawn on the circle.</li>
      </ul>

      <h2 className="h2">Playful spins on the wheel</h2>
      <p className="lead">
        Reading about the Circle is fine. But spinning it – letting numbers or chords move around it –
        is much more fun. These two demos show what the wheel can do:
      </p>

      <div className="deck">
        {/* Numbers Circle – irrationals only */}
        <article className="card">
          <span className="chip">🎲 Numbers Circle</span>
          <p className="blurb">
            Feed the Circle with <strong>irrational numbers</strong> like π, e, √2 or √3 and let their digits
            walk around the wheel. Each digit nudges you into a new degree, tracing a hypnotic Flow pattern that is
            equal parts math and melody.
          </p>
          <div className="meta">
            Pure exploration of numbers + Circle of Fifths – no letters, no dates, just π and friends.
          </div>
          <Link href="/learn/numbers-circle" className="cta" aria-label="Open Numbers Circle">
            Spin π around the circle →
          </Link>
        </article>

        {/* Chords Circle – chord constellations on CoF */}
        <article className="card">
          <span className="chip">🎶 Chord Constellations</span>
          <p className="blurb">
            Every chord becomes a shape on the Circle of Fifths – like a constellation of stars that glows for a moment
            before the next appears. Major, minor, dim, 6ths and 7ths are drawn as polygons so you can see Flow-like harmony
            as moving geometry.
          </p>
          <div className="meta">
            Another visual explanation of smooth chord movement – Flow patterns as shapes drawn on the wheel.
          </div>
          <Link href="/learn/chords-circle" className="cta" aria-label="Open Chords Circle">
            See chord constellations →
          </Link>
        </article>
      </div>

      <h2 className="h2">From map back to emotions</h2>
      <p className="lead">
        Once you&apos;re comfortable with the Circle as a map, you&apos;ll start recognizing Flow progressions from
        <Link href="/learn/two-paths-of-harmony"> Two Paths of Harmony</Link> as short, neighborly walks on the wheel.
        When you want to feel the more chromatic, intense side of things, you can switch back to Path of Color or the{" "}
        <Link href="/learn/intervals-guide">Intervals Guide</Link>.
      </p>

      <div style={{ marginTop: 12 }}>
        <Link href="/learn/two-paths-of-harmony" className="cta" aria-label="Open Two Paths of Harmony">
          🔁 Return to Two Paths of Harmony →
        </Link>
      </div>
    </main>
  );
}