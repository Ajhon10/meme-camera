<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { X, ShieldCheck, Cpu, Camera, Info } from 'lucide-vue-next'
import { useAppStore } from '../stores/appStore'
import type { HelpPage } from '../help/documents'
import { version, author } from '../../package.json'
defineEmits<{ openHelp: [page: HelpPage] }>()
const store = useAppStore(),
  dialog = ref<HTMLDialogElement | null>(null)
onMounted(() => dialog.value?.showModal())
</script>

<template>
  <dialog ref="dialog" class="settings-dialog" @cancel.prevent="store.settingsOpen = false">
    <div class="modal-heading">
      <div>
        <span class="eyebrow">YOUR STUDIO</span>
        <h2>Settings</h2>
        <p>A few controls to find your flow.</p>
      </div>
      <button class="icon-button" aria-label="Close settings" @click="store.settingsOpen = false">
        <X :size="20" />
      </button>
    </div>
    <div class="settings-body">
      <h3 class="heading-with-icon"><Camera :size="17" /> Camera</h3>
      <label class="setting-row"
        ><span
          ><strong>Mirror output</strong
          ><small>Applies to both preview and processed stream.</small></span
        ><input v-model="store.mirror" type="checkbox" /></label
      ><label class="setting-row"
        ><span
          ><strong>Show detection landmarks</strong
          ><small>Hidden automatically in clean output mode.</small></span
        ><input v-model="store.showLandmarks" type="checkbox"
      /></label>
      <h3 class="heading-with-icon"><Cpu :size="17" /> Performance</h3>
      <label class="field"
        >Inference frame limit<select v-model.number="store.inferenceLimit">
          <option :value="10">10 FPS · lower CPU usage</option>
          <option :value="15">15 FPS · balanced</option>
          <option :value="20">20 FPS · recommended</option>
          <option :value="30">30 FPS · faster response</option>
        </select></label
      >
      <p class="muted small-copy">
        The canvas renders independently. Actual detection speed depends on your CPU and the
        detectors enabled.
      </p>
      <div class="privacy-card">
        <ShieldCheck :size="22" />
        <div>
          <strong>Your camera stays yours.</strong>
          <p>
            Camera frames are processed locally. No uploads, accounts, analytics, or recordings.
            Settings, effect images, recorded pose coordinates, and tutorial progress stay on this
            device. Meeting apps can transmit or record the output you share.
          </p>
        </div>
      </div>
      <div class="info-card">
        <Info :size="18" />
        <p>
          MemeCam {{ version }} · Windows desktop<br />Developed by {{ author }}.<br />Native camera
          output supports Windows 11 x64. Start it in Camera output, then select MemeCam in your
          meeting app.
        </p>
      </div>
    </div>
    <div class="modal-footer">
      <div class="policy-links">
        <button class="text-button" @click="$emit('openHelp', 'tutorial')">Tutorial & help</button>
        <button class="text-button" @click="$emit('openHelp', 'privacy')">Privacy Policy</button>
        <button class="text-button" @click="$emit('openHelp', 'terms')">Terms & Conditions</button>
      </div>
      <button class="button primary" @click="store.settingsOpen = false">Done</button>
    </div>
  </dialog>
</template>
<style scoped>
.policy-links {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
  padding-right: 12px;
}
</style>
