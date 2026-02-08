import { cookies } from 'next/headers';
import './globals.css';
import Link from 'next/link';
import SecretLogoButton from '@/components/SecretLogoButton';
import WhatsNewModal from '@/components/WhatsNewModal';

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
        <meta name="theme-color" content="#0f1419" />
      </head>
      <body className="bg-[var(--bg-primary)] text-[var(--text-primary)] touch-manipulation">
        <div className="flex flex-col min-h-dvh">
          <header className="px-4 py-3 border-b border-[var(--border-primary)] sticky top-0 z-10 bg-[var(--bg-secondary)]/95 backdrop-blur-md">
            <div className="flex items-center justify-between max-w-5xl mx-auto">
              <SecretLogoButton />
              <div className="flex items-center gap-2 sm:gap-3">
                {isAuthenticated && (
                  <>
                    <Link
                      href="/stats"
                      className="px-2.5 py-1.5 sm:px-4 sm:py-2 bg-[var(--accent-primary)] hover:bg-[var(--accent-hover)] text-white rounded text-xs sm:text-sm font-medium transition-colors"
                    >
                      <span className="hidden sm:inline">Statystyki</span>
                      <span className="sm:hidden">Stats</span>
                    </Link>

                    <Link
                      href="/street"
                      className="px-2.5 py-1.5 sm:px-4 sm:py-2 bg-[var(--success)] hover:bg-[var(--success-hover)] text-white rounded text-xs sm:text-sm font-medium transition-colors"
                    >
                      <span className="hidden sm:inline">Streetwork</span>
                      <span className="sm:hidden">SW</span>
                    </Link>
                  </>
                )}
                <a
                  className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
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
          {isAuthenticated && <WhatsNewModal />}
        </div>
      </body>
    </html>
  );
}
