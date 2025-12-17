// Server segment config for /learn/text-to-tone-chaos
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Text to Music Lab: Exploring Major & Minor Through Notation • PianoTrainer",
  description:
    "Use your own words to explore melody, harmony, and notation in both major and minor. Letters shift A minor ↔ A major while chords stay grounded in A minor, creating a rich, learnable texture.",
  alternates: { canonical: "/learn/text-to-tone-chaos" },
  openGraph: {
    type: "website",
    url: "https://pianotrainer.app/learn/text-to-tone-chaos",
    title: "Text to Music Lab: Exploring Major & Minor Through Notation • PianoTrainer",
    description:
      "An experimental learning tool: type your own phrases and explore how major/minor changes the feel. Letters shift A minor ↔ A major while chords stay in A minor — designed for learning, not sharing.",
    images: [
      {
        url: "https://pianotrainer.app/og/texttotone-chaos.png",
        width: 1200,
        height: 630,
        alt: "Text to Music Lab — Explore Major & Minor Through Notation",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Text to Music Lab: Major & Minor Through Notation • PianoTrainer",
    description:
      "Use your own words to explore melody, harmony, and notation in major and minor. An experimental learning tool in A minor ↔ A major.",
    images: ["https://pianotrainer.app/og/texttotone-chaos.png"],
  },
  keywords: [
    "text to music",
    "music lab",
    "learn notation",
    "major and minor",
    "piano harmony",
    "melody from text",
    "A minor",
    "A major",
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