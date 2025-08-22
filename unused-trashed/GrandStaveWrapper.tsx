"use client";
import React, { useEffect, useRef, useState } from "react";
import GrandStaveVF from "./GrandStaveVF";

export default function GrandStaveWrapper({
  lineSpace = 24,
  staffGap = 90,
  padX = 40,
  ledgerTopLines = 2,
  ledgerBottomLines = 2,
  notePadRatio = 0.6,
  debugNotes = false,
  qa = false,
}: {
  lineSpace?: number;
  staffGap?: number;
  padX?: number;
  ledgerTopLines?: number;
  ledgerBottomLines?: number;
  notePadRatio?: number;
  debugNotes?: boolean;
  qa?: boolean;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<{ w: number; h: number }>({ w: 0, h: 0 });

  useEffect(() => {
    if (!hostRef.current) return;

    let lastW = 0, lastH = 0;
    const update = () => {
      const r = hostRef.current!.getBoundingClientRect();
      // Round to integer px to avoid sub‑pixel oscillation
      const w = Math.max(1, Math.round(r.width));
      const h = Math.max(1, Math.round(r.height));
      if (w !== lastW || h !== lastH) {
        lastW = w; lastH = h;
        setSize({ w, h });
      }
    };

    update();
    const ro = new ResizeObserver(() => {
      // Batch to next frame to avoid RO → layout → RO ping‑pong
      requestAnimationFrame(update);
    });
    ro.observe(hostRef.current);
    window.addEventListener("resize", update);
    window.addEventListener("orientationchange", update);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", update);
      window.removeEventListener("orientationchange", update);
    };
  }, []);

  return (
    <div
      ref={hostRef}
      style={{
        width: "100%",
        height: "100%",
        display: "block",
        overflow: "hidden",
        // Isolate the drawing so it can’t influence parent measurements:
        contain: "layout size paint",
      }}
    >
      {size.w > 0 && size.h > 0 && (
        <GrandStaveVF
          mountElRef={hostRef}
          width={size.w}
          height={size.h}
          lineSpace={lineSpace}
          staffGap={staffGap}
          padX={padX}
          ledgerTopLines={ledgerTopLines}
          ledgerBottomLines={ledgerBottomLines}
          notePadRatio={notePadRatio}
          debugNotes={debugNotes}
          qa={qa}
        />
      )}
    </div>
  );
}