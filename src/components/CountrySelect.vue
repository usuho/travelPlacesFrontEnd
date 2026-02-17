<template>
  <div class="container">
    <div class="hero-section">
      <div
        class="hero-logo-wrapper"
        @click="handleHeroLogoClick"
        @mousedown="startHeroLongPress"
        @mouseup="cancelHeroLongPress"
        @mouseleave="cancelHeroLongPress"
        @touchstart="startHeroLongPress"
        @touchend="cancelHeroLongPress"
        @touchcancel="cancelHeroLongPress"
        @contextmenu.prevent
      >
        <img
          ref="heroLogo"
          class="hero-logo"
          :class="{ 'hero-logo-hidden': !showHeroLogo }"
          src="/site-icon.png"
          alt="网站 Logo"
          draggable="false"
        />
        <img
          class="hero-logo hero-logo-colored"
          :class="{
            'hero-logo-hidden': !showHeroLogo,
            'logo-colored-visible': logoColorizing
          }"
          src="/app-icon-android.png"
          alt=""
          draggable="false"
          aria-hidden="true"
        />
        <transition name="logo-tooltip-fade">
          <div v-if="showLogoutTooltip" class="logo-tooltip">长按登出</div>
        </transition>
      </div>
      <div class="title-text-group">
        <h1 class="hero-title title-hero">星垠海角</h1>
        <h1 class="title-english title-hero">Stars Meet the Swell</h1>
      </div>
      <div class="search-bar">
        <input
          v-model="searchQuery"
          type="search"
          class="search-input"
          :placeholder="placeholderText"
          @focus="searchFocused = true"
          @blur="searchFocused = false"
        />
        <div class="search-placeholder" v-if="!searchQuery">
          {{ placeholderText }}
        </div>
        <span class="search-icon" aria-hidden="true">
          <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="9" cy="9" r="6" stroke="currentColor" stroke-width="2" />
            <path d="M13 13L17 17" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
          </svg>
        </span>
      </div>
      <div class="continent-nav">
        <button
          v-for="continent in quickJumpContinents"
          :key="`jump-${continent}`"
          type="button"
          class="continent-nav-btn card"
          @click="scrollToContinent(continent)"
        >
          <span class="continent-nav-btn-text">
            {{ translateContinent(continent) }}
          </span>
        </button>
      </div>
    </div>

    <div v-if="hasSearchQuery && matchedCountries.length > 0" class="search-results">
      <div class="countries-grid" v-fly-in :key="searchQuery">
        <div
          v-for="country in matchedCountries"
          :key="country"
        >
          <div
            :class="['country-card', 'card', { jiggle: isJiggling }]"
            :style="isJiggling ? jiggleStyle : null"
          >
            <div
              class="country-link"
              @click="handleCountryClick(country)"
            >
              <div class="country-flag-name">
                <div class="country-flag-mobile">
                  {{ getCountryEmoji(country) }}
                </div>
                
                <div class="country-text-group-mobile">
                  <h3 class="country-name-mobile">{{ translateCountry(country) }}</h3>
                  <h3 class="country-name-mobile-english" style="text-transform: uppercase;">
                    {{ country }}
                  </h3>
                </div>
              </div>

              

              <div class="country-flag-desktop">
                {{ getCountryEmoji(country) }}
              </div>

              <div class="country-text-group-desktop">
                <h3 class="country-name-desktop">{{ translateCountry(country) }}</h3>
                <h3 class="country-name-desktop-english" style="text-transform: uppercase;">
                  {{ country }}
                </h3>
              </div>
              

              <p class="country-description">
                {{ getCountryDescription(country) }}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div v-else class="all-continents">
      <div
        v-for="(countries, continent) in continents"
        :key="continent"
        :id="`continent-${continent}`"
        class="continent-section"
      >
        <h2 class="continent-title">{{ translateContinent(continent) }}</h2>
        <div class="countries-grid" v-fly-in="!hasEverSearched">
          <div
            v-for="country in countries"
            :key="country"
          >
            <div
              :class="['country-card', 'card', { jiggle: isJiggling }]"
              :style="isJiggling ? jiggleStyle : null"
            >
              <div
                class="country-link"
                @click="handleCountryClick(country)"
              >
                <div class="country-flag-name">
                  <div class="country-flag-mobile">
                    {{ getCountryEmoji(country) }}
                  </div>
                  
                  <div class="country-text-group-mobile">
                    <h3 class="country-name-mobile">{{ translateCountry(country) }}</h3>
                    <h3 class="country-name-mobile-english" style="text-transform: uppercase;">
                      {{ country }}
                    </h3>
                  </div>
                </div>

                

                <div class="country-flag-desktop">
                  {{ getCountryEmoji(country) }}
                </div>

                <div class="country-text-group-desktop">
                  <h3 class="country-name-desktop">{{ translateCountry(country) }}</h3>
                  <h3 class="country-name-desktop-english" style="text-transform: uppercase;">
                    {{ country }}
                  </h3>
                </div>
                

                <p class="country-description">
                  {{ getCountryDescription(country) }}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { clearAuthSession, clearLocalStoragePreservingRememberPassword } from '../stores/auth.js';
import { resetUserDataSync } from '../stores/userDataSync.js';
import { clearAllImages } from '../utils/customImageStore.js';

const LONG_PRESS_MS = 800;

export default {
  data() {
    return {
      continents: {
        asia: [
          'japan',
          'china',
          'singapore',
          'malaysia',
          'thailand',
          'vietnam',
          'korea',
          'indonesia',
          'srilanka',
          'maldives',
          'israel',
          'turkey',
          'saudiarabia',
          'uae',
          'qatar',
          'brunei',
          'philippines',
          'india',
          'bhutan',
          'nepal'
        ],
        oceania: ['australia', 'newzealand', 'papuanewguinea'],
        europe: [
          'switzerland',
          'iceland',
          'denmark',
          'france',
          'germany',
          'uk',
          'ireland',
          'spain',
          'italy',
          'portugal',
          'netherlands',
          'sweden',
          'norway',
          'austria',
          'belgium',
          'finland',
          'luxembourg',
          'hungary',
          'czech',
          'slovakia',
          'greece',
          'croatia',
          'lithuania',
          'latvia',
          'estonia',
          'poland',
          'andorra',
          'liechtenstein',
          'malta',
          'monaco',
          'sanmarino',
          'slovenia',
          'ukraine',
          'georgia',
          'armenia',
          'azerbaijan',
          'serbia',
          'bulgaria',
          'romania',
          'moldova',
          'northmacedonia',
          'albania',
          'montenegro',
          'bosniaherzegovina',
          'kosovo'
        ],
        america: [
          'america',
          'canada',
          'mexico',
          'argentina',
          'uruguay',
          'brazil',
          'paraguay',
          'peru',
          'chile',
          'bolivia',
          'colombia',
          'guatemala',
          'elsalvador',
          'honduras',
          'nicaragua',
          'costarica',
          'panama'
        ],
        africa: ['morocco', 'egypt', 'southafrica', 'madagascar']
      },
      countryTranslations: {
        japan: '日本',
        china: '中国',
        singapore: '新加坡',
        malaysia: '马来西亚',
        brunei: '文莱',
        thailand: '泰国',
        vietnam: '越南',
        switzerland: '瑞士',
        andorra: '安道尔',
        liechtenstein: '列支敦士登',
        malta: '马耳他',
        monaco: '摩纳哥',
        poland: '波兰',
        sanmarino: '圣马力诺',
        slovenia: '斯洛文尼亚',
        france: '法国',
        germany: '德国',
        uk: '英国',
        ireland: '爱尔兰',
        spain: '西班牙',
        italy: '意大利',
        portugal: '葡萄牙',
        netherlands: '荷兰',
        sweden: '瑞典',
        norway: '挪威',
        austria: '奥地利',
        belgium: '比利时',
        finland: '芬兰',
        luxembourg: '卢森堡',
        hungary: '匈牙利',
        czech: '捷克',
        slovakia: '斯洛伐克',
        greece: '希腊',
        croatia: '克罗地亚',
        lithuania: '立陶宛',
        latvia: '拉脱维亚',
        estonia: '爱沙尼亚',
        korea: '韩国',
        indonesia: '印度尼西亚',
        srilanka: '斯里兰卡',
        maldives: '马尔代夫',
        argentina: '阿根廷',
        uruguay: '乌拉圭',
        brazil: '巴西',
        paraguay: '巴拉圭',
        peru: '秘鲁',
        chile: '智利',
        bolivia: '玻利维亚',
        colombia: '哥伦比亚',
        morocco: '摩洛哥',
        egypt: '埃及',
        southafrica: '南非',
        madagascar: '马达加斯加',
        israel: '以色列',
        turkey: '土耳其',
        saudiarabia: '沙特阿拉伯',
        uae: '阿联酋',
        qatar: '卡塔尔',
        america: '美国',
        canada: '加拿大',
        mexico: '墨西哥',
        iceland: '冰岛',
        denmark: '丹麦',
        australia: '澳大利亚',
        newzealand: '新西兰',
        guatemala: '危地马拉',
        elsalvador: '萨尔瓦多',
        honduras: '洪都拉斯',
        nicaragua: '尼加拉瓜',
        costarica: '哥斯达黎加',
        panama: '巴拿马',
        philippines: '菲律宾',
        india: '印度',
        bhutan: '不丹',
        nepal: '尼泊尔',
        papuanewguinea: '巴布亚新几内亚',
        ukraine: '乌克兰',
        georgia: '格鲁吉亚',
        armenia: '亚美尼亚',
        azerbaijan: '阿塞拜疆',
        serbia: '塞尔维亚',
        bulgaria: '保加利亚',
        romania: '罗马尼亚',
        moldova: '摩尔多瓦',
        northmacedonia: '北马其顿',
        albania: '阿尔巴尼亚',
        montenegro: '黑山',
        bosniaherzegovina: '波黑',
        kosovo: '科索沃'
      },
      placeholderText: '搜寻国家，发现美和新奇',
      searchQuery: '',
      quickJumpContinents: ['oceania', 'europe', 'america', 'africa'],
      searchFocused: false,
      hasEverSearched: false,
      showHeroLogo: false,
      showLogoutTooltip: false,
      tooltipTimer: null,
      longPressTimer: null,
      logoColorizing: false,
      longPressHandled: false,
      logoutInProgress: false
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
  beforeUnmount() {
    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }
    if (this.tooltipTimer) {
      clearTimeout(this.tooltipTimer);
      this.tooltipTimer = null;
    }
  },
  computed: {
    hasSearchQuery() {
      return this.searchQuery.trim().length > 0;
    },
    allCountries() {
      return Object.values(this.continents).flat();
    },
    matchedCountries() {
      if (!this.hasSearchQuery) {
        return [];
      }
      const query = this.searchQuery.trim().toLowerCase();
      return this.allCountries.filter((country) => {
        const english = country.toLowerCase();
        const translation = (this.countryTranslations[country] || '').toLowerCase();
        return english.includes(query) || translation.includes(query);
      });
    },
    isJiggling() {
      return !!this.searchFocused;
    },
    jiggleStyle() {
      return {
        animation: 'jiggle 0.3s ease-in-out infinite',
        transformOrigin: 'center',
        willChange: 'transform',
        opacity: '1',
        transform: 'translateY(0)'
      };
    }
  },
  watch: {
    hasSearchQuery(val) {
      if (val) this.hasEverSearched = true;
    }
  },
  methods: {
    handleHeroLogoClick() {
      if (this.logoutInProgress || this.longPressHandled) {
        this.longPressHandled = false;
        return;
      }
      this.showLogoutTooltip = true;
      if (this.tooltipTimer) {
        clearTimeout(this.tooltipTimer);
      }
      this.tooltipTimer = setTimeout(() => {
        this.showLogoutTooltip = false;
        this.tooltipTimer = null;
      }, 1200);
    },
    startHeroLongPress() {
      if (this.logoutInProgress) return;
      this.longPressHandled = false;
      this.logoColorizing = true;
      if (this.longPressTimer) {
        clearTimeout(this.longPressTimer);
      }
      this.longPressTimer = setTimeout(() => {
        this.longPressHandled = true;
        this.triggerLogout();
      }, LONG_PRESS_MS);
    },
    cancelHeroLongPress() {
      if (this.longPressHandled || this.logoutInProgress) return;
      this.logoColorizing = false;
      if (this.longPressTimer) {
        clearTimeout(this.longPressTimer);
        this.longPressTimer = null;
      }
    },
    async triggerLogout() {
      if (this.logoutInProgress) return;
      this.logoutInProgress = true;
      this.logoColorizing = true;
      this.showLogoutTooltip = false;
      if (this.longPressTimer) {
        clearTimeout(this.longPressTimer);
        this.longPressTimer = null;
      }
      if (this.tooltipTimer) {
        clearTimeout(this.tooltipTimer);
        this.tooltipTimer = null;
      }
      this.performClientCleanup();
      try {
        await this.$router.replace('/login');
      } catch (e) {
        try {
          this.$router.push('/login');
        } catch (_) {}
      }
    },
    performClientCleanup() {
      try {
        resetUserDataSync();
      } catch (e) {}
      try {
        clearAuthSession();
      } catch (e) {}
      try {
        clearLocalStoragePreservingRememberPassword();
      } catch (e) {}
      try {
        sessionStorage.clear();
      } catch (e) {}
      try { clearAllImages(); } catch (e) {}
      try {
        if (typeof caches !== 'undefined' && caches.keys) {
          caches.keys().then((keys) => keys.forEach((k) => caches.delete(k)));
        }
      } catch (e) {}
    },
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
    scrollToContinent(continent) {
      const scrollToTarget = () => {
        const target = document.getElementById(`continent-${continent}`);
        if (!target) return;
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      };

      if (this.hasSearchQuery) {
        this.searchQuery = '';
        this.$nextTick(() => {
          requestAnimationFrame(scrollToTarget);
        });
        return;
      }

      scrollToTarget();
    },
    getCountryEmoji(country) {
      const emojis = {
        japan: '🇯🇵',
        china: '🇨🇳',
        singapore: '🇸🇬',
        malaysia: '🇲🇾',
        brunei: '🇧🇳',
        thailand: '🇹🇭',
        vietnam: '🇻🇳',
        switzerland: '🇨🇭',
        andorra: '🇦🇩',
        liechtenstein: '🇱🇮',
        malta: '🇲🇹',
        monaco: '🇲🇨',
        poland: '🇵🇱',
        sanmarino: '🇸🇲',
        slovenia: '🇸🇮',
        france: '🇫🇷',
        germany: '🇩🇪',
        uk: '🇬🇧',
        ireland: '🇮🇪',
        spain: '🇪🇸',
        italy: '🇮🇹',
        portugal: '🇵🇹',
        netherlands: '🇳🇱',
        sweden: '🇸🇪',
        norway: '🇳🇴',
        austria: '🇦🇹',
        belgium: '🇧🇪',
        finland: '🇫🇮',
        luxembourg: '🇱🇺',
        hungary: '🇭🇺',
        czech: '🇨🇿',
        slovakia: '🇸🇰',
        greece: '🇬🇷',
        croatia: '🇭🇷',
        lithuania: '🇱🇹',
        latvia: '🇱🇻',
        estonia: '🇪🇪',
        korea: '🇰🇷',
        indonesia: '🇮🇩',
        srilanka: '🇱🇰',
        maldives: '🇲🇻',
        argentina: '🇦🇷',
        uruguay: '🇺🇾',
        brazil: '🇧🇷',
        paraguay: '🇵🇾',
        peru: '🇵🇪',
        chile: '🇨🇱',
        bolivia: '🇧🇴',
        colombia: '🇨🇴',
        morocco: '🇲🇦',
        egypt: '🇪🇬',
        southafrica: '🇿🇦',
        madagascar: '🇲🇬',
        israel: '🇮🇱',
        turkey: '🇹🇷',
        saudiarabia: '🇸🇦',
        uae: '🇦🇪',
        qatar: '🇶🇦',
        america: '🇺🇸',
        canada: '🇨🇦',
        mexico: '🇲🇽',
        iceland: '🇮🇸',
        denmark: '🇩🇰',
        australia: '🇦🇺',
        newzealand: '🇳🇿',
        guatemala: '🇬🇹',
        elsalvador: '🇸🇻',
        honduras: '🇭🇳',
        nicaragua: '🇳🇮',
        costarica: '🇨🇷',
        panama: '🇵🇦',
        philippines: '🇵🇭',
        india: '🇮🇳',
        bhutan: '🇧🇹',
        nepal: '🇳🇵',
        papuanewguinea: '🇵🇬',
        ukraine: '🇺🇦',
        georgia: '🇬🇪',
        armenia: '🇦🇲',
        azerbaijan: '🇦🇿',
        serbia: '🇷🇸',
        bulgaria: '🇧🇬',
        romania: '🇷🇴',
        moldova: '🇲🇩',
        northmacedonia: '🇲🇰',
        albania: '🇦🇱',
        montenegro: '🇲🇪',
        bosniaherzegovina: '🇧🇦',
        kosovo: '🇽🇰'
      };
      return emojis[country] || '🌍';
    },
    getCountryDescription(country) {
      const descriptions = {
        japan: '探索樱花之国，体验传统与现代交织的独特魅力。',
        china: '发现千年古国的壮丽山河与深厚文化底蕴。',
        singapore: '感受花园城市的多元文化与现代都市气息。',
        malaysia: '在热带雨林与多元文化中开启味蕾与自然之旅。',
        brunei: '雨林与清真寺交织的婆罗洲秘境，静谧而富有灵性。',
        thailand: '微笑之国，古寺海滩与夜市交织的缤纷体验。',
        vietnam: '从河内旧街到下龙湾，感受古老与新生的碰撞。',
        switzerland: '在阿尔卑斯山间邂逅钟表工艺与巧克力的精致世界。',
        andorra: '比利牛斯山脉间的袖珍国度，山谷古镇与雪峰小径相映成趣。',
        liechtenstein: '阿尔卑斯山脚的迷你公国，城堡与山地风光相伴。',
        malta: '地中海岛国，蓝色海湾与骑士历史在阳光下闪耀。',
        monaco: '蔚蓝海岸的微型国度，海港、赛道与浪漫夜色交织。',
        poland: '从华沙到克拉科夫，历史与文化在中欧大地流淌。',
        sanmarino: '山顶共和国，古堡城墙与远眺意大利的辽阔风景。',
        slovenia: '阿尔卑斯与湖泊交汇的绿色国度，布莱德湖如画般宁静。',
        france: '在浪漫之都与南法海岸之间，品味艺术、美酒与生活情调。',
        germany: '走入黑森林与童话小镇，感受严谨与浪漫并存的德意志。',
        uk: '从伦敦到苏格兰高地，在雾都与古堡间邂逅英伦气质。',
        ireland: '绿岛之国，古堡、海崖与民谣在微醺与海风里相遇。',
        spain: '弗拉门戈、阳光海岸与百年古城交织出的热情西班牙。',
        italy: '在罗马、佛罗伦萨与托斯卡纳之间，追寻文艺复兴的余温。',
        portugal: '里斯本电车与波尔图酒庄，海风与旧时光的温柔回响。',
        netherlands: '郁金香花海、风车村与运河边的咖啡香气。',
        sweden: '北欧极光、宁静群岛与极简设计构成的清冷之美。',
        norway: '深入峡湾与雪山峡谷，体验纯净自然与极夜极昼。',
        austria: '音乐之都与阿尔卑斯雪山，充满古典与优雅气息。',
        belgium: '巧克力、啤酒与中世纪小镇，慢步品味比利时风情。',
        finland: '走进童话般的芬兰森林与极地小屋，邂逅圣诞与极光。',
        luxembourg: '袖珍公国里的古堡峡谷与静谧欧洲慢生活。',
        hungary: '多瑙河畔的布达佩斯，温泉与新旧建筑交织。',
        czech: '布拉格老城的石板路与红屋顶，记录着中欧的浪漫。',
        slovakia: '塔特拉山脉与古堡小镇，低调却迷人的中欧角落。',
        greece: '爱琴海蓝白小镇与古老神庙，共同诉说希腊神话与阳光。',
        croatia: '亚得里亚海岸线与古城城墙，电影般的地中海画面。',
        lithuania: '波罗的海边的古都与湖泊，宁静而富有历史感。',
        latvia: '里加的艺术新风与老城街巷，展现波罗的海的细腻气质。',
        estonia: '塔林老城的尖顶与石墙，科技与中世纪在此相遇。',
        korea: '从首尔街头到济州海岸，体验潮流文化与传统韩屋。',
        indonesia: '千岛之国，火山、雨林与海岛度假地交织的热带天堂。',
        srilanka: '茶园山丘、古老佛塔与印度洋海岸，共同构成锡兰风情。',
        maldives: '碧海蓝天与水上屋，适合把时间交给海风与日落。',
        argentina: '探戈之都与巴塔哥尼亚，激情与苍茫同在一国。',
        uruguay: '悠闲小国，海岸线与老城咖啡馆组成的缓慢节奏。',
        brazil: '狂欢节、亚马孙雨林与科帕卡巴纳海滩的热情国度。',
        paraguay: '静谧内陆之国，在红土地与河流间感受南美日常。',
        peru: '马丘比丘与安第斯山脉，印加文明的神秘回响。',
        chile: '从阿塔卡马到巴塔哥尼亚，南北纵贯的极致自然风光。',
        bolivia: '天空之境乌尤尼与高原城市，超现实的南美旅途。',
        colombia: '从加勒比海岸到安第斯山城，咖啡香与热带色彩交织的国度。',
        morocco: '马拉喀什集市、撒哈拉沙漠与蓝色小镇构成的魔幻世界。',
        egypt: '金字塔、尼罗河与古老神庙，穿越千年的文明摇篮。',
        southafrica: '桌山、美酒庄园与野生动物保护区的多元非洲。',
        madagascar: '猴面包树大道与独特物种，宛如异世界的孤岛大陆。',
        israel: '圣城与地中海海岸并存，在历史与现代之间漫步。',
        turkey: '从伊斯坦布尔到卡帕多奇亚，东西方文明交汇的桥梁。',
        saudiarabia: '金色沙漠与现代城市并存，揭开阿拉伯半岛的新面纱。',
        uae: '摩天大楼、沙漠与海湾构成的未来感奢华绿洲。',
        qatar: '波斯湾畔的现代都市与传统市集相映成趣。',
        america: '从自然奇景到繁华都市，体验多元自由的美洲风情。',
        canada: '枫叶之国，辽阔自然与极光星空相伴。',
        mexico: '玛雅文明遗迹与热情拉美风情交织的神秘国度。',
        iceland: '冰与火之地，追寻极光、冰川与火山的奇幻景致。',
        denmark: '童话王国，北欧设计与幸福生活的完美结合。',
        australia: '阳光海滩与奇异自然并存的袋鼠之国。',
        newzealand: '中土世界般的壮丽山河，适合探险与静心。',
        guatemala: '玛雅遗址与火山湖并存，安提瓜彩色街巷别具风情。',
        elsalvador: '中美最小国，火山、冲浪海滩与咖啡庄园的紧凑旅程。',
        honduras: '科潘玛雅古城与罗丹岛潜水胜地，原生态与海蓝交织。',
        nicaragua: '双湖火山与殖民小城，既可滑板下火山也能漫步古街。',
        costarica: '雨林、火山与太平洋/加勒比海双海岸，生态旅行天堂。',
        panama: '运河奇迹、旧城石巷与热带雨林，串起跨洋枢纽的多样体验。',
        philippines: '7000多岛的阳光海岸与潜水胜地，混合西班牙与亚洲风情。',
        india: '色彩、香料与古文明交织，从泰姬陵到喜马拉雅的多元旅途。',
        bhutan: '幸福指数之国，层叠山谷与寺庙壁画守护的高原秘境。',
        nepal: '喜马拉雅南麓的徒步天堂，雪峰与古老城邦相映成趣。',
        papuanewguinea: '南太平洋多部落文化与原始雨林，同享潜水与火山景观。',
        ukraine: '基辅金顶与黑海海岸，斯拉夫文化与现代韧性并存。',
        georgia: '外高加索的葡萄酒与高加索山脉，古老修道院遍布山谷。',
        armenia: '最早的基督教国度之一，石刻教堂与高原湖泊的静谧。',
        azerbaijan: '里海岸线与火焰山丘，巴库旧城与未来建筑同框。',
        serbia: '多瑙河畔的巴尔干枢纽，修道院、城堡与音乐节之城。',
        bulgaria: '玫瑰之谷、里拉修道院与黑海沙滩串起的多彩路线。',
        romania: '喀尔巴阡山与特兰西瓦尼亚古堡，童话与传说的故乡。',
        moldova: '静谧葡萄酒庄与乡村风光，东欧低调的小众酒国。',
        northmacedonia: '奥赫里德湖与山城街巷，巴尔干心脏的慢旅行。',
        albania: '亚得里亚与爱奥尼亚双海岸，碧湾与石城并存的秘境。',
        montenegro: '科托尔湾峡湾美景，小国却拥有壮阔山海。',
        bosniaherzegovina: '石桥老城与山谷清真寺，东西文化交织的巴尔干画卷。',
        kosovo: '年轻国家的咖啡馆文化与山地徒步，共谱巴尔干新篇章。'
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

.title-hero {
  font-family: 'ZCOOL XiaoWei', 'Noto Serif SC', 'Songti SC', 'STSong', 'Source Han Serif SC', 'SimSun', serif;
  font-weight: 800;
}

.country-text-group-mobile {
  display: none;
}

.country-text-group-desktop {
  display: flex;
  align-items:center;
  flex-direction: column;  /* 中文在上，英文在下 */
  line-height: 1.5;
}

.container {
  min-height: 100vh;
  padding: 20px;
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
  transition: opacity 0.6s ease;
  -webkit-touch-callout: none;
  user-select: none;
  touch-action: manipulation;
}

.hero-logo-wrapper {
  position: relative;
  display: inline-block;
  cursor: pointer;
  -webkit-touch-callout: none;
  user-select: none;
  touch-action: manipulation;
}

.hero-logo-colored {
  position: absolute;
  inset: 0;
  opacity: 0;
  pointer-events: none;
}

.logo-colored-visible {
  opacity: 1;
}

.logo-tooltip {
  position: absolute;
  bottom: -34px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.65);
  color: #fff;
  padding: 4px 6px;
  border-radius: 10px;
  font-size: 1rem;
  white-space: nowrap;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.2);
  opacity: 0.5;
}

.logo-tooltip-fade-enter-active,
.logo-tooltip-fade-leave-active {
  transition: opacity 0.2s ease;
}

.logo-tooltip-fade-enter-from,
.logo-tooltip-fade-leave-to {
  opacity: 0;
}

.hero-logo-hidden {
  visibility: hidden;
}

.title-text-group {
  display: flex;
  align-items:center;
  flex-direction:column;
  justify-content: center;  /* 水平方向居中 */
  line-height: 1.1;
  margin-bottom: 50px;
  margin-top: 10px;
}

.hero-title {
  font-size: 4rem;
  font-weight: 700;
}

.title-english {
  font-size: 1.8rem;
  padding: 0;
}

.hero-subtitle {
  font-size: 1.5rem;
  color: #6e6e73;
  font-weight: 400;
  max-width: 600px;
  margin: 0 auto;
  line-height: 1.6;
}

.search-bar {
  position: relative;
  max-width: 560px;
  margin: 24px auto 0;
}

.continent-nav {
  display: flex;
  justify-content: flex-start;
  flex-wrap: wrap;
  max-width: 560px;
  margin: 14px auto 0;
}

.continent-nav-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: #fff;
  backdrop-filter: blur(10px);
  border-radius: 24px;
  padding: 6px 14px;
  min-height: 34px;
  margin: 0 10px 10px 0;
  cursor: pointer;
  color: #1d1d1f;
  text-align: center;
  transition: transform 0.25s ease, box-shadow 0.25s ease;
}

.continent-nav-btn:hover {
  transform: translateY(-4px);
  box-shadow: 0 14px 28px rgba(0, 0, 0, 0.12);
}

.continent-nav-btn:focus-visible {
  outline: 2px solid #8aa9ff;
  outline-offset: 2px;
}

.continent-nav-btn-text {
  font-family:
    'ZaoZiGongFangChuangJiHei',
    -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif,
    '造字工房创际黑', 'ZCOOL XiaoWei', 'Noto Serif SC', 'Songti SC', 'STSong', 'Source Han Serif SC', 'SimSun', serif;
  font-size: 0.88rem;
  line-height: 1;
}

.search-input {
  width: 100%;
  padding: 14px 52px 14px 18px;
  border-radius: 16px;
  border: 1px solid #dcdde4;
  background: rgba(255, 255, 255, 0.9);
  font-size: 1rem;
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.08);
  transition: box-shadow 0.2s ease, border-color 0.2s ease;
  text-align: left;
  /* Android WebView: ensure overlay icon can render above native input */
  -webkit-appearance: none;
  appearance: none;
  position: relative;
  z-index: 1;
}

.search-input::placeholder {
  color: transparent;
}

.search-input:focus {
  outline: none;
  border-color: #8aa9ff;
  box-shadow: 0 16px 40px rgba(99, 126, 255, 0.2);
}

.search-icon {
  position: absolute;
  right: 16px;
  top: 50%;
  transform: translateY(-50%);
  color: #8b8fa3;
  width: 22px;
  height: 22px;
  pointer-events: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  z-index: 3;
}

.search-icon svg {
  width: 100%;
  height: 100%;
  display: block;
}

.search-results {
  margin-top: 10px;
  margin-bottom: 80px;
}

.search-placeholder {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  color: #8b8fa3;
  font-size: 1rem;
  user-select: none;
  padding: 0 60px;
  box-sizing: border-box;
  text-align: center;
  z-index: 2;
}

@keyframes jiggle {
  0% {
    transform: translate(0, 0) rotate(-0.54deg) scale(1.0009);
  }
  25% {
    transform: translate(0.32px, -0.2px) rotate(0.54deg);
  }
  50% {
    transform: translate(-0.32px, 0.2px) rotate(-0.44deg);
  }
  75% {
    transform: translate(0.2px, 0.2px) rotate(0.44deg);
  }
  100% {
    transform: translate(0, 0) rotate(-0.54deg) scale(1.0009);
  }
}

.jiggle,
.country-card.jiggle {
  animation: jiggle 0.4s ease-in-out infinite !important;
  transform-origin: center !important;
  will-change: transform;
  opacity: 1 !important;
}

:deep(.country-card.jiggle) {
  animation: jiggle 0.4s ease-in-out infinite !important;
  transform-origin: center !important;
  will-change: transform;
  opacity: 1 !important;
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

.country-name-desktop-english {
  font-size: 0.7rem;
}

.country-name-desktop,
.country-name-mobile {
  /* 中文名称：使用造字工房创基黑体，英文仍走系统字体 */
  font-family:
    'ZaoZiGongFangChuangJiHei',
    -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif,
    '造字工房创际黑', 'ZCOOL XiaoWei', 'Noto Serif SC', 'Songti SC', 'STSong', 'Source Han Serif SC', 'SimSun', serif;
  font-weight: 1;
}

.country-name-desktop-english,
.country-name-mobile-english {
  /* 英文名称：完全使用系统默认西文字体 */
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, "Microsoft YaHei", "Helvetica Neue", Arial, sans-serif;
  font-weight: 500;
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

/* 移动端优化：保持两列，但卡片缩小 */
@media (max-width: 768px) {

  .logo-tooltip {
    font-size: 0.85rem;
    bottom: -27px;
  }

  .container {
    padding-bottom: 0.01px;
  }

  .search-bar {
    margin-top: 12px;
    max-width: 100%;
  }

  .continent-nav {
    margin-top: 10px;
    max-width: 100%;
  }

  .continent-nav-btn {
    min-height: 30px;
    padding: 5px 10px;
    margin: 0 8px 8px 0;
  }

  .continent-nav-btn-text {
    font-size: 0.76rem;
  }

  .search-input {
    padding: 12px 44px 12px 14px;
    font-size: 0.95rem;
  }

  .search-results {
    margin-bottom: 40px;
  }

  .country-text-group-desktop{
    display: none;
  }

  .country-text-group-mobile {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    flex:1;
    line-height: 0.9;
  }

  .hero-section {
    margin-bottom: 15px;
  }

  .continent-section {
    margin-bottom: 33px;
  }

  

  .country-flag-desktop {
    display: none;
  }

  .country-name-mobile {
    font-size: 1rem;
    margin-bottom: 6px;
  }

  .country-name-mobile-english {
    font-size: 0.5rem;
  }

  .country-flag-mobile {
    display: flex;
    line-height: 52px;
    flex-shrink: 0;
  }

  .country-link {
    flex-direction: column;
    align-items: stretch;
    width:100%;
  }

  .countries-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 16px;
  }

  .country-card {
    padding: 5px 16px;
    padding-bottom: 10px;
  }

  .country-flag-name {
    display: flex;
    align-items: center;
    font-size: 2.5rem;
    width: 100%;
  }

  .country-name {
    font-size: 1rem;
    margin-bottom: 8px;
  }

  .country-description {
    margin-top: 0;
    font-size: 0.7rem;
  }
  
  .title-text-group {
    margin-bottom: 25px;
  }

  .hero-title {
    font-size: 2rem;
  }

  .title-english {
    font-size: 0.91rem;
  }

  .hero-subtitle {
    font-size: 1rem;
  }

  .continent-title {
    font-size: 1rem;
    margin-bottom: 16px;
  }
}
</style>
