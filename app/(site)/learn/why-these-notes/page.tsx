// app/(site)/learn/why-these-notes/page.tsx
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Why These Notes? • PianoTrainer",
  description:
    "Words play as a melody in A natural minor (A3–A4). Numbers become chords (1–9, 10–19, 20–90) with 100 as a cadence. Everything normalizes to a loop-friendly 8 seconds.",
  alternates: { canonical: "/learn/why-these-notes" },
  openGraph: {
    type: "article",
    url: "https://pianotrainer.app/learn/why-these-notes",
    title: "Why These Notes? • PianoTrainer",
    description:
      "Letters → A-minor melody (A3–A4). Numbers → diatonic chords with cadences. Zero is a soft A3 tick. All clips normalize to 8s for seamless loops.",
  },
  robots: { index: true, follow: true },
};

export default function WhyTheseNotesPage() {
  return (
    <main className="why-page">
      <style>{`
        .why-page {
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
        .card {
          border: 1px solid #ddd;
          background: #fff;
          border-radius: 12px;
          padding: 16px;
          display: grid;
          gap: 8px;
          margin: 12px 0;
        }
        .cta-row {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          margin-top: 12px;
        }
        .cta {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          text-decoration: none;
          font-weight: 800;
          color: #111;                /* dark text on gold */
          background: #EBCF7A;        /* gold */
          border-radius: 10px;
          padding: 10px 14px;
          border: none;
        }
        .ghost {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          text-decoration: none;
          font-weight: 800;
          color: #111;
          background: transparent;
          border: 1px solid #ddd;
          border-radius: 10px;
          padding: 10px 14px;
        }
        .sep {
          height: 1px;
          background: #eee;
          margin: 14px 0;
        }
      `}</style>

      <h1 className="h1">🌟 You’re One of the Curious Ones</h1>
      <p className="lead">
        First things first: <strong>congratulations</strong>.
        Most people just tap “Play” and giggle at their melody. But <em>you</em>?
        You clicked <strong>Why these notes?</strong> — which means you’re officially one of us:
        the explorers, the secret-keepers, the melody-hackers. 🕵️‍♀️🎶
      </p>

      {/* UPDATED: Letters logic */}
      <section className="card">
        <h2 className="h2">🅰️ Letters Become Notes (A minor, A3–A4)</h2>
        <p className="lead">
          Every letter maps to a step of the <strong>A natural minor</strong> scale (A–B–C–D–E–F–G) and
          plays as a simple, singable melody. To keep it clear:
        </p>
        <ul className="lead" style={{ margin: "0 0 0 18px" }}>
          <li><strong>Range:</strong> A3–A4 only (compact, phone-friendly).</li>
          <li><strong>A on bass, everything else on treble:</strong> the letter A shows on <em>A3 (bass)</em>; B–G render on the treble staff.</li>
          <li><strong>Spaces:</strong> become short rests in notation (and silence in audio).</li>
        </ul>
        <p className="lead" style={{ marginTop: 6 }}>
          That’s why names feel hummable: it’s always a tidy A-minor lane with readable stems and no wild jumps.
        </p>
      </section>

      {/* UPDATED: Replace vague “climb” with clarity/visibility */}
      <section className="card">
        <h2 className="h2">👀 Readable by Design</h2>
        <p className="lead">
          Notes sit where you expect on the grand staff. Stems follow engraving rules:
          below the middle line → stems up; above → stems down; middle line leans down for consistency.
          The result: a clean, classroom-friendly look that still pops in Reels.
        </p>
      </section>

      {/* NEW: Numbers as chords */}
      <section className="card">
        <h2 className="h2">🔢 Numbers Become Chords (Diatonic, A minor)</h2>
        <p className="lead">
          Digits aren’t just digits — they’re <strong>chords</strong>:
        </p>
        <ul className="lead" style={{ margin: "0 0 0 18px" }}>
          <li><strong>1–9:</strong> triads/colors inside A minor (e.g., <em>1 → Am</em> voiced in treble).</li>
          <li><strong>10–19 (teens):</strong> single color chord (e.g., <em>15 → Fmaj7</em>).</li>
          <li><strong>20–90 (tens):</strong> compact treble voicings (e.g., <em>20 → Am/C</em> plate).</li>
          <li><strong>100:</strong> cadence chord; we rotate variants to keep phrases fresh.</li>
          <li><strong>0:</strong> a very short <em>A3 “tick”</em> (audible cue, minimal visual clutter).</li>
        </ul>
        <div className="sep" />
        <p className="lead"><strong>Tokenizer examples</strong> (how numbers are split):</p>
        <ul className="lead" style={{ margin: "0 0 0 18px" }}>
          <li><code>21</code> → <em>20 + 1</em></li>
          <li><code>301</code> → <em>3 + 100 + 1</em></li>
          <li><code>123</code> → <em>100 + 20 + 3</em></li>
          <li><code>2000</code> → <em>2 + 0 + 0 + 0</em> (zeros are short ticks)</li>
        </ul>
      </section>

      {/* UPDATED: 8s normalization */}
      <section className="card">
        <h2 className="h2">⏱️ Always an 8-Second Loop</h2>
        <p className="lead">
          After tokenizing, we assign each token a weight (letters = baseline, teens/tens = a bit longer,
          cadences include a tiny breath). Then we normalize everything so the clip lasts
          <strong> exactly 8.0 seconds</strong>. That means clean, seamless restarts and a perfect fit for Shorts/Reels.
        </p>
      </section>

      <section className="card">
        <h2 className="h2">⏱️ Why Stop at 20 Letters?</h2>
        <p className="lead">
          This viral toy is designed for quick, punchy clips — long enough to make a tune,
          short enough to share in a few seconds (perfect for TikTok, Insta, Reels).
        </p>
        <div className="sep" />
        <p className="lead">
          But what if you want more? 👀
        </p>
        <p className="lead">
          Try the <strong>Full Words to Notes Trainer</strong> to:
        </p>
        <ul className="lead" style={{ margin: "0 0 0 18px" }}>
          <li>Flip your phrase into <strong>A major</strong> for a brighter, happier vibe.</li>
          <li><strong>Double your space</strong> to 40 letters (epic sentences welcome). Compare toy style with another mapping of letters (in three Octaves).</li>
          <li>See your words mapped on full grand stave, not only inside A3 - A4.</li>
        </ul>
        <div className="cta-row">
          <Link href="/learn/words-to-notes" className="cta" aria-label="Open Full Words to Notes Trainer">
            Try the Full Trainer →
          </Link>
        </div>
      </section>

      <section className="card">
        <h2 className="h2">🎩 The Secret Sauce</h2>
        <p className="lead">
          There’s nothing to memorize. No boring rules. Just this:
          <strong> your words are already music</strong>. We simply nudged the piano to agree.
        </p>
      </section>

      <section className="card">
        <h2 className="h2">🚀 Ready to Try Again?</h2>
        <p className="lead">
          Now that you know the trick, why stop at one? Let a date, a phone number, 
          or even a word sing. Try any of these three viral toys:
        </p>
        <div className="cta-row">
          <Link
            href="/viral/date-to-notes-sn"
            className="cta"
            aria-label="Open Date to Notes Viral Toy"
          >
            Date → Notes →
          </Link>
          <Link
            href="/viral/phone-numbers-to-notes-sn"
            className="ghost"
            aria-label="Open Phone Numbers Viral Toy"
          >
            Phone → Notes →
          </Link>
          <Link
            href="/viral/text-to-tone"
            className="ghost"
            aria-label="Open Words to Notes Viral Toy"
          >
            Words → Notes →
          </Link>
        </div> 
      </section>

      <section className="card">
        <h2 className="h2">🎶 Share the Fun</h2>
        <p className="lead">
          Type your friend’s name. Hit play. Watch their face when the piano sings it back.
          It’s the fastest way to make someone smile today.
        </p>
        <div className="cta-row">
          <Link href="/viral/text-to-tone" className="cta" aria-label="Open Viral Toy">
            Make a New Clip →
          </Link>
        </div>
      </section>
    </main>
  );
}