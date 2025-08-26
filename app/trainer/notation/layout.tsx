
// app/trainer/notation/layout.tsx
// NOTE: no "use client" here — this must be a Server Component.

import type { Metadata } from "next";

export const metadata: Metadata = {
  metadataBase: new URL("https://pianotrainer.app"),
  title: {
    template: "%s • PianoTrainer",
    default: "Notation Trainer • PianoTrainer",
  },
  description:
    "Beginner-friendly notation drills on a fixed grand staff: random notes, keys-to-notes, chords, and intervals. Train treble & bass with whole notes.",
  alternates: {
    canonical: "/trainer/notation",
  },
  openGraph: {
    type: "website",
    url: "https://pianotrainer.app/trainer/notation",
    title: "Notation Trainer • PianoTrainer",
    description:
      "Beginner-friendly notation drills on a fixed grand staff: random notes, keys-to-notes, chords, and intervals.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function NotationLayout({ children }: { children: React.ReactNode }) {
  // Keep layout minimal so trainer pages can control their own inline headers/footers
  return <>{children}</>;
}