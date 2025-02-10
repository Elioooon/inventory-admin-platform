import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useUserStore = defineStore('user', () => {
  // 从 localStorage 初始化用户信息
  const storedUserInfo = localStorage.getItem('userInfo')
  const userInfo = ref(storedUserInfo ? JSON.parse(storedUserInfo) : null)
  
  const setUserInfo = (info) => {
    console.log('Setting user info:', info)  // 调试日志
    userInfo.value = info
    // 将用户信息保存到 localStorage
    localStorage.setItem('userInfo', JSON.stringify(info))
  }
  
  const clearUserInfo = () => {
    userInfo.value = null
    localStorage.removeItem('token')
    localStorage.removeItem('userInfo')
  }
  
  return {
    userInfo,
    setUserInfo,
    clearUserInfo
  }
}) 