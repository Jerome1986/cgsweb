import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import pinia from '@/stores/index.js'
import 'element-plus/dist/index.css'
import '@/assets/main.scss'
import '@/assets/iconfont/iconfont.css'

const app = createApp(App)
app.use(pinia)
app.use(router)

app.mount('#app')
