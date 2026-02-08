'use client';

import { useState, useEffect, useMemo } from 'react';

type Pin = {
  id: number;
  title: string;
  description: string | null;
  lat: number;
  lng: number;
  category: string;
  visitsCount?: number;
};

type PatrolPlan = {
  id: number;
  name: string;
  date: string;
  createdAt: string;
  updatedAt: string;
};

type PatrolPlanPin = {
  id: number;
  patrolPlanId: number;
  pinId: number;
  sortOrder: number;
  pin: Pin;
};

// Haversine formula to calculate distance between two coordinates (in km)
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Nearest neighbor algorithm for route optimization
function optimizeRoute(pins: PatrolPlanPin[]): PatrolPlanPin[] {
  if (pins.length <= 1) return pins;

  const optimized: PatrolPlanPin[] = [];
  const remaining = [...pins];

  // Start with the first pin
  let current = remaining.shift()!;
  optimized.push(current);

  // Find nearest neighbor iteratively
  while (remaining.length > 0) {
    let nearestIndex = 0;
    let minDistance = Infinity;

    for (let i = 0; i < remaining.length; i++) {
      const distance = calculateDistance(
        current.pin.lat,
        current.pin.lng,
        remaining[i].pin.lat,
        remaining[i].pin.lng
      );
      if (distance < minDistance) {
        minDistance = distance;
        nearestIndex = i;
      }
    }

    current = remaining.splice(nearestIndex, 1)[0];
    optimized.push(current);
  }

  return optimized;
}

export default function PatrolPlanManager() {
  const [plans, setPlans] = useState<PatrolPlan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<PatrolPlan | null>(null);
  const [planPins, setPlanPins] = useState<PatrolPlanPin[]>([]);
  const [allPins, setAllPins] = useState<Pin[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // New plan form
  const [showNewPlanForm, setShowNewPlanForm] = useState(false);
  const [newPlanName, setNewPlanName] = useState('');
  const [newPlanDate, setNewPlanDate] = useState('');
  
  // Pin search/autocomplete
  const [searchQuery, setSearchQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  // Edit plan name
  const [editingPlanId, setEditingPlanId] = useState<number | null>(null);
  const [editingPlanName, setEditingPlanName] = useState('');

  // Load plans and pins on mount
  useEffect(() => {
    loadPlans();
    loadAllPins();
  }, []);

  // Load plan pins when a plan is selected
  useEffect(() => {
    if (selectedPlan) {
      loadPlanPins(selectedPlan.id);
    } else {
      setPlanPins([]);
    }
  }, [selectedPlan]);

  const loadPlans = async () => {
    try {
      const res = await fetch('/api/patrol-plans');
      const data = await res.json();
      setPlans(data.plans || []);
    } catch (error) {
      console.error('Error loading plans:', error);
    }
  };

  const loadAllPins = async () => {
    try {
      const res = await fetch('/api/streetwork?pins=true');
      const data = await res.json();
      setAllPins(data.pins || []);
    } catch (error) {
      console.error('Error loading pins:', error);
    }
  };

  const loadPlanPins = async (planId: number) => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/patrol-plans/${planId}`);
      const data = await res.json();
      setPlanPins(data.pins || []);
    } catch (error) {
      console.error('Error loading plan pins:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const createNewPlan = async () => {
    if (!newPlanName.trim() || !newPlanDate) return;

    try {
      setIsSaving(true);
      const res = await fetch('/api/patrol-plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newPlanName, date: newPlanDate }),
      });
      const newPlan = await res.json();
      setPlans([newPlan, ...plans]);
      setSelectedPlan(newPlan);
      setNewPlanName('');
      setNewPlanDate('');
      setShowNewPlanForm(false);
    } catch (error) {
      console.error('Error creating plan:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const deletePlan = async (planId: number) => {
    if (!confirm('Czy na pewno chcesz usunąć ten plan patrolu?')) return;

    try {
      await fetch(`/api/patrol-plans/${planId}`, { method: 'DELETE' });
      setPlans(plans.filter(p => p.id !== planId));
      if (selectedPlan?.id === planId) {
        setSelectedPlan(null);
      }
    } catch (error) {
      console.error('Error deleting plan:', error);
    }
  };

  const updatePlanName = async (planId: number, newName: string) => {
    if (!newName.trim()) {
      setEditingPlanId(null);
      return;
    }

    try {
      const plan = plans.find(p => p.id === planId);
      if (!plan) return;

      const res = await fetch(`/api/patrol-plans/${planId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName, date: plan.date }),
      });
      const updatedPlan = await res.json();
      
      setPlans(plans.map(p => p.id === planId ? updatedPlan : p));
      if (selectedPlan?.id === planId) {
        setSelectedPlan(updatedPlan);
      }
      setEditingPlanId(null);
    } catch (error) {
      console.error('Error updating plan name:', error);
    }
  };

  const addPinToPlan = async (pin: Pin) => {
    if (!selectedPlan) return;

    try {
      const sortOrder = planPins.length;
      const res = await fetch(`/api/patrol-plans/${selectedPlan.id}/pins`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pinId: pin.id, sortOrder }),
      });
      const newPlanPin = await res.json();
      setPlanPins([...planPins, { ...newPlanPin, pin }]);
      setSearchQuery('');
      setShowSuggestions(false);
    } catch (error) {
      console.error('Error adding pin to plan:', error);
    }
  };

  const removePinFromPlan = async (planPinId: number) => {
    if (!selectedPlan) return;

    try {
      await fetch(`/api/patrol-plans/${selectedPlan.id}/pins?pinLinkId=${planPinId}`, {
        method: 'DELETE',
      });
      setPlanPins(planPins.filter(pp => pp.id !== planPinId));
    } catch (error) {
      console.error('Error removing pin from plan:', error);
    }
  };

  const optimizePlanRoute = async () => {
    if (!selectedPlan || planPins.length <= 1) return;

    try {
      setIsSaving(true);
      const optimized = optimizeRoute(planPins);
      
      // Update sort orders
      const updates = optimized.map((pp, index) => ({
        id: pp.id,
        sortOrder: index,
      }));

      await fetch(`/api/patrol-plans/${selectedPlan.id}/pins`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates }),
      });

      setPlanPins(optimized.map((pp, index) => ({ ...pp, sortOrder: index })));
    } catch (error) {
      console.error('Error optimizing route:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // Filter pins based on search query (excluding already added pins)
  const filteredPins = useMemo(() => {
    if (!searchQuery.trim()) return [];
    
    const addedPinIds = new Set(planPins.map(pp => pp.pinId));
    const query = searchQuery.toLowerCase();
    
    return allPins
      .filter(pin => !addedPinIds.has(pin.id))
      .filter(pin => 
        pin.title.toLowerCase().includes(query) ||
        pin.category.toLowerCase().includes(query) ||
        pin.description?.toLowerCase().includes(query)
      )
      .slice(0, 10); // Limit to 10 suggestions
  }, [searchQuery, allPins, planPins]);

  const totalDistance = useMemo(() => {
    if (planPins.length < 2) return 0;
    
    let total = 0;
    for (let i = 0; i < planPins.length - 1; i++) {
      total += calculateDistance(
        planPins[i].pin.lat,
        planPins[i].pin.lng,
        planPins[i + 1].pin.lat,
        planPins[i + 1].pin.lng
      );
    }
    return total;
  }, [planPins]);

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)]">Plan Patrolu</h1>
        <button
          onClick={() => setShowNewPlanForm(true)}
          className="px-4 py-2 bg-[var(--accent-primary)] text-white rounded hover:bg-[var(--accent-hover)] transition-colors flex items-center gap-2 text-sm font-medium"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nowy Plan
        </button>
      </div>

      {/* New Plan Form Modal */}
      {showNewPlanForm && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--bg-secondary)] rounded-lg p-6 max-w-md w-full shadow-2xl border border-[var(--border-primary)]">
            <h2 className="text-xl font-bold mb-4 text-[var(--text-primary)]">Nowy Plan Patrolu</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                  Nazwa planu
                </label>
                <input
                  type="text"
                  value={newPlanName}
                  onChange={(e) => setNewPlanName(e.target.value)}
                  placeholder="np. Patrol Poniedziałkowy"
                  className="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-secondary)] rounded text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                  Data
                </label>
                <input
                  type="date"
                  value={newPlanDate}
                  onChange={(e) => setNewPlanDate(e.target.value)}
                  className="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-secondary)] rounded text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-transparent"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setShowNewPlanForm(false);
                    setNewPlanName('');
                    setNewPlanDate('');
                  }}
                  className="flex-1 px-4 py-2 bg-[var(--bg-tertiary)] text-[var(--text-primary)] rounded hover:bg-[var(--bg-elevated)] transition-colors"
                >
                  Anuluj
                </button>
                <button
                  onClick={createNewPlan}
                  disabled={!newPlanName.trim() || !newPlanDate || isSaving}
                  className="flex-1 px-4 py-2 bg-[var(--accent-primary)] text-white rounded hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSaving ? 'Tworzenie...' : 'Utwórz'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Plans List */}
      <div className="bg-[var(--bg-secondary)] rounded-lg shadow-lg p-6 border border-[var(--border-primary)]">
        <h2 className="text-lg font-semibold mb-4 text-[var(--text-primary)]">Plany Patroli</h2>
        {plans.length === 0 ? (
          <p className="text-[var(--text-muted)] text-center py-8">
            Brak planów patroli. Stwórz pierwszy plan.
          </p>
        ) : (
          <div className="space-y-2">
            {plans.map(plan => (
              <div
                key={plan.id}
                className={`p-4 rounded border-2 cursor-pointer transition-all ${
                  selectedPlan?.id === plan.id
                    ? 'border-[var(--accent-primary)] bg-[var(--bg-tertiary)]'
                    : 'border-[var(--border-secondary)] hover:border-[var(--accent-light)] bg-[var(--bg-secondary)]'
                }`}
                onClick={() => setSelectedPlan(plan)}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    {editingPlanId === plan.id ? (
                      <input
                        type="text"
                        value={editingPlanName}
                        onChange={(e) => setEditingPlanName(e.target.value)}
                        onBlur={() => updatePlanName(plan.id, editingPlanName)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') updatePlanName(plan.id, editingPlanName);
                          if (e.key === 'Escape') setEditingPlanId(null);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        autoFocus
                        className="w-full px-2 py-1 bg-[var(--bg-elevated)] border border-[var(--accent-primary)] rounded text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] text-sm font-semibold"
                      />
                    ) : (
                      <h3 className="font-semibold text-[var(--text-primary)] truncate">{plan.name}</h3>
                    )}
                    <p className="text-xs sm:text-sm text-[var(--text-secondary)]">
                      {new Date(plan.date).toLocaleDateString('pl-PL')}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingPlanId(plan.id);
                        setEditingPlanName(plan.name);
                      }}
                      className="p-1.5 sm:p-2 text-[var(--text-secondary)] hover:text-[var(--accent-primary)] hover:bg-[var(--bg-tertiary)] rounded transition-colors"
                      title="Zmień nazwę"
                    >
                      <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deletePlan(plan.id);
                      }}
                      className="p-1.5 sm:p-2 text-[var(--danger)] hover:bg-[var(--bg-tertiary)] rounded transition-colors"
                      title="Usuń plan"
                    >
                      <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Selected Plan Details */}
      {selectedPlan && (
        <div className="bg-[var(--bg-secondary)] rounded-lg shadow-lg p-6 space-y-4 border border-[var(--border-primary)]">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">
              {selectedPlan.name}
            </h2>
            {planPins.length > 1 && (
              <button
                onClick={optimizePlanRoute}
                disabled={isSaving}
                className="px-4 py-2 bg-[var(--success)] text-white rounded hover:bg-[var(--success-hover)] transition-colors disabled:opacity-50 flex items-center gap-2 text-sm font-medium"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                {isSaving ? 'Optymalizacja...' : 'Optymalizuj Trasę'}
              </button>
            )}
          </div>

          {/* Add Pin Section */}
          <div className="relative">
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
              Dodaj pin do planu
            </label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              placeholder="Zacznij wpisywać nazwę pinu..."
              className="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-secondary)] rounded text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-transparent"
            />
            
            {/* Autocomplete Suggestions */}
            {showSuggestions && filteredPins.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-[var(--bg-elevated)] border border-[var(--border-secondary)] rounded shadow-lg max-h-60 overflow-y-auto">
                {filteredPins.map(pin => (
                  <button
                    key={pin.id}
                    onClick={() => addPinToPlan(pin)}
                    className="w-full text-left px-4 py-3 hover:bg-[var(--bg-tertiary)] transition-colors border-b border-[var(--border-primary)] last:border-b-0"
                  >
                    <div className="font-medium text-[var(--text-primary)]">{pin.title}</div>
                    <div className="text-xs text-[var(--text-secondary)] mt-1">
                      <span className="inline-block px-2 py-0.5 bg-[var(--bg-tertiary)] rounded">
                        {pin.category}
                      </span>
                      {pin.visitsCount !== undefined && pin.visitsCount > 0 && (
                        <span className="ml-2">{pin.visitsCount} wizyt</span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Plan Pins List */}
          {isLoading ? (
            <div className="text-center py-8 text-[var(--text-muted)]">Ładowanie...</div>
          ) : planPins.length === 0 ? (
            <div className="text-center py-8 text-[var(--text-muted)]">
              Brak pinów w tym planie. Dodaj piny używając wyszukiwarki powyżej.
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between text-sm text-[var(--text-secondary)] mb-2">
                <span>Liczba pinów: <strong>{planPins.length}</strong></span>
                {totalDistance > 0 && (
                  <span>Całkowita trasa: <strong>{totalDistance.toFixed(2)} km</strong></span>
                )}
              </div>
              <div className="space-y-2">
                {planPins.map((planPin, index) => (
                  <div
                    key={planPin.id}
                    className="flex items-center gap-3 p-3 bg-[var(--bg-tertiary)] rounded border border-[var(--border-secondary)]"
                  >
                    <div className="flex-shrink-0 w-8 h-8 bg-[var(--accent-primary)] text-white rounded flex items-center justify-center font-bold text-sm">
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-[var(--text-primary)] truncate">
                        {planPin.pin.title}
                      </h4>
                      <p className="text-xs text-[var(--text-secondary)]">
                        {planPin.pin.category}
                        {index < planPins.length - 1 && (
                          <span className="ml-2">
                            → {calculateDistance(
                              planPin.pin.lat,
                              planPin.pin.lng,
                              planPins[index + 1].pin.lat,
                              planPins[index + 1].pin.lng
                            ).toFixed(2)} km
                          </span>
                        )}
                      </p>
                    </div>
                    <button
                      onClick={() => removePinFromPlan(planPin.id)}
                      className="flex-shrink-0 p-2 text-[var(--danger)] hover:bg-[var(--bg-elevated)] rounded transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
