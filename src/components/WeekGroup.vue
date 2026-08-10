<script setup lang="ts">
import { computed } from 'vue'
import type { WeekGroup } from '../lib/weeks'
import type { Entry } from '../types'
import EntryCard from './EntryCard.vue'

const props = defineProps<{
  group: WeekGroup
  minPerWeek: number
}>()

defineEmits<{
  edit: [entry: Entry]
  remove: [id: string]
}>()

function fmtDate(d: Date): string {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

const isOk = computed(() => props.group.entries.length >= props.minPerWeek)
</script>

<template>
  <div class="week-block">
    <div class="week-head">
      <span class="week-title">Week of {{ fmtDate(group.start) }} – {{ fmtDate(group.end) }}</span>
      <span class="week-count" :class="isOk ? 'ok' : 'warn'">
        {{ group.entries.length }} / {{ minPerWeek }}
      </span>
    </div>
    <TransitionGroup name="entry" tag="div">
      <EntryCard
        v-for="entry in group.entries"
        :key="entry.id"
        :entry="entry"
        @edit="$emit('edit', $event)"
        @remove="$emit('remove', $event)"
      />
    </TransitionGroup>
  </div>
</template>

<style scoped>
.week-block {
  margin-bottom: 26px;
}
.week-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  border-bottom: 1px solid var(--line);
  padding-bottom: 6px;
  margin-bottom: 10px;
}
.week-title {
  font-family: var(--font-display);
  font-weight: 600;
  font-size: 16px;
  color: var(--green-deep);
}
.week-count {
  font-size: 12px;
  padding: 3px 8px;
  border-radius: 10px;
  border: 1px solid var(--line);
}
.week-count.ok {
  color: var(--ok);
  border-color: var(--ok);
  background: rgba(63, 93, 68, 0.08);
}
.week-count.warn {
  color: var(--warn);
  border-color: var(--warn);
  background: rgba(162, 71, 47, 0.08);
}
.entry-move,
.entry-enter-active,
.entry-leave-active {
  transition:
    transform 0.2s ease,
    opacity 0.2s ease;
}
.entry-enter-from,
.entry-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
.entry-leave-active {
  position: absolute;
  width: calc(100% - 2px);
}
</style>
