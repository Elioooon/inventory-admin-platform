<template>
  <div class="app-container">
    <header class="header">
      <div class="header-content">
        <h1>库存管理平台</h1>
        <div class="user-info">
          <span>{{ userStore.userInfo?.username }}</span>
          <el-button type="text" @click="handleLogout">退出登录</el-button>
        </div>
      </div>
    </header>

    <router-view></router-view>
  </div>
</template>

<script setup>
import { useUserStore } from '../stores/user'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'

const userStore = useUserStore()
const router = useRouter()

const handleLogout = () => {
  userStore.clearUserInfo()
  router.push('/login')
  ElMessage.success('已退出登录')
}
</script>

<style scoped>
.app-container {
  min-height: 100vh;
}

.header {
  background: #001529;
  color: white;
  padding: 1rem;
  margin-bottom: 2rem;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 1rem;
  color: white;
}

.user-info .el-button {
  color: white;
}
</style> 