import type { PoseSignature } from '../vision/poseSignature'

import type { GestureId } from '../vision/gestureCatalog'
export { gestureOptions, gestureName, type GestureId } from '../vision/gestureCatalog'
export const targetOptions = [
  'face',
  'head',
  'mouth',
  'leftEye',
  'rightEye',
  'chest',
  'leftHand',
  'rightHand',
  'betweenHands',
  'aboveHead',
  'fullBody',
] as const
export type TargetType = (typeof targetOptions)[number]
export interface EffectDefinition {
  id: string
  name: string
  imagePath: string
  enabled: boolean
  builtin?: boolean
  source?: 'user-pack'
  color?: string
  trigger: {
    type: 'hand' | 'pose' | 'face' | 'combined'
    gesture: GestureId
    similarityThreshold: number
    savedPose?: PoseSignature
  }
  target: {
    type: TargetType
    offsetX: number
    offsetY: number
    scale: number
    rotationOffset: number
  }
  display: { mode: 'while-triggered' | 'timed' | 'toggle'; durationMs: number }
}
