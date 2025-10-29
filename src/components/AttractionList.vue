<template>
  <div class="container fade-in">
    <!-- 固定顶部区域（标题 + 筛选器） -->
    <div class="fixed-header">
      <header class="page-header">
        <button @click="goBack" class="back-button top-back-button desktop-back-button">
          返回
        </button>
        <div class="header-content">
          <h1 class="page-title">{{translateCountry(country)}}的景点</h1>
          <p class="page-subtitle">发现{{translateCountry(country)}}最受欢迎的旅行目的地</p>
        </div>
      </header>


      <div class="filters-section card desktop-filters">
        
        <!-- 这里是你原来的筛选器内容 -->
        <div class="filters-grid">
          <div class="filter-group">
            <label for="minReviews">最小评论数</label>
            <input 
              type="number" 
              v-model.number="minReviews" 
              @keyup.enter="validateInputmin" 
              @blur="validateInputmin" 
              min="0" 
              id="minReviews"
              placeholder="0" 
            />
          </div>
          
          <div class="filter-group">
            <label for="order">排序方式</label>
            <select v-model="order" id="order">
              <option value="rating_desc">好评率降序</option>
              <option value="rating_asc">好评率升序</option>
              <option value="reviews_desc">总评论数降序</option>
              <option value="reviews_asc">总评论数升序</option>
              <option value="positive_desc">好评数降序</option>
              <option value="positive_asc">好评数升序</option>
            </select>
          </div>
          
          <div class="filter-group" v-if="countisLoaded && countis.length > 0">
            <label for="county">{{translateCounty(country)}}</label>
              <select v-model="selectedCounty" id="county">
                <option value="">所有{{translateCounty(country)}}</option>
                <option v-for="county in countis" :key="county" :value="county">{{ county }}</option>
              </select>
          </div>
          
          <div class="filter-group">
            <label for="region">地区</label>
              <select v-model="selectedRegion" id="region">
                <option value="">所有地区</option>
                <option v-for="region in regions" :key="region" :value="region">{{ region }}</option>
              </select>
          </div>
        </div>

        <!-- 第二行：仅放两个搜索框，与上面列对齐 -->
        <div class="filters-grid" style="margin-top: 12px;">
          <div class="filter-group">
            <!-- 桌面：第二行第一列，左右平分按钮 -->
            <div class="button-pair">
              <button class="map-button" @click="openMapMode">
                <span class="label-desktop">地图模式</span>
                <span class="label-mobile">地图</span>
              </button>
              <button
                ref="favoritesButtonDesktop"
                class="favorites-button"
                @click="toggleFavoritesMenu"
                title="查看收藏列表"
              >
                <span class="label-desktop">收藏列表</span>
                <span class="label-mobile">收藏</span>
                <span v-if="favorites.length">（{{ favorites.length }}）</span>
              </button>
            </div>
          </div>

          <!-- ✅ 新增：景点搜索框 -->
          <div class="filter-group">
            <div class="search-container">
              <input 
                type="search" 
                v-model="attractionSearch" 
                placeholder="搜索景点..." 
                class="search-input"
                ref="attractionInput"
                @input="filterAttractions(); updateAttractionDropdownPosition()"
                @focus="showAttractionSuggestions = true; updateAttractionDropdownPosition()"
                @blur="hideAttractionSuggestions"
              />
              
              <teleport to="body">
                <div 
                  v-if="showAttractionSuggestions && attractionSearch.trim() && attractionSuggestions.length > 0"
                  class="suggestions-dropdown" 
                  :style="attractionDropdownStyle"
                >
                  <div 
                    v-for="item in attractionSuggestions" 
                    :key="item.id" 
                    class="suggestion-item"
                    @mousedown="selectAttraction(item)"
                  >
                    {{ item.name }}
                  </div>
                </div>
              </teleport>
            </div>
          </div>

          <div class="filter-group" v-if="countisLoaded && countis.length > 0">
            <div class="search-container">
              <input 
                type="search" 
                v-model="countySearch" 
                :placeholder="`搜索${translateCounty(country)}...`"
                class="search-input"
                ref="countyInput"
                @input="filterCounties; updateCountyDropdownPosition()"
                @focus="showCountySuggestions = true; updateCountyDropdownPosition()"
                @blur="hideCountySuggestions"
              />
              <teleport to="body">
                <div v-if="showCountySuggestions && countySearch.trim() && countySuggestions.length > 0" class="suggestions-dropdown" :style="countyDropdownStyle">
                  <div 
                    v-for="county in countySuggestions" 
                    :key="county" 
                    class="suggestion-item"
                    @mousedown="selectCounty(county)"
                  >
                    {{ county }}
                  </div>
                </div>
              </teleport>
            </div>
          </div>
          <div class="filter-group">
            <div class="search-container">
              <input 
                type="search" 
                v-model="regionSearch" 
                placeholder="搜索地区..."
                class="search-input"
                ref="regionInput"
                @input="filterRegions; updateRegionDropdownPosition()"
                @focus="showRegionSuggestions = true; updateRegionDropdownPosition()"
                @blur="hideRegionSuggestions"
              />
              <teleport to="body">
                <div v-if="showRegionSuggestions && regionSearch.trim() && regionSuggestions.length > 0" class="suggestions-dropdown" :style="regionDropdownStyle">
                  <div 
                    v-for="region in regionSuggestions" 
                    :key="region" 
                    class="suggestion-item"
                    @mousedown="selectRegion(region)"
                  >
                    {{ region }}
                  </div>
                </div>
              </teleport>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 滚动内容区域 -->
    <div class="scroll-content">

      <!-- 移动端筛选器 -->
      <div class="filters-section card mobile-filters">
        <div class="mobile-filters-grid">
          <!-- 第一行：最小评论数 -->
          <div class="mobile-filter-row">
            <span class="filter-label">最小评论数</span>
            <!-- 移动：第一行第二列放置最小评论数输入 -->
            <input type="number" v-model.number="minReviews" @keyup.enter="validateInputmin" @blur="validateInputmin" min="0" placeholder="0" />
            <!-- 移动：第一行第三列放置按钮对（左右平分） -->
            <div class="button-pair">
              <button class="map-button" @click="openMapMode">
                <span class="label-desktop">地图模式</span>
                <span class="label-mobile">地图</span>
              </button>
              <button
                ref="favoritesButtonMobile"
                class="favorites-button"
                @click="toggleFavoritesMenu"
                title="查看收藏列表"
              >
                <span class="label-desktop">收藏列表</span>
                <span class="label-mobile">收藏</span>
                <span v-if="favorites.length">（{{ favorites.length }}）</span>
              </button>
            </div>
          </div>

          <!-- 第二行：排序方式 + 景点搜索 -->
          <div class="mobile-filter-row">

            <span class="filter-label">排序方式</span>
            <select v-model="order">
              <option value="rating_desc">好评率降序</option>
              <option value="rating_asc">好评率升序</option>
              <option value="reviews_desc">总评论数降序</option>
              <option value="reviews_asc">总评论数升序</option>
              <option value="positive_desc">好评数降序</option>
              <option value="positive_asc">好评数升序</option>
            </select>
            <input
              type="search"
              v-model="attractionSearch"
              placeholder="搜索景点..."
              ref="mobileAttractionInput"
              @input="filterAttractions(); updateMobileAttractionDropdownPosition()"
              @focus="showAttractionSuggestions = true; updateMobileAttractionDropdownPosition()"
              @blur="hideAttractionSuggestions"
            />
          </div>

          <teleport to="body">
              <div 
                v-if="showAttractionSuggestions && attractionSearch.trim() && attractionSuggestions.length > 0"
                class="suggestions-dropdown" 
                :style="mobileAttractionDropdownStyle"
              >
                <div 
                  v-for="item in attractionSuggestions" 
                  :key="item.id" 
                  class="suggestion-item"
                  @mousedown="selectAttraction(item)"
                >
                  {{ item.name }}
                </div>
              </div>
            </teleport>

          <!-- 第三行：county -->
          <div class="mobile-filter-row" v-if="countisLoaded && countis.length > 0">
            <span class="filter-label">{{translateCounty(country)}}</span>
            <select v-model="selectedCounty">
              <option value="">所有{{translateCounty(country)}}</option>
              <option v-for="county in countis" :key="county" :value="county">{{ county }}</option>
            </select>
            <input 
              type="search" 
              v-model="countySearch" 
              :placeholder="`搜索${translateCounty(country)}...`"
              ref="mobileCountyInput"
              @input="filterCounties(); updateMobileCountyDropdownPosition()"
              @focus="showCountySuggestions = true; updateMobileCountyDropdownPosition()"
              @blur="hideCountySuggestions"
            />

            <teleport to="body">
              <div v-if="showCountySuggestions && countySearch.trim() && countySuggestions.length > 0" 
                  class="suggestions-dropdown" 
                  :style="mobileCountyDropdownStyle">
                <div 
                  v-for="county in countySuggestions" 
                  :key="county" 
                  class="suggestion-item"
                  @mousedown="selectCounty(county)"
                >
                  {{ county }}
                </div>
              </div>
            </teleport>

          </div>

          <!-- 第四行：地区 -->
          <div class="mobile-filter-row">
            <span class="filter-label">地区</span>
            <select v-model="selectedRegion">
              <option value="">所有地区</option>
              <option v-for="region in regions" :key="region" :value="region">{{ region }}</option>
            </select>
            <input 
              type="search" 
              v-model="regionSearch" 
              placeholder="搜索地区..."
              ref="mobileRegionInput"
              @input="filterRegions(); updateMobileRegionDropdownPosition()"
              @focus="showRegionSuggestions = true; updateMobileRegionDropdownPosition()"
              @blur="hideRegionSuggestions"
            />

            <teleport to="body">
              <div v-if="showRegionSuggestions && regionSearch.trim() && regionSuggestions.length > 0" 
                  class="suggestions-dropdown" 
                  :style="mobileRegionDropdownStyle">
                <div 
                  v-for="region in regionSuggestions" 
                  :key="region" 
                  class="suggestion-item"
                  @mousedown="selectRegion(region)"
                >
                  {{ region }}
                </div>
              </div>
            </teleport>


          </div>
        </div>
      </div>

      <!-- 加载状态 -->
      <div v-if="loading" class="loading-container">
        <div class="loading-spinner"></div>
        <p class="loading-text">正在加载景点数据...</p>
      </div>

      <!-- 景点列表 -->
      <div v-if="!loading" class="attractions-section">
        <div v-if="attractions.length === 0" class="empty-state">
          <div class="empty-icon">🏞️</div>
          <h3>暂无景点数据</h3>
          <p>请尝试调整筛选条件</p>
        </div>
        
        <div v-else class="attractions-list attractions-list-desktop" v-fly-in>
          <div
            v-for="(attraction, index) in attractions"
            :key="attraction.id"
            class="attraction-item"
            :class="{ favorited: isFavorited(attraction.id) }"
            @click="handleClick(attraction,index,$event)"
            @mousedown.prevent="startCardPress(attraction, $event)"
            @mouseup.prevent="endCardPress"
            @mouseleave="cancelCardPress"
            @touchstart.prevent="startCardPress(attraction, $event)"
            @touchend.prevent="endCardPress"
            @touchcancel.prevent="cancelCardPress"
          >
            <div class="attraction-image-wrapper attraction-content-desktop">
              <div v-if="!attraction.image1" class="image-placeholder shimmer"></div>
              <img v-fade-in
                v-if="attraction.image1"
                :src="attraction.image1"
                alt="景点图片" 
                class="attraction-image"
               />
            </div>
            
            <div class="attraction-content attraction-content-desktop">
              <div class="attraction-header">
                <h3 class="attraction-name">
                  <span class="attraction-name-text">{{ attraction.name }}</span>
                </h3>
                <div class="attraction-location">
                  <span class="location-icon">📍</span>
                  <span>{{ attraction.region }}, {{ attraction.county }}</span>
                </div>
              </div>
              
              <div class="attraction-stats">
                <div class="stat-item">
                  <span class="stat-number">{{ attraction.total_reviews }}</span>
                  <span class="stat-label">总评论</span>
                </div>
                <div class="stat-item">
                  <span class="stat-number">{{ attraction.positive_reviews }}</span>
                  <span class="stat-label">好评数</span>
                </div>
                <div class="stat-item rating-item">
                  <span class="stat-number rating-number" :style="{ backgroundColor: getRatingColor(attraction.rating) }">{{ attraction.rating }}</span>
                  <span class="stat-label">好评率</span>
                </div>
              </div>
            </div>

            <!-- 移动端内容布局 -->
            <div class="attraction-content-mobile">
              <!-- ✅ 第一行：名字 + 位置 同行显示 -->
              <div class="attraction-header-mobile">
                <h3 class="attraction-name">{{ attraction.name }}</h3>
                <div class="attraction-location">
                  <span class="location-icon">📍</span>
                  <span class="location-text">{{ attraction.region }}, {{ attraction.county }}</span>
                </div>
              </div>

              <!-- 第二行：左图片，右文字 -->
              <div class="attraction-info-row">
                <div class="attraction-image-wrapper">
                  <img v-fade-in v-if="attraction.image1" :src="attraction.image1" alt="景点图片" class="attraction-image" />
                  <div v-else class="image-placeholder shimmer"></div>
                </div>

                <div class="attraction-stats-wrapper">
                  <div class="attraction-stats">
                    <div class="stat-item rating-item">
                      <span class="stat-number rating-number" :style="{ backgroundColor: getRatingColor(attraction.rating) }">{{ attraction.rating }}</span>
                      <span class="stat-label">好评率</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 分页控制 -->
      <div v-if="!loading && attractions.length > 0" class="pagination-section">
        <div class="pagination-controls">
          <button @click="goBack" class="back-button bottom-back-button">
            返回
          </button>
          
          <button @click="prevPage" :disabled="page === 1" class="pagination-button">
            上一页
          </button>
          
                  <div class="page-input-group">
                    <label for="gotoPage">跳转到</label>
                    <input 
                      type="number" 
                      v-model.number="gotoPage" 
                      @keyup.enter="validateInput"
                      @blur="validateInput"
                      id="gotoPage" 
                      :max="totalPages" 
                      :min="1" 
                      placeholder="页码"
                    />
                  </div>
          
          <button @click="nextPage" :disabled="page === totalPages" class="pagination-button">
            下一页
          </button>
        </div>
        
        <div class="pagination-info">
          <span>第 {{ page }} 页，共 {{ totalPages }} 页</span>
        </div>
      </div>
    </div>
    <!-- 收藏菜单（浮层） -->
    <teleport to="body">
      <div
        v-if="showFavorites"
        ref="favoritesMenu"
        class="favorites-menu"
        :style="favoritesMenuStyle"
      >
        <h4>收藏列表</h4>
        <div ref="favoritesList" class="favorites-list">
          <template v-for="(f, i) in sortedFavorites" :key="f.country + '-' + f.id">
            <div
              class="favorites-placeholder"
              v-if="dragging && placeholderIndex === i && dragIndex !== i"
            ></div>
            <div
              class="favorites-item"
              :class="{ 'dragging-shadow': dragging && dragIndex === i }"
              @mousedown.prevent="startMenuItemPress(i, $event)"
              @touchstart.prevent="startMenuItemPress(i, $event)"
              @click.stop="handleMenuItemClick(f, i, $event)"
            >
              <span class="fav-index">{{ f.order }}</span>
              <div class="fav-thumb-wrap">
                <img
                  v-if="favThumbs[thumbKey(f)]"
                  :src="favThumbs[thumbKey(f)]"
                  alt="缩略图"
                  class="fav-thumb"
                />
                <div v-else class="fav-thumb thumb-placeholder"></div>
              </div>
              <div class="fav-main">
                <span class="fav-name">{{ f.name }}</span>
                <span class="fav-meta">{{ f.region }}</span>
              </div>
              <span class="fav-rating" :style="{ backgroundColor: getRatingColor(f.rating) }">{{ f.rating }}</span>
            </div>
          </template>
          <div
            class="favorites-placeholder"
            v-if="dragging && placeholderIndex === sortedFavorites.length"
          ></div>
        </div>
        <!-- 跟随手指/鼠标的拖拽项 -->
        <div
          v-if="dragging && dragItem"
          :style="{
            position: 'fixed',
            top: (dragY - dragOffsetY) + 'px',
            left: (favoritesMenuStyle.left || '0'),
            width: favoritesMenuStyle.width || '320px',
            pointerEvents: 'none',
            zIndex: 1001,
          }"
        >
          <div class="favorites-item dragging-shadow">
            <div class="fav-main">
              <span class="fav-name">{{ dragItem.name }}</span>
              <span class="fav-meta">{{ dragItem.region }}</span>
            </div>
            <span class="fav-rating" :style="{ backgroundColor: getRatingColor(dragItem.rating) }">{{ dragItem.rating }}</span>
          </div>
        </div>
      </div>
    </teleport>
  </div>
</template>
  
  <script>
  import { openDB } from 'idb';

  export default {
    data() {
        return {
          // 收藏相关
          favorites: [],
          showFavorites: false,
          favoritesMenuStyle: {},
          favThumbs: {},
        // 长按相关（卡片）
        pressTimer: null,
        longPressThreshold: 500,
        suppressNextClick: false,
        // 拖拽相关（收藏菜单内）
        dragging: false,
        dragIndex: null,
        dragItem: null,
        dragY: 0,
        dragOffsetY: 0,
        dragListRect: null,
        placeholderIndex: null,
        moveListener: null,
        upListener: null,
        mobileCountyDropdownStyle: {},
        mobileRegionDropdownStyle: {},
        mobileAttractionDropdownStyle: {},
        countisLoaded: false,
        country: this.$route.params.country,
        attractions: [],
        loading: true,
        minReviews: parseInt(localStorage.getItem('attractionMinReviews')) || null, 
        order: localStorage.getItem('attractionsOrder') ||'rating_desc', 
        page: parseInt(localStorage.getItem('attractionsPage')) || 1,
        limit: 20,
        total: 0,
        gotoPage: null,

        countryTranslations: {
          japan: '日本',
          china: '中国',
          singapore: '新加坡',
          malaysia: '马来西亚',
          thailand: '泰国',
          vietnam: '越南',
          switzerland: '瑞士',
          america: '美国',
          canada: '加拿大',
          mexico: '墨西哥',
          iceland: '冰岛',
          denmark: '丹麦',
          australia: '澳大利亚',
          newzealand: '新西兰'
          // 可以添加更多国家的翻译
        },

        countyTranslations: {
          japan: '都/道/府/县',
          china: '省份',
          america: '州',
          canada: '省份',
          mexico: '州',
          australia: '州/领地',
        },

        selectedRegion: localStorage.getItem('attractionsRegion')||'',
        selectedCounty: localStorage.getItem('attractionsCounty')||'',
        regions: [],
        countis: [],
        countySearch: '',
        regionSearch: '',
        filteredCounties: [],
        filteredRegions: [],
        showCountySuggestions: false,
        showRegionSuggestions: false,
        countyDropdownStyle: {},
        regionDropdownStyle: {},

        attractionSearch: '',
        showAttractionSuggestions: false,
        attractionDropdownStyle: {},
        allAttractions: [],
        attractionSuggestions: []
      };
    },

    computed: {
      totalPages() {
        return Math.ceil(this.total / this.limit);
      },
      sortedFavorites() {
        return [...this.favorites].sort((a, b) => (a.order || 0) - (b.order || 0));
      },
      
      countySuggestions() {
        if (!this.countySearch.trim()) return [];
        const q = this.countySearch.toLowerCase();
        return this.countis.filter(c => c && c.toLowerCase().includes(q));
      },
      regionSuggestions() {
        if (!this.regionSearch.trim()) return [];
        const q = this.regionSearch.toLowerCase();
        return this.regions.filter(r => r && r.toLowerCase().includes(q));
      }
    },
    async created() {
      this.fetchAttractions(false);
      this.fetchRegions();
      this.fetchCountis();
      this.fetchAllAttractions();
      this.loadFavorites();
    },

    watch: {
      // 移除在输入时立即触发的行为

      order() {
        localStorage.setItem('attractionsPage', this.page); // 保存当前页数到localStorage
        localStorage.setItem('attractionsOrder',this.order);
        this.fetchAttractions(false);}, // **新增的watch**


      selectedRegion() {
        this.page = 1;
        localStorage.setItem('attractionsPage', this.page); 
        localStorage.setItem('attractionsRegion', this.selectedRegion);
        this.fetchAttractions(true);
        this.fetchAllAttractions();},

      selectedCounty() {
        this.selectedRegion = ''; // 重置地区
        localStorage.setItem('attractionsRegion', ''); // 保存到 localStorage 
        this.fetchRegions();
        this.page = 1;
        localStorage.setItem('attractionsPage', this.page); 
        localStorage.setItem('attractionsCounty',this.selectedCounty)
        this.fetchAttractions(true);
        this.fetchAllAttractions();},


    },

    methods: {
      openMapMode() {
        // 预留地图模式入口（目前仅占位）
        try { console.log('打开地图模式', this.country); } catch(e) {}
      },

      // ========= 收藏相关 =========
      loadFavorites() {
        try {
          const key = this.getFavoritesStorageKey();
          const raw = localStorage.getItem(key);
          this.favorites = raw ? JSON.parse(raw) : [];
          this.normalizeFavoritesOrder();
        } catch (e) {
          this.favorites = [];
        }
      },
      saveFavorites() {
        const key = this.getFavoritesStorageKey();
        localStorage.setItem(key, JSON.stringify(this.favorites));
      },
      getFavoritesStorageKey() {
        // 跨国家共用收藏
        return `favorites_all`;
      },
      normalizeFavoritesOrder() {
        this.favorites
          .sort((a, b) => (a.order || 0) - (b.order || 0))
          .forEach((item, idx) => (item.order = idx + 1));
      },
      isFavorited(id) {
        return this.favorites.some(f => f.id === id && f.country === this.country);
      },
      toggleFavorite(attraction) {
        const idx = this.favorites.findIndex(f => f.id === attraction.id && f.country === this.country);
        if (idx >= 0) {
          this.favorites.splice(idx, 1);
          this.normalizeFavoritesOrder();
        } else {
          const nextOrder = this.favorites.length + 1;
          this.favorites.push({
            id: attraction.id,
            name: attraction.name,
            region: attraction.region,
            rating: attraction.rating,
            county: attraction.county,
            country: this.country,
            order: nextOrder,
          });
        }
        this.saveFavorites();
      },
      // 点击收藏菜单中的项：跳转详情并以收藏顺序驱动导航
      handleMenuItemClick(f, idx, evt) {
        if (this.dragging) return;
        try {
          const color = this.getRatingColor(f.rating);
          localStorage.setItem('selectedAttractionRatingColor', color);
        } catch(e) {}
        const nav = this.sortedFavorites.map(x => ({ country: x.country, id: x.id }));
        localStorage.setItem('favNav', JSON.stringify(nav));
        localStorage.setItem('favIndex', String(idx));
        this.$router.push(`/attraction/${f.country}/${f.id}?from=favorites`);
      },
      // 卡片长按处理
      startCardPress(attraction, evt) {
        this.cancelCardPress();
        this.pressTimer = setTimeout(() => {
          this.toggleFavorite(attraction);
          this.suppressNextClick = true;
        }, this.longPressThreshold);
      },
      cancelCardPress() {
        if (this.pressTimer) {
          clearTimeout(this.pressTimer);
          this.pressTimer = null;
        }
      },
      endCardPress() {
        this.cancelCardPress();
      },
      // 收藏菜单按钮与弹层
      toggleFavoritesMenu() {
        this.showFavorites = !this.showFavorites;
        if (this.showFavorites) {
          this.updateFavoritesMenuPosition();
          this.$nextTick(() => {
            document.addEventListener('mousedown', this.onOutsideClick, { capture: true });
            document.addEventListener('touchstart', this.onOutsideClick, { capture: true });
            window.addEventListener('resize', this.updateFavoritesMenuPosition, { passive: true });
            window.addEventListener('scroll', this.updateFavoritesMenuPosition, { passive: true });
            // 预加载收藏缩略图
            try { this.sortedFavorites.forEach(f => this.ensureFavThumb(f)); } catch(e) {}
          });
        } else {
          document.removeEventListener('mousedown', this.onOutsideClick, { capture: true });
          document.removeEventListener('touchstart', this.onOutsideClick, { capture: true });
          window.removeEventListener('resize', this.updateFavoritesMenuPosition);
          window.removeEventListener('scroll', this.updateFavoritesMenuPosition);
        }
      },
      thumbKey(f) {
        return `${f.country}-${f.id}`;
      },
      async ensureFavThumb(f) {
        const key = this.thumbKey(f);
        if (this.favThumbs[key]) return;
        try {
          const res = await fetch(`https://juseaxerf.com/api/attraction-image/${f.country}/${f.id}/1`);
          if (!res.ok) return;
          const blob = await res.blob();
          const url = URL.createObjectURL(blob);
          this.$set ? this.$set(this.favThumbs, key, url) : (this.favThumbs[key] = url);
        } catch (e) {}
      },
      onOutsideClick(e) {
        const menu = this.$refs.favoritesMenu;
        const btns = [
          this.$refs.favoritesButtonDesktop,
          this.$refs.favoritesButtonMobile,
        ].filter(Boolean);
        if (!menu || !btns.length) return;
        const t = e.target;
        const inAnyBtn = btns.some(b => b && b.contains && b.contains(t));
        if (!menu.contains(t) && !inAnyBtn) {
          this.showFavorites = false;
          document.removeEventListener('mousedown', this.onOutsideClick, { capture: true });
          document.removeEventListener('touchstart', this.onOutsideClick, { capture: true });
        }
      },
      updateFavoritesMenuPosition() {
        this.$nextTick(() => {
          const candidates = [
            this.$refs.favoritesButtonDesktop,
            this.$refs.favoritesButtonMobile,
          ].filter(Boolean);
          // 选择实际可见按钮：有布局盒且尺寸>0
          const btn = candidates.find(el => {
            if (!el) return false;
            const rects = el.getClientRects ? el.getClientRects() : null;
            return rects && rects.length > 0 && el.offsetWidth > 0 && el.offsetHeight > 0;
          });
          if (!btn) return; // 未找到可见按钮，不定位
          const rect = btn.getBoundingClientRect();
          const width = 320;
          const vw = window.innerWidth || document.documentElement.clientWidth || 0;
          const left = Math.min(Math.max(12, rect.left), Math.max(12, vw - width - 12));
          this.favoritesMenuStyle = {
            top: `${rect.bottom + 6}px`,
            left: `${left}px`,
            width: `${width}px`,
            position: 'fixed',
            zIndex: 1000,
          };
        });
      },
      // 菜单内长按拖拽
      startMenuItemPress(index, evt) {
        const e = evt.touches ? evt.touches[0] : evt;
        const startY = e.clientY;
        // 记录起始元素的位置信息，避免占位符插入后索引错位
        const originEl = (evt.currentTarget && evt.currentTarget.closest)
          ? evt.currentTarget.closest('.favorites-item')
          : null;
        const originRect = originEl ? originEl.getBoundingClientRect() : null;
        let triggered = false;
        const timer = setTimeout(() => {
          triggered = true;
          this.beginDrag(index, startY, originRect);
        }, this.longPressThreshold);
        const cancel = () => {
          clearTimeout(timer);
          window.removeEventListener('mouseup', cancel, true);
          window.removeEventListener('touchend', cancel, true);
          window.removeEventListener('touchmove', preventScroll, { passive: false });
        };
        const preventScroll = (ev) => {
          if (!triggered) ev.preventDefault();
        };
        window.addEventListener('mouseup', cancel, true);
        window.addEventListener('touchend', cancel, true);
        window.addEventListener('touchmove', preventScroll, { passive: false });
      },
      beginDrag(index, startClientY, originRect) {
        this.dragging = true;
        this.dragIndex = index;
        this.dragItem = { ...this.sortedFavorites[index] };
        const list = this.$refs.favoritesList;
        if (!list) return;
        this.dragListRect = list.getBoundingClientRect();
        // 优先用列表中第 index 个真实项的矩形，避免占位符干扰
        const itemEls = Array.from(list.children).filter(el => el.classList && el.classList.contains('favorites-item'));
        const elRect = (itemEls[index] && itemEls[index].getBoundingClientRect) ? itemEls[index].getBoundingClientRect() : null;
        const baseRect = elRect || originRect || this.dragListRect;
        this.dragOffsetY = startClientY - baseRect.top;
        this.dragY = startClientY;
        this.placeholderIndex = index;
        this.attachDragListeners();
      },
      attachDragListeners() {
        this.moveListener = (evt) => {
          const e = evt.touches ? evt.touches[0] : evt;
          this.dragY = e.clientY;
          this.updatePlaceholderIndex();
        };
        this.upListener = (evt) => {
          this.finishDrag(evt);
        };
        window.addEventListener('mousemove', this.moveListener, true);
        window.addEventListener('touchmove', this.moveListener, { passive: false, capture: true });
        window.addEventListener('mouseup', this.upListener, true);
        window.addEventListener('touchend', this.upListener, true);
      },
      detachDragListeners() {
        if (this.moveListener) {
          window.removeEventListener('mousemove', this.moveListener, true);
          window.removeEventListener('touchmove', this.moveListener, { capture: true });
          this.moveListener = null;
        }
        if (this.upListener) {
          window.removeEventListener('mouseup', this.upListener, true);
          window.removeEventListener('touchend', this.upListener, true);
          this.upListener = null;
        }
      },
      updatePlaceholderIndex() {
        if (!this.dragListRect) return;
        const y = this.dragY;
        const list = this.$refs.favoritesList;
        if (!list || !list.children.length) return;
        let target = 0;
        for (let i = 0; i < list.children.length; i++) {
          const el = list.children[i];
          if (!el.classList.contains('favorites-item')) continue;
          const r = el.getBoundingClientRect();
          if (y < (r.top + r.height / 2)) {
            target = i;
            break;
          }
          target = i + 1;
        }
        this.placeholderIndex = Math.max(0, Math.min(target, this.sortedFavorites.length));
      },
      finishDrag(evt) {
        const e = evt.changedTouches ? evt.changedTouches[0] : evt;
        const dropX = e.clientX;
        const dropY = e.clientY;
        const menu = this.$refs.favoritesMenu;
        const inside = menu && (() => {
          const r = menu.getBoundingClientRect();
          return dropX >= r.left && dropX <= r.right && dropY >= r.top && dropY <= r.bottom;
        })();
        if (!inside) {
          const id = this.dragItem.id;
          const idx = this.favorites.findIndex(f => f.id === id);
          if (idx >= 0) {
            this.favorites.splice(idx, 1);
            this.normalizeFavoritesOrder();
            this.saveFavorites();
          }
        } else {
          const from = this.dragIndex;
          let to = this.placeholderIndex;
          if (to > this.sortedFavorites.length - 1) to = this.sortedFavorites.length - 1;
          if (from !== to && from >= 0 && to >= 0) {
            const ordered = [...this.sortedFavorites];
            const [moved] = ordered.splice(from, 1);
            ordered.splice(to, 0, moved);
            ordered.forEach((item, i) => {
              const f = this.favorites.find(x => x.id === item.id);
              if (f) f.order = i + 1;
            });
            this.normalizeFavoritesOrder();
            this.saveFavorites();
          }
        }
        this.dragging = false;
        this.dragIndex = null;
        this.dragItem = null;
        this.placeholderIndex = null;
        this.dragListRect = null;
        this.detachDragListeners();
      },

      updateMobileAttractionDropdownPosition() {
        this.$nextTick(() => {
          const input = this.$refs.mobileAttractionInput;
          if (input) {
            const rect = input.getBoundingClientRect();
            this.mobileAttractionDropdownStyle = {
              top: `${rect.bottom}px`,      // 下方对齐
              left: `${rect.left}px`,       // 左边对齐
              width: `${rect.width}px`,
              position: 'fixed',
            };
          }
        });
      },

      updateMobileCountyDropdownPosition() {
        this.$nextTick(() => {
          const input = this.$refs.mobileCountyInput;
          if (input) {
            const rect = input.getBoundingClientRect();
            this.mobileCountyDropdownStyle = {
              top: `${rect.bottom}px`,
              left: `${rect.left}px`,
              width: `${rect.width}px`,
              position: 'fixed',
            };
          }
        });
      },

      updateMobileRegionDropdownPosition() {
        this.$nextTick(() => {
          const input = this.$refs.mobileRegionInput;
          if (input) {
            const rect = input.getBoundingClientRect();
            this.mobileRegionDropdownStyle = {
              top: `${rect.bottom}px`,
              left: `${rect.left}px`,
              width: `${rect.width}px`,
              position: 'fixed',
            };
          }
        });
      },


      async fetchAllAttractions() {
        try {

          const params = new URLSearchParams({
            region: this.selectedRegion || '',
            county: this.selectedCounty || ''
          }).toString();

          const res = await fetch(`https://juseaxerf.com/api/attractions-names-filtered/${this.country}?${params}`);
          const data = await res.json();
          this.allAttractions = Array.isArray(data.data) ? data.data : data; // 兼容不同API格式
          console.log('✅ 已加载景点名称数量:', this.allAttractions.length);
        } catch (err) {
          console.error('拉取所有景点失败:', err);
        }
      },

      filterAttractions() {
        const q = this.attractionSearch.trim().toLowerCase();
        if (!q) {
          this.attractionSuggestions = [];
          return;
        }
        this.attractionSuggestions = this.allAttractions.filter(a =>
          a.name.toLowerCase().includes(q)
        );
      },
      

      selectAttraction(attraction) {
        this.showAttractionSuggestions = false;
        this.attractionSearch = attraction.name;
        // ✅ 直接跳转到详情页
        this.$router.push(`/attraction/${this.country}/${attraction.id}?from=search`);
      },

      hideAttractionSuggestions() {
        setTimeout(() => {
          this.showAttractionSuggestions = false;
        }, 200);
      },

      updateAttractionDropdownPosition() {
        this.$nextTick(() => {
          const input = this.$refs.attractionInput;
          if (input) {
            const rect = input.getBoundingClientRect();
            this.attractionDropdownStyle = {
              top: `${rect.bottom}px`,
              left: `${rect.left}px`,
              width: `${rect.width}px`
            };
          }
        });
      },

      
      handleClick(attraction,index,event) {
        event.preventDefault();
        if (this.suppressNextClick) {
          this.suppressNextClick = false;
          return;
        }
        const ids=[];
        localStorage.setItem('attractionIndex',index);
        for (let i = 0; i<this.attractions.length;i++) {
          ids.push(this.attractions[i].id)
        };
        console.log(ids);
        localStorage.setItem('ids',ids);
        // 将列表中实际使用的背景色直接传递给详情页，保证一致
        try {
          const color = this.getRatingColor(attraction.rating);
          localStorage.setItem('selectedAttractionRatingColor', color);
        } catch(e) {}
        this.$router.push(`/attraction/${this.country}/${attraction.id}`)
      },

      translateCountry(country) {
        return this.countryTranslations[country] || country;
      },

      translateCounty(country) {
        return this.countyTranslations[country] || '省份';
      },
      
      fetchRegions() {
        if (this.selectedCounty) {
          fetch(`https://juseaxerf.com/api/regions/${this.country}/${this.selectedCounty}`)
          .then(response => response.json())
          .then(data => {
            this.regions = data;
            this.filteredRegions = data;
          })
          .catch(error => {
            console.error('Error fetching regions:', error);
          });
        }else {
          fetch(`https://juseaxerf.com/api/regions/${this.country}`)
          .then(response => response.json())
          .then(data => {
            this.regions = data;
            this.filteredRegions = data;
          })
          .catch(error => {
            console.error('Error fetching regions:', error);
          });
        }
        
      },

      fetchCountis() {
        fetch(`https://juseaxerf.com/api/countis/${this.country}`)
          .then(response => response.json())
          .then(data => {
            this.countis = data.filter(county => county && county.trim() !== '');
            this.filteredCounties = [...this.countis];
            this.countisLoaded = true;
          })
          .catch(error => {
            console.error('Error fetching regions:', error);
            this.countisLoaded = true;
          });
      },

      async fetchAttractions(isregion) {
        this.loading = true;
        try {
          const params = new URLSearchParams();
          params.append('minReviews', this.minReviews); // 传递过滤条件
          params.append('order', this.order); // 传递排序条件
          if (isregion){
            params.append('page',1);
          }
          else {
            params.append('page',this.page);
          }
          params.append('limit',this.limit);

          if (this.selectedRegion) {
            params.append('region', this.selectedRegion);
          }

          if (this.selectedCounty) {
            params.append('county', this.selectedCounty);
          }

          // 在好评率降序时，追加次级排序为总评论数降序（由服务端处理）
          if (this.order === 'rating_desc') {
            params.append('secondary', 'reviews_desc');
          }

          const response = await fetch(`https://juseaxerf.com/api/attractions/${this.country}?${params.toString()}`);
          const data = await response.json();
        
          if (data.data.length > 0) {
            // ✅ 第一步：只加载文字数据
            this.total = data.total;
            this.attractions = data.data.map(a => ({
              ...a,
              image1: '', // 先显示文字，图片留空
            }));
            this.loading = false; // ✅ 提前结束 loading，先显示文字

            // ✅ 图片异步加载（确保响应式更新）
            this.attractions.forEach(async (a, i) => {
              if (a.hasImage) {
                const res = await fetch(`https://juseaxerf.com/api/attraction-image/${this.country}/${a.id}/1`);
                const blob = await res.blob();
                const url = URL.createObjectURL(blob);
                this.attractions[i].image1 = url;
              }
            });

            // 前端兜底：当排序为好评率降序时，对相同好评率按总评论数降序排列
            if (this.order === 'rating_desc') {
              const parsePercent = (v) => {
                if (v == null) return 0;
                const s = String(v).replace('%', '');
                const n = parseFloat(s);
                return Number.isFinite(n) ? n : 0;
              };
              this.attractions = [...this.attractions].sort((a, b) => {
                const ra = parsePercent(a.rating);
                const rb = parsePercent(b.rating);
                if (rb !== ra) return rb - ra; // 好评率降序
                const ta = Number(a.total_reviews) || 0;
                const tb = Number(b.total_reviews) || 0;
                return tb - ta; // 总评论数降序
              });
            }
          } else {
            this.attractions = [];
            this.loading = false;
          }
        } catch (error) {
          console.error('获取景点数据失败:', error);
          this.attractions = [];
          this.loading = false;
        } 
      },


      goBack() {
        localStorage.setItem('attractionsPage', 1); // 保存当前页数到localStorage
        localStorage.setItem('attractionMinReviews',0);
        localStorage.setItem('attractionsRegion', '');
        localStorage.setItem('attractionsOrder',"rating_desc");
        localStorage.setItem('attractionsCounty','');
        localStorage.setItem('attractionsCounty','');
        this.$router.push('/');
      },

      nextPage() {
      if (this.page < this.totalPages) {
        this.page++;
        localStorage.setItem('attractionsPage', this.page); // 保存当前页数到localStorage
        localStorage.setItem('attractionMinReviews',this.minReviews);
        localStorage.setItem('attractionsRegion', this.selectedRegion);
        localStorage.setItem('attractionsOrder',this.order)
        this.fetchAttractions(false);
      }
    },

      prevPage() {
        if (this.page > 1) {
          this.page--;
          localStorage.setItem('attractionsPage', this.page); // 保存当前页数到localStorage
          localStorage.setItem('attractionMinReviews',this.minReviews);
          localStorage.setItem('attractionsRegion', this.selectedRegion);
          localStorage.setItem('attractionsOrder',this.order)
          this.fetchAttractions(false);
        }
      },

      validateInput() {
        if (!Number.isInteger(this.gotoPage) || this.gotoPage < 1) {
          this.gotoPage = 1;
        } else if (this.gotoPage > this.totalPages) {
          this.gotoPage = this.totalPages;
        }
        
        if (this.gotoPage && this.gotoPage !== this.page) {
          this.page = this.gotoPage;
          localStorage.setItem('attractionsPage', this.page);
          this.fetchAttractions(false);
        }
      },

      validateInputmin() {
          if (!Number.isInteger(this.minReviews) || this.minReviews < 0) {
              this.minReviews = 0;
          }
          this.page = 1;
          localStorage.setItem('attractionsPage', this.page);
          localStorage.setItem('attractionMinReviews', this.minReviews);
          this.fetchAttractions(false);
      },

      filterCounties() {
        if (this.countySearch.trim() === '') {
          this.filteredCounties = this.countis.filter(county =>
            this.countySearch.trim() ? county.toLowerCase().includes(this.countySearch.toLowerCase()) : false
          );
        } else {
          this.filteredCounties = this.countis.filter(county => 
            county.toLowerCase().includes(this.countySearch.toLowerCase())
          );
        }
      },

      filterRegions() {
        if (this.regionSearch.trim() === '') {
          this.filteredRegions = this.regions.filter(region =>
            this.regionSearch.trim() ? region.toLowerCase().includes(this.regionSearch.toLowerCase()) : false
          );
        } else {
          this.filteredRegions = this.regions.filter(region => 
            region.toLowerCase().includes(this.regionSearch.toLowerCase())
          );
        }
      },

      getRatingColor(rating) {
        // 兼容 "95"、"95%"、数字类型、空值等，且限制在 0-100
        const raw = typeof rating === 'number' ? rating : parseFloat(String(rating || '').replace('%', '').trim());
        const ratingValue = Number.isFinite(raw) ? Math.max(0, Math.min(100, raw)) : 0;
        // 50% 及以下为纯红
        if (ratingValue <= 50) {
          return '#ff3b30';
        }
        // 100% 为纯绿
        if (ratingValue >= 100) {
          return '#34c759';
        }
        // 50% - 100%：红色以 10 倍速度衰减，绿色 1 倍增加
        const x = (ratingValue - 50) / 50;
        const red = Math.round(255 * Math.max(0, 1 - 10 * x));
        const green = Math.round(255 * x);
        return `rgb(${red}, ${green}, 0)`;
      },

      selectCounty(county) {
        this.selectedCounty = county;
        this.countySearch = county;
        this.showCountySuggestions = false;
        this.applyFilters();
      },

      selectRegion(region) {
        this.selectedRegion = region;
        this.regionSearch = region;
        this.showRegionSuggestions = false;
        this.applyFilters();
      },

      hideCountySuggestions() {
        setTimeout(() => {
          this.showCountySuggestions = false;
        }, 200);
      },

      hideRegionSuggestions() {
        setTimeout(() => {
          this.showRegionSuggestions = false;
        }, 200);
      },

      updateCountyDropdownPosition() {
        this.$nextTick(() => {
          const input = this.$refs.countyInput;
          if (input) {
            const rect = input.getBoundingClientRect();
            this.countyDropdownStyle = {
              top: `${rect.bottom}px`,
              left: `${rect.left}px`,
              width: `${rect.width}px`
            };
          }
        });
      },

      updateRegionDropdownPosition() {
        this.$nextTick(() => {
          const input = this.$refs.regionInput;
          if (input) {
            const rect = input.getBoundingClientRect();
            this.regionDropdownStyle = {
              top: `${rect.bottom}px`,
              left: `${rect.left}px`,
              width: `${rect.width}px`
            };
          }
        });
    }
  }
};
</script>


<style scoped>

/* 让景点名和位置在同一行显示 */
.attraction-header-mobile {
  display: flex;
  align-items: center;
  flex-wrap: wrap; /* 如果太长就换行 */
  justify-content: space-between; /* 让右边的位置信息贴边 */
  gap: 0; /* 名称和位置之间的间距 */
}

.attraction-header-mobile .attraction-name {
  font-size: 1.05rem;
  font-weight: 600;
  margin: 0;
  white-space: wrap;
  vertical-align: middle;  /* 对齐 */
}

.attraction-header-mobile .attraction-location {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  color: #666;
  white-space: nowrap; /* 避免位置换行 */
}

.attraction-header-mobile .location-icon {
  margin-right: 2px;
}

.image-placeholder {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(120deg, #f0f0f0, #e0e0e0, #f0f0f0);
  background-size: 200% 100%;
  animation: placeholderShimmer 1.6s infinite linear;
  border-radius: 12px;
}

@keyframes placeholderShimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

.fade-in-image {
  opacity: 1;
  transform: scale(1);
  filter: blur(0);
}

.container {
  display: flex;
  flex-direction: column;
  height: 100vh; /* 页面占满视口高度 */
  overflow: hidden; /* 防止整个页面滚动 */
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
}

/* 固定顶部区域（标题+筛选器） */
.fixed-header {
  position: sticky;
  top: 0;
  z-index: 20;
  padding: 10px 20px 0; /* 原 20px 的一半 */
}

/* 收藏按钮 */
.filters-toolbar {
  max-width: 1000px;
  margin: 0 auto;
  display: flex;
  justify-content: flex-end;
  align-items: center;
  margin-top: 8px;
  margin-bottom: 6px;
}
.favorites-button {
  position: static;
  padding: 8px 12px;
  background: linear-gradient(135deg, #ffd700 0%, #ffb700 100%);
  color: #5a4100;
  border: none;
  border-radius: 16px;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(255, 183, 0, 0.35);
}

/* 收藏菜单 */
.favorites-menu {
  position: fixed;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 12px 30px rgba(0,0,0,0.2);
  padding: 12px;
  max-height: 60vh;
  overflow: auto;
}
.favorites-menu h4 {
  margin: 0 0 8px;
}
.favorites-menu .favorites-list { counter-reset: fav; }
.favorites-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.favorites-item {
  display: flex;
  align-items: center;
  justify-content: space-between; /* 左侧（序号+图片+文本）靠左，评分在最右 */
  gap: 12px;
  padding: 8px 10px;
  border-radius: 10px;
  border: 1px solid rgba(0,0,0,0.06);
  background: rgba(250,250,250,0.95);
  user-select: none;
}
.favorites-item .fav-index {
  flex: 0 0 auto;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: #f1f3f5;
  color: #333;
  font-weight: 800;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.favorites-item .fav-thumb-wrap {
  flex: 0 0 auto;
  width: 28px;
  height: 28px;
  border-radius: 6px;
  overflow: hidden;
}
.favorites-item .fav-thumb {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.favorites-item .thumb-placeholder {
  width: 100%;
  height: 100%;
  background: #e9ecef;
}
.favorites-item .fav-main {
  display: flex;
  flex-direction: column;
  align-items: flex-start; /* 文本块靠左对齐 */
  flex: 1;               /* 占据剩余空间用于省略号 */
  min-width: 0;          /* 允许子元素正确计算省略号 */
}
.favorites-item .fav-name {
  font-weight: 700;
  display: block;
  white-space: nowrap;       /* 不换行 */
  overflow: hidden;          /* 超出隐藏 */
  text-overflow: ellipsis;   /* 超出显示省略号 */
  max-width: 100%;
}
.favorites-item .fav-meta {
  font-size: 12px;
  color: #666;
}
.favorites-item .fav-rating {
  color: #fff;
  font-weight: 800;
  padding: 2px 6px;
  border-radius: 6px;
}
.favorites-item.dragging-shadow {
  box-shadow: 0 10px 24px rgba(0,0,0,0.2);
}
.favorites-placeholder {
  height: 40px;
  border: 2px dashed #ffd700;
  border-radius: 10px;
}

/* 过渡动画：列表项位置变化时平滑移动，避免“跳动” */
/* 移除过渡动画（恢复原生位置变化） */

/* 收藏态卡片效果 */
.attraction-item.favorited {
  background: linear-gradient(180deg, rgba(255,215,0,0.45), rgba(255,215,0,0.25));
  border: 2px solid rgba(255, 215, 0, 0.95);
  transform: translateY(-10px) scale(1.12);
  box-shadow:
    0 26px 60px rgba(0,0,0,0.28),
    0 0 0 5px rgba(255,215,0,0.55), /* 外环，增强金色边缘存在感 */
    0 0 0 6px rgba(255,215,0,0.28) inset; /* 内环，增加层次 */
  z-index: 6;
}

/* 滚动内容部分 */
.scroll-content {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  padding-top: 40px;
}

/* 页面头部 */
.page-header {
  margin-bottom: 60px;
  position: relative;
}

.header-content {
  text-align: center;
}

.page-title {
  margin: 0;
  margin-bottom: 16px;
}

.page-subtitle {
  margin: 0;
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
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 4px 15px rgba(0, 122, 255, 0.3);
  position: relative;
  overflow: hidden;
  margin-bottom: 40px;
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
  margin-bottom: 0;
}

.bottom-back-button {
  margin-bottom: 0;
}

.back-icon {
  font-size: 18px;
  font-weight: bold;
}

.page-title {
  font-size: 3.5rem;
  font-weight: 700;
  margin-bottom: 16px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.page-subtitle {
  font-size: 1.25rem;
  color: #6e6e73;
  font-weight: 400;
}

/* 加载状态 */
.loading-container {
  text-align: center;
  padding: 80px 20px;
}

.loading-text {
  margin-top: 20px;
  color: #6e6e73;
  font-size: 1.1rem;
}

/* 过滤器部分 */
.filters-section {
  margin: 0 auto; /* 居中并保留下边距 */
  padding: 32px;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  max-width: 1000px; 
  position: relative; /* 以便右上角收藏按钮绝对定位 */
}
.filters-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 24px;
  align-items: stretch; /* 让同一行的项目（含按钮容器）等高 */
}

.button-pair {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  align-items: stretch; /* 两个按钮等高，拉伸填满单元格高度 */
}
.button-pair > button { width: 100%; min-width: 0; }

.map-button {
  padding: 10px 12px;
  border: none;
  border-radius: 12px;
  font-weight: 700;
  color: #fff;
  background: linear-gradient(135deg, #0a84ff 0%, #0066cc 100%);
  box-shadow: 0 4px 12px rgba(0, 102, 204, 0.35);
  cursor: pointer;
}
.favorites-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.map-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

/* 强制桌面/移动端仅显示一种文案，避免同时出现 */
@media (min-width: 769px) {
  .label-desktop { display: inline !important; }
  .label-mobile { display: none !important; }
}
@media (max-width: 768px) {
  .label-desktop { display: none !important; }
  .label-mobile { display: inline !important; }
}

/* 桌面：按钮高度与输入框一致（对齐 .filter-group input/select 的视觉高度） */
.filters-section .button-pair .map-button,
.filters-section .button-pair .favorites-button {
  padding: 12px 12px;  /* 与输入框同等的垂直内边距，提高高度一致性 */
  font-size: 12px;     /* 更小字体，保证“收藏列表（数字）”可显示 */
  border-radius: 8px;
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.filter-group label {
  font-weight: 600;
  color: #1d1d1f;
  font-size: 0.9rem;
}

.filter-group input,
.filter-group select {
  padding: 12px 16px;
  border: 1px solid #d2d2d7;
  border-radius: 8px;
  background: white;
  font-size: 16px;
}

.filter-group input:focus,
.filter-group select:focus {
  border-color: #007aff;
  outline: none;
}

.search-container {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.search-input {
  padding: 8px 12px;
  border: 1px solid #d2d2d7;
  border-radius: 6px;
  background: white;
  font-size: 14px;
  transition: border-color 0.2s ease;
}

.search-input:focus {
  border-color: #007aff;
  outline: none;
}

.search-container {
  position: relative;
}

.suggestions-dropdown {
  position: fixed;
  background: white;
  border: 1px solid #d2d2d7;
  border-radius: 12px;
  padding: 8px 6px;
  max-height: none;
  overflow: visible;
  z-index: 2147483647;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.15);
  min-width: 200px;
}

.suggestion-item {
  padding: 10px 14px;
  cursor: pointer;
  transition: background-color 0.2s ease;
  border-bottom: 1px solid #f0f0f0;
  font-size: 14px;
}

.suggestion-item:hover {
  background-color: #f8f9fa;
}

.suggestion-item:last-child {
  border-bottom: none;
}

/* 景点网格 */
.attractions-section {
  margin-bottom: 60px;
}

.empty-state {
  text-align: center;
  padding: 80px 20px;
  color: #6e6e73;
}

.empty-icon {
  font-size: 4rem;
  margin-bottom: 24px;
}

.empty-state h3 {
  font-size: 1.5rem;
  margin-bottom: 8px;
  color: #1d1d1f;
}

.attractions-list-desktop {
  align-items:center;
  display: grid;
  grid-template-columns: 1fr 1fr 1fr 1fr;
  gap: 16px;
  max-width: 2000px;
  margin: 0 auto;
}

.attraction-item {
  display: flex;
  align-items: center;
  gap: 24px;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border-radius: 16px;
  padding: 20px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  transition: all 0.3s ease;
  cursor: pointer;
}

.attraction-item:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.15);
  background: rgba(255, 255, 255, 1);
}

.attraction-image-wrapper {
  position: relative;
  flex-shrink: 0;
  width: 120px;
  height: 120px;
  border-radius: 12px;
  overflow: hidden;
}

.attraction-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s ease;
}

.attraction-item:hover .attraction-image {
  transform: scale(1.05);
}

.rating-badge {
  position: absolute;
  top: 8px;
  right: 8px;
  background: linear-gradient(135deg, #007aff 0%, #0056cc 100%);
  color: white;
  padding: 4px 8px;
  border-radius: 12px;
  font-weight: 600;
  font-size: 0.8rem;
  box-shadow: 0 2px 8px rgba(0, 122, 255, 0.3);
}

.rating-text {
  font-size: 0.8rem;
}

.attraction-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.attraction-header {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.attraction-name {
  margin: 0;
}

.attraction-name-text {
  color: #1d1d1f;
  font-size: 1.25rem;
  font-weight: 600;
  line-height: 1.4;
}

.attraction-location {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #6e6e73;
  font-size: 0.9rem;
}

.location-icon {
  font-size: 0.9rem;
}

.attraction-stats {
  display: flex;
  gap: 32px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  text-align: center;
}

.stat-number {
  font-size: 1.1rem;
  font-weight: 700;
  color: #1d1d1f;
}

.stat-label {
  font-size: 0.75rem;
  color: #8e8e93;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-weight: 500;
}

.rating-item {
  position: relative;
}

.rating-number {
  padding: 4px 8px;
  border-radius: 8px;
  color: white;
  font-weight: 700;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
}

/* 分页部分 */
.pagination-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24px;
  padding: 0px 20px;
}

.pagination-info {
  color: #6e6e73;
  font-size: 1rem;
  text-align: center;
}

.pagination-controls {
  white-space: nowrap;
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
  justify-content: flex-start;
  max-width: 1200px;
  margin: 0 auto;
  padding-left: 0;
}

.pagination-button {
  min-width: auto;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 14px 24px;
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  color: #495057;
  border: none;
  border-radius: 20px;
  font-size: 16px;
  font-weight: 600;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
  position: relative;
  overflow: hidden;
}

.pagination-button::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
  transition: left 0.5s;
}

.pagination-button:hover::before {
  left: 100%;
}

.pagination-button:hover:not(:disabled) {
  background: linear-gradient(135deg, #007aff 0%, #0056cc 100%);
  color: white;
  transform: translateY(-3px) scale(1.02);
  box-shadow: 0 8px 25px rgba(0, 122, 255, 0.3);
}

.pagination-button:active:not(:disabled) {
  transform: translateY(-1px) scale(0.98);
  box-shadow: 0 4px 15px rgba(0, 122, 255, 0.2);
}

.pagination-button:disabled {
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  color: #adb5bd;
  cursor: not-allowed;
  transform: none;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.page-input-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.page-input-group label {
  color: #6e6e73;
  font-size: 0.9rem;
}

.page-input-group input {
  padding:10px;
  width: 80px;
  text-align: center;
}

/* 默认隐藏移动端 filters */
.mobile-filters {
  display: none;
}

.mobile-filters-grid {
  display: flex;
  flex-direction: column;
  gap: 8px; /* 行间距 */
  width: 100%;
}

.mobile-filter-row {
  display: grid;
  grid-template-columns: auto 1fr 1fr; /* 左列自适应，右两列平分 */
  align-items: center;
  gap: 8px; /* 列间距 */
  width: 100%;
  box-sizing: border-box;
}

.mobile-filter-row .filter-label {
  flex: 0 0 auto; /* 左边文字不伸缩 */
  min-width: 80px; /* 可根据需要调整文字宽度 */
  font-weight: 600;
  font-size: 0.9rem;
  font-weight: 700;
  line-height: 1.2;
}

/* 中间和右边输入框、下拉框统一样式 */
.mobile-filter-row select,
.mobile-filter-row input[type="search"],
.mobile-filter-row input[type="number"] {
  width: 100%;
  box-sizing: border-box;
  padding: 4px 8px;
  border: 1px solid #ccc;
  border-radius: 12px;
  font-size: 0.8rem;
}

.mobile-filter-row > * {
  height: 36px; /* 保证输入框、选择框高度一致 */
  display: flex;
  align-items: center;
}

.mobile-filter-row input[type="number"] {
  -moz-appearance: textfield; /* 去掉 Firefox 上的上下箭头 */
}



.mobile-filter-row input::-webkit-outer-spin-button,
.mobile-filter-row input::-webkit-inner-spin-button {
  -webkit-appearance: none; /* 去掉 Chrome 上的上下箭头 */
  margin: 0;
}

.attraction-content-mobile {
  display: none;
}


/* 桌面端保持原样 */
@media (max-width: 768px) {

  .attractions-section {
    margin-bottom: 20px;
  }

  .page-input-group label {
    color: #6e6e73;
    font-size: 0.85rem;
  }

  .page-input-group input {
    padding:8px;
    font-size: 0.8rem;
    width: 50px;
    text-align: center;
  }

  .pagination-button {
    min-width: auto;
    padding: 10px 10px;
    border-radius: 12px;
    font-size: 12px;
    font-weight: 750;
  }

  .scroll-content {
    flex: 1;
    overflow-y: auto;
    padding: 20px;
    padding-top: 10px;
  }

  .back-button {
    padding: 12px 18px;
    font-size: 12px;
    font-weight: 750;
  }

  .desktop-back-button {
    display: none;
  }

  .attraction-content-mobile {
    display: flex;
    flex-direction: column;
    gap: 6px; /* 减少文字和内容间距 */
    padding: 0; /* 缩小卡片内边距 */
  }

  .attraction-content-mobile .attraction-name {
    font-size: 13px;
    font-weight: 600;
    margin: 0;
    white-space: wrap; 
    line-height: 1.3;
    display: block;
    box-sizing: border-box;
  }

  .attraction-content-desktop {
    display: none;
  }

  .attractions-list {
    display: grid;
    grid-template-columns: 1fr 1fr; /* 双列保持 */
    gap: 12px; /* 缩小列间距 */
  }

  .attraction-item {
    display: flex;
    flex-direction: column;
    background: rgba(255, 255, 255, 0.95);
    border-radius: 16px;
    padding: 6px;
    gap: 8px;
    border: 1px solid rgba(255, 255, 255, 0.2);
    max-width: 50vw;
    box-sizing: border-box;
    overflow: hidden; 
  }

  /* 第一行：名字 */
  .attraction-name {
    font-size: 1.1rem;
    font-weight: 600;
    line-height: 1.2;
    white-space: wrap; 
    margin: 0;
  }

  /* 第二行：图片 + 右侧信息 */
  .attraction-info-row {
    display: flex;
    gap: 12px;
    align-items: stretch; /* 让左右高度一致 */
  }

  

  .attraction-name-text {
    font-size: 1rem; /* 缩小标题字体 */
    white-space: normal; /* 默认值，允许换行 */
    word-wrap: break-word; /* 遇到太长的单词时也换行 */
    overflow-wrap: break-word; /* 同上，标准写法 */
  }

  .stat-number {
    font-size: 0.95rem;
    font-weight: 700;
    color: white;
    padding: 2px 6px;
    border-radius: 6px;
  }

  .stat-label {
    font-size: 0.55rem;
    color: #8e8e93;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    font-weight: 500;
  }

  /* 左侧图片 */
  .attraction-image-wrapper {
    flex-shrink: 0;
    width: 80px;
    height: 40px;
    border-radius: 12px;
    overflow: hidden;
  }

  .attraction-image {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  /* 右侧信息垂直分布 */
  .attraction-stats-wrapper {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: space-between; /* 上下平分 */
  }

  /* 好评率 */
  .attraction-stats {
    display: flex;
    gap: 16px;
  }

  .stat-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    margin: 0; /* 卡片间距尽量小 */
    padding: 0; /* 去掉多余的内边距 */
  }


  /* 地点 */
  .attraction-location {
    display: flex;
    align-items: center;
    gap: 0;
    font-size: 0.55rem;
    color: #6e6e73;
  }

  .location-text {    white-space: nowrap;     /* 禁止换行 */
    overflow: hidden;        /* 隐藏超出部分 */
    text-overflow: ellipsis; /* 超出部分显示省略号 */
    display: inline-block;   /* 让 text-overflow 生效 */
    vertical-align: middle;  /* 对齐 */
  }
  
  .page-header {
    margin-bottom: 5px;
  }

  .fixed-header {
    padding: 6px 16px 0; /* 移动端：原 12px 的一半 */
  }

  .desktop-filters {
    display: none;
  }

  .page-subtitle {
    font-size: 0.8rem; /* 缩小副标题字体 */
    text-align: center;
  }

  .filters-section.card.mobile-filters {
    width: 100%; /* 卡片宽度自适应屏幕 */
    padding: 10px;
    box-sizing: border-box;
    margin: 0 auto 16px; /* 居中并加底部间距 */
  }

  .page-title {
    font-size: 1.5rem; /* 缩小标题字体 */
    margin-bottom: 8px;
    text-align: center;
  }

  .mobile-filters {
    padding: 8px;
    background: rgba(255, 255, 255, 0.95);
    border-radius: 16px;
    box-shadow: 0 4px 15px rgba(0,0,0,0.1);
    max-width: 100%;
    box-sizing: border-box; /* 确保 padding 包含在宽度内 */
    overflow: visible; /* 让上方绝对定位的收藏按钮可见 */
    display: grid;
    gap: 8px;
  }

  .favorites-button,
  .map-button {
    padding: 0 10px; /* 由父网格行控制高度 */
    font-size: 12px; /* 移动更小字体 */
    height: 100%;    /* 与同列输入同高 */
    line-height: 1.2;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .label-desktop { display: none; }
  .label-mobile { display: inline; }
  .mobile-filter-row > .button-pair { display: grid !important; width: 100%; }
  .button-pair {
    align-items: stretch; /* 子按钮拉伸至与输入相同高度 */
  }
  .label-desktop { display: none; }
  .label-mobile { display: inline; }
  .mobile-filter-row > .button-pair { display: grid !important; width: 100%; }

  .mobile-left-column,
  .mobile-right-column {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  /* 第一行空白高度和左边行对齐 */
  .mobile-right-column .empty {
    height: 62px; /* 根据左边 filter-group 高度微调 */
  }

  .rating-number {
    padding: 2px 6px;
    border-radius: 6px;
    color: white;
    font-weight: 600;
    font-size: 12px;
  }
}

/* 桌面端：压缩固定区垂直占用（半高） */
@media (min-width: 1024px) {
  .page-header { margin-bottom: 30px; } /* 原 60px 的一半 */
  .scroll-content { padding-top: 20px; } /* 原 40px 的一半 */
  .filters-section { padding: 16px; } /* 原 32px 的一半 */
  .filters-grid { gap: 12px; } /* 原 24px 的一半 */
}

</style>
/* 文案显示：桌面显示完整，移动显示简写 */
.label-desktop { display: inline; }
.label-mobile { display: none; }
