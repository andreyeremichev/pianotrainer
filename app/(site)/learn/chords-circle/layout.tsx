// Server segment config for /learn/chords-circle
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Chords Circle (Shapes on the Wheel) • PianoTrainer",
  description:
    "See triads & sevenths as geometric shapes on the Circle of Fifths. Block vs. arpeggio playback, live shapes, share and PNG download.",
  alternates: { canonical: "/learn/chords-circle" },
  openGraph: {
    type: "website",
    url: "https://pianotrainer.app/learn/chords-circle",
    title: "Chords Circle • PianoTrainer",
    description:
      "Triads & sevenths traced as polygons on the Circle of Fifths—harmony made visible. Try different traversal orders, share snapshots.",
  },
  keywords: [
    "chords circle",
    "circle of fifths chords",
    "triads",
    "sevenths",
    "interactive harmony",
  ],
  robots: { index: true, follow: true },
};


export default function ChordsCircleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // no wrappers needed; we just provide segment config
  return <>{children}</>;
}