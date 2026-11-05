<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, ref } from 'vue'
import {
  Camera,
  Layers,
  Plus,
  Settings2,
  Sparkles,
  ShieldCheck,
  ArrowUpRight,
  X,
  CircleHelp,
  Check,
  Cpu,
} from 'lucide-vue-next'
import CameraPreview from '../components/CameraPreview.vue'
import EffectLibrary from '../components/EffectLibrary.vue'
import DetectionDebugPanel from '../components/DetectionDebugPanel.vue'
import GestureEditor from '../components/GestureEditor.vue'
import SettingsPanel from '../components/SettingsPanel.vue'
import HelpGuide from '../components/HelpGuide.vue'
import type { HelpPage } from '../help/documents'
import { version } from '../../package.json'
import { useAppStore } from '../stores/appStore'
const store = useAppStore()
const helpPage = ref<HelpPage | null>(null)
function openHelp(page: HelpPage = 'tutorial') {
  store.settingsOpen = false
  helpPage.value = page
}
function createFromHelp() {
  helpPage.value = null
  store.openEditor()
}
const enabledCount = computed(() => store.effects.filter((effect) => effect.enabled).length)
function keydown(event: KeyboardEvent) {
  if (event.key === 'Escape') store.cleanOutput = false
}
onMounted(() => window.addEventListener('keydown', keydown))
onBeforeUnmount(() => window.removeEventListener('keydown', keydown))
</script>

<template>
  <div class="app-shell" :class="{ 'clean-output': store.cleanOutput }">
    <aside class="sidebar">
      <a href="#" class="brand" aria-label="MemeCam home" @click.prevent="store.tab = 'camera'"
        ><span class="brand-icon"
          ><img
            src="/memes/app-icon.png"
            alt=""
            width="40"
            height="40"
            style="width: 100%; height: 100%; object-fit: cover; border-radius: inherit" /></span
        ><span>MemeCam<span class="brand-dot">.</span></span></a
      >
      <span class="workspace-label">YOUR WORKSPACE</span>
      <nav aria-label="Main navigation">
        <button :class="{ active: store.tab === 'camera' }" @click="store.tab = 'camera'">
          <Camera :size="18" /> Camera
          <span v-if="store.cameraStatus === 'running'" class="nav-live" /></button
        ><button :class="{ active: store.tab === 'effects' }" @click="store.tab = 'effects'">
          <Layers :size="18" /> Effects
          <span class="nav-count">{{ store.effects.length }}</span></button
        ><button @click="store.openEditor()"><Plus :size="18" /> Create effect</button
        ><button @click="store.settingsOpen = true"><Settings2 :size="18" /> Settings</button>
      </nav>
      <div class="sidebar-bottom">
        <div class="local-card">
          <span class="local-icon"><ShieldCheck :size="19" /></span
          ><strong>100% on your device</strong>
          <p>Big reactions.<br />Zero cloud required.</p>
          <span class="local-badge"><i /> LOCAL PROCESSING</span>
        </div>
        <button class="help-button" @click="openHelp()">
          <CircleHelp :size="17" /> Help & tutorial <ArrowUpRight :size="14" />
        </button>
        <div class="sidebar-version">
          <span>MemeCam for Windows</span><span>v{{ version }}</span>
        </div>
      </div>
    </aside>
    <div class="workspace">
      <header class="topbar">
        <div class="breadcrumb">
          Workspace <span>/</span>
          <strong>{{ store.tab === 'camera' ? 'Camera studio' : 'Effect library' }}</strong>
        </div>
        <span class="local-indicator"><i /> All systems local</span>
      </header>
      <main>
        <div class="page-heading">
          <div>
            <div class="eyebrow">A LITTLE EXPRESSION GOES A LONG WAY</div>
            <h1>
              {{
                store.tab === 'camera'
                  ? 'Look alive. Get expressive.'
                  : 'A reaction for every moment.'
              }}
            </h1>
            <p>
              {{
                store.tab === 'camera'
                  ? 'Your everyday camera, with a personality of its own.'
                  : 'Build your collection and make every gesture count.'
              }}
            </p>
          </div>
          <button class="button primary" @click="store.openEditor()">
            <Plus :size="17" /> Create effect
          </button>
        </div>
        <div v-if="store.error" class="error-banner" role="alert">
          <span>{{ store.error }}</span
          ><button class="icon-button" aria-label="Dismiss error" @click="store.error = ''">
            <X :size="17" />
          </button>
        </div>
        <div class="studio-grid" :class="{ 'library-focus': store.tab === 'effects' }">
          <div class="studio-main">
            <CameraPreview />
            <div class="quick-stats">
              <span
                ><span
                  class="live-dot"
                  :class="{ inactive: store.cameraStatus !== 'running' }"
                /><strong>{{ store.renderFps }}</strong> render FPS</span
              ><span
                ><Cpu :size="13" /><strong>{{ store.inferenceFps }}</strong> inference FPS</span
              ><span
                ><Sparkles :size="13" /><strong>{{ enabledCount }}</strong>
                {{ enabledCount === 1 ? 'effect' : 'effects' }} enabled</span
              ><span class="stats-resolution">{{ store.resolution }}</span>
            </div>
            <EffectLibrary />
          </div>
          <DetectionDebugPanel />
        </div>
        <footer class="workspace-footer">
          <span
            ><ShieldCheck :size="13" /> Effects run locally. Meeting apps can share your
            output.</span
          ><span>Made for your next “you had to be there.”</span>
        </footer>
      </main>
    </div>
    <div v-if="store.notice" class="toast" role="status">
      <Check :size="17" />{{ store.notice }}
    </div>
    <GestureEditor v-if="store.editorOpen" />
    <SettingsPanel v-if="store.settingsOpen" @open-help="openHelp" />
    <HelpGuide
      v-if="helpPage"
      :initial-page="helpPage"
      @close="helpPage = null"
      @create="createFromHelp"
    />
  </div>
</template>
