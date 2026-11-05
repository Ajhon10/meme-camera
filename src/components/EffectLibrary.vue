<script setup lang="ts">
import { computed, ref } from 'vue'
import { Plus, Search, SlidersHorizontal } from 'lucide-vue-next'
import EffectCard from './EffectCard.vue'
import GestureGuide from './GestureGuide.vue'
import { gestureOptions, gestureName } from '../vision/gestureCatalog'
import { useAppStore } from '../stores/appStore'
const store = useAppStore()
const guideOpen = ref(false)
const filter = ref<'all' | 'enabled' | 'custom' | 'pack'>('all'),
  search = ref('')
const filtered = computed(() =>
  store.effects.filter(
    (effect) =>
      (filter.value !== 'enabled' || effect.enabled) &&
      (filter.value !== 'custom' || !effect.builtin) &&
      (filter.value !== 'pack' || effect.source === 'user-pack') &&
      `${effect.name} ${gestureName(effect.trigger.gesture)}`
        .toLowerCase()
        .includes(search.value.toLowerCase()),
  ),
)
</script>

<template>
  <section class="library-section" aria-label="Effect library">
    <div class="section-heading">
      <div>
        <h2>
          Effect library <span class="count">{{ store.effects.length }}</span>
        </h2>
        <p>
          A gesture is all it takes.
          <button class="text-button" @click="guideOpen = true">
            Browse {{ gestureOptions.length }} gestures
          </button>
        </p>
      </div>
      <button class="text-button" @click="store.openEditor()">
        <Plus :size="16" /> Create effect
      </button>
    </div>
    <div class="library-filters">
      <div class="segmented">
        <button :class="{ active: filter === 'all' }" @click="filter = 'all'">All effects</button
        ><button :class="{ active: filter === 'enabled' }" @click="filter = 'enabled'">
          Enabled</button
        ><button :class="{ active: filter === 'custom' }" @click="filter = 'custom'">
          My effects
        </button>
        <button :class="{ active: filter === 'pack' }" @click="filter = 'pack'">Meme pack</button>
      </div>
      <label class="search-field"
        ><Search :size="14" /><input
          v-model="search"
          aria-label="Search effects"
          placeholder="Search effects…"
      /></label>
    </div>
    <div class="effect-grid">
      <EffectCard v-for="effect in filtered" :key="effect.id" :effect="effect" /><button
        class="new-effect-card"
        @click="store.openEditor()"
      >
        <span><Plus :size="22" /></span><strong>Your next great reaction</strong
        ><small>Upload an image. Pick a gesture.</small>
      </button>
    </div>
    <p v-if="!filtered.length" class="empty-library">
      No matching effects. Create one or try a different filter.
    </p>
    <div class="library-footnote">
      <SlidersHorizontal :size="13" /><span
        >Effects follow your movement. Enable more than one to mix things up.</span
      >
    </div>
  </section>
  <GestureGuide v-if="guideOpen" @close="guideOpen = false" />
</template>
