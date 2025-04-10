<script setup>
import { ref } from 'vue'
import { menuList } from '@/typeConfig/menu'
import { useRouter } from 'vue-router'
import CgsHeader from '@/components/CgsHeader.vue'

const router = useRouter()
const tabActiveIndex = ref(0)
const handleMenuClick = (item, index) => {
  tabActiveIndex.value = index
  router.push(item.path)
}
</script>

<template>
  <el-container class="layout-container">
    <!--  侧边  -->
    <el-aside width="70px">
      <!--  logo    -->
      <div class="logo">
        <img src="../../assets/logo.png" alt="logo" />
      </div>
      <!--   类型tab   -->
      <div
        class="tabs"
        :class="{ activeTab: tabActiveIndex === index }"
        v-for="(item, index) in menuList"
        :key="item.id"
        @click="handleMenuClick(item, index)"
      >
        <!--   图标    -->
        <img
          class="icon"
          :src="tabActiveIndex === index ? item.activeIcon : item.icon"
          alt="model_select"
        />
        <!--   文字    -->
        <div class="text">{{ item.name }}</div>
      </div>
    </el-aside>
    <el-container>
      <!--  头部  -->
      <el-header style="margin: 0; padding: 0; height: fit-content">
        <cgs-header></cgs-header>
      </el-header>
      <!--   主体内容   -->
      <el-main style="margin: 0; padding: 0">
        <router-view></router-view>
      </el-main>
      <!--  底部    -->
      <el-footer>cgs模型网 ©2025 Created by jerome</el-footer>
    </el-container>
  </el-container>
</template>

<style lang="scss" scoped>
.layout-container {
  height: 100vh;

  /*左侧边框*/
  .el-aside {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 20px 0;
    background-color: #1a1a1a;

    .logo {
      margin-bottom: 20px;
      width: 30px;
      height: 30px;
    }

    /*tab栏*/
    .tabs {
      padding: 20px 0;
      text-align: center;
      color: #999;
      cursor: pointer;

      .icon {
        width: 20px;
        height: 20px;
      }
      .text {
        font-size: 12px;
      }
    }

    .activeTab {
      color: #ffffff;
    }
  }
  /*头部*/
  /*底部*/
  .el-footer {
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
    color: #666;
  }
}
</style>
