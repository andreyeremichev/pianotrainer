import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Shape of Harmony – Chord Progressions as Shapes • PianoTrainer",
  description:
    "Visualize and hear chord progressions as geometric shapes on a chromatic circle. Two-pass playback, color-coded harmony, MP4 export. Free, no sign-up.",
  alternates: { canonical: "/toys/shape-of-harmony" },
  openGraph: {
    type: "website",
    url: "https://pianotrainer.app/toys/shape-of-harmony",
    title: "Shape of Harmony – Chord Progressions → Shapes",
    description:
      "Turn any chord progression into a harmonic constellation. Watch chords morph in real-time on a chromatic circle. Perfect for Reels.",
    images: [
      {
        url: "https://pianotrainer.app/og/shape-of-harmony.png",
        width: 1200,
        height: 630,
        alt: "Shape of Harmony — Chord Progressions as Visual Shapes",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Shape of Harmony – Chord Progressions → Shapes",
    description:
      "Visual harmony engine: chord progressions become animated shapes on a chromatic circle. Free, no sign-up.",
    images: ["https://pianotrainer.app/og/shape-of-harmony.png"],
  },
  keywords: [
    "Shape of Harmony",
    "chord progression visualizer",
    "chords to shapes",
    "circle of fifths",
    "chromatic circle",
    "music visualizer",
    "piano trainer",
    "harmony animation",
    "mp4 music generator",
    "chord geometry",
  ],
  robots: { index: true, follow: true },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}