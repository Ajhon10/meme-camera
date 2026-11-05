<script setup lang="ts">
import { Pencil, Play, Trash2 } from 'lucide-vue-next'
import type { EffectDefinition } from '../effects/effectTypes'
import { gestureName } from '../effects/effectTypes'
import { useAppStore } from '../stores/appStore'
defineProps<{ effect: EffectDefinition }>()
const store = useAppStore()
async function test(effect: EffectDefinition) {
  try {
    await store.test(effect)
  } catch (error) {
    store.report(error)
  }
}
</script>

<template>
  <article class="effect-card" :class="{ enabled: effect.enabled }">
    <div
      class="effect-art"
      :class="[effect.color ?? 'lavender', { 'meme-photo': effect.source === 'user-pack' }]"
    >
      <span class="effect-kind">{{
        effect.source === 'user-pack'
          ? 'YOUR MEME PACK'
          : effect.builtin
            ? 'MEMECAM ORIGINAL'
            : 'YOUR CREATION'
      }}</span>
      <img :src="effect.imagePath" :alt="effect.name" />
      <button
        class="effect-edit icon-button"
        :aria-label="`Edit ${effect.name}`"
        @click="store.openEditor(effect)"
      >
        <Pencil :size="14" />
      </button>
      <button class="effect-test" :aria-label="`Test ${effect.name}`" @click="test(effect)">
        <Play :size="11" fill="currentColor" /> Test
      </button>
    </div>
    <div class="effect-info">
      <div>
        <h3>{{ effect.name }}</h3>
        <p>
          {{ gestureName(effect.trigger.gesture) }} <span>→</span>
          {{ effect.target.type.replace(/([A-Z])/g, ' $1').toLowerCase() }}
        </p>
      </div>
      <button
        class="switch"
        role="switch"
        :aria-checked="effect.enabled"
        :aria-label="`Enable ${effect.name}`"
        @click="store.toggleEffect(effect.id)"
      >
        <span />
      </button>
    </div>
    <button
      v-if="!effect.builtin"
      class="delete-effect text-button"
      @click="store.removeEffect(effect.id)"
    >
      <Trash2 :size="12" /> Delete effect
    </button>
  </article>
</template>
