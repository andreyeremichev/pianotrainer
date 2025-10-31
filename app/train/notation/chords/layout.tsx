import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Chords on the Stave • PianoTrainer",
  description:
    "See triads and sevenths as stacked shapes on the grand stave. Practice chord reading in treble and bass with clear visuals.",
  alternates: { canonical: "/train/notation/chords" },
  openGraph: {
    type: "website",
    url: "https://pianotrainer.app/train/notation/chords",
    title: "Chords on the Stave • PianoTrainer",
    description:
      "Triads & sevenths drawn clearly on the grand stave. Learn chord stacks in treble and bass.",
  },
  keywords: ["chords", "triads", "seventh chords", "notation", "grand staff", "piano reading"],
  robots: { index: true, follow: true },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}