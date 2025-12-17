// app/(site)/about/page.tsx
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About • PianoTrainer",
  description:
    "PianoTrainer is a free collection of beginner-friendly piano trainers for learning to read music and train the ear through clear, visual, interactive practice.",
};

export default function AboutPage() {
  return (
    <main className="page" style={{ maxWidth: 900, margin: "0 auto", padding: 16 }}>
      <h1>About PianoTrainer</h1>

      <p>
        PianoTrainer is a free, browser-based collection of interactive piano
        trainers designed to help beginners build two essential skills:
        <strong> reading music</strong> and <strong>training the ear</strong>.
      </p>

      <p>
        Instead of long explanations or dense theory, PianoTrainer focuses on
        direct practice — pressing keys, seeing notes on the stave, and learning
        to recognize sounds by ear.
      </p>

      <section aria-label="Mission">
        <h2>Our Mission</h2>
        <p>
          Many piano learners struggle not because they lack motivation, but
          because traditional materials feel abstract or overwhelming.
          PianoTrainer exists to make early piano learning clearer, calmer, and
          more visual.
        </p>
        <p>
          Each trainer is designed to connect what you <em>play</em> on the
          keyboard with what you <em>see</em> on the stave and what you
          <em> hear</em> in sound — step by step.
        </p>
      </section>

      <section aria-label="What You Will Practice">
        <h2>What You’ll Practice</h2>
        <ul>
          <li>🎼 Reading notes on the grand stave</li>
          <li>🎹 Connecting piano keys to notation</li>
          <li>👂 Training the ear to recognize intervals and scale degrees</li>
          <li>🔁 Short, focused drills with instant feedback</li>
        </ul>
      </section>

      <section aria-label="Who It Is For">
        <h2>Who PianoTrainer Is For</h2>
        <p>
          PianoTrainer is built for beginners and early learners who want to
          understand what they are playing — not just memorize patterns.
        </p>
        <p>
          It is also useful for self-taught musicians and teachers looking for
          simple, interactive practice tools that work on desktop, tablet, or
          mobile without installation.
        </p>
      </section>

      <section aria-label="Get Started">
        <h2>Get Started</h2>
        <p>
          You can begin with any trainer, but many learners start with:
        </p>
        <ul>
          <li>
            <a href="/train/notation/keys-to-notes">
              Keys → Notes
            </a>{" "}
            to connect the keyboard with the stave
          </li>
          <li>
            <a href="/train/ear/degrees">
              Degrees Trainer
            </a>{" "}
            to begin ear training gently
          </li>
        </ul>
      </section>

      <section aria-label="About Summary">
        <p style={{ marginTop: 24, color: "#555", fontSize: 14 }}>
          PianoTrainer is a free, browser-based collection of piano practice
          tools focused on notation reading and ear training. It helps beginners
          build confidence through clear visuals, interactive sound, and
          focused exercises — without downloads or subscriptions.
        </p>
      </section>

      {/* Structured data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            {
              "@context": "https://schema.org",
              "@type": "AboutPage",
              "@id": "https://pianotrainer.app/about",
              url: "https://pianotrainer.app/about",
              name: "About PianoTrainer",
              description:
                "PianoTrainer is a free collection of beginner-friendly piano trainers for learning to read music and train the ear through clear, visual, interactive practice.",
              isPartOf: {
                "@type": "WebSite",
                url: "https://pianotrainer.app",
                name: "PianoTrainer",
              },
              publisher: {
                "@type": "Organization",
                name: "PianoTrainer",
                url: "https://pianotrainer.app",
              },
            },
            null,
            2
          ),
        }}
      />
    </main>
  );
}