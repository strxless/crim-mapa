import { describe, it, expect, beforeAll } from 'vitest';
import { ensureSchema, createPin, addVisit, listPins } from '@/lib/store';
import { getCached, setCached, clearCache } from '@/lib/cache';

describe('Scalability Optimizations', () => {
  beforeAll(async () => {
    await ensureSchema();
    clearCache();
  });

  describe('Denormalized visits_count with Triggers', () => {
    it('should automatically update visits_count when adding a visit', async () => {
      // Create a test pin
      const pin = await createPin({
        title: 'Test Pin for Triggers',
        lat: 50.0,
        lng: 20.0,
        category: 'test-trigger',
      });

      // Initial visits_count should be 0
      let pins = await listPins('test-trigger');
      let testPin = pins.find(p => p.id === pin.id);
      expect(testPin?.visitsCount).toBe(0);

      // Add a visit
      await addVisit(pin.id, { name: 'Test User 1' });

      // visits_count should automatically update to 1
      clearCache(); // Clear cache to force database query
      pins = await listPins('test-trigger');
      testPin = pins.find(p => p.id === pin.id);
      expect(testPin?.visitsCount).toBe(1);

      // Add another visit
      await addVisit(pin.id, { name: 'Test User 2' });

      // visits_count should be 2
      clearCache();
      pins = await listPins('test-trigger');
      testPin = pins.find(p => p.id === pin.id);
      expect(testPin?.visitsCount).toBe(2);
    });

    it('should handle multiple concurrent visits correctly', async () => {
      const pin = await createPin({
        title: 'Concurrent Test Pin',
        lat: 51.0,
        lng: 21.0,
        category: 'test-concurrent',
      });

      // Add 5 visits concurrently
      await Promise.all([
        addVisit(pin.id, { name: 'User 1' }),
        addVisit(pin.id, { name: 'User 2' }),
        addVisit(pin.id, { name: 'User 3' }),
        addVisit(pin.id, { name: 'User 4' }),
        addVisit(pin.id, { name: 'User 5' }),
      ]);

      clearCache();
      const pins = await listPins('test-concurrent');
      const testPin = pins.find(p => p.id === pin.id);
      expect(testPin?.visitsCount).toBe(5);
    });
  });

  describe('In-Memory Cache', () => {
    it('should cache data and return from cache on subsequent calls', () => {
      const testData = { foo: 'bar', count: 42 };
      const cacheKey = 'test:cache:key';

      // Cache should be empty initially
      expect(getCached(cacheKey, 5000)).toBeNull();

      // Set cache
      setCached(cacheKey, testData);

      // Should retrieve from cache
      const cached = getCached(cacheKey, 5000);
      expect(cached).toEqual(testData);
    });

    it('should expire cache after TTL', async () => {
      const testData = { value: 'expires' };
      const cacheKey = 'test:cache:expires';

      setCached(cacheKey, testData);
      
      // Should be available immediately
      expect(getCached(cacheKey, 100)).toEqual(testData);

      // Wait for expiration (TTL = 100ms)
      await new Promise(resolve => setTimeout(resolve, 150));

      // Should be expired
      expect(getCached(cacheKey, 100)).toBeNull();
    });

    it('should clear all cache entries', () => {
      setCached('test:1', { a: 1 });
      setCached('test:2', { b: 2 });
      setCached('test:3', { c: 3 });

      clearCache();

      expect(getCached('test:1', 5000)).toBeNull();
      expect(getCached('test:2', 5000)).toBeNull();
      expect(getCached('test:3', 5000)).toBeNull();
    });

    it('should invalidate cache on write operations', async () => {
      // First query should hit database and cache result
      const pins1 = await listPins();
      const count1 = pins1.length;

      // Second query should return cached result (same count)
      const pins2 = await listPins();
      expect(pins2.length).toBe(count1);

      // Create new pin (invalidates cache)
      await createPin({
        title: 'Cache Invalidation Test',
        lat: 52.0,
        lng: 22.0,
        category: 'test-invalidation',
      });

      // Third query should hit database with new data
      const pins3 = await listPins();
      expect(pins3.length).toBeGreaterThan(count1);
    });
  });

  describe('Query Performance at Scale', () => {
    it('should list pins efficiently even with many visits', async () => {
      // Create a pin with multiple visits
      const pin = await createPin({
        title: 'Heavy Pin',
        lat: 53.0,
        lng: 23.0,
        category: 'test-heavy',
      });

      // Add 20 visits
      for (let i = 0; i < 20; i++) {
        await addVisit(pin.id, { name: `User ${i}` });
      }

      clearCache();
      const startTime = Date.now();
      const pins = await listPins('test-heavy');
      const duration = Date.now() - startTime;

      const testPin = pins.find(p => p.id === pin.id);
      expect(testPin?.visitsCount).toBe(20);
      
      // Should complete quickly even with denormalized count
      expect(duration).toBeLessThan(500);
    });

    it('should handle category filtering efficiently', async () => {
      // Create pins in different categories
      await Promise.all([
        createPin({ title: 'Cat A Pin 1', lat: 54.0, lng: 24.0, category: 'category-a' }),
        createPin({ title: 'Cat A Pin 2', lat: 54.1, lng: 24.1, category: 'category-a' }),
        createPin({ title: 'Cat B Pin 1', lat: 54.2, lng: 24.2, category: 'category-b' }),
        createPin({ title: 'Cat B Pin 2', lat: 54.3, lng: 24.3, category: 'category-b' }),
      ]);

      clearCache();
      const startTime = Date.now();
      const categoryAPins = await listPins('category-a');
      const duration = Date.now() - startTime;

      expect(categoryAPins.length).toBeGreaterThanOrEqual(2);
      expect(categoryAPins.every(p => p.category === 'category-a')).toBe(true);
      expect(duration).toBeLessThan(500);
    });
  });

  describe('Concurrent Request Handling', () => {
    it('should handle many concurrent read operations', async () => {
      const startTime = Date.now();

      // Simulate 20 concurrent users fetching pins
      const requests = Array.from({ length: 20 }, () => listPins());
      const results = await Promise.all(requests);

      const duration = Date.now() - startTime;

      // All should return data
      results.forEach(pins => {
        expect(Array.isArray(pins)).toBe(true);
        expect(pins.length).toBeGreaterThan(0);
      });

      // Should leverage cache for subsequent requests
      // With cache, 20 requests should complete quickly
      expect(duration).toBeLessThan(5000);
    });

    it('should handle concurrent write and read operations', async () => {
      const pin = await createPin({
        title: 'Concurrent R/W Test',
        lat: 55.0,
        lng: 25.0,
        category: 'test-rw',
      });

      // Mix of reads and writes
      const operations = [
        addVisit(pin.id, { name: 'Writer 1' }),
        listPins('test-rw'),
        addVisit(pin.id, { name: 'Writer 2' }),
        listPins('test-rw'),
        addVisit(pin.id, { name: 'Writer 3' }),
        listPins('test-rw'),
      ];

      await expect(Promise.all(operations)).resolves.toBeDefined();
    });
  });
});
