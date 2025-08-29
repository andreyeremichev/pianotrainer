// app/layout.tsx
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* Force browsers (incl. iOS Safari) to treat the page as light UI */}
        <meta name="color-scheme" content="light" />
      </head>
      <body>{children}</body>
    </html>
  );
}