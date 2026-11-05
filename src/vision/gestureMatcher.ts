import type { EffectDefinition, GestureId } from '../effects/effectTypes'
import type { VisionFrame } from './visionTypes'
import { comparePose, normalizePose } from './poseSignature'
export { gestureScores } from './scoreGestures'
interface MatchState {
  frames: number
  misses: number
  active: boolean
  lastActivation: number
}
export interface GestureMatch {
  score: number
  active: boolean
  rising: boolean
}
export class GestureMatcher {
  private states = new Map<string, MatchState>()
  reset() {
    this.states.clear()
  }
  update(effect: EffectDefinition, score: number, now: number): GestureMatch {
    let state = this.states.get(effect.id)
    if (!state) {
      state = { frames: 0, misses: 0, active: false, lastActivation: -Infinity }
      this.states.set(effect.id, state)
    }
    const threshold = effect.trigger.similarityThreshold
    let rising = false
    if (!effect.enabled) {
      state.active = false
      state.frames = 0
      state.misses = 0
    } else if (score >= (state.active ? Math.max(0.1, threshold - 0.15) : threshold)) {
      state.misses = 0
      state.frames++
      if (!state.active && state.frames >= 4 && now - state.lastActivation >= 800) {
        state.active = true
        state.lastActivation = now
        rising = true
      }
    } else {
      state.frames = 0
      state.misses++
      if (state.misses >= 3) state.active = false
    }
    return { score, active: state.active, rising }
  }
  score(effect: EffectDefinition, frame: VisionFrame, scores: Record<GestureId, number>): number {
    return effect.trigger.gesture === 'custom-pose'
      ? comparePose(normalizePose(frame.pose), effect.trigger.savedPose ?? null)
      : scores[effect.trigger.gesture]
  }
}
