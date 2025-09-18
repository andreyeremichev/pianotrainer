import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dates → Notes (SN) • PianoTrainer",
  description:
    "Turn any date into melody. Play and record a short Reels/TikTok-ready clip where digits become notes and dashes become pauses.",
  alternates: { canonical: "/viral/date-to-notes-sn" },
  openGraph: {
    type: "website",
    url: "https://pianotrainer.app/viral/date-to-notes-sn",
    title: "Dates → Notes (SN) • PianoTrainer",
    description:
      "Your date, as music. One-tap playback and an export that’s Reels-ready.",
    siteName: "PianoTrainer",
  },
  twitter: {
    card: "summary_large_image",
    title: "Dates → Notes (SN) • PianoTrainer",
    description:
      "Digits sing; dashes breathe. Make a short, share-ready musical clip from any date.",
  },
  robots: { index: true, follow: true },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}