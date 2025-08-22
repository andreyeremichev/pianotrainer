"use client";
import { useEffect, useRef, useState } from "react";

/** Measures the *actual* lane (rounded px), rAF-coalesced to avoid RO loops. */
export function useLaneBox(hostRef: React.RefObject<HTMLElement>) {
  const rafLock = useRef<number | null>(null);
  const [box, setBox] = useState({ w: 0, h: 0 });

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let lastW = 0, lastH = 0;
    const measure = () => {
      const r = host.getBoundingClientRect();
      const w = Math.max(1, Math.round(r.width));
      const h = Math.max(1, Math.round(r.height));
      if (w !== lastW || h !== lastH) { lastW = w; lastH = h; setBox({ w, h }); }
      rafLock.current = null;
    };

    const schedule = () => {
      if (rafLock.current == null) rafLock.current = requestAnimationFrame(measure);
    };

    schedule();
    const ro = new ResizeObserver(schedule);
    ro.observe(host);
    window.addEventListener("resize", schedule);
    window.addEventListener("orientationchange", schedule);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", schedule);
      window.removeEventListener("orientationchange", schedule);
      if (rafLock.current) cancelAnimationFrame(rafLock.current);
    };
  }, [hostRef]);

  return box;
}
