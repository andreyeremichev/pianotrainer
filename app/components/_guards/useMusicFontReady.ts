// app/components/_guards/useMusicFontReady.ts
"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Returns true when the SMuFL music font renders measurable glyphs
 * in the VexFlow SVG inside the given container element.
 *
 * Pass a ref to the container (e.g., your VexFlow host <div ref={staveHostRef} />).
 * The hook waits for a child <svg> to appear, then probes font readiness.
 */
export default function useMusicFontReady(containerRef: React.RefObject<HTMLElement | null>) {
  const [ready, setReady] = useState(false);
  const rafRef = useRef<number | null>(null);
  const obsRef = useRef<MutationObserver | null>(null);

  useEffect(() => {
    const container = containerRef?.current;
    if (!container || ready) return;

    let cancelled = false;

    // try to get the child <svg>, or wait for it
    const findSvg = () => container.querySelector("svg") as SVGSVGElement | null;

    const startProbeFor = (svg: SVGSVGElement) => {
      if (!svg || cancelled) return;

      // temp <text> to measure music font
      const t = document.createElementNS("http://www.w3.org/2000/svg", "text");
      t.setAttribute("font-family", "Bravura, BravuraText, serif");
      t.setAttribute("font-size", "24");
      t.textContent = "♩";

      // append once
      try { svg.appendChild(t); } catch { /* ignore */ }

      const tick = (tries = 0) => {
        if (cancelled) return;
        try {
          const box = t.getBBox(); // throws if detached
          // remove if still attached
          if (t.parentNode === svg) {
            try { svg.removeChild(t); } catch {}
          }
          // if font has drawn (height > ~0), or we tried enough, mark ready
          if (box && (box.height > 0.1 || tries > 40)) {
            if (!cancelled) setReady(true);
            return;
          }
        } catch {
          // if getBBox threw, the node might be detached; we'll re-append below
        }

        // re-append if a re-render detached it
        if (t.parentNode !== svg && !cancelled) {
          try { svg.appendChild(t); } catch {}
        }

        rafRef.current = requestAnimationFrame(() => tick(tries + 1));
      };

      tick(0);
    };

    // if SVG exists now, probe immediately
    const existing = findSvg();
    if (existing) {
      startProbeFor(existing);
    } else {
      // otherwise wait for it to appear
      const obs = new MutationObserver(() => {
        const s = findSvg();
        if (s) {
          obs.disconnect();
          obsRef.current = null;
          startProbeFor(s);
        }
      });
      obs.observe(container, { childList: true, subtree: true });
      obsRef.current = obs;
    }

    // cleanup
    return () => {
      cancelled = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (obsRef.current) { try { obsRef.current.disconnect(); } catch {} }
    };
  }, [containerRef, ready]);

  return ready;
}