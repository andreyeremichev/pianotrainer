

import Link from "next/link";

export const metadata = {
  title: "Turn the Stave into Sound • PianoTrainer",
  description:
    "Learn to read music by sound, not just sight. Discover the guide notes that anchor the stave and turn written lines into real music under your fingers.",
};

export default function HowToReadMusicPage() {
  return (
    <main className="read-page" aria-labelledby="learn-title">
      <style>{`
        .read-page {
          max-width: 980px;
          margin: 0 auto;
          padding: 16px 20px 40px;
          color: #111;
        }

        /* Poster-ish header */
        .hdr {
          background: #f8fafc;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          padding: 16px;
          margin-bottom: 20px;
        }
        .h1 {
          margin: 0 0 6px;
          font-size: 32px;
          line-height: 1.2;
          letter-spacing: .2px;
        }
        .lead {
          margin: 6px 0 12px;
          font-size: 16px;
          line-height: 1.6;
        }
        .actions {
          display: flex; gap: 12px; flex-wrap: wrap;
        }
        .cta {
          display: inline-flex; align-items: center; justify-content: center; gap: 8px;
          font-weight: 800; text-decoration: none; color: #111;
          background: #EBCF7A; border-radius: 8px; padding: 10px 14px;
          transition: filter .15s ease, transform .15s ease;
        }
        .cta:hover { filter: brightness(1.05); transform: translateY(-1px); }
        .ghost {
          text-decoration: underline; color: #111; background: transparent; padding: 0;
        }
        .back {
          border: 1px solid #d1d5db; padding: 8px 12px; border-radius: 10px;
          text-decoration: none; color: #111827; background: #fff;
        }

        .section { margin: 16px 0 20px; }
        .h2 { margin: 20px 0 8px; font-size: 22px; line-height: 1.3; }

        .p {
          margin: 8px 0 12px;
          font-size: 16px;
          line-height: 1.6;
          text-align: justify;
          hyphens: auto;
        }
        .figure { margin: 16px 0 28px; }
        .img { width: 100%; height: auto; display: block; }
        .figcaption {
          font-size: 14px; color: #666; margin-top: 8px;
          text-align: justify; hyphens: auto;
        }

        .ol {
          margin: 8px 0 12px; padding-left: 24px;
          text-align: justify; hyphens: auto;
        }

        .callout {
          border: 1px dashed #ccc; background: #fafafa;
          border-radius: 12px; padding: 12px; line-height: 1.55;
          margin: 12px 0;
        }
              .words-highlight {
      border: 2px solid #EBCF7A;
      background: #fffef6;
      border-radius: 14px;
      padding: 18px;
      margin: 22px 0;
      display: grid;
      gap: 10px;
    }
    .words-highlight:hover {
      box-shadow: 0 8px 22px rgba(0,0,0,.12);
      transform: translateY(-1px);
      transition: all .2s ease;
    }

    .chip-premium {
      display: inline-block;
      font-size: 13px;
      font-weight: 800;
      background: linear-gradient(90deg, #f5d66b, #f7eaa0);
      color: #111;
      border-radius: 999px;
      padding: 3px 12px;
      letter-spacing: .2px;
      box-shadow: inset 0 -1px 1px rgba(255,255,255,.5),
                  inset 0 1px 1px rgba(0,0,0,.1);
    }

    .words-title {
      margin: 0;
      font-size: 19px;
      line-height: 1.35;
      font-weight: 700;
    }

    .words-blurb {
      margin: 0;
      font-size: 15.5px;
      line-height: 1.55;
      color: #333;
    }
  `}</style>

      {/* Header */}
      <header className="hdr">
      <h1 id="learn-title" className="h1">Turn the Stave into Sound</h1>
<p className="lead">
  Music on the page is just ink until you bring it to life. The stave — five lines and four
  spaces — is your roadmap. Pianists read two of them together: <strong>Treble (G) Clef</strong>
  on top and <strong>Bass (F) Clef</strong> below. Instead of cramming every note into memory,
  you’ll learn a handful of <strong>guide notes</strong> that anchor everything else. From those
  anchors, every other note is just a <em>step</em> or a <em>skip</em> away, turning the stave
  into actual sound.
</p>

       <div className="words-highlight">
  <span className="chip chip-premium">🌟 Spotlight</span>
  <h3 className="words-title">Turn Your Words into Music</h3>
  <p className="words-blurb">
    Type any phrase and watch it come alive on the stave. Letters become notes, and you can
    hear your own words as melody. A playful, one-of-a-kind way to connect language and sound.
  </p>
  <Link href="/learn/text-to-tone-chaos" className="cta" aria-label="Open Words to Notes">
    🎹 Try Words → Notes →
  </Link>
</div>

        <div className="actions">
          <Link href="/learn" aria-label="Back to Learn Hub" className="back">← Explore other cool stuff</Link>
        </div>
      </header>

      {/* SECTION 1: Intro Diagram */}
      <section className="section" aria-labelledby="intro-clefs">
        <h2 id="intro-clefs" className="h2">The Grand Stave (Grand Staff)</h2>
        <p className="p">
          The Grand Stave joins Treble and Bass with a brace. Below are the key <strong>guide notes</strong>
          you’ll use to orient yourself quickly. We’ll start with the obvious ones and walk outward.
        </p>
        <img
          src="/images/learn/how-to-read-music/01-grand-stave-all-guide-notes.svg"
          alt="Grand stave showing all guide notes"
          className="img"
        />
      </section>

      {/* SECTION 2: G & F guide notes */}
      <section className="section" aria-labelledby="gf-guide">
        <h2 id="gf-guide" className="h2">G on G-Clef and F on F-Clef</h2>
        <p className="p">
          The Treble Clef’s swirl curls around the <strong>G line</strong> (second line from the bottom), so any
          note on that line is a G. The Bass Clef’s two dots frame the <strong>F line</strong> (second line from the top),
          so any note on that line is an F. These are the quickest “where am I?” landmarks.
        </p>
        <figure className="figure" aria-label="G and F aligned to the keyboard">
          <img
            src="/images/learn/how-to-read-music/02-g4-f3-combined.svg"
            alt="G and F guide notes aligned to the keyboard"
            className="img"
          />
          <figcaption className="figcaption">
            Place both thumbs on Middle C (C4) and rest each finger on a white key without skipping.
            Your 5th fingers will land on G (right hand) and F (left hand).
          </figcaption>
        </figure>
      </section>

      {/* SECTION 3: Middle C */}
      <section className="section" aria-labelledby="middle-c">
        <h2 id="middle-c" className="h2">Middle C</h2>
        <p className="p">
          The main anchor is <strong>Middle C</strong>. On Treble it’s one ledger line below; on Bass it’s one ledger
          line above — the same piano key. It connects both staves and both hands.
        </p>
        <figure className="figure" aria-label="Middle C on both staves aligned to keyboard">
          <img
            src="/images/learn/how-to-read-music/03-middle-c-combined.svg"
            alt="Middle C on both staves aligned to the keyboard"
            className="img"
          />
          <figcaption className="figcaption">
            Middle C is the “bridge” between the staves. Right hand = one ledger line below Treble.
            Left hand = one ledger line above Bass.
          </figcaption>
        </figure>
      </section>

      {/* SECTION 4: C in each clef */}
      <section className="section" aria-labelledby="c-in-clefs">
        <h2 id="c-in-clefs" className="h2">C in Each Clef</h2>
        <p className="p">
          Each stave has a comfy <strong>C</strong> inside: Treble’s C is the <em>second space down from the top</em>;
          Bass’s C is the <em>second space up from the bottom</em>. They’re symmetrical and give you a natural hand
          position on the keyboard.
        </p>
        <figure className="figure" aria-label="C5 (Treble) and C3 (Bass) aligned to keyboard">
          <img
            src="/images/learn/how-to-read-music/04-c3-c5-combined.svg"
            alt="C5 (Treble) and C3 (Bass) aligned to the keyboard"
            className="img"
          />
          <figcaption className="figcaption">
            Right hand: thumb on G4 (Treble G line), then place each finger on a white key to the right — your 4th finger
            lands on C5. Left hand: thumb on F3 (Bass F line), then fingers leftward — your 4th lands on C3.
          </figcaption>
        </figure>
      </section>

      {/* SECTION 5: Top F & Bottom G */}
      <section className="section" aria-labelledby="f-and-g">
        <h2 id="f-and-g" className="h2">Top F & Bottom G</h2>
        <p className="p">
          Two more anchors: the <strong>top line F</strong> on Treble and the <strong>bottom line G</strong> on Bass.
          They frame the upper and lower edges of your everyday reading range.
        </p>
        <figure className="figure" aria-label="F5 (Treble) and G2 (Bass) aligned to keyboard">
          <img
            src="/images/learn/how-to-read-music/05-g2-f5-combined.svg"
            alt="F5 (Treble) and G2 (Bass) aligned to the keyboard"
            className="img"
          />
          <figcaption className="figcaption">
            Right hand: from Treble’s inside C, your 4th finger lands on F. Left hand: from Bass’s inside C, your 4th lands on G.
          </figcaption>
        </figure>
      </section>

      {/* SECTION 6: High C & Low C */}
      <section className="section" aria-labelledby="high-low-c">
        <h2 id="high-low-c" className="h2">High C & Low C</h2>
        <p className="p">
          The outer anchors are <strong>High C</strong> (two ledger lines above Treble) and <strong>Low C</strong>
          (two ledger lines below Bass). Together with Middle C, they bracket your reading range.
        </p>
        <figure className="figure" aria-label="C6 (Treble) and C2 (Bass) aligned to keyboard">
          <img
            src="/images/learn/how-to-read-music/06-c2-c6-combined.svg"
            alt="C6 (Treble) and C2 (Bass) aligned to the keyboard"
            className="img"
          />
          <figcaption className="figcaption">
            Right hand: from Top F, your 5th finger reaches High C. Left hand: from Bottom G, your 5th reaches Low C.
          </figcaption>
        </figure>
      </section>

      {/* SECTION 7: Summary */}
      <section className="section" aria-labelledby="summary">
        <h2 id="summary" className="h2">Guide Notes Summary</h2>
        <p className="p">
          Your anchors are: <strong>Low C</strong>, <strong>Bottom G</strong>, <strong>Bass F</strong>,{" "}
          <strong>Bass C</strong>, <strong>Middle C</strong>, <strong>Treble C</strong>, <strong>Treble G</strong>,{" "}
          <strong>Top F</strong>, <strong>High C</strong>. Learn these well — every other note is just a
          <em> step</em> (next white key) or a <em>skip</em> (jump one) away. You don’t need to name every note to
          play it — count from the nearest guide note and press the key.
        </p>
        <img
          src="/images/learn/how-to-read-music/01-grand-stave-all-guide-notes.svg"
          alt="All guide notes on the grand stave"
          className="img"
        />
      </section>

      {/* SECTION 8: Practice */}
      <section className="section" aria-labelledby="practice">
        <h2 id="practice" className="h2">Practice: find guide notes on the keyboard</h2>
        <ol className="ol">
          <li>Find the closest guide note.</li>
          <li>Count steps or skips up/down.</li>
          <li>Play the matching key.</li>
        </ol>
        <div className="actions" style={{ marginTop: 8 }}>
          <Link href="/trainer/notation/random-notes" className="cta" aria-label="Open Random Notes trainer">
            🎯 Random Notes (start with Guide Notes) →
          </Link>
          <Link href="/trainer/notation/keys-to-notes" className="cta" aria-label="Open Keys to Notes trainer">
            🎹 Keys → Notes (sharps & flats too) →
          </Link>
        </div>
        <p className="p" style={{ marginTop: 8 }}>
          One short session a day (25 notes) is plenty. Start with Guide Notes mode, then branch out.
        </p>
      </section>

      {/* SECTION 9: Sharps & Flats (brief) */}
      <section className="section" aria-labelledby="accidentals">
        <h2 id="accidentals" className="h2">Sharps & Flats (Quick Intro)</h2>
        <p className="p">
          A <strong>sharp (♯)</strong> raises a note one half step (to the right). A <strong>flat (♭)</strong>{" "}
          lowers a note one half step (to the left). Play any white key, then its neighboring black key: right = sharp,
          left = flat.
        </p>
        <div className="actions">
          <Link href="/trainer/notation/keys-to-notes" className="cta" aria-label="Open Keys to Notes trainer">
            Practice accidentals →
          </Link>
        </div>
      </section>
    </main>
  );
}