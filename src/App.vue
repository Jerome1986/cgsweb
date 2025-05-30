<script setup>
import zhCn from 'element-plus/dist/locale/zh-cn.mjs'
import { onMounted } from 'vue'
import { usePathStore } from '@/stores'
</script>

<template>
  <div class="cgsWeb">
    <el-config-provider :locale="zhCn">
      <router-view></router-view>
    </el-config-provider>
  </div>
</template>

<style lang="scss">
/* 预览容器样式 */
.el-image-viewer__wrapper {
  .el-image-viewer__img {
    max-width: 80%;
    max-height: 80vh;
    object-fit: contain !important;
    /* 确保图片保持原始比例 */
    width: auto !important;
    /* 覆盖可能的内联样式 */
    height: auto !important;
    /* 覆盖可能的内联样式 */
  }

  /* 确保预览容器不会强制拉伸图片 */
  .el-image-viewer__canvas {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100%;
  }
}
</style>

<script>
export default {
  setup() {
    const pathStore = usePathStore()

    onMounted(() => {
      // 从 localStorage 初始化下载路径
      const savedPath = localStorage.getItem('downloadPath')
      if (savedPath) {
        pathStore.setDownloadPath(savedPath)
        console.log('初始化下载路径:', savedPath)
      }
    })
  }
}
</script>
