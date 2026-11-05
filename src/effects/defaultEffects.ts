import type { EffectDefinition } from './effectTypes'
import { gestureDetails, type GestureId } from '../vision/gestureCatalog'

function memePreset(
  id: string,
  name: string,
  file: string,
  gesture: GestureId,
  color: string,
): EffectDefinition {
  return {
    id,
    name,
    imagePath: `./memes/${file}`,
    enabled: false,
    builtin: true,
    source: 'user-pack',
    color,
    trigger: { type: gestureDetails(gesture)!.type, gesture, similarityThreshold: 0.85 },
    target: { type: 'face', scale: 1.2, offsetX: 0, offsetY: 0, rotationOffset: 0 },
    display: { mode: 'while-triggered', durationMs: 3000 },
  }
}

export const defaultEffects: EffectDefinition[] = [
  {
    id: 'cool-mode',
    name: 'Cool mode',
    imagePath: './memes/cool.png',
    enabled: true,
    builtin: true,
    color: 'lavender',
    trigger: { type: 'hand', gesture: 'peace', similarityThreshold: 0.85 },
    target: { type: 'face', scale: 1, offsetX: 0, offsetY: 0, rotationOffset: 0 },
    display: { mode: 'while-triggered', durationMs: 3000 },
  },
  {
    id: 'absolutely-shocked',
    name: 'Absolutely shocked',
    imagePath: './memes/shocked.png',
    enabled: false,
    builtin: true,
    color: 'peach',
    trigger: { type: 'pose', gesture: 'hands-beside-head', similarityThreshold: 0.85 },
    target: { type: 'face', scale: 1, offsetX: 0, offsetY: 0, rotationOffset: 0 },
    display: { mode: 'while-triggered', durationMs: 3000 },
  },
  {
    id: 'main-character',
    name: 'Main character',
    imagePath: './memes/crown.png',
    enabled: false,
    builtin: true,
    color: 'mint',
    trigger: { type: 'hand', gesture: 'thumbs-up', similarityThreshold: 0.85 },
    target: { type: 'aboveHead', scale: 1, offsetX: 0, offsetY: 0, rotationOffset: 0 },
    display: { mode: 'timed', durationMs: 3000 },
  },
  memePreset('flight-reaction', 'Flight reaction', 'flight-reaction.jpg', 'mouth-open', 'peach'),
  memePreset('side-eye-cat', 'Side-eye cat', 'side-eye-cat.jpg', 'look-left', 'mint'),
  memePreset(
    'wide-eyed-reaction',
    'Maximum surprise',
    'wide-eyed-reaction.jpg',
    'surprised',
    'peach',
  ),
  memePreset('crossed-arms', 'Not impressed', 'crossed-arms.jpg', 'arms-crossed', 'lavender'),
  memePreset('defiant-cat', 'Defiant cat', 'defiant-cat.jpg', 'middle-finger', 'mint'),
  memePreset('squint-reaction', 'The squint', 'squint-reaction.png', 'squint', 'lavender'),
  memePreset(
    'giggling-baby',
    'Trying not to laugh',
    'giggling-baby.png',
    'laugh-cover-mouth',
    'peach',
  ),
]
