// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs/promises';
import { NextRequest } from 'next/server';

async function withFreshEnv() {
  vi.resetModules();

  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'crim-mapa-img-test-'));
  const dbPath = path.join(dir, 'data.sqlite');

  process.env.USE_SQLITE = 'true';
  process.env.SQLITE_PATH = dbPath;
  delete process.env.POSTGRES_URL;
  delete process.env.POSTGRES_PRISMA_URL;
  delete process.env.DB_PROVIDER;

  const store = await import('@/lib/store');
  const visitsRoute = await import('@/app/api/pins/[id]/visits/route');
  const pinsRoute = await import('@/app/api/pins/route');
  const pinByIdRoute = await import('@/app/api/pins/[id]/route');

  await store.ensureSchema();

  return { store, visitsRoute, pinsRoute, pinByIdRoute, dir };
}

describe('Visit images — store layer', () => {
  it('addVisit stores imageUrl and returns it', async () => {
    const { store } = await withFreshEnv();

    const pin = await store.createPin({
      title: 'Photo pin',
      lat: 54.5,
      lng: 18.5,
      category: 'Test',
    });

    const visit = await store.addVisit(pin.id, {
      name: 'Dawid',
      note: 'Zrobione',
      imageUrl: 'https://example.com/photo.webp',
    });

    expect(visit.imageUrl).toBe('https://example.com/photo.webp');
    expect(visit.name).toBe('Dawid');
    expect(visit.note).toBe('Zrobione');
    expect(visit.pinId).toBe(pin.id);
  });

  it('addVisit without imageUrl stores null', async () => {
    const { store } = await withFreshEnv();

    const pin = await store.createPin({
      title: 'No photo pin',
      lat: 54.5,
      lng: 18.5,
      category: 'Test',
    });

    const visit = await store.addVisit(pin.id, {
      name: 'Julia',
      note: 'ok',
    });

    expect(visit.imageUrl).toBeNull();
  });

  it('getPinWithVisits returns imageUrl in visits', async () => {
    const { store } = await withFreshEnv();

    const pin = await store.createPin({
      title: 'Visits pin',
      lat: 54.5,
      lng: 18.5,
      category: 'Test',
    });

    await store.addVisit(pin.id, {
      name: 'Mateusz',
      imageUrl: 'https://example.com/img1.webp',
    });

    await store.addVisit(pin.id, {
      name: 'Łukasz',
      note: 'bez zdjęcia',
    });

    const result = await store.getPinWithVisits(pin.id);
    expect(result).not.toBeNull();
    expect(result!.visits).toHaveLength(2);

    // Visits are ordered DESC by visited_at, so latest first
    const withImage = result!.visits.find(v => v.name === 'Mateusz');
    const withoutImage = result!.visits.find(v => v.name === 'Łukasz');

    expect(withImage?.imageUrl).toBe('https://example.com/img1.webp');
    expect(withoutImage?.imageUrl).toBeNull();
  });

  it('getAllPinsWithVisits returns imageUrl in visits', async () => {
    const { store } = await withFreshEnv();

    const pin = await store.createPin({
      title: 'All pins test',
      lat: 54.5,
      lng: 18.5,
      category: 'Test',
    });

    await store.addVisit(pin.id, {
      name: 'Dawid',
      imageUrl: 'https://example.com/visit-photo.webp',
    });

    const allPins = await store.getAllPinsWithVisits();
    expect(allPins).toHaveLength(1);
    expect(allPins[0].visits).toHaveLength(1);
    expect(allPins[0].visits[0].imageUrl).toBe('https://example.com/visit-photo.webp');
  });
});

describe('Visit images — API layer', () => {
  it('POST /api/pins/:id/visits accepts imageUrl', async () => {
    const { store, visitsRoute } = await withFreshEnv();

    const pin = await store.createPin({
      title: 'API photo test',
      lat: 54.5,
      lng: 18.5,
      category: 'Test',
    });

    const req = new NextRequest(`http://localhost/api/pins/${pin.id}/visits`, {
      method: 'POST',
      body: JSON.stringify({
        name: 'Dawid',
        note: 'API visit with photo',
        imageUrl: 'https://example.com/api-photo.webp',
      }),
      headers: { 'content-type': 'application/json' },
    });

    const res = await visitsRoute.POST(req, { params: { id: String(pin.id) } });
    expect(res.status).toBe(200);

    const visit = await res.json();
    expect(visit.imageUrl).toBe('https://example.com/api-photo.webp');
    expect(visit.name).toBe('Dawid');
  });

  it('POST /api/pins/:id/visits works without imageUrl', async () => {
    const { store, visitsRoute } = await withFreshEnv();

    const pin = await store.createPin({
      title: 'API no photo test',
      lat: 54.5,
      lng: 18.5,
      category: 'Test',
    });

    const req = new NextRequest(`http://localhost/api/pins/${pin.id}/visits`, {
      method: 'POST',
      body: JSON.stringify({ name: 'Julia', note: 'without photo' }),
      headers: { 'content-type': 'application/json' },
    });

    const res = await visitsRoute.POST(req, { params: { id: String(pin.id) } });
    expect(res.status).toBe(200);

    const visit = await res.json();
    expect(visit.imageUrl).toBeNull();
  });

  it('POST /api/pins/:id/visits returns 404 for non-existent pin', async () => {
    const { visitsRoute } = await withFreshEnv();

    const req = new NextRequest('http://localhost/api/pins/99999/visits', {
      method: 'POST',
      body: JSON.stringify({ name: 'Test', imageUrl: 'https://example.com/x.webp' }),
      headers: { 'content-type': 'application/json' },
    });

    const res = await visitsRoute.POST(req, { params: { id: '99999' } });
    expect(res.status).toBe(404);
  });

  it('GET /api/pins/:id returns visits with imageUrl', async () => {
    const { store, pinByIdRoute } = await withFreshEnv();

    const pin = await store.createPin({
      title: 'GET visits image test',
      lat: 54.5,
      lng: 18.5,
      category: 'Test',
    });

    await store.addVisit(pin.id, {
      name: 'Mateusz',
      imageUrl: 'https://example.com/get-photo.webp',
    });

    const req = new NextRequest(`http://localhost/api/pins/${pin.id}`);
    const res = await pinByIdRoute.GET(req, { params: { id: String(pin.id) } });
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.visits).toHaveLength(1);
    expect(data.visits[0].imageUrl).toBe('https://example.com/get-photo.webp');
  });

  it('POST /api/pins/:id/visits rejects missing name even with imageUrl', async () => {
    const { store, visitsRoute } = await withFreshEnv();

    const pin = await store.createPin({
      title: 'Validation test',
      lat: 54.5,
      lng: 18.5,
      category: 'Test',
    });

    const req = new NextRequest(`http://localhost/api/pins/${pin.id}/visits`, {
      method: 'POST',
      body: JSON.stringify({ imageUrl: 'https://example.com/no-name.webp' }),
      headers: { 'content-type': 'application/json' },
    });

    const res = await visitsRoute.POST(req, { params: { id: String(pin.id) } });
    expect(res.status).toBe(400);
  });
});

describe('Image upload module', () => {
  it('exports compressImage, uploadImage, uploadImageFile and deleteUploadedUrl', async () => {
    const mod = await import('@/lib/imageUpload');
    expect(typeof mod.compressImage).toBe('function');
    expect(typeof mod.uploadImage).toBe('function');
    expect(typeof mod.uploadImageFile).toBe('function');
    expect(typeof mod.deleteUploadedUrl).toBe('function');
  });
});

describe('Local upload API', () => {
  it('POST /api/uploads rejects requests without auth', async () => {
    vi.resetModules();
    // Mock cookies to return no session
    vi.doMock('next/headers', () => ({
      cookies: () => ({
        get: () => undefined,
      }),
    }));

    const uploadsRoute = await import('@/app/api/uploads/route');

    const formData = new FormData();
    formData.append('file', new Blob(['fake image'], { type: 'image/jpeg' }), 'test.jpg');

    const req = new NextRequest('http://localhost/api/uploads', {
      method: 'POST',
      body: formData,
    });

    const res = await uploadsRoute.POST(req);
    expect(res.status).toBe(401);
  });

  it('POST /api/uploads rejects non-image files', async () => {
    vi.resetModules();
    vi.doMock('next/headers', () => ({
      cookies: () => ({
        get: () => ({ value: '{"userId":1}' }),
      }),
    }));

    const uploadsRoute = await import('@/app/api/uploads/route');

    const formData = new FormData();
    formData.append('file', new Blob(['not an image'], { type: 'text/plain' }), 'test.txt');

    const req = new NextRequest('http://localhost/api/uploads', {
      method: 'POST',
      body: formData,
    });

    const res = await uploadsRoute.POST(req);
    expect(res.status).toBe(400);
  });

  it('POST /api/uploads saves image and returns url', async () => {
    vi.resetModules();
    vi.doMock('next/headers', () => ({
      cookies: () => ({
        get: () => ({ value: '{"userId":1}' }),
      }),
    }));

    const uploadsRoute = await import('@/app/api/uploads/route');

    // Create a small valid image-like blob
    const fakeJpeg = new Uint8Array([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10]);
    const formData = new FormData();
    formData.append('file', new Blob([fakeJpeg], { type: 'image/jpeg' }), 'photo.jpg');

    const req = new NextRequest('http://localhost/api/uploads', {
      method: 'POST',
      body: formData,
    });

    const res = await uploadsRoute.POST(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.url).toMatch(/^\/api\/uploads\/visits\//);
    expect(data.url).toContain('.jpg');
  });

  it('GET /api/uploads/[...path] serves uploaded file', async () => {
    vi.resetModules();
    vi.doMock('next/headers', () => ({
      cookies: () => ({
        get: () => ({ value: '{"userId":1}' }),
      }),
    }));

    const uploadsRoute = await import('@/app/api/uploads/route');
    const serveRoute = await import('@/app/api/uploads/[...path]/route');

    // Upload first
    const fakeJpeg = new Uint8Array([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10]);
    const formData = new FormData();
    formData.append('file', new Blob([fakeJpeg], { type: 'image/jpeg' }), 'serve-test.jpg');

    const uploadReq = new NextRequest('http://localhost/api/uploads', {
      method: 'POST',
      body: formData,
    });

    const uploadRes = await uploadsRoute.POST(uploadReq);
    const { url } = await uploadRes.json();

    // Extract path segments from url: /api/uploads/visits/xxx.jpg -> ['visits', 'xxx.jpg']
    const pathSegments = url.replace('/api/uploads/', '').split('/');

    const serveReq = new NextRequest(`http://localhost${url}`);
    const serveRes = await serveRoute.GET(serveReq, { params: { path: pathSegments } });

    expect(serveRes.status).toBe(200);
    expect(serveRes.headers.get('content-type')).toBe('image/jpeg');
    expect(serveRes.headers.get('cache-control')).toContain('max-age=31536000');
  });

  it('GET /api/uploads/[...path] blocks path traversal', async () => {
    vi.resetModules();
    const serveRoute = await import('@/app/api/uploads/[...path]/route');

    const req = new NextRequest('http://localhost/api/uploads/../../../etc/passwd');
    const res = await serveRoute.GET(req, { params: { path: ['..', '..', '..', 'etc', 'passwd'] } });

    expect(res.status).toBe(403);
  });

  it('GET /api/uploads/[...path] returns 404 for missing file', async () => {
    vi.resetModules();
    const serveRoute = await import('@/app/api/uploads/[...path]/route');

    const req = new NextRequest('http://localhost/api/uploads/visits/nonexistent.jpg');
    const res = await serveRoute.GET(req, { params: { path: ['visits', 'nonexistent.jpg'] } });

    expect(res.status).toBe(404);
  });
});
