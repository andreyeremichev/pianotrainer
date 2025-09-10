"use client";

import React, { useEffect, useMemo, useState } from "react";

type Option = { title: string; subtitle: string };

export default function PosterHeader({
  options,
  rotateSignal = 0,            // when this number changes, rotate once (e.g., after Play)
  align = "center",            // "center" | "left"
  maxWidth = 720,
}: {
  options: Option[];
  rotateSignal?: number;
  align?: "center" | "left";
  maxWidth?: number;
}) {
  const safeOptions = useMemo(() => (options?.length ? options : [
    { title: "Trainer", subtitle: "Practice with focused, friendly tools." },
  ]), [options]);

  const [idx, setIdx] = useState(0);

  // random on mount
  useEffect(() => {
    setIdx(Math.floor(Math.random() * safeOptions.length));
  }, [safeOptions.length]);

  // rotate when external signal increments (e.g., each Play)
  useEffect(() => {
    if (!rotateSignal) return;
    setIdx((i) => (i + 1) % safeOptions.length);
  }, [rotateSignal, safeOptions.length]);

  const o = safeOptions[idx];

  return (
    <header
      style={{
        textAlign: align,
        margin: "6px 0 16px",
      }}
    >
      <h1
        style={{
          margin: 0,
          fontSize: 28,
          lineHeight: 1.2,
          letterSpacing: 0.2,
        }}
      >
        {o.title}
      </h1>
      <p
        style={{
          margin: "6px auto 0",
          maxWidth,
          opacity: 0.8,
          fontSize: 15,
          lineHeight: 1.35,
        }}
      >
        {o.subtitle}
      </p>
    </header>
  );
}