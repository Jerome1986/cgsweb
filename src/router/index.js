import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      component: () => import('@/views/layout/Layout.vue'),
      redirect: '/model',
      children: [
        { path: '/model', component: () => import('@/views/model/Model.vue') },
        { path: '/maps', component: () => import('@/views/maps/Maps.vue') },
        {
          path: '/lighting',
          component: () => import('@/views/lighting/Lighting.vue')
        },
        {
          path: '/material',
          component: () => import('@/views/material/Material.vue')
        },
        { path: '/vip', component: () => import('@/views/vip/Vip.vue') }
      ]
    }
  ]
})

export default router
