<script setup lang="ts">
import { computed } from 'vue'
import { inline } from '../help/markdown'
const props = defineProps<{ text: string }>()
defineEmits<{ navigate: [href: string] }>()
const parts = computed(() => inline(props.text))
</script>
<template>
  <template v-for="(part, index) in parts" :key="index">
    <strong v-if="part.type === 'strong'">{{ part.text }}</strong>
    <code v-else-if="part.type === 'code'">{{ part.text }}</code>
    <button
      v-else-if="part.type === 'link'"
      class="help-inline-link"
      @click="$emit('navigate', part.href!)"
    >
      {{ part.text }}
    </button>
    <template v-else>{{ part.text }}</template>
  </template>
</template>
