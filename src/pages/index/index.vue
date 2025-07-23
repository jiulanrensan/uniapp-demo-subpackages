<template>
  <view class="content">
    <first ref="firstRef" @compLoaded="handleCompLoaded" />
    <aaa />
    <hello ref="helloRef" />
    <image class="logo" src="/static/logo.png" />
    <view class="text-area">
      <text class="title">{{ title }}</text>
    </view>
    <second />
    <share />
  </view>
</template>

<script setup lang="ts">
import { getCurrentInstance, onMounted, ref } from 'vue'
import first from '@/subA/first/index.vue'
import second from '@/subA/second/index.vue'
import aaa from '@/subA/aaa/empty.vue'
import hello from '@/pages/components/hello/index.vue'
import share from '../../subB/share/index.vue'
import {getGoods} from './goods'
import * as couponModule from '@/subA/coupon/index'

async function loadAsyncModule(m: any) {
  try {
    const ret = await m
    return ret
  } catch (error) {
    console.error(`Failed to load module ${module}:`, error)
    return {}
  }
}


// const { ctx, proxy } = getCurrentInstance()!
const title = ref('Hello')
const firstRef = ref<any>(null)
const helloRef = ref<any>(null)
onMounted(async () => {
  const res = getGoods()
  console.log('getGoods1', res)
  // helloRef.value.open()
  try {
    // const res = await loadAsyncModule(couponModule)
    const { getCoupon } = await couponModule
    console.log('getCoupon', getCoupon())
  } catch (error) {
    console.log('Failed to load coupon module:', error)
  }
})
function handleCompLoaded() {
  console.log('First Subpackage component loaded')
  // console.log(ctx.$refs)
  // 两种方式都可以
  // ctx.$refs.firstRef.open()
  // proxy.$refs.firstRef.open()
  // 不能通过这种方式调用
  // firstRef.value.open()
}
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
