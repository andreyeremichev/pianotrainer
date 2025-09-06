// app/layout.tsx
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
<link
  href="https://fonts.googleapis.com/css2?family=Noto+Sans+Symbols+2:wght@400;700&display=swap"
  rel="stylesheet"
/>
        {/* Force browsers (incl. iOS Safari) to treat the page as light UI */}
        <meta name="color-scheme" content="light" />
      </head>
      <body>{children}</body>
    </html>
  );
}