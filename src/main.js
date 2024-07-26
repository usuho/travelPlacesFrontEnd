import {createApp} from 'vue'
import App from './App.vue'
import {createRouter,createWebHistory} from 'vue-router'
import userLogin from './components/userLogin.vue'
import userRegister from './components/userRegister.vue'
import CountrySelect from './components/CountrySelect.vue'
import AttractionList from './components/AttractionList.vue'
import AttractionDetails from './components/AttractionDetails.vue'





const routes = [
  { path: '/', component: userLogin },
  { path: '/userRegister', component: userRegister },
  { path: '/countries', component: CountrySelect },
  { path: '/attractions/:country', component: AttractionList },
  { path: '/attraction/:country/:id', component: AttractionDetails }
]

const router = createRouter({
    history:createWebHistory(),
    routes
})

const app = createApp(App)
app.use(router)
app.mount('#app')