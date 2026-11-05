import type { VisionFrame } from '../visionTypes'
import type { GestureScores } from '../gestureCatalog'
import { distance } from '../landmarkUtils'

const clamp = (value: number) => Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0))
export function scoreFace(frame: VisionFrame): Partial<GestureScores> {
  if (frame.face.length < 468) return {}
  const value = (name: string) => clamp(frame.expressions[name] ?? 0)
  const both = (left: string, right: string, strong = 0.6) =>
    clamp(Math.min(value(left), value(right)) / strong)
  const leftBlink = value('eyeBlinkLeft'),
    rightBlink = value('eyeBlinkRight')
  const leftSmile = value('mouthSmileLeft'),
    rightSmile = value('mouthSmileRight')
  const mouth = clamp(value('jawOpen') / 0.6)
  const scores: Partial<GestureScores> = {
    smile: both('mouthSmileLeft', 'mouthSmileRight'),
    'mouth-open': mouth,
    'eyes-closed': both('eyeBlinkLeft', 'eyeBlinkRight', 0.7),
    'wink-left': rightBlink < 0.3 ? clamp(leftBlink / 0.7) : 0,
    'wink-right': leftBlink < 0.3 ? clamp(rightBlink / 0.7) : 0,
    'brows-up': clamp(
      Math.max(
        value('browInnerUp'),
        Math.min(value('browOuterUpLeft'), value('browOuterUpRight')),
      ) / 0.55,
    ),
    'brow-furrow': both('browDownLeft', 'browDownRight', 0.5),
    surprised: Math.min(mouth, both('eyeWideLeft', 'eyeWideRight', 0.45)),
    squint:
      Math.max(leftBlink, rightBlink) < 0.65 ? both('eyeSquintLeft', 'eyeSquintRight', 0.55) : 0,
    kiss: clamp(value('mouthPucker') / 0.65),
    frown: both('mouthFrownLeft', 'mouthFrownRight', 0.45),
    'nose-scrunch': both('noseSneerLeft', 'noseSneerRight', 0.5),
    'jaw-left': clamp(value('jawLeft') / 0.5),
    'jaw-right': clamp(value('jawRight') / 0.5),
    'smirk-left': rightSmile < 0.3 ? clamp(leftSmile / 0.6) : 0,
    'smirk-right': leftSmile < 0.3 ? clamp(rightSmile / 0.6) : 0,
    'look-left': both('eyeLookOutLeft', 'eyeLookInRight', 0.6),
    'look-right': both('eyeLookInLeft', 'eyeLookOutRight', 0.6),
    'look-up': both('eyeLookUpLeft', 'eyeLookUpRight', 0.6),
    'look-down': both('eyeLookDownLeft', 'eyeLookDownRight', 0.6),
  }
  const rightEye = frame.face[33]!,
    leftEye = frame.face[263]!
  if (distance(rightEye, leftEye) > 0.03 && leftEye.x > rightEye.x) {
    // Relative eye height measures roll without depending on distance from camera.
    const roll = (leftEye.y - rightEye.y) / (leftEye.x - rightEye.x)
    scores['head-tilt-left'] = clamp((roll - 0.15) / 0.3)
    scores['head-tilt-right'] = clamp((-roll - 0.15) / 0.3)
  }
  return scores
}
