const KEY = 'customAttractions'

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
    localStorage.setItem(KEY, JSON.stringify(list || []))
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
