<script setup></script>

<template>
  <el-button type="primary" @click="$router.push('/lighting')">Primary</el-button>
  <el-button type="success" @click="$router.push('/model')">Success</el-button>
  <el-button type="info">Info</el-button>
  <el-button type="warning">Warning</el-button>
  <el-button type="danger">Danger</el-button>
  <router-view></router-view>
</template>

<style scoped></style>
