"use client";

import React, { useEffect, useLayoutEffect, useRef } from "react";
import { Renderer, Stave, StaveConnector } from "vexflow";
import { useMusicFontReady } from "./_guards/useMusicFontReady";

type FitProps = {
  /** size of the center lane (we’ll measure this in the page and pass it in) */
  laneWidth: number;
  laneHeight: number;
  /** inner horizontal padding between stave and side boxes */
  padX?: number;
  /** prefer height-fill; will auto-fallback to contain if width would clip */
  preferHeightFill?: boolean;
};

export default function GrandStaveVF_Fit({
  laneWidth,
  laneHeight,
  padX = 20,
  preferHeightFill = true,
}: FitProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const fontReady = useMusicFontReady();

  // one-time CSS for the wrapper
  useLayoutEffect(() => {
    const id = "gs-fit-css";
    if (document.getElementById(id)) return;
    const s = document.createElement("style");
    s.id = id;
    s.textContent = `
.gs-fit-frame{position:relative;width:100%;height:100%;overflow:hidden}
.gs-fit-abs{position:absolute;top:0;left:0;transform-origin:top left;will-change:transform}
`;
    document.head.appendChild(s);
  }, []);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount || !fontReady || laneWidth <= 0 || laneHeight <= 0) return;

    // Draw once at a fixed design size (matches the look of your placeholder).
    const baseW = 1600;     // design width
    const baseH = 420;      // design height
    mount.innerHTML = "";
    mount.style.width = `${baseW}px`;
    mount.style.height = `${baseH}px`;

    const renderer = new Renderer(mount, Renderer.Backends.SVG);
    renderer.resize(baseW, baseH);
    const ctx = renderer.getContext();

    // Slightly larger spacing to look like your placeholder
    const VF_LINE = 14;     // staff space at design size
    const VF_GAP  = 72;     // gap between treble/bass at design size
    const x0 = 0, w0 = 1500;
    const trebleTopY = 70;
    const bassTopY   = trebleTopY + 4 * VF_LINE + VF_GAP;

    const treble = new Stave(x0, trebleTopY, w0);
    treble.addClef("treble").setContext(ctx).draw();

    const bass = new Stave(x0, bassTopY, w0);
    bass.addClef("bass").setContext(ctx).draw();

    new StaveConnector(treble, bass).setType(StaveConnector.type.BRACE).setContext(ctx).draw();
    new StaveConnector(treble, bass).setType(StaveConnector.type.SINGLE_LEFT).setContext(ctx).draw();
    new StaveConnector(treble, bass).setType(StaveConnector.type.SINGLE_RIGHT).setContext(ctx).draw();

    // ----- robust scaling (height-fill with auto 'contain' fallback) -----
    const availW = Math.max(1, laneWidth - 2 * padX);
    const sH = laneHeight / baseH;     // height-fill scale
    const sW = availW / baseW;         // width-fit  scale

    // If height-fill would clip horizontally, fallback to contain.
    const useContain = preferHeightFill ? (baseW * sH > availW) : true;
    const s = useContain ? Math.min(sH, sW) : sH;

    // center horizontally inside availW
    const left = padX + (availW - baseW * s) / 2;

    // guard against first-frame under-measure: apply transform after 2 rAFs
    const apply = () => {
      mount.style.transform = `translateX(${left}px) scale(${s})`;
    };
    requestAnimationFrame(() => requestAnimationFrame(apply));
  }, [laneWidth, laneHeight, padX, preferHeightFill, fontReady]);

  return (
    <div className="gs-fit-frame">
      <div ref={mountRef} className="gs-fit-abs" />
    </div>
  );
}