import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Notation Trainers • PianoTrainer",
  description: "Practice reading notes, chords, and intervals with simple visual drills.",
  alternates: { canonical: "/train/notation" },
  openGraph: {
    type: "website",
    url: "https://pianotrainer.app/train/notation",
    title: "Notation Trainers • PianoTrainer",
    description: "Learn to read music faster with interactive notation tools.",
  },
  robots: { index: true, follow: true },
};

export default function NotationHub() {
  return (
    <main style={{ maxWidth: 980, margin: "0 auto", padding: 16 }}>
      {/* SEO: JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context":"https://schema.org","@type":"WebPage",
            name:"Notation Trainers","url":"https://pianotrainer.app/train/notation",
            description:"Practice reading notes, chords, and intervals.",
          }),
        }}
      />
      <h1>Notation Trainers</h1>
      <p>Choose a drill to practice reading notes, chords, and intervals.</p>

      <div style={{display:"grid",gap:12,gridTemplateColumns:"repeat(auto-fit,minmax(260px,1fr))",marginTop:16}}>
        <a href="/train/notation/keys-to-notes" style={card}>Keys to Notes →</a>
        <a href="/train/notation/chords" style={card}>Chords →</a>
        <a href="/train/notation/intervals" style={card}>Intervals →</a>
        <a href="/train/notation/random-notes" style={card}>Random Notes →</a>
      </div>
    </main>
  );
}

const card: React.CSSProperties = {
  border: "1px solid #ddd",
  borderRadius: 12,
  padding: 14,
  textDecoration: "none",
  color: "#0b0f14",
  fontWeight: 800,
};
