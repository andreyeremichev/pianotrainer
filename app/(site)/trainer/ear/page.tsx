// app/trainer/ear/page.tsx

export const metadata = {
  title: "Ear Trainer Hub • PianoTrainer",
  description:
    "Develop your ear with beginner-friendly tools: degrees (piano-only), circle of fifths drone, interval recognition, and simple progressions. Free and browser-based.",
};

import Link from "next/link";

export default function EarTrainerHubPage() {
  return (
    <main className="page" aria-labelledby="ear-hub-title">
      <header className="header">
        <h1 id="ear-hub-title">Ear Trainer</h1>
        <p>
          Build reliable pitch and key-center awareness with simple, focused tools:
          <strong> Degrees (piano-only)</strong>, a circle-of-fifths drone, interval tests, and musical progressions.
        </p>
      </header>

      <section aria-label="Ear training modes">
        <ul
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: "12px",
            listStyle: "none",
            padding: 0,
            margin: 0,
          }}
        >
          {/* NEW: Degrees */}
          <li>
            <a
              href="/trainer/ear/degrees"
              className="card"
              style={{
                display: "block",
                border: "1px solid #ccc",
                borderRadius: 8,
                padding: 12,
                textDecoration: "none",
              }}
            >
              <div aria-hidden="true" style={{ fontSize: 22, marginBottom: 6 }}>🎹</div>
              <h2 style={{ margin: "0 0 6px", display: "flex", alignItems: "center", gap: 6 }}>
                Degrees (Piano-Only)
                <span
                  style={{
                    fontSize: 11,
                    padding: "2px 6px",
                    borderRadius: 12,
                    background: "#e9fbe9",
                    border: "1px solid #b2f2bb",
                    color: "#2f9e44",
                    fontWeight: 600,
                  }}
                >
                  New
                </span>
              </h2>
              <p style={{ margin: 0 }}>
                Hear a short context, then identify scale degrees by ear. Type your answer and check;
                after that, see an animated replay to lock it in.
              </p>
            </a>
          </li>

          {/* Soon: Circle of Fifths (Drone) */}
          <li>
            <a
              href="/trainer/ear/circle-of-fifths"
              className="card"
              style={{
                display: "block",
                border: "1px solid #ccc",
                borderRadius: 8,
                padding: 12,
                textDecoration: "none",
              }}
            >
              <div aria-hidden="true" style={{ fontSize: 22, marginBottom: 6 }}>🧭🎵</div>
              <h2 style={{ margin: "0 0 6px", display: "flex", alignItems: "center", gap: 6 }}>
                Circle of Fifths (Drone)
                <span
                  style={{
                    fontSize: 11,
                    padding: "2px 6px",
                    borderRadius: 12,
                    background: "#fff7d1",
                    border: "1px solid #ffe066",
                    color: "#8d6e00",
                    fontWeight: 600,
                  }}
                >
                  Soon
                </span>
              </h2>
              <p style={{ margin: 0 }}>
                Hear each key center with a steady drone. Train your sense of tonality,
                then take a quick key-identification test.
              </p>
            </a>
          </li>

          {/* NEW: Intervals */}
          <li>
            <a
              href="/trainer/ear/intervals"
              className="card"
              style={{
                display: "block",
                border: "1px solid #ccc",
                borderRadius: 8,
                padding: 12,
                textDecoration: "none",
              }}
            >
              <div aria-hidden="true" style={{ fontSize: 22, marginBottom: 6 }}>👂🔔</div>
              <h2 style={{ margin: "0 0 6px", display: "flex", alignItems: "center", gap: 6 }}>
                Intervals Test
                <span
                  style={{
                    fontSize: 11,
                    padding: "2px 6px",
                    borderRadius: 12,
                    background: "#e9fbe9",
                    border: "1px solid #b2f2bb",
                    color: "#2f9e44",
                    fontWeight: 600,
                  }}
                >
                  New
                </span>
              </h2>
              <p style={{ margin: 0 }}>
                Identify intervals by ear with instant feedback. Start with seconds and thirds,
                then climb to fifths and octaves.
              </p>
            </a>
          </li>

          {/* Soon: Progressions */}
          <li>
            <a
              href="/trainer/ear/progressions"
              className="card"
              style={{
                display: "block",
                border: "1px solid #ccc",
                borderRadius: 8,
                padding: 12,
                textDecoration: "none",
              }}
            >
              <div aria-hidden="true" style={{ fontSize: 22, marginBottom: 6 }}>🎼➡️</div>
              <h2 style={{ margin: "0 0 6px", display: "flex", alignItems: "center", gap: 6 }}>
                Progressions
                <span
                  style={{
                    fontSize: 11,
                    padding: "2px 6px",
                    borderRadius: 12,
                    background: "#fff7d1",
                    border: "1px solid #ffe066",
                    color: "#8d6e00",
                    fontWeight: 600,
                  }}
                >
                  Soon
                </span>
              </h2>
              <p style={{ margin: 0 }}>
                Train with short, musical note patterns. Lock in common motion and
                prepare your ear for real pieces.
              </p>
            </a>
          </li>
        </ul>
      </section>

      <section aria-label="Tips" style={{ marginTop: 16 }}>
        <h2 style={{ marginTop: 0 }}>Quick tips for better results</h2>
        <ul>
          <li>Use headphones to hear tuning and interval quality clearly.</li>
          <li>Start with a single key (C or G) and a small set of degrees/intervals.</li>
          <li>Alternate between hearing (ear tools) and seeing (notation trainers) to strengthen both pathways.</li>
          <li>Repeat short sessions daily (5–10 minutes) for steady gains.</li>
        </ul>
      </section>

      {/* Structured data stays unchanged */}
      {/* … */}
    </main>
  );
}
