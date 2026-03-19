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
    "Beginner-friendly piano trainers for notation and ear training. Learn notes, intervals, and scale degrees with interactive practice.",

  metadataBase: new URL("https://pianotrainer.app"),
  alternates: { canonical: "/" },

  openGraph: {
    type: "website",
    url: "/",
    siteName: "PianoTrainer",
    title: "PianoTrainer – Ear & Notation Trainers for Piano",
    description:
      "Interactive piano trainers for notation and ear training. Practice notes, intervals, and scale degrees in your browser.",
    images: ["/og/pianotrainer.jpg"],
  },

  twitter: {
    card: "summary_large_image",
    title: "PianoTrainer – Train Your Ear and Learn Notation",
    description:
      "Interactive piano trainers for notation and ear training. Practice notes, intervals, and scale degrees in your browser.",
    images: ["/og/pianotrainer.jpg"],
  },

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