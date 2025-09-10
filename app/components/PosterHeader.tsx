"use client";

import React, { useEffect, useMemo, useState } from "react";

type Option = { title: string; subtitle: string };

export default function PosterHeader({
  options,
  rotateSignal = 0,            // bump this to rotate (e.g., on Play)
  align = "center",
  maxWidth = 720,
  randomOnMount = true,        // you can set to false to keep index 0 always
}: {
  options: Option[];
  rotateSignal?: number;
  align?: "center" | "left";
  maxWidth?: number;
  randomOnMount?: boolean;
}) {
  // Always provide a fallback so SSR and first client render match
  const safeOptions = useMemo<Option[]>(
    () =>
      options?.length
        ? options
        : [{ title: "Trainer", subtitle: "Practice with focused, friendly tools." }],
    [options]
  );

  // Index is 0 on the server and first client render (no mismatch)
  const [idx, setIdx] = useState(0);
  const [mounted, setMounted] = useState(false);

  // After mount, optionally pick a random item once
  useEffect(() => {
    setMounted(true);
    if (randomOnMount && safeOptions.length > 1) {
      setIdx(Math.floor(Math.random() * safeOptions.length));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [safeOptions.length, randomOnMount]);

  // Rotate only after mount (prevents hydration diff)
  useEffect(() => {
    if (!mounted) return;
    if (!rotateSignal) return;
    setIdx((i) => (i + 1) % safeOptions.length);
  }, [mounted, rotateSignal, safeOptions.length]);

  const o = safeOptions[idx] ?? safeOptions[0];

  return (
    <header style={{ textAlign: align, margin: "6px 0 16px" }}>
      <h1
        suppressHydrationWarning
        style={{ margin: 0, fontSize: 28, lineHeight: 1.2, letterSpacing: 0.2 }}
      >
        {o.title}
      </h1>
      <p
        suppressHydrationWarning
        style={{ margin: "6px auto 0", maxWidth, opacity: 0.8, fontSize: 15, lineHeight: 1.35 }}
      >
        {o.subtitle}
      </p>
    </header>
  );
}