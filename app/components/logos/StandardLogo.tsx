"use client";

import React, { useId } from "react";

type Orientation = "horizontal" | "vertical";

type Props = {
  className?: string;
  style?: React.CSSProperties;
  /** Keep default 'horizontal' for header; use 'vertical' only for previews or special placements */
  orientation?: Orientation;
};

/**
 * StandardLogo (precise apex alignment + configurable gaps)
 * - Entire mark in one <g class="logo-root">.
 * - No inline sizing (size via CSS, e.g., header sets svg { height: 24px }).
 * - Triangle/white-key strokes use vectorEffect="non-scaling-stroke" for crisp small sizes.
 * - Black keys are centered between white keys.
 * - Horizontal word: aligned to triangle's *visual* left edge + GAP_WORD_H.
 * - Vertical word: rotated -90°, spans triangle height with top/bottom padding (GAP_WORD_V)
 *   and horizontal spacing from the button side via GAP_WORD_V_X.
 */
export default function StandardLogo({
  className,
  style,
  orientation = "horizontal",
}: Props) {
  const clipId = useId();

  /* --- Geometry constants (logo units) --- */
  const VIEW_W = 360;
  const VIEW_H = 260;

  // Triangle (play button)
  const TRI_LEFT_X = 72;
  const TRI_TOP_Y = 56;
  const TRI_HEIGHT = 148; // bottom apex y = 56 + 148 = 204
  const TRI_RIGHT_X = TRI_LEFT_X + 148;

  // Outline stroke (non-scaling)
  const OUTLINE_STROKE = 3;

  // White-key span inside triangle
  const WHITE_TOTAL_W = 148;
  const WHITE_W = WHITE_TOTAL_W / 3;

  // Black keys
  const BLACK_W = 25;
  const BLACK_H = 92;
  const BLACK_RX = 2;

  // Word styling
  const WORD_FONT_SIZE = 30;

  // Visual left edge of triangle (stroke centered, so -stroke/2)
  const TRI_VISUAL_LEFT = TRI_LEFT_X - OUTLINE_STROKE / 2;

  // Bottom-left apex (for reference / rotation center)
  const APEX_LEFT_X = TRI_LEFT_X;
  const APEX_BOTTOM_Y = TRI_TOP_Y + TRI_HEIGHT;

  /* ===== HORIZONTAL WORD ===== */
  // Small gap between triangle visual-left and the "P"
  const GAP_WORD_H = 4; // tweak 2..4 to taste
  const WORD_X_H = TRI_VISUAL_LEFT + GAP_WORD_H;
  const WORD_BASELINE_Y_H = 230; // matches the original baseline for identical look

  /* ===== VERTICAL WORD ===== */
  // Padding from bottom/top apex along the left edge
  const GAP_WORD_V = 0.1; // equal padding at bottom and top
  // Horizontal spacing between the triangle side and the vertical word
  const GAP_WORD_V_X = 12; // increase to push text further left (away from the triangle)
  // Rotation center (move left by GAP_WORD_V_X to create side gap)
  const ROT_CX = APEX_LEFT_X - OUTLINE_STROKE / 2 - GAP_WORD_V_X;
  const ROT_CY = APEX_BOTTOM_Y;
  // Anchor position before rotation
  const WORD_X_V = ROT_CX;
  const WORD_Y_V = ROT_CY - GAP_WORD_V; // a bit above the bottom apex
  // Fit the word between apexes with symmetric padding
  const WORD_TEXT_LENGTH_V = TRI_HEIGHT - 2 * GAP_WORD_V;

  // Black-key centers between whites
  const BLACK1_X = WHITE_W - BLACK_W / 2;      // center at WHITE_W
  const BLACK2_X = 2 * WHITE_W - BLACK_W / 2;  // center at 2*WHITE_W

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
      <title id="title-standard">PianoTrainer – Play Button with Keys</title>

      <defs>
        <style>{`
          .outline { fill: none; stroke: #111; stroke-width: ${OUTLINE_STROKE}; }
          .word {
            font: 800 ${WORD_FONT_SIZE}px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto,
              Arial, 'Noto Sans', 'Liberation Sans', sans-serif;
            fill: #111;
          }
        `}</style>
        <clipPath id={clipId} clipPathUnits="userSpaceOnUse">
          <polygon
            points={`${TRI_LEFT_X},${TRI_TOP_Y} ${TRI_RIGHT_X},${
              TRI_TOP_Y + TRI_HEIGHT / 2
            } ${TRI_LEFT_X},${TRI_TOP_Y + TRI_HEIGHT}`}
          />
        </clipPath>
      </defs>

      {/* Unified group: entire logo behaves as one element */}
      <g className="logo-root">
        {/* Triangle outline */}
        <polygon
          className="outline"
          points={`${TRI_LEFT_X},${TRI_TOP_Y} ${TRI_RIGHT_X},${
            TRI_TOP_Y + TRI_HEIGHT / 2
          } ${TRI_LEFT_X},${TRI_TOP_Y + TRI_HEIGHT}`}
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
            <rect x={BLACK1_X} y={0} width={BLACK_W} height={BLACK_H} rx={BLACK_RX} fill="#111" />
            <rect x={BLACK2_X} y={0} width={BLACK_W} height={BLACK_H} rx={BLACK_RX} fill="#111" />
          </g>
        </g>

        {/* Wordmark */}
        {orientation === "horizontal" ? (
          <text className="word" x={WORD_X_H} y={WORD_BASELINE_Y_H}>
            PianoTrainer
          </text>
        ) : (
          // Vertical: rotate -90° so text flows upward along the left edge.
          // textLength forces the word to fit between top/bottom with small padding.
          <text
            className="word"
            x={WORD_X_V}
            y={WORD_Y_V}
            transform={`rotate(-90 ${ROT_CX} ${ROT_CY})`}
            textLength={WORD_TEXT_LENGTH_V}
            lengthAdjust="spacingAndGlyphs"
          >
            PianoTrainer
          </text>
        )}
      </g>
    </svg>
  );
}