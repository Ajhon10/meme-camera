<script setup lang="ts">
import { ref } from 'vue'
import {
  Camera,
  Video,
  Maximize2,
  FlipHorizontal2,
  Scan,
  Play,
  Square,
  Sparkles,
  ShieldCheck,
} from 'lucide-vue-next'
import CameraSelector from './CameraSelector.vue'
import { useAppStore } from '../stores/appStore'
import { useCameraPipeline } from '../camera/useCameraPipeline'
const store = useAppStore()
const canvas = ref<HTMLCanvasElement | null>(null),
  video = ref<HTMLVideoElement | null>(null)
useCameraPipeline(canvas, video)
</script>

<template>
  <section class="preview-panel panel" aria-label="Camera studio">
    <div class="panel-heading preview-heading">
      <span class="heading-with-icon"
        ><Video :size="17" /> Live preview <span class="tag">OUTPUT</span></span
      >
      <span class="status-pill" :class="{ running: store.cameraStatus === 'running' }"
        ><i />{{
          store.cameraStatus === 'running'
            ? 'Live'
            : store.cameraStatus === 'starting'
              ? 'Connecting'
              : 'Camera off'
        }}</span
      >
    </div>
    <div class="preview-stage" :class="{ 'is-live': store.cameraStatus === 'running' }">
      <video ref="video" autoplay muted playsinline class="video-input"></video>
      <canvas
        ref="canvas"
        width="1280"
        height="720"
        aria-label="Processed webcam output"
        :class="{ hidden: store.cameraStatus !== 'running' }"
      ></canvas>
      <div v-if="store.cameraStatus !== 'running'" class="preview-empty">
        <div class="viewfinder top-left"></div>
        <div class="viewfinder top-right"></div>
        <div class="viewfinder bottom-left"></div>
        <div class="viewfinder bottom-right"></div>
        <div class="camera-orbit">
          <div class="orbit-icon"><Camera :size="38" :stroke-width="1.4" /></div>
          <span class="orbit-spark"><Sparkles :size="16" /></span>
        </div>
        <h2>Your camera. A little less serious.</h2>
        <p>
          Turn a peace sign into a whole mood.<br />Start your camera and let your gestures do the
          talking.
        </p>
        <button
          class="button primary"
          :disabled="store.cameraStatus === 'starting'"
          @click="store.start"
        >
          <Play :size="15" fill="currentColor" />{{
            store.cameraStatus === 'starting' ? 'Connecting…' : 'Start camera'
          }}
        </button>
        <span class="privacy-note"
          ><ShieldCheck :size="13" /> Just you, your camera, and your computer.</span
        >
      </div>
      <div v-if="store.cameraStatus === 'running' && !store.cleanOutput" class="preview-overlays">
        <span class="live-chip"><i /> LIVE</span
        ><span class="resolution-chip">{{ store.resolution }}</span>
      </div>
      <div
        v-if="
          store.visionStatus === 'loading' && store.cameraStatus === 'running' && !store.cleanOutput
        "
        class="vision-loading"
      >
        <span class="spinner" /> Loading local vision models…
      </div>
      <button
        v-if="store.cleanOutput"
        class="exit-output button"
        @click="store.cleanOutput = false"
      >
        Exit clean output · Esc
      </button>
    </div>
    <div class="preview-toolbar">
      <CameraSelector />
      <div class="preview-tools">
        <button
          class="icon-button"
          :class="{ selected: store.mirror }"
          :aria-pressed="store.mirror"
          aria-label="Mirror output"
          title="Mirror output"
          @click="store.mirror = !store.mirror"
        >
          <FlipHorizontal2 :size="18" />
        </button>
        <button
          class="icon-button"
          :class="{ selected: store.showLandmarks }"
          :aria-pressed="store.showLandmarks"
          aria-label="Show detection landmarks"
          title="Show landmarks"
          @click="store.showLandmarks = !store.showLandmarks"
        >
          <Scan :size="18" />
        </button>
        <button
          class="icon-button"
          aria-label="Clean output"
          title="Clean output for OBS Window Capture"
          :disabled="store.cameraStatus !== 'running'"
          @click="store.cleanOutput = true"
        >
          <Maximize2 :size="17" />
        </button>
        <span class="toolbar-divider"></span>
        <button
          v-if="store.cameraStatus === 'running' || store.cameraStatus === 'starting'"
          class="button stop-button"
          @click="store.stop"
        >
          <Square :size="12" fill="currentColor" /> Stop camera
        </button>
        <button v-else class="button small primary" @click="store.start">
          <Play :size="13" fill="currentColor" /> Start camera
        </button>
      </div>
    </div>
  </section>
</template>
