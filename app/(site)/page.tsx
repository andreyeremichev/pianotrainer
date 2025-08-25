export const metadata = {
  title: "PianoTrainer — Learn Notes & Train Your Ear (Beginner Friendly)",
  description:
    "Free beginner tools to learn piano notes by notation and by ear. Start with Random Notes: read a note on a grand staff and play it on the keyboard.",
};

import Link from "next/link";
import StandardLogo from "../components/logos/StandardLogo";

export default function HomePage() {
  return (
    <main style={{ padding: "20px 16px", maxWidth: 980, margin: "0 auto" }}>
      {/* Hero */}
      <section style={{ textAlign: "center", marginBottom: 28 }}>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "14px 18px",
            borderRadius: 12,
            margin: "0 auto 12px",
          }}
        >
          <StandardLogo />
        </div>

        <p style={{ margin: "8px 0 16px 0", color: "#444" }}>
          Learn by <strong>notation</strong> and by <strong>ear</strong> — built for beginners, free forever.
        </p>

        <div style={{ display: "flex", justifyContent: "center", gap: 12 }}>
          <Link
            href="/trainer/notation/random-notes"
            style={{
              display: "inline-block",
              padding: "10px 16px",
              borderRadius: 8,
              border: "1px solid #000",
              background: "#f5f5f5",
              textDecoration: "none",
              fontWeight: 600,
            }}
          >
            ▶ Start: Random Notes
          </Link>
        </div>

        <p style={{ marginTop: 8, fontSize: 12, color: "#666" }}>
          (Grand staff • whole notes • sharps & flats • audio playback)
        </p>
      </section>

      {/* Trainers */}
      <section aria-labelledby="trainers" style={{ marginBottom: 24 }}>
        <h2 id="trainers" style={{ fontSize: 20, marginBottom: 12 }}>
          Trainers
        </h2>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: 12,
          }}
        >
          {/* Live card */}
          <article
            style={{
              border: "1px solid #ddd",
              borderRadius: 8,
              padding: 12,
              background: "#fff",
            }}
          >
            <h3 style={{ marginTop: 0, marginBottom: 6, fontSize: 18 }}>
              Random Notes (Notation)
            </h3>
            <p style={{ marginTop: 0, color: "#444" }}>
              See a note on grand staff, play it on the keyboard. Sharps, flats, treble &amp; bass.
            </p>
            <Link
              href="/trainer/notation/random-notes"
              style={{
                display: "inline-block",
                padding: "8px 12px",
                borderRadius: 6,
                border: "1px solid #000",
                textDecoration: "none",
                background: "#f5f5f5",
                fontWeight: 600,
              }}
            >
              Open Random Notes
            </Link>
          </article>

          {/* Non-clickable stubs */}
          {[
            { title: "Keys → Notes (Notation)", note: "coming soon" },
            { title: "Chords (Notation)", note: "coming soon" },
            { title: "Intervals (Notation)", note: "coming soon" },
            { title: "Circle of Fifths (Ear)", note: "coming soon" },
            { title: "Intervals (Ear)", note: "coming soon" },
            { title: "Progressions (Ear)", note: "coming soon" },
          ].map((item) => (
            <article
              key={item.title}
              aria-disabled="true"
              style={{
                border: "1px solid #eee",
                borderRadius: 8,
                padding: 12,
                background: "#fafafa",
                opacity: 0.8,
              }}
            >
              <h3 style={{ marginTop: 0, marginBottom: 6, fontSize: 18 }}>
                {item.title}
              </h3>
              <p style={{ marginTop: 0, color: "#666" }}>
                {item.note.charAt(0).toUpperCase() + item.note.slice(1)}.
              </p>
              <span
                style={{
                  display: "inline-block",
                  padding: "8px 12px",
                  borderRadius: 6,
                  border: "1px dashed #aaa",
                  color: "#666",
                  fontWeight: 600,
                }}
              >
                Coming Soon
              </span>
            </article>
          ))}
        </div>
      </section>

      {/* Learn (listed only; links will activate later) */}
      <section aria-labelledby="learn" style={{ marginBottom: 24 }}>
        <h2 id="learn" style={{ fontSize: 20, marginBottom: 12 }}>
          Learn (Guides)
        </h2>
        <ul style={{ margin: 0, paddingLeft: 18, color: "#666" }}>
          <li>How to Read Music</li>
          <li>Ear Training for Beginners</li>
          <li>Circle of Fifths Explained</li>
          <li>Intervals Guide</li>
          <li>Glossary</li>
        </ul>
        <p style={{ marginTop: 8, fontSize: 12, color: "#888" }}>
          (Links will activate as content is published.)
        </p>
      </section>

      {/* Mission */}
      <section aria-labelledby="mission">
        <h2 id="mission" style={{ fontSize: 20, marginBottom: 8 }}>
          Our Mission
        </h2>
        <p style={{ marginTop: 0, color: "#444" }}>
          Help beginners learn both by ear and by notation — completely free. We show ads only on the home
          and “Learn” pages; <strong>no ads</strong> inside training pages.
        </p>
      </section>
    </main>
  );
}