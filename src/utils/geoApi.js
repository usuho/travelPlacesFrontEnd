import { buildAuthHeaders, clearAuthSession, clearLocalStoragePreservingRememberPassword } from '../stores/auth.js';

// Centralized API helpers matching the backend routes in travelPlacesServer/server.js

let lastApiBase = '';

function apiBaseCandidates() {
  const list = [];
  // 1) relative (same origin)
  list.push('');
  // 2) Vite env configured base
  try {
    if (import.meta && import.meta.env && import.meta.env.VITE_API_BASE) {
      list.push(String(import.meta.env.VITE_API_BASE));
    }
  } catch (e) {}
  // 3) Common local dev servers
  try {
    const { hostname } = window.location || {};
    const host = hostname || 'localhost';
    // Prefer same host on port 3000
    list.push(`http://${host}:3000`);
  } catch (e) {}
  // Also try localhost loopbacks
  list.push('http://localhost:3000');
  list.push('http://127.0.0.1:3000');
  // 4) remote fallback (cloud / legacy)
  list.push('https://juseaxerf.com');
  list.push('https://juseaxerf.com');
  return list;
}

export function withBackendApiKey(options) {
  const baseOptions = options || {};
  const headers = buildAuthHeaders({ ...(baseOptions.headers || {}) });

  return { ...baseOptions, headers };
}

export function getLastApiBase() {
  return lastApiBase || apiBaseCandidates()[0];
}

export async function fetchJson(path, options) {
  const bases = apiBaseCandidates();
  // Prefer last known good base
  if (lastApiBase) {
    const i = bases.indexOf(lastApiBase);
     if (i > 0) {
      bases.splice(i, 1);
      bases.unshift(lastApiBase);
    }
  }

  const optsWithKey = withBackendApiKey(options);

  for (const base of bases) {
    try {
      const resp = await fetch(`${base}${path}`, optsWithKey);
      if (resp && resp.ok) {
        lastApiBase = base;
        return await resp.json();
      }
      if (resp && resp.status === 401) {
        try { clearAuthSession(); } catch (e) {}
        try { clearLocalStoragePreservingRememberPassword(); } catch (e) {}
        try { sessionStorage.clear(); } catch (e) {}
        try { if (typeof caches !== 'undefined' && caches.keys) { caches.keys().then(keys => keys.forEach(k => caches.delete(k))); } } catch (e) {}
        try { window.location && window.location.replace && window.location.replace('/login'); } catch (e) {}
        return null;
      }
    } catch (_) {
      // try next base
    }
  }
  return null;
}

// ----- Geo endpoints -----

export async function fetchAttractionsGeo(country) {
  return await fetchJson(`/api/attractions-geo/${country}`);
}

export async function fetchAttractionsGeoByIds(country, ids) {
  if (!Array.isArray(ids) || !ids.length) return [];
  return await fetchJson(`/api/attractions-geo/${country}/by-ids`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids })
  }) || [];
}

export async function fetchAttractionsPositions(country) {
  return await fetchJson(`/api/attractions-positions/${country}`) || [];
}

export async function fetchAttractionsPositionsByIds(country, ids) {
  if (!Array.isArray(ids) || !ids.length) return [];
  return await fetchJson(`/api/attractions-positions/${country}/by-ids`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids })
  }) || [];
}
