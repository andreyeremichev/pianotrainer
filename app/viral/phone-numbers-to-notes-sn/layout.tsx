import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Phone Numbers → Notes (SN) • PianoTrainer",
  description:
    "Turn a phone number into music. Digits become notes, dashes are pauses. Record a Reels/TikTok-ready clip in 10 seconds.",
  alternates: { canonical: "/viral/phone-numbers-to-notes-sn" },
  openGraph: {
    type: "website",
    url: "https://pianotrainer.app/viral/phone-numbers-to-notes-sn",
    title: "Phone Numbers → Notes (SN) • PianoTrainer",
    description:
      "Digits sing; dashes breathe. Make a 10-second, Reels-ready clip from any phone number.",
    siteName: "PianoTrainer",
  },
  twitter: {
    card: "summary_large_image",
    title: "Phone Numbers → Notes (SN) • PianoTrainer",
    description:
      "Digits become notes; dashes become pauses. Create a Reels/TikTok-ready clip in seconds.",
  },
  robots: { index: true, follow: true },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}