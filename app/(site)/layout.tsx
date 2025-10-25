// app/(site)/layout.tsx
import type { Metadata } from "next";
import React from "react";
import "../globals.css";
import "./site.css";
import SiteHeader from "../components/SiteHeader";
import SiteFooter from "../components/SiteFooter";

export const metadata: Metadata = {
  title: "PianoTrainer – Viral Piano Toys & Beginner Trainers",
  description:
    "Play with viral music toys (KeyClock, ToneDial, TextToTone) and learn faster with simple notation & ear trainers. Free and instant.",
  metadataBase: new URL("https://pianotrainer.app"),
  alternates: { canonical: "/" },
  openGraph: {
    title: "PianoTrainer – Viral Piano Toys & Beginner Trainers",
    description:
      "Try KeyClock, ToneDial, and TextToTone. Fun web toys to turn dates, phone text, and phrases into music.",
    url: "/", // resolves via metadataBase
    siteName: "PianoTrainer",
    images: ["/og/pianotrainer.jpg"], // 1200x630 in /public/og/
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "PianoTrainer – Viral Piano Toys & Beginner Trainers",
    description:
      "KeyClock, ToneDial, TextToTone: turn your dates, phone text, and phrases into music.",
    images: ["/og/pianotrainer.jpg"],
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