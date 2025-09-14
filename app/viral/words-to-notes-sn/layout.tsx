// Server segment config for /learn/words-to-notes
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Words → Notes (Turn Phrases into Melody) • PianoTrainer",
  description:
    "Type any phrase and see/hear it on the grand stave. Letters map to degrees in A minor or A major. Share a link or download a PNG snapshot.",
  alternates: { canonical: "/learn/words-to-notes" },
  openGraph: {
    type: "website",
    url: "https://pianotrainer.app/viral/words-to-notes-sn",
    title: "Words → Notes (Turn Phrases into Melody) • PianoTrainer",
    description:
      "Turn text into music. Letters become notes on the stave in A minor or A major—hear it, share it, download it.",
  },
  keywords: [
    "words to notes",
    "text to music",
    "melody from words",
    "A minor",
    "A major",
    "grand stave",
  ],
  robots: { index: true, follow: true },
};

export default function WordsToNotesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}