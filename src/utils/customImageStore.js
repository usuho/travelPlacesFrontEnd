import { openDB } from 'idb';
import { getLastApiBase, withBackendApiKey } from './geoApi.js';
import { clearAuthSession, clearLocalStoragePreservingRememberPassword } from '../stores/auth.js';

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
    const isRemoteKey = typeof key === 'string' && key.includes('/');

    // 对于远程 key（带路径的标识），始终从网络拉取最新图片，避免 IndexedDB 中旧 Blob 造成“换图不生效”
    if (isRemoteKey) {
      const remoteBlob = await fetchRemoteImage(key);
      if (remoteBlob) {
        try { return URL.createObjectURL(remoteBlob); } catch (e) { return ''; }
      }
      return '';
    }

    // 对于本地派生 key（如 customId:slot），仍然使用 IndexedDB 做离线/加速缓存
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
    try { return URL.createObjectURL(blob); } catch (e) { return ''; }
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

export async function clearAllImages() {
  try {
    const d = await db();
    await d.clear(STORE);
  } catch (e) {}
}

function isLocalHost(host) {
  if (!host) return false;
  const h = host.toLowerCase();
  return (
    h === 'localhost' ||
    h === '127.0.0.1' ||
    h === '::1' ||
    h.startsWith('192.168.') ||
    h.startsWith('10.') ||
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(h)
  );
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
    if (typeof window !== 'undefined' && window.location && window.location.hostname) {
      const host = window.location.hostname || '';
      const origin = window.location.origin || '';
      if (isLocalHost(host)) {
        list.push(`http://${host}:3000`);
      }
      list.push('http://localhost:3000');
      list.push('http://127.0.0.1:3000');
      if (origin) list.push(origin);
    }
  } catch (e) {}
  list.push('https://juseaxerf.com');
  return Array.from(new Set(list.filter(Boolean).map(b => b.replace(/\/$/, ''))));
}

function redirectToLogin() {
  try {
    if (typeof window === 'undefined' || !window.location) return;
    const useHash = typeof window.location.hash === 'string' && window.location.hash.startsWith('#/');
    const target = useHash ? '#/login' : '/login';
    if (window.location.replace) window.location.replace(target);
    else window.location.href = target;
  } catch (e) {}
}

async function fetchRemoteImage(key) {
  if (!key) return null;
  const bases = apiBases();
  for (const base of bases) {
    try {
      const url = `${base}/api/user/custom-image?key=${encodeURIComponent(key)}&ts=${Date.now()}`;
      const resp = await fetch(url, { ...withBackendApiKey(), cache: 'no-store' });
      if (resp && resp.status === 401) {
        try { clearAuthSession(); } catch (e) {}
        try { clearLocalStoragePreservingRememberPassword(); } catch (e) {}
        try { sessionStorage.clear(); } catch (e) {}
        try { if (typeof caches !== 'undefined' && caches.keys) { caches.keys().then(keys => keys.forEach(k => caches.delete(k))); } } catch (e) {}
        redirectToLogin();
        return null;
      }
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
