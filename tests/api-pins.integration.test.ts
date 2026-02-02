// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs/promises';
import { NextRequest } from 'next/server';

async function withFreshApi() {
  vi.resetModules();

  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'crim-mapa-api-test-'));
  const dbPath = path.join(dir, 'data.sqlite');

  process.env.USE_SQLITE = 'true';
  process.env.SQLITE_PATH = dbPath;
  delete process.env.POSTGRES_URL;
  delete process.env.POSTGRES_PRISMA_URL;
  delete process.env.DB_PROVIDER;

  const pinsRoute = await import('@/app/api/pins/route');
  const pinByIdRoute = await import('@/app/api/pins/[id]/route');

  return { pinsRoute, pinByIdRoute };
}

describe('api/pins', () => {
  it('POST validates missing fields', async () => {
    const { pinsRoute } = await withFreshApi();

    const req = new NextRequest('http://localhost/api/pins', {
      method: 'POST',
      body: JSON.stringify({ title: 'x' }),
      headers: { 'content-type': 'application/json' },
    });

    const res = await pinsRoute.POST(req);
    expect(res.status).toBe(400);
  });

  it('POST creates pin and GET returns it', async () => {
    const { pinsRoute } = await withFreshApi();

    const createReq = new NextRequest('http://localhost/api/pins', {
      method: 'POST',
      body: JSON.stringify({
        title: 'Hello',
        description: 'd',
        lat: 1,
        lng: 2,
        category: 'Test',
      }),
      headers: { 'content-type': 'application/json' },
    });

    const createdRes = await pinsRoute.POST(createReq);
    expect(createdRes.status).toBe(200);
    const created = await createdRes.json();
    expect(created.title).toBe('Hello');

    const getReq = new NextRequest('http://localhost/api/pins');
    const listRes = await pinsRoute.GET(getReq);
    const pins = await listRes.json();
    expect(pins).toHaveLength(1);
    expect(pins[0].category).toBe('Test');

    const filteredReq = new NextRequest('http://localhost/api/pins?category=Test');
    const filteredRes = await pinsRoute.GET(filteredReq);
    const filteredPins = await filteredRes.json();
    expect(filteredPins).toHaveLength(1);
  });
});

describe('api/pins/[id]', () => {
  it('GET returns 404 for missing pin', async () => {
    const { pinByIdRoute } = await withFreshApi();

    const req = new NextRequest('http://localhost/api/pins/999');
    const res = await pinByIdRoute.GET(req, { params: { id: '999' } });
    expect(res.status).toBe(404);
  });

  it('PUT returns 409 on optimistic concurrency conflict', async () => {
    const { pinsRoute, pinByIdRoute } = await withFreshApi();

    const createReq = new NextRequest('http://localhost/api/pins', {
      method: 'POST',
      body: JSON.stringify({ title: 'Hello', lat: 1, lng: 2, category: 'Test' }),
      headers: { 'content-type': 'application/json' },
    });
    const created = await (await pinsRoute.POST(createReq)).json();

    const putReq = new NextRequest(`http://localhost/api/pins/${created.id}`, {
      method: 'PUT',
      body: JSON.stringify({
        title: 'Changed',
        category: 'Test',
        expectedUpdatedAt: '2000-01-01T00:00:00Z',
      }),
      headers: { 'content-type': 'application/json' },
    });

    const res = await pinByIdRoute.PUT(putReq, { params: { id: String(created.id) } });
    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.error).toBe('Conflict');
  });
});
