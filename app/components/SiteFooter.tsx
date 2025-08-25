import Link from "next/link";

export default function SiteFooter() {
  return (
    <footer className="pt-footer" role="contentinfo" aria-label="Footer">
      <style>{`
        .pt-footer {
          padding: 16px 12px;
          border-top: 1px solid #e5e5e5;
          margin-top: 24px;
          background: #fff;
        }
        .pt-footer-nav {
          display: flex;
          gap: 16px;
          flex-wrap: wrap;
          justify-content: center;
        }
        .pt-footer-link {
          color: #000;
          text-decoration: none;
          font-size: 14px;
          line-height: 1.2;
        }
        .pt-footer-link:hover,
        .pt-footer-link:focus-visible {
          text-decoration: underline;
        }
      `}</style>

      <nav aria-label="Footer navigation" className="pt-footer-nav">
        <Link href="/about" className="pt-footer-link">About</Link>
        <Link href="/contact" className="pt-footer-link">Contact</Link>
        <Link href="/privacy" className="pt-footer-link">Privacy</Link>
      </nav>
    </footer>
  );
}