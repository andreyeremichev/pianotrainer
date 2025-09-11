// Server segment config for /learn/numbers-circle
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Numbers Circle (π, e, √2, √3 on the Wheel) • PianoTrainer",
  description:
    "Spin the Circle of Fifths with π, e, √2, √3. Digits become degrees; Mixed mode and Random Start make mesmerizing patterns. Share or download a PNG.",
  alternates: { canonical: "/learn/numbers-circle" },
  openGraph: {
    type: "website",
    url: "https://pianotrainer.app/learn/numbers-circle",
    title: "Numbers Circle (π, e, √2, √3) • PianoTrainer",
    description:
      "Watch famous constants spill into music on the Circle of Fifths. Digits → degrees, Mixed mode, Random Start, shareable images.",
  },
  keywords: [
    "numbers circle",
    "pi music",
    "e constant music",
    "circle of fifths",
    "interactive music",
  ],
  robots: { index: true, follow: true },
};


export default function NumbersCircleLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}