// Simple in-memory cache with TTL for database queries
type CacheEntry<T> = {
  data: T;
  timestamp: number;
};

const cache = new Map<string, CacheEntry<any>>();

export function getCached<T>(key: string, ttlMs: number): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  
  const age = Date.now() - entry.timestamp;
  if (age > ttlMs) {
    cache.delete(key);
    return null;
  }
  
  return entry.data;
}

export function setCached<T>(key: string, data: T): void {
  cache.set(key, {
    data,
    timestamp: Date.now()
  });
  
  // Cleanup old entries if cache gets too large
  if (cache.size > 1000) {
    const now = Date.now();
    const toDelete: string[] = [];
    
    cache.forEach((entry, key) => {
      if (now - entry.timestamp > 60000) { // Remove entries older than 1 min
        toDelete.push(key);
      }
    });
    
    toDelete.forEach(key => cache.delete(key));
  }
}

export function clearCache(): void {
  cache.clear();
}

export function invalidateCachePrefix(prefix: string): void {
  const toDelete: string[] = [];
  cache.forEach((_, key) => {
    if (key.startsWith(prefix)) {
      toDelete.push(key);
    }
  });
  toDelete.forEach(key => cache.delete(key));
}
