import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useOrderStore = defineStore('pay-orders', () => {
  /**
   * 当前金币订单信息
   * @type {import('vue').Ref<currentCoinsOrderModel>}
   */

  const currentCoinsOrder = ref({
    pay_order_type: '',
    pay_order_amount: 0
  })

  /**
   * 更新当前金币订单的信息
   * @param {currentCoinsOrderModel} val - 传过来的金币订单信息
   */
  const setCurrentCoinsOrder = (val) => {
    currentCoinsOrder.value = val
  }

  return {
    currentCoinsOrder,
    setCurrentCoinsOrder
  }
})
