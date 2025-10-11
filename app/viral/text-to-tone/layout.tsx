import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "TextToTone • Type Anything, Hear the Music",
  description:
    "Turn any phrase — words, numbers, memes, even punctuation — into a melody. Type, play, and share your sound with #TextToTone.",
  alternates: { canonical: "/viral/text-to-tone" },
  openGraph: {
    type: "website",
    url: "https://pianotrainer.app/viral/text-to-tone",
    title: "TextToTone • Type Anything, Hear the Music",
    description:
      "Letters, digits, and memes become music. Try #TextToTone — the viral piano toy where your text plays itself.",
    images: [
      {
        url: "https://pianotrainer.app/og/texttotone.png",
        width: 1200,
        height: 630,
        alt: "TextToTone – Type Anything, Hear the Music",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "TextToTone • Type Anything, Hear the Music",
    description:
      "Your text becomes sound. Type, play, and share your melody with #TextToTone #TextToMusic #PianoTrainer",
    images: ["https://pianotrainer.app/og/texttotone.png"],
  },
  robots: { index: true, follow: true },
};