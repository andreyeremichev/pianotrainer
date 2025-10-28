import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Ear Trainers • PianoTrainer",
  description: "Train your ear with degrees, intervals, and simple listening games.",
  alternates: { canonical: "/train/ear" },
  openGraph: {
    type: "website",
    url: "https://pianotrainer.app/train/ear",
    title: "Ear Trainers • PianoTrainer",
    description: "Degrees, intervals, and listening games for quick practice.",
  },
  robots: { index: true, follow: true },
};

export default function EarHub() {
  return (
    <main style={{ maxWidth: 980, margin: "0 auto", padding: 16 }}>
      {/* SEO: JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebPage",
            name: "Ear Trainers",
            url: "https://pianotrainer.app/train/ear",
            description: "Train your ear with degrees and intervals.",
          }),
        }}
      />
      <h1>Ear Trainers</h1>
      <p>Choose a drill to sharpen your listening and recognition skills.</p>

      <div
        style={{
          display: "grid",
          gap: 12,
          gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))",
          marginTop: 16,
        }}
      >
        <a href="/train/ear/degrees" style={card}>Degrees →</a>
        <a href="/train/ear/intervals" style={card}>Intervals →</a>
        <a href="/train/ear/progressions" style={card}>Progressions →</a>
        <a href="/train/ear/circle-of-fifths" style={card}>Circle of Fifths →</a>
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
