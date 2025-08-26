"use client";

import React, { useId } from "react";

type Orientation = "horizontal" | "vertical";

type Props = {
  className?: string;
  style?: React.CSSProperties;
  /** Default 'horizontal'; use 'vertical' for the left-edge word placement */
  orientation?: Orientation;
};

/**
 * InvertedLogo
 * - Same geometry as StandardLogo, but key colors are inverted:
 *   - White keys => black fill + white stroke (seams visible)
 *   - Black keys => white fill
 * - Non-scaling strokes for crisp small sizes.
 * - Vertical/horizontal wordmark with precise apex alignment + configurable gaps.
 */
export default function InvertedLogo({
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

  // White-key span inside triangle (3 keys)
  const WHITE_TOTAL_W = 148;
  const WHITE_W = WHITE_TOTAL_W / 3;

  // Black keys (geometry)
  const BLACK_W = 25;
  const BLACK_H = 92;
  const BLACK_RX = 2;

  // Word styling
  const WORD_FONT_SIZE = 30;

  // Visual left edge (stroke centered)
  const TRI_VISUAL_LEFT = TRI_LEFT_X - OUTLINE_STROKE / 2;

  // Apex reference
  const APEX_LEFT_X = TRI_LEFT_X;
  const APEX_BOTTOM_Y = TRI_TOP_Y + TRI_HEIGHT;

  /* ===== HORIZONTAL WORD ===== */
  const GAP_WORD_H = 3; // tweak 2..4
  const WORD_X_H = TRI_VISUAL_LEFT + GAP_WORD_H;
  const WORD_BASELINE_Y_H = 230;

  /* ===== VERTICAL WORD ===== */
  const GAP_WORD_V = 0.1;   // top/bottom padding along left edge
  const GAP_WORD_V_X = 12; // horizontal spacing from triangle side
  const ROT_CX = APEX_LEFT_X - OUTLINE_STROKE / 2 - GAP_WORD_V_X;
  const ROT_CY = APEX_BOTTOM_Y;
  const WORD_X_V = ROT_CX;
  const WORD_Y_V = ROT_CY - GAP_WORD_V;
  const WORD_TEXT_LENGTH_V = TRI_HEIGHT - 2 * GAP_WORD_V;

  // Black-key centers between whites
  const BLACK1_X = WHITE_W - BLACK_W / 2;     // center at WHITE_W
  const BLACK2_X = 2 * WHITE_W - BLACK_W / 2; // center at 2*WHITE_W

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      preserveAspectRatio="xMidYMid meet"
      aria-labelledby="title-inverted"
      className={className}
      style={style}
      role="img"
    >
      <title id="title-inverted">PianoTrainer – Inverted Logo (Keys Colors Swapped)</title>

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

      {/* Unified group */}
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
            {/* Inverted "white" keys → black fill + white stroke (seams visible) */}
            <rect
              x={0}
              y={0}
              width={WHITE_W}
              height={TRI_HEIGHT}
              fill="#111"
              stroke="#fff"
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
            />
            <rect
              x={WHITE_W}
              y={0}
              width={WHITE_W}
              height={TRI_HEIGHT}
              fill="#111"
              stroke="#fff"
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
            />
            <rect
              x={2 * WHITE_W}
              y={0}
              width={WHITE_W}
              height={TRI_HEIGHT}
              fill="#111"
              stroke="#fff"
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
            />

            {/* Inverted "black" keys → white fill */}
            <rect x={BLACK1_X} y={0} width={BLACK_W} height={BLACK_H} rx={BLACK_RX} fill="#fff" />
            <rect x={BLACK2_X} y={0} width={BLACK_W} height={BLACK_H} rx={BLACK_RX} fill="#fff" />
          </g>
        </g>

        {/* Wordmark (same color as Standard for consistency) */}
        {orientation === "horizontal" ? (
          <text className="word" x={WORD_X_H} y={WORD_BASELINE_Y_H}>
            PianoTrainer
          </text>
        ) : (
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

