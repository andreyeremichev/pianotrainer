// app/trainer/layout.tsx
// NOTE: server file — no "use client"
import SiteHeader from "../components/SiteHeader";

export default function TrainerLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <div
        aria-label="Trainer navigation footer"
        style={{ marginTop: 12, borderTop: "1px solid #1E2935", paddingTop: 8 }}
      >
        <SiteHeader />
      </div>
    </>
  );
}