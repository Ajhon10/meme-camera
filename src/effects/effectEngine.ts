import type { EffectDefinition } from './effectTypes'
import { GestureMatcher, gestureScores } from '../vision/gestureMatcher'
import { targetAnchor, type Anchor } from '../vision/landmarkUtils'
import type { VisionFrame } from '../vision/visionTypes'

export class EffectEngine {
  private images = new Map<string, HTMLImageElement>()
  private matcher = new GestureMatcher()
  private states = new Map<string, { active: boolean; until: number; toggled: boolean }>()
  private anchors = new Map<string, Anchor>()
  private effects: EffectDefinition[] = []
  private test: { effect: EffectDefinition; until: number } | null = null
  private generation = 0
  detectedGesture = ''
  confidence = 0
  activeNames: string[] = []
  onError: (message: string) => void = () => {}

  async setEffects(effects: EffectDefinition[]) {
    const generation = ++this.generation
    this.effects = effects
    this.reset()
    const sources = new Set(effects.map((effect) => effect.imagePath))
    for (const source of this.images.keys()) if (!sources.has(source)) this.images.delete(source)
    for (const effect of effects) {
      if (generation !== this.generation) return
      try {
        await this.loadImage(effect.imagePath)
      } catch (error) {
        this.onError(
          `Could not load ${effect.name}: ${error instanceof Error ? error.message : String(error)}`,
        )
      }
    }
  }
  private async loadImage(source: string) {
    if (this.images.has(source)) return
    const image = new Image()
    image.src = source
    await image.decode()
    this.images.set(source, image)
  }
  async testEffect(effect: EffectDefinition) {
    await this.loadImage(effect.imagePath)
    this.test = { effect, until: performance.now() + 3000 }
  }
  reset() {
    this.matcher.reset()
    this.states.clear()
    this.anchors.clear()
    this.test = null
    this.activeNames = []
    this.detectedGesture = ''
    this.confidence = 0
  }
  update(frame: VisionFrame, now: number) {
    const scores = gestureScores(frame)
    this.detectedGesture = ''
    this.confidence = 0
    for (const [gesture, score] of Object.entries(scores))
      if (score > this.confidence) {
        this.confidence = score
        this.detectedGesture = gesture
      }
    for (const effect of this.effects) {
      const score = this.matcher.score(effect, frame, scores)
      if (effect.enabled && score > 0 && score >= this.confidence) {
        this.confidence = score
        this.detectedGesture = effect.trigger.gesture
      }
      const match = this.matcher.update(effect, score, now)
      const state = this.states.get(effect.id) ?? { active: false, until: 0, toggled: false }
      if (!effect.enabled) {
        state.active = false
        state.toggled = false
        state.until = 0
      } else {
        if (match.rising) {
          state.until = now + effect.display.durationMs
          state.toggled = !state.toggled
        }
        state.active =
          effect.display.mode === 'while-triggered'
            ? match.active
            : effect.display.mode === 'toggle'
              ? state.toggled
              : now < state.until
      }
      this.states.set(effect.id, state)
    }
  }
  render(ctx: CanvasRenderingContext2D, frame: VisionFrame, now: number) {
    this.activeNames.length = 0
    for (const effect of this.effects) {
      const state = this.states.get(effect.id)
      if (
        !effect.enabled ||
        !state?.active ||
        (effect.display.mode === 'timed' && now >= state.until)
      )
        continue
      if (this.draw(ctx, frame, effect)) this.activeNames.push(effect.name)
    }
    if (this.test && now < this.test.until) {
      if (this.draw(ctx, frame, this.test.effect))
        this.activeNames.push(`${this.test.effect.name} (test)`)
    } else this.test = null
  }
  private draw(
    ctx: CanvasRenderingContext2D,
    frame: VisionFrame,
    effect: EffectDefinition,
  ): boolean {
    const image = this.images.get(effect.imagePath)
    const target = targetAnchor(frame, effect.target.type, ctx.canvas.width, ctx.canvas.height)
    if (!image || !target) {
      this.anchors.delete(effect.id)
      return false
    }
    const previous = this.anchors.get(effect.id)
    if (previous) {
      const delta = Math.atan2(
        Math.sin(target.rotation - previous.rotation),
        Math.cos(target.rotation - previous.rotation),
      )
      target.x = previous.x + (target.x - previous.x) * 0.55
      target.y = previous.y + (target.y - previous.y) * 0.55
      target.size = previous.size + (target.size - previous.size) * 0.55
      target.rotation = previous.rotation + delta * 0.55
    }
    this.anchors.set(effect.id, target)
    const width = target.size * effect.target.scale,
      height = (width * image.naturalHeight) / image.naturalWidth
    ctx.save()
    ctx.translate(
      target.x + effect.target.offsetX * target.size,
      target.y + effect.target.offsetY * target.size,
    )
    ctx.rotate(target.rotation + (effect.target.rotationOffset * Math.PI) / 180)
    ctx.drawImage(image, -width / 2, -height / 2, width, height)
    ctx.restore()
    return true
  }
}
