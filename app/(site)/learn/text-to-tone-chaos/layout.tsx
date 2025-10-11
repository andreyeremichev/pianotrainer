// Server segment config for /learn/text-to-tone-chaos
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "TextToTone: Chaos Mode • PianoTrainer",
  description:
    "Letters toggle between A minor and A major while numbers and symbols stay in A minor. Chaos spreads melody across octaves for a rich, unpredictable texture — all normalized to 8 seconds.",
  alternates: { canonical: "/learn/text-to-tone-chaos" },
  openGraph: {
    type: "website",
    url: "https://pianotrainer.app/learn/text-to-tone-chaos",
    title: "TextToTone: Chaos Mode • PianoTrainer",
    description:
      "Explore controlled musical chaos. Letters shift A minor ↔ A major, chords stay moody A minor. Hear how text, numbers, and symbols become sound — perfectly looped in 8 seconds.",
    images: [
      {
        url: "https://pianotrainer.app/og/texttotone-chaos.png",
        width: 1200,
        height: 630,
        alt: "TextToTone: Chaos Mode — Explore How Language Becomes Music",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "TextToTone: Chaos Mode • PianoTrainer",
    description:
      "Letters flip major/minor, chords stay minor — experience musical chaos in A minor. Try TextToTone: Chaos Mode by PianoTrainer.",
    images: ["https://pianotrainer.app/og/texttotone-chaos.png"],
  },
  keywords: [
    "text to tone",
    "chaos mode",
    "text to music",
    "piano chaos",
    "A minor",
    "A major",
    "text melody generator",
    "PianoTrainer",
  ],
  robots: { index: true, follow: true },
};

export default function TextToToneChaosLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}