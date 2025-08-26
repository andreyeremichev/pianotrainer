"use client";

import React, { useId } from "react";

type Props = {
  className?: string;
  style?: React.CSSProperties;
};

/**
 * StandardLogo
 * - Entire mark (triangle + keys + wordmark) is a single <g class="logo-root"> group.
 * - No inline width/height: size is controlled by parent CSS (e.g., header sets svg { height: 6px }).
 * - Keys are computed so black keys are perfectly centered between adjacent white keys.
 * - Gap between the button and the wordmark is fixed via layout constants and the viewBox (scales as one unit).
 */
export default function StandardLogo({ className, style }: Props) {
  const clipId = useId();

  /* --- Layout constants (in logo units) --- */
  const VIEW_W = 360;
  const VIEW_H = 260;

  // Triangle "button" bounding box (aligned with previous artwork)
  const TRI_LEFT_X = 72;
  const TRI_TOP_Y = 56;
  const TRI_HEIGHT = 148; // 56 -> 204

  // Three white keys inside the triangle, total width span inside button:
  const WHITE_TOTAL_W = 148;
  const WHITE_W = WHITE_TOTAL_W / 3; // 49.333333...

  // Black key geometry
  const BLACK_W = 25;
  const BLACK_H = 92;
  const BLACK_RX = 2;

  // Wordmark placement: keep the same baseline and visual gap as before
  const WORD_X = 72;
  const WORD_BASELINE_Y = 230;

  // Compute centered black-key positions between whites (midpoints of gaps)
  // Whites occupy slots: [0..WHITE_W], [WHITE_W..2*WHITE_W], [2*WHITE_W..3*WHITE_W]
  // Midpoints between white #1 & #2, and between #2 & #3:
  const MID_1 = WHITE_W / 2;           // center between 0 and WHITE_W
  const MID_2 = WHITE_W + WHITE_W / 2; // center between WHITE_W and 2*WHITE_W

  const BLACK1_X = MID_1 - BLACK_W / 2; // centered
  const BLACK2_X = MID_2 - BLACK_W / 2; // centered

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      preserveAspectRatio="xMidYMid meet"
      aria-labelledby="title-standard"
      className={className}
      style={style}
      role="img"
    >
      <title id="title-standard">PianoTrainer – Play Button with Keys (Standard)</title>

      <defs>
        <style>{`
          .outline { fill: none; stroke: #111; stroke-width: 3; }
          .word { font: 800 30px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, 'Noto Sans', 'Liberation Sans', sans-serif; fill: #111; }
        `}</style>
        <clipPath id={clipId} clipPathUnits="userSpaceOnUse">
          <polygon points="${TRI_LEFT_X},${TRI_TOP_Y} ${TRI_LEFT_X + 148},${TRI_TOP_Y + TRI_HEIGHT/2} ${TRI_LEFT_X},${TRI_TOP_Y + TRI_HEIGHT}" />
        </clipPath>
      </defs>

      {/* Unified group: entire logo scales and clicks as one element */}
      <g className="logo-root">
        {/* Triangle outline (play button) */}
        <polygon className="outline" points={`${TRI_LEFT_X},${TRI_TOP_Y} ${TRI_LEFT_X + 148},${TRI_TOP_Y + TRI_HEIGHT/2} ${TRI_LEFT_X},${TRI_TOP_Y + TRI_HEIGHT}`} />

        {/* Keys clipped inside triangle */}
        <g clipPath={`url(#${clipId})`}>
          <rect x="0" y="0" width={VIEW_W} height={VIEW_H} fill="#fff" />
          <g transform={`translate(${TRI_LEFT_X},${TRI_TOP_Y})`}>
            {/* White keys */}
            <rect x={0}           y={0} width={WHITE_W}        height={TRI_HEIGHT} style={{ fill: "#fff", stroke: "#111", strokeWidth: 1.8 }} />
            <rect x={WHITE_W}     y={0} width={WHITE_W}        height={TRI_HEIGHT} style={{ fill: "#fff", stroke: "#111", strokeWidth: 1.8 }} />
            <rect x={2*WHITE_W}   y={0} width={WHITE_W}        height={TRI_HEIGHT} style={{ fill: "#fff", stroke: "#111", strokeWidth: 1.8 }} />

            {/* Black keys (centered between whites) */}
            <rect x={BLACK1_X}    y={0} width={BLACK_W} height={BLACK_H} rx={BLACK_RX} style={{ fill: "#111" }} />
            <rect x={BLACK2_X}    y={0} width={BLACK_W} height={BLACK_H} rx={BLACK_RX} style={{ fill: "#111" }} />
          </g>
        </g>

        {/* Wordmark — fixed baseline keeps the gap consistent with the button */}
        <text className="word" x={WORD_X} y={WORD_BASELINE_Y}>PianoTrainer</text>
      </g>
    </svg>
  );
}