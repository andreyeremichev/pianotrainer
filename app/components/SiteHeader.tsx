
"use client";

import Link from "next/link";
import { useMemo } from "react";
import StandardLogo from "./logos/StandardLogo";

type Props = {
  variant?: "global" | "inline";
};

export default function SiteHeader({ variant = "global" }: Props) {
  const isInline = variant === "inline";

  const wrapStyle: React.CSSProperties = useMemo(
    () => ({
      position: "relative",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
      padding: isInline ? "4px 0" : "8px 12px",
      borderBottom: isInline ? "none" : "1px solid #e5e5e5",
      overflow: "hidden",
    }),
    [isInline]
  );

  const navStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: 12,
    whiteSpace: "nowrap",
    overflowX: "auto",
    WebkitOverflowScrolling: "touch",
    scrollbarWidth: "none",
  };

  const linkStyle: React.CSSProperties = {
    textDecoration: "none",
    color: "#111",
    fontWeight: 600,
    fontSize: isInline ? 14 : 15,
    lineHeight: 1.2,
    padding: isInline ? "6px 8px" : "8px 10px",
    borderRadius: 6,
    border: "1px solid #000",
    background: "#f7f7f7",
    flex: "0 0 auto",
  };

  return (
    <header role="banner" aria-label="Primary" style={wrapStyle}>
      <Link href="/" aria-label="PianoTrainer Home" style={{ display: "inline-flex", alignItems: "center" }}>
        <div style={{ display: "inline-flex", alignItems: "center", height: isInline ? 28 : 32 }}>
          <StandardLogo />
        </div>
      </Link>

      <nav aria-label="Main navigation" style={navStyle}>
        <Link href="/trainer/notation" style={linkStyle}>Notation Trainer</Link>
        <Link href="/trainer/ear" style={linkStyle}>Ear Trainer</Link>
        <Link href="/learn" style={linkStyle}>Learn how to</Link>
      </nav>
    </header>
  );
}