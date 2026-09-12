import { createApp } from 'vue'
import App from './App.vue'
import { createRouter, createWebHistory } from 'vue-router'
import userLogin from './components/userLogin.vue'
import userRegister from './components/userRegister.vue'
import CountrySelect from './components/CountrySelect.vue'
import AttractionList from './components/AttractionList.vue'
import AttractionDetails from './components/AttractionDetails.vue'
import AttractionMap from './components/AttractionMap.vue'
import FavoritesView from './components/FavoritesView.vue'
import { getAuthUser, isAuthenticated, getAuthToken, hasPersistedSessionToken, clearAuthSession } from './stores/auth.js'
import { ensureUserDataHydrated, setSyncUsername } from './stores/userDataSync.js'

import flyIn from './directives/flyIn.js'
import fadeIn from './directives/fadeIn.js'
import './assets/styles/global.css'

const routes = [
  { path: '/login', component: userLogin, meta: { public: true } },
  { path: '/register', component: userRegister, meta: { public: true } },
  { path: '/userlogin', redirect: '/login' },
  { path: '/userRegister', redirect: '/register' },
  { path: '/', component: CountrySelect, meta: { requiresAuth: true } },
  { path: '/favorites', component: FavoritesView, meta: { requiresAuth: true } },
  { path: '/attractions/:country', component: AttractionList, meta: { requiresAuth: true } },
  { path: '/attraction/:country/:id', component: AttractionDetails, meta: { requiresAuth: true } },
  { path: '/map/:country', component: AttractionMap, meta: { requiresAuth: true } }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// 全局路由守卫：拦截未登录用户并负责首页返回动画 overlay
router.beforeEach((to, from, next) => {
  const isPublic = !!(to.meta && to.meta.public)
  const authed = isAuthenticated()

  if (!authed && !isPublic) {
    next({ path: '/login', query: { redirect: to.fullPath } })
    return
  }

  if (authed && isPublic && (to.path === '/login' || to.path === '/register')) {
    const target = to.query && to.query.redirect ? to.query.redirect : (from && from.fullPath ? from.fullPath : '/')
    next(target === to.fullPath ? '/' : target)
    return
  }

  try {
    // 仅在移动端从非首页返回首页时创建 overlay
    const isMobile = window.innerWidth <= 768
    if (isMobile && to.path === '/' && from.path !== '/') {
      const cornerLogo = document.querySelector('.corner-logo')
      if (cornerLogo) {
        const rect = cornerLogo.getBoundingClientRect()
        const overlay = cornerLogo.cloneNode(true)
        overlay.id = 'logo-transition-overlay'
        Object.assign(overlay.style, {
          position: 'fixed',
          top: `${rect.top}px`,
          left: `${rect.left}px`,
          width: `${rect.width}px`,
          height: `${rect.height}px`,
          margin: '0',
          pointerEvents: 'none',
          zIndex: 2000,
          opacity: '0.5',
          transform: 'translate(0, 0) scale(1)',
          transformOrigin: 'center center',
          transition: 'transform 0.5s ease, opacity 0.5s ease'
        })
        document.body.appendChild(overlay)
      }
    }
  } catch (e) {}
  next()
})

const app = createApp(App)
app.use(router)
app.directive('fly-in', flyIn)
app.directive('fade-in', fadeIn)
setSyncUsername((getAuthUser() && getAuthUser().username) || '')
try { ensureUserDataHydrated() } catch (e) {}
app.mount('#app')

// 若浏览器缓存/LocalStorage 被清空且内存中仍有 token，则立即登出避免同步空数据
setInterval(() => {
  try {
    if (getAuthToken() && !hasPersistedSessionToken()) {
      clearAuthSession();
      router.replace('/login').catch(() => {});
    }
  } catch (e) {}
}, 2000);
