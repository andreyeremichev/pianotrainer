"use client";

import { useEffect, useMemo, useState } from "react";
import { track } from "@vercel/analytics";

// Shows button only when enabled via NEXT_PUBLIC var OR ?debug=1
export default function DebugAnalytics() {
  // Read NEXT_PUBLIC var on the client
  const envEnabled =
    typeof process !== "undefined" &&
    process.env.NEXT_PUBLIC_ENABLE_ANALYTICS_DEBUG === "1";

  const [queryEnabled, setQueryEnabled] = useState(false);

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      setQueryEnabled(params.get("debug") === "1" || params.get("va") === "1");
    } catch {}
  }, []);

  const enabled = useMemo(() => envEnabled || queryEnabled, [envEnabled, queryEnabled]);

  useEffect(() => {
    if (!enabled) return;
    console.log("[VA] debug enabled — sending mount event");
    try {
      track("debug_page_mount");
    } catch (e) {
      console.warn("Vercel Analytics track() failed", e);
    }
  }, [enabled]);

  if (!enabled) return null;

  return (
    <button
      onClick={() => track("debug_button_click")}
      style={{
        position: "fixed",
        bottom: 12,
        right: 12,
        padding: "8px 10px",
        opacity: 0.6,
        zIndex: 99999,
        border: "1px solid #ccc",
        background: "#fff",
        borderRadius: 6,
        fontSize: 12,
        cursor: "pointer",
      }}
      aria-label="Send analytics test event"
      title="Sends a Vercel Analytics test event"
    >
      Send Analytics Test
    </button>
  );
}