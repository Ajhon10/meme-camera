import type { CameraDevice } from './cameraTypes'

export class CameraManager {
  private stream: MediaStream | null = null
  private generation = 0
  onDisconnected: () => void = () => {}

  async enumerate(): Promise<CameraDevice[]> {
    if (!navigator.mediaDevices) throw new Error('Camera access requires Electron or localhost.')
    const devices = await navigator.mediaDevices.enumerateDevices()
    return devices
      .filter((device) => device.kind === 'videoinput' && !device.label.startsWith('MemeCam'))
      .map((device, index) => ({
        deviceId: device.deviceId,
        label: device.label || `Camera ${index + 1}`,
      }))
  }

  async start(deviceId: string, video: HTMLVideoElement): Promise<boolean> {
    this.stop()
    const generation = this.generation
    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          ...(deviceId ? { deviceId: { exact: deviceId } } : {}),
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30, max: 30 },
        },
      })
    } catch (error) {
      if (generation !== this.generation) return false
      throw new Error(cameraError(error))
    }
    if (generation !== this.generation) {
      stream.getTracks().forEach((track) => track.stop())
      return false
    }
    this.stream = stream
    stream.getVideoTracks()[0]?.addEventListener(
      'ended',
      () => {
        if (this.stream === stream) {
          this.stop()
          this.onDisconnected()
        }
      },
      { once: true },
    )
    video.srcObject = stream
    try {
      await video.play()
    } catch (error) {
      if (generation !== this.generation) return false
      this.stop()
      throw error
    }
    return generation === this.generation
  }

  getDeviceId() {
    return this.stream?.getVideoTracks()[0]?.getSettings().deviceId ?? ''
  }
  stop() {
    this.generation++
    this.stream?.getTracks().forEach((track) => track.stop())
    this.stream = null
  }
}

export function cameraError(error: unknown): string {
  if (!(error instanceof Error)) return 'Could not start the camera.'
  switch (error.name) {
    case 'NotAllowedError':
      return 'Camera permission was denied. In Windows Settings → Privacy & security → Camera, enable camera access for desktop apps, then try again.'
    case 'NotFoundError':
      return 'No camera found. Connect a webcam and refresh the camera list.'
    case 'NotReadableError':
      return 'The camera is unavailable. Close other apps using it and try again.'
    case 'OverconstrainedError':
      return 'The selected camera is no longer available. Refresh and choose another camera.'
    default:
      return error.message
  }
}
