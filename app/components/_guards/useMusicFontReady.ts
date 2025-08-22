"use client";

import { useEffect, useState } from "react";

export default function useMusicFontReady() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const svgNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS, "svg");
    // ⬇️ explicitly type as SVGTextElement so getBBox() is available
    const t = document.createElementNS(svgNS, "text") as SVGTextElement;
    t.textContent = "\uE050"; // SMuFL treble clef
    svg.appendChild(t);

    const tick = (tries = 0) => {
      // getBBox exists on SVGGraphicsElement/SVGTextElement
      const b = t.getBBox();
      svg.removeChild(t);
      if (b.height > 0.1 || tries > 40) setReady(true);
      else requestAnimationFrame(() => tick(tries + 1));
    };

    tick();
    return () => {
      try {
        if (t.parentNode === svg) svg.removeChild(t);
      } catch {}
    };
  }, []);

  return ready;
}