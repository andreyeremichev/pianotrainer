import Link from "next/link";

export default function SiteFooter() {
  return (
    <footer role="contentinfo" aria-label="Footer" style={{
      padding: "16px 12px",
      borderTop: "1px solid #e5e5e5",
      marginTop: 24
    }}>
      <nav aria-label="Footer navigation" style={{
        display: "flex",
        gap: 16,
        flexWrap: "wrap",
        justifyContent: "center"
      }}>
        <Link href="/about">About</Link>
        <Link href="/contact">Contact</Link>
        <Link href="/privacy">Privacy</Link>
      </nav>
    </footer>
  );
}