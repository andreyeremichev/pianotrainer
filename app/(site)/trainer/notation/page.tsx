import Link from "next/link";

export const metadata = {
  title: "Notation Playground • PianoTrainer",
  description:
    "Play with notation! Random notes, intervals, chords, and more — all free, browser-based, and beginner-friendly.",
};

export default function NotationHubPage() {
  const styles = {
    page: {
      maxWidth: "900px",
      margin: "0 auto",
      padding: "20px 12px",
    },
    header: {
      textAlign: "center" as const,
      marginBottom: 24,
    },
    h1: {
      fontSize: 28,
      fontWeight: 800,
      marginBottom: 6,
    },
    p: {
      fontSize: 16,
      color: "#555",
    },
    card: {
      position: "relative" as const,
      border: "1px solid #ddd",
      borderRadius: 12,
      padding: "16px",
      marginBottom: 16,
      background: "#fff",
    },
    pill: {
      position: "absolute" as const,
      top: -10,
      right: -10,
      background: "#EBCF7A", // gold
      color: "#081019",
      fontSize: 12,
      fontWeight: 700,
      padding: "2px 8px",
      borderRadius: 999,
      border: "1px solid #c9b15e",
    },
    cardTitle: {
      fontSize: 20,
      fontWeight: 700,
      marginBottom: 8,
    },
    cardText: {
      fontSize: 15,
      marginBottom: 10,
      color: "#333",
    },
    cta: {
      display: "inline-block",
      marginTop: 4,
      background: "#EBCF7A",
      color: "#081019",
      fontWeight: 700,
      padding: "8px 14px",
      borderRadius: 8,
      textDecoration: "none",
    },
  };

  return (
    <main style={styles.page}>
      <style>{`
        /* Portrait: show portrait notice, hide bottom one */
        @media (max-width: 820px), (orientation: portrait) {
          .portrait-notice { display: block; }
          .landscape-notice { display: none; }
        }

        /* Landscape / desktop: show bottom notice only */
        @media (min-width: 821px) and (orientation: landscape) {
          .portrait-notice { display: none; }
          .landscape-notice { display: block; }
        }
      `}</style>

      <header style={styles.header}>
        <h1 style={styles.h1}>🎹 Notation Playground</h1>
        <p style={styles.p}>
          Notes and harmony turned playful. Spot them, stack them, and let your
          eyes and fingers sync up.
        </p>
      </header>

      {/* Random Notes */}
      <article style={styles.card}>
        <span style={styles.pill}>👀 Live</span>
        <h2 style={styles.cardTitle}>Random Notes</h2>
        <p style={styles.cardText}>
          Your treasure map starts here. Find the magic guide notes (C, F, G)
          and the rest of the stave suddenly makes sense.
        </p>
        <Link href="/trainer/notation/random-notes" style={styles.cta}>
          Catch Random Notes →
        </Link>
      </article>

      {/* Portrait-only notice, shown immediately after Random Notes */}
      <div
        className="portrait-notice"
        style={{
          marginTop: 12,
          marginBottom: 12,
          padding: "10px 14px",
          background: "#f8f8f8",
          border: "1px solid #ddd",
          borderRadius: 10,
          textAlign: "center",
          fontSize: 14,
          color: "#444",
        }}
      >
        📱 <strong>Heads up!</strong> Trainers shine best in{" "}
        <em>landscape</em>. Rotate your phone sideways to see the full stave +
        keyboard.
      </div>

      {/* Intervals */}
      <article style={styles.card}>
        <span style={styles.pill}>👂 Live</span>
        <h2 style={styles.cardTitle}>Intervals</h2>
        <p style={styles.cardText}>
          Listen with your eyes. Seconds to octaves drawn on the stave — and lit
          up on the keys.
        </p>
        <Link href="/trainer/notation/intervals" style={styles.cta}>
          Spot Intervals →
        </Link>
      </article>

      {/* Chords */}
      <article style={styles.card}>
        <span style={styles.pill}>🎶 Live</span>
        <h2 style={styles.cardTitle}>Chords</h2>
        <p style={styles.cardText}>
          Stacks of sound! Major and minor triads you can see, hear, and name on
          sight.
        </p>
        <Link href="/trainer/notation/chords" style={styles.cta}>
          Play Chords →
        </Link>
      </article>

      {/* Chords Helper */}
      <article style={styles.card}>
        <span style={styles.pill}>🎹 Live</span>
        <h2 style={styles.cardTitle}>Chords Helper</h2>
        <p style={styles.cardText}>
          Your harmony sandbox. Swipe through all seven chords in any key and
          watch them light up.
        </p>
        <Link href="/trainer/notation/chords-helper" style={styles.cta}>
          Explore Chords →
        </Link>
      </article>

      {/* Keys to Notes */}
      <article style={styles.card}>
        <span style={styles.pill}>✨ Live</span>
        <h2 style={styles.cardTitle}>Keys to Notes</h2>
        <p style={styles.cardText}>
          Every key press paints a note on the stave. Your keyboard and the
          staff finally in sync.
        </p>
        <Link href="/trainer/notation/keys-to-notes" style={styles.cta}>
          Try Keys to Notes →
        </Link>
      </article>

      {/* Landscape-only notice at the bottom */}
      <div
        className="landscape-notice"
        style={{
          marginTop: 24,
          marginBottom: 24,
          padding: "10px 14px",
          background: "#f8f8f8",
          border: "1px solid #ddd",
          borderRadius: 10,
          textAlign: "center",
          fontSize: 14,
          color: "#444",
        }}
      >
        📱 <strong>Heads up!</strong> Trainers shine best in{" "}
        <em>landscape</em>. Rotate your phone sideways to see the full stave +
        keyboard.
      </div>
    </main>
  );
}