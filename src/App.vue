<template>
  <div id="app">
    <div
      v-if="showSyncIndicator"
      class="sync-indicator"
      :class="[syncIndicatorClass, { 'sync-active': indicatorActive }]"
      @click="onIndicatorClick"
      @mousedown="startIndicatorLongPress"
      @mouseup="cancelIndicatorLongPress"
      @mouseleave="cancelIndicatorLongPress"
      @touchstart="startIndicatorLongPress"
      @touchend="cancelIndicatorLongPress"
      @touchcancel="cancelIndicatorLongPress"
      @contextmenu.prevent
    >
      <span class="sync-icon">
        <span v-if="syncStatus === 'syncing'" class="sync-spinner"></span>
        <span v-else-if="syncStatus === 'ok'">✔</span>
        <span v-else>✖</span>
      </span>
      <span class="sync-username">{{ displayUsername }}</span>
      <transition name="sync-tooltip-fade">
        <div v-if="showLogoutTooltip" class="sync-tooltip">长按登出</div>
      </transition>
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
import { userDataSyncState, resetUserDataSync } from './stores/userDataSync.js'
import { getAuthUser, clearAuthSession } from './stores/auth.js'

const LONG_PRESS_MS = 800;

export default {
  name: 'App',
  data() {
    return {
      // Use public asset path; fallback handled on error
      logoSrc: '/site-icon.png',
      showLogoutTooltip: false,
      tooltipTimer: null,
      indicatorLongPressTimer: null,
      indicatorLongPressHandled: false,
      logoutInProgress: false,
      indicatorActive: false,
      indicatorFadeTimer: null
    }
  },
  computed: {
    isCountrySelect() {
      const path = this.$route && this.$route.path
      return path === '/' || path === '/login' || path === '/register'
    },
    showSyncIndicator() {
      const path = (this.$route && this.$route.path) || ''
      const isMap = path.startsWith('/map')
      const isDetail = path.startsWith('/attraction/')
      return path !== '/' && path !== '/login' && path !== '/register' && !isMap && !isDetail
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
  beforeUnmount() {
    this.clearIndicatorTimers()
  },
  methods: {
    clearIndicatorTimers(hideTooltip = true) {
      if (this.indicatorLongPressTimer) {
        clearTimeout(this.indicatorLongPressTimer)
        this.indicatorLongPressTimer = null
      }
      if (this.tooltipTimer) {
        clearTimeout(this.tooltipTimer)
        this.tooltipTimer = null
      }
      if (hideTooltip) this.showLogoutTooltip = false
      if (this.indicatorFadeTimer) {
        clearTimeout(this.indicatorFadeTimer)
        this.indicatorFadeTimer = null
      }
    },
    setIndicatorActive(active, delay = 0) {
      if (active) {
        this.indicatorActive = true
        if (this.indicatorFadeTimer) {
          clearTimeout(this.indicatorFadeTimer)
          this.indicatorFadeTimer = null
        }
      } else {
        if (this.indicatorFadeTimer) {
          clearTimeout(this.indicatorFadeTimer)
          this.indicatorFadeTimer = null
        }
        this.indicatorFadeTimer = setTimeout(() => {
          this.indicatorActive = false
          this.indicatorFadeTimer = null
        }, delay)
      }
    },
    onIndicatorClick() {
      if (this.logoutInProgress || this.indicatorLongPressHandled) {
        this.indicatorLongPressHandled = false
        return
      }
      this.setIndicatorActive(true)
      this.clearIndicatorTimers(false)
      this.showLogoutTooltip = true
      this.tooltipTimer = setTimeout(() => {
        this.showLogoutTooltip = false
        this.tooltipTimer = null
      }, 1200)
      this.setIndicatorActive(false, 1000)
    },
    startIndicatorLongPress() {
      if (this.logoutInProgress) return
      this.indicatorLongPressHandled = false
      this.setIndicatorActive(true)
      if (this.indicatorLongPressTimer) {
        clearTimeout(this.indicatorLongPressTimer)
      }
      this.indicatorLongPressTimer = setTimeout(() => {
        this.indicatorLongPressHandled = true
        this.triggerLogout()
      }, LONG_PRESS_MS)
    },
    cancelIndicatorLongPress() {
      if (this.indicatorLongPressHandled || this.logoutInProgress) return
      if (this.indicatorLongPressTimer) {
        clearTimeout(this.indicatorLongPressTimer)
        this.indicatorLongPressTimer = null
      }
      this.setIndicatorActive(false, 1000)
    },
    async triggerLogout() {
      if (this.logoutInProgress) return
      this.logoutInProgress = true
      this.clearIndicatorTimers()
      this.performClientCleanup()
      try {
        await this.$router.replace('/login')
      } catch (e) {
        try { this.$router.push('/login') } catch (_) {}
      }
      this.logoutInProgress = false
      this.indicatorLongPressHandled = false
    },
    performClientCleanup() {
      try { resetUserDataSync() } catch (e) {}
      try { clearAuthSession() } catch (e) {}
      try { localStorage.clear() } catch (e) {}
      try { sessionStorage.clear() } catch (e) {}
      try {
        if (typeof caches !== 'undefined' && caches.keys) {
          caches.keys().then(keys => keys.forEach(k => caches.delete(k)))
        }
      } catch (e) {}
    },
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
  cursor: pointer;
  user-select: none;
  touch-action: manipulation;
  opacity: 0.3;
  transition: opacity 0.4s ease;
}

.sync-indicator.sync-active {
  opacity: 0.9;
}

.sync-icon {
  width: 16px;
  height: 16px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
}

@media (max-width: 768px) {
  .sync-indicator {
    transform: scale(0.7);
    transform-origin: top left;
  }
  .sync-tooltip {
    font-size: 9px;
    padding: 3px 6px;
    top: calc(100% + 4px);
    transform-origin: top left;
  }
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

.sync-tooltip {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  padding: 4px 8px;
  border-radius: 10px;
  background: rgba(0, 0, 0, 0.75);
  color: #fff;
  font-size: 11px;
  white-space: nowrap;
  box-shadow: 0 6px 12px rgba(0, 0, 0, 0.18);
  opacity: 0.5;
  transform: scale(1.5);
  transform-origin: top left;
}

.sync-tooltip-fade-enter-active,
.sync-tooltip-fade-leave-active {
  transition: opacity 0.2s ease;
}
.sync-tooltip-fade-enter-from,
.sync-tooltip-fade-leave-to {
  opacity: 0;
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
