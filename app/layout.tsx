// app/layout.tsx
import "./globals.css";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-color-scheme="light">
      <head>
        {/* Force a light UI across browsers (prevents auto-darkening in Safari/WebKit) */}
        <meta name="color-scheme" content="light" />
        <meta name="supported-color-schemes" content="light" />
        {/* Keep browser UI bars light as well */}
        <meta name="theme-color" content="#ffffff" />
        {/* Extra belt-and-suspenders: declare light in CSS at the root */}
        <style
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{
            __html: `
              :root { color-scheme: light; }
              html, body { background:#fff; color:#171717; }
            `,
          }}
        />
      </head>
      <body style={{ background: "#fff", color: "#171717" }}>{children}</body>
    </html>
  );
}