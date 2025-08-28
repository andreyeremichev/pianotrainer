// app/(site)/privacy/page.tsx
"use client";

import React from "react";
import Link from "next/link";

// ✅ SEO metadata
export const metadata = {
  title: "Privacy Policy & Terms of Use • PianoTrainer",
  description:
    "Read the PianoTrainer Privacy Policy & Terms of Use. Learn how we protect your data, use cookies, and the rules for using our free online music training tools.",
};

const SITE_URL = "https://pianotrainer.app";
const UPDATED_ISO = new Date().toISOString(); // used in JSON-LD

export default function PrivacyPage() {
  // JSON-LD: WebSite
  const websiteJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    url: SITE_URL,
    name: "PianoTrainer",
    alternateName: ["Piano Trainer", "PianoTrainer.app"],
    description:
      "PianoTrainer is a free, browser-based app to learn to read music and train your ear with interactive grand-stave exercises.",
    inLanguage: "en",
    publisher: {
      "@type": "Organization",
      name: "PianoTrainer",
      url: SITE_URL,
      email: "hello@pianotrainer.app",
    },
    potentialAction: {
      "@type": "SearchAction",
      target: `${SITE_URL}/search?q={query}`,
      "query-input": "required name=query",
    },
  };

  // JSON-LD: PrivacyPolicy (using WebPage as container)
  const privacyJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    url: `${SITE_URL}/privacy`,
    name: "Privacy Policy & Terms of Use • PianoTrainer",
    isPartOf: {
      "@type": "WebSite",
      url: SITE_URL,
      name: "PianoTrainer",
    },
    dateModified: UPDATED_ISO,
    about: {
      "@type": "Thing",
      name: "Privacy Policy",
      description:
        "How PianoTrainer collects, uses, and protects data; cookies; analytics; children’s privacy; and terms of use.",
    },
    mainEntity: {
      "@type": "PrivacyPolicy",
      name: "PianoTrainer Privacy Policy",
      url: `${SITE_URL}/privacy`,
      dateModified: UPDATED_ISO,
      publisher: {
        "@type": "Organization",
        name: "PianoTrainer",
        url: SITE_URL,
      },
    },
  };

  return (
    <main className="page">
      {/* JSON-LD scripts: safe to include in the page body; crawlers will read them */}
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
      />
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(privacyJsonLd) }}
      />

      <div className="root">
        <header className="header">
          <h1>Privacy Policy & Terms of Use</h1>
          <p>
            Last updated:{" "}
            {new Date().toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </header>

        <section>
          <h2>1. Introduction</h2>
          <p>
            PianoTrainer (“we,” “our,” or “us”) respects your privacy and is
            committed to protecting it through this Privacy Policy. This page
            explains how we collect, use, and safeguard your information when
            you use pianotrainer.app.
          </p>
        </section>

        <section>
          <h2>2. Information We Collect</h2>
          <p>
            We do not require you to create an account, and we do not collect
            personal data such as names, addresses, or payment details. We may
            collect non-identifiable information automatically, such as browser
            type, device type, operating system, and general usage statistics,
            for analytics and performance improvement.
          </p>
        </section>

        <section>
          <h2>3. Use of Information</h2>
          <p>Information we collect is used to:</p>
          <ul>
            <li>Ensure the site functions correctly across devices and browsers.</li>
            <li>Monitor performance and usage patterns to improve user experience.</li>
            <li>Maintain the security and stability of the service.</li>
          </ul>
        </section>

        <section>
          <h2>4. Cookies & Analytics</h2>
          <p>
            PianoTrainer may use cookies or similar technologies to understand
            site usage and improve functionality. These cookies do not collect
            personally identifiable information. Third-party analytics providers
            (e.g., Google Analytics) may also be used for anonymous traffic
            analysis.
          </p>
        </section>

        <section>
          <h2>5. Third-Party Services</h2>
          <p>
            Our site may link to external websites or services. We are not
            responsible for the privacy practices or content of third-party
            sites. Please review their policies before sharing personal
            information.
          </p>
        </section>

        <section>
          <h2>6. Data Security</h2>
          <p>
            We implement reasonable technical and organizational measures to
            protect your data. However, no online system is 100% secure, and we
            cannot guarantee the absolute security of your information.
          </p>
        </section>

        <section>
          <h2>7. Children’s Privacy</h2>
          <p>
            PianoTrainer is designed for learners of all ages but does not
            knowingly collect personal data from children. If you believe a
            child has provided us with personal data, please contact us to
            request deletion.
          </p>
        </section>

        <section>
          <h2>8. Changes to This Policy</h2>
          <p>
            We may update this Privacy Policy from time to time. Any updates
            will be posted on this page with the “Last updated” date revised.
          </p>
        </section>

        <section>
          <h2>9. Contact Us</h2>
          <p>
            If you have any questions or concerns about this Privacy Policy,
            please contact us at:{" "}
            <a href="mailto:hello@pianotrainer.app">hello@pianotrainer.app</a>
          </p>
        </section>

        {/* ---- TERMS OF USE APPENDED ---- */}
        <section>
          <h2>10. Terms of Use</h2>
          <p>By using pianotrainer.app, you agree to the following terms:</p>
          <ul>
            <li>
              <strong>Educational Purpose:</strong> PianoTrainer is provided
              solely for personal learning and educational purposes. It is not
              intended for professional certification or commercial use.
            </li>
            <li>
              <strong>“As-Is” Disclaimer:</strong> The site and its content are
              provided “as is” without any warranties, express or implied. We do
              not guarantee uninterrupted access, error-free performance, or
              accuracy of musical data.
            </li>
            <li>
              <strong>Limitation of Liability:</strong> PianoTrainer shall not be
              responsible for any damages or losses arising from use of the
              site. Users assume full responsibility for their use of the
              platform.
            </li>
            <li>
              <strong>Acceptable Use:</strong> You agree not to misuse, copy,
              distribute, or attempt to reverse-engineer the code or content of
              this site.
            </li>
            <li>
              <strong>Right to Modify or Discontinue:</strong> We reserve the
              right to change, suspend, or discontinue any part of the service
              at any time, without notice.
            </li>
          </ul>
        </section>

        <footer style={{ marginTop: "2rem" }}>
          <p>
            Return to <Link href="/">Home</Link>
          </p>
        </footer>
      </div>
    </main>
  );
}