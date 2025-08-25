

"use client";

import Link from "next/link";
import StandardLogo from "./logos/StandardLogo";

type Props = {
  /** Kept for compatibility with trainer pages; minimal visual difference */
  variant?: "global" | "inline";
};

export default function SiteHeader({ variant = "global" }: Props) {
  const isInline = variant === "inline";

  return (
    <header className="pt-header" role="banner" aria-label="Primary">
      {/* Scoped styles for hover underline, small logo, and responsive nav */}
      <style>{`
        .pt-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: ${isInline ? "6px 0" : "10px 16px"};
          border-bottom: 1px solid #ddd;
          background: #fff;
        }
        .pt-brand {
          display: inline-flex;
          align-items: center;
        }
        .pt-nav {
          display: flex;
          gap: 18px;
          align-items: center;
          white-space: nowrap;
          overflow-x: auto;           /* tiny screens can scroll horizontally */
          -webkit-overflow-scrolling: touch;
          scrollbar-width: none;      /* Firefox hide scrollbar */
        }
        .pt-nav::-webkit-scrollbar { display: none; } /* Safari/Chrome hide */
        .pt-link {
          color: #000;
          text-decoration: none;
          font-size: 14px;
          line-height: 1.2;
        }
        .pt-link:hover,
        .pt-link:focus-visible {
          text-decoration: underline;
        }
      `}</style>

      <Link href="/" aria-label="PianoTrainer Home" className="pt-brand">
        {/* force smaller visual height; StandardLogo should respect height prop */}
        <StandardLogo height={15} />
      </Link>

      <nav aria-label="Main" className="pt-nav">
        <Link href="/trainer/notation" className="pt-link">Notation Trainer</Link>
        <Link href="/trainer/ear" className="pt-link">Ear Trainer</Link>
        <Link href="/learn" className="pt-link">Learn</Link>
      </nav>
    </header>
  );
}