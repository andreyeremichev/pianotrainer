// app/sitemap.ts
export default async function sitemap() {
  const base = "https://pianotrainer.app";
  const now = new Date();

  return [
    // Viral / shareable tools
    { url: `${base}/viral/key-clock`, lastModified: now },
    { url: `${base}/viral/tone-dial`, lastModified: now },
    { url: `${base}/viral/text-to-tone`, lastModified: now },

    // Core site + trainers
    { url: `${base}/`, lastModified: now },
    { url: `${base}/trainer/notation/random-notes`, lastModified: now },
    { url: `${base}/trainer/notation/keys-to-notes`, lastModified: now },
    { url: `${base}/trainer/notation/chords`, lastModified: now },
    { url: `${base}/trainer/notation/intervals`, lastModified: now },
    { url: `${base}/trainer/ear/circle-of-fifths`, lastModified: now },
    { url: `${base}/trainer/ear/intervals`, lastModified: now },
    { url: `${base}/trainer/ear/progressions`, lastModified: now },

    // Learn section
    { url: `${base}/learn/how-to-read-music`, lastModified: now },
    { url: `${base}/learn/ear-training-for-beginners`, lastModified: now },
    { url: `${base}/learn/circle-of-fifths-explained`, lastModified: now },
    { url: `${base}/learn/intervals-guide`, lastModified: now },
    { url: `${base}/learn/glossary`, lastModified: now },
    { url: `${base}/learn/why-these-numbers`, lastModified: now },

    // Site pages
    { url: `${base}/about`, lastModified: now },
    { url: `${base}/contact`, lastModified: now },
    { url: `${base}/privacy`, lastModified: now },
    { url: `${base}/terms`, lastModified: now },
  ];
}