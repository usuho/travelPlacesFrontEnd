import { reactive } from 'vue';
import { buildAuthHeaders, getAuthUser, isAuthenticated, clearAuthSession } from './auth.js';
import { withBackendApiKey, getLastApiBase } from '../utils/geoApi.js';
import { clearAllImages } from '../utils/customImageStore.js';

const syncState = reactive({
  status: 'idle', // idle | syncing | ok | error
  error: '',
  lastSyncedAt: null,
  username: ''
});

let hydrated = false;
let pendingTimer = null;
let inflight = null;

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

function handleUnauthorized() {
  try { clearAuthSession(); } catch (e) {}
  try { resetUserDataSync(); } catch (e) {}
  try { localStorage.clear(); } catch (e) {}
  try { sessionStorage.clear(); } catch (e) {}
  try { clearAllImages(); } catch (e) {}
  try { if (typeof caches !== 'undefined' && caches.keys) { caches.keys().then(keys => keys.forEach(k => caches.delete(k))); } } catch (e) {}
  try { window.location && window.location.replace && window.location.replace('/login'); } catch (e) {}
}

async function fetchWithFallback(path, options) {
  const bases = apiBases();
  let lastError = null;
  const opts = withBackendApiKey(options || {});
  for (const base of bases) {
    const url = `${base}${path}`;
    try {
      const resp = await fetch(url, opts);
      if (resp && resp.status === 401) {
        handleUnauthorized();
        throw new Error('Unauthorized');
      }
      if (resp && resp.ok) return resp;
      const text = resp ? await resp.text() : '';
      lastError = { status: resp && resp.status, body: text.slice(0, 200), url };
    } catch (err) {
      lastError = { error: err, url };
    }
  }
  const err = new Error('All API bases failed');
  err.details = lastError;
  throw err;
}

function setStatus(status, error = '') {
  syncState.status = status;
  syncState.error = error || '';
  if (status === 'ok') {
    syncState.lastSyncedAt = Date.now();
  }
}

export function setSyncUsername(username) {
  syncState.username = username || '';
}

export function resetUserDataSync() {
  hydrated = false;
  setStatus('idle', '');
  syncState.username = '';
  if (pendingTimer) {
    clearTimeout(pendingTimer);
    pendingTimer = null;
  }
}

function readLocalSnapshot() {
  const out = { favoriteTabs: [], favoriteTabsActiveId: '', customAttractions: [] };
  try {
    const raw = localStorage.getItem('favoriteTabs_all');
    out.favoriteTabs = raw ? (JSON.parse(raw) || []) : [];
  } catch (e) {}
  try {
    const raw = localStorage.getItem('customAttractions');
    out.customAttractions = raw ? (JSON.parse(raw) || []) : [];
  } catch (e) {}
  try {
    const active = localStorage.getItem('favoriteTabs_activeId');
    if (typeof active === 'string') out.favoriteTabsActiveId = active;
  } catch (e) {}
  return out;
}

function persistSnapshot(snapshot) {
  try { localStorage.setItem('favoriteTabs_all', JSON.stringify(snapshot.favoriteTabs || [])); } catch (e) {}
  try { localStorage.setItem('customAttractions', JSON.stringify(snapshot.customAttractions || [])); } catch (e) {}
  try { localStorage.setItem('favoriteTabs_activeId', snapshot.favoriteTabsActiveId || ''); } catch (e) {}
}

export async function pullUserDataFromServer() {
  if (!isAuthenticated()) return null;
  setSyncUsername((getAuthUser() && getAuthUser().username) || '');
  setStatus('syncing', '');
  try {
    const resp = await fetchWithFallback('/api/user/data', { cache: 'no-store' });
    const data = resp ? await resp.json() : null;
    const favoriteTabs = Array.isArray(data && data.favoriteTabs) ? data.favoriteTabs : [];
    const customAttractions = Array.isArray(data && data.customAttractions) ? data.customAttractions : [];
    const favoriteTabsActiveId = data && typeof data.favoriteTabsActiveId === 'string'
      ? data.favoriteTabsActiveId
      : '';

    const remoteHasData = favoriteTabs.length > 0 || customAttractions.length > 0;
    const localSnapshot = readLocalSnapshot();
    const localHasData = (localSnapshot.favoriteTabs || []).length > 0 || (localSnapshot.customAttractions || []).length > 0;

    if (remoteHasData) {
      persistSnapshot({ favoriteTabs, favoriteTabsActiveId, customAttractions });
    } else if (localHasData) {
      // 本地已有数据但远端为空，稍后触发上传
      queueUserDataSync('seed-remote');
    } else {
      persistSnapshot({ favoriteTabs: [], favoriteTabsActiveId: '', customAttractions: [] });
    }
    setStatus('ok', '');
    hydrated = true;
    return { favoriteTabs, favoriteTabsActiveId, customAttractions };
  } catch (err) {
    setStatus('error', err && err.message ? err.message : 'Failed to load user data');
    return null;
  }
}

async function pushSnapshot(snapshot) {
  if (!isAuthenticated()) return false;
  setStatus('syncing', '');
  try {
    const resp = await fetchWithFallback('/api/user/data', {
      method: 'PUT',
      headers: buildAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(snapshot)
    });
    if (resp && resp.ok) {
      setStatus('ok', '');
      hydrated = true;
      return true;
    }
    const text = resp ? await resp.text() : '';
    setStatus('error', text.slice(0, 200) || 'Failed to save user data');
    return false;
  } catch (err) {
    setStatus('error', err && err.message ? err.message : 'Failed to save user data');
    return false;
  }
}

export function queueUserDataSync(reason = 'local-change') {
  if (!isAuthenticated()) return;
  if (pendingTimer) {
    clearTimeout(pendingTimer);
  }
  pendingTimer = setTimeout(async () => {
    pendingTimer = null;
    try {
      if (inflight) await inflight;
    } catch (_) {}
    const snapshot = readLocalSnapshot();
    inflight = pushSnapshot(snapshot);
    try { await inflight; } catch (_) {}
    inflight = null;
  }, reason === 'seed-remote' ? 100 : 400);
}

export async function ensureUserDataHydrated() {
  if (hydrated) return;
  await pullUserDataFromServer();
}

export async function uploadCustomImage(customId, slot, dataUrl) {
  if (!isAuthenticated()) {
    throw new Error('Unauthorized');
  }
  setStatus('syncing', '');
  try {
    const resp = await fetchWithFallback('/api/user/custom-image', {
      method: 'POST',
      headers: buildAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ customId, slot, dataUrl })
    });
    const data = resp ? await resp.json() : null;
    if (resp && resp.ok && data && data.key) {
      setStatus('ok', '');
      return data.key;
    }
    const msg = data && (data.error || data.msg) ? (data.error || data.msg) : 'Upload failed';
    setStatus('error', msg);
    throw new Error(msg);
  } catch (err) {
    setStatus('error', err && err.message ? err.message : 'Upload failed');
    throw err;
  }
}

export async function deleteCustomImages(keys) {
  if (!isAuthenticated()) return false;
  const list = Array.isArray(keys) ? keys.filter(Boolean) : [keys].filter(Boolean);
  if (!list.length) return true;
  setStatus('syncing', '');
  try {
    const resp = await fetchWithFallback('/api/user/custom-image', {
      method: 'DELETE',
      headers: buildAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ keys: list })
    });
    if (resp && resp.ok) {
      setStatus('ok', '');
      return true;
    }
    const text = resp ? await resp.text() : '';
    setStatus('error', text.slice(0, 200) || 'Failed to delete images');
    return false;
  } catch (err) {
    setStatus('error', err && err.message ? err.message : 'Failed to delete images');
    return false;
  }
}

export { syncState as userDataSyncState };
