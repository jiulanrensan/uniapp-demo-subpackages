<template>
  <view>hello</view>
  <third />
</template>
<script >
import third from '@/subA/third/index.vue'
// import * as couponModule from '@/subA/coupon/index'
import { onLoad } from '@dcloudio/uni-app';
onLoad(async () => {
  console.log('Hello component onLoad')
  // console.log('couponModule', couponModule)
  // const res = await couponModule
  // console.log('res', res)
})
</script>