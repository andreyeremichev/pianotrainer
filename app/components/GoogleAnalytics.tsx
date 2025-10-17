"use client";
import Script from "next/script";

export default function GoogleAnalytics() {
  // TEMP: hard-code your real GA4 Measurement ID
  const GA_ID = "G-XH43YJ2XQ8"; // ← replace with your ID

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