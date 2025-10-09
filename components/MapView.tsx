"use client";

import dynamic from "next/dynamic";
import { useCallback, useMemo, useState, useEffect, useRef } from "react";
import useSWR, { mutate } from "swr";
import type { Pin, Visit } from "@/types";
import "leaflet/dist/leaflet.css";

// Dynamically import react-leaflet components (client-only)
const MapContainer = dynamic(() => import("react-leaflet").then(m => m.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import("react-leaflet").then(m => m.TileLayer), { ssr: false });
const CircleMarker = dynamic(() => import("react-leaflet").then(m => m.CircleMarker), { ssr: false });
const Popup = dynamic(() => import("react-leaflet").then(m => m.Popup), { ssr: false });
const ZoomControl = dynamic(() => import("react-leaflet").then(m => m.ZoomControl), { ssr: false });

const fetcher = async (url: string) => {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
};

const DEFAULT_PALETTE = ["#22c55e", "#3b82f6", "#ef4444", "#eab308", "#a855f7", "#06b6d4", "#f97316", "#84cc16"] as const; // green, blue, red, yellow, purple, cyan, orange, lime
function hashColor(input: string): string {
  let h = 0;
  for (let i = 0; i < input.length; i++) h = (h * 31 + input.charCodeAt(i)) >>> 0;
  return DEFAULT_PALETTE[h % DEFAULT_PALETTE.length];
}

export default function MapView() {
  const [filter, setFilter] = useState<string>("");
  const [addMode, setAddMode] = useState<boolean>(false);
  const [draftPos, setDraftPos] = useState<{ lat: number; lng: number } | null>(null);
  const [selected, setSelected] = useState<Pin | null>(null);
  const [editing, setEditing] = useState<boolean>(false);

  const { data: pins } = useSWR<Pin[]>(`/api/pins${filter ? `?category=${encodeURIComponent(filter)}` : ""}`, fetcher, { refreshInterval: selected ? 0 : 3000, revalidateOnFocus: false });

  const categories = useMemo(() => {
    const set = new Set<string>();
    (pins ?? []).forEach(p => set.add(p.category));
    return Array.from(set).sort();
  }, [pins]);
  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const [categoryColors, setCategoryColors] = useState<Record<string, string>>({});
  // Load/save colors to localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem("categoryColors");
      if (raw) setCategoryColors(JSON.parse(raw));
    } catch {}
  }, []);
  useEffect(() => {
    try { localStorage.setItem("categoryColors", JSON.stringify(categoryColors)); } catch {}
  }, [categoryColors]);

  // Categories from DB
  const { data: cats } = useSWR<{ name: string; color: string }[]>(`/api/categories`, fetcher, { refreshInterval: 10000, revalidateOnFocus: false });
  const availableCategories = useMemo(() => {
    const names = new Set<string>();
    (cats ?? []).forEach(c => names.add(c.name));
    (categories ?? []).forEach(n => names.add(n));
    return Array.from(names).sort();
  }, [cats, categories]);

  // Modal tworzenia kategorii
  const [catModalOpen, setCatModalOpen] = useState(false);
  const [catModalName, setCatModalName] = useState("");
  const [catModalColor, setCatModalColor] = useState<string>(DEFAULT_PALETTE[0]);
  const catApplyRef = useRef<null | ((name: string) => void)>(null);

  const openCategoryModal = useCallback((onApply: (name: string) => void, prefillName?: string) => {
    setCatModalName(prefillName || "");
    setCatModalColor(DEFAULT_PALETTE[0]);
    catApplyRef.current = onApply;
    setCatModalOpen(true);
  }, []);

  const confirmCategoryModal = useCallback(async () => {
    const val = (catModalName || "").trim();
    if (!val) return;
    await fetch('/api/categories', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: val, color: catModalColor || DEFAULT_PALETTE[0] }) });
    const apply = catApplyRef.current; catApplyRef.current = null;
    setCatModalOpen(false);
    if (apply) apply(val);
    mutate('/api/categories');
  }, [catModalName, catModalColor]);

  const getCategoryColor = useCallback((cat: string) => {
    const match = (cats ?? []).find(c => c.name === cat);
    return match?.color ?? hashColor(cat);
  }, [cats]);

  const onMapClick = useCallback((e: any) => {
    if (!addMode) return;
    const { lat, lng } = e.latlng;
    setDraftPos({ lat, lng });
  }, [addMode]);

  const savePin = useCallback(async (form: { title: string; category: string; description?: string }) => {
    if (!draftPos) return;
    await fetch("/api/pins", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, lat: draftPos.lat, lng: draftPos.lng })
    });
    setAddMode(false);
    setDraftPos(null);
    mutate((key) => typeof key === "string" && key.startsWith("/api/pins"));
  }, [draftPos]);

  const updatePin = useCallback(async (pin: Pin) => {
    const res = await fetch(`/api/pins/${pin.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: pin.title,
        category: pin.category,
        description: pin.description,
        expectedUpdatedAt: pin.updatedAt
      })
    });
    if (res.status === 409) {
      alert("Ktoś inny zaktualizował tę pinezkę. Odświeżam...");
    } else if (!res.ok) {
      alert("Nie udało się zapisać zmian");
    }
    setEditing(false);
    mutate((key) => typeof key === "string" && key.startsWith("/api/pins"));
    if (selected) fetchPinDetails(selected.id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]);

  const deletePin = useCallback(async (id: number) => {
    if (!confirm("Usunąć tę pinezkę?")) return;
    const res = await fetch(`/api/pins/${id}`, { method: "DELETE" });
    if (!res.ok) alert("Nie udało się usunąć");
    setSelected(null);
    mutate((key) => typeof key === "string" && key.startsWith("/api/pins"));
  }, []);

  const [details, setDetails] = useState<{ pin?: Pin; visits?: Visit[] } | null>(null);
  const fetchPinDetails = useCallback(async (id: number) => {
    const res = await fetch(`/api/pins/${id}`, { cache: "no-store" });
    if (res.ok) setDetails(await res.json());
  }, []);

  const addVisit = useCallback(async (pinId: number, name: string, note?: string) => {
    const res = await fetch(`/api/pins/${pinId}/visits`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, note })
    });
    if (!res.ok) alert("Nie udało się dodać odwiedzin");
    await fetchPinDetails(pinId);
    mutate((key) => typeof key === "string" && key.startsWith("/api/pins"));
  }, [fetchPinDetails]);

  // UI helpers
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");

  const [visitName, setVisitName] = useState("");
  const [visitNote, setVisitNote] = useState("");

  const clearDraft = () => {
    setTitle("");
    setCategory("");
    setDescription("");
  };

  return (
    <div className="relative w-full h-full">
      {/* Controls */}
      <div className="absolute z-[1000] left-2 right-2 top-2 flex gap-2 items-center">
        <div className="flex-1 flex gap-2 bg-[var(--surface)]/80 border border-[var(--border)] rounded-xl p-2 backdrop-blur">
          <select
            className="px-3 py-3 bg-[var(--bg)] text-[var(--fg)] rounded-lg border border-[var(--border)] text-sm flex-1"
            value={filter}
            onChange={(e) => {
              const val = e.target.value;
              if (val === "__add__") {
                openCategoryModal((created) => setFilter(created));
                return;
              }
              setFilter(val);
            }}
          >
            <option value="">Wszystkie kategorie</option>
            {availableCategories.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
            <option value="__add__">+ Dodaj kategorię…</option>
          </select>
          <button
            onClick={() => setAddMode(v => !v)}
            className={`px-3 py-3 rounded-lg text-sm font-medium border ${addMode ? "bg-emerald-600/20 border-emerald-600 text-emerald-300" : "bg-[var(--bg)] border-[var(--border)]"}`}
          >
            {addMode ? "Dotknij mapy, aby dodać" : "+ Dodaj pinezkę"}
          </button>
        </div>
      </div>

      {/* Map */}
      <MapContainer center={[54.5189, 18.5305]} zoom={12} zoomControl={false} className="w-full h-full" scrollWheelZoom>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {/* Click handler */}
        <ClickCatcher onClick={onMapClick} />

        {/* Zoom controls repositioned to avoid overlapping top controls */}
        <ZoomControl position="bottomright" />

        {/* Locate me button */}
        <LocateButton />

        {/* Existing pins */}
        {(pins ?? []).map((p) => (
          <CircleMarker key={p.id} center={[p.lat, p.lng]} radius={8} pathOptions={{ color: getCategoryColor(p.category), fillColor: getCategoryColor(p.category), fillOpacity: 0.9 }} eventHandlers={{ click: () => { setSelected(p); fetchPinDetails(p.id); setEditing(false); setVisitName(""); setVisitNote(""); } }}>
            <Popup minWidth={220} maxWidth={340} className="!bg-[var(--surface)] !text-[var(--fg)]">
              <div className="space-y-2 w-[88vw] max-w-xs max-h-[65vh] overflow-y-auto">
                {!editing ? (
                  <>
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <div className="text-sm font-semibold">{p.title}</div>
                        <div className="text-[11px] text-neutral-400"><span className="inline-block h-2.5 w-2.5 rounded-full mr-1 align-middle" style={{ backgroundColor: getCategoryColor(p.category) }}></span>{p.category} · {new Date(p.updatedAt).toLocaleString()}</div>
                      </div>
                      <div className="text-[11px] text-neutral-500">{p.visitsCount ?? 0} odwiedzin</div>
                    </div>
                    {p.description && <p className="text-sm text-[var(--fg)]/80 whitespace-pre-wrap">{p.description}</p>}
                    <div className="flex gap-2">
                      <button className="px-3 py-2 rounded-md bg-[var(--surface)] text-sm border border-[var(--border)]" onClick={() => setEditing(true)}>Edytuj</button>
                      <button className="px-3 py-2 rounded-md bg-red-700/30 text-red-300 text-sm" onClick={() => deletePin(p.id)}>Usuń</button>
                    </div>
                  </>
                ) : (
                  <>
                    <input className="w-full px-3 py-2 rounded-md bg-[var(--surface)] text-[var(--fg)] placeholder-neutral-400 text-sm border border-[var(--border)]" value={p.title} onChange={(e) => setSelected(sel => sel ? { ...sel, title: e.target.value } : sel)} placeholder="Tytuł" />
                    <div>
                      <select className="w-full px-3 py-2 rounded-md bg-[var(--surface)] text-[var(--fg)] text-sm border border-[var(--border)]" value={p.category} onChange={(e) => {
                      const val = e.target.value;
                      if (val === "__add__") {
                        openCategoryModal((created) => setSelected(sel => sel ? { ...sel, category: created } : sel), p.category);
                        return;
                      }
                      setSelected(sel => sel ? { ...sel, category: val } : sel);
                    }}>
                      {availableCategories.map(c => (<option key={c} value={c}>{c}</option>))}
                      <option value="__add__">+ Dodaj kategorię…</option>
                    </select>
                    </div>
                    <textarea className="w-full px-3 py-2 rounded-md bg-[var(--surface)] text-[var(--fg)] placeholder-neutral-400 text-sm border border-[var(--border)]" value={p.description ?? ""} onChange={(e) => setSelected(sel => sel ? { ...sel, description: e.target.value } : sel)} placeholder="Opis" />
                    <div className="flex gap-2">
                      <button className="px-3 py-2 rounded-md bg-emerald-700/30 text-emerald-300 text-sm" onClick={() => selected && updatePin(selected)}>Zapisz</button>
                      <button className="px-3 py-2 rounded-md bg-neutral-800 text-sm" onClick={() => { setEditing(false); mutate((key) => typeof key === "string" && key.startsWith("/api/pins")); }}>Anuluj</button>
                    </div>
                  </>
                )}

                {/* Visits */}
                {details?.pin?.id === p.id && (
                  <div className="pt-2 border-t border-neutral-800">
                    <div className="text-xs text-[var(--muted)] mb-1">Historia odwiedzin</div>
                    <div className="max-h-40 overflow-auto space-y-1 pr-1">
                      {(details.visits ?? []).map(v => (
                        <div key={v.id} className="text-sm text-neutral-300">
                          <span className="font-medium">{v.name}</span>
                          {v.note ? ` – ${v.note}` : ""}
                          <span className="text-[11px] text-neutral-500"> · {new Date(v.visitedAt).toLocaleString()}</span>
                        </div>
                      ))}
                      {(details.visits ?? []).length === 0 && (
                        <div className="text-sm text-neutral-500">Brak odwiedzin</div>
                      )}
                    </div>
                    <div className="mt-2 space-y-2">
                      <input className="w-full px-3 py-2 rounded-md bg-[var(--surface)] text-[var(--fg)] placeholder-neutral-400 text-sm border border-[var(--border)]" placeholder="Twoje imię" value={visitName} onChange={(e) => setVisitName(e.target.value)} />
                      <textarea className="w-full px-3 py-2 rounded-md bg-[var(--surface)] text-[var(--fg)] placeholder-neutral-400 text-sm border border-[var(--border)]" placeholder="Notatka (opcjonalnie)" value={visitNote} onChange={(e) => setVisitNote(e.target.value)} />
                      <button className="w-full px-3 py-2 rounded-md bg-blue-700/30 text-blue-300 text-sm" onClick={() => { if (!visitName.trim()) { alert("Podaj imię"); return; } addVisit(p.id, visitName.trim(), visitNote.trim() || undefined); setVisitName(""); setVisitNote(""); }}>Dodaj</button>
                    </div>
                  </div>
                )}
              </div>
            </Popup>
          </CircleMarker>
        ))}

        {/* Draft marker */}
        {draftPos && (
          <CircleMarker center={[draftPos.lat, draftPos.lng]} radius={8} pathOptions={{ color: category ? getCategoryColor(category) : "#22c55e", fillColor: category ? getCategoryColor(category) : "#22c55e", fillOpacity: 0.7 }}>
            <Popup minWidth={220} maxWidth={340} className="!bg-[var(--surface)] !text-[var(--fg)]">
              <div className="space-y-2 w-[88vw] max-w-xs max-h-[65vh] overflow-y-auto">
                <div className="text-sm text-[var(--muted)]">Nowa pinezka: {draftPos.lat.toFixed(5)}, {draftPos.lng.toFixed(5)}</div>
                <input className="w-full px-3 py-3 rounded-md bg-[var(--surface)] text-[var(--fg)] placeholder-neutral-400 text-sm border border-[var(--border)]" placeholder="Tytuł" value={title} onChange={(e) => setTitle(e.target.value)} />
                <div>
                <select className="w-full px-3 py-3 rounded-md bg-[var(--surface)] text-[var(--fg)] text-sm border border-[var(--border)]" value={category} onChange={(e) => {
                  const val = e.target.value;
                  if (val === "__add__") {
                    openCategoryModal((created) => setCategory(created));
                    return;
                  }
                  setCategory(val);
                }}>
                  <option value="" disabled>Wybierz kategorię…</option>
                  {availableCategories.map(c => (<option key={c} value={c}>{c}</option>))}
                  <option value="__add__">+ Dodaj kategorię…</option>
                </select>
                </div>
                <textarea className="w-full px-3 py-3 rounded-md bg-[var(--surface)] text-[var(--fg)] placeholder-neutral-400 text-sm border border-[var(--border)]" placeholder="Opis (opcjonalnie)" value={description} onChange={(e) => setDescription(e.target.value)} />
                <div className="flex gap-2">
                  <button className="px-3 py-3 rounded-md bg-emerald-700/30 text-emerald-300 text-sm" onClick={() => { if (!title.trim() || !category.trim()) { alert("Podaj tytuł i kategorię"); return; } savePin({ title: title.trim(), category: category.trim(), description: description.trim() || undefined }); clearDraft(); }}>Zapisz</button>
                  <button className="px-3 py-3 rounded-md bg-neutral-800 text-sm" onClick={() => { setDraftPos(null); clearDraft(); }}>Anuluj</button>
                </div>
              </div>
            </Popup>
          </CircleMarker>
        )}
      </MapContainer>

      {/* Modal tworzenia kategorii */}
      {catModalOpen && (
        <div className="fixed inset-0 z-[2000] flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4">
          <div className="w-full sm:w-[420px] bg-[var(--surface)] text-[var(--fg)] rounded-t-2xl sm:rounded-2xl shadow-xl">
            <div className="p-4 space-y-3">
              <div className="text-sm font-semibold">Nowa kategoria</div>
              <input
                autoFocus
                className="w-full px-3 py-3 rounded-md bg-[var(--bg)] text-[var(--fg)] placeholder-neutral-400 text-sm border border-[var(--border)]"
                placeholder="Nazwa kategorii"
                value={catModalName}
                onChange={(e) => setCatModalName(e.target.value)}
              />
              <div>
                <div className="text-xs text-[var(--muted)] mb-2">Wybierz kolor</div>
                <div className="grid grid-cols-8 gap-2">
                  {DEFAULT_PALETTE.map((c) => (
                    <button
                      type="button"
                      key={c}
                      aria-label={`Wybierz kolor ${c}`}
                      className={`h-8 w-8 rounded-full border ${catModalColor === c ? 'ring-2 ring-blue-400' : ''}`}
                      style={{ backgroundColor: c, borderColor: 'rgba(0,0,0,0.15)' }}
                      onClick={() => setCatModalColor(c)}
                    />
                  ))}
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <button className="px-3 py-2 rounded-md bg-[var(--bg)] border border-[var(--border)] text-sm flex-1" onClick={() => setCatModalOpen(false)}>Anuluj</button>
                <button className="px-3 py-2 rounded-md bg-blue-700/30 text-blue-300 text-sm flex-1" onClick={confirmCategoryModal}>Zapisz</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ClickCatcher({ onClick }: { onClick: (e: any) => void }) {
  // This component plugs into the map click events
  // @ts-ignore
  const Inner = dynamic(async () => {
    const { useMapEvents } = await import("react-leaflet");
    return function C() {
      useMapEvents({ click: onClick });
      return null;
    };
  }, { ssr: false });
  // @ts-ignore
  return <Inner />;
}

function LocateButton() {
  // @ts-ignore
  const Inner = dynamic(async () => {
    const { useMap } = await import("react-leaflet");
    return function Btn() {
      const map = useMap();
      const doLocate = () => {
        if (!window.isSecureContext) {
          alert("Geolokacja wymaga HTTPS albo localhost w trybie deweloperskim. Uruchom przez https:// lub użyj emulatora przeglądarki.");
          return;
        }
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              const { latitude, longitude } = pos.coords;
              map.flyTo([latitude, longitude], 13);
            },
            (err) => {
              console.error(err);
              alert("Nie można pobrać lokalizacji – sprawdź uprawnienia przeglądarki.");
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
          );
        } else {
          alert("Brak wsparcia geolokacji");
        }
      };
    };
  }, { ssr: false });
  // @ts-ignore
  return <Inner />;
}

