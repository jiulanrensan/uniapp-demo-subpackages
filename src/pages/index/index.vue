<template>
  <view class="content">
    <first />
    <aaa />
    <hello />
    <image class="logo" src="/static/logo.png" />
    <view class="text-area">
      <text class="title">{{ title }}</text>
    </view>
    <second />
  </view>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import first from '@/subPackages/first/index.vue'
import second from '@/subPackages/second/index.vue'
import aaa from '@/subPackages/aaa/empty.vue'
import hello from '@/pages/components/hello/index.vue'
import {getGoods} from './goods'
const title = ref('Hello')
onMounted(() => {
  const res = getGoods()
  console.log('getGoods', res)
})
</script>

<style>
.content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.logo {
  height: 200rpx;
  width: 200rpx;
  margin-top: 200rpx;
  margin-left: auto;
  margin-right: auto;
  margin-bottom: 50rpx;
}

.text-area {
  display: flex;
  justify-content: center;
}

.title {
  font-size: 36rpx;
  color: #8f8f94;
}
</style>
