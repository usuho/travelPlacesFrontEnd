import {createApp} from 'vue'
import App from './App.vue'
import {createRouter,createWebHistory} from 'vue-router'
import userLogin from './components/userLogin.vue'
import userRegister from './components/userRegister.vue'
import CountrySelect from './components/CountrySelect.vue'
import AttractionList from './components/AttractionList.vue'
import AttractionDetails from './components/AttractionDetails.vue'

import flyIn from './directives/flyIn.js';
import './assets/styles/global.css';


const routes = [
  { path: '/userlogin', component: userLogin },
  { path: '/userRegister', component: userRegister },
  { path: '/', component: CountrySelect },
  { path: '/attractions/:country', component: AttractionList },
  { path: '/attraction/:country/:id', component: AttractionDetails }
]

const router = createRouter({
    history:createWebHistory(),
    routes
})

const app = createApp(App)
app.use(router)
app.directive('fly-in', flyIn);
app.mount('#app')