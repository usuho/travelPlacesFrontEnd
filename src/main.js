import {createApp} from 'vue'
import App from './App.vue'
import {createRouter,createWebHistory} from 'vue-router'
import userLogin from './components/userLogin.vue'
import userRegister from './components/userRegister.vue'
import CountrySelect from './components/CountrySelect.vue'
import AttractionList from './components/AttractionList.vue'
import AttractionDetails from './components/AttractionDetails.vue'
import AttractionMap from './components/AttractionMap.vue'

import flyIn from './directives/flyIn.js';
import fadeIn from './directives/fadeIn.js';
import './assets/styles/global.css';


const routes = [
  { path: '/userlogin', component: userLogin },
  { path: '/userRegister', component: userRegister },
  { path: '/', component: CountrySelect },
  { path: '/attractions/:country', component: AttractionList },
  { path: '/attraction/:country/:id', component: AttractionDetails },
  { path: '/map/:country', component: AttractionMap }
]

const router = createRouter({
    history:createWebHistory(),
    routes
})

// 全局路由守卫：从任意非首页页面返回到国家选择页时，
// 在当前右上角 logo 位置创建一个过渡用 overlay
router.beforeEach((to, from, next) => {
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
app.mount('#app')
