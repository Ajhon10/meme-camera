import type { Landmark } from '../visionTypes'
import type { GestureScores } from '../gestureCatalog'
import {
  angle,
  distance,
  handBesideFace,
  handsAboveHead,
  midpoint,
  visible,
} from '../landmarkUtils'

export function scorePose(pose: Landmark[]): Partial<GestureScores> {
  const scores: Partial<GestureScores> = {}
  const has = (...indices: number[]) => indices.every((index) => visible(pose[index]))
  if (!has(11, 12)) return scores
  const left = pose[11]!,
    right = pose[12]!,
    width = distance(left, right)
  if (width < 0.04) return scores
  const shoulders = midpoint(left, right)
  const rule = (condition: boolean) => (condition ? 1 : 0)
  if (has(0, 15, 16)) {
    const head = pose[0]!,
      lw = pose[15]!,
      rw = pose[16]!
    scores['hands-raised'] = rule(handsAboveHead(lw, rw, head))
    scores['left-hand-raised'] = rule(lw.y < head.y && rw.y > head.y + width * 0.15)
    scores['right-hand-raised'] = rule(rw.y < head.y && lw.y > head.y + width * 0.15)
    scores['hands-beside-head'] = rule(
      handBesideFace(lw, head, width) && handBesideFace(rw, head, width),
    )
  }
  if (has(13, 14, 15, 16)) {
    const le = pose[13]!,
      re = pose[14]!,
      lw = pose[15]!,
      rw = pose[16]!
    const la = angle(left, le, lw),
      ra = angle(right, re, rw)
    const leftOut =
      la > 155 &&
      Math.abs(lw.y - left.y) < width * 0.3 &&
      Math.abs(lw.x - shoulders.x) > width * 0.95
    const rightOut =
      ra > 155 &&
      Math.abs(rw.y - right.y) < width * 0.3 &&
      Math.abs(rw.x - shoulders.x) > width * 0.95
    scores['t-pose'] = rule(leftOut && rightOut)
    scores['left-arm-out'] = rule(leftOut && rw.y > right.y + width * 0.45)
    scores['right-arm-out'] = rule(rightOut && lw.y > left.y + width * 0.45)
    scores.goalpost = rule(
      la > 65 &&
        la < 115 &&
        ra > 65 &&
        ra < 115 &&
        Math.abs(le.y - left.y) < width * 0.25 &&
        Math.abs(re.y - right.y) < width * 0.25 &&
        Math.abs(le.x - shoulders.x) > width * 0.65 &&
        Math.abs(re.x - shoulders.x) > width * 0.65 &&
        lw.y < le.y - width * 0.35 &&
        rw.y < re.y - width * 0.35,
    )
    scores['arms-crossed'] = rule(
      distance(lw, right) < width * 0.6 &&
        distance(rw, left) < width * 0.6 &&
        lw.y > shoulders.y - width * 0.1 &&
        rw.y > shoulders.y - width * 0.1,
    )
    if (has(0)) {
      const head = pose[0]!
      scores['dab-left'] = rule(
        la > 150 &&
          lw.y < left.y - width * 0.25 &&
          Math.abs(lw.x - shoulders.x) > width &&
          ra < 120 &&
          distance(rw, head) < width * 0.6,
      )
      scores['dab-right'] = rule(
        ra > 150 &&
          rw.y < right.y - width * 0.25 &&
          Math.abs(rw.x - shoulders.x) > width &&
          la < 120 &&
          distance(lw, head) < width * 0.6,
      )
    }
  }
  if (has(15, 16, 23, 24)) {
    const lw = pose[15]!,
      rw = pose[16]!,
      hips = midpoint(pose[23]!, pose[24]!)
    const chest = { ...shoulders, y: shoulders.y + (hips.y - shoulders.y) * 0.35 }
    scores['hands-on-hips'] = rule(
      distance(lw, pose[23]!) < width * 0.35 && distance(rw, pose[24]!) < width * 0.35,
    )
    scores['hands-together'] = rule(
      distance(lw, rw) < width * 0.3 &&
        Math.abs(midpoint(lw, rw).x - shoulders.x) < width * 0.45 &&
        lw.y > shoulders.y &&
        rw.y > shoulders.y &&
        lw.y < hips.y + width * 0.2 &&
        rw.y < hips.y + width * 0.2,
    )
    scores['hands-at-chest'] = rule(
      distance(lw, chest) < width * 0.4 &&
        distance(rw, chest) < width * 0.4 &&
        distance(lw, rw) < width * 0.35,
    )
  }
  if (has(23, 24)) {
    const hips = midpoint(pose[23]!, pose[24]!)
    const direction = Math.sign(left.x - right.x)
    const lean = ((shoulders.x - hips.x) * direction) / width
    scores['lean-left'] = rule(lean > 0.3)
    scores['lean-right'] = rule(lean < -0.3)
  }
  if (has(23, 24, 25, 26, 27, 28)) {
    scores.crouch = rule(
      angle(pose[23]!, pose[25]!, pose[27]!) < 125 &&
        angle(pose[24]!, pose[26]!, pose[28]!) < 125 &&
        pose[23]!.y < pose[25]!.y &&
        pose[24]!.y < pose[26]!.y,
    )
  }
  return scores
}
