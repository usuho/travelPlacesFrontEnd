<template>
  <div class="auth-page">
    <div class="auth-card card">
      <div class="auth-header">
        <div class="auth-heading">
          <p class="eyebrow">欢迎回来</p>
          <h2 class="title-mixed">
            <span class="title-default">登录</span><span class="title-hero">星垠海角</span>
          </h2>
        </div>
        <img class="auth-logo" src="/app-icon.png" alt="Travel Places" />
      </div>

      <form class="auth-form" @submit.prevent="handleSubmit">
        <label class="field">
          <span>用户名</span>
          <input
            type="text"
            v-model.trim="username"
            required
            autocomplete="username"
            placeholder="用户名/邮箱/手机号"
            inputmode="text"
          />
        </label>

        <div class="field-group">
          <label class="field">
            <span>密码</span>
            <input
              type="password"
              v-model.trim="password"
              required
              autocomplete="current-password"
            />
          </label>

          <div class="remember-row">
            <label class="remember-label">
              <input
                class="remember-checkbox"
                type="checkbox"
                v-model="rememberPassword"
              />
              <span class="remember-box" aria-hidden="true"></span>
              <span class="remember-text">记住密码</span>
            </label>
          </div>
        </div>

        <p v-if="errorMessage" class="error-message">{{ errorMessage }}</p>

        <button type="submit" :disabled="loading">
          <span v-if="loading" class="loading-inline"></span>
          <span v-else>登录</span>
        </button>
      </form>

      <div class="auth-footer">
        <span>还没有账号？</span>
        <router-link to="/register">前往注册</router-link>
      </div>
    </div>
  </div>
</template>

<script>
import { REMEMBER_PASSWORD_KEY, setAuthSession, clearAuthSession } from '../stores/auth.js'
import { pullUserDataFromServer, setSyncUsername, userDataSyncState } from '../stores/userDataSync.js'

const AUTH_BASE = (() => {
  try {
    const val = import.meta && import.meta.env && import.meta.env.VITE_API_BASE
    if (val) return String(val).replace(/\/$/, '')
    if (typeof window !== 'undefined' && window.location && window.location.origin) {
      // 默认同源，避免混合协议或端口导致的 SSL 错误
      return window.location.origin.replace(/\/$/, '')
    }
  } catch (e) {}
  return 'https://juseaxerf.com'
})()

const BASE_HEADERS = { 'Content-Type': 'application/json' }

const LOGIN_ENDPOINTS = ['/api/login']

export default {
  name: 'UserLogin',
  data() {
    return {
      username: '',
      password: '',
      rememberPassword: false,
      loading: false,
      errorMessage: ''
    }
  },
  mounted() {
    this.restoreRememberPassword()
  },
  watch: {
    rememberPassword(next) {
      if (next) {
        this.persistRememberPassword()
      } else {
        this.clearRememberPassword()
      }
    }
  },
  methods: {
    restoreRememberPassword() {
      try {
        const raw = localStorage.getItem(REMEMBER_PASSWORD_KEY)
        if (!raw) return
        const config = JSON.parse(raw)
        const enabled = !!(config && config.enabled)
        this.rememberPassword = enabled
        if (!enabled) return
        if (typeof config.username === 'string') this.username = config.username
        if (typeof config.password === 'string') this.password = config.password
      } catch (e) {}
    },
    persistRememberPassword() {
      if (!this.rememberPassword) return
      try {
        localStorage.setItem(
          REMEMBER_PASSWORD_KEY,
          JSON.stringify({
            enabled: true,
            username: this.username || '',
            password: this.password || ''
          })
        )
      } catch (e) {}
    },
    clearRememberPassword() {
      try {
        localStorage.removeItem(REMEMBER_PASSWORD_KEY)
      } catch (e) {}
    },
    buildLoginIdentifiers() {
      const raw = (this.username || '').trim()
      const candidates = new Set()
      if (raw) {
        candidates.add(raw)
        candidates.add(raw.toLowerCase())
      }

      // 手机号：只取数字，生成多种格式，兼容带/不带+前缀
      const digits = raw.replace(/[^\d]/g, '')
      if (digits.length >= 4) {
        candidates.add(digits)
        candidates.add(`+${digits}`)
        // 有时用户只填本地号码，尝试末 8 位以匹配后端的 endsWith 逻辑
        if (digits.length > 8) {
          candidates.add(digits.slice(-8))
        }
      }

      return Array.from(candidates)
    },
    async handleSubmit() {
      this.errorMessage = ''
      if (!this.username || !this.password) {
        this.errorMessage = '请填写用户名/邮箱/手机号和密码'
        return
      }

      const identifiers = this.buildLoginIdentifiers()
      if (!identifiers.length) {
        this.errorMessage = '请输入用户名/邮箱/手机号'
        return
      }

      this.loading = true
      let lastError = '登录失败，请稍后重试'
      const headers = { ...BASE_HEADERS }

      try {
        for (const identifier of identifiers) {
          const payload = { username: identifier, password: this.password }

          for (const path of LOGIN_ENDPOINTS) {
            const url = `${AUTH_BASE}${path}`
            const response = await fetch(url, {
              method: 'POST',
              headers,
              body: JSON.stringify(payload)
            })

            let data = {}
            try {
              data = await response.json()
            } catch (e) {}

            if (response.ok) {
              const tokenRaw = data.token || data.accessToken || data.jwt || data.sessionToken || (data.data && data.data.token) || ''
              const token = typeof tokenRaw === 'string' ? tokenRaw.trim() : ''
              if (!token) {
                this.errorMessage = '登录成功，但服务端未返回 token，无法在 App 端完成鉴权/同步。请联系管理员检查 /api/login 返回值。'
                return
              }
              const user = data.user || { username: identifier }
              setAuthSession(token, user)
              if (this.rememberPassword) {
                this.persistRememberPassword()
              } else {
                this.clearRememberPassword()
              }
              setSyncUsername(user && user.username ? user.username : identifier)
              const synced = await pullUserDataFromServer({ onUnauthorized: 'throw' })
              if (!synced) {
                const msg = (userDataSyncState && userDataSyncState.error) ? userDataSyncState.error : ''
                if (/unauthorized/i.test(msg)) {
                  this.errorMessage = '登录成功，但同步接口返回 401（未授权）。请确认后端 /api/user/data 支持 Authorization: Bearer <token>（如使用 Nginx 反代需转发 Authorization 头）。'
                } else {
                  this.errorMessage = msg ? `登录成功，但同步失败：${msg}` : '登录成功，但同步失败，请稍后重试'
                }
                clearAuthSession()
                return
              }
              const redirectPath = (this.$route && this.$route.query && this.$route.query.redirect) ? this.$route.query.redirect : '/'
              this.$router.replace(redirectPath || '/')
              return
            }

            lastError = data.msg || data.error || data.message || `登录失败（${response.status}）`
          }
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
  width: min(440px, 100%);
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

.title-mixed {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
}

.title-hero{
  font-size:2rem;
  font-family: 'ZCOOL XiaoWei', 'Noto Serif SC', 'Songti SC', 'STSong', 'Source Han Serif SC', 'SimSun', serif;
  font-weight: 600;
}

.title-mixed .title-default {
  margin-right: 5px;
  font-size:1.4rem;
  font-weight: 500;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
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

.field-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.remember-row {
  display: flex;
  justify-content: flex-end;
}

.remember-label {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 500;
  color: #1d1d1f;
  cursor: pointer;
  user-select: none;
}

.remember-checkbox {
  position: absolute;
  opacity: 0;
  width: 1px;
  height: 1px;
  margin: 0;
  padding: 0;
  border: 0;
}

.remember-box {
  width: 16px;
  height: 16px;
  border-radius: 4px;
  border: 1px solid #d2d2d7;
  background: #fff;
  box-shadow: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.15s ease, border-color 0.15s ease;
}

.remember-box::after {
  content: '';
  width: 8px;
  height: 4px;
  border-left: 2px solid #fff;
  border-bottom: 2px solid #fff;
  transform: rotate(-45deg) scale(0);
  transition: transform 0.15s ease;
}

.remember-checkbox:checked + .remember-box {
  background: #007aff;
  border-color: #007aff;
}

.remember-checkbox:checked + .remember-box::after {
  transform: rotate(-45deg) scale(1);
}

.remember-checkbox:focus-visible + .remember-box {
  outline: 2px solid rgba(0, 122, 255, 0.35);
  outline-offset: 2px;
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

.loading-inline {
  width: 20px;
  height: 20px;
  border: 2px solid #f3f3f3;
  border-top: 2px solid #fff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@media (max-width: 520px) {
  .auth-card {
    padding: 24px;
  }

  .auth-logo {
    width: 48px;
    height: 48px;
  }
}
</style>
