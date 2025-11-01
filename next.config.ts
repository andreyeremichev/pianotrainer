// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              // Scripts: GA4, Vercel Analytics
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://va.vercel-scripts.com /_vercel/insights/script.js https://*.vercel-insights.com",
              "script-src-elem 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://va.vercel-scripts.com /_vercel/insights/script.js https://*.vercel-insights.com",
              // XHR/beacons: GA regional, GTM, Vercel Analytics
              "connect-src 'self' https://*.google-analytics.com https://www.googletagmanager.com https://*.vercel-insights.com /_vercel/insights/v1/events",
              // Images: GA/DoubleClick pixels
              "img-src 'self' data: blob: https://*.google-analytics.com https://stats.g.doubleclick.net",
              // ✅ AudioWorklet / Web Workers for Tone.js
              "worker-src 'self' blob:",

              // ✅ Allow playing local wav samples (/audio/notes/*.wav)
              "media-src 'self'",
              // ✅ Google Fonts CSS
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              // ✅ Google Fonts files
              "font-src 'self' data: https://fonts.gstatic.com",
              "frame-src 'self'",
            ].join("; "),
          },
        ],
      },
    ];
  },

  async redirects() {
    return [
      // Phase A: move /viral → /toys (preserve all subpaths)
      { source: "/viral", destination: "/toys", permanent: true },
      { source: "/viral/:slug*", destination: "/toys/:slug*", permanent: true },

      // Phase B: move /trainer → /train (preserve subpaths)
{ source: "/trainer", destination: "/train", permanent: true },
{ source: "/trainer/notation", destination: "/train/notation", permanent: true },
{ source: "/trainer/notation/:slug*", destination: "/train/notation/:slug*", permanent: true },
{ source: "/trainer/ear", destination: "/train/ear", permanent: true },
{ source: "/trainer/ear/:slug*", destination: "/train/ear/:slug*", permanent: true },
    ];
  },
};

export default nextConfig;