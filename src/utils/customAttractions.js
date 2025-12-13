import { queueUserDataSync } from '../stores/userDataSync.js'

const KEY = 'customAttractions'

function sanitizeCustomAttraction(attraction) {
  if (!attraction || typeof attraction !== 'object') return null;
  const images = attraction.images || {};
  const clean = (val) => (typeof val === 'string' && val.startsWith('data:')) ? '' : (typeof val === 'string' ? val : '');
  const secondary = Array.isArray(images.secondary) ? images.secondary.map(clean) : [];
  while (secondary.length < 2) secondary.push('');
  return {
    ...attraction,
    images: {
      main: clean(images.main),
      secondary: secondary.slice(0, 2)
    }
  };
}

export function getAllCustomAttractions() {
  try {
    const raw = localStorage.getItem(KEY)
    const list = raw ? JSON.parse(raw) : []
    return Array.isArray(list) ? list : []
  } catch (e) {
    return []
  }
}

export function saveAllCustomAttractions(list) {
  try {
    const normalized = (list || [])
      .map(sanitizeCustomAttraction)
      .filter(Boolean);
    localStorage.setItem(KEY, JSON.stringify(normalized))
    queueUserDataSync()
  } catch (e) {}
}

export function addCustomAttraction(attraction) {
  const all = getAllCustomAttractions()
  const id = attraction && attraction.id ? String(attraction.id) : ('custom_' + Date.now())
  const withId = { ...attraction, id }
  const idx = all.findIndex(a => String(a.id) === String(id))
  if (idx >= 0) all[idx] = withId
  else all.push(withId)
  saveAllCustomAttractions(all)
  return withId
}

export function findCustomAttractionById(id) {
  const all = getAllCustomAttractions()
  return all.find(a => String(a.id) === String(id)) || null
}

export function deleteCustomAttraction(id) {
  const all = getAllCustomAttractions()
  const idx = all.findIndex(a => String(a.id) === String(id))
  if (idx >= 0) {
    all.splice(idx, 1)
    saveAllCustomAttractions(all)
    return true
  }
  return false
}

// 合并更新指定自创景点（若不存在则忽略）
export function updateCustomAttraction(id, patch) {
  try {
    const all = getAllCustomAttractions()
    const idx = all.findIndex(a => String(a.id) === String(id))
    if (idx < 0) return null
    const updated = { ...all[idx], ...(patch || {}) }
    all[idx] = updated
    saveAllCustomAttractions(all)
    return updated
  } catch (e) { return null }
}
