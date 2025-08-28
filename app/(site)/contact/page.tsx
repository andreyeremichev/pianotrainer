// app/(site)/contact/page.tsx

export const metadata = {
  title: "Contact • PianoTrainer",
  description:
    "Contact PianoTrainer for questions, feedback, or partnerships. We're happy to hear from you and usually respond within 1–2 business days.",
};

export default function ContactPage() {
  return (
    <main className="page" aria-labelledby="contact-title">
      <header className="header">
        <h1 id="contact-title">Contact</h1>
        <p>Questions, feedback, or ideas? We’d love to hear from you.</p>
      </header>

      <section aria-label="How to reach us" style={{ marginTop: 12 }}>
        <h2 style={{ marginTop: 0 }}>How to reach us</h2>
        <ul>
          <li>
            Email:{" "}
            <a href="mailto:hello@pianotrainer.app">hello@pianotrainer.app</a>
          </li>
        </ul>
        <p style={{ color: "#444" }}>
          We typically respond within 1–2 business days. If you’re reporting a
          bug, please include your device, browser, and a brief description of
          what happened.
        </p>
      </section>

      <section aria-label="Common questions" style={{ marginTop: 16 }}>
        <h2 style={{ marginTop: 0 }}>Common questions</h2>
        <details>
          <summary>Is PianoTrainer free?</summary>
          <p>
            Yes. All training tools are free to use. We may show ads on some
            pages and could add affiliate links in the future to keep the site
            sustainable.
          </p>
        </details>
        <details>
          <summary>Do I need to create an account?</summary>
          <p>
            No account is required. Email capture and optional personalization
            may be added later, but the trainers will stay free.
          </p>
        </details>
        <details>
          <summary>Which devices and browsers are supported?</summary>
          <p>
            PianoTrainer works on modern browsers (Chrome, Edge, Safari,
            Firefox). Trainer pages are optimized for landscape orientation on
            small screens.
          </p>
        </details>
      </section>

      {/* Structured data for /contact (ContactPage + ContactPoint) */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            {
              "@context": "https://schema.org",
              "@type": "ContactPage",
              "@id": "https://pianotrainer.app/contact",
              url: "https://pianotrainer.app/contact",
              name: "Contact • PianoTrainer",
              description:
                "Contact PianoTrainer with questions, feedback, or partnership inquiries.",
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
              contactPoint: [
                {
                  "@type": "ContactPoint",
                  contactType: "customer support",
                  email: "hello@pianotrainer.app",
                  availableLanguage: ["en"],
                },
              ],
            },
            null,
            2
          ),
        }}
      />
    </main>
  );
}