<script setup lang="ts">
import { computed, ref } from 'vue'
import type { WeekGroup } from '../lib/weeks'
import type { Entry } from '../types'
import EntryCard from './EntryCard.vue'

const props = defineProps<{
  group: WeekGroup
  minPerWeek: number
  defaultExpanded: boolean
}>()

defineEmits<{
  edit: [entry: Entry]
  remove: [id: string]
}>()

function fmtDate(d: Date): string {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

const isOk = computed(() => props.group.entries.length >= props.minPerWeek)
const expanded = ref(props.defaultExpanded)
</script>

<template>
  <div class="week-block">
    <button class="week-head" type="button" :aria-expanded="expanded" @click="expanded = !expanded">
      <span class="caret">{{ expanded ? '▾' : '▸' }}</span>
      <span class="week-title">{{ fmtDate(group.start) }} – {{ fmtDate(group.end) }}</span>
      <span class="week-meta">
        <span class="week-activity-count">
          {{ group.entries.length }} {{ group.entries.length === 1 ? 'activity' : 'activities' }}
        </span>
        <span class="week-count" :class="isOk ? 'ok' : 'warn'">
          {{ group.entries.length }} / {{ minPerWeek }}
        </span>
      </span>
    </button>
    <TransitionGroup v-show="expanded" class="week-entries" name="entry" tag="div">
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
  margin-bottom: 20px;
}
.week-head {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 8px;
  border: none;
  border-bottom: 1px solid var(--line);
  background: none;
  padding: 0 0 8px;
  margin-bottom: 10px;
  cursor: pointer;
  font-family: inherit;
  text-align: left;
}
.caret {
  color: var(--brass);
  font-size: 11px;
  flex: 0 0 auto;
}
.week-title {
  font-family: var(--font-display);
  font-weight: 600;
  font-size: 16px;
  color: var(--green-deep);
}
.week-meta {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 10px;
}
.week-activity-count {
  font-size: 12px;
  color: var(--muted);
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

@media print {
  .week-entries {
    display: block !important;
  }
  .week-head {
    cursor: default;
    break-after: avoid;
    page-break-after: avoid;
  }
  .caret {
    display: none;
  }
}
</style>
