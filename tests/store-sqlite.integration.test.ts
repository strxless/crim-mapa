// @vitest-environment node
import { describe, expect, it, beforeEach, vi } from 'vitest';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs/promises';

async function withFreshStore() {
  vi.resetModules();

  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'crim-mapa-test-'));
  const dbPath = path.join(dir, 'data.sqlite');

  process.env.USE_SQLITE = 'true';
  process.env.SQLITE_PATH = dbPath;
  delete process.env.POSTGRES_URL;
  delete process.env.POSTGRES_PRISMA_URL;
  delete process.env.DB_PROVIDER;

  const store = await import('@/lib/store');
  return { store, dbPath, dir };
}

describe('lib/store (SQLite)', () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  it('creates and lists pins', async () => {
    const { store } = await withFreshStore();

    await store.ensureSchema();

    const created = await store.createPin({
      title: 'Test pin',
      description: 'desc',
      lat: 54.5,
      lng: 18.5,
      category: 'Test',
    });

    expect(created.id).toBeTypeOf('number');
    expect(created.title).toBe('Test pin');

    const pins = await store.listPins();
    expect(pins).toHaveLength(1);
    expect(pins[0].category).toBe('Test');
  });

  it('adds a visit and returns pin with visits', async () => {
    const { store } = await withFreshStore();
    await store.ensureSchema();

    const pin = await store.createPin({
      title: 'Pin',
      lat: 1,
      lng: 2,
      category: 'Cat',
    });

    const visit = await store.addVisit(pin.id, { name: 'Dawid', note: 'ok' });
    expect(visit.pinId).toBe(pin.id);

    const result = await store.getPinWithVisits(pin.id);
    expect(result).not.toBeNull();
    expect(result!.pin.id).toBe(pin.id);
    expect(result!.visits).toHaveLength(1);
    expect(result!.visits[0].name).toBe('Dawid');
  });

  it('returns conflict on update when expectedUpdatedAt mismatches', async () => {
    const { store } = await withFreshStore();
    await store.ensureSchema();

    const pin = await store.createPin({
      title: 'Pin',
      lat: 1,
      lng: 2,
      category: 'Cat',
    });

    const conflict = await store.updatePin(pin.id, {
      title: 'New',
      category: 'Cat',
      expectedUpdatedAt: '2000-01-01T00:00:00Z',
    });

    expect((conflict as any).conflict).toBe(true);
    expect((conflict as any).serverUpdatedAt).toBeTruthy();
  });
});
