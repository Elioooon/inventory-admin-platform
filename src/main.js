import { createApp } from 'vue'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import { createPinia } from 'pinia'
import router from './router'
import App from './App.vue'
import axios from 'axios'
import { ElMessage } from 'element-plus'
import { useUserStore } from './stores/user'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)

// 添加请求拦截器
axios.interceptors.request.use(
  config => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  error => {
    return Promise.reject(error)
  }
)

// 添加响应拦截器
axios.interceptors.response.use(
  response => {
    console.log('Response success:', response.config.url, response.data);
    return response;
  },
  error => {
    if (error.response?.status === 401) {
      // token失效，清除用户信息并跳转到登录页
      const store = useUserStore()
      store.clearUserInfo()
      router.push('/login')
      ElMessage.error('登录已过期，请重新登录')
    }
    return Promise.reject(error)
  }
)

app.use(ElementPlus)
app.use(router)
app.mount('#app') 