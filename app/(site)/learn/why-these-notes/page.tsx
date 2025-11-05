// app/(site)/learn/why-these-notes/page.tsx
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Why These Notes? • PianoTrainer",
  description:
    "TextToTone maps text to sound in A minor. Letters mode: simple A-minor melody (A3–A4) plus number/symbol chords. Phonemes mode: vowels and consonants mapped to the seven notes of A minor, with speech-like rhythm archetypes. A compact helper line shows note letters and Roman-numeral chords.",
  alternates: { canonical: "/learn/why-these-notes" },
  openGraph: {
    type: "article",
    url: "https://pianotrainer.app/learn/why-these-notes",
    title: "Why These Notes? • PianoTrainer",
    description:
      "Letters → A-minor melody and number chords. Phonemes (IPA) → vowels/consonants mapped across A minor with speech-like rhythm. Helper line shows note letters + Roman chords.",
    images: [
      {
        url: "https://pianotrainer.app/og/texttotone-chaos.jpg",
        width: 1200,
        height: 630,
        alt: "TextToTone: Why These Notes — A-minor mapping explained",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Why These Notes? • PianoTrainer",
    description:
      "Letters mode: A-minor melody + diatonic chords. Phonemes mode: the vowel/consonant palette of A minor with rhythm archetypes. Helper line shows letters + Roman chords.",
    images: ["https://pianotrainer.app/og/texttotone-chaos.jpg"],
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
          color: #111;
          background: #EBCF7A;
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
        code {
          background: #f6f6f6;
          border: 1px solid #eee;
          border-radius: 6px;
          padding: 1px 6px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          font-size: 15px;
        }
        th, td {
          padding: 8px 10px;
          border-bottom: 1px solid #eee;
          vertical-align: top;
        }
        th { text-align: left; font-weight: 800; }
        .mono { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
        blockquote {
          margin: 8px 0 0;
          padding: 0 0 0 12px;
          border-left: 3px solid #EBCF7A;
          color: #333;
        }
      `}</style>

      <h1 className="h1">🌟 You’re One of the Curious Ones</h1>
      <p className="lead">
        First things first: <strong>congratulations</strong>.
        Most people just tap “Play” and giggle at their melody. But <em>you</em>?
        You clicked <strong>Why these notes?</strong> — which means you’re officially one of us:
        the explorers, the secret-keepers, the melody-hackers. 🕵️‍♀️🎶
      </p>

      {/* Why These Notes — narrative */}
      <section className="card">
        <h2 className="h2">🎵 Why These Notes</h2>
        <p className="lead">
          Human speech already <em>is</em> music — we just never printed the staff lines for it.
          When we talk, our tongue and breath travel through shapes that mirror a melody:
          bright vowels open high in the mouth, dark vowels fall back and low,
          consonants strike like percussion between them. TextToTone simply listens to that hidden
          tune and writes it onto the piano.
        </p>
      </section>

      {/* Two modes */}
      <section className="card">
        <h2 className="h2">🧭 Two Modes: Letters &amp; Phonemes (IPA)</h2>
        <p className="lead">
          TextToTone offers <strong>two complementary modes</strong>:
        </p>
        <ul className="lead" style={{ margin: "0 0 0 18px" }}>
          <li>
            <strong>Letters mode</strong> — a simple, singable A-minor melody (A3–A4) for letters,
            plus diatonic chords for numbers and symbols. Great for names, dates, and quick memes.
          </li>
          <li>
            <strong>Phonemes mode (IPA)</strong> — vowels and consonants mapped across the seven notes of A minor
            (A–B–C–D–E–F–G), so speech sounds “sing” where they live in the mouth. We also add
            speech-like <em>rhythm archetypes</em> (Even, Swing, Legato, Stomp, Bounce) to make phrases breathe.
          </li>
        </ul>
        <p className="lead" style={{ marginTop: 6 }}>
          Use the toggle on the TextToTone page to switch modes — each input instantly re-renders
          in the selected mapping.
        </p>
      </section>

      {/* The key of human voice: A minor */}
      <section className="card">
        <h2 className="h2">🎼 The Key of Human Voice: A Minor</h2>
        <p className="lead">
          We mapped every sound of English onto the seven natural notes of <strong>A minor</strong> —
          a key that sits close to speech formants. Front vowels like <em>ee</em> or <em>ih</em> rise to the bright middle (E–F).
          Central vowels like <em>uh</em> and <em>er</em> balance near D. Back vowels like <em>ah</em> and <em>oh</em> drop toward G and A —
          warm, open tones that feel grounded. Rounded <em>oo</em> sounds reach upward to B, giving language its closing shimmer.
        </p>
        <p className="lead">
          Consonants become rhythm and texture:
        </p>
        <ul className="lead" style={{ margin: "0 0 0 18px" }}>
          <li><strong>Plosives</strong> (<em>p, t, k</em>) strike the root <strong>A</strong>, setting the beat.</li>
          <li><strong>Nasals</strong> (<em>m, n</em>) hum softly on <strong>C</strong>.</li>
          <li><strong>Fricatives</strong> (<em>s, f, sh</em>) hiss at <strong>E</strong>, adding air.</li>
          <li><strong>Liquids &amp; glides</strong> (<em>l, r, w, y</em>) move across <strong>F–G–B</strong>, carrying motion between vowels.</li>
        </ul>
        <p className="lead" style={{ marginTop: 6 }}>
          Each word, then, walks a tiny melody inside that scale — a three-step dance of
          consonant → vowel → consonant, rising, resolving, and breathing like a phrase of music.
        </p>
      </section>

      {/* Letters mode specifics (kept succinct) */}
      <section className="card">
        <h2 className="h2">🅰️ Letters Become Notes (A minor, A3–A4)</h2>
        <p className="lead">
          In <strong>Letters mode</strong>, every letter maps to a step of the A-minor scale and plays in a compact range.
          A sits on bass (A3); B–G render on treble. Spaces become short rests. The result is a tidy, readable line —
          ideal for names and clean captions.
        </p>
      </section>

      {/* Rhythm archetypes */}
      <section className="card">
        <h2 className="h2">🥁 Rhythm Follows Speech</h2>
        <p className="lead">
          Not every word keeps the same beat. Some swing forward (<em>toy</em>), some linger (<em>great</em>), some stomp (<em>stop!</em>).
          We borrowed these patterns — <strong>archetypes</strong> — from how people actually talk:
        </p>
        <ul className="lead" style={{ margin: "0 0 0 18px" }}>
          <li><strong>Even</strong> for neutral tone</li>
          <li><strong>Swing</strong> for movement</li>
          <li><strong>Legato</strong> for warmth</li>
          <li><strong>Stomp</strong> for emphasis</li>
          <li><strong>Bounce</strong> for playfulness</li>
        </ul>
        <p className="lead" style={{ marginTop: 6 }}>
          Each archetype simply changes the spacing between sounds — like shifting a drum groove.
        </p>
      </section>

      {/* Numbers as chords */}
      <section className="card">
        <h2 className="h2">🔢 Numbers Become Chords (Diatonic, A minor)</h2>
        <p className="lead">
          Digits aren’t just digits — they’re <strong>chords</strong>:
        </p>
        <ul className="lead" style={{ margin: "0 0 0 18px" }}>
          <li><strong>1–9:</strong> triads/colors inside A minor (e.g., <em>1 → A-minor</em> voiced in treble).</li>
          <li><strong>10–19 (teens):</strong> a single color chord (e.g., <em>15 → F△7</em>).</li>
          <li><strong>20–90 (tens):</strong> a compact set of diatonic functions (see table below).</li>
          <li><strong>100:</strong> cadence chord; variants rotate for freshness.</li>
          <li><strong>0:</strong> a very short <em>A3 “tick”</em> (audible cue with minimal visual load).</li>
        </ul>
        <div className="sep" />
        <p className="lead"><strong>Tokenizer examples</strong> (how numbers split):</p>
        <ul className="lead" style={{ margin: "0 0 0 18px" }}>
          <li><code>21</code> → <em>20 + 1</em></li>
          <li><code>301</code> → <em>3 + 100 + 1</em></li>
          <li><code>123</code> → <em>100 + 20 + 3</em></li>
          <li><code>2000</code> → <em>2 + 0 + 0 + 0</em> (zeros are short ticks)</li>
        </ul>
      </section>

      {/* Legend: Roman numerals & inversions (lowercase policy) */}
      <section className="card">
        <h2 className="h2">🎼 Reading the Labels: Roman + Inversions</h2>
        <p className="lead">
          We display chords as <strong>Roman numerals in A natural minor</strong>,
          and use condensed superscripts for inversions — a compact version of figured bass:
        </p>
        <ul className="lead" style={{ margin: "0 0 0 18px" }}>
          <li><strong>Lowercase throughout</strong> (Aeolian): <code>i</code>, <code>ii°</code>, <code>iii</code>, <code>iv</code>, <code>v</code>, <code>vi</code>, <code>vii</code>.</li>
          <li><strong>Triads:</strong> root → <code>i</code>, 1st inv → <code>i⁶</code>, 2nd inv → <code>i⁶⁴</code>.</li>
          <li><strong>Sevenths:</strong> root → <code>v⁷</code>, 1st inv → <code>v⁶⁵</code>, 2nd → <code>v⁴³</code>, 3rd → <code>v⁴²</code>.</li>
          <li><strong>Quality marks:</strong> <code>°</code> diminished (<code>ii°</code>), <code>ø</code> half-dim 7th (<code>iiø⁷</code>), <code>△</code> major-7 (<code>iii△⁷</code>).</li>
        </ul>
        <p className="lead" style={{ marginTop: 6 }}>
          You can read <code>i⁶</code>/<code>i⁶⁴</code> as “i, 1st/2nd inversion.” We keep superscripts to fit everything on one clean line in the helper.
        </p>
      </section>

      {/* Tens chords table (lowercase roman) */}
      <section className="card">
        <h2 className="h2">🔟 Tens Chords (10–90) in A minor</h2>
        <table className="mono">
          <thead>
            <tr>
              <th>Num</th><th>Function</th><th>Voicing</th><th>Roman</th><th>Character</th>
            </tr>
          </thead>
          <tbody>
            <tr><td>10</td><td>i(add 9)</td><td>A C E B</td><td>i</td><td>soft, open tonic</td></tr>
            <tr><td>20</td><td>iiø⁷</td><td>B D F A</td><td>iiø⁷</td><td>gentle tension</td></tr>
            <tr><td>30</td><td>iii△⁷</td><td>C E G B</td><td>iii△⁷</td><td>bright, “major 7” daylight</td></tr>
            <tr><td>40</td><td>iv⁶</td><td>F A D</td><td>iv⁶</td><td>subdominant inversion</td></tr>
            <tr><td>50</td><td>v⁶</td><td>G B E</td><td>v⁶</td><td>dominant inversion</td></tr>
            <tr><td>60</td><td>vi⁶</td><td>C F A</td><td>vi⁶</td><td>calm resolution</td></tr>
            <tr><td>70</td><td>vii⁶</td><td>D G B</td><td>vii⁶</td><td>lift toward tonic</td></tr>
            <tr><td>80</td><td>i (8ve A)</td><td>A C E A</td><td>i</td><td>strong home return</td></tr>
            <tr><td>90</td><td>iiø⁷ (loop)</td><td>B D F A</td><td>iiø⁷</td><td>same tension → back to 10</td></tr>
          </tbody>
        </table>
      </section>

      {/* Timing model */}
      <section className="card">
        <h2 className="h2">⏱️ Timing that Feels Musical</h2>
        <p className="lead">
          After tokenizing, we schedule each step at a simple musical pace:
          <strong> ~250 ms</strong> per note/chord, <strong>~125 ms</strong> for spaces/dashes (short rests),
          and soft ticks remain short (e.g., <code>.</code> and <code>:</code> on A3).
          The total clip length reflects your input — short texts finish sooner; longer ones sing longer.
        </p>
        <p className="lead" style={{ marginTop: 6 }}>
          For videos, the helper line under the stave shows <em>letters</em> for notes and <em>Roman numerals</em> for chords
          (with condensed superscripts) so you can read the harmony at a glance.
        </p>
      </section>

      {/* Sound of thought / short */}
      <section className="card">
        <h2 className="h2">🧠 The Sound of Thought</h2>
        <p className="lead">
          Put together, these rules form a tiny orchestra of articulation. Your text doesn’t just look like
          a sentence anymore — it breathes. Short vowels step, long vowels glide, and every comma becomes a rest.
          Language turns into a living A-minor etude: part linguistics, part poetry, part rhythm game.
        </p>
        <div className="sep" />
        <p className="lead"><strong>In short</strong></p>
        <blockquote>
          TextToTone plays speech itself. Each vowel finds its note; each consonant keeps time.
          The human voice already speaks in A minor — we just let you hear it.
        </blockquote>
      </section>

      {/* Symbols */}
      <section className="card">
        <h2 className="h2">#TextToTone Beyond Words</h2>
        <p className="lead">
          TextToTone is more than letters. We added gentle, musical meanings for common symbols so memes read naturally:
        </p>
        <ul className="lead" style={{ margin: "0 0 0 18px" }}>
          <li><strong>%</strong> = a short breath, then two chords (<em>Em/G → Am/C</em>) — sounds like “per-cent”.</li>
          <li><strong>/</strong> adds a light link chord (<em>Em/G</em>), <strong>+</strong> is a warm lift (<em>Dm</em>), <strong>=</strong> settles (<em>Am/C</em> + tiny rest).</li>
          <li><strong>.</strong> and <strong>:</strong> are soft ticks on <em>A3</em>; <strong>,</strong> and <strong>-</strong> are short rests.</li>
          <li><strong>?</strong> uses <em>G–B–D</em> (curious lift), <strong>!</strong> uses <em>E–G–B</em> (gentle emphasis).</li>
          <li><strong>#</strong> adds a tag chord (<em>G–B–D</em>), <strong>@</strong> gives a quick high tick (<em>A4</em>), <strong>$</strong> colors with <em>F△7</em>.</li>
          <li><strong>’</strong> apostrophe becomes a tiny breath (contractions feel natural: <code>let’s</code>).</li>
        </ul>
      </section>

      {/* Shareable summary */}
      <section className="card">
        <h2 className="h2">✨ Shareable Summary</h2>
        <p className="lead"><strong>Why A minor?</strong> Because it’s the shape of a mouth.</p>
        <p className="lead">
          Front vowels sparkle on E–F, back vowels open on A–G–B, and consonants keep the beat.
          TextToTone turns every word into a melody that follows how you actually speak.
        </p>
      </section>

      {/* CTA to Chaos + feedback */}
      <section className="card">
        <h2 className="h2">⏱️ Why Stop at 20 Elements?</h2>
        <p className="lead">
          This viral toy is designed for quick, punchy clips — long enough to make a tune,
          short enough to share (perfect for TikTok, Insta, Reels).
        </p>
        <div className="sep" />
        <p className="lead">But what if you want more? 👀</p>
        <p className="lead">
          Try <strong>TextToTone: Chaos Mode</strong> (we’re gathering feedback before a big update).
          Tell us what you’d love to see: <a href="mailto:hello@pianotrainer.app">hello@pianotrainer.app</a>
        </p>
        <div className="cta-row">
          <Link
            href="/learn/text-to-tone-chaos"
            className="cta"
            aria-label="Open TextToTone: Chaos Mode"
          >
            Try TextToTone: Chaos Mode →
          </Link>
        </div>
      </section>

      {/* App CTAs */}
      <section className="card">
        <h2 className="h2">🚀 Ready to Try Again?</h2>
        <p className="lead">
          Now that you know the trick, why stop at one? Let a date, a phone number,
          or even a phrase sing. Try any of these three viral toys:
        </p>
        <div className="cta-row">
          <Link
            href="/toys/key-clock"
            className="cta"
            aria-label="Open KeyClock Viral Toy (Date → Music)"
          >
            KeyClock (Date → Music) →
          </Link>
          <Link
            href="/toys/tone-dial"
            className="ghost"
            aria-label="Open ToneDial Viral Toy (Phone → Music)"
          >
            ToneDial (Phone → Music) →
          </Link>
          <Link
            href="/toys/text-to-tone"
            className="ghost"
            aria-label="Open TextToTone Viral Toy (Text → Music)"
          >
            TextToTone (Text → Music) →
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
          <Link href="/toys/text-to-tone" className="cta" aria-label="Open Viral Toy">
            Make a New Clip →
          </Link>
        </div>
      </section>
    </main>
  );
}