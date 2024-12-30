<template>
  <div class="app-container">
    <header class="header">
      <h1>库存监控后台</h1>
    </header>

    <div class="container">
      <div v-if="isConnected">
        <el-input
          v-model="searchInput"
          placeholder="输入商品ID搜索"
          class="search-box"
        />

        <div v-if="loading" class="loading">
          <el-loading :fullscreen="false" />
        </div>

        <el-table :data="productData" class="keys-table">
          <el-table-column prop="productId" label="商品ID" />
          <el-table-column prop="bucketCount" label="分桶数量" />
          <el-table-column prop="stockDetails" label="分桶库存详情" />
        </el-table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import axios from 'axios'
import { ElMessage } from 'element-plus'

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

const loading = ref(false)
const isConnected = ref(true)
const searchInput = ref('')
const productData = ref([])
let refreshInterval = null

// 获取分桶值
const fetchBucketValues = async (keys) => {
  const sortedKeys = [...keys].sort((a, b) => {
    const bucketA = parseInt(getBucketNumber(a))
    const bucketB = parseInt(getBucketNumber(b))
    return bucketA - bucketB
  })

  const values = await Promise.all(
    sortedKeys.map(key =>
      axios.get(`${API_BASE_URL}/key/${encodeURIComponent(key)}/value`)
        .then(res => {
          if (res.data.success) {
            return { success: true, data: res.data.data }
          }
          return { success: false, message: res.data.msg }
        })
        .catch(err => ({ success: false, message: err.message }))
    )
  )

  const validValues = values
    .filter(res => res.success)
    .map(res => res.data)

  const totalStock = validValues.reduce((sum, val) => sum + (parseInt(val) || 0), 0)
  
  return {
    totalStock,
    details: sortedKeys.map((key, i) => `${getBucketNumber(key)}号桶=${validValues[i] || 0}`).join(', ')
  }
}

// 获取keys
const fetchKeys = async (prefix = '') => {
  loading.value = true
  try {
    const url = prefix
      ? `${API_BASE_URL}/keys/${prefix}_`
      : `${API_BASE_URL}/keys`

    console.log('Fetching keys from:', url)
    const { data } = await axios.get(url)
    console.log('Response:', data)

    if (data.success) {
      const groups = groupKeysByProduct(data.data)
      const newProductData = []

      for (const [productId, keys] of groups) {
        const { totalStock, details } = await fetchBucketValues(keys)
        newProductData.push({
          productId,
          bucketCount: keys.length,
          stockDetails: `总库存: ${totalStock} | 分桶详情: ${details}`
        })
      }

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
  } finally {
    loading.value = false
  }
}

// 辅助函数
const getProductId = (key) => {
  const parts = key.split('_')
  return parts.slice(0, -1).join('_')
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
  refreshInterval = setInterval(() => {
    fetchKeys(searchInput.value)
  }, 5000)
}

// 监听搜索输入
watch(searchInput, (newValue) => {
  if (!loading.value) {
    fetchKeys(newValue)
  }
})

// 组件挂载时自动连接
onMounted(() => {
  fetchKeys()
  startAutoRefresh()
})
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
}
</style> 