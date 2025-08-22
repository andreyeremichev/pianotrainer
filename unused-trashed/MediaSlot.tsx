"use client";
import React, { useLayoutEffect, useRef, useState, useEffect } from "react";

export default function MediaSlot({
  vw, vh, children,
}: {
  vw: number; vh: number;
  children: (mountEl: HTMLDivElement) => React.ReactNode;
}) {
  const outerRef = useRef<HTMLDivElement>(null);
  const mountRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [ready, setReady] = useState(false);

  useLayoutEffect(() => {
    const el = outerRef.current!;
    const ro = new ResizeObserver(() => {
      const w = el.clientWidth, h = el.clientHeight;
      setScale(Math.min(w / vw, h / vh));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [vw, vh]);

  // Force a render once the inner mount exists
  useEffect(() => {
    if (mountRef.current && !ready) setReady(true);
  }, [ready]);

  return (
    <div
      ref={outerRef}
      style={{
        position: "relative",
        width: "100%", height: "100%",
        overflow: "hidden",
        contain: "layout style paint size",
      }}
    >
      <div
        ref={mountRef}
        style={{
          position: "absolute",
          left: "50%", top: "50%",
          width: vw, height: vh,
          transform: `translate(-50%, -50%) scale(${scale})`,
          transformOrigin: "center",
        }}
      >
        {ready ? children(mountRef.current!) : null}
      </div>
    </div>
  );
}
