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
              // XHR / beacons
              "connect-src 'self' https://*.google-analytics.com https://www.googletagmanager.com https://*.vercel-insights.com /_vercel/insights/v1/events",
              // Images
              "img-src 'self' data: blob: https://*.google-analytics.com https://stats.g.doubleclick.net",
              // Audio / Workers (Tone.js)
              "worker-src 'self' blob:",
              "media-src 'self'",
              // Fonts
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
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
      // =====================================================
      // Emotional Harmony → EmotionalChords.app (canonical)
      // =====================================================
      {
        source: "/learn/two-paths-of-harmony",
        destination: "https://emotionalchords.app/learn/paths-of-harmony",
        permanent: true,
      },

      // =====================================================
      // Toys → MusicalToys.app (canonical)
      // =====================================================
      {
        source: "/toys",
        destination: "https://musicaltoys.app/toys",
        permanent: true,
      },
      {
        source: "/toys/:slug*",
        destination: "https://musicaltoys.app/toys/:slug*",
        permanent: true,
      },

      // Toy explainers → MusicalToys.app
      {
        source: "/learn/why-these-notes",
        destination: "https://musicaltoys.app/learn/why-these-notes",
        permanent: true,
      },
      {
        source: "/learn/why-these-numbers",
        destination: "https://musicaltoys.app/learn/why-these-numbers",
        permanent: true,
      },

      // =====================================================
      // Legacy redirects (kept for SEO continuity)
      // =====================================================

      // Old viral → toys
      {
        source: "/viral",
        destination: "/toys",
        permanent: true,
      },
      {
        source: "/viral/:slug*",
        destination: "/toys/:slug*",
        permanent: true,
      },

      // Old trainer → train
      {
        source: "/trainer",
        destination: "/train",
        permanent: true,
      },
      {
        source: "/trainer/notation",
        destination: "/train/notation",
        permanent: true,
      },
      {
        source: "/trainer/notation/:slug*",
        destination: "/train/notation/:slug*",
        permanent: true,
      },
      {
        source: "/trainer/ear",
        destination: "/train/ear",
        permanent: true,
      },
      {
        source: "/trainer/ear/:slug*",
        destination: "/train/ear/:slug*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;