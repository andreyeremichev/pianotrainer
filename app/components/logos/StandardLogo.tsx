"use client";

import React, { useId } from "react";

type Props = {
  className?: string;
  style?: React.CSSProperties;
};

/**
 * StandardLogo
 * - Entire mark (triangle + keys + wordmark) is a single <g class="logo-root"> group.
 * - No inline width/height: size is controlled by parent CSS (e.g., header sets svg { height: 24px }).
 * - Keys are computed so black keys are perfectly centered between adjacent white keys.
 * - Gap between the button and the wordmark is fixed via layout constants and the viewBox (scales as one unit).
 * - Strokes use vectorEffect="non-scaling-stroke" so they stay visible at small sizes.
 */
export default function StandardLogo({ className, style }: Props) {
  const clipId = useId();

  /* --- Layout constants --- */
  const VIEW_W = 360;
  const VIEW_H = 260;

  // Triangle "button" bounding box
  const TRI_LEFT_X = 72;
  const TRI_TOP_Y = 56;
  const TRI_HEIGHT = 148;

  // White keys (3 keys inside triangle)
  const WHITE_TOTAL_W = 148;
  const WHITE_W = WHITE_TOTAL_W / 3;

  // Black key geometry
  const BLACK_W = 25;
  const BLACK_H = 92;
  const BLACK_RX = 2;

  // Wordmark placement
  const WORD_X = 72;
  const WORD_BASELINE_Y = 230;

  // Black key positions (centered between whites)
  const MID_1 = WHITE_W / 2;
  const MID_2 = WHITE_W + WHITE_W / 2;
  const BLACK1_X = MID_1 - BLACK_W / 2;
  const BLACK2_X = MID_2 - BLACK_W / 2;

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
      <title id="title-standard">
        PianoTrainer – Play Button with Keys (Standard)
      </title>

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
              TRI_LEFT_X + 148
            },${TRI_TOP_Y + TRI_HEIGHT / 2} ${TRI_LEFT_X},${
              TRI_TOP_Y + TRI_HEIGHT
            }`}
          />
        </clipPath>
      </defs>

      {/* Unified group: entire logo scales and clicks as one element */}
      <g className="logo-root">
        {/* Triangle outline */}
        <polygon
          className="outline"
          points={`${TRI_LEFT_X},${TRI_TOP_Y} ${
            TRI_LEFT_X + 148
          },${TRI_TOP_Y + TRI_HEIGHT / 2} ${TRI_LEFT_X},${
            TRI_TOP_Y + TRI_HEIGHT
          }`}
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

            {/* Black keys (centered) */}
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