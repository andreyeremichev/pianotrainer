import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "PianoTrainer • Free Notation & Ear Training",
  description:
    "Make notes come alive 🎵. Explore playful trainers for reading, ears, and chords — free in your browser.",
  alternates: { canonical: "https://pianotrainer.app" },
  openGraph: {
    type: "website",
    url: "https://pianotrainer.app",
    siteName: "PianoTrainer",
    title: "PianoTrainer • Free Notation & Ear Training",
    description:
      "Playful, beginner-friendly tools to read notes, train your ear, and explore chords.",
    images: [
      {
        url: "/logo.svg",      // ✅ uses your public logo
        width: 1200,
        height: 630,
        alt: "PianoTrainer Logo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "PianoTrainer • Free Notation & Ear Training",
    description:
      "Make notes come alive 🎵. Free, browser-based trainers for notation and ear skills.",
    images: ["/logo.svg"],     // ✅ same static file
  },
  robots: { index: true, follow: true },
};