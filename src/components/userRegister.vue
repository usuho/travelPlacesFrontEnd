<template>
  <div class="auth-page">
    <div class="auth-card card">
      <div class="auth-header">
        <div class="auth-heading">
          <h2 class="title-default">注册账号</h2>
        </div>
        <img class="auth-logo" src="/app-icon.png" alt="Travel Places" />
      </div>

      <form class="auth-form" @submit.prevent="handleSubmit">
        <div class="grid two">
          <label class="field">
            <span>用户名 *</span>
            <input type="text" v-model.trim="form.username" required autocomplete="username" />
          </label>
          <label class="field">
            <span>姓名 *</span>
            <input type="text" v-model.trim="form.name" required autocomplete="name" />
          </label>
        </div>

        <div class="grid two desktop">
          <label class="field">
            <span>国家 *</span>
            <input
              list="country-list"
              v-model.trim="countryQuery"
              autocomplete="country-name"
              required
              :class="{ invalid: !validCountry && (attempted || countryQuery) }"
              placeholder="开始输入国家名称以筛选（中/英）"
            />
            <datalist id="country-list">
              <option
                v-for="country in filteredCountries"
                :key="country.value"
                :value="country.label"
                :label="`${country.labelZh} / ${country.label}`"
              />
            </datalist>
          </label>
          <label class="field">
            <span>公司 *</span>
            <input type="text" v-model.trim="form.company" required autocomplete="organization" />
          </label>
        </div>

        <label class="field">
          <span>住址 *</span>
          <input type="text" v-model.trim="form.address" required autocomplete="street-address" />
        </label>

        <div class="grid two desktop">
          <label class="field">
            <span>手机号码 *</span>
            <input
              type="tel"
              v-model.trim="form.mobile"
              required
              autocomplete="tel"
              :class="{ invalid: !validMobile && (attempted || form.mobile) }"
            />
          </label>
          <label class="field">
            <span>邮箱 *</span>
            <input
              type="email"
              v-model.trim="form.email"
              required
              autocomplete="email"
              :class="{ invalid: !validEmail && (attempted || form.email) }"
            />
          </label>
        </div>

        <label class="field">
          <span>密码 *</span>
          <input type="password" v-model.trim="form.password" required autocomplete="new-password" />
        </label>

        <label class="field">
          <span>确认密码 *</span>
          <input type="password" v-model.trim="form.confirmPassword" required autocomplete="new-password" />
        </label>

        <p v-if="errorMessage" class="error-message">{{ errorMessage }}</p>
        <p v-if="successMessage" class="success-message">{{ successMessage }}</p>

        <button type="submit" :disabled="!isFormValid || loading">
          <span v-if="loading" class="loading-inline"></span>
          <span v-else>注册并继续</span>
        </button>
      </form>

      <div class="auth-footer">
        <span>已经有账号？</span>
        <router-link to="/login">返回登录</router-link>
      </div>
    </div>
  </div>
</template>

<script>
import { setAuthSession } from '../stores/auth.js'

function normalizeCountryInput(str) {
  return String(str || '').trim().toLowerCase().replace(/\s+/g, ' ')
}

function titleCaseCountry(name) {
  return String(name || '')
    .split(/(\s|-)/)
    .map(part => {
      if (part === ' ' || part === '-') return part
      return part.charAt(0).toUpperCase() + part.slice(1)
    })
    .join('')
}

const COUNTRY_TRANSLATIONS = {
  'afghanistan': '阿富汗', 'albania': '阿尔巴尼亚', 'algeria': '阿尔及利亚', 'andorra': '安道尔', 'angola': '安哥拉',
  'antigua and barbuda': '安提瓜和巴布达', 'argentina': '阿根廷', 'armenia': '亚美尼亚', 'australia': '澳大利亚',
  'austria': '奥地利', 'azerbaijan': '阿塞拜疆', 'bahamas': '巴哈马', 'bahrain': '巴林', 'bangladesh': '孟加拉国',
  'barbados': '巴巴多斯', 'belarus': '白俄罗斯', 'belgium': '比利时', 'belize': '伯利兹', 'benin': '贝宁', 'bhutan': '不丹',
  'bolivia': '玻利维亚', 'bosnia and herzegovina': '波黑', 'botswana': '博茨瓦纳', 'brazil': '巴西', 'brunei': '文莱',
  'bulgaria': '保加利亚', 'burkina faso': '布基纳法索', 'burundi': '布隆迪', 'cabo verde': '佛得角', 'cambodia': '柬埔寨',
  'cameroon': '喀麦隆', 'canada': '加拿大', 'central african republic': '中非共和国', 'chad': '乍得', 'chile': '智利',
  'china': '中国', 'colombia': '哥伦比亚', 'comoros': '科摩罗', 'congo': '刚果', 'costa rica': '哥斯达黎加',
  "cote d'ivoire": '科特迪瓦', 'croatia': '克罗地亚', 'cuba': '古巴', 'cyprus': '塞浦路斯', 'czechia': '捷克',
  'denmark': '丹麦', 'djibouti': '吉布提', 'dominica': '多米尼克', 'dominican republic': '多米尼加', 'ecuador': '厄瓜多尔',
  'egypt': '埃及', 'el salvador': '萨尔瓦多', 'equatorial guinea': '赤道几内亚', 'eritrea': '厄立特里亚', 'estonia': '爱沙尼亚',
  'eswatini': '埃斯瓦蒂尼', 'ethiopia': '埃塞俄比亚', 'fiji': '斐济', 'finland': '芬兰', 'france': '法国', 'gabon': '加蓬',
  'gambia': '冈比亚', 'georgia': '格鲁吉亚', 'germany': '德国', 'ghana': '加纳', 'greece': '希腊', 'grenada': '格林纳达',
  'guatemala': '危地马拉', 'guinea': '几内亚', 'guinea-bissau': '几内亚比绍', 'guyana': '圭亚那', 'haiti': '海地',
  'holy see': '梵蒂冈', 'honduras': '洪都拉斯', 'hungary': '匈牙利', 'iceland': '冰岛', 'india': '印度',
  'indonesia': '印度尼西亚', 'iran': '伊朗', 'iraq': '伊拉克', 'ireland': '爱尔兰', 'israel': '以色列', 'italy': '意大利',
  'jamaica': '牙买加', 'japan': '日本', 'jordan': '约旦', 'kazakhstan': '哈萨克斯坦', 'kenya': '肯尼亚', 'kiribati': '基里巴斯',
  'kuwait': '科威特', 'kyrgyzstan': '吉尔吉斯斯坦', 'laos': '老挝', 'latvia': '拉脱维亚', 'lebanon': '黎巴嫩',
  'lesotho': '莱索托', 'liberia': '利比里亚', 'libya': '利比亚', 'liechtenstein': '列支敦士登', 'lithuania': '立陶宛',
  'luxembourg': '卢森堡', 'madagascar': '马达加斯加', 'malawi': '马拉维', 'malaysia': '马来西亚', 'maldives': '马尔代夫',
  'mali': '马里', 'malta': '马耳他', 'marshall islands': '马绍尔群岛', 'mauritania': '毛里塔尼亚', 'mauritius': '毛里求斯',
  'mexico': '墨西哥', 'micronesia': '密克罗尼西亚', 'moldova': '摩尔多瓦', 'monaco': '摩纳哥', 'mongolia': '蒙古',
  'montenegro': '黑山', 'morocco': '摩洛哥', 'mozambique': '莫桑比克', 'myanmar': '缅甸', 'namibia': '纳米比亚',
  'nauru': '瑙鲁', 'nepal': '尼泊尔', 'netherlands': '荷兰', 'new zealand': '新西兰', 'nicaragua': '尼加拉瓜', 'niger': '尼日尔',
  'nigeria': '尼日利亚', 'north korea': '朝鲜', 'north macedonia': '北马其顿', 'norway': '挪威', 'oman': '阿曼',
  'pakistan': '巴基斯坦', 'palau': '帕劳', 'panama': '巴拿马', 'papua new guinea': '巴布亚新几内亚', 'paraguay': '巴拉圭',
  'peru': '秘鲁', 'philippines': '菲律宾', 'poland': '波兰', 'portugal': '葡萄牙', 'qatar': '卡塔尔', 'romania': '罗马尼亚',
  'russia': '俄罗斯', 'rwanda': '卢旺达', 'saint kitts and nevis': '圣基茨和尼维斯', 'saint lucia': '圣卢西亚',
  'saint vincent and the grenadines': '圣文森特和格林纳丁斯', 'samoa': '萨摩亚', 'san marino': '圣马力诺',
  'sao tome and principe': '圣多美和普林西比', 'saudi arabia': '沙特阿拉伯', 'senegal': '塞内加尔', 'serbia': '塞尔维亚',
  'seychelles': '塞舌尔', 'sierra leone': '塞拉利昂', 'singapore': '新加坡', 'slovakia': '斯洛伐克', 'slovenia': '斯洛文尼亚',
  'solomon islands': '所罗门群岛', 'somalia': '索马里', 'south africa': '南非', 'south korea': '韩国', 'south sudan': '南苏丹',
  'spain': '西班牙', 'sri lanka': '斯里兰卡', 'sudan': '苏丹', 'suriname': '苏里南', 'sweden': '瑞典', 'switzerland': '瑞士',
  'syria': '叙利亚', 'tajikistan': '塔吉克斯坦', 'tanzania': '坦桑尼亚', 'thailand': '泰国', 'timor-leste': '东帝汶',
  'togo': '多哥', 'tonga': '汤加', 'trinidad and tobago': '特立尼达和多巴哥', 'tunisia': '突尼斯', 'turkey': '土耳其',
  'turkmenistan': '土库曼斯坦', 'tuvalu': '图瓦卢', 'uganda': '乌干达', 'ukraine': '乌克兰', 'united arab emirates': '阿联酋',
  'united kingdom': '英国', 'united states': '美国', 'uruguay': '乌拉圭', 'uzbekistan': '乌兹别克斯坦', 'vanuatu': '瓦努阿图',
  'venezuela': '委内瑞拉', 'vietnam': '越南', 'yemen': '也门', 'zambia': '赞比亚', 'zimbabwe': '津巴布韦'
}

const COUNTRY_OPTIONS = Object.entries(COUNTRY_TRANSLATIONS).map(([value, zh]) => ({
  value,
  label: titleCaseCountry(value),
  labelZh: zh
})).sort((a, b) => a.label.localeCompare(b.label))

const AUTH_BASE = (() => {
  try {
    const val = import.meta && import.meta.env && import.meta.env.VITE_API_BASE
    if (val) return String(val).replace(/\/$/, '')
    if (typeof window !== 'undefined' && window.location && window.location.origin) {
      // 默认走同源，避免混合协议/端口引起 SSL 错误
      return window.location.origin.replace(/\/$/, '')
    }
  } catch (e) {}
  return 'https://juseaxerf.com'
})()

const BASE_HEADERS = { 'Content-Type': 'application/json' }

const REGISTER_ENDPOINTS = ['/api/register']

export default {
  name: 'UserRegister',
  data() {
    return {
      form: {
        username: '',
        name: '',
        country: '',
        company: '',
        address: '',
        mobile: '',
        email: '',
        password: '',
        confirmPassword: ''
      },
      allowedCountries: COUNTRY_OPTIONS,
      countryQuery: '',
      loading: false,
      errorMessage: '',
      successMessage: '',
      attempted: false
    }
  },
  computed: {
    allowedCountryValues() {
      return this.allowedCountries.map(c => c.value)
    },
    filteredCountries() {
      const q = normalizeCountryInput(this.countryQuery)
      if (!q) return this.allowedCountries.slice(0, 50)
      return this.allowedCountries.filter(c => {
        const label = normalizeCountryInput(c.label)
        const value = normalizeCountryInput(c.value)
        const zh = normalizeCountryInput(c.labelZh)
        return label.includes(q) || value.includes(q) || zh.includes(q)
      }).slice(0, 50)
    },
    matchedCountryValue() {
      const q = normalizeCountryInput(this.countryQuery || this.form.country)
      if (!q) return ''
      const hit = this.allowedCountries.find(c => {
        const label = normalizeCountryInput(c.label)
        const value = normalizeCountryInput(c.value)
        const zh = normalizeCountryInput(c.labelZh)
        return label === q || value === q || zh === q
      })
      return hit ? hit.value : ''
    },
    validMobile() {
      const digits = (this.form.mobile || '').replace(/[^\d]/g, '')
      // 至少 6 位数字，可含 + - 空格
      return !!this.form.mobile && digits.length >= 6 && /^[\d+\-\s]+$/.test(this.form.mobile)
    },
    validEmail() {
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.form.email || '')
    },
    validCountry() {
      return !!this.matchedCountryValue
    },
    isFormValid() {
      const { country, ...rest } = this.form
      const filled = Object.values(rest).every(v => !!v)
      const matched = this.form.password && this.form.password === this.form.confirmPassword
      return filled && matched && this.validMobile && this.validEmail && this.validCountry
    }
  },
  methods: {
    async handleSubmit() {
      this.errorMessage = ''
      this.successMessage = ''
      this.attempted = true
      const countryValue = this.matchedCountryValue

      if (!this.isFormValid || !countryValue) {
        this.errorMessage = this.form.password !== this.form.confirmPassword
          ? '两次输入的密码不一致'
          : '请检查必填项并确保格式正确（国家/手机/邮箱）'
        return
      }
      this.form.country = countryValue

      this.loading = true
      const payload = {
        username: this.form.username,
        name: this.form.name,
        country: countryValue,
        company: this.form.company,
        address: this.form.address,
        mobile: this.form.mobile,
        email: this.form.email,
        password: this.form.password,
        confirmPassword: this.form.confirmPassword
      }

      let lastError = '注册失败，请稍后重试'
      try {
        for (const path of REGISTER_ENDPOINTS) {
          const url = `${AUTH_BASE}${path}`
          const response = await fetch(url, {
            method: 'POST',
            headers: { ...BASE_HEADERS },
            body: JSON.stringify(payload)
          })

          let data = {}
          try {
            data = await response.json()
          } catch (e) {}

          if (response.ok) {
            const token = data.token || data.accessToken || data.jwt || data.sessionToken || (data.data && data.data.token) || ''
            const user = data.user || {
              username: this.form.username,
              name: this.form.name,
              country: this.form.country,
              email: this.form.email
            }
            if (token) {
              setAuthSession(token, user)
              const redirectPath = (this.$route && this.$route.query && this.$route.query.redirect) ? this.$route.query.redirect : '/'
              this.$router.replace(redirectPath || '/')
            } else {
              this.successMessage = data.msg || data.message || '注册成功，请登录'
              setTimeout(() => {
                this.$router.replace({ path: '/login', query: { redirect: this.$route && this.$route.query && this.$route.query.redirect ? this.$route.query.redirect : undefined } })
              }, 600)
            }
            return
          }

          lastError = data.msg || data.error || data.message || `注册失败（${response.status}）`
        }
      } catch (e) {
        lastError = '网络异常，请稍后重试'
      } finally {
        this.loading = false
      }

      this.errorMessage = lastError
    }
  }
}
</script>

<style scoped>
.auth-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32px 16px;
  background: linear-gradient(135deg, #eef2ff 0%, #f5f7fb 100%);
}

.auth-card {
  width: min(520px, 100%);
  padding: 32px;
  background: #fff;
}

.auth-header {
  margin-bottom: 24px;
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: flex-start;
}

.eyebrow {
  font-size: 14px;
  color: #6e6e73;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  margin-bottom: 6px;
}

.subtitle {
  color: #6e6e73;
  margin-top: 8px;
}

.auth-logo {
  width: 56px;
  height: 56px;
  object-fit: contain;
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.grid {
  display: grid;
  gap: 16px;
}

.grid.two {
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
}

.field {
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-weight: 600;
  color: #1d1d1f;
}

.field input {
  width: 100%;
}

.field select {
  width: 100%;
}

.field datalist {
  max-height: 240px;
  overflow-y: auto;
}

.field select.invalid,
.field input.invalid {
  border-color: #d70000;
  background: #ffeaea;
}

button {
  width: 100%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.auth-footer {
  display: flex;
  gap: 6px;
  align-items: center;
  justify-content: center;
  margin-top: 16px;
  color: #6e6e73;
}

.error-message {
  color: #d70000;
  font-size: 14px;
}

.success-message {
  color: #0a7b27;
  font-size: 14px;
}

.loading-inline {
  width: 20px;
  height: 20px;
  border: 2px solid #f3f3f3;
  border-top: 2px solid #fff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@media (max-width: 600px) {
  .auth-card {
    padding: 24px;
  }

  .auth-logo {
    width: 48px;
    height: 48px;
  }
}
</style>
