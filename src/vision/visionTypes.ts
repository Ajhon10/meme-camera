export interface Landmark {
  x: number
  y: number
  z: number
  visibility?: number
}
export interface Hand {
  side: 'Left' | 'Right'
  landmarks: Landmark[]
}
export interface VisionFrame {
  face: Landmark[]
  hands: Hand[]
  pose: Landmark[]
  expressions: Record<string, number>
  timestamp: number
}
export interface DetectorSettings {
  face: boolean
  hands: boolean
  pose: boolean
}
export const emptyFrame = (): VisionFrame => ({
  face: [],
  hands: [],
  pose: [],
  expressions: {},
  timestamp: 0,
})
export type WorkerRequest =
  | { type: 'init'; baseUrl: string }
  | { type: 'frame'; bitmap: ImageBitmap; timestamp: number; detectors: DetectorSettings }
export type WorkerResponse =
  | { type: 'ready' }
  | { type: 'result'; frame: VisionFrame; elapsed: number }
  | { type: 'error'; message: string }
