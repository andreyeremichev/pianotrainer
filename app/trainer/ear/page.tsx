// app/trainer/ear/page.tsx
export const metadata = {
  title: "Ear Training • PianoTrainer",
  description:
    "Beginner-friendly ear training: scale degrees (piano-only MVP), intervals, and progressions. Practice with clear context and instant feedback.",
};

import Link from "next/link";
import SiteHeader from "../../components/SiteHeader";

type Item = {
  label: string;
  href?: string;
  desc: string;
  badge?: "New" | "Soon";
  icon?: React.ReactNode;
};

const items: Item[] = [
  {
    label: "Degrees (Piano Only)",
    href: "/trainer/ear/circle-of-fifth",
    badge: "New",
    icon: <span aria-hidden="true" style={{ fontSize: 18 }}>🎹</span>,
    desc:
      "Hear a short cadence, then identify scale degrees by ear inside one octave. Clean piano sound, beginner-friendly.",
  },
  {
    label: "Intervals Test",
    href: "/trainer/ear/intervals",
    badge: "Soon",
    icon: <span aria-hidden="true" style={{ fontSize: 18 }}>🛎️</span>,
    desc:
      "Identify melodic or harmonic intervals with instant feedback. Start with seconds & thirds, then expand.",
  },
  {
    label: "Progressions",
    href: "/trainer/ear/progressions",
    badge: "Soon",
    icon: <span aria-hidden="true" style={{ fontSize: 18 }}>🎵</span>,
    desc:
      "Train with short musical patterns to lock in common motion and prepare your ear for real pieces.",
  },
];

function Card({ item }: { item: Item }) {
  const body = (
    <>
      <span className="card-icon">{item.icon ?? <span aria-hidden="true">🎵</span>}</span>
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

export default function EarHubPage() {
  return (
    <>
      {/* ✅ Add the shared header just like Notation */}
      <SiteHeader />

      <main className="ear-hub">
        <style>{`
          .ear-hub { max-width: 1100px; margin: 0 auto; padding: 16px; }

          header.hdr { margin: 6px 0 14px; }
          .hdr h1 { margin: 0 0 6px 0; font-size: 26px; letter-spacing: 0.2px; }
          .hdr p { margin: 0; color: var(--site-muted); font-size: 15px; }

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
          .card-desc { display: block; font-size: 13px; color: var(--site-muted-2); margin-top: 3px; }

          .badge {
            border: 1px solid #ddd;
            padding: 1px 6px;
            border-radius: 999px;
            font-size: 11px;
            line-height: 1.2;
            color: var(--site-text);
            background: #f7f7f7;
          }
          .badge.new { border-color: #b2f2bb; background: #e9fbe9; }
          .badge.soon { border-color: #ffe066; background: #fff7d1; }

          .card:focus-visible { outline: 2px solid #2684ff; outline-offset: 2px; }
        `}</style>

        <header className="hdr" aria-label="Ear Trainer">
          <h1>Ear Trainer</h1>
          <p>
            Build reliable pitch and key-center awareness with focused tools. Start with{" "}
            <Link href="/trainer/ear/circle-of-fifth">Degrees (Piano Only)</Link>, then try Intervals and Progressions.
          </p>
        </header>

        <section className="grid" aria-label="Modes">
          {items.map((item) => (
            <Card key={item.label} item={item} />
          ))}
        </section>

        <section style={{ marginTop: 18 }}>
          <h2 style={{ fontSize: 18, margin: "0 0 6px 0" }}>Quick tips</h2>
          <ul style={{ margin: 0, paddingLeft: 18, color: "#555", fontSize: 13, lineHeight: 1.45 }}>
            <li>Headphones help you hear tuning and interval quality clearly.</li>
            <li>Start with one octave and a few degrees; expand later.</li>
            <li>Short daily sessions (5–10 min) beat long ones.</li>
          </ul>
        </section>

        {/* Optional JSON-LD for the hub page */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(
              {
                "@context": "https://schema.org",
                "@type": "CollectionPage",
                "@id": "https://pianotrainer.app/trainer/ear",
                url: "https://pianotrainer.app/trainer/ear",
                name: "Ear Training Hub • PianoTrainer",
                description:
                  "Practice ear training with Degrees (piano-only), Intervals, and Progressions.",
                isPartOf: {
                  "@type": "WebSite",
                  url: "https://pianotrainer.app",
                  name: "PianoTrainer",
                },
                mainEntity: {
                  "@type": "ItemList",
                  itemListOrder: "http://schema.org/ItemListOrderAscending",
                  numberOfItems: 3,
                  itemListElement: [
                    { "@type": "ListItem", position: 1, url: "https://pianotrainer.app/trainer/ear/circle-of-fifth", name: "Degrees (Piano Only)" },
                    { "@type": "ListItem", position: 2, url: "https://pianotrainer.app/trainer/ear/intervals", name: "Intervals Test" },
                    { "@type": "ListItem", position: 3, url: "https://pianotrainer.app/trainer/ear/progressions", name: "Progressions" }
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