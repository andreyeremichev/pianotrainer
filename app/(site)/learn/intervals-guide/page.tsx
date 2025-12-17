import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Intervals Guide – Learn the Distance Between Notes • PianoTrainer",
  description:
    "A beginner-friendly guide to intervals: what they are, how to see them on the staff, and how to hear them by ear. Includes links to practice trainers.",
  alternates: { canonical: "/learn/intervals-guide" },
  openGraph: {
    type: "article",
    url: "https://pianotrainer.app/learn/intervals-guide",
    title: "Intervals Guide – Learn the Distance Between Notes",
    description:
      "Understand intervals as distances between notes. Learn how to recognize them on the staff and by ear, with simple practice links.",
  },
  robots: { index: true, follow: true },
};

export default function IntervalsGuidePage() {
  return (
    <main className="intervals-page">
      <style>{`
        .intervals-page {
          max-width: 900px;
          margin: 0 auto;
          padding: 16px;
          color: #111;
        }
        .h1 {
          margin: 0 0 8px;
          font-size: 32px;
          line-height: 1.2;
          letter-spacing: .2px;
        }
        .lead {
          margin: 6px 0 16px;
          font-size: 16px;
          line-height: 1.6;
        }
        .h2 {
          margin: 22px 0 8px;
          font-size: 22px;
          line-height: 1.25;
        }
        .h3 {
          margin: 18px 0 6px;
          font-size: 18px;
          line-height: 1.4;
          font-weight: 700;
        }
        ul {
          margin: 6px 0 10px;
          padding-left: 18px;
          font-size: 15px;
          line-height: 1.6;
        }
        .callout {
          margin-top: 18px;
          border: 1px dashed #ccc;
          background: #fafafa;
          border-radius: 12px;
          padding: 14px;
          line-height: 1.55;
          font-size: 14px;
        }
        .ctaRow {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin-top: 10px;
        }
        .cta {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          text-decoration: none;
          color: #081019;
          background: #EBCF7A;
          border-radius: 10px;
          padding: 10px 14px;
          transition: filter .15s ease;
        }
        .cta:hover { filter: brightness(1.05); }
        .ghost {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          text-decoration: none;
          color: #111;
          background: transparent;
          border: 1px solid #ddd;
          border-radius: 10px;
          padding: 10px 14px;
        }
      `}</style>

      <h1 className="h1">Intervals Guide</h1>

      <p className="lead">
        An <strong>interval</strong> is the distance between two notes. On the staff it’s the amount of
        spacing; on the piano it’s how far you move; to your ear it’s the difference between
        “tight” and “wide”, “soft” and “tense”.
      </p>

      <div className="callout">
        <strong>Good news:</strong> intervals become much easier once you practice them in two ways:
        <br />
        1) see them on the staff (note spacing), and 2) hear them by ear (sound distance).
      </div>

      <h2 className="h2">What is an interval, really?</h2>
      <p className="lead">
        Intervals are named by how many letter steps they span (2nd, 3rd, 4th…), and they also have
        a quality (major/minor/perfect) that affects the sound.
      </p>
      <ul>
        <li><strong>Seconds</strong> feel like close neighbors (small steps).</li>
        <li><strong>Thirds</strong> feel like a clear skip (often “happy” vs “sad” color).</li>
        <li><strong>Fourths and fifths</strong> feel open and stable.</li>
        <li><strong>Tritones</strong> feel tense and unstable.</li>
        <li><strong>Sixths and sevenths</strong> feel wide and emotional.</li>
      </ul>

      <h2 className="h2">Seeing intervals on the staff</h2>
      <p className="lead">
        On the stave, intervals are visual spacing:
      </p>
      <ul>
        <li><strong>2nd:</strong> line → space or space → line (adjacent).</li>
        <li><strong>3rd:</strong> line → line or space → space (skip one).</li>
        <li><strong>4th/5th:</strong> bigger stacks you can spot quickly.</li>
      </ul>

      <div className="ctaRow">
        <Link href="/train/notation/intervals" className="cta" aria-label="Open notation intervals trainer">
          Open Notation Intervals Trainer →
        </Link>
      </div>

      <h2 className="h2">Hearing intervals by ear</h2>
      <p className="lead">
        Your ear learns intervals as recognizable distances. The simplest way to improve is short,
        repeated listening with instant feedback.
      </p>

      <div className="ctaRow">
        <Link href="/train/ear/intervals" className="cta" aria-label="Open ear intervals trainer">
          Open Ear Intervals Trainer →
        </Link>
      </div>

      <h2 className="h2">Where to go next</h2>
      <p className="lead">
        If you’re practicing regularly, a good next step is to connect what you hear to what you see:
      </p>
      <ul>
        <li>
          <Link href="/train/ear/degrees">Degrees Trainer</Link> – hear steps inside a key.
        </li>
        <li>
          <Link href="/train/notation/keys-to-notes">Keys → Notes</Link> – map keys to the staff.
        </li>
        <li>
          <Link href="/train/notation/chords-helper">Chords Helper</Link> – hear and see chords and inversions.
        </li>
      </ul>
    </main>
  );
}