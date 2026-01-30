'use client';

import { useState, useMemo, useEffect } from 'react';

type StreetworkStat = {
  id: number;
  workerName: string;
  month: string;
  interactions: number;
  newContacts: number;
  interventions: number;
  createdAt: string;
  updatedAt: string;
};

const WORKERS = ['Dawid', 'Julia', 'Łukasz', 'Mateusz'];

const STAT_COLORS = {
  interactions: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', icon: '💬' },
  newContacts: {
    bg: 'bg-green-50',
    border: 'border-green-200',
    text: 'text-green-700',
    icon: '👥',
  },
  interventions: {
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    text: 'text-amber-700',
    icon: '🚨',
  },
};

const AVATAR_EMOJIS = [
  '👨',
  '👩',
  '🧑',
  '👤',
  '😊',
  '🙂',
  '😎',
  '🤓',
  '👨‍💼',
  '👩‍💼',
  '🧑‍💼',
  '🦸',
  '🦹',
  '🧙',
  '🧚',
  '🧛',
  '🧜',
  '🧝',
  '🧞',
  '🧟',
  '💀',
  '👽',
  '👾',
  '🤖',
  '🎃',
  '😈',
  '👿',
  '👹',
  '👺',
  '💩',
  '👻',
  '☠️',
  '🔥',
  '💥',
  '⭐',
  '✨',
  '💫',
  '🌟',
  '⚡',
  '💯',
  '🎯',
  '🎨',
  '🎭',
  '🎪',
  '🎸',
  '🎮',
  '🎲',
  '🎱',
  '🏆',
  '🥇',
  '🏅',
  '💎',
  '👑',
  '🦄',
  '🐉',
  '🦁',
  '🐯',
  '🐺',
  '🦊',
  '🐻',
  '🐼',
  '🐨',
  '🐱',
  '🐶',
  '🐷',
  '🐸',
  '🐵',
  '🦍',
  '🦧',
  '🐔',
  '🐧',
];

export default function StreetworkClient({
  initialStats,
  initialMonths,
}: {
  initialStats: StreetworkStat[];
  initialMonths: string[];
}) {
  const [stats, setStats] = useState<StreetworkStat[]>(initialStats);
  const [months] = useState<string[]>(initialMonths);
  const [selectedMonth, setSelectedMonth] = useState<string>(
    initialMonths[0] || new Date().toISOString().slice(0, 7)
  );
  const [avatars, setAvatars] = useState<Record<string, string>>({});
  const [isClient, setIsClient] = useState(false);
  const [editingAvatar, setEditingAvatar] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState<Record<string, boolean>>({});

  // Load avatars from localStorage only on client side
  useEffect(() => {
    setIsClient(true);
    const stored = localStorage.getItem('worker-avatars');
    if (stored) {
      setAvatars(JSON.parse(stored));
    }
  }, []);

  // Get stats for selected month
  const monthStats = useMemo(() => {
    const result: Record<string, StreetworkStat | null> = {};
    WORKERS.forEach((worker) => {
      const stat = stats.find((s) => s.workerName === worker && s.month === selectedMonth);
      result[worker] = stat || null;
    });
    return result;
  }, [stats, selectedMonth]);

  // Calculate totals for selected month
  const monthTotals = useMemo(() => {
    let interactions = 0;
    let newContacts = 0;
    let interventions = 0;

    Object.values(monthStats).forEach((stat) => {
      if (stat) {
        interactions += stat.interactions;
        newContacts += stat.newContacts;
        interventions += stat.interventions;
      }
    });

    return { interactions, newContacts, interventions };
  }, [monthStats]);

  const updateStat = async (
    worker: string,
    field: 'interactions' | 'newContacts' | 'interventions',
    delta: number
  ) => {
    const currentStat = monthStats[worker];
    const currentValue = currentStat?.[field] || 0;
    const newValue = Math.max(0, currentValue + delta);

    // Optimistic update
    setStats((prev) =>
      prev.map((s) =>
        s.workerName === worker && s.month === selectedMonth ? { ...s, [field]: newValue } : s
      )
    );

    setIsSaving((prev) => ({ ...prev, [worker]: true }));

    try {
      await fetch('/api/streetwork', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workerName: worker,
          month: selectedMonth,
          interactions: currentStat?.interactions || 0,
          newContacts: currentStat?.newContacts || 0,
          interventions: currentStat?.interventions || 0,
          [field]: newValue,
        }),
      });

      // Refresh stats
      const response = await fetch('/api/streetwork');
      const data = await response.json();
      setStats(data.stats);
    } catch (error) {
      console.error('Error updating stat:', error);
      alert('Błąd podczas zapisywania danych');
      // Revert on error
      const response = await fetch('/api/streetwork');
      const data = await response.json();
      setStats(data.stats);
    } finally {
      setIsSaving((prev) => ({ ...prev, [worker]: false }));
    }
  };

  const getAvatar = (worker: string) => {
    // Always show first letter during SSR and initial render for consistency
    if (!isClient) return worker.charAt(0);
    return avatars[worker] || worker.charAt(0);
  };

  const setAvatar = (worker: string, avatar: string) => {
    const newAvatars = { ...avatars, [worker]: avatar };
    setAvatars(newAvatars);
    localStorage.setItem('worker-avatars', JSON.stringify(newAvatars));
    setEditingAvatar(null);
  };

  const formatMonthName = (month: string) => {
    const [year, monthNum] = month.split('-');
    const date = new Date(parseInt(year), parseInt(monthNum) - 1);
    return date.toLocaleDateString('pl-PL', { month: 'long', year: 'numeric' });
  };

  return (
    <div className="min-h-screen p-3 bg-gradient-to-br from-slate-50 to-slate-100 sm:p-4 md:p-8">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-4 sm:mb-6">
          <h1 className="mb-1 text-xl font-bold sm:text-2xl md:text-3xl lg:text-4xl text-slate-900 sm:mb-2">
            Streetwork Dashboard
          </h1>
          <p className="text-xs sm:text-sm md:text-base text-slate-600">
            Statystyki pracy streetworkerów
          </p>
        </div>

        {/* Month Selector */}
        <div className="p-3 mb-4 bg-white shadow-lg rounded-xl sm:p-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 sm:items-center">
            <div className="flex-1">
              <label className="block mb-2 text-xs font-medium sm:text-sm text-slate-700">
                Wybierz miesiąc
              </label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-full px-3 py-2 text-sm border rounded-lg border-slate-300 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 sm:text-base"
              >
                {months.map((month) => (
                  <option key={month} value={month}>
                    {formatMonthName(month)}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Month Summary */}
        <div className="p-3 mb-4 border-2 border-purple-200 shadow-lg bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl sm:p-4 md:p-6 sm:mb-6">
          <h2 className="mb-3 text-sm font-bold sm:text-base md:text-lg text-slate-900 sm:mb-4">
            📊 Podsumowanie miesiąca: {formatMonthName(selectedMonth)}
          </h2>
          <div className="grid grid-cols-3 gap-2 sm:gap-3 md:gap-4">
            <div className="p-2 bg-white border-2 border-blue-200 rounded-lg sm:p-3 md:p-4">
              <div className="mb-1 text-xl sm:text-2xl md:text-3xl">💬</div>
              <div className="mb-1 text-xs sm:text-sm text-slate-600">Interakcje</div>
              <div className="text-xl font-bold text-blue-600 sm:text-2xl md:text-3xl">
                {monthTotals.interactions}
              </div>
            </div>
            <div className="p-2 bg-white border-2 border-green-200 rounded-lg sm:p-3 md:p-4">
              <div className="mb-1 text-xl sm:text-2xl md:text-3xl">👥</div>
              <div className="mb-1 text-xs sm:text-sm text-slate-600">Nowe kontakty</div>
              <div className="text-xl font-bold text-green-600 sm:text-2xl md:text-3xl">
                {monthTotals.newContacts}
              </div>
            </div>
            <div className="p-2 bg-white border-2 rounded-lg sm:p-3 md:p-4 border-amber-200">
              <div className="mb-1 text-xl sm:text-2xl md:text-3xl">🚨</div>
              <div className="mb-1 text-xs sm:text-sm text-slate-600">Interwencje</div>
              <div className="text-xl font-bold sm:text-2xl md:text-3xl text-amber-600">
                {monthTotals.interventions}
              </div>
            </div>
          </div>
        </div>

        {/* Workers Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
          {WORKERS.map((worker) => {
            const stat = monthStats[worker];
            const saving = isSaving[worker];

            return (
              <div
                key={worker}
                className="relative p-3 bg-white shadow-lg rounded-xl sm:p-4 md:p-6"
              >
                {saving && (
                  <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/70 rounded-xl">
                    <svg
                      className="w-8 h-8 text-purple-600 animate-spin"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                  </div>
                )}

                <div className="flex items-center mb-4 gap-3">
                  <div className="relative">
                    <div
                      className="flex items-center justify-center w-10 h-10 text-lg font-bold text-white rounded-full cursor-pointer sm:w-12 sm:h-12 bg-gradient-to-br from-purple-500 to-indigo-500 sm:text-xl hover:scale-110 transition-transform"
                      onClick={() => setEditingAvatar(editingAvatar === worker ? null : worker)}
                    >
                      {getAvatar(worker)}
                    </div>
                    {editingAvatar === worker && (
                      <>
                        {/* Backdrop to close picker when clicking outside */}
                        <div
                          className="fixed inset-0 z-10"
                          onClick={() => setEditingAvatar(null)}
                        />
                        {/* Emoji picker */}
                        <div className="absolute left-0 z-20 w-64 p-3 mt-2 overflow-y-auto bg-white border-2 border-purple-200 rounded-lg shadow-xl top-full max-h-64 sm:w-72 sm:max-h-80">
                          <div className="grid grid-cols-6 gap-2 sm:grid-cols-8">
                            {AVATAR_EMOJIS.map((emoji, idx) => (
                              <button
                                key={idx}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setAvatar(worker, emoji);
                                }}
                                className="flex items-center justify-center w-8 h-8 text-xl rounded-lg transition-all hover:bg-purple-100 hover:scale-110 active:scale-95"
                              >
                                {emoji}
                              </button>
                            ))}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setAvatar(worker, worker.charAt(0));
                              }}
                              className="flex items-center justify-center w-8 h-8 text-sm font-bold rounded-lg transition-all hover:bg-purple-100 hover:scale-110 active:scale-95 text-slate-700 bg-slate-100"
                            >
                              {worker.charAt(0)}
                            </button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                  <div>
                    <h3 className="text-base font-bold sm:text-lg md:text-xl text-slate-900">
                      {worker}
                    </h3>
                    <p className="text-xs text-slate-500">Streetworker</p>
                  </div>
                </div>

                <div className="space-y-3">
                  {/* Interactions */}
                  <div
                    className={`${STAT_COLORS.interactions.bg} border-2 ${STAT_COLORS.interactions.border} rounded-lg p-3`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{STAT_COLORS.interactions.icon}</span>
                        <span className="text-xs font-medium sm:text-sm text-slate-700">
                          Interakcje
                        </span>
                      </div>
                      <span
                        className={`text-xl sm:text-2xl font-bold ${STAT_COLORS.interactions.text}`}
                      >
                        {stat?.interactions || 0}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => updateStat(worker, 'interactions', -1)}
                        disabled={saving || (stat?.interactions || 0) === 0}
                        className="flex items-center justify-center flex-1 py-2 text-white bg-blue-500 rounded-lg transition-colors hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M20 12H4"
                          />
                        </svg>
                      </button>
                      <button
                        onClick={() => updateStat(worker, 'interactions', 1)}
                        disabled={saving}
                        className="flex items-center justify-center flex-1 py-2 text-white bg-blue-500 rounded-lg transition-colors hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 4v16m8-8H4"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* New Contacts */}
                  <div
                    className={`${STAT_COLORS.newContacts.bg} border-2 ${STAT_COLORS.newContacts.border} rounded-lg p-3`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{STAT_COLORS.newContacts.icon}</span>
                        <span className="text-xs font-medium sm:text-sm text-slate-700">
                          Nowe kontakty
                        </span>
                      </div>
                      <span
                        className={`text-xl sm:text-2xl font-bold ${STAT_COLORS.newContacts.text}`}
                      >
                        {stat?.newContacts || 0}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => updateStat(worker, 'newContacts', -1)}
                        disabled={saving || (stat?.newContacts || 0) === 0}
                        className="flex items-center justify-center flex-1 py-2 text-white bg-green-500 rounded-lg transition-colors hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M20 12H4"
                          />
                        </svg>
                      </button>
                      <button
                        onClick={() => updateStat(worker, 'newContacts', 1)}
                        disabled={saving}
                        className="flex items-center justify-center flex-1 py-2 text-white bg-green-500 rounded-lg transition-colors hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 4v16m8-8H4"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* Interventions */}
                  <div
                    className={`${STAT_COLORS.interventions.bg} border-2 ${STAT_COLORS.interventions.border} rounded-lg p-3`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{STAT_COLORS.interventions.icon}</span>
                        <span className="text-xs font-medium sm:text-sm text-slate-700">
                          Interwencje
                        </span>
                      </div>
                      <span
                        className={`text-xl sm:text-2xl font-bold ${STAT_COLORS.interventions.text}`}
                      >
                        {stat?.interventions || 0}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => updateStat(worker, 'interventions', -1)}
                        disabled={saving || (stat?.interventions || 0) === 0}
                        className="flex items-center justify-center flex-1 py-2 text-white rounded-lg transition-colors bg-amber-500 hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M20 12H4"
                          />
                        </svg>
                      </button>
                      <button
                        onClick={() => updateStat(worker, 'interventions', 1)}
                        disabled={saving}
                        className="flex items-center justify-center flex-1 py-2 text-white rounded-lg transition-colors bg-amber-500 hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 4v16m8-8H4"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
