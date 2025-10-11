import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "KeyClock • Dates Through the Circle of Fifths • PianoTrainer",
  description:
    "Spin your date through the Circle of Fifths. KeyClock turns birthdays, anniversaries, and moments in time into harmonic motion — every date has a key.",
  alternates: { canonical: "/viral/key-clock" },
  openGraph: {
    type: "website",
    url: "https://pianotrainer.app/viral/key-clock",
    title: "KeyClock • Dates Through the Circle of Fifths • PianoTrainer",
    description:
      "Spin your date through the Circle of Fifths. Each day finds its own harmonic orbit — moody, bright, or mysterious. Try KeyClock by PianoTrainer.",
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
    title: "KeyClock • Dates Through the Circle of Fifths • PianoTrainer",
    description:
      "Spin your date through the Circle of Fifths. Each day finds its own harmonic orbit. #KeyClock #CircleOfFifths #PianoTrainer",
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