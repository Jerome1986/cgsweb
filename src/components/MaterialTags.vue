<script setup>
import { ref } from 'vue'
import { useMaterialStore } from '@/stores'

// 标签状态管理
const materialStore = useMaterialStore()

// 激活下标
const tagsActiveIndex = ref(null)
// 提交处理标签事件
const emits = defineEmits(['changeTags'])

// 处理标签点击
const changeTags = (item, index) => {
  tagsActiveIndex.value = index
  // 转交给父组件处理
  emits('changeTags', item)
}

defineExpose({
  tagsActiveIndex
})
</script>

<template>
  <div class="cate">
    <div class="title cateBox">标签</div>
    <div
      class="cateItem cateBox"
      :class="{ tagsActive: tagsActiveIndex === index }"
      v-for="(item, index) in materialStore.currentTags"
      :key="index"
      @click="changeTags(item, index)"
    >
      {{ item }}
    </div>
  </div>
</template>

<style scoped lang="scss">
/*分类*/
.cate {
  display: flex;
  gap: 10px;
  margin-bottom: 8px;

  .title {
    color: #999999;
  }

  .cateBox {
    padding: 4px 8px;
    text-align: center;
    width: 60px;
    cursor: pointer;
  }

  .tagsActive {
    background-color: #437a02;
    border-radius: 8px;
  }
}
</style>
