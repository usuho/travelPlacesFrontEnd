<template>
  <div class="map-page">
    <div id="map" class="map-container"></div>
    <div v-if="showLoading" class="map-loading-overlay"><div class="spinner"></div></div>
    <button class="back-button map-back-button" @click="handleBack">返回</button>
    <button
      class="locate-button"
      :class="{ locating: isLocating }"
      @click="handleLocateClick"
      :disabled="isLocating"
      aria-label="定位当前位置"
    >
      <span class="locate-icon"></span>
    </button>
  </div>
</template>

<script>

import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { findCustomAttractionById, getAllCustomAttractions } from '../utils/customAttractions.js';
import { getImageUrl as getCustomImageUrl } from '../utils/customImageStore.js';
import { fetchAttractionsGeo, fetchAttractionsGeoByIds, fetchAttractionsPositions, fetchAttractionsPositionsByIds, getLastApiBase, withBackendApiKey } from '../utils/geoApi.js';
import { getCountrySlugByIso, isSupportedCountrySlug } from '../utils/countryCatalog.js';
import { ensureUserDataHydrated } from '../stores/userDataSync.js';

export default {
  name: 'AttractionMap',
  data() {
    return {
      map: null,
      country: this.$route.params.country,
      // ·ɲ
      focusId: this.$route.query.focusId || null,
      fromDetails: this.$route.query.from === 'details',
      // ղ
      favoriteTabs: [],
      activeTabId: null,
      favorites: [],
      // ͼ
      favoritesLayer: null,
      allLayer: null,
      focusedLayer: null,
      locateMarker: null,
      locateMarkerLatLng: null,
      // Դ
      imageCache: new Map(),
      apiChosenBase: null,
      normalsCountry: null,
      // Ⱦ״̬
      favMarkers: new Map(),
      allMarkers: new Map(),
      _didInitCenter: false,
      _allGeoData: [],
      showLoading: false,
      isLocating: false,
      _hasRenderedFirst: false,
      // 뻺
      _visibleCap: 400,
      allMarkersMeta: new Map(), // id -> meta rating/lat/lng ȣ
      // ͳʾ
      statsRendered: 0,
      statsNeverRendered: 0,
      _favGeoPending: 0,
      _didFinalFitFavorites: false,
      // ͼʱϿͼָ
      _blockFavFit: false,
      _shouldRestoreView: false,
      _overlapZoomThreshold: 14,
      _markersInteractive: true,
      _didAutoPanToFirst: false,
      _allRenderSeq: 0,
      _recomputeOverlapScheduled: false,
      _suppressAutoCenterUntil: 0,
      _disableAutoPopupAfterLocate: false,
      _shouldResetListFilters: false,
      _hasRenderedNormalOnce: false,
    };
  },
  computed: {
    apiBases() {
      const arr = [];
      arr.push('');
      try { if (import.meta.env && import.meta.env.VITE_API_BASE) arr.push(String(import.meta.env.VITE_API_BASE)); } catch (e) {}
      arr.push('https://juseaxerf.com');
      return arr;
    }
  },
  watch: {
    '$route.params.country'(next) {
      const slug = (next || '').toString().toLowerCase();
      if (!slug || slug === this.country) return;
      this.country = slug;
      if (slug !== 'custom') this.normalsCountry = slug;
      try { localStorage.setItem('lastNonCustomCountry', slug); } catch (e) {}
      if (this.map) this.reloadNormalMarkers();
    },
    '$route.query.listCountry'(next) {
      if (String(this.country) !== 'custom') return;
      const slug = next ? String(next).toLowerCase() : '';
      if (!slug || slug === this.normalsCountry) return;
      this.normalsCountry = slug;
      if (this.map) this.reloadNormalMarkers();
    }
  },
    async mounted() {
      try { await ensureUserDataHydrated(); } catch (e) {}
      this.loadFavoritesState();
      this.initMap();
      // 安卓实体返回键：行为与页面“返回”按钮保持一致
      try {
        this._onHardwareBack = (evt) => {
          try { evt && evt.preventDefault && evt.preventDefault(); } catch (e) {}
          this.handleBack();
        };
        window.addEventListener('hardware-back', this._onHardwareBack);
      } catch (e) {}
      // ¼һηԴĹңڴԴͼʱΪͨĻԴ
      try { if (String(this.country) !== 'custom') localStorage.setItem('lastNonCustomCountry', String(this.country)); } catch (e) {}
      this.normalsCountry = this.determineNormalsCountry();
      // 鷵ػӵͼٷʱԻָ֮ǰͼ
      this.tryRestoreMapViewMaybe();
    // Ǵҳͼ򲻽ղطΧϣֻ۽
    if (this.fromDetails) this._blockFavFit = true;
    this.showLoading = true;
    await this.renderFavoritesMarkers();
    // Դңбʱ飩ԴȱʧγȵһԶ
    if (String(this.country) === 'custom' && !this.fromDetails) {
      try { await this.geocodeAllCustomIfNeeded(); } catch (e) {}
    }
    // Դ£ȳʹϴηԴҵĿգհμ
    if (String(this.country) === 'custom') {
      const normalsCountry = this.normalsCountry || '';
      if (normalsCountry) {
        try {
          const snap = this._loadNormalsSnapshot(normalsCountry);
          if (Array.isArray(snap) && snap.length) {
            this._allGeoData = snap;
            this.renderAllInView && this.renderAllInView();
          }
        } catch (e) {}
      }
    }
    try { this.fetchAllGeoOnce().then(() => { this.renderAllInView && this.renderAllInView(); }); } catch (e) {}

    if (this.focusId) {
      await this.focusSpecificAttraction();
      // ҳʱص
      if (this.fromDetails) {
        this.activateBrowserBackGuard();
      }
    }
  },
  beforeUnmount() {
    try { if (this._onMapBack) window.removeEventListener('popstate', this._onMapBack); } catch (e) {}
    try { if (this._onHardwareBack) window.removeEventListener('hardware-back', this._onHardwareBack); } catch (e) {}
    try { this.map && this.map.remove(); } catch (e) {}
  },
  methods: {
    determineNormalsCountry() {
      if (String(this.country) !== 'custom') return String(this.country || '');
      const fromQuery = this.getListCountryFromQuery();
      if (fromQuery) return fromQuery;
      try {
        const fallback = localStorage.getItem('lastNonCustomCountry') || '';
        if (fallback && fallback.toLowerCase() !== 'custom') return fallback;
      } catch (e) {}
      return '';
    },
    getListCountryFromQuery() {
      try {
        const q = (this.$route && this.$route.query) ? this.$route.query : {};
        const raw = q && q.listCountry ? String(q.listCountry).trim() : '';
        if (raw && raw.toLowerCase() !== 'custom') return raw;
      } catch (e) {}
      return '';
    },
    activateBrowserBackGuard() {
      try {
        if (typeof history !== 'undefined' && typeof document !== 'undefined' && typeof location !== 'undefined') {
          history.pushState({ mapBackGuard: true }, document.title, location.href);
        }
      } catch (e) {}
      if (this._onMapBack || typeof window === 'undefined') return;
      try {
        this._onMapBack = (evt) => {
          try { evt && evt.preventDefault && evt.preventDefault(); } catch (err) {}
          this.handleBack();
        };
        window.addEventListener('popstate', this._onMapBack, { passive: true });
      } catch (e) {}
    },
    async handleLocateClick() {
      if (this.isLocating) return;
      if (typeof navigator === 'undefined' || !navigator.geolocation) {
        try { console.warn('当前设备不支持定位功能'); } catch (_) {}
        return;
      }
      const prevBlockFavFit = this._blockFavFit;
      this.isLocating = true;
      this._blockFavFit = true;
      this._didInitCenter = true;
      try {
        let locateSource = 'gps';
        let coordsResult = null;
        try {
          const position = await this.obtainDevicePosition();
          const coords = position && position.coords ? position.coords : null;
          const lat = coords && Number(coords.latitude);
          const lng = coords && Number(coords.longitude);
          if (!Number.isFinite(lat) || !Number.isFinite(lng)) throw new Error('invalid coords');
          coordsResult = { lat, lng };
        } catch (primaryErr) {
          try { console.warn('[Locate] GPS failed, fallback to IP', primaryErr); } catch (_) {}
          const ipLoc = await this.locateByIpFallback();
          if (ipLoc && Number.isFinite(ipLoc.lat) && Number.isFinite(ipLoc.lng)) {
            locateSource = 'ip';
            coordsResult = { lat: ipLoc.lat, lng: ipLoc.lng };
          try { console.warn('GPS 超时，已使用 IP 定位（城市级，可能不精确）'); } catch (_) {}
          } else {
            throw primaryErr;
          }
        }
        if (!coordsResult) throw new Error('no coords');
        const { lat, lng } = coordsResult;
        this._disableAutoPopupAfterLocate = true;
        const locatedCountry = await this.resolveCountryByCoords(lat, lng);
        let switched = false;
        if (locatedCountry) {
          switched = await this.applyLocatedCountry(locatedCountry);
          if (!switched) {
            try { this.renderAllInView && this.renderAllInView(true); } catch (_) {}
          }
        } else {
          // 为避免打断用户，不弹窗
        }
        this.showLocateMarker(lat, lng);
        if (switched) {
          this.activateBrowserBackGuard();
          this.centerMapOnLocation(lat, lng, { keepZoom: true, duration: 0.3 });
          this.ensureLocateCenter(lat, lng);
        } else {
          this.centerMapOnLocation(lat, lng);
        }
        const suppressMs = (!locatedCountry || !switched) ? 20000 : 8000;
        this.suppressAutoCentering(suppressMs);
      } catch (err) {
        try { console.error('[Locate] failed to obtain user location', err); } catch (_) {}
        // 保持沉默式失败，只在控制台输出
      } finally {
        const releaseAutoFit = () => {
          if (this._favGeoPending > 0) {
            setTimeout(releaseAutoFit, 200);
          } else {
            this._blockFavFit = prevBlockFavFit;
          }
        };
        releaseAutoFit();
        this.isLocating = false;
      }
      },
    async locateByIpFallback() {
      try {
        const resp = await fetch('https://ipapi.co/json/');
        if (!resp || !resp.ok) return null;
        const data = await resp.json();
        const lat = Number(data && data.latitude);
        const lng = Number(data && data.longitude);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
        return { lat, lng, countryCode: data && data.country_code };
      } catch (e) {
        return null;
      }
    },
    obtainDevicePosition() {
      const attempt = (opts) => new Promise((resolve, reject) => {
        try {
          navigator.geolocation.getCurrentPosition(resolve, reject, opts);
        } catch (e) {
          reject(e);
        }
      });
      const watchOnce = (opts) => new Promise((resolve, reject) => {
        let cleared = false;
        try {
          const id = navigator.geolocation.watchPosition(
            (pos) => {
              if (cleared) return;
              cleared = true;
              try { navigator.geolocation.clearWatch(id); } catch (_) {}
              resolve(pos);
            },
            (err) => {
              if (cleared) return;
              cleared = true;
              try { navigator.geolocation.clearWatch(id); } catch (_) {}
              reject(err);
            },
            opts
          );
          const guard = setTimeout(() => {
            if (cleared) return;
            cleared = true;
            try { navigator.geolocation.clearWatch(id); } catch (_) {}
            const timeoutErr = new Error('watchPosition timeout');
            timeoutErr.code = 3;
            reject(timeoutErr);
          }, Math.max(2000, (opts && opts.timeout) ? opts.timeout + 3000 : 15000));
          if (guard && guard.unref) guard.unref();
        } catch (e) {
          reject(e);
        }
      });
      // Prefer high-accuracy (GPS) first, then fall back to cached/low-accuracy.

      const attempts = [

        { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 },

        { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 },

        { enableHighAccuracy: false, timeout: 15000, maximumAge: 600000 },

        { enableHighAccuracy: false, timeout: 20000, maximumAge: 0 },

      ];

      let lastErr = null;
      return (async () => {
        for (const opts of attempts) {
          try {
            // 若 getCurrentPosition 超时，再用 watchPosition 补打一枪
            return await attempt(opts).catch((err) => {
              const isTimeout = err && err.code === 3;
              if (!isTimeout) throw err;
              return watchOnce(opts);
            });
          } catch (err) {
            lastErr = err;
            const isTimeout = err && err.code === 3;
            if (!isTimeout) throw err;
            // 仅超时则继续下一轮尝试
          }
        }
        throw lastErr || new Error('定位失败');
      })();
    },
    centerMapOnLocation(lat, lng, options = {}) {
      if (!this.map || !Number.isFinite(lat) || !Number.isFinite(lng)) return;
      const defaultZoom = 12;
      const keepZoom = !!options.keepZoom;
      const specifiedZoom = Number.isFinite(options.zoom) ? Number(options.zoom) : defaultZoom;
      const targetZoom = keepZoom
        ? Math.max(this.map.getZoom() || defaultZoom, defaultZoom)
        : specifiedZoom;
      const duration = Number.isFinite(options.duration) ? Number(options.duration) : 0.8;
      try {
        this.map.flyTo([lat, lng], targetZoom, { duration });
      } catch (e) {
        try { this.map.setView([lat, lng], targetZoom); } catch (_) {}
      }
    },
    ensureLocateCenter(lat, lng) {
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
      this.$nextTick(() => {
        setTimeout(() => {
          this.centerMapOnLocation(lat, lng, { keepZoom: true, duration: 0.4 });
        }, 120);
      });
    },
    showLocateMarker(lat, lng) {
      if (!this.map || !Number.isFinite(lat) || !Number.isFinite(lng)) return;
      try { if (this.locateMarker) this.map.removeLayer(this.locateMarker); } catch (e) {}
      const icon = L.divIcon({
        className: 'locate-bubble-icon',
        html: '<div class="locate-bubble"></div>',
        iconAnchor: [13, 26],
        iconSize: [0, 0],
      });
      this.locateMarker = L.marker([lat, lng], { icon, interactive: false, pane: 'focusPane' });
      this.locateMarker.addTo(this.map);
      this.locateMarkerLatLng = [lat, lng];
    },
    suppressAutoCentering(ms = 12000) {
      const duration = Number.isFinite(ms) ? Math.max(0, ms) : 0;
      const targetTs = Date.now() + duration;
      const current = this._suppressAutoCenterUntil || 0;
      this._suppressAutoCenterUntil = Math.max(current, targetTs);
    },
    canAutoCenter() {
      const ts = this._suppressAutoCenterUntil || 0;
      if (!ts) return true;
      return Date.now() >= ts;
    },
    async resolveCountryByCoords(lat, lng) {
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return '';
      const providers = [
        () => this.reverseLookupOpenMeteo(lat, lng),
        () => this.reverseLookupNominatim(lat, lng),
      ];
      for (const fn of providers) {
        try {
          const slug = await fn();
          if (slug) return slug;
        } catch (e) {
          try { console.error('[Locate] reverse geocode provider failed', e); } catch (_) {}
        }
      }
      return '';
    },
    async reverseLookupOpenMeteo(lat, lng) {
      const params = new URLSearchParams({
        latitude: lat,
        longitude: lng,
        language: 'en',
      });
      const resp = await fetch(`https://geocoding-api.open-meteo.com/v1/reverse?${params.toString()}`);
      if (!resp || !resp.ok) return '';
      const data = await resp.json();
      const result = Array.isArray(data && data.results) ? data.results[0] : null;
      if (!result) return '';
      return this.resolveSlugFromIsoAndName(result.country_code, result.country);
    },
    async reverseLookupNominatim(lat, lng) {
      const params = new URLSearchParams({
        lat,
        lon: lng,
        format: 'json',
        zoom: 3,
        'accept-language': 'en'
      });
      const resp = await fetch(`https://nominatim.openstreetmap.org/reverse?${params.toString()}`);
      if (!resp || !resp.ok) return '';
      const data = await resp.json();
      const addr = data && data.address;
      if (!addr) return '';
      return this.resolveSlugFromIsoAndName(addr.country_code, addr.country || data.display_name);
    },
    resolveSlugFromIsoAndName(iso2, countryName) {
      let slug = getCountrySlugByIso(iso2);
      if (!slug) slug = this.matchSlugByCountryName(countryName);
      if (slug && !isSupportedCountrySlug(slug)) slug = '';
      return slug || '';
    },
    matchSlugByCountryName(name) {
      if (!name) return '';
      const key = this.normalizeCountryNameKey(String(name));
      const table = {
        'united states': 'america',
        'united states of america': 'america',
        'usa': 'america',
        'america': 'america',
        'peoples republic of china': 'china',
        'people republic of china': 'china',
        'people s republic of china': 'china',
        'china': 'china',
        'republic of singapore': 'singapore',
        'singapore': 'singapore',
        'federation of malaysia': 'malaysia',
        'malaysia': 'malaysia',
        'kingdom of thailand': 'thailand',
        'thailand': 'thailand',
        'socialist republic of vietnam': 'vietnam',
        'vietnam': 'vietnam',
        'swiss confederation': 'switzerland',
        'switzerland': 'switzerland',
        'united mexican states': 'mexico',
        'mexico': 'mexico',
        'kingdom of denmark': 'denmark',
        'denmark': 'denmark',
        'commonwealth of australia': 'australia',
        'australia': 'australia',
        'new zealand': 'newzealand',
        'iceland': 'iceland',
        'canada': 'canada',
        'japan': 'japan',
      };
      return table[key] || '';
    },
    normalizeCountryNameKey(input) {
      return String(input || '')
        .toLowerCase()
        .replace(/[\u2018\u2019]/g, "'")
        .replace(/[\u201c\u201d]/g, '"')
        .replace(/[^a-z\s']/g, ' ')
        .replace(/'/g, '')
        .replace(/\s+/g, ' ')
        .trim();
    },
    buildLocateErrorMessage(err) {
      if (!err) return '获取定位失败，请确认设备已开启定位和网络';
      const secureOrigin = typeof err.message === 'string' && /secure origin/i.test(err.message);
      if (secureOrigin) return '定位需要通过 HTTPS 或 “localhost” 访问，请切换到安全链接后再试';
      if (err.code === 1) return '浏览器拒绝了定位权限，请在系统设置中允许本网站使用定位功能';
      if (err.code === 2) return '定位服务暂时不可用，请确认已开启 GPS，或在更开阔的环境重试';
      if (err.code === 3) return '定位请求超时，请保持 GPS 打开，必要时可多尝试几次';
      const detail = err && err.message ? `（${err.message}）` : '';
      return `获取定位失败${detail}，请确认已授予定位权限`;
    },
    async applyLocatedCountry(slug) {
      const normalized = String(slug || '').toLowerCase();
      if (!isSupportedCountrySlug(normalized)) return false;
      const previousViewCountry = String(this.country || '');
      const currentDatasetCountry = previousViewCountry === 'custom'
        ? (String(this.normalsCountry || '') || this.getListCountryFromQuery() || '')
        : previousViewCountry;
      if (currentDatasetCountry === normalized && previousViewCountry !== 'custom' && Array.isArray(this._allGeoData) && this._allGeoData.length) {
        return false;
      }
      this.country = normalized;
      this.normalsCountry = normalized;
      this.updateRouteCountry(normalized);
      try { localStorage.setItem('lastNonCustomCountry', normalized); } catch (e) {}
      await this.reloadNormalMarkers();
      this._clearListFiltersCache();
      this._shouldResetListFilters = true;
      return true;
    },
    updateRouteCountry(newCountry) {
      try {
        if (!this.$router || !this.$route) return;
        const current = this.$route.params && this.$route.params.country;
        if (String(current) === String(newCountry)) return;
        const query = { ...(this.$route.query || {}) };
        if (newCountry !== 'custom' && query.listCountry) delete query.listCountry;
        this.$router.replace({ path: `/map/${newCountry}`, query });
      } catch (e) {}
    },
    async reloadNormalMarkers() {
      this._allGeoData = [];
      this._allRenderSeq++;
      try { this.allLayer && this.allLayer.clearLayers(); } catch (e) {}
      try { this.focusedLayer && this.focusedLayer.clearLayers(); } catch (e) {}
      this.allMarkers.clear();
      this.allMarkersMeta.clear();
      this.statsRendered = 0;
      this.statsNeverRendered = 0;
      this._hasRenderedFirst = false;
      this._hasRenderedNormalOnce = false;
      this.showLoading = true;
      await this.fetchAllGeoOnce();
      this.renderAllInView && this.renderAllInView();
    },
    _clearListFiltersCache() {
      const safeRemove = (k) => { try { localStorage.removeItem(k); } catch (e) {} };
      const safeSet = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };
      safeRemove('attractionMinReviews');
      safeRemove('attractionsRegion');
      safeRemove('attractionsCounty');
      safeSet('attractionsOrder', 'rating_desc');
      safeSet('attractionsPage', '1');
    },
    async geocodeAllCustomIfNeeded() {
      try {
        const list = getAllCustomAttractions ? (getAllCustomAttractions() || []) : [];
        // async, concurrency-limited geocoding for custom attractions
        {
          const toGeocode = [];
          for (const ca of list) {
            if (!ca || !ca.id) continue;
            const idStr = String(ca.id);
            if (this._hasFavMarker && this._hasFavMarker(idStr)) continue;
            const cacheKey = `custom|${idStr}`;
            const cached = this._geoGet && this._geoGet(cacheKey);
            const meta = { id: idStr, name: ca.name || '', region: ca.region || '', county: ca.county || '', rating: Number.isFinite(ca && ca.rating) ? ca.rating : 0, country: 'custom', hasImage: !!(ca.hasImage1 || ca.hasImage2 || ca.hasImage3) };
            if (cached && Number.isFinite(cached.lat) && Number.isFinite(cached.lng)) {
              try {
                const icon = this.createFavoriteIcon('', false);
                const marker = L.marker([cached.lat, cached.lng], { icon, pane: 'favoritesPane', zIndexOffset: 1000 });
                try { marker.options._meta = meta; } catch (e) {}
                try { marker.options._origLatLng = L.latLng(cached.lat, cached.lng); } catch (e) {}
                this.bindPopupNoAutoPan(marker, meta);
                marker.on('popupopen', () => this.attachPopupHandlers(meta));
                marker.addTo(this.favoritesLayer);
              } catch (e) {}
            } else {
              const _addr = `${ca.position || ''} ${ca.name || ''} ${ca.region || ''} ${ca.county || ''}`.trim();
              if (!_addr) continue;
              const disableChinaHint = !!(ca && ca.disableChinaHint);
              const isChinesePosition = !disableChinaHint && /[\u4e00-\u9fa5]/.test(String(ca.position || ''));
              const hintKey = isChinesePosition ? 'china' : 'custom';
              toGeocode.push({ idStr, meta, _addr, hintKey, cacheKey });
            }
          }
          if (toGeocode.length) {
            const concurrency = 3;
            const workers = [];
            for (let w = 0; w < concurrency; w++) {
              workers.push((async () => {
                while (toGeocode.length) {
                  const item = toGeocode.shift();
                  if (!item) break;
                  const { idStr, meta, _addr, hintKey, cacheKey } = item;
                  try { console.info('[Geo] start geocode (custom all - from list)', { id: idStr, address: _addr, hintCountry: hintKey }); } catch (_) {}
                  try {
                    const g = await this.geocodeByFreeApi(_addr, hintKey, { amapLast: hintKey !== 'china', fallbackHintCountry: 'custom' });
                    if (g && Number.isFinite(g.lat) && Number.isFinite(g.lng)) {
                      this._geoPut && this._geoPut(cacheKey, g.lat, g.lng);
                      try {
                        const icon = this.createFavoriteIcon('', false);
                        const marker = L.marker([g.lat, g.lng], { icon, pane: 'favoritesPane', zIndexOffset: 1000 });
                        try { marker.options._meta = meta; } catch (e) {}
                        try { marker.options._origLatLng = L.latLng(g.lat, g.lng); } catch (e) {}
                        this.bindPopupNoAutoPan(marker, meta);
                        marker.on('popupopen', () => this.attachPopupHandlers(meta));
                        marker.addTo(this.favoritesLayer);
                      } catch (e) {}
                    }
                  } catch (e) {}
                }
              })());
            }
            Promise.allSettled(workers).then(() => { try { this.scheduleRecomputeOverlapAll(); } catch (e) {} });
          } else {
            try { this.scheduleRecomputeOverlapAll(); } catch (e) {}
          }
          return; // prevent falling back to sequential path below
        }
        for (const ca of list) {
          if (!ca || !ca.id) continue;
          const idStr = String(ca.id);
          //  marker ղȾ
          if (this._hasFavMarker && this._hasFavMarker(idStr)) continue;
          const cacheKey = `custom|${idStr}`;
          const cached = this._geoGet && this._geoGet(cacheKey);
          const meta = { id: idStr, name: ca.name || '', region: ca.region || '', county: ca.county || '', rating: Number.isFinite(ca && ca.rating) ? ca.rating : 0, country: 'custom', hasImage: !!(ca.hasImage1 || ca.hasImage2 || ca.hasImage3) };
          if (cached && Number.isFinite(cached.lat) && Number.isFinite(cached.lng)) {
            try {
              const icon = this.createFavoriteIcon('', false);
              const marker = L.marker([cached.lat, cached.lng], { icon, pane: 'favoritesPane', zIndexOffset: 1000 });
              try { marker.options._meta = meta; } catch (e) {}
              try { marker.options._origLatLng = L.latLng(cached.lat, cached.lng); } catch (e) {}
              this.bindPopupNoAutoPan(marker, meta);
              marker.on('popupopen', () => this.attachPopupHandlers(meta));
              marker.addTo(this.favoritesLayer);
            } catch (e) {}
            continue;
          }
          // ޻棺е
          const _addr = `${ca.position || ''} ${ca.name || ''} ${ca.region || ''} ${ca.county || ''}`.trim();
          if (!_addr) continue;
          const disableChinaHint = !!(ca && ca.disableChinaHint);
          const isChinesePosition = !disableChinaHint && /[\u4e00-\u9fa5]/.test(String(ca.position || ''));
          const hintKey = isChinesePosition ? 'china' : 'custom';
          try { console.info('[Geo] start geocode (custom all - from list)', { id: idStr, address: _addr, hintCountry: hintKey }); } catch (_) {}
          try {
            const g = await this.geocodeByFreeApi(_addr, hintKey, { amapLast: hintKey !== 'china', fallbackHintCountry: 'custom' });
            if (g && Number.isFinite(g.lat) && Number.isFinite(g.lng)) {
              this._geoPut && this._geoPut(cacheKey, g.lat, g.lng);
              try {
                const icon = this.createFavoriteIcon('', false);
                const marker = L.marker([g.lat, g.lng], { icon, pane: 'favoritesPane', zIndexOffset: 1000 });
                try { marker.options._meta = meta; } catch (e) {}
                try { marker.options._origLatLng = L.latLng(g.lat, g.lng); } catch (e) {}
                this.bindPopupNoAutoPan(marker, meta);
                marker.on('popupopen', () => this.attachPopupHandlers(meta));
                marker.addTo(this.favoritesLayer);
              } catch (e) {}
            }
          } catch (e) {}
        }
        // ɺͳһλ
        try { this.scheduleRecomputeOverlapAll(); } catch (e) {}
      } catch (e) {}
    },
    handleBack() {
      if (this.fromDetails) {
        // صͼǰҳ
        this.$router.back();
      } else {
        // صбҳ
        const route = { path: `/attractions/${this.country}` };
        if (this._shouldResetListFilters) {
          route.query = { resetFilters: '1' };
        }
        this.$router.push(route);
      }
    },

    // ȡղأбҳһµĴ洢ṹ
    loadFavoritesState() {
      try {
        const raw = localStorage.getItem('favoriteTabs_all');
        this.favoriteTabs = raw ? (JSON.parse(raw) || []) : [];
      } catch (e) {
        this.favoriteTabs = [];
      }
      try {
        const savedActive = localStorage.getItem('favoriteTabs_activeId');
        if (savedActive && this.favoriteTabs.find(t => t.id === savedActive)) {
          this.activeTabId = savedActive;
        } else if (this.favoriteTabs.length) {
          this.activeTabId = this.favoriteTabs[0].id;
        }
      } catch (e) {}
      // Ĭȡǰ tabҳ루 focusIdϲ tabȷ㾰һղزȾ
      if (this.fromDetails && this.focusId) {
        const map = new Map();
        for (const t of (this.favoriteTabs || [])) {
          const items = Array.isArray(t.items) ? t.items : [];
          for (const it of items) {
            const key = `${String(it.country||'')}|${String(it.id)}`;
            if (!map.has(key)) map.set(key, it);
          }
        }
        this.favorites = Array.from(map.values());
      } else {
        const at = this.favoriteTabs.find(t => t.id === this.activeTabId);
        this.favorites = at && Array.isArray(at.items) ? [...at.items] : [];
      }
      // ٰҹˣղҲһչʾ֤ȶ
      // ǿбҳһ£ʹõǰղб
      try {
        const __at = this.favoriteTabs.find(t => t.id === this.activeTabId);
        this.favorites = __at && Array.isArray(__at.items) ? [...__at.items] : [];
      } catch (e) {}
      this.favorites.sort((a, b) => (a.order || 0) - (b.order || 0));
    },

    initMap() {
      const { center, zoom } = this.getDefaultView();
      this.map = L.map('map', { zoomControl: true, dragging: true, tap: false, touchZoom: true }).setView(center, zoom);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 18,
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(this.map);

      // ʹõ pane ԿƲ㼶
      try { this.map.createPane('allPane'); this.map.getPane('allPane').style.zIndex = 400; } catch(e) {}
      try { this.map.createPane('focusPane'); this.map.getPane('focusPane').style.zIndex = 500; } catch(e) {}
      try { this.map.createPane('favoritesPane'); this.map.getPane('favoritesPane').style.zIndex = 600; } catch(e) {}

      this.favoritesLayer = L.layerGroup([], { pane: 'favoritesPane' }).addTo(this.map);
      this.allLayer = L.layerGroup([], { pane: 'allPane' }).addTo(this.map);
      this.focusedLayer = L.layerGroup([], { pane: 'focusPane' }).addTo(this.map);

      // Ŵһʱĵ
      this.map.on('zoomend', () => {
        if (this._disableAutoPopupAfterLocate) return;
        const z = this.map.getZoom();
        if (z >= 12) {
          // 򿪵ǰҰһղأ
          const layers = [...Object.values(this.favoritesLayer._layers || {}), ...Object.values(this.allLayer._layers || {})];
          for (const l of layers) {
            try {
              const b = this.map.getBounds();
              if (l.getLatLng && b.contains(l.getLatLng())) {
                l.openPopup && l.openPopup();
                break;
              }
            } catch (e) {}
          }
        }
      });

      // ȾҰڱǣͨ㣩ղزҰ
      const updateInView = () => {
        this.renderAllInView && this.renderAllInView(true);
        this.closeOffscreenFavoritePopups && this.closeOffscreenFavoritePopups();
      };
      this.map.on('moveend', updateInView);
      this.map.on('zoomend', () => {
        updateInView();
        // ¼صĴλصλ㣩
        try { this.scheduleRecomputeOverlapAll(); } catch (e) {}
        // ޸ź󵯴ͼƬ/ʧЧѴ򿪵ĵ°󶨴
        try { this.rebindOpenPopupHandlers(); } catch (e) {}
      });
      // ϶ʱʱñָ¼ָ֤϶ָɵ
      try {
        this.map.on('dragstart', () => { try { const el = document.getElementById('map'); if (el) el.classList.add('dragging-map'); } catch (e) {} });
        this.map.on('dragend', () => { try { const el = document.getElementById('map'); if (el) el.classList.remove('dragging-map'); } catch (e) {} });
      } catch (e) {}
      // ʼһβ
      try { this.scheduleRecomputeOverlapAll(); } catch (e) {}
    },

    // źΪǰ򿪵ĵ°ͼƬת֤Դ/ͨ㵯
    rebindOpenPopupHandlers() {
      try {
        // ҵǰ DOM еĵڵ㣬ȡ data-id/country
        const node = document.querySelector('.map-popup');
        if (!node) return;
        const id = node.getAttribute('data-id');
        const country = node.getAttribute('data-country') || this.country;
        if (!id) return;

        // ֪ͼвҶӦ marker Իȡ meta
        const layersToCheck = [];
        try { layersToCheck.push(...Object.values(this.favoritesLayer?._layers || {})); } catch (_) {}
        try { layersToCheck.push(...Object.values(this.allLayer?._layers || {})); } catch (_) {}
        try { layersToCheck.push(...Object.values(this.focusedLayer?._layers || {})); } catch (_) {}

        let meta = null;
        for (const l of layersToCheck) {
          try {
            const m = l && l.options && l.options._meta;
            if (m && String(m.id) === String(id) && String(m.country || this.country) === String(country)) { meta = m; break; }
          } catch (_) {}
        }
        // ˣȫȡ
        if (!meta) {
          const m2 = this.allMarkersMeta && this.allMarkersMeta.get(String(id));
          if (m2) meta = m2;
        }
        if (!meta) return;
        // °󶨣ȷͼƬָ
        this.attachPopupHandlers(meta);
      } catch (_) {}
    },
    // Auto-close favorite/custom popups when their markers leave the current view
    closeOffscreenFavoritePopups() {
      try {
        if (!this.map || !this.favoritesLayer) return;
        const bounds = this.map.getBounds();
        if (!bounds) return;
        const layers = Object.values(this.favoritesLayer._layers || {});
        for (const marker of layers) {
          try {
            if (typeof marker?.isPopupOpen !== 'function') continue;
            if (!marker.isPopupOpen()) continue;
            const latLng = marker.getLatLng && marker.getLatLng();
            if (!latLng) continue;
            if (!bounds.contains(latLng)) marker.closePopup && marker.closePopup();
          } catch (_) {}
        }
      } catch (_) {}
    },

    getDefaultView() {
      // Ҽţĵ㣨ԭϷŴ 2 
      const presets = {
        japan: { center: [36.2048, 138.2529], zoom: 5 },
        china: { center: [35.8617, 104.1954], zoom: 4 },
        america: { center: [39.8283, -98.5795], zoom: 4 },
        canada: { center: [56.1304, -106.3468], zoom: 3 },
        mexico: { center: [23.6345, -102.5528], zoom: 5 },
        australia: { center: [-25.2744, 133.7751], zoom: 4 },
        iceland: { center: [64.9631, -19.0208], zoom: 5 },
        denmark: { center: [56.2639, 9.5018], zoom: 5 },
        newzealand: { center: [-40.9006, 174.8860], zoom: 5 },
        singapore: { center: [1.3521, 103.8198], zoom: 9 },
        malaysia: { center: [4.2105, 101.9758], zoom: 6 },
        thailand: { center: [15.8700, 100.9925], zoom: 5 },
        vietnam: { center: [14.0583, 108.2772], zoom: 5 },
        switzerland: { center: [46.8182, 8.2275], zoom: 6 },
        france: { center: [46.5, 2.5], zoom: 5 },
        germany: { center: [51.0, 10.0], zoom: 5 },
        uk: { center: [55.0, -2.5], zoom: 5 },
        spain: { center: [40.0, -3.5], zoom: 5 },
        italy: { center: [42.5, 12.5], zoom: 5 },
        portugal: { center: [39.5, -8.0], zoom: 6 },
        netherlands: { center: [52.1, 5.3], zoom: 6 },
        sweden: { center: [62.0, 15.0], zoom: 4 },
        norway: { center: [64.5, 11.0], zoom: 4 },
        austria: { center: [47.6, 14.1], zoom: 6 },
        belgium: { center: [50.8, 4.5], zoom: 6 },
        finland: { center: [64.5, 26.0], zoom: 4 },
        luxembourg: { center: [49.8, 6.1], zoom: 7 },
        hungary: { center: [47.2, 19.0], zoom: 6 },
        czech: { center: [49.8, 15.5], zoom: 6 },
        slovakia: { center: [48.7, 19.7], zoom: 6 },
        greece: { center: [39.0, 22.0], zoom: 6 },
        croatia: { center: [45.1, 16.4], zoom: 6 },
        lithuania: { center: [55.2, 23.9], zoom: 6 },
        latvia: { center: [56.8, 24.6], zoom: 6 },
        estonia: { center: [58.7, 25.0], zoom: 6 },
        korea: { center: [36.5, 127.8], zoom: 6 },
        indonesia: { center: [-2.5, 118.0], zoom: 4 },
        srilanka: { center: [7.8, 80.7], zoom: 7 },
        maldives: { center: [3.2, 73.0], zoom: 7 },
        argentina: { center: [-38.4, -63.6], zoom: 4 },
        uruguay: { center: [-32.5, -55.8], zoom: 6 },
        brazil: { center: [-14.2, -51.9], zoom: 3 },
        paraguay: { center: [-23.4, -58.4], zoom: 5 },
        peru: { center: [-9.1, -75.0], zoom: 5 },
        chile: { center: [-35.7, -71.5], zoom: 4 },
        bolivia: { center: [-16.7, -64.6], zoom: 5 },
        morocco: { center: [31.8, -7.1], zoom: 5 },
        egypt: { center: [26.8, 30.8], zoom: 5 },
        southafrica: { center: [-29.0, 24.0], zoom: 5 },
        madagascar: { center: [-19.0, 46.5], zoom: 5 },
        israel: { center: [31.0, 35.0], zoom: 7 },
        turkey: { center: [39.0, 35.0], zoom: 5 },
        saudiarabia: { center: [24.0, 45.0], zoom: 5 },
        uae: { center: [24.0, 54.0], zoom: 7 },
        qatar: { center: [25.3, 51.2], zoom: 7 },
      };
      // ҳ·ɹΪ customʹбңquery.listCountryΪĬӽ
      let key = String(this.country || '').toLowerCase();
      if (key === 'custom') {
        const resolved = (this.normalsCountry && String(this.normalsCountry).toLowerCase()) || (this.getListCountryFromQuery().toLowerCase());
        if (resolved) key = resolved;
      }
      const base = presets[key] || { center: [20, 0], zoom: 2 };
      return { center: base.center, zoom: Math.min((base.zoom || 2) + 2, 18) };
    },

    async renderFavoritesMarkers() {
      this.favoritesLayer.clearLayers();
      if (!this.favorites.length) return;

      // ԴԴҷѯ
      const customs = this.favorites.filter(f => String(f.country) === 'custom');
      const normals = this.favorites.filter(f => String(f.country) !== 'custom');

      let geoMap = new Map(); // key: country|id -> record
      if (normals.length) {
        const groups = new Map();
        for (const n of normals) {
          const c = String(n.country || this.country);
          if (!groups.has(c)) groups.set(c, []);
          groups.get(c).push(n.id);
        }
        for (const [ctry, ids] of groups.entries()) {
          try {
            const data = await fetchAttractionsGeoByIds(ctry, ids);
            if (Array.isArray(data)) {
              for (const r of data) geoMap.set(`${ctry}|${String(r.id)}`, { ...r, country: ctry });
            }
          } catch (e) {}
        }
      }

      // ƣ첽ӣȱ룩
      let firstCenter = null;
      const latlngsForFit = [];
      let nonPendingIndex = 0;
      const pendingTasks = [];
      this._favGeoPending = 0;

      const renderOne = (latlng, meta, orderText, isPendingFlag) => {
        if (!latlng) return;
        if (!firstCenter) firstCenter = latlng;
        latlngsForFit.push(latlng);
        const icon = this.createFavoriteIcon(orderText || '', isPendingFlag);
        const marker = L.marker(latlng, { icon, pane: 'favoritesPane', zIndexOffset: 1000 });
        try { marker.options._meta = meta; } catch (e) {}
        try { marker.options._origLatLng = L.latLng(latlng[0], latlng[1]); } catch (e) {}
        this.bindPopupNoAutoPan(marker, meta);
        marker.on('popupopen', () => this.attachPopupHandlers(meta));
        marker.addTo(this.favoritesLayer);
        // صղرκŶҪţ
        try { this.scheduleRecomputeOverlapAll(); } catch (e) {}
        if (!this._hasRenderedFirst) { this._hasRenderedFirst = true; this.showLoading = false; }
      };

      for (let i = 0; i < this.favorites.length; i++) {
        const fav = this.favorites[i];
        const isPending = !!fav.pending;
        if (!isPending) nonPendingIndex++;
        const orderText = isPending ? '' : String(nonPendingIndex);

        // ֻҪԴҵ idղΪ customԴ߼ǰ·ɹң
        const isCustomFav = (String(fav.country) === 'custom') || !!findCustomAttractionById(String(fav.id));
        if (isCustomFav) {
          const ca = findCustomAttractionById(String(fav.id));
          const meta = {
            id: String(fav.id),
            name: (fav.name || (ca && ca.name) || 'δ'),
            region: (fav.region || (ca && ca.region) || ''),
            county: (fav.county || (ca && ca.county) || ''),
            rating: Number.isFinite(fav.rating) ? fav.rating : (ca && ca.rating) || 0,
            hasImage: !!(ca && (ca.hasImage1 || ca.hasImage2 || ca.hasImage3)),
            country: 'custom',
          };
          let latlng = null;
          if (ca && Number.isFinite(ca.lat) && Number.isFinite(ca.lng)) {
            try { console.info('[Geo] use direct custom latlng', { id: String(fav.id), lat: Number(ca.lat), lng: Number(ca.lng) }); } catch(_) {}
            latlng = [Number(ca.lat), Number(ca.lng)];
            renderOne(latlng, meta, orderText, isPending);
            // 从详情页进入时，直接聚焦到该自创景点
            if (this.fromDetails && String(this.focusId) === String(fav.id)) {
              try { this.map.setView(latlng, 14); } catch (e) {}
              this._didAutoPanToFirst = true;
              this._hasRenderedFirst = true;
              this.showLoading = false;
            }
          } else if (ca) {
            const cacheKey = `custom|${String(fav.id)}`;
            const cached = this._geoGet(cacheKey);
            if (cached) {
              try { console.info('[Geo] use cache', { source: 'browser', key: cacheKey, id: String(fav.id), lat: cached.lat, lng: cached.lng }); } catch(_) {}
              latlng = [cached.lat, cached.lng];
              renderOne(latlng, meta, orderText, isPending);
              // 从详情页进入时，使用缓存也需立即聚焦
              if (this.fromDetails && String(this.focusId) === String(fav.id)) {
                try { this.map.setView(latlng, 14); } catch (e) {}
                this._didAutoPanToFirst = true;
                this._hasRenderedFirst = true;
                this.showLoading = false;
              }
            } else {
              // ڴҳ۽ʱŽе
              if (this.fromDetails && String(this.focusId) === String(fav.id)) {
                this._favGeoPending++;
                const task = (async () => {
                  try {
                    const _addr = `${ca.position || ''} ${ca.name || ''} ${ca.region || ''} ${ca.county || ''}`.trim();
                    const routeKey = String(this.country || '').toLowerCase();
                    // ǷĽ hintCountryAMap ŵ󶵵
                    const disableChinaHint = !!(ca && ca.disableChinaHint);
                    const isChinesePosition = !disableChinaHint && /[\u4e00-\u9fa5]/.test(String(ca.position || ''));
                    const hintKey = isChinesePosition ? 'china' : 'custom';
                    try { console.info('[Geo] start geocode (custom favorite - focus from details)', { id: String(fav.id), address: _addr, hintCountry: hintKey }); } catch(_) {}
                    const g = await this.geocodeByFreeApi(_addr, hintKey, { amapLast: hintKey !== 'china' });
                    if (g) {
                      this._geoPut(cacheKey, g.lat, g.lng);
                      const ll = [g.lat, g.lng];
                      renderOne(ll, meta, orderText, isPending);
                      // 从详情页进入时，首次地理编码完成后立即聚焦
                      try { this.map.setView(ll, 14); } catch (e) {}
                      this._didAutoPanToFirst = true;
                      this._hasRenderedFirst = true;
                      this.showLoading = false;
                    }
                  } catch (e) {}
                  finally {
                    this._favGeoPending = Math.max(0, this._favGeoPending - 1);
                    if (this._favGeoPending === 0 && !this._didFinalFitFavorites && !this._blockFavFit) {
                      try {
                        const layers = Object.values(this.favoritesLayer._layers || {});
                        const bounds = L.latLngBounds(layers.map(l => l.getLatLng && l.getLatLng()).filter(Boolean));
                        if (bounds && bounds.isValid() && this.canAutoCenter()) this.map.fitBounds(bounds, { padding: [40, 40], animate: false });
                      } catch (e) {}
                      this._didFinalFitFavorites = true;
                      this._didInitCenter = true;
                    }
                  }
                })();
                pendingTasks.push(task);
              } else {
                // бͼԴҲҪе루޻棩
                this._favGeoPending++;
                const task = (async () => {
                  try {
                    const _addr = `${ca.position || ''} ${ca.name || ''} ${ca.region || ''} ${ca.county || ''}`.trim();
                    const disableChinaHint = !!(ca && ca.disableChinaHint);
                    const isChinesePosition = !disableChinaHint && /[\u4e00-\u9fa5]/.test(String(ca.position || ''));
                    const hintKey = isChinesePosition ? 'china' : 'custom';
                    try { console.info('[Geo] start geocode (custom favorite - from list)', { id: String(fav.id), address: _addr, hintCountry: hintKey }); } catch(_) {}
                    const g = await this.geocodeByFreeApi(_addr, hintKey, { amapLast: hintKey !== 'china', fallbackHintCountry: 'custom' });
                    if (g) {
                      this._geoPut(cacheKey, g.lat, g.lng);
                      renderOne([g.lat, g.lng], meta, orderText, isPending);
                    }
                  } catch (e) {console.info(e)}
                  finally {
                    this._favGeoPending = Math.max(0, this._favGeoPending - 1);
                    if (this._favGeoPending === 0 && !this._didFinalFitFavorites && !this._blockFavFit) {
                      try {
                        const layers = Object.values(this.favoritesLayer._layers || {});
                        const bounds = L.latLngBounds(layers.map(l => l.getLatLng && l.getLatLng()).filter(Boolean));
                        if (bounds && bounds.isValid() && this.canAutoCenter()) this.map.fitBounds(bounds, { padding: [40, 40], animate: false });
                      } catch (e) {}
                      this._didFinalFitFavorites = true;
                      this._didInitCenter = true;
                    }
                  }
                })();
                pendingTasks.push(task);
              }
            }
          }
        } else {
          const ctry = String(fav.country || this.country);
          const key = `${ctry}|${String(fav.id)}`;
          const geo = geoMap.get(key);
          if (geo && Number.isFinite(geo.lat) && Number.isFinite(geo.lng)) {
            try { console.info('[Geo] use server geo', { id: String(fav.id), lat: geo.lat, lng: geo.lng, country: ctry }); } catch(_) {}
            try { this._geoPut(`${ctry}|${String(fav.id)}`, Number(geo.lat), Number(geo.lng)); } catch (e) {}
            renderOne([geo.lat, geo.lng], geo, orderText, isPending);
          } else {
            const cacheKey = `${ctry}|${String(fav.id)}`;
            const cached = this._geoGet(cacheKey);
            if (cached) {
              try { console.info('[Geo] use cache', { source: 'browser', key: cacheKey, id: String(fav.id), lat: cached.lat, lng: cached.lng, country: ctry }); } catch(_) {}
              const meta = { id: fav.id, name: fav.name || '', region: fav.region || '', county: fav.county || '', rating: fav.rating, country: ctry, hasImage: false };
              renderOne([cached.lat, cached.lng], meta, orderText, isPending);
            } else {
              // ڴҳ۽ʱŽе
              if (this.fromDetails && String(this.focusId) === String(fav.id)) {
                this._favGeoPending++;
                const task = (async () => {
                  try {
                    const rows = await fetchAttractionsPositionsByIds(ctry, [fav.id]);
                    const p = (Array.isArray(rows) && rows[0]) || null;
                    const metaC = this._getCountryMeta(String(ctry || '').toLowerCase());
                    const countryText = (metaC && metaC.labelEn) || (metaC && metaC.iso2) || '';
                    const address = p
                      ? `${p.position || ''} ${p.name || ''} ${p.region || ''} ${p.county || ''} ${countryText}`.trim()
                      : `${fav.position || ''} ${fav.name || ''} ${fav.region || ''} ${fav.county || ''} ${countryText}`.trim();
                    try { console.info('[Geo] start geocode (favorite normal - focus from details)', { id: String(fav.id), address, hintCountry: ctry }); } catch(_) {}
                    const g = await this.geocodeByFreeApi(address, ctry, { amapLast: !!this.fromDetails });
                    if (g) {
                      this._geoPut(cacheKey, g.lat, g.lng);
                      const meta = { id: fav.id, name: fav.name || (p && p.name) || '', region: fav.region || (p && p.region) || '', county: fav.county || (p && p.county) || '', rating: fav.rating, country: ctry, hasImage: !!(p && p.hasImage) };
                      renderOne([g.lat, g.lng], meta, orderText, isPending);
                    }
                  } catch (e) {}
                  finally {
                    this._favGeoPending = Math.max(0, this._favGeoPending - 1);
                    if (this._favGeoPending === 0 && !this._didFinalFitFavorites && !this._blockFavFit) {
                      try {
                        const layers = Object.values(this.favoritesLayer._layers || {});
                        const bounds = L.latLngBounds(layers.map(l => l.getLatLng && l.getLatLng()).filter(Boolean));
                        if (bounds && bounds.isValid() && this.canAutoCenter()) this.map.fitBounds(bounds, { padding: [40, 40], animate: false });
                      } catch (e) {}
                      this._didFinalFitFavorites = true;
                      this._didInitCenter = true;
                    }
                  }
                })();
                pendingTasks.push(task);
              } else {
                // ݣղʵǡԴȱ country ǣԽԴ
                try {
                  const caMaybe = findCustomAttractionById(String(fav.id));
                  if (caMaybe) {
                    this._favGeoPending++;
                    const task2 = (async () => {
                      try {
                        const _addr2 = `${caMaybe.position || ''} ${caMaybe.name || ''} ${caMaybe.region || ''} ${caMaybe.county || ''}`.trim();
                        const disableChinaHint2 = !!(caMaybe && caMaybe.disableChinaHint);
                        const isChinesePosition2 = !disableChinaHint2 && /[\u4e00-\u9fa5]/.test(String(caMaybe.position || ''));
                        const hintKey2 = isChinesePosition2 ? 'china' : 'custom';
                        // Align with focus custom logic: derive hint from routeKey when route is not 'custom'
                        // 列表页与详情页自创一致：仅按 position 是否中文决定 china/custom
                        try { console.info('[Geo] start geocode (custom favorite - legacy from list)', { id: String(fav.id), address: _addr2, hintCountry: hintKey2 }); } catch(_) {}
                        const g2 = await this.geocodeByFreeApi(_addr2, hintKey2, { amapLast: hintKey2 !== 'china', fallbackHintCountry: 'custom' });
                        if (g2) {
                          // 浽Դռ
                          this._geoPut(`custom|${String(fav.id)}`, g2.lat, g2.lng);
                          const meta2 = { id: String(fav.id), name: caMaybe.name || '', region: caMaybe.region || '', county: caMaybe.county || '', rating: Number.isFinite(fav.rating) ? fav.rating : 0, country: 'custom', hasImage: !!(caMaybe.hasImage1 || caMaybe.hasImage2 || caMaybe.hasImage3) };
                          renderOne([g2.lat, g2.lng], meta2, orderText, isPending);
                        }
                      } catch (e) {}
                      finally {
                        this._favGeoPending = Math.max(0, this._favGeoPending - 1);
                        if (this._favGeoPending === 0 && !this._didFinalFitFavorites && !this._blockFavFit) {
                          try {
                            const layers = Object.values(this.favoritesLayer._layers || {});
                            const bounds = L.latLngBounds(layers.map(l => l.getLatLng && l.getLatLng()).filter(Boolean));
                            if (bounds && bounds.isValid() && this.canAutoCenter()) this.map.fitBounds(bounds, { padding: [40, 40], animate: false });
                          } catch (e) {}
                          this._didFinalFitFavorites = true;
                          this._didInitCenter = true;
                        }
                      }
                    })();
                    pendingTasks.push(task2);
                  } else {
                    // From list: geocode normal favorite as in details-focus flow
                    this._favGeoPending++;
                    const task3 = (async () => {
                      try {
                        const rows2 = await fetchAttractionsPositionsByIds(ctry, [fav.id]);
                        const p2 = (Array.isArray(rows2) && rows2[0]) || null;
                        const metaC2 = this._getCountryMeta(String(ctry || '').toLowerCase());
                        const countryText2 = (metaC2 && metaC2.labelEn) || (metaC2 && metaC2.iso2) || '';
                        const address2 = p2
                          ? `${p2.position || ''} ${p2.name || ''} ${p2.region || ''} ${p2.county || ''} ${countryText2}`.trim()
                          : `${fav.position || ''} ${fav.name || ''} ${fav.region || ''} ${fav.county || ''} ${countryText2}`.trim();
                        if (address2) {
                          const isChinese2 = /[\u4e00-\u9fa5]/.test(String(address2 || ''));
                          const hintKeyNormal = isChinese2 ? 'china' : 'custom';
                          // Match details focus: use route country as hint; keep provider order same as details (amapLast follows fromDetails)
                          try { console.info('[Geo] start geocode (favorite normal - from list)', { id: String(fav.id), address: address2, hintCountry: ctry }); } catch(_) {}
                          const g3 = await this.geocodeByFreeApi(address2, ctry, { amapLast: !!this.fromDetails });
                          if (g3) {
                            this._geoPut(cacheKey, g3.lat, g3.lng);
                            const meta3 = { id: fav.id, name: fav.name || (p2 && p2.name) || '', region: fav.region || (p2 && p2.region) || '', county: fav.county || (p2 && p2.county) || '', rating: fav.rating, country: ctry, hasImage: !!(p2 && p2.hasImage) };
                            renderOne([g3.lat, g3.lng], meta3, orderText, isPending);
                          }
                        }
                      } catch (e) {}
                      finally {
                        this._favGeoPending = Math.max(0, this._favGeoPending - 1);
                        if (this._favGeoPending === 0 && !this._didFinalFitFavorites && !this._blockFavFit) {
                          try {
                            const layers = Object.values(this.favoritesLayer._layers || {});
                            const bounds = L.latLngBounds(layers.map(l => l.getLatLng && l.getLatLng()).filter(Boolean));
                            if (bounds && bounds.isValid() && this.canAutoCenter()) this.map.fitBounds(bounds, { padding: [40, 40], animate: false });
                          } catch (e) {}
                          this._didFinalFitFavorites = true;
                          this._didInitCenter = true;
                        }
                      }
                    })();
                    pendingTasks.push(task3);
                  }
                } catch (_) {
                  try { console.info('[Geo] skip geocode (favorite normal - not focus from details)', { id: String(fav.id) }); } catch(_) {}
                }
              }
            }
          }
        }
      }

      // Σûд첽ʱ
      if (firstCenter && !this._didInitCenter && pendingTasks.length === 0 && !this._blockFavFit) {
        try {
          if (this.canAutoCenter()) {
            if (latlngsForFit.length >= 1) {
              const b = L.latLngBounds(latlngsForFit);
              this.map.fitBounds(b, { padding: [40, 40], animate: false });
            } else {
              const { zoom } = this.getDefaultView();
              this.map.setView(firstCenter, zoom);
            }
          }
        } catch (e) {}
        this._didInitCenter = true;
        this._didFinalFitFavorites = true;
      }

      // ȫ첽ɺٴղطΧ
      if (pendingTasks.length) {
        Promise.allSettled(pendingTasks).then(() => {
          if (!this._didFinalFitFavorites && !this._blockFavFit) {
            try {
              const layers = Object.values(this.favoritesLayer._layers || {});
              const bounds = L.latLngBounds(layers.map(l => l.getLatLng && l.getLatLng()).filter(Boolean));
              if (bounds && bounds.isValid() && this.canAutoCenter()) this.map.fitBounds(bounds, { padding: [40, 40], animate: false });
            } catch (e) {}
            this._didFinalFitFavorites = true;
            this._didInitCenter = true;
          }
        });
      }
    },

    async renderAllMarkers() {
      try {
        this.allLayer.clearLayers();
        let data = [];
        try { const res = await fetchAttractionsGeo(this.country); if (Array.isArray(res)) data = res; } catch (e) {}

        // ǰ˲ȫȱʧγȵͨе루ղһ£
        // 1) Զר geo ӿڣʹ positions ȫ롣
        // 2) ʹԶ geo ݣҲȱʧγȵĿ
        try {
          const pos = await fetchAttractionsPositions(this.country);
          if (Array.isArray(pos) && pos.length) {
            const byId = new Map();
            if (Array.isArray(data)) {
              for (const r of data) byId.set(String(r.id), r);
            }
            for (const p of pos) {
              const idStr = String(p.id);
              const existing = byId.get(idStr);
              const needGeocode = !existing || !Number.isFinite(existing.lat) || !Number.isFinite(existing.lng);
              if (!needGeocode) continue;
              const cacheKey = `${String(this.country)}|${idStr}`;
              const cached = this._geoGet(cacheKey);
              if (cached) {
                const item = {
                  id: p.id,
                  name: p.name,
                  region: p.region,
                  county: p.county,
                  rating: p.rating,
                  total_reviews: p.total_reviews,
                  lat: cached.lat,
                  lng: cached.lng,
                  hasImage: !!p.hasImage,
                  country: this.country,
                };
                if (existing) {
                  Object.assign(existing, item);
                } else {
                  data.push(item);
                  byId.set(idStr, item);
                }
              } else {
                // skip: no browser geocode cache; do not log
              }
            }
          }
        } catch (e) {}

        const bounds = this.map && this.map.getBounds ? this.map.getBounds() : null;
        const filters = this.getActiveFilters ? this.getActiveFilters() : { minReviews: 0, region: '', county: '' };
        for (const r of (data || [])) {
          if (!Number.isFinite(r.lat) || !Number.isFinite(r.lng)) continue;
          if (bounds && !bounds.contains(L.latLng(r.lat, r.lng))) continue;
          if (this.passFilters && !this.passFilters(r, filters)) continue;
          const latlng = [r.lat, r.lng];
          const ratingScore = this.getNumericRating(r.rating);
          const icon = this.createAllIcon(r.rating);
          const marker = L.marker(latlng, { icon, pane: 'allPane', zIndexOffset: 0 });
          try {
            marker.options._meta = r;
            marker.options._ratingScore = ratingScore;
            marker.options._origLatLng = L.latLng(latlng[0], latlng[1]);
          } catch (e) {}
          this.applyNormalMarkerZIndex(marker, ratingScore);
          this.bindPopupNoAutoPan(marker, r);
          marker.on('popupopen', () => this.attachPopupHandlers(r));
          marker.addTo(this.allLayer);
        }
        // ͳһзĴλղ + ͨ
        try { this.scheduleRecomputeOverlapAll(); } catch (e) {}
      } catch (e) {}
    },

    async fetchAllGeoOnce() {
      if (Array.isArray(this._allGeoData) && this._allGeoData.length) return;
      const isCustomCountry = String(this.country) === 'custom';
      const fetchCountry = isCustomCountry ? (this.normalsCountry || '') : String(this.country || '');
      if (!fetchCountry) return;
      try {
        let data = [];
        try { const res = await fetchAttractionsGeo(fetchCountry); if (Array.isArray(res)) data = res; } catch (e) {}
        // ǰ˲ȫȱʧγȵͨ㳢棨ղһ£
        try {
          const pos = await fetchAttractionsPositions(fetchCountry);
          if (Array.isArray(pos) && pos.length) {
            const byId = new Map();
            if (Array.isArray(data)) {
              for (const r of data) byId.set(String(r.id), r);
            }
            for (const p of pos) {
              const idStr = String(p.id);
              const existing = byId.get(idStr);
              const needGeocode = !existing || !Number.isFinite(existing.lat) || !Number.isFinite(existing.lng);
              if (!needGeocode) continue;
              const cacheKey = `${String(fetchCountry)}|${idStr}`;
              const cached = this._geoGet(cacheKey);
              if (cached) {
                const item = {
                  id: p.id,
                  name: p.name,
                  region: p.region,
                  county: p.county,
                  rating: p.rating,
                  total_reviews: p.total_reviews,
                  lat: cached.lat,
                  lng: cached.lng,
                  hasImage: !!p.hasImage,
                  country: fetchCountry,
                };
                if (existing) {
                  Object.assign(existing, item);
                } else {
                  data.push(item);
                  byId.set(idStr, item);
                }
              } else {
                // skip: no browser geocode cache; do not log
              }
            }
          }
        } catch (e) {}
        this._allGeoData = Array.isArray(data) ? data : [];
        // ͨб֮Դҽͼʱֱչʾ
        try { this._saveNormalsSnapshot(String(fetchCountry), this._allGeoData); } catch (e) {}
      } catch (e) { this._allGeoData = []; }
    },

    renderAllInView(isInteractive = false) {
      if (!this.map) return;
      const bounds = this.map.getBounds();
      const filters = this.getActiveFilters ? this.getActiveFilters() : { minReviews: 0, region: '', county: '' };

      // ȫɸѡǰĻڡͨͨ
      const visibleList = (this._allGeoData || []).filter(r => {
        if (!Number.isFinite(r.lat) || !Number.isFinite(r.lng)) return false;
        if (bounds && !bounds.contains(L.latLng(r.lat, r.lng))) return false;
        if (this.passFilters && !this.passFilters(r, filters)) return false;
        return true;
      });

      // ʴӸߵ
      visibleList.sort((a, b) => this.getNumericRating(b.rating) - this.getNumericRating(a.rating));

      // Incremental async rendering (diff only) to avoid blocking interactions
      const favIdSet_async = new Set();
      try { for (const f of (this.favorites || [])) { if (String(f.country || this.country) === String(this.country)) favIdSet_async.add(String(f.id)); } } catch (e) {}

      // Determine target ids within cap
      const limit_async = Math.min(visibleList.length, this._visibleCap);
      const targetIds = new Set();
      for (let _i = 0; _i < limit_async; _i++) {
        const r = visibleList[_i];
        const id = String(r.id);
        if (!favIdSet_async.has(id)) targetIds.add(id);
      }

      // Remove markers that are no longer visible
      for (const [id, m] of this.allMarkers.entries()) {
        if (!targetIds.has(id)) {
          try { this.allLayer.removeLayer(m); } catch (e) {}
          this.allMarkers.delete(id);
          this.allMarkersMeta.delete(id);
        }
      }

      // Collect items to add
      const toAdd = [];
      for (let _i = 0; _i < limit_async; _i++) {
        const r = visibleList[_i];
        const id = String(r.id);
        if (targetIds.has(id) && !this.allMarkers.has(id)) toAdd.push(r);
      }

      const seq_async = ++this._allRenderSeq;
      let i_async = 0;
      const chunkSize_async = isInteractive ? 1 : 25;
      const processChunk_async = () => {
        if (seq_async !== this._allRenderSeq) return; // aborted by a newer render
        let count = 0;
        while (i_async < toAdd.length && count < chunkSize_async) {
          const r = toAdd[i_async++];
          const id = String(r.id);
          const ratingScore = this.getNumericRating(r.rating);
          try { this._geoPut(`${String(r.country || this.country)}|${id}`, Number(r.lat), Number(r.lng)); } catch (e) {}
          const icon = this.createAllIcon(r.rating);
          const marker = L.marker([r.lat, r.lng], { icon, pane: 'allPane', zIndexOffset: 0 });
          try {
            marker.options._meta = r;
            marker.options._ratingScore = ratingScore;
            marker.options._origLatLng = L.latLng(r.lat, r.lng);
          } catch (e) {}
          this.applyNormalMarkerZIndex(marker, ratingScore);
          this.bindPopupNoAutoPan(marker, r);
          marker.on('popupopen', () => this.attachPopupHandlers(r));
          marker.addTo(this.allLayer);
          this.allMarkers.set(id, marker);
          this.allMarkersMeta.set(id, r);
          count++;
        }
        // update stats progressively
        this.statsRendered = this.allMarkers.size;
        this.statsNeverRendered = Math.max(0, visibleList.length - this.statsRendered);
        if (!this._hasRenderedNormalOnce && this.statsRendered > 0) {
          this._hasRenderedNormalOnce = true;
        }
        if (!this._hasRenderedFirst && this.statsRendered > 0) {
          this._hasRenderedFirst = true;
          this.showLoading = false;
        }
        if (i_async < toAdd.length) {
          this._scheduleIdle(processChunk_async);
        } else {
          // after all chunks
          try { this.scheduleRecomputeOverlapAll(); } catch (e) {}
        }
      };
      if (toAdd.length) {
        this._scheduleIdle(processChunk_async);
      } else {
        // still update stats and schedule overlap if needed
        this.statsRendered = this.allMarkers.size;
        this.statsNeverRendered = Math.max(0, visibleList.length - this.statsRendered);
        try { this.scheduleRecomputeOverlapAll(); } catch (e) {}
      }

      // 当视野内没有任何要显示的普通景点时，
      // 且当前激活收藏列表为空，或收藏存在但无法得到任何有效经纬度，
      // 自动将中心平移到第一个可显示的普通景点，保持当前缩放级别不变。
      try {
        const hasFavItems = Array.isArray(this.favorites) && this.favorites.length > 0;
        const hasFavMarkers = !!(this.favoritesLayer && this.favoritesLayer._layers && Object.keys(this.favoritesLayer._layers).length > 0);
        const favListEmpty = !hasFavItems;
        const favGeoMissing = hasFavItems && !hasFavMarkers && this._favGeoPending === 0;
        if (this.map && !this._didAutoPanToFirst && !this._hasRenderedNormalOnce && visibleList.length === 0 && (favListEmpty || favGeoMissing)) {
          const currentZoom = this.map.getZoom();
          const b = bounds;
          const f = filters;
          const candidates = (this._allGeoData || [])
            .filter(r => Number.isFinite(r.lat) && Number.isFinite(r.lng))
            .filter(r => (this.passFilters ? this.passFilters(r, f) : true))
            .sort((a, b2) => this.getNumericRating(b2.rating) - this.getNumericRating(a.rating));
          if (candidates.length) {
            let target = null;
            if (b && b.isValid && b.isValid()) {
              target = candidates.find(r => !b.contains(L.latLng(r.lat, r.lng))) || candidates[0];
            } else {
              target = candidates[0];
            }
            if (target) {
              this._didAutoPanToFirst = true;
              try { this.map.setView([target.lat, target.lng], currentZoom, { animate: false }); } catch (e) {}
            }
          }
        }
      } catch (e) {}

      return;

      // ͨǣղز۽㣩
      try { this.allLayer.clearLayers(); } catch (e) {}
      this.allMarkers.clear();
      this.allMarkersMeta.clear();

      // Ⱦ 600 
      // صλ飺ͬһγȵıǺ
      const overlapGroups = new Map();
      const getOverlapKey = (r) => `${Number(r.lat).toFixed(6)},${Number(r.lng).toFixed(6)}`;
      const repositionGroup = (g) => {
        try {
          const n = g.markers.length;
          if (!this.map || n <= 1) return;
          const center = L.latLng(g.center[0], g.center[1]);
          const z = this.map.getZoom();
          if (!Number.isFinite(z) || z < this._overlapZoomThreshold) {
            // Ų󣺲ص
            for (let i = 0; i < n; i++) {
              try { g.markers[i].setLatLng(center); } catch (e) {}
            }
            return;
          }
          const spacing = 18; // ͨСļ
          const cp = this.map.latLngToLayerPoint(center);
          for (let i = 0; i < n; i++) {
            const dx = (i - (n - 1) / 2) * spacing;
            const p2 = L.point(cp.x + dx, cp.y);
            const ll2 = this.map.layerPointToLatLng(p2);
            try { g.markers[i].setLatLng(ll2); } catch (e) {}
          }
        } catch (e) {}
      };

      // ǰڵղ ID ϣͬʱȾͨղصظ
      const favIdSet = new Set();
      try { for (const f of (this.favorites || [])) { if (String(f.country || this.country) === String(this.country)) favIdSet.add(String(f.id)); } } catch (e) {}

      const limit = Math.min(visibleList.length, this._visibleCap);
      for (let i = 0; i < limit; i++) {
        const r = visibleList[i];
        const id = String(r.id);
        // þղزȾͨ㣬ظ
        if (favIdSet.has(id)) continue;
        // ͨľγȣ´μٶ
        try { this._geoPut(`${String(r.country || this.country)}|${id}`, Number(r.lat), Number(r.lng)); } catch (e) {}
        const ratingScore = this.getNumericRating(r.rating);
        const icon = this.createAllIcon(r.rating);
        const marker = L.marker([r.lat, r.lng], { icon, pane: 'allPane', zIndexOffset: 0 });
        try {
          marker.options._meta = r;
          marker.options._ratingScore = ratingScore;
          marker.options._origLatLng = L.latLng(r.lat, r.lng);
        } catch (e) {}
        this.applyNormalMarkerZIndex(marker, ratingScore);
        this.bindPopupNoAutoPan(marker, r);
        marker.on('popupopen', () => this.attachPopupHandlers(r));
        marker.addTo(this.allLayer);
        this.allMarkers.set(id, marker);
        this.allMarkersMeta.set(id, r);

        // ص¼鲢¶λ
        try {
          const k = getOverlapKey(r);
          if (!overlapGroups.has(k)) overlapGroups.set(k, { center: [r.lat, r.lng], markers: [] });
          const g = overlapGroups.get(k);
          g.markers.push(marker);
          repositionGroup(g);
        } catch (e) {}
      }

      // Ⱦͳ
      this.statsRendered = this.allMarkers.size;
      this.statsNeverRendered = Math.max(0, visibleList.length - this.statsRendered);
      if (!this._hasRenderedNormalOnce && this.statsRendered > 0) {
        this._hasRenderedNormalOnce = true;
      }
      if (!this._hasRenderedFirst && this.statsRendered > 0) {
        this._hasRenderedFirst = true;
        this.showLoading = false;
      }

      // ǰҰûκӦʾͨ㣬ƽƵĻĵһѡ㣨ıţ
      try {
        const hasFavMarkers = !!(this.favoritesLayer && this.favoritesLayer._layers && Object.keys(this.favoritesLayer._layers).length > 0);
        if (this.map && !this._didAutoPanToFirst && !this._hasRenderedNormalOnce && this.allMarkers.size === 0 && !hasFavMarkers) {
          const currentZoom = this.map.getZoom();
          const b = bounds;
          const f = this.getActiveFilters ? this.getActiveFilters() : { minReviews: 0, region: '', county: '' };
          const candidates = (this._allGeoData || [])
            .filter(r => Number.isFinite(r.lat) && Number.isFinite(r.lng))
            .filter(r => (this.passFilters ? this.passFilters(r, f) : true))
            .sort((a, b) => this.getNumericRating(b.rating) - this.getNumericRating(a.rating));
          if (candidates.length) {
            let target = null;
            if (b && b.isValid && b.isValid()) {
              target = candidates.find(r => !b.contains(L.latLng(r.lat, r.lng))) || candidates[0];
            } else {
              target = candidates[0];
            }
            if (target) {
              this._didAutoPanToFirst = true;
              this.map.setView([target.lat, target.lng], currentZoom, { animate: false });
            }
          }
        }
      } catch (e) {}
    },

    async focusSpecificAttraction() {
      const id = String(this.focusId);
      const inFav = (String(this.country) === 'custom')
        ? this.favorites.some(f => String(f.id) === id)
        : this.favorites.some(f => String(f.id) === id && String(f.country) === String(this.country));

      let latlng = null;
      let meta = null;
      let focusMarker = null;

      if (String(this.country) === 'custom') {
        const ca = findCustomAttractionById(id);
        if (ca && Number.isFinite(ca.lat) && Number.isFinite(ca.lng)) {
          try { console.info('[Geo] use direct custom latlng (focus)', { id, lat: Number(ca.lat), lng: Number(ca.lng) }); } catch(_) {}
          latlng = [Number(ca.lat), Number(ca.lng)];
        } else if (ca) {
          const cacheKey = `custom|${id}`;
          const cached = this._geoGet(cacheKey);
          if (cached) {
            try { console.info('[Geo] use cache (focus)', { source: 'browser', key: cacheKey, id, lat: cached.lat, lng: cached.lng }); } catch(_) {}
            latlng = [cached.lat, cached.lng];
          } else {
            if (this.fromDetails) {
              // 从详情页进入时，避免重复地理编码：renderFavoritesMarkers 已处理
              try {
                const layers = this.favoritesLayer && this.favoritesLayer._layers;
                if (layers) {
                  for (const key of Object.keys(layers)) {
                    const m = layers[key];
                    const mid = (m && m.options && m.options._meta && String(m.options._meta.id)) || '';
                    if (mid === id && m.getLatLng) {
                      const ll = m.getLatLng();
                      if (ll) latlng = [ll.lat, ll.lng];
                      break;
                    }
                  }
                }
              } catch (e) {}
            } else {
              const _addr = `${ca.position || ''} ${ca.name || ''} ${ca.region || ''} ${ca.county || ''}`.trim();
              const routeKey = String(this.country || '').toLowerCase();
              const hasMeta = !!this._getCountryMeta(routeKey);

              const disableChinaHint = !!(ca && ca.disableChinaHint);
              const isChinesePosition = !disableChinaHint && /[\u4e00-\u9fa5]/.test(String(ca.position || ''));
              const hintKey = (String(routeKey) === 'custom') ? (isChinesePosition ? 'china' : 'custom') : routeKey;
              try { console.info('[Geo] start geocode (focus custom)', { id, address: _addr, hintCountry: hintKey, amapLast: hintKey !== 'china' }); } catch(_) {}

              this._favGeoPending++;
              (async () => {
                try {
                  const g = await this.geocodeByFreeApi(_addr, hintKey, { amapLast: hintKey !== 'china', fallbackHintCountry: 'custom' });
                  if (g) {
                    this._geoPut(cacheKey, g.lat, g.lng);

                    const cityZoom = 14;
                    const targetZoom = this.fromDetails ? cityZoom : this.getDefaultView().zoom;
                    const ll = [g.lat, g.lng];
                    try { this.map.setView(ll, targetZoom); } catch (e) {}
                    try {
                      // 自创景点：不添加普通聚焦标记，只补充收藏标记（若不存在）
                      if (!this._hasFavMarker(id)) {
                        const iconFav = this.createFavoriteIcon('', false);
                        const markerFav = L.marker(ll, { icon: iconFav, pane: 'favoritesPane', zIndexOffset: 1000 });
                        const metaLater = ca ? { id, name: ca.name, region: ca.region, county: ca.county, rating: (Number.isFinite(ca && ca.rating) ? ca.rating : 0), country: 'custom', hasImage: !!(ca.hasImage1 || ca.hasImage2 || ca.hasImage3) } : null;
                        if (metaLater) {
                          try { markerFav.options._meta = metaLater; } catch (e) {}
                          try { markerFav.options._origLatLng = L.latLng(ll[0], ll[1]); } catch (e) {}
                          this.bindPopupNoAutoPan(markerFav, metaLater);
                          markerFav.on('popupopen', () => this.attachPopupHandlers(metaLater));
                        }
                        markerFav.addTo(this.favoritesLayer);
                        focusMarker = markerFav;
                      }
                    } catch (e) {}

                    if (this.fromDetails) this._didAutoPanToFirst = true;
                    try { this._hasRenderedFirst = true; this.showLoading = false; } catch (e) {}
                  }
                } catch (e) {}
                finally {
                  this._favGeoPending = Math.max(0, this._favGeoPending - 1);
                }
              })();
            }
          }
        }
        meta = ca ? { id, name: ca.name, region: ca.region, county: ca.county, rating: (Number.isFinite(ca && ca.rating) ? ca.rating : 0), country: 'custom', hasImage: !!(ca.hasImage1 || ca.hasImage2 || ca.hasImage3) } : null;
        // 若已有收藏层 marker，则直接作为聚焦弹窗目标
        if (!focusMarker) {
          try {
            const layers = this.favoritesLayer && this.favoritesLayer._layers;
            if (layers) {
              for (const key of Object.keys(layers)) {
                const m = layers[key];
                const mmeta = m && m.options && m.options._meta;
                if (mmeta && String(mmeta.id) === id && String(mmeta.country || 'custom') === 'custom') {
                  focusMarker = m;
                  break;
                }
              }
            }
          } catch (e) {}
        }
      } else {
        try {
          const arr = await fetchAttractionsGeoByIds(this.country, [id]);
          const r = (Array.isArray(arr) && arr[0]) || null;
          if (r && Number.isFinite(r.lat) && Number.isFinite(r.lng)) {
            try { console.info('[Geo] use server geo (focus)', { id, lat: r.lat, lng: r.lng, country: this.country }); } catch(_) {}
            try { this._geoPut(`${String(this.country)}|${id}`, Number(r.lat), Number(r.lng)); } catch (e) {}
            latlng = [r.lat, r.lng];
            meta = r;
          }
        } catch (e) {}
        if (!latlng) {
          try {
            const rows = await fetchAttractionsPositionsByIds(this.country, [id]);
            const p = (Array.isArray(rows) && rows[0]) || null;
            const cacheKey = `${String(this.country)}|${id}`;
            const cached = this._geoGet(cacheKey);
            if (cached) {
              try { console.info('[Geo] use cache (focus)', { source: 'browser', key: cacheKey, id, lat: cached.lat, lng: cached.lng, country: this.country }); } catch(_) {}
              latlng = [cached.lat, cached.lng];
              meta = p || meta;
            } else {
              const metaC = this._getCountryMeta(String(this.country || '').toLowerCase());
              const countryText = (metaC && metaC.labelEn) || (metaC && metaC.iso2) || '';
              const address = p ? `${p.position || ''} ${p.name || ''} ${p.region || ''} ${p.county || ''} ${countryText}`.trim() : '';
              if (address) {
                try { console.info('[Geo] start geocode (focus normal - from details)', { id, address, hintCountry: this.country, amapLast: !!this.fromDetails }); } catch(_) {}
                const g = await this.geocodeByFreeApi(address, this.country, { amapLast: !!this.fromDetails });
                if (g) { latlng = [g.lat, g.lng]; meta = p || meta; this._geoPut(cacheKey, g.lat, g.lng); }
              }
            }
          } catch (e) {}
        }
      }

      if (!latlng) return;

      const { zoom } = this.getDefaultView();
      const cityZoom = 14;
      const targetZoom = this.fromDetails ? cityZoom : zoom;
      const shouldKeepView = !!this._shouldRestoreView;
      if (!shouldKeepView) {
        this.map.setView(latlng, targetZoom);
        if (this.fromDetails) this._didAutoPanToFirst = true;
      } else if (this.fromDetails) {
        // ͨصļӷֶƣӦصĿ
        this._didAutoPanToFirst = true;
      }

      if (String(this.country) !== 'custom' && (!inFav || !this._hasFavMarker(id))) {
        this.focusedLayer.clearLayers();
        const icon = this.createFocusIcon();
        const marker = L.marker(latlng, { icon, pane: 'focusPane', zIndexOffset: 500 });
        if (meta) {
          try { marker.options._meta = meta; } catch (e) {}
          this.bindPopupNoAutoPan(marker, meta);
          marker.on('popupopen', () => this.attachPopupHandlers(meta));
        }
        marker.addTo(this.focusedLayer);
        focusMarker = marker;
      }

      // 自动弹出聚焦景点气泡
      if (focusMarker && typeof focusMarker.openPopup === 'function') {
        this.$nextTick(() => {
          try { focusMarker.openPopup(); } catch (e) {}
        });
      }

      try {
        this._hasRenderedFirst = true;
        this.showLoading = false;
      } catch (e) {}
    },


    async geocodeByFreeApi(address, hintCountry, opts = {}) {
      const trimAddr = String(address || '').trim();
      if (!trimAddr) return null;

      const env = import.meta && import.meta.env ? import.meta.env : {};
      const amapKey = env.VITE_AMAP_KEY;

      const openCageKey = env.VITE_OPENCAGE_KEY;
      const geoapifyKey = env.VITE_GEOAPIFY_KEY;
      const locationIqKey = env.VITE_LOCATIONIQ_KEY;
      const mapQuestKey = env.VITE_MAPQUEST_KEY;
      const positionstackKey = env.VITE_POSITIONSTACK_KEY;

      const countryKey = String(hintCountry || this.country || '').toLowerCase();
      const preferAmapLast = !!(opts && opts.amapLast);
      const fallbackHint = opts && opts.fallbackHintCountry ? String(opts.fallbackHintCountry).toLowerCase() : '';
      let countryMeta = this._getCountryMeta(countryKey);
      let isChina = countryMeta && countryMeta.iso2 === 'cn';
      let iso2 = (countryMeta && countryMeta.iso2) || '';
      let viewbox = countryMeta && countryMeta.viewbox;
      let suppressChinaHints = false;
      let biasLat = null, biasLng = null;
      if (viewbox && viewbox.length === 4) {
        const [left, top, right, bottom] = viewbox;
        biasLat = (top + bottom) / 2;
        biasLng = (left + right) / 2;
      }
      let countryLabelEn = (countryMeta && countryMeta.labelEn) || '';

      try {
        console.groupCollapsed('[Geo] start', { address: trimAddr, hintCountry: countryKey, iso2, isChina, amapLast: preferAmapLast, viewbox, bias: [biasLat, biasLng], countryLabelEn });
      } catch (_) {}

      // Helper: safe fetch JSON
      const getJson = async (url, tag = '') => {
        try {
          try { console.log('[Geo] fetch', { tag, url }); } catch(_) {}
          const acceptLang = suppressChinaHints ? 'en-US,en;q=0.9' : 'zh-CN,zh;q=0.9,en;q=0.8';
          const r = await fetch(url, { headers: { 'accept-language': acceptLang } });
          if (!r.ok) return null;
          const data = await r.json();
          try { console.log('[Geo] response', { tag, url, data }); } catch(_) {}
          return data;
        } catch (err) {
          try { console.warn('[Geo] fetch error', { tag, url, err }); } catch(_) {}
          return null;
        }
      };

      if (isChina && amapKey && !preferAmapLast) {
        const url1 = `https://restapi.amap.com/v3/geocode/geo?address=${encodeURIComponent(trimAddr)}&key=${amapKey}`;
        const j1 = await getJson(url1, 'amap-geocode');
        try {
          if (j1 && Array.isArray(j1.geocodes) && j1.geocodes[0] && typeof j1.geocodes[0].location === 'string') {
            const [lng, lat] = j1.geocodes[0].location.split(',').map(parseFloat);
            if (Number.isFinite(lat) && Number.isFinite(lng)) {
              const [wlat, wlng] = this.gcj02ToWgs84(lat, lng);
              try { console.info('[Geo] success', { provider: 'amap-geocode', gcj02: { lat, lng }, wgs84: { lat: wlat, lng: wlng } }); console.groupEnd(); } catch(_) {}
              return { lat: wlat, lng: wlng };
            }
          }
        } catch (_) {}
        const url2 = `https://restapi.amap.com/v3/place/text?keywords=${encodeURIComponent(trimAddr)}&key=${amapKey}&children=0&offset=1&page=1&extensions=base`;
        const j2 = await getJson(url2, 'amap-poi');
        try {
          if (j2 && Array.isArray(j2.pois) && j2.pois[0] && typeof j2.pois[0].location === 'string') {
            const [lng, lat] = j2.pois[0].location.split(',').map(parseFloat);
            if (Number.isFinite(lat) && Number.isFinite(lng)) {
              const [wlat, wlng] = this.gcj02ToWgs84(lat, lng);
              try { console.info('[Geo] success', { provider: 'amap-poi', gcj02: { lat, lng }, wgs84: { lat: wlat, lng: wlng } }); console.groupEnd(); } catch(_) {}
              return { lat: wlat, lng: wlng };
            }
          }
        } catch (_) {}
      }

      if (fallbackHint && !preferAmapLast && String(countryKey) === 'china') {
        try { console.info('[Geo] fallback hint switch', { from: countryKey, to: fallbackHint }); } catch(_) {}
        const fb = this._getCountryMeta(fallbackHint);
        countryMeta = fb;
        isChina = fb && fb.iso2 === 'cn';
        iso2 = (fb && fb.iso2) || '';
        viewbox = fb && fb.viewbox;
        suppressChinaHints = true;
        biasLat = null; biasLng = null;
        if (viewbox && viewbox.length === 4) {
          const [left, top, right, bottom] = viewbox;
          biasLat = (top + bottom) / 2;
          biasLng = (left + right) / 2;
        }
        countryLabelEn = (fb && fb.labelEn) || '';
      }

      {
        const params = new URLSearchParams({ q: trimAddr, limit: '1', lang: (suppressChinaHints ? 'en' : 'zh') });
        if (viewbox) params.append('bbox', viewbox.join(','));
        if (biasLat !== null && biasLng !== null) { params.append('lat', String(biasLat)); params.append('lon', String(biasLng)); }
        const url = `https://photon.komoot.io/api/?${params.toString()}`;
        const j = await getJson(url, 'photon');
        try {
          const feat = j && Array.isArray(j.features) && j.features[0];
          const coords = feat && feat.geometry && Array.isArray(feat.geometry.coordinates) && feat.geometry.coordinates;
          if (coords && Number.isFinite(coords[0]) && Number.isFinite(coords[1])) { try { console.info('[Geo] success', { provider: 'photon', lonlat: coords }); console.groupEnd(); } catch(_) {} ; return { lat: coords[1], lng: coords[0] } }
        } catch (_) {}
      }

      {
        const params = new URLSearchParams({ name: trimAddr, count: '1', language: (suppressChinaHints ? 'en' : 'zh') });
        if (iso2) params.append('country_code', iso2);
        const url = `https://geocoding-api.open-meteo.com/v1/search?${params.toString()}`;
        const j = await getJson(url, 'open-meteo');
        try {
          const r = j && Array.isArray(j.results) && j.results[0];
          if (r && Number.isFinite(r.latitude) && Number.isFinite(r.longitude)) { try { console.info('[Geo] success', { provider: 'open-meteo', lat: r.latitude, lng: r.longitude, raw: r }); console.groupEnd(); } catch(_) {} ; return { lat: r.latitude, lng: r.longitude } }
        } catch (_) {}
      }

      {
        const params = new URLSearchParams({ format: 'json', q: trimAddr, limit: '1', addressdetails: '0' });
        if (iso2) params.append('countrycodes', iso2);
        if (viewbox) {
          params.append('viewbox', viewbox.join(','));
          params.append('bounded', '1');
        }
        const url = `https://nominatim.openstreetmap.org/search?${params.toString()}`;
        const j = await getJson(url, 'nominatim');
        try {
          const r = Array.isArray(j) && j[0];
          const lat = r && parseFloat(r.lat);
          const lng = r && parseFloat(r.lon);
          if (Number.isFinite(lat) && Number.isFinite(lng)) { try { console.info('[Geo] success', { provider: 'nominatim', lat, lng, raw: r }); console.groupEnd(); } catch(_) {} ; return { lat, lng } }
        } catch (_) {}
      }

      if (openCageKey) {
        const url = `https://api.opencagedata.com/geocode/v1/json?q=${encodeURIComponent(trimAddr)}&key=${openCageKey}&limit=1&no_annotations=1${iso2?`&countrycode=${iso2}`:''}`;
        const j = await getJson(url, 'opencage');
        try {
          const r = j && Array.isArray(j.results) && j.results[0];
          const g = r && r.geometry;
          if (g && Number.isFinite(g.lat) && Number.isFinite(g.lng)) { try { console.info('[Geo] success', { provider: 'opencage', lat: g.lat, lng: g.lng, raw: r }); console.groupEnd(); } catch(_) {} ; return { lat: g.lat, lng: g.lng } }
        } catch (_) {}
      }

      if (geoapifyKey) {
        const langParam = suppressChinaHints ? 'en' : 'zh';
        const url = `https://api.geoapify.com/v1/geocode/search?text=${encodeURIComponent(trimAddr)}&limit=1&lang=${langParam}&${iso2?`filter=countrycode:${iso2}&`:''}apiKey=${geoapifyKey}`;
        const j = await getJson(url, 'geoapify');
        try {
          const feat = j && Array.isArray(j.features) && j.features[0];
          const coords = feat && feat.geometry && feat.geometry.coordinates;
          if (coords && Number.isFinite(coords[0]) && Number.isFinite(coords[1])) { try { console.info('[Geo] success', { provider: 'geoapify', lonlat: coords }); console.groupEnd(); } catch(_) {} ; return { lat: coords[1], lng: coords[0] } }
        } catch (_) {}
      }

      if (locationIqKey) {
        const url = `https://us1.locationiq.com/v1/search?key=${locationIqKey}&q=${encodeURIComponent(trimAddr)}&format=json&limit=1${iso2?`&countrycodes=${iso2}`:''}`;
        const j = await getJson(url, 'locationiq');
        try {
          const r = Array.isArray(j) && j[0];
          const lat = r && parseFloat(r.lat);
          const lng = r && parseFloat(r.lon);
          if (Number.isFinite(lat) && Number.isFinite(lng)) { try { console.info('[Geo] success', { provider: 'locationiq', lat, lng, raw: r }); console.groupEnd(); } catch(_) {} ; return { lat, lng } }
        } catch (_) {}
      }

      if (mapQuestKey) {
        const q = countryLabelEn ? `${trimAddr} ${countryLabelEn}` : trimAddr;
        const url = `https://www.mapquestapi.com/geocoding/v1/address?key=${mapQuestKey}&location=${encodeURIComponent(q)}`;
        const j = await getJson(url, 'mapquest');
        try {
          const loc = j && Array.isArray(j.results) && j.results[0] && Array.isArray(j.results[0].locations) && j.results[0].locations[0];
          const g = loc && loc.latLng;
          if (g && Number.isFinite(g.lat) && Number.isFinite(g.lng)) { try { console.info('[Geo] success', { provider: 'mapquest', lat: g.lat, lng: g.lng, raw: loc }); console.groupEnd(); } catch(_) {} ; return { lat: g.lat, lng: g.lng } }
        } catch (_) {}
      }

      if (positionstackKey) {
        const url = `https://api.positionstack.com/v1/forward?access_key=${positionstackKey}&query=${encodeURIComponent(trimAddr)}&limit=1${iso2?`&country=${iso2}`:''}`;
        const j = await getJson(url, 'positionstack');
        try {
          const r = j && Array.isArray(j.data) && j.data[0];
          const lat = r && parseFloat(r.latitude);
          const lng = r && parseFloat(r.longitude);
          if (Number.isFinite(lat) && Number.isFinite(lng)) { try { console.info('[Geo] success', { provider: 'positionstack', lat, lng, raw: r }); console.groupEnd(); } catch(_) {} ; return { lat, lng } }
        } catch (_) {}
      }

      if (amapKey) {
        try {
          const url1 = `https://restapi.amap.com/v3/geocode/geo?address=${encodeURIComponent(trimAddr)}&key=${amapKey}`;
          const j1 = await getJson(url1, 'amap-fallback-geocode');
          if (j1 && Array.isArray(j1.geocodes) && j1.geocodes[0] && typeof j1.geocodes[0].location === 'string') {
            const [lng1, lat1] = j1.geocodes[0].location.split(',').map(parseFloat);
            if (Number.isFinite(lat1) && Number.isFinite(lng1)) {
              const [wlat1, wlng1] = this.gcj02ToWgs84(lat1, lng1);
              try { console.info('[Geo] success', { provider: 'amap-fallback-geocode', gcj02: { lat: lat1, lng: lng1 }, wgs84: { lat: wlat1, lng: wlng1 } }); console.groupEnd(); } catch(_) {}
              return { lat: wlat1, lng: wlng1 };
            }
          }
        } catch (_) {}
        try {
          const url2 = `https://restapi.amap.com/v3/place/text?keywords=${encodeURIComponent(trimAddr)}&key=${amapKey}&children=0&offset=1&page=1&extensions=base`;
          const j2 = await getJson(url2, 'amap-fallback-poi');
          if (j2 && Array.isArray(j2.pois) && j2.pois[0] && typeof j2.pois[0].location === 'string') {
            const [lng2, lat2] = j2.pois[0].location.split(',').map(parseFloat);
            if (Number.isFinite(lat2) && Number.isFinite(lng2)) {
              const [wlat2, wlng2] = this.gcj02ToWgs84(lat2, lng2);
              try { console.info('[Geo] success', { provider: 'amap-fallback-poi', gcj02: { lat: lat2, lng: lng2 }, wgs84: { lat: wlat2, lng: wlng2 } }); console.groupEnd(); } catch(_) {}
              return { lat: wlat2, lng: wlng2 };
            }
          }
        } catch (_) {}
      }
      try { console.warn('[Geo] no result', { address: trimAddr, hintCountry: countryKey }); console.groupEnd(); } catch(_) {}
      return null;
    },

    _getCountryMeta(countryKey) {
      const map = {
        china:     { iso2: 'cn', viewbox: [73.5, 53.6, 134.8, 18.1], labelEn: 'China' },
        japan:     { iso2: 'jp', viewbox: [122.9, 45.6, 153.0, 24.0], labelEn: 'Japan' },
        america:   { iso2: 'us', viewbox: [-125.0, 49.5, -66.9, 24.5], labelEn: 'United States' },
        usa:       { iso2: 'us', viewbox: [-125.0, 49.5, -66.9, 24.5], labelEn: 'United States' },
        unitedstates: { iso2: 'us', viewbox: [-125.0, 49.5, -66.9, 24.5], labelEn: 'United States' },
        canada:    { iso2: 'ca', viewbox: [-141.0, 83.1, -52.6, 41.7], labelEn: 'Canada' },
        mexico:    { iso2: 'mx', viewbox: [-118.5, 32.7, -86.5, 14.5], labelEn: 'Mexico' },
        australia: { iso2: 'au', viewbox: [112.9, -10.7, 153.6, -43.6], labelEn: 'Australia' },
        iceland:   { iso2: 'is', viewbox: [-24.6, 66.7, -13.5, 63.1], labelEn: 'Iceland' },
        denmark:   { iso2: 'dk', viewbox: [7.5, 57.8, 15.5, 54.5], labelEn: 'Denmark' },
        newzealand:{ iso2: 'nz', viewbox: [166.4, -34.5, 178.6, -47.6], labelEn: 'New Zealand' },
        singapore: { iso2: 'sg', viewbox: [103.6, 1.48, 104.1, 1.20], labelEn: 'Singapore' },
        malaysia:  { iso2: 'my', viewbox: [99.6, 7.5, 119.6, 0.9], labelEn: 'Malaysia' },
        thailand:  { iso2: 'th', viewbox: [97.3, 20.5, 105.6, 5.6], labelEn: 'Thailand' },
        vietnam:   { iso2: 'vn', viewbox: [102.1, 23.5, 109.7, 8.4], labelEn: 'Vietnam' },
        switzerland:{ iso2: 'ch', viewbox: [5.9, 47.9, 10.7, 45.7], labelEn: 'Switzerland' },
         france:    { iso2: 'fr', viewbox: [-5.5, 51.5, 9.8, 41.0], labelEn: 'France' },
        germany:   { iso2: 'de', viewbox: [5.8, 55.1, 15.0, 47.2], labelEn: 'Germany' },
        uk:        { iso2: 'gb', viewbox: [-8.6, 59.0, 1.8, 49.9], labelEn: 'United Kingdom' },
        spain:     { iso2: 'es', viewbox: [-9.3, 43.8, 3.3, 36.0], labelEn: 'Spain' },
        italy:     { iso2: 'it', viewbox: [6.6, 47.1, 18.8, 36.6], labelEn: 'Italy' },
        portugal:  { iso2: 'pt', viewbox: [-9.5, 42.2, -6.2, 36.8], labelEn: 'Portugal' },
        netherlands:{ iso2: 'nl', viewbox: [3.2, 53.7, 7.3, 50.7], labelEn: 'Netherlands' },
        sweden:    { iso2: 'se', viewbox: [11.0, 69.1, 24.2, 55.3], labelEn: 'Sweden' },
        norway:    { iso2: 'no', viewbox: [4.7, 71.3, 31.2, 57.9], labelEn: 'Norway' },
        austria:   { iso2: 'at', viewbox: [9.5, 49.1, 17.2, 46.3], labelEn: 'Austria' },
        belgium:   { iso2: 'be', viewbox: [2.5, 51.6, 6.5, 49.5], labelEn: 'Belgium' },
        finland:   { iso2: 'fi', viewbox: [20.5, 70.1, 31.6, 59.8], labelEn: 'Finland' },
        luxembourg:{ iso2: 'lu', viewbox: [5.7, 50.2, 6.5, 49.4], labelEn: 'Luxembourg' },
        hungary:   { iso2: 'hu', viewbox: [16.1, 48.6, 22.9, 45.7], labelEn: 'Hungary' },
        czech:     { iso2: 'cz', viewbox: [12.0, 51.1, 18.9, 48.5], labelEn: 'Czech Republic' },
        slovakia:  { iso2: 'sk', viewbox: [16.8, 49.6, 22.6, 47.7], labelEn: 'Slovakia' },
        greece:    { iso2: 'gr', viewbox: [19.3, 41.8, 28.3, 34.8], labelEn: 'Greece' },
        croatia:   { iso2: 'hr', viewbox: [13.5, 46.6, 19.4, 42.3], labelEn: 'Croatia' },
        lithuania: { iso2: 'lt', viewbox: [20.9, 56.5, 26.8, 53.9], labelEn: 'Lithuania' },
        latvia:    { iso2: 'lv', viewbox: [20.9, 58.1, 28.3, 55.7], labelEn: 'Latvia' },
        estonia:   { iso2: 'ee', viewbox: [21.8, 59.7, 28.2, 57.5], labelEn: 'Estonia' },
        korea:     { iso2: 'kr', viewbox: [125.0, 38.8, 131.1, 33.0], labelEn: 'Korea' },
        indonesia: { iso2: 'id', viewbox: [95.0, 6.1, 141.0, -11.0], labelEn: 'Indonesia' },
        srilanka:  { iso2: 'lk', viewbox: [79.5, 9.9, 81.9, 5.8], labelEn: 'Sri Lanka' },
        maldives:  { iso2: 'mv', viewbox: [72.5, 7.3, 74.0, -0.7], labelEn: 'Maldives' },
        israel:    { iso2: 'il', viewbox: [34.2, 33.3, 35.9, 29.3], labelEn: 'Israel' },
        turkey:    { iso2: 'tr', viewbox: [26.0, 42.2, 45.0, 35.8], labelEn: 'Turkey' },
        saudiarabia:{ iso2: 'sa', viewbox: [34.4, 32.2, 55.7, 16.3], labelEn: 'Saudi Arabia' },
        uae:       { iso2: 'ae', viewbox: [51.5, 26.1, 56.6, 22.6], labelEn: 'United Arab Emirates' },
        qatar:     { iso2: 'qa', viewbox: [50.7, 26.3, 51.7, 24.5], labelEn: 'Qatar' },
        argentina: { iso2: 'ar', viewbox: [-73.6, -21.8, -53.6, -55.1], labelEn: 'Argentina' },
        uruguay:   { iso2: 'uy', viewbox: [-58.5, -30.1, -53.1, -35.2], labelEn: 'Uruguay' },
        brazil:    { iso2: 'br', viewbox: [-74.0, 5.3, -34.8, -33.7], labelEn: 'Brazil' },
        paraguay:  { iso2: 'py', viewbox: [-62.7, -19.3, -54.3, -27.6], labelEn: 'Paraguay' },
        peru:      { iso2: 'pe', viewbox: [-81.4, -0.1, -68.7, -18.3], labelEn: 'Peru' },
        chile:     { iso2: 'cl', viewbox: [-75.7, -17.5, -66.4, -55.6], labelEn: 'Chile' },
        bolivia:   { iso2: 'bo', viewbox: [-69.6, -9.8, -57.5, -22.9], labelEn: 'Bolivia' },
        morocco:   { iso2: 'ma', viewbox: [-13.2, 35.9, -1.0, 27.5], labelEn: 'Morocco' },
        egypt:     { iso2: 'eg', viewbox: [24.7, 31.7, 36.9, 22.0], labelEn: 'Egypt' },
        southafrica:{ iso2: 'za', viewbox: [16.5, -22.1, 32.9, -34.9], labelEn: 'South Africa' },
        madagascar:{ iso2: 'mg', viewbox: [43.2, -11.9, 50.5, -25.6], labelEn: 'Madagascar' },
        // Դδ֪ң viewboxؿն
        custom:    { iso2: '', viewbox: null, labelEn: '' },
      };
      return map[countryKey] || null;
    },

    //  ϵתߵ GCJ-02 -> WGS84
    _outOfChina(lat, lng) {
      return !(lat >= 0.8293 && lat <= 55.8271 && lng >= 72.004 && lng <= 137.8347);
    },
    _transformLat(x, y) {
      const PI = Math.PI;
      let ret = -100.0 + 2.0 * x + 3.0 * y + 0.2 * y * y + 0.1 * x * y + 0.2 * Math.sqrt(Math.abs(x));
      ret += (20.0 * Math.sin(6.0 * x * PI) + 20.0 * Math.sin(2.0 * x * PI)) * 2.0 / 3.0;
      ret += (20.0 * Math.sin(y * PI) + 40.0 * Math.sin(y / 3.0 * PI)) * 2.0 / 3.0;
      ret += (160.0 * Math.sin(y / 12.0 * PI) + 320 * Math.sin(y * PI / 30.0)) * 2.0 / 3.0;
      return ret;
    },
    _transformLng(x, y) {
      const PI = Math.PI;
      let ret = 300.0 + x + 2.0 * y + 0.1 * x * x + 0.1 * x * y + 0.1 * Math.sqrt(Math.abs(x));
      ret += (20.0 * Math.sin(6.0 * x * PI) + 20.0 * Math.sin(2.0 * x * PI)) * 2.0 / 3.0;
      ret += (20.0 * Math.sin(x * PI) + 40.0 * Math.sin(x / 3.0 * PI)) * 2.0 / 3.0;
      ret += (150.0 * Math.sin(x / 12.0 * PI) + 300.0 * Math.sin(x / 30.0 * PI)) * 2.0 / 3.0;
      return ret;
    },
    gcj02ToWgs84(lat, lng) {
      if (this._outOfChina(lat, lng)) return [lat, lng];
      const PI = Math.PI;
      const a = 6378245.0;
      const ee = 0.00669342162296594323;
      let dLat = this._transformLat(lng - 105.0, lat - 35.0);
      let dLng = this._transformLng(lng - 105.0, lat - 35.0);
      const radLat = lat / 180.0 * PI;
      let magic = Math.sin(radLat);
      magic = 1 - ee * magic * magic;
      const sqrtMagic = Math.sqrt(magic);
      dLat = (dLat * 180.0) / ((a * (1 - ee)) / (magic * sqrtMagic) * PI);
      dLng = (dLng * 180.0) / (a / sqrtMagic * Math.cos(radLat) * PI);
      return [lat - dLat, lng - dLng];
    },

    // ԤĵַȡУڴʵ

    // Զͼ
    createFavoriteIcon(text, isPending) {
      const color = isPending ? '#C0C0C0' : '#FFD54F'; // ɫɫ
      const html = `<div class="fav-marker" style="background:${color}">${text}</div>`;
      // ŴΪԭ 1.5 16px -> 24pxê
      return L.divIcon({ className: 'marker-wrapper', html, iconSize: [24, 24], iconAnchor: [12, 12], popupAnchor: [0, -12] });
    },
    // ż𣬵Žñǵָ¼ָ֤϶ͼ
    updateMarkersInteractivity() {
      try {
        if (!this.map) return;
        const z = this.map.getZoom();
        const interactive = Number.isFinite(z) && z >= this._overlapZoomThreshold;
        this._markersInteractive = !!interactive;
      } catch (e) {}
    },
    // ͳһصǵĴλ
    recomputeOverlapAll() {
      try {
        if (!this.map) return;
        const z = this.map.getZoom();
        const threshold = this._overlapZoomThreshold;
        const focusedKey = this.focusId ? `${String(this.country)}|${String(this.focusId)}` : null;
        const isFocusedNormal = (m) => {
          try {
            const meta = m && m.options ? m.options._meta : null;
            if (!meta || !focusedKey) return false;
            const key = `${String(meta.country || this.country)}|${String(meta.id)}`;
            if (String(meta.country || this.country) === 'custom') return false;
            return key === focusedKey;
          } catch (e) { return false; }
        };
        const groups = new Map(); // key -> { center: L.LatLng, fav: [], normal: [] }
        const add = (m, isFav) => {
          try {
            if (isFocusedNormal(m)) {
              // 聚焦景点保持在原始位置，不参与重叠横向分离
              const orig = (m && m.options && m.options._origLatLng) ? m.options._origLatLng : null;
              if (orig) { try { m.setLatLng(orig); } catch (e) {} }
              return;
            }
            const c = (m && m.options && m.options._origLatLng) ? m.options._origLatLng : (m.getLatLng && m.getLatLng());
            if (!c) return;
            const key = `${c.lat.toFixed(6)},${c.lng.toFixed(6)}`;
            if (!groups.has(key)) groups.set(key, { center: c, fav: [], normal: [] });
            const g = groups.get(key);
            (isFav ? g.fav : g.normal).push(m);
          } catch (e) {}
        };
        const favs = Object.values(this.favoritesLayer?._layers || {});
        const norms = Object.values(this.allLayer?._layers || {});
        favs.forEach(m => add(m, true));
        norms.forEach(m => add(m, false));
        for (const g of groups.values()) {
          const favCount = g.fav.length;
          const normCount = g.normal.length;
          if (favCount === 0 && normCount <= 1) continue;
          if (favCount === 0) {
            // ֵֻͨŲ
            if (!Number.isFinite(z) || z < threshold) {
              for (const m of g.normal) { try { m.setLatLng(g.center); } catch (e) {} }
              continue;
            }
            const n = normCount;
            const spacing = 22;
            const cp = this.map.latLngToLayerPoint(g.center);
            for (let i = 0; i < n; i++) {
              const dx = (i - (n - 1) / 2) * spacing;
              const p2 = L.point(cp.x + dx, cp.y);
              const ll2 = this.map.layerPointToLatLng(p2);
              try { g.normal[i].setLatLng(ll2); } catch (e) {}
            }
            continue;
          }
          // ղ
          const spacing = 22;
          const cp = this.map.latLngToLayerPoint(g.center);
          if (!Number.isFinite(z) || z < threshold) {
            // СţղزţغΪһλλĩβ
            const totalSlots = favCount + (normCount > 0 ? 1 : 0);
            const slots = [];
            for (let i = 0; i < totalSlots; i++) {
              const dx = (i - (totalSlots - 1) / 2) * spacing;
              const p2 = L.point(cp.x + dx, cp.y);
              slots.push(this.map.layerPointToLatLng(p2));
            }
            for (let i = 0; i < favCount; i++) {
              try { g.fav[i].setLatLng(slots[i]); } catch (e) {}
            }
            if (normCount > 0) {
              const target = slots[slots.length - 1];
              for (const m of g.normal) { try { m.setLatLng(target); } catch (e) {} }
            }
          } else {
            // ţղһвţղصһвţصͬһУ
            // ղУ׼У
            if (normCount > 0) {
              const nSlots = [];
              for (let i = 0; i < normCount; i++) {
                const dx = (i - (normCount - 1) / 2) * spacing;
                const p2 = L.point(cp.x + dx, cp.y);
                nSlots.push(this.map.layerPointToLatLng(p2));
              }
              for (let i = 0; i < normCount; i++) {
                try { g.normal[i].setLatLng(nSlots[i]); } catch (e) {}
              }
            }
            // ղУϷ
            if (favCount > 0) {
              const vOffset = 26; // ֱƫأȷ·һص
              const fSlots = [];
              for (let i = 0; i < favCount; i++) {
                const dx = (i - (favCount - 1) / 2) * spacing;
                const p2 = L.point(cp.x + dx, cp.y - vOffset);
                fSlots.push(this.map.layerPointToLatLng(p2));
              }
              for (let i = 0; i < favCount; i++) {
                try { g.fav[i].setLatLng(fSlots[i]); } catch (e) {}
              }
            }
          }
        }
        this._resolveFavoriteCollisions && this._resolveFavoriteCollisions();
      } catch (e) {}
    },
    // screen-space anti-collision pass dedicated to favorite markers
    _resolveFavoriteCollisions() {
      try {
        if (!this.map || !this.favoritesLayer) return;
        const markers = Object.values(this.favoritesLayer._layers || {});
        if (markers.length <= 1) return;
        const iconSize = 24; // matches favorite div icon diameter
        const minDist = iconSize; // keep markers touching but not overlapping
        const maxShift = 64; // cap displacement so markers stay near originals
        const nodes = [];
        for (let idx = 0; idx < markers.length; idx++) {
          const marker = markers[idx];
          if (!marker || typeof marker.getLatLng !== 'function') continue;
          const origin = (marker.options && marker.options._origLatLng) ? marker.options._origLatLng : marker.getLatLng();
          const current = marker.getLatLng();
          if (!origin || !current) continue;
          const basePoint = this.map.latLngToLayerPoint(origin);
          const screenPoint = this.map.latLngToLayerPoint(current);
          nodes.push({
            marker,
            base: { x: basePoint.x, y: basePoint.y },
            point: { x: screenPoint.x, y: screenPoint.y },
            seed: idx + 1,
          });
        }
        if (nodes.length <= 1) return;
        const hasOverlap = nodes.some((node, i) => {
          for (let j = i + 1; j < nodes.length; j++) {
            const other = nodes[j];
            const dx = other.point.x - node.point.x;
            const dy = other.point.y - node.point.y;
            if (Math.hypot(dx, dy) < (minDist - 0.5)) return true;
          }
          return false;
        });
        if (!hasOverlap) return;
        const iterations = 12;
        const epsilon = 0.001;
        for (let iter = 0; iter < iterations; iter++) {
          let moved = false;
          for (let i = 0; i < nodes.length; i++) {
            for (let j = i + 1; j < nodes.length; j++) {
              const a = nodes[i];
              const b = nodes[j];
              let dx = b.point.x - a.point.x;
              let dy = b.point.y - a.point.y;
              let dist = Math.hypot(dx, dy);
              if (dist >= minDist) continue;
              moved = true;
              if (dist < epsilon) {
                const angle = ((a.seed * 57) + iter * 23) * Math.PI / 180;
                dx = Math.cos(angle);
                dy = Math.sin(angle) || 0.5;
                dist = 1;
              }
              const overlap = (minDist - dist) / 2;
              const nx = dx / dist;
              const ny = dy / dist;
              a.point.x -= nx * overlap;
              a.point.y -= ny * overlap;
              b.point.x += nx * overlap;
              b.point.y += ny * overlap;
            }
          }
          for (const node of nodes) {
            const offsetX = node.point.x - node.base.x;
            const offsetY = node.point.y - node.base.y;
            const offsetDist = Math.hypot(offsetX, offsetY);
            if (offsetDist > maxShift) {
              const scale = maxShift / offsetDist;
              node.point.x = node.base.x + offsetX * scale;
              node.point.y = node.base.y + offsetY * scale;
            }
          }
          if (!moved) break;
        }
        for (const node of nodes) {
          const target = L.point(node.point.x, node.point.y);
          node.marker.setLatLng(this.map.layerPointToLatLng(target));
        }
      } catch (e) {}
    },
    // schedule heavy overlap recompute to keep UI responsive
    scheduleRecomputeOverlapAll() {
      if (this._recomputeOverlapScheduled) return;
      this._recomputeOverlapScheduled = true;
      try {
        requestAnimationFrame(() => {
          this._recomputeOverlapScheduled = false;
          try { this.recomputeOverlapAll(); } catch (e) {}
        });
      } catch (_) {
        setTimeout(() => {
          this._recomputeOverlapScheduled = false;
          try { this.recomputeOverlapAll(); } catch (e) {}
        }, 0);
      }
    },
    // small idle scheduler helper
    _scheduleIdle(fn) {
      try {
        if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
          return window.requestIdleCallback(fn, { timeout: 100 });
        }
      } catch (_) {}
      return setTimeout(fn, 0);
    },
    _repositionFavOverlapGroups() {
      try {
        const groups = this._favOverlapGroups;
        if (!this.map || !groups) return;
        for (const g of groups.values()) {
          const n = g && g.markers ? g.markers.length : 0;
          if (n <= 1) continue;
          const center = L.latLng(g.center[0], g.center[1]);
          const z = this.map.getZoom();
          if (!Number.isFinite(z) || z < this._overlapZoomThreshold) {
            for (let i = 0; i < n; i++) { try { g.markers[i].setLatLng(center); } catch (e) {} }
            continue;
          }
          const spacing = 22;
          const cp = this.map.latLngToLayerPoint(center);
          for (let i = 0; i < n; i++) {
            const dx = (i - (n - 1) / 2) * spacing;
            const p2 = L.point(cp.x + dx, cp.y);
            const ll2 = this.map.layerPointToLatLng(p2);
            try { g.markers[i].setLatLng(ll2); } catch (e) {}
          }
        }
      } catch (e) {}
    },
    createAllIcon(rating) {
      const color = this.getRatingColor(rating);
      const html = `<div class="dot-marker" style="background:${color}"></div>`;
      return L.divIcon({ className: 'marker-wrapper', html, iconSize: [16, 16], iconAnchor: [8, 8], popupAnchor: [0, -8] });
    },
    applyNormalMarkerZIndex(marker, ratingScore) {
      try {
        if (!marker) return;
        const score = Number.isFinite(ratingScore) ? ratingScore : this._getMarkerRatingScore(marker);
        const safeScore = Number.isFinite(score) ? Math.max(0, score) : 0;
        marker.setZIndexOffset(Math.round(safeScore * 10));
        if (marker.options) marker.options._ratingScore = safeScore;
      } catch (e) {}
    },
    _getMarkerRatingScore(marker) {
      try {
        const cached = marker && marker.options ? marker.options._ratingScore : undefined;
        if (Number.isFinite(cached)) return cached;
        const meta = marker && marker.options ? marker.options._meta : null;
        const score = this.getNumericRating(meta && meta.rating);
        if (marker && marker.options) marker.options._ratingScore = score;
        return score;
      } catch (e) {
        return 0;
      }
    },
    createFocusIcon() {
      const html = `<div class="focus-marker"></div>`;
      return L.divIcon({ className: 'marker-wrapper', html, iconSize: [16, 16], iconAnchor: [8, 8], popupAnchor: [0, -8] });
    },

    //  DOM ַ
    buildPopup(meta) {
      const isCustom = String(meta.country || this.country) === 'custom';
      const rating = this.coerceRating(meta && meta.rating);
      const color = this.getRatingColor(rating);
      const imgId = `img_${meta.country || this.country}_${meta.id}`;
      const imageSrc = this.getImageUrl(meta, imgId);
      const region = meta.region || '';
      const county = meta.county || '';
      const name = meta.name || '';
      const ratingHtml = isCustom ? '' : `<div class=\"popup-rating\" style=\"background:${color}\">${rating}</div>`;
      // ʹ data- ԴΣ򿪺¼
      return `
        <div class="map-popup" data-id="${String(meta.id)}" data-country="${String(meta.country || this.country)}">
          <div class="popup-thumb">
            <div class="popup-image-placeholder"></div>
            <img id="${imgId}" src="${imageSrc || ''}" alt="thumb"/>
          </div>
          <div class="popup-main">
            <div class="popup-name">${this.escapeHtml(name)}</div>
            <div class="popup-meta">${this.escapeHtml(county)}  ${this.escapeHtml(region)}</div>
            ${ratingHtml}
          </div>
        </div>
      `;
    },
    
    bindPopupNoAutoPan(marker, meta) {
      try {
        if (!marker) return;
        marker.bindPopup(this.buildPopup(meta), { autoPan: false });
      } catch (_) {}
    },
    attachPopupHandlers(meta) {
      // ???????l.src ????URL???
      //  getAttribute('src') ??????????
      const imgId = `img_${meta.country || this.country}_${meta.id}`;
      const el = document.getElementById(imgId);
      if (el) {
        let placeholder = null;
        try { placeholder = el.closest('.popup-thumb')?.querySelector('.popup-image-placeholder') || null; } catch (e) {}
        const applyLoaded = () => {
          try { el.style.display = ''; } catch (_) {}
          try { if (placeholder) placeholder.style.display = "none"; } catch (_) {}
          try { el.classList.add('fade-in-image'); } catch (_) {}
        };
        try {
          el.addEventListener('load', () => {
            applyLoaded();
          }, { once: true, passive: true });
        } catch (e) {}
        // ??????????
        try {
          el.addEventListener('error', () => {
            // keep placeholder visible; avoid permanently hiding img if src empty initially
            try { if (placeholder) placeholder.style.display = ''; } catch (e) {}
            try { el.classList.remove('fade-in-image'); } catch (e) {}
          }, { once: true, passive: true });
        } catch (e) {}
        this.loadImage(meta).then(src => {
          if (src) {
            el.src = src;
            if (el.complete && el.naturalWidth) applyLoaded();
          } else {
            try { if (placeholder) placeholder.style.display = "none"; } catch (_) {}
          }
        });
      }
      // ת
      try {
        const popupRoot = el && el.closest('.map-popup');
        const id = meta.id;
        const country = String(meta.country || this.country);
        const node = popupRoot || document.querySelector(`.map-popup[data-id="${id}"][data-country="${country}"]`);
        if (node) {
          node.addEventListener('click', async () => {
            // 뿪ͼǰ浱ǰͼͼڴ鷵غָ
            try { this.saveMapView(); } catch (e) {}
            // 记录当前地图路由，便于详情页使用返回键时能回到地图
            try {
              const currentRoute = this.$route && this.$route.fullPath ? this.$route.fullPath : `/map/${this.country}`;
              sessionStorage.setItem('lastMapRoute', currentRoute);
            } catch (e) {}
            // ͼʵʹõıɫ飬֤һ
            try {
              const color = this.getRatingColor(meta && meta.rating);
              localStorage.setItem('selectedAttractionRatingColor', color);
            } catch (e) {}
            try { await this.buildDistanceBrowseQueue(meta); } catch (e) {}
            this.$router.push({ path: `/attraction/${country}/${id}` , query: { from: 'map' } });
          }, { once: true, passive: true });
        }
      } catch (e) {}
    },
    _hasFavMarker(id) {
      try {
        const layers = this.favoritesLayer && this.favoritesLayer._layers;
        if (!layers) return false;
        const idStr = String(id);
        for (const key of Object.keys(layers)) {
          const m = layers[key];
          const mid = (m && m.options && m.options._meta && String(m.options._meta.id)) || '';
          if (mid && mid === idStr) return true;
        }
        return false;
      } catch (e) { return false; }
    },

    escapeHtml(s) {
      return String(s || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
    },

    coerceRating(r) {
      const raw = typeof r === 'number' ? r : parseFloat(String(r || '').replace('%', '').trim());
      const v = Number.isFinite(raw) ? Math.max(0, Math.min(100, raw)) : 0;
      return v.toString();
    },

    getRatingColor(rating) {
      const raw = typeof rating === 'number' ? rating : parseFloat(String(rating || '').replace('%', '').trim());
      const ratingValue = Number.isFinite(raw) ? Math.max(0, Math.min(100, raw)) : 0;
      if (ratingValue <= 50) return '#ff3b30';
      if (ratingValue >= 100) return '#34c759';
      const x = (ratingValue - 50) / 50;
      const red = Math.round(255 * Math.max(0, 1 - 10 * x));
      const green = Math.round(255 * x);
      return `rgb(${red}, ${green}, 0)`;
    },
    getNumericRating(rating) {
      const raw = typeof rating === 'number' ? rating : parseFloat(String(rating || '').replace('%', '').trim());
      const v = Number.isFinite(raw) ? Math.max(0, Math.min(100, raw)) : 0;
      return v;
    },

    //   
    _geoCacheKey() { return 'geoCache_v1'; },
    _geoLoad() {
      if (this._geoCache) return this._geoCache;
      try {
        const raw = localStorage.getItem(this._geoCacheKey());
        const obj = raw ? JSON.parse(raw) : {};
        this._geoCache = (obj && typeof obj === 'object') ? obj : {};
      } catch (e) { this._geoCache = {}; }
      return this._geoCache;
    },
    _geoSave() {
      try {
        const obj = this._geoCache || {};
        // ײüౣ 2000 
        const keys = Object.keys(obj);
        if (keys.length > 2000) {
          const arr = keys.map(k => ({ k, ts: obj[k]?.ts || 0 })).sort((a,b)=>a.ts-b.ts);
          const toDrop = arr.slice(0, keys.length - 2000);
          for (const it of toDrop) delete obj[it.k];
        }
        localStorage.setItem(this._geoCacheKey(), JSON.stringify(obj));
      } catch (e) {}
    },
    _geoGet(key) {
      // Ϊҳ/ʵͨȴ localStorage ֱӶȡ»
      let rec = null;
      try {
        const raw = localStorage.getItem(this._geoCacheKey());
        const obj = raw ? JSON.parse(raw) : null;
        rec = obj && obj[key];
      } catch (e) {
        rec = null;
      }
      if (!rec) {
        const cache = this._geoLoad();
        rec = cache && cache[key];
      }
      if (!rec) return null;
      const lat = Number(rec.lat), lng = Number(rec.lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
      return { lat, lng };
    },

    //  ҳͨգڿʾʵԺΪ׼ 
    _snapshotKey(country) { return `allGeoSnapshot_${String(country||'')}`; },
    _saveNormalsSnapshot(country, arr) {
      try {
        const list = Array.isArray(arr) ? arr.filter(x => Number.isFinite(x.lat) && Number.isFinite(x.lng)) : [];
        if (list.length > 5000) return; // 数据量过大时不落 localStorage，避免占满配额
        const light = list.map(x => ({ id: x.id, name: x.name, region: x.region, county: x.county, rating: x.rating, total_reviews: x.total_reviews, lat: x.lat, lng: x.lng, hasImage: !!x.hasImage, country: String(x.country || country || this.country) }));
        const payload = { ts: Date.now(), items: light };
        this._safeSetItem(this._snapshotKey(country), JSON.stringify(payload));
      } catch (e) {}
    },
    _loadNormalsSnapshot(country) {
      try {
        const raw = localStorage.getItem(this._snapshotKey(country));
        if (!raw) return [];
        const obj = JSON.parse(raw) || {};
        const items = Array.isArray(obj.items) ? obj.items : [];
        return items;
      } catch (e) { return []; }
    },
    _safeSetItem(key, value) {
      try {
        localStorage.setItem(key, value);
        return true;
      } catch (e) {
        try { this._purgeLargeSnapshots(); } catch (_) {}
        try {
          localStorage.setItem(key, value);
          return true;
        } catch (_) { return false; }
      }
    },
    _purgeLargeSnapshots() {
      try {
        const keys = Object.keys(localStorage).filter(k => /^allGeoSnapshot_/i.test(k));
        for (const k of keys) {
          try { localStorage.removeItem(k); } catch (_) {}
        }
      } catch (_) {}
    },
    _geoPut(key, lat, lng) {
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
      // ֹʵ/ͬҳĲǣʼ localStorage ݺϲд
      let latest = {};
      try {
        const raw = localStorage.getItem(this._geoCacheKey());
        latest = raw ? (JSON.parse(raw) || {}) : {};
      } catch (e) { latest = {}; }
      const mem = this._geoLoad() || {};
      const merged = { ...latest, ...mem };
      merged[key] = { lat, lng, ts: Date.now() };
      this._geoCache = merged;
      this._geoSave();
    },

    // бɸѡ localStorage ȡ
    getActiveFilters() {
      let minReviews = 0, region = '', county = '';
      try { const v = localStorage.getItem('attractionMinReviews'); if (v!==null && v!=='') { const n = parseInt(v,10); if (Number.isFinite(n)) minReviews = n; } } catch(e) {}
      try { const v = localStorage.getItem('attractionsRegion'); if (v!==null) region = v; } catch(e) {}
      try { const v = localStorage.getItem('attractionsCounty'); if (v!==null) county = v; } catch(e) {}
      return { minReviews, region, county };
    },
    passFilters(item, f) {
      if (!item) return false;
      if (typeof item.total_reviews !== 'undefined' && item.total_reviews !== null) {
        const tr = parseInt(item.total_reviews, 10);
        if (Number.isFinite(tr) && tr < (f.minReviews || 0)) return false;
      }
      if (f.county && String(item.county||'') !== String(f.county)) return false;
      if (f.region && String(item.region||'') !== String(f.region)) return false;
      return true;
    },

    async buildDistanceBrowseQueue(meta) {
      try {
        const listCountry = this.resolveListCountryForQueue(meta);
        if (!listCountry) return;
        let dataset = await this.obtainGeoDatasetForQueue(listCountry);
        if (!Array.isArray(dataset)) dataset = [];
        const currentIdStr = String(meta && meta.id);
        if (!currentIdStr) return;
        let baseLat = Number(meta && meta.lat);
        let baseLng = Number(meta && meta.lng);
        if (!Number.isFinite(baseLat) || !Number.isFinite(baseLng)) {
          const fallback = dataset.find(item => String(item && item.id) === currentIdStr && Number.isFinite(item && item.lat) && Number.isFinite(item && item.lng));
          if (fallback) {
            baseLat = Number(fallback.lat);
            baseLng = Number(fallback.lng);
            meta = { ...(meta || {}), lat: baseLat, lng: baseLng };
          }
        }
        if (!Number.isFinite(baseLat) || !Number.isFinite(baseLng)) return;
        const filters = this.getActiveFilters ? this.getActiveFilters() : { minReviews: 0, region: '', county: '' };
        try {
          const extra = await this.fetchNonGeoQueueCandidates(listCountry, filters);
          if (Array.isArray(extra) && extra.length) dataset = dataset.concat(extra);
        } catch (e) {}
        if (!dataset.length) return;
        let filtered = dataset.filter(item => {
          if (!item) return false;
          if (String(item.country || '') !== listCountry) return false;
          if (String(item.country || '') === 'custom') return false;
          return this.passFilters ? this.passFilters(item, filters) : true;
        });
        if (!filtered.length) {
          // 若按筛选条件为空，退回无筛选全量，避免队列缺失
          filtered = dataset.filter(item => item && String(item.country || '') === listCountry && String(item.country || '') !== 'custom');
        }
        if (!filtered.length) return;
        const normalizeItem = (item) => {
          const lat = Number(item && item.lat);
          const lng = Number(item && item.lng);
          return {
            id: item && item.id,
            name: (item && item.name) || '',
            region: (item && item.region) || '',
            county: (item && item.county) || '',
            rating: item && item.rating,
            total_reviews: item && item.total_reviews,
            positive_reviews: item && item.positive_reviews,
            hasImage: !!(item && item.hasImage),
            lat: Number.isFinite(lat) ? lat : null,
            lng: Number.isFinite(lng) ? lng : null,
          };
        };
        const pageSize = 20;
        const withCoords = [];
        const withoutCoords = [];
        const dedupe = new Set();
        for (const raw of filtered) {
          const norm = normalizeItem(raw);
          if (!norm || !norm.id) continue;
          const key = `${String(norm.id)}`;
          if (dedupe.has(key)) continue;
          dedupe.add(key);
          const hasGeo = Number.isFinite(norm.lat) && Number.isFinite(norm.lng);
          norm.distance = hasGeo ? this.computeDistanceKm(baseLat, baseLng, norm.lat, norm.lng) : null;
          if (hasGeo) withCoords.push(norm); else withoutCoords.push(norm);
        }
        if (!withCoords.length && !withoutCoords.length) return;
        const currentCandidate =
          withCoords.find(i => String(i.id) === currentIdStr) ||
          withoutCoords.find(i => String(i.id) === currentIdStr) ||
          normalizeItem({ ...meta, country: listCountry, lat: baseLat, lng: baseLng, hasImage: meta && meta.hasImage });
        if (currentCandidate && Number.isFinite(baseLat) && Number.isFinite(baseLng) && Number.isFinite(currentCandidate.lat) && Number.isFinite(currentCandidate.lng)) {
          currentCandidate.distance = this.computeDistanceKm(baseLat, baseLng, currentCandidate.lat, currentCandidate.lng);
        }
        const restWith = withCoords
          .filter(i => String(i.id) !== currentIdStr)
          .sort((a, b) => (a.distance || Infinity) - (b.distance || Infinity));
        const isZeroDistance = (item) => Number.isFinite(item && item.distance) && Math.abs(item.distance) <= 1e-4;
        const zeroDistance = [];
        const nonZeroWith = [];
        for (const item of restWith) {
          (isZeroDistance(item) ? zeroDistance : nonZeroWith).push(item);
        }
        const restWithout = withoutCoords.filter(i => String(i.id) !== currentIdStr);
        const queue = [currentCandidate, ...zeroDistance, ...nonZeroWith, ...restWithout].filter(Boolean);
        queue.forEach((item, idx) => { item.page = Math.floor(idx / pageSize) + 1; });
        const currentPage = queue.find(i => String(i.id) === currentIdStr)?.page || 1;
        const payload = {
          country: listCountry,
          filters: {
            minReviews: Number(filters.minReviews) || 0,
            region: filters.region || '',
            county: filters.county || '',
          },
          baseId: currentIdStr,
          generatedAt: Date.now(),
          items: queue,
        };
        this._safeSetItem('distanceBrowseQueue', JSON.stringify(payload));
        this._safeSetItem('attractionsOrder', 'distance_near');
        this._safeSetItem('attractionsPage', String(currentPage));
      } catch (e) {
        try { console.warn('[DistanceQueue] generate failed', e); } catch (_) {}
      }
    },
    resolveListCountryForQueue(meta) {
      const current = String(this.country || '').toLowerCase();
      const metaCountry = String((meta && meta.country) || current || '').toLowerCase();
      const listCountry = current === 'custom'
        ? String(this.normalsCountry || this.getListCountryFromQuery() || '').toLowerCase()
        : current;
      if (!listCountry || listCountry === 'custom') return '';
      if (metaCountry && metaCountry !== listCountry) return '';
      return listCountry;
    },
    async obtainGeoDatasetForQueue(listCountry) {
      const activeCountry = String(this.country || '').toLowerCase() === 'custom'
        ? String(this.normalsCountry || '').toLowerCase()
        : String(this.country || '').toLowerCase();
      if (Array.isArray(this._allGeoData) && this._allGeoData.length && String(activeCountry) === String(listCountry)) {
        return this._allGeoData;
      }
      let res = await fetchAttractionsGeo(listCountry);
      if (!Array.isArray(res) || !res.length) {
        try {
          const pos = await fetchAttractionsPositions(listCountry);
          if (Array.isArray(pos) && pos.length) {
            res = pos.map(p => ({
              id: p.id,
              name: p.name,
              region: p.region,
              county: p.county,
              rating: p.rating,
              total_reviews: p.total_reviews,
              positive_reviews: p.positive_reviews,
              lat: p.lat,
              lng: p.lng,
              hasImage: !!p.hasImage,
              country: listCountry,
            }));
          }
        } catch (e) {}
      }
      return Array.isArray(res) ? res : [];
    },
    computeDistanceKm(lat1, lng1, lat2, lng2) {
      if (![lat1, lng1, lat2, lng2].every(v => Number.isFinite(v))) return Infinity;
      const toRad = (deg) => deg * Math.PI / 180;
      const dLat = toRad(lat2 - lat1);
      const dLng = toRad(lng2 - lng1);
      const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
      return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    },
    async fetchNonGeoQueueCandidates(country, filters) {
      try {
        const params = new URLSearchParams();
        params.append('page', '1');
        params.append('limit', '1000');
        params.append('order', 'rating_desc');
        if (filters && filters.minReviews) params.append('minReviews', filters.minReviews);
        if (filters && filters.region) params.append('region', filters.region);
        if (filters && filters.county) params.append('county', filters.county);
        const base = (typeof getLastApiBase === 'function' ? getLastApiBase() : '') || '';
        const resp = await fetch(`${base}/api/attractions/${country}?${params.toString()}`);
        const data = resp && resp.ok ? await resp.json() : null;
        if (!data || !Array.isArray(data.data)) return [];
        return data.data
          .filter(item => !Number.isFinite(Number(item && item.lat)) || !Number.isFinite(Number(item && item.lng)))
          .map(item => ({ ...item, lat: null, lng: null, country }));
      } catch (e) {
        return [];
      }
    },

    getImageUrl(meta, imgId) {
      // cache only; loadImage does fetch with API key
      if (!meta) return '';
      const key = `${meta.country || this.country}-${meta.id}-1`;
      if (this.imageCache.has(key)) return this.imageCache.get(key);
      return '';
    },

    async loadImage(meta) {
      if (!meta) return '';
      const key = `${meta.country || this.country}-${meta.id}-1`;
      if (this.imageCache.has(key)) return this.imageCache.get(key);
      try {
        if (String(meta.country || this.country) === 'custom') {
          const id = String(meta.id);
          const keys = [`${id}:main`, `${id}:sec0`, `${id}:sec1`];
          for (const k of keys) {
            const url = await getCustomImageUrl(k);
            if (url) { this.imageCache.set(key, url); return url; }
          }
          return '';
        }
        if (!meta.hasImage) return '';
        const base = getLastApiBase();
        const country = String(meta.country || this.country);
        const url = `${base}/api/attraction-image/${country}/${meta.id}/1`;
        const resp = await fetch(url, withBackendApiKey());
        if (!resp || !resp.ok) return '';
        const blob = await resp.blob();
        const objectUrl = URL.createObjectURL(blob);
        this.imageCache.set(key, objectUrl);
        return objectUrl;
      } catch (e) {}
      return '';
    },

    // 浱ǰͼͼcenter + zoom sessionStorage
    saveMapView() {
      try {
        if (!this.map) return;
        const c = this.map.getCenter();
        const z = this.map.getZoom();
        const payload = { country: String(this.country), center: [c.lat, c.lng], zoom: z };
        sessionStorage.setItem('map_restore_payload', JSON.stringify(payload));
        sessionStorage.setItem('map_restore_pending', '1');
      } catch (e) {}
    },
    // ڴָĵͼͼָֹղطΧ
    tryRestoreMapViewMaybe() {
      try {
        const pending = sessionStorage.getItem('map_restore_pending');
        const raw = sessionStorage.getItem('map_restore_payload');
        if (!pending || !raw) return;
        const p = JSON.parse(raw);
        if (!p || String(p.country) !== String(this.country)) return;
        const center = Array.isArray(p.center) && p.center.length === 2 ? p.center : null;
        const zoom = Number(p.zoom);
        if (center && Number.isFinite(zoom)) {
          this.map.setView(center, zoom);
          this._shouldRestoreView = true;
          this._blockFavFit = true;
          this._didInitCenter = true;
          this._didFinalFitFavorites = true;
          // һԻָձ
          sessionStorage.removeItem('map_restore_pending');
        }
      } catch (e) {}
    },
  }
}
</script>

<style scoped>
.map-page { position: relative; width: 100%; height: 100vh; }
.map-container { position: absolute; inset: 0; }
 .map-back-button {
  position: fixed;
  left: 16px;
  bottom: calc(16px + env(safe-area-inset-bottom));
  z-index: 2000;
 }

/* б/ҳķذťӾʽ֤һ */
.back-button {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  background: linear-gradient(135deg, #007aff 0%, #0056cc 100%);
  color: white;
  border: none;
  border-radius: 25px;
  font-size: 15px;
  font-weight: 600;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 4px 15px rgba(0, 122, 255, 0.3);
  position: relative;
  overflow: hidden;
  margin-bottom: 0;
  clip-path: polygon(20px 0, 100% 0, 100% 100%, 20px 100%, 0 50%);
}

.back-button::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
  transition: left 0.5s;
}

.back-button:hover::before { left: 100%; }
.back-button:hover {
  background: linear-gradient(135deg, #0056cc 0%, #004bb5 100%);
  transform: translateY(-3px) scale(1.02);
  box-shadow: 0 8px 25px rgba(0, 122, 255, 0.4);
}
.back-button:active {
  transform: translateY(-1px) scale(0.98);
  box-shadow: 0 4px 15px rgba(0, 122, 255, 0.3);
}

/* ٴθǣֹ .back-button  position: relative »صϽ */
.back-button.map-back-button {
  position: fixed !important;
  left: 16px !important;
  right: auto !important;
  top: auto !important;
  bottom: calc(16px + env(safe-area-inset-bottom)) !important;
  margin: 0 !important;
  z-index: 2000 !important;
}

.locate-button {
  position: fixed;
  right: 16px;
  bottom: calc(16px + env(safe-area-inset-bottom));
  width: 38px;
  height: 38px;
  border-radius: 12px;
  background: rgba(30, 30, 34, 0.6);
  color: white;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.25);
  transition: transform 0.2s ease, box-shadow 0.2s ease, opacity 0.2s ease;
  z-index: 2000;
}

.locate-button .locate-icon {
  width: 18px;
  height: 18px;
  min-width: 18px;
  min-height: 18px;
  border: 2px solid rgba(255, 255, 255, 0.9);
  border-radius: 50%;
  position: relative;
  display: block;
  box-sizing: border-box;
  aspect-ratio: 1 / 1;
  flex: none;
}

.locate-button .locate-icon::after {
  content: '';
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.9);
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  aspect-ratio: 1 / 1;
}

.locate-button:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 12px 24px rgba(15, 23, 42, 0.45);
}

.locate-button:disabled {
  opacity: 0.75;
  cursor: not-allowed;
}

.locate-button.locating .locate-icon::after {
  animation: locate-pulse 1.2s ease-in-out infinite;
}

@keyframes locate-pulse {
  0% { transform: translate(-50%, -50%) scale(0.7); opacity: 0.4; }
  50% { transform: translate(-50%, -50%) scale(1.2); opacity: 1; }
  100% { transform: translate(-50%, -50%) scale(0.7); opacity: 0.4; }
}

:deep(.locate-bubble-icon) {
  background: transparent !important;
  border: none !important;
  width: 0 !important;
  height: 0 !important;
  padding: 0 !important;
}

:deep(.locate-bubble) {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: radial-gradient(circle at 35% 30%, #ffe4e6 0%, #f87171 35%, #dc2626 80%);
  border: 2px solid rgba(255, 255, 255, 0.6);
  box-shadow: 0 6px 18px rgba(220, 38, 38, 0.45);
  position: relative;
}

:deep(.locate-bubble::before) {
  content: '';
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: white;
  opacity: 0.85;
  position: absolute;
  top: 32%;
  left: 35%;
  transform: translate(-50%, -50%);
  box-shadow: 0 0 8px rgba(255, 255, 255, 0.5);
}

/* ղأ + ԲΣ/ */
:deep(.marker-wrapper) { pointer-events: auto; }
:deep(#map.dragging-map .marker-wrapper) { pointer-events: none; }
:deep(.fav-marker) {
  /* ŴΪ 1.5 16px -> 24pxͬŴ */
  width: 24px; height: 24px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-weight: 800; font-size: 15px; color: #333; box-shadow: 0 0 0 2px #fff;
}

/* ȫ㣺ɫԲ */
:deep(.dot-marker) { width: 16px; height: 16px; border-radius: 50%; background: #3b82f6; border: 2px solid #fff; box-shadow: 0 1px 3px rgba(0,0,0,.2); }

/* ۽ɫԲ */
:deep(.focus-marker) { width: 16px; height: 16px; border-radius: 50%; background: #ff9800; border: 2px solid #fff; box-shadow: 0 1px 3px rgba(0,0,0,.2); }

/* ʽ */
:deep(.map-popup) { display: flex; gap: 8px; align-items: center; cursor: pointer; }
:deep(.popup-thumb) { width: 40px; height: 40px; border-radius: 8px; overflow: hidden; background: #eee; flex: 0 0 auto; position: relative; }
:deep(.popup-thumb img) { width: 40px; height: 40px; object-fit: cover; display: block; opacity: 0; transform: scale(0.98); filter: blur(6px); transition: opacity .25s ease, transform .25s ease, filter .25s ease; }
:deep(.popup-thumb img.fade-in-image) { opacity: 1; transform: scale(1); filter: blur(0); }
:deep(.popup-image-placeholder) { position: absolute; inset: 0; background: linear-gradient(120deg, #f0f0f0, #e0e0e0, #f0f0f0); background-size: 200% 100%; animation: popupPlaceholderShimmer 1.4s infinite linear; }
:deep(.popup-main) { display: grid; grid-template-columns: 1fr auto; grid-template-rows: auto auto; column-gap: 8px; row-gap: 2px; }
:deep(.popup-name) {
  grid-column: 1 / 3;
  /* 名称：中文优先造字工房创基黑体，英文保持系统默认字体 */
  font-family:
    'ZaoZiGongFangChuangJiHei',
    -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, "Microsoft YaHei", 'Helvetica Neue', Arial, sans-serif;
  font-weight: 500;
  max-width: 220px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
:deep(.popup-meta) { color: #64748b; font-size: 12px; }
:deep(.popup-rating) { color: #fff; font-weight: 800; padding: 2px 6px; font-size: 12px; border-radius: 6px; align-self: start; display: inline-flex; align-items: center; gap: 4px; }
:deep(.popup-rating-label) { opacity: 0.9; font-weight: 700; }
:deep(.popup-rating-value) { font-weight: 900; }

@media (max-width: 768px) {
  /* Replace popup gaps with margins on mobile while keeping spacing identical */
  :deep(.map-popup) { gap: 0; }
  :deep(.map-popup > * + *) { margin-left: 8px; }
  :deep(.map-popup .popup-main) { column-gap: 0; row-gap: 0; }
  :deep(.map-popup .popup-meta),
  :deep(.map-popup .popup-rating) { margin-top: 2px; }
  :deep(.map-popup .popup-rating) { margin-left: 8px; gap: 0; }
  :deep(.map-popup .popup-rating > * + *) { margin-left: 4px; }
}

@keyframes popupPlaceholderShimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* 景点气泡使用文青衬线字体（覆盖 Leaflet 默认无衬线） */
:deep(.leaflet-popup-content),
:deep(.map-popup),
:deep(.popup-meta),
:deep(.popup-rating),
:deep(.popup-rating-label),
:deep(.popup-rating-value) {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
}

/* мָʾصͼ */
.map-loading-overlay { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; pointer-events: none; z-index: 1500; }
.spinner { width: 36px; height: 36px; border: 4px solid rgba(0,0,0,0.15); border-top-color: rgba(0,0,0,0.6); border-radius: 50%; animation: spin 0.9s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

/* Ͻͳ */
.map-stats {
  position: fixed;
  top: calc(env(safe-area-inset-top) + 12px);
  right: 12px;
  z-index: 2100;
  background: rgba(0,0,0,0.55);
  color: #fff;
  font-size: 12px;
  line-height: 1.4;
  padding: 6px 10px;
  border-radius: 8px;
  backdrop-filter: blur(4px);
  pointer-events: none;
}


:deep(.leaflet-container) {
  touch-action: none !important;
  -ms-touch-action: none !important;
  overscroll-behavior: contain;
}
</style>




