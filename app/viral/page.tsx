import Link from "next/link";
import type { Metadata } from "next";

/* =========================
   Metadata
   ========================= */
export const metadata: Metadata = {
  title: "Viral Musical Toys • PianoTrainer",
  description:
    "TextToTone turns text into music (letters, numbers, memes, and symbols), plus Date → Notes and Phone → Notes. Tap, play, and make a Shorts/Reels-ready clip.",
  alternates: { canonical: "/viral" },
  openGraph: {
    type: "website",
    url: "https://pianotrainer.app/viral",
    title: "Viral Musical Toys • PianoTrainer",
    description:
      "Try TextToTone (text → music) and two quick companions: Date → Notes and Phone → Notes. Letters sing, numbers form chords, symbols add musical punctuation.",
    siteName: "PianoTrainer",
  },
  twitter: {
    card: "summary_large_image",
    title: "Viral Musical Toys • PianoTrainer",
    description:
      "TextToTone (text → music), Date → Notes, and Phone → Notes. Type, play, share.",
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

export default function ViralHubPage() {
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
      {/* Header */}
      <header style={{ maxWidth: 900, margin: "0 auto 16px", textAlign: "center" }}>
        <h1
          style={{
            margin: 0,
            fontSize: 32,
            lineHeight: 1.2,
            letterSpacing: 0.2,
          }}
        >
          Viral Musical Toys
        </h1>
        <p
          style={{
            margin: "8px 0 0",
            color: theme.muted,
            fontSize: 16,
            lineHeight: 1.6,
          }}
        >
          Three tiny experiments that turn everyday things into melody. Pick one,
          tap play, and you’ve got a clip ready for Reels or TikTok.
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
                href="/viral/text-to-tone"
                aria-label="Open TextToTone Viral Toy"
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

          {/* Date → Notes */}
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
              📅 Date → Notes
            </div>
            <p style={{ margin: 0, color: theme.muted, lineHeight: 1.6 }}>
              Birthdays, anniversaries — digits become notes, dashes breathe as pauses. Record a short
              Reels/TikTok clip in seconds.
            </p>
            <div>
              <Link
                href="/viral/key-clock"
                aria-label="Open Date to Notes Viral Toy"
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
                Try Date →
              </Link>
            </div>
          </article>

          {/* Phone → Notes */}
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
              📞 Phone → Notes
            </div>
            <p style={{ margin: 0, color: theme.muted, lineHeight: 1.6 }}>
              Digits groove; country codes lead. Dashes become rhythm — and you get a 10-second melody
              that’s ready to post.
            </p>
            <div>
              <Link
                href="/viral/tone-dial"
                aria-label="Open Phone Numbers Viral Toy"
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
                Try Phone →
              </Link>
            </div>
          </article>
        </section>
      </section>
    </main>
  );
}