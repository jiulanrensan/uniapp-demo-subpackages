<template>
  <!--  -->
  <view class="container">
    <text>ccc Subpackage</text>
    <bbb />
  </view>
</template>
<script setup>
import bbb from '@/pages/components/bbb/index.vue'
import {onMounted} from 'vue'
onMounted(() => {
  console.log('ccc Subpackage mounted')
})
</script>