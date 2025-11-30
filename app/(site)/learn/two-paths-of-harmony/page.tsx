// app/(site)/learn/two-paths-of-harmony/page.tsx

import Link from "next/link";
import type { Metadata } from "next";
import TwoPathsEmotionCompare from "./TwoPathsEmotionCompare";

export const metadata: Metadata = {
  title: "Two Paths of Harmony – Emotional Harmony Guide • PianoTrainer",
  description:
    "Discover how harmony expresses emotion through two different kinds of movement: Path of Flow and Path of Color. Hear sadness, anger, mystery, and more along both paths.",
  alternates: { canonical: "/learn/two-paths-of-harmony" },
  openGraph: {
    type: "article",
    url: "https://pianotrainer.app/learn/two-paths-of-harmony",
    title: "Two Paths of Harmony – Emotional Harmony Guide • PianoTrainer",
    description:
      "Harmony isn’t one thing. Learn how the Path of Flow and the Path of Color give two different ways to express the same emotion.",
  },
  robots: { index: true, follow: true },
};

export default function TwoPathsPage() {
  return (
    <main className="two-paths">
      <style>{`
        .two-paths {
          max-width: 820px;
          margin: 0 auto;
          padding: 16px;
          color: #111;
          font-family: system-ui, -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", sans-serif;
        }
                  /* Fancy gradient title */
        .two-paths h1.gradient-title {
          background: linear-gradient(90deg, #e7c86e, #a687ff 40%, #5fc3ff 80%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          font-weight: 800;
        }

        /* Highlighted description paragraph */
        .two-paths .lead-colored {
          padding: 10px 12px;
          border-radius: 10px;
          background: linear-gradient(135deg, #fff7d4, #f3ecff 70%);
          border: 1px solid rgba(0,0,0,0.06);
          font-size: 16px;
        }
        .two-paths h1 {
          margin: 0 0 8px;
          font-size: 32px;
          line-height: 1.2;
          letter-spacing: .2px;
        }
        .two-paths h2 {
          margin: 26px 0 8px;
          font-size: 22px;
          line-height: 1.3;
        }
        .two-paths h3 {
          margin: 20px 0 6px;
          font-size: 18px;
          line-height: 1.4;
        }
        .two-paths p {
          margin: 6px 0 10px;
          font-size: 15px;
          line-height: 1.7;
          color: #222;
        }
        .two-paths .lead {
          margin-top: 4px;
          font-size: 16px;
        }
        .two-paths strong {
          font-weight: 700;
        }
        .two-paths em {
          font-style: italic;
        }
        .two-paths ul {
          padding-left: 20px;
          margin: 4px 0 10px;
          font-size: 15px;
          line-height: 1.7;
        }
        .two-paths li { margin: 2px 0; }

        .highlight-box {
          margin: 16px 0;
          padding: 12px 14px;
          border-radius: 10px;
          background: #faf5e5;
          border: 1px solid #ebcf7a;
          font-size: 14px;
        }

        .inline-tools {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin: 10px 0 14px;
        }
        .inline-tools a {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 8px 12px;
          border-radius: 999px;
          background: #111;
          color: #fff;
          text-decoration: none;
          font-size: 13px;
          font-weight: 700;
        }
        .inline-tools a span {
          font-size: 16px;
        }

        .table-wrapper {
          margin: 18px 0 22px;
          overflow-x: auto;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          font-size: 13px;
        }
                  /* Make the first column (emotion names) narrower */
        table th:first-child,
table td:first-child {
  width: 130px;
  max-width: 130px;
  white-space: normal;   /* allow wrapping */
  word-break: break-word; /* ensures long labels don’t spill */
}
        thead {
          background: #f7f7f7;
        }
        th, td {
          padding: 8px 10px;
          border: 1px solid #ddd;
          vertical-align: top;
          text-align: left;
        }
        th {
          font-weight: 700;
          font-size: 13px;
        }
        td code {
          font-size: 12px;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
        }

        .section-label {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 13px;
          font-weight: 800;
          letter-spacing: .2px;
          padding: 4px 10px;
          border-radius: 999px;
          background: #f1f1f1;
          color: #444;
          margin-bottom: 6px;
        }
          
                  .emotion-label {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-weight: 700;
          white-space: normal;
        }
        .emotion-emoji {
          font-size: 16px;
        }
        tbody tr:nth-child(odd) {
          background: #fafafa;
        }
        tbody tr:nth-child(even) {
          background: #fefbf4;
        }

        @media (max-width: 640px) {
          .two-paths h1 { font-size: 26px; }
          .two-paths h2 { font-size: 19px; }
        }
                  /* Mini demo layout */
        .two-paths-mini {
          margin-top: 10px;
        }
        .two-paths-mini-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
          align-items: stretch;
        }
        .two-paths-mini-card {
          border-radius: 12px;
          padding: 10px;
          background: #fffdf5;
          border: 1px solid rgba(0,0,0,0.06);
          box-shadow: 0 1px 2px rgba(0,0,0,0.03);
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .two-paths-mini-label {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 6px;
          font-size: 13px;
          font-weight: 700;
        }
                  /* Purple badge for sadness demos */
        .two-paths-mini-card .badge {
          background: linear-gradient(135deg, #c39bff 0%, #a875ff 70%);
          color: #fff;
          border: 1px solid rgba(255,255,255,0.3);
          box-shadow: 0 1px 2px rgba(0,0,0,0.1);
        }
       
        .two-paths-mini-circle {
          flex: 1;
          margin-top: 4px;
          border-radius: 999px;
          aspect-ratio: 1 / 1;
          overflow: hidden;
          position: relative;
          cursor: pointer;
          border: 1px solid rgba(0,0,0,0.06);
          padding: 0;
        }
        .two-paths-mini-circle svg {
          display: block;
        }
        .two-paths-mini-circle.flow {
          background: radial-gradient(circle at 30% 20%, #ffe9a6, #f6d35f 40%, #f2c447 65%, #f4b928 100%);
        }
        .two-paths-mini-circle.color {
          background: radial-gradient(circle at 30% 20%, #f4d6ff, #da9dff 40%, #c47eff 65%, #a85af5 100%);
        }
        .two-paths-mini-caption {
          margin-top: 4px;
          font-size: 12px;
          color: #555;
        }
        .two-paths-mini-status {
          margin-top: 8px;
          font-size: 12px;
          color: #444;
        }

        @media (max-width: 640px) {
          .two-paths-mini-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <header>
  <div className="section-label">
    <span>✨</span>
    <span>Emotional Harmony</span>
  </div>

  <h1 className="gradient-title">Two Paths of Harmony ✨</h1>

  <p className="lead lead-colored">
  Harmony isn&apos;t just “music theory” — it&apos;s a language of <strong>emotion</strong>.  
  This page shows how the same feeling (like 😢 sadness, 😡 anger, or 🕵️‍♀️ mystery) can travel along
  two different harmonic roads:&nbsp;
  <Link href="/learn/path-of-flow" style={{ fontWeight: 700, color: "#a687ff" }}>
    Path of Flow
  </Link>
  &nbsp;and&nbsp;
  <Link href="/learn/path-of-color" style={{ fontWeight: 700, color: "#5fc3ff" }}>
    Path of Color
  </Link>.
</p>
</header>

      <section>
        <p>
          You don&apos;t need scale names or heavy theory for this. The idea is simple: in harmony,{" "}
          <strong>movement</strong> creates emotion. And there are two main ways chords like to move:
        </p>
        <ul>
          <li>
            <strong>Path of Flow</strong>: smooth, song-like movement that feels familiar and stable.
          </li>
          <li>
            <strong>Path of Color</strong>: small chromatic steps and surprises that feel more intense and cinematic.
          </li>
        </ul>
        
      </section>

            {/* Mini demo */}
      <section>
        <h2>Now compare two paths side by side </h2>
      
        <div className="highlight-box">
          <p>
            <strong>Pick any emotion below</strong> 
          </p>

          <TwoPathsEmotionCompare />

          
        </div>
      </section>

      <section>
        <h2>Path of Flow vs Path of Color</h2>
        <p>
          Here&apos;s the big picture: for each emotion, there is a <strong>Flow</strong> version and a{" "}
          <strong>Color</strong> version. Flow uses more stable, directional progressions. Color uses smaller
          chromatic steps and more tension.
        </p>
       
      </section>

      <section>
        <h2>Emotion Map — Flow &amp; Color side by side</h2>

        <div className="table-wrapper">
  <table>
    <thead>
      <tr>
        <th>Emotion</th>
        <th>Path of Flow (degrees → C example)</th>
        <th>Path of Color (local steps → C example)</th>
        <th>⭐ Pure Chromatic Chords<br/><span style={{ fontWeight: 400 }}>(Color highlights)</span></th>
      </tr>
    </thead>

    <tbody>
      {/* SADNESS */}
      <tr>
        <td>
          <span className="emotion-label">
            <span className="emotion-emoji">😢</span>
            <span>Sadness</span>
          </span>
        </td>
        <td>
          <code>1, 6b, 3b, 7b</code><br/>
          <span>C minor example: </span><code>Cm → Ab → Eb → Bb</code>
        </td>
        <td>
          <code>m → M(–4) → m(–3) → m(–1)</code><br/>
          <span>C example: </span><code>Cm → Ab → Fm → Em</code>
        </td>
        <td>
          <code>Em</code><br/>
          <span>foreign major third (G♯) relative to Cm, tragic “lift then drop.”</span>
        </td>
      </tr>

      {/* ANGER */}
      <tr>
        <td>
          <span className="emotion-label">
            <span className="emotion-emoji">😡</span>
            <span>Anger</span>
          </span>
        </td>
        <td>
          <code>1, 4, 2b, 5</code><br/>
          <span>C minor example: </span><code>Cm → Fm → Db → G</code>
        </td>
        <td>
          <code>m → m(+1) → dim(+3) → M(+2)</code><br/>
          <span>C example: </span><code>Cm → C#m → E° → F#</code>
        </td>
        <td>
          <code>C#m, E°</code><br/>
          <span>This entire progression is chromatic except the starting Cm</span>
        </td>
      </tr>

      {/* FEAR */}
      <tr>
        <td>
          <span className="emotion-label">
            <span className="emotion-emoji">😱</span>
            <span>Fear / Horror</span>
          </span>
        </td>
        <td>
          <code>1, 2b, 5, 1</code><br/>
          <span>C minor example: </span><code>Cm → Db → G → Cm</code>
        </td>
        <td>
          <code>m → dim(+6) → M(+1) → dim(+3)</code><br/>
          <span>C example: </span><code>Cm → F#° → G → A#°</code>
        </td>
        <td>
          <code>F#°, A#°</code><br/>
          <span>C → F#° (tritone), G → A#° (chromatic +3)</span>
        </td>
      </tr>

      {/* MYSTERY */}
      <tr>
        <td>
          <span className="emotion-label">
            <span className="emotion-emoji">🕵️‍♀️</span>
            <span>Mystery</span>
          </span>
        </td>
        <td>
          <code>1, 4, 7b, 1</code><br/>
          <span>C minor example: </span><code>Cm → Fm → Bb → Cm</code>
        </td>
        <td>
          <code>m → M(+2) → dim(+3) → M(+1)</code><br/>
          <span>C example: </span><code>Cm → D → F° → F#</code>
        </td>
        <td>
          <code>F°</code><br/>
          <span>the chromatic “fog chord.”</span>
        </td>
      </tr>

      {/* MELANCHOLY */}
      <tr>
        <td>
          <span className="emotion-label">
            <span className="emotion-emoji">🌧️</span>
            <span>Melancholy</span>
          </span>
        </td>
        <td>
          <code>6b, 4, 1, 5</code><br/>
          <span>C minor example: </span><code>Ab → Fm → Cm → G</code>
        </td>
        <td>
          <code>m → M(–3) → m(+4) → M(–3)</code><br/>
          <span>C example: </span><code>Cm → A → C#m → A#</code>
        </td>
        <td>
          <code>A</code><br/>
          <span>the main melancholy trigger (bright but off-key)</span>
        </td>
      </tr>

      {/* CALM */}
      <tr>
        <td>
          <span className="emotion-label">
            <span className="emotion-emoji">🌿</span>
            <span>Calm / Peace</span>
          </span>
        </td>
        <td>
          <code>1, 5, 6, 4</code><br/>
          <span>B♭ major example: </span><code>Bb → F → Gm → Eb</code>
        </td>
        <td>
          <code>M → M(+2) → M(+3) → M(–2)</code><br/>
          <span>C example: </span><code>C → D → F → Eb</code>
        </td>
        <td>
          <code>Eb</code><br/>
          <span>gives a gentle pastel color</span>
        </td>
      </tr>

      {/* PLAYFUL */}
      <tr>
        <td>
          <span className="emotion-label">
            <span className="emotion-emoji">🎈</span>
            <span>Playful</span>
          </span>
        </td>
        <td>
          <code>1, 2, 5, 1</code><br/>
          <span>B♭ major example: </span><code>Bb → Cm → F → Bb</code>
        </td>
        <td>
          <code>M → M(+3) → M(+3) → M(+2)</code><br/>
          <span>C example: </span><code>C → Eb → F# → G#</code>
        </td>
        <td>
          <code>F#</code><br/>
          <span>“jump up” effect Eb → F#</span>
        </td>
      </tr>

      {/* MAGIC */}
      <tr>
        <td>
          <span className="emotion-label">
            <span className="emotion-emoji">✨</span>
            <span>Magic / Fantasy</span>
          </span>
        </td>
        <td>
          <code>4, 1, 5, 6</code><br/>
          <span>B♭ major example: </span><code>Eb → Bb → F → Gm</code>
        </td>
        <td>
          <code>M → M(+8) → M(–4) → M(+3)</code><br/>
          <span>C example: </span><code>C → Ab → E → G</code>
        </td>
        <td>
          <code>E</code><br/>
          <span>is the brightest chromatic moment</span>
        </td>
      </tr>

      {/* WONDER */}
      <tr>
        <td>
          <span className="emotion-label">
            <span className="emotion-emoji">🌌</span>
            <span>Wonder</span>
          </span>
        </td>
        <td>
          <code>1, 6b, 3b, 4</code><br/>
          <span>C minor example: </span><code>Cm → Ab → Eb → F</code>
        </td>
        <td>
          <code>m → M(+5) → M(+2) → M(+4)</code><br/>
          <span>C example: </span><code>Cm → F → G → B</code>
        </td>
        <td>
          <code>B</code><br/>
          <span>a “halo chord” that creates shimmer</span>
        </td>
      </tr>

      {/* TENSION */}
      <tr>
        <td>
          <span className="emotion-label">
            <span className="emotion-emoji">😬</span>
            <span>Tension / Suspense</span>
          </span>
        </td>
        <td>
          <code>1, 2, 5, 1</code><br/>
          <span>C minor example: </span><code>Cm → D° → G → Cm</code>
        </td>
        <td>
          <code>M → m(+1) → dim(+3) → M(+2)</code><br/>
          <span>C example: </span><code>C → C#m → E° → F#</code>
        </td>
        <td>
          <code>E°</code><br/>
          <span>C# → E° (collapse)</span>
        </td>
      </tr>
    </tbody>
  </table>
</div>

        <p>
          You don&apos;t need to memorize the numbers or formulas. What matters is that you can{" "}
          <strong>hear</strong> the difference: Flow tends to move in broader, familiar arcs. Color tends to move
          in tighter, more surprising steps.
        </p>
      </section>

      <section>
        <h2>Flow: the smooth, familiar path</h2>
        <p>
          <strong>Path of Flow</strong> is the gentle storyteller of harmony. It connects chords in a way that feels
          natural to the ear: like a song, or a story that knows where it&apos;s going.
        </p>
        <p>
          You&apos;ll hear Flow in classic progressions, calm endings, and that kind of sadness that feels like looking
          back at an old photograph. It&apos;s not trying to shock you — it&apos;s trying to carry you.
        </p>

        <div className="highlight-box">
          <p>
            <strong>Interactive idea:</strong> try the same emotion in Path of Flow and see how the circle traces a smooth
            curve around the ring.
          </p>
          <div className="inline-tools">
            <Link href="/learn/path-of-flow">
              <span>🟡</span>
              <span>Open Path of Flow</span>
            </Link>
          </div>
        </div>
      </section>

      <section>
        <h2>Color: the surprising, expressive path</h2>
        <p>
          <strong>Path of Color</strong> takes a different route. Instead of sliding smoothly, it likes to lean on
          chromatic steps: moving a chord up by a semitone, dropping down a third into a new color, or snapping into
          a diminished shape.
        </p>
        <p>
          That&apos;s why Color often feels more intense. Anger feels sharper. Fear feels closer. Wonder feels brighter.
          The circle doesn&apos;t just rotate — it jumps, twists, and paints with tension.
        </p>

        <div className="highlight-box">
          <p>
            <strong>Interactive idea:</strong> open Path of Color, pick an emotion like anger or mystery, and watch how
            small steps create big feelings.
          </p>
          <div className="inline-tools">
            <Link href="/learn/path-of-color">
              <span>🟣</span>
              <span>Open Path of Color</span>
            </Link>
          </div>
        </div>
      </section>

      <section>
        <h2>🎹✨ Now use both on your piano</h2>
        <p>
          Speak this harmonic language with your keys.
        </p>
        <p>
          Combine <strong>Flow</strong> and <strong>Color</strong> in one progression:
        </p>
        <ul>
          <li>create gentle feelings with Flow,</li>
          <li>deepen or sharpen that emotion with chromatic movement,</li>
          <li>experiment with different keys and/or starting chords</li>
        </ul>
       
      </section>

      <section>
         <h2>Or explore the tools 🎧</h2>
      

                <div className="highlight-box">
          
          <ul>
            <li>
              <strong>Path of Flow</strong> – smooth, song-like harmony that teaches you how chords naturally travel.
            </li>
            <li>
              <strong>Path of Color</strong> – expressive chromatic harmony that shows how tiny steps change the feeling.
            </li>
          </ul>
          <div className="inline-tools">
            <Link href="/learn/path-of-flow">
              <span>🟡</span>
              <span>Open Path of Flow</span>
            </Link>
            <Link href="/learn/path-of-color">
              <span>🟣</span>
              <span>Open Path of Color</span>
            </Link>
          </div>
        </div>
      </section>

      
    </main>
  );
}