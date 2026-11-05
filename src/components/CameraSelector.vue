<script setup lang="ts">
import { Camera, RefreshCw } from 'lucide-vue-next'
import { useAppStore } from '../stores/appStore'
const store = useAppStore()
</script>

<template>
  <div class="camera-selector">
    <Camera :size="17" />
    <label class="sr-only" for="camera-select">Camera source</label>
    <select
      id="camera-select"
      :value="store.selectedCamera"
      @change="store.switchCamera(($event.target as HTMLSelectElement).value)"
    >
      <option v-if="!store.cameras.length" value="">Default camera</option>
      <option v-for="camera in store.cameras" :key="camera.deviceId" :value="camera.deviceId">
        {{ camera.label }}
      </option>
    </select>
    <button
      class="icon-button"
      aria-label="Refresh cameras"
      title="Refresh cameras"
      @click="store.refresh"
    >
      <RefreshCw :size="15" />
    </button>
  </div>
</template>
