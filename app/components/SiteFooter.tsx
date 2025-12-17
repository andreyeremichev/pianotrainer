import Link from "next/link";

export default function SiteFooter() {
  return (
    <footer
      style={{
        borderTop: "1px solid #ddd",
        padding: "16px 16px",
        background: "#fff",
      }}
      aria-label="Footer"
    >
      <div
        style={{
          maxWidth: 980,
          margin: "0 auto",
          display: "flex",
          flexWrap: "wrap",
          gap: 14,
          alignItems: "center",
          justifyContent: "center",
          fontSize: 14,
        }}
      >
        <Link href="/learn" style={linkStyle}>Learn</Link>
        <Link href="/about" style={linkStyle}>About</Link>
        <Link href="/contact" style={linkStyle}>Contact</Link>
        <Link href="/privacy" style={linkStyle}>Privacy</Link>
      </div>

      <div style={{ textAlign: "center", marginTop: 10, fontSize: 12, color: "#666" }}>
        © {new Date().getFullYear()} PianoTrainer
      </div>
    </footer>
  );
}

const linkStyle: React.CSSProperties = {
  color: "#000",
  textDecoration: "none",
  fontWeight: 600,
};