import { cookies } from 'next/headers';
import './globals.css';
import Link from 'next/link';
import SecretLogoButton from '@/components/SecretLogoButton';

export const dynamic = 'force-dynamic';
export const metadata = {
  title: 'CRiIM Mapa',
  description: 'Prosta, współdzielona mapa pinezek z historią odwiedzin',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = cookies();
  const sessionCookie = cookieStore.get('auth_session');

  // Debug logging
  console.log('Session cookie:', sessionCookie);

  const isAuthenticated = !!sessionCookie?.value;

  console.log('Is authenticated:', isAuthenticated);

  return (
    <html lang="pl">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="theme-color" content="#ffffff" media="(prefers-color-scheme: light)" />
        <meta name="theme-color" content="#0a0a0a" media="(prefers-color-scheme: dark)" />
      </head>
      <body className="bg-[var(--bg)] text-[var(--fg)] touch-manipulation">
        <div className="flex flex-col min-h-dvh">
          <header className="px-4 py-3 border-b border-[var(--border)] sticky top-0 z-10 bg-[var(--bg)]/95 backdrop-blur-md">
            <div className="flex items-center justify-between max-w-5xl mx-auto">
              <SecretLogoButton />
              <div className="flex items-center gap-2 sm:gap-3">
                {isAuthenticated && (
                  <>
                    <Link
                      href="/stats"
                      className="px-2.5 py-1.5 sm:px-4 sm:py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs sm:text-sm font-medium transition-colors flex items-center gap-1 sm:gap-1.5"
                    >
                      <svg
                        className="w-3.5 h-3.5 sm:w-4 sm:h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                        />
                      </svg>
                      <span className="hidden sm:inline">Statystyki</span>
                      <span className="sm:hidden">Stats</span>
                    </Link>

                    <Link
                      href="/street"
                      className="px-2.5 py-1.5 sm:px-4 sm:py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs sm:text-sm font-medium transition-colors flex items-center gap-1 sm:gap-1.5"
                    >
                      <svg
                        className="w-3.5 h-3.5 sm:w-4 sm:h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                        />
                      </svg>
                      <span className="hidden sm:inline">Street</span>
                      <span className="sm:hidden">SW</span>
                    </Link>
                  </>
                )}
                <a
                  className="text-xs text-[var(--muted)] hover:text-[var(--fg)] transition-colors"
                  href="https://www.openstreetmap.org/copyright"
                  target="_blank"
                  rel="noreferrer"
                >
                  © OSM
                </a>
              </div>
            </div>
          </header>
          <main className="flex-1">{children}</main>
        </div>
      </body>
    </html>
  );
}
