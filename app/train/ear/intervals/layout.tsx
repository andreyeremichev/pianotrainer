import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Intervals Ear Trainer • PianoTrainer",
  description:
    "Hear minor 2nds to octaves, ascending/descending/harmonic. Sing, choose, and get instant feedback—train your ear to label intervals fast.",
  alternates: { canonical: "/train/ear/intervals" },
  openGraph: {
    type: "website",
    url: "https://pianotrainer.app/train/ear/intervals",
    title: "Intervals Ear Trainer • PianoTrainer",
    description:
      "Intervals from m2 to P8: hear them, sing them, and type the right answer. Short sessions with instant feedback.",
  },
  keywords: ["intervals", "ear training", "minor second", "tritone", "octave", "piano"],
  robots: { index: true, follow: true },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}