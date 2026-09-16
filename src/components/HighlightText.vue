<script setup lang="ts">
import { computed } from 'vue'
import { splitLinks } from '../lib/linkify'

const props = defineProps<{
  text: string
  /** Already trimmed and lowercased — normalize once at the search source, not per field. */
  query: string
  /** The entry currently focused by search navigation gets a stronger mark. */
  active?: boolean
}>()

const linkSegments = computed(() => splitLinks(props.text ?? ''))

function matchParts(text: string) {
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
}
</script>

<template>
  <template v-for="(segment, i) in linkSegments" :key="i">
    <!-- The parent entry card toggles its details on any click; stopping
         propagation here keeps that from swallowing a click meant for the
         link, without stopping the browser's own navigation. -->
    <a
      v-if="segment.url"
      :href="segment.url"
      target="_blank"
      rel="noopener noreferrer"
      class="entry-link"
      @click.stop
      ><template v-for="(part, j) in matchParts(segment.text)" :key="j"
        ><mark v-if="part.match" :class="{ active }">{{ part.text }}</mark
        ><template v-else>{{ part.text }}</template></template
      ></a
    ><template v-else
      ><template v-for="(part, j) in matchParts(segment.text)" :key="j"
        ><mark v-if="part.match" :class="{ active }">{{ part.text }}</mark
        ><template v-else>{{ part.text }}</template></template
      ></template
    >
  </template>
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
.entry-link {
  color: var(--brass);
  text-decoration: underline;
}
</style>
