export const metadata = {
  title: "PianoTrainer • Free Notation & Ear Training for Beginners",
  description:
    "Practice reading music and training your ear with beginner-friendly drills. Random notes, keys to notes, intervals, circle of fifths and more — free on PianoTrainer.",
};

import Link from "next/link";

type Item = {
  label: string;
  href?: string;          // if missing → coming soon
  desc?: string;
  badge?: "New" | "Soon";
  icon?: React.ReactNode; // emoji or glyph
};

/* ---- Notation (left) ---- */
const notationItems: Item[] = [
  {
    label: "Random Notes",
    href: "/trainer/notation/random-notes",
    desc: "Read a single whole note on a grand staff and play it.",
    badge: "New",
    icon: <span aria-hidden="true" style={{ fontSize: 18 }}>🎼</span>,
  },
  {
    label: "Keys to Notes",
    // href: "/trainer/notation/keys-to-notes", // enable when live
    desc: "Press any key; see its exact note on the stave.",
    badge: "Soon",
    icon: <span aria-hidden="true" style={{ fontSize: 18 }}>🎼</span>,
  },
  {
    label: "Chords",
    desc: "Beginner chord stacks across treble and bass clefs.",
    badge: "Soon",
    icon: <span aria-hidden="true" style={{ fontSize: 18 }}>🎼</span>,
  },
  {
    label: "Intervals (Notation)",
    desc: "Seconds to octaves with sharps & flats, both clefs.",
    badge: "Soon",
    icon: <span aria-hidden="true" style={{ fontSize: 18 }}>🎼</span>,
  },
];

/* ---- Ear (right) ---- */
const earItems: Item[] = [
  {
    label: "Circle of Fifths",
    // href: "/trainer/ear/circle-of-fifths",
    desc: "Drone + quick key recognition across the circle.",
    badge: "Soon",
    icon: <span aria-hidden="true" style={{ fontSize: 18 }}>🧭</span>,
  },
  {
    label: "Intervals (Ear)",
    // href: "/trainer/ear/intervals",
    desc: "Identify intervals by ear with simple references.",
    badge: "Soon",
    icon: <span aria-hidden="true" style={{ fontSize: 18 }}>👂</span>,
  },
  {
    label: "Progressions",
    // href: "/trainer/ear/progressions",
    desc: "I–IV–V and minor basics — listen and respond.",
    badge: "Soon",
    icon: <span aria-hidden="true" style={{ fontSize: 18 }}>🎧</span>,
  },
];

function ListItem({ item }: { item: Item }) {
  const body = (
    <>
      <span className="item-left">
        <span className="glyph" aria-hidden="true">
          {item.icon}
        </span>
      </span>
      <span className="item-main">
        <span className="item-title">
          {item.label}
          {item.badge && (
            <span className={`badge ${item.badge.toLowerCase()}`}>{item.badge}</span>
          )}
        </span>
        {item.desc && <span className="item-desc">{item.desc}</span>}
      </span>
    </>
  );

  return item.href ? (
    <Link href={item.href} className="item-link" prefetch>
      {body}
    </Link>
  ) : (
    <span className="item-link disabled" aria-disabled="true" title="Coming soon">
      {body}
    </span>
  );
}

export default function HomePage() {
  return (
    <main className="home">
      <style>{`
        .home {
          max-width: 1100px;
          margin: 0 auto;
          padding: 16px;
        }

        /* Hero */
        .hero {
          text-align: center;
          margin: 18px 0 10px;
        }
        .hero h1 {
          margin: 0;
          font-size: 26px;
          letter-spacing: 0.2px;
        }
        .hero p {
          margin: 6px 0 0;
          color: #444;
          font-size: 15px;
        }

        /* Two-column split on wide; single column on narrow/portrait */
        .split {
          display: grid;
          grid-template-columns: 1fr;
          gap: 14px;
          margin-top: 20px;
        }
        @media (min-width: 820px) {
          .split {
            grid-template-columns: 1fr min-content 1fr;
            align-items: start;
          }
          .divider {
            width: 1px;
            align-self: stretch;
            background: #e5e5e5;
          }
        }

        .section h2 {
          margin: 0 0 8px 0;
          font-size: 18px;
        }

        /* Lists */
        .list {
          display: grid;
          gap: 8px;
        }
        .item-link {
          display: grid;
          grid-template-columns: 28px 1fr;
          align-items: start;
          gap: 10px;
          padding: 10px 10px;
          border: 1px solid #eee;
          border-radius: 8px;
          text-decoration: none;
          background: #fff;
          transition: background 0.15s ease, border-color 0.15s ease;
          color: inherit;
        }
        .item-link:hover,
        .item-link:focus-visible {
          background: #fafafa;
          border-color: #eaeaea;
        }
        .item-link.disabled {
          opacity: 0.6;
          cursor: default;
          pointer-events: none;
        }

        .glyph {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          line-height: 1;
        }

        .item-title {
          font-weight: 600;
          display: inline-flex;
          gap: 8px;
          align-items: baseline;
        }
        .item-desc {
          display: block;
          font-size: 13px;
          color: #555;
          margin-top: 2px;
        }

        /* Badges */
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
        .item-link:focus-visible {
          outline: 2px solid #2684ff;
          outline-offset: 2px;
        }
      `}</style>

      {/* Hero copy */}
      <section className="hero" aria-label="Welcome">
        <h1>Train your eyes & ears — the beginner way</h1>
        <p>Start with Random Notes, then add keys, intervals, and ear drills.</p>
      </section>

      {/* Split lists */}
      <section className="split" aria-label="Training Modes">
        <div className="section" aria-labelledby="notation-h2">
          <h2 id="notation-h2">Notation Trainer</h2>
          <div className="list">
            {notationItems.map((item) => (
              <ListItem key={item.label} item={item} />
            ))}
          </div>
        </div>

        {/* thin divider on wide screens */}
        <div className="divider" aria-hidden="true" />

        <div className="section" aria-labelledby="ear-h2">
          <h2 id="ear-h2">Ear Trainer</h2>
          <div className="list">
            {earItems.map((item) => (
              <ListItem key={item.label} item={item} />
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}