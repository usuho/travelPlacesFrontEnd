<template>
  <div id="app">
    <div class="sync-indicator" :class="syncIndicatorClass">
      <span class="sync-icon">
        <span v-if="syncStatus === 'syncing'" class="sync-spinner"></span>
        <span v-else-if="syncStatus === 'ok'">✔</span>
        <span v-else>✖</span>
      </span>
      <span class="sync-username">{{ displayUsername }}</span>
    </div>
    <router-view></router-view>
    <!-- Global top-right site icon -->
    <img
      v-if="!isCountrySelect"
      ref="cornerLogo"
      class="corner-logo"
      :src="logoSrc"
      alt="Site icon"
      @error="onIconError"
      @click="handleCornerLogoClick"
    />
  </div>
</template>

<script>
import { userDataSyncState } from './stores/userDataSync.js'
import { getAuthUser } from './stores/auth.js'

export default {
  name: 'App',
  data() {
    return {
      // Use public asset path; fallback handled on error
      logoSrc: '/site-icon.png'
    }
  },
  computed: {
    isCountrySelect() {
      const path = this.$route && this.$route.path
      return path === '/' || path === '/login' || path === '/register'
    },
    syncStatus() {
      return userDataSyncState.status || 'idle'
    },
    syncIndicatorClass() {
      return {
        'sync-ok': this.syncStatus === 'ok',
        'sync-syncing': this.syncStatus === 'syncing',
        'sync-error': this.syncStatus === 'error'
      }
    },
    displayUsername() {
      const authUser = getAuthUser && getAuthUser()
      return userDataSyncState.username || (authUser && authUser.username) || '未登录'
    }
  },
  methods: {
    onIconError(e) {
      // Fallback to existing favicon if custom icon missing
      if (e && e.target) e.target.src = '/favicon.svg'
    },
    handleCornerLogoClick() {
      if (this.$route && this.$route.path === '/') return
      // 实际的过渡动画在全局路由守卫中创建 overlay
      this.$router.push('/')
    }
  }
}
</script>

<style>
@import url('https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@300;400;600;700&family=ZCOOL+XiaoWei&display=swap');
/* 全局样式重置 */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html, body {
  height: 100%;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
  background-color: #f5f5f7;
  color: #1d1d1f;
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  overflow-x: hidden;
  overflow-y: auto;
}

#app {
  min-height: 100vh;
}

/* Fixed logo at top-right on non-country pages */
.corner-logo {
  position: fixed;
  top: 12px;
  right: 12px;
  width: 60px;
  height: 60px;
  border-radius: 50%;
  box-shadow: none; /* remove shadow; no extra ring */
  z-index: 1000;
  background: transparent;
  object-fit: cover;
  cursor: pointer;
  pointer-events: auto;
  opacity: 0.5;
  transition: transform 0.3s ease, opacity 0.3s ease;
}

.sync-indicator {
  position: fixed;
  top: 12px;
  left: 12px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.9);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  z-index: 1100;
  backdrop-filter: blur(4px);
}

.sync-icon {
  width: 16px;
  height: 16px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
}

.sync-indicator .sync-spinner {
  width: 14px;
  height: 14px;
  border: 2px solid #cbd5e1;
  border-top-color: #22c55e;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.sync-indicator.sync-ok .sync-icon { color: #16a34a; }
.sync-indicator.sync-error .sync-icon { color: #dc2626; }
.sync-indicator.sync-syncing .sync-icon { color: #0ea5e9; }

.sync-username {
  font-size: 14px;
  color: #0f172a;
  font-weight: 600;
  max-width: 180px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 全局按钮样式 */
button {
  font-family: inherit;
  font-size: 17px;
  font-weight: 400;
  border: none;
  border-radius: 12px;
  padding: 12px 24px;
  cursor: pointer;
  transition: all 0.2s ease;
  background-color: #007aff;
  color: white;
}

button:hover {
  background-color: #0056cc;
  transform: translateY(-1px);
}

button:active {
  transform: translateY(0);
}

button:disabled {
  background-color: #8e8e93;
  cursor: not-allowed;
  transform: none;
}

/* 全局输入框样式 */
input, select {
  font-family: inherit;
  font-size: 17px;
  border: 1px solid #d2d2d7;
  border-radius: 8px;
  padding: 12px 16px;
  background-color: white;
  transition: border-color 0.2s ease;
}

input:focus, select:focus {
  outline: none;
  border-color: #007aff;
}

/* 全局链接样式 */
a {
  color: #007aff;
  text-decoration: none;
  transition: color 0.2s ease;
}

a:hover {
  color: #0056cc;
}

/* 加载动画 */
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.fade-in {
  animation: fadeIn 0.5s ease-out;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #f3f3f3;
  border-top: 3px solid #007aff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 20px auto;
}

/* 卡片样式 */
.card {
  background: white;
  border-radius: 18px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  transition: all 0.3s ease;
}

.card:hover {
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);
  transform: translateY(-2px);
}

/* 页面主标题统一使用装饰性字体 */
.title-hero {
  /* 中文优先使用造字工房创基黑体，英文回退到系统默认字体 */
  font-family:
    'ZaoZiGongFangChuangJiHei',
    -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, "Microsoft YaHei", 'Helvetica Neue', Arial, sans-serif;
  font-weight: 500;
}

/* 响应式设计 */
@media (max-width: 768px) {
  button {
    font-size: 16px;
    padding: 10px 20px;
  }
  
  input, select {
    font-size: 16px;
    padding: 10px 14px;
  }

  .corner-logo {
    top: 12px;
    right: 12px;
    width: 40px;
    height: 40px;
  }
}
</style>
