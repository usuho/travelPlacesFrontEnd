<template>
  <div class="container fade-in">
    <!-- 加载状态 -->
    <div v-if="!attraction" class="loading-container">
      <div class="loading-spinner"></div>
      <p class="loading-text">正在加载景点详情...</p>
    </div>

    <!-- 景点详情内容 -->
    <div v-else class="attraction-details">
      <!-- 页面头部 -->
      <header class="page-header">
        <button @click="goBack" class="back-button top-back-button">
          返回
        </button>
        <div class="header-content">
          <h1 class="attraction-title">{{ attraction.name }}</h1>
          <div class="rating-section">
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

        <!-- 图片展示区域 -->
        <section class="images-section">
          <div class="main-image-container" @click="openFullscreen(attraction.image1)">
            <img :src="`data:image/jpeg;base64,${attraction.image1}`" alt="景点主图" class="main-image" />
          </div>
          <div class="secondary-images">
            <div class="secondary-image-container" @click="openFullscreen(attraction.image2)">
              <img :src="`data:image/jpeg;base64,${attraction.image2}`" alt="景点图片" class="secondary-image" />
            </div>
            <div class="secondary-image-container" @click="openFullscreen(attraction.image3)">
              <img :src="`data:image/jpeg;base64,${attraction.image3}`" alt="景点图片" class="secondary-image" />
            </div>
          </div>
        </section>

        <!-- 全屏图片查看器 -->
        <div v-if="fullscreenImage" class="fullscreen-overlay" @click="handleOverlayClick" @wheel="handleWheel" @touchstart="handleTouchStart" @touchmove="handleTouchMove" @touchend="handleTouchEnd">
          <div class="fullscreen-container" @mousedown="handleMouseDown" @mousemove="handleMouseMove" @mouseup="handleMouseUp" @mouseleave="handleMouseUp">
            <img 
              :src="`data:image/jpeg;base64,${fullscreenImage}`" 
              alt="全屏图片" 
              class="fullscreen-image"
              :style="{ transform: `scale(${imageScale}) translate(${imageTranslateX}px, ${imageTranslateY}px)` }"
            />
          </div>
        </div>

      <!-- 景点信息 -->
      <section class="info-section">
        <div class="info-grid">
          <div class="info-card card">
            <div class="info-header">
              <span class="info-icon">📍</span>
              <h3>位置信息</h3>
            </div>
            <div class="info-content">
              <div class="info-item">
                <span class="info-label">地区</span>
                <span class="info-value">{{ attraction.region }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">省份/县</span>
                <span class="info-value">{{ attraction.county }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">具体位置</span>
                <span class="info-value">{{ attraction.position }}</span>
              </div>
            </div>
          </div>

          <div class="info-card card">
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

          <div class="info-card card info-card-wide">
            <div class="info-header">
              <span class="info-icon">📖</span>
              <h3>详细介绍</h3>
            </div>
            <div class="info-content">
              <p class="details-text">{{ attraction.overview }}</p>
            </div>
          </div>

          <div v-if="attraction.website" class="info-card card">
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
        </div>
      </section>

      <!-- 导航控制 -->
      <section class="navigation-section">
        <div class="navigation-controls">
          <button @click="goBack" class="back-button bottom-back-button">
            返回
          </button>
          <button @click="prevPage" :disabled="index === 0" class="nav-button">
            <span class="nav-icon">←</span>
            上一个景点
          </button>
          <button @click="nextPage" :disabled="index === 19" class="nav-button">
            下一个景点
            <span class="nav-icon">→</span>
          </button>
        </div>
      </section>
    </div>
  </div>
</template>
  
  <script>
  import { openDB } from 'idb';

  export default {
    data() {
      return {
        country: this.$route.params.country,
        id: this.$route.params.id,
        attraction: null,
        image1: null,
        image2: null,
        image3: null,
        index:parseInt(localStorage.getItem('attractionIndex')) || 0,
        ids: localStorage.getItem('ids') ? localStorage.getItem('ids').split(',').map(Number) : [] || null,
        fullscreenImage: null,
        imageScale: 1,
        imageTranslateX: 0,
        imageTranslateY: 0,
        isDragging: false,
        hasDragged: false,
        lastTouchDistance: 0,
        lastTouchCenter: { x: 0, y: 0 }
      };
    },
    async created() {
      this.db = await openDB('AttractionsDB', 1, {
        upgrade(db) {
          if (!db.objectStoreNames.contains('images')) {
            db.createObjectStore('images');
          }
        }
      });
      await this.fetchAttractionDetails();
    },
  computed: {
    ratingBackgroundColor() {
      // 优先使用从列表页传递过来的颜色，确保一致
      const stored = localStorage.getItem('selectedAttractionRatingColor');
      if (stored) return stored;
      // 兜底本地计算
      return this.getRatingColor(this.attraction?.rating);
    }
  },
    methods: {

      async fetchAttractionDetails() {
        const response = await fetch(`https://juseaxerf.com/api/attraction/${this.country}/${this.id}`);
        const data = await response.json();
        this.attraction = data;

        // 缓存图像
        this.image1 = await this.loadOrCacheImage(`${this.country}-${this.id}-image1`, data.image1);
        this.image2 = await this.loadOrCacheImage(`${this.country}-${this.id}-image2`, data.image2);
        this.image3 = await this.loadOrCacheImage(`${this.country}-${this.id}-image3`, data.image3);
      },

      async loadOrCacheImage(key, imageData) {
        const cachedImage = await this.db.get('images', key);
        if (cachedImage) {
          return `data:image/jpeg;base64,${cachedImage}`;
        } else {
          await this.db.put('images', imageData, key);
          return `data:image/jpeg;base64,${imageData}`;
        }
      },

      nextPage() {
        if (this.index < 19) {
          fetch(`https://juseaxerf.com/api/attraction/${this.country}/${this.ids[this.index+1]}`)
          .then(response => response.json())
          .then(data => {
            this.attraction = data;
          });
          this.$router.push(`${this.ids[this.index+1]}`);
          this.index ++
        }
      },

      prevPage() {
        if (this.index > 0) {
          
          fetch(`https://juseaxerf.com/api/attraction/${this.country}/${this.ids[this.index-1]}`)
          .then(response => response.json())
          .then(data => {
            this.attraction = data;
          });
          this.$router.push(`${this.ids[this.index-1]}`);
          this.index--
        }
      },

      goBack() {
        const page = localStorage.getItem('attractionsPage') || 1; // 重点：从localStorage获取当前页数
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
.container {
  min-height: 100vh;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
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
  padding: 40px 20px;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
  position: relative;
}

.header-content {
  text-align: center;
  margin-top: 16px;
}

.attraction-title {
  margin: 0;
  margin-bottom: 32px;
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
  align-self: center;
}

.back-icon {
  font-size: 18px;
  font-weight: bold;
  transition: transform 0.3s ease;
}

.back-button:hover .back-icon {
  transform: translateX(-2px);
}

.attraction-title {
  font-size: 3rem;
  font-weight: 700;
  margin-bottom: 24px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  line-height: 1.2;
}

.rating-section {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 24px;
  flex-wrap: wrap;
}

.rating-badge {
  background: linear-gradient(135deg, #34c759 0%, #30d158 100%);
  color: white;
  padding: 12px 24px;
  border-radius: 30px;
  font-weight: 600;
  font-size: 1.1rem;
  box-shadow: 0 4px 20px rgba(52, 199, 89, 0.3);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.rating-label {
  font-size: 0.8rem;
  opacity: 0.9;
}

.rating-text {
  font-size: 1.2rem;
  font-weight: 700;
}

.reviews-summary {
  display: flex;
  gap: 16px;
  color: #6e6e73;
  font-size: 0.95rem;
}

.reviews-summary span {
  padding: 8px 16px;
  background: rgba(255, 255, 255, 0.7);
  border-radius: 20px;
  backdrop-filter: blur(10px);
}

/* 图片展示区域 */
.images-section {
  padding: 60px 20px;
  max-width: 1400px;
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
  height: 500px;
  object-fit: cover;
  transition: transform 0.3s ease;
}

.main-image:hover {
  transform: scale(1.02);
}

.secondary-images {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 24px;
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
}

.secondary-image:hover {
  transform: scale(1.05);
}

/* 信息区域 */
.info-section {
  padding: 60px 20px;
  max-width: 1400px;
  margin: 0 auto;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
  gap: 32px;
}

.info-card {
  padding: 32px;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.info-card-wide {
  grid-column: 1 / -1;
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
}

.details-text {
  font-size: 1rem;
  line-height: 1.7;
  color: #1d1d1f;
  margin: 0;
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
}

.external-icon {
  font-size: 1.2rem;
  margin-left: 12px;
}

/* 导航区域 */
.navigation-section {
  padding: 60px 20px;
  background: rgba(255, 255, 255, 0.95);
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
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
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
  .page-header {
    padding: 32px 16px;
  }
  
  .header-content {
    margin-top: 16px;
  }
  
  .attraction-title {
    font-size: 2.2rem;
  }
  
  .rating-section {
    flex-direction: column;
    gap: 16px;
    text-align: center;
  }
  
  .images-section {
    padding: 40px 16px;
  }
  
  .main-image {
    height: 300px;
  }
  
  .secondary-images {
    grid-template-columns: 1fr;
    gap: 16px;
  }
  
  .secondary-image {
    height: 200px;
  }
  
  .info-section {
    padding: 40px 16px;
  }
  
  .info-grid {
    grid-template-columns: 1fr;
    gap: 24px;
  }
  
  .info-card {
    padding: 24px;
  }
  
  .navigation-section {
    padding: 40px 16px;
  }
  
  .navigation-controls {
    flex-direction: column;
    gap: 16px;
  }
  
  .nav-button {
    min-width: auto;
    width: 100%;
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