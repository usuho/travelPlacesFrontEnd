<template>
  <div class="map-page">
    <div id="map" class="map-container"></div>
    <div v-if="showLoading" class="map-loading-overlay"><div class="spinner"></div></div>
    <!--<div class="map-stats">
      <div>已渲染(屏内)：{{ statsRendered }}</div>
      <div>未渲染(屏内)：{{ statsNeverRendered }}</div>
    </div>-->
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
      showLoading: false,
      _hasRenderedFirst: false,
      // 限制与缓存
      _visibleCap: 400,
      allMarkersMeta: new Map(), // id -> meta（含 rating/lat/lng 等）
      // 统计显示
      statsRendered: 0,
      statsNeverRendered: 0,
      _favGeoPending: 0,
      _didFinalFitFavorites: false,
      // 进入地图时的拟合控制与视图恢复
      _blockFavFit: false,
      _shouldRestoreView: false,
      _overlapZoomThreshold: 14,
      _markersInteractive: true,
      _didAutoPanToFirst: false,
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
    // 记录最近一次非自创的国家，用于从自创详情进入地图时作为普通景点的回退来源
    try { if (String(this.country) !== 'custom') localStorage.setItem('lastNonCustomCountry', String(this.country)); } catch (e) {}
    // 从详情返回或从地图内跳到详情再返回时，尝试恢复之前的视图
    this.tryRestoreMapViewMaybe();
    // 若是从详情页进入地图，则不进行收藏范围拟合（只聚焦详情项）
    if (this.fromDetails) this._blockFavFit = true;
    this.showLoading = true;
    await this.renderFavoritesMarkers();
    // 自创国家下，优先尝试使用上次非自创国家的快照，避免空白与二次加载
    if (String(this.country) === 'custom') {
      try {
        const lastCtry = localStorage.getItem('lastNonCustomCountry') || '';
        const snap = this._loadNormalsSnapshot(lastCtry);
        if (Array.isArray(snap) && snap.length) {
          this._allGeoData = snap;
          this.renderAllInView && this.renderAllInView();
        }
      } catch (e) {}
    }
    try { this.fetchAllGeoOnce().then(() => { this.renderAllInView && this.renderAllInView(); }); } catch (e) {}

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
      // 默认取当前激活 tab；若从详情页进入（带 focusId），则合并所有 tab，确保焦点景点一定纳入收藏层渲染
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
      // 不再按国家过滤，跨国家收藏也一并展示；排序保证序号稳定
      // 强制与列表页一致：仅使用当前激活收藏列表
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
      this.map.on('zoomend', () => {
        updateInView();
        // 重新计算重叠分组的错位（基于像素的位移随缩放需重算）
        try { this.recomputeOverlapAll(); } catch (e) {}
        // 修复缩放后弹窗内图片/点击失效：对已打开的弹窗重新绑定处理
        try { this.rebindOpenPopupHandlers(); } catch (e) {}
      });
      // 拖动时临时禁用标记指针事件，保证单指拖动；结束后恢复，可点击
      try {
        this.map.on('dragstart', () => { try { const el = document.getElementById('map'); if (el) el.classList.add('dragging-map'); } catch (e) {} });
        this.map.on('dragend', () => { try { const el = document.getElementById('map'); if (el) el.classList.remove('dragging-map'); } catch (e) {} });
      } catch (e) {}
      // 初始化一次布局
      try { this.recomputeOverlapAll(); } catch (e) {}
    },

    // 在缩放后为当前打开的弹窗重新绑定图片加载与点击跳转，保证自创/普通景点弹窗可用
    rebindOpenPopupHandlers() {
      try {
        // 找到当前 DOM 中的弹窗根节点，读取其 data-id/country
        const node = document.querySelector('.map-popup');
        if (!node) return;
        const id = node.getAttribute('data-id');
        const country = node.getAttribute('data-country') || this.country;
        if (!id) return;

        // 在已知图层中查找对应的 marker 以获取其 meta
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
        // 回退：从全量缓存中取
        if (!meta) {
          const m2 = this.allMarkersMeta && this.allMarkersMeta.get(String(id));
          if (m2) meta = m2;
        }
        if (!meta) return;
        // 重新绑定，确保图片与点击恢复
        this.attachPopupHandlers(meta);
      } catch (_) {}
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

      // 逐个绘制（异步填坑：缺坐标则地理编码）。
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
        marker.bindPopup(this.buildPopup(meta));
        marker.on('popupopen', () => this.attachPopupHandlers(meta));
        marker.addTo(this.favoritesLayer);
        // 处理重叠：收藏标记任何缩放都要并排，增量重算
        try { this.recomputeOverlapAll(); } catch (e) {}
        if (!this._hasRenderedFirst) { this._hasRenderedFirst = true; this.showLoading = false; }
      };

      for (let i = 0; i < this.favorites.length; i++) {
        const fav = this.favorites[i];
        const isPending = !!fav.pending;
        if (!isPending) nonPendingIndex++;
        const orderText = isPending ? '' : String(nonPendingIndex);

        if (String(fav.country) === 'custom') {
          const ca = findCustomAttractionById(String(fav.id));
          const meta = {
            id: String(fav.id),
            name: (fav.name || (ca && ca.name) || '未命名景点'),
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
          } else if (ca) {
            const cacheKey = `custom|${String(fav.id)}`;
            const cached = this._geoGet(cacheKey);
            if (cached) {
              try { console.info('[Geo] use cache', { source: 'browser', key: cacheKey, id: String(fav.id), lat: cached.lat, lng: cached.lng }); } catch(_) {}
              latlng = [cached.lat, cached.lng];
              renderOne(latlng, meta, orderText, isPending);
            } else {
              this._favGeoPending++;
              const task = (async () => {
                try {
                  const _addr = `${ca.position || ''} ${ca.name || ''} ${ca.region || ''} ${ca.county || ''}`.trim();
                  const routeKey = String(this.country || '').toLowerCase();
                  const hasMeta = !!this._getCountryMeta(routeKey);
                  // 仅根据 position 是否包含中文决定是否优先使用中国（高德）
                  const isChinesePosition = /[\u4e00-\u9fa5]/.test(String(ca.position || ''));
                  const hintKey = (String(routeKey) === 'custom') ? (isChinesePosition ? 'china' : 'custom') : routeKey;
                  try { console.info('[Geo] start geocode (custom favorite)', { id: String(fav.id), address: _addr, hintCountry: hintKey }); } catch(_) {}
                  const g = await this.geocodeByFreeApi(_addr, hintKey);
                  if (g) { this._geoPut(cacheKey, g.lat, g.lng); renderOne([g.lat, g.lng], meta, orderText, isPending); }
                } catch (e) {}
                finally {
                  this._favGeoPending = Math.max(0, this._favGeoPending - 1);
                  if (this._favGeoPending === 0 && !this._didFinalFitFavorites && !this._blockFavFit) {
                    try {
                      const layers = Object.values(this.favoritesLayer._layers || {});
                      const bounds = L.latLngBounds(layers.map(l => l.getLatLng && l.getLatLng()).filter(Boolean));
                      if (bounds && bounds.isValid()) this.map.fitBounds(bounds, { padding: [40, 40], animate: false });
                    } catch (e) {}
                    this._didFinalFitFavorites = true;
                    this._didInitCenter = true;
                  }
                }
              })();
              pendingTasks.push(task);
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
                  try { console.info('[Geo] start geocode (favorite normal)', { id: String(fav.id), address, hintCountry: ctry }); } catch(_) {}
                  const g = await this.geocodeByFreeApi(address, ctry);
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
                      if (bounds && bounds.isValid()) this.map.fitBounds(bounds, { padding: [40, 40], animate: false });
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
      }

      // 初次：仅在没有待异步地理编码任务时立即拟合
      if (firstCenter && !this._didInitCenter && pendingTasks.length === 0 && !this._blockFavFit) {
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
        this._didFinalFitFavorites = true;
      }

      // 全部异步完成后再次拟合收藏范围
      if (pendingTasks.length) {
        Promise.allSettled(pendingTasks).then(() => {
          if (!this._didFinalFitFavorites && !this._blockFavFit) {
            try {
              const layers = Object.values(this.favoritesLayer._layers || {});
              const bounds = L.latLngBounds(layers.map(l => l.getLatLng && l.getLatLng()).filter(Boolean));
              if (bounds && bounds.isValid()) this.map.fitBounds(bounds, { padding: [40, 40], animate: false });
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

        // 前端补全：对缺失经纬度的普通景点进行地理编码（与收藏一致）。
        // 1) 若远端无专用 geo 接口，使用 positions 全量补齐。
        // 2) 即使远端有 geo 数据，也补齐其中缺失经纬度的项目。
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
                const metaC = this._getCountryMeta(String(this.country || '').toLowerCase());
                const countryText = (metaC && metaC.labelEn) || (metaC && metaC.iso2) || '';
                const address = `${p.position || ''} ${p.name || ''} ${p.region || ''} ${p.county || ''} ${countryText}`.trim();
                try { console.info('[Geo] start geocode (normal missing lat/lng - renderAllMarkers)', { id: String(p.id), address, hintCountry: this.country }); } catch(_) {}
                const g = await this.geocodeByFreeApi(address, this.country);
                if (g) {
                  const item = {
                    id: p.id,
                    name: p.name,
                    region: p.region,
                    county: p.county,
                    rating: p.rating,
                    total_reviews: p.total_reviews,
                    lat: g.lat,
                    lng: g.lng,
                    hasImage: !!p.hasImage,
                    country: this.country,
                  };
                  this._geoPut(cacheKey, g.lat, g.lng);
                  if (existing) {
                    Object.assign(existing, item);
                  } else {
                    data.push(item);
                    byId.set(idStr, item);
                  }
                }
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
          const icon = this.createAllIcon(r.rating);
        const marker = L.marker(latlng, { icon, pane: 'allPane', zIndexOffset: 0 });
        try { marker.options._meta = r; } catch (e) {}
        try { marker.options._origLatLng = L.latLng(latlng[0], latlng[1]); } catch (e) {}
        marker.bindPopup(this.buildPopup(r));
        marker.on('popupopen', () => this.attachPopupHandlers(r));
        marker.addTo(this.allLayer);
        }
        // 统一重算所有分组的错位（收藏 + 普通）
        try { this.recomputeOverlapAll(); } catch (e) {}
      } catch (e) {}
    },

    async fetchAllGeoOnce() {
      if (Array.isArray(this._allGeoData) && this._allGeoData.length) return;
      // 自创国家：不从后端拉取普通景点，保留快照数据（若有）
      if (String(this.country) === 'custom') return;
      try {
        let data = [];
        try { const res = await fetchAttractionsGeo(this.country); if (Array.isArray(res)) data = res; } catch (e) {}
        // 前端补全：对缺失经纬度的普通景点进行地理编码（与收藏一致）。
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
                const metaC = this._getCountryMeta(String(this.country || '').toLowerCase());
                const countryText = (metaC && metaC.labelEn) || (metaC && metaC.iso2) || '';
                const address = `${p.position || ''} ${p.name || ''} ${p.region || ''} ${p.county || ''} ${countryText}`.trim();
                try { console.info('[Geo] start geocode (normal missing lat/lng - fetchAllGeoOnce)', { id: String(p.id), address, hintCountry: this.country }); } catch(_) {}
                const g = await this.geocodeByFreeApi(address, this.country);
                if (g) {
                  const item = {
                    id: p.id,
                    name: p.name,
                    region: p.region,
                    county: p.county,
                    rating: p.rating,
                    total_reviews: p.total_reviews,
                    lat: g.lat,
                    lng: g.lng,
                    hasImage: !!p.hasImage,
                    country: this.country,
                  };
                  this._geoPut(cacheKey, g.lat, g.lng);
                  if (existing) {
                    Object.assign(existing, item);
                  } else {
                    data.push(item);
                    byId.set(idStr, item);
                  }
                }
              }
            }
          }
        } catch (e) {}
        this._allGeoData = Array.isArray(data) ? data : [];
        // 保存普通景点的快照，供自创国家进入地图时快速显示
        try { this._saveNormalsSnapshot(String(this.country), this._allGeoData); } catch (e) {}
      } catch (e) { this._allGeoData = []; }
    },

    renderAllInView() {
      if (!this.map) return;
      const bounds = this.map.getBounds();
      const filters = this.getActiveFilters ? this.getActiveFilters() : { minReviews: 0, region: '', county: '' };

      // 从全量数据中筛选出“当前屏幕内、通过过滤条件”的普通景点
      const visibleList = (this._allGeoData || []).filter(r => {
        if (!Number.isFinite(r.lat) || !Number.isFinite(r.lng)) return false;
        if (bounds && !bounds.contains(L.latLng(r.lat, r.lng))) return false;
        if (this.passFilters && !this.passFilters(r, filters)) return false;
        return true;
      });

      // 按好评率从高到低排序
      visibleList.sort((a, b) => this.getNumericRating(b.rating) - this.getNumericRating(a.rating));

      // 清空现有普通景点标记（保留收藏层与聚焦层）
      try { this.allLayer.clearLayers(); } catch (e) {}
      this.allMarkers.clear();
      this.allMarkersMeta.clear();

      // 按排序渲染，最多 600 个
      // 重叠错位分组：同一经纬度的标记横向错开
      const overlapGroups = new Map();
      const getOverlapKey = (r) => `${Number(r.lat).toFixed(6)},${Number(r.lng).toFixed(6)}`;
      const repositionGroup = (g) => {
        try {
          const n = g.markers.length;
          if (!this.map || n <= 1) return;
          const center = L.latLng(g.center[0], g.center[1]);
          const z = this.map.getZoom();
          if (!Number.isFinite(z) || z < this._overlapZoomThreshold) {
            // 缩放不够大：不做错开，保持重叠
            for (let i = 0; i < n; i++) {
              try { g.markers[i].setLatLng(center); } catch (e) {}
            }
            return;
          }
          const spacing = 18; // 普通点略小的间距
          const cp = this.map.latLngToLayerPoint(center);
          for (let i = 0; i < n; i++) {
            const dx = (i - (n - 1) / 2) * spacing;
            const p2 = L.point(cp.x + dx, cp.y);
            const ll2 = this.map.layerPointToLatLng(p2);
            try { g.markers[i].setLatLng(ll2); } catch (e) {}
          }
        } catch (e) {}
      };

      // 当前国家内的收藏 ID 集合（避免同时渲染普通点与收藏点的重复）
      const favIdSet = new Set();
      try { for (const f of (this.favorites || [])) { if (String(f.country || this.country) === String(this.country)) favIdSet.add(String(f.id)); } } catch (e) {}

      const limit = Math.min(visibleList.length, this._visibleCap);
      for (let i = 0; i < limit; i++) {
        const r = visibleList[i];
        const id = String(r.id);
        // 若该景点已在收藏层渲染，跳过普通层，避免重复
        if (favIdSet.has(id)) continue;
        // 缓存普通景点的经纬度，提升下次加载速度
        try { this._geoPut(`${String(r.country || this.country)}|${id}`, Number(r.lat), Number(r.lng)); } catch (e) {}
        const icon = this.createAllIcon(r.rating);
        const marker = L.marker([r.lat, r.lng], { icon, pane: 'allPane', zIndexOffset: 0 });
        marker.bindPopup(this.buildPopup(r));
        marker.on('popupopen', () => this.attachPopupHandlers(r));
        marker.addTo(this.allLayer);
        this.allMarkers.set(id, marker);
        this.allMarkersMeta.set(id, r);

        // 处理重叠：记录分组并重新定位
        try {
          const k = getOverlapKey(r);
          if (!overlapGroups.has(k)) overlapGroups.set(k, { center: [r.lat, r.lng], markers: [] });
          const g = overlapGroups.get(k);
          g.markers.push(marker);
          repositionGroup(g);
        } catch (e) {}
      }

      // 更新渲染统计
      this.statsRendered = this.allMarkers.size;
      this.statsNeverRendered = Math.max(0, visibleList.length - this.statsRendered);
      if (!this._hasRenderedFirst && this.statsRendered > 0) {
        this._hasRenderedFirst = true;
        this.showLoading = false;
      }

      // 若当前视野内没有任何应显示的普通景点，则平移到屏幕外的第一个候选点（不改变缩放）
      try {
        const hasFavMarkers = !!(this.favoritesLayer && this.favoritesLayer._layers && Object.keys(this.favoritesLayer._layers).length > 0);
        if (this.map && !this._didAutoPanToFirst && this.allMarkers.size === 0 && !hasFavMarkers) {
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
      // 检查是否在收藏里（若是则不显橙色，只用收藏标记）
      // 自创国家下，仅按 id 匹配，避免旧数据的 country 字段导致误判
      const inFav = (String(this.country) === 'custom')
        ? this.favorites.some(f => String(f.id) === id)
        : this.favorites.some(f => String(f.id) === id && String(f.country) === String(this.country));

      // 获取坐标（自创或普通）
      let latlng = null;
      let meta = null;

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
            const _addr = `${ca.position || ''} ${ca.name || ''} ${ca.region || ''} ${ca.county || ''}`.trim();
            const routeKey = String(this.country || '').toLowerCase();
            const hasMeta = !!this._getCountryMeta(routeKey);
            // 仅根据 position 是否包含中文决定是否优先使用中国（高德）
            const isChinesePosition = /[\u4e00-\u9fa5]/.test(String(ca.position || ''));
            const hintKey = (String(routeKey) === 'custom') ? (isChinesePosition ? 'china' : 'custom') : routeKey;
            try { console.info('[Geo] start geocode (focus custom)', { id, address: _addr, hintCountry: hintKey }); } catch(_) {}
            // 与收藏缺经纬度的异步规则保持一致：异步地理编码，完成后再渲染与缩放
            this._favGeoPending++;
            (async () => {
              try {
                const g = await this.geocodeByFreeApi(_addr, hintKey);
                if (g) {
                  this._geoPut(cacheKey, g.lat, g.lng);
                  // 渲染为“聚焦”标记并缩放到城市级
                  const cityZoom = 14;
                  const targetZoom = this.fromDetails ? cityZoom : this.getDefaultView().zoom;
                  const ll = [g.lat, g.lng];
                  try { this.map.setView(ll, targetZoom); } catch (e) {}
                  try {
                    this.focusedLayer.clearLayers();
                    const icon = this.createFocusIcon();
                    const marker = L.marker(ll, { icon, pane: 'focusPane', zIndexOffset: 500 });
                    const metaLater = ca ? { id, name: ca.name, region: ca.region, county: ca.county, rating: (Number.isFinite(ca && ca.rating) ? ca.rating : 0), country: 'custom', hasImage: !!(ca.hasImage1 || ca.hasImage2 || ca.hasImage3) } : null;
                    if (metaLater) {
                      try { marker.options._meta = metaLater; } catch (e) {}
                      marker.bindPopup(this.buildPopup(metaLater));
                      marker.on('popupopen', () => this.attachPopupHandlers(metaLater));
                    }
                    marker.addTo(this.focusedLayer);
                  } catch (e) {}
                  // 标记已进行一次自动平移，避免后续覆盖
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
        meta = ca ? { id, name: ca.name, region: ca.region, county: ca.county, rating: (Number.isFinite(ca && ca.rating) ? ca.rating : 0), country: 'custom', hasImage: !!(ca.hasImage1 || ca.hasImage2 || ca.hasImage3) } : null;
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
                try { console.info('[Geo] start geocode (focus normal)', { id, address, hintCountry: this.country }); } catch(_) {}
                const g = await this.geocodeByFreeApi(address, this.country);
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
      this.map.setView(latlng, targetZoom);
      // 避免后续普通点渲染流程的自动平移覆盖聚焦视图
      if (this.fromDetails) this._didAutoPanToFirst = true;

      if (!inFav) {
        this.focusedLayer.clearLayers();
        const icon = this.createFocusIcon();
        const marker = L.marker(latlng, { icon, pane: 'focusPane', zIndexOffset: 500 });
        if (meta) {
          try { marker.options._meta = meta; } catch (e) {}
          marker.bindPopup(this.buildPopup(meta));
          marker.on('popupopen', () => this.attachPopupHandlers(meta));
        }
        marker.addTo(this.focusedLayer);
      }

      // 聚焦渲染完成后，停止加载动画（适用于从详情页进入且无收藏/普通点已渲染的情况）
      try {
        this._hasRenderedFirst = true;
        this.showLoading = false;
      } catch (e) {}
    },

    // 前端兜底地理编码：
    // 顺序（中国优先）：
    // - 中国：高德地址 → 高德POI（需 VITE_AMAP_KEY）
    // - Photon（免钥匙）
    // - Open-Meteo（免钥匙）
    // - Nominatim（带 country 与 viewbox）
    // - OpenCage → Geoapify → LocationIQ → MapQuest → Positionstack（有相应 key 时）
    async geocodeByFreeApi(address, hintCountry) {
      const trimAddr = String(address || '').trim();
      if (!trimAddr) return null;

      const env = import.meta && import.meta.env ? import.meta.env : {};
      const amapKey = env.VITE_AMAP_KEY;
      // 去掉 Google API 使用
      const openCageKey = env.VITE_OPENCAGE_KEY;
      const geoapifyKey = env.VITE_GEOAPIFY_KEY;
      const locationIqKey = env.VITE_LOCATIONIQ_KEY;
      const mapQuestKey = env.VITE_MAPQUEST_KEY;
      const positionstackKey = env.VITE_POSITIONSTACK_KEY;

      const countryKey = String(hintCountry || this.country || '').toLowerCase();
      const countryMeta = this._getCountryMeta(countryKey);
      const isChina = countryMeta && countryMeta.iso2 === 'cn';
      const iso2 = (countryMeta && countryMeta.iso2) || '';
      const viewbox = countryMeta && countryMeta.viewbox;
      // 为部分服务准备中心点偏置
      let biasLat = null, biasLng = null;
      if (viewbox && viewbox.length === 4) {
        const [left, top, right, bottom] = viewbox;
        biasLat = (top + bottom) / 2;
        biasLng = (left + right) / 2;
      }
      // 英文国家名用于部分服务的文本增强
      const countryLabelEn = (countryMeta && countryMeta.labelEn) || '';

      // —— 调试日志：本次地理编码上下文 ——
      try {
        // 使用 groupCollapsed 便于收起
        console.groupCollapsed('[Geo] start', { address: trimAddr, hintCountry: countryKey, iso2, isChina, viewbox, bias: [biasLat, biasLng], countryLabelEn });
      } catch (_) {}

      // Helper: safe fetch JSON
      const getJson = async (url, tag = '') => {
        try {
          try { console.log('[Geo] fetch', { tag, url }); } catch(_) {}
          const r = await fetch(url, { headers: { 'accept-language': 'zh-CN,zh;q=0.9,en;q=0.8' } });
          if (!r.ok) return null;
          const data = await r.json();
          try { console.log('[Geo] response', { tag, url, data }); } catch(_) {}
          return data;
        } catch (err) {
          try { console.warn('[Geo] fetch error', { tag, url, err }); } catch(_) {}
          return null;
        }
      };

      // 1) 中国优先：高德地址 → 高德POI（并将 GCJ-02 转为 WGS84）
      if (isChina && amapKey) {
        // 高德地址优先
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
        // 回退到高德 POI（文本检索）
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

      // 2) Photon（可带 bbox / 语言 / 偏置）
      {
        const params = new URLSearchParams({ q: trimAddr, limit: '1', lang: 'zh' });
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

      // 3) Open-Meteo Geocoding（带 country_code）
      {
        const params = new URLSearchParams({ name: trimAddr, count: '1', language: 'zh' });
        if (iso2) params.append('country_code', iso2);
        const url = `https://geocoding-api.open-meteo.com/v1/search?${params.toString()}`;
        const j = await getJson(url, 'open-meteo');
        try {
          const r = j && Array.isArray(j.results) && j.results[0];
          if (r && Number.isFinite(r.latitude) && Number.isFinite(r.longitude)) { try { console.info('[Geo] success', { provider: 'open-meteo', lat: r.latitude, lng: r.longitude, raw: r }); console.groupEnd(); } catch(_) {} ; return { lat: r.latitude, lng: r.longitude } }
        } catch (_) {}
      }

      // 4) Nominatim（带国家范围与 viewbox）
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

      // 5) OpenCage（带 countrycode）
      if (openCageKey) {
        const url = `https://api.opencagedata.com/geocode/v1/json?q=${encodeURIComponent(trimAddr)}&key=${openCageKey}&limit=1&no_annotations=1${iso2?`&countrycode=${iso2}`:''}`;
        const j = await getJson(url, 'opencage');
        try {
          const r = j && Array.isArray(j.results) && j.results[0];
          const g = r && r.geometry;
          if (g && Number.isFinite(g.lat) && Number.isFinite(g.lng)) { try { console.info('[Geo] success', { provider: 'opencage', lat: g.lat, lng: g.lng, raw: r }); console.groupEnd(); } catch(_) {} ; return { lat: g.lat, lng: g.lng } }
        } catch (_) {}
      }

      // 6) Geoapify（带 countrycode）
      if (geoapifyKey) {
        const url = `https://api.geoapify.com/v1/geocode/search?text=${encodeURIComponent(trimAddr)}&limit=1&lang=zh&${iso2?`filter=countrycode:${iso2}&`:''}apiKey=${geoapifyKey}`;
        const j = await getJson(url, 'geoapify');
        try {
          const feat = j && Array.isArray(j.features) && j.features[0];
          const coords = feat && feat.geometry && feat.geometry.coordinates;
          if (coords && Number.isFinite(coords[0]) && Number.isFinite(coords[1])) { try { console.info('[Geo] success', { provider: 'geoapify', lonlat: coords }); console.groupEnd(); } catch(_) {} ; return { lat: coords[1], lng: coords[0] } }
        } catch (_) {}
      }

      // 7) LocationIQ（带 countrycodes）
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

      // 8) MapQuest（文本追加英文国家名以提升匹配）
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

      // 9) Positionstack（带 country）
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

      // 10) Amap 兜底（不论是否中国地址，只要有 key 就尝试一次）
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

    // 国家元数据：ISO2 代码 + 视图框（Nominatim 用）
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
        // 自创景点或未知国家：不给 viewbox，仅返回空对象
        custom:    { iso2: '', viewbox: null, labelEn: '' },
      };
      return map[countryKey] || null;
    },

    // —— 坐标系转换（高德 GCJ-02 -> WGS84）——
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

    // 预留：如需根据中文地址抽取城市，可在此实现

    // 自定义图标
    createFavoriteIcon(text, isPending) {
      const color = isPending ? '#C0C0C0' : '#FFD54F'; // 银色或黄色
      const html = `<div class="fav-marker" style="background:${color}">${text}</div>`;
      // 放大为原来的 1.5 倍（16px -> 24px）并调整锚点
      return L.divIcon({ className: 'marker-wrapper', html, iconSize: [24, 24], iconAnchor: [12, 12], popupAnchor: [0, -12] });
    },
    // 根据缩放级别，低缩放禁用标记的指针事件，保证单指拖动地图
    updateMarkersInteractivity() {
      try {
        if (!this.map) return;
        const z = this.map.getZoom();
        const interactive = Number.isFinite(z) && z >= this._overlapZoomThreshold;
        this._markersInteractive = !!interactive;
      } catch (e) {}
    },
    // 统一重算重叠标记的错位布局
    recomputeOverlapAll() {
      try {
        if (!this.map) return;
        const z = this.map.getZoom();
        const threshold = this._overlapZoomThreshold;
        const groups = new Map(); // key -> { center: L.LatLng, fav: [], normal: [] }
        const add = (m, isFav) => {
          try {
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
            // 只有普通：到达阈值才并排
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
          // 有收藏
          const spacing = 22;
          const cp = this.map.latLngToLayerPoint(g.center);
          if (!Number.isFinite(z) || z < threshold) {
            // 小缩放：收藏并排，其余重合为一个槽位（位于末尾）
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
            // 大缩放：非收藏一行并排；收藏单独在其上一行并排（不重叠到同一行）
            // 非收藏行（基准行）
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
            // 收藏行（在上方）
            if (favCount > 0) {
              const vOffset = 26; // 垂直向上偏移像素，确保不与下方一行重叠
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
      } catch (e) {}
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
    createFocusIcon() {
      const html = `<div class="focus-marker"></div>`;
      return L.divIcon({ className: 'marker-wrapper', html, iconSize: [16, 16], iconAnchor: [8, 8], popupAnchor: [0, -8] });
    },

    // 构建弹窗 DOM 字符串
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
      // 使用 data- 属性传参，打开后绑定事件
      return `
        <div class="map-popup" data-id="${String(meta.id)}" data-country="${String(meta.country || this.country)}">
          <div class="popup-thumb"><img id="${imgId}" src="${imageSrc || ''}" alt="thumb"/></div>
          <div class="popup-main">
            <div class="popup-name">${this.escapeHtml(name)}</div>
            <div class="popup-meta">${this.escapeHtml(county)} · ${this.escapeHtml(region)}</div>
            ${ratingHtml}
          </div>
        </div>
      `;
    },

    attachPopupHandlers(meta) {
      // 加载图片（若占位）。注意：el.src 在部分浏览器会被解析为绝对 URL，即使属性为空，
      // 因此用 getAttribute('src') 判断是否真的为空；自创景点为稳妥总是尝试加载一次。
      const imgId = `img_${meta.country || this.country}_${meta.id}`;
      const el = document.getElementById(imgId);
      if (el) {
        // 图片加载失败时，保持灰色方形占位，避免破图图标
        try {
          el.addEventListener('error', () => {
            try { el.style.display = 'none'; } catch (e) {}
          }, { once: true, passive: true });
        } catch (e) {}
        const rawAttr = el.getAttribute('src');
        const isCustom = String(meta.country || this.country) === 'custom';
        if (!rawAttr || isCustom) {
          this.loadImage(meta).then(src => { if (src) el.src = src; });
        }
      }
      // 点击弹窗跳转到详情
      try {
        const popupRoot = el && el.closest('.map-popup');
        const id = meta.id;
        const country = String(meta.country || this.country);
        const node = popupRoot || document.querySelector(`.map-popup[data-id="${id}"][data-country="${country}"]`);
        if (node) {
          node.addEventListener('click', () => {
            // 在离开地图前保存当前地图视图（用于从详情返回后恢复）
            try { this.saveMapView(); } catch (e) {}
            // 将地图中实际使用的背景色传入详情，保证一致
            try {
              const color = this.getRatingColor(meta && meta.rating);
              localStorage.setItem('selectedAttractionRatingColor', color);
            } catch (e) {}
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
    getNumericRating(rating) {
      const raw = typeof rating === 'number' ? rating : parseFloat(String(rating || '').replace('%', '').trim());
      const v = Number.isFinite(raw) ? Math.max(0, Math.min(100, raw)) : 0;
      return v;
    },

    // —— 地理编码浏览器缓存 ——
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
        // 简易裁剪，最多保留 2000 条
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
      // 为跨页面/多实例互通，优先从 localStorage 直接读取最新缓存
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

    // —— 跨页面普通景点快照（仅用于快速显示，真实数据仍以后端为准） ——
    _snapshotKey(country) { return `allGeoSnapshot_${String(country||'')}`; },
    _saveNormalsSnapshot(country, arr) {
      try {
        const list = Array.isArray(arr) ? arr.filter(x => Number.isFinite(x.lat) && Number.isFinite(x.lng)) : [];
        const light = list.map(x => ({ id: x.id, name: x.name, region: x.region, county: x.county, rating: x.rating, total_reviews: x.total_reviews, lat: x.lat, lng: x.lng, hasImage: !!x.hasImage, country: String(x.country || country || this.country) }));
        const payload = { ts: Date.now(), items: light };
        localStorage.setItem(this._snapshotKey(country), JSON.stringify(payload));
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
    _geoPut(key, lat, lng) {
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
      // 防止多实例/不同页面的并发覆盖：始终与 localStorage 最新内容合并再写回
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
          const country = String(meta.country || this.country);
          return `${base}/api/attraction-image/${country}/${meta.id}/1`;
        }
      }
      return '';
    },

    async loadImage(meta) {
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
        } else {
          // 即使缺少 hasImage 标记，也尝试加载主图（仅在弹窗打开时触发）
          const base = getLastApiBase();
          const country = String(meta.country || this.country);
          const url = `${base}/api/attraction-image/${country}/${meta.id}/1`;
          this.imageCache.set(key, url);
          return url;
        }
      } catch (e) {}
      return '';
    },

    // 保存当前地图视图（center + zoom）到 sessionStorage
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
    // 若存在待恢复的地图视图，则恢复并阻止收藏范围拟合
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
          // 一次性恢复后，清空标记
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
:deep(#map.dragging-map .marker-wrapper) { pointer-events: none; }
:deep(.fav-marker) {
  /* 放大为 1.5 倍：16px -> 24px，文字同比例放大 */
  width: 24px; height: 24px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-weight: 800; font-size: 15px; color: #333; box-shadow: 0 0 0 2px #fff;
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
:deep(.popup-rating) { color: #fff; font-weight: 800; padding: 2px 6px; font-size: 12px; border-radius: 6px; align-self: start; display: inline-flex; align-items: center; gap: 4px; }
:deep(.popup-rating-label) { opacity: 0.9; font-weight: 700; }
:deep(.popup-rating-value) { font-weight: 900; }

/* 居中加载指示，不拦截地图操作 */
.map-loading-overlay { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; pointer-events: none; z-index: 1500; }
.spinner { width: 36px; height: 36px; border: 4px solid rgba(0,0,0,0.15); border-top-color: rgba(0,0,0,0.6); border-radius: 50%; animation: spin 0.9s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

/* 右上角统计面板 */
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

