
import Link from "next/link";

export const metadata = {
  title: "Intervals Guide • PianoTrainer",
  description:
    "Mind the Gap: see, hear, and feel intervals — music’s invisible geometry. Learn what they look like, what they sound like, and why they matter.",
};

export default function IntervalsGuidePage() {
  return (
    <main className="intervals-guide">
      <style>{`
        .intervals-guide {
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
          margin: 24px 0 8px;
          font-size: 22px;
          line-height: 1.25;
        }

        /* Cards grid */
        .deck {
          display: grid;
          gap: 16px;
          grid-template-columns: 1fr;
          margin-top: 12px;
        }
        @media (min-width: 720px) { .deck { grid-template-columns: 1fr 1fr; } }

        .card {
          border: 1px solid #ddd;
          background: #fff;
          border-radius: 12px;
          padding: 16px;
          display: grid;
          gap: 10px;
          min-height: 220px;
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
          font-weight: 800;
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
        }
        .blurb {
          margin: -2px 0 0 0;
          line-height: 1.55;
          color: #222;
        }
        .cta {
          margin-top: auto;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          text-decoration: none;
          color: #111;
          background: #EBCF7A; /* gold */
          border-radius: 8px;
          padding: 10px 14px;
          transition: filter .15s ease, transform .15s ease;
        }
        .cta:hover { filter: brightness(1.05); transform: translateY(-1px); }
      `}</style>

      {/* Page title */}
      <h1 className="h1">Mind the Gap</h1>
      <p className="lead">
        Every note lives in relation to another — and the distance between them is where the magic happens.
        Some gaps whisper, some shout, some pull you home. Explore how intervals stretch across the stave
        and how they ring in your ear, from tight half-steps to soaring octaves.
      </p>

      {/* Why Intervals Matter */}
      <h2 className="h2">Why Intervals Matter</h2>
      <p className="lead">
        Intervals are the heartbeat of music. They’re the tiny sparks and wide-open skies between notes.
        Stack them close and you get tension, pull them apart and you get release. Scales are nothing but
        intervals in a row, chords are intervals stacked into towers, and melodies are intervals set in motion.
        Learn to feel these spaces, and you start to hear music not as notes on a page but as living shapes
        and colors.
      </p>

      {/* Interactive cards */}
      <h2 className="h2">Explore Intervals</h2>
      <div className="deck">
        {/* Notation Trainer */}
        <article className="card">
          <span className="chip">🎼 See</span>
          <h3 className="heading">See the Shape, Hear the Distance</h3>
          <p className="blurb">
            Intervals are music’s invisible geometry. On the page they’re lines and spaces apart; in sound they’re
            flavors — sweet, tense, open, or resolved. Learn to see their shapes on the stave, hear their colors
            by ear, and connect the two into one instinct. <strong>Practice</strong> spotting the spacing and playing them on the keyboard.
          </p>
          <Link href="/trainer/notation/intervals" className="cta">
            Open Notation Trainer →
          </Link>
        </article>

        {/* Ear Trainer */}
        <article className="card">
          <span className="chip">👂 Hear</span>
          <h3 className="heading">Jump the Intervals</h3>
          <p className="blurb">
            Intervals are the leaps and steps that give music its shape. A tiny half-step can make your skin crawl,
            while a wide leap feels like flying. Spin through seconds, thirds, fifths, and octaves — and learn how
            each jump changes the mood of a melody. Hear them, sing them, and type the right answer. <strong>Train</strong> your ear
            to recognize intervals instantly.
          </p>
          <Link href="/trainer/ear/intervals" className="cta">
            Open Ear Trainer →
          </Link>
        </article>
      </div>

      {/* Takeaway */}
      <h2 className="h2">Takeaway</h2>
      <p className="lead">
        Intervals aren’t just theory — they’re the shortcuts your brain uses to recognize, sing, and play music with confidence.
        Once you know their shapes and sounds, every score becomes easier to read and every melody easier to catch.
        The best part? You don’t need hours of practice — just a few minutes a day with the trainers above. Jump in, listen, play,
        and let intervals become second nature. Your ear — and your hands — will thank you.
      </p>
    </main>
  );
}