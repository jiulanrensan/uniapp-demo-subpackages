<template>
  <!--  -->
  <view class="container">
    <text>Poster Subpackage</text>
  </view>
</template>
<script setup>
import {print} from './utils'
import {onMounted} from 'vue'
onMounted(() => {
  print()
})
</script>