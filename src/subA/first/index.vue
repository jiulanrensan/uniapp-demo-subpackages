<template>
  <!--  -->
  <view class="container">
    <text>First Subpackage</text>
    <bbb />
    <hello />
  </view>
</template>
<script setup>
import bbb from '@/pages/components/bbb/index.vue'
import hello from '@/subPages/components/subHello/index.vue'
import {print} from './utils'
import {onMounted} from 'vue'
const emits = defineEmits(['compLoaded'])
onMounted(() => {
  print()
  emits('compLoaded')
})
defineExpose({
  open() {
    console.log('First Subpackage open')
  }
})
</script>