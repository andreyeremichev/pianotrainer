// app/(site)/layout.tsx
import type { Metadata } from "next";
import React from "react";
import "../globals.css";
import "./site.css";
import SiteHeader from "../components/SiteHeader";
import SiteFooter from "../components/SiteFooter";

export const metadata: Metadata = {
  title: "PianoTrainer – Playful Music Tools • Train, Play, Learn",
  description:
    "Turn emotions into harmony with Two Paths of Harmony. Explore musical toys, train your notation & ear skills, and learn music theory with interactive demos.",
  metadataBase: new URL("https://pianotrainer.app"),
  alternates: { canonical: "/" },

  openGraph: {
    title: "PianoTrainer – Playful Music Tools • Train, Play, Learn",
    description:
      "Explore interactive music tools: Two Paths of Harmony, Path of Flow, Path of Color, TextToTone, KeyClock, ToneDial. Train notation, ear skills, and harmony in a playful way.",
    url: "/",
    siteName: "PianoTrainer",
    images: ["/og/pianotrainer.jpg"], // keep your 1200×630 image
    type: "website",
  },

  twitter: {
    card: "summary_large_image",
    title: "PianoTrainer – Turn Emotions Into Harmony",
    description:
      "Try Two Paths of Harmony: emotional playback on the Circle of Fifths and Chromatic Circle. Plus musical toys & trainers for a playful learning experience.",
    images: ["/og/pianotrainer.jpg"],
  },

  keywords: [
    "Two Paths of Harmony",
    "Path of Flow",
    "Path of Color",
    "emotional harmony",
    "Circle of Fifths emotions",
    "chromatic circle emotions",
    "PianoTrainer",
    "music toys",
    "notation trainer",
    "ear trainer",
    "text to melody",
    "date to music",
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