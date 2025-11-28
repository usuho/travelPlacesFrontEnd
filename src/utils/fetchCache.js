import { openDB } from 'idb';

const DB_NAME = 'travelPlacesApiCache';
const STORE = 'responses';
const DEFAULT_TTL_MS = 1000 * 60 * 60 * 24; // refresh window for background updates
const MAX_ENTRY_BYTES = 5 * 1024 * 1024; // skip overly large payloads
const DEFAULT_HOSTS = [
  'juseaxerf.com',
  'travelplaces-80006ece4dd7.herokuapp.com',
  'localhost',
  '127.0.0.1',
];

let installed = false;

async function getDb() {
  return openDB(DB_NAME, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE);
      }
    },
  });
}

function normalizeUrl(url) {
  try {
    const u = new URL(url, window.location.origin);
    u.hash = '';
    return u.toString();
  } catch (e) {
    return String(url || '');
  }
}

function buildKey(req) {
  const method = (req.method || 'GET').toUpperCase();
  return `${method}:${normalizeUrl(req.url)}`;
}

async function saveEntry(key, entry) {
  const db = await getDb();
  await db.put(STORE, entry, key);
}

async function readEntry(key) {
  const db = await getDb();
  return db.get(STORE, key);
}

async function cleanupExpired(ttlMs) {
  if (!Number.isFinite(ttlMs) || ttlMs <= 0) return;
  try {
    const db = await getDb();
    const tx = db.transaction(STORE, 'readwrite');
    const store = tx.store;
    const threshold = Date.now() - ttlMs;
    let cursor = await store.openCursor();
    while (cursor) {
      if (cursor.value && cursor.value.ts && cursor.value.ts < threshold) {
        await cursor.delete();
      }
      cursor = await cursor.continue();
    }
    await tx.done;
  } catch (_) {}
}

function cloneBody(body) {
  if (!body) return undefined;
  if (body instanceof ArrayBuffer) return body.slice(0);
  if (ArrayBuffer.isView(body)) return body.buffer.slice(0);
  return body;
}

function responseFromEntry(entry, state) {
  const headers = new Headers(entry.headers || {});
  headers.set('x-cache-state', state);
  const body = cloneBody(entry.body);
  return new Response(body, { status: entry.status || 200, headers });
}

export function installFetchCache(options = {}) {
  if (installed || typeof window === 'undefined' || typeof fetch !== 'function') return;
  installed = true;

  const originalFetch = window.fetch.bind(window);
  const ttlMs = Number.isFinite(options.ttlMs) && options.ttlMs > 0 ? options.ttlMs : DEFAULT_TTL_MS;
  const maxEntryBytes = Number.isFinite(options.maxEntryBytes) && options.maxEntryBytes > 0 ? options.maxEntryBytes : MAX_ENTRY_BYTES;
  const backendHosts = Array.from(new Set([...(options.backendHosts || []), ...DEFAULT_HOSTS]));

  const shouldCacheRequest = (req) => {
    try {
      const url = new URL(req.url, window.location.origin);
      if (url.pathname.startsWith('/api/')) return true;
      return backendHosts.some(h => h && url.hostname === h);
    } catch (e) {
      return false;
    }
  };

  const refreshInBackground = (req, key) => {
    try {
      const r = req.clone();
      originalFetch(r).then(async resp => {
        if (!resp || !resp.ok) return;
        const clone = resp.clone();
        const body = await clone.arrayBuffer();
        if (body && body.byteLength <= maxEntryBytes) {
          const headers = {};
          clone.headers.forEach((v, k) => { headers[k] = v; });
          await saveEntry(key, { ts: Date.now(), status: clone.status, headers, body });
        }
      }).catch(() => {});
    } catch (_) {}
  };

  window.fetch = async (input, init = {}) => {
    const req = new Request(input, init);
    const method = (req.method || 'GET').toUpperCase();
    const cacheable = method === 'GET' && shouldCacheRequest(req);
    const key = cacheable ? buildKey(req) : null;

    if (cacheable && key) {
      const cached = await readEntry(key);
      if (cached) {
        const isFresh = !Number.isFinite(ttlMs) ? true : (Date.now() - (cached.ts || 0)) <= ttlMs;
        if (!isFresh) refreshInBackground(req, key);
        return responseFromEntry(cached, isFresh ? 'hit' : 'stale');
      }
    }

    try {
      const resp = await originalFetch(req);
      if (cacheable && resp && resp.ok && key) {
        const clone = resp.clone();
        const body = await clone.arrayBuffer();
        if (body && body.byteLength <= maxEntryBytes) {
          const headers = {};
          clone.headers.forEach((v, k) => { headers[k] = v; });
          await saveEntry(key, { ts: Date.now(), status: clone.status, headers, body });
          cleanupExpired(ttlMs);
        }
      }
      return resp;
    } catch (err) {
      if (cacheable && key) {
        const stale = await readEntry(key);
        if (stale) return responseFromEntry(stale, 'fallback');
      }
      throw err;
    }
  };

  cleanupExpired(ttlMs);
}
