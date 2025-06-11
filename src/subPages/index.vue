<template>
  <view class="content">
    <view>{{ title }}</view>
    <hello />
  </view>
</template>

<script setup lang="ts">
import hello from './components/hello/index.vue'
import { onMounted, ref } from 'vue'
const title = ref('subPages index')
</script>

<style>
.content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}
</style>
