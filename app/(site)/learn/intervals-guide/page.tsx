import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Intervals Guide – Steps Behind Path of Color • PianoTrainer",
  description:
    "Intervals are the small gaps and jumps that shape harmony. Learn how they work on the stave, in your ear, and inside the Path of Color emotions.",
  alternates: { canonical: "/learn/intervals-guide" },
  openGraph: {
    type: "article",
    url: "https://pianotrainer.app/learn/intervals-guide",
    title: "Intervals Guide – Steps Behind Path of Color",
    description:
      "See intervals as distances on the stave and hear them as colors in your ear. Connect them to the local steps in Path of Color.",
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
          margin-top: 10px;
          transition: filter .15s ease;
        }
        .cta:hover { filter: brightness(1.05); }
      `}</style>

      <h1 className="h1">Intervals Guide – Steps Behind Color</h1>

      <p className="lead">
        In <Link href="/learn/two-paths-of-harmony">Two Paths of Harmony</Link>, you hear emotions carried by two
        big motion types: a smooth <strong>Path of Flow</strong> and a more intense <strong>Path of Color</strong>.
        Flow feels like a story; Color feels like sharp turns and vivid hits. Under the hood, both rely on{" "}
        <strong>intervals</strong> – the small gaps and jumps between notes and between chords.
      </p>

      <div className="callout">
        <strong>Big idea:</strong> intervals are the smallest “units of movement” in harmony. Path of Color
        leans on sharper, more chromatic intervals; Path of Flow leans on gentler, more diatonic ones.
      </div>

      <h2 className="h2">What is an interval, really?</h2>
      <p className="lead">
        An interval is just the distance between two notes. On the stave, it&apos;s how many steps you climb or drop.
        On the piano, it&apos;s how many keys apart. To your ear, it&apos;s the difference between “tight” and “wide”,
        between “cramped” and “open”.
      </p>
      <ul>
        <li><strong>Seconds</strong> (half-steps, whole steps) feel like close neighbors.</li>
        <li><strong>Thirds</strong> feel like a leap to a new color (sad or bright).</li>
        <li><strong>Tritones</strong> feel unstable and edgy.</li>
        <li><strong>Sixths and sevenths</strong> feel stretched and emotional.</li>
      </ul>

      <h2 className="h2">Intervals inside Path of Color</h2>
      <p className="lead">
        In the Path of Color column of the Two Paths table, we describe chord moves with simple local steps – things like
        “m → M(–4)” or “m → dim(+6)”. Those labels hide very real intervals:
      </p>

      <h3 className="h3">Example: Sadness</h3>
      <p className="lead">
        In the Sadness Path of Color, the last chord is <strong>Em</strong> relative to C minor. That chord is built
        on a <strong>major third</strong> above C. The move from Cm to Em is a big upward third that feels like a tragic
        “lift and drop”.
      </p>

      <h3 className="h3">Example: Fear</h3>
      <p className="lead">
        In Fear / Horror, Path of Color uses chords like <strong>F#°</strong> relative to C. C → F# is a{" "}
        <strong>tritone</strong> – the most unstable interval in the scale. That&apos;s why the Color path sounds like
        the floor disappearing under you.
      </p>

      <h3 className="h3">Example: Wonder</h3>
      <p className="lead">
        In Wonder, the &quot;halo&quot; chord often appears a <strong>major third</strong> or <strong>major seventh</strong>
        away from home. Those larger, bright intervals are what make the harmony feel like it&apos;s glowing.
      </p>

      <div className="callout">
        <strong>Takeaway:</strong> Path of Color isn&apos;t magic – it&apos;s just leaning on more dramatic intervals:
        tritones, big thirds, and chromatic steps. Once you recognize them, you can borrow them in your own progressions.
      </div>

      <h2 className="h2">Seeing intervals on the stave</h2>
      <p className="lead">
        If you&apos;re a visual learner, intervals are easy to see as <strong>gaps on the staff</strong>:
      </p>
      <ul>
        <li>Half-step (minor 2nd): two notes hugging each other, almost touching.</li>
        <li>Whole-step (major 2nd): one note in between.</li>
        <li>Thirds: skip one note; on the staff they stack neatly.</li>
        <li>Tritone: the one that looks “wrong” and sounds mysterious or scary.</li>
      </ul>
      <p className="lead">
        You can use any simple notes-on-staff trainer to visualize these – or just draw them out on paper.
      </p>
      {/* Notation Trainer */}
        <article className="card">
          <span className="chip">🎼 See</span>
          <h3 className="heading">See the Shape, Hear the Distance</h3>
          <p className="blurb">
            Intervals are music’s invisible geometry. On the page they’re lines and spaces apart; in sound they’re
            flavors — sweet, tense, open, or resolved. Learn to see their shapes on the stave, hear their colors
            by ear, and connect the two into one instinct. <strong>Practice</strong> spotting the spacing and playing them on the keyboard.
          </p>
          <Link href="/train/notation/intervals" className="cta">
            Open Notation Trainer →
          </Link>
        </article>

      <h2 className="h2">Hearing intervals in your ear</h2>
      <p className="lead">
        Your ear stores intervals as feelings: some want to resolve, some feel final, some feel like a question. The best
        way to internalize them is to listen, guess, and get instant feedback.
      </p>
      <p className="lead">
        Our <Link href="/train/ear/intervals">Ear Intervals Trainer</Link> plays intervals and asks you to identify them.
        Practice a few minutes a day and the colors in Path of Color will start to feel obvious instead of mysterious.
      </p>
      <div>
        <Link href="/train/ear/intervals" className="cta" aria-label="Open Ear Intervals Trainer">
          🎧 Try the Ear Intervals Trainer →
        </Link>
      </div>

      <h2 className="h2">Where to go next</h2>
      <p className="lead">
        Once intervals feel familiar, you can go back to the emotional layer:
      </p>
      <ul>
        <li>
          <Link href="/learn/two-paths-of-harmony"><strong>Two Paths of Harmony</strong></Link> – hear how Flow and Color use these intervals
          to paint emotions.
        </li>
        <li>
          <Link href="/learn/path-of-color"><strong>Path of Color</strong></Link> – pick any emotion and listen for the jumps and tight spots.
        </li>
       
      </ul>
    </main>
  );
}