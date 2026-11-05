<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { X, Upload, Play, Save, PersonStanding, Circle, Check, Sparkles } from 'lucide-vue-next'
import { useAppStore } from '../stores/appStore'
import { gestureOptions, targetOptions, type EffectDefinition } from '../effects/effectTypes'
import { readEffectImage } from '../effects/effectStorage'
import { gestureDetails, missingDetectors } from '../vision/gestureCatalog'
import { comparePose, normalizePose, type PoseSignature } from '../vision/poseSignature'
const store = useAppStore()
const dialog = ref<HTMLDialogElement | null>(null)
const draft = ref<EffectDefinition>(
  store.editingEffect
    ? structuredClone(store.editingEffect)
    : {
        id: crypto.randomUUID(),
        name: '',
        imagePath: '',
        enabled: true,
        trigger: { type: 'hand', gesture: 'peace', similarityThreshold: 0.85 },
        target: { type: 'face', scale: 1, offsetX: 0, offsetY: 0, rotationOffset: 0 },
        display: { mode: 'while-triggered', durationMs: 3000 },
      },
)
const error = ref(''),
  saving = ref(false),
  imageLoading = ref(false),
  recording = ref(false),
  recordMessage = ref('')
const gestures = computed(() =>
  gestureOptions.filter((option) => option.type === draft.value.trigger.type),
)
const selectedGesture = computed(() => gestureDetails(draft.value.trigger.gesture))
const disabledDetectors = computed(() =>
  missingDetectors(draft.value.trigger.gesture, store.detectors),
)
let recordTimer: ReturnType<typeof setInterval> | undefined
function close() {
  store.editorOpen = false
}
function changeType() {
  draft.value.trigger.gesture = gestures.value[0]!.id
}
async function upload(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  imageLoading.value = true
  error.value = ''
  try {
    draft.value.imagePath = await readEffectImage(file)
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : String(cause)
  } finally {
    imageLoading.value = false
  }
}
function validate() {
  if (!draft.value.name.trim()) throw new Error('Give your effect a name.')
  if (!draft.value.imagePath) throw new Error('Upload a PNG, WebP, or JPEG image first.')
  if (draft.value.trigger.gesture === 'custom-pose' && !draft.value.trigger.savedPose)
    throw new Error('Record a pose before saving this effect.')
}
async function save() {
  error.value = ''
  saving.value = true
  try {
    validate()
    await store.saveEffect({
      ...JSON.parse(JSON.stringify(draft.value)),
      name: draft.value.name.trim(),
    })
    close()
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : String(cause)
  } finally {
    saving.value = false
  }
}
async function test() {
  error.value = ''
  try {
    validate()
    await store.test(draft.value)
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : String(cause)
  }
}
function cancelRecording() {
  clearInterval(recordTimer)
  recording.value = false
}
function recordPose() {
  error.value = ''
  if (store.cameraStatus !== 'running' || store.visionStatus !== 'ready' || !store.detectors.pose) {
    error.value = 'Start your camera and enable Body pose detection before recording.'
    return
  }
  recording.value = true
  const start = performance.now(),
    samples: PoseSignature[] = []
  let lastTimestamp = -1
  recordMessage.value = 'Get into position… 3'
  recordTimer = setInterval(() => {
    const elapsed = performance.now() - start
    if (elapsed < 3000) {
      recordMessage.value = `Get into position… ${Math.ceil((3000 - elapsed) / 1000)}`
      return
    }
    recordMessage.value = 'Hold your pose… Keep shoulders, elbows, wrists, and hips in view.'
    const frame = store.getFrame()
    if (frame && frame.timestamp !== lastTimestamp && performance.now() - frame.timestamp < 650) {
      lastTimestamp = frame.timestamp
      const signature = normalizePose(frame.pose)
      if (signature) samples.push(signature)
    }
    if (elapsed < 5000) return
    cancelRecording()
    if (samples.length < 6) {
      error.value =
        'Not enough visible pose landmarks. Step back so your upper body and hips are in view, then try again.'
      recordMessage.value = ''
      return
    }
    const average: PoseSignature = {
      version: 1,
      values: samples[0]!.values.map(
        (_, index) =>
          samples.reduce((sum, sample) => sum + sample.values[index]!, 0) / samples.length,
      ),
    }
    if (
      samples.filter((sample) => comparePose(sample, average) > 0.8).length <
      samples.length * 0.7
    ) {
      error.value = 'Too much movement while recording. Hold a steady pose and try again.'
      recordMessage.value = ''
      return
    }
    draft.value.trigger.savedPose = average
    recordMessage.value = `Pose captured from ${samples.length} samples. No photo saved.`
  }, 100)
}
onMounted(() => dialog.value?.showModal())
onBeforeUnmount(cancelRecording)
</script>

<template>
  <dialog ref="dialog" class="editor-dialog" @cancel.prevent="close">
    <form @submit.prevent="save">
      <div class="modal-heading">
        <div>
          <span class="eyebrow">MAKE IT PERSONAL</span>
          <h2>
            {{ store.editingEffect ? 'Edit effect' : 'Create an effect' }} <Sparkles :size="20" />
          </h2>
          <p>Your image. Your gesture. Your moment.</p>
        </div>
        <button type="button" class="icon-button" aria-label="Close effect editor" @click="close">
          <X :size="20" />
        </button>
      </div>
      <div class="editor-body">
        <div class="image-upload" :class="{ uploaded: draft.imagePath }">
          <img v-if="draft.imagePath" :src="draft.imagePath" alt="Effect image preview" /><Upload
            v-else
            :size="28"
          /><label for="effect-image">{{
            imageLoading
              ? 'Loading image…'
              : draft.imagePath
                ? 'Change image'
                : 'Upload your reaction'
          }}</label
          ><small>PNG, WebP, or JPEG · up to 5 MB · JPEG keeps its background</small
          ><input
            id="effect-image"
            type="file"
            accept="image/png,image/webp,image/jpeg"
            :disabled="imageLoading"
            @change="upload"
          />
        </div>
        <label class="field"
          >Effect name<input
            v-model="draft.name"
            maxlength="60"
            placeholder="Give your reaction a name"
            required
        /></label>
        <div class="form-row">
          <label class="field"
            >Trigger type<select
              v-model="draft.trigger.type"
              aria-label="Trigger type"
              @change="changeType"
            >
              <option value="hand">Hand gesture (19)</option>
              <option value="pose">Body pose (18)</option>
              <option value="face">Facial expression (22)</option>
              <option value="combined">Combined (12)</option>
            </select></label
          ><label class="field"
            >Gesture<select v-model="draft.trigger.gesture" aria-label="Gesture">
              <option v-for="gesture in gestures" :key="gesture.id" :value="gesture.id">
                {{ gesture.name }}
              </option>
            </select></label
          >
        </div>
        <div class="gesture-hint" aria-live="polite">
          <strong>{{ selectedGesture?.name }}</strong>
          <p>{{ selectedGesture?.description }}</p>
          <small
            >Requires: {{ selectedGesture?.detectors.join(' + ') }} detection. Hold for four
            detection frames.</small
          >
          <p v-if="disabledDetectors.length" class="gesture-warning">
            Enable {{ disabledDetectors.join(' + ') }} detection to use this trigger.
          </p>
        </div>
        <div v-if="draft.trigger.gesture === 'custom-pose'" class="pose-recorder">
          <div class="heading-with-icon">
            <PersonStanding :size="19" /><strong>Record a custom pose</strong
            ><Check v-if="draft.trigger.savedPose" :size="16" class="mint" />
          </div>
          <p>
            3 seconds to get ready, then hold still for 2 seconds. Capture your upper body,
            including hips.
          </p>
          <button type="button" class="button secondary" :disabled="recording" @click="recordPose">
            <Circle :size="14" :fill="recording ? 'currentColor' : 'none'" />{{
              recording
                ? 'Recording pose…'
                : draft.trigger.savedPose
                  ? 'Record again'
                  : 'Record pose'
            }}
          </button>
          <p v-if="recordMessage" role="status" class="record-message">{{ recordMessage }}</p>
        </div>
        <div class="form-row">
          <label class="field"
            >Attach to<select v-model="draft.target.type">
              <option v-for="target in targetOptions" :key="target" :value="target">
                {{ target.replace(/([A-Z])/g, ' $1') }}
              </option>
            </select></label
          ><label class="field"
            >Display mode<select v-model="draft.display.mode">
              <option value="while-triggered">While triggered</option>
              <option value="timed">Timed</option>
              <option value="toggle">Toggle on / off</option>
            </select></label
          >
        </div>
        <div class="slider-grid">
          <label class="range-field"
            ><span
              >Scale <output>{{ draft.target.scale.toFixed(1) }}×</output></span
            ><input
              v-model.number="draft.target.scale"
              type="range"
              min="0.2"
              max="3"
              step="0.1" /></label
          ><label class="range-field"
            ><span
              >Rotation <output>{{ draft.target.rotationOffset }}°</output></span
            ><input
              v-model.number="draft.target.rotationOffset"
              type="range"
              min="-180"
              max="180"
              step="5" /></label
          ><label class="range-field"
            ><span
              >X offset <output>{{ draft.target.offsetX.toFixed(1) }}</output></span
            ><input
              v-model.number="draft.target.offsetX"
              type="range"
              min="-2"
              max="2"
              step="0.1" /></label
          ><label class="range-field"
            ><span
              >Y offset <output>{{ draft.target.offsetY.toFixed(1) }}</output></span
            ><input v-model.number="draft.target.offsetY" type="range" min="-2" max="2" step="0.1"
          /></label>
        </div>
        <label class="range-field threshold-field"
          ><span
            >Similarity threshold
            <output>{{ Math.round(draft.trigger.similarityThreshold * 100) }}%</output></span
          ><input
            v-model.number="draft.trigger.similarityThreshold"
            type="range"
            min="0.5"
            max="0.98"
            step="0.01"
          /><small>Higher values require a closer match.</small></label
        >
        <label v-if="draft.display.mode === 'timed'" class="field"
          >Duration (milliseconds)<input
            v-model.number="draft.display.durationMs"
            type="number"
            min="250"
            max="60000"
            step="250"
            required
        /></label>
        <p v-if="draft.display.mode === 'toggle'" class="muted small-copy">
          Repeat the gesture to turn the effect off. Stopping the camera resets toggled effects.
        </p>
        <p v-if="error" class="inline-error" role="alert">{{ error }}</p>
      </div>
      <div class="modal-footer">
        <span class="muted small-copy">Saved only on this computer</span
        ><button
          type="button"
          class="button secondary"
          :disabled="recording || imageLoading"
          @click="test"
        >
          <Play :size="14" /> Test effect</button
        ><button
          type="submit"
          class="button primary"
          :disabled="saving || recording || imageLoading"
        >
          <Save :size="15" />{{ saving ? 'Saving…' : 'Save effect' }}
        </button>
      </div>
    </form>
  </dialog>
</template>
