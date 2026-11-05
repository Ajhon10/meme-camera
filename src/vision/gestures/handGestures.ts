import type { Landmark } from '../visionTypes'
import { angle, distance, fingerExtended } from '../landmarkUtils'
import type { GestureScores } from '../gestureCatalog'

export function handShape(hand: Landmark[]) {
  if (hand.length < 21 || !hand.every((p) => Number.isFinite(p.x) && Number.isFinite(p.y)))
    return null
  const size = distance(hand[0]!, hand[9]!)
  if (size < 0.025) return null
  const index = fingerExtended(hand, 8),
    middle = fingerExtended(hand, 12)
  const ring = fingerExtended(hand, 16),
    pinky = fingerExtended(hand, 20)
  const thumb =
    angle(hand[2]!, hand[3]!, hand[4]!) > 145 &&
    distance(hand[4]!, hand[17]!) > distance(hand[2]!, hand[17]!) * 1.25
  // A tucked thumb touching a curled index finger is a fist, not a pinch.
  const touching =
    distance(hand[4]!, hand[8]!) / size < 0.3 && distance(hand[8]!, hand[0]!) > size * 1.15
  return {
    index,
    middle,
    ring,
    pinky,
    thumb,
    touching,
    size,
    open: index && middle && ring && pinky && thumb,
  }
}

export function scoreHand(hand: Landmark[]): Partial<GestureScores> {
  const shape = handShape(hand)
  if (!shape) return {}
  const { index, middle, ring, pinky, thumb, touching, size, open } = shape
  const folded = !index && !middle && !ring && !pinky
  const pointing = index && !middle && !ring && !pinky && !touching
  const dx = hand[8]!.x - hand[5]!.x,
    dy = hand[8]!.y - hand[5]!.y
  const up = folded && thumb && hand[4]!.y < hand[3]!.y - size * 0.12 && hand[4]!.y < hand[5]!.y
  const down = folded && thumb && hand[4]!.y > hand[3]!.y + size * 0.12 && hand[4]!.y > hand[5]!.y
  const rule = (condition: boolean) => (condition ? 1 : 0)
  return {
    peace: rule(index && middle && !ring && !pinky),
    'thumbs-up': rule(up),
    'thumbs-down': rule(down),
    'open-palm': rule(open),
    fist: rule(folded && !thumb && !touching),
    'point-up': rule(pointing && -dy > Math.abs(dx) * 1.2),
    'point-down': rule(pointing && dy > Math.abs(dx) * 1.2),
    'point-left': rule(pointing && -dx > Math.abs(dy) * 1.2),
    'point-right': rule(pointing && dx > Math.abs(dy) * 1.2),
    'three-fingers': rule(index && middle && ring && !pinky && !thumb),
    'four-fingers': rule(index && middle && ring && pinky && !thumb),
    ok: rule(touching && middle && ring && pinky),
    pinch: rule(touching && !middle && !ring && !pinky),
    'rock-on': rule(index && !middle && !ring && pinky && !thumb),
    'call-me': rule(!index && !middle && !ring && pinky && thumb),
    'i-love-you': rule(index && !middle && !ring && pinky && thumb),
    'middle-finger': rule(!index && middle && !ring && !pinky),
  }
}
