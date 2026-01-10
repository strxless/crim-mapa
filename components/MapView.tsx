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

const DEFAULT_PALETTE = [
  "#22c55e", // zielony
  "#3b82f6", // niebieski
  "#ef4444", // czerwony
  "#eab308", // żółty
  "#a855f7", // fioletowy
  "#06b6d4", // cyjan
  "#f97316", // pomarańczowy
  "#84cc16", // limonkowy
  "#ec4899", // różowy
  "#8b5cf6", // indygo
  "#14b8a6", // teal
  "#f59e0b", // amber
  "#10b981", // szmaragdowy
  "#6366f1", // ciemny niebieski
  "#f43f5e", // rose
  "#d946ef", // fuksja
] as const;

function hashColor(input: string): string {
  let h = 0;
  for (let i = 0; i < input.length; i++) h = (h * 31 + input.charCodeAt(i)) >>> 0;
  return DEFAULT_PALETTE[h % DEFAULT_PALETTE.length];
}

// Toast notification component
function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[2000] bg-emerald-600 text-white px-4 py-3 rounded-lg shadow-lg animate-[slideDown_0.3s_ease-out]">
      {message}
    </div>
  );
}

// Delete confirmation modal
function DeleteConfirmModal({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/50 p-4" onClick={onCancel}>
      <div className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-2xl shadow-xl p-6 max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-semibold mb-2">Usunąć pinezkę?</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Tej operacji nie można cofnąć.</p>
        <div className="flex gap-2">
          <button className="flex-1 px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600" onClick={onCancel}>
            Anuluj
          </button>
          <button className="flex-1 px-4 py-2 rounded-lg bg-red-600 text-white font-medium" onClick={onConfirm}>
            Usuń
          </button>
        </div>
      </div>
    </div>
  );
}

export default function MapView() {
  const [filter, setFilter] = useState<string>("");
  const [addMode, setAddMode] = useState<boolean>(false);
  const [draftPos, setDraftPos] = useState<{ lat: number; lng: number } | null>(null);
  const [selected, setSelected] = useState<Pin | null>(null);
  const [editing, setEditing] = useState<boolean>(false);
  const [toast, setToast] = useState<string | null>(null);
  const [deleteModalPinId, setDeleteModalPinId] = useState<number | null>(null);
  const mapRef = useRef<any>(null);

  const { data: pins } = useSWR<Pin[]>(`/api/pins${filter ? `?category=${encodeURIComponent(filter)}` : ""}`, fetcher, { refreshInterval: selected ? 0 : 3000, revalidateOnFocus: false });

  const categories = useMemo(() => {
    const set = new Set<string>();
    (pins ?? []).forEach(p => set.add(p.category));
    return Array.from(set).sort();
  }, [pins]);
  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const [categoryColors, setCategoryColors] = useState<Record<string, string>>({});
  
  useEffect(() => {
    try {
      const raw = localStorage.getItem("categoryColors");
      if (raw) setCategoryColors(JSON.parse(raw));
    } catch {}
  }, []);
  useEffect(() => {
    try { localStorage.setItem("categoryColors", JSON.stringify(categoryColors)); } catch {}
  }, [categoryColors]);

  const { data: cats } = useSWR<{ name: string; color: string }[]>(`/api/categories`, fetcher, { refreshInterval: 10000, revalidateOnFocus: false });
  const availableCategories = useMemo(() => {
    const names = new Set<string>();
    (cats ?? []).forEach(c => names.add(c.name));
    (categories ?? []).forEach(n => names.add(n));
    return Array.from(names).sort();
  }, [cats, categories]);

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
    setToast("Kategoria utworzona!");
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
    const res = await fetch("/api/pins", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, lat: draftPos.lat, lng: draftPos.lng })
    });
    
    if (res.ok) {
      setAddMode(false);
      setDraftPos(null);
      await mutate((key) => typeof key === "string" && key.startsWith("/api/pins"));
      setToast("Pinezka dodana!");
    }
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
      mutate((key) => typeof key === "string" && key.startsWith("/api/pins"));
      if (selected) fetchPinDetails(selected.id);
    } else if (!res.ok) {
      alert("Nie udało się zapisać zmian");
    } else {
      setToast("Zmiany zapisane!");
      mutate((key) => typeof key === "string" && key.startsWith("/api/pins"));
      if (selected) await fetchPinDetails(selected.id);
    }
    setEditing(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]);

  const deletePin = useCallback(async (id: number) => {
    const res = await fetch(`/api/pins/${id}`, { method: "DELETE" });
    if (!res.ok) {
      alert("Nie udało się usunąć");
    } else {
      setToast("Pinezka usunięta");
    }
    setSelected(null);
    setDeleteModalPinId(null);
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
    if (!res.ok) {
      alert("Nie udało się dodać aktualizacji");
    } else {
      setToast("Zaktualizowano");
    }
    await fetchPinDetails(pinId);
    mutate((key) => typeof key === "string" && key.startsWith("/api/pins"));
  }, [fetchPinDetails]);

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");

  const [visitName, setVisitName] = useState("");
  const [visitNote, setVisitNote] = useState("");
  const visitNameRef = useRef<HTMLInputElement>(null);

  const clearDraft = () => {
    setTitle("");
    setCategory("");
    setDescription("");
  };

  // ESC to close modals
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (catModalOpen) setCatModalOpen(false);
        if (deleteModalPinId) setDeleteModalPinId(null);
      }
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [catModalOpen, deleteModalPinId]);

  // Auto-focus visit name input when details load
  useEffect(() => {
    if (details?.pin?.id && visitNameRef.current) {
      setTimeout(() => visitNameRef.current?.focus(), 100);
    }
  }, [details?.pin?.id]);

  // Check if pin is new (within 24h)
  const isNewPin = useCallback((pin: Pin) => {
    const now = new Date().getTime();
    const created = new Date(pin.createdAt).getTime();
    return now - created < 24 * 60 * 60 * 1000;
  }, []);

  return (
    <div className="relative w-full h-full">
      {/* Toast */}
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}

      {/* Delete confirmation modal */}
      {deleteModalPinId && (
        <DeleteConfirmModal
          onConfirm={() => deletePin(deleteModalPinId)}
          onCancel={() => setDeleteModalPinId(null)}
        />
      )}

      {/* Controls */}
      <div className="absolute z-[1000] left-2 right-2 top-2 flex gap-2 items-center">
        <div className="flex-1 flex gap-2 bg-white/90 dark:bg-gray-900/90 border border-gray-300 dark:border-gray-700 rounded-xl p-2 backdrop-blur">
          <select
            className="flex-1 px-3 py-3 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg border border-gray-300 dark:border-gray-600 text-sm"
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
            <option value="">Wszystkie kategorie ({pins?.length ?? 0})</option>
            {availableCategories.map(c => {
              const count = pins?.filter(p => p.category === c).length ?? 0;
              return <option key={c} value={c}>{c} ({count})</option>;
            })}
            <option value="__add__">+ Dodaj kategorię…</option>
          </select>
          {filter && (
            <button 
              onClick={() => setFilter("")}
              className="px-3 py-3 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg border border-gray-300 dark:border-gray-600 text-sm font-medium whitespace-nowrap"
            >
              Wyczyść
            </button>
          )}
          <button
            onClick={() => setAddMode(v => !v)}
            className={`px-3 py-3 rounded-lg text-sm font-medium border whitespace-nowrap ${addMode ? "bg-emerald-600 border-emerald-600 text-white" : "bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600"}`}
          >
            {addMode ? "Dotknij mapy" : "+ Dodaj"}
          </button>
        </div>
      </div>

      {/* Map */}
      <MapContainer center={[54.5189, 18.5305]} zoom={12} zoomControl={false} className="w-full h-full" scrollWheelZoom ref={mapRef}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ClickCatcher onClick={onMapClick} />
        <ZoomControl position="bottomright" />

        {/* Existing pins */}
        {(pins ?? []).map((p) => {
          const isNew = isNewPin(p);
          return (
            <CircleMarker 
              key={p.id} 
              center={[p.lat, p.lng]} 
              radius={8} 
              pathOptions={{ 
                color: getCategoryColor(p.category), 
                fillColor: getCategoryColor(p.category), 
                fillOpacity: 0.9,
                className: isNew ? 'animate-pulse-subtle' : ''
              }} 
              eventHandlers={{ 
                click: () => { 
                  if (navigator.vibrate) navigator.vibrate(10);
                  setSelected(p); 
                  fetchPinDetails(p.id); 
                  setEditing(false); 
                  setVisitName(""); 
                  setVisitNote(""); 
                } 
              }}
            >
              <Popup minWidth={220} maxWidth={340}>
                <div className="space-y-2 w-[88vw] max-w-xs max-h-[65vh] overflow-y-auto bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 p-3 rounded-lg">
                  {!editing ? (
                    <>
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <div className="text-sm font-semibold">{p.title}</div>
                          <div className="text-[11px] text-gray-500 dark:text-gray-400 whitespace-nowrap"><span className="inline-block h-2.5 w-2.5 rounded-full mr-1 align-middle" style={{ backgroundColor: getCategoryColor(p.category) }}></span>{p.category} · {new Date(p.updatedAt).toLocaleString('pl-PL', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}</div>
                        </div>
                        <div className="text-[11px] text-gray-500 dark:text-gray-400">{p.visitsCount ?? 0} odwiedzin</div>
                      </div>
                      {p.description && <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{p.description}</p>}
                      <div className="flex gap-2">
                        <button className="px-3 py-2 rounded-md bg-red-600 text-white text-sm" onClick={() => setDeleteModalPinId(p.id)}>Usuń</button>
                        <button 
                  className="px-3 py-2 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm border border-gray-300 dark:border-gray-600" 
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditing(true);
                  }}
                >
                  Edytuj
                </button>
                      </div>
                    </>
                  ) : (
                    <>
                    <input 
                    className="w-full px-3 py-2 rounded-md bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 text-sm border border-gray-300 dark:border-gray-600" 
                    value={selected?.title ?? ""} 
                    onChange={(e) => setSelected(sel => sel ? { ...sel, title: e.target.value } : sel)} 
                    placeholder="Tytuł" 
                  />
                  <div>
                    <select 
                      className="w-full px-3 py-2 rounded-md bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 text-sm border border-gray-300 dark:border-gray-600" 
                      value={selected?.category ?? ""} 
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === "__add__") {
                          openCategoryModal((created) => setSelected(sel => sel ? { ...sel, category: created } : sel), selected?.category);
                          return;
                        }
                        setSelected(sel => sel ? { ...sel, category: val } : sel);
                      }}
                    >
                      {availableCategories.map(c => (<option key={c} value={c}>{c}</option>))}
                      <option value="__add__">+ Dodaj kategorię…</option>
                    </select>
                  </div>
                  <textarea 
                    className="w-full px-3 py-2 rounded-md bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 text-sm border border-gray-300 dark:border-gray-600" 
                    value={selected?.description ?? ""} 
                    onChange={(e) => setSelected(sel => sel ? { ...sel, description: e.target.value } : sel)} 
                    placeholder="Opis" 
                  />
                      <div className="flex gap-2">
                        <button className="px-3 py-2 rounded-md bg-emerald-600 text-white text-sm" onClick={() => selected && updatePin(selected)}>Zapisz</button>
                        <button className="px-3 py-2 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm border border-gray-300 dark:border-gray-600" onClick={() => setEditing(false)}>Anuluj</button>
                      </div>
                    </>
                  )}

                  {/* Visits */}
                  {details?.pin?.id === p.id && (
                    <div className="pt-2 border-t border-gray-300 dark:border-gray-700">
                      <div className="text-xs text-gray-600 dark:text-gray-400 mb-1 font-medium">Historia odwiedzin</div>
                      <div className="max-h-[90px] overflow-y-auto space-y-2 pr-1 -mr-1">
                        {(details.visits ?? [])
                          .sort((a, b) => new Date(b.visitedAt).getTime() - new Date(a.visitedAt).getTime())
                          .map(v => (
                            <div key={v.id} className="text-sm text-gray-800 dark:text-gray-300">
                              <span className="font-medium">{v.name}</span>
                              {v.note ? ` – ${v.note}` : ""}
                              <span className="text-[11px] text-gray-600 dark:text-gray-400"> · {new Date(v.visitedAt).toLocaleString('pl-PL', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                          ))}
                        {(details.visits ?? []).length === 0 && (
                          <div className="text-sm text-gray-600 dark:text-gray-400">Brak odwiedzin</div>
                        )}
                      </div>
                      <div className="mt-2 space-y-2">
                        <input 
                          ref={visitNameRef}
                          className="w-full px-3 py-2 rounded-md bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 text-sm border border-gray-300 dark:border-gray-600" 
                          placeholder="Twoje imię" 
                          value={visitName} 
                          onChange={(e) => setVisitName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && visitName.trim()) {
                              addVisit(p.id, visitName.trim(), visitNote.trim() || undefined);
                              setVisitName("");
                              setVisitNote("");
                            }
                          }}
                        />
                        <textarea className="w-full px-3 py-2 rounded-md bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 text-sm border border-gray-300 dark:border-gray-600" placeholder="Notatka (opcjonalnie)" value={visitNote} onChange={(e) => setVisitNote(e.target.value)} />
                        <button className="w-full px-3 py-2 rounded-md bg-blue-600 text-white text-sm" onClick={() => { if (!visitName.trim()) { alert("Podaj imię"); return; } addVisit(p.id, visitName.trim(), visitNote.trim() || undefined); setVisitName(""); setVisitNote(""); }}>Dodaj</button>
                      </div>
                    </div>
                  )}
                </div>
              </Popup>
            </CircleMarker>
          );
        })}

        {/* Draft marker */}
        {draftPos && (
          <CircleMarker center={[draftPos.lat, draftPos.lng]} radius={8} pathOptions={{ color: category ? getCategoryColor(category) : "#22c55e", fillColor: category ? getCategoryColor(category) : "#22c55e", fillOpacity: 0.7 }}>
            <Popup minWidth={220} maxWidth={340}>
              <div className="space-y-2 w-[88vw] max-w-xs max-h-[65vh] overflow-y-auto bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 p-3 rounded-lg">
                <div className="text-sm text-gray-500 dark:text-gray-400">Nowa pinezka: {draftPos.lat.toFixed(5)}, {draftPos.lng.toFixed(5)}</div>
                <input 
                  className="w-full px-3 py-3 rounded-md bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 text-sm border border-gray-300 dark:border-gray-600" 
                  placeholder="Tytuł" 
                  value={title} 
                  onChange={(e) => setTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && title.trim() && category.trim()) {
                      savePin({ title: title.trim(), category: category.trim(), description: description.trim() || undefined });
                      clearDraft();
                    }
                  }}
                />
                <div>
                <select className="w-full px-3 py-3 rounded-md bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 text-sm border border-gray-300 dark:border-gray-600" value={category} onChange={(e) => {
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
                <textarea className="w-full px-3 py-3 rounded-md bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 text-sm border border-gray-300 dark:border-gray-600" placeholder="Opis (opcjonalnie)" value={description} onChange={(e) => setDescription(e.target.value)} />
                <div className="flex gap-2">
                  <button className="px-3 py-3 rounded-md bg-emerald-600 text-white text-sm" onClick={() => { if (!title.trim() || !category.trim()) { alert("Podaj tytuł i kategorię"); return; } savePin({ title: title.trim(), category: category.trim(), description: description.trim() || undefined }); clearDraft(); }}>Zapisz</button>
                  <button className="px-3 py-3 rounded-md bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm" onClick={() => { setDraftPos(null); clearDraft(); }}>Anuluj</button>
                </div>
              </div>
            </Popup>
          </CircleMarker>
        )}
      </MapContainer>

      {/* Modal tworzenia kategorii */}
      {catModalOpen && (
        <div className="fixed inset-0 z-[2000] flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4" onClick={() => setCatModalOpen(false)}>
          <div className="w-full sm:w-[420px] bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-t-2xl sm:rounded-2xl shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 space-y-3">
              <div className="text-sm font-semibold">Nowa kategoria</div>
              <input
                autoFocus
                className="w-full px-3 py-3 rounded-md bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 text-sm border border-gray-300 dark:border-gray-600"
                placeholder="Nazwa kategorii"
                value={catModalName}
                onChange={(e) => setCatModalName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && confirmCategoryModal()}
              />
              <div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">Wybierz kolor</div>
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
                <button className="px-3 py-2 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 text-sm flex-1" onClick={() => setCatModalOpen(false)}>Anuluj</button>
                <button className="px-3 py-2 rounded-md bg-blue-600 text-white text-sm flex-1" onClick={confirmCategoryModal}>Zapisz</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes slideDown {
          from {
            transform: translate(-50%, -100%);
            opacity: 0;
          }
          to {
            transform: translate(-50%, 0);
            opacity: 1;
          }
        }
        
        @keyframes pulse-subtle {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.7;
          }
        }
        
        .animate-pulse-subtle {
          animation: pulse-subtle 2s ease-in-out infinite;
        }

        /* Remove white background from Leaflet popups in dark mode */
        @media (prefers-color-scheme: dark) {
          .leaflet-popup-content-wrapper,
          .leaflet-popup-tip {
            background: rgb(31 41 55) !important;
            color: rgb(243 244 246) !important;
            box-shadow: 0 3px 14px rgba(0, 0, 0, 0.6) !important;
          }
          
          .leaflet-container a.leaflet-popup-close-button {
            color: rgb(156 163 175) !important;
          }
          
          .leaflet-container a.leaflet-popup-close-button:hover {
            color: rgb(243 244 246) !important;
          }
        }
        
        /* Always remove default padding from popup content */
        .leaflet-popup-content {
          margin: 0 !important;
          padding: 0 !important;
        }
      `}</style>
    </div>
  );
}

function ClickCatcher({ onClick }: { onClick: (e: any) => void }) {
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
