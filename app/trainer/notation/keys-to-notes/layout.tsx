// app/trainer/notation/keys-to-notes/layout.tsx
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Keys → Notes (Grand Stave) • PianoTrainer",
  description:
    "Play any piano key and instantly see the correct note on the grand staff — with sound and proper ♯/♭ spelling.",
  alternates: { canonical: "/trainer/notation/keys-to-notes" },
  openGraph: {
    type: "website",
    url: "https://pianotrainer.app/trainer/notation/keys-to-notes",
    title: "Keys → Notes (Grand Stave) • PianoTrainer",
    description:
      "Map the keyboard to the grand stave. Sharps and flats included, with instant visual feedback.",
  },
  robots: { index: true, follow: true },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}