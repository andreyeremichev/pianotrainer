// app/trainer/ear/layout.tsx
// NOTE: no "use client" here — this must be a Server Component.

import type { Metadata } from "next";

export const metadata: Metadata = {
  metadataBase: new URL("https://pianotrainer.app"),
  title: {
    template: "%s • PianoTrainer",
    default: "Ear Training • PianoTrainer",
  },
  description:
    "Beginner-friendly ear training with piano-only clarity and optional drones: scale degrees, intervals, and progressions. Choose octave ranges, tonicizing patterns, and practice modes.",
  alternates: {
    canonical: "/trainer/ear",
  },
  openGraph: {
    type: "website",
    url: "https://pianotrainer.app/trainer/ear",
    title: "Ear Training • PianoTrainer",
    description:
      "Train your ear with piano notes (no drone or with subtle drone): degrees, intervals, and progressions—beginner friendly and customizable.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function EarLayout({ children }: { children: React.ReactNode }) {
  // Keep layout minimal so trainer pages can control their own inline headers/footers
  return <>{children}</>;
}