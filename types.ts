export type Pin = {
  id: number;
  title: string;
  description: string | null;
  lat: number;
  lng: number;
  category: string;
  createdAt: string;
  updatedAt: string;
  version: number;
  visitsCount?: number;
};

export type Visit = {
  id: number;
  pinId: number;
  name: string;
  note: string | null;
  imageUrl?: string | null;
  visitedAt: string;
};

export type PatrolPlan = {
  id: number;
  name: string;
  date: string;
  createdAt: string;
  updatedAt: string;
};

export type PatrolPlanPin = {
  id: number;
  patrolPlanId: number;
  pinId: number;
  sortOrder: number;
  pin?: Pin;
};
