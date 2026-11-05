export type CameraStatus = 'stopped' | 'starting' | 'running' | 'error'
export interface CameraDevice {
  deviceId: string
  label: string
}
