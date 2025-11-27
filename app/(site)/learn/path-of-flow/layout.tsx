import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Path of Flow – Circle of Fifths Emotions • PianoTrainer",
  description:
    "Hear emotions mapped onto the Circle of Fifths. Explore presets like Sadness, Wonder, Hope, Tension, Fear, and custom flows.",
  alternates: { canonical: "/tools/path-of-flow" },
  openGraph: {
    type: "website",
    url: "https://pianotrainer.app/tools/path-of-flow",
    title: "Path of Flow – Circle of Fifths Emotional Playback",
    description:
      "Ten emotional presets + custom flows. Emotional harmony via Circle of Fifths.",
    images: ["/og/path-of-flow.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Path of Flow – Emotional Circle of Fifths",
    description: "Explore emotions on the Circle of Fifths.",
    images: ["/og/path-of-flow.png"],
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}