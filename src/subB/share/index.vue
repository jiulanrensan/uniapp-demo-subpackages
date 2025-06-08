<template>
  <!--  -->
  <view class="container">
    <text>Share Subpackage</text>
    <aaa />
  </view>
</template>
<script setup>
import aaa from '@/subA/aaa/empty.vue'
import {print} from './utils'
import {onMounted} from 'vue'
onMounted(() => {
  print()
})
</script>