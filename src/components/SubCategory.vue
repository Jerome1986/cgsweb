<script setup>
import { ref } from 'vue'

defineProps({
  subCategoryData: {
    type: Array,
    default: () => []
  }
})

// 激活的下标
const subActiveIndex = ref(null)

const emits = defineEmits(['changeSubCate'])
// 二级分类点击事件
const changeSubCate = (item, index) => {
  console.log('二级分类', item)
  subActiveIndex.value = index
  emits('changeSubCate', item)
}

defineExpose({
  subActiveIndex
})
</script>

<template>
  <div class="cate">
    <div class="title cateBox">分类</div>
    <div
      class="cateItem cateBox"
      :class="{ subActive: subActiveIndex === index }"
      v-for="(item, index) in subCategoryData"
      :key="index"
      @click="changeSubCate(item, index)"
    >
      {{ item.name }}
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

  .subActive {
    background-color: #437a02;
    border-radius: 8px;
  }
}
</style>
