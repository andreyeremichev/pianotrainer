// app/layout.tsx
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import DebugAnalytics from "@/components/DebugAnalytics";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+Symbols+2:wght@400;700&display=swap"
          rel="stylesheet"
        />
        <meta name="color-scheme" content="light" />
      </head>
      <body>
        {children}
        <DebugAnalytics />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}