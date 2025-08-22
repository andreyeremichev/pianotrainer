"use client";

export default function HowToLearnNotesPage() {
  return (
    <div style={{ textAlign: "center", padding: 20 }}>
      <svg width="1200" height="450" xmlns="http://www.w3.org/2000/svg">
        {/* Background */}
        <rect width="100%" height="100%" fill="white" />

        {/* Grand Stave Lines (Treble & Bass) */}
        <g stroke="black" strokeWidth="2">
          <line x1="60" y1="50" x2="1140" y2="50" />
          <line x1="60" y1="70" x2="1140" y2="70" />
          <line x1="60" y1="90" x2="1140" y2="90" />
          <line x1="60" y1="110" x2="1140" y2="110" />
          <line x1="60" y1="130" x2="1140" y2="130" />
        </g>

        {/* Bass */}
        <g stroke="black" strokeWidth="2">
          <line x1="60" y1="200" x2="1140" y2="200" />
          <line x1="60" y1="220" x2="1140" y2="220" />
          <line x1="60" y1="240" x2="1140" y2="240" />
          <line x1="60" y1="260" x2="1140" y2="260" />
          <line x1="60" y1="280" x2="1140" y2="280" />
        </g>

        {/* Brace */}
        <path
          d="M55 50 C35 100, 35 230, 55 280"
          stroke="black"
          strokeWidth="3"
          fill="none"
        />

        {/* Treble Clef Symbol */}
        <text x="70" y="115" fontSize="60" fill="black" fontFamily="serif">
          𝄞
        </text>

        {/* Bass Clef Symbol */}
        <text x="70" y="255" fontSize="60" fill="black" fontFamily="serif">
          𝄢
        </text>

        {/* Notes */}
        <circle cx="330" cy="220" r="10" fill="green" stroke="black" strokeWidth="2" />
        <text x="345" y="215" fontSize="20" fill="green">F3</text>

        <circle cx="720" cy="70" r="10" fill="red" stroke="black" strokeWidth="2" />
        <text x="735" y="65" fontSize="20" fill="red">G4</text>

        {/* Dashed Lines */}
        <line
          x1="330"
          y1="320"
          x2="330"
          y2="220"
          stroke="green"
          strokeWidth="2"
          strokeDasharray="5,5"
        />
        <line
          x1="720"
          y1="320"
          x2="720"
          y2="70"
          stroke="red"
          strokeWidth="2"
          strokeDasharray="5,5"
        />

        {/* Define gradient for split thumb */}
        <defs>
          <linearGradient id="splitCircle" x1="0" y1="0" x2="1" y2="0">
            <stop offset="50%" stopColor="green" />
            <stop offset="50%" stopColor="red" />
          </linearGradient>
        </defs>
      </svg>

      <p style={{ marginTop: 20 }}>
        Place thumbs of left and right hands on the Middle C. Left hand fingers on B3–A3–G3–F3,
        right hand fingers on D4–E4–F4–G4.
      </p>
    </div>
  );
}