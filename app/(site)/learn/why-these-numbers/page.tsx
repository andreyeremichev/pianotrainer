// app/(site)/learn/why-these-numbers/page.tsx
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Why These Numbers? • PianoTrainer",
  description:
    "Dates, phone numbers, and even words can sing. Here’s how digits and letters map to musical degrees — then try the viral toys.",
  alternates: { canonical: "/learn/why-these-numbers" },
  openGraph: {
    type: "article",
    url: "https://pianotrainer.app/learn/why-these-numbers",
    title: "Why These Numbers? • PianoTrainer",
    description:
      "Your numbers are already music. See how birthdays, phone numbers, and words become melody — then try it yourself.",
  },
  robots: { index: true, follow: true },
};

export default function WhyTheseNumbersPage() {
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
        ul.tight { margin: 0 0 0 18px; padding: 0; }
        ul.tight li { margin: 4px 0; }
        code.k { background: #f6f7f9; border: 1px solid #e5e8ee; padding: 1px 6px; border-radius: 6px; }
      `}</style>

      <h1 className="h1">🔢 Why These Numbers?</h1>
      <p className="lead">
        Birthdays, anniversaries, phone numbers — even words — all hide little tunes.  
        Here’s how your input becomes melody on the circle of fifths.
      </p>

      <section className="card">
        <h2 className="h2">🎯 Digits & Letters → Degrees</h2>
        <p className="lead">
          1–7 map to the seven scale degrees on the circle. <strong>8</strong> and <strong>9</strong> are the same
          degrees an octave up (1↑ and 2↑). For date days <strong>17–31</strong>, we play two degrees together
          (e.g. <strong>17 → 1+7</strong>, <strong>31 → 3+1</strong>) for a fuller color. Separators like <code className="k">/ - , .</code> create short rests.
        </p>
        <p className="lead">
          Letters are mapped by the classic phone keypad (T9): <strong>A–C→2</strong>, <strong>D–F→3</strong>, …, <strong>W–Z→9</strong>.  
          That’s why both words and mixed inputs (like <em>Oct 14</em> or <em>1-800-HELLO</em>) sing naturally.
        </p>
        <p className="lead">
          The digit <strong>0</strong> is a special spice: by default it alternates between chromatic neighbors
          outside the diatonic (♭II / ♯IV), or you can set it to be a rest. Small choice, big mood.
        </p>
      </section>

      <section className="card">
        <h2 className="h2">🎭 Two Personalities: B♭ Major & C minor</h2>
        <p className="lead">
          Every clip plays in two colors: <strong>B♭ Major</strong> (bright gold) and <strong>C minor</strong> (moody green).
          The playback runs in <strong>clean passes</strong>: <em>Major → Minor → Major → Minor</em>.
          Each pass draws one continuous “string” on the circle for that mode, then resets for the next pass.
          Same input, two feelings — shown twice for groove and clarity.
        </p>
      </section>

      <section className="card">
        <h2 className="h2">⏱️ How long does it run?</h2>
        <p className="lead">
          Short and shareable. We play <strong>two full passes per mode</strong> (Major then Minor, repeated once).
          Typical clips land around <strong>12–15s</strong> depending on input length — perfect for Reels/TikToks.
        </p>
        <div className="sep" />
        <p className="lead">Want to go deeper? Try the full trainer:</p>
        <ul className="lead tight">
          <li>Longer sequences and more timing options.</li>
          <li>Numbers/words mapped on grand stave.</li>
          <li>Keys, modes, and visualization tweaks.</li>
        </ul>
        <div className="cta-row">
          <Link href="/learn/numbers-circle" className="cta" aria-label="Open Full Numbers to Notes Trainer">
            Explore the Full Trainer →
          </Link>
        </div>
      </section>

      <section className="card">
        <h2 className="h2">🚀 Try the Musical Toys</h2>
        <p className="lead">
          Now that you know the mapping, let your dates, phone numbers, and words sing:
        </p>
        <div className="cta-row">
          <Link
            href="/viral/key-clock"
            className="cta"
            aria-label="Open KeyClock (Date → Notes)"
          >
            KeyClock (Date → Degrees) →
          </Link>
          <Link
            href="/viral/tone-dial"
            className="ghost"
            aria-label="Open ToneDial (Phone → Notes)"
          >
            ToneDial (Phone → Degrees) →
          </Link>
          <Link
            href="/viral/text-to-tone"
            className="ghost"
            aria-label="Open TextToTone (Words → Notes)"
          >
            TextToTone (Text → Notes) →
          </Link>
          <Link
            href="/viral/text-to-tone-chaos"
            className="ghost"
            aria-label="Open TextToTone-Chaos (2 octaves; A minor / A major)"
          >
            TextToTone: Chaos (2 octaves; A min / A Maj) →
          </Link>
        </div>
      </section>
    </main>
  );
}