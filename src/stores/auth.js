import { reactive } from 'vue';

export const COOKIE_ONLY_TOKEN = '__cookie_only__';
export const REMEMBER_PASSWORD_KEY = 'travelplaces_remember_password';
const STORAGE_KEY = 'travelplaces_auth';

function loadSession() {
  try {
    const raw = (typeof localStorage !== 'undefined')
      ? localStorage.getItem(STORAGE_KEY)
      : '';
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
}

const saved = loadSession();

const state = reactive({
  token: saved.token || '',
  user: saved.user || null
});

function hasPersistedSession() {
  try {
    const raw = (typeof localStorage !== 'undefined')
      ? localStorage.getItem(STORAGE_KEY)
      : '';
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    return !!(parsed && parsed.token);
  } catch (e) {
    return false;
  }
}

function persist() {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ token: state.token, user: state.user })
    );
  } catch (e) {}
}

export function setAuthSession(token, user) {
  state.token = token || '';
  state.user = user || null;
  persist();
}

export function clearAuthSession() {
  state.token = '';
  state.user = null;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {}
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch (e) {}
}

export function clearLocalStoragePreservingRememberPassword() {
  let rememberRaw = null;
  try {
    rememberRaw = (typeof localStorage !== 'undefined')
      ? localStorage.getItem(REMEMBER_PASSWORD_KEY)
      : null;
  } catch (e) {
    rememberRaw = null;
  }

  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }
  } catch (e) {}

  try {
    if (rememberRaw != null && typeof localStorage !== 'undefined') {
      localStorage.setItem(REMEMBER_PASSWORD_KEY, rememberRaw);
    }
  } catch (e) {}
}

export function isAuthenticated() {
  if (!state.token) return false;
  if (!hasPersistedSession()) {
    clearAuthSession();
    return false;
  }
  return !!state.token;
}

export function getAuthToken() {
  return state.token || '';
}

export function getAuthUser() {
  return state.user;
}

export function buildAuthHeaders(headers = {}) {
  const token = getAuthToken();
  if (token && token !== COOKIE_ONLY_TOKEN && !headers.Authorization) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

export function hasPersistedSessionToken() {
  return hasPersistedSession();
}
