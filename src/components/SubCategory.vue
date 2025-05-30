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
  <div class="subCate">
    <div class="title">分类</div>
    <div
      class="cateItem cateBox"
      :class="{ subActive: subActiveIndex === index }"
      v-for="(item, index) in subCategoryData"
      :key="item._id"
      @click="changeSubCate(item, index)"
    >
      {{ item.name }}
    </div>
  </div>
</template>

<style scoped lang="scss">
/*分类*/
.subCate {
  display: flex;
  gap: 10px;
  margin-bottom: 8px;

  .title {
    padding: 4px 8px;
    width: 60px;
    text-align: center;
  }

  .cateBox {
    padding: 4px 8px;
    text-align: center;
    width: fit-content;
    cursor: pointer;
  }

  .subActive {
    background-color: #437a02;
    border-radius: 8px;
  }
}
</style>
