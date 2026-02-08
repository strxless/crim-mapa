"use client";

import dynamic from "next/dynamic";
import { useCallback, useMemo, useState, useEffect, useRef } from "react";
import useSWR, { mutate } from "swr";
import type { Pin, Visit } from "@/types";
import { uploadImage } from "@/lib/imageUpload";
import "leaflet/dist/leaflet.css";

// Dynamically import react-leaflet components (client-only)
const MapContainer = dynamic(() => import("react-leaflet").then(m => m.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import("react-leaflet").then(m => m.TileLayer), { ssr: false });
const CircleMarker = dynamic(() => import("react-leaflet").then(m => m.CircleMarker), { ssr: false });
const Popup = dynamic(() => import("react-leaflet").then(m => m.Popup), { ssr: false });
const ZoomControl = dynamic(() => import("react-leaflet").then(m => m.ZoomControl), { ssr: false });
const Tooltip = dynamic(() => import("react-leaflet").then(m => m.Tooltip), { ssr: false });

const fetcher = async (url: string) => {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
};

const DEFAULT_PALETTE = [
  "#22c55e", "#3b82f6", "#ef4444", "#eab308", "#a855f7", "#06b6d4",
  "#f97316", "#84cc16", "#ec4899", "#8b5cf6", "#14b8a6", "#f59e0b",
  "#10b981", "#6366f1", "#f43f5e", "#d946ef",
] as const;

function hashColor(input: string): string {
  let h = 0;
  for (let i = 0; i < input.length; i++) h = (h * 31 + input.charCodeAt(i)) >>> 0;
  return DEFAULT_PALETTE[h % DEFAULT_PALETTE.length];
}

// Get relative time in Polish
function getRelativeTime(date: string): string {
  const now = new Date().getTime();
  const then = new Date(date).getTime();
  const diffMs = now - then;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Teraz";
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays === 1) return "Wczoraj";
  if (diffDays < 7) return `${diffDays} dni`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} tyg`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} mies`;
  return `${Math.floor(diffDays / 365)} lat`;
}

function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[2000] bg-[var(--success)] text-white px-4 py-3 rounded shadow-lg animate-[slideDown_0.3s_ease-out]">
      {message}
    </div>
  );
}

function DeleteConfirmModal({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/70 p-4" onClick={onCancel}>
      <div className="bg-[var(--bg-secondary)] text-[var(--text-primary)] rounded-lg shadow-2xl p-6 max-w-sm w-full border border-[var(--border-primary)]" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-semibold mb-2">Usunąć pinezkę?</h3>
        <p className="text-sm text-[var(--text-secondary)] mb-4">Tej operacji nie można cofnąć.</p>
        <div className="flex gap-2">
          <button className="flex-1 px-4 py-2 rounded bg-[var(--bg-tertiary)] text-[var(--text-primary)] border border-[var(--border-secondary)] hover:bg-[var(--bg-elevated)] transition-colors" onClick={onCancel}>
            Anuluj
          </button>
          <button className="flex-1 px-4 py-2 rounded bg-[var(--danger)] text-white font-medium hover:bg-[var(--danger-hover)] transition-colors" onClick={onConfirm}>
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
  const [showPatrolModal, setShowPatrolModal] = useState<number | null>(null);
  const [selectedPatrolId, setSelectedPatrolId] = useState<number | null>(null);
  const mapRef = useRef<any>(null);

  const { data: pins } = useSWR<Pin[]>(
    `/api/pins${filter ? `?category=${encodeURIComponent(filter)}` : ""}`, 
    fetcher, 
    { 
      refreshInterval: 10000,
      revalidateOnFocus: true,
      dedupingInterval: 2000,
      revalidateOnReconnect: true
    }
  );

  const categories = useMemo(() => {
    const set = new Set<string>();
    (pins ?? []).forEach(p => set.add(p.category));
    return Array.from(set).sort();
  }, [pins]);
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

  const { data: cats } = useSWR<{ name: string; color: string }[]>(
    `/api/categories`, 
    fetcher, 
    { 
      refreshInterval: 60000,  // Reduced from 10s to 60s - categories rarely change
      revalidateOnFocus: false,
      dedupingInterval: 30000
    }
  );

  const { data: patrolPlansData } = useSWR<{plans: Array<{id: number; name: string; date: string}>, pins?: any[]}>(
    '/api/patrol-plans',
    fetcher,
    { revalidateOnFocus: false }
  );

  const patrolPlans = patrolPlansData?.plans || [];

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

  const addPinToPatrol = useCallback(async (pinId: number, patrolPlanId: number) => {
    try {
      // Get current pins in this patrol plan to determine sortOrder
      const existingRes = await fetch(`/api/patrol-plans?id=${patrolPlanId}`);
      if (!existingRes.ok) throw new Error('Failed to fetch patrol plan');
      const existingData = await existingRes.json();
      const existingPins = existingData.pins || [];
      
      // Check if pin already exists in this patrol
      const duplicate = existingPins.find((p: any) => p.pinId === pinId);
      if (duplicate) {
        alert('Ten pin jest już na tej liście patrolu');
        return;
      }
      
      const sortOrder = existingPins.length;
      
      const res = await fetch(`/api/patrol-plans/${patrolPlanId}/pins`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pinId, sortOrder })
      });
      if (!res.ok) {
        const error = await res.text();
        throw new Error(error);
      }
      setToast("Dodano do patrolu");
      setShowPatrolModal(null);
      setSelectedPatrolId(null);
    } catch (err) {
      const errorMsg = (err as Error).message;
      if (errorMsg.includes('already exists') || errorMsg.includes('UNIQUE constraint')) {
        alert('Ten pin jest już na tej liście patrolu');
      } else {
        alert(errorMsg);
      }
    }
  }, []);

  const [details, setDetails] = useState<{ pin?: Pin; visits?: Visit[] } | null>(null);
  const fetchPinDetails = useCallback(async (id: number) => {
    const res = await fetch(`/api/pins/${id}`, { cache: "no-store" });
    if (res.ok) setDetails(await res.json());
  }, []);

  const addVisit = useCallback(async (pinId: number, name: string, note?: string, imageFile?: File | null) => {
    let imageUrl: string | undefined;
    if (imageFile) {
      setVisitImageUploading(true);
      try {
        imageUrl = await uploadImage(imageFile);
      } catch (e) {
        setVisitImageUploading(false);
        alert("Nie udalo sie przeslac zdjecia");
        return;
      }
      setVisitImageUploading(false);
    }
    const res = await fetch(`/api/pins/${pinId}/visits`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, note, imageUrl })
    });
    if (!res.ok) {
      alert("Nie udalo sie dodac aktualizacji");
    } else {
      setToast("Zaktualizowano");
    }
    setVisitImageFile(null);
    setVisitImagePreview(null);
    await fetchPinDetails(pinId);
    mutate((key) => typeof key === "string" && key.startsWith("/api/pins"));
  }, [fetchPinDetails]);

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");

  const [visitName, setVisitName] = useState("");
  const [visitNote, setVisitNote] = useState("");
  const [visitImageFile, setVisitImageFile] = useState<File | null>(null);
  const [visitImagePreview, setVisitImagePreview] = useState<string | null>(null);
  const [visitImageUploading, setVisitImageUploading] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const visitNameRef = useRef<HTMLInputElement>(null);
  const visitFileRef = useRef<HTMLInputElement>(null);

  const clearDraft = () => {
    setTitle("");
    setCategory("");
    setDescription("");
  };

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

  useEffect(() => {
    if (details?.pin?.id && visitNameRef.current) {
      setTimeout(() => visitNameRef.current?.focus(), 100);
    }
  }, [details?.pin?.id]);

  const isNewPin = useCallback((pin: Pin) => {
    const now = new Date().getTime();
    const created = new Date(pin.createdAt).getTime();
    return now - created < 24 * 60 * 60 * 1000;
  }, []);

  return (
    <div className="relative w-full h-full">
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}

      {deleteModalPinId && (
        <DeleteConfirmModal
          onConfirm={() => deletePin(deleteModalPinId)}
          onCancel={() => setDeleteModalPinId(null)}
        />
      )}

      {lightboxUrl && (
        <div
          className="fixed inset-0 z-[3000] flex items-center justify-center bg-black/90 p-4 touch-manipulation"
          onClick={() => setLightboxUrl(null)}
        >
          <button
            className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center rounded-full bg-white/20 text-white text-xl font-bold hover:bg-white/30 active:scale-90 transition-all touch-manipulation z-10"
            onClick={() => setLightboxUrl(null)}
          >
            ✕
          </button>
          <img
            src={lightboxUrl}
            alt="Zdjęcie powiększone"
            className="max-w-full max-h-full object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      <div className="absolute z-[1000] left-2 right-2 top-2 flex gap-2 items-center">
        <div className="flex-1 flex gap-2 bg-[var(--bg-secondary)]/95 border border-[var(--border-primary)] rounded-lg p-2 backdrop-blur shadow-lg">
          <select
            className="flex-1 px-3 py-3 bg-[var(--bg-tertiary)] text-[var(--text-primary)] rounded border border-[var(--border-secondary)] text-sm focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-transparent"
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
              className="px-3 py-3 bg-[var(--bg-elevated)] hover:bg-[var(--bg-tertiary)] text-[var(--text-primary)] rounded border border-[var(--border-secondary)] text-sm font-medium whitespace-nowrap transition-colors"
            >
              Wyczyść
            </button>
          )}
          <button
            onClick={() => setAddMode(v => !v)}
            className={`px-3 py-3 rounded text-sm font-medium border whitespace-nowrap transition-colors ${addMode ? "bg-[var(--success)] border-[var(--success)] text-white hover:bg-[var(--success-hover)]" : "bg-[var(--bg-elevated)] text-[var(--text-primary)] border-[var(--border-secondary)] hover:bg-[var(--bg-tertiary)]"}`}
          >
            {addMode ? "Dotknij mapy" : "+ Dodaj"}
          </button>
        </div>
      </div>

      <MapContainer center={[54.5189, 18.5305]} zoom={12} zoomControl={false} className="w-full h-full" scrollWheelZoom ref={mapRef}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://www.thunderforest.com/">Thunderforest</a>'
          url={`https://{s}.tile.thunderforest.com/transport/{z}/{x}/{y}.png?apikey=${process.env.NEXT_PUBLIC_THUNDERFOREST_API_KEY}`}
          maxZoom={22}
        />
        <ClickCatcher onClick={onMapClick} />
        <ZoomControl position="bottomright" />

        {(pins ?? []).map((p) => {
          const isNew = isNewPin(p);
          const relTime = getRelativeTime(p.updatedAt);
          
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
                  setVisitImageFile(null);
                  if (visitImagePreview) URL.revokeObjectURL(visitImagePreview);
                  setVisitImagePreview(null);
                } 
              }}
            >
              <Tooltip 
                permanent 
                direction="top" 
                offset={[0, -12]}
                className="pin-label-tooltip"
              >
                <div className="flex flex-col items-center gap-0.5">
                  <div className="text-[10px] font-semibold whitespace-nowrap bg-gray-900/90 dark:bg-gray-800/90 text-white px-1.5 py-0.5 rounded">
                    {relTime}
                  </div>
                  {isNew && (
                    <div className="text-[9px] font-bold whitespace-nowrap bg-emerald-600 text-white px-1.5 py-0.5 rounded animate-pulse-subtle">
                      NOWA
                    </div>
                  )}
                </div>
              </Tooltip>
              
              <Popup minWidth={280} maxWidth={380} closeButton={true}>
                <div className="space-y-2 sm:space-y-3 w-[92vw] sm:w-auto max-w-sm max-h-[70vh] overflow-y-auto bg-[var(--bg-secondary)] text-[var(--text-primary)] p-3 sm:p-4 rounded-lg">
                  {!editing ? (
                    <>
                      <div className="flex items-start justify-between gap-2 sm:gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="text-sm sm:text-base font-bold mb-1 break-words">{p.title}</div>
                          <div className="text-[10px] sm:text-xs text-[var(--text-muted)] flex items-center gap-1.5 flex-wrap">
                            <span className="inline-flex items-center gap-1">
                              <span className="inline-block h-2 w-2 sm:h-2.5 sm:w-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: getCategoryColor(p.category) }}></span>
                              <span className="truncate max-w-[100px] sm:max-w-[120px]">{p.category}</span>
                            </span>
                            <span>·</span>
                            <span className="truncate">{new Date(p.updatedAt).toLocaleString('pl-PL', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                        </div>
                        <div className="text-[10px] sm:text-xs text-[var(--text-muted)] whitespace-nowrap bg-[var(--bg-elevated)] px-1.5 sm:px-2 py-1 rounded flex-shrink-0">
                          {p.visitsCount ?? 0} wizyt
                        </div>
                      </div>
                      {p.description && <p className="text-xs sm:text-sm leading-relaxed text-[var(--text-secondary)] whitespace-pre-wrap break-words">{p.description}</p>}
                      <div className="grid grid-cols-2 gap-2">
                        <button 
                          className="px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg bg-[var(--danger)] text-white text-xs sm:text-sm font-medium hover:bg-[var(--danger-hover)] active:scale-95 transition-all touch-manipulation" 
                          onClick={() => setDeleteModalPinId(p.id)}
                        >
                          Usuń
                        </button>
                        <button 
                          className="px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg bg-[var(--bg-elevated)] text-[var(--text-primary)] text-xs sm:text-sm font-medium border border-[var(--border-secondary)] hover:bg-[var(--bg-tertiary)] active:scale-95 transition-all touch-manipulation" 
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditing(true);
                          }}
                        >
                          Edytuj
                        </button>
                      </div>
                      <button 
                        className="w-full px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg bg-[var(--accent-primary)] text-white text-xs sm:text-sm font-medium hover:bg-[var(--accent-hover)] active:scale-[0.98] transition-all shadow-sm touch-manipulation"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowPatrolModal(showPatrolModal === p.id ? null : p.id);
                        }}
                      >
                        {showPatrolModal === p.id ? '✕ Zamknij' : '+ Dodaj na patrol'}
                      </button>
                      {showPatrolModal === p.id && (
                        <div className="mt-2 p-2.5 sm:p-3 bg-[var(--bg-tertiary)] rounded-lg border border-[var(--border-secondary)] space-y-2">
                          <div className="text-xs sm:text-sm font-semibold text-[var(--text-primary)] mb-2">Wybierz patrol:</div>
                          {patrolPlans && patrolPlans.length > 0 ? (
                            <div className="space-y-1.5 sm:space-y-2 max-h-[160px] sm:max-h-[180px] overflow-y-auto pr-1">
                              {patrolPlans.map(plan => (
                                <button
                                  key={plan.id}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    addPinToPatrol(p.id, plan.id);
                                  }}
                                  className="w-full text-left px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg bg-[var(--bg-elevated)] text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] border border-[var(--border-secondary)] active:scale-[0.98] transition-all touch-manipulation"
                                >
                                  <div className="font-semibold text-xs sm:text-sm mb-0.5">{plan.name}</div>
                                  <div className="text-[10px] sm:text-xs text-[var(--text-muted)]">{new Date(plan.date).toLocaleDateString('pl-PL')}</div>
                                </button>
                              ))}
                            </div>
                          ) : (
                            <div className="text-xs sm:text-sm text-[var(--text-muted)] py-2">
                              Brak planów patrolu. Utwórz nowy w zakładce Streetwork.
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      <div className="text-xs sm:text-sm font-semibold text-[var(--text-primary)] mb-2">Edytuj pinezkę</div>
                      <input 
                        className="w-full px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg bg-[var(--bg-tertiary)] text-[var(--text-primary)] placeholder-[var(--text-muted)] text-sm sm:text-base border border-[var(--border-secondary)] focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-transparent touch-manipulation" 
                        value={selected?.title ?? ""} 
                        onChange={(e) => setSelected(sel => sel ? { ...sel, title: e.target.value } : sel)} 
                        placeholder="Tytuł" 
                      />
                      <div>
                        <select 
                          className="w-full px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg bg-[var(--bg-tertiary)] text-[var(--text-primary)] text-sm sm:text-base border border-[var(--border-secondary)] focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-transparent touch-manipulation" 
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
                        rows={3}
                        className="w-full px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg bg-[var(--bg-tertiary)] text-[var(--text-primary)] placeholder-[var(--text-muted)] text-sm sm:text-base border border-[var(--border-secondary)] focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-transparent touch-manipulation resize-none" 
                        value={selected?.description ?? ""} 
                        onChange={(e) => setSelected(sel => sel ? { ...sel, description: e.target.value } : sel)} 
                        placeholder="Opis" 
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <button 
                          className="px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg bg-[var(--success)] text-white text-xs sm:text-sm font-medium hover:bg-[var(--success-hover)] active:scale-95 transition-all touch-manipulation" 
                          onClick={() => selected && updatePin(selected)}
                        >
                          Zapisz
                        </button>
                        <button 
                          className="px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg bg-[var(--bg-elevated)] text-[var(--text-primary)] text-xs sm:text-sm font-medium border border-[var(--border-secondary)] hover:bg-[var(--bg-tertiary)] active:scale-95 transition-all touch-manipulation" 
                          onClick={() => setEditing(false)}
                        >
                          Anuluj
                        </button>
                      </div>
                    </>
                  )}

                  {details?.pin?.id === p.id && (
                    <div className="pt-2 sm:pt-3 border-t-2 border-[var(--border-secondary)] mt-2 sm:mt-3">
                      <div className="text-[10px] sm:text-xs font-semibold text-[var(--text-secondary)] mb-2 uppercase tracking-wide">Historia odwiedzin</div>
                      <div className="max-h-[100px] sm:max-h-[120px] overflow-y-auto space-y-1.5 sm:space-y-2 pr-1 -mr-1">
                        {(details.visits ?? [])
                          .sort((a, b) => new Date(b.visitedAt).getTime() - new Date(a.visitedAt).getTime())
                          .map(v => (
                            <div key={v.id} className="text-xs sm:text-sm text-[var(--text-primary)] leading-relaxed bg-[var(--bg-elevated)] p-1.5 sm:p-2 rounded">
                              <span className="font-semibold">{v.name}</span>
                              {v.note ? <span className="text-[var(--text-secondary)]"> – {v.note}</span> : ""}
                              {v.imageUrl && (
                                <button
                                  type="button"
                                  className="mt-1 block rounded overflow-hidden border border-[var(--border-secondary)] active:opacity-80 transition-opacity touch-manipulation"
                                  onClick={(e) => { e.stopPropagation(); setLightboxUrl(v.imageUrl!); }}
                                >
                                  <img
                                    src={v.imageUrl}
                                    alt="Zdjęcie z wizyty"
                                    loading="lazy"
                                    className="w-full max-w-[160px] h-auto max-h-[100px] object-cover rounded"
                                  />
                                </button>
                              )}
                              <div className="text-[10px] sm:text-xs text-[var(--text-muted)] mt-0.5">{new Date(v.visitedAt).toLocaleString('pl-PL', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}</div>
                            </div>
                          ))}
                        {(details.visits ?? []).length === 0 && (
                          <div className="text-xs sm:text-sm text-[var(--text-muted)] py-2">Brak odwiedzin</div>
                        )}
                      </div>
                      <div className="mt-3 sm:mt-4 space-y-2 sm:space-y-2.5">
                        <div className="text-[10px] sm:text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">Dodaj aktualizację</div>
                        <div className="space-y-2">
                          <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
                            {['Dawid', 'Julia', 'Mateusz', 'Łukasz'].map(name => (
                              <button
                                key={name}
                                type="button"
                                onClick={() => {
                                  const currentNames = visitName.split(',').map(n => n.trim()).filter(Boolean);
                                  if (currentNames.includes(name)) {
                                    const filtered = currentNames.filter(n => n !== name);
                                    setVisitName(filtered.join(', '));
                                  } else {
                                    setVisitName([...currentNames, name].join(', '));
                                  }
                                }}
                                className={`px-2 sm:px-3 py-2 sm:py-2.5 rounded-lg font-semibold transition-all text-xs sm:text-sm touch-manipulation active:scale-95 ${
                                  visitName.split(',').map(n => n.trim()).includes(name)
                                    ? 'bg-[var(--accent-primary)] text-white shadow-md'
                                    : 'bg-[var(--bg-elevated)] text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] border border-[var(--border-secondary)]'
                                }`}
                              >
                                {name}
                              </button>
                            ))}
                          </div>
                          <input
                            ref={visitNameRef}
                            type="text"
                            value={visitName}
                            onChange={(e) => setVisitName(e.target.value)}
                            className="w-full px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg bg-[var(--bg-tertiary)] text-[var(--text-primary)] placeholder-[var(--text-muted)] text-sm sm:text-base border border-[var(--border-secondary)] focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-transparent touch-manipulation"
                            placeholder="Kto odwiedził?"
                          />
                          <textarea
                            value={visitNote}
                            onChange={(e) => setVisitNote(e.target.value)}
                            className="w-full px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg bg-[var(--bg-tertiary)] text-[var(--text-primary)] placeholder-[var(--text-muted)] text-sm sm:text-base border border-[var(--border-secondary)] focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-transparent touch-manipulation resize-none"
                            placeholder="Notatka (opcjonalnie)"
                            rows={2}
                          />
                          {/* Image picker */}
                          <input
                            ref={visitFileRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                setVisitImageFile(file);
                                const url = URL.createObjectURL(file);
                                setVisitImagePreview(url);
                              }
                              e.target.value = '';
                            }}
                          />
                          {visitImagePreview ? (
                            <div className="relative inline-block">
                              <img
                                src={visitImagePreview}
                                alt="Podglad"
                                className="w-full max-h-[120px] object-cover rounded-lg border border-[var(--border-secondary)]"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  setVisitImageFile(null);
                                  if (visitImagePreview) URL.revokeObjectURL(visitImagePreview);
                                  setVisitImagePreview(null);
                                }}
                                className="absolute top-1 right-1 w-6 h-6 flex items-center justify-center rounded-full bg-black/60 text-white text-xs font-bold hover:bg-black/80 active:scale-90 transition-all touch-manipulation"
                              >
                                x
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => visitFileRef.current?.click()}
                              className="w-full px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg bg-[var(--bg-elevated)] text-[var(--text-primary)] text-xs sm:text-sm font-medium border border-[var(--border-secondary)] hover:bg-[var(--bg-tertiary)] active:scale-95 transition-all touch-manipulation"
                            >
                              Dodaj zdjecie
                            </button>
                          )}
                          <button
                            disabled={visitImageUploading}
                            className={`w-full px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg text-white text-xs sm:text-sm font-semibold active:scale-[0.98] transition-all shadow-sm touch-manipulation ${
                              visitImageUploading
                                ? 'bg-[var(--accent-primary)]/60 cursor-wait'
                                : 'bg-[var(--accent-primary)] hover:bg-[var(--accent-hover)]'
                            }`}
                            onClick={() => {
                              if (!visitName.trim()) {
                                alert("Podaj imię");
                                return;
                              }
                              addVisit(p.id, visitName.trim(), visitNote.trim() || undefined, visitImageFile);
                              setVisitName("");
                              setVisitNote("");
                            }}
                          >
                            {visitImageUploading ? 'Przesyłanie zdjęcia...' : 'Dodaj aktualizację'}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </Popup>
            </CircleMarker>
          );
        })}

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

        /* Tooltip styles for labels */
        .pin-label-tooltip.leaflet-tooltip {
          background: transparent !important;
          border: none !important;
          box-shadow: none !important;
          padding: 0 !important;
          margin: 0 !important;
          pointer-events: none !important;
        }
        
        .pin-label-tooltip.leaflet-tooltip::before {
          display: none !important;
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
  const Inner = dynamic(async () => {
    const { useMapEvents } = await import("react-leaflet");
    return function C() {
      useMapEvents({ click: onClick });
      return null;
    };
  }, { ssr: false });
  return <Inner />;
}
