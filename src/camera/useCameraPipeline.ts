import { onMounted, onBeforeUnmount, watch, type Ref } from 'vue'
import { CameraManager } from './cameraManager'
import { VisionManager } from '../vision/visionManager'
import { emptyFrame } from '../vision/visionTypes'
import { EffectEngine } from '../effects/effectEngine'
import { CanvasStreamOutputProvider, PreviewOutputProvider } from '../output/videoOutputProvider'
import { drawLandmarks } from '../vision/drawLandmarks'
import { useAppStore } from '../stores/appStore'
import { cameraControl, publishNativeFrame } from '../output/nativeCamera'

export function useCameraPipeline(
  canvas: Ref<HTMLCanvasElement | null>,
  video: Ref<HTMLVideoElement | null>,
) {
  const store = useAppStore()
  const camera = new CameraManager(),
    vision = new VisionManager(),
    effects = new EffectEngine()
  const preview = new PreviewOutputProvider()
  let output: CanvasStreamOutputProvider | null = null
  let frame = emptyFrame(),
    animation = 0,
    rendered = 0,
    inferred = 0
  let measurement = performance.now(),
    published = 0,
    lastInferenceAt = 0,
    sessionStarted = 0,
    lastInferenceMs = 0,
    lastDraw = 0
  let alive = true,
    cameraGeneration = 0,
    visionGeneration = 0
  let context: CanvasRenderingContext2D | null = null

  function resetDetection() {
    frame = emptyFrame()
    effects.reset()
    store.detected = { face: false, hands: 0, pose: false }
    store.detectedGesture = ''
    store.confidence = 0
    store.activeEffects = []
  }
  vision.onFrame = (result, elapsed) => {
    if (store.cameraStatus !== 'running' || result.timestamp < sessionStarted) return
    frame = result
    if (!store.detectors.face) {
      frame.face = []
      frame.expressions = {}
    }
    if (!store.detectors.hands) frame.hands = []
    if (!store.detectors.pose) frame.pose = []
    lastInferenceAt = performance.now()
    inferred++
    lastInferenceMs = Math.round(elapsed)
    effects.update(frame, performance.now())
  }
  vision.onError = (message) => {
    store.visionStatus = 'error'
    store.visionError = message
    resetDetection()
  }
  effects.onError = store.report
  async function refresh() {
    try {
      store.cameras = await camera.enumerate()
      if (!store.cameras.some((device) => device.deviceId === store.selectedCamera))
        store.selectedCamera = store.cameras[0]?.deviceId ?? ''
    } catch (error) {
      store.report(error)
    }
  }
  function stop() {
    void cameraControl('stop')
    cameraGeneration++
    cancelAnimationFrame(animation)
    camera.stop()
    if (video.value) video.value.srcObject = null
    void output?.stop()
    void preview.stop()
    context?.clearRect(0, 0, canvas.value!.width, canvas.value!.height)
    store.cameraStatus = 'stopped'
    store.streamStatus = 'Stopped'
    store.renderFps = 0
    store.inferenceFps = 0
    store.inferenceMs = 0
    lastInferenceMs = 0
    resetDetection()
  }
  async function restartVision() {
    const generation = ++visionGeneration
    vision.dispose()
    resetDetection()
    store.visionStatus = 'loading'
    store.visionError = ''
    try {
      await vision.initialize()
      if (alive && generation === visionGeneration) store.visionStatus = 'ready'
    } catch (error) {
      if (alive && generation === visionGeneration) {
        store.visionStatus = 'error'
        store.visionError = error instanceof Error ? error.message : String(error)
      }
    }
  }
  async function start() {
    if (!video.value || !canvas.value) return
    stop()
    const generation = cameraGeneration
    store.error = ''
    store.cameraStatus = 'starting'
    try {
      if (
        !(await camera.start(store.selectedCamera, video.value)) ||
        !alive ||
        generation !== cameraGeneration
      )
        return
      store.selectedCamera = camera.getDeviceId()
      canvas.value.width = video.value.videoWidth
      canvas.value.height = video.value.videoHeight
      context = canvas.value.getContext('2d', { alpha: false })
      if (!context) throw new Error('Canvas 2D is unavailable on this computer.')
      store.resolution = `${canvas.value.width} × ${canvas.value.height}`
      store.cameraStatus = 'running'
      frame = emptyFrame()
      sessionStarted = performance.now()
      await output!.start()
      await preview.start()
      store.streamStatus = output!.getStatus()
      rendered = 0
      inferred = 0
      measurement = performance.now()
      animation = requestAnimationFrame(render)
      await refresh()
      if (store.visionStatus === 'idle' || store.visionStatus === 'error') void restartVision()
    } catch (error) {
      if (generation === cameraGeneration) {
        stop()
        store.cameraStatus = 'error'
        store.report(error)
      }
    }
  }
  function render(now: number) {
    if (!context || !video.value || !canvas.value || store.cameraStatus !== 'running') return
    const interval = 1000 / 60
    if (now - lastDraw < interval) {
      animation = requestAnimationFrame(render)
      return
    }
    lastDraw = now - ((now - lastDraw) % interval)
    const { width, height } = canvas.value
    if (video.value.readyState >= 2) {
      if (frame.timestamp && now - lastInferenceAt > 650) resetDetection()
      context.save()
      if (store.mirror) {
        context.translate(width, 0)
        context.scale(-1, 1)
      }
      context.drawImage(video.value, 0, 0, width, height)
      effects.render(context, frame, now)
      publishNativeFrame(canvas.value, now)
      if (store.showLandmarks && !store.cleanOutput) drawLandmarks(context, frame, width, height)
      context.restore()
      rendered++
      void vision.infer(video.value, now, store.detectors, store.inferenceLimit)
    }
    if (now - published > 250) {
      store.inferenceMs = lastInferenceMs
      store.detectedGesture = effects.detectedGesture
      store.confidence = effects.confidence
      store.activeEffects = [...effects.activeNames]
      store.detected = {
        face: frame.face.length > 0,
        hands: frame.hands.length,
        pose: frame.pose.length > 0,
      }
      published = now
    }
    if (now - measurement >= 1000) {
      store.renderFps = Math.round((rendered * 1000) / (now - measurement))
      store.inferenceFps = Math.round((inferred * 1000) / (now - measurement))
      rendered = 0
      inferred = 0
      measurement = now
    }
    animation = requestAnimationFrame(render)
  }
  watch(
    () => store.effects,
    (value) => {
      void effects.setEffects(value)
    },
    { immediate: true },
  )
  watch(() => ({ ...store.detectors }), resetDetection)
  camera.onDisconnected = () => {
    stop()
    store.cameraStatus = 'error'
    store.error = 'Your camera disconnected. Reconnect it and start the camera again.'
    void refresh()
  }
  const deviceChanged = () => {
    void refresh()
  }
  onMounted(() => {
    output = new CanvasStreamOutputProvider(canvas.value!)
    store.attach({
      start,
      stop,
      refresh,
      restartVision,
      test: (effect) => effects.testEffect(effect),
      getFrame: () => frame,
      getProcessedStream: () => output!.getProcessedStream(),
    })
    navigator.mediaDevices?.addEventListener('devicechange', deviceChanged)
    void refresh()
  })
  onBeforeUnmount(() => {
    alive = false
    stop()
    vision.dispose()
    store.attach(null)
    navigator.mediaDevices?.removeEventListener('devicechange', deviceChanged)
  })
}
