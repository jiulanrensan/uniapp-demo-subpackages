<template>
  <!--  -->
  <view class="container">
    <text>First Subpackage</text>
    <bbb />
  </view>
</template>
<script setup>
import bbb from '@/pages/components/bbb/index.vue'
import {print} from './utils'
import {onMounted} from 'vue'
onMounted(() => {
  print()
})
</script>