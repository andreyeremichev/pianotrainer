export default function robots() {
  return {
    rules: [{ userAgent: "*", allow: "/" }],
    sitemap: "https://pianotrainer.app/sitemap.xml",
    host: "https://pianotrainer.app",
  };
}
