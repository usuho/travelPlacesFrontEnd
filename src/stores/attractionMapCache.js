import { reactive } from 'vue';

const state = reactive({
  version: 0,
  lastInvalidatedAt: 0,
  lastReason: '',
});

export function invalidateAttractionMapCache(reason = '') {
  state.version = (state.version + 1) % 1000000000;
  state.lastInvalidatedAt = Date.now();
  state.lastReason = String(reason || '');
}

export { state as attractionMapCacheState };
