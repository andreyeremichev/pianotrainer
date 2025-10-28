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
        .pt-brand svg { height: 46px; width: auto; display: block; }

        .pt-nav {
          display: flex;
          gap: 18px;
          align-items: center;
          white-space: nowrap;
          /* IMPORTANT: allow dropdown to escape */
          overflow: visible;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: none;
        }
        .pt-nav::-webkit-scrollbar { display: none; }

        .pt-link, .pt-summary {
          color: #000;
          text-decoration: none;
          font-size: 14px;
          line-height: 1.2;
        }
        .pt-link:hover, .pt-link:focus-visible,
        .pt-summary:focus-visible { text-decoration: underline; }

        /* Details-based dropdown (no JS) */
        .nav-item { position: relative; }
        .pt-summary {
          list-style: none;
          cursor: pointer;
          user-select: none;
        }
        .pt-summary::-webkit-details-marker { display: none; }
        .caret { margin-left: 4px; font-size: 12px; }

        .dropdown {
          position: absolute;
          top: calc(100% + 6px);
          left: 0;
          background: #fff;
          border: 1px solid #ddd;
          border-radius: 10px;
          padding: 8px;
          min-width: 200px;
          box-shadow: 0 6px 18px rgba(0,0,0,0.12);
          display: none;
          z-index: 999; /* ensure above header content */
        }
        details[open] .dropdown { display: block; }
        .dropdown a {
          display: block;
          padding: 8px 10px;
          border-radius: 8px;
          color: #000;
          text-decoration: none;
          font-size: 14px;
        }
        .dropdown a:hover { background: #f5f5f5; text-decoration: none; }
      `}</style>

      <Link href="/" aria-label="PianoTrainer Home" className="pt-brand">
        <StandardLogo orientation="vertical" />
      </Link>

      <nav aria-label="Main" className="pt-nav">
        {/* Train dropdown (label is not a link) */}
        <details className="nav-item">
          <summary className="pt-summary" aria-haspopup="menu" aria-expanded="false">
            Train <span className="caret">▾</span>
          </summary>
          <div className="dropdown" role="menu" aria-label="Train submenu">
            <Link href="/train/notation" className="pt-link" role="menuitem">Notation</Link>
            <Link href="/train/ear" className="pt-link" role="menuitem">Ear</Link>
          </div>
        </details>

        {/* Toys hub */}
        <Link href="/toys" className="pt-link">Play</Link>

        {/* Learn hub */}
        <Link href="/learn" className="pt-link">Learn</Link>
      </nav>
    </header>
  );
}