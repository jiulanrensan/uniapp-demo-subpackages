<template>
  <!--  -->
  <view class="container">
    <text>Second Subpackage</text>
    <aaa />
  </view>
</template>
<script setup>
import aaa from '@/subPackages/aaa/empty.vue'
import {print} from './utils'
import {onMounted} from 'vue'
onMounted(() => {
  print()
})
</script>