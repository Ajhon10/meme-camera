<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { X, Search } from 'lucide-vue-next'
import { gestureOptions, type TriggerType } from '../vision/gestureCatalog'
const emit = defineEmits<{ close: [] }>()
const dialog = ref<HTMLDialogElement | null>(null),
  search = ref('')
const category = ref<'all' | TriggerType>('all')
const categories = [
  { id: 'all', label: 'All' },
  { id: 'hand', label: 'Hands' },
  { id: 'face', label: 'Face' },
  { id: 'pose', label: 'Body pose' },
  { id: 'combined', label: 'Combined' },
] as const
const matches = computed(() =>
  gestureOptions.filter(
    (gesture) =>
      (category.value === 'all' || gesture.type === category.value) &&
      `${gesture.name} ${gesture.description}`.toLowerCase().includes(search.value.toLowerCase()),
  ),
)
onMounted(() => dialog.value?.showModal())
</script>

<template>
  <dialog ref="dialog" class="gesture-guide" @cancel.prevent="emit('close')">
    <div class="modal-heading">
      <div>
        <span class="eyebrow">FIND YOUR NEXT REACTION</span>
        <h2>
          Gesture guide <span class="count">{{ gestureOptions.length }}</span>
        </h2>
        <p>Choose any of these triggers in Create effect or Edit effect.</p>
      </div>
      <button class="icon-button" aria-label="Close gesture guide" @click="emit('close')">
        <X :size="20" />
      </button>
    </div>
    <div class="guide-controls">
      <label class="field"
        ><span class="heading-with-icon"><Search :size="14" /> Search gestures</span
        ><input v-model="search" placeholder="Try wink, thumbs, hands, smile…"
      /></label>
      <div class="segmented">
        <button
          v-for="item in categories"
          :key="item.id"
          :class="{ active: category === item.id }"
          @click="category = item.id"
        >
          {{ item.label }} ({{
            gestureOptions.filter((gesture) => item.id === 'all' || gesture.type === item.id)
              .length
          }})
        </button>
      </div>
      <p class="muted small-copy">
        Hold the pose briefly. These rules recognize visible positions and expressions; quick waves,
        claps, nods, and tongue movement are not motion triggers.
      </p>
    </div>
    <div class="gesture-guide-list">
      <article v-for="gesture in matches" :key="gesture.id" class="gesture-guide-item">
        <div>
          <strong>{{ gesture.name }}</strong
          ><span class="tag">{{ gesture.type }}</span>
        </div>
        <p>{{ gesture.description }}</p>
        <small>Detection: {{ gesture.detectors.join(' + ') }}</small>
      </article>
      <p v-if="!matches.length" class="muted">No matching gestures. Try another search.</p>
    </div>
  </dialog>
</template>
