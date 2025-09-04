
// app/learn/page.tsx
import Link from "next/link";

export const metadata = {
  title: "Learn Hub • PianoTrainer",
  description:
    "Your starting point for reading music, intervals, circle of fifths, and ear training — with simple, focused guides.",
};

export default function LearnHubPage() {
  return (
    <main aria-labelledby="learn-hub-title" style={sx.page}>
      {/* Header */}
      <header style={sx.header}>
        <div style={sx.headerInner}>
          <h1 id="learn-hub-title" style={sx.h1}>Learn Hub</h1>
          <p style={sx.p}>
            Build solid foundations with concise, visual guides. Start with reading music,
            then branch out to intervals, the circle of fifths, and beginner-friendly ear training.
          </p>
          <div style={sx.actions}>
            <Link href="/" style={sx.btn} aria-label="Back to Home">
              ← Home
            </Link>
          </div>
        </div>
      </header>

      {/* Grid of learn items */}
      <section aria-label="Learn topics" style={sx.grid}>
        {/* NOW — How to Read Music */}
        <article style={sx.card}>
          <div style={sx.cardHeader}>
            <h2 style={sx.cardTitle}>
              <Link href="/learn/how-to-read-music" style={sx.cardLink}>
                How to Read Music
              </Link>
            </h2>
            <span style={{ ...sx.badge, ...sx.badgeNow }} aria-label="Available now">Now</span>
          </div>
          <p style={sx.p}>
            Learn the grand staff, guide notes (C2–C6), and how to anchor new notes by steps and skips.
            Includes clear diagrams aligned to a keyboard.
          </p>
          <div style={sx.cardActions}>
            <Link href="/learn/how-to-read-music" style={sx.btnSm} aria-label="Open How to Read Music">
              Open
            </Link>
            
          </div>
        </article>

        {/* SOON — Circle of Fifths */}
        <article style={sx.card}>
          <div style={sx.cardHeader}>
            <h2 style={sx.cardTitle}>
              <span style={sx.cardLinkDisabled}>Circle of Fifths Explained</span>
            </h2>
            <span style={{ ...sx.badge, ...sx.badgeSoon }} aria-label="Coming soon">Soon</span>
          </div>
          <p style={sx.p}>
            A visual map for keys and accidentals. Quickly see related keys, common modulations,
            and practical patterns for learning.
          </p>
          <div style={sx.cardActions}>
            <span style={sx.btnDisabled} aria-disabled="true">Coming soon</span>
          </div>
        </article>

        {/* SOON — Ear Training for Beginners */}
        <article style={sx.card}>
          <div style={sx.cardHeader}>
            <h2 style={sx.cardTitle}>
              <span style={sx.cardLinkDisabled}>Ear Training for Beginners</span>
            </h2>
            <span style={{ ...sx.badge, ...sx.badgeSoon }} aria-label="Coming soon">Soon</span>
          </div>
          <p style={sx.p}>
            Step-by-step listening drills to recognize tonic, direction, and simple patterns —
            built for daily 5–10 minute sessions.
          </p>
          <div style={sx.cardActions}>
            <span style={sx.btnDisabled} aria-disabled="true">Coming soon</span>
          </div>
        </article>

        {/* SOON — Intervals Guide */}
        <article style={sx.card}>
          <div style={sx.cardHeader}>
            <h2 style={sx.cardTitle}>
              <span style={sx.cardLinkDisabled}>Intervals Guide</span>
            </h2>
            <span style={{ ...sx.badge, ...sx.badgeSoon }} aria-label="Coming soon">Soon</span>
          </div>
          <p style={sx.p}>
            Understand unisons to octaves with crisp, side-by-side examples on staff and keyboard.
            Mnemonics, shapes, and quick checks.
          </p>
          <div style={sx.cardActions}>
            <span style={sx.btnDisabled} aria-disabled="true">Coming soon</span>
          </div>
        </article>
      </section>

      {/* Footer */}
      <footer style={sx.footer}>
        <div style={sx.footerInner}>
          <p style={{ margin: 0 }}>
            Have feedback or requests?{" "}
            <Link href="/contact" style={sx.footerLink}>Tell us what to build next</Link>.
          </p>
        </div>
      </footer>
    </main>
  );
}

const sx: Record<string, React.CSSProperties> = {
  page: { maxWidth: 980, margin: "0 auto", padding: "16px 20px 40px" },
  header: { background: "#f8fafc", border: "1px solid #e5e7eb", borderRadius: 12, padding: 16, marginBottom: 20 },
  headerInner: { maxWidth: 920, margin: "0 auto" },
  h1: { margin: "0 0 8px", fontSize: 32, lineHeight: 1.2 },
  p: {
    margin: "8px 0 12px",
    fontSize: 16,
    lineHeight: 1.6,
    textAlign: "justify",
    hyphens: "auto",
    WebkitHyphens: "auto",
    msHyphens: "auto",
  },
  actions: { display: "flex", gap: 12, flexWrap: "wrap" },
  btn: { border: "1px solid #d1d5db", padding: "8px 12px", borderRadius: 10, textDecoration: "none", color: "#111827", background: "#fff" },

  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
    gap: 16,
  },
  card: {
    border: "1px solid #e5e7eb",
    borderRadius: 12,
    padding: 16,
    background: "#fff",
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  cardHeader: { display: "flex", alignItems: "center", justifyContent: "space-between" },
  cardTitle: { margin: 0, fontSize: 18, lineHeight: 1.3 },
  cardLink: { color: "#111827", textDecoration: "none" },
  cardLinkDisabled: { color: "#6b7280", cursor: "default" },
  cardActions: { display: "flex", gap: 8, flexWrap: "wrap" },
  btnSm: { border: "1px solid #d1d5db", padding: "6px 10px", borderRadius: 10, textDecoration: "none", color: "#111827", background: "#fff", fontSize: 14 },
  btnGhostSm: { border: "1px solid #e5e7eb", padding: "6px 10px", borderRadius: 10, textDecoration: "none", color: "#374151", background: "#f9fafb", fontSize: 14 },
  btnDisabled: { border: "1px dashed #e5e7eb", padding: "6px 10px", borderRadius: 10, color: "#9ca3af", background: "#f9fafb", fontSize: 14 },

  badge: {
    display: "inline-block",
    padding: "2px 8px",
    borderRadius: 999,
    fontSize: 12,
    lineHeight: 1.2,
    border: "1px solid",
  },
  badgeNow: { background: "#ecfdf5", color: "#059669", borderColor: "#a7f3d0" },   // green
  badgeSoon: { background: "#fffbeb", color: "#b45309", borderColor: "#fde68a" }, // amber

  footer: { marginTop: 32, background: "#f8fafc", borderTop: "1px solid #e5e7eb", padding: "16px 0", borderRadius: 12 },
  footerInner: { maxWidth: 920, margin: "0 auto", padding: "0 8px" },
  footerLink: { color: "#1d4ed8", textDecoration: "underline" },
};