export interface VideoOutputProvider {
  start(): Promise<void>
  stop(): Promise<void>
  getStatus(): string
}
export class PreviewOutputProvider implements VideoOutputProvider {
  private running = false
  async start() {
    this.running = true
  }
  async stop() {
    this.running = false
  }
  getStatus() {
    return this.running ? 'Preview running' : 'Preview stopped'
  }
}
export class CanvasStreamOutputProvider implements VideoOutputProvider {
  private stream: MediaStream | null = null
  constructor(private canvas: HTMLCanvasElement) {}
  async start() {
    this.getProcessedStream()
  }
  async stop() {
    this.stream?.getTracks().forEach((track) => track.stop())
    this.stream = null
  }
  getProcessedStream(): MediaStream {
    if (!this.stream?.active) this.stream = this.canvas.captureStream(30)
    return this.stream
  }
  getStatus() {
    if (!this.stream?.active) return 'Stopped'
    const fps = this.stream.getVideoTracks()[0]?.getSettings().frameRate
    return `Running · ${fps ? Math.round(fps) : 30} FPS requested`
  }
}
// Native Windows output is connected through nativeCamera.ts before debug rendering.
