<template>
  <view>hello</view>
  <third />
</template>
<script setup>
import third from '@/subA/third/index.vue'
defineExpose({
  open() {
    console.log('Hello component open')
  }
})
</script>