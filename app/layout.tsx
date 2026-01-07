export const dynamic = 'force-dynamic';
export const metadata = {
  title: "CRiIM Mapa",
  description: "Prosta, współdzielona mapa pinezek z historią odwiedzin",
};
import "./globals.css";
import Link from "next/link";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pl">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="theme-color" content="#ffffff" media="(prefers-color-scheme: light)" />
        <meta name="theme-color" content="#0a0a0a" media="(prefers-color-scheme: dark)" />
      </head>
      <body className="bg-[var(--bg)] text-[var(--fg)] touch-manipulation">
        <div className="min-h-dvh flex flex-col">
          <header className="px-4 py-3 border-b border-[var(--border)] sticky top-0 z-10 bg-[var(--bg)]/95 backdrop-blur-md">
            <div className="max-w-5xl mx-auto flex items-center justify-between">
              <Link href="/" className="text-base sm:text-lg font-semibold tracking-tight hover:text-blue-600 transition-colors cursor-pointer">
                CRiIM Mapa
              </Link>
              <div className="flex items-center gap-3">
                <Link
                  href="/stats"
                  className="px-3 py-1.5 sm:px-4 sm:py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs sm:text-sm font-medium transition-colors flex items-center gap-1.5"
                >
                  <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  <span className="hidden sm:inline">Statystyki</span>
                  <span className="sm:hidden">Stats</span>
                </Link>
                <a className="text-xs text-[var(--muted)] hover:text-[var(--fg)] transition-colors" href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">© OSM</a>
              </div>
            </div>
          </header>
          <main className="flex-1">{children}</main>
        </div>
      </body>
    </html>
  );
}
