# 📋 Kosztorys — System CRiIM Mapa

**Wykonawca:** [Twoje imię i nazwisko / nazwa działalności]  
**Zamawiający:** Miejski Ośrodek Pomocy Społecznej w Gdyni  
**Data:** 8 lutego 2026 r.  
**Wersja dokumentu:** 1.0

---

## 1. Opis systemu

**CRiIM Mapa** to dedykowany system informatyczny wspierający codzienną pracę zespołu streetworkerów Centrum Reintegracji i Interwencji Mieszkaniowej (CRiIM) przy MOPS Gdynia.

System umożliwia:
- 🗺️ Interaktywne zarządzanie pinami (punktami) na mapie miasta
- 📋 Rejestrowanie wizyt terenowych z przypisaniem do pracownika
- 🚶 Planowanie i optymalizację tras patrolowych
- 📊 Gromadzenie statystyk miesięcznych (KPI) per pracownik
- 📈 Zaawansowaną analitykę z wykresami i kalendarzem aktywności
- 📤 Eksport danych do Excel (XLSX) i Word (DOCX) — gotowe do raportowania
- 🔐 Bezpieczną autoryzację z ochroną przed brute-force
- 📱 Pełną obsługę mobilną (praca w terenie z telefonu)

---

## 2. Kontekst biznesowy — dlaczego to ma wartość

### Problem PRZED wdrożeniem systemu:
| Problem | Konsekwencja |
|---|---|
| Brak centralnej bazy punktów interwencji | Wiedza w głowach pracowników — odejście osoby = utrata danych |
| Papierowe notatki / Excel | Brak współdzielenia w czasie rzeczywistym między pracownikami |
| Brak historii wizyt | Niemożność udowodnienia częstotliwości interwencji (audyty, NFZ, sprawozdania) |
| Ręczne planowanie tras | Nieefektywne trasy = mniej wizyt dziennie |
| Brak statystyk | Brak danych do sprawozdań kwartalnych/rocznych dla MOPS i Urzędu Miasta |
| Brak eksportu danych | Godziny ręcznego przepisywania danych do raportów |

### Wartość PO wdrożeniu:
| Korzyść | Szacowany wpływ |
|---|---|
| **Oszczędność czasu na raportowanie** | ~8-12h / miesiąc / pracownik |
| **Więcej wizyt dziennie** dzięki optymalizacji tras | +15-25% efektywności |
| **Ciągłość wiedzy** — dane nie odchodzą z pracownikiem | Bezcenne dla instytucji |
| **Gotowe dane do audytów** i sprawozdań | Eliminacja ryzyka niezgodności |
| **Współdzielenie w czasie rzeczywistym** | Lepsza koordynacja 4-osobowego zespołu |

> **Przy 4 pracownikach oszczędzających ~10h/mies. na raportowaniu i administracji:**  
> 4 × 10h × 40 zł/h (stawka pracownika) = **1 600 zł / miesiąc** oszczędności samych kosztów pracy.  
> **System zwraca się w ~24 miesiące** — a będzie służył latami.

---

## 3. Szczegółowy kosztorys prac programistycznych

### 3.1 Moduł mapy interaktywnej
| Element | Godziny | Stawka | Kwota |
|---|---:|---:|---:|
| Integracja map Leaflet / OpenStreetMap | 12h | 150 zł | 1 800 zł |
| System pinów (CRUD) z popup'ami | 16h | 150 zł | 2 400 zł |
| Filtrowanie po kategoriach z licznikami | 6h | 150 zł | 900 zł |
| Tryb dodawania pinów (tap na mapie) | 8h | 150 zł | 1 200 zł |
| Oznaczanie nowych pinów (animacja, badge) | 4h | 150 zł | 600 zł |
| Optimistic concurrency control (409) | 6h | 150 zł | 900 zł |
| Odświeżanie w czasie rzeczywistym (SWR polling) | 6h | 150 zł | 900 zł |
| **Suma modułu** | **58h** | | **8 700 zł** |

### 3.2 Moduł wizyt terenowych
| Element | Godziny | Stawka | Kwota |
|---|---:|---:|---:|
| Rejestrowanie wizyt z przypisaniem pracownika | 8h | 150 zł | 1 200 zł |
| Historia wizyt per punkt (sortowanie, limit) | 6h | 150 zł | 900 zł |
| Upload i kompresja zdjęć z terenu | 10h | 150 zł | 1 500 zł |
| Obsługa orientacji EXIF | 3h | 150 zł | 450 zł |
| Przechowywanie zdjęć (Blob storage) | 4h | 150 zł | 600 zł |
| **Suma modułu** | **31h** | | **4 650 zł** |

### 3.3 Moduł planowania tras patrolowych
| Element | Godziny | Stawka | Kwota |
|---|---:|---:|---:|
| CRUD planów patrolowych | 8h | 150 zł | 1 200 zł |
| Wyszukiwarka pinów z autouzupełnianiem | 6h | 150 zł | 900 zł |
| Algorytm optymalizacji trasy (nearest-neighbor) | 8h | 150 zł | 1 200 zł |
| Obliczanie dystansu (wzór Haversine) | 4h | 150 zł | 600 zł |
| Zmiana kolejności punktów w trasie | 4h | 150 zł | 600 zł |
| **Suma modułu** | **30h** | | **4 500 zł** |

### 3.4 Moduł statystyk streetworkowych (KPI)
| Element | Godziny | Stawka | Kwota |
|---|---:|---:|---:|
| Dashboard miesięczny per pracownik | 10h | 150 zł | 1 500 zł |
| Liczniki interwencji / kontaktów / interakcji | 6h | 150 zł | 900 zł |
| Wybór miesiąca z historią | 4h | 150 zł | 600 zł |
| Personalizacja profili (awatar, kolory) | 8h | 150 zł | 1 200 zł |
| Podsumowanie miesięczne zespołu | 4h | 150 zł | 600 zł |
| **Suma modułu** | **32h** | | **4 800 zł** |

### 3.5 Moduł analityki i raportowania
| Element | Godziny | Stawka | Kwota |
|---|---:|---:|---:|
| 9 kart KPI (wzrost, średnie, wskaźniki) | 8h | 150 zł | 1 200 zł |
| 4 wykresy (liniowy, słupkowy, kołowy, ranking) | 12h | 150 zł | 1 800 zł |
| Filtr zakresu dat | 4h | 150 zł | 600 zł |
| Kalendarz aktywności (heatmapa) | 10h | 150 zł | 1 500 zł |
| Przeglądarka danych z filtrami | 8h | 150 zł | 1 200 zł |
| Normalizacja polskich imion (diakrytyki) | 4h | 150 zł | 600 zł |
| Eksport do Excel (XLSX, 4 arkusze, style) | 12h | 150 zł | 1 800 zł |
| Eksport do Word (DOCX, per pin, tabele) | 8h | 150 zł | 1 200 zł |
| **Suma modułu** | **66h** | | **9 900 zł** |

### 3.6 Moduł bezpieczeństwa i autoryzacji
| Element | Godziny | Stawka | Kwota |
|---|---:|---:|---:|
| System logowania (email/hasło) | 6h | 150 zł | 900 zł |
| Hashowanie haseł (SHA-256) | 3h | 150 zł | 450 zł |
| Blokada brute-force (3 próby / 24h) | 4h | 150 zł | 600 zł |
| Sesje cookie-based | 4h | 150 zł | 600 zł |
| Wymuszanie zmiany hasła przy 1. logowaniu | 4h | 150 zł | 600 zł |
| **Suma modułu** | **21h** | | **3 150 zł** |

### 3.7 Warstwa danych i backend
| Element | Godziny | Stawka | Kwota |
|---|---:|---:|---:|
| Architektura dual-database (SQLite + PostgreSQL) | 16h | 150 zł | 2 400 zł |
| Auto-tworzenie schematów i tabel (7 tabel) | 8h | 150 zł | 1 200 zł |
| Triggery bazodanowe (denormalizacja) | 6h | 150 zł | 900 zł |
| Connection pooling (20 połączeń) | 4h | 150 zł | 600 zł |
| Cache in-memory z TTL i invalidacją | 4h | 150 zł | 600 zł |
| 13 endpointów API REST (~20 operacji HTTP) | 16h | 150 zł | 2 400 zł |
| Nagłówki cache HTTP (stale-while-revalidate) | 3h | 150 zł | 450 zł |
| Indeksy bazodanowe (wydajność) | 3h | 150 zł | 450 zł |
| **Suma modułu** | **60h** | | **9 000 zł** |

### 3.8 System changelog (powiadomienia o aktualizacjach)
| Element | Godziny | Stawka | Kwota |
|---|---:|---:|---:|
| Modal "Co nowego" z animacjami | 4h | 150 zł | 600 zł |
| Śledzenie wyświetleń per użytkownik | 3h | 150 zł | 450 zł |
| API changelog | 3h | 150 zł | 450 zł |
| **Suma modułu** | **10h** | | **1 500 zł** |

### 3.9 Responsywność i UX mobilny
| Element | Godziny | Stawka | Kwota |
|---|---:|---:|---:|
| Projektowanie mobile-first (Tailwind CSS) | 10h | 150 zł | 1 500 zł |
| Dostosowanie do pracy w terenie | 6h | 150 zł | 900 zł |
| Haptic feedback, gesty dotykowe | 3h | 150 zł | 450 zł |
| Lokalizacja PL (interfejs, daty, komunikaty) | 4h | 150 zł | 600 zł |
| **Suma modułu** | **23h** | | **3 450 zł** |

### 3.10 Testy i zapewnienie jakości
| Element | Godziny | Stawka | Kwota |
|---|---:|---:|---:|
| Testy integracyjne API (Vitest) | 8h | 150 zł | 1 200 zł |
| Testy E2E (Playwright) | 8h | 150 zł | 1 200 zł |
| Testy wydajnościowe i skalowalności | 6h | 150 zł | 900 zł |
| Testy jednostkowe (normalizacja nazw) | 3h | 150 zł | 450 zł |
| **Suma modułu** | **25h** | | **3 750 zł** |

---

## 4. Podsumowanie kosztów wytworzenia

| Moduł | Godziny | Kwota |
|---|---:|---:|
| 3.1 Mapa interaktywna | 58h | 8 700 zł |
| 3.2 Wizyty terenowe | 31h | 4 650 zł |
| 3.3 Planowanie tras | 30h | 4 500 zł |
| 3.4 Statystyki KPI | 32h | 4 800 zł |
| 3.5 Analityka i raportowanie | 66h | 9 900 zł |
| 3.6 Bezpieczeństwo | 21h | 3 150 zł |
| 3.7 Backend i dane | 60h | 9 000 zł |
| 3.8 Changelog | 10h | 1 500 zł |
| 3.9 UX mobilny | 23h | 3 450 zł |
| 3.10 Testy QA | 25h | 3 750 zł |
| **SUMA prac programistycznych** | **356h** | **53 400 zł** |

---

## 5. Dodatkowe koszty

| Pozycja | Kwota |
|---|---:|
| Analiza wymagań i konsultacje z zespołem CRiIM | 2 000 zł |
| Wdrożenie i konfiguracja środowiska produkcyjnego | 1 500 zł |
| Szkolenie zespołu streetworkerów (4 osoby) | 1 500 zł |
| Dokumentacja techniczna i użytkowa | 1 500 zł |
| **SUMA kosztów dodatkowych** | **6 500 zł** |

---

## 6. Koszty utrzymania (opcjonalnie, miesięcznie)

| Pozycja | Kwota/mies. |
|---|---:|
| Hosting aplikacji (Vercel / VPS) | 100-200 zł |
| Przechowywanie zdjęć (Blob storage) | 50-100 zł |
| Wsparcie techniczne i poprawki (SLA) | 500 zł |
| **SUMA miesięczna** | **650-800 zł** |

---

## 7. Zestawienie końcowe

| Pozycja | Kwota netto |
|---|---:|
| Prace programistyczne (356h × 150 zł) | 53 400 zł |
| Koszty dodatkowe | 6 500 zł |
| **WARTOŚĆ SYSTEMU** | **59 900 zł** |
| | |
| 🎯 **CENA OFEROWANA (rabat instytucjonalny -36%)** | **38 000 zł** |
| VAT 23% | 8 740 zł |
| **CENA BRUTTO** | **46 740 zł** |

---

## 8. Odniesienie rynkowe — dlaczego to dobra cena

| Porównanie | Koszt |
|---|---:|
| 🏢 Komercyjny system GIS dla służb miejskich | 150 000 – 500 000 zł |
| 🏗️ Dedykowane oprogramowanie od software house (356h × 250-400 zł) | 89 000 – 142 400 zł |
| 📱 Aplikacja mobilna od agencji (porównywalny zakres) | 80 000 – 200 000 zł |
| 📊 Licencja roczna na porównywalny SaaS (np. Salesforce Field Service) | 40 000 – 80 000 zł / rok |
| ✅ **CRiIM Mapa — jednorazowy koszt, pełna własność** | **38 000 zł** |

> ⚠️ **Uwaga:** Komercyjne rozwiązania SaaS kosztują 40-80 tys. zł **rocznie** (licencje).  
> CRiIM Mapa to **jednorazowy koszt** z pełnym przekazaniem praw autorskich i kodu źródłowego.

---

## 9. Co otrzymuje Zamawiający

✅ Pełny kod źródłowy aplikacji (~7 500 linii TypeScript)  
✅ 7 tabel bazodanowych z pełnym schematem  
✅ 13 endpointów API (20 operacji)  
✅ Pokrycie testami (integracyjne, E2E, wydajnościowe)  
✅ Dokumentację techniczną  
✅ Aplikację gotową do pracy z dnia na dzień  
✅ System przetestowany w boju — **używany codziennie przez zespół CRiIM**  
✅ Brak opłat licencyjnych — pełna własność MOPS Gdynia  

---

## 10. Specyfikacja techniczna

| Parametr | Wartość |
|---|---|
| **Stack technologiczny** | Next.js 14, React 18, TypeScript 5.4, Tailwind CSS |
| **Baza danych** | SQLite (lokalna) / PostgreSQL (produkcja) — dual-provider |
| **Mapy** | Leaflet + OpenStreetMap (Thunderforest) |
| **Wykresy** | Recharts (4 typy wizualizacji) |
| **Eksporty** | XLSX (wieloarkuszowy), DOCX (per punkt) |
| **Hosting** | Vercel / dowolny serwer Node.js |
| **Testy** | Vitest + Playwright |
| **Responsywność** | Mobile-first, praca w terenie z telefonu |
| **Bezpieczeństwo** | SHA-256, brute-force protection, sesje cookie |

---

*Dokument sporządzono na podstawie analizy kodu źródłowego systemu CRiIM Mapa w wersji produkcyjnej.*

*[Twoje imię i nazwisko]*  
*[Data i podpis]*
