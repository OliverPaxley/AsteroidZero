// src/services/nasa.js
const API = 'https://api.nasa.gov';
const KEY = import.meta.env.VITE_NASA_KEY || 'cymcV7cL6T24TchfTEhlE5xSjXOAvbmasVFNfNBI';

// converts a date to yyyy-mm-dd
const formatDate = (d) => d.toISOString().split('T')[0];

// Client-side request cap (per-server cap enforcement is recommended separately).
// We keep a persistent counter in localStorage to avoid accidental reloads exceeding the cap.
const MAX_REQUESTS = 1000;
const REQ_COUNTER_KEY = 'nasa_api_request_count_v1';
const getCounter = () => {
  try {
    const raw = localStorage.getItem(REQ_COUNTER_KEY);
    return raw ? Number(raw) || 0 : 0;
  } catch {
    return 0;
  }
};
const setCounter = (n) => {
  try { localStorage.setItem(REQ_COUNTER_KEY, String(n)); } catch { /* ignore */ }
};
const incrCounter = (by = 1) => {
  const cur = getCounter();
  const next = cur + by;
  setCounter(next);
  return next;
};

// Basic in-memory caches + localStorage backup for persisted caching
const inMemoryCache = {
  feed: new Map(), // key -> { ts, ttl, value }
  details: new Map(), // id -> { ts, ttl, value }
};

const DEFAULT_FEED_TTL_MS = 10 * 60 * 1000; // 10 minutes
const DEFAULT_DETAILS_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// Helpers
const nowTs = () => Date.now();
const isFresh = (entry) => entry && (nowTs() - entry.ts) < entry.ttl;

// Dedupe in-flight requests
const inFlight = new Map(); // key -> Promise

async function guardedFetch(url, opts) {
  // enforce client-side cap
  const current = getCounter();
  if (current >= MAX_REQUESTS) throw new Error('Client-side NASA API cap reached');

  // dedupe identical calls
  const dedupeKey = url + JSON.stringify(opts || {});
  if (inFlight.has(dedupeKey)) return inFlight.get(dedupeKey);

  const p = (async () => {
    const res = await fetch(url, opts);
    if (!res.ok) {
      if (res.status === 429) throw new Error(`NeoWs error 429: rate limit exceeded`);
      throw new Error(`NeoWs error ${res.status} ${res.statusText}`);
    }
    // count successful request toward the cap
    incrCounter(1);
    const data = await res.json();
    return data;
  })()
    .finally(() => { inFlight.delete(dedupeKey); });

  inFlight.set(dedupeKey, p);
  return p;
}

// fetch asteroid data from NASA NeoWs with caching and dedupe
export async function fetchNeoFeed({ start = new Date(), days = 1, ttl = DEFAULT_FEED_TTL_MS } = {}) {
  const end = new Date(start);
  end.setDate(end.getDate() + days);
  const key = `feed:${formatDate(start)}:${formatDate(end)}`;

  // check in-memory cache
  const cached = inMemoryCache.feed.get(key);
  if (isFresh(cached)) return cached.value;

  // try reading from localStorage to survive reloads
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.ts && ((nowTs() - parsed.ts) < ttl)) {
        inMemoryCache.feed.set(key, { ts: parsed.ts, ttl, value: parsed.value });
        return parsed.value;
      }
    }
  } catch {
    // ignore localStorage errors
  }

  const url = `${API}/neo/rest/v1/feed?start_date=${formatDate(start)}&end_date=${formatDate(end)}&api_key=${KEY}`;
  const data = await guardedFetch(url);

  // flatten + normalize
  const value = Object.values(data.near_earth_objects)
    .flat()
    .map((a) => {
      const d = a.estimated_diameter.meters;
      const v = a?.close_approach_data?.[0]?.relative_velocity?.kilometers_per_second;
      const relVel_kms = v ? parseFloat(v) : 0;
      return {
        id: a.id,
        name: a.name,
        diameter_m: (d.estimated_diameter_min + d.estimated_diameter_max) / 2,
        relVel_kms,
        close_approach_data: a.close_approach_data || [],
      };
    })
    .filter(x => x.relVel_kms > 0);

  const entry = { ts: nowTs(), ttl, value };
  inMemoryCache.feed.set(key, entry);
  try { localStorage.setItem(key, JSON.stringify(entry)); } catch { /* ignore */ }
  return value;
}

// fetch detailed NEO object by id (includes orbital_data and close_approach_data)
export async function fetchNeoDetails(id, { ttl = DEFAULT_DETAILS_TTL_MS } = {}) {
  if (!id) throw new Error('missing neo id');

  const cached = inMemoryCache.details.get(id);
  if (isFresh(cached)) return cached.value;

  // localStorage fallback
  try {
    const raw = localStorage.getItem(`neo:${id}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.ts && ((nowTs() - parsed.ts) < ttl)) {
        inMemoryCache.details.set(id, { ts: parsed.ts, ttl, value: parsed.value });
        return parsed.value;
      }
    }
  } catch { /* ignore */ }

  const url = `${API}/neo/rest/v1/neo/${encodeURIComponent(id)}?api_key=${KEY}`;
  const data = await guardedFetch(url);

  const entry = { ts: nowTs(), ttl, value: data };
  inMemoryCache.details.set(id, entry);
  try { localStorage.setItem(`neo:${id}`, JSON.stringify(entry)); } catch { /* ignore */ }
  return data;
}
