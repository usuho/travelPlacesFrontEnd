import { openDB } from 'idb';
import { getLastApiBase, withBackendApiKey } from './geoApi.js';

const DB_NAME = 'customAttractionsDB';
const STORE = 'images';

async function db() {
  return openDB(DB_NAME, 1, {
    upgrade(database) {
      if (!database.objectStoreNames.contains(STORE)) {
        database.createObjectStore(STORE);
      }
    }
  });
}

async function dataUrlToBlob(dataUrl) {
  try {
    // 快速将 dataURL 转为 Blob（更省空间）
    const res = await fetch(dataUrl);
    return await res.blob();
  } catch (e) {
    return null;
  }
}

export async function setImage(key, dataUrl) {
  try {
    const d = await db();
    const blob = await dataUrlToBlob(dataUrl);
    if (!blob) return false;
    await d.put(STORE, blob, key);
    return true;
  } catch (e) {
    return false;
  }
}

export async function getImageUrl(key) {
  try {
    const d = await db();
    const blob = await d.get(STORE, key);
    if (!blob) {
      const remoteKey = deriveRemoteKey(key);
      const remoteBlob = await fetchRemoteImage(remoteKey);
      if (remoteBlob) {
        try { await d.put(STORE, remoteBlob, key); } catch (e) {}
        try { return URL.createObjectURL(remoteBlob); } catch (e) { return ''; }
      }
      return '';
    }
    try {
      return URL.createObjectURL(blob);
    } catch (e) {
      return '';
    }
  } catch (e) {
    return '';
  }
}

export async function deleteImagesForId(id) {
  try {
    const d = await db();
    const keys = [`${id}:main`, `${id}:sec0`, `${id}:sec1`];
    await Promise.all(keys.map(k => d.delete(STORE, k)));
  } catch (e) {}
}

// 删除单个图片键（例如仅删除 main 或某个次图）
export async function deleteImage(key) {
  try {
    const d = await db();
    await d.delete(STORE, key);
  } catch (e) {}
}

function apiBases() {
  const list = [];
  const last = getLastApiBase();
  if (last) list.push(last);
  try {
    if (import.meta && import.meta.env && import.meta.env.VITE_API_BASE) {
      list.push(String(import.meta.env.VITE_API_BASE));
    }
  } catch (e) {}
  try {
    if (typeof window !== 'undefined' && window.location && window.location.origin) {
      list.push(window.location.origin);
    }
  } catch (e) {}
  list.push('https://juseaxerf.com');
  list.push('http://localhost:3000');
  list.push('http://127.0.0.1:3000');
  return Array.from(new Set(list.filter(Boolean).map(b => b.replace(/\/$/, ''))));
}

async function fetchRemoteImage(key) {
  if (!key) return null;
  const bases = apiBases();
  for (const base of bases) {
    try {
      const url = `${base}/api/user/custom-image?key=${encodeURIComponent(key)}`;
      const resp = await fetch(url, withBackendApiKey());
      if (resp && resp.ok) {
        return await resp.blob();
      }
    } catch (e) {}
  }
  return null;
}

function deriveRemoteKey(key) {
  if (!key || key.includes('/')) return key;
  try {
    const [id, slotRaw] = String(key).split(':');
    if (!id || !slotRaw) return key;
    const raw = localStorage.getItem('customAttractions');
    const list = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(list)) return key;
    const found = list.find(a => String(a.id) === String(id));
    if (!found || !found.images) return key;
    const secondary = Array.isArray(found.images.secondary) ? found.images.secondary : [];
    if (slotRaw === 'main' && found.images.main) return found.images.main;
    if (slotRaw === 'sec0' && secondary[0]) return secondary[0];
    if (slotRaw === 'sec1' && secondary[1]) return secondary[1];
  } catch (e) {}
  return key;
}
