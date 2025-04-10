<script setup>
import VipHead from '@/views/vip/components/vipHead.vue'
import { ref, onMounted, onUnmounted } from 'vue'
import { productsGetApi } from '@/api/products'
import { payOrderApi, userUpdateCoins } from '@/api/order'
import { useOrderStore, useUserStore } from '@/stores'
import { ElMessage } from 'element-plus'

// 用户信息全局管理
const userStore = useUserStore()

// 构建数据
/**
 * 产品信息
 * @type {import('vue').Ref<productModel[]>}
 */
const coinProducts = ref([]) //金币产品

/**
 * 产品信息
 * @type {import('vue').Ref<productModel[]>}
 */
const memberProducts = ref([]) //高级会员

// 获取产品
const productsDataGet = async () => {
  const res = await productsGetApi()
  console.log(res.data)
  coinProducts.value = res.data.filter(
    (item) => item.productType === '金币充值'
  )
  memberProducts.value = res.data.filter(
    (item) => item.productType === '购买会员'
  )
}

const ordersStore = useOrderStore()
// 购买金币
const handleBuyCoins = async (product) => {
  try {
    console.log('购买金币', product)
    const res = await payOrderApi(userStore.userInfo._id, product._id)
    console.log('创建订单', res)
    if (res.data.order_id) {
      // 打开支付窗口
      await window.electronAPI.openPaymentWindow({
        url: res.data.pay_url,
        order_id: res.data.order_id
      })
      // 此处要记录order_id，用于成功后查询订单，更新用户的状态
      ordersStore.setCurrentCoinsOrder({
        pay_order_type: product.productType,
        pay_order_amount: product.goldCoinsAmount
      })
    } else {
      return ElMessage.error('订单创建失败')
    }
  } catch (error) {
    console.log(error)
    alert('支付过程中出错: ' + error.message)
  }
}

// 购买会员
const handleBuyMember = async (product) => {
  console.log('购买会员', product)
}

// 创建一个处理函数的引用，这样可以在清理时使用相同的引用
const handlePaymentResult = async (status) => {
  console.log('订单状态', status)
  if (status === 1) {
    ElMessage.success('支付成功！')
    // 金币充值
    if (ordersStore.currentCoinsOrder.pay_order_type === '金币充值') {
      // 充值成功更新用户的金币余额
      const res = await userUpdateCoins(
        userStore.userInfo._id,
        ordersStore.currentCoinsOrder.pay_order_type,
        ordersStore.currentCoinsOrder.pay_order_amount
      )
      console.log('更新后', res)
      userStore.setUserInfo({ coins: res.coins })
    }
    // 购买会员
  } else {
    ElMessage.warning('支付未完成')
  }
}

const isPaySuccess = () => {
  if (!window.electronAPI) return
  window.electronAPI.onPaymentResult(handlePaymentResult)
}

// 页面挂载完毕
onMounted(() => {
  productsDataGet()
  isPaySuccess()
})

// 组件卸载时清理事件监听器
onUnmounted(() => {
  if (window.electronAPI?.removePaymentResult) {
    window.electronAPI.removePaymentResult(handlePaymentResult)
  }
})
</script>

<template>
  <div class="vip-page">
    <vipHead></vipHead>
    <!-- 头部导航 -->
    <div class="vip-container">
      <!-- 金币充值区域 -->
      <div class="coin-section">
        <div class="section-title">金币充值</div>
        <div class="coin-cards">
          <!-- 金币产品卡片 -->
          <div
            v-for="product in coinProducts"
            :key="product._id"
            :class="[
              'coin-card',
              { featured: product.productType === '金币充值' }
            ]"
          >
            <div class="card-content">
              <!-- 超值标签 - 根据产品是否激活显示 -->
              <div v-if="product.isActive" class="featured-tag">超值</div>
              <!-- 卡片标题区域 -->
              <div class="card-header">
                <i class="iconfont icon-jinbi"></i>
                <text class="card-title">{{ product.productName }}</text>
              </div>
              <!-- 价格展示区域 -->
              <div class="card-price">
                <text class="price">¥{{ product.price }}</text>
              </div>
              <!-- 产品特性区域 -->
              <div class="card-features">
                <div class="feature-item">
                  <span class="highlight">获得金币：</span
                  >{{ product.goldCoinsAmount }}枚
                </div>
                <div class="feature-item">
                  <span class="highlight">使用说明：</span
                  >{{ product.description }}
                </div>
              </div>
            </div>
            <!-- 购买按钮区域 -->
            <div class="btn-wrapper">
              <el-button
                type="primary"
                class="buy-btn"
                @click="handleBuyCoins(product)"
              >
                立即充值
              </el-button>
            </div>
          </div>
        </div>
      </div>

      <!-- 会员等级区域 -->
      <div class="vip-section">
        <div class="section-title">会员等级</div>
        <div class="vip-cards">
          <!-- 会员产品卡片 -->
          <div
            v-for="product in memberProducts"
            :key="product._id"
            :class="[
              'vip-card',
              { featured: product.productType === '购买会员' }
            ]"
          >
            <div class="card-content">
              <!-- 卡片标题区域 -->
              <div class="card-header">
                <i class="iconfont icon-vip"></i>
                <text class="card-title">{{ product.productName }}</text>
                <!-- 推荐标签 - 根据产品是否激活显示 -->
                <div v-if="product.isActive" class="featured-tag">推荐</div>
              </div>
              <!-- 价格展示区域 -->
              <div class="card-price">
                <text class="price">¥{{ product.price }}</text>
                <text class="unit">
                  /{{ product.membershipType === 'annual' ? '年' : '永久' }}
                </text>
              </div>
              <!-- 产品特性区域 -->
              <div class="card-features">
                <div class="feature-item">
                  <span class="highlight">每日下载：</span
                  >{{ product.dailyDownloadLimit }} /次
                </div>
                <div class="feature-item">
                  <span class="highlight">会员特权：</span
                  >{{ product.description }}
                </div>
              </div>
            </div>
            <!-- 购买按钮区域 -->
            <div class="btn-wrapper">
              <el-button
                type="primary"
                class="buy-btn"
                @click="handleBuyMember(product)"
              >
                立即开通
              </el-button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
@use '@/base' as *;

/* ===== 页面整体布局 ===== */
.vip-page {
  display: flex;
  flex-direction: column;
}

.vip-container {
  padding: 24px;
  flex: 1;
  overflow-y: auto;
  position: relative; // 添加相对定位

  /* ===== 返回按钮样式 ===== */
  .back-btn {
    position: absolute;
    top: 24px;
    left: 24px;
    display: flex;
    align-items: center;
    gap: 4px;
    cursor: pointer;
    padding: 8px;
    border-radius: 4px;
    transition: all 0.3s;
    background: rgba(255, 255, 255, 0.1);
    z-index: 1;

    &:hover {
      background: rgba(255, 255, 255, 0.2);
    }

    text {
      color: #fff;
      font-size: 14px;
    }
  }

  /* ===== 区域标题样式 ===== */
  // 调整第一个 section-title 的边距，为返回按钮留出空间
  .vip-section {
    margin-top: 40px;
  }

  .section-title {
    font-size: 24px;
    font-weight: bold;
    margin-bottom: 24px;
    color: #fff;
  }

  /* ===== 卡片网格布局 ===== */
  .vip-cards,
  .coin-cards {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 24px;
    margin-bottom: 48px;
    padding: 0 24px;
  }

  /* ===== 卡片基础样式 ===== */
  .vip-card,
  .coin-card {
    background: rgba(255, 255, 255, 0.05);
    border-radius: 12px;
    padding: 24px;
    position: relative;
    transition: all 0.3s ease;
    display: flex;
    flex-direction: column;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    height: 360px; // 统一卡片高度

    // 卡片悬停效果
    &:hover {
      transform: translateY(-5px);
      background: rgba(255, 255, 255, 0.08);
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
    }

    // 特色卡片样式
    &.featured {
      border: 2px solid $uni-active-bg-color;
      background: rgba(255, 255, 255, 0.08);
    }

    // 卡片内容区域
    .card-content {
      flex: 1;
      display: flex;
      flex-direction: column;
    }

    // 按钮容器
    .btn-wrapper {
      padding-top: 20px;
      margin-top: auto; // 将按钮推到底部
    }
  }

  /* ===== 卡片标题样式 ===== */
  .card-header {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    margin-bottom: 16px;
    text-align: center;

    // 图标样式
    i {
      color: $uni-active-bg-color;
      font-size: 24px;
    }

    // 标题文字样式
    .card-title {
      font-size: 20px;
      color: #fff;
      font-weight: 600;
    }
  }

  /* ===== 价格区域样式 ===== */
  .card-price {
    margin: 24px 0;
    text-align: center; // 居中价格

    // 价格数字样式
    .price {
      font-size: 36px;
      color: $uni-active-bg-color;
      font-weight: bold;
    }

    // 价格单位样式
    .unit {
      font-size: 14px;
      color: #bbb;
      margin-left: 4px;
    }
  }

  /* ===== 产品特性区域样式 ===== */
  .card-features {
    margin-top: auto; // 将特性推到价格和按钮之间
    margin-bottom: 20px;

    // 特性项样式
    .feature-item {
      color: #bbb;
      margin: 12px 0;
      font-size: 14px;
      display: flex;
      align-items: flex-start;

      // 特性标签样式
      .highlight {
        color: $uni-active-bg-color;
        font-weight: 600;
        margin-right: 4px;
        min-width: 80px; // 固定标签宽度，使内容对齐
      }
    }
  }

  /* ===== 特色标签样式 ===== */
  .featured-tag {
    position: absolute;
    top: -10px;
    right: 16px;
    background: $uni-active-bg-color;
    color: #fff;
    padding: 4px 12px;
    border-radius: 12px;
    font-size: 12px;
    font-weight: 600;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  }

  /* ===== 金币卡片特定样式 ===== */
  .coin-card {
    .card-features {
      text-align: left; // 左对齐特性文本，与会员卡片保持一致
    }
  }

  /* ===== 购买按钮样式 ===== */
  .buy-btn {
    width: 100%;
    background-color: $uni-active-bg-color;
    border: none;
    height: 44px;
    font-size: 16px;
    font-weight: 600;
    border-radius: 8px;

    // 按钮悬停效果
    &:hover {
      opacity: 0.9;
      transform: translateY(-2px);
    }
  }
}
</style>
