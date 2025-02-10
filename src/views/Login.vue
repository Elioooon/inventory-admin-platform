<template>
  <div class="login-container">
    <el-card class="login-card">
      <template #header>
        <div class="header-content">
          <h2>库存管理平台</h2>
          <el-radio-group v-model="activeForm" size="small">
            <el-radio-button label="login">登录</el-radio-button>
            <el-radio-button label="register">注册</el-radio-button>
          </el-radio-group>
        </div>
      </template>
      
      <el-form v-if="activeForm === 'login'" :model="loginForm" label-width="80px">
        <el-form-item label="用户名">
          <el-input v-model="loginForm.username" placeholder="请输入用户名" />
        </el-form-item>
        <el-form-item label="密码">
          <el-input 
            v-model="loginForm.password" 
            type="password" 
            placeholder="请输入密码"
            @keyup.enter="handleLogin"
          />
        </el-form-item>
        <el-form-item>
          <el-button 
            type="primary" 
            :loading="loading" 
            @click="handleLogin"
          >
            登录
          </el-button>
        </el-form-item>
      </el-form>

      <el-form v-else :model="registerForm" label-width="80px">
        <el-form-item 
          label="用户名"
          :rules="[
            { required: true, message: '请输入用户名' },
            { min: 3, max: 20, message: '长度在 3 到 20 个字符' }
          ]"
        >
          <el-input v-model="registerForm.username" placeholder="请输入用户名" />
        </el-form-item>
        <el-form-item 
          label="密码"
          :rules="[
            { required: true, message: '请输入密码' },
            { min: 6, max: 20, message: '长度在 6 到 20 个字符' }
          ]"
        >
          <el-input 
            v-model="registerForm.password" 
            type="password" 
            placeholder="请输入密码"
          />
        </el-form-item>
        <el-form-item 
          label="确认密码"
          :rules="[
            { required: true, message: '请确认密码' },
            { validator: validateConfirmPassword }
          ]"
        >
          <el-input 
            v-model="registerForm.confirmPassword" 
            type="password" 
            placeholder="请确认密码"
          />
        </el-form-item>
        <el-form-item>
          <el-button 
            type="primary" 
            :loading="loading" 
            @click="handleRegister"
          >
            注册
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import axios from 'axios'
import { useUserStore } from '../stores/user'

const router = useRouter()
const userStore = useUserStore()
const loading = ref(false)
const activeForm = ref('login')

const loginForm = ref({
  username: '',
  password: ''
})

const registerForm = ref({
  username: '',
  password: '',
  confirmPassword: ''
})

const validateConfirmPassword = (rule, value, callback) => {
  if (value !== registerForm.value.password) {
    callback(new Error('两次输入的密码不一致'))
  } else {
    callback()
  }
}

const handleLogin = async () => {
  if (!loginForm.value.username || !loginForm.value.password) {
    ElMessage.warning('请输入用户名和密码')
    return
  }

  try {
    loading.value = true
    const { data } = await axios.post('/user/login', loginForm.value)
    if (data.success) {
      const userInfo = {
        id: data.data.id,
        username: data.data.username,
        token: data.data.token
      }
      userStore.setUserInfo(userInfo)
      localStorage.setItem('token', data.data.token)
      console.log('Stored user info:', userInfo)
      ElMessage.success('登录成功')
      router.push('/')
    } else {
      ElMessage.error(data.msg || '登录失败')
    }
  } catch (error) {
    ElMessage.error(error.response?.data?.msg || '登录失败')
  } finally {
    loading.value = false
  }
}

const handleRegister = async () => {
  if (!registerForm.value.username || !registerForm.value.password || !registerForm.value.confirmPassword) {
    ElMessage.warning('请填写完整注册信息')
    return
  }

  if (registerForm.value.password !== registerForm.value.confirmPassword) {
    ElMessage.warning('两次输入的密码不一致')
    return
  }

  try {
    loading.value = true
    const { data } = await axios.post('/user/register', {
      username: registerForm.value.username,
      password: registerForm.value.password
    })
    
    if (data.success) {
      ElMessage.success('注册成功，请登录')
      activeForm.value = 'login'
      loginForm.value.username = registerForm.value.username
      loginForm.value.password = ''
      registerForm.value = {
        username: '',
        password: '',
        confirmPassword: ''
      }
    } else {
      ElMessage.error(data.msg || '注册失败')
    }
  } catch (error) {
    ElMessage.error(error.response?.data?.msg || '注册失败')
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-container {
  height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: #f0f2f5;
}

.login-card {
  width: 400px;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-content h2 {
  margin: 0;
}

.el-form-item:last-child {
  margin-bottom: 0;
  text-align: center;
}
</style> 