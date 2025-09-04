// app/learn/how-to-read-music/page.tsx
import Link from "next/link";

export const metadata = {
  title: "How to Read Music • PianoTrainer",
  description:
    "A minimal, guide-note approach to reading music. Learn the 10 anchors (Middle C, inner Cs, Towering F, Ground G, High C, Low C) and read everything by steps and skips.",
};

export default function HowToReadMusicPage() {
  return (
    <main aria-labelledby="learn-title" style={sx.page}>
      {/* Header (visible) */}
      <header style={sx.header}>
        <div style={sx.headerInner}>
          <h1 id="learn-title" style={sx.h1}>How to Read Music</h1>
          <p style={sx.p}>
            Music is written on a stave — five lines and four spaces. Pianists read two staves together:
            <strong> Treble Clef (G Clef)</strong> for the right hand and
            <strong> Bass Clef (F Clef)</strong> for the left hand. Instead of memorizing every note,
            start with <strong>10 guide notes</strong> that anchor everything else. We will dive deeper into how to find these Guide notes in this section. Please, read it, it will help.
          </p>

          <div style={sx.actions}>
            <Link href="/learn" aria-label="Back to Learn Hub" style={sx.btn}>
              ← Learn Hub
            </Link>
            
          </div>
        </div>
      </header>

      {/* SECTION 1: Intro Diagram (placeholder) */}
      <section aria-labelledby="intro-clefs" style={sx.section}>
        <h2 id="intro-clefs" style={sx.h2}>The Grand Stave (Grand Staff)</h2>
        <p style={sx.p}>
          The Grand Stave joins Treble and Bass with a brace. Here are all ten Guide notes. You’ll use them to find
          everything quickly. To make it easier we will take baby steps and walk from G and F to others.
        </p>
       <img
  src="/images/learn/how-to-read-music/01-grand-stave-all-guide-notes.svg"
  alt="Diagram"
  style={{ width: "100%", height: "auto", display: "block" }}
/>
      </section>

{/* SECTION 2: G4 F3 */}
      <section aria-labelledby="G & F aligned to keyboard" style={sx.section}>
        <h2 id="G on G Clef and F on F CLef" style={sx.h2}>G on G-Clef and F on F-CLef</h2>
        <p style={sx.p}>
          Earlier we mentioned Treble and Bass Clef staves. If you look closer at the Treble Clef stave (on top) you can see that the swirl on the lower part of the Treble Clef looks kind of like  <strong>G</strong>.The second line up in the top stave runs straight through the center of this <strong>G</strong> shape. Any notes on this line are G - highlighted on keyboard. And the Bass Clef with two dots above and below the line kind of resembles <strong>F</strong>. Any notes on this line are <strong>F</strong>s, see it highlighted on keyboard. 
        
        </p>
        <figure aria-label="G & F aligned to keyboard" style={sx.figure}>
          {
         <img
  src="/images/learn/how-to-read-music/02-g4-f3-combined.svg"
  alt="Diagram"
  style={{ width: "100%", height: "auto", display: "block" }}
/>
          }
          <figcaption style={sx.figcaption}>G and F are the first Guide notes to remember. You can locate them on the piano by putting both thumbs on the Middle C (C4) and placing each finger onto a white key without missing any. Your 5th fingers will land on them.</figcaption>
        </figure>
      </section>
      {/* SECTION 3: Middle C (placeholder – keep if you are not ready to show 02 yet)
          If you already have 02, replace the div with the img below */}
      <section aria-labelledby="middle-c" style={sx.section}>
        <h2 id="middle-c" style={sx.h2}>Middle C</h2>
        <p style={sx.p}>
          The most important guide note is <strong>Middle C</strong>. On the Treble stave it’s one
          ledger line below; on the Bass stave it’s one ledger line above. On the piano it’s the
          same key — the bridge between both hands.
        </p>
        <figure aria-label="Middle C on both staves aligned to keyboard" style={sx.figure}>
          {
         <img
  src="/images/learn/how-to-read-music/03-middle-c-combined.svg"
  alt="Diagram"
  style={{ width: "100%", height: "auto", display: "block" }}
/>
          }
          <figcaption style={sx.figcaption}>Middle C connects both staves and the same piano key. When the Middle C (C4) is to be played in the right hand, it is shown just below the G Clef here, on it’s own ledger line. And when the Middle C is to be played in the left hand, it is shown just above the F CLef on it’s own ledger line.</figcaption>
        </figure>
      </section>



      {/* SECTION 4: C in Each Clef → show your C5/C3 combined SVG */}
      <section aria-labelledby="c-in-clefs" style={sx.section}>
        <h2 id="c-in-clefs" style={sx.h2}>C in Each Clef</h2>
        <p style={sx.p}>
          Inside each stave there’s another C: Treble <em>2nd space down from the top</em>, Bass{" "}
          <em>2nd space up from the bottom</em>. They are symmetrical. These give a natural hand position across the keyboard.
        </p>
        <figure aria-label="C5 (Treble) and C3 (Bass) aligned to keyboard" style={sx.figure}>
          <img
  src="/images/learn/how-to-read-music/04-c3-c5-combined.svg"
  alt="Diagram"
  style={{ width: "100%", height: "auto", display: "block" }}
/>
          <figcaption style={sx.figcaption}>C5 (Treble) and C3 (Bass) aligned to the keyboard. If you place right hand thumb on G4 (where G Clef) and all fingers on white notes to the right without missing any your 4th finger will land on C5. Do the same with your left hand: place your left hand thumb on F3 (F Clef) and all your fingers to the left on each white key, your 4th finger will land on C3.</figcaption>
        </figure>
      </section>

      {/* SECTION 5: Top F & Bottom G → show your F5/G2 combined SVG */}
      <section aria-labelledby="f-and-g" style={sx.section}>
        <h2 id="f-and-g" style={sx.h2}>Top F &amp; Bottom G</h2>
        <p style={sx.p}>
          The next two Guide notes are the line at the top of th G Clef, and the line at the bottom of the F CLef.
These notes represent the F on TOP ot the G Clef, and G on the BOTTOM of the F Clef: the <strong>top line F</strong> in Treble (the “Top F”) and
          the <strong>bottom line G</strong> in Bass (the “Bottom G”).
        </p>
        <figure aria-label="F5 (treble) and G2 (bass) aligned to keyboard" style={sx.figure}>
           <img
  src="/images/learn/how-to-read-music/05-g2-f5-combined.svg"
  alt="Diagram"
  style={{ width: "100%", height: "auto", display: "block" }}
/>
          <figcaption style={sx.figcaption}>You can locate the correct F key in your right hand placing the thumb on the “C in the G Clef” and all fingers on white keys, the 4th finger will land on F.
Do the same with your left hand: place the thumb on “C in the F Clef” and all fingers to the left on white keys, the 4th finger will land on G.</figcaption>
        </figure>
      </section>

      {/* SECTION 6: High C & Low C → show your C6/C2 combined SVG */}
      <section aria-labelledby="high-low-c" style={sx.section}>
        <h2 id="high-low-c" style={sx.h2}>High C &amp; Low C</h2>
        <p style={sx.p}>
          The outer anchors are <strong>High C</strong> (two ledger lines above Treble) and{" "}
          <strong>Low C</strong> (two ledger lines below Bass). Together with Middle C, they span
          your reading range.
        </p>
        <figure aria-label="C6 (treble) and C2 (bass) aligned to keyboard" style={sx.figure}>
          <img
  src="/images/learn/how-to-read-music/06-c2-c6-combined.svg"
  alt="Diagram"
  style={{ width: "100%", height: "auto", display: "block" }}
/>
          <figcaption style={sx.figcaption}>You can locate the correct C up key in your right hand placing the thumb on the “Top F” and all fingers on white keys, the 5th finger will land on Top C.
Do the same with your left hand: place the thumb on “Bottom G” and all fingers to the left on white keys, the 5th finger will land on Bottom C.</figcaption>
        </figure>
      </section>

      {/* SECTION 6: Summary (placeholder) */}
      <section aria-labelledby="summary" style={sx.section}>
        <h2 id="summary" style={sx.h2}>Guide Notes Summary</h2>
        <p style={sx.p}>
          Your anchors are: <strong>Low C</strong>, <strong>Bottom G</strong>, <strong>Bass F</strong>,{" "}
          <strong>Bass C</strong>, <strong>Middle C</strong>, <strong>Treble C</strong>,<strong>Treble G</strong>,{" "}
          <strong>Top F</strong>, <strong>High C</strong>. Learn these well — every other note
          is just a step (next white key) or a skip (jump one) away. Tip. You don't need to know the name of the note to play it. Just count steps or skips from the nearest Guide note and press the correct key.
        </p>
        <img
  src="/images/learn/how-to-read-music/01-grand-stave-all-guide-notes.svg"
  alt="Diagram"
  style={{ width: "100%", height: "auto", display: "block" }}
/>
      </section>

      {/* SECTION 7: Practice (placeholder) */}
      <section aria-labelledby="practice" style={sx.section}>
        <h2 id="practice" style={sx.h2}>Time to Practice finding Guide notes on the keyboard</h2>
        <ol style={sx.ol}>
          <li>Find the closest guide note.</li>
          <li>Count steps or skips up/down.</li>
          <li>Play the matching key.</li>
           
           
        </ol>
         <Link href="/trainer/notation/random-notes" aria-label="Random-notes" style={sx.btn}>
              ← Random notes, Choose Guide Notes in the right box
            </Link>
           <p style={sx.p}>
            <li>Start with Guide Notes, then choose any mode you wish in the right box.</li>
            <li>One session - 25 notes - per day is enough.</li>
            <li>Aim for one session each day.</li>
           <li>Happy practicing!</li>
           </p>
           
      </section>

{/* SECTION 8: Sharps & Flats (placeholder) */}
      <section aria-labelledby="accidentals" style={sx.section}>
        <h2 id="accidentals" style={sx.h2}>Sharps &amp; Flats (Quick Recap)</h2>
        <p style={sx.p}>
          A <strong>sharp (♯)</strong> raises a note one half step (to the right). A{" "}
          <strong>flat (♭)</strong> lowers a note one half step (to the left). Play any white key and then any black key to the left - see flat; play white key then any black key to the right - see sharp.
        </p>
       <Link href="/trainer/notation/keys-to-notes" aria-label="keys-to-notes" style={sx.btn}>
              ← Play Keys and see notes, including (♯) and (♭). 
            </Link>
            <p style={sx.p}>
It's easier then you may think.
            </p>
      </section>

      {/* Footer (visible) */}
      <footer style={sx.footer}>
        <div style={sx.footerInner}>
      
        </div>
      </footer>
    </main>
  );
}

const sx: Record<string, React.CSSProperties> = {
  page: { maxWidth: 980, margin: "0 auto", padding: "16px 20px 40px" },
  header: { background: "#f8fafc", border: "1px solid #e5e7eb", borderRadius: 12, padding: 16, marginBottom: 20 },
  headerInner: { maxWidth: 920, margin: "0 auto" },
  h1: { margin: "0 0 8px", fontSize: 32, lineHeight: 1.2 },
  h2: { margin: "24px 0 8px", fontSize: 22, lineHeight: 1.3 },

  // ⬇️ Justified paragraphs (with soft hyphenation)
  p: {
    margin: "8px 0 12px",
    fontSize: 16,
    lineHeight: 1.6,
    textAlign: "justify",
    hyphens: "auto",
    WebkitHyphens: "auto",
    msHyphens: "auto",
  },

  actions: { display: "flex", gap: 12, flexWrap: "wrap" },
  btn: { border: "1px solid #d1d5db", padding: "8px 12px", borderRadius: 10, textDecoration: "none", color: "#111827", background: "#fff" },
  section: { marginBottom: 10 },
  diagram: {
    width: "100%", aspectRatio: "16 / 9", border: "1px dashed #c9c9c9", borderRadius: 12,
    background: "repeating-linear-gradient(0deg, transparent 0 10px, #fafafa 10px 20px), #fff",
  },
  img: { width: "100%", height: "auto", display: "block" },
  figure: { margin: "16px 0 28px" },

  // ⬇️ Justify captions too (optional—remove if you prefer centered)
  figcaption: {
    fontSize: 14,
    color: "#666",
    marginTop: 8,
    textAlign: "justify",
    hyphens: "auto",
    WebkitHyphens: "auto",
    msHyphens: "auto",
  },

  // ⬇️ Justify list text (list items inherit)
  ol: {
    margin: "8px 0 12px",
    paddingLeft: 24,
    textAlign: "justify",
    hyphens: "auto",
    WebkitHyphens: "auto",
    msHyphens: "auto",
  },

  footer: { marginTop: 32, background: "#f8fafc", borderTop: "1px solid #e5e7eb", padding: "16px 0", borderRadius: 12 },
  footerInner: { maxWidth: 920, margin: "0 auto", padding: "0 8px" },
  footerLink: { color: "#1d4ed8", textDecoration: "underline" },
};
