// app/layout.tsx
console.log("[LAYOUT check] layout rendered");

import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import DebugAnalytics from "@/components/DebugAnalytics";
import GoogleAnalytics from "@/components/GoogleAnalytics";

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
        <meta name="msvalidate.01" content="6B32F30D3DC40A3363DDE19B59463696" />
        <meta name="google-site-verification" content="97JqwoELP-_-A7Nfkk5k2TE6vaCfI5Qtb9ewU1Wgn90" />
      </head>
      <body>
        {children}
        {/* <DebugAnalytics /> */}
<GoogleAnalytics />
<Analytics />
<SpeedInsights />

      </body>
    </html>
  );
}