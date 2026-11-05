import { describe, expect, it } from 'vitest'
import { GestureMatcher, gestureScores } from '../src/vision/gestureMatcher'
import { defaultEffects } from '../src/effects/defaultEffects'
import { normalizePose, comparePose } from '../src/vision/poseSignature'
import { angle, distance, targetAnchor } from '../src/vision/landmarkUtils'
import { emptyFrame, type Landmark } from '../src/vision/visionTypes'

const point = (x: number, y: number, visibility = 1): Landmark => ({ x, y, z: 0, visibility })
function pose() {
  const joints = Array.from({ length: 33 }, () => point(0.5, 0.2))
  joints[11] = point(0.35, 0.4)
  joints[12] = point(0.65, 0.4)
  joints[13] = point(0.25, 0.5)
  joints[14] = point(0.75, 0.5)
  joints[15] = point(0.2, 0.2)
  joints[16] = point(0.8, 0.2)
  joints[23] = point(0.4, 0.75)
  joints[24] = point(0.6, 0.75)
  return joints
}

describe('gesture stabilization', () => {
  it('requires four consecutive frames and tolerates brief tracking misses', () => {
    const matcher = new GestureMatcher(),
      effect = structuredClone(defaultEffects[0]!)
    for (let index = 0; index < 3; index++)
      expect(matcher.update(effect, 0.95, index * 50).active).toBe(false)
    expect(matcher.update(effect, 0.95, 150)).toMatchObject({ active: true, rising: true })
    expect(matcher.update(effect, 0.95, 200).rising).toBe(false)
    expect(matcher.update(effect, 0, 250).active).toBe(true)
    expect(matcher.update(effect, 0, 300).active).toBe(true)
    expect(matcher.update(effect, 0, 350).active).toBe(false)
  })
  it('uses a lower deactivation threshold and a cooldown before reactivation', () => {
    const matcher = new GestureMatcher(),
      effect = structuredClone(defaultEffects[0]!)
    for (let index = 0; index < 4; index++) matcher.update(effect, 0.95, index * 50)
    for (let index = 0; index < 5; index++)
      expect(matcher.update(effect, 0.75, 200 + index * 50).active).toBe(true)
    for (let index = 0; index < 3; index++) matcher.update(effect, 0, 450 + index * 50)
    for (let index = 0; index < 4; index++)
      expect(matcher.update(effect, 0.95, 600 + index * 50).active).toBe(false)
    expect(matcher.update(effect, 0.95, 1000).rising).toBe(true)
  })
  it('never activates disabled effects', () => {
    const matcher = new GestureMatcher(),
      effect = { ...defaultEffects[0]!, enabled: false }
    for (let index = 0; index < 20; index++)
      expect(matcher.update(effect, 1, index * 100).active).toBe(false)
  })
  it('resets confirmation when a gesture is interrupted', () => {
    const matcher = new GestureMatcher(),
      effect = defaultEffects[0]!
    matcher.update(effect, 1, 0)
    matcher.update(effect, 1, 50)
    matcher.update(effect, 0, 100)
    expect(matcher.update(effect, 1, 150).active).toBe(false)
    expect(matcher.update(effect, 1, 200).active).toBe(false)
  })
})
describe('pose signatures', () => {
  it('recognizes a pose after translation and uniform scaling', () => {
    const original = pose(),
      transformed = original.map((joint) => ({
        ...joint,
        x: joint.x * 0.6 + 0.2,
        y: joint.y * 0.6 + 0.1,
      }))
    expect(comparePose(normalizePose(original), normalizePose(transformed))).toBeCloseTo(1, 10)
  })
  it('rejects a different arm position', () => {
    const original = pose(),
      changed = pose()
    changed[15] = point(0.4, 0.8)
    changed[16] = point(0.6, 0.8)
    expect(comparePose(normalizePose(original), normalizePose(changed))).toBeLessThan(0.5)
  })
  it('does not record occluded joints or degenerate shoulder widths', () => {
    const joints = pose()
    joints[15]!.visibility = 0.2
    expect(normalizePose(joints)).toBeNull()
    joints[15]!.visibility = 1
    joints[12] = joints[11]!
    expect(normalizePose(joints)).toBeNull()
    expect(comparePose(null, null)).toBe(0)
  })
})
describe('landmark geometry and confidence', () => {
  it('recognizes a peace sign and rejects it when the ring finger is also extended', () => {
    const frame = emptyFrame()
    const hand = [
      point(0.5, 0.9),
      point(0.35, 0.8),
      point(0.3, 0.7),
      point(0.3, 0.6),
      point(0.3, 0.55),
      point(0.4, 0.7),
      point(0.4, 0.5),
      point(0.4, 0.3),
      point(0.4, 0.1),
      point(0.55, 0.7),
      point(0.55, 0.45),
      point(0.55, 0.25),
      point(0.55, 0.08),
      point(0.67, 0.72),
      point(0.67, 0.56),
      point(0.68, 0.7),
      point(0.66, 0.78),
      point(0.78, 0.76),
      point(0.78, 0.65),
      point(0.8, 0.75),
      point(0.77, 0.85),
    ]
    frame.hands = [{ side: 'Right', landmarks: hand }]
    expect(gestureScores(frame).peace).toBeGreaterThan(0.85)
    hand[15] = point(0.67, 0.35)
    hand[16] = point(0.67, 0.15)
    expect(gestureScores(frame).peace).toBe(0)
  })
  it('calculates joint angles and distances', () => {
    expect(angle(point(1, 0), point(0, 0), point(0, 1))).toBeCloseTo(90)
    expect(distance(point(0, 0), point(3, 4))).toBe(5)
    expect(angle(point(0, 0), point(0, 0), point(1, 1))).toBe(0)
  })
  it('ignores raised hands when pose visibility is low', () => {
    const frame = emptyFrame()
    frame.pose = pose()
    frame.pose[15]!.y = 0.1
    frame.pose[16]!.y = 0.1
    expect(gestureScores(frame)['hands-raised']).toBeGreaterThan(0.85)
    frame.pose[15]!.visibility = 0.1
    expect(gestureScores(frame)['hands-raised']).toBe(0)
  })
  it('returns no target when landmarks disappear', () => {
    expect(targetAnchor(emptyFrame(), 'face', 1280, 720)).toBeNull()
    expect(targetAnchor(emptyFrame(), 'chest', 1280, 720)).toBeNull()
  })
  it('attaches chest effects to a moving torso', () => {
    const frame = emptyFrame()
    frame.pose = pose()
    const first = targetAnchor(frame, 'chest', 1280, 720)!
    frame.pose = frame.pose.map((joint) => ({ ...joint, x: joint.x + 0.1 }))
    const second = targetAnchor(frame, 'chest', 1280, 720)!
    expect(second.x - first.x).toBeCloseTo(128)
    expect(second.size).toBeCloseTo(first.size)
  })
})
