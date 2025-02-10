<template>
  <div class="container">
    <div class="operation-buttons">
      <el-button type="primary" @click="showInitDialog">初始化库存</el-button>
    </div>

    <div v-if="isConnected">
      <el-input
        v-model="searchInput"
        placeholder="输入商品ID搜索"
        class="search-box"
      />

      <el-table 
        v-loading="loading"
        :data="productData" 
        class="keys-table"
        :height="400"
        element-loading-background="rgba(255, 255, 255, 0.5)"
      >
        <el-table-column prop="productId" label="商品ID" />
        <el-table-column prop="bucketCount" label="分桶数量" />
        <el-table-column prop="stockDetails" label="分桶库存详情" />
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button 
              type="success" 
              size="small" 
              @click="showIncreaseDialog(row.productId)"
            >
              增加
            </el-button>
            <el-button 
              type="warning" 
              size="small" 
              @click="showDecreaseDialog(row.productId)"
            >
              减少
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- 初始化库存对话框 -->
    <el-dialog v-model="initDialogVisible" title="初始化库存" width="500px">
      <el-form :model="initForm" label-width="120px">
        <el-form-item label="商品ID">
          <el-input v-model="initForm.goods_id" />
        </el-form-item>
        <el-form-item label="初始库存">
          <el-input-number v-model="initForm.cur_stock" :min="0" />
        </el-form-item>
        <el-form-item label="分桶数量">
          <el-input-number 
            v-model="initForm.bucket_config.bucket_count" 
            :min="1" 
            :max="10"
          />
        </el-form-item>
        <el-form-item label="非中心桶比例">
          <el-input-number 
            v-model="initForm.bucket_config.noncentral_ratio" 
            :min="0" 
            :max="100"
          />
          <div class="form-tip">0-100之间的整数，表示非中心桶占总库存的百分比</div>
        </el-form-item>
        <el-form-item label="中心桶最小比例">
          <el-input-number 
            v-model="initForm.bucket_config.after_transfer_min_ratio" 
            :min="0" 
            :max="100"
          />
          <div class="form-tip">0-100之间的整数，表示调拨后中心桶数量占初始数量的最小百分比</div>
        </el-form-item>
        <el-form-item label="回收阈值">
          <el-input-number 
            v-model="initForm.bucket_config.recovery_count" 
            :min="0"
          />
          <div class="form-tip">非中心桶库存低于此值时触发回收</div>
        </el-form-item>
        <el-form-item label="开始时间">
          <el-date-picker
            v-model="initForm.start_time"
            type="datetime"
            format="YYYY-MM-DD HH:mm:ss"
          />
        </el-form-item>
        <el-form-item label="结束时间">
          <el-date-picker
            v-model="initForm.end_time"
            type="datetime"
            format="YYYY-MM-DD HH:mm:ss"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="initDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleInit" :loading="loading">确定</el-button>
      </template>
    </el-dialog>

    <!-- 增加库存对话框 -->
    <el-dialog v-model="increaseDialogVisible" title="增加库存" width="400px">
      <el-form :model="increaseForm" label-width="120px">
        <el-form-item label="商品ID">
          <el-input v-model="increaseForm.goods_id" />
        </el-form-item>
        <el-form-item label="增加数量">
          <el-input-number v-model="increaseForm.increase_amount" :min="1" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="increaseDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleIncrease" :loading="loading">确定</el-button>
      </template>
    </el-dialog>

    <!-- 减少库存对话框 -->
    <el-dialog v-model="decreaseDialogVisible" title="减少库存" width="400px">
      <el-form :model="decreaseForm" label-width="120px">
        <el-form-item label="商品ID">
          <el-input v-model="decreaseForm.goods_id" />
        </el-form-item>
        <el-form-item label="减少数量">
          <el-input-number v-model="decreaseForm.decrease_amount" :min="1" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="decreaseDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleDecrease" :loading="loading">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import axios from 'axios'
import { ElMessage } from 'element-plus'
import { useUserStore } from '../stores/user'
import { useRouter } from 'vue-router'

// 配置 axios 默认值
axios.defaults.timeout = 10000

// 添加响应拦截器用于调试
axios.interceptors.response.use(
  response => {
    console.log('Response success:', response.config.url, response.data);
    return response;
  },
  error => {
    console.error('Request failed:', {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      data: error.response?.data,
      error: error.message
    });
    return Promise.reject(error)
  }
)

const API_BASE_URL = '/admin'
const userStore = useUserStore()
const router = useRouter()

const loading = ref(false)
const isConnected = ref(true)
const searchInput = ref('')
const productData = ref([])
let refreshInterval = null

// 对话框显示状态
const initDialogVisible = ref(false)
const increaseDialogVisible = ref(false)
const decreaseDialogVisible = ref(false)

// 表单数据
const initForm = ref({
  goods_id: '',
  cur_stock: 0,
  user_id: String(userStore.userInfo?.id || ''),
  start_time: '',
  end_time: '',
  bucket_config: {
    bucket_count: 3,     // 默认3个桶
    noncentral_ratio: 30, // 默认非中心桶占30%
    after_transfer_min_ratio: 70, // 默认调拨后中心桶数量占初始数量最小比例70%
    recovery_count: 100   // 默认非中心桶回收阈值100
  }
})

const increaseForm = ref({
  goods_id: '',
  increase_amount: 1,
  user_id: String(userStore.userInfo?.id || '')
})

const decreaseForm = ref({
  goods_id: '',
  decrease_amount: 1,
  user_id: String(userStore.userInfo?.id || '')
})

// 获取分桶值
const fetchBucketValues = async (keys) => {
  const sortedKeys = [...keys].sort((a, b) => {
    const bucketA = parseInt(getBucketNumber(a))
    const bucketB = parseInt(getBucketNumber(b))
    return bucketA - bucketB
  })

  try {
    const { data } = await axios.post(`${API_BASE_URL}/keys/values`, {
      keys: sortedKeys
    })

    if (!data.success || !data.data) {
      return null
    }

    const validValues = data.data.values.filter(Boolean)

    // 如果没有有效的值，返回 null
    if (validValues.length === 0) {
      return null
    }

    const totalStock = validValues.reduce((sum, val) => sum + (parseInt(val) || 0), 0)
    
    return {
      totalStock,
      details: sortedKeys.map((key, i) => `${getBucketNumber(key)}号桶=${validValues[i] || 0}`).join(', ')
    }
  } catch (error) {
    console.error('Failed to fetch bucket values:', error)
    return null
  }
}

// 获取keys
const fetchKeys = async (prefix = '') => {
  try {
    const url = prefix
      ? `${API_BASE_URL}/keys/${prefix}_`
      : `${API_BASE_URL}/keys`

    console.log('Fetching keys from:', url)
    const { data } = await axios.get(url)
    console.log('Response:', data)

    if (data.success) {
      // 如果返回的数据是 null，设置为空数组
      const keys = data.data || []
      if (keys.length === 0) {
        productData.value = []
        return
      }

      const groups = groupKeysByProduct(keys)
      const newProductData = []

      for (const [productId, keys] of groups) {
        const result = await fetchBucketValues(keys)
        if (result) {
          newProductData.push({
            productId: productId.replace('stock:', ''),
            bucketCount: keys.length,
            stockDetails: `总库存: ${result.totalStock} | 分桶详情: ${result.details}`
          })
        }
      }

      await nextTick()
      productData.value = newProductData
    } else {
      ElMessage.error(data.msg || '获取数据失败')
    }
  } catch (error) {
    console.error('Error details:', error)
    const errorMsg = error.response?.data?.msg 
      || error.message 
      || '获取数据失败';
    ElMessage.error(errorMsg)
    // 发生错误时清空数据
    productData.value = []
  }
}

// 辅助函数
const getProductId = (key) => {
  const parts = key.split('_')
  const fullId = parts.slice(0, -1).join('_')
  return fullId.replace('stock:', '')
}

const getBucketNumber = (key) => {
  return key.split('_').pop()
}

const groupKeysByProduct = (keys) => {
  const groups = new Map()
  keys.forEach(key => {
    const productId = getProductId(key)
    if (!groups.has(productId)) {
      groups.set(productId, [])
    }
    groups.get(productId).push(key)
  })
  return groups
}

// 自动刷新
const startAutoRefresh = () => {
  if (refreshInterval) {
    clearInterval(refreshInterval)
  }
  refreshInterval = setInterval(async () => {
    loading.value = true
    await fetchKeys(searchInput.value)
    loading.value = false
  }, 5000)
}

// 停止自动刷新
const stopAutoRefresh = () => {
  if (refreshInterval) {
    clearInterval(refreshInterval)
    refreshInterval = null
  }
}

// 监听搜索输入
watch(searchInput, (newValue) => {
  if (!loading.value) {
    fetchKeys(newValue)
  }
})

// 组件挂载时自动连接
onMounted(() => {
  console.log('Current user info:', userStore.userInfo)  // 调试日志
  fetchKeys()
  startAutoRefresh()
})

// 组件卸载时清理定时器
onUnmounted(() => {
  stopAutoRefresh()
})

// 显示对话框的方法
const showInitDialog = () => {
  initDialogVisible.value = true
}

const showIncreaseDialog = (goodsId = '') => {
  increaseForm.value = {
    goods_id: goodsId,
    increase_amount: 1,
    user_id: String(userStore.userInfo?.id || '')
  }
  increaseDialogVisible.value = true
}

const showDecreaseDialog = (goodsId = '') => {
  decreaseForm.value = {
    goods_id: goodsId,
    decrease_amount: 1,
    user_id: String(userStore.userInfo?.id || '')
  }
  decreaseDialogVisible.value = true
}

// 处理库存操作
const handleInit = async () => {
  try {
    loading.value = true
    const userId = String(userStore.userInfo?.id || '')
    if (!userId) {
      userStore.clearUserInfo()  // 清除用户信息，触发路由守卫
      return
    }
    const requestData = {
      ...initForm.value,
      user_id: userId,
      start_time: formatDateTime(initForm.value.start_time),
      end_time: formatDateTime(initForm.value.end_time)
    }
    console.log('Init request:', requestData)
    const { data } = await axios.post('/admin/init', requestData)
    if (data.success) {
      ElMessage.success('初始化成功')
      initDialogVisible.value = false
      fetchKeys()
    } else {
      ElMessage.error(data.msg || '初始化失败')
    }
  } catch (error) {
    console.error('Init error:', error.response?.data)
    ElMessage.error(error.response?.data?.msg || '操作失败')
  } finally {
    loading.value = false
  }
}

const handleIncrease = async () => {
  try {
    loading.value = true
    const userId = String(userStore.userInfo?.id || '')
    if (!userId) {
      userStore.clearUserInfo()  // 清除用户信息，触发路由守卫
      return
    }
    const requestData = {
      goods_id: increaseForm.value.goods_id,
      increase_amount: increaseForm.value.increase_amount,
      user_id: userId
    }
    console.log('Increase request:', requestData)
    const { data } = await axios.post('/admin/increase', requestData)
    if (data.success) {
      ElMessage.success('增加库存成功')
      increaseDialogVisible.value = false
      fetchKeys()
    } else {
      ElMessage.error(data.msg || '增加库存失败')
    }
  } catch (error) {
    console.error('Increase error:', error.response?.data)
    ElMessage.error(error.response?.data?.msg || '操作失败')
  } finally {
    loading.value = false
  }
}

const handleDecrease = async () => {
  try {
    loading.value = true
    const userId = String(userStore.userInfo?.id || '')
    if (!userId) {
      userStore.clearUserInfo()  // 清除用户信息，触发路由守卫
      return
    }
    const requestData = {
      goods_id: decreaseForm.value.goods_id,
      decrease_amount: decreaseForm.value.decrease_amount,
      user_id: userId
    }
    console.log('Decrease request:', requestData)
    const { data } = await axios.post('/admin/decrease', requestData)
    if (data.success) {
      ElMessage.success('减少库存成功')
      decreaseDialogVisible.value = false
      fetchKeys()
    } else {
      ElMessage.error(data.msg || '减少库存失败')
    }
  } catch (error) {
    console.error('Decrease error:', error.response?.data)
    ElMessage.error(error.response?.data?.msg || '操作失败')
  } finally {
    loading.value = false
  }
}

// 格式化日期时间
const formatDateTime = (date) => {
  if (!date) return ''
  const d = new Date(date)
  return d.toISOString().slice(0, 19).replace('T', ' ')
}

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

.container {
  max-width: 1200px;
  margin: 20px auto;
  padding: 0 20px;
}

.search-box {
  margin-bottom: 1rem;
}

.loading {
  display: flex;
  justify-content: center;
  margin: 1rem 0;
}

.keys-table {
  width: 100%;
  /* 添加过渡效果 */
  transition: all 0.3s ease;
}

.operation-buttons {
  margin-bottom: 20px;
  display: flex;
  gap: 10px;
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

.form-tip {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
  line-height: 1.2;
}
</style> 