import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Two Paths of Harmony – Emotional Playback Explained • PianoTrainer",
  description:
    "Discover how emotions map to harmony using the Circle of Fifths and Chromatic Circle. Learn Path of Flow vs Path of Color with demos and emotional presets.",
  alternates: { canonical: "/learn/two-paths-of-harmony" },
  openGraph: {
    type: "article",
    url: "https://pianotrainer.app/learn/two-paths-of-harmony",
    title: "Two Paths of Harmony – Emotional Playback Explained",
    description:
      "Deep dive into emotional harmony: Path of Flow (Circle of Fifths) vs Path of Color (Chromatic). With demos, presets, and practical examples.",
    images: ["/og/two-paths-of-harmony.jpg"], // create later or reuse existing
  },
  twitter: {
    card: "summary_large_image",
    title: "Two Paths of Harmony – Emotional Playback",
    description:
      "Learn how emotions become harmony via Circle of Fifths and Chromatic Circle.",
    images: ["/og/two-paths-of-harmony.jpg"],
  },
  robots: { index: true, follow: true },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}