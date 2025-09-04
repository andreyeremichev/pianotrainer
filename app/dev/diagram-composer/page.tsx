
// app/dev/diagram-07-guide-notes-combined/page.tsx
"use client";

import React, { useRef } from "react";
import StaveSVG, { StaveSVGHandle } from "../../components/StaveSVG";
import KeyboardSVG from "../../components/KeyboardSVG";

export default function Diagram07_GuideNotes_Combined() {
  // ---- Geometry (shared) ----
  const STAVE_WIDTH = 1100;
  const STAVE_HEIGHT = 380;
  const LEFT_PADDING = 70;
  const RIGHT_PADDING = 40;
  const STAVE_GAP = 40;                 // requested
  const CONTENT_WIDTH = Math.max(10, STAVE_WIDTH - LEFT_PADDING - RIGHT_PADDING);

  const FROM_MIDI = 36; // C2
  const TO_MIDI   = 84; // C6

  const WHITE_KEY_HEIGHT = 100;         // requested
  const LABEL_BAND = 22;                // ensure labels aren’t clipped in export
  const GAP_BETWEEN = -40;              // requested (tight stack)

  const isBlack = (m: number) => [1, 3, 6, 8, 10].includes(m % 12);
  const countWhites = (from: number, to: number) => {
    let n = 0; for (let m = from; m <= to; m++) if (!isBlack(m)) n++; return n;
  };
  const WHITE_COUNT     = countWhites(FROM_MIDI, TO_MIDI);
  const WHITE_KEY_WIDTH = Math.floor(CONTENT_WIDTH / WHITE_COUNT);
  const BLACK_KEY_WIDTH = Math.round(WHITE_KEY_WIDTH * 0.62);
  const BLACK_KEY_HEIGHT= Math.round(WHITE_KEY_HEIGHT * 0.62);

  // ---- Guide notes on both staves (same as file #1) ----
  // Bass: C2, G2, C3, F3, C4
  // Treble: C4, G4, C5, F5, C6
  const BASS_NOTES   = ["C2", "G2", "C3", "F3", "C4"];
  const TREBLE_NOTES = ["C4", "G4", "C5", "F5", "C6"];

  // Bottom labels required (no visible highlights):
  const GUIDE_LABELS = ["C2", "G2", "C3", "F3", "C4", "G4", "C5", "F5", "C6"];

  // Refs
  const staveRef = useRef<StaveSVGHandle | null>(null);
  const keyboardHostRef = useRef<HTMLDivElement | null>(null);

  // ---- Export helpers ----
  const downloadBlob = (data: string | Blob, filename: string, type = "image/svg+xml;charset=utf-8") => {
    const blob = data instanceof Blob ? data : new Blob([data], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  };

  const arrayBufferToBase64 = (buf: ArrayBuffer) => {
    let binary = ""; const bytes = new Uint8Array(buf);
    for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
    return btoa(binary);
  };

  const fetchFontDataUrl = async (path: string, mime = "font/otf") => {
    const res = await fetch(path, { cache: "no-cache" });
    if (!res.ok) throw new Error(`Failed to load ${path}: ${res.status}`);
    const buf = await res.arrayBuffer();
    const b64 = arrayBufferToBase64(buf);
    return `url('data:${mime};base64,${b64}') format('opentype')`;
  };

  // Export: embed fonts as data URLs and nest full child <svg> intact (no visible highlights)
  const downloadCombined = async () => {
    const staveSvg = staveRef.current?.getSVGElement();
    const kbSvg    = keyboardHostRef.current?.querySelector("svg");
    if (!staveSvg || !kbSvg) return;

    const ser = new XMLSerializer();
    let rawStave = ser.serializeToString(staveSvg);
    let rawKb    = ser.serializeToString(kbSvg);

    const onlySvg = (raw: string) => { const i = raw.indexOf("<svg"); return i >= 0 ? raw.slice(i) : raw; };
    rawStave = onlySvg(rawStave).replace("<svg ", `<svg x="0" y="0" `);
    rawKb    = onlySvg(rawKb   ).replace("<svg ", `<svg x="${LEFT_PADDING}" y="${STAVE_HEIGHT + GAP_BETWEEN}" `);

    // Embed Bravura + BravuraText as data URLs
    let bravuraDataUrl = "", bravuraTextDataUrl = "";
    try {
      bravuraDataUrl     = await fetchFontDataUrl("/fonts/Bravura.otf");
      bravuraTextDataUrl = await fetchFontDataUrl("/fonts/BravuraText.otf");
    } catch (e) { console.warn("Font embedding failed:", e); }

    const FONT_STYLE = `
      <style type="text/css"><![CDATA[
        @font-face { font-family: 'Bravura';     src: ${bravuraDataUrl || "local('Bravura')"};     font-weight: normal; font-style: normal; font-display: swap; }
        @font-face { font-family: 'BravuraText'; src: ${bravuraTextDataUrl || "local('BravuraText')"}; font-weight: normal; font-style: normal; font-display: swap; }
        svg { font-family: Bravura, BravuraText, serif; }
      ]]></style>
    `.trim();

    const totalW = STAVE_WIDTH;
    // Include label band so bottom labels aren't clipped
    const totalH = STAVE_HEIGHT + GAP_BETWEEN + WHITE_KEY_HEIGHT + LABEL_BAND;

    const combined = `
<svg xmlns="http://www.w3.org/2000/svg" width="${totalW}" height="${totalH}" viewBox="0 0 ${totalW} ${totalH}">
  ${FONT_STYLE}
  ${rawStave}
  ${rawKb}
</svg>`.trim();

    downloadBlob(combined, "07-guide-notes-combined.svg");
  };

  return (
    <main style={{ padding: 24 }}>
      <h1>07 • Guide Notes (combined, labels only, no highlights)</h1>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
        <button onClick={downloadCombined} style={btnPrimary}>⬇️ Download Combined SVG</button>
        <small>
          Gap: {GAP_BETWEEN}px · Key height: {WHITE_KEY_HEIGHT}px · Labels: {GUIDE_LABELS.join(", ")}
        </small>
      </div>

      {/* Stave preview (all guide notes, both staves) */}
      <section style={{ marginBottom: 0 }}>
        <StaveSVG
          ref={staveRef}
          width={STAVE_WIDTH}
          height={STAVE_HEIGHT}
          leftPadding={LEFT_PADDING}
          rightPadding={RIGHT_PADDING}
          staffGap={STAVE_GAP}
          showBrace
          showLeftConnector
          showRightConnector
          trebleNotes={TREBLE_NOTES}
          bassNotes={BASS_NOTES}
          duration="w"
        />
      </section>

      {/* Keyboard preview — labels only for all guide notes, no visible highlights */}
      <section
        ref={keyboardHostRef}
        style={{
          overflowX: "auto",
          marginTop: GAP_BETWEEN,        // same constant as export (negative is intentional)
          width: STAVE_WIDTH,
          paddingLeft: LEFT_PADDING,     // fixed under content-left
          boxSizing: "content-box",
        }}
      >
        <KeyboardSVG
          showCLabels={false}
          alwaysShowC4Label                // always keep “C4” label
          labelHighlightedKeys             // labels for highlighted entries
          highlight={GUIDE_LABELS}         // use highlight for labels...
          whiteHighlightOpacity={0}        // ...but make highlights invisible
          blackHighlightOpacity={0}
          fromMidi={FROM_MIDI}
          toMidi={TO_MIDI}
          whiteKeyWidth={WHITE_KEY_WIDTH}
          whiteKeyHeight={WHITE_KEY_HEIGHT}
          blackKeyWidth={BLACK_KEY_WIDTH}
          blackKeyHeight={BLACK_KEY_HEIGHT}
        />
      </section>
    </main>
  );
}

const btnPrimary: React.CSSProperties = {
  padding: "8px 12px",
  border: "1px solid #4f46e5",
  background: "#eef2ff",
  borderRadius: 8,
  cursor: "pointer",
};