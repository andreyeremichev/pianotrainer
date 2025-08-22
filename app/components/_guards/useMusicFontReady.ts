"use client";
import { useEffect, useState } from "react";

/** Waits until the music font paints (prevents “missing clef/notes”). */
export function useMusicFontReady() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let svg: SVGSVGElement | null = null;
    let canceled = false;

    const tick = (tries = 0) => {
      if (!svg || canceled) return;
      const t = document.createElementNS(svg.namespaceURI, "text");
      t.setAttribute("x", "0"); t.setAttribute("y", "0");
      t.textContent = "\uE050"; // SMuFL treble clef
      svg.appendChild(t);
      const b = t.getBBox();
      svg.removeChild(t);
      if (b.height > 0.1 || tries > 40) setReady(true);
      else requestAnimationFrame(() => tick(tries + 1));
    };

    svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("width", "1"); svg.setAttribute("height", "1");
    svg.style.position = "absolute"; svg.style.left = "-9999px"; svg.style.top = "-9999px";
    document.body.appendChild(svg);
    requestAnimationFrame(() => tick());

    return () => {
      canceled = true;
      if (svg?.parentNode) svg.parentNode.removeChild(svg);
    };
  }, []);

  return ready;
}