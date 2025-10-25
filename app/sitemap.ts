// app/sitemap.ts
export default async function sitemap() {
  const base = "https://pianotrainer.app";
  const nowISO = new Date().toISOString();

  const high = { changeFrequency: "weekly" as const, priority: 0.8 };
  const mid  = { changeFrequency: "monthly" as const, priority: 0.6 };
  const low  = { changeFrequency: "yearly" as const, priority: 0.4 };

  return [
    // Viral hub + toys (add the hub — you link to it from home)
    { url: `${base}/viral`, lastModified: nowISO, ...high },
    { url: `${base}/viral/key-clock`, lastModified: nowISO, ...high },
    { url: `${base}/viral/tone-dial`, lastModified: nowISO, ...high },
    { url: `${base}/viral/text-to-tone`, lastModified: nowISO, ...high },

    // Homepage (important)
    { url: `${base}/`, lastModified: nowISO, ...high },

    // Trainers (match what you actually link)
    { url: `${base}/trainer/notation/random-notes`, lastModified: nowISO, ...mid },
    { url: `${base}/trainer/notation/keys-to-notes`, lastModified: nowISO, ...mid },
    { url: `${base}/trainer/notation/chords`, lastModified: nowISO, ...mid },
    { url: `${base}/trainer/notation/intervals`, lastModified: nowISO, ...mid },
    { url: `${base}/trainer/ear/circle-of-fifths`, lastModified: nowISO, ...mid },
    { url: `${base}/trainer/ear/intervals`, lastModified: nowISO, ...mid },
    { url: `${base}/trainer/ear/progressions`, lastModified: nowISO, ...mid },
    { url: `${base}/trainer/ear/degrees`, lastModified: nowISO, ...mid }, // ← you link this in the homepage tile

    // Learn section
    { url: `${base}/learn/how-to-read-music`, lastModified: nowISO, ...low },
    { url: `${base}/learn/ear-training-for-beginners`, lastModified: nowISO, ...low },
    { url: `${base}/learn/circle-of-fifths-explained`, lastModified: nowISO, ...low },
    { url: `${base}/learn/intervals-guide`, lastModified: nowISO, ...low },
    { url: `${base}/learn/glossary`, lastModified: nowISO, ...low },
    { url: `${base}/learn/why-these-numbers`, lastModified: nowISO, ...low },

    // Site pages
    { url: `${base}/about`, lastModified: nowISO, ...low },
    { url: `${base}/contact`, lastModified: nowISO, ...low },
    { url: `${base}/privacy`, lastModified: nowISO, ...low },
    { url: `${base}/terms`, lastModified: nowISO, ...low },
  ];
}