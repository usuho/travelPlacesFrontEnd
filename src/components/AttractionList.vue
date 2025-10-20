<template>
  <div class="container fade-in">
    <!-- 固定顶部区域（标题 + 筛选器） -->
    <div class="fixed-header">
      <header class="page-header">
        <button @click="goBack" class="back-button top-back-button">
          返回
        </button>
        <div class="header-content">
          <h1 class="page-title">{{translateCountry(country)}}的景点</h1>
          <p class="page-subtitle">发现{{translateCountry(country)}}最受欢迎的旅行目的地</p>
        </div>
      </header>

      <div class="filters-section card">
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
        <div class="filter-group"></div>

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
        <!-- ...完整的 filters-grid 两段放这里 -->
      </div>
    </div>

    <!-- 滚动内容区域 -->
    <div class="scroll-content">
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
        
        <div v-else class="attractions-list" v-fly-in>
          <div v-for="(attraction, index) in attractions" :key="attraction.id" class="attraction-item" @click="handleClick(attraction,index,$event)">
            <div class="attraction-image-wrapper">
              <div v-if="!attraction.image1" class="image-placeholder shimmer"></div>
              <img v-fade-in
                v-if="attraction.image1"
                :src="attraction.image1"
                alt="景点图片" 
                class="attraction-image"
               />
            </div>
            
            <div class="attraction-content">
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
  </div>
</template>
  
  <script>
  import { openDB } from 'idb';

  export default {
    data() {
      return {
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
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  padding: 20px 20px 0;
  box-shadow: 0 2px 6px rgba(0,0,0,0.1);
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
  max-width: 1200px; /* 和景点列表宽度一致 */
}
.filters-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 24px;
  align-items: end;
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

.attractions-list {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  max-width: 1200px;
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
  min-width: 120px;
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
  width: 80px;
  text-align: center;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .container {
    padding: 20px 16px;
  }
  
  .header-content {
    margin-top: 16px;
  }
  
  .page-title {
    font-size: 2.5rem;
  }
  
  .page-subtitle {
    font-size: 1.1rem;
    text-align: center;
  }
  
  .filters-grid {
    grid-template-columns: 1fr;
    gap: 16px;
  }
  
  .attractions-list {
    grid-template-columns: 1fr;
    gap: 12px;
  }
  
  .attraction-item {
    flex-direction: column;
    gap: 16px;
    text-align: center;
  }
  
  .attraction-image-wrapper {
    position: relative;
    width: 100%;
    height: 180px;
    overflow: hidden;
    border-radius: 12px;
    background: #f2f2f2;
  }
  
  .attraction-stats {
    gap: 20px;
    justify-content: center;
  }
  
  .pagination-controls {
    flex-direction: column;
    gap: 12px;
  }
  
  .reviews-info {
    gap: 16px;
  }
}
</style>