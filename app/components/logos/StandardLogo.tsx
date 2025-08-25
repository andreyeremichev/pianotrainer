
"use client";

import React, { useId } from "react";

export default function StandardLogo() {
  const clipId = useId(); // unique per render to avoid ID collisions

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 360 260"
      style={{ width: "100%", height: "auto", display: "block" }}
      aria-labelledby="title-standard"
    >
      <title id="title-standard">PianoTrainer – Play Button with Keys (Standard, responsive)</title>
      <defs>
        <style>{`
          .outline { fill:none; stroke:#111; stroke-width:3; }
          .word { font: 800 30px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, 'Noto Sans', 'Liberation Sans', sans-serif; fill:#111; }
        `}</style>
        <clipPath id={clipId} clipPathUnits="userSpaceOnUse">
          <polygon points="72,56 220,130 72,204" />
        </clipPath>
      </defs>

      {/* Unified group: the whole logo behaves as one element */}
      <g className="logo-root">
        {/* Triangle outline */}
        <polygon className="outline" points="72,56 220,130 72,204" />

        {/* Keys clipped inside triangle */}
        <g clipPath={`url(#${clipId})`}>
          <rect x="0" y="0" width="360" height="260" fill="#fff" />
          <g transform="translate(72,56)">
            {/* White keys: each 148/3 wide */}
            <rect x="0"        y="0" width="49.3333" height="148" style={{ fill: "#fff", stroke: "#111", strokeWidth: 1.8 }} />
            <rect x="49.3333"  y="0" width="49.3333" height="148" style={{ fill: "#fff", stroke: "#111", strokeWidth: 1.8 }} />
            <rect x="98.6667"  y="0" width="49.3333" height="148" style={{ fill: "#fff", stroke: "#111", strokeWidth: 1.8 }} />
            {/* Black keys: exactly centered between whites, 25px wide */}
            {/* centers at 49.3333 and 98.6667 → x = center - 12.5 */}
            <rect x="36.8333"  y="0" width="25" height="92" rx="2" style={{ fill: "#111" }} />
            <rect x="86.1667"  y="0" width="25" height="92" rx="2" style={{ fill: "#111" }} />
          </g>
        </g>

        {/* Wordmark: baseline y=230 so top of "P" is ~2px below the button bottom */}
        <text className="word" x="72" y="230">PianoTrainer</text>
      </g>
    </svg>
  );
}