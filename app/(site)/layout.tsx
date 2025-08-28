// app/(site)/layout.tsx
import React from "react";
import "../globals.css"; // keep your global fonts/vars
import SiteHeader from "../components/SiteHeader";
import SiteFooter from "../components/SiteFooter";

/**
 * This layout wraps ALL non-trainer pages:
 * - Home, About, Contact, Privacy, Terms
 * - Hubs: /trainer/notation and /trainer/ear (moved under (site))
 *
 * Pages should NOT render their own header/footer anymore.
 * They can render their own <main className="page"> as usual; or we can wrap here.
 */
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="site-shell">
      <SiteHeader />
      {/* Keep page-level <main className="page"> in each page, or wrap here if you prefer */}
      {children}
      <SiteFooter />
    </div>
  );
}