import { ref } from 'vue'
import { defineStore } from 'pinia'

export const useUserStore = defineStore(
  'cgs-user',
  () => {
    /**
     * 用户信息
     * @type {import('vue').Ref<userModel>}
     */

    const userInfo = ref({})

    // 映射角色信息
    const setUserInfoRole = () => {
      switch (userInfo.value.role) {
        case 'admin':
          userInfo.value.role = '管理员'
          break
        case 'user':
          userInfo.value.role = '普通用户'
          break
        case 'annual':
          userInfo.value.role = '年费会员'
          break
        case 'permanent':
          userInfo.value.role = '永久会员'
      }
    }

    /**
     * 更新用户信息
     * @param {userModel} info - 传入的用户信息
     */
    const setUserInfo = (info) => {
      userInfo.value = { ...userInfo.value, ...info }
    }

    // 退出登录清除所有用户信息
    const clearUserInfo = () => {
      userInfo.value = {}
    }

    return {
      userInfo,
      setUserInfo,
      setUserInfoRole,
      clearUserInfo
    }
  },
  {
    persist: true // 持久化
  }
)
