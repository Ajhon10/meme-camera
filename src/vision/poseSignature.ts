import { distance, midpoint, visible } from './landmarkUtils'
import type { Landmark } from './visionTypes'

// Upper-body joints keep seated recordings useful; normalize translation and camera distance.
const joints = [11, 12, 13, 14, 15, 16, 23, 24]
export interface PoseSignature {
  version: 1
  values: number[]
}
export function normalizePose(pose: Landmark[]): PoseSignature | null {
  if (!joints.every((index) => visible(pose[index]))) return null
  const center = midpoint(pose[11]!, pose[12]!)
  const scale = distance(pose[11]!, pose[12]!)
  if (scale < 0.04) return null
  return {
    version: 1,
    values: joints.flatMap((index) => [
      (pose[index]!.x - center.x) / scale,
      (pose[index]!.y - center.y) / scale,
    ]),
  }
}
export function comparePose(current: PoseSignature | null, saved: PoseSignature | null): number {
  if (!current || !saved || current.values.length !== 16 || saved.values.length !== 16) return 0
  const squared = current.values.reduce(
    (sum, value, index) => sum + (value - saved.values[index]!) ** 2,
    0,
  )
  return Math.max(0, Math.min(1, Math.exp(-3 * Math.sqrt(squared / current.values.length))))
}
