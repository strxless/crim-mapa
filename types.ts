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
  visitedAt: string;
};
