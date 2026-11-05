<script setup lang="ts">
import {
  Activity,
  ScanFace,
  Hand,
  PersonStanding,
  Scan,
  Radio,
  ArrowUpRight,
  RefreshCw,
  Zap,
  Check,
} from 'lucide-vue-next'
import { useAppStore } from '../stores/appStore'
import { gestureName } from '../effects/effectTypes'
import { onMounted, onBeforeUnmount } from 'vue'
import { nativeCamera, cameraControl } from '../output/nativeCamera'
let poll: ReturnType<typeof setInterval> | undefined
onMounted(() => {
  void cameraControl('status')
  poll = setInterval(() => {
    if (!nativeCamera.busy) void cameraControl('status')
  }, 2000)
})
onBeforeUnmount(() => clearInterval(poll))
const store = useAppStore()
const detectorRows = [
  { key: 'face' as const, label: 'Face', icon: ScanFace },
  { key: 'hands' as const, label: 'Hands', icon: Hand },
  { key: 'pose' as const, label: 'Body pose', icon: PersonStanding },
]
</script>

<template>
  <aside class="inspector">
    <section class="panel detection-panel">
      <div class="panel-heading">
        <span class="heading-with-icon"><Activity :size="16" /> Detection</span
        ><span class="tiny-label" :class="{ mint: store.visionStatus === 'ready' }">{{
          store.visionStatus === 'ready'
            ? 'READY'
            : store.visionStatus === 'loading'
              ? 'LOADING'
              : store.visionStatus === 'error'
                ? 'ERROR'
                : 'STANDBY'
        }}</span>
      </div>
      <div class="detector-list">
        <div v-for="row in detectorRows" :key="row.key" class="detector-row">
          <component :is="row.icon" :size="19" />
          <div>
            <strong>{{ row.label }}</strong
            ><small>{{
              !store.detectors[row.key]
                ? 'Disabled'
                : store.detected[row.key]
                  ? 'Tracking'
                  : store.cameraStatus === 'running'
                    ? 'Searching…'
                    : 'Waiting for camera'
            }}</small>
          </div>
          <button
            class="switch"
            role="switch"
            :aria-label="`${row.label} detection`"
            :aria-checked="store.detectors[row.key]"
            @click="store.detectors[row.key] = !store.detectors[row.key]"
          >
            <span />
          </button>
        </div>
      </div>
      <label class="landmark-check"
        ><input v-model="store.showLandmarks" type="checkbox" /><Scan :size="14" /> Show detection
        landmarks</label
      >
      <div v-if="store.visionStatus === 'error'" class="vision-error">
        <p>{{ store.visionError }}</p>
        <button class="text-button" @click="store.restartVision">
          <RefreshCw :size="13" /> Retry detection
        </button>
      </div>
      <div class="recognition-block">
        <span class="eyebrow">DETECTED GESTURE</span>
        <div class="recognized-gesture">
          <Hand :size="18" /><strong>{{
            store.detectedGesture ? gestureName(store.detectedGesture) : 'Waiting for a gesture'
          }}</strong>
        </div>
        <div class="confidence-label">
          <span>Confidence</span
          ><strong>{{ Math.round(store.confidence * 100) }}<small>%</small></strong>
        </div>
        <div class="confidence-track">
          <div :style="{ width: `${store.confidence * 100}%` }"></div>
        </div>
        <p class="muted small-copy">Confirmed over 4 frames for a steady effect.</p>
      </div>
      <div class="active-effect-block">
        <span class="eyebrow">ACTIVE EFFECT</span>
        <div class="active-effect-name">
          <Zap :size="17" :class="{ mint: store.activeEffects.length }" /><span>{{
            store.activeEffects.join(', ') || 'No active effects'
          }}</span
          ><span v-if="store.activeEffects.length" class="live-dot" />
        </div>
      </div>
    </section>
    <section class="panel output-panel">
      <div class="panel-heading">
        <span class="heading-with-icon"><Radio :size="16" /> Camera output</span
        ><span class="tag">720p</span>
      </div>
      <div class="output-content">
        <div class="output-status">
          <span class="output-icon"
            ><Check v-if="store.cameraStatus === 'running'" :size="19" /><Radio v-else :size="19"
          /></span>
          <div>
            <strong>Processed stream</strong><small>{{ store.streamStatus }}</small>
          </div>
        </div>
        <button
          class="button output-button"
          :disabled="store.cameraStatus !== 'running'"
          @click="store.cleanOutput = true"
        >
          Open clean output <ArrowUpRight :size="15" />
        </button>
        <template v-if="nativeCamera.available">
          <button
            v-if="!nativeCamera.installed"
            class="button output-button"
            :disabled="nativeCamera.busy"
            @click="cameraControl('install')"
          >
            {{ nativeCamera.busy ? 'Installing…' : 'Install virtual camera' }}
          </button>
          <button
            v-else
            class="button output-button"
            :disabled="
              nativeCamera.busy || (!nativeCamera.running && store.cameraStatus !== 'running')
            "
            @click="cameraControl(nativeCamera.running ? 'stop' : 'start')"
          >
            {{
              nativeCamera.busy
                ? 'Please wait…'
                : nativeCamera.running
                  ? 'Stop virtual camera'
                  : 'Start virtual camera'
            }}
          </button>
          <p v-if="nativeCamera.running">
            Live · Select “MemeCam Windows Virtual Camera” in Google Meet’s camera settings. Refresh
            Meet if it was already open.
          </p>
          <p v-else>
            Send your effects directly to meeting apps. Camera setup requires a one-time Windows
            administrator prompt.
          </p>
          <button
            v-if="nativeCamera.installed && !nativeCamera.running"
            class="text-button"
            :disabled="nativeCamera.busy"
            @click="cameraControl('uninstall')"
          >
            Uninstall camera component
          </button>
        </template>
        <p v-else>
          Direct camera output requires the Windows 11 x64 desktop app and native binaries. You can
          also use OBS Window Capture with clean output.
        </p>
        <p v-if="nativeCamera.error" role="alert">{{ nativeCamera.error }}</p>
      </div>
    </section>
    <div class="gesture-tip">
      <span class="tip-icon">✌</span>
      <div>
        <strong>Give it a little peace.</strong>
        <p>Enable Cool mode, hold up a peace sign, and watch your face transform.</p>
      </div>
    </div>
  </aside>
</template>
