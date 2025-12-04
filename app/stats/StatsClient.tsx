// app/stats/StatsClient.tsx
'use client';

import { useState, useMemo } from 'react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart, ComposedChart } from 'recharts';

const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];

type StatsData = {
  daily: Array<{ date: string; count: number; cumulative: number; categories: Record<string, number>; updates?: number }>;
  total: number;
  categories: Record<string, number>;
  firstPin: string | null;
  lastPin: string | null;
  totalUpdates?: number;
};

export default function StatsClient({ stats }: { stats: StatsData }) {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentStats, setCurrentStats] = useState(stats);

  const refreshStats = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/pins/stats');
      const data = await response.json();
      setCurrentStats(data);
    } catch (error) {
      console.error('Błąd podczas odświeżania statystyk:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredStats = useMemo(() => {
    if (!startDate && !endDate) return currentStats;

    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;

    const filteredDaily = currentStats.daily.filter(day => {
      const dayDate = new Date(day.date);
      if (start && dayDate < start) return false;
      if (end && dayDate > end) return false;
      return true;
    });

    const filteredCategories: Record<string, number> = {};
    let total = 0;
    let totalUpdates = 0;

    filteredDaily.forEach(day => {
      total += day.count;
      totalUpdates += day.updates || 0;
      Object.entries(day.categories).forEach(([cat, count]) => {
        filteredCategories[cat] = (filteredCategories[cat] || 0) + count;
      });
    });

    let cumulative = 0;
    const dailyWithCumulative = filteredDaily.map(day => {
      cumulative += day.count;
      return { ...day, cumulative };
    });

    return {
      daily: dailyWithCumulative,
      total,
      categories: filteredCategories,
      firstPin: filteredDaily.length > 0 ? filteredDaily[0].date : null,
      lastPin: filteredDaily.length > 0 ? filteredDaily[filteredDaily.length - 1].date : null,
      totalUpdates
    };
  }, [currentStats, startDate, endDate]);

  const categoryData = Object.entries(filteredStats.categories).map(([name, value]) => ({
    name,
    value
  })).sort((a, b) => b.value - a.value);

  const growthRate = filteredStats.daily.length > 1
    ? ((filteredStats.daily[filteredStats.daily.length - 1].cumulative - filteredStats.daily[0].cumulative) / Math.max(filteredStats.daily[0].cumulative, 1) * 100).toFixed(1)
    : 0;

  const avgPerDay = (filteredStats.total / Math.max(filteredStats.daily.length, 1)).toFixed(1);

  const maxDailyPins = Math.max(...filteredStats.daily.map(d => d.count), 0);
  const maxDailyUpdates = Math.max(...filteredStats.daily.map(d => d.updates || 0), 0);
  const avgUpdatesPerDay = ((filteredStats.totalUpdates || 0) / Math.max(filteredStats.daily.length, 1)).toFixed(1);
  const mostActiveCategory = categoryData[0];
  const leastActiveCategory = categoryData[categoryData.length - 1];

  const totalActivity = filteredStats.total + (filteredStats.totalUpdates || 0);
  const activityRatio = filteredStats.total > 0 ? ((filteredStats.totalUpdates || 0) / filteredStats.total).toFixed(2) : '0';

  const dayCount = filteredStats.daily.length;

  const dailyTableData = useMemo(() => {
    return filteredStats.daily.map(day => {
      const topCategory = Object.entries(day.categories)
        .sort(([, a], [, b]) => b - a)[0];

      return {
        date: day.date,
        pins: day.count,
        updates: day.updates || 0,
        cumulative: day.cumulative,
        activity: day.count + (day.updates || 0),
        topCategory: topCategory ? topCategory[0] : 'Brak',
        categoryCount: Object.keys(day.categories).length
      };
    }).reverse();
  }, [filteredStats.daily]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-2 sm:p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-4 sm:mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-slate-900 mb-1 sm:mb-2">
              Statystyki CRiIM Mapa
            </h1>
            <p className="text-sm sm:text-base text-slate-900">Kompleksowa analiza pinezek i aktywności</p>
          </div>
          <button
            onClick={refreshStats}
            disabled={isLoading}
            className="w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm sm:text-base"
          >
            {isLoading ? (
              <>
                <svg className="animate-spin h-4 w-4 sm:h-5 sm:w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Odświeżanie...
              </>
            ) : (
              <>
                <svg className="h-4 w-4 sm:h-5 sm:w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Odśwież
              </>
            )}
          </button>
        </div>

        {/* Date Range Filter */}
        <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 mb-4 sm:mb-8">
          <h2 className="text-base sm:text-lg font-semibold text-slate-900 mb-3 sm:mb-4">Zakres dat</h2>
          <div className="grid grid-cols-1 gap-3 sm:gap-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs sm:text-sm font-medium text-slate-900 mb-2">
                  Data początkowa
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-900 text-sm"
                  style={{ colorScheme: 'light' }}
                />
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-medium text-slate-900 mb-2">
                  Data końcowa
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-900 text-sm"
                  style={{ colorScheme: 'light' }}
                />
              </div>
            </div>
            <button
              onClick={() => {
                setStartDate('');
                setEndDate('');
              }}
              className="w-full px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors font-medium text-sm"
            >
              Resetuj filtry
            </button>
          </div>
        </div>

        {/* Primary KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-2 sm:gap-4 mb-4 sm:mb-8">
          <div className="bg-white rounded-xl shadow-lg p-3 sm:p-6 border-l-4 border-blue-500 hover:shadow-xl transition-shadow">
            <div className="text-xs sm:text-sm font-medium text-slate-500 mb-1 sm:mb-2">TOTAL</div>
            <p className="text-xl sm:text-3xl font-bold text-slate-900">{filteredStats.total}</p>
            <p className="text-xs sm:text-sm text-slate-900 mt-1">Wszystkie piny</p>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-3 sm:p-6 border-l-4 border-amber-500 hover:shadow-xl transition-shadow">
            <div className="text-xs sm:text-sm font-medium text-slate-500 mb-1 sm:mb-2">WIZYTY</div>
            <p className="text-xl sm:text-3xl font-bold text-slate-900">{filteredStats.totalUpdates || 0}</p>
            <p className="text-xs sm:text-sm text-slate-900 mt-1">Aktualizacji</p>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-3 sm:p-6 border-l-4 border-green-500 hover:shadow-xl transition-shadow">
            <div className="text-xs sm:text-sm font-medium text-slate-500 mb-1 sm:mb-2">WZROST</div>
            <p className="text-xl sm:text-3xl font-bold text-slate-900">{growthRate}%</p>
            <p className="text-xs sm:text-sm text-slate-900 mt-1">Od początku</p>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-3 sm:p-6 border-l-4 border-purple-500 hover:shadow-xl transition-shadow">
            <div className="text-xs sm:text-sm font-medium text-slate-500 mb-1 sm:mb-2">ŚREDNIA</div>
            <p className="text-xl sm:text-3xl font-bold text-slate-900">{avgPerDay}</p>
            <p className="text-xs sm:text-sm text-slate-900 mt-1">Pinów/dzień</p>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-3 sm:p-6 border-l-4 border-orange-500 hover:shadow-xl transition-shadow">
            <div className="text-xs sm:text-sm font-medium text-slate-500 mb-1 sm:mb-2">KATEGORIE</div>
            <p className="text-xl sm:text-3xl font-bold text-slate-900">{Object.keys(filteredStats.categories).length}</p>
            <p className="text-xs sm:text-sm text-slate-900 mt-1">Typów</p>
          </div>
        </div>

        {/* Secondary KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 mb-4 sm:mb-8">
          <div className="bg-white rounded-xl shadow-lg p-3 sm:p-4 border border-slate-200">
            <div className="text-xs text-slate-500 mb-1">Aktywność totalna</div>
            <p className="text-xl sm:text-2xl font-bold text-slate-900">{totalActivity}</p>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-3 sm:p-4 border border-slate-200">
            <div className="text-xs text-slate-500 mb-1">Ratio wizyt/pin</div>
            <p className="text-xl sm:text-2xl font-bold text-slate-900">{activityRatio}</p>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-3 sm:p-4 border border-slate-200">
            <div className="text-xs text-slate-500 mb-1">Max pinów/dzień</div>
            <p className="text-xl sm:text-2xl font-bold text-slate-900">{maxDailyPins}</p>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-3 sm:p-4 border border-slate-200">
            <div className="text-xs text-slate-500 mb-1">Śr. wizyt/dzień</div>
            <p className="text-xl sm:text-2xl font-bold text-slate-900">{avgUpdatesPerDay}</p>
          </div>
        </div>

        {/* Main Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-4 sm:mb-6">
          {/* Cumulative Growth */}
          <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6">
            <h2 className="text-base sm:text-xl font-bold text-slate-900 mb-3 sm:mb-4">
              Wzrost kumulatywny
            </h2>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={filteredStats.daily}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  dataKey="date"
                  tick={{ fill: '#1e293b', fontSize: 10 }}
                  tickFormatter={(date) => {
                    const d = new Date(date);
                    return `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                  }}
                />
                <YAxis tick={{ fill: '#1e293b', fontSize: 10 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    fontSize: '12px'
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="cumulative"
                  stroke="#3b82f6"
                  strokeWidth={3}
                  dot={{ fill: '#3b82f6', r: 4 }}
                  activeDot={{ r: 6 }}
                  name="Łącznie"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Daily Additions */}
          <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6">
            <h2 className="text-base sm:text-xl font-bold text-slate-900 mb-3 sm:mb-4">
              Nowe piny
            </h2>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={filteredStats.daily}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  dataKey="date"
                  tick={{ fill: '#1e293b', fontSize: 10 }}
                  tickFormatter={(date) => {
                    const d = new Date(date);
                    return `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                  }}
                />
                <YAxis tick={{ fill: '#1e293b', fontSize: 10 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    fontSize: '12px'
                  }}
                />
                <Bar
                  dataKey="count"
                  fill="#10b981"
                  radius={[8, 8, 0, 0]}
                  name="Nowe piny"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Combined Activity Chart */}
        <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 mb-4 sm:mb-6">
          <h2 className="text-base sm:text-xl font-bold text-slate-900 mb-3 sm:mb-4">
            Piny vs Wizyty (dzienna aktywność)
          </h2>
          <ResponsiveContainer width="100%" height={250}>
            <ComposedChart data={filteredStats.daily}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis
                dataKey="date"
                tick={{ fill: '#1e293b', fontSize: 10 }}
                tickFormatter={(date) => {
                  const d = new Date(date);
                  return `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                }}
              />
              <YAxis tick={{ fill: '#1e293b', fontSize: 10 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  fontSize: '12px'
                }}
              />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
              <Bar dataKey="count" fill="#3b82f6" name="Piny" radius={[4, 4, 0, 0]} />
              <Bar dataKey="updates" fill="#f59e0b" name="Wizyty" radius={[4, 4, 0, 0]} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Category Distribution */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-4 sm:mb-6">
          <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6">
            <h2 className="text-base sm:text-xl font-bold text-slate-900 mb-3 sm:mb-4">
              Rozkład kategorii
            </h2>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    fontSize: '12px'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Category Bar Chart */}
          <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6">
            <h2 className="text-base sm:text-xl font-bold text-slate-900 mb-3 sm:mb-4">
              Ranking kategorii
            </h2>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={categoryData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis type="number" tick={{ fill: '#1e293b', fontSize: 10 }} />
                <YAxis dataKey="name" type="category" width={80} tick={{ fill: '#1e293b', fontSize: 10 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    fontSize: '12px'
                  }}
                />
                <Bar dataKey="value" fill="#3b82f6" radius={[0, 8, 8, 0]} name="Liczba">
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Daily Activity Table */}
        <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 mb-4 sm:mb-6">
          <h2 className="text-base sm:text-xl font-bold text-slate-900 mb-3 sm:mb-4">
            Szczegółowa tabela aktywności
          </h2>
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <table className="w-full text-xs sm:text-sm">
              <thead>
                <tr className="border-b-2 border-slate-200">
                  <th className="text-left p-2 sm:p-3 text-slate-900 font-semibold">Data</th>
                  <th className="text-right p-2 sm:p-3 text-slate-900 font-semibold">Piny</th>
                  <th className="text-right p-2 sm:p-3 text-slate-900 font-semibold">Wizyty</th>
                  <th className="text-right p-2 sm:p-3 text-slate-900 font-semibold">Aktywność</th>
                  <th className="text-right p-2 sm:p-3 text-slate-900 font-semibold">Suma</th>
                  <th className="text-left p-2 sm:p-3 text-slate-900 font-semibold hidden sm:table-cell">Top kat.</th>
                </tr>
              </thead>
              <tbody>
                {dailyTableData.map((row, idx) => (
                  <tr key={row.date} className={`border-b border-slate-100 ${idx % 2 === 0 ? 'bg-slate-50' : 'bg-white'} hover:bg-blue-50 transition-colors`}>
                    <td className="p-2 sm:p-3 text-slate-900 font-medium whitespace-nowrap">
                      {(() => {
                        const d = new Date(row.date);
                        return `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;
                      })()}
                    </td>
                    <td className="text-right p-2 sm:p-3 text-slate-900">{row.pins}</td>
                    <td className="text-right p-2 sm:p-3 text-slate-900">{row.updates}</td>
                    <td className="text-right p-2 sm:p-3 text-slate-900 font-semibold">{row.activity}</td>
                    <td className="text-right p-2 sm:p-3 text-slate-900 font-bold text-blue-600">{row.cumulative}</td>
                    <td className="p-2 sm:p-3 text-slate-900 hidden sm:table-cell">
                      <span className="inline-block px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                        {row.topCategory}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-slate-300 bg-slate-100 font-bold">
                  <td className="p-2 sm:p-3 text-slate-900">SUMA</td>
                  <td className="text-right p-2 sm:p-3 text-slate-900">{filteredStats.total}</td>
                  <td className="text-right p-2 sm:p-3 text-slate-900">{filteredStats.totalUpdates || 0}</td>
                  <td className="text-right p-2 sm:p-3 text-slate-900">{totalActivity}</td>
                  <td className="text-right p-2 sm:p-3 text-blue-600">{filteredStats.daily[filteredStats.daily.length - 1]?.cumulative || 0}</td>
                  <td className="hidden sm:table-cell"></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Category Summary Table */}
        <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 mb-4 sm:mb-6">
          <h2 className="text-base sm:text-xl font-bold text-slate-900 mb-3 sm:mb-4">
            Podsumowanie kategorii
          </h2>
          <div className="space-y-2">
            {categoryData.map((cat, idx) => {
              const percentage = ((cat.value / filteredStats.total) * 100).toFixed(1);
              return (
                <div key={cat.name} className="flex items-center justify-between p-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors">
                  <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                    <div className="w-3 h-3 sm:w-4 sm:h-4 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                    <span className="font-medium text-slate-900 text-xs sm:text-sm truncate">{cat.name}</span>
                  </div>
                  <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
                    <div className="text-right">
                      <div className="text-xs sm:text-sm text-slate-600">{percentage}%</div>
                      <div className="font-bold text-slate-900 text-sm sm:text-base">{cat.value}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Summary Stats */}
        <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6">
          <h2 className="text-base sm:text-xl font-bold text-slate-900 mb-3 sm:mb-4">Podsumowanie okresu</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs sm:text-sm text-slate-900">
            <div className="p-3 bg-slate-50 rounded-lg">
              <span className="font-semibold">Okres analizy:</span> {dayCount} dni
            </div>
            <div className="p-3 bg-slate-50 rounded-lg">
              <span className="font-semibold">Aktywność totalna:</span> {totalActivity} wydarzeń
            </div>
            <div className="p-3 bg-slate-50 rounded-lg">
              <span className="font-semibold">Pierwszy pin:</span>{' '}
              {filteredStats.firstPin ? (() => {
                const d = new Date(filteredStats.firstPin);
                return `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;
              })() : 'N/A'}
            </div>
            <div className="p-3 bg-slate-50 rounded-lg">
              <span className="font-semibold">Ostatni pin:</span>{' '}
              {filteredStats.lastPin ? (() => {
                const d = new Date(filteredStats.lastPin);
                return `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;
              })() : 'N/A'}
            </div>
            <div className="p-3 bg-slate-50 rounded-lg">
              <span className="font-semibold">Najpopularniejsza:</span> {mostActiveCategory?.name || 'N/A'} ({mostActiveCategory?.value || 0})
            </div>
            <div className="p-3 bg-slate-50 rounded-lg">
              <span className="font-semibold">Najsłabsza kategoria:</span> {leastActiveCategory?.name || 'N/A'} ({leastActiveCategory?.value || 0})
            </div>
            <div className="p-3 bg-slate-50 rounded-lg">
              <span className="font-semibold">Max pinów w dzień:</span> {maxDailyPins}
            </div>
            <div className="p-3 bg-slate-50 rounded-lg">
              <span className="font-semibold">Max wizyt w dzień:</span> {maxDailyUpdates}
            </div>
          </div>
        </div>
      </div>
      <style jsx global>{`
    input[type="date"]::-webkit-calendar-picker-indicator {
      filter: invert(0);
    }
    input[type="date"]::-webkit-datetime-edit-fields-wrapper {
      color: #1e293b;
    }
    input[type="date"]::-webkit-datetime-edit-text {
      color: #1e293b;
      padding: 0 0.3em;
    }
    input[type="date"]::-webkit-datetime-edit-month-field {
      color: #1e293b;
    }
    input[type="date"]::-webkit-datetime-edit-day-field {
      color: #1e293b;
    }
    input[type="date"]::-webkit-datetime-edit-year-field {
      color: #1e293b;
    }
  `}</style>
    </div>
  );
}
