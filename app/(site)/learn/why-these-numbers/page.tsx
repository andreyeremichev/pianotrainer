// app/(site)/learn/why-these-numbers/page.tsx
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Why These Numbers? • PianoTrainer",
  description:
    "How KeyClock and ToneDial turn dates, phone numbers, and words into music. Cadences (KeyClock), T9 melody (ToneDial), mappings, timing, and examples.",
  alternates: { canonical: "/learn/why-these-numbers" },
  openGraph: {
    type: "article",
    url: "https://pianotrainer.app/learn/why-these-numbers",
    title: "Why These Numbers? • PianoTrainer",
    description:
      "Your input is already music. See how dates (KeyClock cadences) and phone words (ToneDial T9 melody) map to degrees — with timing rules and examples.",
  },
  robots: { index: true, follow: true },
};

export default function WhyTheseNumbersPage() {
  return (
    <main className="why-page">
      <style>{`
        .why-page { max-width: 900px; margin: 0 auto; padding: 16px; color: #111; }
        .h1 { margin: 0 0 8px; font-size: 32px; line-height: 1.2; letter-spacing: .2px; }
        .lead { margin: 6px 0 16px; font-size: 16px; line-height: 1.6; }
        .h2 { margin: 22px 0 8px; font-size: 22px; line-height: 1.25; }
        .card { border: 1px solid #ddd; background: #fff; border-radius: 12px; padding: 16px; display: grid; gap: 10px; margin: 12px 0; }
        .cta-row { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 12px; }
        .cta { display: inline-flex; align-items: center; justify-content: center; text-decoration: none; font-weight: 800; color: #111; background: #EBCF7A; border-radius: 10px; padding: 10px 14px; border: none; }
        .ghost { display: inline-flex; align-items: center; justify-content: center; text-decoration: none; font-weight: 800; color: #111; background: transparent; border: 1px solid #ddd; border-radius: 10px; padding: 10px 14px; }
        .sep { height: 1px; background: #eee; margin: 14px 0; }
        ul.tight { margin: 0 0 0 18px; padding: 0; }
        ul.tight li { margin: 4px 0; }
        code.k { background: #f6f7f9; border: 1px solid #e5e8ee; padding: 1px 6px; border-radius: 6px; }
        .pill { display:inline-block; padding:2px 8px; border:1px solid #e5e8ee; border-radius:999px; background:#f8f9fb; font-size:12px; margin:2px 6px 2px 0; }
        .grid-2 { display:grid; grid-template-columns: 1fr 1fr; gap:14px; }
        @media (max-width: 680px){ .grid-2 { grid-template-columns: 1fr; } }
        .kbd { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas,"Courier New", monospace; font-variant-numeric: tabular-nums; }
        .note { font-size: 13px; color: #555; }
        .blocklist { margin: 0; padding-left: 18px; }
        .blocklist li { margin: 6px 0; }
        .ex { background:#fafbfe; border:1px solid #e5e8ee; border-radius:8px; padding:10px; }
      `}</style>

      <h1 className="h1">🔢 Why These Numbers?</h1>
      <p className="lead">
        Birthdays, anniversaries, phone numbers — even words — all hide little tunes.  
        Here’s how your input becomes melody on the circle of fifths, and how the two viral toys interpret it.
      </p>

      <section className="card">
        <h2 className="h2">🧭 KeyClock vs ToneDial (at a glance)</h2>
        <div className="grid-2">
          <div>
            <h3 className="h3" style={{ margin: "0 0 6px", fontSize: 18 }}>KeyClock — Dates → Cadences</h3>
            <ul className="blocklist">
              <li>Plays <strong>cadences</strong> (diatonic triads & inversions per digit).</li>
              <li>
                Allowed separators:{" "}
                <span className="pill">/</span>
                <span className="pill">,</span>
                <span className="pill">.</span>
                <span className="pill">'</span>
                <span className="pill">( )</span>
                <span className="pill">space</span>
                <span className="note"> (ticks / group breaks)</span>
              </li>
              <li><strong>Not allowed:</strong> <code className="k">+</code>, <code className="k">*</code> (not used for dates).</li>
              <li>Top caption: input line <em>always visible</em>. Bottom “degrees” helper line appears briefly (2nd Major pass) in downloads.</li>
            </ul>
          </div>
          <div>
            <h3 className="h3" style={{ margin: "0 0 6px", fontSize: 18 }}>ToneDial — Phone → Melody</h3>
            <ul className="blocklist">
              <li><strong>No cadences</strong>; letters map via T9 to a <strong>melody line</strong>.</li>
              <li>
                Allowed phone symbols:{" "}
                <span className="pill">#</span>
                <span className="pill">+</span>
                <span className="pill">*</span>{" "}
                <span className="note">(classic phone keypad)</span>
              </li>
              <li>Intended for names/words as phone text (e.g., <span className="kbd">1-800-HELLO</span>).</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="card">
        <h2 className="h2">🎯 Parsing &amp; Mapping (KeyClock)</h2>
        <p className="lead">This is how KeyClock interprets digits/letters on each pass:</p>
        <div className="ex">
          <ul className="tight">
            <li>Digits <strong>1–7</strong>: diatonic triads (render per-pass as <em>Major</em> vs <em>Minor</em> Roman numerals).</li>
            <li><strong>8</strong>: I (1st inversion).</li>
            <li><strong>9</strong>: II (2nd inversion).</li>
            <li><strong>0</strong> (zero policy): alternate between <em>rest</em> (–) and <em>chromatic</em> (♭2/♯4); zero-as-rest does not consume a playable and shows <strong>–</strong> in captions.</li>
            <li>Letters: map via <strong>T9</strong> to melody notes (exactly as in ToneDial).</li>
            <li>Separators (commas, spaces, etc.): rest ticks and group breaks.</li>
          </ul>
        </div>
        <div className="sep" />
        <h3 className="h3" style={{ margin: 0, fontSize: 18 }}>⏱️ Timing (applies to any multi-digit run)</h3>
        <p className="lead" style={{ marginTop: 6 }}>
          Let <code className="k">STEP = 250ms</code>:
        </p>
        <ul className="tight">
          <li>n = 1 → <strong>1.00×STEP</strong></li>
          <li>n = 2 → <strong>1.00×STEP</strong> (<span className="kbd">125ms</span> each)</li>
          <li>n = 3 → <strong>1.25×STEP</strong></li>
          <li>n = 4 → <strong>1.50×STEP</strong></li>
          <li>n ≥ 5 → <strong>min(1.75×STEP, (1 + 0.15×(n−2))×STEP)</strong>, capped at <strong>1.75×STEP</strong></li>
        </ul>
      </section>

      <section className="card">
        <h2 className="h2">🔉 Examples (audio + captions)</h2>
        <ul className="tight">
          <li>
            <span className="kbd">10</span> → cadence <strong>1 – 0</strong> (I, then rest or ♭2/♯4).  
            <span className="note"> Caption: <strong>1ˢᵗ</strong> (or <strong>I</strong>) under 1; <strong>–</strong> (or <strong>♭2/♯4</strong>) under 0.</span>
          </li>
          <li>
            <span className="kbd">12</span> → cadence <strong>1 – 2</strong>.  
            <span className="note"> Caption: <strong>I – ii</strong> (Major) / <strong>i – ii°</strong> (Minor).</span>
          </li>
          <li><span className="kbd">99</span> → <strong>9 – 9</strong> (II in 2nd inv twice).</li>
          <li><span className="kbd">1999</span> → <strong>1 – 9 – 9 – 9</strong> (4-note roll).</li>
          <li><span className="kbd">2025</span> → <strong>2 – 0 – 2 – 5</strong>.</li>
        </ul>

        <div className="sep" />
        <h3 className="h3" style={{ margin: 0, fontSize: 18 }}>📅 “October 21, 2025”</h3>
        <ul className="tight" style={{ marginTop: 6 }}>
          <li><strong>“October”</strong> → letters → melody (T9).</li>
          <li><strong>,</strong> → rest tick.</li>
          <li><strong>21</strong> → <strong>2 – 1</strong> (<span className="kbd">250ms</span> total).</li>
          <li><strong>,</strong> → rest tick.</li>
          <li><strong>2025</strong> → 4-digit cadence (<span className="kbd">375ms</span> total with the stretch).</li>
        </ul>
      </section>

      <section className="card">
        <h2 className="h2">🎭 Two Passes × Two Colors</h2>
        <p className="lead">
          Playback runs in clean passes: <strong>B♭ Major</strong> (bright gold) and <strong>C minor</strong> (moody green), twice each:  
          <span className="kbd">Major → Major → minor → minor</span>. Trails reset each pass for clarity.
        </p>
        <p className="note">
          In downloads, the top input line stays visible from start to finish; the bottom “degrees helper” line appears briefly (in KeyClock) during the 2nd Major pass.
        </p>
      </section>

      <section className="card">
        <h2 className="h2">🚦 Allowed Input (quick reference)</h2>
        <div className="grid-2">
          <div>
            <h3 className="h3" style={{ margin: "0 0 6px", fontSize: 18 }}>KeyClock (Dates)</h3>
            <div className="lead">
              <div className="pill">0–9</div>
              <div className="pill">A–Z</div>
              <div className="pill">/</div>
              <div className="pill">,</div>
              <div className="pill">.</div>
              <div className="pill">'</div>
              <div className="pill">( )</div>
              <div className="pill">space</div>
            </div>
            <div className="note" style={{ marginTop: 6 }}>
              <strong>Not allowed:</strong> <code className="k">+</code>, <code className="k">*</code> (not used for dates).
            </div>
          </div>
          <div>
            <h3 className="h3" style={{ margin: "0 0 6px", fontSize: 18 }}>ToneDial (Phone)</h3>
            <div className="lead">
              <div className="pill">0–9</div>
              <div className="pill">A–Z (T9)</div>
              <div className="pill">#</div>
              <div className="pill">+</div>
              <div className="pill">*</div>
              <div className="pill">-</div>
              <div className="pill">space</div>
            </div>
          </div>
        </div>
      </section>

      <section className="card">
        <h2 className="h2">🚀 Try the Musical Toys</h2>
        <p className="lead">Now that you know the mapping, let your dates, phone numbers, and words sing:</p>
        <div className="cta-row">
          <Link href="/viral/key-clock" className="cta" aria-label="Open KeyClock (Date → Degrees)">
            KeyClock (Date → Degrees) →
          </Link>
          <Link href="/viral/tone-dial" className="ghost" aria-label="Open ToneDial (Phone → Degrees)">
            ToneDial (Phone → Degrees) →
          </Link>
          <Link href="/viral/text-to-tone" className="ghost" aria-label="Open TextToTone (Words → Notes)">
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