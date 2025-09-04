// app/components/KeyboardSVG.tsx
"use client";

import * as React from "react";

type KeyboardSVGProps = {
  /** MIDI range inclusive. Defaults: C2 (36) .. C6 (84) */
  fromMidi?: number;
  toMidi?: number;

  /** Geometry */
  whiteKeyWidth?: number;   // px
  whiteKeyHeight?: number;  // px
  blackKeyWidth?: number;   // px
  blackKeyHeight?: number;  // px

  /** Labels & emphasis */
  showCLabels?: boolean;        // show all C labels (C2, C3, C4, C5, C6)
  emphasizeC4?: boolean;        // subtle outline on Middle C (off by default)
  alwaysShowC4Label?: boolean;  // ALWAYS show "C4" bottom label (default true)
  labelHighlightedKeys?: boolean; // show labels for highlighted keys (default true)
  labelColor?: string;          // bottom label text color

  /** Highlight keys by MIDI number or note name ("C4", "F#3") */
  highlight?: Array<number | string>;
  highlightColor?: string;
  /** Opacity of white/black key highlight fills */
  whiteHighlightOpacity?: number;
  blackHighlightOpacity?: number;

  className?: string;
  style?: React.CSSProperties;
  "aria-label"?: string;
};

const PC_NAMES = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];
const BLACK_PCS = new Set([1,3,6,8,10]); // C#, D#, F#, G#, A#

function midiToNoteName(midi: number) {
  const pc = PC_NAMES[midi % 12];
  const octave = Math.floor(midi / 12) - 1;
  return `${pc}${octave}`;
}
function isBlack(midi: number) {
  return BLACK_PCS.has(midi % 12);
}

/** Parse "C#4" -> midi number */
function noteNameToMidi(name: string): number | null {
  const match = name.trim().match(/^([A-G])(#|b)?(\d)$/i);
  if (!match) return null;
  const base = match[1].toUpperCase();
  const acc = match[2] || "";
  const oct = parseInt(match[3], 10);
  const baseToPc: Record<string, number> = { C:0, D:2, E:4, F:5, G:7, A:9, B:11 };
  let pc = baseToPc[base];
  if (acc === "#") pc += 1;
  if (acc === "b") pc -= 1;
  pc = ((pc % 12) + 12) % 12; // normalize 0..11
  return (oct + 1) * 12 + pc;
}

function toMidiSet(highlight?: Array<number | string>): Set<number> {
  const set = new Set<number>();
  if (!highlight) return set;
  for (const h of highlight) {
    if (typeof h === "number") set.add(h);
    else {
      const m = noteNameToMidi(h);
      if (m != null) set.add(m);
    }
  }
  return set;
}

function KeyboardSVG(
  {
    fromMidi = 36, // C2
    toMidi = 84,   // C6

    whiteKeyWidth = 24,
    whiteKeyHeight = 90,
    blackKeyWidth = 14,
    blackKeyHeight = 60,

    // Label controls
    showCLabels = false,          // default to OFF per your request
    emphasizeC4 = false,          // default off to avoid outlines unless asked
    alwaysShowC4Label = true,     // keep C4 label always visible
    labelHighlightedKeys = true,  // label any highlighted keys at bottom
    labelColor = "#111",

    // Highlights
    highlight,
    highlightColor = "#22c55e",   // emerald-500
    whiteHighlightOpacity = 0.4,
    blackHighlightOpacity = 0.7,

    className,
    style,
    "aria-label": ariaLabel = "Piano keyboard C2–C6",
  }: KeyboardSVGProps
) {
  // Build sequences and positions
  type WhiteKey = { midi: number; note: string; x: number };
  type BlackKey = { midi: number; note: string; x: number };

  const whites: WhiteKey[] = [];
  const blackCandidates: number[] = [];
  const midiToPrevWhiteIndex = new Map<number, number>();

  // First pass: map white indices + remember black candidates
  let whiteIndex = 0;
  for (let m = fromMidi; m <= toMidi; m++) {
    const note = midiToNoteName(m);
    if (!isBlack(m)) {
      const x = whiteIndex * whiteKeyWidth;
      whites.push({ midi: m, note, x });
      midiToPrevWhiteIndex.set(m, whiteIndex);
      whiteIndex++;
    } else {
      blackCandidates.push(m);
      midiToPrevWhiteIndex.set(m, whiteIndex - 1);
    }
  }

  // Second pass: compute black key positions (centered between whites)
  const blacks: BlackKey[] = [];
  for (const m of blackCandidates) {
    const prevWhiteIdx = midiToPrevWhiteIndex.get(m);
    if (prevWhiteIdx == null || prevWhiteIdx < 0) continue;
    const prevWhiteX = whites[prevWhiteIdx]?.x ?? 0;
    const x = prevWhiteX + whiteKeyWidth - blackKeyWidth / 2;
    blacks.push({ midi: m, note: midiToNoteName(m), x });
  }

  const totalWidth = whites.length * whiteKeyWidth;

  const highlightSet = toMidiSet(highlight);
  const isHighlighted = (midi: number) => highlightSet.has(midi);

  // Reserve bottom label band if needed
  const needsBottomLabels =
    showCLabels || alwaysShowC4Label || (labelHighlightedKeys && highlightSet.size > 0);

  const labelHeight = needsBottomLabels ? 22 : 0;
  const totalHeight = whiteKeyHeight + labelHeight;

  // Labels for C keys (for optional all-C mode & for finding C4)
  const cWhites = whites.filter(w => w.note.startsWith("C"));
  const c4White = whites.find(w => w.note === "C4");

  // Middle C outline (optional)
  const middleC = 60; // MIDI for C4
  const middleCWhite = whites.find(w => w.midi === middleC);

  return (
    <svg
      className={className}
      style={style}
      width={totalWidth}
      height={totalHeight}
      viewBox={`0 0 ${totalWidth} ${totalHeight}`}
      role="img"
      aria-label={ariaLabel}
      xmlns="http://www.w3.org/2000/svg"
    >
      <title>{ariaLabel}</title>

      {/* Background */}
      <rect x={0} y={0} width={totalWidth} height={totalHeight} fill="#ffffff" />

      {/* Whites (base fill tints when highlighted) */}
      <g id="white-keys">
        {whites.map(({ midi, note, x }) => {
          const on = isHighlighted(midi);
          return (
            <rect
              key={`w-${midi}`}
              x={x}
              y={0}
              width={whiteKeyWidth}
              height={whiteKeyHeight}
              fill={on ? highlightColor : "#ffffff"}
              opacity={on ? whiteHighlightOpacity : 1}
              stroke="#222"
              strokeWidth={1}
              data-note={note}
            />
          );
        })}
      </g>

      {/* White highlight overlays (below black keys to avoid overlap) */}
      <g id="white-highlights">
        {whites
          .filter(w => isHighlighted(w.midi))
          .map(({ midi, x }) => (
            <rect
              key={`hw-${midi}`}
              x={x}
              y={0}
              width={whiteKeyWidth}
              height={whiteKeyHeight}
              fill={highlightColor}
              opacity={whiteHighlightOpacity}
              pointerEvents="none"
            />
          ))}
      </g>

      {/* Blacks (base fill tints when highlighted) */}
      <g id="black-keys">
        {blacks.map(({ midi, note, x }) => {
          const on = isHighlighted(midi);
          return (
            <rect
              key={`b-${midi}`}
              x={x}
              y={0}
              width={blackKeyWidth}
              height={blackKeyHeight}
              fill={on ? highlightColor : "#111111"}
              opacity={on ? blackHighlightOpacity : 1}
              stroke="#000"
              strokeWidth={1}
              rx={1.5}
              data-note={note}
            />
          );
        })}
      </g>

      {/* Black overlays (on top) */}
      <g id="black-highlights">
        {blacks
          .filter(b => isHighlighted(b.midi))
          .map(({ midi, x }) => (
            <rect
              key={`hb-${midi}`}
              x={x}
              y={0}
              width={blackKeyWidth}
              height={blackKeyHeight}
              fill={highlightColor}
              opacity={blackHighlightOpacity}
              pointerEvents="none"
              rx={1.5}
            />
          ))}
      </g>

      {/* Optional Middle C outline (solid, non-dashed) */}
      {emphasizeC4 && middleCWhite && (
        <rect
          x={middleCWhite.x + 0.5}
          y={0.5}
          width={whiteKeyWidth - 1}
          height={whiteKeyHeight - 1}
          fill="none"
          stroke="#3b82f6"
          strokeWidth={1.5}
          pointerEvents="none"
        />
      )}

      {/* Bottom labels: C4 (always if enabled), highlighted keys, optional all Cs */}
      {needsBottomLabels && (
        <g
          id="bottom-labels"
          fontFamily="ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto"
          fontSize={12}
          fill={labelColor}
          textAnchor="middle"
        >
          {/* Always-one: C4 */}
          {alwaysShowC4Label && c4White && (
            <text x={c4White.x + whiteKeyWidth / 2} y={whiteKeyHeight + 16}>
              C4
            </text>
          )}

          {/* Dynamic: labels for highlighted keys */}
          {labelHighlightedKeys &&
            whites
              .filter(w => isHighlighted(w.midi))
              .map(w => (
                <text key={`lbl-w-${w.midi}`} x={w.x + whiteKeyWidth / 2} y={whiteKeyHeight + 16}>
                  {w.note}
                </text>
              ))}

          {labelHighlightedKeys &&
            blacks
              .filter(b => isHighlighted(b.midi))
              .map(b => (
                <text key={`lbl-b-${b.midi}`} x={b.x + blackKeyWidth / 2} y={whiteKeyHeight + 16}>
                  {b.note}
                </text>
              ))}

          {/* Optional: show all C labels if you ever want them again */}
          {showCLabels &&
            cWhites.map(({ midi, note, x }) => (
              <text key={`lbl-c-${midi}`} x={x + whiteKeyWidth / 2} y={whiteKeyHeight + 16}>
                {note}
              </text>
            ))}
        </g>
      )}
    </svg>
  );
}

export default KeyboardSVG;