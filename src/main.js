import { createApp } from 'vue'
import App from './App.vue'
import { createRouter, createWebHashHistory } from 'vue-router'
import { App as CapacitorApp } from '@capacitor/app'
import { installFetchCache } from './utils/fetchCache.js'
import userLogin from './components/userLogin.vue'
import userRegister from './components/userRegister.vue'
import CountrySelect from './components/CountrySelect.vue'
import AttractionList from './components/AttractionList.vue'
import AttractionDetails from './components/AttractionDetails.vue'
import AttractionMap from './components/AttractionMap.vue'
import { getAuthUser, isAuthenticated, getAuthToken, hasPersistedSessionToken, clearAuthSession } from './stores/auth.js'
import { ensureUserDataHydrated, setSyncUsername } from './stores/userDataSync.js'

import flyIn from './directives/flyIn.js';
import fadeIn from './directives/fadeIn.js';
import './assets/styles/global.css';

installFetchCache();


const routes = [
  { path: '/login', component: userLogin, meta: { public: true } },
  { path: '/register', component: userRegister, meta: { public: true } },
  { path: '/userlogin', redirect: '/login' },
  { path: '/userRegister', redirect: '/register' },
  { path: '/', component: CountrySelect, meta: { requiresAuth: true } },
  { path: '/attractions/:country', component: AttractionList, meta: { requiresAuth: true } },
  { path: '/attraction/:country/:id', component: AttractionDetails, meta: { requiresAuth: true } },
  { path: '/map/:country', component: AttractionMap, meta: { requiresAuth: true } }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

// 向当前页面派发一个可取消的自定义事件，让各个页面自行决定如何处理实体返回键
function dispatchHardwareBackToPage() {
  try {
    if (typeof window === 'undefined' || typeof window.dispatchEvent !== 'function') return false;
    const evt = new CustomEvent('hardware-back', { cancelable: true });
    const keepDefault = window.dispatchEvent(evt);
    return evt.defaultPrevented || keepDefault === false;
  } catch (e) {
    return false;
  }
}

// Android 实体返回键：和浏览器返回行为一致
try {
  CapacitorApp.addListener('backButton', ({ canGoBack }) => {
    try {
      // 优先让当前页面的“返回”按钮逻辑处理（会调用 goBack/handleBack）
      const handled = dispatchHardwareBackToPage();
      if (!handled) {
        const currentPath = router.currentRoute.value && router.currentRoute.value.path;
        // 非首页：走浏览器 history.back()，触发各页面自己的 popstate/back 逻辑
        if (currentPath && currentPath !== '/') {
          window.history.back();
          return;
        }
        // 在首页：退出应用，行为接近浏览器退回/关闭
        CapacitorApp.exitApp();
      }
    } catch (e) {}
  });
} catch (e) {}

// 全局路由守卫：从任意非首页页面返回到国家选择页时，
// 在当前右上角 logo 位置创建一个过渡用 overlay
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
    const isMobile = window.innerWidth <= 768;
    if (isMobile && to.path === '/' && from.path !== '/') {
      const cornerLogo = document.querySelector('.corner-logo');
      if (cornerLogo) {
        const rect = cornerLogo.getBoundingClientRect();
        const overlay = cornerLogo.cloneNode(true);
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
          opacity: '0.5',
          transform: 'translate(0, 0) scale(1)',
          transformOrigin: 'center center',
          transition: 'transform 0.5s ease, opacity 0.5s ease'
        });
        document.body.appendChild(overlay);
      }
    }
  } catch (e) {}
  next();
});

const app = createApp(App)
app.use(router)
app.directive('fly-in', flyIn);
app.directive('fade-in', fadeIn);
setSyncUsername((getAuthUser() && getAuthUser().username) || '')
try { ensureUserDataHydrated() } catch (e) {}
app.mount('#app')

setInterval(() => {
  try {
    if (getAuthToken() && !hasPersistedSessionToken()) {
      clearAuthSession();
      router.replace('/login').catch(() => {});
    }
  } catch (e) {}
}, 2000);
