export const metadata = {
  title: "Logo Preview • PianoTrainer",
  description:
    "Preview of the PianoTrainer logo: horizontal and vertical orientations at multiple sizes.",
};

import StandardLogo from "../../components/logos/StandardLogo";

const SIZES = [28, 36, 46];

function Card({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section
      style={{
        border: "1px solid #e5e5e5",
        borderRadius: 8,
        padding: 16,
        background: "#fff",
      }}
    >
      <h2 style={{ margin: "0 0 12px 0", fontSize: 18 }}>{title}</h2>
      {children}
    </section>
  );
}

export default function LogoPreviewPage() {
  return (
    <main style={{ padding: "20px 16px", maxWidth: 980, margin: "0 auto" }}>
      <h1 style={{ margin: 0 }}>Logo Preview</h1>
      <p style={{ color: "#444", marginTop: 8 }}>
        Compare the PianoTrainer logo in horizontal and vertical orientations
        at common header sizes.
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: 16,
          marginTop: 20,
        }}
      >
        <Card title="Horizontal">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
              gap: 12,
              alignItems: "center",
            }}
          >
            {SIZES.map((h) => (
              <div
                key={`h-${h}`}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <div
                  style={{
                    border: "1px dashed #ddd",
                    borderRadius: 8,
                    padding: 10,
                    width: "100%",
                    display: "grid",
                    placeItems: "center",
                    background: "#fafafa",
                  }}
                >
                  {/* Size via style.height; width:auto preserves ratio */}
                  <StandardLogo style={{ height: h, width: "auto", display: "block" }} />
                </div>
                <div style={{ fontSize: 12, color: "#444" }}>{h}px</div>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Vertical (preview)">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
              gap: 12,
              alignItems: "center",
            }}
          >
            {SIZES.map((h) => (
              <div
                key={`v-${h}`}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <div
                  style={{
                    border: "1px dashed #ddd",
                    borderRadius: 8,
                    padding: 10,
                    width: "100%",
                    display: "grid",
                    placeItems: "center",
                    background: "#fafafa",
                  }}
                >
                  <StandardLogo
                    orientation="vertical"
                    style={{ height: h, width: "auto", display: "block" }}
                  />
                </div>
                <div style={{ fontSize: 12, color: "#444" }}>{h}px</div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <p style={{ color: "#555", marginTop: 20, fontSize: 13 }}>
        Tip: For header usage, 22–28px height usually gives the best clarity while
        keeping the nav compact.
      </p>
    </main>
  );
}