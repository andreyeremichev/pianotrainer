// /app/components/SvgSlot.tsx
"use client";
import React, { useLayoutEffect, useRef, useState } from "react";

export default function SvgSlot({
  vw, vh, children,
}: {
  vw: number; vh: number;
  children: (svg: SVGSVGElement) => React.ReactNode;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [ready, setReady] = useState(false);

  useLayoutEffect(() => { if (svgRef.current) setReady(true); }, []);

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${vw} ${vh}`}
      preserveAspectRatio="xMidYMid meet"
      width="100%"
      height="100%"
      style={{ display: "block" }}
    >
      {ready ? children(svgRef.current!) : null}
    </svg>
  );
}
