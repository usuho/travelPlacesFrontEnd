import { openDB } from 'idb';

const DB_NAME = 'travelPlacesMapGeoCache';
const STORE = 'allGeoSnapshots';
const TS_INDEX = 'ts';

let dbPromise = null;

function normalizeCountry(country) {
  return String(country || '').trim().toLowerCase();
}

async function getDb() {
  if (dbPromise) return dbPromise;
  dbPromise = openDB(DB_NAME, 1, {
    upgrade(db, _oldVersion, _newVersion, transaction) {
      let store;
      if (!db.objectStoreNames.contains(STORE)) {
        store = db.createObjectStore(STORE, { keyPath: 'country' });
      } else {
        store = transaction.objectStore(STORE);
      }
      if (!store.indexNames.contains(TS_INDEX)) {
        store.createIndex(TS_INDEX, 'ts');
      }
    },
  });
  return dbPromise;
}

export async function getAttractionsGeoSnapshot(country) {
  const c = normalizeCountry(country);
  if (!c || typeof window === 'undefined') return null;
  try {
    const db = await getDb();
    const entry = await db.get(STORE, c);
    if (!entry || !Array.isArray(entry.items) || !entry.items.length) return null;
    return entry;
  } catch (e) {
    return null;
  }
}

export async function putAttractionsGeoSnapshot(country, items, options = {}) {
  const c = normalizeCountry(country);
  if (!c || typeof window === 'undefined') return false;
  const ts = Number.isFinite(options.ts) ? options.ts : Date.now();
  const maxEntries = Number.isFinite(options.maxEntries) ? Math.max(0, Math.floor(options.maxEntries)) : 4;
  if (!Array.isArray(items) || !items.length) return false;

  try {
    const db = await getDb();
    await db.put(STORE, { country: c, ts, items });
    if (maxEntries > 0) {
      await pruneAttractionsGeoSnapshots(maxEntries);
    }
    return true;
  } catch (e) {
    return false;
  }
}

export async function pruneAttractionsGeoSnapshots(maxEntries = 4) {
  const max = Number.isFinite(maxEntries) ? Math.max(0, Math.floor(maxEntries)) : 0;
  if (!max || typeof window === 'undefined') return;
  try {
    const db = await getDb();
    let count = await db.count(STORE);
    if (!Number.isFinite(count) || count <= max) return;

    const tx = db.transaction(STORE, 'readwrite');
    const store = tx.store;
    const index = store.index(TS_INDEX);
    let cursor = await index.openKeyCursor();
    while (cursor && count > max) {
      await store.delete(cursor.primaryKey);
      count--;
      cursor = await cursor.continue();
    }
    await tx.done;
  } catch (_) {}
}

