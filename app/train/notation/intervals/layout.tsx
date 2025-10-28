import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Intervals on the Stave • PianoTrainer",
  description:
    "See two-note intervals from seconds to octaves on the grand stave. Learn spacing, direction, and play them on the keyboard.",
  alternates: { canonical: "/trainer/notation/intervals" },
  openGraph: {
    type: "website",
    url: "https://pianotrainer.app/trainer/notation/intervals",
    title: "Intervals on the Stave • PianoTrainer",
    description:
      "Visualize intervals (m2–P8) on the grand stave and connect spacing to movement under your fingers.",
  },
  keywords: ["intervals", "notation", "grand staff", "seconds", "thirds", "fifths", "octaves"],
  robots: { index: true, follow: true },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}