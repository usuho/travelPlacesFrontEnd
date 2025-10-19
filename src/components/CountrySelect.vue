<template>
  <div class="container fade-in">
    <div class="hero-section">
      <h1 class="hero-title">探索世界</h1>
      <p class="hero-subtitle">选择您想探索的国家，发现令人惊叹的景点</p>
    </div>

    <div
      v-for="(countries, continent) in continents"
      :key="continent"
      class="continent-section"
    >
      <h2 class="continent-title">{{ translateContinent(continent) }}</h2>
      <div class="countries-grid">
        <div
          v-for="country in countries"
          :key="country"
          class="country-card card"
        >
          <router-link
            :to="`/attractions/${country}`"
            class="country-link"
            @click.native="saveToLocalStorage"
          >
            <div class="country-flag">{{ getCountryEmoji(country) }}</div>
            <h3 class="country-name">{{ translateCountry(country) }}</h3>
            <p class="country-description">
              {{ getCountryDescription(country) }}
            </p>
          </router-link>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  data() {
    return {
      continents: {
        asia: ['japan', 'china', 'singapore', 'malaysia', 'thailand', 'vietnam'],
        europe: ['switzerland', 'iceland', 'denmark'],
        america: ['america', 'canada', 'mexico'],
        oceania: ['australia', 'newzealand']
      },
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
      }
    };
  },
  methods: {
    translateCountry(country) {
      return this.countryTranslations[country] || country;
    },
    translateContinent(continent) {
      const translations = {
        asia: '亚洲',
        europe: '欧洲',
        america: '美洲',
        africa: '非洲',
        oceania: '大洋洲'
      };
      return translations[continent] || continent;
    },
    getCountryEmoji(country) {
      const emojis = {
        japan: '🇯🇵',
        china: '🇨🇳',
        singapore: '🇸🇬',
        malaysia: '🇲🇾',
        thailand: '🇹🇭',
        vietnam: '🇻🇳',
        switzerland: '🇨🇭',
        america: '🇺🇸',
        canada: '🇨🇦',
        mexico: '🇲🇽',
        iceland: '🇮🇸',
        denmark: '🇩🇰',
        australia: '🇦🇺',
        newzealand: '🇳🇿'
      };
      return emojis[country] || '🌍';
    },
    getCountryDescription(country) {
      const descriptions = {
        japan: '探索樱花之国，体验传统文化与现代科技的完美融合',
        china: '发现千年古国的壮丽山河与深厚文化底蕴',
        singapore: '感受花园城市的多元文化与现代都市魅力',
        malaysia: '体验热带雨林与多元文化的交织，品尝丰富美食的奇妙之旅',
        thailand: '沉浸在微笑之国的热情氛围，探索古寺、海滩与夜市的多彩风情',
        vietnam: '感受越南的古老与新生，漫步河内旧街、下龙湾与胡志明的活力都市',
        switzerland: '领略阿尔卑斯山的雄伟景色，沉浸在钟表工艺与巧克力的精致世界',
        america: '探索自由之国的多彩文化，领略壮丽自然景观与繁华都市的无限魅力',
        canada: '穿越枫叶之国的辽阔自然，欣赏冰川湖泊与极光奇景',
        mexico: '感受古老玛雅文明的神秘遗迹与充满活力的拉美风情',
        iceland: '追寻冰与火之地的神秘极光，探访冰川、火山与壮丽瀑布的奇幻景致',
        denmark: '感受童话王国的浪漫氛围，体验北欧设计与幸福生活的完美结合',
        australia: '探索袋鼠之国的奇异自然与阳光海滩，体验悉尼与墨尔本的活力都市',
        newzealand: '沉浸在中土世界的壮丽山河中，体验纯净自然与冒险激情'
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
  margin-top: 20vh;
  margin-bottom: 60px;
}

.hero-title {
  font-size: 4rem;
  font-weight: 700;
  margin-bottom: 24px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.hero-subtitle {
  font-size: 1.5rem;
  color: #6e6e73;
  font-weight: 400;
  max-width: 600px;
  margin: 0 auto;
  line-height: 1.6;
}

.continent-section {
  margin-bottom: 100px;
}

.continent-title {
  font-size: 2rem;
  text-align: center;
  margin-bottom: 40px;
  color: #333;
  font-weight: 600;
}

.countries-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 32px;
  max-width: 1200px;
  margin: 0 auto;
}

.country-card {
  padding: 40px 32px;
  text-align: center;
  cursor: pointer;
  border: 1px solid rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(10px);
  transition: all 0.3s ease;
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
}

.country-flag {
  font-size: 4rem;
  margin-bottom: 24px;
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
}

@media (max-width: 768px) {
  .hero-title {
    font-size: 2.5rem;
  }
  .hero-subtitle {
    font-size: 1.25rem;
  }
  .continent-title {
    font-size: 1.5rem;
    margin-bottom: 24px;
  }
  .countries-grid {
    grid-template-columns: 1fr;
    gap: 24px;
  }
}
</style>
