import type { DetectorSettings, VisionFrame, WorkerRequest, WorkerResponse } from './visionTypes'

export class VisionManager {
  private worker: Worker | null = null
  private busy = false
  private ready = false
  private lastSubmitted = 0
  private lastVideoTime = -1
  private timeout: ReturnType<typeof setTimeout> | undefined
  private initialization: Promise<void> | null = null
  private rejectInitialization: ((reason: Error) => void) | null = null
  onFrame: (frame: VisionFrame, elapsed: number) => void = () => {}
  onError: (message: string) => void = () => {}

  initialize(): Promise<void> {
    if (this.initialization) return this.initialization
    const baseUrl = new URL('./', window.location.href).href
    this.worker = new Worker(new URL('vision-worker.js', baseUrl))
    this.initialization = new Promise<void>((resolve, reject) => {
      this.rejectInitialization = reject
      const fail = (message: string) => {
        clearTimeout(this.timeout)
        this.busy = false
        this.ready = false
        reject(new Error(message))
        this.onError(message)
      }
      this.timeout = setTimeout(
        () => fail('Vision startup timed out. Restart detection or run npm run setup:assets.'),
        90000,
      )
      this.worker!.onerror = (event) => fail(event.message || 'Vision worker failed to start.')
      this.worker!.onmessage = (event: MessageEvent<WorkerResponse>) => {
        if (event.data.type === 'ready') {
          clearTimeout(this.timeout)
          this.ready = true
          this.rejectInitialization = null
          resolve()
        } else if (event.data.type === 'result') {
          clearTimeout(this.timeout)
          this.busy = false
          this.onFrame(event.data.frame, event.data.elapsed)
        } else fail(event.data.message)
      }
      this.worker!.postMessage({ type: 'init', baseUrl } satisfies WorkerRequest)
    })
    return this.initialization
  }

  async infer(
    video: HTMLVideoElement,
    timestamp: number,
    detectors: DetectorSettings,
    fps: number,
  ): Promise<void> {
    if (
      !this.ready ||
      this.busy ||
      timestamp - this.lastSubmitted < 1000 / fps ||
      video.currentTime === this.lastVideoTime ||
      !Object.values(detectors).some(Boolean)
    )
      return
    this.busy = true
    this.lastSubmitted = timestamp
    this.lastVideoTime = video.currentTime
    const worker = this.worker
    try {
      const width = Math.min(640, video.videoWidth)
      const bitmap = await createImageBitmap(video, {
        resizeWidth: width,
        resizeHeight: Math.round((width * video.videoHeight) / video.videoWidth),
      })
      if (worker !== this.worker || !this.ready) {
        bitmap.close()
        return
      }
      worker!.postMessage(
        { type: 'frame', bitmap, timestamp, detectors: { ...detectors } } satisfies WorkerRequest,
        [bitmap],
      )
      this.timeout = setTimeout(() => {
        this.ready = false
        this.busy = false
        this.onError('Vision inference timed out. Restart detection to try again.')
      }, 15000)
    } catch (error) {
      this.busy = false
      this.ready = false
      this.onError(error instanceof Error ? error.message : String(error))
    }
  }

  dispose() {
    clearTimeout(this.timeout)
    this.rejectInitialization?.(new Error('Vision initialization cancelled.'))
    this.rejectInitialization = null
    this.worker?.terminate()
    this.worker = null
    this.ready = false
    this.busy = false
    this.initialization = null
    this.lastVideoTime = -1
  }
}
