// app/(site)/learn/why-these-notes/page.tsx
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Why These Notes? • PianoTrainer",
  description:
    "Letters become music: a playful explanation of how your words turn into melody. Try the viral toy or level up with the full trainer.",
  alternates: { canonical: "/learn/why-these-notes" },
  openGraph: {
    type: "article",
    url: "https://pianotrainer.app/learn/why-these-notes",
    title: "Why These Notes? • PianoTrainer",
    description:
      "Your words are already music. See how letters become melody — then try it yourself.",
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

      <section className="card">
        <h2 className="h2">🅰️ Letters Become Notes</h2>
        <p className="lead">
          Here’s the trick: every single letter in your words is a <strong>musical step</strong>.
          The letter <strong>A</strong>? That’s a note. The letter <strong>B</strong>? Also a note.
          Keep going and you’ll discover: even <strong>Z</strong> has a voice. Your name is basically
          begging to be sung. 💌🎤
        </p>
      </section>

      <section className="card">
        <h2 className="h2">⬆️ The Great Climb</h2>
        <p className="lead">
          Short words stay low, like a secret whispered on the piano. Long words climb higher and higher,
          until they’re basically shouting from the rooftops. That’s why a tiny “Hi” sounds gentle… and
          something long turns into a skyscraper of sound. 🏙️🎹
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
          <li><strong>Double your space</strong> to 40 letters (epic sentences welcome).</li>
          <li>See your words mapped on a piano + grand stave together.</li>
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
        <h2 className="h2">🚀 Ready to Play Again?</h2>
        <p className="lead">
          Now that you know the secret handshake:
        </p>
        <div className="cta-row">
          <Link href="/viral/words-to-notes-sn" className="cta" aria-label="Open Words to Notes Viral Toy">
            Back to the Viral Toy →
          </Link>
          <Link href="/learn/words-to-notes" className="ghost" aria-label="Open Full Words to Notes Trainer">
            Full Trainer →
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
          <Link href="/viral/words-to-notes-sn" className="cta" aria-label="Open Viral Toy">
            Make a New Clip →
          </Link>
        </div>
      </section>
    </main>
  );
}