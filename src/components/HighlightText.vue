<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  text: string
  /** Already trimmed and lowercased — normalize once at the search source, not per field. */
  query: string
  /** The entry currently focused by search navigation gets a stronger mark. */
  active?: boolean
}>()

const parts = computed(() => {
  const text = props.text ?? ''
  const query = props.query
  if (!query) return [{ text, match: false }]

  const lower = text.toLowerCase()
  const result: { text: string; match: boolean }[] = []
  let i = 0
  while (i < text.length) {
    const idx = lower.indexOf(query, i)
    if (idx === -1) {
      result.push({ text: text.slice(i), match: false })
      break
    }
    if (idx > i) result.push({ text: text.slice(i, idx), match: false })
    result.push({ text: text.slice(idx, idx + query.length), match: true })
    i = idx + query.length
  }
  return result
})
</script>

<template>
  <template v-for="(part, i) in parts" :key="i"
    ><mark v-if="part.match" :class="{ active }">{{ part.text }}</mark
    ><template v-else>{{ part.text }}</template></template
  >
</template>

<style scoped>
mark {
  background: rgba(138, 109, 59, 0.35);
  color: inherit;
  border-radius: 2px;
  padding: 0 1px;
}
mark.active {
  background: var(--stamp);
  color: var(--paper);
}
</style>
