import { buildAuthHeaders } from '../stores/auth.js';

let cachedPromise = null;

const emptyKeys = {
  amapKey: '',
  openCageKey: '',
  geoapifyKey: '',
  locationIqKey: '',
  mapQuestKey: '',
  positionstackKey: ''
};

async function loadKeys() {
  try {
    const base = (() => {
      try {
        const v = import.meta && import.meta.env && import.meta.env.VITE_API_BASE;
        if (v) return String(v).replace(/\/$/, '');
        if (typeof window !== 'undefined' && window.location && window.location.origin) {
          return window.location.origin.replace(/\/$/, '');
        }
      } catch (_) {}
      return '';
    })();
    const url = `${base}/api/geo-keys`;
    const resp = await fetch(url, { headers: buildAuthHeaders() });
    const status = resp ? resp.status : 0;
    const text = resp ? await resp.text() : '';
    if (resp && resp.ok) {
      let data = {};
      try { data = text ? JSON.parse(text) : {}; } catch (_) {
        console.warn('[GeoKeys] parse error, body:', text.slice(0, 200));
        return { ...emptyKeys };
      }
      const keys = {
        amapKey: data.amapKey || '',
        openCageKey: data.openCageKey || '',
        geoapifyKey: data.geoapifyKey || '',
        locationIqKey: data.locationIqKey || '',
        mapQuestKey: data.mapQuestKey || '',
        positionstackKey: data.positionstackKey || ''
      };
      try {
        console.info('[GeoKeys] loaded', {
          status,
          hasAmapKey: !!keys.amapKey,
          hasOpenCageKey: !!keys.openCageKey,
          hasGeoapifyKey: !!keys.geoapifyKey,
          hasLocationIqKey: !!keys.locationIqKey,
          hasMapQuestKey: !!keys.mapQuestKey,
          hasPositionstackKey: !!keys.positionstackKey
        });
      } catch (_) {}
      return keys;
    }
    console.warn('[GeoKeys] request failed', { status, body: text.slice(0, 200) });
  } catch (err) {
    console.warn('[GeoKeys] fetch error', err);
  }
  return { ...emptyKeys };
}

export async function getGeoKeys() {
  if (!cachedPromise) {
    cachedPromise = loadKeys();
  }
  const keys = await cachedPromise;
  return keys || { ...emptyKeys };
}

