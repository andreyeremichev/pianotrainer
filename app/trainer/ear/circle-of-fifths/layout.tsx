import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Circle of Fifths (Drone) • PianoTrainer",
  description:
    "Hear each key center with a steady drone, feel the tonic, and internalize how the circle connects. Simple key identification drills included.",
  alternates: { canonical: "/trainer/ear/circle-of-fifths" },
  openGraph: {
    type: "website",
    url: "https://pianotrainer.app/trainer/ear/circle-of-fifths",
    title: "Circle of Fifths (Drone) • PianoTrainer",
    description:
      "Drone-based ear training to lock in key centers. Explore neighbors on the circle and take quick key tests.",
  },
  keywords: ["circle of fifths", "drone", "ear training", "key center", "tonic", "piano"],
  robots: { index: true, follow: true },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}