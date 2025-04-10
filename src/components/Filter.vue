<script setup>
import { Search } from '@element-plus/icons-vue'
import { ref } from 'vue'
import { useMaterialStore } from '@/stores'

const searchValue = ref('')
// 分页参数
const materialStore = useMaterialStore()

// 处理筛选
const checkListFilter = ref([])
const changeFilter = (value) => {
  emits('filter', value)
}

// 重置筛选事件
const resetFilter = () => {
  searchValue.value = ''
  checkListFilter.value = []
  materialStore.setShowTextName(true)
  emits('reset')
}

// 重置筛选的方法
const reset = () => {
  searchValue.value = ''
  checkListFilter.value = []
  materialStore.setShowTextName(true)
}

// 处理每页条数改变
const handleSizeChange = (val) => {
  console.log('条数', val)
  materialStore.setPages({ pagesSize: val })
}

// 处理页码改变
const handleCurrentChange = (val) => {
  console.log('页码', val)
  materialStore.setPages({ pagesNum: val })
}

// 处理查询
const searchGetMaterial = async () => {
  checkListFilter.value = []
  emits('search', searchValue.value)
}

// 清空查询的方法
const clearSearch = () => {
  searchValue.value = ''
}

// 清空查询事件
const handleClear = () => {
  emits('clearSearch')
}

// 提交子组件事件
const emits = defineEmits(['search', 'clearSearch', 'filter', 'reset'])

// 暴露搜索组件的值和方法
defineExpose({
  clearSearch,
  reset
})
</script>

<template>
  <div class="filter">
    <!--  分页  -->
    <div class="example-pagination-block">
      <el-pagination
        background
        v-model:current-page="materialStore.pages.pagesNum"
        v-model:page-size="materialStore.pages.pagesSize"
        layout="total, prev, pager, next"
        :total="materialStore.materialTotal"
        @size-change="handleSizeChange"
        @current-change="handleCurrentChange"
      />
    </div>
    <!-- 搜索 -->
    <div class="search">
      <el-input
        class="custom-input"
        v-model="searchValue"
        placeholder="请输入关键词"
        :prefix-icon="Search"
        clearable
        @clear="handleClear"
      />
      <div class="searchBtn" @click="searchGetMaterial">查询</div>
    </div>
    <!--   筛选区   -->
    <div class="filter">
      <el-checkbox-group
        fill="#437a02"
        text-color="#437a02"
        v-model="checkListFilter"
        @change="changeFilter"
      >
        <!--        <el-checkbox label="全局搜索" value="allSearch" />-->
        <el-checkbox label="本机有" value="download" />
        <el-checkbox label="已收藏" value="collect" />
        <el-checkbox label="隐藏信息" value="showText" />
      </el-checkbox-group>
      <!-- 重置所有筛选 -->
      <div class="reset" @click="resetFilter">重置</div>
    </div>
  </div>
</template>

<style scoped lang="scss">
/*筛选和分页*/
.filter {
  display: flex;
  align-items: center;
  padding: 0 8px;
  height: 40px;
  background-color: #1a1a1a;
  /*分页*/
  .example-pagination-block {
    :deep(.el-pagination.is-background) {
      .btn-prev,
      .btn-next,
      .el-pager li {
        background-color: transparent;
        color: #fff;
        border: none;
        box-shadow: none;
        margin: 0 3px;

        &:hover {
          background-color: rgba(255, 255, 255, 0.1);
        }

        &.is-active {
          background-color: transparent;
          color: #ffffff;
        }

        &.is-active,
        &:hover,
        &:focus,
        &.disabled {
          background-color: transparent;
          box-shadow: none;
        }
      }

      .btn-prev,
      .btn-next {
        background-color: transparent;
        box-shadow: none;
        border: none;

        &:disabled {
          background-color: transparent;
          box-shadow: none;
        }

        &:hover,
        &:focus {
          background-color: transparent;
          box-shadow: none;
        }
      }
    }
  }
  /*搜索*/
  .search {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 8px;
    max-width: 1000px; // 搜索框最大宽度
    margin-left: 8px;
    margin-right: 40px;
    font-size: 14px;
    /*搜索框*/
    .custom-input {
      width: 100%;
      flex: 1;

      :deep(.el-input__wrapper) {
        background-color: #2f2f2f;
        box-shadow: none;
        border-radius: 20px;
        height: 30px;
        padding-left: 12px; // 调整左侧内边距
      }

      :deep(.el-input__inner) {
        color: #fff;
      }
    }
    /*搜索按钮*/
    .searchBtn {
      margin-left: 8px;
      cursor: pointer;

      &:hover {
        color: #427b02;
      }
    }
  }
  /*筛选*/
  .filter {
    display: flex;
    align-items: center;
    gap: 40px; // 复选框组和重置按钮之间的间距

    :deep(.el-checkbox-group) {
      display: flex;
      gap: 16px; // 复选框之间的间距

      .el-checkbox {
        /* 未选中状态的文字颜色 */
        .el-checkbox__label {
          color: #fff;
        }

        /* 选中状态的文字颜色 */
        &.is-checked {
          .el-checkbox__label {
            color: #437a02;
          }
        }

        /* 选中状态的复选框颜色 */
        .el-checkbox__input.is-checked {
          .el-checkbox__inner {
            background-color: #437a02;
            border-color: #437a02;
          }
        }
      }
    }

    .reset {
      font-size: 14px;
      cursor: pointer;

      &:hover {
        color: #437a02;
      }
    }
  }
}
</style>
