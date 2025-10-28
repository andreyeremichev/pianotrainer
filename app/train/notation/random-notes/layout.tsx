import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Random Notes (Grand Stave) • PianoTrainer",
  description:
    "Read single notes on the grand stave, one at a time. Simple visuals, guide-note friendly, and perfect for daily warm-ups.",
  alternates: { canonical: "/trainer/notation/random-notes" },
  openGraph: {
    type: "website",
    url: "https://pianotrainer.app/trainer/notation/random-notes",
    title: "Random Notes (Grand Stave) • PianoTrainer",
    description:
      "Build sight-reading confidence with single-note drills on treble and bass. Ideal daily warm-up.",
  },
  keywords: ["random notes", "sight reading", "notation", "grand staff", "guide notes"],
  robots: { index: true, follow: true },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}