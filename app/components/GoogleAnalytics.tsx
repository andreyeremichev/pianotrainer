"use client";
import Script from "next/script";

export default function GoogleAnalytics() {
  const GA_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
  console.log("[GA check] ID:", GA_ID); // ← add this line
  if (!GA_ID) return null;
  return (
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
  );
}