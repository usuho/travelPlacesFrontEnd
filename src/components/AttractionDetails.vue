<template>
  <div class="container ">

     <!-- 固定顶部区域（标题 + 筛选器） -->
    <div class="fixed-header">
      <!-- 页面头部 -->
      <header class="page-header">
        <div class="header-left-group">
          <button @click="goBack" class="back-button top-back-button">
            返回
          </button>
          <button
            v-if="String(country)==='custom'"
            class="edit-button edit-button-desktop"
            @click="showEditModal = true"
            title="编辑自创景点"
          >编辑</button>
        </div>
        <div class="header-content">
          <div class="title-row">
            <button
              v-if="String(country)==='custom'"
              class="edit-button edit-button-mobile"
              @click="showEditModal = true"
              title="编辑自创景点"
            >编辑</button>
            <h1 :key="titleAnimKey" class="attraction-title title-with-star title-hero">
              <button
                class="star-btn"
                :class="{ favorited: isFavorited }"
                @click="toggleFavoriteDetail"
                :title="isFavorited ? '取消收藏' : '加入收藏'"
                aria-label="收藏"
                v-if="attraction && !loading"
              >
                <svg viewBox="0 0 24 24" class="star-icon" aria-hidden="true">
                  <path d="M12 2.5l2.95 5.98 6.6.96-4.78 4.66 1.13 6.57L12 17.77l-5.9 3.1 1.13-6.57L2.45 9.44l6.6-.96L12 2.5z"/>
                </svg>
              </button>
              <span class="title-text">{{ attraction ? attraction.name : '' }}</span>
            </h1>
          </div>
          <div v-if="attraction && showStats" class="rating-section">
            <div class="rating-badge" :style="{ background: ratingBackgroundColor }">
              <span class="rating-label">好评率</span>
              <span class="rating-text">{{ attraction.rating }}</span>
            </div>
            <div class="reviews-summary">
              <span class="total-reviews">{{ attraction.total_reviews }} 条评论</span>
              <span class="positive-reviews">{{ attraction.positive_reviews }} 条好评</span>
            </div>
          </div>
        </div>
      </header>
    </div>

    <!-- 滚动内容区域 -->
    <div
      class="scroll-content"
      :style="detailSwipeStyle"
      @touchstart="onDetailSwipeStart"
      @touchmove="onDetailSwipeMove"
      @touchend="onDetailSwipeEnd"
      @touchcancel="onDetailSwipeCancel"
    >
      <!-- 加载状态 -->
      <div v-if="!attraction||loading" class="loading-container">
        <div class="loading-spinner"></div>
        <p class="loading-text">正在加载景点详情...</p>
      </div>

      <!-- 景点详情内容 -->
      <div v-else class="attraction-details fade-in" :key="detailAnimKey">

        <!-- 图片展示区域 -->
        <section class="images-section" :key="imageAnimKey">
          <!-- 主图 -->
          <div class="main-image-container" @click="openFullscreen(image1)">
            <div v-if="!image1&&attraction.hasImage1" class="image-skeleton main-image-skeleton"></div>
            <img v-if="image1" :src="image1" alt="景点主图" class="main-image" />
          </div>

          <!-- 次要图片 -->
          <div class="secondary-images">
            <div class="secondary-image-container" @click="openFullscreen(image2)">
              <div v-if="!image2&&attraction.hasImage2" class="image-skeleton secondary-image-skeleton"></div>
              <img v-if="image2" :src="image2" alt="景点图片" class="secondary-image" />
            </div>

            <div class="secondary-image-container" @click="openFullscreen(image3)">
              <div v-if="!image3&&attraction.hasImage3" class="image-skeleton secondary-image-skeleton"></div>
              <img v-if="image3" :src="image3" alt="景点图片" class="secondary-image" v-fly-in/>
            </div>
          </div>
        </section>

        <!-- 全屏图片查看器 -->
        <div v-if="fullscreenImage" class="fullscreen-overlay" @click="handleOverlayClick" @wheel="handleWheel" @touchstart="handleTouchStart" @touchmove="handleTouchMove" @touchend="handleTouchEnd">
          <div class="fullscreen-container" @mousedown="handleMouseDown" @mousemove="handleMouseMove" @mouseup="handleMouseUp" @mouseleave="handleMouseUp">
            <img 
              :src="fullscreenImage" 
              alt="全屏图片" 
              class="fullscreen-image"
              :style="{ transform: `scale(${imageScale}) translate(${imageTranslateX}px, ${imageTranslateY}px)` }"
            />
          </div>
        </div>

        <!-- 景点信息 -->
        <section class="info-section">
          <div class="info-grid" v-fly-in :key="infoAnimKey">
            <div class="info-card card info-card-location">
              <div class="info-header">
                <span class="info-icon">📍</span>
                <h3>位置信息</h3>
              </div>
              <div class="info-content">
                <div class="info-item">
                  <span class="info-label">区域</span>
                  <span class="info-value">{{ attraction.region }}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">{{translateCounty(country)}}</span>
                  <span class="info-value">{{ attraction.county }}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">具体位置</span>
                  <span class="info-value">
                    <a href="javascript:void(0)" class="map-link" @click="openMapForThis">
                      {{ attraction.position }}<span v-if="fromMap" class="map-link-hint">…用谷歌地图打开</span>
                    </a>
                  </span>
                </div>
              </div>
            </div>

            <div class="info-card card info-card-visit">
              <div class="info-header">
                <span class="info-icon">⏰</span>
                <h3>游览信息</h3>
              </div>
              <div class="info-content">
                <div class="info-item">
                  <span class="info-label">建议游览时间</span>
                  <span class="info-value">{{ attraction.duration }}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">概况</span>
                  <span class="info-value">{{ attraction.details }}</span>
                </div>
              </div>
            </div>

            <div v-if="attraction.website" class="info-card card info-card-website">
              <div class="info-header">
                <span class="info-icon">🌐</span>
                <h3>网址</h3>
              </div>
              <div class="info-content">
                <a :href="attraction.website" target="_blank" class="website-link">
                  <span class="website-text">{{ attraction.website }}</span>
                  <span class="external-icon">↗</span>
                </a>
              </div>
            </div>

            <div class="info-card card info-card-wide">
              <div class="info-header">
                <span class="info-icon">📖</span>
                <h3>详细介绍</h3>
              </div>
              <div class="info-content">
                <p class="details-text">{{ attraction.overview }}</p>
              </div>
            </div>
          </div>
        </section>

        <!-- 导航控制 -->
        <section class="navigation-section">
          <div class="navigation-controls">
            <button @click="goBack" class="back-button bottom-back-button">
              返回
            </button>
            <button @click="prevPage" :disabled="prevDisabled"  class="nav-button">
              <span class="nav-icon">←</span>
              上一个景点
            </button>
            <button @click="nextPage" :disabled="nextDisabled" class="nav-button">
              下一个景点
              <span class="nav-icon">→</span>
            </button>
          </div>
        </section>
      </div>
    </div>
    <!-- 自创景点编辑弹窗 -->
    <CreateAttractionModal
      v-if="String(country)==='custom' && attraction"
      v-model="showEditModal"
      :county-label="translateCounty(country)"
      mode="edit"
      :initial="attraction"
      @updated="onCustomUpdated"
    />
    <!-- 自创景点删除确认 -->
    <div v-if="customDeleteConfirmVisible" class="confirm-backdrop" @click="cancelDeleteCustom">
      <div class="confirm-dialog" @click.stop>
        <div class="confirm-message">
          确定要<span class="danger-word">删除</span>该自创景点吗？
        </div>
        <div class="confirm-actions">
          <button class="btn-cancel" @click="cancelDeleteCustom">取消</button>
          <button class="btn-danger" @click="performDeleteCustom">删除</button>
        </div>
      </div>
    </div>
    
  </div>
</template>
  
  <script>
   import { openDB } from 'idb';
   import { fetchAttractionsPositions, getLastApiBase, withBackendApiKey } from '../utils/geoApi.js';
  import { findCustomAttractionById, deleteCustomAttraction } from '../utils/customAttractions.js'
  import { getImageUrl as getCustomImageUrl, deleteImagesForId as deleteCustomImagesForId } from '../utils/customImageStore.js'
  import CreateAttractionModal from './CreateAttractionModal.vue'

  export default {
    components: { CreateAttractionModal },
    data() {
      return {
        fromSearch: this.$route.query.from === 'search',
        fromFavorites: this.$route.query.from === 'favorites',
        fromMap: this.$route.query.from === 'map',
        loading: true,
        country: this.$route.params.country,
        id: this.$route.params.id,
        attraction: null,
        image1: null,
        image2: null,
        image3: null,
        index:parseInt(localStorage.getItem('attractionIndex')) || 0,
        listPage: parseInt(localStorage.getItem('attractionsPage')) || 1,
        listPageLimit: 20,
        hasNextPage: true,
        ids: localStorage.getItem('ids') ? localStorage.getItem('ids').split(',').map(Number) : [] || null,
        favIndex: parseInt(localStorage.getItem('favIndex')) || 0,
        favNav: (() => { try { return JSON.parse(localStorage.getItem('favNav')||'[]'); } catch(e) { return []; } })(),
        isFavorited: false,
        customDeleteConfirmVisible: false,
        fullscreenImage: null,
        imageScale: 1,
        imageTranslateX: 0,
        imageTranslateY: 0,
        isDragging: false,
        hasDragged: false,
        lastTouchDistance: 0,
        lastTouchCenter: { x: 0, y: 0 },
        // 编辑自创景点
        showEditModal: false,
        // 动画 key（当路由或数据变化时强制触发飞入动画）
        detailAnimKey: 0,
        imageAnimKey: 0,
        infoAnimKey: 0,
        titleAnimKey: 0,
        // 横向滑动翻页（详情页）
        detailSwipeStartX: 0,
        detailSwipeStartY: 0,
        detailSwipeTracking: false,
        detailSwipeDirection: null,
        detailSwipeEligible: false,
        detailSwipeProgress: 0,
        detailSwipeOpacity: 1,
        detailSwipeResetting: false,
        detailSwipeTriggerDistance: 140,
        detailSwipeCanTrigger: false,
        detailSwipeResetTimer: null,

        countyTranslations: {
          japan: '都/道/府/县',
          china: '省份',
          america: '州/领地',
          canada: '省份/地区',
          mexico: '州',
          australia: '州/领地',
        },
      };
    },
    async created() {
      // 初始化收藏导航（若来自收藏）
      this.reloadFavState();
      this.updateIsFavorited();
      this.bumpAnimKeys();
      this.resetDetailSwipeState(true);
      this.hasNextPage = Array.isArray(this.ids) && this.ids.length >= this.listPageLimit;
      await this.ensureDistanceQueueForMapEntry();
      this.syncIdsWithDistanceQueue();
      await this.fetchAttractionDetails();
    },
    mounted() {
      // 浏览器/手机后退键与页面“返回”按钮一致：一律回到列表页（先退出全屏）
      try {
        history.pushState({ detailsBackGuard: true }, document.title, location.href);
        this._onDetailsBack = (evt) => {
          try { evt && evt.preventDefault && evt.preventDefault(); } catch(e) {}
          if (this.fullscreenImage) { this.closeFullscreen(); return; }
          this.goBack();
        };
        window.addEventListener('popstate', this._onDetailsBack, { passive: true });
        try { if (document && document.addEventListener) document.addEventListener('backbutton', this._onDetailsBack, false); } catch(e) {}
      } catch (e) {}
      // 安卓实体返回键：与页面蓝色“返回”按钮保持一致
      try {
        this._onHardwareBack = (evt) => {
          try { evt && evt.preventDefault && evt.preventDefault(); } catch (e) {}
          this.goBack();
        };
        window.addEventListener('hardware-back', this._onHardwareBack);
      } catch (e) {}
    },
    watch: {
      '$route'(to) {
        // 路由变化（国家或ID或query）都更新并重载详情
        this.country = to.params.country;
        this.id = to.params.id;
        this.reloadFavState();
        this.updateIsFavorited();
        this.resetDetailSwipeState(true);
        // 重置数据与动画，确保飞入效果触发
        this.attraction = null;
        for (let i = 1; i <= 3; i++) this[`image${i}`] = null;
        this.bumpAnimKeys();
        this.syncIdsWithDistanceQueue();
        this.fetchAttractionDetails();
      }
    },

    beforeUnmount() {
      this.clearDetailSwipeResetTimer();
      try { if (this._onDetailsBack) window.removeEventListener('popstate', this._onDetailsBack); } catch(e) {}
      try { if (document && document.removeEventListener && this._onDetailsBack) document.removeEventListener('backbutton', this._onDetailsBack, false); } catch(e) {}
      try { if (this._onHardwareBack) window.removeEventListener('hardware-back', this._onHardwareBack); } catch (e) {}
    },
    

    computed: {
      isFavoritesMode() {
        return this.$route.query.from === 'favorites';
      },
      ratingBackgroundColor() {
      const rating = this.attraction && this.attraction.rating;
      if (rating !== undefined && rating !== null && String(rating).trim() !== '') {
        return this.getRatingColor(rating);
      }
      const stored = localStorage.getItem('selectedAttractionRatingColor');
      if (stored) return stored;
      return this.getRatingColor(rating);
    },
    showStats() {
      return String(this.country) !== 'custom';
    },
    detailSwipeStyle() {
      return {
        opacity: this.detailSwipeOpacity,
        transition: this.detailSwipeResetting ? 'opacity 0.2s ease' : 'none',
      };
    },
    nextDisabled() {
        if (this.isFavoritesMode) return this.favIndex >= this.favNav.length - 1;
        if (this.fromSearch) return true;
        const distanceMode = this.isDistanceMode();
        if (Array.isArray(this.ids) && this.ids.length && this.index < this.ids.length - 1) return false;
        if (distanceMode) return !this.hasNextPage;
        return !this.hasNextPage;
      },
    prevDisabled() {
        if (this.isFavoritesMode) return this.favIndex === 0;
        if (this.fromSearch) return true;
        const distanceMode = this.isDistanceMode();
        if (this.index > 0) return false;
        if (distanceMode) return this.listPage <= 1;
        return this.listPage <= 1;
      }
    },
    methods: {
      isDistanceMode() {
        try {
          const order = localStorage.getItem('attractionsOrder') || '';
          if (order !== 'distance_near') return false;
          const q = this.getDistanceQueueSnapshot();
          return !!(q && Array.isArray(q.items) && q.items.length);
        } catch (e) {
          return false;
        }
      },
      openMapForThis() {
        try {
          if (this.fromMap) {
            // 从地图进入：优先尝试打开 Google Maps 应用，其次打开网页版
            const q = this.buildMapQuery();
            const schemeUrl = `comgooglemaps://?q=${encodeURIComponent(q)}`;
            const webUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
            let opened = false;
            try {
              // 直接尝试跳转到 Google Maps 应用
              window.location.href = schemeUrl;
              opened = true;
            } catch (e) {
              opened = false;
            }
            // 无论是否成功，兜底在短延迟后打开网页版（若已跳转到 App，则此步骤一般被系统拦截）
            setTimeout(() => {
              try { window.open(webUrl, '_blank'); } catch (e) { window.location.href = webUrl; }
            }, 300);
            return;
          }
          // 非地图进入：保持原逻辑，跳到站内地图
          // 自创景点时传入列表国家，便于地图默认定位
          let listCountry = null;
          try {
            const last = localStorage.getItem('lastAttractionsRoute') || '';
            const m = last.match(/\/attractions\/([^\/?#]+)/i);
            if (m && m[1] && m[1].toLowerCase() !== 'custom') listCountry = m[1];
          } catch (e) {}
          if (!listCountry) {
            try {
              const lastC = localStorage.getItem('lastNonCustomCountry') || '';
              if (lastC && lastC.toLowerCase() !== 'custom') listCountry = lastC;
            } catch (e) {}
          }
          const query = { focusId: this.id, from: 'details' };
          if (String(this.country) === 'custom' && listCountry) query.listCountry = String(listCountry);
          this.$router.push({ path: `/map/${this.country}`, query });
        } catch(e) {}
      },
      buildMapQuery() {
        const parts = [];
        try {
          if (this.attraction) {
            if (this.attraction.name) parts.push(this.attraction.name);
            if (this.attraction.position) parts.push(this.attraction.position);
            if (this.attraction.county) parts.push(this.attraction.county);
            if (this.attraction.region) parts.push(this.attraction.region);
          }
          if (this.country) parts.push(this.country);
        } catch (e) {}
        return parts.filter(Boolean).join(' ');
      },
      isMobileViewport() {
        try { return (window.innerWidth || document.documentElement.clientWidth || 0) < 1024; } catch(e) { return false; }
      },
      isTouchDevice() {
        try {
          return (
            (window.matchMedia ? window.matchMedia('(pointer: coarse)').matches : false) ||
            (window.matchMedia ? window.matchMedia('(hover: none)').matches : false)
          );
        } catch(e) { return false; }
      },
      bumpAnimKeys() {
        const tick = Date.now();
        this.detailAnimKey = `${this.country}-${this.id}-${tick}`;
        this.imageAnimKey = `${this.country}-${this.id}-img-${tick}`;
        this.infoAnimKey = `${this.country}-${this.id}-info-${tick}`;
        this.titleAnimKey = `${this.country}-${this.id}-title-${tick}`;
      },
      reloadFavState() {
        try {
          const nav = JSON.parse(localStorage.getItem('favNav') || '[]');
          const idx = parseInt(localStorage.getItem('favIndex')) || 0;
          if (Array.isArray(nav)) this.favNav = nav; else this.favNav = [];
          this.favIndex = Number.isInteger(idx) ? idx : 0;
        } catch(e) {
          this.favNav = [];
          this.favIndex = 0;
        }
      },
      updateIsFavorited() {
        try {
          // 先检查多标签收藏结构
          let found = false;
          try {
            const rawTabs = localStorage.getItem('favoriteTabs_all');
            if (rawTabs) {
              const tabs = JSON.parse(rawTabs) || [];
              let activeId = null; try { activeId = localStorage.getItem('favoriteTabs_activeId'); } catch(e) {}
              const t = (Array.isArray(tabs) ? tabs : []).find(x => x && x.id === activeId) || (Array.isArray(tabs) && tabs[0]);
              const items = Array.isArray(t?.items) ? t.items : [];
              if (items.some(x => String(x.id) === String(this.id) && String(x.country||'') === String(this.country||''))) {
                found = true;
              }
            }
          } catch (e) {}
          if (false && !found) {
            // 兼容旧的 favorites_all
            const rawAll = localStorage.getItem('favorites_all');
            let list = rawAll ? JSON.parse(rawAll) : [];
            if (!Array.isArray(list) || list.length === 0) {
              const rawCountry = localStorage.getItem(`favorites_${this.country}`);
              if (rawCountry) list = JSON.parse(rawCountry) || [];
            }
            found = Array.isArray(list) && list.some(f => String(f?.id) === String(this.id) && String(f?.country||'') === String(this.country||''));
          }
          if (String(this.country) === 'custom') {
            // 自创景点默认视为已收藏
            this.isFavorited = true;
          } else {
            this.isFavorited = !!found;
          }
        } catch(e) {
          this.isFavorited = false;
        }
      },
      // ===== 收藏（与列表同步：支持 favoriteTabs_all 与 favorites_all） =====
      getFavoritesStorageKey() {
        return 'favorites_all';
      },
      loadFavoritesList() {
        // 返回“当前激活收藏列表”的条目副本，仅用于判断当前列表内状态
        try {
          const tabs = this.loadFavoriteTabs();
          let activeId = null; try { activeId = localStorage.getItem('favoriteTabs_activeId'); } catch(e) {}
          const tab = (tabs || []).find(t => t && t.id === activeId) || (tabs && tabs[0]);
          const items = tab && Array.isArray(tab.items) ? tab.items : [];
          return items.slice();
        } catch (e) { return []; }
      },
      saveFavoritesList(list) {
        // 由 addToFavoriteTabs/removeFromFavoriteTabs 负责真实持久化；此处仅维护兼容性聚合
        this.recomputeAndSaveFavoritesAllFromTabs();
      },
      normalizeFavoritesOrder(list) {
        return (list || [])
          .sort((a,b)=>(a.order||0)-(b.order||0))
          .map((x, i) => ({ ...x, order: i + 1 }));
      },
      // --- Tabs helpers ---
      loadFavoriteTabs() {
        try { const raw = localStorage.getItem('favoriteTabs_all'); return raw ? (JSON.parse(raw) || []) : []; } catch(e) { return []; }
      },
      saveFavoriteTabs(tabs) {
        try { localStorage.setItem('favoriteTabs_all', JSON.stringify(tabs || [])); } catch(e) {}
      },
      // 将所有 tabs 的 items 合并为去重列表并写回旧的 favorites_all（仅用于兼容展示，不影响每个 tab 独立状态）
      recomputeAndSaveFavoritesAllFromTabs() {
        try {
          const tabs = this.loadFavoriteTabs();
          const map = new Map();
          (tabs || []).forEach(t => {
            (Array.isArray(t.items) ? t.items : []).forEach(it => {
              const key = `${String(it.country||'')}:${String(it.id)}`;
              if (!map.has(key)) {
                map.set(key, {
                  id: it.id,
                  name: it.name,
                  region: it.region,
                  rating: it.rating,
                  county: it.county,
                  country: it.country,
                });
              }
            });
          });
          const list = Array.from(map.values()).map((x, idx) => ({ ...x, order: idx + 1 }));
          try { localStorage.setItem('favorites_all', JSON.stringify(list)); } catch(e) {}
        } catch(e) {}
      },
      // 仅从“当前激活收藏列表”移除，不影响其他列表
      removeFromActiveFavoriteTab(id, country) {
        const tabs = this.loadFavoriteTabs();
        let activeId = null; try { activeId = localStorage.getItem('favoriteTabs_activeId'); } catch(e) {}
        const tab = (tabs || []).find(t => t && t.id === activeId) || (tabs && tabs[0]);
        if (tab && Array.isArray(tab.items)) {
          const idx = tab.items.findIndex(x => String(x.id) === String(id) && String(x.country||'') === String(country||''));
          if (idx >= 0) {
            tab.items.splice(idx, 1);
            this.normalizeTabItemsOrder(tab.items);
            this.saveFavoriteTabs(tabs);
          }
        }
      },
      normalizeTabItemsOrder(items) {
        (items || []).sort((a,b)=>(a.order||0)-(b.order||0)).forEach((it, idx)=> it.order = idx + 1);
      },
      addToFavoriteTabs(item) {
        const tabs = this.loadFavoriteTabs();
        if (!tabs.length) { tabs.push({ id: 't' + Math.random().toString(36).slice(2,9), name: '新的收藏', items: [], order: 1 }); }
        let activeId = null; try { activeId = localStorage.getItem('favoriteTabs_activeId'); } catch(e) {}
        let tab = tabs.find(t => t.id === activeId) || tabs[0];
        if (!Array.isArray(tab.items)) tab.items = [];
        const exists = tab.items.find(x => String(x.id) === String(item.id) && String(x.country||'') === String(item.country||''));
        if (!exists) {
          const nextOrder = tab.items.length + 1;
          tab.items.push({ ...item, order: nextOrder });
          this.normalizeTabItemsOrder(tab.items);
          this.saveFavoriteTabs(tabs);
          this.recomputeAndSaveFavoritesAllFromTabs();
        }
      },
      removeFromFavoriteTabs(id, country) {
        // 为兼容旧调用，此处改为仅从“当前激活收藏列表”移除
        this.removeFromActiveFavoriteTab(id, country);
        this.recomputeAndSaveFavoritesAllFromTabs();
      },
      toggleFavoriteDetail() {
        if (!this.attraction) return;
        const id = this.attraction.id || this.id;
        const country = String(this.country);
        if (country === 'custom') {
          // 自创景点：取消收藏即删除，先确认
          this.customDeleteConfirmVisible = true;
          return;
        }
        // 同步到 tabs 结构与旧 favorites_all
        let list = this.loadFavoritesList();
        const idx = list.findIndex(f => String(f.id) === String(id) && String(f.country||'') === String(country||''));
        if (idx >= 0) {
          list.splice(idx, 1);
          list = this.normalizeFavoritesOrder(list);
          this.saveFavoritesList(list);
          this.removeFromFavoriteTabs(id, country);
          this.isFavorited = false;
        } else {
          const nextOrder = (list && list.length ? list.length : 0) + 1;
          const item = { id, name: this.attraction.name, region: this.attraction.region, rating: this.attraction.rating, county: this.attraction.county, country, order: nextOrder };
          list.push(item);
          this.saveFavoritesList(list);
          this.addToFavoriteTabs(item);
          this.isFavorited = true;
        }
      },
      cancelDeleteCustom() {
        this.customDeleteConfirmVisible = false;
      },
      performDeleteCustom() {
        const id = this.attraction?.id || this.id;
        // 从自创景点存储中删除
        try { deleteCustomAttraction(id); } catch(e) {}
        try { deleteCustomImagesForId(id); } catch(e) {}
        // 同步清除浏览器地理编码缓存
        try {
          const storeKey = 'geoCache_v1';
          const raw = localStorage.getItem(storeKey);
          if (raw) {
            const obj = JSON.parse(raw) || {};
            const cacheKey = `custom|${String(id)}`;
            if (obj && typeof obj === 'object' && Object.prototype.hasOwnProperty.call(obj, cacheKey)) {
              delete obj[cacheKey];
              localStorage.setItem(storeKey, JSON.stringify(obj));
            }
          }
        } catch (e) {}
        // 从收藏 tabs 中移除
        try {
          const rawTabs = localStorage.getItem('favoriteTabs_all');
          if (rawTabs) {
            const tabs = JSON.parse(rawTabs) || [];
            tabs.forEach(t => {
              if (Array.isArray(t.items)) {
                const idx = t.items.findIndex(x => String(x.id) === String(id) && String(x.country||'') === 'custom');
                if (idx >= 0) t.items.splice(idx, 1);
              }
            });
            localStorage.setItem('favoriteTabs_all', JSON.stringify(tabs));
          }
        } catch(e) {}
        this.customDeleteConfirmVisible = false;
        this.isFavorited = false;
        // 删除后返回到之前的景点列表
        this.goBack();
      },
      // 横向滑动翻页（详情页）
      clearDetailSwipeResetTimer() {
        if (this.detailSwipeResetTimer) {
          clearTimeout(this.detailSwipeResetTimer);
          this.detailSwipeResetTimer = null;
        }
      },
      resetDetailSwipeState(immediate = false, targetOpacity = 1) {
        this.clearDetailSwipeResetTimer();
        this.detailSwipeTracking = false;
        this.detailSwipeEligible = false;
        this.detailSwipeDirection = null;
        this.detailSwipeProgress = 0;
        this.detailSwipeCanTrigger = false;
        if (immediate) {
          this.detailSwipeResetting = false;
          this.detailSwipeOpacity = targetOpacity;
        } else {
          this.detailSwipeResetting = true;
          this.detailSwipeOpacity = targetOpacity;
          this.detailSwipeResetTimer = setTimeout(() => {
            this.detailSwipeResetting = false;
            this.detailSwipeResetTimer = null;
          }, 200);
        }
      },
      canSwipeDetail(direction) {
        if (this.fromSearch) return false;
        if (!this.attraction || this.loading) return false;
        if (this.isFavoritesMode && this.favNav.length > 0) {
          if (direction === 'left') return this.favIndex < this.favNav.length - 1;
          if (direction === 'right') return this.favIndex > 0;
        } else {
          if (direction === 'left') {
            if (Array.isArray(this.ids) && this.ids.length && this.index < this.ids.length - 1) return true;
            return this.hasNextPage;
          }
          if (direction === 'right') {
            if (this.index > 0) return true;
            return this.listPage > 1;
          }
        }
        return false;
      },
      onDetailSwipeStart(evt) {
        if (window.innerWidth > 768) return;
        if (this.fullscreenImage || this.loading) return;
        if (!this.isMobileViewport() || !this.isTouchDevice()) return;
        if (evt.touches && evt.touches.length > 1) return;
        const touch = evt.touches ? evt.touches[0] : null;
        if (!touch) return;
        this.clearDetailSwipeResetTimer();
        this.detailSwipeTracking = true;
        this.detailSwipeEligible = false;
        this.detailSwipeDirection = null;
        this.detailSwipeProgress = 0;
        this.detailSwipeCanTrigger = false;
        this.detailSwipeResetting = false;
        this.detailSwipeStartX = touch.clientX;
        this.detailSwipeStartY = touch.clientY;
      },
      onDetailSwipeMove(evt) {
        if (!this.detailSwipeTracking || this.fullscreenImage) return;
        if (!evt.touches || evt.touches.length > 1) {
          this.resetDetailSwipeState(true);
          return;
        }
        const touch = evt.touches[0];
        const dx = touch.clientX - this.detailSwipeStartX;
        const dy = touch.clientY - this.detailSwipeStartY;
        if (!this.detailSwipeDirection) {
          if (Math.abs(dx) > 12 && Math.abs(dx) > Math.abs(dy)) {
            this.detailSwipeDirection = dx > 0 ? 'right' : 'left';
            this.detailSwipeEligible = true;
          } else if (Math.abs(dy) > 12) {
            this.resetDetailSwipeState(true);
            return;
          } else {
            return;
          }
        }
        if (!this.detailSwipeEligible) return;
        const canTrigger = this.canSwipeDetail(this.detailSwipeDirection);
        this.detailSwipeCanTrigger = canTrigger;
        const absDx = Math.abs(dx);
        const progress = Math.min(1, absDx / this.detailSwipeTriggerDistance);
        this.detailSwipeProgress = progress;
        const fadeFactor = 0.8; // 阈值时约20%不透明（80%透明）
        this.detailSwipeOpacity = Math.max(0.2, 1 - fadeFactor * progress);
        if (Math.abs(dx) > Math.abs(dy) && evt.cancelable) evt.preventDefault();
      },
      onDetailSwipeEnd() {
        if (!this.detailSwipeTracking) return;
        const shouldTrigger = this.detailSwipeEligible && this.detailSwipeProgress >= 1 && this.detailSwipeCanTrigger;
        const direction = this.detailSwipeDirection;
        this.resetDetailSwipeState(false, shouldTrigger ? 0.2 : 1);
        if (shouldTrigger && direction) {
          if (direction === 'left') this.nextPage();
          else this.prevPage();
        }
      },
      onDetailSwipeCancel() {
        if (!this.detailSwipeTracking) return;
        this.resetDetailSwipeState(false);
      },

      translateCounty(country) {
        return this.countyTranslations[country] || '省份';
      },
      async fetchAttractionDetails() {
        const cacheKey = `attractionCache_${this.country}_${this.id}`;
        const readCachedDetail = () => { try { const raw = localStorage.getItem(cacheKey); return raw ? JSON.parse(raw) : null; } catch (e) { return null; } };
        const saveCachedDetail = (payload) => { try { localStorage.setItem(cacheKey, JSON.stringify(payload)); } catch (e) {} };

        // 自创景点：从本地缓存读取并展示
        if (String(this.country) === 'custom') {
          const a = findCustomAttractionById(this.id)
          if (a) {
            this.attraction = a
            this.loading = false
            this.image1 = a?.images?.main || null
            this.image2 = (a?.images?.secondary && a.images.secondary[0]) ? a.images.secondary[0] : null
            this.image3 = (a?.images?.secondary && a.images.secondary[1]) ? a.images.secondary[1] : null
            try {
              if (!this.image1 && a.hasImage1) {
                const u1 = await getCustomImageUrl(`${this.id}:main`)
                if (u1) this.image1 = u1
              }
              if (!this.image2 && a.hasImage2) {
                const u2 = await getCustomImageUrl(`${this.id}:sec0`)
                if (u2) this.image2 = u2
              }
              if (!this.image3 && a.hasImage3) {
                const u3 = await getCustomImageUrl(`${this.id}:sec1`)
                if (u3) this.image3 = u3
              }
            } catch (e) {}
            return
          } else {
            this.attraction = {
              name: '未找到的自创景点',
              rating: 0,
              total_reviews: 0,
              positive_reviews: 0,
              region: '', county: '', position: '', duration: '', details: '', overview: ''
            }
            this.loading = false
            return
          }
        }

        // 1️⃣ 拉取 JSON 数据（平台景点），失败则回退本地缓存
        let data = null;
        try {
          const response = await fetch(`https://juseaxerf.com/api/attraction/${this.country}/${this.id}`, withBackendApiKey());
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          const parsed = await response.json();
          if (!parsed || typeof parsed !== 'object') throw new Error('Invalid payload');
          data = parsed;
          saveCachedDetail(parsed);
        } catch (e) {
          const cached = readCachedDetail();
          if (cached) {
            data = cached;
          } else {
            console.error('详情拉取失败且无缓存', e);
            this.loading = false;
            return;
          }
        }

        // ② 展示文本内容
        this.attraction = data;
        this.loading = false;

        // ③ 如有图片，继续异步拉取（离线情况下会命中 fetchCache 的 fallback）
        for (let i = 1; i <= 3; i++) {
          if (data[`hasImage${i}`]) {
            fetch(`https://juseaxerf.com/api/attraction-image/${this.country}/${this.id}/${i}`, withBackendApiKey())
              .then(response => {
                if (!response.ok) throw new Error('Failed to fetch image');
                return response.blob();
              })
              .then(blob => {
                const url = URL.createObjectURL(blob);
                this[`image${i}`] = url;
              })
              .catch(() => {});
          }
        }
      },
      getDistanceQueueSnapshot() {
        try {
          const raw = localStorage.getItem('distanceBrowseQueue');
          if (!raw) return null;
          const obj = JSON.parse(raw);
          if (!obj || String(obj.country || '') !== String(this.country)) return null;
          if (!Array.isArray(obj.items) || !obj.items.length) return null;
          return obj;
        } catch (e) {
          return null;
        }
      },
      syncIdsWithDistanceQueue() {
        const order = localStorage.getItem('attractionsOrder') || '';
        if (order !== 'distance_near') {
          // 地图进入但未启用距离模式时，避免沿用旧 ids
          if (this.fromMap) {
            this.ids = [this.id];
            this.listPage = 1;
            this.index = 0;
            this.hasNextPage = false;
            try { localStorage.setItem('ids', this.ids.join(',')); localStorage.setItem('attractionIndex', '0'); } catch (e) {}
          }
          return;
        }
        const queue = this.getDistanceQueueSnapshot();
        if (!queue || !Array.isArray(queue.items) || !queue.items.length) {
          this.clearDistanceQueueStorage();
          this.ids = [this.id];
          this.listPage = 1;
          this.index = 0;
          this.hasNextPage = false;
          try { localStorage.setItem('ids', this.ids.join(',')); localStorage.setItem('attractionIndex', '0'); } catch (e) {}
          return;
        }
        const hitIndex = queue.items.findIndex(it => String(it.id) === String(this.id));
        if (hitIndex === -1) {
          this.clearDistanceQueueStorage();
          this.ids = [this.id];
          this.listPage = 1;
          this.index = 0;
          this.hasNextPage = false;
          try { localStorage.setItem('ids', this.ids.join(',')); localStorage.setItem('attractionIndex', '0'); } catch (e) {}
          return;
        }
        let targetPage = parseInt(localStorage.getItem('attractionsPage'), 10);
        if (!Number.isFinite(targetPage) || targetPage <= 0) {
          const hit = queue.items[hitIndex];
          targetPage = (hit && hit.page) ? hit.page : Math.floor(hitIndex / this.listPageLimit) + 1;
        }
        const start = (targetPage - 1) * this.listPageLimit;
        const slice = queue.items.slice(start, start + this.listPageLimit);
        if (slice.length) {
          this.ids = slice.map(it => it.id);
          this.listPage = targetPage;
          const localIndex = slice.findIndex(it => String(it.id) === String(this.id));
          this.index = localIndex >= 0 ? localIndex : 0;
          try {
            localStorage.setItem('ids', this.ids.join(','));
            localStorage.setItem('attractionIndex', String(this.index));
            localStorage.setItem('attractionsPage', String(this.listPage));
          } catch (e) {}
        }
        this.hasNextPage = queue.items.length > targetPage * this.listPageLimit;
      },
      clearDistanceQueueStorage() {
        try { localStorage.removeItem('distanceBrowseQueue'); } catch (e) {}
      },
      getFiltersFromStorage() {
        const out = { minReviews: 0, region: '', county: '' };
        try { const v = localStorage.getItem('attractionMinReviews'); if (v !== null && v !== '' && !Number.isNaN(parseInt(v,10))) out.minReviews = parseInt(v,10); } catch (e) {}
        try { const v = localStorage.getItem('attractionsRegion'); if (v !== null) out.region = v; } catch (e) {}
        try { const v = localStorage.getItem('attractionsCounty'); if (v !== null) out.county = v; } catch (e) {}
        return out;
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
            const base = (typeof getLastApiBase === 'function' ? getLastApiBase() : '') || 'https://juseaxerf.com';
          const resp = await fetch(`${base}/api/attractions/${country}?${params.toString()}`, withBackendApiKey());
          const data = resp && resp.ok ? await resp.json() : null;
          if (!data || !Array.isArray(data.data)) return [];
          return data.data
            .filter(item => !Number.isFinite(Number(item && item.lat)) || !Number.isFinite(Number(item && item.lng)))
            .map(item => ({ ...item, lat: null, lng: null, country }));
        } catch (e) {
          return [];
        }
      },
      async ensureDistanceQueueForMapEntry() {
        if (!this.fromMap) return;
        const existing = this.getDistanceQueueSnapshot();
        if (existing && String(existing.country || '') === String(this.country) && Array.isArray(existing.items) && existing.items.some(it => String(it.id) === String(this.id))) {
          return;
        }
        const filters = this.getFiltersFromStorage();
        let positions = [];
        try {
          positions = await fetchAttractionsPositions(this.country);
        } catch (e) { positions = []; }
        try {
          const extra = await this.fetchNonGeoQueueCandidates(this.country, filters);
          if (Array.isArray(extra) && extra.length) positions = positions.concat(extra);
        } catch (e) {}
        if (!Array.isArray(positions) || !positions.length) return;
        let baseItem = positions.find(p => String(p.id) === String(this.id));
        const currentIdStr = String(this.id);
        let baseLat = Number(baseItem && baseItem.lat);
        let baseLng = Number(baseItem && baseItem.lng);
        if (!Number.isFinite(baseLat) || !Number.isFinite(baseLng)) {
          const fallback = positions.find(p => String(p && p.id) === currentIdStr && Number.isFinite(p && p.lat) && Number.isFinite(p && p.lng));
          if (fallback) {
            baseItem = { ...fallback };
            baseLat = Number(fallback.lat);
            baseLng = Number(fallback.lng);
          }
        }
        if (!Number.isFinite(baseLat) || !Number.isFinite(baseLng)) return;
        const normalize = (p) => {
          const lat = Number(p && p.lat);
          const lng = Number(p && p.lng);
          return {
            id: p && p.id,
            name: (p && p.name) || '',
            region: (p && p.region) || '',
            county: (p && p.county) || '',
            rating: p && p.rating,
            total_reviews: p && p.total_reviews,
            positive_reviews: p && p.positive_reviews,
            hasImage: !!(p && p.hasImage),
            lat: Number.isFinite(lat) ? lat : null,
            lng: Number.isFinite(lng) ? lng : null,
          };
        };
        const passFilters = (item) => {
          if (!item) return false;
          if (typeof item.total_reviews !== 'undefined' && item.total_reviews !== null) {
            const tr = parseInt(item.total_reviews, 10);
            if (Number.isFinite(tr) && tr < (filters.minReviews || 0)) return false;
          }
          if (filters.county && String(item.county||'') !== String(filters.county)) return false;
          if (filters.region && String(item.region||'') !== String(filters.region)) return false;
          return true;
        };
        const withCoords = [];
        const withoutCoords = [];
        const pageSize = 20;
        const dedupe = new Set();
        for (const p of positions) {
          const norm = normalize(p);
          if (!norm || !norm.id) continue;
          const key = String(norm.id);
          if (dedupe.has(key)) continue;
          dedupe.add(key);
          if (!passFilters(norm)) continue;
          const hasGeo = Number.isFinite(norm.lat) && Number.isFinite(norm.lng);
          norm.distance = hasGeo ? this.computeDistanceKm(baseLat, baseLng, norm.lat, norm.lng) : null;
          if (hasGeo) withCoords.push(norm); else withoutCoords.push(norm);
        }
        if (!withCoords.length && !withoutCoords.length) {
          // 无法通过筛选时，退回无筛选全量
          withCoords.length = 0; withoutCoords.length = 0; dedupe.clear();
          for (const p of positions) {
            const norm = normalize(p);
            if (!norm || !norm.id) continue;
            const key = String(norm.id);
            if (dedupe.has(key)) continue;
            dedupe.add(key);
            const hasGeo = Number.isFinite(norm.lat) && Number.isFinite(norm.lng);
            norm.distance = hasGeo ? this.computeDistanceKm(baseLat, baseLng, norm.lat, norm.lng) : null;
            if (hasGeo) withCoords.push(norm); else withoutCoords.push(norm);
          }
          if (!withCoords.length && !withoutCoords.length) return;
        }
        const baseCandidate =
          withCoords.find(i => String(i.id) === currentIdStr) ||
          withoutCoords.find(i => String(i.id) === currentIdStr) ||
          normalize({ ...baseItem, lat: baseLat, lng: baseLng });
        if (baseCandidate && Number.isFinite(baseLat) && Number.isFinite(baseLng) && Number.isFinite(baseCandidate.lat) && Number.isFinite(baseCandidate.lng)) {
          baseCandidate.distance = this.computeDistanceKm(baseLat, baseLng, baseCandidate.lat, baseCandidate.lng);
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
        const queue = [baseCandidate, ...zeroDistance, ...nonZeroWith, ...restWithout].filter(Boolean);
        queue.forEach((item, idx) => { item.page = Math.floor(idx / pageSize) + 1; });
        const currentPage = queue.find(i => String(i.id) === currentIdStr)?.page || 1;
        const payload = {
          country: String(this.country),
          filters: {
            minReviews: Number(filters.minReviews) || 0,
            region: filters.region || '',
            county: filters.county || '',
          },
          baseId: currentIdStr,
          generatedAt: Date.now(),
          items: queue,
        };
        try {
          const safe = (k, v) => {
            try { localStorage.setItem(k, v); return true; } catch (err) {
              try {
                Object.keys(localStorage).filter(key => /^allGeoSnapshot_/i.test(key)).forEach(key => { try { localStorage.removeItem(key); } catch (_) {} });
              } catch (_) {}
              try { localStorage.setItem(k, v); return true; } catch (_) { return false; }
            }
          };
          safe('distanceBrowseQueue', JSON.stringify(payload));
          safe('attractionsOrder', 'distance_near');
          safe('attractionsPage', String(currentPage));
        } catch (e) {}
        this.syncIdsWithDistanceQueue();
      },
      updateLastRoutePage(targetPage) {
        try {
          const last = localStorage.getItem('lastAttractionsRoute') || '';
          if (last) {
            const url = new URL(last, window.location.origin);
            const params = new URLSearchParams(url.search || '');
            params.set('page', targetPage);
            const search = params.toString();
            localStorage.setItem('lastAttractionsRoute', `${url.pathname}${search ? `?${search}` : ''}`);
            return;
          }
        } catch (e) {}
        try { localStorage.setItem('lastAttractionsRoute', `/attractions/${this.country}?page=${targetPage}`); } catch (e) {}
      },
      buildListQueryParams(pageNumber) {
        const params = new URLSearchParams();
        params.append('page', pageNumber);
        params.append('limit', this.listPageLimit);
        const order = localStorage.getItem('attractionsOrder') || 'rating_desc';
        if (order) params.append('order', order);
        if (order === 'rating_desc') params.append('secondary', 'reviews_desc');
        const minReviewsRaw = localStorage.getItem('attractionMinReviews');
        if (minReviewsRaw !== null && minReviewsRaw !== undefined && String(minReviewsRaw).trim() !== '') {
          params.append('minReviews', minReviewsRaw);
        }
        const region = localStorage.getItem('attractionsRegion') || '';
        const county = localStorage.getItem('attractionsCounty') || '';
        if (region) params.append('region', region);
        if (county) params.append('county', county);
        return params;
      },
      async loadListPage(targetPage) {
        try {
          const order = localStorage.getItem('attractionsOrder') || 'rating_desc';
          if (order === 'distance_near') {
            const queue = this.getDistanceQueueSnapshot();
            if (!queue || !Array.isArray(queue.items)) { this.hasNextPage = false; return false; }
            const start = (targetPage - 1) * this.listPageLimit;
            const slice = queue.items.slice(start, start + this.listPageLimit);
            if (!slice.length) { this.hasNextPage = false; return false; }
            this.ids = slice.map(item => item.id);
            try { localStorage.setItem('ids', this.ids.join(',')); } catch (e) {}
            this.listPage = targetPage;
            try { localStorage.setItem('attractionsPage', String(targetPage)); } catch (e) {}
            this.updateLastRoutePage(targetPage);
            this.hasNextPage = queue.items.length > targetPage * this.listPageLimit;
            return true;
          }
        } catch (e) {}
          try {
            const params = this.buildListQueryParams(targetPage);
          const response = await fetch(`https://juseaxerf.com/api/attractions/${this.country}?${params.toString()}`, withBackendApiKey());
          const data = await response.json();
          if (data && Array.isArray(data.data) && data.data.length) {
            this.ids = data.data.map(item => item.id);
            try { localStorage.setItem('ids', this.ids.join(',')); } catch (e) {}
            this.listPage = targetPage;
            try { localStorage.setItem('attractionsPage', String(targetPage)); } catch (e) {}
            this.updateLastRoutePage(targetPage);
            this.hasNextPage = data.data.length >= this.listPageLimit;
            return true;
          }
          this.hasNextPage = false;
          return false;
        } catch (e) {
          this.hasNextPage = false;
          return false;
        }
      },
      goToListIndex(targetIndex) {
        if (!Array.isArray(this.ids) || targetIndex < 0 || targetIndex >= this.ids.length) return;
        const targetId = this.ids[targetIndex];
        try { localStorage.setItem('attractionIndex', String(targetIndex)); } catch (e) {}
        this.index = targetIndex;
        this.attraction = null;
        for (let i = 1; i <=3; i++) this[`image${i}`] = null;
        this.loading = true;
        this.$router.push(`${targetId}`);
      },

      async nextPage() {
        this.resetDetailSwipeState(true);
        if (this.isFavoritesMode && this.favNav.length > 0) {
          if (this.favIndex < this.favNav.length - 1) {
            this.favIndex++;
            localStorage.setItem('favIndex', String(this.favIndex));
            const target = this.favNav[this.favIndex];
            this.$router.push(`/attraction/${target.country}/${target.id}?from=favorites`);
          }
          return;
        }
        if (this.fromSearch) return;
        if (Array.isArray(this.ids) && this.ids.length && this.index < this.ids.length - 1) {
          this.goToListIndex(this.index + 1);
          return;
        }
        const nextListPage = this.listPage + 1;
        const loaded = await this.loadListPage(nextListPage);
        if (loaded) {
          this.goToListIndex(0);
        }
      },

      async prevPage() {
        this.resetDetailSwipeState(true);
        if (this.isFavoritesMode && this.favNav.length > 0) {
          if (this.favIndex > 0) {
            this.favIndex--;
            localStorage.setItem('favIndex', String(this.favIndex));
            const target = this.favNav[this.favIndex];
            this.$router.push(`/attraction/${target.country}/${target.id}?from=favorites`);
          }
          return;
        }
        if (this.fromSearch) return;
        if (this.index > 0) {
          this.goToListIndex(this.index - 1);
          return;
        }
        if (this.listPage > 1) {
          const prevListPage = this.listPage - 1;
          const loaded = await this.loadListPage(prevListPage);
          if (loaded && Array.isArray(this.ids) && this.ids.length) {
            this.goToListIndex(this.ids.length - 1);
            this.hasNextPage = true;
          }
        }
      },

      goBack() {
        if (this.fullscreenImage) { this.closeFullscreen(); return; }
        // 来自地图：返回上一页（地图）
        if (this.fromMap) {
          try {
            const lastMap = sessionStorage.getItem('lastMapRoute');
            if (lastMap) {
              this.$router.push(lastMap);
              return;
            }
          } catch (e) {}
          this.$router.push({ path: `/map/${this.country}` });
          return;
        }
        // 默认：回到列表
        const last = localStorage.getItem('lastAttractionsRoute');
        if (last) { this.$router.push(last); return; }
        const page = localStorage.getItem('attractionsPage') || 1;
        this.$router.push(`/attractions/${this.country}?page=${page}`);
      },

      openFullscreen(imageData) {
        this.fullscreenImage = imageData;
        this.imageScale = 1;
        this.imageTranslateX = 0;
        this.imageTranslateY = 0;
        document.body.style.overflow = 'hidden';
      },

      closeFullscreen() {
        this.fullscreenImage = null;
        this.imageScale = 1;
        this.imageTranslateX = 0;
        this.imageTranslateY = 0;
        document.body.style.overflow = '';
        // 退出详情页或关闭全屏后，不再持有列表传来的颜色，避免污染下次进入
        try { localStorage.removeItem('selectedAttractionRatingColor'); } catch(e) {}
      },
      onCustomUpdated(saved) {
        try {
          // 刷新当前详情对象
          const a = findCustomAttractionById(saved && saved.id ? saved.id : this.id);
          if (a) {
            this.attraction = a;
            // 刷新图片（从 IndexedDB 取最新）
            this.image1 = null; this.image2 = null; this.image3 = null;
            this.$nextTick(async () => {
              try { if (a.hasImage1) this.image1 = await getCustomImageUrl(`${a.id}:main`); } catch(e) {}
              try { if (a.hasImage2) this.image2 = await getCustomImageUrl(`${a.id}:sec0`); } catch(e) {}
              try { if (a.hasImage3) this.image3 = await getCustomImageUrl(`${a.id}:sec1`); } catch(e) {}
            });
          }
        } catch (e) {}
        // 同步更新收藏菜单中该自创景点的信息（名称/地域/具体位置等）
        try {
          const raw = localStorage.getItem('favoriteTabs_all');
          if (raw) {
            const tabs = JSON.parse(raw) || [];
            const id = (saved && saved.id) ? String(saved.id) : String(this.id);
            tabs.forEach(t => {
              if (Array.isArray(t.items)) {
                t.items.forEach(it => {
                  if (String(it.id) === id && String(it.country||'') === 'custom') {
                    if (saved && saved.name !== undefined) it.name = saved.name;
                    if (saved && saved.region !== undefined) it.region = saved.region;
                    if (saved && saved.county !== undefined) it.county = saved.county;
                    if (saved && saved.position !== undefined) it.position = saved.position;
                    if (saved && saved.rating !== undefined) it.rating = saved.rating;
                  }
                });
              }
            });
            localStorage.setItem('favoriteTabs_all', JSON.stringify(tabs));
          }
        } catch (e) {}
        // 兼容旧结构（如存在）
        try {
          const rawOld = localStorage.getItem('favorites_all');
          if (rawOld) {
            const list = JSON.parse(rawOld) || [];
            const id = (saved && saved.id) ? String(saved.id) : String(this.id);
            list.forEach(it => {
              if (String(it.id) === id && String(it.country||'') === 'custom') {
                if (saved && saved.name !== undefined) it.name = saved.name;
                if (saved && saved.region !== undefined) it.region = saved.region;
                if (saved && saved.county !== undefined) it.county = saved.county;
                if (saved && saved.position !== undefined) it.position = saved.position;
                if (saved && saved.rating !== undefined) it.rating = saved.rating;
              }
            });
            localStorage.setItem('favorites_all', JSON.stringify(list));
          }
        } catch (e) {}
      },

      handleWheel(event) {
        event.preventDefault();
        const delta = event.deltaY > 0 ? -0.1 : 0.1;
        const newScale = Math.max(0.5, Math.min(3, this.imageScale + delta));
        this.imageScale = newScale;
      },

      handleTouchStart(event) {
        if (event.touches.length === 2) {
          // 双指操作
          const touch1 = event.touches[0];
          const touch2 = event.touches[1];
          this.lastTouchDistance = Math.sqrt(
            Math.pow(touch2.clientX - touch1.clientX, 2) + 
            Math.pow(touch2.clientY - touch1.clientY, 2)
          );
          this.lastTouchCenter = {
            x: (touch1.clientX + touch2.clientX) / 2,
            y: (touch1.clientY + touch2.clientY) / 2
          };
        } else if (event.touches.length === 1) {
          // 单指拖拽
          this.isDragging = true;
        }
      },

      handleTouchMove(event) {
        event.preventDefault();
        if (event.touches.length === 2) {
          // 双指缩放
          const touch1 = event.touches[0];
          const touch2 = event.touches[1];
          const currentDistance = Math.sqrt(
            Math.pow(touch2.clientX - touch1.clientX, 2) + 
            Math.pow(touch2.clientY - touch1.clientY, 2)
          );
          const scaleChange = currentDistance / this.lastTouchDistance;
          this.imageScale = Math.max(0.5, Math.min(3, this.imageScale * scaleChange));
          this.lastTouchDistance = currentDistance;
        } else if (event.touches.length === 1 && this.isDragging) {
          // 单指拖拽
          const touch = event.touches[0];
          this.imageTranslateX += touch.clientX - this.lastTouchCenter.x;
          this.imageTranslateY += touch.clientY - this.lastTouchCenter.y;
          this.lastTouchCenter = { x: touch.clientX, y: touch.clientY };
        }
      },

      handleTouchEnd(event) {
        this.isDragging = false;
        this.lastTouchDistance = 0;
      },

      handleMouseDown(event) {
        this.isDragging = true;
        this.lastTouchCenter = { x: event.clientX, y: event.clientY };
      },

      handleMouseMove(event) {
        if (this.isDragging) {
          this.hasDragged = true;
          this.imageTranslateX += event.clientX - this.lastTouchCenter.x;
          this.imageTranslateY += event.clientY - this.lastTouchCenter.y;
          this.lastTouchCenter = { x: event.clientX, y: event.clientY };
        }
      },

      handleMouseUp(event) {
        this.isDragging = false;
      },

      handleOverlayClick(event) {
        // 只有在没有拖动的情况下才退出全屏
        if (!this.isDragging && !this.hasDragged) {
          this.closeFullscreen();
        }
        this.hasDragged = false;
      },

      getRatingColor(rating) {
        // 兼容 "95"、"95%"、数字类型、空值等，且限制在 0-100
        const raw = typeof rating === 'number' ? rating : parseFloat(String(rating || '').replace('%', '').trim());
        const ratingValue = Number.isFinite(raw) ? Math.max(0, Math.min(100, raw)) : 0;
        if (ratingValue <= 50) {
          return '#ff3b30';
        }
        if (ratingValue >= 100) {
          return '#34c759';
        }
        const x = (ratingValue - 50) / 50;
        const red = Math.round(255 * Math.max(0, 1 - 10 * x));
        const green = Math.round(255 * x);
        return `rgb(${red}, ${green}, 0)`;
      }
    }
  };
  </script>


<style scoped>

/* 闪光骨架样式 */
.image-skeleton {
  width: 100%;
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: 12px;
}

@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

.main-image-skeleton { height: 350px; border-radius: 24px; }
.secondary-image-skeleton { height: 250px; border-radius: 20px; }


.container {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
}

.fixed-header {
  position: sticky;
  top: 0;
  z-index: 20;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  padding:0; /* 原 20px 的一半 */
  box-shadow: 0 2px 6px rgba(0,0,0,0.1);
}

.scroll-content {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  padding-bottom: 10px;
}

/* 加载状态 */
.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  text-align: center;
}

.loading-text {
  margin-top: 20px;
  color: #6e6e73;
  font-size: 1.1rem;
}

/* 页面头部 */
.page-header {
  padding: 6px;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
  position: relative;
  min-height: 60px;
}

.header-left-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

  .header-content {
    text-align: center;
    margin-top: 0;
  }

  .title-row {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
  }

.attraction-title {
  margin: 0;
}
.title-with-star {
  display: inline-flex;
  align-items: center;
  gap: 4px; /* 与标题更贴近 */
  padding-right: 24px;
}
.title-with-star .title-text { display: inline-block; }
.star-btn {
  appearance: none;
  border: none;
  background: transparent;
  padding: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}
.star-btn .star-icon {
  width: 20px;
  height: 20px;
  fill: transparent;
  stroke: #111;
  stroke-width: 1.6;
}
.star-btn.favorited {
}
.star-btn.favorited .star-icon {
  fill: #ffd700; /* 金色实心 */
  stroke: #d4af37;
}

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
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 4px 15px rgba(0, 122, 255, 0.3);
  position: relative;
  overflow: hidden;
  clip-path: polygon(20px 0, 100% 0, 100% 100%, 20px 100%, 0 50%);
}

/* 删除确认样式（与收藏选项卡删除一致风格） */
.confirm-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,.35); display: flex; align-items: center; justify-content: center; z-index: 3000; }
.confirm-dialog { display: inline-block; width: auto; max-width: 90vw; background: #fff; border-radius: 12px; box-shadow: 0 12px 24px rgba(0,0,0,.2); overflow: hidden; }
.confirm-message { padding: 10px 12px; font-size: 14px; color: #111827; border-bottom: 1px solid #eef0f3; text-align: center; }
.danger-word { color: #e11d48; font-weight: 700; font-size: 18px; }
.confirm-actions { display: flex; justify-content: flex-end; gap: 8px; padding: 8px 12px; }
.btn-cancel { background: #fff; border: 1px solid #cfd6e4; color: #334155; padding: 8px 14px; border-radius: 8px; cursor: pointer; }
.btn-danger { background: #ef4444; border: 1px solid #dc2626; color: #fff; padding: 8px 14px; border-radius: 8px; cursor: pointer; }

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

.back-button:hover::before {
  left: 100%;
}

.back-button:hover {
  background: linear-gradient(135deg, #0056cc 0%, #004bb5 100%);
  transform: translateY(-3px) scale(1.02);
  box-shadow: 0 8px 25px rgba(0, 122, 255, 0.4);
}

.back-button:active {
  transform: translateY(-1px) scale(0.98);
  box-shadow: 0 4px 15px rgba(0, 122, 255, 0.3);
}

.top-back-button {
  margin: 8px;
}

.bottom-back-button {
  margin-bottom: 0;
  align-self: center;
}

/* 编辑按钮（自创景点） */
.edit-button {
  padding: 6px 12px;
  border-radius: 10px;
  background: #e5e7eb;
  color: #111827;
  border: none;
  cursor: pointer;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
}

.edit-button-mobile {
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
}

.edit-button-desktop {
  display: none;
}

.edit-button:hover { filter: brightness(0.95); }

.back-icon {
  font-size: 18px;
  font-weight: bold;
  transition: transform 0.3s ease;
}

.back-button:hover .back-icon {
  transform: translateX(-2px);
}

.attraction-title {
  font-size: 2.4rem;
  font-weight: 1;
  line-height: 1.2;
}
.fav-badge {
  color: #ffd700;
  margin-right: 8px;
  filter: drop-shadow(0 1px 1px rgba(0,0,0,0.2));
  display: inline-block;
  /* 使星标不受标题渐变文字样式影响 */
  background: none !important;
  -webkit-background-clip: initial !important;
  background-clip: initial !important;
  -webkit-text-fill-color: #ffd700 !important;
}

.rating-section {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
}

.rating-badge {
  background: linear-gradient(135deg, #34c759 0%, #30d158 100%);
  color: white;
  padding: 2px 8px;
  border-radius: 20px;
  font-weight: 600;
  font-size: 1.1rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0;
  line-height: 17px;
}

.rating-label {
  font-size: 0.8rem;
  opacity: 0.9;
}

.rating-text {
  font-size: 1rem;
  font-weight: 700;
}

.reviews-summary {
  display: flex;
  gap: 0;
  color: #6e6e73;
  font-size: 0.95rem;
}

.reviews-summary span {
  padding-left: 36px;
  background: rgba(255, 255, 255, 0.7);
  border-radius: 20px;
  backdrop-filter: blur(10px);
}

/* 位置链接与提示（从地图进入时）颜色保持一致 */
.info-card .info-value .map-link { color: #1a73e8; }
.info-card .info-value .map-link .map-link-hint { margin-left: 6px; }

/* 图片展示区域 */
.images-section {
  padding: 0px;
  padding-bottom: 0px;
  max-width: 1350px;
  margin: 0 auto;
}

.main-image-container {
  margin-bottom: 32px;
  border-radius: 24px;
  overflow: hidden;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
  cursor: pointer;
  position: relative;
}

.main-image-container::after {
  content: '点击查看大图';
  position: absolute;
  bottom: 10px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.7);
  color: white;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.main-image-container:hover::after {
  opacity: 1;
}

.main-image {
  width: 100%;
  height: 333px; /* 默认高度（移动端优先），桌面端下面用比例覆盖 */
  object-fit: cover;
  transition: transform 0.3s ease;
  display: block;
}

.main-image:hover {
  transform: scale(1.02);
}

.secondary-images {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 16px; /* 原 24px 的 2/3 */
}

.secondary-image-container {
  border-radius: 20px;
  overflow: hidden;
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.08);
  cursor: pointer;
  position: relative;
}

.secondary-image-container::after {
  content: '点击查看大图';
  position: absolute;
  bottom: 8px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.7);
  color: white;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 10px;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.secondary-image-container:hover::after {
  opacity: 1;
}

.secondary-image {
  width: 100%;
  height: 250px;
  object-fit: cover;
  transition: transform 0.3s ease;
  display: block;
}

.secondary-image:hover {
  transform: scale(1.05);
}

/* 信息区域 */
.info-section {
  padding: 20px;
  padding-top: 15px;
  max-width: 1400px;
  margin: 0 auto;
}

.info-grid {
  display: grid;
  grid-template-columns: 1fr; /* 移动端单列 */
  gap: 21px; /* 原 32px 的 2/3 */
  grid-template-areas:
    'loc'
    'visit'
    'details'
    'web'; /* 网址放在移动端最底部 */
}

.info-card {
  padding: 32px;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.info-card-wide {
  grid-column: 1 / -1;
  grid-area: details;
}
.info-card-location { grid-area: loc; }
.info-card-visit { grid-area: visit; }
.info-card-website { grid-area: web; }

/* 桌面端：三列平分，让“位置信息 / 游览信息 / 网址”在同一行等宽显示 */
@media (min-width: 1024px) {
  .info-grid {
    grid-template-columns: repeat(3, 1fr);
    grid-template-areas:
      'loc visit web'
      'details details details';
    gap: 16px; /* 桌面：信息卡片间隙为原始 32px 的一半 */
  }
  .info-card { grid-column: auto; }
  .info-card-wide { grid-column: 1 / -1; }

  /* 桌面：主图与次图之间的间隙为原来的 1/2（原 32px） */
  .main-image-container { margin-bottom: 16px; }

  /* 桌面：所有图片缩小为当前的二分之一（居中显示） */
  .main-image-container {
    width: 50%;
    margin-left: auto;
    margin-right: auto;
  }
  .secondary-images {
    width: 50%;
    margin-left: auto;
    margin-right: auto;
    grid-template-columns: 1fr 1fr; /* 在半宽下保持两列布局 */
  }

  /* 桌面：图片区域与信息区域等宽，且保持当前高度不变 */
  .main-image-container {
    width: 100%;           /* 延展至与信息区域一致 */
    margin-left: auto;
    margin-right: auto;
    aspect-ratio: auto;    /* 取消比例约束，保持高度 */
  }
  .main-image {
    width: 100%;
    height: 333px;         /* 保持当前主图高度 */
    object-fit: cover;
  }

  .secondary-images {
    width: 100%;           /* 延展至与信息区域一致 */
    margin-left: auto;
    margin-right: auto;
  }
  .secondary-image-container {
    aspect-ratio: auto;    /* 取消比例约束，保持高度 */
  }
  .secondary-image {
    width: 100%;
    height: 250px;         /* 保持当前次要图片高度 */
    object-fit: cover;
  }

  /* 桌面：图片区域与信息区域之间的间隙为原来的 2/3（原 30px -> 20px） */
  .images-section { padding-bottom: 0; }

  /* 桌面：次要图片网格的间隙为原来的 1/2（原 24px） */
  .secondary-images { gap: 12px; }
}

/* 桌面端专属：标题与操作区重新排布，靠近顶部 */
@media (min-width: 1024px) {
  .page-header {
    padding-top: 10px;
    padding-bottom: 8px;
    display: flex;
    justify-content: center;
    align-items: flex-start;
    min-height: 80px;
  }
  .header-content {
    flex: 1;
    width: 100%;
    position: relative;
    z-index: 1;
  }
  .header-left-group {
    position: absolute;
    top: 0;
    left: 0;
    display: flex;
    align-items: center;
    gap: 0;
    z-index: 2;
  }
  .edit-button-desktop {
    display: inline-flex;
  }
  .edit-button-mobile {
    display: none;
  }
}

.info-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.1);
}

.info-icon {
  font-size: 1.5rem;
  margin-right: 4px;
}

.info-header h3 {
  font-size: 1.25rem;
  font-weight: 600;
  color: #1d1d1f;
  margin: 0;
}

.info-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
  font-weight: 400;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.info-label {
  font-size: 0.85rem;
  color: #8e8e93;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-weight: 500;
}

.info-value {
  font-size: 1rem;
  color: #1d1d1f;
  line-height: 1.5;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
  font-weight: 400;
}

.details-text {
  font-size: 1rem;
  line-height: 1.7;
  color: #1d1d1f;
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
  font-weight: 400;
}

.website-link {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 0;
  background: transparent;
  color: #007aff;
  text-decoration: underline;
  text-decoration-color: #007aff;
  text-underline-offset: 4px;
  transition: all 0.3s ease;
  font-weight: 500;
  border-radius: 0;
}

.website-link:hover {
  color: #0056cc;
  text-decoration-color: #0056cc;
  transform: none;
  box-shadow: none;
}

.website-text {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
  font-weight: 400;
}

.external-icon {
  font-size: 1.2rem;
  margin-left: 12px;
}

/* 导航区域 */
.navigation-section {
  padding: 20px 0;
  padding-top: 0;
  backdrop-filter: blur(10px);
  border-top: 1px solid rgba(255, 255, 255, 0.2);
  display: flex;
  flex-direction: column;
  align-items: center;
}

.navigation-controls {
  display: flex;
  justify-content: flex-start;
  align-items: center;
  gap: 24px;
  max-width: 1200px;
  margin: 0 auto;
  flex-wrap: wrap;
  padding-left: 0;
}

.nav-button {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 16px 32px;
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  color: #495057;
  border: none;
  border-radius: 20px;
  font-size: 16px;
  font-weight: 600;
  font-family: inherit;
  min-width: 180px;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
  position: relative;
  overflow: hidden;
}

.nav-button::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
  transition: left 0.5s;
}

.nav-button:hover::before {
  left: 100%;
}

.nav-button:hover:not(:disabled) {
  background: linear-gradient(135deg, #007aff 0%, #0056cc 100%);
  color: white;
  transform: translateY(-3px) scale(1.02);
  box-shadow: 0 8px 25px rgba(0, 122, 255, 0.3);
}

.nav-button:active:not(:disabled) {
  transform: translateY(-1px) scale(0.98);
  box-shadow: 0 4px 15px rgba(0, 122, 255, 0.2);
}

.nav-button:disabled {
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  color: #adb5bd;
  cursor: not-allowed;
  transform: none;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.nav-icon {
  font-size: 1.1rem;
  font-weight: bold;
  transition: transform 0.3s ease;
}

.nav-button:hover:not(:disabled) .nav-icon {
  transform: scale(1.1);
}

/* 响应式设计 */
@media (max-width: 768px) {

  .title-with-star {
    padding-right: 28px;
    gap: 0;
  }

  .title-with-star > * + * {
    margin-left: 4px;
  }

  .header-left-group {
    gap: 0;
  }

  .header-left-group > * + * {
    margin-left: 8px;
  }

  .back-button {
    gap: 0;
  }

  .back-button > * + * {
    margin-left: 10px;
  }

  .reviews-summary span {
    padding-left: 15px;
  }

  .rating-badge {
    line-height: 13px;
  }

  .edit-button {
    margin-left: 10px;
  }

  .info-section {
    padding: 0px 10px;
    padding-top: 15px;
    margin: 0;
  }

  .fixed-header {
    padding:0;
  }

  .top-back-button {
    display:none;
  }

  .page-header {
    padding: 0;
    padding-bottom:4px;
  }

  .scroll-content {
    padding: 0;
  }

  .rating-label {
    font-size: 0.6rem;
    opacity: 0.9;
  }

  .rating-text {
    font-size: 0.8rem;
    font-weight: 700;
  }
  
  .header-content {
    margin-top: 4px;
  }
  
  .attraction-title {
    margin-bottom:0;
    font-size: 1.7rem;
  }
  
  .rating-section {
    flex-direction: row;
    text-align: center;
  }

  /* 图片展示区域 */

  .main-image-skeleton { height: 200px;; border-radius: 24px; }
  .secondary-image-skeleton { height: 130px; border-radius: 20px; }
  
  .images-section {
    padding-top: 15px;
    padding:10px;
    padding-bottom:0;
  }

  .main-image-container {
    border-radius: 12px;
    margin-bottom: 12px;
  }

  .main-image {
    height: auto;
  }

  .secondary-image-container {
    border-radius: 12px;
  }

  .secondary-images {
    height:auto;
    display: flex;
    flex-wrap: wrap;
    gap: 0;
    margin: -5px; /* 用 margin 还原原先 10px 的间距 */
  }

  .secondary-images > .secondary-image-container {
    flex: 0 0 calc(50% - 10px);
    max-width: calc(50% - 10px);
    width: calc(50% - 10px);
    margin: 5px;
  }

  .secondary-image {
    height: auto;
  }

  /* 信息区域 */

  .info-grid {
    grid-template-columns: 1fr;
    gap: 0;
  }

  .info-grid > * + * {
    margin-top: 16px;
  }

  .info-card {
    padding: 10px;
  }

  .info-header {
    gap: 0;
    margin-bottom: 8px;
    padding-bottom: 8px;
  }

  .info-header > * + * {
    margin-left: 4px;
  }

  .info-icon {
    font-size: 0.8rem;
  }

  .info-header h3 {
    font-size: 0.8rem;
  }

  .info-content {
    flex-direction:row;
    flex-wrap: wrap;      /* 超出宽度的项目换行 */
    gap: 0;
    margin-right: -8px;
    margin-bottom: -8px;

  }

  .info-content > * {
    margin-right: 8px;
    margin-bottom: 8px;
  }

  .info-item {
    gap: 0;
  }

  .info-item > * + * {
    margin-top: 3px;
  }

  .info-label {
    font-size: 0.7rem;
  }

  .details-text {
    font-size: 0.85rem;
  }

  .website-text {
    font-size:0.7rem;
  }

  .website-link {
    padding:0;
  }

  .external-icon {
    font-size:0.7rem;
    margin-left:4px;
  }

  .info-value {
    font-size: 0.85rem;
  }
  
  .navigation-section {
    padding-top:15px;
  }
  
  .navigation-controls {
    flex-direction: row;
    gap: 0;
    justify-content: center;
    width: 100%;
    margin: 0 auto;
  }
  
  .navigation-controls > * {
    margin-right: 16px;
  }

  .nav-button {
    min-width: auto;
    padding: 14px 14px;
    border-radius: 12px;
    font-size: 12px;
    font-weight: 750;
    gap: 0;
  }

  .nav-button > * + * {
    margin-left: 10px;
  }

  .confirm-actions {
    gap: 0;
  }

  .confirm-actions > * + * {
    margin-left: 8px;
  }
}

/* 全屏图片查看器 */
.fullscreen-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.9);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  cursor: pointer;
}

.fullscreen-container {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: grab;
  overflow: hidden;
}

.fullscreen-container:active {
  cursor: grabbing;
}

.fullscreen-image {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  transition: transform 0.1s ease;
  border-radius: 8px;
  user-select: none;
  pointer-events: none;
}

</style>


