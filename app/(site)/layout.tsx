// app/(site)/layout.tsx
import type { Metadata } from "next";
import React from "react";
import "../globals.css";
import "./site.css";
import SiteHeader from "../components/SiteHeader";
import SiteFooter from "../components/SiteFooter";

export const metadata: Metadata = {
  title: "PianoTrainer – Ear & Notation Trainers for Piano",
  description:
    "PianoTrainer is a collection of beginner-friendly ear and notation trainers. Learn notes on the grand staff, hear scale degrees, practice intervals, and build a strong connection between keys, sound, and notation.",

  metadataBase: new URL("https://pianotrainer.app"),
  alternates: { canonical: "/" },

  openGraph: {
    type: "website",
    url: "https://pianotrainer.app/",
    siteName: "PianoTrainer",
    title: "PianoTrainer – Ear & Notation Trainers for Piano",
    description:
      "Train your musical fundamentals with interactive piano tools. Practice reading notes, hearing scale degrees, identifying intervals, and connecting the keyboard to the staff — all in your browser.",
    images: ["/og/pianotrainer.jpg"],
  },

  twitter: {
    card: "summary_large_image",
    title: "PianoTrainer – Train Your Ear and Learn Notation",
    description:
      "Interactive piano trainers for ear training and notation. Learn notes, intervals, and scale degrees with clear visuals and immediate sound feedback.",
    images: ["/og/pianotrainer.jpg"],
  },

  keywords: [
    // Core positioning
    "piano trainer",
    "piano practice",
    "music training app",

    // Notation
    "learn piano notes",
    "read sheet music",
    "grand staff notes",
    "notation trainer",
    "keys to notes",

    // Ear training
    "ear training piano",
    "scale degrees",
    "interval training",
    "hear intervals",
    "relative pitch",

    // Audience
    "piano for beginners",
    "self taught piano",
    "practice piano online",
    "music fundamentals",
  ],

  robots: { index: true, follow: true },
};

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="site-shell">
      <SiteHeader />
      {children}
      <SiteFooter />
    </div>
  );
}