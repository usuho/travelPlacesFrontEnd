import { openDB } from 'idb';

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
    if (!blob) return '';
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

