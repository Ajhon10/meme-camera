import { describe, expect, it } from 'vitest'
import { gestureScores } from '../src/vision/gestureMatcher'
import { gestureOptions, missingDetectors, type GestureId } from '../src/vision/gestureCatalog'
import { defaultEffects } from '../src/effects/defaultEffects'
import { emptyFrame, type Landmark } from '../src/vision/visionTypes'

const p = (x: number, y: number): Landmark => ({ x, y, z: 0, visibility: 1 })
function hand(extended: number[], thumb = false) {
  const points = Array.from({ length: 21 }, () => p(0.5, 0.8))
  points[0] = p(0.5, 0.9)
  points[1] = p(0.42, 0.85)
  points[2] = p(0.35, 0.78)
  points[3] = thumb ? p(0.28, 0.58) : p(0.48, 0.72)
  points[4] = thumb ? p(0.21, 0.38) : p(0.55, 0.74)
  for (const [tip, x] of [
    [8, 0.4],
    [12, 0.55],
    [16, 0.67],
    [20, 0.78],
  ]) {
    points[tip! - 3] = p(x!, 0.7)
    points[tip! - 2] = p(x!, extended.includes(tip!) ? 0.5 : 0.62)
    points[tip! - 1] = p(x!, extended.includes(tip!) ? 0.3 : 0.74)
    points[tip!] = p(x!, extended.includes(tip!) ? 0.1 : 0.81)
  }
  return points
}
function face(expressions: Record<string, number> = {}) {
  const frame = emptyFrame()
  frame.face = Array.from({ length: 468 }, () => p(0.5, 0.35))
  frame.face[234] = p(0.35, 0.35)
  frame.face[454] = p(0.65, 0.35)
  frame.face[33] = p(0.42, 0.3)
  frame.face[263] = p(0.58, 0.3)
  frame.face[10] = p(0.5, 0.15)
  frame.face[152] = p(0.5, 0.55)
  frame.face[13] = p(0.5, 0.43)
  frame.face[14] = p(0.5, 0.45)
  frame.expressions = expressions
  return frame
}
function pose() {
  const frame = emptyFrame()
  frame.pose = Array.from({ length: 33 }, () => p(0.5, 0.2))
  frame.pose[11] = p(0.65, 0.4)
  frame.pose[12] = p(0.35, 0.4)
  frame.pose[13] = p(0.75, 0.55)
  frame.pose[14] = p(0.25, 0.55)
  frame.pose[15] = p(0.7, 0.75)
  frame.pose[16] = p(0.3, 0.75)
  frame.pose[23] = p(0.6, 0.75)
  frame.pose[24] = p(0.4, 0.75)
  return frame
}

describe('expanded hand shapes', () => {
  const cases: [GestureId, number[], boolean][] = [
    ['peace', [8, 12], false],
    ['thumbs-up', [], true],
    ['open-palm', [8, 12, 16, 20], true],
    ['fist', [], false],
    ['point-up', [8], false],
    ['three-fingers', [8, 12, 16], false],
    ['four-fingers', [8, 12, 16, 20], false],
    ['rock-on', [8, 20], false],
    ['call-me', [20], true],
    ['i-love-you', [8, 20], true],
    ['middle-finger', [12], false],
  ]
  it.each(cases)('recognizes %s', (id, fingers, thumb) => {
    const frame = emptyFrame()
    frame.hands = [{ side: 'Right', landmarks: hand(fingers, thumb) }]
    expect(gestureScores(frame)[id]).toBeGreaterThan(0.85)
  })
  it.each(['point-down', 'point-left', 'point-right', 'thumbs-down'] as const)(
    'recognizes directional %s',
    (id) => {
      const frame = emptyFrame(),
        points = hand(id === 'thumbs-down' ? [] : [8], id === 'thumbs-down')
      frame.hands = [
        {
          side: 'Right',
          landmarks: points.map((v) =>
            id === 'point-down' || id === 'thumbs-down'
              ? p(v.x, 1 - v.y)
              : id === 'point-left'
                ? p(v.y, v.x)
                : p(1 - v.y, v.x),
          ),
        },
      ]
      expect(gestureScores(frame)[id]).toBe(1)
    },
  )
  it.each(['ok', 'pinch'] as const)('distinguishes %s by the other fingers', (id) => {
    const points = hand(id === 'ok' ? [12, 16, 20] : [])
    points[4] = p(0.39, 0.5)
    points[8] = p(0.4, 0.5)
    const frame = emptyFrame()
    frame.hands = [{ side: 'Right', landmarks: points }]
    expect(gestureScores(frame)[id]).toBe(1)
    expect(gestureScores(frame)[id === 'ok' ? 'pinch' : 'ok']).toBe(0)
  })
  it.each(['double-peace', 'double-thumbs-up'] as const)('requires two hands for %s', (id) => {
    const frame = emptyFrame(),
      points = hand(id === 'double-peace' ? [8, 12] : [], id === 'double-thumbs-up')
    frame.hands = [{ side: 'Right', landmarks: points }]
    expect(gestureScores(frame)[id]).toBe(0)
    frame.hands.push({ side: 'Left', landmarks: points })
    expect(gestureScores(frame)[id]).toBe(1)
  })
})

describe('facial expressions', () => {
  const cases: [GestureId, string[]][] = [
    ['smile', ['mouthSmileLeft', 'mouthSmileRight']],
    ['mouth-open', ['jawOpen']],
    ['eyes-closed', ['eyeBlinkLeft', 'eyeBlinkRight']],
    ['wink-left', ['eyeBlinkLeft']],
    ['wink-right', ['eyeBlinkRight']],
    ['brows-up', ['browInnerUp']],
    ['brow-furrow', ['browDownLeft', 'browDownRight']],
    ['surprised', ['jawOpen', 'eyeWideLeft', 'eyeWideRight']],
    ['squint', ['eyeSquintLeft', 'eyeSquintRight']],
    ['kiss', ['mouthPucker']],
    ['frown', ['mouthFrownLeft', 'mouthFrownRight']],
    ['nose-scrunch', ['noseSneerLeft', 'noseSneerRight']],
    ['jaw-left', ['jawLeft']],
    ['jaw-right', ['jawRight']],
    ['smirk-left', ['mouthSmileLeft']],
    ['smirk-right', ['mouthSmileRight']],
    ['look-left', ['eyeLookOutLeft', 'eyeLookInRight']],
    ['look-right', ['eyeLookInLeft', 'eyeLookOutRight']],
    ['look-up', ['eyeLookUpLeft', 'eyeLookUpRight']],
    ['look-down', ['eyeLookDownLeft', 'eyeLookDownRight']],
  ]
  it.each(cases)('recognizes %s with a visible face', (id, signals) => {
    const frame = face(Object.fromEntries(signals.map((name) => [name, 0.9])))
    expect(gestureScores(frame)[id]).toBe(1)
    frame.face = []
    expect(gestureScores(frame)[id]).toBe(0)
  })
  it('does not report winks, smirks, or squints for both eyes closed and a symmetric smile', () => {
    const scores = gestureScores(
      face({
        eyeBlinkLeft: 0.95,
        eyeBlinkRight: 0.95,
        eyeSquintLeft: 0.9,
        eyeSquintRight: 0.9,
        mouthSmileLeft: 0.9,
        mouthSmileRight: 0.9,
      }),
    )
    expect([
      scores['wink-left'],
      scores['wink-right'],
      scores['smirk-left'],
      scores['smirk-right'],
      scores.squint,
    ]).toEqual([0, 0, 0, 0, 0])
  })
  it.each(['head-tilt-left', 'head-tilt-right'] as const)(
    'recognizes %s without an expression classifier',
    (id) => {
      const frame = face()
      frame.face[263]!.y += id === 'head-tilt-left' ? 0.1 : -0.1
      expect(gestureScores(frame)[id]).toBe(1)
      expect(
        gestureScores(frame)[id === 'head-tilt-left' ? 'head-tilt-right' : 'head-tilt-left'],
      ).toBe(0)
    },
  )
})

describe('body poses', () => {
  it('recognizes goalpost arms and rejects straight overhead arms', () => {
    const frame = pose()
    frame.pose[13] = p(0.85, 0.4)
    frame.pose[14] = p(0.15, 0.4)
    frame.pose[15] = p(0.85, 0.15)
    frame.pose[16] = p(0.15, 0.15)
    expect(gestureScores(frame).goalpost).toBe(1)
    frame.pose[13] = p(0.65, 0.25)
    frame.pose[15] = p(0.65, 0.1)
    expect(gestureScores(frame).goalpost).toBe(0)
  })
  it('recognizes a left dab and its anatomical right-hand counterpart', () => {
    const frame = pose()
    frame.pose[13] = p(0.8, 0.25)
    frame.pose[15] = p(0.95, 0.1)
    frame.pose[14] = p(0.2, 0.5)
    frame.pose[16] = p(0.5, 0.2)
    expect(gestureScores(frame)['dab-left']).toBe(1)
    for (const [left, right] of [
      [11, 12],
      [13, 14],
      [15, 16],
      [23, 24],
    ]) {
      ;[frame.pose[left!], frame.pose[right!]] = [frame.pose[right!]!, frame.pose[left!]!]
    }
    expect(gestureScores(frame)['dab-right']).toBe(1)
  })
  it('requires visible knees and ankles for a crouch', () => {
    const frame = pose()
    frame.pose[23] = p(0.6, 0.5)
    frame.pose[24] = p(0.4, 0.5)
    frame.pose[25] = p(0.8, 0.7)
    frame.pose[26] = p(0.2, 0.7)
    frame.pose[27] = p(0.6, 0.9)
    frame.pose[28] = p(0.4, 0.9)
    expect(gestureScores(frame).crouch).toBe(1)
    frame.pose[28]!.visibility = 0.1
    expect(gestureScores(frame).crouch).toBe(0)
  })
  it('distinguishes T pose, one arm out, and missing joints', () => {
    const frame = pose()
    frame.pose[13] = p(0.8, 0.4)
    frame.pose[15] = p(0.95, 0.4)
    frame.pose[14] = p(0.2, 0.4)
    frame.pose[16] = p(0.05, 0.4)
    expect(gestureScores(frame)['t-pose']).toBe(1)
    frame.pose[16] = p(0.3, 0.75)
    expect(gestureScores(frame)['t-pose']).toBe(0)
    expect(gestureScores(frame)['left-arm-out']).toBe(1)
    frame.pose[15]!.visibility = 0.1
    expect(gestureScores(frame)['left-arm-out']).toBe(0)
  })
  it('distinguishes one raised hand from both', () => {
    const frame = pose()
    frame.pose[15] = p(0.7, 0.1)
    expect(gestureScores(frame)['left-hand-raised']).toBe(1)
    expect(gestureScores(frame)['hands-raised']).toBe(0)
    frame.pose[16] = p(0.3, 0.1)
    expect(gestureScores(frame)['hands-raised']).toBe(1)
    expect(gestureScores(frame)['left-hand-raised']).toBe(0)
  })
  it('recognizes crossed arms, hands on hips, and hands at chest', () => {
    const frame = pose()
    frame.pose[15] = p(0.4, 0.5)
    frame.pose[16] = p(0.6, 0.5)
    expect(gestureScores(frame)['arms-crossed']).toBe(1)
    frame.pose[15] = p(0.6, 0.75)
    frame.pose[16] = p(0.4, 0.75)
    expect(gestureScores(frame)['hands-on-hips']).toBe(1)
    frame.pose[15] = p(0.48, 0.52)
    frame.pose[16] = p(0.52, 0.52)
    expect(gestureScores(frame)['hands-at-chest']).toBe(1)
    expect(gestureScores(frame)['hands-together']).toBe(1)
  })
  it('normalizes lean against shoulders and requires hips', () => {
    const frame = pose()
    frame.pose[23]!.x -= 0.15
    frame.pose[24]!.x -= 0.15
    expect(gestureScores(frame)['lean-left']).toBe(1)
    frame.pose[24]!.visibility = 0.1
    expect(gestureScores(frame)['lean-left']).toBe(0)
  })
})

describe('combined gestures and catalog', () => {
  it.each([
    ['facepalm', 0.5, 0.15],
    ['cheek-rest', 0.35, 0.35],
    ['cover-mouth', 0.5, 0.44],
  ] as const)('attaches the %s rule to the correct face region', (id, x, y) => {
    const frame = face()
    frame.hands = [
      {
        side: 'Right',
        landmarks: hand([]).map((v) => p((v.x - 0.525) * 0.5 + x, (v.y - 0.8) * 0.5 + y)),
      },
    ]
    expect(gestureScores(frame)[id]).toBe(1)
    frame.hands = []
    expect(gestureScores(frame)[id]).toBe(0)
  })
  it('recognizes shush and two open palms framing the face', () => {
    const frame = face()
    frame.hands = [
      { side: 'Right', landmarks: hand([8]).map((v) => p(v.x * 0.5 + 0.3, v.y * 0.5 + 0.39)) },
    ]
    expect(gestureScores(frame).shush).toBe(1)
    frame.hands = [
      {
        side: 'Right',
        landmarks: hand([8, 12, 16, 20], true).map((v) =>
          p((v.x - 0.525) * 0.5 + 0.25, (v.y - 0.8) * 0.5 + 0.35),
        ),
      },
      {
        side: 'Left',
        landmarks: hand([8, 12, 16, 20], true).map((v) =>
          p((v.x - 0.525) * 0.5 + 0.75, (v.y - 0.8) * 0.5 + 0.35),
        ),
      },
    ]
    expect(gestureScores(frame)['frame-face']).toBe(1)
    frame.hands.pop()
    expect(gestureScores(frame)['frame-face']).toBe(0)
  })
  it('does not mistake a tucked fist for a pinch', () => {
    const frame = emptyFrame(),
      points = hand([])
    points[4] = { ...points[8]! }
    frame.hands = [{ side: 'Right', landmarks: points }]
    expect(gestureScores(frame).pinch).toBe(0)
    expect(gestureScores(frame).fist).toBe(1)
  })
  it('requires both a smile and a hand sign', () => {
    const frame = face({ mouthSmileLeft: 0.9, mouthSmileRight: 0.9 })
    expect(gestureScores(frame)['smile-peace']).toBe(0)
    frame.hands = [{ side: 'Right', landmarks: hand([8, 12]) }]
    expect(gestureScores(frame)['smile-peace']).toBe(1)
    frame.expressions = {}
    expect(gestureScores(frame)['smile-peace']).toBe(0)
  })
  it('recognizes a hand-over-mouth reaction only when smiling', () => {
    const frame = face({ mouthSmileLeft: 0.9, mouthSmileRight: 0.9 })
    const points = hand([]).map((v) => p(v.x, v.y - 0.36))
    frame.hands = [{ side: 'Right', landmarks: points }]
    expect(gestureScores(frame)['cover-mouth']).toBe(1)
    expect(gestureScores(frame)['laugh-cover-mouth']).toBe(1)
    frame.expressions = {}
    expect(gestureScores(frame)['laugh-cover-mouth']).toBe(0)
  })
  it('combines pose and face signals without requiring Hand detection', () => {
    const frame = pose()
    frame.pose[15] = p(0.48, 0.52)
    frame.pose[16] = p(0.52, 0.52)
    Object.assign(frame, {
      face: face().face,
      expressions: { eyeBlinkLeft: 0.9, eyeBlinkRight: 0.9 },
    })
    expect(gestureScores(frame)['closed-eyes-prayer']).toBe(1)
    expect(
      missingDetectors('closed-eyes-prayer', { face: true, pose: true, hands: false }),
    ).toEqual([])
    expect(missingDetectors('smile-peace', { face: true, pose: true, hands: false })).toEqual([
      'hands',
    ])
  })
  it('has 71 unique, documented triggers and returns zero for absent tracking', () => {
    expect(gestureOptions).toHaveLength(71)
    expect(new Set(gestureOptions.map((g) => g.id)).size).toBe(71)
    expect(Object.values(gestureScores(emptyFrame())).every((score) => score === 0)).toBe(true)
    expect(gestureOptions.every((g) => g.description && g.detectors.length)).toBe(true)
  })
  it('ships seven opt-in meme presets with compatible trigger categories', () => {
    expect(defaultEffects.filter((effect) => effect.source === 'user-pack')).toHaveLength(7)
    for (const effect of defaultEffects) {
      expect(gestureOptions.find((g) => g.id === effect.trigger.gesture)?.type).toBe(
        effect.trigger.type,
      )
      if (effect.source === 'user-pack') expect(effect.enabled).toBe(false)
    }
  })
})
