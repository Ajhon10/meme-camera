import { reactive } from 'vue'
export interface NativeCameraStatus {
  supported: boolean
  available: boolean
  installed: boolean
  running: boolean
  error: string
}
declare global {
  interface Window {
    memeCamera?: {
      control(
        action: 'status' | 'install' | 'uninstall' | 'start' | 'stop',
      ): Promise<NativeCameraStatus>
      frame(data: Uint8Array): Promise<boolean>
    }
  }
}
export const nativeCamera = reactive<NativeCameraStatus & { busy: boolean }>({
  supported: false,
  available: false,
  installed: false,
  running: false,
  error: '',
  busy: false,
})
export async function cameraControl(action: 'status' | 'install' | 'uninstall' | 'start' | 'stop') {
  if (!window.memeCamera) return
  if (action !== 'status') nativeCamera.busy = true
  try {
    Object.assign(nativeCamera, await window.memeCamera.control(action))
  } catch (error) {
    nativeCamera.error = error instanceof Error ? error.message : String(error)
  } finally {
    if (action !== 'status') nativeCamera.busy = false
  }
}
let canvas: HTMLCanvasElement | undefined
let context: CanvasRenderingContext2D | null | undefined
let pending = false,
  last = 0
export function publishNativeFrame(source: HTMLCanvasElement, now: number) {
  if (!nativeCamera.running || pending || now - last < 1000 / 30 || !window.memeCamera) return
  last = now
  if (!canvas) {
    canvas = document.createElement('canvas')
    canvas.width = 1280
    canvas.height = 720
    context = canvas.getContext('2d', { alpha: false, willReadFrequently: true })
  }
  if (!context) return
  context.fillStyle = '#000'
  context.fillRect(0, 0, 1280, 720)
  const scale = Math.min(1280 / source.width, 720 / source.height)
  const width = source.width * scale,
    height = source.height * scale
  context.drawImage(source, (1280 - width) / 2, (720 - height) / 2, width, height)
  const pixels = context.getImageData(0, 0, 1280, 720)
  pending = true
  void window.memeCamera
    .frame(new Uint8Array(pixels.data.buffer))
    .then((active) => {
      if (!active) {
        nativeCamera.running = false
        void cameraControl('status')
      }
    })
    .catch((error: unknown) => {
      nativeCamera.error = String(error)
      void cameraControl('stop')
    })
    .finally(() => {
      pending = false
    })
}
