// app/stats/StatsClient.tsx
'use client';

import { useState, useMemo } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
} from 'recharts';

import {
  Document,
  Paragraph,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  Packer,
  TextRun,
} from 'docx';
import { saveAs } from 'file-saver';

import * as XLSX from 'xlsx';

const COLORS = [
  '#3b82f6',
  '#ef4444',
  '#10b981',
  '#f59e0b',
  '#8b5cf6',
  '#ec4899',
  '#06b6d4',
  '#f97316',
];

type StatsData = {
  daily: Array<{
    date: string;
    count: number;
    cumulative: number;
    categories: Record<string, number>;
    updates?: number;
  }>;
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

export const normalizePolishName = (name: string): string => {
  return name
    .toLowerCase()
    .trim()
    .replace(/ł/g, 'l')
    .replace(/ą/g, 'a')
    .replace(/ć/g, 'c')
    .replace(/ę/g, 'e')
    .replace(/ń/g, 'n')
    .replace(/ó/g, 'o')
    .replace(/ś/g, 's')
    .replace(/ź/g, 'z')
    .replace(/ż/g, 'z');
};

export const extractNames = (nameField: string): string[] => {
  if (!nameField) return [];

  // Remove diacritics, lowercase, trim
  const normalize = (s: string) =>
    s
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();

  // Absolute truth table
  const CANONICAL_NAMES: { name: string; match: (n: string) => boolean }[] = [
    {
      name: 'Łukasz',
      match: (n) => n === 'lukasz',
    },
    {
      name: 'Mateusz',
      match: (n) => n.startsWith('ma'),
    },
    {
      name: 'Dawid',
      match: (n) =>
        n.startsWith('daw') || // dawid, dawyt, dawyd
        n.startsWith('dav'), // david, davit
    },
    {
      name: 'Julia',
      match: (n) =>
        n.startsWith('jul') || // julia, julja, jula
        n.startsWith('yul'), // yulia
    },
  ];

  const canonicalize = (raw: string): string => {
    const n = normalize(raw);

    for (const entry of CANONICAL_NAMES) {
      if (entry.match(n)) return entry.name;
    }

    // Safe fallback
    return raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
  };

  const names = nameField
    .split(/[,;]+\s*|\s+(?:i|oraz|and|\+|&)\s+/)
    .map((n) => n.trim())
    .filter(Boolean)
    .map((n) => {
      n = n.replace(/\.$/, '').trim();
      const firstName = n.split(/\s+/)[0];
      return canonicalize(firstName);
    });

  return [...new Set(names)];
};

export default function StatsClient({ stats }: { stats: StatsData }) {
  const [selectedNames, setSelectedNames] = useState<string[]>([]);
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

  const exportPinToDocx = async (pin: Pin) => {
    try {
      // Get all unique names from visits
      const allNames = pin.visits?.map((v) => extractNames(v.name)).flat() || [];
      const uniqueNames = [...new Set(allNames)].join(', ') || 'Brak danych';

      // Create visit entries - each visit on a new line with bold date
      // Create visit entries - each visit on a new line with bold date
      const visitParagraphs = pin.visits?.length
        ? pin.visits.map((visit) => {
            const visitDate = new Date(visit.visitedAt).toLocaleDateString('pl-PL');
            const note = visit.note || 'Brak notatki';

            return new Paragraph({
              children: [
                new TextRun({
                  text: `${visitDate}: `,
                  bold: true,
                }),
                new TextRun({
                  text: note,
                  bold: false,
                }),
              ],
              spacing: { after: 200 },
            });
          })
        : [
            new Paragraph({
              children: [new TextRun({ text: 'Brak wizyt', bold: false })],
            }),
          ];

      // Create the document
      const doc = new Document({
        sections: [
          {
            properties: {},
            children: [
              // Title
              new Paragraph({
                children: [
                  new TextRun({
                    text: `INTERAKCJE W "${pin.title}"`,
                    bold: true,
                  }),
                ],
                alignment: AlignmentType.CENTER,
                spacing: { after: 400 },
              }),

              // Main Table
              new Table({
                width: { size: 100, type: WidthType.PERCENTAGE },
                rows: [
                  // Row 1: Streetworker and Names
                  new TableRow({
                    children: [
                      new TableCell({
                        children: [
                          new Paragraph({
                            children: [
                              new TextRun({ text: 'Streetworker/Streetworkerka', bold: true }),
                            ],
                          }),
                        ],
                        width: { size: 50, type: WidthType.PERCENTAGE },
                      }),
                      new TableCell({
                        children: [
                          new Paragraph({
                            children: [new TextRun({ text: uniqueNames, bold: true })],
                          }),
                        ],
                        width: { size: 50, type: WidthType.PERCENTAGE },
                      }),
                    ],
                  }),

                  // Row 2: Header
                  new TableRow({
                    children: [
                      new TableCell({
                        children: [
                          new Paragraph({
                            children: [
                              new TextRun({ text: 'Data i opis podjętych działań', bold: true }),
                            ],
                            alignment: AlignmentType.CENTER,
                          }),
                        ],
                        columnSpan: 2,
                      }),
                    ],
                  }),

                  // Row 3: Visit details (each on new line)
                  new TableRow({
                    children: [
                      new TableCell({
                        children: visitParagraphs,
                        columnSpan: 2,
                      }),
                    ],
                  }),
                ],
              }),
            ],
          },
        ],
      });

      // Generate and save the document
      const blob = await Packer.toBlob(doc);
      const currentDate = new Date().toLocaleDateString('pl-PL').replace(/\./g, '-');
      const fileName = `${pin.title.replace(/[^a-z0-9]/gi, '_')}_interakcje_${currentDate}.docx`;
      saveAs(blob, fileName);
    } catch (error) {
      console.error('Błąd podczas eksportu do DOCX:', error);
      alert('Wystąpił błąd podczas eksportu dokumentu');
    }
  };

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
            Kategoria: pin.category,
            Opis: pin.description || '',
            'Data utworzenia': new Date(pin.createdAt).toLocaleDateString('pl-PL'),
            'Ostatnia aktualizacja': new Date(pin.updatedAt).toLocaleDateString('pl-PL'),
            'Liczba wizyt': 0,
            Odwiedzający: '',
            'Data wizyty': '',
            'Notatka z wizyty': '',
          });
        } else {
          pin.visits.forEach((visit: Visit, index: number) => {
            mainData.push({
              'Tytuł pinezki': pin.title,
              Kategoria: pin.category,
              Opis: pin.description || '',
              'Data utworzenia': new Date(pin.createdAt).toLocaleDateString('pl-PL'),
              'Ostatnia aktualizacja': new Date(pin.updatedAt).toLocaleDateString('pl-PL'),
              'Liczba wizyt': pin.visitsCount || pin.visits?.length || 0,
              Odwiedzający: visit.name,
              'Data wizyty': new Date(visit.visitedAt).toLocaleDateString('pl-PL'),
              'Notatka z wizyty': visit.note || '',
            });
          });
        }
      });

      const ws1 = XLSX.utils.json_to_sheet(mainData);
      ws1['!cols'] = [
        { wch: 35 },
        { wch: 20 },
        { wch: 40 },
        { wch: 18 },
        { wch: 18 },
        { wch: 12 },
        { wch: 25 },
        { wch: 18 },
        { wch: 50 },
      ];

      if (mainData.length > 0) {
        ws1['!autofilter'] = { ref: `A1:I${mainData.length + 1}` };
      }

      const headerCells = ['A1', 'B1', 'C1', 'D1', 'E1', 'F1', 'G1', 'H1', 'I1'];
      headerCells.forEach((cell) => {
        if (ws1[cell]) {
          ws1[cell].s = {
            font: { bold: true, color: { rgb: 'FFFFFF' } },
            fill: { fgColor: { rgb: '4472C4' } },
            alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
            border: {
              top: { style: 'thin', color: { rgb: '000000' } },
              bottom: { style: 'thin', color: { rgb: '000000' } },
              left: { style: 'thin', color: { rgb: '000000' } },
              right: { style: 'thin', color: { rgb: '000000' } },
            },
          };
        }
      });

      ws1['!freeze'] = { xSplit: 0, ySplit: 1 };
      XLSX.utils.book_append_sheet(wb, ws1, 'Baza Pinezek');

      // ========== SUMMARY SHEET ==========
      const summaryData = data.pins.map((pin: Pin) => ({
        Tytuł: pin.title,
        Kategoria: pin.category,
        Opis: pin.description || '',
        'Liczba wizyt': pin.visitsCount || 0,
        'Data utworzenia': new Date(pin.createdAt).toLocaleDateString('pl-PL'),
        'Ostatnia aktualizacja': new Date(pin.updatedAt).toLocaleDateString('pl-PL'),
      }));

      const ws2 = XLSX.utils.json_to_sheet(summaryData);
      ws2['!cols'] = [{ wch: 35 }, { wch: 20 }, { wch: 45 }, { wch: 12 }, { wch: 18 }, { wch: 18 }];

      if (summaryData.length > 0) {
        ws2['!autofilter'] = { ref: `A1:F${summaryData.length + 1}` };
      }

      const summaryHeaders = ['A1', 'B1', 'C1', 'D1', 'E1', 'F1'];
      summaryHeaders.forEach((cell) => {
        if (ws2[cell]) {
          ws2[cell].s = {
            font: { bold: true, color: { rgb: 'FFFFFF' } },
            fill: { fgColor: { rgb: '70AD47' } },
            alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
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
            Kategoria: pin.category,
            Odwiedzający: visit.name,
            'Data wizyty':
              new Date(visit.visitedAt).toLocaleDateString('pl-PL') +
              ' ' +
              new Date(visit.visitedAt).toLocaleTimeString('pl-PL'),
            Notatka: visit.note || '',
          });
        });
      });

      const ws3 = XLSX.utils.json_to_sheet(visitsData);
      ws3['!cols'] = [{ wch: 35 }, { wch: 20 }, { wch: 25 }, { wch: 22 }, { wch: 60 }];

      if (visitsData.length > 0) {
        ws3['!autofilter'] = { ref: `A1:E${visitsData.length + 1}` };
      }

      const visitHeaders = ['A1', 'B1', 'C1', 'D1', 'E1'];
      visitHeaders.forEach((cell) => {
        if (ws3[cell]) {
          ws3[cell].s = {
            font: { bold: true, color: { rgb: 'FFFFFF' } },
            fill: { fgColor: { rgb: 'FFC000' } },
            alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
          };
        }
      });

      ws3['!freeze'] = { xSplit: 0, ySplit: 1 };
      XLSX.utils.book_append_sheet(wb, ws3, 'Wszystkie Wizyty');

      // ========== STATS SHEET ==========
      const categoryStats = Object.entries(filteredStats.categories)
        .map(([name, count]) => ({
          Kategoria: name,
          'Liczba pinezek': count,
          Procent: ((count / filteredStats.total) * 100).toFixed(2) + '%',
        }))
        .sort((a, b) => b['Liczba pinezek'] - a['Liczba pinezek']);

      const ws4 = XLSX.utils.json_to_sheet(categoryStats);
      ws4['!cols'] = [{ wch: 25 }, { wch: 15 }, { wch: 12 }];

      if (categoryStats.length > 0) {
        ws4['!autofilter'] = { ref: `A1:C${categoryStats.length + 1}` };
      }

      const statHeaders = ['A1', 'B1', 'C1'];
      statHeaders.forEach((cell) => {
        if (ws4[cell]) {
          ws4[cell].s = {
            font: { bold: true, color: { rgb: 'FFFFFF' } },
            fill: { fgColor: { rgb: '9966FF' } },
            alignment: { horizontal: 'center', vertical: 'center' },
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

    const filteredDaily = currentStats.daily.filter((day) => {
      const dayDate = new Date(day.date);
      if (start && dayDate < start) return false;
      if (end && dayDate > end) return false;
      return true;
    });

    const filteredCategories: Record<string, number> = {};
    let total = 0;
    let totalUpdates = 0;

    filteredDaily.forEach((day) => {
      total += day.count;
      totalUpdates += day.updates || 0;
      Object.entries(day.categories).forEach(([cat, count]) => {
        filteredCategories[cat] = (filteredCategories[cat] || 0) + count;
      });
    });

    let cumulative = 0;
    const dailyWithCumulative = filteredDaily.map((day) => {
      cumulative += day.count;
      return { ...day, cumulative };
    });

    return {
      daily: dailyWithCumulative,
      total,
      categories: filteredCategories,
      firstPin: filteredDaily.length > 0 ? filteredDaily[0].date : null,
      lastPin: filteredDaily.length > 0 ? filteredDaily[filteredDaily.length - 1].date : null,
      totalUpdates,
    };
  }, [currentStats, startDate, endDate]);

  const filteredPins = useMemo(() => {
    let filtered = pinsData;

    // Category filter
    if (selectedCategories.length > 0) {
      filtered = filtered.filter((pin) => selectedCategories.includes(pin.category));
    }

    // Name filter - check if any visit has a matching name
    if (selectedNames.length > 0) {
      filtered = filtered.filter((pin) => {
        if (!pin.visits || pin.visits.length === 0) return false;

        return pin.visits.some((visit) => {
          const visitNames = extractNames(visit.name);
          const normalizedVisitNames = visitNames.map(normalizePolishName);
          const normalizedSelectedNames = selectedNames.map(normalizePolishName);

          return normalizedSelectedNames.some((selectedName) =>
            normalizedVisitNames.includes(selectedName)
          );
        });
      });
    }

    // Search term filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (pin) =>
          pin.title.toLowerCase().includes(term) ||
          pin.category.toLowerCase().includes(term) ||
          pin.description?.toLowerCase().includes(term)
      );
    }

    return filtered;
  }, [pinsData, searchTerm, selectedCategories, selectedNames]);

  const suggestions = useMemo(() => {
    if (!searchTerm || searchTerm.length < 2) return [];
    const term = searchTerm.toLowerCase();
    return pinsData
      .filter(
        (pin) => pin.title.toLowerCase().includes(term) || pin.category.toLowerCase().includes(term)
      )
      .slice(0, 5);
  }, [pinsData, searchTerm]);

  const { availableCategories, availableNames } = useMemo(() => {
    const categories = new Set(pinsData.map((pin) => pin.category));
    const namesSet = new Set<string>();

    // Extract all unique names from visits
    pinsData.forEach((pin) => {
      pin.visits?.forEach((visit) => {
        const names = extractNames(visit.name);
        names.forEach((name) => namesSet.add(name));
      });
    });

    return {
      availableCategories: Array.from(categories).sort(),
      availableNames: Array.from(namesSet).sort(),
    };
  }, [pinsData]);

  const toggleCategory = (category: string) => {
    setSelectedCategories((prev) =>
      prev.includes(category) ? prev.filter((c) => c !== category) : [...prev, category]
    );
  };
  const toggleName = (name: string) => {
    setSelectedNames((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]
    );
  };

  // Calendar helpers
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    // Convert US day (0=Sun) to EU day (0=Mon): subtract 1 and handle Sunday wrap
    const startingDayOfWeek = (firstDay.getDay() + 6) % 7;

    return { daysInMonth, startingDayOfWeek, year, month };
  };

  const getActivityForDate = (date: Date) => {
    // Use local date string to avoid timezone issues
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;

    const dayData = currentStats.daily.find((d) => d.date === dateStr);

    if (!dayData) return { pins: [], visits: [], created: 0, visited: 0 };

    const dayPins = pinsData.filter((pin) => {
      const createdDate = new Date(pin.createdAt);
      const createdYear = createdDate.getFullYear();
      const createdMonth = String(createdDate.getMonth() + 1).padStart(2, '0');
      const createdDay = String(createdDate.getDate()).padStart(2, '0');
      const createdStr = `${createdYear}-${createdMonth}-${createdDay}`;
      return createdStr === dateStr;
    });

    const dayVisits: Array<{ pin: Pin; visit: Visit }> = [];
    pinsData.forEach((pin) => {
      pin.visits?.forEach((visit) => {
        const visitDate = new Date(visit.visitedAt);
        const visitYear = visitDate.getFullYear();
        const visitMonth = String(visitDate.getMonth() + 1).padStart(2, '0');
        const visitDay = String(visitDate.getDate()).padStart(2, '0');
        const visitStr = `${visitYear}-${visitMonth}-${visitDay}`;
        if (visitStr === dateStr) {
          dayVisits.push({ pin, visit });
        }
      });
    });

    return {
      pins: dayPins,
      visits: dayVisits,
      created: dayData.count,
      visited: dayData.updates || 0,
    };
  };

  const getActivityLevel = (created: number, visited: number) => {
    const total = created + visited;
    if (total === 0) return 'bg-[var(--bg-tertiary)]';
    if (total <= 2) return 'bg-green-900/20';
    if (total <= 5) return 'bg-green-700/30';
    if (total <= 10) return 'bg-green-500/40';
    return 'bg-green-400/50';
  };

  const getWeekNumber = (date: Date) => {
    const firstDayOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
    const dayOfMonth = date.getDate();
    const firstDayOfWeek = (firstDayOfMonth.getDay() + 6) % 7;
    return Math.floor((dayOfMonth + firstDayOfWeek - 1) / 7);
  };

  const getMonthSummary = (year: number, month: number) => {
    const monthEnd = new Date(year, month + 1, 0);

    let totalCreated = 0;
    let totalVisited = 0;

    for (let day = 1; day <= monthEnd.getDate(); day++) {
      const date = new Date(year, month, day);
      const activity = getActivityForDate(date);
      totalCreated += activity.created;
      totalVisited += activity.visited;
    }

    return { totalCreated, totalVisited };
  };

  const getWeekSummary = (year: number, month: number, weekNum: number) => {
    const firstDayOfMonth = new Date(year, month, 1);
    const firstDayOfWeek = (firstDayOfMonth.getDay() + 6) % 7;

    const weekStartDay = weekNum * 7 - firstDayOfWeek + 1;
    const weekEndDay = Math.min(weekStartDay + 6, new Date(year, month + 1, 0).getDate());

    let totalCreated = 0;
    let totalVisited = 0;

    for (let day = Math.max(1, weekStartDay); day <= weekEndDay; day++) {
      const date = new Date(year, month, day);
      const activity = getActivityForDate(date);
      totalCreated += activity.created;
      totalVisited += activity.visited;
    }

    return { totalCreated, totalVisited };
  };

  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const categoryData = Object.entries(filteredStats.categories)
    .map(([name, value]) => ({
      name,
      value,
    }))
    .sort((a, b) => b.value - a.value);

  const growthRate =
    filteredStats.daily.length > 1
      ? (
          ((filteredStats.daily[filteredStats.daily.length - 1].cumulative -
            filteredStats.daily[0].cumulative) /
            Math.max(filteredStats.daily[0].cumulative, 1)) *
          100
        ).toFixed(1)
      : 0;

  const avgPerDay = (filteredStats.total / Math.max(filteredStats.daily.length, 1)).toFixed(1);

  const maxDailyPins = Math.max(...filteredStats.daily.map((d) => d.count), 0);
  const maxDailyUpdates = Math.max(...filteredStats.daily.map((d) => d.updates || 0), 0);
  const avgUpdatesPerDay = (
    (filteredStats.totalUpdates || 0) / Math.max(filteredStats.daily.length, 1)
  ).toFixed(1);

  const totalActivity = filteredStats.total + (filteredStats.totalUpdates || 0);
  const activityRatio =
    filteredStats.total > 0
      ? ((filteredStats.totalUpdates || 0) / filteredStats.total).toFixed(2)
      : '0';

  return (
    <div className="min-h-screen p-3 bg-[var(--bg-primary)] sm:p-4 md:p-8">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-4 sm:mb-6 md:mb-8">
          <div className="mb-3 sm:mb-4">
            <h1 className="mb-1 text-xl font-bold sm:text-2xl md:text-3xl lg:text-4xl text-[var(--text-primary)] sm:mb-2">
              Statystyki CRiIM Mapa
            </h1>
            <p className="text-xs sm:text-sm md:text-base text-[var(--text-secondary)]">
              Kompleksowa analiza pinezek i aktywności
            </p>
          </div>
          <div className="bg-[var(--bg-secondary)] rounded-lg shadow-lg border border-[var(--border-primary)]">
            <div className="grid grid-cols-2 border-b border-[var(--border-secondary)]">
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
                className={`flex-1 px-4 py-3 text-sm font-medium transition-colors sm:text-base border-r border-[var(--border-secondary)] ${
                  showCalendar
                    ? 'text-[var(--accent-primary)] border-b-2 border-[var(--accent-primary)] bg-[var(--bg-tertiary)]'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                Kalendarz
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
                className={`flex-1 px-4 py-3 text-sm font-medium transition-colors sm:text-base ${
                  showPinsData
                    ? 'text-[var(--accent-primary)] border-b-2 border-[var(--accent-primary)] bg-[var(--bg-tertiary)]'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {loadingPins ? 'Ładowanie...' : 'Dane pinów'}
              </button>
            </div>

            <div className="grid grid-cols-2 border-b-0">
              <button
                onClick={exportToExcel}
                disabled={isExporting}
                className={`flex-1 px-4 py-3 text-sm font-medium transition-colors sm:text-base border-r border-[var(--border-secondary)] ${
                  isExporting
                    ? 'text-[var(--text-muted)] cursor-not-allowed'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'
                }`}
              >
                {isExporting ? 'Eksportowanie...' : 'Excel'}
              </button>
              <button
                onClick={refreshStats}
                disabled={isLoading}
                className={`flex-1 px-4 py-3 text-sm font-medium transition-colors sm:text-base ${
                  isLoading
                    ? 'text-[var(--text-muted)] cursor-not-allowed'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'
                }`}
              >
                {isLoading ? 'Odświeżanie...' : 'Odśwież'}
              </button>
            </div>
          </div>
        </div>

        {/* Calendar View */}
        {showCalendar ? (
          <div className="space-y-3 sm:space-y-4">
            <div className="p-3 bg-[var(--bg-secondary)] shadow-lg rounded-lg sm:p-4 md:p-6 border border-[var(--border-primary)]">
              {/* Month Navigation */}
              <div className="flex items-center justify-between mb-4">
                <button
                  onClick={prevMonth}
                  className="p-2 rounded hover:bg-[var(--bg-tertiary)] transition-colors text-[var(--text-primary)]"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 19l-7-7 7-7"
                    />
                  </svg>
                </button>
                <h2 className="text-lg font-bold sm:text-xl md:text-2xl text-[var(--text-primary)]">
                  {currentMonth.toLocaleDateString('pl-PL', { month: 'long', year: 'numeric' })}
                </h2>
                <button
                  onClick={nextMonth}
                  className="p-2 rounded hover:bg-[var(--bg-tertiary)] transition-colors text-[var(--text-primary)]"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </button>
              </div>

              {/* Month Summary */}
              {(() => {
                const { year, month } = getDaysInMonth(currentMonth);
                const monthSummary = getMonthSummary(year, month);
                return (
                  <div className="p-2 mb-4 border border-[var(--border-secondary)] rounded sm:p-3 bg-[var(--bg-tertiary)]">
                    <h3 className="mb-2 text-xs font-semibold sm:text-sm text-[var(--text-secondary)]">
                      Podsumowanie miesiąca
                    </h3>
                    <div className="grid grid-cols-2 gap-2 sm:gap-3">
                      <div className="p-2 bg-[var(--bg-elevated)] border border-[var(--border-secondary)] rounded">
                        <div className="text-[10px] sm:text-xs text-[var(--text-secondary)]">Nowe pinezki</div>
                        <div className="text-xl font-bold text-[var(--accent-light)] sm:text-2xl">
                          +{monthSummary.totalCreated}
                        </div>
                      </div>
                      <div className="p-2 bg-[var(--bg-elevated)] border rounded border-[var(--border-secondary)]">
                        <div className="text-[10px] sm:text-xs text-[var(--text-secondary)]">Wizyty</div>
                        <div className="text-xl font-bold sm:text-2xl text-[var(--warning)]">
                          ↻{monthSummary.totalVisited}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Calendar Grid */}
              <div className="mb-4 grid grid-cols-7 gap-1 sm:gap-2">
                {/* Day headers */}
                {['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'Sb', 'Nd'].map((day) => (
                  <div
                    key={day}
                    className="p-1 text-xs font-semibold text-center text-[var(--text-secondary)] sm:text-sm sm:p-2"
                  >
                    {day}
                  </div>
                ))}

                {/* Calendar days */}
                {(() => {
                  const { daysInMonth, startingDayOfWeek, year, month } =
                    getDaysInMonth(currentMonth);
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
                        className={`aspect-square p-1 sm:p-2 rounded border-2 transition-all ${
                          isSelected
                            ? 'border-[var(--accent-primary)] ring-2 ring-[var(--accent-primary)]/20'
                            : 'border-transparent hover:border-[var(--border-secondary)]'
                        } ${activityLevel}`}
                      >
                        <div className="text-xs font-medium sm:text-sm text-[var(--text-primary)]">{day}</div>
                        {(activity.created > 0 || activity.visited > 0) && (
                          <div className="text-[8px] sm:text-[10px] mt-0.5 sm:mt-1 space-y-0.5">
                            {activity.created > 0 && (
                              <div className="font-semibold text-[var(--accent-light)]">+{activity.created}</div>
                            )}
                            {activity.visited > 0 && (
                              <div className="font-semibold text-[var(--warning)]">
                                ↻{activity.visited}
                              </div>
                            )}
                          </div>
                        )}
                      </button>
                    );
                  }

                  return days;
                })()}
              </div>

              {/* Weekly Summaries - Below Calendar on Mobile, Side on Desktop */}
              {(() => {
                const { year, month, daysInMonth } = getDaysInMonth(currentMonth);
                const weeks: Array<{
                  weekNum: number;
                  summary: { totalCreated: number; totalVisited: number };
                }> = [];

                // Calculate number of weeks
                const firstDate = new Date(year, month, 1);
                const lastDate = new Date(year, month, daysInMonth);
                const firstWeek = getWeekNumber(firstDate);
                const lastWeek = getWeekNumber(lastDate);

                for (let w = firstWeek; w <= lastWeek; w++) {
                  const summary = getWeekSummary(year, month, w);
                  weeks.push({ weekNum: w, summary });
                }

                return (
                  <div className="space-y-2">
                    <h3 className="text-xs font-semibold sm:text-sm text-[var(--text-secondary)]">
                      Podsumowania tygodniowe
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                      {weeks.map(({ weekNum, summary }) => (
                        <div
                          key={weekNum}
                          className="p-2 border rounded bg-[var(--bg-tertiary)] border-[var(--border-secondary)]"
                        >
                          <div className="text-[10px] sm:text-xs text-[var(--text-secondary)] font-semibold mb-1">
                            Tydzień {weekNum + 1}
                          </div>
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1">
                              <div className="text-xs font-bold text-[var(--accent-light)] sm:text-sm">
                                +{summary.totalCreated}
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              <div className="text-xs font-bold sm:text-sm text-[var(--warning)]">
                                ↻{summary.totalVisited}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* Legend */}
              <div className="flex flex-wrap pt-4 mt-4 text-xs border-t border-[var(--border-secondary)] gap-2 sm:gap-3 sm:text-sm text-[var(--text-secondary)]">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-[var(--accent-light)]/20 rounded sm:w-4 sm:h-4"></div>
                  <span>+X = Nowe piny</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded sm:w-4 sm:h-4 bg-[var(--warning)]/20"></div>
                  <span>↻X = Wizyty</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 border rounded sm:w-3 sm:h-3 bg-[var(--bg-tertiary)] border-[var(--border-secondary)]"></div>
                    <div className="w-2 h-2 bg-green-900/20 rounded sm:w-3 sm:h-3"></div>
                    <div className="w-2 h-2 bg-green-700/30 rounded sm:w-3 sm:h-3"></div>
                    <div className="w-2 h-2 bg-green-500/40 rounded sm:w-3 sm:h-3"></div>
                    <div className="w-2 h-2 bg-green-400/50 rounded sm:w-3 sm:h-3"></div>
                  </div>
                  <span className="text-[10px] sm:text-xs">Aktywność</span>
                </div>
              </div>
            </div>

            {/* Selected Day Details */}
            {selectedDay && (
              <div className="p-3 bg-[var(--bg-secondary)] shadow-lg rounded-lg sm:p-4 md:p-6 border border-[var(--border-primary)]">
                <h3 className="mb-4 text-base font-bold sm:text-lg md:text-xl text-[var(--text-primary)]">
                  {selectedDay.toLocaleDateString('pl-PL', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </h3>

                {(() => {
                  const activity = getActivityForDate(selectedDay);

                  if (activity.created === 0 && activity.visited === 0) {
                    return (
                      <p className="py-8 text-center text-[var(--text-muted)]">Brak aktywności tego dnia</p>
                    );
                  }

                  return (
                    <div className="space-y-4">
                      {/* New Pins */}
                      {activity.pins.length > 0 && (
                        <div>
                          <h4 className="flex items-center mb-2 text-sm font-semibold sm:text-base text-[var(--text-primary)] gap-2">
                            <span className="px-2 py-1 text-xs text-white bg-[var(--accent-primary)] rounded">
                              +{activity.created}
                            </span>
                            Nowe pinezki
                          </h4>
                          <div className="space-y-2">
                            {activity.pins.map((pin) => (
                              <div
                                key={pin.id}
                                className="p-3 border border-[var(--border-secondary)] rounded-lg bg-[var(--bg-elevated)]"
                              >
                                <div className="text-sm font-medium text-[var(--text-primary)] sm:text-base">
                                  {pin.title}
                                </div>
                                <div className="mt-1 text-xs text-[var(--text-secondary)]">{pin.category}</div>
                                {pin.description && (
                                  <div className="mt-1 text-xs text-[var(--text-muted)]">
                                    {pin.description}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Visits */}
                      {activity.visits.length > 0 && (
                        <div>
                          <h4 className="flex items-center mb-2 text-sm font-semibold sm:text-base text-[var(--text-primary)] gap-2">
                            <span className="px-2 py-1 text-xs rounded bg-[var(--warning)] text-white">
                              ↻{activity.visited}
                            </span>
                            Wizyty
                          </h4>
                          <div className="space-y-2">
                            {activity.visits.map(({ pin, visit }, idx) => (
                              <div
                                key={`${pin.id}-${visit.id}-${idx}`}
                                className="p-3 border rounded-lg bg-[var(--bg-elevated)] border-[var(--border-secondary)]"
                              >
                                <div className="text-sm font-medium text-[var(--text-primary)] sm:text-base">
                                  {pin.title}
                                </div>
                                <div className="mt-1 text-xs text-[var(--text-secondary)]">
                                  Odwiedził: {visit.name} •{' '}
                                  {new Date(visit.visitedAt).toLocaleTimeString('pl-PL')}
                                </div>
                                {visit.note && (
                                  <div className="mt-1 text-xs italic text-[var(--text-muted)]">
                                    "{visit.note}"
                                  </div>
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
            <div className="p-3 bg-[var(--bg-secondary)] shadow-lg rounded-xl sm:p-4 border border-[var(--border-primary)]">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Szukaj pinezki..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onFocus={() => setShowSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                  className="w-full px-3 sm:px-4 py-2 sm:py-2.5 border border-[var(--border-secondary)] rounded-lg focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-[var(--accent-primary)] bg-[var(--bg-tertiary)] text-[var(--text-primary)] text-sm sm:text-base"
                />

                {/* Autocomplete Suggestions */}
                {showSuggestions && suggestions.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 overflow-y-auto bg-[var(--bg-secondary)] border rounded-lg shadow-lg border-[var(--border-secondary)] max-h-60">
                    {suggestions.map((pin) => (
                      <div
                        key={pin.id}
                        onClick={() => {
                          setSearchTerm(pin.title);
                          setShowSuggestions(false);
                          setSelectedPin(pin);
                        }}
                        className="px-3 py-2 border-b cursor-pointer sm:px-4 sm:py-3 hover:bg-[var(--bg-tertiary)] border-[var(--border-secondary)] last:border-b-0"
                      >
                        <div className="text-sm font-medium text-[var(--text-primary)] sm:text-base">
                          {pin.title}
                        </div>
                        <div className="text-xs text-[var(--text-muted)]">{pin.category}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {/* Add this right after the search input, before category filters */}

              {/* Category Filter Buttons */}
              <div className="mt-3 sm:mt-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-semibold sm:text-sm text-[var(--text-primary)]">
                    Filtruj po kategorii:
                  </h3>
                  {selectedCategories.length > 0 && (
                    <button
                      onClick={() => setSelectedCategories([])}
                      className="text-xs font-medium text-[var(--accent-primary)] hover:text-[var(--accent-hover)]"
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
                          ? 'bg-[var(--accent-primary)] text-white'
                          : 'bg-[var(--bg-elevated)] text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'
                      }`}
                    >
                      {category}
                      {selectedCategories.includes(category) && <span className="ml-1">✓</span>}
                    </button>
                  ))}
                </div>
                <div className="pt-4 mt-4 border-t border-[var(--border-secondary)]">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xs font-semibold sm:text-sm text-[var(--text-primary)]">
                      Filtruj po osobie:
                    </h3>
                    {selectedNames.length > 0 && (
                      <button
                        onClick={() => setSelectedNames([])}
                        className="text-xs font-medium text-[var(--accent-primary)] hover:text-[var(--accent-hover)]"
                      >
                        Wyczyść
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5 sm:gap-2">
                    {availableNames.map((name) => (
                      <button
                        key={name}
                        onClick={() => toggleName(name)}
                        className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs sm:text-sm font-medium transition-colors ${
                          selectedNames.includes(name)
                            ? 'bg-[var(--success)] text-white'
                            : 'bg-[var(--bg-elevated)] text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'
                        }`}
                      >
                        {name}
                        {selectedNames.includes(name) && <span className="ml-1">✓</span>}
                      </button>
                    ))}
                  </div>
                  {selectedNames.length > 0 && (
                    <p className="mt-2 text-xs text-[var(--text-muted)]">
                      Filtrowanie po: {selectedNames.join(', ')}
                    </p>
                  )}
                </div>
                {(selectedCategories.length > 0 || selectedNames.length > 0) && (
                  <p className="mt-2 text-xs text-[var(--text-muted)]">
                    Pokazuję {filteredPins.length}{' '}
                    {filteredPins.length === 1 ? 'pinezkę' : 'pinezek'}
                    {selectedCategories.length > 0 &&
                      ` (kategorie: ${selectedCategories.join(', ')})`}
                    {selectedNames.length > 0 && ` (osoby: ${selectedNames.join(', ')})`}
                  </p>
                )}
              </div>
            </div>

            {(selectedCategories.length > 0 || selectedNames.length > 0) && (
              <div className="p-2 mt-3 border border-[var(--border-secondary)] rounded-lg bg-[var(--bg-tertiary)]">
                <button
                  onClick={() => {
                    setSelectedCategories([]);
                    setSelectedNames([]);
                  }}
                  className="w-full px-3 py-1.5 bg-[var(--accent-primary)] text-white rounded-lg hover:bg-[var(--accent-hover)] transition-colors text-xs font-medium"
                >
                  Wyczyść wszystkie filtry ({selectedCategories.length + selectedNames.length})
                </button>
              </div>
            )}
            {/* Pins List - Mobile optimized */}
            <div className="space-y-3 sm:space-y-0 sm:grid sm:grid-cols-2 lg:grid-cols-2 sm:gap-4">
              {/* Pins Column */}
              <div className="bg-[var(--bg-secondary)] rounded-xl shadow-lg p-3 sm:p-4 max-h-[500px] sm:max-h-[700px] overflow-y-auto border border-[var(--border-primary)]">
                <h2 className="sticky top-0 pb-2 mb-3 text-base font-bold bg-[var(--bg-secondary)] sm:text-lg md:text-xl text-[var(--text-primary)] sm:mb-4">
                  Pinezki ({filteredPins.length})
                </h2>
                <div className="space-y-2">
                  {filteredPins.map((pin) => (
                    <div
                      key={pin.id}
                      onClick={() => setSelectedPin(pin)}
                      className={`p-3 sm:p-4 rounded-lg border-2 cursor-pointer transition-all ${
                        selectedPin?.id === pin.id
                          ? 'border-[var(--accent-primary)] bg-[var(--bg-tertiary)]'
                          : 'border-[var(--border-secondary)] hover:border-[var(--accent-primary)] hover:bg-[var(--bg-elevated)]'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="flex-1 pr-2 text-sm font-semibold text-[var(--text-primary)] sm:text-base">
                          {pin.title}
                        </h3>
                        <span className="px-2 py-1 text-xs text-white bg-[var(--accent-primary)] rounded whitespace-nowrap">
                          {pin.visitsCount} wizyt
                        </span>
                      </div>
                      <p className="mb-2 text-xs sm:text-sm text-[var(--text-secondary)] line-clamp-2">
                        {pin.description || 'Brak opisu'}
                      </p>
                      <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
                        <span className="bg-[var(--success)] text-white px-2 py-1 rounded truncate max-w-[60%]">
                          {pin.category}
                        </span>
                        <span className="whitespace-nowrap">
                          {new Date(pin.createdAt).toLocaleDateString('pl-PL')}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Selected Pin Details */}
              <div className="bg-[var(--bg-secondary)] rounded-xl shadow-lg p-3 sm:p-4 max-h-[500px] sm:max-h-[700px] overflow-y-auto border border-[var(--border-primary)]">
                {selectedPin ? (
                  <div>
                    <div className="sticky top-0 pb-3 mb-3 bg-[var(--bg-secondary)] border-b-2 sm:pb-4 sm:mb-4 border-[var(--border-secondary)]">
                      <h2 className="mb-2 text-base font-bold sm:text-lg md:text-xl text-[var(--text-primary)]">
                        {selectedPin.title}
                      </h2>
                      <p className="mb-3 text-xs sm:text-sm text-[var(--text-secondary)]">
                        {selectedPin.description || 'Brak opisu'}
                      </p>
                      <div className="flex gap-1.5 sm:gap-2 flex-wrap">
                        <span className="px-2 py-1 text-xs text-white bg-[var(--accent-primary)] rounded-full sm:px-3">
                          {selectedPin.category}
                        </span>
                        <span className="px-2 py-1 text-xs text-white bg-[var(--success)] rounded-full sm:px-3">
                          {selectedPin.visitsCount} wizyt
                        </span>
                        <span className="px-2 py-1 text-xs rounded-full bg-[var(--bg-elevated)] text-[var(--text-secondary)] sm:px-3">
                          {new Date(selectedPin.createdAt).toLocaleDateString('pl-PL')}
                        </span>
                      </div>

                      <button
                        onClick={() => exportPinToDocx(selectedPin)}
                        className="flex items-center justify-center w-full px-4 py-2 mt-3 text-sm font-medium text-white bg-[var(--accent-primary)] rounded-lg hover:bg-[var(--accent-hover)] transition-colors gap-2"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                          />
                        </svg>
                        Eksportuj do Word
                      </button>
                    </div>

                    <h3 className="mb-3 text-sm font-semibold sm:text-base md:text-lg text-[var(--text-primary)]">
                      Wizyty ({selectedPin.visits?.length || 0})
                    </h3>

                    {selectedPin.visits && selectedPin.visits.length > 0 ? (
                      <div className="space-y-2 sm:space-y-3">
                        {selectedPin.visits.map((visit) => (
                          <div
                            key={visit.id}
                            className="p-2.5 sm:p-3 bg-[var(--bg-elevated)] rounded-lg border border-[var(--border-secondary)]"
                          >
                            <div className="flex items-start justify-between mb-2 gap-2">
                              <span className="text-sm font-medium text-[var(--text-primary)] sm:text-base">
                                {visit.name}
                              </span>
                              <span className="text-xs text-[var(--text-muted)] whitespace-nowrap">
                                {new Date(visit.visitedAt).toLocaleDateString('pl-PL')}
                              </span>
                            </div>
                            {visit.note && (
                              <p className="mt-2 text-xs italic sm:text-sm text-[var(--text-secondary)]">
                                "{visit.note}"
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="py-8 text-sm text-center text-[var(--text-muted)]">
                        Brak wizyt dla tej pinezki
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="h-full min-h-[300px] flex items-center justify-center text-[var(--text-muted)]">
                    <div className="px-4 text-center">
                      <svg
                        className="w-12 h-12 mx-auto mb-3 sm:h-16 sm:w-16 sm:mb-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122"
                        />
                      </svg>
                      <p className="text-sm sm:text-base md:text-lg">
                        Wybierz pinezkę aby zobaczyć szczegóły
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Date Range Filter */}
            <div className="p-3 mb-3 bg-[var(--bg-secondary)] shadow-lg rounded-xl sm:p-4 md:p-6 sm:mb-4 md:mb-8 border border-[var(--border-primary)]">
              <h2 className="mb-3 text-sm font-semibold sm:text-base md:text-lg text-[var(--text-primary)] sm:mb-4">
                Zakres dat
              </h2>
              <div className="grid grid-cols-1 gap-3 sm:gap-4">
                <div className="grid grid-cols-2 gap-2 sm:gap-3">
                  <div>
                    <label className="block mb-2 text-xs font-medium sm:text-sm text-[var(--text-primary)]">
                      Data początkowa
                    </label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full px-2 py-2 text-xs border rounded-lg sm:px-3 border-[var(--border-secondary)] focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-[var(--accent-primary)] bg-[var(--bg-tertiary)] text-[var(--text-primary)] sm:text-sm"
                    />
                  </div>
                  <div>
                    <label className="block mb-2 text-xs font-medium sm:text-sm text-[var(--text-primary)]">
                      Data końcowa
                    </label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full px-2 py-2 text-xs border rounded-lg sm:px-3 border-[var(--border-secondary)] focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-[var(--accent-primary)] bg-[var(--bg-tertiary)] text-[var(--text-primary)] sm:text-sm"
                    />
                  </div>
                </div>
                <button
                  onClick={() => {
                    setStartDate('');
                    setEndDate('');
                  }}
                  className="w-full px-4 py-2 text-xs font-medium text-white rounded-lg bg-[var(--bg-elevated)] hover:bg-[var(--bg-tertiary)] transition-colors sm:text-sm border border-[var(--border-secondary)]"
                >
                  Resetuj filtry
                </button>
              </div>
            </div>

            {/* Primary KPIs */}
            <div className="mb-3 grid grid-cols-2 lg:grid-cols-5 gap-2 sm:gap-3 md:gap-4 sm:mb-4 md:mb-8">
              <div className="bg-[var(--bg-secondary)] rounded-xl shadow-lg p-2.5 sm:p-4 md:p-6 border-l-4 border-[var(--accent-primary)] hover:shadow-xl transition-shadow">
                <div className="mb-1 text-xs font-medium text-[var(--text-muted)]">TOTAL</div>
                <p className="text-lg font-bold sm:text-2xl md:text-3xl text-[var(--text-primary)]">
                  {filteredStats.total}
                </p>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5 sm:mt-1">Wszystkie piny</p>
              </div>

              <div className="bg-[var(--bg-secondary)] rounded-xl shadow-lg p-2.5 sm:p-4 md:p-6 border-l-4 border-[var(--warning)] hover:shadow-xl transition-shadow">
                <div className="mb-1 text-xs font-medium text-[var(--text-muted)]">WIZYTY</div>
                <p className="text-lg font-bold sm:text-2xl md:text-3xl text-[var(--text-primary)]">
                  {filteredStats.totalUpdates || 0}
                </p>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5 sm:mt-1">Aktualizacji</p>
              </div>

              <div className="bg-[var(--bg-secondary)] rounded-xl shadow-lg p-2.5 sm:p-4 md:p-6 border-l-4 border-[var(--success)] hover:shadow-xl transition-shadow">
                <div className="mb-1 text-xs font-medium text-[var(--text-muted)]">WZROST</div>
                <p className="text-lg font-bold sm:text-2xl md:text-3xl text-[var(--text-primary)]">
                  {growthRate}%
                </p>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5 sm:mt-1">Od początku</p>
              </div>

              <div className="bg-[var(--bg-secondary)] rounded-xl shadow-lg p-2.5 sm:p-4 md:p-6 border-l-4 border-[var(--accent-secondary)] hover:shadow-xl transition-shadow">
                <div className="mb-1 text-xs font-medium text-[var(--text-muted)]">ŚREDNIA</div>
                <p className="text-lg font-bold sm:text-2xl md:text-3xl text-[var(--text-primary)]">
                  {avgPerDay}
                </p>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5 sm:mt-1">Pinów/dzień</p>
              </div>

              <div className="bg-[var(--bg-secondary)] rounded-xl shadow-lg p-2.5 sm:p-4 md:p-6 border-l-4 border-[var(--warning)] hover:shadow-xl transition-shadow">
                <div className="mb-1 text-xs font-medium text-[var(--text-muted)]">KATEGORIE</div>
                <p className="text-lg font-bold sm:text-2xl md:text-3xl text-[var(--text-primary)]">
                  {Object.keys(filteredStats.categories).length}
                </p>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5 sm:mt-1">Typów</p>
              </div>
            </div>

            {/* Secondary KPIs */}
            <div className="mb-3 grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 md:gap-4 sm:mb-4 md:mb-8">
              <div className="bg-[var(--bg-secondary)] rounded-xl shadow-lg p-2.5 sm:p-3 md:p-4 border border-[var(--border-secondary)]">
                <div className="mb-1 text-xs text-[var(--text-muted)]">Aktywność totalna</div>
                <p className="text-base font-bold sm:text-xl md:text-2xl text-[var(--text-primary)]">
                  {totalActivity}
                </p>
              </div>

              <div className="bg-[var(--bg-secondary)] rounded-xl shadow-lg p-2.5 sm:p-3 md:p-4 border border-[var(--border-secondary)]">
                <div className="mb-1 text-xs text-[var(--text-muted)]">Ratio wizyt/pin</div>
                <p className="text-base font-bold sm:text-xl md:text-2xl text-[var(--text-primary)]">
                  {activityRatio}
                </p>
              </div>

              <div className="bg-[var(--bg-secondary)] rounded-xl shadow-lg p-2.5 sm:p-3 md:p-4 border border-[var(--border-secondary)]">
                <div className="mb-1 text-xs text-[var(--text-muted)]">Max pinów/dzień</div>
                <p className="text-base font-bold sm:text-xl md:text-2xl text-[var(--text-primary)]">
                  {maxDailyPins}
                </p>
              </div>

              <div className="bg-[var(--bg-secondary)] rounded-xl shadow-lg p-2.5 sm:p-3 md:p-4 border border-[var(--border-secondary)]">
                <div className="mb-1 text-xs text-[var(--text-muted)]">Śr. wizyt/dzień</div>
                <p className="text-base font-bold sm:text-xl md:text-2xl text-[var(--text-primary)]">
                  {avgUpdatesPerDay}
                </p>
              </div>
            </div>

            {/* Main Charts */}
            <div className="mb-3 grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 md:gap-6 sm:mb-4 md:mb-6">
              {/* Cumulative Growth */}
              <div className="p-3 bg-[var(--bg-secondary)] shadow-lg rounded-xl sm:p-4 md:p-6 border border-[var(--border-primary)]">
                <h2 className="mb-2 text-sm font-bold sm:text-base md:text-xl text-[var(--text-primary)] sm:mb-3 md:mb-4">
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
                        fontSize: '11px',
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
              <div className="p-3 bg-[var(--bg-secondary)] shadow-lg rounded-xl sm:p-4 md:p-6 border border-[var(--border-primary)]">
                <h2 className="mb-2 text-sm font-bold sm:text-base md:text-xl text-[var(--text-primary)] sm:mb-3 md:mb-4">
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
                        fontSize: '11px',
                      }}
                    />
                    <Bar dataKey="count" fill="#10b981" radius={[6, 6, 0, 0]} name="Nowe piny" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Category Distribution */}
            <div className="mb-3 grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 md:gap-6 sm:mb-4 md:mb-6">
              <div className="p-3 bg-[var(--bg-secondary)] shadow-lg rounded-xl sm:p-4 md:p-6 border border-[var(--border-primary)]">
                <h2 className="mb-2 text-sm font-bold sm:text-base md:text-xl text-[var(--text-primary)] sm:mb-3 md:mb-4">
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
                    </Pie>{' '}
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        fontSize: '11px',
                      }}
                    />{' '}
                  </PieChart>{' '}
                </ResponsiveContainer>{' '}
              </div>

              {/* Category Bar Chart */}
              <div className="p-3 bg-[var(--bg-secondary)] shadow-lg rounded-xl sm:p-4 md:p-6 border border-[var(--border-primary)]">
                <h2 className="mb-2 text-sm font-bold sm:text-base md:text-xl text-[var(--text-primary)] sm:mb-3 md:mb-4">
                  Ranking kategorii
                </h2>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={categoryData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis type="number" tick={{ fill: '#1e293b', fontSize: 9 }} />
                    <YAxis
                      dataKey="name"
                      type="category"
                      width={60}
                      tick={{ fill: '#1e293b', fontSize: 9 }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        fontSize: '11px',
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
        input[type='date']::-webkit-calendar-picker-indicator {
          filter: invert(0);
        }
        input[type='date']::-webkit-datetime-edit-fields-wrapper {
          color: #1e293b;
        }
        input[type='date']::-webkit-datetime-edit-text {
          color: #1e293b;
          padding: 0 0.3em;
        }
        input[type='date']::-webkit-datetime-edit-month-field {
          color: #1e293b;
        }
        input[type='date']::-webkit-datetime-edit-day-field {
          color: #1e293b;
        }
        input[type='date']::-webkit-datetime-edit-year-field {
          color: #1e293b;
        }
      `}</style>
    </div>
  );
}
