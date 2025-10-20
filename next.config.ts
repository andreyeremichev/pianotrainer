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
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com /_vercel/insights/script.js https://*.vercel-insights.com",
              // XHR/beacons: GA regional, GTM, Vercel Analytics
              "connect-src 'self' https://*.google-analytics.com https://www.googletagmanager.com https://*.vercel-insights.com /_vercel/insights/v1/events",
              // Images: GA/DoubleClick pixels
              "img-src 'self' data: blob: https://*.google-analytics.com https://stats.g.doubleclick.net",
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
};

export default nextConfig;