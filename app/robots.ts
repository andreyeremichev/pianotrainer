// app/robots.ts
export default function robots() {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        crawlDelay: 2, // polite crawl rate, helps Bing
      },
    ],
    sitemap: "https://pianotrainer.app/sitemap.xml",
    host: "https://pianotrainer.app",
  };
}
