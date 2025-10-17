"use client";
import { useEffect } from "react";
import Script from "next/script";

export default function GoogleAnalytics() {
  const GA_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

  // Confirm runtime environment (client-side)
  useEffect(() => {
    console.log("[GA runtime check] ID:", GA_ID);
  }, [GA_ID]);

  return (
    <>
      <div
        style={{
          position: "fixed",
          bottom: 0,
          right: 0,
          background: "gold",
          color: "#000",
          padding: 4,
          fontSize: 10,
          zIndex: 99999,
        }}
      >
        GA component mounted
      </div>

      {GA_ID && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
            strategy="afterInteractive"
          />
          <Script id="ga-init" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${GA_ID}');
            `}
          </Script>
        </>
      )}
    </>
  );
}