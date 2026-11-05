import { defineStore } from 'pinia'
import { ref, shallowRef, watch } from 'vue'
import type { CameraDevice, CameraStatus } from '../camera/cameraTypes'
import type { DetectorSettings, VisionFrame } from '../vision/visionTypes'
import type { EffectDefinition } from '../effects/effectTypes'
import { defaultEffects } from '../effects/defaultEffects'
import { loadEffects, persistEffect, deleteEffect } from '../effects/effectStorage'

export interface CameraRuntime {
  start(): Promise<void>
  stop(): void
  refresh(): Promise<void>
  restartVision(): Promise<void>
  test(effect: EffectDefinition): Promise<void>
  getFrame(): VisionFrame
  getProcessedStream(): MediaStream
}
let runtime: CameraRuntime | null = null
export const useAppStore = defineStore('app', () => {
  const tab = ref<'camera' | 'effects'>('camera')
  const error = ref('')
  const cameras = ref<CameraDevice[]>([])
  const selectedCamera = ref('')
  const cameraStatus = ref<CameraStatus>('stopped')
  const visionStatus = ref<'idle' | 'loading' | 'ready' | 'error'>('idle')
  const visionError = ref('')
  const detectors = ref<DetectorSettings>({ face: true, hands: true, pose: true })
  const mirror = ref(true)
  const showLandmarks = ref(false)
  const inferenceLimit = ref(20)
  const renderFps = ref(0),
    inferenceFps = ref(0),
    inferenceMs = ref(0)
  const resolution = ref('1280 × 720')
  const detectedGesture = ref(''),
    confidence = ref(0)
  const activeEffects = ref<string[]>([])
  const detected = ref({ face: false, hands: 0, pose: false })
  const streamStatus = ref('Stopped')
  const effects = shallowRef<EffectDefinition[]>(structuredClone(defaultEffects))
  const editorOpen = ref(false),
    settingsOpen = ref(false),
    cleanOutput = ref(false)
  const editingEffect = shallowRef<EffectDefinition | null>(null)
  const notice = ref('')
  let noticeTimer: ReturnType<typeof setTimeout> | undefined

  function notify(message: string) {
    notice.value = message
    clearTimeout(noticeTimer)
    noticeTimer = setTimeout(() => {
      notice.value = ''
    }, 4500)
  }
  function report(cause: unknown) {
    error.value = cause instanceof Error ? cause.message : String(cause)
  }
  async function initialize() {
    try {
      const text = localStorage.getItem('memecam-settings')
      if (text) {
        const saved = JSON.parse(text) as Record<string, unknown>
        if (typeof saved.mirror === 'boolean') mirror.value = saved.mirror
        if (typeof saved.selectedCamera === 'string') selectedCamera.value = saved.selectedCamera
        if (
          typeof saved.inferenceLimit === 'number' &&
          [10, 15, 20, 30].includes(saved.inferenceLimit)
        )
          inferenceLimit.value = saved.inferenceLimit
        if (saved.detectors && typeof saved.detectors === 'object') {
          const flags = saved.detectors as Record<string, unknown>
          for (const key of ['face', 'hands', 'pose'] as const)
            if (typeof flags[key] === 'boolean') detectors.value[key] = flags[key]
        }
      }
      const savedEffects = await loadEffects()
      effects.value = [
        ...defaultEffects.map(
          (effect) =>
            savedEffects.find((saved) => saved.id === effect.id) ?? structuredClone(effect),
        ),
        ...savedEffects.filter((effect) => !defaultEffects.some((item) => item.id === effect.id)),
      ]
    } catch (cause) {
      report(cause)
    }
  }
  watch(
    [mirror, selectedCamera, inferenceLimit, detectors],
    () => {
      try {
        localStorage.setItem(
          'memecam-settings',
          JSON.stringify({
            mirror: mirror.value,
            selectedCamera: selectedCamera.value,
            inferenceLimit: inferenceLimit.value,
            detectors: detectors.value,
          }),
        )
      } catch (cause) {
        report(cause)
      }
    },
    { deep: true },
  )
  function attach(value: CameraRuntime | null) {
    runtime = value
  }
  async function start() {
    await runtime?.start()
  }
  function stop() {
    runtime?.stop()
  }
  async function refresh() {
    await runtime?.refresh()
  }
  async function switchCamera(id: string) {
    selectedCamera.value = id
    if (cameraStatus.value === 'running' || cameraStatus.value === 'starting') await start()
  }
  async function restartVision() {
    await runtime?.restartVision()
  }
  function getFrame() {
    return runtime?.getFrame()
  }
  function getProcessedStream() {
    if (!runtime || cameraStatus.value !== 'running') throw new Error('Start the camera first.')
    return runtime.getProcessedStream()
  }
  function openEditor(effect?: EffectDefinition) {
    editingEffect.value = effect ? structuredClone(effect) : null
    editorOpen.value = true
  }
  async function saveEffect(effect: EffectDefinition) {
    await persistEffect(effect)
    effects.value = effects.value.some((item) => item.id === effect.id)
      ? effects.value.map((item) => (item.id === effect.id ? effect : item))
      : [...effects.value, effect]
    notify('Effect saved to your local library.')
  }
  async function toggleEffect(id: string) {
    const effect = effects.value.find((item) => item.id === id)
    if (!effect) return
    try {
      await saveEffect({ ...effect, enabled: !effect.enabled })
    } catch (cause) {
      report(cause)
    }
  }
  async function removeEffect(id: string) {
    try {
      await deleteEffect(id)
      effects.value = effects.value.filter((effect) => effect.id !== id)
      notify('Effect deleted.')
    } catch (cause) {
      report(cause)
    }
  }
  async function test(effect: EffectDefinition) {
    if (cameraStatus.value !== 'running')
      throw new Error('Start your camera before testing an effect.')
    if (visionStatus.value !== 'ready')
      throw new Error('Wait for detection to be ready before testing.')
    await runtime?.test(effect)
    notify('Testing for 3 seconds. Keep the selected body target in view.')
  }
  return {
    tab,
    error,
    cameras,
    selectedCamera,
    cameraStatus,
    visionStatus,
    visionError,
    detectors,
    mirror,
    showLandmarks,
    inferenceLimit,
    renderFps,
    inferenceFps,
    inferenceMs,
    resolution,
    detectedGesture,
    confidence,
    activeEffects,
    detected,
    streamStatus,
    effects,
    editorOpen,
    settingsOpen,
    cleanOutput,
    editingEffect,
    notice,
    initialize,
    attach,
    start,
    stop,
    refresh,
    switchCamera,
    restartVision,
    getFrame,
    getProcessedStream,
    openEditor,
    saveEffect,
    toggleEffect,
    removeEffect,
    test,
    notify,
    report,
  }
})
