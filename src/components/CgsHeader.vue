<script setup>
import Login from '@/components/Login.vue'
import { ref, onMounted } from 'vue'
import { usePathStore, useUserStore } from '@/stores'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useRouter } from 'vue-router'

// 登录弹框
const dialog = ref()
// 设置下载路径弹框
const showPathDialog = ref(false)
// 导入路由
const router = useRouter()
// 用户全局管理
const userStore = useUserStore()
// 下载路径全局管理
const pathStore = usePathStore()
// 切换语言
const languageSwitch = ref(false)
const handleChangeLanguage = (val) => {
  languageSwitch.value = val
}

// 登录
const toLogin = () => {
  dialog.value.open()
}

// 置顶功能
const isOnTop = ref(false)
// 置顶功能
const toggleOnTop = async () => {
  try {
    const newState = !isOnTop.value
    const result = await window.electronAPI.toggleOnTop(newState)

    // 根据主进程返回的结果更新状态
    isOnTop.value = result
    console.log('置顶状态:', result)
  } catch (error) {
    console.error('置顶操作失败:', error)
    // 可以在这里添加用户提示
  }
}

// 功能菜单
const showMenu = ref(false)
const toggleMenu = () => {
  showMenu.value = !showMenu.value
}
// 退出登录
const handleLogout = () => {
  ElMessageBox.confirm('确定要退出登录吗？', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning',
    draggable: true,
    customClass: 'custom-message-box'
  })
    .then(() => {
      // 用户点击确定
      userStore.clearUserInfo()
      // 只清空收藏筛选状态
      ElMessage({
        message: '退出成功',
        type: 'success',
        duration: 2000
      })
    })
    .catch(() => {
      // 用户点击取消，不做任何操作
    })
}
// 处理菜单项点击
const handleMenuItem = (action) => {
  switch (action) {
    case 'profile':
      // 设置下载路径
      console.log('设置下载路径')
      showPathDialog.value = true
      break
    case 'vip':
      // 进入会员信息页面
      console.log('会员页面')
      router.push('/vip')
      break
    case 'logout':
      // 处理退出登录
      handleLogout()
      break
  }
  showMenu.value = false
}

// 默认下载路径初始数据
const downloadPath = ref('')
const currentPath = ref(pathStore.downloadPath)

// 选择路径
const handleSelectPath = async () => {
  console.log('选择路径')
  try {
    const path = await window.electronAPI.selectDownloadPath()
    if (path) {
      downloadPath.value = path
    }
  } catch (err) {
    console.error('Select path error:', err)
    ElMessage({
      message: '选择路径失败，请重试',
      type: 'error'
    })
  }
}

// 保存路径
const handleSavePath = () => {
  if (!downloadPath.value) {
    ElMessage({
      message: '请先选择下载路径',
      type: 'warning'
    })
    return
  }

  pathStore.setDownloadPath(downloadPath.value)
  currentPath.value = downloadPath.value
  ElMessage({
    message: '下载路径设置成功',
    type: 'success'
  })
  handleCloseDialog()
}

// 关闭设置路径的弹框
const handleCloseDialog = () => {
  showPathDialog.value = false
  downloadPath.value = ''
}

// 页面挂载完毕
onMounted(() => {
  // 映射角色
  userStore.setUserInfoRole()
})
</script>

<template>
  <div class="cgsHeader">
    <!--  用户信息-已登录  -->
    <div class="userInfo" v-if="userStore.userInfo.token">
      <!--   头像   -->
      <div class="avatar">
        <img :src="userStore.userInfo.userAvatarUrl" alt="头像" />
      </div>
      <!--   昵称   -->
      <div class="username">{{ userStore.userInfo.username }}</div>
      <!--   剩余金币   -->
      <div class="gold">金币：{{ userStore.userInfo.coins }}</div>
      <!--   身份   -->
      <div class="role">{{ userStore.userInfo.role }}</div>
    </div>
    <!--  未登录  -->
    <div @click="toLogin" class="notLogin" v-else>点击登录</div>
    <!--  功能  -->
    <div class="gn">
      <div class="menu">
        <div @click="toggleMenu">
          <i class="iconfont icon-gongnenglan"></i>
        </div>
        <!-- 下拉菜单 - 只在登录状态下显示 -->
        <div
          class="dropdown-menu"
          v-show="userStore.userInfo.token && showMenu"
        >
          <div class="menu-item" @click="handleMenuItem('profile')">
            设置路径
          </div>
          <div class="menu-item" @click="handleMenuItem('vip')">会员充值</div>
          <div class="menu-item" @click="handleMenuItem('logout')">
            退出登录
          </div>
        </div>
      </div>
      <!--   点击置顶   -->
      <div class="toggleOnTop" :class="{ onTop: isOnTop }" @click="toggleOnTop">
        <i class="iconfont icon-dingzhuzhiding"></i>
      </div>
      <!--   切换语言   -->
      <el-switch
        v-model="languageSwitch"
        class="ml-2"
        style="--el-switch-on-color: #427b02"
        :active-text="languageSwitch ? '英文' : '中文'"
        @change="handleChangeLanguage"
      />
    </div>
  </div>
  <!-- 注册/登录组件 -->
  <Login ref="dialog"></Login>
  <!-- 设置下载路径弹框 -->
  <el-dialog
    v-model="showPathDialog"
    title="设置下载路径"
    width="500px"
    :close-on-click-modal="false"
    @close="handleCloseDialog"
  >
    <div class="path-dialog">
      <div class="current-path">
        <span class="label">当前路径：</span>
        <span class="path">{{ currentPath }}</span>
      </div>
      <div class="select-path">
        <el-input v-model="downloadPath" placeholder="请选择下载路径" readonly>
          <template #append>
            <el-button @click="handleSelectPath">选择路径</el-button>
          </template>
        </el-input>
      </div>
    </div>
    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleCloseDialog">取消</el-button>
        <el-button type="primary" @click="handleSavePath">确定</el-button>
      </div>
    </template>
  </el-dialog>
</template>

<style lang="scss" scoped>
.cgsHeader {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 10px;
  padding: 0 20px;
  width: 100%;
  height: 50px;
  font-size: 12px;
  background-color: #1a1a1a;

  /*用户信息*/
  .userInfo {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-right: 20px;

    .avatar {
      width: 30px;
      height: 30px;
      border-radius: 50%;
      overflow: hidden;
    }
    .username {
    }
    .gold {
    }
    .role {
    }
  }
  .notLogin {
    margin-right: 20px;
    cursor: pointer;

    &:hover {
      color: #427b02;
    }
  }
  /*功能*/
  .gn {
    display: flex;
    align-items: center;
    gap: 10px;

    /*功能菜单*/
    .menu {
      position: relative;
      cursor: pointer;
      z-index: 999;

      .dropdown-menu {
        position: absolute;
        top: 100%;
        right: 0;
        margin-top: 8px;
        background: #2f2f2f;
        border-radius: 4px;
        padding: 4px 0;
        min-width: 120px;
        box-shadow: 0 2px 12px rgba(0, 0, 0, 0.3);
        animation: slideDown 0.2s ease;

        &::before {
          content: '';
          position: absolute;
          top: -4px;
          right: 10px;
          width: 8px;
          height: 8px;
          background: #2f2f2f;
          transform: rotate(45deg);
        }

        .menu-item {
          padding: 8px 16px;
          color: #fff;
          transition: background-color 0.3s;
          font-size: 14px;
          white-space: nowrap;
          text-align: center;

          &:hover {
            background-color: rgba(255, 255, 255, 0.1);
          }
        }
      }
    }

    /*置顶*/
    .toggleOnTop {
      color: #ffffff;
      cursor: pointer;
    }

    .onTop {
      color: #427b02;
    }

    /*切换语言*/
    .el-switch {
      :deep(.el-switch__label) {
        color: #ffffff;
      }
      :deep(.el-switch__label.is-active) {
        color: #427b02;
      }
    }
  }
}

/*下载弹框*/
.path-dialog {
  padding: 20px;

  .current-path {
    margin-bottom: 20px;

    .label {
      color: #666;
      margin-right: 10px;
    }

    .path {
      color: #333;
      font-weight: bold;
    }
  }

  .select-path {
    :deep(.el-input-group__append) {
      padding: 0;

      .el-button {
        border: none;
        margin: 0;

        &:hover {
          color: #427b02;
        }
      }
    }
  }
}
</style>
