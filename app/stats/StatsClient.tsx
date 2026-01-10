// app/stats/StatsClient.tsx
'use client';

import { useState, useMemo } from 'react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ComposedChart } from 'recharts';
import * as XLSX from 'xlsx';

const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];

type StatsData = {
  daily: Array<{ date: string; count: number; cumulative: number; categories: Record<string, number>; updates?: number }>;
  total: number;
  categories: Record<string, number>;
  firstPin: string | null;
  lastPin: string | null;
  totalUpdates?: number;
};

type Pin = {
  id: number;
  title: string;
  description: string | null;
  category: string;
  visitsCount: number;
  createdAt: string;
  updatedAt: string;
  visits?: Visit[];
};

type Visit = {
  id: number;
  name: string;
  note: string | null;
  visitedAt: string;
};

export default function StatsClient({ stats }: { stats: StatsData }) {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentStats, setCurrentStats] = useState(stats);
  const [isExporting, setIsExporting] = useState(false);
  const [showPinsData, setShowPinsData] = useState(false);
  const [pinsData, setPinsData] = useState<Pin[]>([]);
  const [loadingPins, setLoadingPins] = useState(false);
  const [selectedPin, setSelectedPin] = useState<Pin | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

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

  const loadPinsData = async () => {
    setLoadingPins(true);
    try {
      const response = await fetch('/api/pins/export');
      const data = await response.json();
      setPinsData(data.pins);
      setShowPinsData(true);
    } catch (error) {
      console.error('Błąd podczas ładowania danych:', error);
    } finally {
      setLoadingPins(false);
    }
  };

  const exportToExcel = async () => {
    setIsExporting(true);
    try {
      const response = await fetch('/api/pins/export');
      const data = await response.json();

      const wb = XLSX.utils.book_new();

      // ========== MAIN SHEET: Complete Pin Overview with All Visits ==========
      const mainData: any[] = [];
      data.pins.forEach((pin: Pin) => {
        if (!pin.visits || pin.visits.length === 0) {
          mainData.push({
            'Tytuł pinezki': pin.title,
            'Kategoria': pin.category,
            'Opis': pin.description || '',
            'Data utworzenia': new Date(pin.createdAt).toLocaleDateString('pl-PL'),
            'Ostatnia aktualizacja': new Date(pin.updatedAt).toLocaleDateString('pl-PL'),
            'Liczba wizyt': 0,
            'Odwiedzający': '',
            'Data wizyty': '',
            'Notatka z wizyty': ''
          });
        } else {
          pin.visits.forEach((visit: Visit, index: number) => {
            mainData.push({
              'Tytuł pinezki': pin.title,
              'Kategoria': pin.category,
              'Opis': pin.description || '',
              'Data utworzenia': new Date(pin.createdAt).toLocaleDateString('pl-PL'),
              'Ostatnia aktualizacja': new Date(pin.updatedAt).toLocaleDateString('pl-PL'),
              'Liczba wizyt': pin.visitsCount || pin.visits?.length || 0,
              'Odwiedzający': visit.name,
              'Data wizyty': new Date(visit.visitedAt).toLocaleDateString('pl-PL'),
              'Notatka z wizyty': visit.note || ''
            });
          });
        }
      });

      const ws1 = XLSX.utils.json_to_sheet(mainData);
      ws1['!cols'] = [
        { wch: 35 }, { wch: 20 }, { wch: 40 }, { wch: 18 }, { wch: 18 },
        { wch: 12 }, { wch: 25 }, { wch: 18 }, { wch: 50 }
      ];

      if (mainData.length > 0) {
        ws1['!autofilter'] = { ref: `A1:I${mainData.length + 1}` };
      }

      const headerCells = ['A1', 'B1', 'C1', 'D1', 'E1', 'F1', 'G1', 'H1', 'I1'];
      headerCells.forEach(cell => {
        if (ws1[cell]) {
          ws1[cell].s = {
            font: { bold: true, color: { rgb: "FFFFFF" } },
            fill: { fgColor: { rgb: "4472C4" } },
            alignment: { horizontal: "center", vertical: "center", wrapText: true },
            border: {
              top: { style: "thin", color: { rgb: "000000" } },
              bottom: { style: "thin", color: { rgb: "000000" } },
              left: { style: "thin", color: { rgb: "000000" } },
              right: { style: "thin", color: { rgb: "000000" } }
            }
          };
        }
      });

      ws1['!freeze'] = { xSplit: 0, ySplit: 1 };
      XLSX.utils.book_append_sheet(wb, ws1, 'Baza Pinezek');

      // ========== SUMMARY SHEET ==========
      const summaryData = data.pins.map((pin: Pin) => ({
        'Tytuł': pin.title,
        'Kategoria': pin.category,
        'Opis': pin.description || '',
        'Liczba wizyt': pin.visitsCount || 0,
        'Data utworzenia': new Date(pin.createdAt).toLocaleDateString('pl-PL'),
        'Ostatnia aktualizacja': new Date(pin.updatedAt).toLocaleDateString('pl-PL')
      }));

      const ws2 = XLSX.utils.json_to_sheet(summaryData);
      ws2['!cols'] = [{ wch: 35 }, { wch: 20 }, { wch: 45 }, { wch: 12 }, { wch: 18 }, { wch: 18 }];

      if (summaryData.length > 0) {
        ws2['!autofilter'] = { ref: `A1:F${summaryData.length + 1}` };
      }

      const summaryHeaders = ['A1', 'B1', 'C1', 'D1', 'E1', 'F1'];
      summaryHeaders.forEach(cell => {
        if (ws2[cell]) {
          ws2[cell].s = {
            font: { bold: true, color: { rgb: "FFFFFF" } },
            fill: { fgColor: { rgb: "70AD47" } },
            alignment: { horizontal: "center", vertical: "center", wrapText: true }
          };
        }
      });

      ws2['!freeze'] = { xSplit: 0, ySplit: 1 };
      XLSX.utils.book_append_sheet(wb, ws2, 'Podsumowanie Pinezek');

      // ========== VISITS SHEET ==========
      const visitsData: any[] = [];
      data.pins.forEach((pin: Pin) => {
        pin.visits?.forEach((visit: Visit) => {
          visitsData.push({
            'Tytuł pinezki': pin.title,
            'Kategoria': pin.category,
            'Odwiedzający': visit.name,
            'Data wizyty': new Date(visit.visitedAt).toLocaleDateString('pl-PL') + ' ' + new Date(visit.visitedAt).toLocaleTimeString('pl-PL'),
            'Notatka': visit.note || ''
          });
        });
      });

      const ws3 = XLSX.utils.json_to_sheet(visitsData);
      ws3['!cols'] = [{ wch: 35 }, { wch: 20 }, { wch: 25 }, { wch: 22 }, { wch: 60 }];

      if (visitsData.length > 0) {
        ws3['!autofilter'] = { ref: `A1:E${visitsData.length + 1}` };
      }

      const visitHeaders = ['A1', 'B1', 'C1', 'D1', 'E1'];
      visitHeaders.forEach(cell => {
        if (ws3[cell]) {
          ws3[cell].s = {
            font: { bold: true, color: { rgb: "FFFFFF" } },
            fill: { fgColor: { rgb: "FFC000" } },
            alignment: { horizontal: "center", vertical: "center", wrapText: true }
          };
        }
      });

      ws3['!freeze'] = { xSplit: 0, ySplit: 1 };
      XLSX.utils.book_append_sheet(wb, ws3, 'Wszystkie Wizyty');

      // ========== STATS SHEET ==========
      const categoryStats = Object.entries(filteredStats.categories)
        .map(([name, count]) => ({
          'Kategoria': name,
          'Liczba pinezek': count,
          'Procent': ((count / filteredStats.total) * 100).toFixed(2) + '%'
        }))
        .sort((a, b) => b['Liczba pinezek'] - a['Liczba pinezek']);

      const ws4 = XLSX.utils.json_to_sheet(categoryStats);
      ws4['!cols'] = [{ wch: 25 }, { wch: 15 }, { wch: 12 }];

      if (categoryStats.length > 0) {
        ws4['!autofilter'] = { ref: `A1:C${categoryStats.length + 1}` };
      }

      const statHeaders = ['A1', 'B1', 'C1'];
      statHeaders.forEach(cell => {
        if (ws4[cell]) {
          ws4[cell].s = {
            font: { bold: true, color: { rgb: "FFFFFF" } },
            fill: { fgColor: { rgb: "9966FF" } },
            alignment: { horizontal: "center", vertical: "center" }
          };
        }
      });

      ws4['!freeze'] = { xSplit: 0, ySplit: 1 };
      XLSX.utils.book_append_sheet(wb, ws4, 'Statystyki Kategorii');

      const fileName = `CRiIM_Mapa_Export_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);

    } catch (error) {
      console.error('Błąd podczas eksportu:', error);
      alert('Wystąpił błąd podczas eksportu danych');
    } finally {
      setIsExporting(false);
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

  const filteredPins = useMemo(() => {
    let filtered = pinsData;
    
    if (selectedCategories.length > 0) {
      filtered = filtered.filter(pin => selectedCategories.includes(pin.category));
    }
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(pin => 
        pin.title.toLowerCase().includes(term) ||
        pin.category.toLowerCase().includes(term) ||
        pin.description?.toLowerCase().includes(term)
      );
    }
    
    return filtered;
  }, [pinsData, searchTerm, selectedCategories]);

  const suggestions = useMemo(() => {
    if (!searchTerm || searchTerm.length < 2) return [];
    const term = searchTerm.toLowerCase();
    return pinsData
      .filter(pin => 
        pin.title.toLowerCase().includes(term) ||
        pin.category.toLowerCase().includes(term)
      )
      .slice(0, 5);
  }, [pinsData, searchTerm]);

  const availableCategories = useMemo(() => {
    const categories = new Set(pinsData.map(pin => pin.category));
    return Array.from(categories).sort();
  }, [pinsData]);

  const toggleCategory = (category: string) => {
    setSelectedCategories(prev => 
      prev.includes(category) 
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  // Calendar helpers
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    return { daysInMonth, startingDayOfWeek, year, month };
  };

  const getActivityForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    const dayData = currentStats.daily.find(d => d.date === dateStr);
    
    if (!dayData) return { pins: [], visits: [], created: 0, visited: 0 };
    
    const dayPins = pinsData.filter(pin => {
      const createdDate = new Date(pin.createdAt).toISOString().split('T')[0];
      return createdDate === dateStr;
    });
    
    const dayVisits: Array<{pin: Pin, visit: Visit}> = [];
    pinsData.forEach(pin => {
      pin.visits?.forEach(visit => {
        const visitDate = new Date(visit.visitedAt).toISOString().split('T')[0];
        if (visitDate === dateStr) {
          dayVisits.push({ pin, visit });
        }
      });
    });
    
    return {
      pins: dayPins,
      visits: dayVisits,
      created: dayData.count,
      visited: dayData.updates || 0
    };
  };

  const getActivityLevel = (created: number, visited: number) => {
    const total = created + visited;
    if (total === 0) return 'bg-slate-50';
    if (total <= 2) return 'bg-green-100';
    if (total <= 5) return 'bg-green-300';
    if (total <= 10) return 'bg-green-500';
    return 'bg-green-700';
  };

  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

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

  const totalActivity = filteredStats.total + (filteredStats.totalUpdates || 0);
  const activityRatio = filteredStats.total > 0 ? ((filteredStats.totalUpdates || 0) / filteredStats.total).toFixed(2) : '0';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-3 sm:p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-4 sm:mb-6 md:mb-8">
          <div className="mb-3 sm:mb-4">
            <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-slate-900 mb-1 sm:mb-2">
              Statystyki CRiIM Mapa
            </h1>
            <p className="text-xs sm:text-sm md:text-base text-slate-600">Kompleksowa analiza pinezek i aktywności</p>
          </div>
          <div className="flex flex-col gap-2">
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  if (showCalendar) {
                    setShowCalendar(false);
                  } else {
                    setShowPinsData(false);
                    setShowCalendar(true);
                    if (pinsData.length === 0) loadPinsData();
                  }
                }}
                disabled={loadingPins}
                className="px-4 py-2.5 sm:py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm sm:text-base"
              >
                {showCalendar ? (
                  <>
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    Statystyki
                  </>
                ) : (
                  <>
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Kalendarz
                  </>
                )}
              </button>
              
              <button
                onClick={() => {
                  if (showPinsData) {
                    setShowPinsData(false);
                  } else {
                    setShowCalendar(false);
                    loadPinsData();
                  }
                }}
                disabled={loadingPins}
                className="px-4 py-2.5 sm:py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm sm:text-base"
              >
                {loadingPins ? (
                  <>
                    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Ładowanie...
                  </>
                ) : showPinsData ? (
                  <>
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    Statystyki
                  </>
                ) : (
                  <>
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Dane pinów
                  </>
                )}
              </button>
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={exportToExcel}
                disabled={isExporting}
                className="px-4 py-2.5 sm:py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm sm:text-base"
              >
                {isExporting ? (
                  <>
                    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span className="hidden sm:inline">Eksportowanie...</span>
                    <span className="sm:hidden">...</span>
                  </>
                ) : (
                  <>
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Excel
                  </>
                )}
              </button>
              
              <button
                onClick={refreshStats}
                disabled={isLoading}
                className="px-4 py-2.5 sm:py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm sm:text-base"
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span className="hidden sm:inline">Odświeżanie...</span>
                    <span className="sm:hidden">...</span>
                  </>
                ) : (
                  <>
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Odśwież
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Calendar View */}
        {showCalendar ? (
          <div className="space-y-3 sm:space-y-4">
            <div className="bg-white rounded-xl shadow-lg p-3 sm:p-4 md:p-6">
              {/* Month Navigation */}
              <div className="flex items-center justify-between mb-4">
                <button
                  onClick={prevMonth}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-slate-900">
                  {currentMonth.toLocaleDateString('pl-PL', { month: 'long', year: 'numeric' })}
                </h2>
                <button
                  onClick={nextMonth}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 024 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>

              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-1 sm:gap-2">
                {/* Day headers */}
                {['Nd', 'Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'Sb'].map((day) => (
                  <div key={day} className="text-center font-semibold text-slate-600 text-xs sm:text-sm p-1 sm:p-2">
                    {day}
                  </div>
                ))}
                
                {/* Calendar days */}
                {(() => {
                  const { daysInMonth, startingDayOfWeek, year, month } = getDaysInMonth(currentMonth);
                  const days = [];
                  
                  // Empty cells before month starts
                  for (let i = 0; i < startingDayOfWeek; i++) {
                    days.push(<div key={`empty-${i}`} className="aspect-square" />);
                  }
                  
                  // Days of the month
                  for (let day = 1; day <= daysInMonth; day++) {
                    const date = new Date(year, month, day);
                    const activity = getActivityForDate(date);
                    const activityLevel = getActivityLevel(activity.created, activity.visited);
                    const isSelected = selectedDay?.toDateString() === date.toDateString();
                    
                    days.push(
                      <button
                        key={day}
                        onClick={() => setSelectedDay(date)}
                        className={`aspect-square p-1 sm:p-2 rounded-lg border-2 transition-all ${
                          isSelected
                            ? 'border-indigo-500 ring-2 ring-indigo-200'
                            : 'border-transparent hover:border-slate-300'
                        } ${activityLevel}`}
                      >
                        <div className="text-xs sm:text-sm font-medium text-slate-900">{day}</div>
                        {(activity.created > 0 || activity.visited > 0) && (
                          <div className="text-[8px] sm:text-[10px] mt-0.5 sm:mt-1 space-y-0.5">
                            {activity.created > 0 && (
                              <div className="text-blue-700 font-semibold">+{activity.created}</div>
                            )}
                            {activity.visited > 0 && (
                              <div className="text-amber-700 font-semibold">↻{activity.visited}</div>
                            )}
                          </div>
                        )}
                      </button>
                    );
                  }
                  
                  return days;
                })()}
              </div>

              {/* Legend */}
              <div className="mt-4 flex flex-wrap gap-3 text-xs sm:text-sm text-slate-600">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-blue-100 rounded"></div>
                  <span>+X = Nowe piny</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-amber-100 rounded"></div>
                  <span>↻X = Wizyty</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    <div className="w-3 h-3 bg-slate-50 border border-slate-200 rounded"></div>
                    <div className="w-3 h-3 bg-green-100 rounded"></div>
                    <div className="w-3 h-3 bg-green-300 rounded"></div>
                    <div className="w-3 h-3 bg-green-500 rounded"></div>
                    <div className="w-3 h-3 bg-green-700 rounded"></div>
                  </div>
                  <span>Poziom aktywności</span>
                </div>
              </div>
            </div>

            {/* Selected Day Details */}
            {selectedDay && (
              <div className="bg-white rounded-xl shadow-lg p-3 sm:p-4 md:p-6">
                <h3 className="text-base sm:text-lg md:text-xl font-bold text-slate-900 mb-4">
                  {selectedDay.toLocaleDateString('pl-PL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </h3>
                
                {(() => {
                  const activity = getActivityForDate(selectedDay);
                  
                  if (activity.created === 0 && activity.visited === 0) {
                    return (
                      <p className="text-slate-500 text-center py-8">Brak aktywności tego dnia</p>
                    );
                  }
                  
                  return (
                    <div className="space-y-4">
                      {/* New Pins */}
                      {activity.pins.length > 0 && (
                        <div>
                          <h4 className="text-sm sm:text-base font-semibold text-slate-900 mb-2 flex items-center gap-2">
                            <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">
                              +{activity.created}
                            </span>
                            Nowe pinezki
                          </h4>
                          <div className="space-y-2">
                            {activity.pins.map(pin => (
                              <div key={pin.id} className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                                <div className="font-medium text-slate-900 text-sm sm:text-base">{pin.title}</div>
                                <div className="text-xs text-slate-600 mt-1">{pin.category}</div>
                                {pin.description && (
                                  <div className="text-xs text-slate-500 mt-1">{pin.description}</div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {/* Visits */}
                      {activity.visits.length > 0 && (
                        <div>
                          <h4 className="text-sm sm:text-base font-semibold text-slate-900 mb-2 flex items-center gap-2">
                            <span className="bg-amber-100 text-amber-800 px-2 py-1 rounded text-xs">
                              ↻{activity.visited}
                            </span>
                            Wizyty
                          </h4>
                          <div className="space-y-2">
                            {activity.visits.map(({ pin, visit }, idx) => (
                              <div key={`${pin.id}-${visit.id}-${idx}`} className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                                <div className="font-medium text-slate-900 text-sm sm:text-base">{pin.title}</div>
                                <div className="text-xs text-slate-600 mt-1">
                                  Odwiedził: {visit.name} • {new Date(visit.visitedAt).toLocaleTimeString('pl-PL')}
                                </div>
                                {visit.note && (
                                  <div className="text-xs text-slate-500 mt-1 italic">"{visit.note}"</div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        ) : showPinsData ? (
          <div className="space-y-3 sm:space-y-4">
            {/* Search Bar with Autocomplete */}
            <div className="bg-white rounded-xl shadow-lg p-3 sm:p-4">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Szukaj pinezki..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onFocus={() => setShowSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                  className="w-full px-3 sm:px-4 py-2 sm:py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-slate-900 text-sm sm:text-base"
                />
                
                {/* Autocomplete Suggestions */}
                {showSuggestions && suggestions.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-slate-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {suggestions.map((pin) => (
                      <div
                        key={pin.id}
                        onClick={() => {
                          setSearchTerm(pin.title);
                          setShowSuggestions(false);
                          setSelectedPin(pin);
                        }}
                        className="px-3 sm:px-4 py-2 sm:py-3 hover:bg-purple-50 cursor-pointer border-b border-slate-100 last:border-b-0"
                      >
                        <div className="font-medium text-slate-900 text-sm sm:text-base">{pin.title}</div>
                        <div className="text-xs text-slate-500">{pin.category}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Category Filter Buttons */}
              <div className="mt-3 sm:mt-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs sm:text-sm font-semibold text-slate-900">Filtruj po kategorii:</h3>
                  {selectedCategories.length > 0 && (
                    <button
                      onClick={() => setSelectedCategories([])}
                      className="text-xs text-purple-600 hover:text-purple-700 font-medium"
                    >
                      Wyczyść
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5 sm:gap-2">
                  {availableCategories.map((category) => (
                    <button
                      key={category}
                      onClick={() => toggleCategory(category)}
                      className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs sm:text-sm font-medium transition-colors ${
                        selectedCategories.includes(category)
                          ? 'bg-purple-600 text-white'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {category}
                      {selectedCategories.includes(category) && (
                        <span className="ml-1">✓</span>
                      )}
                    </button>
                  ))}
                </div>
                {selectedCategories.length > 0 && (
                  <p className="text-xs text-slate-500 mt-2">
                    Pokazuję {filteredPins.length} {filteredPins.length === 1 ? 'pinezkę' : 'pinezek'}
                  </p>
                )}
              </div>
            </div>

            {/* Pins List - Mobile optimized */}
            <div className="space-y-3 sm:space-y-0 sm:grid sm:grid-cols-2 lg:grid-cols-2 sm:gap-4">
              {/* Pins Column */}
              <div className="bg-white rounded-xl shadow-lg p-3 sm:p-4 max-h-[500px] sm:max-h-[700px] overflow-y-auto">
                <h2 className="text-base sm:text-lg md:text-xl font-bold text-slate-900 mb-3 sm:mb-4 sticky top-0 bg-white pb-2">
                  Pinezki ({filteredPins.length})
                </h2>
                <div className="space-y-2">
                  {filteredPins.map((pin) => (
                    <div
                      key={pin.id}
                      onClick={() => setSelectedPin(pin)}
                      className={`p-3 sm:p-4 rounded-lg border-2 cursor-pointer transition-all ${
                        selectedPin?.id === pin.id
                          ? 'border-purple-500 bg-purple-50'
                          : 'border-slate-200 hover:border-purple-300 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-semibold text-slate-900 text-sm sm:text-base flex-1 pr-2">{pin.title}</h3>
                        <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded whitespace-nowrap">
                          {pin.visitsCount} wizyt
                        </span>
                      </div>
                      <p className="text-xs sm:text-sm text-slate-600 mb-2 line-clamp-2">{pin.description || 'Brak opisu'}</p>
                      <div className="flex justify-between items-center text-xs text-slate-500">
                        <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded truncate max-w-[60%]">{pin.category}</span>
                        <span className="whitespace-nowrap">{new Date(pin.createdAt).toLocaleDateString('pl-PL')}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Selected Pin Details */}
              <div className="bg-white rounded-xl shadow-lg p-3 sm:p-4 max-h-[500px] sm:max-h-[700px] overflow-y-auto">
                {selectedPin ? (
                  <div>
                    <div className="sticky top-0 bg-white pb-3 sm:pb-4 mb-3 sm:mb-4 border-b-2 border-slate-200">
                      <h2 className="text-base sm:text-lg md:text-xl font-bold text-slate-900 mb-2">{selectedPin.title}</h2>
                      <p className="text-xs sm:text-sm text-slate-600 mb-3">{selectedPin.description || 'Brak opisu'}</p>
                      <div className="flex gap-1.5 sm:gap-2 flex-wrap">
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 sm:px-3 py-1 rounded-full">
                          {selectedPin.category}
                        </span>
                        <span className="text-xs bg-green-100 text-green-800 px-2 sm:px-3 py-1 rounded-full">
                          {selectedPin.visitsCount} wizyt
                        </span>
                        <span className="text-xs bg-slate-100 text-slate-800 px-2 sm:px-3 py-1 rounded-full">
                          {new Date(selectedPin.createdAt).toLocaleDateString('pl-PL')}
                        </span>
                      </div>
                    </div>

                    <h3 className="text-sm sm:text-base md:text-lg font-semibold text-slate-900 mb-3">
                      Wizyty ({selectedPin.visits?.length || 0})
                    </h3>
                    
                    {selectedPin.visits && selectedPin.visits.length > 0 ? (
                      <div className="space-y-2 sm:space-y-3">
                        {selectedPin.visits.map((visit) => (
                          <div key={visit.id} className="p-2.5 sm:p-3 bg-slate-50 rounded-lg border border-slate-200">
                            <div className="flex justify-between items-start mb-2 gap-2">
                              <span className="font-medium text-slate-900 text-sm sm:text-base">{visit.name}</span>
                              <span className="text-xs text-slate-500 whitespace-nowrap">
                                {new Date(visit.visitedAt).toLocaleDateString('pl-PL')}
                              </span>
                            </div>
                            {visit.note && (
                              <p className="text-xs sm:text-sm text-slate-600 mt-2 italic">"{visit.note}"</p>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-slate-500 text-center py-8 text-sm">Brak wizyt dla tej pinezki</p>
                    )}
                  </div>
                ) : (
                  <div className="h-full min-h-[300px] flex items-center justify-center text-slate-400">
                    <div className="text-center px-4">
                      <svg className="h-12 w-12 sm:h-16 sm:w-16 mx-auto mb-3 sm:mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                      </svg>
                      <p className="text-sm sm:text-base md:text-lg">Wybierz pinezkę aby zobaczyć szczegóły</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Date Range Filter */}
            <div className="bg-white rounded-xl shadow-lg p-3 sm:p-4 md:p-6 mb-3 sm:mb-4 md:mb-8">
              <h2 className="text-sm sm:text-base md:text-lg font-semibold text-slate-900 mb-3 sm:mb-4">Zakres dat</h2>
              <div className="grid grid-cols-1 gap-3 sm:gap-4">
                <div className="grid grid-cols-2 gap-2 sm:gap-3">
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-slate-900 mb-2">
                      Data początkowa
                    </label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full px-2 sm:px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-900 text-xs sm:text-sm"
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
                      className="w-full px-2 sm:px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-900 text-xs sm:text-sm"
                      style={{ colorScheme: 'light' }}
                    />
                  </div>
                </div>
                <button
                  onClick={() => {
                    setStartDate('');
                    setEndDate('');
                  }}
                  className="w-full px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors font-medium text-xs sm:text-sm"
                >
                  Resetuj filtry
                </button>
              </div>
            </div>

            {/* Primary KPIs */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-2 sm:gap-3 md:gap-4 mb-3 sm:mb-4 md:mb-8">
              <div className="bg-white rounded-xl shadow-lg p-2.5 sm:p-4 md:p-6 border-l-4 border-blue-500 hover:shadow-xl transition-shadow">
                <div className="text-xs font-medium text-slate-500 mb-1">TOTAL</div>
                <p className="text-lg sm:text-2xl md:text-3xl font-bold text-slate-900">{filteredStats.total}</p>
                <p className="text-xs text-slate-600 mt-0.5 sm:mt-1">Wszystkie piny</p>
              </div>

              <div className="bg-white rounded-xl shadow-lg p-2.5 sm:p-4 md:p-6 border-l-4 border-amber-500 hover:shadow-xl transition-shadow">
                <div className="text-xs font-medium text-slate-500 mb-1">WIZYTY</div>
                <p className="text-lg sm:text-2xl md:text-3xl font-bold text-slate-900">{filteredStats.totalUpdates || 0}</p>
                <p className="text-xs text-slate-600 mt-0.5 sm:mt-1">Aktualizacji</p>
              </div>

              <div className="bg-white rounded-xl shadow-lg p-2.5 sm:p-4 md:p-6 border-l-4 border-green-500 hover:shadow-xl transition-shadow">
                <div className="text-xs font-medium text-slate-500 mb-1">WZROST</div>
                <p className="text-lg sm:text-2xl md:text-3xl font-bold text-slate-900">{growthRate}%</p>
                <p className="text-xs text-slate-600 mt-0.5 sm:mt-1">Od początku</p>
              </div>

              <div className="bg-white rounded-xl shadow-lg p-2.5 sm:p-4 md:p-6 border-l-4 border-purple-500 hover:shadow-xl transition-shadow">
                <div className="text-xs font-medium text-slate-500 mb-1">ŚREDNIA</div>
                <p className="text-lg sm:text-2xl md:text-3xl font-bold text-slate-900">{avgPerDay}</p>
                <p className="text-xs text-slate-600 mt-0.5 sm:mt-1">Pinów/dzień</p>
              </div>

              <div className="bg-white rounded-xl shadow-lg p-2.5 sm:p-4 md:p-6 border-l-4 border-orange-500 hover:shadow-xl transition-shadow">
                <div className="text-xs font-medium text-slate-500 mb-1">KATEGORIE</div>
                <p className="text-lg sm:text-2xl md:text-3xl font-bold text-slate-900">{Object.keys(filteredStats.categories).length}</p>
                <p className="text-xs text-slate-600 mt-0.5 sm:mt-1">Typów</p>
              </div>
            </div>

            {/* Secondary KPIs */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 md:gap-4 mb-3 sm:mb-4 md:mb-8">
              <div className="bg-white rounded-xl shadow-lg p-2.5 sm:p-3 md:p-4 border border-slate-200">
                <div className="text-xs text-slate-500 mb-1">Aktywność totalna</div>
                <p className="text-base sm:text-xl md:text-2xl font-bold text-slate-900">{totalActivity}</p>
              </div>

              <div className="bg-white rounded-xl shadow-lg p-2.5 sm:p-3 md:p-4 border border-slate-200">
                <div className="text-xs text-slate-500 mb-1">Ratio wizyt/pin</div>
                <p className="text-base sm:text-xl md:text-2xl font-bold text-slate-900">{activityRatio}</p>
              </div>

              <div className="bg-white rounded-xl shadow-lg p-2.5 sm:p-3 md:p-4 border border-slate-200">
                <div className="text-xs text-slate-500 mb-1">Max pinów/dzień</div>
                <p className="text-base sm:text-xl md:text-2xl font-bold text-slate-900">{maxDailyPins}</p>
              </div>

              <div className="bg-white rounded-xl shadow-lg p-2.5 sm:p-3 md:p-4 border border-slate-200">
                <div className="text-xs text-slate-500 mb-1">Śr. wizyt/dzień</div>
                <p className="text-base sm:text-xl md:text-2xl font-bold text-slate-900">{avgUpdatesPerDay}</p>
              </div>
            </div>

            {/* Main Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 md:gap-6 mb-3 sm:mb-4 md:mb-6">
              {/* Cumulative Growth */}
              <div className="bg-white rounded-xl shadow-lg p-3 sm:p-4 md:p-6">
                <h2 className="text-sm sm:text-base md:text-xl font-bold text-slate-900 mb-2 sm:mb-3 md:mb-4">
                  Wzrost kumulatywny
                </h2>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={filteredStats.daily}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis
                      dataKey="date"
                      tick={{ fill: '#1e293b', fontSize: 9 }}
                      tickFormatter={(date) => {
                        const d = new Date(date);
                        return `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                      }}
                    />
                    <YAxis tick={{ fill: '#1e293b', fontSize: 9 }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        fontSize: '11px'
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="cumulative"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      dot={{ fill: '#3b82f6', r: 3 }}
                      activeDot={{ r: 5 }}
                      name="Łącznie"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Daily Additions */}
              <div className="bg-white rounded-xl shadow-lg p-3 sm:p-4 md:p-6">
                <h2 className="text-sm sm:text-base md:text-xl font-bold text-slate-900 mb-2 sm:mb-3 md:mb-4">
                  Nowe piny
                </h2>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={filteredStats.daily}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis
                      dataKey="date"
                      tick={{ fill: '#1e293b', fontSize: 9 }}
                      tickFormatter={(date) => {
                        const d = new Date(date);
                        return `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                      }}
                    />
                    <YAxis tick={{ fill: '#1e293b', fontSize: 9 }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        fontSize: '11px'
                      }}
                    />
                    <Bar
                      dataKey="count"
                      fill="#10b981"
                      radius={[6, 6, 0, 0]}
                      name="Nowe piny"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Category Distribution */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 md:gap-6 mb-3 sm:mb-4 md:mb-6">
              <div className="bg-white rounded-xl shadow-lg p-3 sm:p-4 md:p-6">
                <h2 className="text-sm sm:text-base md:text-xl font-bold text-slate-900 mb-2 sm:mb-3 md:mb-4">
                  Rozkład kategorii
                </h2>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                      outerRadius={70}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                      3:00 PM
</Pie> <Tooltip contentStyle={{ backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '11px' }} /> </PieChart> </ResponsiveContainer> </div>

          {/* Category Bar Chart */}
          <div className="bg-white rounded-xl shadow-lg p-3 sm:p-4 md:p-6">
            <h2 className="text-sm sm:text-base md:text-xl font-bold text-slate-900 mb-2 sm:mb-3 md:mb-4">
              Ranking kategorii
            </h2>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={categoryData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis type="number" tick={{ fill: '#1e293b', fontSize: 9 }} />
                <YAxis dataKey="name" type="category" width={60} tick={{ fill: '#1e293b', fontSize: 9 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    fontSize: '11px'
                  }}
                />
                <Bar dataKey="value" fill="#3b82f6" radius={[0, 6, 6, 0]} name="Liczba">
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </>
    )}
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
