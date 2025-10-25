import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "KeyClock – Turn Dates into Music • PianoTrainer",
  description:
    "Type a date and hear it as cadences. KeyClock turns birthdays and times into musical progressions. Free, fast, no sign-up.",
  alternates: { canonical: "/viral/key-clock" },
  openGraph: {
    type: "website",
    url: "https://pianotrainer.app/viral/key-clock",
    title: "KeyClock – Dates → Music (Cadences)",
    description:
      "Turn any date or time into music. Three zero modes (Chromatic, Ticks, Rest). Perfect for quick Reels.",
    images: [
      {
        url: "https://pianotrainer.app/og/keyclock.png",
        width: 1200,
        height: 630,
        alt: "KeyClock — Dates Through the Circle of Fifths",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "KeyClock – Dates → Music",
    description:
      "Type a date/time and hear it as cadences. Free, fast, no sign-up.",
    images: ["https://pianotrainer.app/og/keyclock.png"],
  },
  keywords: [
    "KeyClock",
    "date to music",
    "circle of fifths",
    "date harmony",
    "PianoTrainer",
    "harmonic calendar",
    "music generator",
    "C minor",
    "Bb major",
  ],
  robots: { index: true, follow: true },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}