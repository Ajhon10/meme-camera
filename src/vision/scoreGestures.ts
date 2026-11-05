import { emptyScores, type GestureId, type GestureScores } from './gestureCatalog'
import type { VisionFrame } from './visionTypes'
import { scoreHand } from './gestures/handGestures'
import { scoreFace } from './gestures/faceGestures'
import { scorePose } from './gestures/poseGestures'
import { scoreCombined } from './gestures/combinedGestures'

export function gestureScores(frame: VisionFrame): GestureScores {
  const scores = emptyScores()
  const hands = frame.hands.map((hand) => scoreHand(hand.landmarks))
  for (const hand of hands) {
    for (const [id, score] of Object.entries(hand))
      scores[id as GestureId] = Math.max(scores[id as GestureId], score)
  }
  if (hands.length >= 2 && new Set(frame.hands.map((hand) => hand.side)).size === 2) {
    scores['double-peace'] = Math.min(hands[0]!.peace ?? 0, hands[1]!.peace ?? 0)
    scores['double-thumbs-up'] = Math.min(hands[0]!['thumbs-up'] ?? 0, hands[1]!['thumbs-up'] ?? 0)
  }
  Object.assign(scores, scoreFace(frame), scorePose(frame.pose))
  Object.assign(scores, scoreCombined(frame, scores))
  for (const id of Object.keys(scores) as GestureId[]) {
    scores[id] = Number.isFinite(scores[id]) ? Math.max(0, Math.min(1, scores[id])) : 0
  }
  return scores
}
