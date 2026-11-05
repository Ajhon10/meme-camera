<script setup lang="ts">
import { computed, nextTick, onMounted, onBeforeUnmount, ref, watch } from 'vue'
import { X, BookOpen, ArrowLeft, ArrowRight, Check, Play } from 'lucide-vue-next'
import { documents, tutorialSteps, type HelpPage } from '../help/documents'
import { blocks } from '../help/markdown'
import { isHelpLink } from '../help/linkPolicy'
import { useAppStore } from '../stores/appStore'
import HelpInline from './HelpInline.vue'
const props = defineProps<{ initialPage: HelpPage }>()
const emit = defineEmits<{ close: []; create: [] }>()
const store = useAppStore()
const dialog = ref<HTMLDialogElement | null>(null),
  content = ref<HTMLElement | null>(null)
const page = ref<HelpPage>(props.initialPage),
  step = ref(0),
  finished = ref(false),
  message = ref('')
const selected = computed(() => documents.find((document) => document.id === page.value))
const documentBlocks = computed(() => blocks(selected.value?.body ?? ''))
const currentStep = computed(() => tutorialSteps[step.value])
const navigation = [{ id: 'tutorial', title: 'Quick tutorial' }, ...documents] as const
const progressKey = 'memecam-tutorial-v1'
function saveProgress() {
  try {
    localStorage.setItem(
      progressKey,
      JSON.stringify({ step: step.value, finished: finished.value }),
    )
  } catch {
    message.value = 'Tutorial progress could not be saved on this device.'
  }
}
function changeStep(index: number) {
  step.value = Math.max(0, Math.min(index, tutorialSteps.length - 1))
  saveProgress()
}
async function choose(value: HelpPage) {
  page.value = value
  message.value = ''
  await nextTick()
  content.value?.scrollTo(0, 0)
}
async function navigate(href: string) {
  const document = documents.find((item) => item.file === href)
  if (document) {
    await choose(document.id)
    return
  }
  if (!isHelpLink(href)) {
    message.value = 'This link is not available in the guide.'
    return
  }
  try {
    if (window.memeHelp) await window.memeHelp.openExternal(href)
    else window.open(href, '_blank', 'noopener,noreferrer')
  } catch {
    message.value = 'Could not open your browser. Please use the official support website.'
  }
}
function complete() {
  finished.value = true
  saveProgress()
  emit('close')
}
function restart() {
  finished.value = false
  changeStep(0)
}
watch(
  () => props.initialPage,
  (value) => {
    void choose(value)
  },
)
onMounted(() => {
  try {
    const saved = JSON.parse(localStorage.getItem(progressKey) ?? 'null')
    if (
      saved &&
      Number.isInteger(saved.step) &&
      saved.step >= 0 &&
      saved.step < tutorialSteps.length
    )
      step.value = saved.step
    finished.value = saved?.finished === true
  } catch {
    /* A corrupt or unavailable progress record simply starts a fresh tutorial. */
  }
  dialog.value?.showModal()
})
onBeforeUnmount(() => dialog.value?.close())
</script>

<template>
  <dialog
    ref="dialog"
    class="help-dialog"
    aria-labelledby="help-title"
    @cancel.prevent="emit('close')"
  >
    <div class="modal-heading">
      <div>
        <span class="eyebrow">MEMECAM HANDBOOK</span>
        <h2 id="help-title"><BookOpen :size="22" /> Help & tutorial</h2>
        <p>From your first reaction to your next meeting. Available offline.</p>
      </div>
      <button class="icon-button" aria-label="Close help" autofocus @click="emit('close')">
        <X :size="20" />
      </button>
    </div>
    <div class="help-layout">
      <nav class="help-navigation" aria-label="Help topics">
        <button
          v-for="item in navigation"
          :key="item.id"
          :aria-current="page === item.id ? 'page' : undefined"
          :class="{ active: page === item.id }"
          @click="choose(item.id)"
        >
          {{ item.title }}
        </button>
        <span class="help-offline"><Check :size="13" /> Guides stored in the app</span>
      </nav>
      <section
        ref="content"
        class="help-content"
        :aria-label="page === 'tutorial' ? 'Quick tutorial' : selected?.title"
        tabindex="0"
      >
        <template v-if="page === 'tutorial'">
          <div class="tutorial-intro">
            <span class="eyebrow">ABOUT 5 MINUTES · {{ tutorialSteps.length }} STEPS</span>
            <h2>Your camera, with a little personality.</h2>
            <p>
              Go at your own pace. You can leave the guide to try a step and resume here whenever
              you need.
            </p>
          </div>
          <div class="tutorial-steps" aria-label="Tutorial steps">
            <button
              v-for="(item, index) in tutorialSteps"
              :key="item.label"
              :aria-current="step === index ? 'step' : undefined"
              :aria-label="`Step ${index + 1}: ${item.label}`"
              :class="{ active: step === index }"
              @click="changeStep(index)"
            >
              <span>{{ index + 1 }}</span
              >{{ item.label }}
            </button>
          </div>
          <article class="tutorial-card" aria-live="polite">
            <span class="eyebrow">STEP {{ step + 1 }} OF {{ tutorialSteps.length }}</span>
            <h3>{{ currentStep.title }}</h3>
            <p>{{ currentStep.text }}</p>
            <div class="tutorial-tip">{{ currentStep.tip }}</div>
          </article>
          <div class="tutorial-status">
            <span
              >Camera: <strong>{{ store.cameraStatus }}</strong></span
            ><span
              >Detection: <strong>{{ store.visionStatus }}</strong></span
            >
          </div>
          <div class="tutorial-controls">
            <button class="button" :disabled="step === 0" @click="changeStep(step - 1)">
              <ArrowLeft :size="15" /> Back</button
            ><button
              v-if="step < tutorialSteps.length - 1"
              class="button primary"
              @click="changeStep(step + 1)"
            >
              Next step <ArrowRight :size="15" /></button
            ><button v-else class="button primary" @click="complete">
              <Check :size="15" /> Finish tutorial
            </button>
          </div>
          <div class="tutorial-actions">
            <button class="text-button" @click="emit('close')">
              <Play :size="14" /> Try this in the studio</button
            ><button v-if="step === 3" class="text-button" @click="emit('create')">
              Open effect editor</button
            ><button v-if="step === 4" class="text-button" @click="choose('meetings')">
              Platform instructions</button
            ><button class="text-button" @click="restart">Restart tutorial</button>
          </div>
          <p v-if="finished" class="muted small-copy">
            Tutorial completed. You can revisit any step.
          </p>
        </template>
        <article v-else class="help-document">
          <template v-for="(block, index) in documentBlocks" :key="`${page}-${index}`">
            <component :is="block.level === 1 ? 'h2' : 'h3'" v-if="block.type === 'heading'"
              ><HelpInline :text="block.text" @navigate="navigate"
            /></component>
            <div v-else-if="block.type === 'code'" class="help-code">
              <pre><code>{{ block.text }}</code></pre>
            </div>
            <component :is="block.ordered ? 'ol' : 'ul'" v-else-if="block.type === 'list'"
              ><li v-for="(item, itemIndex) in block.items" :key="itemIndex">
                <HelpInline :text="item" @navigate="navigate" /></li
            ></component>
            <p v-else><HelpInline :text="block.text" @navigate="navigate" /></p>
          </template>
        </article>
      </section>
    </div>
    <div class="modal-footer help-footer">
      <span role="status">{{
        message ||
        'External help links open in your browser. Camera sharing stays under your control.'
      }}</span
      ><button class="button" @click="emit('close')">Back to studio</button>
    </div>
  </dialog>
</template>

<style scoped>
.help-dialog {
  width: min(1030px, calc(100vw - 40px));
  max-height: calc(100vh - 40px);
  padding: 0;
}
.help-layout {
  display: grid;
  grid-template-columns: 205px minmax(0, 1fr);
  height: min(610px, calc(100vh - 230px));
  min-height: 280px;
}
.help-navigation {
  padding: 20px 12px;
  border-right: 1px solid #303139;
  overflow: auto;
  display: flex;
  flex-direction: column;
  gap: 5px;
}
.help-navigation button {
  color: #aeb1c1;
  background: transparent;
  border: 0;
  border-radius: 8px;
  padding: 11px 12px;
  text-align: left;
  font: inherit;
  cursor: pointer;
}
.help-navigation button.active {
  background: #34304b;
  color: #d1c5ff;
}
.help-navigation button:hover {
  background: #292a33;
}
.help-offline {
  display: flex;
  gap: 5px;
  align-items: center;
  margin: auto 12px 0;
  padding-top: 24px;
  color: #9fa5b6;
  font-size: 10px;
}
.help-content {
  overflow: auto;
  padding: 28px 34px;
  line-height: 1.7;
  color: #c5c7d1;
}
.help-content h2 {
  font-size: 24px;
  line-height: 1.35;
  color: #f1f0f7;
  margin: 0 0 18px;
}
.help-content h3 {
  font-size: 17px;
  line-height: 1.4;
  color: #f1f0f7;
  margin: 27px 0 12px;
}
.help-content p {
  margin: 0 0 16px;
  font-size: 13px;
}
.help-document li {
  margin: 0 0 10px;
  font-size: 13px;
}
.help-document ol,
.help-document ul {
  padding-left: 24px;
  margin: 0 0 20px;
}
.help-code {
  background: #121318;
  border: 1px solid #33343e;
  border-radius: 10px;
  padding: 14px;
  margin: 18px 0;
}
.help-code pre {
  overflow: auto;
  white-space: pre;
  font-size: 12px;
  margin: 10px 0 0;
}
.help-content :deep(.help-inline-link) {
  background: none;
  border: 0;
  padding: 0;
  color: #c6b6ff;
  font: inherit;
  text-decoration: underline;
  cursor: pointer;
  text-align: left;
}
.help-content :deep(code) {
  font-size: 12px;
}
.tutorial-intro h2 {
  margin-top: 10px;
}
.tutorial-steps {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 7px;
  margin: 24px 0;
}
.tutorial-steps button {
  border: 1px solid #373843;
  background: #21222b;
  color: #aeb1c1;
  border-radius: 9px;
  padding: 9px 3px;
  cursor: pointer;
  font-size: 10px;
}
.tutorial-steps button span {
  display: block;
  font-size: 14px;
  font-weight: 700;
  margin-bottom: 5px;
}
.tutorial-steps button.active {
  border-color: #b49aff;
  background: #38304e;
  color: #eee5ff;
}
.tutorial-card {
  border: 1px solid #454055;
  background: linear-gradient(135deg, #2a273b, #22232d);
  border-radius: 14px;
  padding: 25px;
}
.tutorial-card h3 {
  margin-top: 12px;
  font-size: 22px;
}
.tutorial-tip {
  border-left: 2px solid #a9e6d2;
  padding-left: 13px;
  font-size: 12px;
  color: #bad4cb;
}
.tutorial-status {
  display: flex;
  gap: 20px;
  margin: 16px 0;
  font-size: 11px;
  color: #a2a5b5;
}
.tutorial-controls {
  display: flex;
  justify-content: space-between;
  gap: 15px;
  margin: 22px 0;
}
.tutorial-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 15px;
  margin-bottom: 15px;
}
.help-footer > span {
  max-width: 70%;
}
@media (max-width: 800px) {
  .help-layout {
    grid-template-columns: 160px minmax(0, 1fr);
  }
  .help-content {
    padding: 20px;
  }
  .tutorial-steps {
    grid-template-columns: repeat(3, 1fr);
  }
}
</style>
