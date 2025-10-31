import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Degrees Ear Trainer (Piano) • PianoTrainer",
  description:
    "Hear scale degrees 1–7 inside a key: tonicize, listen, sing back, then type what you heard. Short, clear drills with instant feedback.",
  alternates: { canonical: "/train/ear/degrees" },
  openGraph: {
    type: "website",
    url: "https://pianotrainer.app/train/ear/degrees",
    title: "Degrees Ear Trainer (Piano) • PianoTrainer",
    description:
      "Tonicize the key and train degrees (1–7) with simple patterns like 1–3–5 and 1–7–1. Sing, type, and get instant feedback.",
  },
  keywords: ["degrees", "scale degrees", "ear training", "tonicize", "sing back", "piano"],
  robots: { index: true, follow: true },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}