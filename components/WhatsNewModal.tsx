'use client';

import { useEffect, useState } from 'react';

type UpdateFeature = {
  icon: string;
  title: string;
  description: string;
  badge?: string;
};

type AppUpdate = {
  id: number;
  version: string;
  title: string;
  description: string;
  features: UpdateFeature[];
  released_at: string;
};

export default function WhatsNewModal() {
  const [update, setUpdate] = useState<AppUpdate | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    async function checkForUpdates() {
      try {
        const response = await fetch('/api/changelogs');
        const data = await response.json();

        if (data.update && !data.hasViewed) {
          setUpdate(data.update);
          // Slight delay for smoother entrance
          setTimeout(() => setIsVisible(true), 100);
        }
      } catch (error) {
        console.error('Failed to fetch updates:', error);
      }
    }

    checkForUpdates();
  }, []);

  const handleClose = async () => {
    if (!update) return;

    setIsClosing(true);

    try {
      await fetch('/api/changelogs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updateId: update.id }),
      });
    } catch (error) {
      console.error('Failed to mark update as viewed:', error);
    }

    setTimeout(() => {
      setIsVisible(false);
      setUpdate(null);
      setIsClosing(false);
    }, 300);
  };

  if (!update || !isVisible) return null;

  return (
    <div
      className={`fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm transition-opacity duration-300 ${
        isClosing ? 'opacity-0' : 'opacity-100'
      }`}
      onClick={handleClose}
    >
      <div
        className={`bg-[var(--bg-secondary)] rounded-lg shadow-2xl max-w-2xl w-full max-h-[92vh] overflow-hidden border border-[var(--border-primary)] transition-all duration-300 ${
          isClosing ? 'scale-95 opacity-0' : 'scale-100 opacity-100'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative px-3 sm:px-4 py-3 sm:py-4 bg-[var(--bg-secondary)] border-b border-[var(--border-primary)]">
          <div className="relative flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2 py-0.5 text-[10px] sm:text-xs font-bold bg-[var(--accent-primary)] text-white rounded">
                  Wersja {update.version}
                </span>
                <span className="px-2 py-0.5 text-[10px] sm:text-xs font-bold bg-[var(--success)] text-white rounded">
                  NOWOŚĆ
                </span>
              </div>
              <h2 className="text-base sm:text-lg md:text-xl font-bold text-[var(--text-primary)] mb-1.5">
                {update.title}
              </h2>
              <p className="text-xs sm:text-sm text-[var(--text-secondary)]">
                {update.description}
              </p>
            </div>
            <button
              onClick={handleClose}
              className="ml-2 sm:ml-3 p-1.5 rounded hover:bg-[var(--bg-tertiary)] transition-colors text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex-shrink-0"
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Features List */}
        <div className="px-3 sm:px-6 py-3 sm:py-4 max-h-[60vh] overflow-y-auto">
          <div className="space-y-2 sm:space-y-3">
            {update.features.map((feature, index) => (
              <div
                key={index}
                className="p-2.5 sm:p-3 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-secondary)] transition-colors"
                style={{
                  animation: `slideInUp 0.3s ease-out ${index * 0.08}s both`,
                }}
              >
                <div className="flex items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-1">
                      <h3 className="text-xs sm:text-sm font-bold text-[var(--text-primary)]">
                        {feature.title}
                      </h3>
                      {feature.badge && (
                        <span className="px-1.5 py-0.5 text-[8px] sm:text-[9px] font-bold bg-[var(--success)] text-white rounded uppercase tracking-wide flex-shrink-0">
                          {feature.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] sm:text-xs text-[var(--text-secondary)] leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-3 sm:px-4 py-2.5 sm:py-3 bg-[var(--bg-secondary)] border-t border-[var(--border-primary)]">
          <div className="flex items-center justify-between gap-2 sm:gap-3">
            <p className="text-[10px] sm:text-xs text-[var(--text-muted)] flex-1">
              <span className="font-medium">Uwaga:</span> Wszystkie funkcje dostępne od zaraz
            </p>
            <button
              onClick={handleClose}
              className="px-3 sm:px-4 py-1.5 sm:py-2 bg-[var(--accent-primary)] hover:bg-[var(--accent-hover)] text-white text-xs sm:text-sm font-medium rounded transition-colors active:scale-95 whitespace-nowrap flex-shrink-0"
            >
              Zamknij
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes slideInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
