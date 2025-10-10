export const metadata = {
  title: "CRiM Mapa",
  description: "Prosta, współdzielona mapa pinezek z historią odwiedzin",
};

import "./globals.css";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pl">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="theme-color" content="#0a0a0a" />
      </head>
      <body className="bg-[var(--bg)] text-[var(--fg)] touch-manipulation">
        <div className="min-h-dvh flex flex-col">
          <header className="px-4 py-3 border-b border-[var(--border)] sticky top-0 z-10 bg-[var(--bg)]/80 backdrop-blur">
            <div className="max-w-5xl mx-auto flex items-center justify-between">
              <h1 className="text-base sm:text-lg font-semibold tracking-tight">CRiM Mapa</h1>
              <a className="text-xs text-[var(--muted)]" href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">© OpenStreetMap</a>
            </div>
          </header>
          <main className="flex-1">{children}</main>
        </div>
      </body>
    </html>
  );
}
