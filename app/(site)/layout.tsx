// app/(site)/layout.tsx
import type { Metadata } from "next";
import React from "react";
import "../globals.css";
import "./site.css";
import SiteHeader from "../components/SiteHeader";
import SiteFooter from "../components/SiteFooter";

export const metadata: Metadata = {
  title: "PianoTrainer – Emotional Harmony & Playful Music Tools",
  description:
    "Hear emotions as harmony with Two Paths of Harmony. Explore Path of Flow, Path of Color, musical toys, notation & ear trainers, and simple guides that make music feel intuitive.",

  metadataBase: new URL("https://pianotrainer.app"),
  alternates: { canonical: "/" },

  openGraph: {
    type: "website",
    url: "https://pianotrainer.app/",
    siteName: "PianoTrainer",
    title: "PianoTrainer – Emotional Harmony & Playful Music Tools",
    description:
      "Start with Two Paths of Harmony to hear how emotions move through harmony. Then explore Path of Flow, Path of Color, musical toys, notation trainers, ear trainers, and friendly learning guides.",
    images: ["/og/pianotrainer.jpg"],
  },

  twitter: {
    card: "summary_large_image",
    title: "PianoTrainer – Hear Emotions as Harmony",
    description:
      "Discover emotional harmony through Two Paths of Harmony. Explore Flow, Color, musical toys, and beginner-friendly trainers for notes and ear skills.",
    images: ["/og/pianotrainer.jpg"],
  },

  keywords: [
    // Emotional Harmony
    "Two Paths of Harmony",
    "Path of Flow",
    "Path of Color",
    "emotional harmony",
    "sadness chords",
    "mystery harmony",
    "anger harmony",
    "wonder harmony",

    // Learning paths
    "learn music",
    "music lessons",
    "harmony explained",
    "music theory for beginners",

    // Tools
    "music toys",
    "KeyClock",
    "ToneDial",
    "TextToTone",
    "Shape of Harmony",
    "text to melody",
    "date to music",
    "phone to melody",

    // Trainers
    "notation trainer",
    "ear trainer",
    "chords helper",
    "learn notes",
    "intervals trainer",
  ],

  robots: { index: true, follow: true },
};

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  // Server layout (no "use client") – valid App Router signature
  return (
    <div className="site-shell">
      <SiteHeader />
      {children}
      <SiteFooter />
    </div>
  );
}