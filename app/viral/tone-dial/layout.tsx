import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ToneDial • Dial Harmony by Number • PianoTrainer",
  description:
    "ToneDial transforms phone numbers into harmonic motion. Each digit turns the Circle of Fifths — dial a number, hear a progression.",
  alternates: { canonical: "/viral/tone-dial" },
  openGraph: {
    type: "website",
    url: "https://pianotrainer.app/viral/tone-dial",
    title: "ToneDial • Dial Harmony by Number • PianoTrainer",
    description:
      "Dial harmony. Each digit turns the Circle of Fifths — from country codes to personal numbers, everything grooves in key.",
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
    title: "ToneDial • Dial Harmony by Number • PianoTrainer",
    description:
      "Dial harmony. Every phone number spins the Circle of Fifths into music. Try ToneDial by PianoTrainer. #ToneDial #CircleOfFifths",
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