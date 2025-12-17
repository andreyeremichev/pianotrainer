// NO "use client" — server component

import Link from "next/link";
import StandardLogo from "./logos/StandardLogo";

type Props = {
  variant?: "global" | "inline";
};

export default function SiteHeader({ variant = "global" }: Props) {
  const isInline = variant === "inline";

  return (
    <header className="pt-header" role="banner" aria-label="Primary">
      <style>{`
        .pt-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: ${isInline ? "6px 0" : "10px 16px"};
          border-bottom: 1px solid #ddd;
          background: #fff;
          position: relative;
          z-index: 10;
        }
        .pt-brand {
          display: inline-flex;
          align-items: center;
          line-height: 0;
        }
        .pt-brand svg {
          height: 46px;
          width: auto;
          display: block;
        }
        .pt-nav {
          display: flex;
          gap: 18px;
          align-items: center;
          white-space: nowrap;
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: none;
        }
        .pt-nav::-webkit-scrollbar { display: none; }

        .pt-link {
          color: #000;
          text-decoration: none;
          font-size: 14px;
          line-height: 1.2;
          font-weight: 600;
        }
        .pt-link:hover,
        .pt-link:focus-visible {
          text-decoration: underline;
        }
      `}</style>

      <Link href="/" aria-label="PianoTrainer Home" className="pt-brand">
        <StandardLogo orientation="vertical" />
      </Link>

      <nav aria-label="Main" className="pt-nav">
        <Link href="/train/notation" className="pt-link">
          Train Notation
        </Link>
        <Link href="/train/ear" className="pt-link">
          Train Ear
        </Link>
      </nav>
    </header>
  );
}