import Link from "next/link";

export default function HomePage() {
  return (
    <div style={{ padding: 20, textAlign: "center", fontFamily: "sans-serif" }}>
      <h1>Piano Trainer</h1>
      <p>Welcome! Choose a training category:</p>

      <div
        style={{
          display: "flex",
          justifyContent: "center",
          flexWrap: "wrap",
          gap: "40px",
          marginTop: 30,
        }}
      >
        {/* Notes Trainer Box */}
        <div
          style={{
            border: "2px solid #0a2540",
            borderRadius: "8px",
            padding: "20px",
            width: "220px",
            textAlign: "center",
          }}
        >
          <h2 style={{ marginBottom: 15 }}>Notes Trainer</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <Link
              href="/guide-notes"
              style={{
                display: "block",
                padding: "10px",
                border: "1px solid #0a2540",
                borderRadius: "4px",
                textDecoration: "none",
                color: "#0a2540",
                fontWeight: 600,
              }}
            >
              The Guide Notes
            </Link>

            <Link
              href="/notation-random"
              style={{
                display: "block",
                padding: "10px",
                border: "1px solid #0a2540",
                borderRadius: "4px",
                textDecoration: "none",
                color: "#0a2540",
                fontWeight: 600,
              }}
            >
              Random Notes
            </Link>
          </div>
        </div>

        {/* Ear Trainer Box */}
        <div
          style={{
            border: "2px solid #0a2540",
            borderRadius: "8px",
            padding: "20px",
            width: "220px",
            textAlign: "center",
          }}
        >
          <h2 style={{ marginBottom: 15 }}>Ear Trainer</h2>
          <p style={{ fontSize: "14px", color: "#555" }}>Coming soon...</p>
        </div>
      </div>

      {/* Brief Introduction to Notes Trainer Box */}
      <div
        style={{
          border: "2px solid #0a2540",
          borderRadius: "8px",
          padding: "20px",
          width: "480px",
          textAlign: "center",
          margin: "40px auto 0",
        }}
      >
        <h2 style={{ marginBottom: 15 }}>Brief Introduction to Notes Trainer</h2>
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: "20px",
            flexWrap: "wrap",
          }}
        >
          <Link
            href="/how-to-learn-notes"
            style={{
              display: "block",
              padding: "10px",
              border: "1px solid #0a2540",
              borderRadius: "4px",
              textDecoration: "none",
              color: "#0a2540",
              fontWeight: 600,
              width: "180px",
            }}
          >
            How to Learn Notes
          </Link>

          <Link
            href="/keys-to-notes-playing"
            style={{
              display: "block",
              padding: "10px",
              border: "1px solid #0a2540",
              borderRadius: "4px",
              textDecoration: "none",
              color: "#0a2540",
              fontWeight: 600,
              width: "180px",
            }}
          >
            Keys to Notes Playing
          </Link>
        </div>
      </div>
    </div>
  );
}