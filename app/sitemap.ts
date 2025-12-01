// app/sitemap.ts
export default async function sitemap() {
  const base = "https://pianotrainer.app";
  const nowISO = new Date().toISOString();

  const high = { changeFrequency: "weekly" as const, priority: 0.8 };
  const mid  = { changeFrequency: "monthly" as const, priority: 0.6 };
  const low  = { changeFrequency: "yearly" as const, priority: 0.4 };

  return [
    // Toys hub and pages
    { url: `${base}/toys`, lastModified: nowISO, ...high },
    { url: `${base}/toys/key-clock`, lastModified: nowISO, ...high },
    { url: `${base}/toys/tone-dial`, lastModified: nowISO, ...high },
    { url: `${base}/toys/text-to-tone`, lastModified: nowISO, ...high },
    { url: `${base}/toys/shape-of-harmony`, lastModified: nowISO, ...high },

    // Homepage
    { url: `${base}/`, lastModified: nowISO, ...high },

    // Emotional Tools & Guides
    { url: `${base}/learn/two-paths-of-harmony`, lastModified: nowISO, ...high },
    { url: `${base}/learn/path-of-flow`, lastModified: nowISO, ...high },
    { url: `${base}/learn/path-of-color`, lastModified: nowISO, ...high },

    // Trainers (Train)
    { url: `${base}/train`, lastModified: nowISO, ...mid },
    { url: `${base}/train/notation`, lastModified: nowISO, ...mid },
    { url: `${base}/train/notation/random-notes`, lastModified: nowISO, ...mid },
    { url: `${base}/train/notation/keys-to-notes`, lastModified: nowISO, ...mid },
    { url: `${base}/train/notation/chords-helper`, lastModified: nowISO, ...mid },
    { url: `${base}/train/notation/intervals`, lastModified: nowISO, ...mid },
    { url: `${base}/train/ear`, lastModified: nowISO, ...mid },
    { url: `${base}/train/ear/intervals`, lastModified: nowISO, ...mid },
    { url: `${base}/train/ear/degrees`, lastModified: nowISO, ...mid },

    // Learn section
    { url: `${base}/learn`, lastModified: nowISO, ...mid },
    { url: `${base}/learn/spin-circle-of-fifths`, lastModified: nowISO, ...low },
    { url: `${base}/learn/intervals-guide`, lastModified: nowISO, ...low },
    { url: `${base}/learn/turn-the-stave-into-sound`, lastModified: nowISO, ...low },
    { url: `${base}/learn/why-these-numbers`, lastModified: nowISO, ...low },
    { url: `${base}/learn/why-these-notes`, lastModified: nowISO, ...low },
    { url: `${base}/learn/numbers-circle`, lastModified: nowISO, ...low },
    { url: `${base}/learn/chords-circle`, lastModified: nowISO, ...low },
    { url: `${base}/learn/text-to-tone-chaos`, lastModified: nowISO, ...low },

    // Site pages
    { url: `${base}/about`, lastModified: nowISO, ...low },
    { url: `${base}/contact`, lastModified: nowISO, ...low },
    { url: `${base}/privacy`, lastModified: nowISO, ...low },
  ];
}