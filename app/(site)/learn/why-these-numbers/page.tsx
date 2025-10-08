// app/(site)/learn/why-these-numbers/page.tsx
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Why These Numbers? • PianoTrainer",
  description:
    "Dates and phone numbers can sing too! A playful explanation of how your digits become music. Try the viral toy or level up with the full trainer.",
  alternates: { canonical: "/learn/why-these-numbers" },
  openGraph: {
    type: "article",
    url: "https://pianotrainer.app/learn/why-these-numbers",
    title: "Why These Numbers? • PianoTrainer",
    description:
      "Your numbers are already music. See how birthdays and phone numbers become melody — then try it yourself.",
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
      `}</style>

      <h1 className="h1">🔢 Why These Numbers?</h1>
      <p className="lead">
        Birthdays, anniversaries, phone numbers — they all hide little tunes.  
        Tap “Why these notes?” and suddenly you’re in on the secret. 🕵️‍♂️🎶
      </p>

      <section className="card">
  <h2 className="h2">🎯 Digits Become Degrees</h2>
  <p className="lead">
    Each digit isn’t just a number — it’s a <strong>step on the circle</strong>.
    1 through 7 land on the main spokes, 0 can be anything –{" "}
    <a
      href="https://youtube.com/shorts/_5GosXP6Jp4"
      target="_blank"
      rel="noopener noreferrer"
      style={{ color: "#EBCF7A", textDecoration: "underline" }}
    >
      a pause, like in previous version
    </a>
    , or it can be some degree outside Major and minor – as currently, 8 and 9 jump an octave higher.
    Even dashes (“–”) matter: they’re little rests that give your melody room to breathe.
  </p>
</section>

      <section className="card">
        <h2 className="h2">🎭 Two Personalities: Major & Minor</h2>
        <p className="lead">
          Your clip swaps between <strong>B♭ Major</strong> (bright gold) and <strong>C minor</strong> (moody green).
          Each time the digits loop, the mood flips: happy ↔ sad, light ↔ dark.
          It’s like hearing the same birthday sung by two different choirs. ✨🌑
        </p>
      </section>

      <section className="card">
        <h2 className="h2">⏱️ Why 8 Seconds?</h2>
        <p className="lead">
          Short and sweet! Each viral clip is capped at <strong>16 seconds</strong> —
          just enough time for the pattern to shine and loop, perfect for Reels and TikToks.
        </p>
        <div className="sep" />
        <p className="lead">Want to go longer? Explore the full trainer:</p>
        <ul className="lead" style={{ margin: "0 0 0 18px" }}>
          <li>Play with longer sequences (30–60s).</li>
          <li>See numbers mapped onto the full piano + grand stave.</li>
          <li>Experiment with different modes and keys.</li>
        </ul>
        <div className="cta-row">
          <Link href="/learn/numbers-circle" className="cta" aria-label="Open Full Numbers to Notes Trainer">
            Explore the Full Trainer →
          </Link>
        </div>
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
      href="/viral/words-to-notes-sn"
      className="ghost"
      aria-label="Open Words to Notes Viral Toy"
    >
      Words → Notes →
    </Link>
  </div> 
      </section>
    </main>
  );
}