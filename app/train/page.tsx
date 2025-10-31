import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Train – Notation & Ear Trainers • PianoTrainer",
  description: "Practice reading and listening skills with simple, interactive trainers.",
  alternates: { canonical: "/train" },
  openGraph: {
    type: "website",
    url: "https://pianotrainer.app/train",
    title: "Train – Notation & Ear Trainers • PianoTrainer",
    description: "Choose a trainer to build your reading and ear skills.",
  },
  robots: { index: true, follow: true },
};

export default function TrainHub() {
  return (
    <main style={{ maxWidth: 980, margin: "0 auto", padding: 16 }}>
      {/* SEO: JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebPage",
            name: "Train – Notation & Ear",
            url: "https://pianotrainer.app/train",
            description: "Overview of PianoTrainer practice tools.",
          }),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "ItemList",
            name: "Training Hubs",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Notation Trainers", url: "https://pianotrainer.app/train/notation" },
              { "@type": "ListItem", position: 2, name: "Ear Trainers", url: "https://pianotrainer.app/train/ear" }
            ],
          }),
        }}
      />
      <h1>Train</h1>
      <p>Choose a trainer to practice your reading and listening skills.</p>
      <div style={{display:"grid",gap:12,gridTemplateColumns:"repeat(auto-fit,minmax(260px,1fr))",marginTop:16}}>
        <a href="/train/notation" style={{border:"1px solid #ddd",borderRadius:12,padding:14,textDecoration:"none",color:"#0b0f14",fontWeight:800}}>Notation →</a>
        <a href="/train/ear" style={{border:"1px solid #ddd",borderRadius:12,padding:14,textDecoration:"none",color:"#0b0f14",fontWeight:800}}>Ear →</a>
      </div>
    </main>
  );
}
