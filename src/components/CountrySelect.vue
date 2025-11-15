<template>
  <div class="container">
    <div class="hero-section">
      <img
        ref="heroLogo"
        class="hero-logo"
        :class="{ 'hero-logo-hidden': !showHeroLogo }"
        src="/site-icon.png"
        alt="网站 Logo"
      />
      <h1 class="hero-title title-hero">星垠海角</h1>
      <p class="hero-subtitle">选择想探索的国家，发现美与新奇</p>
    </div>

    <div
      v-for="(countries, continent) in continents"
      :key="continent"
      class="continent-section"
    >
      <h2 class="continent-title">{{ translateContinent(continent) }}</h2>
      <div class="countries-grid" v-fly-in>
        <div
          v-for="country in countries"
          :key="country"
          class="country-card card"
        >
          <div
            class="country-link"
            @click="handleCountryClick(country)"
          >
            <div class="country-flag-name">
              <div class="country-flag-mobile">
                {{ getCountryEmoji(country) }}
              </div>
              <h3 class="country-name-mobile">{{ translateCountry(country) }}</h3>
            </div>

            <div class="country-flag-desktop">
              {{ getCountryEmoji(country) }}
            </div>
            <h3 class="country-name-desktop">
              {{ translateCountry(country) }}
            </h3>

            <p class="country-description">
              {{ getCountryDescription(country) }}
            </p>
          </div>
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
      },
      showHeroLogo: false
    };
  },
  mounted() {
    // 从其它页面返回首页时，让右上角 logo 平滑放大到标题上的位置
    this.$nextTick(() => {
      setTimeout(() => {
        const heroEl = this.$refs.heroLogo;
        const overlay = document.getElementById('logo-transition-overlay');
        if (heroEl && overlay) {
          this.showHeroLogo = false;
          const rect = heroEl.getBoundingClientRect();
          const oRect = overlay.getBoundingClientRect();
          const startX = oRect.left + oRect.width / 2;
          const startY = oRect.top + oRect.height / 2;
          const targetX = rect.left + rect.width / 2;
          const targetY = rect.top + rect.height / 2;
          const dx = targetX - startX;
          const dy = targetY - startY;
          const scale = rect.width / oRect.width;

          overlay.style.transformOrigin = 'center center';
          overlay.style.transition = 'transform 0.5s ease, opacity 0.5s ease';

          requestAnimationFrame(() => {
            overlay.style.transform = `translate(${dx}px, ${dy}px) scale(${scale})`;
            overlay.style.opacity = '1';
          });

          const handleEnd = () => {
            overlay.removeEventListener('transitionend', handleEnd);
            if (overlay && overlay.parentNode) {
              overlay.parentNode.removeChild(overlay);
            }
            this.showHeroLogo = true;
          };
          overlay.addEventListener('transitionend', handleEnd);
        } else {
          this.showHeroLogo = true;
        }
      }, 50);
    });
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
        japan: '探索樱花之国，体验传统与现代交织的独特魅力。',
        china: '发现千年古国的壮丽山河与深厚文化底蕴。',
        singapore: '感受花园城市的多元文化与现代都市气息。',
        malaysia: '在热带雨林与多元文化中开启味蕾与自然之旅。',
        thailand: '微笑之国，古寺海滩与夜市交织的缤纷体验。',
        vietnam: '从河内旧街到下龙湾，感受古老与新生的碰撞。',
        switzerland: '在阿尔卑斯山间邂逅钟表工艺与巧克力的精致世界。',
        america: '从自然奇景到繁华都市，体验多元自由的美洲风情。',
        canada: '枫叶之国，辽阔自然与极光星空相伴。',
        mexico: '玛雅文明遗迹与热情拉美风情交织的神秘国度。',
        iceland: '冰与火之地，追寻极光、冰川与火山的奇幻景致。',
        denmark: '童话王国，北欧设计与幸福生活的完美结合。',
        australia: '阳光海滩与奇异自然并存的袋鼠之国。',
        newzealand: '中土世界般的壮丽山河，适合探险与静心。'
      };
      return descriptions[country] || '探索这个美丽的国家，开启你的专属旅程。';
    },
    saveToLocalStorage() {
      localStorage.setItem('attractionsPage', 1);
      localStorage.setItem('attractionMinReviews', 0);
      localStorage.setItem('attractionsRegion', '');
      localStorage.setItem('attractionsOrder', 'rating_desc');
      localStorage.setItem('attractionsCounty', '');
    },
    handleCountryClick(country) {
      const navigate = () => {
        this.saveToLocalStorage();
        this.$router.push(`/attractions/${country}`);
      };

      const heroEl = this.$refs.heroLogo;
      if (!heroEl) {
        navigate();
        return;
      }

      const isMobile = window.innerWidth <= 768;
      // 桌面端仍然直接跳转，不播放 logo 动画
      if (!isMobile) {
        navigate();
        return;
      }

      const startAnimation = () => {
        const rect = heroEl.getBoundingClientRect();

        // 动画期间隐藏标题处真实 logo，只显示 overlay
        this.showHeroLogo = false;

        const cornerSize = 40;
        const startX = rect.left + rect.width / 2;
        const startY = rect.top + rect.height / 2;
        const targetX = window.innerWidth - cornerSize / 2 - 12;
        const targetY = 12 + cornerSize / 2;
        const dx = targetX - startX;
        const dy = targetY - startY;
        const scale = cornerSize / rect.width;

        const overlay = heroEl.cloneNode(true);
        overlay.id = 'logo-transition-overlay';
        Object.assign(overlay.style, {
          position: 'fixed',
          top: `${rect.top}px`,
          left: `${rect.left}px`,
          width: `${rect.width}px`,
          height: `${rect.height}px`,
          margin: '0',
          pointerEvents: 'none',
          zIndex: 2000,
          opacity: '1',
          borderRadius: '50%',
          transformOrigin: 'center center',
          transform: 'translate(0, 0) scale(1)',
          transition: 'transform 0.5s ease, opacity 0.5s ease'
        });

        document.body.appendChild(overlay);

        const rootEl = this.$root && this.$root.$el;
        if (rootEl) {
          rootEl.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
          rootEl.style.opacity = '0';
          rootEl.style.transform = 'translateY(-10px)';
        }

        requestAnimationFrame(() => {
          overlay.style.transform = `translate(${dx}px, ${dy}px) scale(${scale})`;
          overlay.style.opacity = '0.5';
        });

        overlay.addEventListener(
          'transitionend',
          () => {
            if (overlay.parentNode) {
              overlay.parentNode.removeChild(overlay);
            }
            navigate();
          },
          { once: true }
        );
      };

      // 手写一个很短的平滑滚动到顶部动画，再衔接 logo 形变 + 整页淡出上移
      const getStartY = () => {
        return (
          window.pageYOffset ||
          (document.documentElement && document.documentElement.scrollTop) ||
          (document.body && document.body.scrollTop) ||
          ((this.$root && this.$root.$el && this.$root.$el.scrollTop) || 0)
        );
      };

      const startY = getStartY();
      if (startY <= 2) {
        startAnimation();
        return;
      }

      const duration = Math.min(280, Math.max(160, startY * 0.4)); // 距离越远滚动稍长一点
      const startTime = performance.now();

      const setScrollY = (y) => {
        try {
          window.scrollTo(0, y);
        } catch (e) {}
        try {
          if (document.documentElement) document.documentElement.scrollTop = y;
          if (document.body) document.body.scrollTop = y;
          const appEl = this.$root && this.$root.$el;
          if (appEl && typeof appEl.scrollTop === 'number') appEl.scrollTop = y;
        } catch (e) {}
      };

      const step = (now) => {
        const t = Math.min((now - startTime) / duration, 1);
        // ease-out 二次曲线
        const eased = 1 - Math.pow(1 - t, 2);
        const y = startY * (1 - eased);
        setScrollY(y);
        if (t < 1) {
          requestAnimationFrame(step);
        } else {
          setScrollY(0);
          startAnimation();
        }
      };

      requestAnimationFrame(step);
    }
  }
};
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@400;600;700&family=ZCOOL+XiaoWei&display=swap');

.container {
  min-height: 100vh;
  padding: 20px 20px;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
}

.hero-section {
  text-align: center;
  margin-top: 0;
  margin-bottom: 30px;
}

.hero-logo {
  width: 120px;
  height: 120px;
  border-radius: 50%;
  object-fit: cover;
  margin-bottom: 5px;
}

.hero-logo-hidden {
  visibility: hidden;
}

.hero-title {
  font-size: 4rem;
  font-weight: 700;
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

.country-flag-name-desktop {
  display: flex;
  align-items: center;
  margin-bottom: 8px;
}

.country-flag-desktop {
  font-size: 4rem;
  margin-bottom: 24px;
}

.country-name {
  font-size: 1.75rem;
  font-weight: 600;
  margin-bottom: 16px;
  color: #1d1d1f;
}

.country-name-desktop,
.country-name-mobile {
  font-family: 'ZCOOL XiaoWei', 'Noto Serif SC', 'Songti SC', 'STSong', 'Source Han Serif SC', 'SimSun', serif;
}

.country-description {
  margin-top: 20px;
  font-size: 1rem;
  color: #6e6e73;
  line-height: 1.6;
}

.country-flag-mobile {
  display: none;
}

.country-name-mobile {
  display: none;
}

/* 移动端优化：保持两列，但卡片缩小 */
@media (max-width: 768px) {
  .hero-section {
    margin-bottom: 28px;
  }

  .continent-section {
    margin-bottom: 30px;
  }

  .country-name-desktop {
    display: none;
  }

  .country-flag-desktop {
    display: none;
  }

  .country-name-mobile {
    display: flex;
    font-size: 1rem;
    margin-bottom: 8px;
  }

  .country-flag-mobile {
    margin-right: 1.5rem;
    display: flex;
  }

  .country-link {
    flex-direction: column;
    align-items: flex-start;
  }

  .countries-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 16px;
  }

  .country-card {
    padding: 5px 16px;
  }

  .country-flag-name {
    display: flex;
    align-items: center;
    font-size: 2.5rem;
    margin-right: 12px;
    margin-bottom: 0;
  }

  .country-name {
    font-size: 1rem;
    margin-bottom: 8px;
  }

  .country-description {
    margin-top: 5px;
    font-size: 0.7rem;
  }

  .hero-title {
    font-size: 2rem;
  }

  .hero-subtitle {
    font-size: 1rem;
  }

  .continent-title {
    font-size: 1rem;
    margin-bottom: 24px;
  }
}
</style>
