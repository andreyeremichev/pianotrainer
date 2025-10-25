import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ToneDial – Phone/Text to Melody • PianoTrainer",
  description:
    "Map words or phone text (T9) to melody instantly. Three zero modes. Free, fast, no sign-up.",
  alternates: { canonical: "/viral/tone-dial" },
  openGraph: {
    type: "website",
    url: "https://pianotrainer.app/viral/tone-dial",
    title: "ToneDial – Phone/Text → Melody",
    description:
      "Type phone text or words and hear a melody. T9 mapping, Reels-ready export.",
    images: [
      {
        url: "https://pianotrainer.app/og/tonedial.png",
        width: 1200,
        height: 630,
        alt: "ToneDial — Dial Harmony by Number",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "ToneDial – Phone/Text → Melody",
    description:
      "Turn names and numbers into a melody in seconds.",
    images: ["https://pianotrainer.app/og/tonedial.png"],
  },
  keywords: [
    "ToneDial",
    "phone number music",
    "circle of fifths",
    "phone harmony",
    "number to music",
    "PianoTrainer",
    "harmonic dial",
  ],
  robots: { index: true, follow: true },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}