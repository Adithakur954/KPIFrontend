export const ANALYTICS_CACHE_TTL_MS = 60000;
let revision = 0;

export function analyticsCacheScope() {
  if (typeof window === 'undefined') return `server:${revision}`;
  try {
    return JSON.stringify([window.localStorage.getItem('authToken'), window.localStorage.getItem('user'), revision]);
  } catch { return `unavailable:${revision}`; }
}

export function invalidateAnalyticsCache() {
  revision++;
  if (typeof window !== 'undefined') window.dispatchEvent(new Event('analytics:invalidate'));
}

/** Entry-count bound and expiry; pending requests deliberately use separate maps. */
export class BoundedAnalyticsCache extends Map {
  constructor(limit = 2, ttl = ANALYTICS_CACHE_TTL_MS, now = Date.now) {
    super(); this.limit = limit; this.ttl = ttl; this.now = now; this.expiry = new Map();
  }
  has(key) {
    if (!super.has(key)) return false;
    if (this.now() >= this.expiry.get(key)) { this.delete(key); return false; }
    return true;
  }
  get(key) {
    if (!this.has(key)) return undefined;
    const value = super.get(key);
    super.delete(key); super.set(key, value);
    return value;
  }
  set(key, value) {
    super.delete(key); super.set(key, value); this.expiry.set(key, this.now() + this.ttl);
    while (super.size > this.limit) this.delete(super.keys().next().value);
    return this;
  }
  delete(key) { this.expiry.delete(key); return super.delete(key); }
  clear() { this.expiry.clear(); super.clear(); }
}
