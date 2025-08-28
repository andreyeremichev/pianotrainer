// app/(site)/about/page.tsx
export const metadata = {
  title: "About • PianoTrainer",
  description:
    "Learn about PianoTrainer.app — a free interactive platform that helps beginners connect piano keys to the grand stave through fun trainers and ear training.",
};

export default function AboutPage() {
  return (
    <main className="page">
      <h1>About PianoTrainer</h1>
      <p>
        PianoTrainer.app is a free, browser-based platform built to help
        beginners learn how to read sheet music and connect what they see on the
        stave to the keys on a piano or keyboard. Our goal is to make learning
        music theory approachable, interactive, and fun.
      </p>

      <section aria-label="Mission">
        <h2>Our Mission</h2>
        <p>
          Many people start learning piano but get stuck when it comes to
          reading sheet music. PianoTrainer bridges that gap by providing
          interactive trainers that connect the grand stave with the keyboard
          while reinforcing ear-training skills.
        </p>
      </section>

      <section aria-label="Features">
        <h2>What You’ll Find</h2>
        <ul>
          <li>🎹 Notation trainers for recognizing notes on the grand stave</li>
          <li>👂 Ear training tools to develop pitch and interval recognition</li>
          <li>📖 Step-by-step guides to core music theory topics</li>
          <li>🖥 Works instantly on desktop, tablet, or mobile—no downloads</li>
        </ul>
      </section>

      <section aria-label="Community">
        <h2>For Everyone</h2>
        <p>
          Whether you are a complete beginner, a self-taught musician, or a
          teacher looking for practice tools, PianoTrainer is built to support
          your journey. The app is free to use and always will be.
        </p>
      </section>

      <section aria-label="Get started">
        <h2>Get Started</h2>
        <p>
          Try the{" "}
          <a href="/trainer/notation/random-notes">Random Notes trainer</a> or{" "}
          jump into{" "}
          <a href="/trainer/notation/keys-to-notes">Keys to Notes</a> to see the
          stave and keyboard work together.
        </p>
      </section>

      {/* SEO blurb at bottom of About page */}
      <section aria-label="SEO Summary">
        <p>
          PianoTrainer.app is a free browser-based platform to help beginners
          read music, recognize notes, and connect the keyboard with the grand
          stave. It offers interactive notation trainers, ear-training tools,
          and music theory guides—all accessible on desktop or mobile without
          downloads.
        </p>
      </section>

      {/* Structured data for SEO */}
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
                "Learn about PianoTrainer.app — a free interactive platform that helps beginners connect piano keys to the grand stave through fun trainers and ear training.",
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