<script setup>
import { onMounted } from 'vue'
import { useRoute } from 'vue-router'
import router from '@/router'

// 获取传过来的素材id
const route = useRoute()
const cover_url = route.params.cover_url

onMounted(() => {
  console.log('传递过来的参数', route.params)
})
</script>

<template>
  <div class="fullscreen">
    <div class="back" @click="router.go(-1)">< 返回</div>
    <div class="materialPic">
      <el-image
        class="material-image"
        v-for="item in 18"
        :src="cover_url"
        fit="cover"
      ></el-image>
    </div>
  </div>
</template>

<style scoped lang="scss">
.fullscreen {
  padding: 10px 20px;

  .back {
    margin-bottom: 10px;
    cursor: pointer;
  }

  .materialPic {
    display: flex;
    flex-wrap: wrap;
    .material-image {
      width: 400px;
      height: 400px;
    }
  }
}
</style>
