// src/app/components/GoogleAnalytics.tsx
// Loads the GA4 gtag.js script. Import and render this ONCE in your root layout.tsx.
"use client";

import Script from "next/script";

const GA_MEASUREMENT_ID = "G-1WVREDCTD1";

export default function GoogleAnalytics() {
  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
        strategy="afterInteractive"
      />
      <Script id="ga4-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${GA_MEASUREMENT_ID}', {
            page_path: window.location.pathname,
          });
        `}
      </Script>
    </>
  );
}
