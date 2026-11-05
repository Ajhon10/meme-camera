import { afterEach, describe, expect, it, vi } from 'vitest'
import { EffectEngine } from '../src/effects/effectEngine'
import { defaultEffects } from '../src/effects/defaultEffects'
import { emptyFrame } from '../src/vision/visionTypes'

function setupFrame(smile = true) {
  const frame = emptyFrame()
  frame.face = Array.from({ length: 468 }, () => ({ x: 0.5, y: 0.5, z: 0 }))
  frame.face[234]!.x = 0.3
  frame.face[454]!.x = 0.7
  frame.face[33]!.x = 0.4
  frame.face[263]!.x = 0.6
  frame.expressions = { mouthSmileLeft: smile ? 1 : 0, mouthSmileRight: smile ? 1 : 0 }
  return frame
}
function setupContext() {
  return {
    canvas: { width: 1280, height: 720 },
    save: vi.fn(),
    restore: vi.fn(),
    translate: vi.fn(),
    rotate: vi.fn(),
    drawImage: vi.fn(),
  } as unknown as CanvasRenderingContext2D
}
async function setup(mode: 'timed' | 'toggle' | 'while-triggered') {
  vi.stubGlobal(
    'Image',
    class {
      naturalWidth = 512
      naturalHeight = 512
      decode = () => Promise.resolve()
    },
  )
  const engine = new EffectEngine(),
    effect = structuredClone(defaultEffects[0]!)
  effect.trigger = { type: 'face', gesture: 'smile', similarityThreshold: 0.85 }
  effect.display = { mode, durationMs: 300 }
  await engine.setEffects([effect])
  return { engine, effect }
}
afterEach(() => vi.unstubAllGlobals())
describe('effect playback', () => {
  it('draws only after confirmation and releases while-triggered effects', async () => {
    const { engine } = await setup('while-triggered'),
      frame = setupFrame(),
      ctx = setupContext()
    engine.update(frame, 0)
    engine.render(ctx, frame, 0)
    expect(ctx.drawImage).not.toHaveBeenCalled()
    for (let index = 1; index < 4; index++) engine.update(frame, index * 50)
    engine.render(ctx, frame, 150)
    expect(ctx.drawImage).toHaveBeenCalledOnce()
    const noSmile = setupFrame(false)
    for (let index = 0; index < 3; index++) engine.update(noSmile, 200 + index * 50)
    engine.render(ctx, noSmile, 300)
    expect(engine.activeNames).toEqual([])
  })
  it('expires timed effects even while the gesture is continuously held', async () => {
    const { engine } = await setup('timed'),
      frame = setupFrame(),
      ctx = setupContext()
    for (let index = 0; index < 4; index++) engine.update(frame, index * 50)
    engine.render(ctx, frame, 200)
    expect(engine.activeNames).toHaveLength(1)
    for (let time = 200; time <= 2000; time += 50) engine.update(frame, time)
    engine.render(ctx, frame, 2000)
    expect(engine.activeNames).toEqual([])
  })
  it('toggles once per distinct gesture and clears on reset', async () => {
    const { engine } = await setup('toggle'),
      frame = setupFrame(),
      ctx = setupContext()
    for (let index = 0; index < 4; index++) engine.update(frame, index * 50)
    for (let index = 0; index < 3; index++) engine.update(setupFrame(false), 400 + index * 50)
    engine.render(ctx, frame, 900)
    expect(engine.activeNames).toHaveLength(1)
    for (let index = 0; index < 4; index++) engine.update(frame, 1000 + index * 50)
    engine.render(ctx, frame, 1200)
    expect(engine.activeNames).toEqual([])
    engine.reset()
    engine.render(ctx, frame, 1300)
    expect(engine.activeNames).toEqual([])
  })
  it('follows the target and hides overlays immediately when the target is missing', async () => {
    const { engine } = await setup('while-triggered'),
      frame = setupFrame(),
      ctx = setupContext()
    for (let index = 0; index < 4; index++) engine.update(frame, index * 50)
    engine.render(ctx, frame, 200)
    frame.face[1]!.x = 0.7
    engine.render(ctx, frame, 220)
    const positions = vi.mocked(ctx.translate).mock.calls
    expect(positions[1]![0]).toBeGreaterThan(positions[0]![0])
    engine.render(ctx, emptyFrame(), 240)
    expect(engine.activeNames).toEqual([])
  })
})
