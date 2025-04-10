<script setup>
import { useRouter } from 'vue-router'

const router = useRouter()
// 返回上一页
const handleBack = () => {
  router.go(-1)
}
</script>

<template>
  <div class="vipHead">
    <!-- 返回 -->
    <div class="left">
      <div class="back-btn" @click="handleBack">
        <i class="iconfont icon-shangyiyehoutuifanhui"></i>
        <text>返回</text>
      </div>
    </div>
    <!-- 用户信息 -->
    <div class="right">
      <div class="title">会员中心</div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
@use '@/base' as *;
.vipHead {
  width: 100%;
  height: 50px;
  color: #fff;
  background-color: $uni-menu-bg-color;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;

  .left {
    .back-btn {
      display: flex;
      align-items: center;
      gap: 4px;
      cursor: pointer;
      padding: 4px 8px;
      border-radius: 4px;
      transition: all 0.3s;

      &:hover {
        background: rgba(255, 255, 255, 0.1);
      }

      text {
        font-size: 14px;
      }
    }
  }

  .right {
    .title {
      font-size: 16px;
      font-weight: 500;
    }
  }
}
</style>
