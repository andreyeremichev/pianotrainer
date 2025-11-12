import Link from "next/link";
import type { Metadata } from "next";

/* =========================
   Metadata
   ========================= */
export const metadata: Metadata = {
  title: "Music Playground • PianoTrainer",
  description:
    "Make musical moments from whatever you type, dial, or play. Four pocket-sized tools perfect for creativity, fun, and shareable clips.",
  alternates: { canonical: "/toys" },
  openGraph: {
    type: "website",
    url: "https://pianotrainer.app/toys",
    title: "Music Playground • PianoTrainer",
    description:
      "Try TextToTone (text → music), KeyClock (dates spin through the Circle of Fifths), ToneDial (numbers dial harmony), and Shape of Harmony (chord progressions become shapes). Four pocket-sized tools for creativity, fun, and shareable clips.",
    siteName: "PianoTrainer",
    images: [
      {
        url: "https://pianotrainer.app/og/texttotone.jpg",
        width: 1200,
        height: 630,
        alt: "TextToTone • Type Anything, Hear the Music",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Music Playground • PianoTrainer",
    description:
      "Make musical moments from whatever you type, dial, or play. Four pocket-sized tools perfect for creativity, fun, and shareable clips.",
    images: ["https://pianotrainer.app/og/texttotone.jpg"],
  },
  robots: { index: true, follow: true },
};

/* =========================
   Theme
   ========================= */
const theme = {
  bg: "#0B0F14",
  card: "#111820",
  border: "#1E2935",
  text: "#E6EBF2",
  muted: "#8B94A7",
  gold: "#EBCF7A",
};

export default function ToysHubPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        background: theme.bg,
        color: theme.text,
        padding: 16,
        boxSizing: "border-box",
      }}
    >
      {/* SEO: JSON-LD for /toys hub */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebPage",
            name: "Music Playground — PianoTrainer",
            url: "https://pianotrainer.app/toys",
            description:
              "Four musical toys: TextToTone (text → music), KeyClock (dates → Circle of Fifths), ToneDial (phone → Circle of Fifths), and Shape of Harmony (chord progressions → shapes).",
          }),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "ItemList",
            name: "Music Playground — Musical Toys",
            itemListElement: [
              {
                "@type": "ListItem",
                position: 1,
                name: "TextToTone – Text → Music",
                url: "https://pianotrainer.app/toys/text-to-tone",
              },
              {
                "@type": "ListItem",
                position: 2,
                name: "KeyClock – Dates → Music (Cadences)",
                url: "https://pianotrainer.app/toys/key-clock",
              },
              {
                "@type": "ListItem",
                position: 3,
                name: "ToneDial – Phone/Text → Melody",
                url: "https://pianotrainer.app/toys/tone-dial",
              },
              {
                "@type": "ListItem",
                position: 4,
                name: "Shape of Harmony – Chords → Shapes",
                url: "https://pianotrainer.app/toys/shape-of-harmony",
              },
            ],
          }),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              {
                "@type": "ListItem",
                position: 1,
                name: "Home",
                item: "https://pianotrainer.app/",
              },
              {
                "@type": "ListItem",
                position: 2,
                name: "Toys",
                item: "https://pianotrainer.app/toys",
              },
            ],
          }),
        }}
      />

      {/* Header */}
      <header
        style={{
          maxWidth: 900,
          margin: "0 auto 16px",
          textAlign: "center",
        }}
      >
        <h1
          style={{
            margin: 0,
            fontSize: 32,
            lineHeight: 1.2,
            letterSpacing: 0.2,
          }}
        >
          Music Playground
        </h1>
        <p
          style={{
            margin: "8px 0 0",
            color: theme.muted,
            fontSize: 16,
            lineHeight: 1.6,
          }}
        >
          Four creative gadgets for making little musical moments — perfect for inspiration or short
          clips.
        </p>
      </header>

      {/* Cards grid */}
      <section
        style={{
          maxWidth: 1000,
          margin: "0 auto",
          display: "grid",
          gridTemplateColumns: "1fr",
          gap: 14,
        }}
      >
        <style>{`
          @media (min-width: 760px) {
            section[data-grid] {
              grid-template-columns: repeat(3, 1fr);
            }
          }
          .toy-card:hover {
            box-shadow: 0 6px 18px rgba(0,0,0,0.35);
            transform: translateY(-1px);
          }
        `}</style>

        <section data-grid style={{ display: "contents" }}>
          {/* TextToTone (Text → Music) */}
          <article
            className="toy-card"
            style={{
              background: theme.card,
              border: `1px solid ${theme.border}`,
              borderRadius: 16,
              padding: 14,
              display: "grid",
              gap: 10,
              transition: "box-shadow .2s ease, transform .2s ease",
            }}
          >
            <div
              style={{
                fontWeight: 800,
                fontSize: 20,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              🎹 TextToTone (Text → Music)
            </div>
            <p style={{ margin: 0, color: theme.muted, lineHeight: 1.6 }}>
              Type anything — letters, numbers, and even symbols like %, /, +, =, #, @ — and hear it
              play. Letters sing a melody, numbers form chords, and symbols add musical punctuation.
            </p>
            <div>
              <Link
                href="/toys/text-to-tone"
                aria-label="Open TextToTone Musical Toy"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 800,
                  color: "#081019",
                  background: theme.gold,
                  borderRadius: 10,
                  padding: "10px 14px",
                  textDecoration: "none",
                  border: "none",
                }}
              >
                Try TextToTone →
              </Link>
            </div>
          </article>

          {/* KeyClock (Dates → Circle of Fifths) */}
          <article
            className="toy-card"
            style={{
              background: theme.card,
              border: `1px solid ${theme.border}`,
              borderRadius: 16,
              padding: 14,
              display: "grid",
              gap: 10,
              transition: "box-shadow .2s ease, transform .2s ease",
            }}
          >
            <div
              style={{
                fontWeight: 800,
                fontSize: 20,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              🕒 KeyClock (Dates → Circle of Fifths)
            </div>
            <p style={{ margin: 0, color: theme.muted, lineHeight: 1.6 }}>
              Spin any date around the Circle of Fifths. Birthdays, anniversaries, Y2K — every day
              lands on a key and sets the vibe.
            </p>
            <div>
              <Link
                href="/toys/key-clock"
                aria-label="Open KeyClock Musical Toy"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 800,
                  color: "#081019",
                  background: theme.gold,
                  borderRadius: 10,
                  padding: "10px 14px",
                  textDecoration: "none",
                  border: "none",
                }}
              >
                Try KeyClock →
              </Link>
            </div>
          </article>

          {/* ToneDial (Phone → Circle of Fifths) */}
          <article
            className="toy-card"
            style={{
              background: theme.card,
              border: `1px solid ${theme.border}`,
              borderRadius: 16,
              padding: 14,
              display: "grid",
              gap: 10,
              transition: "box-shadow .2s ease, transform .2s ease",
            }}
          >
            <div
              style={{
                fontWeight: 800,
                fontSize: 20,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              ☎️ ToneDial (Phone → Circle of Fifths)
            </div>
            <p style={{ margin: 0, color: theme.muted, lineHeight: 1.6 }}>
              Dial harmony by number. Country codes lead, digits spin the circle — and every call has
              a tone.
            </p>
            <div>
              <Link
                href="/toys/tone-dial"
                aria-label="Open ToneDial Musical Toy"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 800,
                  color: "#081019",
                  background: theme.gold,
                  borderRadius: 10,
                  padding: "10px 14px",
                  textDecoration: "none",
                  border: "none",
                }}
              >
                Try ToneDial →
              </Link>
            </div>
          </article>

          {/* Shape of Harmony (Chords → Shapes) */}
          <article
            className="toy-card"
            style={{
              background: theme.card,
              border: `1px solid ${theme.border}`,
              borderRadius: 16,
              padding: 14,
              display: "grid",
              gap: 10,
              transition: "box-shadow .2s ease, transform .2s ease",
            }}
          >
            <div
              style={{
                fontWeight: 800,
                fontSize: 20,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              🔺 Shape of Harmony (Chords → Shapes)
            </div>
            <p style={{ margin: 0, color: theme.muted, lineHeight: 1.6 }}>
              Turn chords into motion: bright shapes bloom and shift as your progression plays. A
              little harmonic magic in visual form.
            </p>
            <div>
              <Link
                href="/toys/shape-of-harmony"
                aria-label="Open Shape of Harmony Musical Toy"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 800,
                  color: "#081019",
                  background: theme.gold,
                  borderRadius: 10,
                  padding: "10px 14px",
                  textDecoration: "none",
                  border: "none",
                }}
              >
                Try Shape of Harmony →
              </Link>
            </div>
          </article>
        </section>
      </section>
    </main>
  );
}