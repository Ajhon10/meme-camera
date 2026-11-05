<script setup lang="ts">
import { onMounted } from 'vue'
import HomeView from './views/HomeView.vue'
import { useAppStore } from './stores/appStore'
const store = useAppStore()
onMounted(() => {
  void store.initialize()
})
</script>

<template><HomeView /></template>
