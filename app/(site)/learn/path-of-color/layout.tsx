import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Path of Color – Chromatic Circle Emotions • PianoTrainer",
  description:
    "Hear emotions mapped onto the Chromatic Circle. Explore presets and create your own emotional colors.",
  alternates: { canonical: "/tools/path-of-color" },
  openGraph: {
    type: "website",
    url: "https://pianotrainer.app/tools/path-of-color",
    title: "Path of Color – Chromatic Emotional Playback",
    description:
      "Ten emotional presets + custom chromatic color paths. Emotional harmony in pure chromatic space.",
    images: ["/og/path-of-color.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Path of Color – Chromatic Circle Emotions",
    description: "Explore emotions on the Chromatic Circle.",
    images: ["/og/path-of-color.png"],
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}