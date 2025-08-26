"use client";

import React, { useId } from "react";

type Props = {
  className?: string;
  style?: React.CSSProperties;
};

/**
 * StandardLogo (fixed black-key centering)
 * - Entire mark is one group (<g class="logo-root">).
 * - No inline sizing; size via CSS (e.g., header sets svg { height: 24px }).
 * - Black keys centered between white keys (x = WHITE_W and x = 2*WHITE_W).
 * - Strokes use vectorEffect="non-scaling-stroke" for crisp small sizes.
 */
export default function StandardLogo({ className, style }: Props) {
  const clipId = useId();

  /* --- Layout constants --- */
  const VIEW_W = 360;
  const VIEW_H = 260;

  // Triangle "button"
  const TRI_LEFT_X = 72;
  const TRI_TOP_Y = 56;
  const TRI_HEIGHT = 148; // from 56 to 204

  // White keys (3 keys span 148 units)
  const WHITE_TOTAL_W = 148;
  const WHITE_W = WHITE_TOTAL_W / 3;

  // Black key geometry
  const BLACK_W = 25;
  const BLACK_H = 92;
  const BLACK_RX = 2;

  // Wordmark placement
  const WORD_X = 75;
  const WORD_BASELINE_Y = 230;

  // Correct centers: between white1/white2 and white2/white3
  const CENTER_1 = WHITE_W;        // boundary between white #1 and #2
  const CENTER_2 = 2 * WHITE_W;    // boundary between white #2 and #3
  const BLACK1_X = CENTER_1 - BLACK_W / 2;
  const BLACK2_X = CENTER_2 - BLACK_W / 2;

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
          .word {
            font: 800 30px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto,
              Arial, 'Noto Sans', 'Liberation Sans', sans-serif;
            fill: #111;
          }
        `}</style>
        <clipPath id={clipId} clipPathUnits="userSpaceOnUse">
          <polygon
            points={`${TRI_LEFT_X},${TRI_TOP_Y} ${
              TRI_LEFT_X + WHITE_TOTAL_W
            },${TRI_TOP_Y + TRI_HEIGHT / 2} ${TRI_LEFT_X},${TRI_TOP_Y + TRI_HEIGHT}`}
          />
        </clipPath>
      </defs>

      {/* Unified group: entire logo behaves as one element */}
      <g className="logo-root">
        {/* Triangle outline */}
        <polygon
          className="outline"
          points={`${TRI_LEFT_X},${TRI_TOP_Y} ${
            TRI_LEFT_X + WHITE_TOTAL_W
          },${TRI_TOP_Y + TRI_HEIGHT / 2} ${TRI_LEFT_X},${TRI_TOP_Y + TRI_HEIGHT}`}
          vectorEffect="non-scaling-stroke"
        />

        {/* Keys clipped inside triangle */}
        <g clipPath={`url(#${clipId})`}>
          <rect x="0" y="0" width={VIEW_W} height={VIEW_H} fill="#fff" />
          <g transform={`translate(${TRI_LEFT_X},${TRI_TOP_Y})`}>
            {/* White keys */}
            <rect
              x={0}
              y={0}
              width={WHITE_W}
              height={TRI_HEIGHT}
              fill="#fff"
              stroke="#111"
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
            />
            <rect
              x={WHITE_W}
              y={0}
              width={WHITE_W}
              height={TRI_HEIGHT}
              fill="#fff"
              stroke="#111"
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
            />
            <rect
              x={2 * WHITE_W}
              y={0}
              width={WHITE_W}
              height={TRI_HEIGHT}
              fill="#fff"
              stroke="#111"
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
            />

            {/* Black keys (centered between whites) */}
            <rect
              x={BLACK1_X}
              y={0}
              width={BLACK_W}
              height={BLACK_H}
              rx={BLACK_RX}
              fill="#111"
            />
            <rect
              x={BLACK2_X}
              y={0}
              width={BLACK_W}
              height={BLACK_H}
              rx={BLACK_RX}
              fill="#111"
            />
          </g>
        </g>

        {/* Wordmark */}
        <text className="word" x={WORD_X} y={WORD_BASELINE_Y}>
          PianoTrainer
        </text>
      </g>
    </svg>
  );
}
