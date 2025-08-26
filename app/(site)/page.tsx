export const metadata = {
  title: "PianoTrainer • Free Notation & Ear Training for Beginners",
  description:
    "Practice reading music and training your ear with beginner-friendly exercises. Random notes, keys to notes, intervals, circle of fifths and more — free on PianoTrainer.",
};

import Link from "next/link";
import TrebleClef from "../components/icons/TrebleClef";

type Item = {
  label: string;
  href?: string;          // if missing → coming soon
  desc?: string;
  badge?: "New" | "Soon";
  icon?: React.ReactNode; // now SVG/emoji component
};

const notationItems: Item[] = [
  {
    label: "Random Notes",
    href: "/trainer/notation/random-notes",
    desc: "Read a single whole note on a grand staff and play it.",
    badge: "New",
    icon: <TrebleClef size={18} />,
  },
  {
    label: "Keys to Notes",
    href: "/trainer/notation/keys-to-notes", // live when ready
    desc: "Press any key; see its note on the stave.",
    badge: "Soon",
    icon: <TrebleClef size={18} />,
  },
  {
    label: "Chords",
    desc: "Beginner chord stacks on the stave.",
    badge: "Soon",
    icon: <TrebleClef size={18} />,
  },
  {
    label: "Intervals (Notation)",
    desc: "Second to octave, sharps & flats, both clefs.",
    badge: "Soon",
    icon: <TrebleClef size={18} />,
  },
];

const earItems: Item[] = [
  {
    label: "Circle of Fifths",
    href: "/trainer/ear/circle-of-fifths",
    desc: "Drone + recognition test across keys.",
    badge: "Soon",
    icon: <span aria-hidden="true">🧭</span>,
  },
  {
    label: "Intervals (Ear)",
    href: "/trainer/ear/intervals",
    desc: "Identify intervals by ear with helpful references.",
    badge: "Soon",
    icon: <span aria-hidden="true">👂</span>,
  },
  {
    label: "Progressions",
    href: "/trainer/ear/progressions",
    desc: "Common I–IV–V and minor progressions for beginners.",
    badge: "Soon",
    icon: <span aria-hidden="true">🎧</span>,
  },
];

const learnItems: Item[] = [
  {
    label: "How to Read Music",
    href: "/learn/how-to-read-music",
    desc: "Clefs, ledger lines, accidentals, and rhythm basics.",
  },
  {
    label: "Ear Training for Beginners",
    href: "/learn/ear-training-for-beginners",
    desc: "Simple strategies to recognize notes and intervals.",
  },
  {
    label: "Circle of Fifths Explained",
    href: "/learn/circle-of-fifths-explained",
    desc: "Keys, sharps & flats, and why it matters.",
  },
  {
    label: "Intervals Guide",
    href: "/learn/intervals-guide",
    desc: "From minor 2nds to octaves with examples.",
  },
];

function ListItem({ item }: { item: Item }) {
  const body = (
    <>
      <span className="item-left">
        <span className="glyph" aria-hidden="true">
          {item.icon ?? <TrebleClef size={18} />}
        </span>
      </span>
      <span className="item-main">
        <span className="item-title">
          {item.label}
          {item.badge && <span className={`badge ${item.badge.toLowerCase()}`}>{item.badge}</span>}
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

        .learn {
          margin-top: 22px;
        }
        .learn-grid {
          display: grid;
          gap: 8px;
        }
        @media (min-width: 820px) {
          .learn-grid {
            grid-template-columns: repeat(2, minmax(0,1fr));
          }
        }
        .learn a {
          display: block;
          padding: 10px 12px;
          border: 1px solid #eee;
          border-radius: 8px;
          text-decoration: none;
          background: #fff;
          transition: background 0.15s ease, border-color 0.15s ease;
          color: inherit;
        }
        .learn a:hover,
        .learn a:focus-visible {
          background: #fafafa;
          border-color: #eaeaea;
        }

        .item-link:focus-visible, .learn a:focus-visible {
          outline: 2px solid #2684ff;
          outline-offset: 2px;
        }
      `}</style>

      <section className="hero" aria-label="Welcome">
        <h1>Train your eyes & ears — the beginner way</h1>
        <p>Start with Random Notes, then add keys, intervals, and ear drills.</p>
      </section>

      <section className="split" aria-label="Training Modes">
        <div className="section" aria-labelledby="notation-h2">
          <h2 id="notation-h2">Notation Trainer</h2>
          <div className="list">
            {notationItems.map((item) => (
              <ListItem key={item.label} item={item} />
            ))}
          </div>
        </div>

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

      <section className="learn" aria-label="Learn Guides">
        <h2 style={{ margin: "0 0 8px 0", fontSize: 18 }}>Learn (Guides)</h2>
        <div className="learn-grid">
          {learnItems.map((g) =>
            g.href ? (
              <Link key={g.label} href={g.href}>
                <strong>{g.label}</strong>
                <div style={{ fontSize: 13, color: "#555" }}>{g.desc}</div>
              </Link>
            ) : (
              <span key={g.label}>
                <strong>{g.label}</strong>
                <div style={{ fontSize: 13, color: "#555" }}>{g.desc}</div>
              </span>
            )
          )}
        </div>
      </section>
    </main>
  );
}