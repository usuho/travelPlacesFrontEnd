<template>
  <div class="container fade-in">
    <div class="hero-section">
      <h1 class="hero-title">探索世界</h1>
      <p class="hero-subtitle">选择您想探索的国家，发现令人惊叹的景点</p>
    </div>
    
    <div class="countries-grid">
      <div v-for="country in countries" :key="country" class="country-card card">
        <router-link :to="`/attractions/${country}`" class="country-link" @click.native="saveToLocalStorage">
          <div class="country-flag">
            {{ getCountryEmoji(country) }}
          </div>
          <h3 class="country-name">{{ translateCountry(country) }}</h3>
          <p class="country-description">{{ getCountryDescription(country) }}</p>
        </router-link>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  data() {
    return {
      countries: ['japan','china','singapore','switzerland','america','iceland','denmark'], // 可以添加更多国家
      countryTranslations: {
        japan: '日本',
        china: '中国',
        singapore: '新加坡',
        switzerland: '瑞士',
        america: '美国',
        iceland: '冰岛',
        denmark: '丹麦'
        // 可以添加更多国家的翻译
      }
    };
  },
  methods: {
    translateCountry(country) {
      return this.countryTranslations[country] || country;
    },
    getCountryEmoji(country) {
      const emojis = {
        japan: '🇯🇵',
        china: '🇨🇳',
        singapore: '🇸🇬',
        switzerland: '🇨🇭',
        america: '🇺🇸',
        iceland: '🇮🇸',
        denmark: '🇩🇰'
      };
      return emojis[country] || '🌍';
    },
    getCountryDescription(country) {
      const descriptions = {
        japan: '探索樱花之国，体验传统文化与现代科技的完美融合',
        china: '发现千年古国的壮丽山河与深厚文化底蕴',
        singapore: '感受花园城市的多元文化与现代都市魅力',
        switzerland: '领略阿尔卑斯山的雄伟景色，沉浸在钟表工艺与巧克力的精致世界',
        america: '探索自由之国的多彩文化，领略壮丽自然景观与繁华都市的无限魅力',
        iceland: '追寻冰与火之地的神秘极光，探访冰川、火山与壮丽瀑布的奇幻景致',
        denmark: '感受童话王国的浪漫氛围，体验北欧设计与幸福生活的完美结合'
      };
      return descriptions[country] || '探索这个美丽的国家';
    },
    saveToLocalStorage() {
      localStorage.setItem('attractionsPage', 1);
      localStorage.setItem('attractionMinReviews', 0);
      localStorage.setItem('attractionsRegion', '');
      localStorage.setItem('attractionsOrder', 'rating_desc');
      localStorage.setItem('attractionsCounty', '');
    }
  }
};
</script>

<style scoped>
.container {
  min-height: 100vh;
  padding: 60px 20px;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
}

.hero-section {
  text-align: center;
  /* 将标题区整体下移到视口高度的 1/4 处 */
  margin-top: 25vh;
  margin-bottom: 40px;
}

.hero-title {
  font-size: 4rem;
  font-weight: 700;
  margin-bottom: 24px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.hero-subtitle {
  font-size: 1.5rem;
  color: #6e6e73;
  font-weight: 400;
  max-width: 600px;
  margin: 0 auto;
  line-height: 1.6;
}

.countries-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 32px;
  max-width: 1200px;
  margin: 0 auto;
  /* 让卡片区域从屏幕中线附近开始 */
  margin-top: 12vh;
}

.country-card {
  padding: 40px 32px;
  text-align: center;
  cursor: pointer;
  border: 1px solid rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(10px);
}

.country-card:hover {
  transform: translateY(-8px);
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
}

.country-link {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-decoration: none;
  color: inherit;
  height: 100%;
  transition: all 0.3s ease;
}

.country-flag {
  font-size: 4rem;
  margin-bottom: 24px;
  filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.1));
}

.country-name {
  font-size: 1.75rem;
  font-weight: 600;
  margin-bottom: 16px;
  color: #1d1d1f;
}

.country-description {
  font-size: 1rem;
  color: #6e6e73;
  line-height: 1.6;
  margin: 0;
}

@media (max-width: 768px) {
  .container {
    padding: 40px 16px;
  }
  
  .hero-section {
    margin-top: 12vh;
    margin-bottom: 24px;
  }
  
  .hero-title {
    font-size: 2.5rem;
  }
  
  .hero-subtitle {
    font-size: 1.25rem;
  }
  
  .countries-grid {
    grid-template-columns: 1fr;
    gap: 24px;
    margin-top: 6vh;
  }
  
  .country-card {
    padding: 32px 24px;
  }
  
  .country-flag {
    font-size: 3rem;
  }
  
  .country-name {
    font-size: 1.5rem;
  }
}
</style>