import type { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "TextToTone – Turn Text into Music • PianoTrainer",
  description:
    "Paste or type any text and hear it as melody. Simple, musical, and fast. Free, no sign-up.",
  alternates: { canonical: "/viral/text-to-tone" },
  openGraph: {
    type: "website",
    url: "https://pianotrainer.app/viral/text-to-tone",
    title: "TextToTone – Text → Music",
    description:
      "Turn any phrase — words, numbers, or memes — into melody. Try the viral piano toy by PianoTrainer.",
    images: [
      {
        url: "https://pianotrainer.app/og/texttotone.png",
        width: 1200,
        height: 630,
        alt: "TextToTone – Turn Text into Music",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "TextToTone – Text → Music",
    description:
      "Paste or type any text and hear the melody hidden inside. Free and instant.",
    images: ["https://pianotrainer.app/og/texttotone.png"],
  },
  robots: { index: true, follow: true },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}