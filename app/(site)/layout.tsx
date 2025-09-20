// app/(site)/layout.tsx
import type { Metadata } from "next";
import React from "react";
import "../globals.css";
import "./site.css";
import SiteHeader from "../components/SiteHeader";
import SiteFooter from "../components/SiteFooter";

export const metadata: Metadata = {
  title: "PianoTrainer • Free Notation & Ear Training",
  description:
    "Make notes come alive 🎵. Playful, beginner-friendly trainers for reading music, chords, and ear skills — free in your browser.",
  metadataBase: new URL("https://pianotrainer.app"),
  alternates: { canonical: "/" },
  openGraph: {
    title: "PianoTrainer • Free Notation & Ear Training",
    description:
      "Playful, beginner-friendly trainers for reading music, chords, and ear skills — free in your browser.",
    url: "/",
    siteName: "PianoTrainer",
    images: ["/logo.svg"],        // ← static file in /public
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "PianoTrainer • Free Notation & Ear Training",
    description:
      "Make notes come alive 🎵. Train your eyes and ears with simple web tools.",
    images: ["/logo.svg"],        // ← reuse the same static file
  },
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