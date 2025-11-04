<template>
  <div class="map-page">
    <div id="map" class="map-container"></div>
    <button class="back-button map-back-button" @click="handleBack">返回</button>
  </div>
</template>

<script>
// 使用 Leaflet + OSM 瓦片（免费）
// 需要在前端安装依赖：npm i leaflet
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { findCustomAttractionById } from '../utils/customAttractions.js';
import { getImageUrl as getCustomImageUrl } from '../utils/customImageStore.js';
import { fetchAttractionsGeo, fetchAttractionsGeoByIds, fetchAttractionsPositions, fetchAttractionsPositionsByIds, getLastApiBase } from '../utils/geoApi.js';

export default {
  name: 'AttractionMap',
  data() {
    return {
      map: null,
      country: this.$route.params.country,
      // 路由参数
      focusId: this.$route.query.focusId || null,
      fromDetails: this.$route.query.from === 'details',
      // 收藏数据
      favoriteTabs: [],
      activeTabId: null,
      favorites: [],
      // 图层
      favoritesLayer: null,
      allLayer: null,
      focusedLayer: null,
      // 资源缓存
      imageCache: new Map(),
      apiChosenBase: null,
      // 渲染缓存与状态
      favMarkers: new Map(),
      allMarkers: new Map(),
      _didInitCenter: false,
      _allGeoData: [],
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
  async mounted() {
    this.loadFavoritesState();
    this.initMap();
    await this.renderFavoritesMarkers();
    try { await this.fetchAllGeoOnce(); } catch (e) {}
    this.renderAllInView && this.renderAllInView();

    if (this.focusId) {
      await this.focusSpecificAttraction();
      // 从详情页进入时，拦截浏览器返回到详情
      if (this.fromDetails) {
        try {
          history.pushState({ mapBackGuard: true }, document.title, location.href);
          this._onMapBack = (evt) => {
            try { evt && evt.preventDefault && evt.preventDefault(); } catch (e) {}
            this.handleBack();
          };
          window.addEventListener('popstate', this._onMapBack, { passive: true });
        } catch (e) {}
      }
    }
  },
  beforeUnmount() {
    try { if (this._onMapBack) window.removeEventListener('popstate', this._onMapBack); } catch (e) {}
    try { this.map && this.map.remove(); } catch (e) {}
  },
  methods: {
    handleBack() {
      if (this.fromDetails) {
        // 返回到进入地图前的详情页
        this.$router.back();
      } else {
        // 回到列表页
        this.$router.push({ path: `/attractions/${this.country}` });
      }
    },

    // 读取收藏（与列表页保持一致的存储结构）
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
      const at = this.favoriteTabs.find(t => t.id === this.activeTabId);
      this.favorites = at && Array.isArray(at.items) ? [...at.items] : [];
      // 不再按国家过滤，跨国家收藏也一并展示
      // 排序，保证序号稳定
      this.favorites.sort((a, b) => (a.order || 0) - (b.order || 0));
    },

    initMap() {
      const { center, zoom } = this.getDefaultView();
      this.map = L.map('map', { zoomControl: true }).setView(center, zoom);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 18,
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(this.map);

      // 使用单独的 pane 以控制层级
      try { this.map.createPane('allPane'); this.map.getPane('allPane').style.zIndex = 400; } catch(e) {}
      try { this.map.createPane('focusPane'); this.map.getPane('focusPane').style.zIndex = 500; } catch(e) {}
      try { this.map.createPane('favoritesPane'); this.map.getPane('favoritesPane').style.zIndex = 600; } catch(e) {}

      this.favoritesLayer = L.layerGroup([], { pane: 'favoritesPane' }).addTo(this.map);
      this.allLayer = L.layerGroup([], { pane: 'allPane' }).addTo(this.map);
      this.focusedLayer = L.layerGroup([], { pane: 'focusPane' }).addTo(this.map);

      // 放大到一定级别时，打开最近的弹窗
      this.map.on('zoomend', () => {
        const z = this.map.getZoom();
        if (z >= 12) {
          // 打开当前视野内一个弹窗（优先收藏）
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

      // 仅渲染视野内标记（普通景点）；收藏不随视野清空
      const updateInView = () => { this.renderAllInView && this.renderAllInView(); };
      this.map.on('moveend', updateInView);
      this.map.on('zoomend', updateInView);
    },

    getDefaultView() {
      // 国家级缩放，粗略中心点（在原基础上放大 2 级）
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
      };
      const key = String(this.country || '').toLowerCase();
      const base = presets[key] || { center: [20, 0], zoom: 2 };
      return { center: base.center, zoom: Math.min((base.zoom || 2) + 2, 18) };
    },

    async renderFavoritesMarkers() {
      this.favoritesLayer.clearLayers();
      if (!this.favorites.length) return;

      // 分离自创与非自创，并按国家分组批量查询
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

      // 逐个绘制（异步填坑：缺坐标则地理编码）
      let firstCenter = null;
      const latlngsForFit = [];
      let nonPendingIndex = 0;
      for (let i = 0; i < this.favorites.length; i++) {
        const fav = this.favorites[i];
        const isPending = !!fav.pending;
        const orderText = isPending ? '' : String(++nonPendingIndex);
        let latlng = null;
        let meta = null;

        if (String(fav.country) === 'custom') {
          const ca = findCustomAttractionById(String(fav.id));
          if (ca && Number.isFinite(ca.lat) && Number.isFinite(ca.lng)) {
            latlng = [Number(ca.lat), Number(ca.lng)];
          } else if (ca) {
            const g = await this.geocodeByFreeApi(`${ca.name} ${ca.region || ''} ${ca.county || ''}`.trim());
            if (g) latlng = [g.lat, g.lng];
          }
          meta = {
            id: String(fav.id),
            name: (fav.name || (ca && ca.name) || '未命名景点'),
            region: (fav.region || (ca && ca.region) || ''),
            county: (fav.county || (ca && ca.county) || ''),
            rating: Number.isFinite(fav.rating) ? fav.rating : (ca && ca.rating) || 0,
            hasImage: !!(ca && ca.image1),
            country: 'custom',
          };
        } else {
          const key = `${String(fav.country || this.country)}|${String(fav.id)}`;
          const geo = geoMap.get(key);
          if (geo && Number.isFinite(geo.lat) && Number.isFinite(geo.lng)) {
            latlng = [geo.lat, geo.lng];
            meta = geo;
          } else {
            try {
              const rows = await fetchAttractionsPositionsByIds(String(fav.country || this.country), [fav.id]);
              const p = (Array.isArray(rows) && rows[0]) || null;
              const address = p ? `${p.name || ''} ${p.region || ''} ${p.county || ''} ${p.position || ''} ${this.country}`.trim() : `${fav.name || ''} ${fav.region || ''} ${fav.county || ''} ${this.country}`.trim();
              const g = await this.geocodeByFreeApi(address);
              if (g) {
                latlng = [g.lat, g.lng];
                meta = { id: fav.id, name: fav.name || (p && p.name) || '', region: fav.region || (p && p.region) || '', county: fav.county || (p && p.county) || '', rating: fav.rating, country: String(fav.country || this.country), hasImage: false };
              }
            } catch (e) {}
          }
        }

        if (!latlng) continue;

        if (!firstCenter) firstCenter = latlng;
        latlngsForFit.push(latlng);

        const icon = this.createFavoriteIcon(orderText, isPending);
        const marker = L.marker(latlng, { icon, pane: 'favoritesPane', zIndexOffset: 1000 });
        marker.bindPopup(this.buildPopup(meta));
        marker.on('popupopen', () => this.attachPopupHandlers(meta));
        marker.addTo(this.favoritesLayer);
      }

      // 如果有收藏：默认以序号1为中心，并将缩放调整到能包含所有收藏（仅首次，不干扰用户后续操作）
      if (firstCenter && !this._didInitCenter && !this.focusId) {
        try {
          if (latlngsForFit.length >= 1) {
            const b = L.latLngBounds(latlngsForFit);
            this.map.fitBounds(b, { padding: [40, 40], animate: false });
          } else {
            const { zoom } = this.getDefaultView();
            this.map.setView(firstCenter, zoom);
          }
        } catch (e) {}
        this._didInitCenter = true;
      }
    },

    async renderAllMarkers() {
      try {
        this.allLayer.clearLayers();
        let data = [];
        try { const res = await fetchAttractionsGeo(this.country); if (Array.isArray(res)) data = res; } catch (e) {}

        // Fallback：若远端无专用 geo 接口，则退回到按页拉取列表并有限地理编码（最多 150 个）
        if (!Array.isArray(data) || data.length === 0) {
          try {
            const pos = await fetchAttractionsPositions(this.country);
            if (Array.isArray(pos)) {
              const slice = pos.slice(0, 150);
              for (const p of slice) {
                const address = `${p.name || ''} ${p.region || ''} ${p.county || ''} ${p.position || ''} ${this.country}`.trim();
                const g = await this.geocodeByFreeApi(address);
                if (g) data.push({ id: p.id, name: p.name, region: p.region, county: p.county, rating: p.rating, lat: g.lat, lng: g.lng, hasImage: !!p.hasImage, country: this.country });
              }
            }
          } catch (e) {}
        }

        const bounds = this.map && this.map.getBounds ? this.map.getBounds() : null;
        const filters = this.getActiveFilters ? this.getActiveFilters() : { minReviews: 0, region: '', county: '' };
        for (const r of (data || [])) {
          if (!Number.isFinite(r.lat) || !Number.isFinite(r.lng)) continue;
          if (bounds && !bounds.contains(L.latLng(r.lat, r.lng))) continue;
          if (this.passFilters && !this.passFilters(r, filters)) continue;
          const latlng = [r.lat, r.lng];
          const icon = this.createAllIcon(r.rating);
          const marker = L.marker(latlng, { icon, pane: 'allPane', zIndexOffset: 0 });
          marker.bindPopup(this.buildPopup(r));
          marker.on('popupopen', () => this.attachPopupHandlers(r));
          marker.addTo(this.allLayer);
        }
      } catch (e) {}
    },

    async fetchAllGeoOnce() {
      if (Array.isArray(this._allGeoData) && this._allGeoData.length) return;
      try {
        let data = [];
        try { const res = await fetchAttractionsGeo(this.country); if (Array.isArray(res)) data = res; } catch (e) {}
        if (!Array.isArray(data) || data.length === 0) {
          try {
            const pos = await fetchAttractionsPositions(this.country);
            if (Array.isArray(pos)) {
              const slice = pos.slice(0, 150);
              for (const p of slice) {
                const address = `${p.name || ''} ${p.region || ''} ${p.county || ''} ${p.position || ''} ${this.country}`.trim();
                const g = await this.geocodeByFreeApi(address);
                if (g) data.push({ id: p.id, name: p.name, region: p.region, county: p.county, rating: p.rating, total_reviews: p.total_reviews, lat: g.lat, lng: g.lng, hasImage: !!p.hasImage, country: this.country });
              }
            }
          } catch (e) {}
        }
        this._allGeoData = Array.isArray(data) ? data : [];
      } catch (e) { this._allGeoData = []; }
    },

    renderAllInView() {
      if (!this.map) return;
      const bounds = this.map.getBounds();
      const filters = this.getActiveFilters ? this.getActiveFilters() : { minReviews: 0, region: '', county: '' };
      const visible = new Set();
      for (const r of (this._allGeoData || [])) {
        if (!Number.isFinite(r.lat) || !Number.isFinite(r.lng)) continue;
        if (bounds && !bounds.contains(L.latLng(r.lat, r.lng))) continue;
        if (this.passFilters && !this.passFilters(r, filters)) continue;
        visible.add(String(r.id));
        if (!this.allMarkers.has(String(r.id))) {
          const icon = this.createAllIcon(r.rating);
          const marker = L.marker([r.lat, r.lng], { icon, pane: 'allPane', zIndexOffset: 0 });
          marker.bindPopup(this.buildPopup(r));
          marker.on('popupopen', () => this.attachPopupHandlers(r));
          marker.addTo(this.allLayer);
          this.allMarkers.set(String(r.id), marker);
        }
      }
      // 移除离开视野的普通标记
      for (const [id, mk] of Array.from(this.allMarkers.entries())) {
        if (!visible.has(id)) {
          try { this.allLayer.removeLayer(mk); } catch (e) {}
          this.allMarkers.delete(id);
        }
      }
    },

    async focusSpecificAttraction() {
      const id = String(this.focusId);
      // 检查是否在收藏里（若是则不显橙色，只用收藏标记）
      const inFav = this.favorites.some(f => String(f.id) === id && String(f.country) === String(this.country));

      // 获取坐标（自创或普通）
      let latlng = null;
      let meta = null;

      if (String(this.country) === 'custom') {
        const ca = findCustomAttractionById(id);
        if (ca && Number.isFinite(ca.lat) && Number.isFinite(ca.lng)) {
          latlng = [Number(ca.lat), Number(ca.lng)];
        } else if (ca) {
          const g = await this.geocodeByFreeApi(`${ca.name} ${ca.region || ''} ${ca.county || ''}`.trim());
          if (g) latlng = [g.lat, g.lng];
        }
        meta = ca ? { id, name: ca.name, region: ca.region, county: ca.county, rating: ca.rating, country: 'custom', hasImage: !!ca.image1 } : null;
      } else {
        try {
          const arr = await fetchAttractionsGeoByIds(this.country, [id]);
          const r = (Array.isArray(arr) && arr[0]) || null;
          if (r && Number.isFinite(r.lat) && Number.isFinite(r.lng)) {
            latlng = [r.lat, r.lng];
            meta = r;
          }
        } catch (e) {}
        if (!latlng) {
          try {
            const rows = await fetchAttractionsPositionsByIds(this.country, [id]);
            const p = (Array.isArray(rows) && rows[0]) || null;
            const address = p ? `${p.name || ''} ${p.region || ''} ${p.county || ''} ${p.position || ''} ${this.country}`.trim() : '';
            if (address) {
              const g = await this.geocodeByFreeApi(address);
              if (g) { latlng = [g.lat, g.lng]; meta = p || meta; }
            }
          } catch (e) {}
        }
      }

      if (!latlng) return;

      const { zoom } = this.getDefaultView();
      this.map.setView(latlng, zoom);

      if (!inFav) {
        this.focusedLayer.clearLayers();
        const icon = this.createFocusIcon();
        const marker = L.marker(latlng, { icon, pane: 'focusPane', zIndexOffset: 500 });
        if (meta) {
          marker.bindPopup(this.buildPopup(meta));
          marker.on('popupopen', () => this.attachPopupHandlers(meta));
        }
        marker.addTo(this.focusedLayer);
      }
    },

    // 使用 Google 或 高德 的地理编码（通过 Vite 环境变量注入 key）；若无可用 key 则返回 null
    async geocodeByFreeApi(address) {
      const googleKey = import.meta.env.VITE_GOOGLE_MAPS_KEY;
      const amapKey = import.meta.env.VITE_AMAP_KEY;
      try {
        if (googleKey) {
          const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${googleKey}`;
          const r = await fetch(url);
          const j = await r.json();
          const g = j && j.results && j.results[0] && j.results[0].geometry && j.results[0].geometry.location;
          if (g && Number.isFinite(g.lat) && Number.isFinite(g.lng)) return { lat: g.lat, lng: g.lng };
        } else if (amapKey) {
          const url = `https://restapi.amap.com/v3/geocode/geo?address=${encodeURIComponent(address)}&key=${amapKey}`;
          const r = await fetch(url);
          const j = await r.json();
          if (j && j.geocodes && j.geocodes[0] && typeof j.geocodes[0].location === 'string') {
            const [lng, lat] = j.geocodes[0].location.split(',').map(parseFloat);
            if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
          }
        }
      } catch (e) {}
      return null;
    },

    // 自定义图标
    createFavoriteIcon(text, isPending) {
      const color = isPending ? '#C0C0C0' : '#FFD54F'; // 银色或黄色
      const html = `<div class="fav-marker" style="background:${color}">${text}</div>`;
      return L.divIcon({ className: 'marker-wrapper', html, iconSize: [16, 16], iconAnchor: [8, 8], popupAnchor: [0, -8] });
    },
    createAllIcon(rating) {
      const color = this.getRatingColor(rating);
      const html = `<div class="dot-marker" style="background:${color}"></div>`;
      return L.divIcon({ className: 'marker-wrapper', html, iconSize: [16, 16], iconAnchor: [8, 8], popupAnchor: [0, -8] });
    },
    createFocusIcon() {
      const html = `<div class="focus-marker"></div>`;
      return L.divIcon({ className: 'marker-wrapper', html, iconSize: [16, 16], iconAnchor: [8, 8], popupAnchor: [0, -8] });
    },

    // 构建弹窗 DOM 字符串
    buildPopup(meta) {
      const rating = this.coerceRating(meta && meta.rating);
      const color = this.getRatingColor(rating);
      const imgId = `img_${meta.country || this.country}_${meta.id}`;
      const imageSrc = this.getImageUrl(meta, imgId);
      const region = meta.region || '';
      const county = meta.county || '';
      const name = meta.name || '';
      // 使用 data- 属性传参，打开后绑定事件
      return `
        <div class="map-popup" data-id="${String(meta.id)}" data-country="${String(meta.country || this.country)}">
          <div class="popup-thumb"><img id="${imgId}" src="${imageSrc || ''}" alt="thumb"/></div>
          <div class="popup-main">
            <div class="popup-name">${this.escapeHtml(name)}</div>
            <div class="popup-meta">${this.escapeHtml(county)} · ${this.escapeHtml(region)}</div>
            <div class="popup-rating" style="background:${color}">${rating}</div>
          </div>
        </div>
      `;
    },

    attachPopupHandlers(meta) {
      // 加载图片（若占位）
      const imgId = `img_${meta.country || this.country}_${meta.id}`;
      const el = document.getElementById(imgId);
      if (el && !el.src) {
        this.loadImage(meta).then(src => { if (src) el.src = src; });
      }
      // 点击弹窗跳转到详情
      try {
        const popupRoot = el && el.closest('.map-popup');
        const id = meta.id;
        const country = String(meta.country || this.country);
        const node = popupRoot || document.querySelector(`.map-popup[data-id="${id}"][data-country="${country}"]`);
        if (node) {
          node.addEventListener('click', () => {
            this.$router.push({ path: `/attraction/${country}/${id}` , query: { from: 'map' } });
          }, { once: true, passive: true });
        }
      } catch (e) {}
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
    // 列表筛选：从 localStorage 读取
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

    getImageUrl(meta, imgId) {
      // 先尝试同步可用的 URL，否则返回空字符串占位，等 popupopen 再异步填充
      const key = `${meta.country || this.country}-${meta.id}-1`;
      if (this.imageCache.has(key)) return this.imageCache.get(key);
      if (String(meta.country || this.country) === 'custom') {
        // 自创：尝试读取存储
        return '';
      } else {
        if (meta.hasImage) {
          // 服务器直链（支持缓存）
          const base = getLastApiBase();
          return `${base}/api/attraction-image/${this.country}/${meta.id}/1`;
        }
      }
      return '';
    },

    async loadImage(meta) {
      const key = `${meta.country || this.country}-${meta.id}-1`;
      if (this.imageCache.has(key)) return this.imageCache.get(key);
      try {
        if (String(meta.country || this.country) === 'custom') {
          const url = await getCustomImageUrl(String(meta.id), 1);
          if (url) { this.imageCache.set(key, url); return url; }
        } else {
          if (meta.hasImage) {
            const base = getLastApiBase();
            const url = `${base}/api/attraction-image/${this.country}/${meta.id}/1`;
            this.imageCache.set(key, url);
            return url;
          }
        }
      } catch (e) {}
      return '';
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

/* 复制列表/详情页的返回按钮视觉样式，保证一致 */
.back-button {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 14px 24px;
  background: linear-gradient(135deg, #007aff 0%, #0056cc 100%);
  color: white;
  border: none;
  border-radius: 25px;
  font-size: 16px;
  font-weight: 600;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
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

/* 再次覆盖，防止上面的 .back-button 设置了 position: relative 导致回到左上角 */
.back-button.map-back-button {
  position: fixed !important;
  left: 16px !important;
  right: auto !important;
  top: auto !important;
  bottom: calc(16px + env(safe-area-inset-bottom)) !important;
  margin: 0 !important;
  z-index: 2000 !important;
}

/* 收藏：数字 + 圆形（黄/银） */
:deep(.marker-wrapper) { pointer-events: auto; }
:deep(.fav-marker) {
  width: 16px; height: 16px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-weight: 800; font-size: 10px; color: #333; box-shadow: 0 0 0 2px #fff;
}

/* 全部景点：蓝色圆点 */
:deep(.dot-marker) { width: 16px; height: 16px; border-radius: 50%; background: #3b82f6; border: 2px solid #fff; box-shadow: 0 1px 3px rgba(0,0,0,.2); }

/* 详情聚焦：橙色圆形 */
:deep(.focus-marker) { width: 16px; height: 16px; border-radius: 50%; background: #ff9800; border: 2px solid #fff; box-shadow: 0 1px 3px rgba(0,0,0,.2); }

/* 弹窗样式 */
:deep(.map-popup) { display: flex; gap: 8px; align-items: center; cursor: pointer; }
:deep(.popup-thumb) { width: 40px; height: 40px; border-radius: 8px; overflow: hidden; background: #eee; flex: 0 0 auto; }
:deep(.popup-thumb img) { width: 40px; height: 40px; object-fit: cover; display: block; }
:deep(.popup-main) { display: grid; grid-template-columns: 1fr auto; grid-template-rows: auto auto; column-gap: 8px; row-gap: 2px; }
:deep(.popup-name) { grid-column: 1 / 3; font-weight: 800; max-width: 220px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
:deep(.popup-meta) { color: #64748b; font-size: 12px; }
:deep(.popup-rating) { color: #fff; font-weight: 800; padding: 2px 6px; font-size: 12px; border-radius: 6px; align-self: start; }
</style>
