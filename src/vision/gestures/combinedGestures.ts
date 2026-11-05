import type { VisionFrame } from '../visionTypes'
import type { GestureScores } from '../gestureCatalog'
import { distance, midpoint } from '../landmarkUtils'
import { handShape } from './handGestures'

export function scoreCombined(frame: VisionFrame, scores: GestureScores): Partial<GestureScores> {
  if (frame.face.length < 468) return {}
  const face = frame.face,
    width = distance(face[234]!, face[454]!)
  if (width < 0.03) return {}
  const chin = face[152]!,
    mouth = midpoint(face[13]!, face[14]!),
    forehead = face[10]!
  let nearChin = 0,
    coverMouth = 0,
    facepalm = 0,
    cheek = 0,
    shush = 0
  let leftPalm = false,
    rightPalm = false
  // A proximity plateau tolerates landmark jitter, then fades to zero with distance.
  const near = (d: number) => Math.max(0, Math.min(1, (0.6 - d / width) / 0.35))
  for (const { landmarks: hand } of frame.hands) {
    const shape = handShape(hand)
    if (!shape) continue
    const palm = midpoint(hand[0]!, hand[9]!)
    nearChin = Math.max(
      nearChin,
      near(Math.min(distance(hand[8]!, chin), distance(hand[0]!, chin))),
    )
    coverMouth = Math.max(
      coverMouth,
      near(Math.min(distance(palm, mouth), distance(hand[9]!, mouth))),
    )
    facepalm = Math.max(facepalm, near(distance(palm, forehead)))
    cheek = Math.max(cheek, near(Math.min(distance(palm, face[234]!), distance(palm, face[454]!))))
    if (
      shape.index &&
      !shape.middle &&
      !shape.ring &&
      !shape.pinky &&
      hand[8]!.y < hand[5]!.y &&
      Math.abs(hand[8]!.x - hand[5]!.x) < shape.size * 0.5
    )
      shush = Math.max(shush, near(Math.min(distance(hand[8]!, mouth), distance(hand[7]!, mouth))))
    if (shape.open && Math.abs(palm.y - face[1]!.y) < width * 0.8) {
      const dx = (palm.x - face[1]!.x) / width
      if (dx > 0.45 && dx < 1.5) leftPalm = true
      if (dx < -0.45 && dx > -1.5) rightPalm = true
    }
  }
  return {
    'near-chin': nearChin,
    'cover-mouth': coverMouth,
    facepalm,
    'cheek-rest': cheek,
    shush,
    'frame-face': leftPalm && rightPalm ? 1 : 0,
    'smile-peace': Math.min(scores.smile, scores.peace),
    'smile-thumbs-up': Math.min(scores.smile, scores['thumbs-up']),
    'surprised-hands': Math.min(scores.surprised, scores['hands-raised']),
    'laugh-cover-mouth': Math.min(scores.smile, coverMouth),
    'closed-eyes-prayer': Math.min(scores['eyes-closed'], scores['hands-at-chest']),
    thinking: Math.min(scores['brow-furrow'], nearChin),
  }
}
