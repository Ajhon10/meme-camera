import type { Landmark, VisionFrame } from './visionTypes'
import type { TargetType } from '../effects/effectTypes'

export const distance = (a: Landmark, b: Landmark) => Math.hypot(a.x - b.x, a.y - b.y)
export const midpoint = (a: Landmark, b: Landmark): Landmark => ({
  x: (a.x + b.x) / 2,
  y: (a.y + b.y) / 2,
  z: (a.z + b.z) / 2,
})
export const visible = (point?: Landmark): point is Landmark =>
  !!point && (point.visibility ?? 1) >= 0.55
export function angle(a: Landmark, b: Landmark, c: Landmark): number {
  const ab = distance(a, b),
    cb = distance(c, b)
  if (ab * cb < 0.000001) return 0
  return (
    (Math.acos(
      Math.max(
        -1,
        Math.min(1, ((a.x - b.x) * (c.x - b.x) + (a.y - b.y) * (c.y - b.y)) / (ab * cb)),
      ),
    ) *
      180) /
    Math.PI
  )
}
export const handAboveShoulder = (wrist: Landmark, shoulder: Landmark) =>
  visible(wrist) && visible(shoulder) && wrist.y < shoulder.y
export const elbowBent = (shoulder: Landmark, elbow: Landmark, wrist: Landmark) =>
  angle(shoulder, elbow, wrist) < 110
export const wristNearHead = (wrist: Landmark, head: Landmark, shoulderWidth: number) =>
  distance(wrist, head) < shoulderWidth * 0.9
export const handBesideFace = (wrist: Landmark, head: Landmark, shoulderWidth: number) =>
  wristNearHead(wrist, head, shoulderWidth) && Math.abs(wrist.y - head.y) < shoulderWidth * 0.65
export const handsCloseTogether = (left: Landmark, right: Landmark, shoulderWidth: number) =>
  distance(left, right) < shoulderWidth * 0.55
export const handsAboveHead = (left: Landmark, right: Landmark, head: Landmark) =>
  left.y < head.y && right.y < head.y
export function fingerExtended(hand: Landmark[], tip: number): boolean {
  if (hand.length < 21) return false
  return (
    angle(hand[tip - 2]!, hand[tip - 1]!, hand[tip]!) > 155 &&
    distance(hand[tip]!, hand[0]!) > distance(hand[tip - 2]!, hand[0]!) * 1.12
  )
}

export interface Anchor {
  x: number
  y: number
  size: number
  rotation: number
}
export function targetAnchor(
  frame: VisionFrame,
  target: TargetType,
  width: number,
  height: number,
): Anchor | null {
  const face = frame.face,
    pose = frame.pose
  let center: Landmark | undefined,
    size = 0.2,
    rotation = 0
  if (['face', 'head', 'mouth', 'leftEye', 'rightEye', 'aboveHead'].includes(target)) {
    if (face.length < 468) return null
    center = face[1]
    size = distance(face[234]!, face[454]!) * 1.35
    rotation = Math.atan2(
      (face[263]!.y - face[33]!.y) * height,
      (face[263]!.x - face[33]!.x) * width,
    )
    if (target === 'mouth') {
      center = face[13]
      size *= 0.48
    }
    if (target === 'leftEye') {
      center = midpoint(face[362]!, face[263]!)
      size *= 0.35
    }
    if (target === 'rightEye') {
      center = midpoint(face[33]!, face[133]!)
      size *= 0.35
    }
    if (target === 'aboveHead')
      center = { ...face[10]!, y: face[10]!.y - ((size * width) / height) * 0.42 }
  } else if (['leftHand', 'rightHand', 'betweenHands'].includes(target)) {
    const left = frame.hands.find((hand) => hand.side === 'Left')?.landmarks
    const right = frame.hands.find((hand) => hand.side === 'Right')?.landmarks
    if (target === 'betweenHands') {
      if (!left || !right) return null
      center = midpoint(left[9]!, right[9]!)
      size = Math.max(0.12, distance(left[9]!, right[9]!))
    } else {
      const hand = target === 'leftHand' ? left : right
      if (!hand) return null
      center = hand[9]
      size = distance(hand[0]!, hand[9]!) * 2.4
    }
  } else {
    if (![11, 12, 23, 24].every((index) => visible(pose[index]))) return null
    const shoulders = midpoint(pose[11]!, pose[12]!),
      hips = midpoint(pose[23]!, pose[24]!)
    center = midpoint(shoulders, hips)
    size = distance(pose[11]!, pose[12]!) * (target === 'fullBody' ? 3.2 : 1.4)
    rotation = Math.atan2((pose[11]!.y - pose[12]!.y) * height, (pose[11]!.x - pose[12]!.x) * width)
  }
  return center
    ? { x: center.x * width, y: center.y * height, size: Math.max(16, size * width), rotation }
    : null
}
