export const metadata = {
  title: "Notation Trainer • PianoTrainer",
  description:
    "Beginner-friendly notation drills: random notes on a grand stave, keys-to-notes mapping, chords, and intervals. Train treble & bass clefs with whole notes.",
};

import Link from "next/link";
import SiteHeader from "../../components/SiteHeader";

type Item = {
  label: string;
  href?: string;          // if missing → coming soon
  desc: string;
  badge?: "New" | "Soon";
  icon?: React.ReactNode; // emoji/glyph
};

const items: Item[] = [
  {
    label: "Random Notes",
    href: "/trainer/notation/random-notes",
    badge: "New",
    icon: <span aria-hidden="true" style={{ fontSize: 18 }}>🎼</span>,
    desc:
      "See a single whole note on a fixed grand stave (treble + bass). Read it, play it on the keyboard, and get instant audio feedback. Great daily warm-up.",
  },
  {
    label: "Keys to Notes",
    href: "/trainer/notation/keys-to-notes",
    badge: "New",
    icon: <span aria-hidden="true" style={{ fontSize: 18 }}>🎼</span>,
    desc:
      "Press any piano key to reveal its exact notation on the stave. Build instant links between keyboard positions and note names.",
  },
  {
    label: "Chords",
    href: "/trainer/notation/chords",
    badge: "New",
    icon: <span aria-hidden="true" style={{ fontSize: 18 }}>🎼</span>,
    desc:
      "Simple stacked notes (triads first), shown as half-note chord shapes. Learn how chords look across treble and bass clefs.",
  },
  {
    label: "Intervals (Notation)",
    href: "/trainer/notation/intervals",
    badge: "New",
    icon: <span aria-hidden="true" style={{ fontSize: 18 }}>🎼</span>,
    desc:
      "Second to octave, sharps & flats, ascending/descending. Recognize interval spacing on the stave and connect it to finger movement.",
  },
];

function Card({ item }: { item: Item }) {
  const body = (
    <>
      <span className="card-icon">{item.icon ?? <span aria-hidden="true">🎼</span>}</span>
      <span className="card-main">
        <span className="card-title">
          {item.label}
          {item.badge && <span className={`badge ${item.badge.toLowerCase()}`}>{item.badge}</span>}
        </span>
        <span className="card-desc">{item.desc}</span>
      </span>
    </>
  );

  return item.href ? (
    <Link href={item.href} className="card" prefetch>
      {body}
    </Link>
  ) : (
    <span className="card disabled" aria-disabled="true" title="Coming soon">
      {body}
    </span>
  );
}

export default function NotationHubPage() {
  return (
    <>
      {/* Global header at top (trainer pages use their own inline header) */}
      <SiteHeader />

      <main className="notation-hub">
        <style>{`
          .notation-hub { max-width: 1100px; margin: 0 auto; padding: 16px; }

          header.hdr { margin: 6px 0 14px; }
          .hdr h1 { margin: 0 0 6px 0; font-size: 26px; letter-spacing: 0.2px; }
          .hdr p { margin: 0; color: #444; font-size: 15px; }

          .grid { display: grid; gap: 12px; grid-template-columns: 1fr; }
          @media (min-width: 820px) {
            .grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
          }

          .card {
            display: grid;
            grid-template-columns: 28px 1fr;
            gap: 10px;
            align-items: start;
            padding: 12px;
            border: 1px solid #eee;
            border-radius: 8px;
            text-decoration: none;
            background: #fff;
            color: inherit;
            transition: background 0.15s ease, border-color 0.15s ease;
          }
          .card:hover, .card:focus-visible { background:#fafafa; border-color:#eaeaea; }
          .card.disabled { opacity: 0.6; cursor: default; pointer-events: none; }

          .card-icon { display: inline-flex; align-items: center; justify-content: center; line-height: 1; }

          .card-title { font-weight: 700; display: inline-flex; gap: 8px; align-items: baseline; }
          .card-desc { display: block; font-size: 13px; color: #555; margin-top: 3px; }

          .badge {
            border: 1px solid #ddd;
            padding: 1px 6px;
            border-radius: 999px;
            font-size: 11px;
            line-height: 1.2;
            color: #222;
            background: #f7f7f7;
          }
          .badge.new { border-color: #b2f2bb; background: #e9fbe9; }
          .badge.soon { border-color: #ffe066; background: #fff7d1; }

          /* Accessibility */
          .card:focus-visible { outline: 2px solid #2684ff; outline-offset: 2px; }
        `}</style>

        <header className="hdr" aria-label="Notation Trainer">
          <h1>Notation Trainer</h1>
          <p>
            Learn to read music on a <strong>grand stave</strong> the beginner-friendly way:
            one whole note at a time, clear visuals, and immediate audio feedback. Start with{" "}
            <Link href="/trainer/notation/random-notes">Random Notes</Link>, then add keyboard
            mapping, chords, and interval spacing.
          </p>
        </header>

        <section className="grid" aria-label="Modes">
          {items.map((item) => (
            <Card key={item.label} item={item} />
          ))}
        </section>

        <section style={{ marginTop: 18 }}>
          <h2 style={{ fontSize: 18, margin: "0 0 6px 0" }}>Tips for beginners</h2>
          <ul style={{ margin: 0, paddingLeft: 18, color: "#555", fontSize: 13, lineHeight: 1.45 }}>
            <li>Say the note name out loud while you play it — it speeds up recognition.</li>
            <li>Use guide notes (C4, G4, F3) as landmarks to “jump” from, instead of counting lines each time.</li>
            <li>Short sessions (3–5 minutes) beat long ones. Aim for daily streaks.</li>
          </ul>
        </section>
      
<script
  type="application/ld+json"
  dangerouslySetInnerHTML={{
    __html: JSON.stringify(
      {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        "@id": "https://pianotrainer.app/trainer/notation",
        url: "https://pianotrainer.app/trainer/notation",
        name: "Notation Trainer Hub • PianoTrainer",
        description:
          "Practice reading notes on a fixed grand staff: Random Notes, Keys to Notes, and Intervals. Beginner-friendly, free, and browser-based.",
        isPartOf: {
          "@type": "WebSite",
          url: "https://pianotrainer.app",
          name: "PianoTrainer",
        },
        publisher: {
          "@type": "Organization",
          name: "PianoTrainer",
          url: "https://pianotrainer.app",
        },
        mainEntity: {
          "@type": "ItemList",
          itemListOrder: "http://schema.org/ItemListOrderAscending",
          numberOfItems: 3,
          itemListElement: [
            {
              "@type": "ListItem",
              position: 1,
              url: "https://pianotrainer.app/trainer/notation/random-notes",
              name: "Random Notes",
              description:
                "Read & play single notes on a grand staff. Whole notes, brace + connectors always visible.",
            },
            {
              "@type": "ListItem",
              position: 2,
              url: "https://pianotrainer.app/trainer/notation/keys-to-notes",
              name: "Keys to Notes",
              description:
                "Press any key (C2–C6) and instantly see the correct note on the staff; plays audio with correct enharmonics.",
            },
            {
              "@type": "ListItem",
              position: 3,
              url: "https://pianotrainer.app/trainer/notation/intervals",
              name: "Intervals (Sequential)",
              description:
                "Two-note intervals: play lower then upper note to pass. Shows interval name on success.",
            }
          ],
        },
      },
      null,
      2
    ),
  }}
/>
      </main>
    </>
  );
}