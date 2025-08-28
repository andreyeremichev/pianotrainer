// app/(site)/layout.tsx
import React from "react";
import "../globals.css";             // keep your global fonts/vars
import "./site.css";                 // ← add this line
import SiteHeader from "../components/SiteHeader";
import SiteFooter from "../components/SiteFooter";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="site-shell">
      <SiteHeader />
      {children}                      {/* pages keep their own <main className="page"> */}
      <SiteFooter />
    </div>
  );
}