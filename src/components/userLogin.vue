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
          <input type="text" v-model.trim="username" required autocomplete="username" />
        </label>

        <label class="field">
          <span>密码</span>
          <input type="password" v-model.trim="password" required autocomplete="current-password" />
        </label>

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
import { COOKIE_ONLY_TOKEN, setAuthSession } from '../stores/auth.js'

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
      loading: false,
      errorMessage: ''
    }
  },
  methods: {
    async handleSubmit() {
      this.errorMessage = ''
      if (!this.username || !this.password) {
        this.errorMessage = '请填写用户名和密码'
        return
      }

      this.loading = true
      let lastError = '登录失败，请稍后重试'
      const payload = {
        username: this.username,
        password: this.password
      }
      const headers = { ...BASE_HEADERS }

      try {
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
            const token = data.token || data.accessToken || data.jwt || data.sessionToken || (data.data && data.data.token) || COOKIE_ONLY_TOKEN
            const user = data.user || { username: this.username }
            setAuthSession(token, user)
            const redirectPath = (this.$route && this.$route.query && this.$route.query.redirect) ? this.$route.query.redirect : '/'
            this.$router.replace(redirectPath || '/')
            return
          }

          lastError = data.msg || data.error || data.message || `登录失败（${response.status}）`
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

.title-mixed .title-default {
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
